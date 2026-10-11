import { assetModel } from './asset-pack';
export function stashLoot(x: number, y: number, z: number) {
  const root = assetModel('hide_stash_chest_open');
  root.position.set(x + 0.5, y, z + 0.5);
  root.rotation.y = Math.PI;
  return root;
}
