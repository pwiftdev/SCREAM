import { FOREST_CLEARINGS } from './forest-sites';
import { H } from '../config';
import { DISTRICTS, PLOTS } from './world-layout';
import { WORLD_SCENERY } from './world-scenery';
export const TERRAIN_STEP = 2;
export const TERRAIN_COLS = (H.WORLD_HALF_W * 2) / TERRAIN_STEP + 1;
export const TERRAIN_ROWS = (H.WORLD_MAX_Z - H.WORLD_MIN_Z) / TERRAIN_STEP + 1;
const DISTRICT_HEIGHTS = [0, 6, 1, 8, -1];
const smooth = (a: number, b: number, n: number) => {
  const t = Math.max(0, Math.min(1, (n - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hill = (
  x: number,
  z: number,
  cx: number,
  cz: number,
  radius: number,
  height: number,
) => height * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (radius * radius));
function baseHeight(x: number, z: number) {
  let h =
    2 +
    Math.sin(x / 49) * 2.5 +
    Math.sin(z / 58) * 2 +
    hill(x, z, -125, 260, 75, 18) +
    hill(x, z, 135, 80, 68, 12) +
    hill(x, z, -65, 415, 80, 12) -
    hill(x, z, 90, 370, 65, 6);
  DISTRICTS.forEach((d, i) => {
    const blend = 1 - smooth(34, 72, Math.hypot(x - d.x, z - d.z));
    h += (DISTRICT_HEIGHTS[i] - h) * blend;
  });
  return h * smooth(12, 45, Math.hypot(x, z + 60));
}
const pads = [
  ...PLOTS.map((p, i) => ({
    height:
      DISTRICT_HEIGHTS[Math.floor(i / 8)] * 0.75 +
      baseHeight(p.center.x, p.center.z) * 0.25,
    x: p.center.x,
    z: p.center.z,
    w: 14,
    d: 18,
    yaw: p.yaw,
  })),
  ...FOREST_CLEARINGS.map((p) => ({
    x: p.x,
    z: p.z,
    w: p.radius + 1,
    d: p.radius + 1,
    yaw: 0,
    height: baseHeight(p.x, p.z),
  })),
  ...WORLD_SCENERY.filter((p) => p.id.startsWith('bld_') && p.solid).map(
    (p) => ({
      x: p.x,
      z: p.z,
      w: p.solid![0] / 2 + 3,
      d: p.solid![1] / 2 + 3,
      height: baseHeight(p.x, p.z),
      yaw: p.yaw,
    }),
  ),
].map((p) => ({
  ...p,
  sin: Math.sin(p.yaw),
  cos: Math.cos(p.yaw),
}));
function sampleHeight(x: number, z: number) {
  let weight = 1 / 400,
    height = baseHeight(x, z) * weight;
  for (const p of pads) {
    const dx = x - p.x,
      dz = z - p.z;
    const edge = Math.max(
      Math.abs(dx * p.cos - dz * p.sin) - p.w,
      Math.abs(dx * p.sin + dz * p.cos) - p.d,
    );
    if (edge <= 0) return p.height;
    if (edge < 20) {
      const w = ((1 - smooth(0, 20, edge)) / Math.max(0.01, edge)) ** 2;
      height += p.height * w;
      weight += w;
    }
  }
  return height / weight;
}
export const TERRAIN_HEIGHTS = Float32Array.from(
  { length: TERRAIN_COLS * TERRAIN_ROWS },
  (_, i) =>
    sampleHeight(
      -H.WORLD_HALF_W + (i % TERRAIN_COLS) * TERRAIN_STEP,
      H.WORLD_MIN_Z + Math.floor(i / TERRAIN_COLS) * TERRAIN_STEP,
    ),
);
export function terrainHeight(x: number, z: number) {
  const gx = Math.max(
    0,
    Math.min(TERRAIN_COLS - 1.000001, (x + H.WORLD_HALF_W) / TERRAIN_STEP),
  );
  const gz = Math.max(
    0,
    Math.min(TERRAIN_ROWS - 1.000001, (z - H.WORLD_MIN_Z) / TERRAIN_STEP),
  );
  const ix = Math.floor(gx),
    iz = Math.floor(gz),
    u = gx - ix,
    v = gz - iz;
  const a = iz * TERRAIN_COLS + ix,
    b = a + 1,
    c = a + TERRAIN_COLS,
    d = c + 1;
  return u + v <= 1
    ? TERRAIN_HEIGHTS[a] * (1 - u - v) +
        TERRAIN_HEIGHTS[b] * u +
        TERRAIN_HEIGHTS[c] * v
    : TERRAIN_HEIGHTS[d] * (u + v - 1) +
        TERRAIN_HEIGHTS[c] * (1 - u) +
        TERRAIN_HEIGHTS[b] * (1 - v);
}
export const plotElevation = (slot: number) => {
  const p = PLOTS[slot % H.PLOTS_PER_STREET];
  return terrainHeight(p.center.x, p.center.z);
};
