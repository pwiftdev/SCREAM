import { terrainHeight } from '../../../shared/house/terrain';
import * as T from 'three';
import { HollowRenderer } from '../hollow/renderer';
import { streetScene } from '../hollow/street';
import { maskedCharacter } from './pixels';
import { meshHouse } from '../hollow/mesher';
import { starterHouse } from '../../../shared/house/plots';
import type { HouseV1 } from '../../../shared/house/format';
import { worldKit } from '../hollow/world-kit';
export class Cinematic {
  readonly renderer: HollowRenderer;
  private raf = 0;
  constructor(
    host: HTMLElement,
    mode: 'loading' | 'menu' | 'results',
    house?: HouseV1,
  ) {
    const r = (this.renderer = new HollowRenderer(host));
    r.held.visible = false;
    r.flash.intensity = 0;
    let actor: ReturnType<typeof maskedCharacter> | undefined;
    if (mode === 'menu') {
      r.world.add(meshHouse(house ?? starterHouse(0, 0), r.atlas.material));
      const k = worldKit(r.world);
      k.box(12, -0.1, 0, 60, 0.2, 60, 0x242e26);
      k.box(12, 0.01, -4, 3, 0.03, 12, 0x44413a);
      for (const x of [8, 16]) {
        k.pumpkin(x, -1);
        k.lamp(x, -2, 2);
      }
      k.finish();
      actor = maskedCharacter();
      actor.root.position.set(12.5, 0, -1);
      actor.root.rotation.y = Math.PI;
      r.world.add(actor.root);
      r.camera.position.set(14.5, 1.65, -6);
      r.camera.lookAt(11, 1.55, 0);
      const key = new T.PointLight(0xffbc73, 12, 9, 1.8),
        rim = new T.PointLight(0x91adcf, 7, 7, 1.8);
      key.position.set(14, 2, -4);
      rim.position.set(12, 2, 1);
      r.world.add(key, rim);
    } else {
      streetScene(r);
      r.camera.position.set(-98, terrainHeight(-98, 195) + 2.4, 195);
      r.camera.lookAt(-100, terrainHeight(-100, 162) + 4, 162);
    }
    r.setMood(mode === 'menu' ? 'menu' : 'world');
    const start = performance.now();
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      actor?.animate(r.reducedMotion ? 0 : t);
      if (mode === 'loading' && !r.reducedMotion) {
        r.camera.position.z = 195 - Math.min(12, t * 0.35);
        r.camera.position.y =
          terrainHeight(r.camera.position.x, r.camera.position.z) + 2.4;
        r.camera.lookAt(-100, terrainHeight(-100, 162) + 4, 162);
      }
      r.draw(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  dispose() {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
  }
}
