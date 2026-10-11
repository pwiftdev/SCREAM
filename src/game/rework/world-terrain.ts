import { forestBiome } from '../../../shared/house/forest';
import * as T from 'three';
import { H } from '../../../shared/config';
import {
  DISTRICTS,
  WORLD_PATHS,
  PATH_HALF_WIDTH,
} from '../../../shared/house/world-layout';
import {
  TERRAIN_COLS,
  TERRAIN_ROWS,
  TERRAIN_STEP,
  TERRAIN_HEIGHTS,
  terrainHeight,
} from '../../../shared/house/terrain';
import { pixelMaterial } from './pixels';
export function worldTerrain(root: T.Group) {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const terrainIndices = Array.from({ length: 5 }, () => [] as number[]);
  const tint = new T.Color();
  for (let z = 0; z < TERRAIN_ROWS; z++)
    for (let x = 0; x < TERRAIN_COLS; x++) {
      const wx = x * TERRAIN_STEP - H.WORLD_HALF_W,
        wz = z * TERRAIN_STEP + H.WORLD_MIN_Z;
      positions.push(wx, TERRAIN_HEIGHTS[z * TERRAIN_COLS + x], wz);
      const district = DISTRICTS.findIndex(
        (d) => Math.hypot(wx - d.x, wz - d.z) < 30,
      );
      tint.setHex(
        district === 4
          ? 0x71878b
          : district === 3
            ? 0xa09576
            : district === 1
              ? 0x8b9195
              : 0xa3ada0,
      );
      colors.push(tint.r, tint.g, tint.b);
      if (x < TERRAIN_COLS - 1 && z < TERRAIN_ROWS - 1) {
        const a = z * TERRAIN_COLS + x,
          c = a + TERRAIN_COLS;
        const biome =
          district >= 0
            ? 0
            : ['pine', 'autumn', 'wetland', 'blighted'].indexOf(
                forestBiome(wx, wz),
              ) + 1;
        terrainIndices[biome].push(a, c, a + 1, a + 1, c, c + 1);
      }
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  terrainIndices.forEach((part, i) => {
    geometry.addGroup(indices.length, part.length, i);
    part.forEach((n) => indices.push(n));
  });
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const materials = [
    pixelMaterial('grass_top', true),
    ...['podzol', 'leaf_litter', 'mud', 'root_dirt'].map((name) =>
      pixelMaterial(name, true, 'scream-forest'),
    ),
  ];
  materials.forEach((m) => {
    m.vertexColors = true;
  });
  const ground = new T.Mesh(geometry, materials);
  ground.name = 'rolling-terrain';
  ground.receiveShadow = true;
  root.add(ground);
  const roadPositions: number[] = [],
    roadIndices: number[] = [];
  for (const [a, b] of WORLD_PATHS) {
    const length = Math.hypot(b.x - a.x, b.z - a.z),
      steps = Math.ceil(length);
    const nx = ((b.z - a.z) / length) * PATH_HALF_WIDTH,
      nz = (-(b.x - a.x) / length) * PATH_HALF_WIDTH;
    const start = roadPositions.length / 3;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      for (const side of [-1, 1]) {
        const x = a.x + (b.x - a.x) * t + nx * side,
          z = a.z + (b.z - a.z) * t + nz * side;
        roadPositions.push(x, terrainHeight(x, z) + 0.065, z);
      }
      if (i < steps) {
        const n = start + i * 2;
        roadIndices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      }
    }
  }
  const roadGeometry = new T.BufferGeometry();
  roadGeometry.setAttribute(
    'position',
    new T.Float32BufferAttribute(roadPositions, 3),
  );
  roadGeometry.setIndex(roadIndices);
  roadGeometry.computeVertexNormals();
  const road = new T.Mesh(roadGeometry, pixelMaterial('gravel', true));
  road.name = 'hillside-paths';
  road.material.side = T.DoubleSide;
  road.receiveShadow = true;
  root.add(road);
}
