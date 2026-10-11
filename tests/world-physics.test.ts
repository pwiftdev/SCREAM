import { beforeAll, expect, it } from 'vitest';
import { initPhysics } from '../shared/physics';
import { Simulation } from '../shared/simulation';
import { carousel } from '../shared/maps/rotten-hollow';
beforeAll(initPhysics);
it('steps onto the rendered carousel deck and back down without sinking or blocking', () => {
  const sim = new Simulation(14, 100000);
  try {
    const p = sim.add('test', 'Mara', 'survivor')!;
    p.x = 2;
    p.z = 8;
    p.y = 0;
    for (let i = 0; i < 80; i++) sim.physics.move(p, 0, -0.05, 1 / 30);
    expect(p.z).toBeLessThan(5);
    expect(p.y).toBeGreaterThanOrEqual(carousel.height);
    expect(p.y).toBeLessThan(carousel.height + 0.15);
    for (let i = 0; i < 100; i++) sim.physics.move(p, 0, 0.05, 1 / 30);
    expect(p.z).toBeGreaterThan(8);
    expect(p.y).toBeLessThan(0.1);
  } finally {
    sim.dispose();
  }
});
it('the infirmary wheelchair blocks movement consistently with its visible footprint', () => {
  const sim = new Simulation(15, 100000);
  try {
    const p = sim.add('test', 'Mara', 'survivor')!;
    p.x = -16.6;
    p.z = -26.5;
    p.y = 0;
    for (let i = 0; i < 70; i++) sim.physics.move(p, 0, -0.05, 1 / 30);
    expect(p.z).toBeGreaterThan(-28.15);
    expect(p.z).toBeLessThan(-27);
  } finally {
    sim.dispose();
  }
});
it('climbs the house stairs to the balcony with the same controller', () => {
  const sim = new Simulation(16, 100000);
  try {
    const p = sim.add('test', 'Mara', 'survivor')!;
    p.x = -8.5;
    p.z = -19;
    p.y = 0;
    for (let i = 0; i < 300; i++) sim.physics.move(p, 0, -0.05, 1 / 30);
    expect(p.z).toBeLessThan(-25.8);
    expect(p.y).toBeGreaterThan(3);
  } finally {
    sim.dispose();
  }
});
