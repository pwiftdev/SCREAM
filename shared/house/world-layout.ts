import { H } from '../config';
export interface StreetPosition {
  x: number;
  z: number;
}
export interface Landmark extends StreetPosition {
  name: string;
  description: string;
}
export const DISTRICTS: Landmark[] = [
  {
    x: 0,
    z: 25,
    name: 'Wickerman village',
    description: 'Every window is watching.',
  },
  {
    x: -100,
    z: 175,
    name: 'Old Mercy cemetery',
    description: 'The dead leave their doors open.',
  },
  {
    x: 100,
    z: 175,
    name: 'The deadlight carnival',
    description: 'One last ride. One last scream.',
  },
  {
    x: -100,
    z: 365,
    name: 'The harvest fields',
    description: 'Something moves between the rows.',
  },
  {
    x: 100,
    z: 365,
    name: 'The drowned parish',
    description: 'The bell rings for you.',
  },
];
export const LANDMARKS: Landmark[] = [
  {
    x: 0,
    z: -65,
    name: 'The lantern gate',
    description: 'Hide your candy. Fear your neighbors.',
  },
  ...DISTRICTS,
  {
    x: 0,
    z: 470,
    name: 'The last light',
    description: 'Do not follow the voices.',
  },
];
function makePlotLocation(slot: number) {
  const district = DISTRICTS[Math.floor((slot % 40) / 8)],
    angle = ((slot % 8) * Math.PI) / 4 + Math.PI / 8;
  const dx = Math.sin(angle),
    dz = Math.cos(angle),
    door = { x: district.x + dx * 49, z: district.z + dz * 49 };
  const origin = {
    x: door.x - Math.cos(angle) * 12.5 - dx * 1.5,
    z: door.z + dx * 12.5 - Math.cos(angle) * 1.5,
  };
  return {
    side: dx > 0 ? 1 : -1,
    x: door.x,
    z: door.z,
    door,
    origin,
    yaw: angle,
    approach: { x: door.x - dx * 3, z: door.z - dz * 3 },
    center: { x: door.x + dx * 11, z: door.z + dz * 11 },
    district: district.name,
  };
}
export const PLOTS = Array.from({ length: H.PLOTS_PER_STREET }, (_, i) =>
  makePlotLocation(i),
);
export const plotLocation = (slot: number) => PLOTS[slot % H.PLOTS_PER_STREET];
export const PATH_HALF_WIDTH = 1.8;
const CONNECTIONS = [
  [
    { x: 0, z: 260 },
    { x: -20, z: 261 },
  ],
  [
    { x: -65, z: 260 },
    { x: -55, z: 270 },
  ],
  [
    { x: -124, z: 95 },
    { x: -165, z: 100 },
  ],
  [
    { x: 0, z: 285 },
    { x: 45, z: 275 },
  ],
  [
    { x: 135, z: 440 },
    { x: 172, z: 432 },
  ],
  [
    { x: -145, z: 245 },
    { x: -148, z: 235 },
  ],
  [
    { x: -148, z: 235 },
    { x: -175, z: 237 },
  ],
  [
    { x: 100, z: 260 },
    { x: 158, z: 270 },
  ],
  [
    { x: -100, z: 260 },
    { x: -154, z: 278 },
  ],
  [LANDMARKS[0], DISTRICTS[0]],
  [DISTRICTS[0], DISTRICTS[1]],
  [DISTRICTS[0], DISTRICTS[2]],
  [DISTRICTS[1], DISTRICTS[2]],
  [DISTRICTS[1], DISTRICTS[3]],
  [DISTRICTS[2], DISTRICTS[4]],
  [DISTRICTS[3], DISTRICTS[4]],
  [DISTRICTS[3], LANDMARKS[6]],
  [DISTRICTS[4], LANDMARKS[6]],
  ...Array.from({ length: 40 }, (_, i) => [
    DISTRICTS[Math.floor(i / 8)],
    plotLocation(i).approach,
  ]),
];
export const WORLD_PATHS = CONNECTIONS.flatMap(([a, b], route) => {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  if (length < 100) return [[a, b]];
  const steps = Math.ceil(length / 24),
    bend = route % 2 ? 9 : -9;
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps,
      offset = Math.sin(t * Math.PI) * bend;
    return {
      x: a.x + (b.x - a.x) * t + ((b.z - a.z) / length) * offset,
      z: a.z + (b.z - a.z) * t - ((b.x - a.x) / length) * offset,
    };
  });
  return points.slice(1).map((p, i) => [points[i], p]);
});
export function pathDistance(p: StreetPosition) {
  return Math.min(
    ...WORLD_PATHS.map(([a, b]) => {
      const dx = b.x - a.x,
        dz = b.z - a.z,
        t = Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz),
          ),
        );
      return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
    }),
  );
}
