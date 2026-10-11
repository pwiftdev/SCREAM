import { B, BLOCKS } from './blocks';
import { at, index, type HouseV1, type Vec3i } from './format';
export function clearSight(
  h: HouseV1,
  from: Vec3i,
  to: Vec3i,
  open: Set<number>,
  throughGlass = false,
) {
  const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z),
    steps = Math.ceil(length * 8);
  const end = index(Math.floor(to.x), Math.floor(to.y), Math.floor(to.z));
  for (let i = 1; i < steps; i++) {
    const t = i / steps,
      x = Math.floor(from.x + (to.x - from.x) * t),
      y = Math.floor(from.y + (to.y - from.y) * t),
      z = Math.floor(from.z + (to.z - from.z) * t),
      key = index(x, y, z),
      block = at(h, x, y, z);
    if (
      key !== end &&
      BLOCKS[block].solid &&
      (!throughGlass || block !== B.GLASS) &&
      !open.has(key)
    )
      return false;
  }
  return true;
}
