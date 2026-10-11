import * as T from 'three';
import { paperMapImage } from './paper-map';
import { ASSET_CATALOG, type AssetId } from './asset-catalog';
const icons = new Map<AssetId, string>();
export function assetIcon(id: AssetId) {
  return id === 'item_map' ? paperMapImage() : (icons.get(id) ?? '');
}
export function prepareAssetIcons(assetModel: (id: AssetId) => T.Group) {
  if (icons.size === Object.keys(ASSET_CATALOG).length) return;
  const gl = new T.WebGLRenderer({ alpha: true, antialias: false });
  gl.setSize(96, 96);
  gl.outputColorSpace = T.SRGBColorSpace;
  gl.toneMapping = T.ACESFilmicToneMapping;
  gl.toneMappingExposure = 1.5;
  const scene = new T.Scene(),
    camera = new T.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  const key = new T.DirectionalLight(0xffe2bc, 2);
  key.position.set(-3, 5, 4);
  scene.add(new T.AmbientLight(0xd3ddff, 2), key);
  try {
    for (const id of Object.keys(ASSET_CATALOG) as AssetId[]) {
      const model = assetModel(id);
      const bounds = new T.Box3().setFromObject(model),
        center = bounds.getCenter(new T.Vector3());
      const radius = bounds.getSize(new T.Vector3()).length() * 0.56;
      camera.left = camera.bottom = -radius;
      camera.right = camera.top = radius;
      camera.position
        .copy(center)
        .add(new T.Vector3(3, 2, 4).normalize().multiplyScalar(10));
      camera.lookAt(center);
      camera.updateProjectionMatrix();
      scene.add(model);
      gl.render(scene, camera);
      icons.set(id, gl.domElement.toDataURL('image/png'));
      scene.remove(model);
    }
  } finally {
    gl.dispose();
    gl.forceContextLoss();
  }
}
export const TEXTURE_ICONS: Record<string, AssetId> = {
  plank: 'blk_plank_oak',
  darkplank: 'blk_plank_dark',
  stone: 'blk_stone',
  mossy: 'blk_stone_mossy',
  window: 'blk_window_lit',
  door: 'blk_door',
  spike: 'trap_spike_floor',
  trapdoor: 'blk_trapdoor',
  screamer_face: 'trap_screamer_box',
  web: 'blk_cobweb',
  chest_open: 'hide_stash_chest',
  chest_front: 'hide_decoy_chest',
  shelf_side: 'blk_bookshelf',
  bone: 'hide_bone_pile',
  pumpkin_face: 'blk_jack_o_lantern',
  lantern: 'item_lantern',
  roof: 'blk_roof',
  leaves: 'blk_dead_leaves',
};
export const ITEM_ICONS: Record<string, AssetId> = {
  crowbar: 'item_crowbar',
  shovel: 'item_shovel',
  lantern: 'item_lantern',
  key: 'item_lockpick',
  firecracker: 'item_firecracker',
  smoke: 'item_smoke_bomb',
  map: 'item_map',
  candy: 'item_wrapped_candy',
  bag: 'item_candy_pail',
  house: 'str_starter_house',
  skull: 'mon_skeleton',
};
