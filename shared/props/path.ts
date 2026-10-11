import { H } from '../config';
import { B, BLOCKS } from '../house/blocks';
import { at, index, type HouseV1 } from '../house/format';
import type { Position } from '../house/collision';
export function findPath(
  h: HouseV1,
  start: Position,
  end: Position,
  open: Set<number>,
): Position[] {
  const y = Math.max(1, Math.floor(start.y)),
    sx = Math.floor(start.x),
    sz = Math.floor(start.z),
    tx = Math.floor(end.x),
    tz = Math.floor(end.z),
    key = (x: number, z: number) => x + z * H.PLOT_W;
  const startKey = key(sx, sz),
    target = key(tx, tz),
    front = [startKey],
    cost = new Map([[startKey, 0]]),
    parent = new Map<number, number>();
  const distance = (n: number) =>
    Math.abs((n % H.PLOT_W) - tx) + Math.abs(Math.floor(n / H.PLOT_W) - tz);
  const pass = (x: number, z: number) =>
    [y, y + 1].every(
      (yy) => !BLOCKS[at(h, x, yy, z)].solid || open.has(index(x, yy, z)),
    ) && at(h, x, y - 1, z) !== B.AIR;
  while (front.length) {
    front.sort(
      (a, b) =>
        cost.get(a)! + distance(a) - cost.get(b)! - distance(b) || a - b,
    );
    const n = front.shift()!;
    if (n === target) {
      const path: Position[] = [];
      let c = n;
      while (c !== startKey) {
        path.unshift({
          x: (c % H.PLOT_W) + 0.5,
          y,
          z: Math.floor(c / H.PLOT_W) + 0.5,
        });
        c = parent.get(c)!;
      }
      return path;
    }
    const x = n % H.PLOT_W,
      z = Math.floor(n / H.PLOT_W);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx,
        nz = z + dz,
        k = key(nx, nz),
        g = cost.get(n)! + 1;
      if (
        nx < 0 ||
        nx >= H.PLOT_W ||
        nz < 0 ||
        nz >= H.PLOT_D ||
        !pass(nx, nz) ||
        g >= (cost.get(k) ?? Infinity)
      )
        continue;
      parent.set(k, n);
      cost.set(k, g);
      if (!front.includes(k)) front.push(k);
    }
  }
  return [];
}
