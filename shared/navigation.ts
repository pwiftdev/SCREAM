import { blocks, type Spot } from './maps/rotten-hollow';
import { distance } from './geometry';
const CELL = 2,
  SIDE = 45;
const clear = (x: number, z: number) =>
  Math.abs(x) < 44 &&
  Math.abs(z) < 44 &&
  !blocks.some(
    (b) =>
      b.kind !== 'foundation' &&
      Math.abs(x - b.x) < b.w / 2 + 0.4 &&
      Math.abs(z - b.z) < b.d / 2 + 0.4,
  );
const point = (id: number) => ({
  id: String(id),
  x: (id % SIDE) * CELL - 44,
  z: Math.floor(id / SIDE) * CELL - 44,
});
const node = (p: Spot) =>
  Math.max(0, Math.min(SIDE - 1, Math.round((p.z + 44) / CELL))) * SIDE +
  Math.max(0, Math.min(SIDE - 1, Math.round((p.x + 44) / CELL)));
const walkable = Array.from({ length: SIDE * SIDE }, (_, i) => {
  const p = point(i);
  return clear(p.x, p.z);
});
export function route(start: Spot, target: Spot) {
  const from = node(start);
  let goal = node(target);
  if (!walkable[goal]) {
    const choices = walkable.flatMap((yes, i) => (yes ? [i] : []));
    goal = choices.sort(
      (a, b) => distance(point(a), target) - distance(point(b), target),
    )[0];
  }
  const open = new Set([from]),
    cost = new Map([[from, 0]]),
    parent = new Map<number, number>(),
    score = new Map([[from, distance(point(from), point(goal))]]);
  let budget = SIDE * SIDE;
  while (open.size && budget--) {
    let current = -1,
      best = Infinity;
    for (const id of open) {
      const f = score.get(id) ?? Infinity;
      if (f < best) {
        best = f;
        current = id;
      }
    }
    if (current === goal) {
      const result: Spot[] = [];
      while (parent.has(current)) {
        result.unshift(point(current));
        current = parent.get(current)!;
      }
      return result;
    }
    open.delete(current);
    const p = point(current);
    for (const dx of [-1, 0, 1])
      for (const dz of [-1, 0, 1]) {
        if (!dx && !dz) continue;
        const q = { id: '', x: p.x + dx * CELL, z: p.z + dz * CELL },
          n = node(q);
        if (!walkable[n] || !clear(p.x + dx, p.z + dz)) continue;
        const g = (cost.get(current) ?? 0) + Math.hypot(dx, dz) * CELL;
        if (g >= (cost.get(n) ?? Infinity)) continue;
        parent.set(n, current);
        cost.set(n, g);
        score.set(n, g + distance(q, point(goal)));
        open.add(n);
      }
  }
  return [];
}
export class Navigator {
  paths = new Map<string, { path: Spot[]; target: Spot; at: number }>();
  toward(p: Spot, target: Spot, now: number) {
    let plan = this.paths.get(p.id);
    if (!plan || now - plan.at > 1800 || distance(plan.target, target) > 3) {
      plan = { path: route(p, target), target: { ...target }, at: now };
      this.paths.set(p.id, plan);
    }
    while (plan.path.length && distance(p, plan.path[0]) < 0.65)
      plan.path.shift();
    return plan.path[0] ?? target;
  }
}
