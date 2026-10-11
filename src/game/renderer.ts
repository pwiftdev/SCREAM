import * as THREE from 'three';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  VignetteEffect,
  NoiseEffect,
  SMAAEffect,
  DepthOfFieldEffect,
  NormalPass,
  SSAOEffect,
} from 'postprocessing';
import { QUALITY, C } from '../../shared/config';
import type { Snapshot, PublicPlayer } from '../../shared/types';
import { WorldArt } from './world';
import { WorldLighting } from './lighting';
import { SpectatorCamera } from './spectator-camera';
import { nightGrade } from './post-effects';
import { Feedback } from './feedback';
import { streamCharacters } from './assets';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { makeAtmosphere } from './atmosphere';
import { disposeScenery } from './scenery';
import { CameraMotion, cameraDamping } from './camera-motion';
import { Prediction } from './prediction';
import { ActorMotion, angleDelta } from './actor-motion';
import {
  character,
  addHolderCharm,
  disposeCharacter,
  type Character,
} from './characters';
export interface ViewSettings {
  quality: keyof typeof QUALITY;
  fov: number;
  reducedMotion: boolean;
  flashReduction: boolean;
}
export interface PerformanceStats {
  fps: number;
  calls: number;
  triangles: number;
  scale: number;
}
export class GameRenderer {
  prediction = new Prediction();
  feedback: Feedback;
  freeCamera: SpectatorCamera;
  lastFrame = 0;
  frameDelta = 0;
  ray = new THREE.Raycaster();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(65, 1, 0.1, 300);
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  menuFocus: EffectPass;
  art = new WorldArt();
  models = new Map<string, Character>();
  pallets = new Map<string, THREE.Group>();
  lighting = new WorldLighting(this.scene);
  moon = this.lighting.moon;
  ready: Promise<void>;
  environmentTarget?: THREE.WebGLRenderTarget;
  assetsReady = false;
  readyAt = 0;
  disposed = false;
  atmosphere: (time: number) => void;
  normalPass: NormalPass;
  occlusionPass: EffectPass;

  clock = new THREE.Clock();
  handle = 0;
  snapshot?: Snapshot;
  private actors = new ActorMotion();
  received = 0;
  yaw = Math.PI;
  pitch = 0.2;
  playing = false;
  spectating = false;
  follow = 'overview';
  settings: ViewSettings;
  fps = 60;
  renderScale = 0.85;
  previewKey: string | null = null;
  previewModels = new Map<string, Character>();
  onView?: (position: THREE.Vector3, forward: THREE.Vector3) => void;
  private viewForward = new THREE.Vector3();
  private motion = new CameraMotion();
  private cameraOwner = '';
  onPerf?: (v: PerformanceStats) => void;
  private resizeObserver: ResizeObserver;
  private cameraTarget = new THREE.Vector3();
  private lastPerf = 0;
  private frames = 0;
  private menuCharacters: Character[] = [];
  constructor(
    readonly container: HTMLElement,
    settings: ViewSettings,
  ) {
    this.settings = settings;
    void this.prediction.init();

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor('#101a20');
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.append(this.renderer.domElement);
    this.freeCamera = new SpectatorCamera(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2('#101d25', 0.012);
    this.scene.add(this.art.group);
    this.feedback = new Feedback(this.scene, this.camera);
    this.atmosphere = makeAtmosphere(this.scene);
    this.ready = Promise.all([
      streamCharacters(),
      this.art.ready,
      this.loadEnvironment(),
    ]).then(() => {
      if (this.disposed) return;
      this.assetsReady = true;
      this.readyAt = this.clock.getElapsedTime();
      this.createMenuCharacters();
      this.feedback.setViewModel(character(true));
      if (this.previewKey) {
        const key = this.previewKey;
        this.preview(true, Number(key.slice(1)), key[0] === 'k');
      }
      this.renderer.domElement.dataset.ready = 'true';
    });
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.normalPass = new NormalPass(this.scene, this.camera, {
      resolutionScale: 0.5,
    });
    this.composer.addPass(this.normalPass);
    this.occlusionPass = new EffectPass(
      this.camera,
      new SSAOEffect(this.camera, this.normalPass.texture, {
        samples: 12,
        rings: 7,
        intensity: 1.25,
        radius: 0.12,
        luminanceInfluence: 0.4,
        worldDistanceThreshold: 70,
        worldDistanceFalloff: 20,
        worldProximityThreshold: 0.5,
        worldProximityFalloff: 1,
        resolutionScale: 0.5,
      }),
    );
    this.composer.addPass(this.occlusionPass);
    this.menuFocus = new EffectPass(
      this.camera,
      new DepthOfFieldEffect(this.camera, {
        focusDistance: 12,
        focusRange: 18,
        bokehScale: 0.7,
        resolutionScale: 0.5,
      }),
    );
    this.composer.addPass(this.menuFocus);
    const grain = new NoiseEffect({ premultiply: true });
    grain.blendMode.opacity.value = 0.025;
    this.composer.addPass(
      new EffectPass(
        this.camera,
        new SMAAEffect(),
        new BloomEffect({
          intensity: 0.25,
          luminanceThreshold: 1.1,
          mipmapBlur: true,
        }),
        new VignetteEffect({ darkness: 0.42, offset: 0.28 }),
        grain,
        nightGrade(),
      ),
    );
    this.configure(settings);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.animate();
  }
  async loadEnvironment() {
    const [hdr, sky] = await Promise.all([
      new HDRLoader().loadAsync('/assets/environment/night.hdr'),
      new THREE.TextureLoader().loadAsync('/assets/environment/night-sky.webp'),
    ]);
    if (this.disposed) {
      hdr.dispose();
      sky.dispose();
      return;
    }
    const generator = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = generator.fromEquirectangular(hdr);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.32;
    sky.mapping = THREE.EquirectangularReflectionMapping;
    sky.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = sky;
    this.scene.backgroundIntensity = 0.1;
    this.scene.backgroundBlurriness = 0;
    hdr.dispose();
    generator.dispose();
  }
  createMenuCharacters() {
    for (let i = 0; i < C.SURVIVORS; i++) {
      const c = character(false, i),
        a = (i / C.SURVIVORS) * Math.PI * 2;
      c.root.position.set(-4 + Math.sin(a) * 3, 0, 30 + Math.cos(a) * 3);
      c.root.rotation.y = a + Math.PI;
      this.scene.add(c.root);
      this.menuCharacters.push(c);
    }
    const hollow = character(true);
    hollow.root.position.set(5, 0, 19);
    hollow.root.rotation.y = 0.4;
    this.scene.add(hollow.root);
    this.menuCharacters.push(hollow);
  }
  preview(active: boolean, index: number, killer: boolean) {
    this.previewKey = active ? `${killer ? 'k' : 's'}${index}` : null;
    if (
      this.assetsReady &&
      this.previewKey &&
      !this.previewModels.has(this.previewKey)
    ) {
      const c = character(killer, index);
      c.root.position.set(-6, 0, 35);
      c.root.rotation.y = 0.25;
      this.scene.add(c.root);
      this.previewModels.set(this.previewKey, c);
    }
  }
  configure(s: ViewSettings) {
    this.settings = s;
    const q = QUALITY[s.quality];
    this.renderScale = q.scale;
    this.normalPass.enabled = this.occlusionPass.enabled =
      s.quality === 'High' || s.quality === 'Ultra';
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, 1.6) * this.renderScale,
    );
    this.renderer.shadowMap.enabled = q.shadow > 0;
    this.lighting.configure(q.shadow);
    this.camera.fov = s.fov;
    this.camera.updateProjectionMatrix();
    this.resize();
  }
  resize() {
    const w = this.container.clientWidth,
      h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }
  update(s: Snapshot, spectating = false) {
    if (this.snapshot?.id !== s.id) this.art.arrangeLockers(s.lockers);
    if (this.snapshot && this.snapshot.id !== s.id) {
      for (const c of this.models.values()) {
        this.scene.remove(c.root);
        disposeCharacter(c);
      }
      this.models.clear();
      for (const mesh of this.pallets.values()) {
        this.scene.remove(mesh);
        mesh.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
      }
      this.pallets.clear();
    }
    if (!spectating) this.prediction.reconcile(s);
    if (this.snapshot?.self !== s.self) {
      const own = s.players.find((p) => p.id === s.self);
      if (own?.yaw !== undefined) this.yaw = own.yaw;
    }
    this.received = performance.now();
    this.actors.update(s, this.received);
    this.snapshot = s;
    this.playing = s.phase !== 'lobby';
    this.spectating = spectating;
  }
  position(p: PublicPlayer) {
    if (
      p.id === this.snapshot?.self &&
      !this.spectating &&
      this.prediction.position
    ) {
      const pos = this.prediction.position;
      return new THREE.Vector3(pos.x, pos.y, pos.z);
    }
    const pose = this.actors.sample(p.id, performance.now());
    return new THREE.Vector3(
      pose?.x ?? p.x ?? 0,
      pose?.y ?? p.y ?? 0,
      pose?.z ?? p.z ?? 0,
    );
  }

  animate = () => {
    this.handle = requestAnimationFrame(this.animate);
    const time = this.clock.getElapsedTime();
    this.frameDelta = Math.min(0.05, time - this.lastFrame);
    this.lastFrame = time;
    this.freeCamera.active = this.spectating && this.follow === 'free';
    this.frames++;
    if (time - this.lastPerf >= 1) {
      this.fps = this.frames / (time - this.lastPerf);
      if (this.assetsReady && time - this.readyAt > 4 && !document.hidden) {
        const limit = QUALITY[this.settings.quality].scale;
        const next = Math.max(
          0.5,
          Math.min(
            limit,
            this.renderScale +
              (this.fps < 53 ? -0.05 : this.fps > 59 ? 0.025 : 0),
          ),
        );
        if (Math.abs(next - this.renderScale) > 0.01) {
          this.renderScale = next;
          this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6) * next);
          this.resize();
        }
      }
      this.frames = 0;
      this.lastPerf = time;
      if (this.assetsReady && time - this.readyAt > 4)
        this.onPerf?.({
          fps: Math.round(this.fps),
          calls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
          scale: Math.round(this.renderScale * 100) / 100,
        });
    }
    this.art.update(time, this.settings.reducedMotion);
    this.atmosphere(time);
    this.art.fire.scale.set(
      1 + Math.sin(time * 13) * 0.1,
      1 + Math.sin(time * 9) * 0.17,
      1,
    );
    for (const c of this.menuCharacters) {
      c.root.visible = !this.playing && !this.previewKey;
      c.animate(time, 0, 'healthy');
    }
    for (const [key, c] of this.previewModels) {
      c.root.visible = !this.playing && key === this.previewKey;
      if (c.root.visible) c.animate(time, 0, 'healthy');
    }
    if (this.playing && this.snapshot) this.drawMatch(time);
    else {
      this.feedback.hands.visible = false;
      this.feedback.trails.count = 0;
      this.feedback.markers.count = 0;
      this.feedback.focus.visible = false;
      const drift = this.settings.reducedMotion ? 0 : Math.sin(time * 0.07);
      this.camera.position.set(4.5 + drift * 0.35, 1.8, 35.5);
      this.camera.lookAt(-3, 1.15, 29);
      if (this.previewKey) {
        this.camera.position.set(-4.6, 1.65, 38.1);
        this.camera.lookAt(-6, 1.05, 35);
      }
    }
    this.lighting.update(
      this.camera,
      time,
      this.settings.flashReduction,
      !this.playing && !!this.previewKey,
    );
    this.menuFocus.enabled = !this.playing && !this.previewKey;
    this.camera.getWorldDirection(this.viewForward);
    this.onView?.(this.camera.position, this.viewForward);
    this.renderer.info.reset();
    if (QUALITY[this.settings.quality].bloom) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  };
  drawMatch(time: number) {
    const s = this.snapshot!;
    this.feedback.update(s, this.spectating, time, this.settings.reducedMotion);
    for (const c of this.models.values()) c.root.visible = false;
    for (const p of s.players) {
      if (p.x === undefined || p.health === 'taken' || p.health === 'escaped') {
        const hidden = this.models.get(p.id);
        if (hidden) hidden.root.userData.posed = false;
        continue;
      }
      let c = this.models.get(p.id);
      if (!c && !this.assetsReady) continue;
      if (!c) {
        c = character(p.role === 'killer', p.character);
        if (p.cosmetic === 'ember') addHolderCharm(c.root);
        this.models.set(p.id, c);
        this.scene.add(c.root);
      }
      c.root.visible = !(
        p.id === s.self &&
        p.role === 'killer' &&
        !this.spectating
      );
      const target = this.position(p),
        pose = this.actors.sample(p.id, performance.now()),
        speed = pose?.speed ?? 0,
        action = p.action ?? p.task?.kind,
        moving =
          p.role === 'survivor' &&
          p.health !== 'carried' &&
          p.health !== 'caged' &&
          speed > 0.3 &&
          (!action || action === 'crouch_walk'),
        yaw = moving
          ? (pose?.movementYaw ?? p.yaw ?? 0)
          : (pose?.yaw ?? p.yaw ?? 0);
      if (p.health === 'carried') {
        target.x += Math.cos(yaw) * 0.8;
        target.z -= Math.sin(yaw) * 0.8;
        target.y += 1.65;
      }
      const initialized = c.root.userData.posed === true;
      if (!initialized || c.root.position.distanceTo(target) > 4) {
        c.root.position.copy(target);
        c.root.rotation.y = yaw;
        c.root.userData.posed = true;
      } else {
        c.root.position.lerp(target, 1 - Math.exp(-35 * this.frameDelta));
        c.root.rotation.y +=
          angleDelta(c.root.rotation.y, yaw) *
          (1 - Math.exp(-15 * this.frameDelta));
      }
      c.animate(time, speed, p.health, action);
    }
    s.generators.forEach((g, i) => {
      (
        this.art.generatorLights[i].material as THREE.MeshBasicMaterial
      ).color.set(
        g.progress >= 1 ? '#7fd8c8' : g.progress > 0 ? '#ff9a36' : '#7c4b25',
      );
    });
    s.gates.forEach((g, i) => {
      this.art.gateDoors[i].position.y = g.open ? 4 : g.progress * 1.5;
      (this.art.gateLights[i].material as THREE.MeshBasicMaterial).color.set(
        g.open
          ? '#7fd8c8'
          : s.generators.filter((g) => g.progress >= 1).length >= s.required
            ? '#ff173d'
            : '#3b2924',
      );
    });
    for (const p of s.pallets) {
      let mesh = this.pallets.get(p.id);
      if (!mesh) {
        mesh = this.art.pallet();
        mesh.position.set(p.x, 0.15, p.z);
        this.scene.add(mesh);
        this.pallets.set(p.id, mesh);
      }
      mesh.visible = p.state !== 'broken';
      mesh.rotation.x = p.state === 'up' ? Math.PI / 2 : 0;
      mesh.position.y = p.state === 'up' ? 0.8 : 0.12;
    }
    if (this.spectating && this.follow === 'free') {
      this.freeCamera.update(this.camera, this.frameDelta);
      return;
    }
    const own = s.players.find(
      (p) => p.id === (this.spectating ? this.follow : s.self),
    );
    if (
      !own ||
      own.x === undefined ||
      (this.spectating && this.follow === 'overview')
    ) {
      this.camera.position.set(0, 65, 38);
      this.camera.lookAt(0, 0, 0);
      return;
    }
    const pos = this.position(own);
    const owner = `${s.id}:${own.id}:${this.spectating}`;
    const switched = this.cameraOwner !== owner;
    if (switched) {
      this.motion.reset();
      this.cameraOwner = owner;
    }
    const motion = this.motion.sample(
      pos,
      own.health,
      this.frameDelta,
      this.settings.reducedMotion || this.spectating,
    );
    if (own.role === 'killer') {
      this.camera.position
        .copy(pos)
        .add(new THREE.Vector3(0, 2 + motion.lift, 0));
      this.camera.lookAt(
        this.camera.position
          .clone()
          .add(
            new THREE.Vector3(
              Math.sin(this.yaw),
              -this.pitch + motion.kick,
              Math.cos(this.yaw),
            ),
          ),
      );
    } else {
      const offset = new THREE.Vector3(
        -Math.sin(this.yaw) * 3.7 + Math.cos(this.yaw) * 0.45,
        2.05 + this.pitch * 1.5,
        -Math.cos(this.yaw) * 3.7 - Math.sin(this.yaw) * 0.45,
      );
      this.cameraTarget.copy(pos).add(offset);
      const origin = pos.clone().add(new THREE.Vector3(0, 1.5, 0)),
        direction = this.cameraTarget.clone().sub(origin);
      this.ray.set(origin, direction.clone().normalize());
      this.ray.far = direction.length();
      const hit = this.ray.intersectObjects(this.art.group.children, true)[0];
      if (hit)
        this.cameraTarget
          .copy(origin)
          .addScaledVector(
            direction.normalize(),
            Math.max(0.5, hit.distance - 0.25),
          );
      if (
        hit ||
        switched ||
        this.camera.position.distanceTo(this.cameraTarget) > 12
      )
        this.camera.position.copy(this.cameraTarget);
      else
        this.camera.position.lerp(
          this.cameraTarget,
          cameraDamping(this.frameDelta),
        );
      this.camera.lookAt(
        pos.x + Math.sin(this.yaw) * 2,
        pos.y + 1.45 - this.pitch,
        pos.z + Math.cos(this.yaw) * 2,
      );
    }
    this.camera.rotateZ(motion.roll);
  }
  dispose() {
    this.prediction.dispose();
    this.freeCamera.dispose();
    cancelAnimationFrame(this.handle);
    this.resizeObserver.disconnect();
    this.disposed = this.art.disposed = true;
    for (const c of [
      ...this.models.values(),
      ...this.previewModels.values(),
      ...this.menuCharacters,
    ])
      c.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.SkinnedMesh) o.skeleton.dispose();
    });
    disposeScenery(this.scene, Object.values(this.art.materials));
    this.feedback.viewModel?.dispose();
    this.moon.shadow.dispose();
    this.lighting.infirmary.shadow.dispose();
    this.environmentTarget?.dispose();
    if (this.scene.background instanceof THREE.Texture)
      this.scene.background.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
