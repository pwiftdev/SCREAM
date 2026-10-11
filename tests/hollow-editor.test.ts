import { it, expect } from 'vitest';
import { HouseEditor } from '../shared/house/editor';
import { sampleHouse } from '../shared/house/samples';
import {
  at,
  emptyHouse,
  put,
  reachable,
  rotation,
  index,
  decodeHouse,
  encodeHouse,
} from '../shared/house/format';
import { B } from '../shared/house/blocks';
it('line, fill, rotation and undo/redo preserve the exact draft', () => {
  const e = new HouseEditor(sampleHouse()),
    original = encodeHouse(e.house);
  e.paint({ x: 5, y: 6, z: 5 }, { x: 8, y: 6, z: 5 }, B.BRICK, 2, 'line');
  expect(at(e.house, 7, 6, 5)).toBe(B.BRICK);
  expect(rotation(e.house, index(7, 6, 5))).toBe(2);
  e.undo();
  expect(encodeHouse(e.house)).toEqual(original);
  e.redo();
  expect(at(e.house, 7, 6, 5)).toBe(B.BRICK);
  e.paint({ x: 5, y: 6, z: 5 }, { x: 8, y: 7, z: 8 }, B.MOSS, 0, 'fill');
  expect(at(e.house, 7, 7, 7)).toBe(B.MOSS);
});
it('moving candy never duplicates it; unfinished drafts can save', () => {
  const e = new HouseEditor(sampleHouse());
  e.paint({ x: 8, y: 1, z: 8 }, { x: 8, y: 1, z: 8 }, B.CANDY, 0, 'block');
  expect(e.house.blocks.filter((b) => b === B.CANDY).length).toBe(1);
  e.paint({ x: 8, y: 1, z: 8 }, { x: 8, y: 1, z: 8 }, B.AIR, 0, 'block');
  expect(() => decodeHouse(encodeHouse(e.house), true)).not.toThrow();
  expect(() => decodeHouse(encodeHouse(e.house))).toThrow('candy');
});

it('checks upstairs candy routes through a ladder instead of only the ground floor', () => {
  const h = emptyHouse();
  for (let z = 1; z < 8; z++)
    for (let x = 11; x < 14; x++) put(h, x, 0, z, B.PLANK);
  for (let y = 1; y <= 5; y++) put(h, 12, y, 5, B.LADDER);
  put(h, 12, 4, 6, B.PLANK);
  put(h, 12, 5, 6, B.CANDY);
  h.candy = { x: 12, y: 5, z: 6 };
  expect(reachable(h)).toBe(true);
  for (let y = 1; y <= 5; y++) put(h, 12, y, 5, B.AIR);
  expect(reachable(h)).toBe(false);
});
