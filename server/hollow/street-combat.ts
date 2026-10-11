import {
  WEAPONS,
  WEAPON_SITES,
  distantSpawn,
  meleeTarget,
  type Weapon,
} from '../../shared/house/combat';
export class StreetLife {
  x = 0;
  z = 0;
  yaw = Math.PI;
  health = 100;
  shieldUntil = 0;
  deadUntil = 0;
  attackAt = 0;
  damagedAt = -Infinity;
  kills = 0;
  deaths = 0;
  weapon: Weapon = 'crowbar';
  shovel = false;
  initialized = false;
  street = 0;
  spawn(others: { x: number; z: number }[], now: number) {
    Object.assign(this, distantSpawn(others));
    this.health = 100;
    this.shieldUntil = now + 5000;
    this.deadUntil = 0;
    this.initialized = true;
    this.weapon = 'crowbar';
    this.shovel = false;
  }
  equip(value: unknown) {
    if (
      this.health > 0 &&
      (value === 'crowbar' || (value === 'shovel' && this.shovel))
    )
      this.weapon = value;
  }
  pickup() {
    if (
      this.health <= 0 ||
      this.shovel ||
      !WEAPON_SITES.some((p) => Math.hypot(p.x - this.x, p.z - this.z) < 2.5)
    )
      return false;
    this.shovel = true;
    this.weapon = 'shovel';
    return true;
  }
  attack(targets: StreetLife[], stamina: number, now: number) {
    const w = WEAPONS[this.weapon];
    if (this.health <= 0 || now < this.attackAt || stamina < w.cost) return;
    this.attackAt = now + w.cooldown;
    this.shieldUntil = 0;
    const target = targets
      .filter((t) => t !== this && meleeTarget(this, t, this.weapon, now))
      .sort(
        (a, b) =>
          Math.hypot(a.x - this.x, a.z - this.z) -
          Math.hypot(b.x - this.x, b.z - this.z),
      )[0];
    if (target) {
      target.health = Math.max(0, target.health - w.damage);
      target.damagedAt = now;
      if (!target.health) {
        target.deadUntil = now + 7000;
        target.deaths++;
        this.kills++;
      }
    }
    return { target, cost: w.cost };
  }
  canInteract(now: number) {
    return (
      this.health > 0 &&
      now - this.damagedAt > 8000 &&
      now > this.attackAt + 1500
    );
  }
}
