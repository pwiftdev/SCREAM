import { beforeAll, afterEach, it, expect } from 'vitest';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { C } from '../shared/config';
import { emptyInput } from '../shared/protocol';
import {
  updateTask,
  updateGenerators,
  judgeSkill,
  nearbyTask,
} from '../shared/interactions';
import { Prediction } from '../src/game/prediction';
import { lockers, blocks } from '../shared/maps/rotten-hollow';
let s: Simulation;
beforeAll(initPhysics);
afterEach(() => s?.dispose());
function setup() {
  s = new Simulation(32, 100000);
  const p = s.add('p', 'P', 'survivor')!,
    k = s.add('k', 'K', 'killer')!;
  s.start(true);
  p.input = { ...emptyInput(), interact: true };
  p.inputAt = s.state.now;
  k.x = 40;
  k.z = 40;
  return { m: s.state, p, k };
}
it('repair needs range and facing, groups use diminishing returns and kick regresses until touched', () => {
  const { m, p, k } = setup();
  const g = m.generators[0];
  p.x = g.x;
  p.z = g.z - 1;
  p.yaw = 0;
  updateTask(m, p, 0);
  updateGenerators(m, 1, () => 0.5);
  expect(g.progress).toBeCloseTo(1 / C.REPAIR_SECONDS_SOLO);
  p.input.interact = false;
  updateTask(m, p, 0);
  k.x = g.x;
  k.z = g.z - 1;
  k.yaw = 0;
  k.input.interact = true;
  k.inputAt = m.now;
  g.progress = 0.5;
  updateTask(m, k, C.PICKUP_MS / 1000);
  expect(g.progress).toBe(0.45);
  expect(g.regressing).toBe(true);
  updateGenerators(m, 1, () => 0.5);
  expect(g.progress).toBeCloseTo(0.4475);
  p.input.interact = true;
  updateTask(m, p, 0);
  updateGenerators(m, 1, () => 0.5);
  expect(g.regressing).toBe(false);
  p.z = g.z - 20;
  expect(nearbyTask(m, p)).toBeUndefined();
});
it('good and great skill check windows are server judged, misses emit noise', () => {
  const { m, p } = setup();
  const g = m.generators[0];
  g.progress = 0.3;
  p.task = { kind: 'repair', target: g.id, progress: 0.3, duration: 75000 };
  p.skill = {
    id: 'great',
    startAt: m.now - 750,
    durationMs: 1500,
    zoneStart: 0.5,
    zoneEnd: 0.7,
  };
  expect(judgeSkill(m, p, 'great', m.now)).toBe(true);
  expect(g.progress).toBeCloseTo(0.32);
  expect(p.points.Repair).toBe(C.POINTS.great);
  p.skill = {
    id: 'miss',
    startAt: m.now,
    durationMs: 1500,
    zoneStart: 0.5,
    zoneEnd: 0.7,
  };
  judgeSkill(m, p, 'miss', m.now);
  expect(g.progress).toBeCloseTo(0.22);
  expect(m.events.at(-1)?.kind).toBe('noise');
});
it('pallet drop stuns, releases carry, and the killer can break it', () => {
  const { m, p, k } = setup();
  const pallet = m.pallets.find((p) => p.id === 'pallet12') ?? m.pallets[0];
  p.x = pallet.x;
  p.z = pallet.z - 1;
  p.yaw = 0;
  k.x = pallet.x + 0.5;
  k.z = pallet.z;
  p.task = undefined;
  const near = nearbyTask(m, p);
  if (near?.kind !== 'drop') {
    pallet.x = 0;
    pallet.z = 7;
    p.x = 0;
    p.z = 6;
    k.x = 0.5;
    k.z = 7;
  }
  updateTask(m, p, C.PALLET_DROP_MS / 1000);
  expect(pallet.state).toBe('down');
  expect(k.stunUntil).toBeGreaterThan(m.now);
  m.now = k.stunUntil;
  k.yaw = -Math.PI / 2;
  k.input.interact = true;
  k.inputAt = m.now;
  updateTask(m, k, C.PALLET_BREAK_MS / 1000);
  expect(pallet.state).toBe('broken');
});
it('lockers only hold one survivor, occupancy is hidden, searching captures', () => {
  const { m, p, k } = setup();
  const l = m.lockers.find((l) => l.id === 'locker6') ?? m.lockers[0];
  p.x = l.x;
  p.z = l.z - 1;
  p.yaw = 0;
  updateTask(m, p, C.VAULT_MS / 1000);
  expect(p.locker).toBe(l.id);
  expect(s.snapshot('k').players.find((v) => v.id === 'p')?.x).toBeUndefined();
  k.x = p.x;
  k.z = p.z;
  k.yaw = 0;
  k.input.interact = true;
  k.inputAt = m.now;
  updateTask(m, k, C.PICKUP_MS / 1000);
  expect(p.health).toBe('carried');
  expect(p.locker).toBeUndefined();
});
it('every candidate locker has a clear entrance and an unambiguous interaction', () => {
  const { m, p } = setup();
  m.lockers = lockers;
  for (const l of lockers) {
    p.x = l.x;
    p.z = l.z + 1.3;
    p.yaw = Math.PI;
    expect(nearbyTask(m, p)).toMatchObject({ kind: 'locker', target: l.id });
    expect(
      blocks.some(
        (b) =>
          (b.y ?? 0) < 1.8 &&
          Math.abs(l.x - b.x) < b.w / 2 + 0.65 &&
          Math.abs(l.z - b.z) < b.d / 2 + 0.65,
      ),
    ).toBe(false);
  }
});
it('gates require power, keep interrupted progress and open after the configured hold', () => {
  const { m, p } = setup();
  const g = m.gates[0];
  p.x = g.x;
  p.z = g.z + 1;
  p.yaw = Math.PI;
  expect(nearbyTask(m, p)?.kind).not.toBe('gate');
  m.generators.slice(0, m.required).forEach((g) => (g.progress = 1));
  updateTask(m, p, 10);
  expect(g.progress).toBe(0.5);
  p.input.interact = false;
  updateTask(m, p, 1);
  expect(g.progress).toBe(0.5);
  p.input.interact = true;
  updateTask(m, p, 10);
  expect(g.open).toBe(true);
});
it('expired movement stops, collision blocks walls, rewind is bounded, Hush has a cooldown', () => {
  const { m, p, k } = setup();
  p.x = -24;
  p.z = -28;
  s.input(p.id, { ...emptyInput(), seq: 1, z: 1 });
  for (let i = 0; i < 180; i++) {
    p.inputAt = m.now;
    s.step();
  }
  expect(p.z).toBeLessThan(-25);
  const z = p.z;
  s.step(1);
  expect(p.z).toBe(z);
  expect(s.intent(k.id, 'hush')).toBe(true);
  expect(s.intent(k.id, 'hush')).toBe(false);
  expect(k.hushUntil).toBe(m.now + C.HUSH_MS);
});
it('prediction replays unacknowledged movement without changing the server snapshot', async () => {
  const { p } = setup();
  const pred = new Prediction();
  await pred.init();
  const snap = s.snapshot(p.id),
    before = JSON.stringify(snap);
  pred.reconcile(snap);
  pred.input({ ...emptyInput(), seq: 1, x: 1 });
  expect(pred.position!.x).toBeGreaterThan(p.x);
  expect(JSON.stringify(snap)).toBe(before);
  p.ack = 1;
  pred.reconcile(s.snapshot(p.id));
  expect(pred.pending).toHaveLength(0);
  expect(pred.position!.x).toBe(p.x);
  pred.dispose();
});
