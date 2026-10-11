import { describe, expect, it } from 'vitest';
import {
  FootstepMeter,
  footSurface,
  houseBlend,
  soundOccluded,
} from '../src/lib/soundscape';
import { CameraMotion, cameraDamping } from '../src/game/camera-motion';
import {
  blocks,
  generators,
  spawns,
  lockers,
  pallets,
} from '../shared/maps/rotten-hollow';
describe('world sound rules', () => {
  it('blends at doorways and distinguishes the floor from wet ground', () => {
    expect(houseBlend({ x: -12, z: -25 })).toBe(1);
    expect(houseBlend({ x: -10, z: -19.5 })).toBeCloseTo(1 / 3);
    expect(houseBlend({ x: 12, z: -25 })).toBe(0);
    expect(footSurface({ x: 2, z: 2 })).toBe('wood');
    expect(footSurface({ x: -12, z: -25 })).toBe('wood');
    expect(footSurface({ x: 10, z: 8 })).toBe('grass');
  });
  it('muffles through the house wall but preserves the open doorway', () => {
    expect(soundOccluded({ x: -15, z: -18 }, { x: -15, z: -24 })).toBe(true);
    expect(soundOccluded({ x: -10, z: -18 }, { x: -10, z: -24 })).toBe(false);
  });
  it('paces footsteps by distance, ignores teleports and resets between matches', () => {
    const meter = new FootstepMeter();
    expect(meter.advance({ x: 0, z: 0 })).toBe(false);
    for (let i = 1; i < 14; i++)
      expect(meter.advance({ x: i / 10, z: 0 })).toBe(false);
    expect(meter.advance({ x: 1.5, z: 0 })).toBe(true);
    expect(meter.advance({ x: 40, z: 0 })).toBe(false);
    expect(meter.advance({ x: 41.6, z: 0 }, false)).toBe(false);
    meter.reset();
    expect(meter.advance({ x: -40, z: 0 })).toBe(false);
  });
});
describe('camera comfort', () => {
  it('uses the same smoothing at 30 and 120 frames per second', () => {
    const decay = (fps: number) => Math.pow(1 - cameraDamping(1 / fps), fps);
    expect(decay(30)).toBeCloseTo(decay(120), 8);
  });
  it('disables motion for reduced motion and clears old damage on reset', () => {
    const motion = new CameraMotion();
    motion.sample({ x: 0, y: 0, z: 0 }, 'healthy', 0.016, false);
    expect(
      motion.sample({ x: 0.1, y: 0, z: 0 }, 'injured', 0.016, true),
    ).toEqual({ lift: 0, roll: 0, kick: 0 });
    motion.reset();
    expect(
      motion.sample({ x: 40, y: 0, z: 20 }, 'healthy', 0.016, false),
    ).toEqual({ lift: 0, roll: 0, kick: 0 });
  });
});
it('the infirmary prop has shared collision without blocking objectives or spawns', () => {
  const prop = blocks.find((b) => b.id === 'infirmary-chair')!;
  expect(prop.kind).toBe('prop');
  for (const spot of [...generators, ...spawns, ...lockers, ...pallets])
    expect(Math.hypot(prop.x - spot.x, prop.z - spot.z)).toBeGreaterThan(2);
});
