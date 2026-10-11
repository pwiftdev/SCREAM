import { beforeAll, expect, it } from 'vitest';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { survivorTarget, killerTarget } from '../shared/bot-targets';
import { fillBots, updateBots } from '../shared/bots';
import { C } from '../shared/config';
beforeAll(initPhysics);
it('only the closest available survivor rescues, while the others keep objectives', () => {
  const sim = new Simulation(12, 100000);
  try {
    fillBots(sim, C.MAX_PLAYERS);
    const [killer, downed, helper, worker, other] = sim.state.players;
    Object.assign(killer, { x: 35, z: -35 });
    Object.assign(downed, { x: 0, z: 30, health: 'downed' });
    Object.assign(helper, { x: 0, z: 27 });
    Object.assign(worker, { x: -25, z: 22 });
    Object.assign(other, { x: 25, z: 28 });
    expect(survivorTarget(sim.state, helper).target?.id).toBe(downed.id);
    expect(survivorTarget(sim.state, worker).target?.id).toMatch(/^gen/);
    expect(survivorTarget(sim.state, other).target?.id).toMatch(/^gen/);
    Object.assign(killer, { x: 1, z: 30 });
    const escape = survivorTarget(sim.state, helper);
    expect(escape.fleeing).toBe(true);
    expect(
      Math.hypot(escape.target!.x - killer.x, escape.target!.z - killer.z),
    ).toBeGreaterThan(18);
  } finally {
    sim.dispose();
  }
});
it('a carrying bot avoids occupied cages and recently used cages', () => {
  const sim = new Simulation(12, 100000);
  try {
    fillBots(sim, C.MAX_PLAYERS);
    const [killer, carried, caged] = sim.state.players;
    Object.assign(killer, { x: -34, z: -34 });
    Object.assign(carried, {
      health: 'carried',
      carrier: killer.id,
      lastCage: 'cage0',
      immuneUntil: sim.state.now + 10000,
    });
    Object.assign(caged, { health: 'caged', cageId: 'cage1' });
    expect(killerTarget(sim.state, killer)?.id).not.toBe('cage0');
    expect(killerTarget(sim.state, killer)?.id).not.toBe('cage1');
  } finally {
    sim.dispose();
  }
});
it('four survivor practice bots complete objectives during a live hunt', () => {
  const sim = new Simulation(77, 100000);
  try {
    fillBots(sim, C.MAX_PLAYERS);
    sim.start();
    for (
      let tick = 0;
      tick < 5 * 60 * C.TICK_HZ && sim.state.phase !== 'finished';
      tick++
    ) {
      updateBots(sim);
      sim.step();
    }
    expect(
      sim.state.generators.filter((generator) => generator.progress >= 1)
        .length,
    ).toBeGreaterThan(0);
  } finally {
    sim.dispose();
  }
}, 30000);

it('the practice killer does not track an unseen survivor through walls', () => {
  const sim = new Simulation(10, 100000);
  try {
    const killer = sim.add('killer', 'Hollow', 'killer')!,
      survivor = sim.add('survivor', 'Mara', 'survivor')!;
    Object.assign(killer, { x: -24, z: -29 });
    Object.assign(survivor, { x: -24, z: -17 });
    expect(killerTarget(sim.state, killer)?.id).not.toBe(survivor.id);
    Object.assign(survivor, { x: -24, z: -32 });
    expect(killerTarget(sim.state, killer)?.id).toBe(survivor.id);
  } finally {
    sim.dispose();
  }
});
