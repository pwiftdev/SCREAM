import { C } from './config';
import { cages, windows, type Spot } from './maps/rotten-hollow';
import { distance, reachable } from './geometry';
import { award, cage, event, rescue, stun } from './rules';
import { mobile, type Match, type Player, type Task } from './types';
function task(kind: Task['kind'], target: string, duration: number): Task {
  return { kind, target, duration, progress: 0 };
}
export function nearbyTask(m: Match, p: Player): Task | undefined {
  if (p.stunUntil > m.now || !mobile(p)) return;
  if (p.locker) return task('locker', p.locker, 1);
  const near = (s: Spot) => reachable(p, s);
  if (p.role === 'killer') {
    const carried = m.players.find((s) => s.carrier === p.id);
    if (carried) {
      const c = cages.find(
        (c) =>
          near(c) &&
          !m.players.some((s) => s.health === 'caged' && s.cageId === c.id) &&
          !(carried.lastCage === c.id && carried.immuneUntil > m.now),
      );
      return c ? task('cage', c.id, C.PICKUP_MS) : undefined;
    }
    const down = m.players.find((s) => s.health === 'downed' && near(s));
    if (down) return task('pickup', down.id, C.PICKUP_MS);
    const pallet = m.pallets.find((s) => s.state === 'down' && near(s));
    if (pallet) return task('break', pallet.id, C.PALLET_BREAK_MS);
    const gen = m.generators.find(
      (g) => g.progress > 0 && g.progress < 1 && !g.regressing && near(g),
    );
    if (gen) return task('kick', gen.id, C.PICKUP_MS);
    const locker = m.lockers.find(near);
    if (locker) return task('search', locker.id, C.PICKUP_MS);
  } else {
    const ally = m.players.find(
      (s) =>
        s.id !== p.id &&
        s.role === 'survivor' &&
        ['caged', 'downed', 'injured'].includes(s.health) &&
        near(s),
    );
    if (ally)
      return task(
        ally.health === 'caged' ? 'rescue' : 'heal',
        ally.id,
        ally.health === 'caged' ? C.RESCUE_MS : C.HEAL_MS,
      );
    const gate = m.gates.find((g) => !g.open && near(g));
    if (
      gate &&
      m.generators.filter((g) => g.progress >= 1).length >= m.required
    )
      return task('gate', gate.id, C.GATE_MS);
    const gen = m.generators.find((g) => g.progress < 1 && near(g));
    if (gen) return task('repair', gen.id, C.REPAIR_SECONDS_SOLO * 1000);
    const pallet = m.pallets.find((s) => s.state === 'up' && near(s));
    if (pallet) return task('drop', pallet.id, C.PALLET_DROP_MS);
    const locker = m.lockers.find(
      (s) => near(s) && !m.players.some((p) => p.locker === s.id),
    );
    if (locker) return task('locker', locker.id, C.VAULT_MS);
  }
  const window =
    windows.find(near) ??
    (p.role === 'survivor'
      ? m.pallets.find((s) => s.state === 'down' && near(s))
      : undefined);
  if (window)
    return task(
      'vault',
      window.id,
      p.role === 'killer'
        ? C.KILLER_VAULT_MS
        : p.input.run
          ? C.VAULT_FAST_MS
          : C.VAULT_MS,
    );
  if (p.role === 'survivor' && p.health === 'injured')
    return task('heal', p.id, C.SELF_HEAL_MS);
}
function finish(m: Match, p: Player, t: Task) {
  const other = m.players.find((s) => s.id === t.target),
    pallet = m.pallets.find((s) => s.id === t.target);
  switch (t.kind) {
    case 'heal':
      if (other && ['injured', 'downed'].includes(other.health)) {
        other.health = other.health === 'downed' ? 'injured' : 'healthy';
        award(p, 'Rescue', C.POINTS.heal);
      }
      break;
    case 'pickup':
      if (other?.health === 'downed') {
        other.health = 'carried';
        other.carrier = p.id;
        other.struggle = 0;
        event(m, 'scream', other);
      }
      break;
    case 'cage': {
      const carried = m.players.find((s) => s.carrier === p.id);
      if (carried) cage(m, p, carried, t.target);
      break;
    }
    case 'rescue':
      if (other) rescue(m, p, other);
      break;
    case 'kick': {
      const gen = m.generators.find((g) => g.id === t.target);
      if (gen) {
        gen.progress = Math.max(0, gen.progress - C.KICK_LOSS);
        gen.regressing = true;
      }
      break;
    }
    case 'drop':
      if (pallet?.state === 'up') {
        pallet.state = 'down';
        const k = m.players.find((s) => s.role === 'killer');
        if (k && distance(k, pallet) <= C.PALLET_STUN_RANGE)
          stun(m, k, C.PALLET_STUN_MS);
        event(m, 'noise', pallet);
      }
      break;
    case 'break':
      if (pallet) {
        pallet.state = 'broken';
        award(p, 'Hunt', C.POINTS.pallet);
        event(m, 'bell', p);
      }
      break;
    case 'vault': {
      const s = windows.find((s) => s.id === t.target) ?? pallet;
      if (s) {
        p.x = s.x + Math.sin(p.yaw) * 1.6;
        p.z = s.z + Math.cos(p.yaw) * 1.6;
      }
      break;
    }
    case 'locker':
      if (p.locker) {
        p.locker = undefined;
        p.z += 1.3;
      } else if (!m.players.some((s) => s.locker === t.target)) {
        p.locker = t.target;
        const spot = m.lockers.find((l) => l.id === t.target)!;
        p.x = spot.x;
        p.z = spot.z;
        const k = m.players.find((s) => s.role === 'killer');
        if (k && reachable(k, p, C.VISIBILITY_RANGE)) event(m, 'noise', p);
      }
      break;
    case 'search': {
      const hiding = m.players.find((s) => s.locker === t.target);
      if (hiding) {
        hiding.locker = undefined;
        hiding.health = 'carried';
        hiding.carrier = p.id;
        hiding.struggle = 0;
        event(m, 'scream', hiding);
      }
      break;
    }
  }
}
export function updateTask(m: Match, p: Player, dt: number) {
  if (!p.input.interact || m.now - p.inputAt > C.INPUT_TIMEOUT_MS) {
    p.interactLatch = false;
    p.task = undefined;
    p.skill = undefined;
    return;
  }
  if (p.interactLatch) return;
  const next = nearbyTask(m, p);
  if (!next) {
    p.task = undefined;
    p.skill = undefined;
    return;
  }
  if (p.task?.kind !== next.kind || p.task.target !== next.target)
    p.task = next;
  const t = p.task;
  if (!t) return;
  if (t.kind === 'repair') return;
  if (t.kind === 'gate') {
    const operator = m.players.find(
      (s) => s.task?.kind === 'gate' && s.task.target === t.target,
    );
    if (operator && operator.id !== p.id) {
      p.task = undefined;
      return;
    }
    const g = m.gates.find((g) => g.id === t.target)!;
    g.progress = Math.min(1, g.progress + (dt * 1000) / C.GATE_MS);
    t.progress = g.progress;
    if (g.progress >= 1) {
      g.open = true;
      p.task = undefined;
    }
    return;
  }
  t.progress += (dt * 1000) / t.duration;
  if (t.progress >= 1) {
    finish(m, p, t);
    p.task = undefined;
    if (['locker', 'drop', 'vault'].includes(t.kind)) p.interactLatch = true;
    else p.input.interact = false;
  }
}
export function updateGenerators(m: Match, dt: number, random: () => number) {
  for (const g of m.generators) {
    if (g.progress >= 1) continue;
    const workers = m.players.filter(
      (p) => p.task?.kind === 'repair' && p.task.target === g.id && mobile(p),
    );
    if (workers.length) {
      g.regressing = false;
      const before = g.progress;
      g.progress = Math.min(
        1,
        g.progress +
          (dt / C.REPAIR_SECONDS_SOLO) *
            C.REPAIR_MULTIPLIER[Math.min(workers.length, 4) - 1],
      );
      for (const p of workers) {
        p.task!.progress = g.progress;
        award(
          p,
          'Repair',
          ((g.progress - before) * C.POINTS.repair) / workers.length,
        );
        if (m.now >= p.nextSkill && !p.skill) {
          p.skill = {
            id: `${p.id}-${m.now}`,
            startAt: m.now + 300,
            zoneStart: 0.45 + random() * 0.25,
            zoneEnd: 0,
            durationMs: C.SKILL_DURATION_MS,
          };
          p.skill.zoneEnd = p.skill.zoneStart + C.SKILL_GOOD_WIDTH;
          p.nextSkill =
            m.now +
            C.SKILL_INTERVAL_MIN_MS +
            random() * (C.SKILL_INTERVAL_MAX_MS - C.SKILL_INTERVAL_MIN_MS);
        }
        if (
          p.skill &&
          m.now >
            p.skill.startAt + p.skill.durationMs + C.SKILL_CHECK_LATENCY_MS
        )
          judgeSkill(m, p, p.skill.id, m.now);
      }
      if (g.progress >= 1) {
        event(m, 'power', g);
        for (const p of workers) {
          p.skill = undefined;
          p.task = undefined;
        }
      }
    } else if (g.regressing)
      g.progress = Math.max(0, g.progress - dt * C.REGRESSION_PER_SECOND);
  }
}
export function judgeSkill(m: Match, p: Player, id: string, pressedAt: number) {
  const s = p.skill;
  if (!s || s.id !== id || !Number.isFinite(pressedAt)) return false;
  const g = m.generators.find((g) => g.id === p.task?.target);
  if (!g) return false;
  const received = m.now;
  const time = Math.max(
    received - C.SKILL_CHECK_LATENCY_MS,
    Math.min(received, pressedAt),
  );
  const phase = (time - s.startAt) / s.durationMs;
  p.skill = undefined;
  if (phase >= s.zoneStart && phase <= s.zoneEnd) {
    if (phase <= s.zoneStart + C.SKILL_GREAT_WIDTH) {
      g.progress = Math.min(1, g.progress + C.SKILL_GREAT_BONUS);
      award(p, 'Repair', C.POINTS.great);
    }
  } else {
    g.progress = Math.max(0, g.progress - C.SKILL_MISS_PENALTY);
    p.revealUntil = m.now + C.NOISE_MS;
    event(m, 'noise', p);
  }
  return true;
}
