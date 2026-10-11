import * as T from 'three';
import {
  WORLD_SCENERY,
  WILD_ASSETS,
  type WorldProp,
} from '../../../shared/house/world-scenery';
import {
  LANDMARKS,
  PLOTS,
  pathDistance,
} from '../../../shared/house/world-layout';
import { terrainHeight } from '../../../shared/house/terrain';
import { SEARCH_SITES } from '../../../shared/house/rework';
import { assetModel } from './asset-pack';
import type { AssetId } from './asset-catalog';
import type { WorldKit } from '../hollow/world-kit';
const JOINTS = {
  wheel: ['pivot_wheel', 'z', 0.045],
  carousel: ['pivot_spin', 'y', 0.13],
  sails: ['pivot_sails', 'z', 0.1],
  rock: ['pivot_rock', 'x', 0.07],
  cage: ['pivot_cage', 'z', 0.035],
  head: ['pivot_head', 'y', 0.45],
} as const;
function movingProp(world: T.Group, p: WorldProp) {
  const root = assetModel(p.id as AssetId);
  root.name = p.id;
  root.position.set(p.x, terrainHeight(p.x, p.z) + p.y, p.z);
  root.rotation.y = p.yaw;
  root.scale.setScalar(p.scale);
  world.add(root);
  const [name, axis, speed] = JOINTS[p.motion!];
  const joint = root.getObjectByName(name);
  const rest = joint?.rotation[axis] ?? 0;
  return { root, joint, axis, speed, rest, motion: p.motion, phase: p.x * 0.7 };
}
export function expandWorld(k: WorldKit, world: T.Group) {
  const moving: ReturnType<typeof movingProp>[] = [];
  for (const p of WORLD_SCENERY) {
    if (p.motion) moving.push(movingProp(world, p));
    else k.model(p.id as AssetId, p.x, p.y, p.z, p.scale, p.yaw);
  }
  const natural = WILD_ASSETS.filter(
    (id) => id !== 'nat_twisted_tree' && id !== 'nat_swamp_pool',
  );
  for (let i = 0; i < 850; i++) {
    const x = -196 + ((i * 73.31) % 392),
      z = -79 + ((i * 113.73) % 564);
    if (
      pathDistance({ x, z }) < 4 ||
      PLOTS.some((p) => Math.hypot(p.center.x - x, p.center.z - z) < 23) ||
      WORLD_SCENERY.some((p) => Math.hypot(p.x - x, p.z - z) < 9) ||
      SEARCH_SITES.some((p) => Math.hypot(p.x - x, p.z - z) < 6) ||
      LANDMARKS.some((p) => Math.hypot(p.x - x, p.z - z) < 12)
    )
      continue;
    const id = natural[i % natural.length];
    k.model(id, x, 0, z, 0.65 + (i % 5) * 0.18, i * 2.4);
  }
  k.sign(150, 270, 'Mercy annex • keep quiet', 5, 0.3);
  k.sign(-151, 276, 'The hanging ridge', 5, -0.3);
  for (const [x, z] of [
    [-115, 159],
    [-84, 194],
    [-87, 364],
    [20, 32],
    [155, 276],
    [117, 171],
  ])
    k.light(x, 1.5, z, 0xffbc73, { power: 7, reach: 7, damaged: x === 155 });
  const previous = world.userData.animateAssets;
  const direction = new T.Vector3(),
    toward = new T.Vector3();
  world.userData.animateAssets = (
    time: number,
    camera: T.Camera,
    reduced: boolean,
  ) => {
    previous?.(time, camera, reduced);
    camera.getWorldDirection(direction);
    for (const p of moving) {
      p.root.visible =
        p.root.position.distanceToSquared(camera.position) < 85 ** 2;
      if (!p.joint || !p.root.visible) continue;
      if (reduced) {
        p.joint.rotation[p.axis] = p.rest;
        continue;
      }
      if (
        p.motion === 'head' &&
        toward
          .copy(p.root.position)
          .sub(camera.position)
          .normalize()
          .dot(direction) > 0.35
      )
        continue;
      const sway = ['rock', 'cage', 'head'].includes(p.motion!);
      p.joint.rotation[p.axis] =
        p.rest +
        (sway
          ? Math.sin(time * 0.8 + p.phase) * p.speed
          : (time * p.speed) % (Math.PI * 2));
    }
  };
}
