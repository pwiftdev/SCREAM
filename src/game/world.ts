import * as THREE from 'three';
import {
  generators,
  gates,
  cages,
  activeLockers,
  type Spot,
  seeded,
} from '../../shared/maps/rotten-hollow';
import { surfaceMaterials } from './materials';
import { GeometryBatch } from './geometry-batch';
import { buildArchitecture } from './architecture';
import { buildLandmarks, fairgroundSign } from './landmarks';
import { loadScenery } from './scenery';
import { terrainMaterial } from './terrain';
import { makeFire } from './atmosphere';
import { dressWorld } from './world-dressing';
import { makeWeather, hangingCurtains } from './weather';
export class WorldArt {
  group = new THREE.Group();
  weather = makeWeather(this.group);
  materials: ReturnType<typeof surfaceMaterials>;
  generatorLights: THREE.Mesh[] = [];
  gateLights: THREE.Mesh[] = [];
  gateDoors: THREE.Group[] = [];
  flames = makeFire();
  fire = this.flames.group;
  lockerMeshes: THREE.InstancedMesh[] = [];
  ready: Promise<void>;
  disposed = false;
  constructor() {
    const manager = new THREE.LoadingManager();
    const texturesReady = new Promise<void>((resolve, reject) => {
      manager.onLoad = resolve;
      manager.onError = (url) => reject(new Error(`Could not load ${url}`));
    });
    this.materials = surfaceMaterials(manager);
    terrainMaterial(this.materials);
    const batch = new GeometryBatch(this.materials);
    this.ground(batch);
    buildArchitecture(batch);
    buildLandmarks(batch);
    this.props(batch);
    dressWorld(batch, this.group);
    hangingCurtains(this.group, this.materials.cream, this.weather.time);
    batch.flush(this.group);
    this.ready = Promise.all([
      texturesReady,
      loadScenery(this.group, () => !this.disposed, this.weather.time),
    ]).then(() => {});
  }
  update(time: number, reducedMotion = false) {
    this.flames.update(time);
    this.weather.update(time, reducedMotion);
  }
  ground(b: GeometryBatch) {
    b.add(
      'earth',
      new THREE.PlaneGeometry(400, 400, 1, 1),
      [0, -0.025, 0],
      [-Math.PI / 2, 0, 0],
    );
    const random = seeded(294);
    const water = new THREE.MeshPhysicalMaterial({
      color: '#303c39',
      roughness: 0.12,
      metalness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.7,
      normalMap: this.materials.mud.normalMap,
      normalScale: new THREE.Vector2(0.08, 0.08),
    });
    for (let i = 0; i < 22; i++) {
      const geometry = new THREE.CircleGeometry(0.6 + random() * 1.6, 24),
        positions = geometry.attributes.position;
      for (let j = 1; j < positions.count; j++) {
        const scale = 0.75 + random() * 0.25;
        positions.setXY(
          j,
          positions.getX(j) * scale,
          positions.getY(j) * scale * 0.6,
        );
      }
      const puddle = new THREE.Mesh(geometry, water);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(
        i % 2 ? (random() - 0.5) * 75 : (random() - 0.5) * 6,
        0.002,
        i % 2 ? (random() - 0.5) * 5 : (random() - 0.5) * 75,
      );
      this.group.add(puddle);
    }
  }
  props(b: GeometryBatch) {
    for (const g of generators) {
      b.box('iron', g.x, 1.4, g.z, 0.045, 2.8, 0.045);
      this.generatorLights.push(this.bulb(g.x, 2.75, g.z, 0.09));
    }
    for (const c of cages) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        b.add('rust', new THREE.CylinderGeometry(0.022, 0.028, 2.7, 6), [
          c.x + Math.sin(a) * 0.8,
          1.4,
          c.z + Math.cos(a) * 0.8,
        ]);
      }
      for (const y of [0.12, 0.55, 2.45, 2.8])
        b.add(
          'iron',
          new THREE.TorusGeometry(0.8, 0.045, 6, 32),
          [c.x, y, c.z],
          [Math.PI / 2, 0, 0],
        );
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        b.beam(
          'rust',
          new THREE.Vector3(
            c.x + Math.sin(a) * 0.8,
            2.8,
            c.z + Math.cos(a) * 0.8,
          ),
          new THREE.Vector3(c.x, 3.4, c.z),
        );
      }
      b.add('wood', new THREE.CylinderGeometry(0.8, 0.8, 0.08, 24), [
        c.x,
        0.08,
        c.z,
      ]);
    }
    const locker = new GeometryBatch(this.materials),
      template = new THREE.Group();
    locker.box('rust', 0, 1.25, 0, 1, 2.5, 0.8);
    locker.box('iron', 0, 1.24, 0.42, 0.87, 2.3, 0.04);
    for (let y = 1.65; y < 2.15; y += 0.08)
      locker.box('black', 0, y, 0.449, 0.53, 0.025, 0.02);
    locker.box('cream', 0.28, 1.18, 0.47, 0.045, 0.17, 0.04);
    locker.flush(template);
    template.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const mesh = new THREE.InstancedMesh(o.geometry, o.material, 8);
        mesh.castShadow = mesh.receiveShadow = true;
        this.group.add(mesh);
        this.lockerMeshes.push(mesh);
      }
    });
    this.arrangeLockers(activeLockers(1));
    for (const g of gates) {
      const door = new THREE.Group(),
        metal = this.materials.rust;
      for (let i = 0; i < 13; i++) {
        const bar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, 3.8, 8),
          metal,
        );
        bar.position.set(-2.7 + i * 0.45, 1.9, 0);
        bar.castShadow = true;
        door.add(bar);
      }
      for (const y of [0.3, 2, 3.7]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(5.5, 0.09, 0.09),
          metal,
        );
        rail.position.y = y;
        door.add(rail);
      }
      door.position.set(g.x, 0, g.z);
      this.group.add(door);
      this.gateDoors.push(door);
      for (const x of [-3, 3])
        b.box('plaster', g.x + x, 2.3, g.z, 0.55, 4.6, 0.55);
      b.box('rust', g.x, 4.6, g.z, 6.4, 0.2, 0.3);
      this.gateLights.push(this.bulb(g.x, 4.3, g.z, 0.14));
    }
    for (const [text, x, y, z, w, h] of [
      ['ROTTEN HOLLOW', 0, 6.1, 39, 15, 1.65],
      ['THE LAST LAUGH', -12, 5.8, -19.3, 8, 1.2],
    ] as const) {
      const sign = fairgroundSign(text, w, h);
      sign.position.set(x, y, z);
      this.group.add(sign);
    }
    for (const x of [-7.8, 7.8]) b.box('wood', x, 3, 39, 0.24, 6, 0.24);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      b.add(
        'plaster',
        new THREE.IcosahedronGeometry(0.26, 1),
        [-4 + Math.sin(a) * 0.95, 0.12, 30 + Math.cos(a) * 0.95],
        [i, i * 0.3, 0],
        [1, 0.6, 0.8],
      );
    }
    for (let i = 0; i < 6; i++)
      b.add(
        'bark',
        new THREE.CylinderGeometry(0.11, 0.15, 1.4, 12),
        [-4, 0.24 + (i % 2) * 0.13, 30],
        [Math.PI / 2, i * 0.9, 0],
      );
    this.fire.position.set(-4, 0.16, 30);
    this.group.add(this.fire);
  }
  pallet() {
    const group = new THREE.Group(),
      batch = new GeometryBatch(this.materials);
    for (let i = 0; i < 6; i++)
      batch.box('wood', 0, 0.07, -0.6 + i * 0.24, 2, 0.1, 0.21);
    for (const x of [-0.75, 0.75])
      batch.box('wood', x, -0.06, 0, 0.12, 0.18, 1.4);
    for (const x of [-0.75, 0.75])
      for (let i = 0; i < 6; i++)
        batch.box('iron', x, 0.125, -0.6 + i * 0.24, 0.025, 0.008, 0.025);
    batch.flush(group);
    return group;
  }
  bulb(x: number, y: number, z: number, radius: number) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#b8773c' }),
    );
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    return mesh;
  }
  arrangeLockers(spots: Spot[]) {
    const matrix = new THREE.Matrix4();
    for (const mesh of this.lockerMeshes) {
      spots.forEach((s, i) =>
        mesh.setMatrixAt(i, matrix.makeTranslation(s.x, 0, s.z)),
      );
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }
}
