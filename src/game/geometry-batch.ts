import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import type { Surface } from './materials';
export class GeometryBatch {
  private buckets = new Map<Surface, THREE.BufferGeometry[]>();
  constructor(
    readonly materials: Record<Surface, THREE.MeshStandardMaterial>,
  ) {}
  add(
    surface: Surface,
    geometry: THREE.BufferGeometry,
    position: number[],
    rotation: number[] = [0, 0, 0],
    scale: number[] = [1, 1, 1],
  ) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(...scale),
      ),
    );
    const p = g.getAttribute('position'),
      n = g.getAttribute('normal'),
      uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      const axis =
        Math.abs(n.getY(i)) > 0.65 ? 1 : Math.abs(n.getX(i)) > 0.65 ? 0 : 2;
      uv[i * 2] = (axis === 0 ? p.getZ(i) : p.getX(i)) * 0.45;
      uv[i * 2 + 1] = (axis === 1 ? p.getZ(i) : p.getY(i)) * 0.45;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const list = this.buckets.get(surface) ?? [];
    list.push(g);
    this.buckets.set(surface, list);
  }
  box(
    surface: Surface,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    rz = 0,
    ry = 0,
  ) {
    this.add(surface, new THREE.BoxGeometry(w, h, d), [x, y, z], [0, ry, rz]);
  }
  beam(
    surface: Surface,
    a: THREE.Vector3,
    b: THREE.Vector3,
    radius = 0.04,
    sides = 7,
  ) {
    const delta = b.clone().sub(a),
      geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        delta.length(),
        sides,
      );
    const rotation = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        delta.normalize(),
      ),
    );
    this.add(
      surface,
      geometry,
      a.clone().add(b).multiplyScalar(0.5).toArray(),
      [rotation.x, rotation.y, rotation.z],
    );
  }
  flush(parent: THREE.Group) {
    for (const [surface, list] of this.buckets) {
      const geometry = mergeGeometries(list),
        mesh = new THREE.Mesh(geometry, this.materials[surface]);
      geometry.boundsTree = new MeshBVH(geometry);
      mesh.raycast = acceleratedRaycast;
      mesh.receiveShadow = true;
      mesh.castShadow = !['earth', 'mud', 'glow'].includes(surface);
      mesh.name = `fairground-${surface}`;
      parent.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.buckets.clear();
  }
}
