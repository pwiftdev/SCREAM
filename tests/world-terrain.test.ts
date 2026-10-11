import { expect, it } from 'vitest';
import { H } from '../shared/config';
import {
  TERRAIN_HEIGHTS,
  TERRAIN_COLS,
  TERRAIN_STEP,
  terrainHeight,
  plotElevation,
} from '../shared/house/terrain';
import { PLOTS, WORLD_PATHS } from '../shared/house/world-layout';
import { WORLD_SCENERY, WILD_ASSETS } from '../shared/house/world-scenery';
import { worldBlocked } from '../shared/house/neighborhood';
import { SEARCH_SITES } from '../shared/house/rework';
import { ASSET_CATALOG } from '../src/game/rework/asset-catalog';
it('keeps every plot level at its door, approach and buildable corners', () => {
  PLOTS.forEach((p, i) => {
    const height = plotElevation(i);
    for (const point of [
      p.door,
      p.approach,
      ...[-12.5, 11.5].flatMap((x) =>
        [-12.5, 11.5].map((z) => ({
          x: p.center.x + x * Math.cos(p.yaw) + z * Math.sin(p.yaw),
          z: p.center.z - x * Math.sin(p.yaw) + z * Math.cos(p.yaw),
        })),
      ),
    ])
      expect(terrainHeight(point.x, point.z)).toBeCloseTo(height, 4);
  });
});
it('matches both rendered triangles and maintains walkable grades on every path', () => {
  expect(
    Math.max(...TERRAIN_HEIGHTS) - Math.min(...TERRAIN_HEIGHTS),
  ).toBeGreaterThan(16);
  expect(terrainHeight(H.WORLD_SPAWN_X, H.WORLD_SPAWN_Z)).toBeCloseTo(0, 5);
  for (let i = 1; i < TERRAIN_HEIGHTS.length - TERRAIN_COLS - 1; i += 113) {
    if (i % TERRAIN_COLS === TERRAIN_COLS - 1) continue;
    const x = (i % TERRAIN_COLS) * TERRAIN_STEP - H.WORLD_HALF_W;
    const z = Math.floor(i / TERRAIN_COLS) * TERRAIN_STEP + H.WORLD_MIN_Z;
    expect(terrainHeight(x + 0.5, z + 0.5)).toBeCloseTo(
      TERRAIN_HEIGHTS[i] * 0.5 +
        (TERRAIN_HEIGHTS[i + 1] + TERRAIN_HEIGHTS[i + TERRAIN_COLS]) * 0.25,
      6,
    );
    expect(terrainHeight(x + 1.5, z + 1.5)).toBeCloseTo(
      TERRAIN_HEIGHTS[i + TERRAIN_COLS + 1] * 0.5 +
        (TERRAIN_HEIGHTS[i + 1] + TERRAIN_HEIGHTS[i + TERRAIN_COLS]) * 0.25,
      6,
    );
  }
  for (const [a, b] of WORLD_PATHS) {
    const distance = Math.hypot(b.x - a.x, b.z - a.z),
      steps = Math.ceil(distance);
    let previous = terrainHeight(a.x, a.z);
    for (let n = 1; n <= steps; n++) {
      const height = terrainHeight(
        a.x + ((b.x - a.x) * n) / steps,
        a.z + ((b.z - a.z) * n) / steps,
      );
      expect(Math.abs(height - previous) / (distance / steps)).toBeLessThan(
        0.8,
      );
      previous = height;
    }
  }
});
it('uses every pack-II model, collides with solid scenery, and leaves searches accessible', () => {
  const ids = new Set([...WORLD_SCENERY.map((p) => p.id), ...WILD_ASSETS]);
  for (const [id, asset] of Object.entries(ASSET_CATALOG))
    if (asset.pack === 'scream-2') expect(ids.has(id)).toBe(true);
  for (const p of WORLD_SCENERY) {
    expect(p.id in ASSET_CATALOG).toBe(true);
    if (p.solid) expect(worldBlocked(p.x, p.z)).toBe(true);
  }
  for (const p of SEARCH_SITES) expect(worldBlocked(p.x, p.z)).toBe(false);
  for (const p of [
    { x: 158, z: 270 },
    { x: -154, z: 278 },
  ])
    expect(worldBlocked(p.x, p.z)).toBe(false);
});
