import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { C } from '../shared/config';
import {
  hit,
  cage,
  rescue,
  release,
  stun,
  scream,
  updateHealth,
  updateEndgame,
} from '../shared/rules';
import { judgeSkill, updateTask } from '../shared/interactions';
import { cages } from '../shared/maps/rotten-hollow';
let sim: Simulation;
beforeAll(initPhysics);
afterEach(() => sim?.dispose());
function game() {
  sim = new Simulation(1, 100000);
  const k = sim.add('k', 'Hollow', 'killer')!,
    p = sim.add('p', 'Mara', 'survivor')!,
    a = sim.add('a', 'Dez', 'survivor')!;
  sim.start(true);
  k.x = 0;
  k.z = 0;
  p.x = 0;
  p.z = 1;
  a.x = 1;
  a.z = 1;
  return { m: sim.state, k, p, a };
}
describe('health and cage state transitions', () => {
  it('hits healthy to injured to downed and applies boost and cooldown', () => {
    const { m, k, p } = game();
    expect(hit(m, k, p)).toBe(true);
    expect(p.health).toBe('injured');
    expect(p.boostUntil).toBe(m.now + C.HIT_BOOST_MS);
    hit(m, k, p);
    expect(p.health).toBe('downed');
    expect(p.bleedAt).toBe(m.now + C.BLEED_MS);
    expect(k.attackUntil).toBe(m.now + C.HIT_COOLDOWN_MS);
    expect(hit(m, k, p)).toBe(false);
  });
  it('picks up after a validated hold and struggle frees injured', () => {
    const { m, k, p } = game();
    p.health = 'downed';
    k.input.interact = true;
    k.inputAt = m.now;
    updateTask(m, k, C.PICKUP_MS / 1000);
    expect(p.health).toBe('carried');
    k.yaw = 1.25;
    updateHealth(m, p, 0);
    expect(p.yaw).toBe(k.yaw);
    expect(p.x).toBe(k.x);
    expect(p.z).toBe(k.z);
    p.input.interact = true;
    p.inputAt = m.now;
    updateHealth(m, p, C.STRUGGLE_MS / 1000);
    expect(p.health).toBe('injured');
    expect(p.carrier).toBeUndefined();
  });
  it('stuns release a carried survivor', () => {
    const { m, k, p } = game();
    p.health = 'carried';
    p.carrier = k.id;
    stun(m, k, C.PALLET_STUN_MS);
    expect(p.health).toBe('injured');
    expect(k.stunUntil).toBe(m.now + C.PALLET_STUN_MS);
  });
  it('cage stage one lasts 60 seconds, second 60, then taken', () => {
    const { m, k, p } = game();
    Object.assign(k, cages[0], { id: 'k' });
    p.carrier = k.id;
    p.health = 'carried';
    expect(cage(m, k, p, cages[0].id)).toBe(true);
    m.now += C.CAGE_STAGE_MS;
    updateHealth(m, p, 0);
    expect(p.health).toBe('caged');
    m.now += C.CAGE_STAGE_MS;
    updateHealth(m, p, 0);
    expect(p.health).toBe('taken');
  });
  it('rescues injured with protection, second cage expires after one stage and third is immediate', () => {
    const { m, k, p, a } = game();
    Object.assign(k, { x: cages[0].x, z: cages[0].z });
    p.carrier = k.id;
    p.health = 'carried';
    cage(m, k, p, cages[0].id);
    a.x = p.x;
    a.z = p.z;
    expect(rescue(m, a, p)).toBe(true);
    expect(p.health).toBe('injured');
    expect(p.boostUntil).toBe(m.now + C.RESCUE_BOOST_MS);
    p.carrier = k.id;
    p.health = 'carried';
    expect(cage(m, k, p, cages[0].id)).toBe(false);
    m.now += C.RECAGE_IMMUNITY_MS;
    cage(m, k, p, cages[0].id);
    expect(p.cages).toBe(2);
    rescue(m, a, p);
    m.now += C.RECAGE_IMMUNITY_MS;
    p.carrier = k.id;
    cage(m, k, p, cages[0].id);
    expect(p.health).toBe('taken');
  });
  it('bleed out is terminal and healing picks up downed teammates', () => {
    const { m, p, a } = game();
    p.health = 'downed';
    p.bleedAt = m.now + C.BLEED_MS;
    a.yaw = -Math.PI / 2;
    a.input.interact = true;
    a.inputAt = m.now;
    updateTask(m, a, C.HEAL_MS / 1000);
    expect(p.health).toBe('injured');
    a.input.interact = true;
    updateTask(m, a, C.HEAL_MS / 1000);
    expect(p.health).toBe('healthy');
    p.health = 'downed';
    m.now = p.bleedAt;
    updateHealth(m, p, 0);
    expect(p.health).toBe('taken');
  });
  it('self healing takes the configured time', () => {
    const { m, p, a } = game();
    a.x = 30;
    p.health = 'injured';
    p.input.interact = true;
    p.inputAt = m.now;
    updateTask(m, p, C.SELF_HEAL_MS / 1000);
    expect(p.health).toBe('healthy');
  });
  it('two nearby screams stun, reveal and are single use', () => {
    const { m, k, p, a } = game();
    expect(scream(m, p)).toBe(true);
    expect(k.stunUntil).toBe(0);
    expect(scream(m, a)).toBe(true);
    expect(k.stunUntil).toBe(m.now + C.SCREAM_STUN_MS);
    expect(p.revealUntil).toBe(m.now + C.SCREAM_REVEAL_MS);
    expect(scream(m, p)).toBe(false);
  });
  it('hard cap starts collapse, then takes remaining survivors', () => {
    const { m, p } = game();
    m.now = m.startedAt + C.MATCH_CAP_MS;
    updateEndgame(m);
    expect(m.dawnAt).toBe(m.now + C.DAWN_MS);
    m.now = m.dawnAt;
    updateEndgame(m);
    expect(p.health).toBe('taken');
    expect(m.phase).toBe('finished');
  });
  it('powered open gates escape and resolve the whole match', () => {
    const { m, p, a } = game();
    m.generators.slice(0, m.required).forEach((g) => (g.progress = 1));
    m.gates[0].open = true;
    p.x = a.x = m.gates[0].x;
    p.z = a.z = m.gates[0].z;
    updateEndgame(m);
    expect(p.health).toBe('escaped');
    expect(m.phase).toBe('finished');
  });
  it('skill check rejects a forged old press and cannot replay', () => {
    const { m, p } = game();
    p.task = { kind: 'repair', target: 'gen0', progress: 0, duration: 75000 };
    p.skill = {
      id: 's',
      startAt: m.now - 1400,
      durationMs: 1500,
      zoneStart: 0.4,
      zoneEnd: 0.6,
    };
    m.generators[0].progress = 0.5;
    judgeSkill(m, p, 's', m.now - 700);
    expect(m.generators[0].progress).toBe(0.4);
    expect(judgeSkill(m, p, 's', m.now)).toBe(false);
  });
  it('killer forfeiture escapes survivors; survivor disconnect is taken', () => {
    const { p, a } = game();
    sim.disconnect(p.id);
    expect(p.health).toBe('taken');
    sim.disconnect('k');
    expect(a.health).toBe('escaped');
    expect(sim.state.phase).toBe('finished');
  });
  it('release clears carry bookkeeping', () => {
    const { m, p } = game();
    p.carrier = 'k';
    release(m, p);
    expect(p.carrier).toBeUndefined();
  });
});
