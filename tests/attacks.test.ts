import { beforeAll, afterEach, it, expect } from 'vitest';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { C } from '../shared/config';
let sim: Simulation;
beforeAll(initPhysics);
afterEach(() => sim?.dispose());
function setup() {
  sim = new Simulation(1, 100000);
  const k = sim.add('k', 'K', 'killer')!,
    p = sim.add('p', 'P', 'survivor')!;
  sim.start(true);
  k.x = 0;
  k.z = 0;
  k.yaw = 0;
  p.x = 0;
  p.z = 2;
  return { k, p, m: sim.state };
}
it('attack arcs do not hit behind the killer, through walls, or on another floor', () => {
  const { k, p, m } = setup();
  p.z = -2;
  sim.intent(k.id, 'attack');
  expect(p.health).toBe('healthy');
  m.now += C.MISS_COOLDOWN_MS;
  k.x = p.x = -24;
  k.z = -25.25;
  p.z = -22.75;
  k.yaw = 0;
  sim.intent(k.id, 'attack');
  expect(p.health).toBe('healthy');
  m.now += C.MISS_COOLDOWN_MS;
  k.x = p.x = 0;
  k.z = 0;
  p.z = 2;
  p.y = 4;
  sim.intent(k.id, 'attack');
  expect(p.health).toBe('healthy');
});
it('rewind never uses history older than the allowed window', () => {
  const { k, p, m } = setup();
  p.z = 20;
  p.history = [{ time: m.now - 1000, x: 0, z: 2 }];
  sim.intent(k.id, 'attack', m.now - 1000);
  expect(p.health).toBe('healthy');
  m.now += C.MISS_COOLDOWN_MS;
  p.history = [{ time: m.now - 100, x: 0, z: 2 }];
  sim.intent(k.id, 'attack', m.now - 100);
  expect(p.health).toBe('injured');
});
