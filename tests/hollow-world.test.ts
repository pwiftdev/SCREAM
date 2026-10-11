import { describe, it, expect } from 'vitest';
import { H } from '../shared/config';
import {
  LANDMARKS,
  isFinalNight,
  WORLD_BOXES,
  SCENERY_PROPS,
  moveStreet,
  nearestDoor,
  plotLocation,
  worldBlocked,
} from '../shared/house/neighborhood';
describe('continuous Halloween open world', () => {
  it('has forty approachable doors and accessible off-road landmarks', () => {
    expect(WORLD_BOXES.filter((b) => b.kind === 'house')).toHaveLength(40);
    for (let slot = 0; slot < 40; slot++) {
      const p = plotLocation(slot),
        approach = p.approach;
      expect(worldBlocked(approach.x, approach.z)).toBe(false);
      expect(nearestDoor(approach).slot).toBe(slot);
      expect(nearestDoor(approach).distance).toBeCloseTo(3);
      expect(worldBlocked(p.center.x, p.center.z)).toBe(true);
    }
    for (const l of LANDMARKS) expect(worldBlocked(l.x, l.z)).toBe(false);
  });
  it('allows off-road movement and blocks boundaries and rotated house shells', () => {
    const p = { x: 0, z: 260 };
    for (let i = 0; i < 120; i++)
      moveStreet(p, { forward: 1, side: 0, yaw: Math.PI / 2 }, 1 / 60);
    expect(p.x).toBeCloseTo(-H.STREET_SPEED * 2);
    expect(worldBlocked(H.WORLD_HALF_W + 1, 100)).toBe(true);
    for (let i = 0; i < 40; i++) {
      const plot = plotLocation(i),
        pos = { ...plot.approach };
      for (let j = 0; j < 120; j++)
        moveStreet(
          pos,
          { forward: 1, side: 0, yaw: plot.yaw + Math.PI },
          1 / 60,
        );
      expect(
        Math.hypot(pos.x - plot.center.x, pos.z - plot.center.z),
      ).toBeGreaterThan(10);
    }
  });
  it('connects landmarks around the housing rows through the side paths', () => {
    const seen = new Set<string>(),
      queue: { x: number; z: number }[] = [
        { x: H.WORLD_SPAWN_X, z: H.WORLD_SPAWN_Z },
      ],
      step = 2,
      key = (x: number, z: number) => `${x},${z}`;
    seen.add(key(H.WORLD_SPAWN_X, H.WORLD_SPAWN_Z));
    for (let i = 0; i < queue.length; i++) {
      const p = queue[i];
      for (const [dx, dz] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const x = p.x + dx,
          z = p.z + dz,
          k = key(x, z);
        if (seen.has(k) || worldBlocked(x, z)) continue;
        seen.add(k);
        queue.push({ x, z });
      }
    }
    for (const l of [
      ...LANDMARKS,
      ...Array.from({ length: 40 }, (_, i) => plotLocation(i).approach),
    ])
      expect(queue.some((p) => Math.hypot(p.x - l.x, p.z - l.z) < 3)).toBe(
        true,
      );
  });
});

it('Final Night uses the season date in UTC only', () => {
  expect(isFinalNight(new Date('2026-10-31T00:00:00Z'))).toBe(true);
  expect(isFinalNight(new Date('2026-10-30T23:59:59Z'))).toBe(false);
  expect(isFinalNight(new Date('2026-11-01T00:00:00Z'))).toBe(false);
  expect(isFinalNight(new Date('2027-10-31T12:00:00Z'))).toBe(false);
});

it('solid scenery has matching outdoor collision without closing the shared paths', () => {
  for (const prop of SCENERY_PROPS)
    expect(worldBlocked(prop.x, prop.z)).toBe(true);
  for (const [x, z] of [
    [-110, 198],
    [-108, 390],
    [84, 159],
    [102, 196],
  ])
    expect(worldBlocked(x, z)).toBe(true);
});
