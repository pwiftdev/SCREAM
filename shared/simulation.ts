import { movement, palletBlocks } from './movement';
import { C } from './config';
import {
  activePallets,
  activeLockers,
  generators,
  gates,
  spawns,
  seeded,
} from './maps/rotten-hollow';
import { Physics } from './physics';
import { cleanName, emptyInput, parseInput } from './protocol';
import { distance, lineOfSight } from './geometry';
import {
  escape,
  event,
  hit,
  scream,
  take,
  updateEndgame,
  updateHealth,
  updateChase,
} from './rules';
import { judgeSkill, updateGenerators, updateTask } from './interactions';
import { snapshot } from './visibility';
import { mobile, type Match, type Player, type Role } from './types';
export class Simulation {
  state: Match;
  physics = new Physics();
  random: () => number;
  constructor(seed = 1, now = Date.now(), id = 'local') {
    this.random = seeded(seed);
    this.state = {
      id,
      lockers: activeLockers(seed),
      seed,
      now,
      startedAt: 0,
      phase: 'lobby',
      required: C.GENERATORS_REQUIRED,
      players: [],
      generators: generators.map((g) => ({
        ...g,
        progress: 0,
        regressing: false,
      })),
      gates: gates.map((g) => ({ ...g, progress: 0, open: false })),
      pallets: activePallets(seed).map((p) => ({ ...p, state: 'up' })),
      events: [],
      dawnAt: 0,
      endedAt: 0,
      reason: '',
    };
  }
  add(id: string, name: unknown, role: Role, character = 0, bot = false) {
    const m = this.state;
    if (
      m.phase !== 'lobby' ||
      m.players.length >= C.MAX_PLAYERS ||
      m.players.some((p) => p.id === id) ||
      (role === 'killer' && m.players.some((p) => p.role === 'killer')) ||
      (role === 'survivor' &&
        m.players.filter((p) => p.role === 'survivor').length >= C.SURVIVORS)
    )
      return;
    const spawn =
      spawns[
        role === 'killer'
          ? 5
          : (m.players.filter((p) => p.role === 'survivor').length +
              (m.seed % 5)) %
            5
      ];
    const p: Player = {
      id,
      x: spawn.x,
      z: spawn.z,
      y: 0,
      name: cleanName(name),
      character: Math.max(0, Math.min(4, Math.floor(character) || 0)),
      role,
      health: 'healthy',
      yaw: Math.atan2(-spawn.x, -spawn.z),
      connected: true,
      bot,
      input: emptyInput(),
      inputAt: 0,
      interactLatch: false,
      ack: -1,
      points: { Survival: 0, Repair: 0, Rescue: 0, Hunt: 0 },
      cages: 0,
      cagedAt: 0,
      immuneUntil: 0,
      bleedAt: 0,
      boostUntil: 0,
      stunUntil: 0,
      attackUntil: 0,
      lungeUntil: 0,
      hushUntil: 0,
      hushReady: 0,
      screamUsed: false,
      screamAt: -Infinity,
      revealUntil: 0,
      struggle: 0,
      nextSkill: m.now + C.SKILL_INTERVAL_MIN_MS,
      trailAt: 0,
      chaseSince: 0,
      chaseLast: 0,
      history: [],
    };
    m.players.push(p);
    return p;
  }
  start(practice = false) {
    const m = this.state;
    if (
      m.phase !== 'lobby' ||
      !m.players.some((p) => p.role === 'killer') ||
      m.players.filter((p) => p.role === 'survivor').length <
        (practice ? 1 : C.MIN_SURVIVORS)
    )
      return false;
    m.phase = 'playing';
    m.startedAt = m.now;
    m.required = m.players.filter((p) => p.role === 'survivor').length + 1;
    return true;
  }
  player(id: string) {
    return this.state.players.find((p) => p.id === id);
  }
  input(id: string, raw: unknown) {
    const p = this.player(id),
      i = parseInput(raw);
    if (!p || !i || i.seq <= p.input.seq) return false;
    p.input = i;
    p.inputAt = this.state.now;
    p.yaw = i.yaw;
    return true;
  }
  intent(id: string, kind: unknown, data?: unknown) {
    const m = this.state,
      p = this.player(id);
    if (!p || m.phase !== 'playing' || p.stunUntil > m.now) return false;
    if (kind === 'skill' && data && typeof data === 'object') {
      const d = data as Record<string, unknown>;
      return (
        typeof d.id === 'string' &&
        typeof d.time === 'number' &&
        judgeSkill(m, p, d.id, d.time)
      );
    }
    if (kind === 'scream') return scream(m, p);
    if (p.role !== 'killer' || !mobile(p)) return false;
    if (kind === 'hush' && m.now >= p.hushReady) {
      p.hushUntil = m.now + C.HUSH_MS;
      p.hushReady = m.now + C.HUSH_COOLDOWN_MS;
      return true;
    }
    if (kind === 'attack' && m.now >= p.attackUntil) {
      p.attackUntil = m.now + C.MISS_COOLDOWN_MS;
      p.lungeUntil = m.now + C.LUNGE_MS;
      const time = Math.max(
        m.now - C.MAX_REWIND_MS,
        Math.min(
          m.now,
          typeof data === 'number' && Number.isFinite(data) ? data : m.now,
        ),
      );
      const targets = m.players
        .filter((s) => s.role === 'survivor' && mobile(s) && !s.locker)
        .sort((a, b) => distance(a, p) - distance(b, p));
      for (const s of targets) {
        const history = s.history.filter(
          (h) => h.time >= m.now - C.MAX_REWIND_MS,
        );
        const old =
          [...history].reverse().find((h) => h.time <= time) ?? history[0] ?? s;
        const d = distance(p, old);
        const dot =
          ((old.x - p.x) * Math.sin(p.yaw) + (old.z - p.z) * Math.cos(p.yaw)) /
          Math.max(0.01, d);
        if (
          d <= C.ATTACK_RANGE &&
          Math.abs(p.y - s.y) <= 2 &&
          dot >= Math.cos(C.ATTACK_ARC / 2) &&
          lineOfSight(p, { ...s, ...old })
        ) {
          hit(m, p, s);
          break;
        }
      }
      return true;
    }
    return false;
  }
  disconnect(id: string) {
    const p = this.player(id);
    if (!p) return;
    p.connected = false;
    p.input = emptyInput();
    if (this.state.phase === 'lobby') {
      this.state.players = this.state.players.filter((s) => s !== p);
      return;
    }
    if (this.state.phase === 'finished') return;
    if (p.role === 'killer') {
      for (const s of this.state.players)
        if (s.role === 'survivor') escape(this.state, s);
      this.state.phase = 'finished';
      this.state.endedAt = this.state.now;
      this.state.reason = 'the hollow left. you made it out.';
    } else take(this.state, p);
  }
  step(dt = 1 / C.TICK_HZ) {
    const m = this.state;
    m.now += dt * 1000;
    if (m.phase !== 'playing') return;
    for (const p of m.players) {
      p.ack = p.input.seq;
      updateHealth(m, p, dt);
      updateChase(m, p);
      if ((!mobile(p) && p.health !== 'downed') || p.stunUntil > m.now)
        continue;
      const i = p.input,
        fresh = m.now - p.inputAt <= C.INPUT_TIMEOUT_MS;
      if (fresh && !p.locker) {
        const delta = movement(
          p,
          i,
          m.now,
          dt,
          m.players.some((s) => s.carrier === p.id),
        );
        const dx = delta.x,
          dz = delta.z;
        const blocked = palletBlocks(p, delta, m.pallets);
        if (!blocked) this.physics.move(p, dx, dz, dt);
        if ((dx || dz) && p.role === 'survivor' && m.now > p.trailAt) {
          p.trailAt = m.now + C.TRAIL_INTERVAL_MS;
          if (i.run) event(m, 'scratch', p, C.TRAIL_LIFETIME_MS);
          if (p.health === 'injured') event(m, 'blood', p, C.TRAIL_LIFETIME_MS);
        }
      }
      updateTask(m, p, dt);
      p.history.push({ time: m.now, x: p.x, z: p.z });
      while (p.history[0]?.time < m.now - C.HISTORY_MS) p.history.shift();
    }
    updateGenerators(m, dt, this.random);
    updateEndgame(m);
    m.events = m.events.filter((e) => e.until > m.now);
  }
  snapshot(id?: string) {
    return snapshot(this.state, id);
  }
  dispose() {
    this.physics.dispose();
  }
}
