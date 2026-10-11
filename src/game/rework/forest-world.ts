import * as T from 'three';
import {
  FOREST_INSTANCES,
  forestBiome,
  forestRandom,
  forestSpace,
} from '../../../shared/house/forest';
import { FOREST_PROPS, FOREST_CAMP } from '../../../shared/house/forest-sites';
import type { WorldKit } from '../hollow/world-kit';
import type { AssetId } from './asset-catalog';
import { forestLife } from './forest-life';
const UNDERGROWTH = {
  pine: [
    'und_fern',
    'und_fern_large',
    'und_bush',
    'und_tall_grass',
    'tre_sapling',
    'rck_pebbles',
    'und_moss_carpet',
  ],
  autumn: [
    'und_leaf_pile',
    'und_bush',
    'und_toadstools',
    'und_fern',
    'und_berry_bush',
    'tre_sapling',
  ],
  wetland: [
    'und_cattails',
    'und_tall_grass',
    'und_moss_carpet',
    'und_fern_large',
    'und_bramble',
  ],
  blighted: [
    'und_bramble',
    'und_ghost_lilies',
    'und_toadstools',
    'und_fern',
    'und_leaf_pile',
  ],
} as const;
export function buildForest(k: WorldKit, world: T.Group) {
  for (const p of FOREST_INSTANCES)
    k.model(p.id as AssetId, p.x, 0, p.z, p.scale, p.yaw);
  for (const p of FOREST_PROPS)
    k.model(p.id as AssetId, p.x, p.y, p.z, p.scale, p.yaw);
  for (let i = 0; i < 6500; i++) {
    const x = -198 + forestRandom(i * 11 + 30000) * 396,
      z = -82 + forestRandom(i * 11 + 30001) * 575;
    if (!forestSpace(x, z, 2.4)) continue;
    const biome = forestBiome(x, z),
      choices = UNDERGROWTH[biome];
    const id =
      choices[Math.floor(forestRandom(i * 11 + 30002) * choices.length)];
    const scale = 0.7 + forestRandom(i * 11 + 30003) * 0.65;
    k.model(id, x, 0, z, scale, forestRandom(i * 11 + 30004) * Math.PI * 2);
  }
  k.model('und_vines', -60, 3.5, 274, 1, 0.2);
  k.model('und_ivy_hang', -169, 1.6, 107, 1, 0.3);
  for (const [id, x, z] of [
    ['prop_dead_tree', -62, 276],
    ['nat_twisted_tree', -31, 276],
    ['nat_dead_sapling', 51, 288],
  ] as const)
    k.model(id, x, 0, z, 1, 1.2);
  k.light(FOREST_CAMP.x, 0.6, FOREST_CAMP.z, 0xffa65a, {
    reach: 7,
    power: 6,
    damaged: true,
  });
  k.light(-53, 2.4, 272, 0xffbc73, { reach: 7, power: 6 });
  k.light(-165, 2.4, 104, 0xffbc73, { reach: 7, power: 6 });
  k.light(-20, 2.3, 268, 0x91adcf, { reach: 4, power: 2 });
  forestLife(world);
}
