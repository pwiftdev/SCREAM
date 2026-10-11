import { H } from '../config';
import { BLOCKS } from './blocks';
import { index, type HouseV1 } from './format';
export function blockLight(h: HouseV1) {
  const light = new Uint8Array(h.blocks.length),
    queue: number[] = [];
  for (let i = 0; i < h.blocks.length; i++)
    if (BLOCKS[h.blocks[i]].light) {
      light[i] = BLOCKS[h.blocks[i]].light;
      queue.push(i);
    }
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k],
      x = i % H.PLOT_W,
      z = Math.floor(i / H.PLOT_W) % H.PLOT_D,
      y = Math.floor(i / (H.PLOT_W * H.PLOT_D)),
      n = light[i] - 1;
    if (n <= 0) continue;
    for (const [dx, dy, dz] of [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        nz = z + dz;
      if (
        nx < 0 ||
        nx >= H.PLOT_W ||
        ny < 0 ||
        ny >= (h.height ?? H.PLOT_H) ||
        nz < 0 ||
        nz >= H.PLOT_D
      )
        continue;
      const j = index(nx, ny, nz);
      if (light[j] >= n || BLOCKS[h.blocks[j]].solid) continue;
      light[j] = n;
      queue.push(j);
    }
  }
  return light;
}
