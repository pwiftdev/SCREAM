import { B } from './blocks';
import { emptyHouse, put, type HouseV1 } from './format';
export const PLOT_TIERS = [
  { name: 'Crooked cottage', min: 0, x0: 5, x1: 18, z1: 20, height: 16 },
  { name: 'Haunted homestead', min: 100000, x0: 3, x1: 20, z1: 22, height: 16 },
  { name: 'Grim estate', min: 500000, x0: 1, x1: 22, z1: 22, height: 24 },
] as const;
export const LEGACY_PLOT_TIER = PLOT_TIERS.length;
const PLOT_BOUNDS = [
  ...PLOT_TIERS.map((tier) => ({ ...tier, z0: 1 })),
  { x0: 0, x1: 23, z0: 0, z1: 23, height: 24 },
];
export const BLUEPRINTS = [
  'Witch cabin',
  'Funeral house',
  'Abandoned chapel',
] as const;
export const plotTier = (slot: number) => [0, 0, 1, 0, 2, 0, 1, 0][slot % 8];
export function starterHouse(tier: number, style: number): HouseV1 {
  const bounds = PLOT_TIERS[tier],
    h = emptyHouse(BLUEPRINTS[style]);
  if (tier === 2) {
    h.height = 24;
    h.blocks = new Uint8Array(24 * 24 * 24);
    h.rot = new Uint8Array(Math.ceil(h.blocks.length / 4));
  }
  const wall = [B.PLANK, B.BRICK, B.MOSS][style];
  for (let x = Number(bounds.x0); x <= bounds.x1; x++)
    for (let z = 1; z <= bounds.z1; z++) {
      put(h, x, 0, z, style === 2 ? B.CRACK : B.PLANK);
      if (x === bounds.x0 || x === bounds.x1 || z === 1 || z === bounds.z1)
        for (let y = 1; y <= 5; y++) put(h, x, y, z, wall);
      const roof =
        6 + Math.floor((1 - Math.abs(x - 11.5) / 11) * (style === 2 ? 6 : 3));
      put(h, x, roof, z, B.DARK);
    }
  for (let y = 1; y <= 3; y++) for (const x of [12, 13]) put(h, x, y, 1, B.AIR);
  for (const x of [bounds.x0 + 2, bounds.x1 - 2]) {
    for (let y = 2; y <= 3; y++) put(h, x, y, 1, B.GLASS);
    put(h, x, 2, 4, B.LANTERN);
    put(h, x, 1, bounds.z1 - 3, style === 1 ? B.COFFIN : B.BOOKS);
  }
  for (let z = 3; z < bounds.z1 - 2; z += 4)
    put(h, bounds.x0 + 1, 1, z, B.JACK);
  h.signs = [
    { pos: { x: 12, y: 2, z: 3 }, text: 'The candy is mine. For now.' },
  ];
  return h;
}
export function fitsPlot(h: HouseV1, tier: number) {
  const b = PLOT_BOUNDS[tier];
  if (!b || (h.height ?? 16) > b.height) return false;
  for (let y = 0; y < (h.height ?? 16); y++)
    for (let z = 0; z < 24; z++)
      for (let x = 0; x < 24; x++)
        if (
          h.blocks[x + z * 24 + y * 576] &&
          (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1)
        )
          return false;
  return [
    ...h.props.flatMap((p) => [p.pos, p.target]),
    ...h.signs.map((s) => s.pos),
  ].every((p) => insidePlot(p, tier));
}
export function insidePlot(
  p: { x: number; y: number; z: number },
  tier: number,
) {
  const b = PLOT_BOUNDS[tier];
  return (
    !!b &&
    p.x >= b.x0 &&
    p.x <= b.x1 &&
    p.z >= b.z0 &&
    p.z <= b.z1 &&
    p.y >= 0 &&
    p.y < b.height
  );
}
