import { distantSpawn } from '../../shared/house/combat';
import { Room, ServerError, type Client } from '@colyseus/core';
import type { OutdoorSessions } from './outdoor-sessions';
import { OutdoorSession } from './outdoor';
import { H } from '../../shared/config';
import { cleanText } from '../../shared/house/format';
import { moveStreet } from '../../shared/house/neighborhood';
export interface StreetGhost {
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  health: number;
  weapon: 'crowbar' | 'shovel';
  kills: number;
  deaths: number;
  shieldUntil: number;
  deadUntil: number;
  attackAt: number;
}
export class StreetRoom extends Room {
  private static live = new Set<string>();
  maxClients = H.STREET_CAPACITY;
  maxMessagesPerSecond = 25;
  private ghosts = new Map<string, StreetGhost>();
  private outdoor = new Map<string, OutdoorSession>();
  private movements = new Map<
    string,
    {
      forward: number;
      side: number;
      yaw: number;
      sprint: boolean;
      use: boolean;
      at: number;
    }
  >();
  private screamed = new Map<string, number>();
  private identify?: (token: string) => Promise<string>;
  private sessions?: OutdoorSessions;
  private street = 0;
  onCreate(options: {
    street?: number;
    identify?: (token: string) => Promise<string>;
    sessions?: OutdoorSessions;
  }) {
    this.identify = options.identify;
    this.sessions = options.sessions;
    if (
      options.street !== undefined &&
      (!Number.isInteger(options.street) ||
        options.street < 0 ||
        options.street > 99)
    )
      throw new ServerError(400, 'invalid street');
    if (StreetRoom.live.size >= H.STREET_MAX_ROOMS)
      throw new ServerError(503, 'the neighborhood is full');
    this.street = options.street ?? 0;
    StreetRoom.live.add(this.roomId);
    this.onMessage('move', (c, data) => {
      if (
        !data ||
        ![data.forward, data.side, data.yaw].every(Number.isFinite) ||
        Math.abs(data.forward) > 1 ||
        Math.abs(data.side) > 1 ||
        Math.abs(data.yaw) > Math.PI
      )
        return;
      this.movements.set(c.sessionId, {
        forward: data.forward,
        side: data.side,
        yaw: data.yaw,
        sprint: data.sprint === true,
        use: data.use === true,
        at: Date.now(),
      });
    });
    this.onMessage('scream', (c) => {
      const now = Date.now();
      if (now - (this.screamed.get(c.sessionId) ?? 0) < H.SCREAM_COOLDOWN_MS)
        return;
      const p = this.ghosts.get(c.sessionId);
      if (!p || p.health <= 0) return;
      this.screamed.set(c.sessionId, now);
      for (const other of this.clients) {
        const target = this.ghosts.get(other.sessionId);
        if (
          target &&
          Math.hypot(target.x - p.x, target.z - p.z) <= H.SCREAM_HEAR_DISTANCE
        )
          other.send('scream', { id: p.id, x: p.x, z: p.z, name: p.name });
      }
    });
    this.onMessage('equip', (c, weapon) =>
      this.outdoor.get(c.sessionId)?.life.equip(weapon),
    );
    this.onMessage('pickup', (c) => {
      const state = this.outdoor.get(c.sessionId);
      if (state?.life.pickup())
        c.send('notice', 'Grave shovel equipped. Left click to strike.');
    });
    this.onMessage('attack', (c) => {
      const state = this.outdoor.get(c.sessionId);
      if (!state) return;
      const attack = state.life.attack(
        [...this.outdoor.values()].map((s) => s.life),
        state.stamina,
        Date.now(),
      );
      if (!attack) return;
      state.stamina -= attack.cost;
      const target = [...this.outdoor.entries()].find(
        ([, s]) => s.life === attack.target,
      );
      if (target && !target[1].life.health) target[1].carried = 0;
      this.broadcast('combat', {
        attacker: c.sessionId,
        target: target?.[0],
        killed: !!target && !target[1].life.health,
        x: state.life.x,
        z: state.life.z,
      });
    });
    this.onMessage('sync', (c) => {
      c.send('spawn', { ...this.outdoor.get(c.sessionId)?.life });
      c.send('street', [...this.ghosts.values()]);
    });
    this.setSimulationInterval(() => {
      for (const [id, g] of this.ghosts) {
        const state = this.outdoor.get(id)!;
        const life = state.life;
        if (!life.health && Date.now() >= life.deadUntil) {
          life.spawn(
            [...this.ghosts.values()].filter((p) => p.id !== id),
            Date.now(),
          );
          state.stamina = 100;
          this.clients
            .find((c) => c.sessionId === id)
            ?.send('spawn', { ...life });
        }
        Object.assign(g, life);
        const i = this.movements.get(id);
        if (!life.health || !i || Date.now() - i.at > 500) {
          const state = this.outdoor.get(id);
          if (state) {
            state.hold = 0;
            state.target = '';
          }
          continue;
        }
        g.yaw = i.yaw;
        const sprint = i.sprint && state.stamina > 0;
        moveStreet(life, { ...i, sprint }, 1 / H.STREET_HZ);
        life.yaw = i.yaw;
        Object.assign(g, life);
        const loot = state.step(
          g,
          i.yaw,
          i.use,
          sprint,
          !!(i.forward || i.side),
          1 / H.STREET_HZ,
        );
        const banked =
          i.use && Math.hypot(g.x - H.WORLD_SPAWN_X, g.z - H.WORLD_SPAWN_Z) < 4
            ? state.deposit()
            : 0;
        const client = this.clients.find((c) => c.sessionId === id);
        client?.send('outdoor', {
          stamina: state.stamina,
          carried: state.carried,
          bank: state.bank,
          banked,
          hold: state.hold,
          found: [...state.found],
          loot,
          shovel: life.shovel,
        });
      }
      this.broadcast('street', [...this.ghosts.values()]);
    }, 1000 / H.STREET_HZ);
  }
  async onJoin(
    c: Client,
    options: {
      token?: string;
      name?: string;
      spawn?: { x: number; z: number; yaw: number };
    },
  ) {
    let state = new OutdoorSession();
    if (options.token && this.identify && this.sessions) {
      const identity = await this.identify(options.token);
      state = this.sessions.get(identity);
    }
    if (state.connection)
      throw new ServerError(
        409,
        'This profile is already exploring in another tab.',
      );
    state.connection = c.sessionId;
    if (!state.life.initialized)
      state.life.spawn([...this.ghosts.values()], Date.now());
    if (state.life.street !== this.street) {
      if (!state.life.canInteract(Date.now())) {
        state.connection = '';
        throw new ServerError(
          409,
          'Leave combat before changing neighborhoods',
        );
      }
      Object.assign(state.life, distantSpawn([...this.ghosts.values()]));
    }
    state.life.street = this.street;
    this.outdoor.set(c.sessionId, state);
    this.ghosts.set(c.sessionId, {
      id: c.sessionId,
      name:
        cleanText(
          typeof options.name === 'string' ? options.name : 'wanderer',
          20,
        ) || 'wanderer',
      ...state.life,
    });
    c.send('spawn', { ...state.life });
  }
  onDispose() {
    StreetRoom.live.delete(this.roomId);
  }
  onLeave(c: Client) {
    const state = this.outdoor.get(c.sessionId);
    if (state) {
      state.hold = 0;
      state.target = '';
      if (state.connection === c.sessionId) state.connection = '';
      if (state.life.health > 0 && Date.now() - state.life.damagedAt < 8000) {
        state.life.health = 0;
        state.life.deaths++;
        state.life.deadUntil = Date.now() + 7000;
        state.carried = 0;
      }
    }
    this.outdoor.delete(c.sessionId);
    this.ghosts.delete(c.sessionId);
    this.movements.delete(c.sessionId);
    this.screamed.delete(c.sessionId);
  }
}
