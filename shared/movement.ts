import { C } from './config';
import type { Input } from './types';
export interface Mover {
  role: 'survivor' | 'killer';
  health: string;
  boostUntil: number;
  lungeUntil: number;
}
export function movement(
  p: Mover,
  input: Input,
  now: number,
  dt: number,
  carrying = false,
) {
  let speed =
    p.role === 'killer'
      ? C.KILLER_SPEED - (carrying ? C.CARRY_PENALTY : 0)
      : input.crouch
        ? C.SURVIVOR_CROUCH
        : input.run
          ? C.SURVIVOR_RUN
          : C.SURVIVOR_WALK;
  if (p.health === 'downed') speed = C.DOWNED_SPEED;
  if (p.boostUntil > now) speed *= C.HIT_BOOST;
  if (p.lungeUntil > now) speed *= C.LUNGE_MULTIPLIER;
  const length = Math.max(1, Math.hypot(input.x, input.z));
  return {
    x: (input.x / length) * speed * dt,
    z: (input.z / length) * speed * dt,
  };
}

export function palletBlocks(
  p: { x: number; z: number },
  delta: { x: number; z: number },
  pallets: { x: number; z: number; state: string }[],
) {
  return pallets.some(
    (s) =>
      s.state === 'down' &&
      Math.abs(p.x + delta.x - s.x) < 1.2 &&
      Math.abs(p.z + delta.z - s.z) < 0.35,
  );
}
