import { writeReport } from './write-report';
import {
  blocks,
  cages,
  gates,
  generators,
  spawns,
  type Spot,
} from '../shared/maps/rotten-hollow';
import { route } from '../shared/navigation';
import { C } from '../shared/config';
function pathLength(start: Spot, target: Spot) {
  let previous = start;
  return route(start, target).reduce((sum, point) => {
    const next = sum + Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = point;
    return next;
  }, 0);
}
const gateDistance = pathLength(gates[0], gates[1]);
await writeReport(
  'docs/map-travel.json',
  JSON.stringify(
    {
      arenaMetres: C.WORLD_HALF * 2,
      survivors: C.SURVIVORS,
      gateToGateMetres: gateDistance,
      gateToGateRunningSeconds: gateDistance / C.SURVIVOR_RUN,
      spawnToGeneratorMetres: spawns.map((start) => ({
        id: start.id,
        nearest: Math.min(
          ...generators.map((target) => pathLength(start, target)),
        ),
        furthest: Math.max(
          ...generators.map((target) => pathLength(start, target)),
        ),
      })),
    },
    null,
    2,
  ) + '\n',
);
const point = (value: number) => (value + 45) * 7 + 45;
const obstacles = blocks
  .filter((block) => block.kind !== 'foundation')
  .map(
    (block) =>
      `<rect x="${point(block.x - block.w / 2)}" y="${point(block.z - block.d / 2)}" width="${block.w * 7}" height="${block.d * 7}" fill="${block.kind === 'hedge' ? '#446149' : '#5c5551'}"/>`,
  )
  .join('');
const markers = (spots: Spot[], color: string, prefix: string) =>
  spots
    .map(
      (spot, index) =>
        `<circle cx="${point(spot.x)}" cy="${point(spot.z)}" r="5" fill="${color}"/><text x="${point(spot.x) + 8}" y="${point(spot.z) + 4}" fill="${color}">${prefix}${index + 1}</text>`,
    )
    .join('');
const exitRoute = [gates[0], ...route(gates[0], gates[1])]
  .map((spot) => `${point(spot.x)},${point(spot.z)}`)
  .join(' ');
await writeReport(
  'docs/map-overview.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="800" viewBox="0 0 760 800"><rect width="760" height="800" fill="#111b20"/><g font-family="sans-serif" font-size="12"><text x="45" y="25" fill="#f1dec8" font-size="18">ROTTEN HOLLOW · 90 × 90 m · FOUR SURVIVORS</text><rect x="45" y="45" width="630" height="630" fill="#222b2b"/>${obstacles}<circle cx="360" cy="360" r="49" fill="#4c4841"/><text x="335" y="365" fill="#ddd">Carousel</text><polyline points="${exitRoute}" fill="none" stroke="#ba9571" stroke-dasharray="5 5" opacity="0.6"/>${markers(generators, '#dbaa6d', 'G')}${markers(cages, '#d97978', 'C')}${markers(spawns, '#a6bde3', 'S')}${markers(gates, '#95d4b3', 'EXIT ')}<text x="45" y="710" fill="#dbaa6d">G = generator (repair 5 of 9)</text><text x="360" y="710" fill="#d97978">C = cage</text><text x="45" y="738" fill="#a6bde3">S = candidate spawn (seeded)</text><text x="360" y="738" fill="#95d4b3">EXIT = gate</text><text x="45" y="772" fill="#b9c3c9">Dashed line: ${Math.round(gateDistance)} m exit route · Small scenery and pallets omitted</text></g></svg>\n`,
);
