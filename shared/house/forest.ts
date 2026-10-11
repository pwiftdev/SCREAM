import { H } from '../config';
import { PLOTS, LANDMARKS, pathDistance } from './world-layout';
import { WORLD_SCENERY } from './world-scenery';
import { SEARCH_SITES } from './rework';
import { FOREST_CLEARINGS, FOREST_PROPS } from './forest-sites';
export type ForestBiome = 'pine' | 'autumn' | 'wetland' | 'blighted';
export function forestBiome(x: number, z: number): ForestBiome {
  if (x > 45 && z > 315) return 'wetland';
  if ((x < -65 && z > 145 && z < 235) || Math.hypot(x + 20, z - 275) < 32)
    return 'blighted';
  return z < 110 || (z > 340 && x < 40) ? 'autumn' : 'pine';
}
export const FOREST_TREES = {
  pine: [
    'tre_pine_med',
    'tre_pine_tall',
    'tre_pine_med',
    'tre_pine_small',
    'tre_pine_leaning',
    'tre_pine_dead',
    'tre_birch',
  ],
  autumn: [
    'tre_oak_autumn',
    'tre_oak_dark',
    'tre_oak_large',
    'tre_birch',
    'tre_oak_dark',
  ],
  wetland: ['tre_willow', 'tre_oak_mossy', 'tre_birch_dead', 'tre_willow'],
  blighted: ['tre_burned', 'tre_pine_dead', 'tre_birch_dead', 'tre_oak_mossy'],
} as const;
export function forestRandom(seed: number) {
  let n = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
export function forestSpace(x: number, z: number, margin: number) {
  if (
    Math.abs(x) > H.WORLD_HALF_W - 4 ||
    z < H.WORLD_MIN_Z + 4 ||
    z > H.WORLD_MAX_Z - 4
  )
    return false;
  if (
    pathDistance({ x, z }) < margin ||
    LANDMARKS.some((p) => Math.hypot(p.x - x, p.z - z) < 25) ||
    PLOTS.some((p) => Math.hypot(p.center.x - x, p.center.z - z) < 22) ||
    WORLD_SCENERY.some((p) => Math.hypot(p.x - x, p.z - z) < 9) ||
    SEARCH_SITES.some((p) => Math.hypot(p.x - x, p.z - z) < 7) ||
    FOREST_PROPS.some(
      (p) =>
        p.solid &&
        Math.hypot(p.x - x, p.z - z) < Math.hypot(...p.solid) / 2 + 1.5,
    ) ||
    FOREST_CLEARINGS.some((p) => Math.hypot(p.x - x, p.z - z) < p.radius)
  )
    return false;
  return true;
}
export interface ForestTree {
  id: string;
  x: number;
  z: number;
  scale: number;
  yaw: number;
  w: number;
  d: number;
}
function makeTrees() {
  const result: ForestTree[] = [];
  const spacing = 5.8;
  let seed = 0;
  for (let z = -82; z < 493; z += spacing)
    for (let x = -198; x < 199; x += spacing) {
      const n = seed++,
        px = x + (forestRandom(n * 7) - 0.5) * 3.6,
        pz = z + (forestRandom(n * 7 + 1) - 0.5) * 3.6;
      if (!forestSpace(px, pz, 4.1)) continue;
      const biome = forestBiome(px, pz),
        choices = FOREST_TREES[biome];
      if (
        forestRandom(n * 7 + 2) <
        0.12 + Math.max(0, Math.sin(px / 31) * Math.cos(pz / 27)) * 0.17
      )
        continue;
      const id = choices[Math.floor(forestRandom(n * 7 + 3) * choices.length)],
        scale = 0.82 + forestRandom(n * 7 + 4) * 0.38;
      const width =
        (id === 'tre_oak_large'
          ? 1.1
          : id.startsWith('tre_oak')
            ? 0.85
            : 0.55) * scale;
      result.push({
        id,
        x: px,
        z: pz,
        scale,
        yaw: forestRandom(n * 7 + 5) * Math.PI * 2,
        w: width,
        d: width,
      });
    }
  result.push({
    id: 'tre_oak_large',
    x: -60,
    z: 274,
    scale: 1,
    yaw: 0,
    w: 1.1,
    d: 1.1,
  });
  return result;
}
export const FOREST_INSTANCES = makeTrees();
export const FOREST_SOLIDS = [
  ...FOREST_INSTANCES.map((p) => ({ ...p, kind: 'tree' as const })),
  ...FOREST_PROPS.filter((p) => p.solid).map((p) => ({
    x: p.x,
    z: p.z,
    w: p.solid![0],
    d: p.solid![1],
    yaw: p.yaw,
    kind: 'wall' as const,
  })),
];
