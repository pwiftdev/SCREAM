import { FOREST_CLEARINGS } from './forest-sites';
import { sceneryCollision } from './scenery-collision';
import { FOREST_SOLIDS } from './forest';
import { WORLD_SCENERY } from './world-scenery';
import { NIGHT } from './rework';
import { H } from '../config';
import {
  DISTRICTS,
  LANDMARKS,
  plotLocation,
  type StreetPosition,
} from './world-layout';
export {
  DISTRICTS,
  LANDMARKS,
  WORLD_PATHS,
  plotLocation,
  pathDistance,
  type StreetPosition,
} from './world-layout';
export interface StreetInput {
  forward: number;
  side: number;
  yaw: number;
  sprint?: boolean;
}
export interface WorldBox {
  x: number;
  z: number;
  w: number;
  d: number;
  kind: 'house' | 'church' | 'grave' | 'tree' | 'wall';
  yaw?: number;
}
export const SCENERY_PROPS = [
  { asset: 'hp_crate', x: 87, z: 160, height: 1, yaw: 0.2, w: 1, d: 1 },
  {
    asset: 'hp_crate',
    x: 114,
    z: 159,
    height: 0.7,
    yaw: 0.8,
    w: 0.7,
    d: 0.7,
  },
  {
    asset: 'hp_crate',
    x: -119,
    z: 370,
    height: 0.9,
    yaw: 0.3,
    w: 0.9,
    d: 0.9,
  },
  {
    asset: 'prop_pew',
    x: -8,
    z: 27,
    height: 0.9,
    yaw: 1.5,
    w: 2.4,
    d: 0.7,
  },
  {
    asset: 'prop_pew',
    x: -95,
    z: 178,
    height: 0.9,
    yaw: 0.3,
    w: 2.4,
    d: 0.7,
  },
  {
    asset: 'prop_pew',
    x: 90,
    z: 370,
    height: 0.9,
    yaw: -1,
    w: 2.4,
    d: 0.7,
  },
];
export const WORLD_BOXES: WorldBox[] = Array.from(
  { length: H.PLOTS_PER_STREET },
  (_, i) => {
    const p = plotLocation(i);
    return {
      x: p.center.x,
      z: p.center.z,
      w: 18,
      d: 21,
      kind: 'house' as const,
      yaw: p.yaw,
    };
  },
);
WORLD_BOXES.push(
  ...WORLD_SCENERY.filter((p) => p.solid).map((p) => ({
    x: p.x,
    z: p.z,
    w: p.solid![0],
    d: p.solid![1],
    yaw: p.yaw,
    kind: 'wall' as const,
  })),
);
WORLD_BOXES.push({ x: 122, z: 379, w: 4, d: 4, kind: 'church' });
WORLD_BOXES.push({ x: -20, z: 27, w: 8, d: 8, kind: 'wall' });
WORLD_BOXES.push(
  ...SCENERY_PROPS.map((p) => ({ ...p, kind: 'wall' as const })),
  { x: -110, z: 198, w: 8, d: 7, kind: 'wall' },
  ...[84, 95, 106].map((x) => ({
    x,
    z: 159,
    w: 7,
    d: 4,
    kind: 'wall' as const,
  })),
  ...[102, 112].map((x) => ({ x, z: 196, w: 1, d: 2, kind: 'wall' as const })),
);
for (let i = 0; i < 22; i++)
  WORLD_BOXES.push({
    x: -121 + (i % 5) * 8,
    z: 187 + Math.floor(i / 5) * 5,
    w: 0.7,
    d: 0.5,
    kind: 'grave',
  });
WORLD_BOXES.push(...FOREST_SOLIDS);
const sceneryBlocked = sceneryCollision(WORLD_BOXES, H.RADIUS);
export function worldBlocked(x: number, z: number) {
  const r = H.RADIUS;
  if (
    x < -H.WORLD_HALF_W + r ||
    x > H.WORLD_HALF_W - r ||
    z < H.WORLD_MIN_Z + r ||
    z > H.WORLD_MAX_Z - r
  )
    return true;
  return sceneryBlocked(x, z);
}
export function moveStreet(p: StreetPosition, input: StreetInput, dt: number) {
  const n = Math.max(1, Math.hypot(input.forward, input.side)),
    distance =
      H.STREET_SPEED *
      (input.sprint ? NIGHT.sprintMultiplier : 1) *
      Math.min(dt, H.MAX_FRAME_S);
  const dx =
      ((-Math.sin(input.yaw) * input.forward +
        Math.cos(input.yaw) * input.side) /
        n) *
      distance,
    dz =
      ((-Math.cos(input.yaw) * input.forward -
        Math.sin(input.yaw) * input.side) /
        n) *
      distance;
  if (!worldBlocked(p.x + dx, p.z)) p.x += dx;
  if (!worldBlocked(p.x, p.z + dz)) p.z += dz;
  return p;
}
export function nearestDoor(p: StreetPosition) {
  let slot = -1,
    distance = Infinity;
  for (let i = 0; i < H.PLOTS_PER_STREET; i++) {
    const d = plotLocation(i).door,
      n = Math.hypot(p.x - d.x, p.z - d.z);
    if (n < distance) {
      distance = n;
      slot = i;
    }
  }
  return { slot, distance };
}
export function district(p: StreetPosition) {
  const landmark = LANDMARKS.find((l) => Math.hypot(l.x - p.x, l.z - p.z) < 28);
  if (landmark) return landmark.name;
  const clearing = FOREST_CLEARINGS.find(
    (site) => Math.hypot(site.x - p.x, site.z - p.z) < site.radius + 3,
  );
  if (clearing) return clearing.name;
  const closest = [...DISTRICTS].sort(
    (a, b) =>
      Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(p.x - b.x, p.z - b.z),
  )[0];
  return Math.hypot(p.x - closest.x, p.z - closest.z) < 85
    ? closest.name
    : 'The whispering woods';
}

export function isFinalNight(now = new Date()) {
  return (
    now.getUTCFullYear() === H.SEASON_YEAR &&
    now.getUTCMonth() === H.FINAL_MONTH &&
    now.getUTCDate() === H.FINAL_DAY
  );
}
