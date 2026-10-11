import { worldBlocked } from './neighborhood';
import { terrainHeight } from './terrain';
export const WEAPONS = {
  crowbar: {
    name: 'Crowbar',
    asset: 'item_crowbar',
    damage: 25,
    reach: 2.6,
    cooldown: 650,
    cost: 14,
  },
  shovel: {
    name: 'Grave shovel',
    asset: 'item_shovel',
    damage: 40,
    reach: 3.1,
    cooldown: 1050,
    cost: 24,
  },
} as const;
export type Weapon = keyof typeof WEAPONS;
export const WEAPON_SITES = [
  { x: 0, z: 28 },
  { x: -98, z: 164 },
  { x: 96, z: 184 },
  { x: -96, z: 355 },
  { x: 105, z: 350 },
  { x: 0, z: 466 },
] as const;
export const SPAWN_SITES = [
  { x: 0, z: -55 },
  { x: 0, z: 115 },
  { x: -100, z: 175 },
  { x: 100, z: 175 },
  { x: 0, z: 260 },
  { x: -100, z: 365 },
  { x: 100, z: 365 },
  { x: 0, z: 465 },
  { x: -55, z: 267 },
].filter((p) => !worldBlocked(p.x, p.z));
export interface Combatant {
  x: number;
  z: number;
  yaw: number;
  health: number;
  shieldUntil: number;
}
export function distantSpawn(
  others: { x: number; z: number }[],
  random = Math.random,
) {
  const ranked = SPAWN_SITES.map((p) => ({
    p,
    distance: Math.min(
      Infinity,
      ...others.map((o) => Math.hypot(o.x - p.x, o.z - p.z)),
    ),
  }));
  const safe = ranked.filter((p) => p.distance > 100);
  const choices = safe.length
    ? safe
    : ranked.sort((a, b) => b.distance - a.distance).slice(0, 2);
  return { ...choices[Math.floor(random() * choices.length)].p };
}
export function meleeTarget(
  attacker: Combatant,
  target: Combatant,
  weapon: Weapon,
  now: number,
) {
  if (target.health <= 0 || target.shieldUntil > now) return false;
  const dx = target.x - attacker.x,
    dz = target.z - attacker.z,
    d = Math.hypot(dx, dz);
  if (
    d > WEAPONS[weapon].reach ||
    d < 0.05 ||
    (-Math.sin(attacker.yaw) * dx - Math.cos(attacker.yaw) * dz) / d < 0.7
  )
    return false;
  if (
    Math.abs(
      terrainHeight(attacker.x, attacker.z) - terrainHeight(target.x, target.z),
    ) > 1.4
  )
    return false;
  const steps = Math.ceil(d / 0.15);
  for (let i = 1; i < steps; i++)
    if (
      worldBlocked(attacker.x + (dx * i) / steps, attacker.z + (dz * i) / steps)
    )
      return false;
  return true;
}
