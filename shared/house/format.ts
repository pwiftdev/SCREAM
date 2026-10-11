import { NIGHT } from './rework';
import { H } from '../config';
import { B, BLOCKS } from './blocks';
export interface Vec3i {
  x: number;
  y: number;
  z: number;
}
export const PROP_TYPES = [
  'lurker',
  'trapdoor',
  'slammer',
  'blackout',
  'whisper',
  'follower',
] as const;
export const TRIGGERS = [
  'tripwire',
  'plate',
  'look',
  'proximity',
  'timer',
] as const;
export interface Prop {
  id: string;
  type: (typeof PROP_TYPES)[number];
  pos: Vec3i;
  target: Vec3i;
  trigger: (typeof TRIGGERS)[number];
  radius: number;
  delay: number;
  duration: number;
  cooldown: number;
  once: boolean;
  sound: 'whisper' | 'steps' | 'scream' | 'knock';
}
export interface HouseV1 {
  v: 1;
  height?: number;
  blocks: Uint8Array;
  rot: Uint8Array;
  props: Prop[];
  spawn: Vec3i;
  candy: Vec3i;
  title: string;
  signs: { pos: Vec3i; text: string }[];
}
export interface HouseWire extends Omit<HouseV1, 'blocks' | 'rot'> {
  blocks: number[];
  rot: number[];
}
export const VOLUME = H.PLOT_W * H.PLOT_D * H.PLOT_H;
export const SPAWN = { x: 12, y: 1, z: 2 };
export const index = (x: number, y: number, z: number) =>
  x + H.PLOT_W * (z + H.PLOT_D * y);
export const inside = (p: Vec3i, height: number = H.PLOT_H) =>
  Number.isInteger(p.x) &&
  Number.isInteger(p.y) &&
  Number.isInteger(p.z) &&
  p.x >= 0 &&
  p.x < H.PLOT_W &&
  p.y >= 0 &&
  p.y < height &&
  p.z >= 0 &&
  p.z < H.PLOT_D;
export function at(h: HouseV1, x: number, y: number, z: number) {
  return inside({ x, y, z }, h.height ?? H.PLOT_H)
    ? h.blocks[index(x, y, z)]
    : B.AIR;
}
export function put(h: HouseV1, x: number, y: number, z: number, b: number) {
  if (inside({ x, y, z }, h.height ?? H.PLOT_H)) h.blocks[index(x, y, z)] = b;
}
export function rotation(h: HouseV1, i: number) {
  return (h.rot[i >> 2] >> ((i & 3) * 2)) & 3;
}
export function rotate(h: HouseV1, i: number, r: number) {
  const shift = (i & 3) * 2;
  h.rot[i >> 2] = (h.rot[i >> 2] & ~(3 << shift)) | ((r & 3) << shift);
}
export function cleanText(value: string, max: number) {
  return value
    .normalize('NFKC')
    .replace(/[\p{Cc}\p{Cf}<>]/gu, '')
    .replace(/\b(fuck|shit|nigger|faggot)\w*/gi, '…')
    .trim()
    .slice(0, max);
}
export function emptyHouse(title = 'The house next door'): HouseV1 {
  return {
    v: 1,
    blocks: new Uint8Array(VOLUME),
    rot: new Uint8Array(Math.ceil(VOLUME / 4)),
    props: [],
    spawn: { ...SPAWN },
    candy: { x: 12, y: 1, z: 18 },
    title,
    signs: [],
  };
}
export function encodeHouse(h: HouseV1): HouseWire {
  const blocks: number[] = [];
  for (let i = 0; i < h.blocks.length;) {
    const id = h.blocks[i];
    let n = 1;
    while (i + n < h.blocks.length && h.blocks[i + n] === id && n < 65535) n++;
    blocks.push(id, n);
    i += n;
  }
  return { ...h, blocks, rot: Array.from(h.rot) };
}
export function decodeHouse(raw: unknown, draft = false): HouseV1 {
  if (
    !raw ||
    typeof raw !== 'object' ||
    JSON.stringify(raw).length > H.HOUSE_BYTES
  )
    throw new Error('house exceeds the size limit');
  const w = raw as HouseWire;
  if (w.v !== 1) throw new Error('unsupported house version');
  if (
    !Array.isArray(w.blocks) ||
    w.blocks.length % 2 ||
    !Array.isArray(w.rot) ||
    w.rot.length !==
      Math.ceil((H.PLOT_W * H.PLOT_D * (w.height ?? H.PLOT_H)) / 4) ||
    w.rot.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  )
    throw new Error('invalid block data');
  const height = w.height ?? H.PLOT_H;
  if (height !== H.PLOT_H && height !== H.HOLDER_H)
    throw new Error('invalid house height');
  const volume = H.PLOT_W * H.PLOT_D * height;
  const blocks = new Uint8Array(volume);
  let offset = 0;
  for (let i = 0; i < w.blocks.length; i += 2) {
    const id = w.blocks[i],
      n = w.blocks[i + 1];
    if (
      !Number.isInteger(id) ||
      !BLOCKS[id] ||
      !Number.isInteger(n) ||
      n < 1 ||
      offset + n > volume
    )
      throw new Error('invalid block run');
    blocks.fill(id, offset, offset + n);
    offset += n;
  }
  if (offset !== volume) throw new Error('incomplete house');
  const h = { ...w, blocks, rot: Uint8Array.from(w.rot) };
  validateHouse(h, draft);
  return h;
}
export function stashPositions(h: HouseV1): Vec3i[] {
  const result: Vec3i[] = [];
  h.blocks.forEach((b, i) => {
    if (b === B.CANDY)
      result.push({
        x: i % 24,
        z: Math.floor(i / 24) % 24,
        y: Math.floor(i / 576),
      });
  });
  return result;
}
export function validateHouse(h: HouseV1, draft = false) {
  if (
    !h.spawn ||
    !h.candy ||
    !inside(h.candy, h.height ?? H.PLOT_H) ||
    h.spawn.x !== SPAWN.x ||
    h.spawn.y !== SPAWN.y ||
    h.spawn.z !== SPAWN.z
  )
    throw new Error('keep the entrance clear');
  if (
    typeof h.title !== 'string' ||
    !h.title.trim() ||
    h.title !== cleanText(h.title, H.TITLE_MAX)
  )
    throw new Error('choose a clean title up to 32 characters');
  if (
    !Array.isArray(h.props) ||
    h.props.length >
      ((h.height ?? H.PLOT_H) > H.PLOT_H ? H.HOLDER_PROPS : H.MAX_PROPS) ||
    !Array.isArray(h.signs) ||
    h.signs.length > H.MAX_SIGNS
  )
    throw new Error('too many props or signs');
  if (
    h.blocks.length !== H.PLOT_W * H.PLOT_D * (h.height ?? H.PLOT_H) ||
    h.blocks.some((b) => !BLOCKS[b])
  )
    throw new Error('invalid dimensions');
  if (
    !draft &&
    (stashPositions(h).length < 1 ||
      stashPositions(h).length > NIGHT.maxStashes ||
      at(h, h.candy.x, h.candy.y, h.candy.z) !== B.CANDY)
  )
    throw new Error('place one to three candy stashes');
  if (stashPositions(h).length > NIGHT.maxStashes)
    throw new Error('only three candy stashes');
  if (h.blocks.filter((b) => b === B.BATTERY).length > H.MAX_BATTERIES)
    throw new Error('only three spare batteries');
  const ids = new Set<string>();
  for (const p of h.props) {
    if (
      !p ||
      typeof p.id !== 'string' ||
      p.id.length > 40 ||
      ids.has(p.id) ||
      !PROP_TYPES.includes(p.type) ||
      !TRIGGERS.includes(p.trigger) ||
      !p.pos ||
      !p.target ||
      !inside(p.pos, h.height ?? H.PLOT_H) ||
      !inside(p.target, h.height ?? H.PLOT_H) ||
      typeof p.once !== 'boolean' ||
      !['whisper', 'steps', 'scream', 'knock'].includes(p.sound)
    )
      throw new Error('invalid scare prop');
    ids.add(p.id);
    if (
      ![p.radius, p.delay, p.duration, p.cooldown].every(Number.isFinite) ||
      p.radius < 0.5 ||
      p.radius > 12 ||
      p.delay < 0 ||
      p.delay > H.PROP_MAX_SECONDS ||
      p.duration < 0.1 ||
      p.duration > H.PROP_MAX_SECONDS ||
      p.cooldown < 0 ||
      p.cooldown > H.PROP_MAX_SECONDS
    )
      throw new Error('invalid prop timing');
    if (p.type === 'slammer' && (p.duration < 2 || p.duration > 10))
      throw new Error('doors can lock for 2–10 seconds');
  }
  for (const s of h.signs)
    if (
      !s ||
      !s.pos ||
      !inside(s.pos, h.height ?? H.PLOT_H) ||
      typeof s.text !== 'string' ||
      s.text !== cleanText(s.text, H.SIGN_MAX)
    )
      throw new Error('invalid sign');
  if (!draft && !stashPositions(h).every((target) => reachable(h, target)))
    throw new Error('the candy needs a walkable route from the entrance');
}
export function reachable(h: HouseV1, target = h.candy) {
  const height = h.height ?? H.PLOT_H;
  const clear = (x: number, y: number, z: number, feet = false) => {
    const id = at(h, x, y, z),
      block = BLOCKS[id];
    return (
      !block.solid ||
      id === B.DOOR ||
      (feet && (block.shape === 'stairs' || block.shape === 'slab'))
    );
  };
  const pass = (p: Vec3i) =>
    inside(p, height) &&
    p.y > 0 &&
    p.y + 1 < height &&
    clear(p.x, p.y, p.z, true) &&
    clear(p.x, p.y + 1, p.z) &&
    (BLOCKS[at(h, p.x, p.y - 1, p.z)].solid ||
      at(h, p.x, p.y, p.z) === B.LADDER ||
      ['stairs', 'slab'].includes(BLOCKS[at(h, p.x, p.y, p.z)].shape));
  if (!pass(SPAWN)) return false;
  const queue = [{ ...SPAWN }],
    seen = new Set([index(SPAWN.x, SPAWN.y, SPAWN.z)]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (
      Math.hypot(p.x - target.x, p.y - target.y, p.z - target.z) <
      H.INTERACT_DISTANCE
    )
      return true;
    const neighbors: Vec3i[] = [];
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      for (const dy of [-1, 0, 1])
        neighbors.push({ x: p.x + dx, y: p.y + dy, z: p.z + dz });
    if (at(h, p.x, p.y, p.z) === B.LADDER)
      for (const dy of [-1, 1]) neighbors.push({ ...p, y: p.y + dy });
    for (const n of neighbors) {
      const id = index(n.x, n.y, n.z);
      if (seen.has(id) || !pass(n)) continue;
      seen.add(id);
      queue.push(n);
    }
  }
  return false;
}
export function migrateHouse(raw: unknown) {
  return decodeHouse(raw);
}
export function cloneHouse(h: HouseV1): HouseV1 {
  return {
    ...h,
    blocks: h.blocks.slice(),
    rot: h.rot.slice(),
    spawn: { ...h.spawn },
    candy: { ...h.candy },
    props: h.props.map((p) => ({
      ...p,
      pos: { ...p.pos },
      target: { ...p.target },
    })),
    signs: h.signs.map((s) => ({ ...s, pos: { ...s.pos } })),
  };
}

export function expandHouse(h: HouseV1): HouseV1 {
  const next = cloneHouse(h);
  next.height = H.HOLDER_H;
  next.blocks = new Uint8Array(H.PLOT_W * H.PLOT_D * H.HOLDER_H);
  next.blocks.set(h.blocks);
  next.rot = new Uint8Array(next.blocks.length / 4);
  next.rot.set(h.rot);
  return next;
}
