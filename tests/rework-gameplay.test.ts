import { expect, it } from 'vitest';
import { OutdoorSession } from '../server/hollow/outdoor';
import { NIGHT, nearestSearch, staminaStep } from '../shared/house/rework';
import { starterHouse } from '../shared/house/plots';
import { HouseEditor } from '../shared/house/editor';
import {
  decodeHouse,
  encodeHouse,
  stashPositions,
  put,
} from '../shared/house/format';
import { B } from '../shared/house/blocks';
import {
  startVisit,
  tickVisit,
  INPUT,
  validFrame,
} from '../shared/house/simulation';
import { H } from '../shared/config';
it('search requires sustained nearby targeting, cancels when looking away and cannot repeat loot', () => {
  const s = new OutdoorSession(),
    p = { x: -5, z: -58 };
  for (let i = 0; i < 10; i++) s.step(p, Math.PI, true, false, false, 0.1);
  expect(s.carried).toBe(0);
  s.step(p, 0, true, false, false, 0.1);
  expect(s.hold).toBe(0);
  for (let i = 0; i < 17; i++) s.step(p, Math.PI, true, false, false, 0.1);
  expect(s.carried).toBe(NIGHT.looseCandy);
  for (let i = 0; i < 50; i++) s.step(p, Math.PI, true, false, false, 0.1);
  expect(s.carried).toBe(NIGHT.looseCandy);
  expect(nearestSearch({ x: 100, z: 100 }, 0, new Set())).toBeUndefined();
});
it('bag capacity and stamina clamp, and releasing sprint recovers stamina', () => {
  const s = new OutdoorSession();
  s.carried = 495;
  for (let i = 0; i < 17; i++)
    s.step({ x: -5, z: -58 }, Math.PI, true, false, false, 0.1);
  expect(s.carried).toBe(500);
  expect(staminaStep(3, true, true, 1)).toBe(0);
  expect(staminaStep(95, false, true, 1)).toBe(100);
});
it('three independent stashes survive serialization, removal, undo and redo; a fourth is rejected', () => {
  const e = new HouseEditor(starterHouse(0, 0));
  for (const p of [
    { x: 12, y: 1, z: 18 },
    { x: 16, y: 1, z: 16 },
    { x: 8, y: 1, z: 15 },
  ])
    e.placeStash(p);
  expect(stashPositions(decodeHouse(encodeHouse(e.house)))).toHaveLength(3);
  expect(() => e.placeStash({ x: 10, y: 1, z: 15 })).toThrow('three');
  e.paint({ x: 12, y: 1, z: 18 }, { x: 12, y: 1, z: 18 }, B.AIR, 0, 'block');
  expect(stashPositions(e.house)).toHaveLength(2);
  e.undo();
  expect(stashPositions(e.house)).toHaveLength(3);
  e.redo();
  expect(stashPositions(e.house)).toHaveLength(2);
});
it('a raider can collect a non-primary stash and its repeat interaction grants nothing extra', () => {
  const e = new HouseEditor(starterHouse(0, 0));
  e.placeStash({ x: 12, y: 1, z: 18 });
  e.placeStash({ x: 16, y: 1, z: 16 });
  const s = startVisit(e.house);
  s.pos = { x: 16.5, y: 1, z: 14.8 };
  for (let i = 0; i < H.CANDY_HOLD_S * H.TICK_HZ + 5; i++)
    tickVisit(e.house, s, { bits: INPUT.USE, yaw: 3142, pitch: 0 });
  expect(s.candy).toBe(true);
  expect(s.stashes.size).toBe(1);
  for (let i = 0; i < 120; i++)
    tickVisit(e.house, s, { bits: INPUT.USE, yaw: 3142, pitch: 0 });
  expect(s.stashes.size).toBe(1);
});
it('sprint consumes authoritative stamina and spikes halt movement for the configured interval', () => {
  const h = starterHouse(0, 0);
  put(h, 12, 1, 4, B.SPIKES);
  const s = startVisit(h);
  for (let i = 0; i < 15; i++)
    tickVisit(h, s, { bits: INPUT.FORWARD, sprint: true, yaw: 3142, pitch: 0 });
  expect(s.stamina).toBeLessThan(100);
  expect(s.stunnedUntil).toBeGreaterThan(s.tick);
  const z = s.pos.z;
  for (let i = 0; i < 30; i++)
    tickVisit(h, s, { bits: INPUT.FORWARD, yaw: 3142, pitch: 0 });
  expect(s.pos.z).toBe(z);
  expect(
    validFrame({ bits: 0, yaw: 0, pitch: 0, sprint: 'yes' } as never),
  ).toBe(false);
});

it('banking preserves searched sites and carried candy survives reconnects within one night', async () => {
  const { OutdoorSessions } = await import('../server/hollow/outdoor-sessions');
  let now = 1000;
  const sessions = new OutdoorSessions(() => now);
  const first = sessions.get('player-a');
  first.carried = 24;
  first.found.add('gate');
  expect(sessions.get('player-a')).toBe(first);
  expect(sessions.get('player-b').carried).toBe(0);
  expect(first.deposit()).toBe(24);
  expect(first.deposit()).toBe(0);
  expect(first.bank).toBe(24);
  expect(first.found.has('gate')).toBe(true);
  now += NIGHT.seconds * 1000;
  first.step({ x: 0, z: 0 }, 0, false, false, false, 0.1);
  expect(first.bank).toBe(0);
  expect(first.found.size).toBe(0);
  expect(sessions.get('player-a').bank).toBe(0);
});
