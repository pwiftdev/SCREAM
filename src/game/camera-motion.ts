import type { Health } from '../../shared/types';
export const cameraDamping = (seconds: number) =>
  1 - Math.exp(-14 * Math.max(0, seconds));
export class CameraMotion {
  private previous?: { x: number; y: number; z: number };
  private health?: Health;
  private phase = 0;
  private movement = 0;
  private impact = 0;
  jolt(strength = 0.7) {
    this.impact = Math.max(this.impact, Math.max(0, Math.min(1, strength)));
  }
  reset() {
    this.previous = undefined;
    this.health = undefined;
    this.phase = 0;
    this.movement = 0;
    this.impact = 0;
  }
  sample(
    position: { x: number; y: number; z: number },
    health: Health,
    seconds: number,
    reduced: boolean,
  ) {
    const distance = this.previous
      ? Math.hypot(position.x - this.previous.x, position.z - this.previous.z)
      : 0;
    const landed = this.previous ? this.previous.y - position.y : 0;
    if (
      this.health &&
      health !== this.health &&
      (health === 'injured' || health === 'downed')
    )
      this.impact = 1;
    if (landed > 0.15 && landed < 2) this.impact = Math.max(this.impact, 0.35);
    this.previous = { ...position };
    this.health = health;
    this.movement +=
      ((distance < 1
        ? Math.min(1, distance / Math.max(0.001, seconds) / 4)
        : 0) -
        this.movement) *
      cameraDamping(seconds);
    this.phase += distance < 1 ? distance * 4.4 : 0;
    this.impact *= Math.exp(-seconds * 8);
    if (reduced) return { lift: 0, roll: 0, kick: 0 };
    return {
      lift:
        Math.sin(this.phase * 2) * 0.018 * this.movement - this.impact * 0.06,
      roll: Math.sin(this.phase) * 0.003 * this.movement,
      kick: Math.sin(this.impact * 9) * this.impact * 0.022,
    };
  }
}
