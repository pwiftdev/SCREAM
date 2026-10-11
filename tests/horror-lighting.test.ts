import { expect, it } from 'vitest';
import { lampBrightness } from '../src/game/rework/horror-lighting';
it('keeps normal lamps steady and damaged lamps unreliable only occasionally', () => {
  const lamp = { x: 12, y: 3, z: 28 };
  const frames = Array.from({ length: 2300 }, (_, i) => i / 100);
  expect(frames.every((time) => lampBrightness(lamp, time, false) === 1)).toBe(
    true,
  );
  const damaged = { ...lamp, damaged: true };
  const levels = frames.map((time) => lampBrightness(damaged, time, false));
  expect(Math.min(...levels)).toBeLessThan(0.1);
  expect(Math.max(...levels)).toBeLessThanOrEqual(1);
  expect(levels.filter((v) => v < 0.9).length / levels.length).toBeLessThan(
    0.13,
  );
  expect(
    frames.every((time) => lampBrightness(damaged, time, true) === 1),
  ).toBe(true);
  expect(levels).not.toEqual(
    frames.map((time) => lampBrightness({ ...damaged, x: 18 }, time, false)),
  );
});
