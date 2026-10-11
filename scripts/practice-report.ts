import { writeReport } from './write-report';
import { Simulation } from '../shared/simulation';
import { initPhysics } from '../shared/physics';
import { fillBots, updateBots } from '../shared/bots';
import { C } from '../shared/config';
await initPhysics();
const runs = [];
for (const seed of [4, 19, 77, 133, 888]) {
  const simulation = new Simulation(seed, 100000);
  try {
    fillBots(simulation, C.MAX_PLAYERS);
    simulation.start();
    for (
      let tick = 0;
      tick < 50000 && simulation.state.phase !== 'finished';
      tick++
    ) {
      updateBots(simulation);
      simulation.step();
    }
    const match = simulation.state;
    runs.push({
      seed,
      phase: match.phase,
      seconds: Math.round((match.now - match.startedAt) / 1000),
      required: match.required,
      completedGenerators: match.generators.filter(
        (generator) => generator.progress >= 1,
      ).length,
      outcomes: match.players
        .filter((player) => player.role === 'survivor')
        .map((player) => player.health),
      reason: match.reason,
    });
  } finally {
    simulation.dispose();
  }
}
await writeReport(
  'docs/bot-match-samples.json',
  JSON.stringify(runs, null, 2) + '\n',
);
