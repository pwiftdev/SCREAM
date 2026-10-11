import { B } from './blocks';
import type { HouseV1 } from './format';
export const NIGHT = {
  seconds: 4 * 3600,
  bagCapacity: 500,
  maxStashes: 3,
  searchSeconds: 1.6,
  looseCandy: 24,
  sprintMultiplier: 1.65,
  staminaDrain: 22,
  staminaRecovery: 14,
  trapStunSeconds: 2,
  fogBonus: 0.2,
  terrorDistance: 15,
} as const;
export const SEARCH_SITES = [
  { id: 'gate', name: 'OLD TOMB', x: -5, z: -56 },
  { id: 'village', name: 'ABANDONED CRATE', x: 7, z: 30 },
  { id: 'graveyard', name: 'OLD TOMB', x: -96, z: 164 },
  { id: 'carnival', name: 'TICKET BOOTH', x: 92, z: 187 },
  { id: 'harvest', name: 'BONE PILE', x: -92, z: 356 },
  { id: 'chapel', name: 'OFFERING CHEST', x: 106, z: 350 },
];
export function nearestSearch(
  p: { x: number; z: number },
  yaw: number,
  found: Set<string>,
) {
  return SEARCH_SITES.find((s) => {
    const dx = s.x - p.x,
      dz = s.z - p.z,
      d = Math.hypot(dx, dz);
    return (
      !found.has(s.id) &&
      d < 4 &&
      (-Math.sin(yaw) * dx - Math.cos(yaw) * dz) / Math.max(0.01, d) > 0.75
    );
  });
}
export function staminaStep(
  value: number,
  sprint: boolean,
  moving: boolean,
  dt: number,
) {
  return Math.max(
    0,
    Math.min(
      100,
      value +
        (sprint && moving && value > 0
          ? -NIGHT.staminaDrain
          : NIGHT.staminaRecovery) *
          dt,
    ),
  );
}
export function nightmare(h: HouseV1) {
  const traps = Math.min(
    10,
    h.props.length * 2 +
      h.blocks.filter((b) => b === B.WEB || b === B.SPIKES || b === B.SCREAMER)
        .length,
  );
  const lights = h.blocks.filter((b) => b === B.LANTERN || b === B.JACK).length;
  const hiding = !h.blocks.includes(B.CANDY)
    ? 0
    : Math.min(
        10,
        Math.round(
          Math.hypot(h.candy.x - h.spawn.x, h.candy.z - h.spawn.z) / 2,
        ),
      );
  const darkness = Math.max(0, 10 - lights);
  return {
    traps,
    hiding,
    darkness,
    total: Math.round(((traps + hiding + darkness) / 30) * 100),
  };
}
export function clockText(seconds: number) {
  const n = Math.max(0, Math.ceil(seconds));
  return [Math.floor(n / 3600), Math.floor((n % 3600) / 60), n % 60]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}
