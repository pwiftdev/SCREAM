import { expect, it } from 'vitest';
import { H } from '../shared/config';
import {
  FOREST_INSTANCES,
  FOREST_SOLIDS,
  forestBiome,
  forestSpace,
} from '../shared/house/forest';
import { FOREST_CLEARINGS } from '../shared/house/forest-sites';
import { WORLD_BOXES, worldBlocked } from '../shared/house/neighborhood';
import { sceneryCollision } from '../shared/house/scenery-collision';
import { pathDistance, PLOTS, LANDMARKS } from '../shared/house/world-layout';
import { SEARCH_SITES } from '../shared/house/rework';
it('builds dense varied forest without obstructing paths, searches or forty plots', () => {
  expect(FOREST_INSTANCES.length).toBeGreaterThan(3000);
  expect(new Set(FOREST_INSTANCES.map((p) => p.id)).size).toBe(13);
  for (const p of FOREST_INSTANCES) {
    expect(worldBlocked(p.x, p.z)).toBe(true);
    expect(pathDistance(p)).toBeGreaterThan(3.5);
  }
  for (const p of [
    ...SEARCH_SITES,
    ...PLOTS.map((p) => p.approach),
    ...LANDMARKS,
  ])
    expect(worldBlocked(p.x, p.z)).toBe(false);
  expect(forestBiome(-90, 265)).toBe('pine');
  expect(forestBiome(0, 70)).toBe('autumn');
  expect(forestBiome(170, 440)).toBe('wetland');
  expect(forestBiome(-20, 275)).toBe('blighted');
  for (const p of FOREST_CLEARINGS)
    expect(forestSpace(p.x, p.z, 0)).toBe(false);
  expect(FOREST_SOLIDS.length).toBeGreaterThan(FOREST_INSTANCES.length);
});
it('spatial collision matches every rotated box at cell boundaries and across the map', () => {
  const collide = sceneryCollision(WORLD_BOXES, H.RADIUS);
  const slow = (x: number, z: number) =>
    WORLD_BOXES.some((b) => {
      const cos = Math.cos(b.yaw ?? 0),
        sin = Math.sin(b.yaw ?? 0),
        dx = x - b.x,
        dz = z - b.z;
      return (
        Math.abs(dx * cos - dz * sin) < b.w / 2 + H.RADIUS &&
        Math.abs(dx * sin + dz * cos) < b.d / 2 + H.RADIUS
      );
    });
  for (let i = 0; i < 2500; i++) {
    const x = -204 + ((i * 17.17) % 408),
      z = -89 + ((i * 41.37) % 588);
    expect(collide(x, z)).toBe(slow(x, z));
  }
  for (let x = -192; x <= 192; x += 16)
    for (let z = -80; z < 496; z += 16)
      for (const offset of [-0.001, 0, 0.001])
        expect(collide(x + offset, z - offset)).toBe(
          slow(x + offset, z - offset),
        );
});
it('connects all new forest clearings to the playable world', () => {
  const queue = [{ x: 0, z: -65 }],
    seen = new Set(['0,-65']);
  for (let i = 0; i < queue.length; i++)
    for (const [dx, dz] of [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]) {
      const p = { x: queue[i].x + dx, z: queue[i].z + dz },
        key = `${p.x},${p.z}`;
      if (seen.has(key) || worldBlocked(p.x, p.z)) continue;
      seen.add(key);
      queue.push(p);
    }
  for (const p of FOREST_CLEARINGS)
    expect(queue.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < 6)).toBe(true);
});
