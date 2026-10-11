import { blocks, type Spot } from './maps/rotten-hollow';
import { C } from './config';
export const distance = (a: Pick<Spot, 'x' | 'z'>, b: Pick<Spot, 'x' | 'z'>) =>
  Math.hypot(a.x - b.x, a.z - b.z);
export function lineOfSight(a: Spot, b: Spot) {
  return !blocks.some((w) => {
    if (w.kind === 'foundation') return false;
    let lo = 0,
      hi = 1;
    for (const [p, d, min, max] of [
      [a.x, b.x - a.x, w.x - w.w / 2, w.x + w.w / 2],
      [a.z, b.z - a.z, w.z - w.d / 2, w.z + w.d / 2],
    ]) {
      if (Math.abs(d) < 0.00001) {
        if (p < min || p > max) return false;
      } else {
        const t1 = (min - p) / d,
          t2 = (max - p) / d;
        lo = Math.max(lo, Math.min(t1, t2));
        hi = Math.min(hi, Math.max(t1, t2));
        if (lo > hi) return false;
      }
    }
    return hi > 0 && lo < 1;
  });
}
export function reachable(
  a: Spot & { yaw: number },
  b: Spot,
  range: number = C.INTERACT_RANGE,
) {
  const d = distance(a, b);
  if (Math.abs((a.y ?? 0) - (b.y ?? 0)) > 2) return false;
  return (
    d <= range &&
    lineOfSight(a, b) &&
    (d < 0.5 ||
      ((b.x - a.x) * Math.sin(a.yaw) + (b.z - a.z) * Math.cos(a.yaw)) / d >=
        C.INTERACT_FACING)
  );
}
