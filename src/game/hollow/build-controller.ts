import { streetScene } from './street';
import { plotLocation } from '../../../shared/house/neighborhood';
import { terrainHeight } from '../../../shared/house/terrain';
import { meshHouse } from './mesher';
import * as T from 'three';
import { H } from '../../../shared/config';
import {
  cloneHouse,
  index,
  type HouseV1,
  type Vec3i,
} from '../../../shared/house/format';
import { HollowRenderer } from './renderer';
import { BLOCK_TEXTURES, pixelMaterial } from '../rework/pixels';
import { worldKit } from './world-kit';
import { disposeGroup } from './dispose';
export class BuildController {
  readonly renderer: HollowRenderer;
  private abort = new AbortController();
  private raf = 0;
  private last = 0;
  private keys = new Set<string>();
  private ray = new T.Raycaster();
  private house: HouseV1;
  private level = 23;
  private dark = true;
  private ghost = new T.Group();
  private preview: T.Mesh;
  private outline: T.LineSegments;
  private aimed: T.LineSegments;
  private target?: Vec3i;
  private breaking = false;
  private yaw = Math.PI;
  private pitch = 0;
  private dragging = false;
  private ready = false;
  private plotRoot?: T.Group;
  private buildLight = new T.HemisphereLight(0x4a5a80, 0x0a0806, 0.75);
  constructor(
    host: HTMLElement,
    house: HouseV1,
    private onPaint: (p: Vec3i, remove: boolean, pick: boolean) => void,
    onRotate: () => void,
    onUndo: (redo: boolean) => void,
    plot?: { slot: number },
  ) {
    this.house = house;
    const r = (this.renderer = new HollowRenderer(host));
    r.held.visible = false;
    r.scene.add(this.buildLight);
    r.camera.position.set(17, 2.8, -6);
    r.camera.lookAt(12, 2.5, 8);
    if (plot) {
      this.plotRoot = streetScene(r, Math.floor(plot.slot / 40))[
        plot.slot % 40
      ];
      const p = plotLocation(plot.slot % 40);
      r.camera.position.set(
        p.approach.x,
        terrainHeight(p.approach.x, p.approach.z) + H.EYE,
        p.approach.z,
      );
      r.camera.rotation.set(0, p.yaw + Math.PI, 0, 'YXZ');
      this.ghost.rotation.y = p.yaw;
    }
    this.yaw = r.camera.rotation.y;
    this.pitch = r.camera.rotation.x;
    this.preview = new T.Mesh(
      new T.BoxGeometry(1, 1, 1),
      pixelMaterial('plank'),
    );
    const mat = this.preview.material as T.Material;
    mat.transparent = true;
    mat.opacity = 0.55;
    mat.depthWrite = false;
    this.ghost.add(this.preview);
    this.outline = new T.LineSegments(
      new T.EdgesGeometry(new T.BoxGeometry(1.006, 1.006, 1.006)),
      new T.LineBasicMaterial({ color: 0xf2ede4 }),
    );
    this.ghost.add(this.outline);
    this.aimed = new T.LineSegments(
      this.outline.geometry.clone(),
      new T.LineBasicMaterial({ color: 0x050507 }),
    );
    r.scene.add(this.aimed);
    r.scene.add(this.ghost);
    if (this.plotRoot) this.aimed.rotation.y = this.plotRoot.rotation.y;
    this.draw();
    const { signal } = this.abort;
    host.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
    host.addEventListener(
      'pointerdown',
      (e) => {
        if (e.altKey) {
          this.dragging = true;
          return;
        }
        if (!this.ready) {
          this.ready = true;
          void r.gl.domElement.requestPointerLock().catch(() => {});
          return;
        }
        this.paint(e.button === 2 || this.breaking, e.button === 1);
      },
      { signal },
    );
    window.addEventListener('pointerup', () => (this.dragging = false), {
      signal,
    });
    window.addEventListener(
      'mousemove',
      (e) => {
        if (document.pointerLockElement !== r.gl.domElement && !this.dragging)
          return;
        this.yaw -= e.movementX * H.MOUSE_SENSITIVITY;
        this.pitch = T.MathUtils.clamp(
          this.pitch - e.movementY * H.MOUSE_SENSITIVITY,
          -1.5,
          1.5,
        );
      },
      { signal },
    );
    window.addEventListener(
      'keydown',
      (e) => {
        if (
          e.target instanceof HTMLElement &&
          e.target.matches('input,textarea,select')
        )
          return;
        if ((e.ctrlKey || e.metaKey) && ['KeyZ', 'KeyY'].includes(e.code)) {
          e.preventDefault();
          onUndo(e.code === 'KeyY' || e.shiftKey);
          return;
        }
        if (e.code === 'KeyR') onRotate();
        if (e.code === 'KeyE' || e.code === 'Escape') this.pause();
        if (this.ready) this.keys.add(e.code);
      },
      { signal },
    );
    window.addEventListener('keyup', (e) => this.keys.delete(e.code), {
      signal,
    });
    window.addEventListener('blur', () => this.pause(), { signal });
    document.addEventListener(
      'pointerlockchange',
      () => {
        if (document.pointerLockElement !== r.gl.domElement) this.pause();
      },
      { signal },
    );
    this.raf = requestAnimationFrame(this.loop);
  }
  select(id: number, rot = 0) {
    disposeGroup(this.preview);
    this.preview.geometry = new T.BoxGeometry(1, 1, 1);
    this.preview.material = pixelMaterial(BLOCK_TEXTURES[id] ?? 'plank');
    this.preview.material.transparent = true;
    this.preview.material.opacity = 0.55;
    this.preview.material.depthWrite = false;
    this.preview.rotation.y = (rot * Math.PI) / 2;
  }
  mode(breaking: boolean) {
    this.breaking = breaking;
  }
  pause() {
    this.ready = false;
    this.keys.clear();
    if (document.pointerLockElement === this.renderer.gl.domElement)
      document.exitPointerLock();
  }
  move() {
    this.ready = true;
    void this.renderer.gl.domElement.requestPointerLock().catch(() => {});
  }
  update(h: HouseV1, level = this.level, dark = this.dark) {
    this.house = h;
    this.level = level;
    this.dark = dark;
    this.draw();
  }
  private draw() {
    const copy = cloneHouse(this.house);
    for (let y = this.level + 1; y < (copy.height ?? H.PLOT_H); y++)
      for (let z = 0; z < 24; z++)
        for (let x = 0; x < 24; x++) copy.blocks[index(x, y, z)] = 0;
    if (this.plotRoot) {
      disposeGroup(this.plotRoot, this.renderer.atlas.material);
      this.plotRoot.clear();
      this.plotRoot.add(meshHouse(copy, this.renderer.atlas.material));
      const foundation = new T.Mesh(
        new T.BoxGeometry(24, 0.2, 24),
        new T.MeshStandardMaterial({ color: 0x161819 }),
      );
      foundation.position.set(12, -0.1, 12);
      this.plotRoot.add(foundation);
      this.buildLight.intensity = this.dark ? 0.12 : 0.8;
      return;
    }
    this.renderer.house(copy);
    const k = worldKit(this.renderer.world);
    k.box(12, -0.1, 12, 50, 0.2, 50, 0x242e26);
    k.box(12, 0.02, -4, 3, 0.03, 10, 0x44413a);
    k.lamp(6, -1, 2);
    k.pumpkin(16, -2);
    k.finish();
    this.buildLight.intensity = this.dark ? 0.75 : 2;
  }
  private paint(remove: boolean, pick: boolean) {
    const r = this.renderer;
    this.ray.setFromCamera(new T.Vector2(), r.camera);
    this.ray.far = 12;
    const hit = this.ray
      .intersectObjects(
        this.plotRoot ? [this.plotRoot] : r.world.children,
        true,
      )
      .find((h) => h.object instanceof T.Mesh);
    if (hit?.face) {
      const normal = hit.face.normal
          .clone()
          .transformDirection(hit.object.matrixWorld),
        p = hit.point
          .clone()
          .addScaledVector(normal, remove || pick ? -0.01 : 0.01);
      if (this.plotRoot) this.plotRoot.worldToLocal(p);
      this.onPaint(
        { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) },
        remove,
        pick,
      );
    }
  }
  private loop = (now: number) => {
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    const c = this.renderer.camera;
    c.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    const move = (a: string, b: string) =>
      Number(this.keys.has(a)) - Number(this.keys.has(b));
    const f = move('KeyW', 'KeyS'),
      side = move('KeyD', 'KeyA');
    c.position.x +=
      (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * side) *
      (this.plotRoot ? 4.2 : H.BUILD_SPEED) *
      dt;
    c.position.z +=
      (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * side) *
      (this.plotRoot ? 4.2 : H.BUILD_SPEED) *
      dt;
    c.position.y +=
      move('Space', 'ShiftLeft') * (this.plotRoot ? 4.2 : H.BUILD_SPEED) * dt;
    if (this.plotRoot) {
      const local = this.plotRoot.worldToLocal(c.position.clone());
      local.clamp(new T.Vector3(-4, 0.6, -5), new T.Vector3(28, 26, 28));
      c.position.copy(this.plotRoot.localToWorld(local));
    } else
      c.position.clamp(new T.Vector3(-8, 0.5, -8), new T.Vector3(32, 35, 32));
    this.ray.setFromCamera(new T.Vector2(), c);
    this.ray.far = 12;
    const hit = this.ray
      .intersectObjects(
        this.plotRoot ? [this.plotRoot] : this.renderer.world.children,
        true,
      )
      .find((h) => h.object instanceof T.Mesh);
    this.ghost.visible = !!hit;
    this.aimed.visible = !!hit;
    if (hit?.face) {
      const p = hit.point
        .clone()
        .addScaledVector(
          hit.face.normal.clone().transformDirection(hit.object.matrixWorld),
          this.breaking ? -0.01 : 0.01,
        );
      const hitBlock = hit.point
        .clone()
        .addScaledVector(
          hit.face.normal.clone().transformDirection(hit.object.matrixWorld),
          -0.01,
        );
      if (this.plotRoot) {
        this.plotRoot.worldToLocal(p);
        this.plotRoot.worldToLocal(hitBlock);
      }
      hitBlock.floor().addScalar(0.5);
      this.aimed.position.copy(
        this.plotRoot ? this.plotRoot.localToWorld(hitBlock) : hitBlock,
      );
      this.target = {
        x: Math.floor(p.x),
        y: Math.floor(p.y),
        z: Math.floor(p.z),
      };
      this.ghost.position.set(
        this.target.x + 0.5,
        this.target.y + 0.5,
        this.target.z + 0.5,
      );
      if (this.plotRoot) this.plotRoot.localToWorld(this.ghost.position);
      this.preview.visible = !this.breaking;
    }
    this.renderer.draw(now / 1000);
    this.raf = requestAnimationFrame(this.loop);
  };
  dispose() {
    this.abort.abort();
    cancelAnimationFrame(this.raf);
    if (document.pointerLockElement === this.renderer.gl.domElement)
      document.exitPointerLock();
    disposeGroup(this.ghost);
    disposeGroup(this.aimed);
    this.renderer.dispose();
  }
}
