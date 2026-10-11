import { HOUSE_MODELS, addHouseAsset, doorSpan } from '../rework/house-assets';
import { assetBatches } from '../rework/asset-batches';
import * as T from 'three';
import { houseSigns } from './signs';
import { H } from '../../../shared/config';
import { B, BLOCKS } from '../../../shared/house/blocks';
import {
  at,
  index,
  rotation,
  type HouseV1,
} from '../../../shared/house/format';
import { blockLight } from '../../../shared/house/light';
interface MeshData {
  position: number[];
  normal: number[];
  uv: number[];
  tile: number[];
  color: number[];
  indices: number[];
}
const empty = (): MeshData => ({
  position: [],
  normal: [],
  uv: [],
  tile: [],
  color: [],
  indices: [],
});
const solid = (h: HouseV1, x: number, y: number, z: number) => {
  const b = at(h, x, y, z);
  return (
    b !== B.AIR &&
    !HOUSE_MODELS[b] &&
    BLOCKS[b].shape === 'cube' &&
    b !== B.FAKE
  );
};
function quad(
  data: MeshData,
  vertices: number[][],
  normal: number[],
  id: number,
  width: number,
  height: number,
  shade: number,
  ao: number[] = [1, 1, 1, 1],
) {
  const start = data.position.length / 3;
  vertices.forEach((v, i) => {
    data.position.push(...v);
    data.normal.push(...normal);
    data.uv.push(
      ...[
        [0, 0],
        [width, 0],
        [width, height],
        [0, height],
      ][i],
    );
    data.tile.push(id % H.ATLAS_COLS, Math.floor(id / H.ATLAS_COLS));
    const light = Math.max(0.45, shade) * ao[i];
    data.color.push(light, light, light);
  });
  data.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
}
function box(
  data: MeshData,
  lo: number[],
  hi: number[],
  id: number,
  shade: number,
) {
  for (let d = 0; d < 3; d++)
    for (const sign of [-1, 1]) {
      const u = (d + 1) % 3,
        v = (d + 2) % 3,
        n = [0, 0, 0];
      n[d] = sign;
      const corners = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ].map(([a, b]) => {
        const p = [...lo];
        p[d] = sign > 0 ? hi[d] : lo[d];
        p[u] = a ? hi[u] : lo[u];
        p[v] = b ? hi[v] : lo[v];
        return p;
      });
      if (sign < 0) corners.reverse();
      quad(data, corners, n, id, hi[u] - lo[u], hi[v] - lo[v], shade);
    }
}
function geometry(data: MeshData) {
  const g = new T.BufferGeometry();
  for (const [key, size] of [
    ['position', 3],
    ['normal', 3],
    ['uv', 2],
    ['tile', 2],
    ['color', 3],
  ] as const)
    g.setAttribute(key, new T.Float32BufferAttribute(data[key], size));
  g.setIndex(data.indices);
  g.computeBoundingSphere();
  return g;
}
export function meshHouse(h: HouseV1, material: T.Material) {
  const group = new T.Group(),
    assets = assetBatches(group),
    light = blockLight(h),
    size = H.CHUNK_SIZE;
  for (let cy = 0; cy < (h.height ?? H.PLOT_H); cy += size)
    for (let cz = 0; cz < H.PLOT_D; cz += size)
      for (let cx = 0; cx < H.PLOT_W; cx += size) {
        const data = empty(),
          origin = [cx, cy, cz],
          bounds = [
            Math.min(size, H.PLOT_W - cx),
            Math.min(size, (h.height ?? H.PLOT_H) - cy),
            Math.min(size, H.PLOT_D - cz),
          ];
        for (let d = 0; d < 3; d++) {
          const u = (d + 1) % 3,
            v = (d + 2) % 3;
          for (const sign of [-1, 1])
            for (let slice = 0; slice < bounds[d]; slice++) {
              const mask = new Int32Array(bounds[u] * bounds[v]),
                shades = new Float32Array(mask.length),
                occlusion: number[][] = [];
              for (let j = 0; j < bounds[v]; j++)
                for (let i = 0; i < bounds[u]; i++) {
                  const p = [...origin];
                  p[d] += slice;
                  p[u] += i;
                  p[v] += j;
                  const id = at(h, p[0], p[1], p[2]);
                  if (!id || HOUSE_MODELS[id] || BLOCKS[id].shape !== 'cube')
                    continue;
                  const q = [...p];
                  q[d] += sign;
                  if (solid(h, q[0], q[1], q[2])) continue;
                  const l = Math.max(
                      light[index(p[0], p[1], p[2])] || 0,
                      light[index(q[0], q[1], q[2])] || 0,
                    ),
                    cell = i + j * bounds[u];
                  shades[cell] = 0.18 + (l / H.LIGHT_MAX) * 0.82;
                  const ao: number[] = [];
                  for (const [a, b] of [
                    [-1, -1],
                    [1, -1],
                    [1, 1],
                    [-1, 1],
                  ]) {
                    const sideA = [...q],
                      sideB = [...q],
                      corner = [...q];
                    sideA[u] += a;
                    sideB[v] += b;
                    corner[u] += a;
                    corner[v] += b;
                    const sa = Number(
                        solid(h, ...(sideA as [number, number, number])),
                      ),
                      sb = Number(
                        solid(h, ...(sideB as [number, number, number])),
                      ),
                      sc = Number(
                        solid(h, ...(corner as [number, number, number])),
                      );
                    ao.push(1 - (sa && sb ? 3 : sa + sb + sc) * 0.16);
                  }
                  if (sign < 0) ao.reverse();
                  occlusion[cell] = ao;
                  mask[cell] = id + l * 64;
                }
              for (let j = 0; j < bounds[v]; j++)
                for (let i = 0; i < bounds[u];) {
                  const cell = i + j * bounds[u],
                    key = mask[cell];
                  if (!key) {
                    i++;
                    continue;
                  }
                  const same = (c: number) =>
                    mask[c] === key &&
                    occlusion[c]?.every((a, k) => a === occlusion[cell][k]);
                  let w = 1;
                  while (i + w < bounds[u] && same(cell + w)) w++;
                  let height = 1;
                  outer: while (j + height < bounds[v]) {
                    for (let k = 0; k < w; k++)
                      if (!same(cell + k + height * bounds[u])) break outer;
                    height++;
                  }
                  const p = [...origin];
                  p[d] += slice + (sign > 0 ? 1 : 0);
                  p[u] += i;
                  p[v] += j;
                  const vertices = [
                    [0, 0],
                    [w, 0],
                    [w, height],
                    [0, height],
                  ].map(([a, b]) => {
                    const q = [...p];
                    q[u] += a;
                    q[v] += b;
                    return q;
                  });
                  if (sign < 0) vertices.reverse();
                  const n = [0, 0, 0];
                  n[d] = sign;
                  quad(
                    data,
                    vertices,
                    n,
                    key % 64,
                    w,
                    height,
                    shades[cell],
                    occlusion[cell],
                  );
                  for (let y = 0; y < height; y++)
                    for (let x = 0; x < w; x++)
                      mask[cell + x + y * bounds[u]] = 0;
                  i += w;
                }
            }
        }
        for (let y = cy; y < cy + bounds[1]; y++)
          for (let z = cz; z < cz + bounds[2]; z++)
            for (let x = cx; x < cx + bounds[0]; x++) {
              const id = at(h, x, y, z),
                b = BLOCKS[id];
              if (HOUSE_MODELS[id]) {
                const modelHeight = id === B.DOOR ? doorSpan(h, x, y, z) : 1;
                if (!modelHeight) continue;
                addHouseAsset(
                  assets,
                  id,
                  x,
                  y,
                  z,
                  rotation(h, index(x, y, z)),
                  modelHeight,
                );
                continue;
              }
              if (!id || b.shape === 'cube') continue;
              const shade =
                0.2 + ((light[index(x, y, z)] || 0) / H.LIGHT_MAX) * 0.8;
              if (b.shape === 'slab')
                box(
                  data,
                  [x, y, z],
                  [
                    x + 1,
                    y + (id === B.RED || id === B.BLACK ? 0.08 : 0.5),
                    z + 1,
                  ],
                  id,
                  shade,
                );
              else if (b.shape === 'stairs') {
                box(data, [x, y, z], [x + 1, y + 0.5, z + 1], id, shade);
                const r = rotation(h, index(x, y, z)),
                  lo = [x, y + 0.5, z],
                  hi = [x + 1, y + 1, z + 1];
                if (r === 0) lo[2] += 0.5;
                if (r === 1) lo[0] += 0.5;
                if (r === 2) hi[2] -= 0.5;
                if (r === 3) hi[0] -= 0.5;
                box(data, lo, hi, id, shade);
              } else if (b.shape === 'thin')
                box(
                  data,
                  [x + 0.1, y, z + 0.4],
                  [x + 0.9, y + 1, z + 0.6],
                  id,
                  shade,
                );
              else {
                const tall = b.light && id !== B.CANDY ? 0.65 : 0.35;
                box(
                  data,
                  [x + 0.28, y, z + 0.28],
                  [x + 0.72, y + tall, z + 0.72],
                  id,
                  shade,
                );
              }
            }
        if (data.position.length) {
          const mesh = new T.Mesh(geometry(data), material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          group.add(mesh);
        }
      }
  assets.finish();
  group.add(houseSigns(h));
  return group;
}
