import { at, type HouseV1 } from '../../../shared/house/format';
import { B } from '../../../shared/house/blocks';
import { ASSET_CATALOG, type AssetId } from './asset-catalog';
import { assetBatches } from './asset-batches';
export const HOUSE_MODELS: Partial<Record<number, AssetId>> = {
  [B.BARS]: 'blk_iron',
  [B.GLASS]: 'blk_window_lit',
  [B.WEB]: 'blk_cobweb',
  [B.DOOR]: 'blk_door',
  [B.TRAP]: 'blk_trapdoor',
  [B.FENCE]: 'prop_fence_wood',
  [B.CANDLE]: 'prop_candles',
  [B.LANTERN]: 'item_lantern',
  [B.JACK]: 'blk_jack_o_lantern',
  [B.RED_CANDLE]: 'prop_candles',
  [B.BULB]: 'blk_moon_window',
  [B.COFFIN]: 'prop_coffin',
  [B.BONES]: 'hide_bone_pile',
  [B.PUMPKIN]: 'blk_pumpkin',
  [B.GRAVE]: 'prop_headstone',
  [B.CANDY]: 'hide_stash_chest',
  [B.BATTERY]: 'item_flashlight',
  [B.SPIKES]: 'trap_spike_floor',
  [B.SCREAMER]: 'trap_screamer_box',
  [B.DECOY]: 'hide_decoy_chest',
  [B.LEAVES]: 'blk_dead_leaves',
};
export function addHouseAsset(
  batch: ReturnType<typeof assetBatches>,
  block: number,
  x: number,
  y: number,
  z: number,
  rotation: number,
  height = 1,
) {
  const id = HOUSE_MODELS[block];
  if (!id) return;
  const size = ASSET_CATALOG[id].size;
  const scale =
    block === B.DOOR
      ? [1, height / 2, 1]
      : Math.min(1, 1 / size[0], 1 / size[1], 1 / size[2]);
  batch.add(id, x + 0.5, y, z + 0.5, scale, Math.PI + (rotation * Math.PI) / 2);
}

export function doorSpan(house: HouseV1, x: number, y: number, z: number) {
  let below = 0;
  for (let row = y - 1; row >= 0 && at(house, x, row, z) === B.DOOR; row--)
    below++;
  if (below % 2) return 0;
  return at(house, x, y + 1, z) === B.DOOR ? 2 : 1;
}
