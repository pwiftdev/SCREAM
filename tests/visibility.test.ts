import { beforeAll, it, expect } from 'vitest';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { parseInput } from '../shared/protocol';
beforeAll(initPhysics);
it('killer behind a wall receives no survivor coordinates, history, locker or input', () => {
  const s = new Simulation();
  const k = s.add('k', 'K', 'killer')!,
    p = s.add('p', 'P', 'survivor')!;
  k.x = -24;
  k.z = -28;
  p.x = -24;
  p.z = -20;
  const v = s.snapshot('k').players.find((p) => p.id === 'p')!;
  expect(v.x).toBeUndefined();
  expect(v.z).toBeUndefined();
  expect(v).not.toHaveProperty('history');
  expect(v).not.toHaveProperty('input');
  expect(v).not.toHaveProperty('locker');
  p.revealUntil = s.state.now + 1000;
  expect(s.snapshot('k').players[1].x).toBe(-24);
  p.locker = 'locker0';
  expect(s.snapshot('k').players[1].x).toBeUndefined();
  s.dispose();
});
it('hush removes heartbeat data, allies stay visible', () => {
  const s = new Simulation();
  const k = s.add('k', 'K', 'killer')!,
    p = s.add('p', 'P', 'survivor')!;
  k.x = p.x;
  k.z = p.z;
  k.hushUntil = s.state.now + 1000;
  expect(s.snapshot('p').dread).toBeUndefined();
  expect(s.snapshot('p').players[0].x).toBe(p.x);
  s.dispose();
});
it('rejects malformed, unbounded and nonfinite input', () => {
  expect(parseInput({})).toBeNull();
  expect(
    parseInput({
      seq: 1,
      x: Infinity,
      z: 0,
      yaw: 0,
      time: 0,
      run: true,
      crouch: false,
      interact: false,
    }),
  ).toBeNull();
});
