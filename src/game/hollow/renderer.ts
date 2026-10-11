import { cullAssetBatches } from '../rework/asset-visibility';
import * as T from 'three';
import { stashLoot } from '../rework/stash-loot';
import { atmosphere } from '../rework/atmosphere';
import {
  HorrorLighting,
  NIGHT,
  type NightMood,
} from '../rework/horror-lighting';
import { NightEffects } from '../rework/night-effects';
import { B, BLOCKS } from '../../../shared/house/blocks';
import { heldLantern } from '../rework/pixels';
import { disposeGroup } from './dispose';
import {
  readHollowSettings,
  type HollowSettings,
} from '../../lib/hollow-settings';
import { H } from '../../../shared/config';
import { cloneHouse, type HouseV1 } from '../../../shared/house/format';
import { type VisitState } from '../../../shared/house/simulation';
import { makeAtlas } from './atlas';
import { meshHouse } from './mesher';
import { monster } from './monster';
export class HollowRenderer {
  readonly scene = new T.Scene();
  readonly camera = new T.PerspectiveCamera(
    H.CAMERA_FOV,
    1,
    H.CAMERA_NEAR,
    1000,
  );
  readonly gl: T.WebGLRenderer;
  readonly atlas = makeAtlas();
  readonly world = new T.Group();
  readonly flash = new T.SpotLight(
    0xffe2bb,
    H.FLASH_INTENSITY,
    H.FLASH_RANGE,
    H.FLASH_ANGLE,
    0.6,
    1.25,
  );
  readonly held: T.Group;
  readonly lighting: HorrorLighting;
  readonly effects: NightEffects;
  private atmosphere: ReturnType<typeof atmosphere>;
  private mood: NightMood = 'house';
  private distance: number = H.FOG_FAR;
  private finalNight = false;
  private actors: ReturnType<typeof monster>[] = [];
  private observer: ResizeObserver;
  private scale: number = H.PIXEL_SCALE;
  private source?: HouseV1;
  private blocks?: T.Group;
  private openKey = '';
  private loot = new Map<number, T.Group>();
  private reducedFlash = false;
  private settingsAbort = new AbortController();
  constructor(private host: HTMLElement) {
    this.gl = new T.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.gl.setClearColor(0x07070a);
    this.gl.outputColorSpace = T.SRGBColorSpace;
    this.gl.toneMapping = T.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = 1.15;
    this.gl.domElement.className = 'hollow-canvas';
    host.append(this.gl.domElement);
    this.held = heldLantern(this.camera);
    this.atmosphere = atmosphere(this.scene, this.camera);
    this.lighting = new HorrorLighting(this.scene);
    this.effects = new NightEffects(this.gl, this.scene, this.camera);
    this.scene.fog = new T.Fog(0x07070a, H.FOG_NEAR, H.FOG_FAR);
    this.scene.add(this.world, this.camera);
    this.camera.add(this.flash, this.flash.target);
    this.flash.position.set(0.18, -0.13, 0);
    this.flash.target.position.set(0, -0.02, -1);
    this.camera.rotation.order = 'YXZ';
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    const configure = () => {
      const settings = readHollowSettings();
      this.configure(settings);
      this.setScale(settings.pixel);
    };
    configure();
    window.addEventListener('hollow-settings', configure, {
      signal: this.settingsAbort.signal,
    });
  }
  get reducedMotion() {
    return this.reducedFlash;
  }
  selectItem(slot: number) {
    this.held.userData.select(slot);
  }
  configure(s: HollowSettings) {
    this.reducedFlash = s.reducedFlash;
    this.distance = s.distance;
    this.setMood(this.mood, this.finalNight);
    this.effects.configure(s);
    this.lighting.configure(s.shadows);
    this.gl.shadowMap.enabled = s.shadows;
    this.gl.shadowMap.type = T.PCFSoftShadowMap;
    this.flash.castShadow = s.shadows;
    this.flash.shadow.mapSize.set(1024, 1024);
    this.flash.shadow.bias = -0.0002;
    this.flash.shadow.normalBias = 0.02;
    this.flash.shadow.camera.near = 0.1;
    this.flash.shadow.camera.far = H.FLASH_RANGE;
    this.flash.shadow.camera.updateProjectionMatrix();
  }
  setMood(mood: NightMood, finalNight = false) {
    this.mood = mood;
    this.finalNight = finalNight;
    this.lighting.setMood(mood);
    const color = finalNight
      ? 0x10070c
      : mood === 'house'
        ? NIGHT.interior
        : NIGHT.fog;
    this.scene.background = new T.Color(color);
    this.scene.fog = new T.FogExp2(
      color,
      ((mood === 'house' ? 0.034 : 0.023) * H.FOG_FAR) / this.distance,
    );
  }
  resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.gl.setPixelRatio(1 / this.scale);
    this.gl.setSize(w, h);
    this.effects.resize(Math.max(1, w), Math.max(1, h));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
  setScale(scale: number) {
    this.scale = scale;
    this.resize();
  }
  clear() {
    disposeGroup(this.world, this.atlas.material);
    this.world.clear();
    this.world.userData.lamps = [];
    delete this.world.userData.animateAssets;
    delete this.world.userData.forestWind;
    this.actors = [];
    this.loot.clear();
  }
  house(h: HouseV1) {
    this.clear();
    this.setMood('house');
    this.source = h;
    this.openKey = '';
    this.blocks = meshHouse(h, this.atlas.material);
    this.world.add(this.blocks);
    h.blocks.forEach((b, i) => {
      if (BLOCKS[b].light)
        this.world.userData.lamps.push({
          x: (i % 24) + 0.5,
          y: Math.floor(i / 576) + 0.6,
          z: (Math.floor(i / 24) % 24) + 0.5,
          damaged: b === B.BULB,
          reach: b === B.CANDLE || b === B.RED_CANDLE ? 5 : 8,
          power: b === B.CANDLE || b === B.RED_CANDLE ? 3 : 7,
        });
    });
    this.actors = h.props.map((p) => {
      const m = monster(p.type === 'follower');
      m.root.position.set(p.pos.x + 0.5, p.pos.y, p.pos.z + 0.5);
      this.world.add(m.root);
      m.root.visible = false;
      return m;
    });
  }
  updateAtmosphere(time: number) {
    cullAssetBatches(this.world, this.camera, this.scene.fog);
    this.world.userData.animateAssets?.(time, this.camera, this.reducedFlash);
    this.atmosphere.update(
      time,
      this.world.userData.lamps ?? [],
      this.reducedFlash,
      this.mood !== 'house',
    );
  }
  draw(time: number) {
    this.updateAtmosphere(time);
    this.lighting.update(this.camera);
    this.effects.render(time);
  }
  render(s: VisitState, time: number, bright = false) {
    const key = [...s.open, ...s.pickups].sort((a, b) => a - b).join(',');
    if (this.source && this.blocks && key !== this.openKey) {
      this.openKey = key;
      const h = cloneHouse(this.source);
      for (const i of [...s.open, ...s.pickups]) h.blocks[i] = 0;
      disposeGroup(this.blocks, this.atlas.material);
      this.world.remove(this.blocks);
      this.blocks = meshHouse(h, this.atlas.material);
      this.world.add(this.blocks);
    }
    for (const [i, group] of this.loot) {
      if (s.stashes.has(i)) continue;
      disposeGroup(group);
      this.world.remove(group);
      this.loot.delete(i);
    }
    for (const i of s.stashes) {
      if (this.loot.has(i)) continue;
      const group = stashLoot(
        i % H.PLOT_W,
        Math.floor(i / (H.PLOT_W * H.PLOT_D)),
        Math.floor(i / H.PLOT_W) % H.PLOT_D,
      );
      this.loot.set(i, group);
      this.world.add(group);
    }
    this.camera.position.set(
      s.pos.x,
      s.pos.y + (s.crouching ? H.CROUCH_EYE : H.EYE),
      s.pos.z,
    );
    if (!this.reducedFlash && s.lastBits & 15)
      this.camera.position.y += Math.sin(time * 12) * 0.025;
    this.camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');
    this.flash.intensity =
      s.flash && s.battery > 0
        ? H.FLASH_INTENSITY *
          (s.blackout && !this.reducedFlash && Math.floor(time * 9) % 3 === 0
            ? 0.06
            : 1)
        : 0;
    this.lighting.ambient.intensity = bright ? 2 : s.blackout ? 0.015 : 0.065;
    this.atlas.material.userData.darkness.value = s.blackout ? 0 : 1;
    this.actors.forEach((a, i) => {
      const v = s.props[i];
      a.root.position.set(v.pos.x, v.pos.y, v.pos.z);
      a.root.lookAt(s.pos.x, v.pos.y, s.pos.z);
      a.animate(
        time,
        v.active >= 0 &&
          ['lurker', 'follower'].includes(this.source!.props[i].type),
      );
    });
    this.draw(time);
  }
  preview(time: number) {
    this.camera.position.set(28, 22, -8);
    this.camera.lookAt(12, 1, 12);
    this.lighting.ambient.intensity = 0.8;
    this.flash.intensity = 0;
    this.actors.forEach((a) => a.animate(time, false));
    this.draw(time);
  }
  dispose() {
    this.settingsAbort.abort();
    this.observer.disconnect();
    this.clear();
    this.atlas.material.dispose();
    this.atlas.texture.dispose();
    this.atlas.emissive.dispose();
    disposeGroup(this.held);
    disposeGroup(this.atmosphere.group);
    this.flash.shadow.dispose();
    this.lighting.dispose();
    this.effects.dispose();
    this.gl.dispose();
    this.gl.forceContextLoss();
    this.gl.domElement.remove();
  }
}
