import { describe, it, expect } from 'vitest';
import { H } from '../shared/config';
import { samples, prop, seededHouse } from '../shared/house/samples';
import {
  cloneHouse,
  encodeHouse,
  decodeHouse,
  put,
  validateHouse,
  index,
} from '../shared/house/format';
import { B } from '../shared/house/blocks';
import {
  INPUT,
  replay,
  startVisit,
  tickVisit,
  type Frame,
} from '../shared/house/simulation';
import { blockLight } from '../shared/house/light';
import { findPath } from '../shared/props/path';
export function clearFrames(h = samples[0]) {
  const s = startVisit(h, 17),
    frames: Frame[] = [];
  function step(bits: number, yaw: number) {
    const f = { bits, yaw: Math.round(yaw * 1000), pitch: 0 };
    frames.push(f);
    tickVisit(h, s, f);
  }
  for (let n = 0; n < 260; n++) step(INPUT.FORWARD, Math.PI);
  for (let n = 0; n < 61; n++) step(INPUT.USE, Math.PI);
  for (let n = 0; n < 260 && s.outcome === 'playing'; n++)
    step(INPUT.BACK, Math.PI);
  return { s, frames };
}
describe('Hollow Lane deterministic visiting', () => {
  it.each(samples)('round trips and clears $title', (h) => {
    validateHouse(h);
    expect(encodeHouse(decodeHouse(encodeHouse(h)))).toEqual(encodeHouse(h));
    const { s, frames } = clearFrames(h);
    expect(s.outcome).toBe('escaped');
    const r = replay(h, 17, frames);
    expect(r).toEqual(s);
  });
  it.each(Array.from({ length: 15 }, (_, i) => i))(
    'clears seeded neighborhood house %i',
    (i) => {
      const h = seededHouse(i),
        { frames, s } = clearFrames(h);
      expect(s.outcome).toBe('escaped');
      expect(replay(h, 17, frames)).toEqual(s);
    },
  );
  it('a catch at the exit cannot be replaced by an escape or timeout', () => {
    const h = cloneHouse(samples[0]);
    h.props = [prop('lurker', 12, 2, { trigger: 'timer', delay: 0 })];
    const s = startVisit(h);
    s.candy = true;
    s.props[0].contact = H.LURKER_CATCH_S * H.TICK_HZ;
    s.tick = H.VISIT_LIMIT_S * H.TICK_HZ - 1;
    tickVisit(h, s, { bits: 0, yaw: 3142, pitch: 0 });
    expect(s.outcome).toBe('caught');
  });
  it('rejects malformed houses and blocked routes', () => {
    const h = cloneHouse(samples[0]);
    put(h, 12, 1, 2, B.BRICK);
    expect(() => validateHouse(h)).toThrow('route');
    const wire = encodeHouse(samples[0]);
    wire.blocks = [1, 1e9];
    expect(() => decodeHouse(wire)).toThrow();
  });
  it('rejects invalid inputs, excess frames and impossible look', () => {
    expect(() =>
      replay(samples[0], 1, [{ bits: 256, yaw: 0, pitch: 0 }]),
    ).toThrow();
    expect(() =>
      replay(samples[0], 1, [
        { bits: 0, yaw: 0, pitch: 0 },
        { bits: 0, yaw: 2000, pitch: 0 },
      ]),
    ).toThrow();
    expect(() =>
      replay(
        samples[0],
        1,
        Array(H.VISIT_LIMIT_S * 60 + 1).fill({ bits: 0, yaw: 0, pitch: 0 }),
      ),
    ).toThrow();
  });
  it('rejects impossible pitch changes', () => {
    expect(() =>
      replay(samples[0], 1, [
        { bits: 0, yaw: 0, pitch: -1400 },
        { bits: 0, yaw: 0, pitch: 1400 },
      ]),
    ).toThrow('look speed');
  });
  it('cannot grab nearby candy through an intervening wall', () => {
    const h = cloneHouse(samples[0]);
    h.props = [];
    for (let i = 0; i < h.blocks.length; i++)
      if (h.blocks[i] === B.CANDY) h.blocks[i] = B.AIR;
    h.candy = { x: 12, y: 1, z: 4 };
    put(h, 12, 1, 4, B.CANDY);
    put(h, 12, 1, 3, B.BRICK);
    put(h, 12, 2, 3, B.BRICK);
    const s = startVisit(h);
    s.pos.z = 2.75;
    for (let i = 0; i < 70; i++)
      tickVisit(h, s, { bits: INPUT.USE, yaw: 3142, pitch: 0 });
    expect(s.candy).toBe(false);
    put(h, 12, 1, 3, B.AIR);
    put(h, 12, 2, 3, B.AIR);
    for (let i = 0; i < 70; i++)
      tickVisit(h, s, { bits: INPUT.USE, yaw: 3142, pitch: 0 });
    expect(s.candy).toBe(true);
  });
  it('walls stop movement and the flashlight recharges when off', () => {
    const h = cloneHouse(samples[0]);
    h.props = [];
    const s = startVisit(h);
    for (let i = 0; i < 600; i++)
      tickVisit(h, s, { bits: INPUT.FORWARD, yaw: 1571, pitch: 0 });
    expect(s.pos.x).toBeGreaterThan(3);
    const b = s.battery;
    tickVisit(h, s, { bits: INPUT.FLASH, yaw: 1571, pitch: 0 });
    for (let i = 0; i < 60; i++)
      tickVisit(h, s, { bits: 0, yaw: 1571, pitch: 0 });
    expect(s.battery).toBeGreaterThan(b);
  });
  it('light spreads through air and A* goes around walls', () => {
    const h = samples[0],
      l = blockLight(h);
    expect(l[index(5, 2, 4)]).toBe(15);
    expect(l[index(6, 2, 4)]).toBe(14);
    expect(
      findPath(
        h,
        { x: 12.5, y: 1, z: 2.5 },
        { x: 12.5, y: 1, z: 18.5 },
        new Set(),
      ).length,
    ).toBeGreaterThan(0);
  });
  it.each([
    'lurker',
    'trapdoor',
    'slammer',
    'blackout',
    'whisper',
    'follower',
  ] as const)('activates %s deterministically', (type) => {
    const h = cloneHouse(samples[0]);
    h.props = [
      prop(type, 12, 2, {
        delay: 0,
        trigger: 'timer',
        target: { x: 12, y: 0, z: 2 },
      }),
    ];
    const a = startVisit(h, 3),
      b = startVisit(h, 3);
    for (let n = 0; n < 60; n++) {
      const f = { bits: 0, yaw: 3142, pitch: 0 };
      tickVisit(h, a, f);
      tickVisit(h, b, f);
    }
    expect(a.events[0]?.type).toBe(type === 'whisper' ? 'whisper' : type);
    expect(a).toEqual(b);
    if (type === 'lurker') expect(a.outcome).toBe('caught');
    if (type === 'blackout') expect(a.blackout).toBe(true);
  });
});
