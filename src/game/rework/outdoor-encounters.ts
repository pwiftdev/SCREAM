export interface EncounterPosition {
  x: number;
  z: number;
}
export interface Encounter extends EncounterPosition {
  kind: 'stalker' | 'rush';
  age: number;
  seen: number;
  fade: number;
  moving: boolean;
}
export type EncounterCue = 'behind' | 'approach' | 'impact';
export class OutdoorEncounters {
  current?: Encounter;
  private wait = 25;
  private nextRush = false;
  constructor(
    private blocked: (x: number, z: number) => boolean,
    private height: (x: number, z: number) => number,
    private cue: (cue: EncounterCue, p: EncounterPosition) => void,
    private random = Math.random,
  ) {}
  cancel() {
    this.current = undefined;
    this.wait = Math.max(this.wait, 20);
  }
  private clear(a: EncounterPosition, b: EncounterPosition) {
    const steps = Math.max(
      1,
      Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.25),
    );
    let previous = this.height(a.x, a.z);
    for (let i = 1; i <= steps; i++) {
      const x = a.x + ((b.x - a.x) * i) / steps,
        z = a.z + ((b.z - a.z) * i) / steps,
        y = this.height(x, z);
      if (this.blocked(x, z) || Math.abs(y - previous) > 0.3) return false;
      previous = y;
    }
    return true;
  }
  step(
    seconds: number,
    player: EncounterPosition,
    yaw: number,
    pitch: number,
    active: boolean,
    reduced: boolean,
  ) {
    if (!active || reduced) {
      this.cancel();
      return;
    }
    const dt = Math.max(0, Math.min(0.05, seconds));
    let e = this.current;
    if (!e) {
      this.wait -= dt;
      if (this.wait > 0) return;
      const kind = this.nextRush ? 'rush' : 'stalker';
      for (const offset of [0, 0.3, -0.3, 0.55, -0.55]) {
        const angle = yaw + (kind === 'stalker' ? Math.PI : 0) + offset,
          distance = kind === 'stalker' ? 5 : 13,
          p = {
            x: player.x - Math.sin(angle) * distance,
            z: player.z - Math.cos(angle) * distance,
          };
        if (!this.clear(player, p)) continue;
        this.current = e = {
          ...p,
          kind,
          age: 0,
          seen: 0,
          fade: 0,
          moving: false,
        };
        this.nextRush = !this.nextRush;
        this.cue(kind === 'stalker' ? 'behind' : 'approach', e);
        break;
      }
      this.wait = e ? 38 + this.random() * 32 : 6;
      return;
    }
    e.age += dt;
    e.moving = false;
    const dx = player.x - e.x,
      dz = player.z - e.z,
      distance = Math.hypot(dx, dz);
    if (distance > 22 || !this.clear(player, e)) {
      this.current = undefined;
      return;
    }
    if (e.fade > 0) {
      e.fade += dt;
      if (e.fade >= 0.35) this.current = undefined;
      return;
    }
    if (e.kind === 'stalker') {
      const looking =
        ((Math.sin(yaw) * dx + Math.cos(yaw) * dz) / Math.max(0.01, distance)) *
          Math.cos(pitch) >
        0.72;
      if (looking) e.seen += dt;
      else if (distance > 3) {
        const travel = Math.min(distance - 3, dt * 0.75);
        e.x += (dx / distance) * travel;
        e.z += (dz / distance) * travel;
        e.moving = true;
      }
      if (e.seen >= 0.45 || e.age > 7 || distance < 2) e.fade = dt;
    } else {
      if (e.age < 0.65) return;
      const travel = Math.min(Math.max(0, distance - 0.95), dt * 11);
      const next = {
        x: e.x + (dx / Math.max(0.01, distance)) * travel,
        z: e.z + (dz / Math.max(0.01, distance)) * travel,
      };
      if (!this.clear(e, next)) {
        this.current = undefined;
        return;
      }
      e.moving = travel > 0;
      e.x = next.x;
      e.z = next.z;
      if (distance - travel <= 1 || e.age > 4) {
        if (distance - travel <= 1) {
          this.cue('impact', e);
        }
        e.fade = dt;
      }
    }
  }
}
