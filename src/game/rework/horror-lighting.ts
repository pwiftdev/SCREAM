import * as T from 'three';
export type NightMood = 'world' | 'house' | 'menu';
export interface NightLamp {
  x: number;
  y: number;
  z: number;
  color?: number;
  damaged?: boolean;
  reach?: number;
  power?: number;
}
export const NIGHT = {
  fog: 0x020408,
  interior: 0x070b12,
  amber: 0xffbc73,
  moon: 0x91adcf,
};
export function lampBrightness(
  lamp: NightLamp,
  time: number,
  reduced: boolean,
) {
  if (!lamp.damaged || reduced) return 1;
  const seed = Math.abs(lamp.x * 0.73 + lamp.z * 0.39);
  const phase = (time + seed) % 23;
  if (phase > 19.5 && phase < 20.25) return 0.08;
  if (phase > 18.4 && phase < 21.1)
    return 0.55 + 0.4 * Math.sin(phase * 13 + seed) ** 2;
  return 0.97 + 0.03 * Math.sin(time * 1.7 + seed);
}
export class HorrorLighting {
  readonly ambient = new T.AmbientLight(NIGHT.moon, 0.065);
  readonly sky = new T.HemisphereLight(NIGHT.moon, 0x020304, 0.028);
  readonly moon = new T.DirectionalLight(NIGHT.moon, 0.12);
  private mood: NightMood = 'house';
  private shadows = true;
  private offset = new T.Vector3(-26, 38, -18);
  constructor(private scene: T.Scene) {
    this.moon.shadow.mapSize.set(1024, 1024);
    Object.assign(this.moon.shadow.camera, {
      left: -28,
      right: 28,
      top: 28,
      bottom: -28,
      near: 1,
      far: 100,
    });
    this.moon.shadow.camera.updateProjectionMatrix();
    this.moon.shadow.bias = -0.0003;
    this.moon.shadow.normalBias = 0.035;
    scene.add(this.ambient, this.sky, this.moon, this.moon.target);
    this.setMood('house');
  }
  setMood(mood: NightMood) {
    this.mood = mood;
    this.sky.visible = this.moon.visible = mood !== 'house';
    this.moon.castShadow = this.shadows && this.moon.visible;
    this.ambient.intensity = mood === 'house' ? 0.065 : 0.007;
  }
  configure(shadows: boolean) {
    this.shadows = shadows;
    this.setMood(this.mood);
  }
  update(camera: T.Camera) {
    if (!this.moon.visible) return;
    const texel = 56 / 1024;
    this.moon.target.position.set(
      Math.round(camera.position.x / texel) * texel,
      camera.position.y - 1.65,
      Math.round(camera.position.z / texel) * texel,
    );
    this.moon.position.copy(this.moon.target.position).add(this.offset);
    this.moon.target.updateMatrixWorld();
  }
  dispose() {
    this.moon.shadow.dispose();
    this.scene.remove(this.ambient, this.sky, this.moon, this.moon.target);
  }
}
