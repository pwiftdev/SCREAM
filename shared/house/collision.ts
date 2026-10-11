import { H } from '../config';
import { B, BLOCKS } from './blocks';
import { at, index, rotation, type HouseV1 } from './format';
export interface Position {
  x: number;
  y: number;
  z: number;
}
export function blockTop(
  h: HouseV1,
  x: number,
  y: number,
  z: number,
  px: number,
  pz: number,
) {
  const b = at(h, x, y, z);
  if (b === B.SLAB) return y + 0.5;
  if (b === B.RED || b === B.BLACK) return y + 0.08;
  if (b === B.STAIRS) {
    const r = rotation(h, index(x, y, z)),
      v = [pz - z, px - x, 1 - (pz - z), 1 - (px - x)][r];
    return y + (v > 0.5 ? 1 : 0.5);
  }
  return y + 1;
}
export function collides(
  h: HouseV1,
  p: Position,
  height: number,
  open: Set<number>,
) {
  const r = H.RADIUS,
    e = 0.00001;
  if (
    p.x - r < 0 ||
    p.z - r < 0 ||
    p.x + r > H.PLOT_W ||
    p.z + r > H.PLOT_D ||
    p.y + height > (h.height ?? H.PLOT_H)
  )
    return true;
  for (let x = Math.floor(p.x - r + e); x <= Math.floor(p.x + r - e); x++)
    for (let z = Math.floor(p.z - r + e); z <= Math.floor(p.z + r - e); z++)
      for (
        let y = Math.floor(p.y + e);
        y <= Math.floor(p.y + height - e);
        y++
      ) {
        const id = at(h, x, y, z);
        if (
          BLOCKS[id].solid &&
          !open.has(index(x, y, z)) &&
          p.y < blockTop(h, x, y, z, p.x, p.z) - e
        )
          return true;
      }
  return false;
}
export function moveAxis(
  h: HouseV1,
  p: Position,
  axis: 'x' | 'y' | 'z',
  delta: number,
  height: number,
  open: Set<number>,
  step = false,
) {
  const next = { ...p, [axis]: p[axis] + delta };
  if (!collides(h, next, height, open)) {
    p[axis] = next[axis];
    return true;
  }
  if (step && axis !== 'y') {
    for (const up of [0.08, 0.5, H.STEP]) {
      const raised = { ...next, y: p.y + up };
      if (
        !collides(h, raised, height, open) &&
        !collides(h, { ...p, y: raised.y }, height, open)
      ) {
        p[axis] = next[axis];
        p.y = raised.y;
        return true;
      }
    }
  }
  return false;
}
