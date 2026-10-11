import { StreetLife } from './street-combat';
import { NIGHT, nearestSearch, staminaStep } from '../../shared/house/rework';
export class OutdoorSession {
  connection = '';
  readonly life = new StreetLife();
  private night: number;
  constructor(private now = Date.now) {
    this.night = Math.floor(now() / (NIGHT.seconds * 1000));
  }
  stamina = 100;
  carried = 0;
  bank = 0;
  found = new Set<string>();
  hold = 0;
  target = '';
  deposit() {
    const amount = this.carried;
    this.bank += amount;
    this.carried = 0;
    return amount;
  }
  step(
    p: { x: number; z: number },
    yaw: number,
    use: boolean,
    sprint: boolean,
    moving: boolean,
    dt: number,
  ) {
    const night = Math.floor(this.now() / (NIGHT.seconds * 1000));
    if (night !== this.night) {
      this.night = night;
      this.carried = this.bank = this.hold = 0;
      this.found.clear();
      this.target = '';
    }
    this.stamina = staminaStep(this.stamina, sprint, moving, dt);
    const site = nearestSearch(p, yaw, this.found);
    if (!use || !site) {
      this.hold = 0;
      this.target = '';
      return;
    }
    if (this.target !== site.id) {
      this.target = site.id;
      this.hold = 0;
    }
    this.hold += dt;
    if (this.hold >= NIGHT.searchSeconds) {
      const amount = Math.min(
        NIGHT.looseCandy,
        NIGHT.bagCapacity - this.carried,
      );
      if (amount > 0) {
        this.carried += amount;
        this.found.add(site.id);
      }
      this.hold = 0;
      return amount;
    }
  }
}
