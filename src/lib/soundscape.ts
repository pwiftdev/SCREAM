import { carousel } from '../../shared/maps/rotten-hollow';
import { lineOfSight } from '../../shared/geometry';
export type SoundPosition = { x: number; y?: number; z: number };
export function houseBlend(p: SoundPosition) {
  if ((p.y ?? 0) > 7.3) return 0;
  return Math.max(
    0,
    Math.min(1, Math.min(p.x + 18, -6 - p.x, p.z + 30, -19 - p.z) / 1.5),
  );
}
export function footSurface(p: SoundPosition) {
  return houseBlend(p) > 0 ||
    Math.hypot(p.x - carousel.x, p.z - carousel.z) <
      carousel.radius + carousel.rim
    ? 'wood'
    : 'grass';
}
export function soundOccluded(a: SoundPosition, b: SoundPosition) {
  return !lineOfSight({ ...a, id: 'listener' }, { ...b, id: 'sound' });
}
export class FootstepMeter {
  constructor(private stride = 1.45) {}
  private previous?: SoundPosition;
  private distance = 0;
  reset() {
    this.previous = undefined;
    this.distance = 0;
  }
  advance(position: SoundPosition, enabled = true) {
    const step = this.previous
      ? Math.hypot(position.x - this.previous.x, position.z - this.previous.z)
      : 0;
    this.previous = { ...position };
    if (!enabled || step > 3) {
      this.distance = 0;
      return false;
    }
    this.distance += step;
    if (this.distance < this.stride) return false;
    this.distance %= this.stride;
    return true;
  }
}
export const SOUND_FILES: Record<string, string> = {
  forest: 'forest.mp3',
  piano: 'piano.mp3',
  caverns: 'caverns.mp3',
  fire: 'fire.wav',
  engine: 'engine.wav',
  swing: 'swing.wav',
  heartbeat: 'heartbeat.wav',
};
for (const [name, count] of [
  ['grass', 4],
  ['wood', 4],
  ['metal', 3],
  ['wood-hit', 3],
  ['hit', 2],
  ['bell', 1],
  ['tool', 2],
] as const)
  for (let i = 0; i < count; i++)
    SOUND_FILES[`${name}-${i}`] = `${name}-${i}.wav`;
