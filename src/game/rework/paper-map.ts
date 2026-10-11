import { H } from '../../../shared/config';
import {
  FOREST_INSTANCES,
  forestBiome,
  forestRandom,
} from '../../../shared/house/forest';
import { terrainHeight } from '../../../shared/house/terrain';
import { PLOTS, WORLD_PATHS } from '../../../shared/house/world-layout';
import * as T from 'three';
export const MAP_BOUNDS = {
  x: -H.WORLD_HALF_W - 16,
  z: H.WORLD_MIN_Z - 16,
  width: H.WORLD_HALF_W * 2 + 32,
  height: H.WORLD_MAX_Z - H.WORLD_MIN_Z + 32,
};
const PALETTE = {
  pine: ['#586249', '#626b4d', '#717954'],
  autumn: ['#82754b', '#958456', '#a4905b'],
  wetland: ['#536762', '#627970', '#718578'],
  blighted: ['#686556', '#77725e', '#88806a'],
};
let paper: HTMLCanvasElement | undefined;
let image: string | undefined;
export function paperMapCanvas() {
  if (paper) return paper;
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 256;
  const c = canvas.getContext('2d')!;
  const pixel = (x: number, z: number) => [
    Math.round(((x - MAP_BOUNDS.x) / MAP_BOUNDS.width) * canvas.width),
    Math.round(((z - MAP_BOUNDS.z) / MAP_BOUNDS.height) * canvas.height),
  ];
  for (let py = 0; py < canvas.height; py++) {
    for (let px = 0; px < canvas.width; px++) {
      const x = MAP_BOUNDS.x + (px / canvas.width) * MAP_BOUNDS.width,
        z = MAP_BOUNDS.z + (py / canvas.height) * MAP_BOUNDS.height,
        noise = forestRandom(px + py * canvas.width);
      const edge = Math.min(
        x + H.WORLD_HALF_W,
        H.WORLD_HALF_W - x,
        z - H.WORLD_MIN_Z,
        H.WORLD_MAX_Z - z,
      );
      if (edge < 2 + noise * 6) {
        c.fillStyle =
          noise > 0.8 ? '#bd9d65' : noise > 0.3 ? '#d2b77c' : '#cbb076';
      } else {
        const slope = terrainHeight(x - 3, z - 3) - terrainHeight(x + 3, z + 3);
        const shade = Math.max(
          0,
          Math.min(2, Math.floor(1 + slope * 0.5 + noise * 0.7)),
        );
        c.fillStyle = PALETTE[forestBiome(x, z)][shade];
      }
      c.fillRect(px, py, 1, 1);
    }
  }
  for (const t of FOREST_INSTANCES) {
    const [x, y] = pixel(t.x, t.z);
    c.fillStyle = forestBiome(t.x, t.z) === 'autumn' ? '#685430' : '#374935';
    c.fillRect(x, y, 2, 2);
    c.fillStyle = '#9a95604d';
    c.fillRect(x, y, 1, 1);
  }
  for (const [a, b] of WORLD_PATHS) {
    const [ax, ay] = pixel(a.x, a.z),
      [bx, by] = pixel(b.x, b.z);
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i <= steps; i++) {
      const t = steps ? i / steps : 0;
      const x = Math.round(ax + (bx - ax) * t),
        y = Math.round(ay + (by - ay) * t);
      c.fillStyle = '#786340';
      c.fillRect(x - 1, y - 1, 3, 3);
      c.fillStyle = '#c2aa73';
      c.fillRect(x, y, 1, 1);
    }
  }
  for (const p of PLOTS) {
    const [x, y] = pixel(p.center.x, p.center.z);
    c.fillStyle = '#594c36';
    c.fillRect(x - 3, y - 3, 7, 7);
    c.fillStyle = '#ac9565';
    c.fillRect(x - 2, y - 2, 5, 5);
  }
  c.fillStyle = '#f4daa318';
  c.fillRect(95, 0, 2, 256);
  c.fillRect(0, 127, 192, 2);
  paper = canvas;
  return canvas;
}
export function paperMapImage() {
  return (image ??= paperMapCanvas().toDataURL('image/png'));
}
export function addPaperMapSurface(model: T.Group) {
  const texture = new T.CanvasTexture(paperMapCanvas());
  texture.colorSpace = T.SRGBColorSpace;
  texture.magFilter = texture.minFilter = T.NearestFilter;
  texture.generateMipmaps = false;
  const face = new T.Mesh(
    new T.PlaneGeometry(0.295, 0.215),
    new T.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.006;
  model.add(face);
}
