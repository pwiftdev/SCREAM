import { C, CHARACTERS } from './config';
import { distance, reachable } from './geometry';
import { nearbyTask } from './interactions';
import { mobile, terminal, type Player } from './types';
import type { Simulation } from './simulation';
import { Navigator } from './navigation';
import { killerTarget, survivorTarget } from './bot-targets';
const navigators = new WeakMap<Simulation, Navigator>();
export function fillBots(sim: Simulation, count: number) {
  for (let i = 0; i < count && sim.state.players.length < C.MAX_PLAYERS; i++) {
    const role = sim.state.players.some((p) => p.role === 'killer')
      ? 'survivor'
      : 'killer';
    sim.add(
      `bot-${i}`,
      role === 'killer' ? 'The Hollow' : CHARACTERS[i % CHARACTERS.length],
      role,
      i % CHARACTERS.length,
      true,
    );
  }
}
export function updateBots(sim: Simulation) {
  const m = sim.state;
  let nav = navigators.get(sim);
  if (!nav) {
    nav = new Navigator();
    navigators.set(sim, nav);
  }
  for (const p of m.players.filter((p) => p.bot)) {
    if (terminal(p)) continue;
    if (p.skill) {
      const t =
        p.skill.startAt + (p.skill.zoneStart + 0.07) * p.skill.durationMs;
      if (m.now >= t)
        sim.intent(p.id, 'skill', { id: p.skill.id, time: m.now });
    }
    const { target, fleeing } =
      p.role === 'killer'
        ? { target: killerTarget(m, p), fleeing: false }
        : survivorTarget(m, p);
    if (!target) continue;
    const waypoint = nav.toward(p, target, m.now);
    const angle = Math.atan2(waypoint.x - p.x, waypoint.z - p.z);
    const delta = { x: Math.sin(angle), z: Math.cos(angle), yaw: angle };
    p.yaw = Math.atan2(target.x - p.x, target.z - p.z);
    const interact =
      !fleeing &&
      reachable(p, target) &&
      !('open' in target && target.open) &&
      !(p.role === 'killer' && 'health' in target && mobile(target as Player));
    const t = nearbyTask(m, p);
    const obstacle =
      t &&
      (p.role === 'killer'
        ? t.kind === 'break'
        : t.kind === 'vault' || (fleeing && t.kind === 'drop'));
    const acting = (interact && !!t) || !!obstacle;
    sim.input(p.id, {
      ...delta,
      yaw: p.yaw,
      x: acting ? 0 : delta.x,
      z: acting ? 0 : delta.z,
      seq: p.ack + 1,
      run: true,
      crouch: false,
      interact: !p.interactLatch && (acting || p.health === 'carried'),
      time: m.now,
    });
    if (
      p.role === 'killer' &&
      'health' in target &&
      mobile(target as Player) &&
      distance(p, target) < C.ATTACK_RANGE
    )
      sim.intent(p.id, 'attack');
  }
}
