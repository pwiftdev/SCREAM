import { beforeAll, it, expect } from 'vitest';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { fillBots, updateBots } from '../shared/bots';
import { C } from '../shared/config';
beforeAll(initPhysics);
it('five development actors complete a full authoritative match through objectives or collapse', () => {
  const s = new Simulation(77, 100000);
  fillBots(s, C.MAX_PLAYERS);
  expect(s.start()).toBe(true);
  for (
    let i = 0;
    i < ((C.MATCH_CAP_MS + C.DAWN_MS) / 1000) * C.TICK_HZ + 3 &&
    s.state.phase !== 'finished';
    i++
  ) {
    updateBots(s);
    s.step();
  }
  expect(s.state.phase).toBe('finished');
  expect(
    s.state.players
      .filter((p) => p.role === 'survivor')
      .every((p) => ['escaped', 'taken'].includes(p.health)),
  ).toBe(true);
  expect(
    s.state.players.find((p) => p.role === 'killer')!.points.Hunt +
      s.state.players.reduce((a, p) => a + p.points.Repair, 0),
  ).toBeGreaterThan(0);
  s.dispose();
}, 30000);
