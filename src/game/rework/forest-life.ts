import * as T from 'three';
import {
  FOREST_CREATURES,
  FOREST_CLEARINGS,
} from '../../../shared/house/forest-sites';
import { terrainHeight } from '../../../shared/house/terrain';
import { assetModel } from './asset-pack';
import type { AssetId } from './asset-catalog';
function creature(
  id: AssetId,
  x: number,
  z: number,
  y: number,
  world: T.Group,
) {
  const root = assetModel(id);
  root.name = id;
  const base = terrainHeight(x, z) + y;
  root.position.set(x, base, z);
  root.rotation.y = Math.PI;
  world.add(root);
  const joints: {
    node: T.Object3D;
    axis: 'x' | 'y';
    rest: number;
    offset: number;
  }[] = [];
  root.traverse((node) => {
    if (!node.name.startsWith('pivot_')) return;
    const axis = node.name.includes('leg') ? 'x' : 'y';
    joints.push({
      node,
      axis,
      rest: node.rotation[axis],
      offset: (joints.length * Math.PI) / 2,
    });
  });
  return { root, joints, base, x, z, id };
}
function veil(id: AssetId, x: number, z: number, y: number, world: T.Group) {
  const model = creature(id, x, z, y, world);
  const materials: T.MeshBasicMaterial[] = [];
  model.root.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const source = o.material as T.MeshLambertMaterial;
    const material = new T.MeshBasicMaterial({
      map: source.map,
      color: id === 'atm_light_shaft' ? 0x9bb5ce : 0x92a2ac,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: T.DoubleSide,
      blending:
        id === 'atm_light_shaft' ? T.AdditiveBlending : T.NormalBlending,
    });
    o.material = material;
    o.castShadow = o.receiveShadow = false;
    materials.push(material);
  });
  return { ...model, materials };
}
export function forestLife(world: T.Group) {
  const creatures = FOREST_CREATURES.map((p) =>
    creature(p.id, p.x, p.z, p.y, world),
  );
  const leaves = [
    [-57, 272],
    [-168, 116],
    [43, 289],
  ].map(([x, z]) => creature('atm_falling_leaves', x, z, 4, world));
  const veils = FOREST_CLEARINGS.flatMap((p, i) => [
    veil('atm_ground_fog', p.x + 4, p.z + 3, 0.1, world),
    ...(i % 2 === 0
      ? [veil('atm_light_shaft', p.x - 4, p.z - 3, 2, world)]
      : []),
  ]);
  const animated = [...creatures, ...leaves];
  const previous = world.userData.animateAssets;
  world.userData.animateAssets = (
    time: number,
    camera: T.Camera,
    reduced: boolean,
  ) => {
    previous?.(time, camera, reduced);
    const wind = world.userData.forestWind;
    if (wind) {
      wind.time.value = time;
      wind.strength.value = reduced ? 0 : 1;
    }
    for (const c of animated) {
      const distance = c.root.position.distanceToSquared(camera.position);
      c.root.visible = distance < 65 ** 2;
      if (!c.root.visible) continue;
      const t = reduced ? 0 : time;
      c.root.position.y = c.base;
      if (c.id === 'cre_wisp' || c.id === 'cre_fireflies') {
        c.root.position.y += Math.sin(t * 0.7 + c.x) * 0.22;
        c.root.rotation.y = Math.PI + Math.sin(t * 0.2) * 0.15;
      } else if (c.id === 'atm_falling_leaves') {
        c.root.position.y -= reduced ? 0 : (t * 0.35 + c.x + 200) % 3;
        c.root.rotation.y = t * 0.09;
      }
      for (const j of c.joints) {
        const head = j.node.name === 'pivot_head';
        const bearing =
          Math.atan2(camera.position.x - c.x, camera.position.z - c.z) -
          c.root.rotation.y;
        const angle = head
          ? T.MathUtils.clamp(
              Math.atan2(Math.sin(bearing), Math.cos(bearing)),
              -1.1,
              1.1,
            ) * 0.4
          : Math.sin(t * 0.8 + j.offset) * 0.025;
        j.node.rotation[j.axis] = j.rest + (reduced ? 0 : angle);
      }
    }
    for (const v of veils) {
      const d = v.root.position.distanceTo(camera.position);
      v.root.visible = d < 65;
      const fade =
        T.MathUtils.smoothstep(d, 2, 8) *
        (1 - T.MathUtils.smoothstep(d, 35, 65));
      v.materials.forEach((m) => {
        m.opacity = fade * (v.id === 'atm_ground_fog' ? 0.055 : 0.035);
      });
    }
  };
}
