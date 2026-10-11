import { forestWind } from './forest-wind';
import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assetModel } from './asset-pack';
import { ASSET_CATALOG, type AssetId } from './asset-catalog';
const cache = new Map<
  AssetId,
  { geometry: T.BufferGeometry; material: T.Material }[]
>();
function parts(id: AssetId) {
  const cached = cache.get(id);
  if (cached) return cached;
  const model = assetModel(id);
  model.updateMatrixWorld(true);
  const groups = new Map<T.Material, T.BufferGeometry[]>();
  model.traverse((o) => {
    if (!(o instanceof T.Mesh)) return;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    const ranges = Array.isArray(o.material)
      ? o.geometry.groups
      : [{ start: 0, count: o.geometry.index!.count, materialIndex: 0 }];
    for (const range of ranges) {
      const g = o.geometry.clone();
      g.setIndex(
        Array.from(
          o.geometry.index!.array.slice(range.start, range.start + range.count),
        ),
      );
      g.clearGroups();
      g.applyMatrix4(o.matrixWorld);
      const mat = materials[range.materialIndex ?? 0];
      if (!groups.has(mat)) groups.set(mat, []);
      groups.get(mat)!.push(g);
    }
  });
  const result = [...groups].map(([material, geometries]) => {
    const geometry = mergeGeometries(geometries)!;
    geometry.userData.assetPack = true;
    geometries.forEach((g) => g.dispose());
    return { geometry, material };
  });
  cache.set(id, result);
  return result;
}
export function assetBatches(root: T.Group) {
  const wind = forestWind(root);
  const batches = new Map<string, { id: AssetId; matrices: T.Matrix4[] }>();
  return {
    add(
      id: AssetId,
      x: number,
      y: number,
      z: number,
      scale: number | readonly number[] = 1,
      yaw = 0,
    ) {
      const key = `${id}:${Math.floor(x / 32)}:${Math.floor(z / 32)}`;
      if (!batches.has(key)) batches.set(key, { id, matrices: [] });
      const size =
        typeof scale === 'number'
          ? new T.Vector3(scale, scale, scale)
          : new T.Vector3(scale[0], scale[1], scale[2]);
      batches
        .get(key)!
        .matrices.push(
          new T.Matrix4().compose(
            new T.Vector3(x, y, z),
            new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw),
            size,
          ),
        );
    },
    finish() {
      for (const { id, matrices } of batches.values()) {
        for (const { geometry, material } of parts(id)) {
          const mesh = new T.InstancedMesh(geometry, material, matrices.length);
          matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
          if (ASSET_CATALOG[id].pack === 'scream-forest') {
            if (/^(tre_|und_)/.test(id) && material.alphaTest > 0) {
              const animated = wind(material);
              mesh.material = animated.material;
              mesh.customDepthMaterial = animated.depth;
            }
            if (/^(und_|blk_|rck_pebbles)/.test(id)) {
              mesh.userData.drawDistance = 55;
              mesh.userData.forestDetail = true;
            }
          }
          mesh.name = id;
          mesh.userData.assetBatch = true;
          mesh.castShadow = !mesh.userData.forestDetail;
          mesh.receiveShadow = true;
          mesh.computeBoundingSphere();
          root.add(mesh);
        }
      }
      batches.clear();
    },
  };
}
