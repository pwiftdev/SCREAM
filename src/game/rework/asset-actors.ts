import * as T from 'three';
import { addPaperMapSurface } from './paper-map';
import { assetModel } from './asset-pack';
import type { AssetId } from './asset-catalog';

export function packActor(id: AssetId) {
  const root = assetModel(id);
  const joints = [
    'pivot_legL',
    'pivot_legR',
    'pivot_armL',
    'pivot_armR',
    'pivot_head',
    'pivot_wingL',
    'pivot_wingR',
  ].map((name) => root.getObjectByName(name));
  const rotations = joints.map((j) => j?.rotation.clone());
  return {
    root,
    animate(time: number, moving = false) {
      joints.forEach((joint, i) => {
        if (!joint) return;
        joint.rotation.copy(rotations[i]!);
        if (i < 4)
          joint.rotation.x +=
            Math.sin(
              time * (moving ? 8 : 1.4) + (i === 0 || i === 3 ? 0 : Math.PI),
            ) * (moving ? 0.5 : 0.035);
        else if (i === 4) joint.rotation.z += Math.sin(time * 0.65) * 0.05;
        else joint.rotation.z += Math.sin(time * 12) * (i === 5 ? 0.7 : -0.7);
      });
    },
  };
}
export const HELD_ITEMS = [
  'item_lantern',
  'item_lockpick',
  'item_firecracker',
  'item_smoke_bomb',
  'item_map',
  'item_candy_corn',
  'item_crowbar',
  'item_shovel',
] as const;
export function packViewmodel(camera: T.Camera) {
  const group = new T.Group();
  group.name = 'held-items';
  const arm = assetModel('item_viewmodel_arm');
  arm.position.set(0.4, -0.48, -0.38);
  arm.rotation.y = Math.PI;
  const hand = arm.getObjectByName('socket_hand')!;
  const items = HELD_ITEMS.map((id, i) => {
    const item = assetModel(id);
    item.name = id;
    if (id === 'item_map') addPaperMapSurface(item);
    item.visible = i === 0;
    item.scale.setScalar(i >= 6 ? 0.7 : i === 0 ? 1 : 1.6);
    hand.add(item);
    return item;
  });
  const copies = new Map<T.Material, T.Material>();
  arm.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const local = (source: T.Material) => {
      if (!copies.has(source)) {
        const m = source.clone();
        m.userData = {};
        m.depthTest = m.depthWrite = false;
        copies.set(source, m);
      }
      return copies.get(source)!;
    };
    o.material = Array.isArray(o.material)
      ? o.material.map(local)
      : local(o.material);
    o.renderOrder = 1000;
    o.castShadow = false;
  });
  const light = new T.PointLight(0xffb04a, 3, 7, 1.5);
  light.position.set(0.4, -0.3, -0.9);
  group.add(arm, light);
  const emission = new Map<T.MeshLambertMaterial, number>();
  items[0].traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m instanceof T.MeshLambertMaterial)
        emission.set(m, m.emissiveIntensity);
  });
  let lanternEnabled = true;
  let selected = 0;
  group.userData.lightEnabled = (enabled: boolean) => {
    lanternEnabled = enabled;
    emission.forEach((intensity, m) => {
      m.emissiveIntensity = enabled ? intensity : 0;
    });
    light.intensity = selected === 0 && enabled ? 3 : 0;
  };
  group.userData.select = (slot: number) => {
    selected = slot;
    group.visible = slot < items.length;
    items.forEach((item, i) => {
      item.visible = i === slot;
    });
    light.intensity = slot === 0 && lanternEnabled ? 3 : 0;
  };
  let strike = -Infinity;
  group.userData.strike = (time: number) => {
    strike = time;
  };
  group.userData.animate = (time: number) => {
    const t = Math.min(1, Math.max(0, (time - strike) / 0.42));
    arm.rotation.x = -Math.sin(t * Math.PI) * 1.15;
    arm.rotation.z = Math.sin(t * Math.PI) * 0.5;
  };
  camera.add(group);
  return group;
}
