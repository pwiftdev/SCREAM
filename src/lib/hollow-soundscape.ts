import { forestBiome } from '../../shared/house/forest';
import { at, index, type HouseV1 } from '../../shared/house/format';
import type { SoundPosition } from './soundscape';
import { B, BLOCKS } from '../../shared/house/blocks';
import {
  DISTRICTS,
  pathDistance,
  PATH_HALF_WIDTH,
} from '../../shared/house/world-layout';
import type { VisitState } from '../../shared/house/simulation';
import type { SfxGroup } from './horror-sfx-catalog';
export type FootSurface = Exclude<
  SfxGroup,
  'wind' | 'door' | 'growl' | 'music' | 'atmosphere' | 'scream' | 'jump'
>;
export function indoorSurface(block: number): FootSurface {
  if (block === B.STAIRS || block === B.LADDER) return 'stairs';
  if (block === B.RED || block === B.BLACK) return 'carpet';
  if (block === B.BARS || block === B.SPIKES) return 'metal';
  if (block === B.DIRT) return 'mud';
  if (block === B.GRAVEL) return 'gravel';
  if (block === B.LEAVES) return 'leaves';
  if ([B.BRICK, B.MOSS, B.CRACK, 36].includes(block)) return 'concrete';
  return 'wood';
}
export function outdoorSurface(p: { x: number; z: number }): FootSurface {
  if (Math.hypot(p.x - 85, p.z - 376) < 14) return 'mud';
  if (pathDistance(p) < PATH_HALF_WIDTH) return 'gravel';
  if (Math.hypot(p.x - 110, p.z - 365) < 23) return 'concrete';
  if (forestBiome(p.x, p.z) === 'wetland') return 'mud';
  if (Math.abs(p.x) > 165 || p.z > 445) return 'exposed';
  return 'leaves';
}
export function windZone(p: { x: number; z: number }) {
  const district = DISTRICTS.findIndex(
    (d) => Math.hypot(p.x - d.x, p.z - d.z) < 70,
  );
  if (district >= 0) return district;
  return p.z < -35 ? 5 : 6;
}
export class SoundVariants {
  private next = new Map<string, number>();
  take(group: string, count: number) {
    const value = this.next.get(group) ?? 0;
    this.next.set(group, (value + 1) % Math.max(1, count));
    return value % Math.max(1, count);
  }
}
export class VisitSoundEvents {
  private tick = -1;
  private doors = new Set<number>();
  private stashes = new Set<number>();
  reset(state?: VisitState) {
    this.tick = state?.tick ?? -1;
    this.doors = new Set(state?.doors);
    this.stashes = new Set(state?.stashes);
  }
  read(s: VisitState) {
    if (s.tick < this.tick) {
      this.reset(s);
      return { events: [], doors: [], stash: false };
    }
    const events = s.events.filter(
      (e) => e.tick > this.tick && e.tick <= s.tick,
    );
    const doors = [...new Set([...s.doors, ...this.doors])].filter(
      (i) => s.doors.has(i) !== this.doors.has(i),
    );
    const stash = [...s.stashes].some((i) => !this.stashes.has(i));
    this.reset(s);
    return { events, doors, stash };
  }
}

export function houseSoundOccluded(
  house: HouseV1,
  open: Set<number>,
  a: SoundPosition,
  b: SoundPosition,
) {
  const count = Math.ceil(
    Math.hypot(a.x - b.x, (a.y ?? 1) - (b.y ?? 1), a.z - b.z) * 2,
  );
  for (let i = 1; i < count; i++) {
    const t = i / count;
    const x = Math.floor(a.x + (b.x - a.x) * t),
      y = Math.floor((a.y ?? 1) + ((b.y ?? 1) - (a.y ?? 1)) * t),
      z = Math.floor(a.z + (b.z - a.z) * t);
    if (BLOCKS[at(house, x, y, z)].solid && !open.has(index(x, y, z)))
      return true;
  }
  return false;
}
