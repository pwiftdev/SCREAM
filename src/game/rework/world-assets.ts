import { terrainHeight } from '../../../shared/house/terrain';
import { HAUNTS } from '../../../shared/house/haunts';
import * as T from 'three';
import type { WorldKit } from '../hollow/world-kit';
import { packActor } from './asset-actors';
import { ASSET_CATALOG, type AssetId } from './asset-catalog';
import { SCENERY_PROPS } from '../../../shared/house/neighborhood';

export function dressWorld(k: WorldKit) {
  const { model } = k;
  for (const p of SCENERY_PROPS) {
    const id = p.asset as AssetId,
      size = ASSET_CATALOG[id].size;
    model(
      id,
      p.x,
      0,
      p.z,
      [p.w / size[0], p.height / size[1], p.d / size[2]],
      p.yaw,
    );
  }
  model('str_starter_house', -20, 0, 27, 1, Math.PI / 2);
  model('char_skin_pumpkin', -15.7, 0.2, 27, 1, Math.PI / 2);
  model('item_candy_pail', -15.5, 0.2, 28, 1.5);
  model('hide_hidden_shelf', -16, 0, 30, 1, Math.PI / 2);
  model('prop_candy_pile', -15.5, 1.1, 30, 2);
  for (const [i, id] of (
    [
      'item_key',
      'item_crowbar',
      'item_flashlight',
      'item_lockpick',
      'item_shovel',
    ] as const
  ).entries())
    model(id, -15.5, 0.15, 24 + i * 0.6, 1.5, Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    model('blk_plank_oak', -19 + i, 0, 33, [1, 0.4, 1]);
    model('blk_plank_ash', -19 + i, 0, 34, [1, 0.4, 1]);
    model('blk_plank_dark', -19 + i, 0, 35, [1, 0.4, 1]);
  }
  for (const [i, id] of (
    ['blk_grass', 'blk_dirt', 'blk_gravel', 'blk_log'] as const
  ).entries())
    model(id, -22, 0, 23 + i, 1);
  model('blk_door', -23, 0, 32, 1, 0.3);
  model('blk_window_dark', -23, 2, 32, 1);
  model('blk_window_lit', -22, 2, 32, 1);
  model('blk_bookshelf', -22, 0, 32, [1, 2, 1]);
  model('blk_roof', -22.5, 3, 32, [2, 0.4, 1.4]);

  for (let i = 0; i < 5; i++) {
    const x = -118 + i * 9;
    model('prop_open_grave', x, 0, 205, 1, Math.PI);
    model('prop_coffin', x, 0.05, 208, 1, -0.15);
    model('prop_iron_cross', x - 1, 0, 205, 1);
    model('hide_bone_pile', x + 1.5, 0, 208, 1);
  }
  model('item_shovel', -96, 0, 205, 1.5, 0.2);
  for (const [i, id] of (
    [
      'blk_stone',
      'blk_stone_mossy',
      'blk_cobblestone',
      'blk_crypt_brick',
      'blk_bone',
      'blk_void',
    ] as const
  ).entries()) {
    model(id, -123 + i, 0, 177, [1, 1 + (i % 2), 1]);
  }
  model('blk_iron', -120, 2, 177, [3, 1, 0.2]);
  model('blk_cobweb', -123, 2, 177, 1);
  model('blk_trapdoor', -118, 0, 177, 1);
  model('trap_bear_trap', -124, 0, 180, 1);

  for (const [i, id] of (
    [
      'item_firecracker',
      'item_smoke_bomb',
      'item_scream_horn',
      'item_map',
      'item_lollipop',
      'item_wrapped_candy',
      'item_candy_corn',
    ] as const
  ).entries())
    model(id, 84 + i * 0.42, 1.05, 156.7, 2, Math.PI);
  model('blk_candy', 87, 0, 158, 1);
  model('prop_candy_pile', 86, 1.02, 157, 2);
  model('hide_stash_chest_open', 111, 0, 160, 1);

  for (let i = 0; i < 10; i++) {
    model('blk_hay', -125 + i * 4, 0, 373, [1, 1 + (i % 2), 1], i * 0.12);
    model('blk_pumpkin', -123 + i * 4, 0, 374, 0.8, Math.PI);
    model('prop_fence_wood', -125 + i * 1.1, 0, 371, 1);
  }
  model('trap_spike_floor', -123, 0, 376, 1);
  model('trap_screamer_box', -116, 0, 369, 1, Math.PI);
  model('hide_decoy_chest', -114, 0, 369, 1, Math.PI);
  model('prop_cauldron', -91, 0, 372, 1.5);
  k.light(-91, 1, 372, 0x82d350);
  k.light(-116, 1, 369, 0xad533c, { reach: 4, power: 4 });
  k.light(104, 2, 371, 0xa95d46, { reach: 5, power: 5 });
  k.light(116, 2, 371, 0x91adcf, { reach: 5, power: 5 });
  model('prop_candles', -90, 0, 371, 2);
  model('blk_stained_red', 104, 1, 371, [1, 2, 0.2]);
  model('blk_moon_window', 116, 1, 371, [1, 2, 0.2]);
  for (let i = 0; i < 4; i++)
    model('prop_pew', 104, 0, 361 + i * 2, 1, -Math.PI / 2);
  model('prop_altar', 108, 0, 365, 1.3, -Math.PI / 2);
}
export function ambientActors(world: T.Group) {
  const actors = HAUNTS.map((p, i) => {
    const actor = packActor(p.id as AssetId);
    actor.root.position.set(p.x, terrainHeight(p.x, p.z) + p.y, p.z);
    actor.root.scale.setScalar(p.scale ?? 1);
    actor.root.rotation.y = Math.PI + i * 0.35;
    world.add(actor.root);
    return { ...actor, p };
  });
  world.userData.animateAssets = (
    time: number,
    camera: T.Camera,
    reduced: boolean,
  ) => {
    for (const { root, animate, p } of actors) {
      const distance = root.position.distanceToSquared(camera.position);
      root.visible = distance < 85 ** 2;
      if (distance > 65 ** 2) continue;
      animate(reduced ? 0 : time);
      if (!reduced && ['mon_ghost', 'mon_wraith', 'mon_bat'].includes(p.id))
        root.position.y =
          terrainHeight(p.x, p.z) +
          p.y +
          Math.sin(time * (p.id === 'mon_bat' ? 2 : 1) + p.x) * 0.22;
    }
  };
}
