import { Room, ServerError, type Client } from '@colyseus/core';
import { C } from '../shared/config';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { fillBots, updateBots } from '../shared/bots';
import { RateLimit } from './rate-limit';
import type { Hub, QueueEntry } from './queue';
import type { Store } from './store';
export class MatchRoom extends Room {
  maxClients = C.MAX_PLAYERS;
  maxMessagesPerSecond = C.INPUT_BURST;
  simulation!: Simulation;
  hub?: Hub;
  store?: Store;
  queued = false;
  seatCount: number = C.MAX_PLAYERS;
  wallets = new Map<string, string>();
  saving = false;
  saved = false;
  saveRetryAt = 0;
  host = '';
  practice = false;
  bots = 0;
  limits = new Map<string, RateLimit>();
  async onCreate(options: Record<string, unknown>) {
    await initPhysics();
    this.queued = options.queued === true;
    if (this.queued && options.queueKey !== this.hub?.queueKey)
      throw new ServerError(403, 'queue access required');
    if (this.hub) {
      if (this.hub.rooms.size >= 16)
        throw new ServerError(503, 'local room limit reached');
      this.hub.rooms.add(this.roomId);
    }
    this.seatCount = Math.max(
      C.MIN_SURVIVORS + 1,
      Math.min(
        C.MAX_PLAYERS,
        Math.floor(Number(options.seatCount)) || C.MAX_PLAYERS,
      ),
    );
    if (this.queued && !this.hub?.claim(this.roomId))
      throw new ServerError(409, 'a match is already live');
    if (this.queued)
      this.clock.setTimeout(() => {
        if (this.simulation.state.phase === 'lobby') {
          this.hub?.release(this.roomId);
          void this.disconnect();
        }
      }, 30000);
    this.practice =
      options.practice === true && process.env.NODE_ENV !== 'production';
    this.bots = this.practice
      ? Math.max(
          0,
          Math.min(C.MAX_PLAYERS - 1, Math.floor(Number(options.bots)) || 0),
        )
      : 0;
    this.simulation = new Simulation(
      Math.floor(Math.random() * 1e6),
      Date.now(),
      this.roomId,
    );
    this.onMessage('input', (c, v) => {
      if (this.allowed(c)) this.simulation.input(c.sessionId, v);
    });
    this.onMessage('intent', (c, v) => {
      if (this.allowed(c) && v && typeof v === 'object')
        this.simulation.intent(c.sessionId, v.kind, v.data);
    });
    this.onMessage('sync', (c) => {
      if (this.allowed(c))
        c.send('snapshot', this.simulation.snapshot(c.sessionId));
    });
    this.onMessage('start', (c) => {
      if (this.queued || c.sessionId !== this.host || !this.allowed(c)) return;
      if (this.hub && !this.hub.claim(this.roomId)) {
        clientNotice(
          c,
          'a match is already running. spectate while it finishes.',
        );
        return;
      }
      fillBots(this.simulation, this.bots);
      if (this.simulation.start(this.practice)) void this.lock();
    });
    let accumulator = 0,
      snapshotTime = 0;
    this.setSimulationInterval((delta) => {
      accumulator += Math.min(delta / 1000, 0.15);
      while (accumulator >= 1 / C.TICK_HZ) {
        updateBots(this.simulation);
        this.simulation.step();
        accumulator -= 1 / C.TICK_HZ;
      }
      snapshotTime += delta;
      if (snapshotTime >= 1000 / C.SNAPSHOT_HZ) {
        snapshotTime %= 1000 / C.SNAPSHOT_HZ;
        const full = this.simulation.snapshot();
        this.hub?.publish(full);
        if (full.phase === 'finished') {
          if (!this.saved && !this.saving && full.now >= this.saveRetryAt) {
            this.saving = true;
            this.saveRetryAt = full.now + 1000;
            void (
              this.practice
                ? Promise.resolve()
                : (this.store?.save(full, this.wallets) ?? Promise.resolve())
            )
              .then(() => {
                this.saved = true;
              })
              .catch(() => {
                this.broadcast(
                  'notice',
                  'scores could not be saved yet. retrying.',
                );
              })
              .finally(() => {
                this.saving = false;
              });
          }
          if (full.now - full.endedAt > C.RESULTS_MS)
            this.hub?.release(this.roomId);
        }
        for (const client of this.clients)
          client.send('snapshot', this.simulation.snapshot(client.sessionId));
      }
    }, 1000 / C.TICK_HZ);
  }
  onAuth(_client: Client, options: Record<string, unknown>) {
    if (this.queued) {
      const entry = this.hub?.redeem(options.ticket, this.roomId);
      if (!entry)
        throw new ServerError(403, 'this seat needs a valid queue ticket');
      return entry;
    }
    if (!this.practice)
      throw new ServerError(
        403,
        'local practice is available. verified queue seats are required for matches.',
      );
    if (options.role !== 'killer' && options.role !== 'survivor')
      throw new ServerError(400, 'choose a role');
    return true;
  }
  onJoin(client: Client, options: Record<string, unknown>) {
    const entry = this.queued ? (client.auth as QueueEntry) : undefined;
    const p = this.simulation.add(
      client.sessionId,
      entry?.name ?? options.name,
      (entry?.offered ?? options.role) === 'killer' ? 'killer' : 'survivor',
      entry?.character ?? Number(options.character),
    );
    if (!p) throw new ServerError(409, 'that role is full');
    if (entry?.holder && p.role === 'survivor') p.cosmetic = 'ember';
    if (entry) this.wallets.set(client.sessionId, entry.wallet);
    this.host ||= client.sessionId;
    this.limits.set(
      client.sessionId,
      new RateLimit(C.INPUT_BURST, C.INPUT_LIMIT),
    );
    client.send('snapshot', this.simulation.snapshot(client.sessionId));
    if (
      this.queued &&
      this.simulation.state.players.length === this.seatCount
    ) {
      this.simulation.start();
      void this.lock();
    }
  }
  allowed(c: Client) {
    return this.limits.get(c.sessionId)?.take() ?? false;
  }
  async onDrop(client: Client) {
    const p = this.simulation.player(client.sessionId);
    if (p) {
      p.connected = false;
      p.input.interact = false;
      p.input.x = 0;
      p.input.z = 0;
    }
    try {
      await this.allowReconnection(client, C.DISCONNECT_MS / 1000);
    } catch {
      this.simulation.disconnect(client.sessionId);
    }
  }
  onReconnect(client: Client) {
    const p = this.simulation.player(client.sessionId);
    if (p) p.connected = true;
    client.send('snapshot', this.simulation.snapshot(client.sessionId));
  }
  onLeave(client: Client) {
    this.limits.delete(client.sessionId);
    this.simulation.disconnect(client.sessionId);
    if (this.host === client.sessionId)
      this.host =
        this.clients.find((c) => c.sessionId !== client.sessionId)?.sessionId ??
        '';
  }
  onDispose() {
    this.hub?.release(this.roomId);
    this.hub?.rooms.delete(this.roomId);
    this.simulation?.dispose();
    this.limits.clear();
  }
}

function clientNotice(c: Client, message: string) {
  c.send('notice', message);
}
export function matchRoom(hub: Hub, store: Store) {
  return class extends MatchRoom {
    hub = hub;
    store = store;
  };
}
