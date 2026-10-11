import { C } from './config';
import { cages } from './maps/rotten-hollow';
import { distance, lineOfSight } from './geometry';
import type { GameEvent, Match, Player, Points } from './types';
import { mobile, terminal } from './types';
export function award(p: Player, category: keyof Points, amount: number) {
  p.points[category] += amount;
}
export function event(
  m: Match,
  kind: GameEvent['kind'],
  p: { id: string; x: number; z: number },
  duration: number = C.NOISE_MS,
) {
  m.events.push({
    id: `${m.now}-${m.events.length}-${kind}`,
    kind,
    x: p.x,
    z: p.z,
    at: m.now,
    until: m.now + duration,
    player: p.id,
  });
  if (m.events.length > C.MAX_EVENTS) m.events.shift();
}
export function release(m: Match, p: Player) {
  p.carrier = undefined;
  p.health = 'injured';
  p.struggle = 0;
  p.boostUntil = m.now + C.HIT_BOOST_MS;
  p.task = undefined;
}
export function stun(m: Match, k: Player, ms: number) {
  k.stunUntil = Math.max(k.stunUntil, m.now + ms);
  k.task = undefined;
  for (const p of m.players) if (p.carrier === k.id) release(m, p);
}
export function take(m: Match, p: Player) {
  if (terminal(p)) return;
  p.health = 'taken';
  p.task = undefined;
  p.skill = undefined;
  p.carrier = undefined;
  p.locker = undefined;
  const killer = m.players.find((p) => p.role === 'killer');
  if (killer) award(killer, 'Hunt', C.POINTS.take);
  event(m, 'take', p);
}
export function hit(m: Match, k: Player, p: Player) {
  if (!mobile(p) || p.locker || k.stunUntil > m.now) return false;
  const down = p.health === 'injured';
  p.health = down ? 'downed' : 'injured';
  p.boostUntil = m.now + C.HIT_BOOST_MS;
  p.bleedAt = down ? m.now + C.BLEED_MS : 0;
  p.task = undefined;
  p.skill = undefined;
  p.revealUntil = m.now + C.SCREAM_MARKER_MS;
  k.attackUntil = m.now + C.HIT_COOLDOWN_MS;
  award(k, 'Hunt', down ? C.POINTS.down : C.POINTS.hit);
  event(m, 'hit', p);
  event(m, 'scream', p, C.SCREAM_MARKER_MS);
  return true;
}
export function cage(m: Match, k: Player, p: Player, id: string) {
  const spot = cages.find((c) => c.id === id);
  if (
    !spot ||
    p.carrier !== k.id ||
    distance(k, spot) > C.INTERACT_RANGE ||
    m.players.some((s) => s.health === 'caged' && s.cageId === id) ||
    (p.lastCage === id && p.immuneUntil > m.now)
  )
    return false;
  p.cages++;
  p.carrier = undefined;
  p.task = undefined;
  p.cageId = id;
  p.lastCage = id;
  p.x = spot.x;
  p.z = spot.z;
  p.cagedAt = m.now;
  p.health = 'caged';
  award(k, 'Hunt', C.POINTS.cage);
  event(m, 'bell', k);
  event(m, 'scream', p, C.SCREAM_MARKER_MS);
  if (p.cages >= C.CAGE_LIMIT) take(m, p);
  return true;
}
export function rescue(m: Match, helper: Player, p: Player) {
  if (
    p.health !== 'caged' ||
    !mobile(helper) ||
    distance(helper, p) > C.INTERACT_RANGE
  )
    return false;
  p.health = 'injured';
  p.cageId = undefined;
  p.boostUntil = m.now + C.RESCUE_BOOST_MS;
  p.immuneUntil = m.now + C.RECAGE_IMMUNITY_MS;
  award(helper, 'Rescue', C.POINTS.rescue);
  return true;
}
export function scream(m: Match, p: Player) {
  if (!mobile(p) || p.screamUsed || p.role !== 'survivor' || p.locker)
    return false;
  p.screamUsed = true;
  p.screamAt = m.now;
  p.revealUntil = m.now + C.SCREAM_REVEAL_MS;
  event(m, 'scream', p, C.SCREAM_REVEAL_MS);
  const allies = m.players.filter(
    (s) =>
      s.role === 'survivor' &&
      s.screamUsed &&
      m.now - s.screamAt <= C.SCREAM_WINDOW_MS &&
      distance(s, p) <= C.SCREAM_ALLY_RANGE &&
      mobile(s),
  );
  const k = m.players.find((s) => s.role === 'killer');
  if (
    allies.length >= 2 &&
    k &&
    allies.some(
      (s) => distance(k, s) <= C.SCREAM_KILLER_RANGE && lineOfSight(k, s),
    )
  ) {
    stun(m, k, C.SCREAM_STUN_MS + C.SCREAM_EXTRA_MS * (allies.length - 2));
    event(m, 'together', p, C.SCREAM_STUN_MS);
  }
  return true;
}
export function updateHealth(m: Match, p: Player, dt: number) {
  if (p.health === 'downed' && m.now >= p.bleedAt) take(m, p);
  if (
    p.health === 'caged' &&
    m.now - p.cagedAt >= C.CAGE_STAGE_MS * (p.cages === 1 ? 2 : 1)
  )
    take(m, p);
  if (p.health === 'carried') {
    const k = m.players.find((s) => s.id === p.carrier);
    if (k) {
      p.x = k.x;
      p.y = k.y;
      p.z = k.z;
      p.yaw = k.yaw;
    }
    if (p.input.interact && m.now - p.inputAt < C.INPUT_TIMEOUT_MS)
      p.struggle += dt * 1000;
    if (p.struggle >= C.STRUGGLE_MS) release(m, p);
  }
}
export function escape(m: Match, p: Player) {
  if (terminal(p)) return;
  p.health = 'escaped';
  p.task = undefined;
  p.skill = undefined;
  p.carrier = undefined;
  p.locker = undefined;
  award(p, 'Survival', C.POINTS.escape);
  event(m, 'escape', p);
}
export function updateEndgame(m: Match) {
  const powered =
    m.generators.filter((g) => g.progress >= 1).length >= m.required;
  if (
    (m.gates.some((g) => g.open) || m.now - m.startedAt >= C.MATCH_CAP_MS) &&
    !m.dawnAt
  ) {
    m.dawnAt = m.now + C.DAWN_MS;
    event(m, 'power', m.gates[0]);
  }
  if (powered)
    for (const p of m.players)
      if (
        p.role === 'survivor' &&
        mobile(p) &&
        m.gates.some((g) => g.open && distance(p, g) < 2)
      ) {
        escape(m, p);
      }
  if (m.dawnAt && m.now >= m.dawnAt)
    for (const p of m.players) if (p.role === 'survivor') take(m, p);
  if (m.players.filter((p) => p.role === 'survivor').every(terminal)) {
    m.phase = 'finished';
    m.endedAt = m.now;
    m.reason = 'the night is over.';
  }
}

export function updateChase(m: Match, p: Player) {
  if (p.role !== 'survivor' || !mobile(p)) return;
  const k = m.players.find((s) => s.role === 'killer');
  if (k && distance(k, p) < C.CHASE_RADIUS && lineOfSight(k, p)) {
    p.chaseSince ||= m.now;
    p.chaseLast = m.now;
  } else if (p.chaseSince && m.now - p.chaseLast > C.CHASE_END_MS) {
    if (p.chaseLast - p.chaseSince >= C.CHASE_SCORE_MS)
      award(p, 'Survival', C.POINTS.chase);
    p.chaseSince = 0;
  }
}
