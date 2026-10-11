import * as THREE from 'three';
import { blocks, seeded } from '../../shared/maps/rotten-hollow';
import { GeometryBatch } from './geometry-batch';
export function buildArchitecture(b: GeometryBatch) {
  const random = seeded(331);
  for (const wall of blocks) {
    if (wall.kind === 'prop') continue;
    const { x, z, w, h, d } = wall,
      y = (wall.y ?? 0) + h / 2;
    if (wall.id.startsWith('house-')) {
      b.box(wall.kind === 'foundation' ? 'wood' : 'plaster', x, y, z, w, h, d);
      if (wall.kind !== 'foundation') {
        for (let n = -w / 2; n <= w / 2; n += 1.4)
          b.box('wood', x + n, y, z + d / 2 + 0.03, 0.13, h, 0.1);
        for (const elevation of [0.2, 3.1, 6.8])
          b.box('wood', x, elevation, z, w + 0.1, 0.16, d + 0.13);
      }
    } else if (wall.kind === 'foundation') b.box('wood', x, y, z, w, h, d);
    else if (wall.kind === 'caravan') {
      b.box('cream', x, y, z, w, h, d);
      b.box('rust', x, 0.5, z, w + 0.08, 0.45, d + 0.08);
      b.box('rust', x, h + 0.08, z, w + 0.2, 0.16, d + 0.2);
      for (let t = -w / 2 + 0.7; t < w / 2; t += 1.7) {
        b.box('wood', x + t, 1.85, z + d / 2 + 0.04, 1.1, 1, 0.12);
        b.box('glass', x + t, 1.85, z + d / 2 + 0.12, 0.92, 0.78, 0.04);
        b.box('iron', x + t, 1.85, z + d / 2 + 0.17, 0.04, 0.8, 0.05);
      }
      for (let t = 0.7; t < h; t += 0.15)
        b.box('iron', x, t, z + d / 2 + 0.02, w, 0.013, 0.025);
      for (const dx of [-w * 0.32, w * 0.32])
        b.add('black', new THREE.TorusGeometry(0.38, 0.12, 6, 14), [
          x + dx,
          0.42,
          z + d / 2,
        ]);
    } else if (wall.kind === 'stall') {
      b.box('wood', x, y, z, w, h, d);
      b.box(
        'black',
        x,
        1.9,
        z + d / 2 + 0.015,
        Math.max(0.5, w - 0.7),
        1.1,
        0.035,
      );
      b.box('wood', x, 1.3, z + d / 2 + 0.3, w + 0.5, 0.12, 0.75);
      for (const dx of [-w / 2, w / 2])
        b.box('rust', x + dx, 1.8, z + d / 2 + 0.5, 0.08, 3.6, 0.08);
      for (let j = 0; j < Math.ceil(w / 0.5); j++)
        b.box(
          j % 2 ? 'cream' : 'red',
          x - w / 2 + j * 0.5,
          h + 0.12,
          z + 0.2,
          0.5,
          0.065,
          d + 1.2,
          0,
          0,
        );
    } else if (wall.kind === 'hedge') {
      b.box('bark', x, h * 0.25, z, w * 0.95, h * 0.5, d * 0.85);
    } else {
      const horizontal = w > d,
        length = Math.max(w, d);
      for (let j = -0.5 * length; j < 0.5 * length; j += 0.35) {
        const px = x + (horizontal ? j : 0),
          pz = z + (horizontal ? 0 : j),
          height = h * (0.8 + random() * 0.18);
        b.box(
          'wood',
          px,
          height / 2,
          pz,
          horizontal ? 0.32 : 0.15,
          height,
          horizontal ? 0.15 : 0.32,
        );
      }
      for (const height of [0.7, 2.3])
        b.box(
          'wood',
          x,
          height,
          z,
          horizontal ? w : 0.18,
          0.16,
          horizontal ? 0.18 : d,
        );
    }
  }
  for (const x of [-15.5, -8.5])
    for (const y of [2, 5.1]) {
      b.box('black', x, y, -19.43, 1.8, 1.7, 0.1);
      b.box('wood', x, y, -19.3, 2, 0.16, 0.16);
      b.box('wood', x, y, -19.3, 0.12, 1.8, 0.16);
      b.box('wood', x, y, -19.18, 2.1, 0.15, 0.1, 0.35);
    }
  const roof = new THREE.ConeGeometry(9, 4, 4, 1);
  b.add('wood', roof, [-12, 8.7, -25], [0, Math.PI / 4, 0], [1, 1, 0.88]);
  for (const x of [-17.5, -6.5]) b.box('wood', x, 3.7, -18.8, 0.2, 7.4, 0.2);
}
