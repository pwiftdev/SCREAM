import { wallLamps } from './light-layout';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { generators, blocks, seeded } from '../../shared/maps/rotten-hollow';
import { bakeGeometry } from './geometry-utils';
import { houseBlend } from '../lib/soundscape';
import { windMaterial } from './weather';
import { heightFog } from './post-effects';
type Placement = {
  x: number;
  z: number;
  height: number;
  yaw?: number;
  y?: number;
};
const clear = (x: number, z: number, margin = 1) =>
  houseBlend({ x, z }) === 0 &&
  !blocks.some(
    (b) =>
      Math.abs(x - b.x) < b.w / 2 + margin &&
      Math.abs(z - b.z) < b.d / 2 + margin,
  );
export function sceneryPlacements() {
  const random = seeded(4802),
    placements: Record<string, Placement[]> = {};
  const add = (
    id: string,
    x: number,
    z: number,
    height: number,
    yaw = random() * Math.PI * 2,
  ) => (placements[id] ??= []).push({ x, z, height, yaw });
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2,
      radius = 52 + random() * 13;
    add(
      i % 2 ? 'pine_sapling_small' : 'pine_tree_01',
      Math.sin(angle) * radius,
      Math.cos(angle) * radius,
      9 + random() * 8,
    );
  }
  for (const [x, z] of [
    [-14, 34],
    [10, 33],
    [-16, 11],
    [37, 22],
    [-34, -36],
    [33, -29],
    [-39, 20],
    [15, -36],
  ])
    add('dead_tree_trunk', x, z, 4 + random() * 3);
  for (let i = 0; i < 65; i++) {
    const x = (random() - 0.5) * 83,
      z = (random() - 0.5) * 83;
    if (Math.abs(x) < 5 || Math.abs(z) < 5 || !clear(x, z, 1.1)) continue;
    add('fern_02', x, z, 0.45 + random() * 0.65);
    if (i % 4 === 0) add('rock_moss_set_01', x + 1, z, 0.18 + random() * 0.35);
  }
  for (const [x, z] of [
    [-8, 33],
    [-1, 34],
    [-10, 26],
    [2, 27],
  ])
    add('tree_stump_01', x, z, 0.4 + random() * 0.3);
  for (const [x, z] of [
    [-9, 37],
    [-10, 30],
    [1, 31],
    [-22, -17],
    [22, -15],
    [26, 3],
    [-30, -3],
    [-15, -31],
  ])
    add('wooden_crate_01', x, z, 0.7 + random() * 0.4);
  for (const [x, z] of [
    [3, 32],
    [-10, 33],
    [22, 4],
    [-31, -2],
    [-19, -32],
    [30, -18],
  ])
    add('barrel_03', x, z, 0.95);
  for (const [x, z] of [
    [-29, -24],
    [29, -23],
    [-30, -20],
    [19, -23],
  ])
    add('old_tyre', x, z, 0.68);
  for (const [x, z, yaw] of [
    [-8, 29, 1.5],
    [-3, 34, 0],
    [1, 28, -1],
    [8, -6, 1.6],
    [-8, 5, -1.5],
  ])
    add('painted_wooden_bench', x, z, 0.86, yaw);
  add('wheelchair_01', -16.6, -28.65, 1.1, 0.35);
  for (const [x, z] of [
    [-25.8, -28],
    [24.2, -27],
    [26.3, 0],
    [-27.3, 0],
  ])
    add('small_oil_can_01', x, z, 0.32);
  for (const g of generators)
    add('portable_generator', g.x, g.z, 1.2, Math.PI / 2);
  for (const { x, z } of wallLamps) add('industrial_wall_lamp', x, z, 0.5, 0);
  for (const block of blocks.filter((b) => b.kind === 'hedge')) {
    const horizontal = block.w > block.d,
      length = Math.max(block.w, block.d);
    for (let step = -length / 2 + 0.65; step < length / 2; step += 1.2)
      add(
        'wild_rooibos_bush',
        block.x + (horizontal ? step : 0),
        block.z + (horizontal ? 0 : step),
        2.7 + random() * 0.25,
      );
  }
  for (let i = 0; i < 450; i++) {
    const x = (random() - 0.5) * 86,
      z = (random() - 0.5) * 86;
    if (Math.abs(x) < 5 || Math.abs(z) < 5 || !clear(x, z, 0.3)) continue;
    add('grass_medium_01', x, z, 0.18 + random() * 0.3);
  }
  return placements;
}
export async function loadScenery(
  parent: THREE.Group,
  alive: () => boolean,
  time: { value: number },
  placements: Record<string, Placement[]> = sceneryPlacements(),
  enhancedFog = true,
) {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(
    Object.entries(placements).map(async ([id, placements]) => {
      const { scene } = await loader.loadAsync(`/assets/environment/${id}.glb`);
      if (!alive()) {
        disposeScenery(scene);
        return;
      }
      scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(scene),
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      const normalise = new THREE.Matrix4().makeTranslation(
        -center.x,
        -bounds.min.y,
        -center.z,
      );
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const geometry = bakeGeometry(
          object.geometry,
          normalise.clone().multiply(object.matrixWorld),
        );
        const material = (
          Array.isArray(object.material) ? object.material[0] : object.material
        ).clone() as THREE.MeshStandardMaterial;
        material.envMapIntensity = 0.6;
        material.side = THREE.FrontSide;
        if (material.alphaTest || material.transparent) {
          material.side = THREE.DoubleSide;
          material.alphaTest = 0.35;
          material.transparent = false;
          material.depthWrite = true;
        }
        if (enhancedFog) heightFog(material);
        if (['grass_medium_01', 'fern_02', 'wild_rooibos_bush'].includes(id))
          windMaterial(material, time, 0.018);
        const mesh = new THREE.InstancedMesh(
            geometry,
            material,
            placements.length,
          ),
          matrix = new THREE.Matrix4();
        placements.forEach((p, i) => {
          const scale =
            p.height /
            (id === 'dead_tree_trunk'
              ? Math.max(size.x, size.y, size.z)
              : size.y);
          matrix.compose(
            new THREE.Vector3(
              p.x,
              p.y ?? (id === 'industrial_wall_lamp' ? 2.5 : 0),
              p.z,
            ),
            new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              p.yaw ?? 0,
            ),
            new THREE.Vector3(scale, scale, scale),
          );
          mesh.setMatrixAt(i, matrix);
        });
        mesh.name = `scanned-${id}`;
        mesh.receiveShadow = true;
        mesh.castShadow = ![
          'pine_sapling_small',
          'pine_tree_01',
          'fern_02',
          'grass_medium_01',
        ].includes(id);
        mesh.computeBoundingSphere();
        parent.add(mesh);
        object.geometry.dispose();
        for (const m of Array.isArray(object.material)
          ? object.material
          : [object.material])
          m.dispose();
      });
    }),
  );
}
export function disposeScenery(
  root: THREE.Object3D,
  extraMaterials: THREE.Material[] = [],
) {
  const textures = new Set<THREE.Texture>(),
    materials = new Set<THREE.Material>(extraMaterials),
    geometries = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh) && !(o instanceof THREE.Points)) return;
    geometries.add(o.geometry);
    for (const material of Array.isArray(o.material)
      ? o.material
      : [o.material]) {
      materials.add(material);
    }
  });
  for (const material of materials)
    for (const value of Object.values(material))
      if (value instanceof THREE.Texture) textures.add(value);
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
