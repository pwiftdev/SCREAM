import { WEAPON_SITES } from '../../../shared/house/combat';
import { buildForest } from '../rework/forest-world';
import { terrainHeight, plotElevation } from '../../../shared/house/terrain';
import { worldTerrain } from '../rework/world-terrain';
import { expandWorld } from '../rework/world-expansion';
import { dressWorld, ambientActors } from '../rework/world-assets';
import * as T from 'three';
import { SEARCH_SITES } from '../../../shared/house/rework';
import { H } from '../../../shared/config';
import {
  LANDMARKS,
  WORLD_PATHS,
  WORLD_BOXES,
  plotLocation,
  isFinalNight,
} from '../../../shared/house/neighborhood';
import { seededHouse } from '../../../shared/house/samples';
import { plotTier, PLOT_TIERS } from '../../../shared/house/plots';
import { meshHouse } from './mesher';
import { HollowRenderer } from './renderer';
import { worldKit } from './world-kit';
import { buildLandmarks } from './landmarks';
export function streetScene(r: HollowRenderer, street = 0) {
  r.clear();
  r.setMood('world', isFinalNight());
  const k = worldKit(r.world, terrainHeight),
    { pumpkin, lamp, sign } = k;
  worldTerrain(r.world);
  for (const [a, b] of WORLD_PATHS) {
    const distance = Math.hypot(b.x - a.x, b.z - a.z),
      angle = Math.atan2(b.x - a.x, b.z - a.z);
    for (let n = 10; n < distance; n += 20) {
      const t = n / distance,
        x = a.x + (b.x - a.x) * t + Math.cos(angle) * 3.6,
        z = a.z + (b.z - a.z) * t - Math.sin(angle) * 3.6;
      lamp(x, z, 3.5);
      if (n % 40 === 10) pumpkin(x + 0.7, z, 1);
    }
  }
  for (const p of WEAPON_SITES) {
    k.model('item_shovel', p.x, 0.12, p.z, 1, 0.4);
    k.sign(p.x + 1, p.z, 'GRAVE SHOVEL · E', 3, 0);
  }
  const plots: T.Group[] = [];
  for (let n = 0; n < H.PLOTS_PER_STREET; n++) {
    const p = plotLocation(n),
      g = new T.Group(),
      tier = PLOT_TIERS[plotTier(n)];
    g.rotation.y = p.yaw;
    g.position.set(p.origin.x, plotElevation(n), p.origin.z);
    g.name = `plot-${n}`;
    if (street === 0 && n % 8 < 3)
      g.add(
        meshHouse(
          seededHouse(Math.floor(n / 8) * 3 + (n % 8)),
          r.atlas.material,
        ),
      );
    else {
      const ground = new T.Mesh(
        new T.BoxGeometry(tier.x1 - tier.x0 + 2, 0.4, tier.z1),
        new T.MeshStandardMaterial({ color: 0x39372b, roughness: 1 }),
      );
      ground.position.set(11.5, 0.2, 12);
      ground.receiveShadow = true;
      g.add(ground);
      sign(
        p.approach.x,
        p.approach.z,
        `Plot ${n + 1} • ${plotTier(n) === 0 ? 'free' : tier.name}`,
        4,
        p.yaw + Math.PI,
      );
    }
    r.world.add(g);
    plots.push(g);
    const dx = Math.cos(p.yaw),
      dz = -Math.sin(p.yaw);
    for (const side of [-1, 1]) {
      const x = p.door.x + dx * side * 9,
        z = p.door.z + dz * side * 9;
      lamp(x, z, 3.5);
      pumpkin(x + dx, z + dz, 1.2);
      for (let j = 0; j < 5; j++)
        k.model(
          'prop_fence_iron',
          p.door.x + dx * side * (4 + j * 1.1),
          0,
          p.door.z + dz * side * (4 + j * 1.1),
          1,
          p.yaw,
        );
    }
  }
  WORLD_BOXES.forEach((b, i) => {
    if (b.kind === 'grave') {
      k.model(
        i % 3 === 0
          ? 'prop_stone_cross'
          : i % 3 === 1
            ? 'prop_headstone'
            : 'prop_headstone_mossy',
        b.x,
        0,
        b.z,
        1,
        Math.PI,
      );
      k.model('prop_grave_mound', b.x, 0, b.z - 1, 1);
    }
  });
  for (let i = 0; i < 650; i++) {
    const x = -195 + ((i * 73) % 390),
      z = -80 + ((i * 97) % 575);
    k.model('blk_dead_leaves', x, 0, z, 0.45 + (i % 3) * 0.1, i);
  }
  buildLandmarks(k);
  dressWorld(k);
  ambientActors(r.world);
  expandWorld(k, r.world);
  buildForest(k, r.world);
  for (const l of LANDMARKS.slice(1, 6))
    sign(l.x - 12, l.z - 16, l.name, 7, 0.05);
  for (const site of SEARCH_SITES) {
    const id =
      site.id === 'harvest'
        ? 'hide_bone_pile'
        : site.id === 'carnival'
          ? 'prop_ticket_booth'
          : site.id === 'chapel'
            ? 'hide_stash_chest'
            : site.id === 'village'
              ? 'hide_decoy_chest'
              : 'prop_crypt_slab';
    k.model(id, site.x, 0, site.z, 1, Math.PI);
    lamp(site.x + 1.5, site.z, 2);
    pumpkin(site.x - 1.4, site.z, 0.8);
  }
  k.finish();
  const moon = new T.Mesh(
    new T.BoxGeometry(16, 16, 1),
    new T.MeshBasicMaterial({
      color: isFinalNight() ? 0xf17b58 : 0xe4dcbd,
      fog: false,
    }),
  );
  moon.position.set(-85, 110, 280);
  r.world.add(moon);
  return plots;
}
