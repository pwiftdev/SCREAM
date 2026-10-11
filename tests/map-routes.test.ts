import { beforeAll, expect, it } from 'vitest';
import { cages, gates, generators, spawns } from '../shared/maps/rotten-hollow';
import { route } from '../shared/navigation';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { C } from '../shared/config';
beforeAll(initPhysics);
it('every spawn reaches every generator, cage and exit through the actual player controller', () => {
  const sim = new Simulation(700, 100000);
  const player = sim.add('route-tester', 'Mara', 'survivor')!;
  try {
    for (const start of spawns)
      for (const target of [...generators, ...cages, ...gates]) {
        const path = route(start, target);
        expect(path.length, `${start.id} → ${target.id}`).toBeGreaterThan(0);
        Object.assign(player, { x: start.x, y: 0, z: start.z });
        for (const waypoint of path) {
          for (let tick = 0; tick < 120; tick++) {
            const dx = waypoint.x - player.x,
              dz = waypoint.z - player.z,
              distance = Math.hypot(dx, dz);
            if (distance < 0.15) break;
            const step = Math.min(distance, C.SURVIVOR_RUN / C.TICK_HZ);
            sim.physics.move(
              player,
              (dx / distance) * step,
              (dz / distance) * step,
              1 / C.TICK_HZ,
            );
          }
          expect(
            Math.hypot(player.x - waypoint.x, player.z - waypoint.z),
            `${start.id} → ${target.id}, waypoint ${waypoint.x},${waypoint.z}`,
          ).toBeLessThan(0.5);
        }
        expect(
          Math.hypot(player.x - target.x, player.z - target.z),
          `${target.id} interaction approach`,
        ).toBeLessThan(2);
      }
  } finally {
    sim.dispose();
  }
}, 30000);
it('the playable arena has widely separated exits and objectives in all four quadrants', () => {
  expect(C.WORLD_HALF * 2).toBeGreaterThanOrEqual(90);
  expect(
    Math.hypot(gates[0].x - gates[1].x, gates[0].z - gates[1].z),
  ).toBeGreaterThan(80);
  for (const x of [-1, 1])
    for (const z of [-1, 1])
      expect(generators.some((g) => g.x * x > 20 && g.z * z > 20)).toBe(true);
});
