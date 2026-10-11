import { nearbyTask } from './interactions';
import { C } from './config';
import { distance, lineOfSight } from './geometry';
import type { Match, Player, PublicPlayer, Snapshot } from './types';
export function canSee(viewer: Player, p: Player, now: number) {
  if (
    viewer.id === p.id ||
    (viewer.role === 'survivor' && p.role === 'survivor')
  )
    return true;
  if (viewer.role === 'killer') {
    if (p.carrier === viewer.id) return true;
    if (p.locker) return false;
    return (
      p.revealUntil > now ||
      (distance(viewer, p) <= C.VISIBILITY_RANGE && lineOfSight(viewer, p))
    );
  }
  return (
    distance(viewer, p) <= C.KILLER_NEAR_RANGE ||
    (distance(viewer, p) <= C.VISIBILITY_RANGE && lineOfSight(viewer, p))
  );
}
export function snapshot(m: Match, viewerId?: string): Snapshot {
  const viewer = m.players.find((p) => p.id === viewerId);
  const players = m.players.map((p): PublicPlayer => {
    const v: PublicPlayer = {
      id: p.id,
      name: p.name,
      character: p.character,
      cosmetic: p.cosmetic,
      role: p.role,
      health: p.health,
      connected: p.connected,
      cages: p.cages,
      points: { ...p.points },
    };
    if (!viewer || canSee(viewer, p, m.now)) {
      Object.assign(v, {
        x: p.x,
        y: p.y,
        z: p.z,
        yaw: p.yaw,
        action:
          p.stunUntil > m.now
            ? 'stunned'
            : p.lungeUntil > m.now
              ? 'lunge'
              : p.attackUntil > m.now
                ? 'wipe'
                : m.now - p.screamAt < C.SCREAM_WINDOW_MS
                  ? 'scream'
                  : (p.task?.kind ??
                    (p.input.crouch ? 'crouch_walk' : undefined)),
      });
      if (p.health === 'caged')
        v.cageRemaining = Math.max(
          0,
          C.CAGE_STAGE_MS * (p.cages === 1 ? 2 : 1) - (m.now - p.cagedAt),
        );
    }
    if (!viewer || viewer.id === p.id) {
      Object.assign(v, {
        task: p.task ? { ...p.task } : undefined,
        prompt: nearbyTask(m, p),
        screamUsed: p.screamUsed,
        hushReady: p.hushReady,
        hushUntil: p.hushUntil,
        stunUntil: p.stunUntil,
        attackUntil: p.attackUntil,
        struggle: p.struggle,
        hidden: !!p.locker,
        carrying: m.players.some((s) => s.carrier === p.id),
        boostUntil: p.boostUntil,
        lungeUntil: p.lungeUntil,
        ack: p.ack,
        skill: p.skill ? { ...p.skill } : undefined,
      });
    }
    return v;
  });
  const k = m.players.find((p) => p.role === 'killer');
  const dread =
    viewer?.role === 'survivor' && k && k.hushUntil <= m.now
      ? Math.max(0, 1 - distance(viewer, k) / C.DREAD_RADIUS)
      : undefined;
  return {
    id: m.id,
    lockers: m.lockers.map((l) => ({ ...l })),
    seed: m.seed,
    now: m.now,
    startedAt: m.startedAt,
    phase: m.phase,
    required: m.required,
    players,
    generators: m.generators.map((g) => ({ ...g })),
    gates: m.gates.map((g) => ({ ...g })),
    pallets: m.pallets.map((p) => ({ ...p })),
    events: m.events
      .filter(
        (e) =>
          !viewer ||
          (['scratch', 'blood'].includes(e.kind)
            ? viewer.role === 'killer'
            : distance(viewer, e) <= C.VISIBILITY_RANGE ||
              ['power', 'bell', 'together'].includes(e.kind)),
      )
      .map((e) => ({ ...e })),
    dawnAt: m.dawnAt,
    endedAt: m.endedAt,
    reason: m.reason,
    self: viewerId,
    dread,
    chase: !!(
      viewer?.role === 'survivor' &&
      k &&
      distance(viewer, k) < C.CHASE_RADIUS &&
      lineOfSight(viewer, k)
    ),
  };
}
