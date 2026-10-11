import * as T from 'three';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  NormalPass,
  RenderPass,
  SSAOEffect,
  VignetteEffect,
} from 'postprocessing';
import { nightGrade } from '../post-effects';
import type { HollowSettings } from '../../lib/hollow-settings';
export class NightEffects {
  readonly composer: EffectComposer;
  readonly grain = new NoiseEffect({ premultiply: true });
  readonly normal: NormalPass;
  readonly occlusion: EffectPass;
  private enabled = true;
  private last = 0;
  constructor(
    private gl: T.WebGLRenderer,
    private scene: T.Scene,
    private camera: T.PerspectiveCamera,
  ) {
    this.composer = new EffectComposer(gl, {
      frameBufferType: T.HalfFloatType,
    });
    this.composer.addPass(new RenderPass(scene, camera));
    this.normal = new NormalPass(scene, camera, { resolutionScale: 0.5 });
    this.composer.addPass(this.normal);
    this.occlusion = new EffectPass(
      camera,
      new SSAOEffect(camera, this.normal.texture, {
        samples: 8,
        rings: 4,
        intensity: 0.85,
        radius: 0.06,
        luminanceInfluence: 0.65,
        worldDistanceThreshold: 36,
        worldDistanceFalloff: 12,
        worldProximityThreshold: 0.35,
        worldProximityFalloff: 0.7,
        resolutionScale: 0.5,
      }),
    );
    this.composer.addPass(this.occlusion);
    this.composer.addPass(
      new EffectPass(
        camera,
        new BloomEffect({
          intensity: 0.14,
          luminanceThreshold: 0.9,
          luminanceSmoothing: 0.2,
          mipmapBlur: true,
          resolutionScale: 0.5,
        }),
        new VignetteEffect({ darkness: 0.35, offset: 0.3 }),
        this.grain,
        nightGrade(),
      ),
    );
  }
  configure(settings: HollowSettings) {
    this.enabled = settings.cinematic;
    this.normal.enabled = this.occlusion.enabled = settings.contactShadows;
    this.grain.blendMode.opacity.value = settings.reducedFlash
      ? 0
      : settings.grain * 0.08;
  }
  resize(width: number, height: number) {
    this.composer.setSize(width, height, false);
  }
  render(time: number) {
    const delta = this.last
      ? Math.min(0.1, Math.max(0, time - this.last))
      : 1 / 60;
    this.last = time;
    if (this.enabled) this.composer.render(delta);
    else {
      this.gl.setRenderTarget(null);
      this.gl.clear();
      this.gl.render(this.scene, this.camera);
    }
  }
  dispose() {
    this.composer.dispose();
  }
}
