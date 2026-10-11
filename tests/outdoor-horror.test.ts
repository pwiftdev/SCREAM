import { describe, expect, it } from 'vitest';
import {
  OutdoorEncounters,
  type EncounterCue,
} from '../src/game/rework/outdoor-encounters';
import { CameraMotion } from '../src/game/camera-motion';
import { H } from '../shared/config';
import { NIGHT } from '../shared/house/rework';
import { moveStreet } from '../shared/house/neighborhood';
import { HorrorLighting } from '../src/game/rework/horror-lighting';
import { Scene } from 'three';
const player = { x: 0, z: 0 };
function setup(
  blocked: (x: number, z: number) => boolean = () => false,
  height: (x: number, z: number) => number = () => 0,
) {
  const cues: EncounterCue[] = [];
  const director = new OutdoorEncounters(
    blocked,
    height,
    (cue) => cues.push(cue),
    () => 0,
  );
  const advance = (
    seconds: number,
    yaw = 0,
    active = true,
    reduced = false,
  ) => {
    for (let i = 0; i < Math.ceil(seconds * 60); i++)
      director.step(1 / 60, player, yaw, 0, active, reduced);
  };
  return { director, cues, advance };
}
describe('outdoor encounter pacing', () => {
  it('waits, places a stalker behind you, then fades after a brief visible glimpse', () => {
    const { director, cues, advance } = setup();
    advance(24);
    expect(director.current).toBeUndefined();
    advance(1.1);
    expect(director.current).toMatchObject({
      kind: 'stalker',
      x: expect.closeTo(0),
      z: expect.closeTo(4.925, 1),
    });
    expect(cues).toEqual(['behind']);
    advance(0.3, Math.PI);
    expect(director.current?.fade).toBe(0);
    advance(0.25, Math.PI);
    expect(director.current?.fade).toBeGreaterThan(0);
    advance(0.4, Math.PI);
    expect(director.current).toBeUndefined();
    advance(30);
    expect(cues).toHaveLength(1);
  });
  it('rushes only after a cooldown, stops short of the player and fires one impact', () => {
    const { director, cues, advance } = setup();
    advance(33);
    expect(director.current).toBeUndefined();
    advance(38);
    expect(director.current?.kind).toBe('rush');
    let closest = Infinity;
    for (let i = 0; i < 180; i++) {
      advance(1 / 60);
      const e = director.current;
      if (e) closest = Math.min(closest, Math.hypot(e.x, e.z));
    }
    expect(closest).toBeGreaterThanOrEqual(0.949);
    expect(closest).toBeLessThan(1.01);
    expect(cues).toEqual(['behind', 'approach', 'impact']);
    expect(director.current).toBeUndefined();
  });
  it('cancels on pause or reduced flashing without an immediate scare on resume', () => {
    for (const reduced of [false, true]) {
      const { director, cues, advance } = setup();
      advance(25.1);
      advance(100, 0, reduced, reduced);
      expect(director.current).toBeUndefined();
      advance(19);
      expect(cues).toEqual(['behind']);
    }
  });
  it('rejects blocked or steep spawn paths and cancels if a new obstruction separates you', () => {
    const solid = setup(() => true);
    solid.advance(120);
    expect(solid.cues).toEqual([]);
    const cliff = setup(
      () => false,
      (_x, z) => (Math.abs(z) > 2 ? 8 : 0),
    );
    cliff.advance(120);
    expect(cliff.cues).toEqual([]);
    let closed = false;
    const crossing = setup(() => closed);
    crossing.advance(25.1);
    closed = true;
    crossing.advance(0.1);
    expect(crossing.director.current).toBeUndefined();
    expect(crossing.cues).toEqual(['behind']);
  });
  it('does not fast-forward into a scare after a long frame or teleport', () => {
    const { director, cues, advance } = setup();
    director.step(1000, player, 0, 0, true, false);
    expect(cues).toEqual([]);
    advance(25.1);
    director.step(0.016, { x: 100, z: 100 }, 0, 0, true, false);
    expect(director.current).toBeUndefined();
    expect(cues).toEqual(['behind']);
  });
});
it('keeps outdoor walking near indoor speed with normalized diagonals and shared sprint tuning', () => {
  expect(H.STREET_SPEED).toBeGreaterThanOrEqual(H.WALK);
  expect(H.STREET_SPEED).toBeLessThan(H.WALK * 1.1);
  for (const [side, sprint] of [
    [0, false],
    [1, false],
    [0, true],
  ] as const) {
    const p = { x: 0, z: 260 };
    for (let i = 0; i < 60; i++)
      moveStreet(p, { forward: 1, side, yaw: 0, sprint }, 1 / 60);
    expect(Math.hypot(p.x, p.z - 260)).toBeCloseTo(
      H.STREET_SPEED * (sprint ? NIGHT.sprintMultiplier : 1),
    );
  }
});
it('uses distance-based camera motion that settles at rest and suppresses impact in reduced motion', () => {
  const m = new CameraMotion();
  m.sample({ x: 0, y: 0, z: 0 }, 'healthy', 1 / 60, false);
  const moving = m.sample({ x: 0.065, y: 0, z: 0 }, 'healthy', 1 / 60, false);
  expect(Math.abs(moving.roll)).toBeGreaterThan(0);
  let still = moving;
  for (let i = 0; i < 120; i++)
    still = m.sample({ x: 0.065, y: 0, z: 0 }, 'healthy', 1 / 60, false);
  expect(Math.abs(still.lift)).toBeLessThan(0.00001);
  m.jolt();
  expect(m.sample({ x: 0.065, y: 0, z: 0 }, 'healthy', 1 / 60, true)).toEqual({
    lift: 0,
    roll: 0,
    kick: 0,
  });
});
it('darkens outdoor fill without reducing indoor visibility or removing moon silhouettes', () => {
  const lighting = new HorrorLighting(new Scene());
  lighting.setMood('world');
  expect(lighting.ambient.intensity).toBeLessThan(0.025);
  expect(lighting.sky.intensity).toBeLessThan(0.1);
  expect(lighting.moon.intensity).toBeGreaterThan(0.08);
  expect(lighting.moon.intensity).toBeLessThan(0.15);
  lighting.setMood('house');
  expect(lighting.ambient.intensity).toBe(0.065);
  expect(lighting.moon.visible).toBe(false);
  lighting.dispose();
});
