import { H } from '../../config';
import { B } from '../blocks';
import { emptyHouse, put, type HouseV1, type Prop } from '../format';
export function room(
  h: HouseV1,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  wall: number,
) {
  for (let x = x0; x <= x1; x++)
    for (let z = z0; z <= z1; z++) {
      put(h, x, 0, z, B.PLANK);
      put(h, x, 5, z, B.DARK);
      if (x === x0 || x === x1 || z === z0 || z === z1)
        for (let y = 1; y < 5; y++) put(h, x, y, z, wall);
    }
}
export function prop(
  type: Prop['type'],
  x: number,
  z: number,
  overrides: Partial<Prop> = {},
): Prop {
  return {
    id: `${type}-${x}-${z}`,
    type,
    pos: { x, y: 1, z },
    target: { x, y: 1, z },
    trigger: 'proximity',
    radius: H.PROP_RADIUS,
    delay: 0.4,
    duration: 5,
    cooldown: 8,
    once: true,
    sound: 'whisper',
    ...overrides,
  };
}
export const SAMPLE_TITLES = [
  "Nana's last Halloween",
  'The listening house',
  'Something in the walls',
];
export function sampleHouse(which = 0): HouseV1 {
  const h = emptyHouse(SAMPLE_TITLES[which % 3]);
  room(h, 3, 1, 20, 22, which === 1 ? B.MOSS : B.PLANK);
  for (let y = 1; y < 4; y++) {
    put(h, 12, y, 1, B.AIR);
    put(h, 13, y, 1, B.AIR);
  }
  for (let z = 6; z < 20; z++)
    for (let y = 1; y < 5; y++)
      if (z !== 10 && z !== 17) put(h, 9, y, z, B.DARK);
  for (let x = 10; x < 20; x++)
    for (let y = 1; y < 5; y++)
      if (x !== 12 && x !== 13) put(h, x, y, 12, B.BRICK);
  for (let z = 3; z < 21; z++) {
    put(h, 12, 1, z, B.RED);
    put(h, 13, 1, z, B.RED);
  }
  for (const [x, z] of [
    [5, 4],
    [18, 4],
    [5, 20],
    [18, 20],
    [10, 14],
  ])
    put(h, x, 2, z, B.LANTERN);
  for (const [x, z] of [
    [4, 8],
    [4, 9],
    [4, 10],
    [19, 8],
    [19, 9],
  ]) {
    put(h, x, 1, z, B.BOOKS);
    put(h, x, 2, z, B.BOOKS);
  }
  for (const [x, z] of [
    [6, 16],
    [7, 16],
    [18, 16],
    [18, 17],
  ])
    put(h, x, 1, z, B.COFFIN);
  put(h, 7, 1, 5, B.JACK);
  put(h, 17, 1, 19, B.BATTERY);
  put(h, 19, 2, 11, B.PORTRAIT);
  put(h, h.candy.x, h.candy.y, h.candy.z, B.CANDY);
  h.signs = [
    {
      pos: { x: 12, y: 2, z: 3 },
      text:
        which === 0
          ? 'take one. she is counting.'
          : which === 1
            ? 'it hears you breathing.'
            : 'do not trust the walls.',
    },
  ];
  h.props = [
    prop('whisper', 12, 6, { sound: 'knock' }),
    prop('blackout', 12, 11, { duration: 4 }),
    prop('lurker', 17, 14, { radius: 2 }),
    prop('slammer', 12, 8, {
      target: { x: 15, y: 1, z: 7 },
      delay: 1,
      duration: 3,
    }),
    prop('trapdoor', 6, 12, { target: { x: 6, y: 0, z: 12 }, radius: 1.5 }),
    prop('follower', 5, 18, {
      target: { x: 12, y: 1, z: 16 },
      trigger: 'timer',
      delay: which === 2 ? 22 : 45,
      duration: 18,
    }),
  ];
  put(h, 6, 0, 12, B.TRAP);
  put(h, 15, 1, 7, B.DOOR);
  put(h, 15, 2, 7, B.DOOR);
  if (which === 1) for (let z = 14; z < 18; z++) put(h, 11, 1, z, B.WEB);
  if (which === 2) {
    for (let y = 1; y < 4; y++) put(h, 9, y, 17, B.FAKE);
    for (let z = 4; z < 21; z += 3) put(h, 18, 3, z, B.RED_CANDLE);
  }
  return h;
}
export const samples = Array.from({ length: 3 }, (_, i) => sampleHouse(i));

const SEEDED_TITLES = [
  ...SAMPLE_TITLES,
  'The candle keeper',
  'No one in room thirteen',
  'The velvet wake',
  'A knock from below',
  'Orchard widow',
  'The midnight library',
  'House of borrowed faces',
  'The unlit staircase',
  'The little funeral',
  'Turn back at the clock',
  'A bowl for the missing',
  'The last invitation',
];
export function seededHouse(which: number) {
  const h = sampleHouse(which % 3);
  h.title = SEEDED_TITLES[which % SEEDED_TITLES.length];
  for (let x = 3; x <= 20; x++) {
    const roof = 6 + Math.floor((8 - Math.abs(x - 11.5)) * 0.45);
    for (let z = 0; z <= 23; z++)
      put(h, x, Math.max(6, roof), z, which % 2 ? B.DARK : B.CRACK);
    for (let y = 5; y < roof; y++) {
      put(h, x, y, 1, which % 2 ? B.PLANK : B.MOSS);
      put(h, x, y, 22, which % 2 ? B.PLANK : B.MOSS);
    }
  }
  if (which % 3 === 1) {
    for (let x = 4; x < 9; x++)
      for (let z = 16; z < 21; z++)
        for (let y = 6; y < 12; y++)
          if (x === 4 || x === 8 || z === 16 || z === 20 || y === 11)
            put(h, x, y, z, y === 11 ? B.DARK : B.BRICK);
    put(h, 6, 8, 16, B.GLASS);
    put(h, 6, 9, 16, B.GLASS);
  }
  if (which % 3 === 2) {
    for (let y = 5; y < 13; y++) {
      put(h, 18, y, 17, B.BRICK);
      put(h, 19, y, 17, B.CRACK);
    }
    for (let x = 3; x < 21; x++)
      for (let z = 0; z < 4; z++) put(h, x, 4, z, B.PLANK);
    for (const x of [4, 19])
      for (let y = 1; y < 5; y++) put(h, x, y, 0, B.DARK);
  }
  for (const x of [6, 17]) {
    put(h, x, 2, 1, B.GLASS);
    put(h, x, 3, 1, B.GLASS);
  }
  if (which >= 3) {
    for (let z = 4; z < 21; z += 4) {
      put(h, 4, 1, z, which % 2 ? B.GRAVE : B.PUMPKIN);
      put(h, 18, 3, z, which % 3 ? B.RED_CANDLE : B.CANDLE);
    }
    h.props[0].sound = which % 2 ? 'whisper' : 'knock';
    h.props[2].pos.x = 17 - (which % 2);
    h.signs[0].text = [
      'the walls know.',
      'one sweet for one secret.',
      'please shut the door.',
    ][which % 3];
  }
  return h;
}
