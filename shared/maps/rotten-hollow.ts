export interface Spot {
  id: string;
  x: number;
  z: number;
  y?: number;
}
export interface Block extends Spot {
  w: number;
  h: number;
  d: number;
  kind: 'wall' | 'stall' | 'hedge' | 'caravan' | 'foundation' | 'prop';
}
const spots = (prefix: string, coords: number[][]): Spot[] =>
  coords.map(([x, z], i) => ({ id: `${prefix}${i}`, x, z }));
export const generators = spots('gen', [
  [0, -12],
  [-25, -28],
  [25, -27],
  [-28, 0],
  [27, 0],
  [-24, 21],
  [24, 28],
  [0, 28],
  [10, 10],
]);
export const cages = spots('cage', [
  [-34, -34],
  [34, -34],
  [-35, 12],
  [35, 14],
  [-14, 36],
  [14, -34],
]);
export const gates = spots('gate', [
  [0, -43],
  [0, 43],
]);
export const lockers = spots('locker', [
  [-15, -18],
  [-34, -15],
  [32, -22],
  [18, 3],
  [-16, 19],
  [29, 34],
  [-34, 29],
  [6, -32],
  [-7, 14],
  [13, 29],
  [34, -6],
  [-38, 6],
]);
export const pallets = spots('pallet', [
  [-17, -25],
  [-29, -19],
  [18, -23],
  [30, -14],
  [-22, -2],
  [-32, 7],
  [20, 6],
  [31, 10],
  [-18, 24],
  [-29, 32],
  [18, 29],
  [29, 22],
  [-5, 17],
  [12, -5],
  [6, -29],
  [-8, -10],
]);
export const windows = spots('window', [
  [-23, -18],
  [23, -18],
  [-25, 6],
  [25, 12],
  [-22, 31],
  [22, 22],
  [4, 17],
  [10, -22],
]);
export const spawns = spots('spawn', [
  [-6, 33],
  [7, 33],
  [-33, -6],
  [33, -7],
  [-7, -33],
  [24, -33],
]);
export const carousel = { x: 0, z: 0, radius: 7, rim: 0.7, height: 0.28 };
export const blocks: Block[] = [
  { id: 'north-west', x: -24, z: -45, w: 42, h: 4, d: 1, kind: 'wall' },
  { id: 'north-east', x: 24, z: -45, w: 42, h: 4, d: 1, kind: 'wall' },
  { id: 'south-west', x: -24, z: 45, w: 42, h: 4, d: 1, kind: 'wall' },
  { id: 'south-east', x: 24, z: 45, w: 42, h: 4, d: 1, kind: 'wall' },
  { id: 'west', x: -45, z: 0, w: 1, h: 4, d: 90, kind: 'wall' },
  { id: 'east', x: 45, z: 0, w: 1, h: 4, d: 90, kind: 'wall' },
  ...[
    [-24, -24],
    [24, -22],
    [-28, 3],
    [25, 8],
    [-24, 27],
    [24, 26],
    [0, 17],
    [10, -26],
  ].flatMap(([x, z], i): Block[] => [
    {
      id: `loop-${i}-a`,
      x,
      z,
      w: 7,
      h: 2.8,
      d: 2,
      kind: i < 2 ? 'caravan' : i < 4 ? 'stall' : 'hedge',
    },
    {
      id: `loop-${i}-b`,
      x: x + 4,
      z: z + 3,
      w: 2,
      h: 2.8,
      d: 6,
      kind: i < 2 ? 'caravan' : i < 4 ? 'stall' : 'hedge',
    },
  ]),
  {
    id: 'infirmary-chair',
    x: -16.6,
    z: -28.65,
    w: 0.8,
    h: 1.1,
    d: 1,
    kind: 'prop',
  },
  { id: 'house-back', x: -12, z: -30, w: 12, h: 7, d: 1, kind: 'wall' },
  { id: 'house-left', x: -18, z: -25, w: 1, h: 7, d: 10, kind: 'wall' },
  { id: 'house-right', x: -6, z: -25, w: 1, h: 7, d: 10, kind: 'wall' },
  { id: 'house-front-left', x: -15, z: -20, w: 6, h: 7, d: 1, kind: 'wall' },
  { id: 'house-front-right', x: -7, z: -20, w: 2, h: 7, d: 1, kind: 'wall' },
  {
    id: 'house-balcony',
    x: -12,
    z: -27.75,
    y: 3.2,
    w: 10,
    h: 0.25,
    d: 3.5,
    kind: 'foundation',
  },
  ...Array.from({ length: 12 }, (_, i): Block => ({
    id: `stair-${i}`,
    x: -8,
    z: -20.5 - i * 0.45,
    w: 2,
    h: (i + 1) * 0.27,
    d: 0.46,
    kind: 'foundation',
  })),
];
export function seeded(seed: number) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function activePallets(seed: number) {
  return seededSpots(pallets, seed, 14);
}
export function activeLockers(seed: number) {
  return seededSpots(lockers, seed ^ 0x51a3, 8);
}
function seededSpots(spots: Spot[], seed: number, count: number) {
  const random = seeded(seed);
  return [...spots]
    .map((p) => ({ p, sort: random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, count)
    .map(({ p }) => p);
}
export const map = {
  name: 'Rotten Hollow Fairground',
  generators,
  cages,
  gates,
  lockers,
  pallets,
  windows,
  spawns,
  blocks,
};
