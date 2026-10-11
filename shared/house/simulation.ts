import { NIGHT, staminaStep } from './rework';
import { H } from '../config';
import { B, BLOCKS } from './blocks';
import { clearSight } from './sight';
import { at, index, stashPositions, type HouseV1 } from './format';
import { collides, moveAxis, type Position } from './collision';
import { blockLight } from './light';
import { findPath } from '../props/path';
export const INPUT = {
  FORWARD: 1,
  BACK: 2,
  LEFT: 4,
  RIGHT: 8,
  JUMP: 16,
  CROUCH: 32,
  USE: 64,
  FLASH: 128,
} as const;
export interface Frame {
  sprint?: boolean;
  bits: number;
  yaw: number;
  pitch: number;
}
export interface Scare {
  tick: number;
  type: string;
  pos: Position;
}
export interface PropState {
  armed: number;
  active: number;
  next: number;
  fired: boolean;
  contact: number;
  pos: Position;
  path: Position[];
}
export interface VisitState {
  tick: number;
  seed: number;
  pos: Position;
  vy: number;
  yaw: number;
  pitch: number;
  grounded: boolean;
  crouching: boolean;
  flash: boolean;
  battery: number;
  stamina: number;
  stashTargets: ReturnType<typeof stashPositions>;
  stashes: Set<number>;
  holdingStash: number;
  stunnedUntil: number;
  hazards: { x: number; y: number; z: number; id: number }[];
  triggered: Set<number>;
  candy: boolean;
  hold: number;
  outcome: 'playing' | 'escaped' | 'caught' | 'pit' | 'timeout';
  open: Set<number>;
  doors: Set<number>;
  pickups: Set<number>;
  props: PropState[];
  events: Scare[];
  lastBits: number;
  light: Uint8Array;
  blackout: boolean;
}
export function startVisit(h: HouseV1, seed = 1): VisitState {
  return {
    tick: 0,
    seed: seed >>> 0,
    pos: { x: h.spawn.x + 0.5, y: h.spawn.y, z: h.spawn.z + 0.5 },
    vy: 0,
    yaw: Math.PI,
    pitch: 0,
    grounded: false,
    crouching: false,
    flash: true,
    battery: H.FLASHLIGHT_SECONDS,
    candy: false,
    stamina: 100,
    stashTargets: stashPositions(h),
    stashes: new Set(),
    holdingStash: -1,
    stunnedUntil: 0,
    triggered: new Set(),
    hazards: Array.from(h.blocks.entries())
      .filter(([, b]) => b === B.SPIKES || b === B.SCREAMER)
      .map(([i, id]) => ({
        x: i % 24,
        y: Math.floor(i / 576),
        z: Math.floor(i / 24) % 24,
        id,
      })),
    hold: 0,
    outcome: 'playing',
    open: new Set(),
    doors: new Set(),
    pickups: new Set(),
    props: h.props.map((p) => ({
      armed: -1,
      active: -1,
      next: 0,
      fired: false,
      contact: 0,
      pos: { x: p.pos.x + 0.5, y: p.pos.y, z: p.pos.z + 0.5 },
      path: [],
    })),
    events: [],
    lastBits: 0,
    light: blockLight(h),
    blackout: false,
  };
}
export function validFrame(f: Frame, previous?: Frame) {
  return (
    f &&
    (f.sprint === undefined || typeof f.sprint === 'boolean') &&
    Number.isInteger(f.bits) &&
    f.bits >= 0 &&
    f.bits <= 255 &&
    Number.isInteger(f.yaw) &&
    Math.abs(f.yaw) <= Math.PI * H.LOOK_UNITS + 1 &&
    Number.isInteger(f.pitch) &&
    Math.abs(f.pitch) <= H.MAX_PITCH &&
    (!previous ||
      (Math.abs(f.pitch - previous.pitch) <= H.MAX_LOOK_TICK &&
        Math.abs(
          Math.atan2(
            Math.sin((f.yaw - previous.yaw) / H.LOOK_UNITS),
            Math.cos((f.yaw - previous.yaw) / H.LOOK_UNITS),
          ),
        ) *
          H.LOOK_UNITS <=
          H.MAX_LOOK_TICK))
  );
}
export function distance(a: Position, b: Position) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function rng(s: VisitState) {
  s.seed ^= s.seed << 13;
  s.seed ^= s.seed >>> 17;
  s.seed ^= s.seed << 5;
  s.seed >>>= 0;
  return s.seed / 4294967296;
}
function props(h: HouseV1, s: VisitState) {
  s.blackout = false;
  s.open = new Set(s.doors);
  const locked = new Set<number>();
  h.props.forEach((p, i) => {
    const v = s.props[i],
      d = distance(s.pos, {
        x: p.target.x + 0.5,
        y: p.target.y,
        z: p.target.z + 0.5,
      }),
      elapsed = s.tick / H.TICK_HZ;
    if (v.active >= 0 && s.tick >= v.active) {
      v.active = -1;
      v.next = s.tick + Math.ceil(p.cooldown * H.TICK_HZ);
      v.contact = 0;
    }
    if (
      v.active < 0 &&
      v.armed < 0 &&
      s.tick >= v.next &&
      (!p.once || !v.fired)
    ) {
      const eye = {
        ...s.pos,
        y: s.pos.y + (s.crouching ? H.CROUCH_EYE : H.EYE),
      };
      const target = {
        x: p.target.x + 0.5,
        y: p.target.y + 0.5,
        z: p.target.z + 0.5,
      };
      const dx = target.x - eye.x,
        dy = target.y - eye.y,
        dz = target.z - eye.z;
      const looking =
        (-Math.sin(s.yaw) * Math.cos(s.pitch) * dx +
          Math.sin(s.pitch) * dy -
          Math.cos(s.yaw) * Math.cos(s.pitch) * dz) /
          Math.max(0.001, Math.hypot(dx, dy, dz)) >
        Math.cos(0.25);
      const triggered =
        p.trigger === 'timer'
          ? elapsed >= p.delay
          : p.trigger === 'look'
            ? d <= p.radius &&
              looking &&
              clearSight(h, eye, target, s.open, true)
            : p.trigger === 'plate'
              ? d < 0.8 && s.grounded
              : p.trigger === 'tripwire'
                ? d < 0.7
                : d <= p.radius;
      if (triggered)
        v.armed =
          s.tick + Math.ceil((p.trigger === 'timer' ? 0 : p.delay) * H.TICK_HZ);
    }
    if (v.armed >= 0 && s.tick >= v.armed) {
      v.armed = -1;
      v.fired = true;
      v.active = s.tick + Math.ceil(p.duration * H.TICK_HZ);
      v.pos = { x: p.pos.x + 0.5, y: p.pos.y, z: p.pos.z + 0.5 };
      s.events.push({
        tick: s.tick,
        type: p.type === 'whisper' ? p.sound : p.type,
        pos: { ...v.pos },
      });
      rng(s);
    }
    if (v.active < 0) return;
    if (p.type === 'blackout' && d <= p.radius) s.blackout = true;
    if (p.type === 'trapdoor')
      s.open.add(index(p.target.x, p.target.y, p.target.z));
    if (p.type === 'slammer') {
      const key = index(p.target.x, p.target.y, p.target.z);
      locked.add(key);
      s.open.delete(key);
      const upper = index(p.target.x, p.target.y + 1, p.target.z);
      if (at(h, p.target.x, p.target.y + 1, p.target.z) === B.DOOR) {
        locked.add(upper);
        s.open.delete(upper);
      }
    }
    if (p.type === 'lurker') {
      v.contact = distance(s.pos, v.pos) < H.LURKER_RANGE ? v.contact + 1 : 0;
      if (v.contact >= H.LURKER_CATCH_S * H.TICK_HZ) s.outcome = 'caught';
    }
    if (p.type === 'follower') {
      const lit =
        s.light[
          index(
            Math.floor(s.pos.x),
            Math.max(0, Math.floor(s.pos.y)),
            Math.floor(s.pos.z),
          )
        ] ?? 0;
      if (!s.blackout && lit >= H.LIGHT_SAFE) {
        v.active = -1;
        return;
      }
      if (s.tick % H.PATH_INTERVAL === 0 || !v.path.length)
        v.path = findPath(h, v.pos, s.pos, s.open);
      const dest = v.path[0];
      if (dest) {
        const length = Math.hypot(dest.x - v.pos.x, dest.z - v.pos.z),
          step = (H.WALK * H.FOLLOWER_SPEED) / H.TICK_HZ;
        if (length <= step) {
          v.pos = { ...dest };
          v.path.shift();
        } else {
          v.pos.x += ((dest.x - v.pos.x) / length) * step;
          v.pos.z += ((dest.z - v.pos.z) / length) * step;
        }
      }
      if (distance(s.pos, v.pos) < H.FOLLOWER_CATCH) s.outcome = 'caught';
    }
  });
  for (const door of s.doors) if (!locked.has(door)) s.open.add(door);
  if (s.events.length > 32) s.events.splice(0, s.events.length - 32);
}
function interact(h: HouseV1, s: VisitState, f: Frame) {
  const target = s.stashTargets.find(
    (p) =>
      !s.stashes.has(index(p.x, p.y, p.z)) &&
      distance(s.pos, { x: p.x + 0.5, y: p.y, z: p.z + 0.5 }) <
        H.INTERACT_DISTANCE &&
      clearSight(
        h,
        { ...s.pos, y: s.pos.y + (s.crouching ? H.CROUCH_EYE : H.EYE) },
        { x: p.x + 0.5, y: p.y + 0.3, z: p.z + 0.5 },
        s.open,
      ),
  );
  if (f.bits & INPUT.USE && target) {
    const key = index(target.x, target.y, target.z);
    if (s.holdingStash !== key) {
      s.hold = 0;
      s.holdingStash = key;
    }
    s.hold++;
    if (s.hold >= H.CANDY_HOLD_S * H.TICK_HZ) {
      s.candy = true;
      s.stashes.add(key);
      s.pickups.add(key);
      s.hold = 0;
    }
  } else {
    s.hold = 0;
    s.holdingStash = -1;
  }
  if (!(f.bits & INPUT.USE) || s.lastBits & INPUT.USE) return;
  for (let d = 0.2; d < H.INTERACT_DISTANCE; d += 0.1) {
    const x = Math.floor(s.pos.x - Math.sin(s.yaw) * d),
      y = Math.floor(s.pos.y + 0.5),
      z = Math.floor(s.pos.z - Math.cos(s.yaw) * d),
      b = at(h, x, y, z),
      key = index(x, y, z);
    if (b === B.DOOR) {
      const opening = !s.doors.has(key);
      for (let yy = Math.max(0, y - 1); yy <= y + 1; yy++) {
        if (at(h, x, yy, z) !== B.DOOR) continue;
        const k = index(x, yy, z);
        if (opening) {
          s.doors.add(k);
          s.open.add(k);
        } else {
          s.doors.delete(k);
          s.open.delete(k);
        }
      }

      break;
    }
    if (b === B.BATTERY && !s.pickups.has(key)) {
      s.pickups.add(key);
      s.battery = Math.min(H.FLASHLIGHT_SECONDS, s.battery + H.BATTERY_PICKUP);
      s.events.push({ tick: s.tick, type: 'battery', pos: { x, y, z } });
      break;
    }
    if (BLOCKS[b].solid && !s.open.has(key)) break;
  }
}
export function tickVisit(h: HouseV1, s: VisitState, f: Frame) {
  if (s.outcome !== 'playing') return;
  s.tick++;
  s.yaw = f.yaw / H.LOOK_UNITS;
  s.pitch = f.pitch / H.LOOK_UNITS;
  const dt = 1 / H.TICK_HZ;
  s.crouching =
    !!(f.bits & INPUT.CROUCH) || collides(h, s.pos, H.HEIGHT, s.open);
  const height = s.crouching ? H.CROUCH_HEIGHT : H.HEIGHT;
  if (f.bits & INPUT.FLASH && !(s.lastBits & INPUT.FLASH)) s.flash = !s.flash;
  s.battery = Math.max(
    0,
    Math.min(
      H.FLASHLIGHT_SECONDS,
      s.battery + (s.flash ? -1 : H.BATTERY_RECHARGE) * dt,
    ),
  );
  let forward =
      Number(!!(f.bits & INPUT.FORWARD)) - Number(!!(f.bits & INPUT.BACK)),
    side = Number(!!(f.bits & INPUT.RIGHT)) - Number(!!(f.bits & INPUT.LEFT));
  const len = Math.hypot(forward, side) || 1;
  forward /= len;
  side /= len;
  const web =
    at(h, Math.floor(s.pos.x), Math.floor(s.pos.y), Math.floor(s.pos.z)) ===
    B.WEB;
  const sprint = !!f.sprint && !s.crouching && s.stamina > 0;
  s.stamina = staminaStep(s.stamina, sprint, !!(forward || side), dt);
  const speed =
    (s.tick < s.stunnedUntil ? 0 : 1) *
    (s.crouching ? H.CROUCH : H.WALK * (sprint ? NIGHT.sprintMultiplier : 1)) *
    (web ? 0.4 : 1) *
    dt;
  moveAxis(
    h,
    s.pos,
    'x',
    (-Math.sin(s.yaw) * forward + Math.cos(s.yaw) * side) * speed,
    height,
    s.open,
    s.grounded,
  );
  moveAxis(
    h,
    s.pos,
    'z',
    (-Math.cos(s.yaw) * forward - Math.sin(s.yaw) * side) * speed,
    height,
    s.open,
    s.grounded,
  );
  const ladder =
    at(h, Math.floor(s.pos.x), Math.floor(s.pos.y), Math.floor(s.pos.z)) ===
    B.LADDER;
  if (ladder) s.vy = forward * H.CROUCH;
  else if (s.grounded && f.bits & INPUT.JUMP && !(s.lastBits & INPUT.JUMP))
    s.vy = H.JUMP;
  else s.vy -= H.GRAVITY * dt;
  const moved = moveAxis(h, s.pos, 'y', s.vy * dt, height, s.open);
  s.grounded = !moved && s.vy <= 0;
  if (!moved) s.vy = 0;
  interact(h, s, f);
  props(h, s);
  for (const p of s.hazards) {
    const key = index(p.x, p.y, p.z);
    if (s.triggered.has(key)) continue;
    if (
      distance(s.pos, { x: p.x + 0.5, y: p.y, z: p.z + 0.5 }) <
      (p.id === B.SPIKES ? 0.75 : 1.8)
    ) {
      s.triggered.add(key);
      s.stunnedUntil = s.tick + NIGHT.trapStunSeconds * H.TICK_HZ;
      s.events.push({ tick: s.tick, type: 'scream', pos: p });
    }
  }

  if (s.outcome === 'playing' && s.pos.y < -2) s.outcome = 'pit';
  if (
    s.outcome === 'playing' &&
    s.candy &&
    distance(s.pos, { x: h.spawn.x + 0.5, y: h.spawn.y, z: h.spawn.z + 0.5 }) <
      H.EXIT_DISTANCE
  )
    s.outcome = 'escaped';
  if (s.outcome === 'playing' && s.tick >= H.VISIT_LIMIT_S * H.TICK_HZ)
    s.outcome = 'timeout';
  s.lastBits = f.bits;
}
export function replay(h: HouseV1, seed: number, frames: Frame[]) {
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 4294967295 ||
    !Array.isArray(frames) ||
    frames.length > H.VISIT_LIMIT_S * H.TICK_HZ
  )
    throw new Error('invalid run length or seed');
  const s = startVisit(h, seed);
  let previous: Frame | undefined;
  for (const frame of frames) {
    if (s.outcome !== 'playing')
      throw new Error('input continues after run ended');
    if (!validFrame(frame, previous))
      throw new Error('invalid input or look speed');
    tickVisit(h, s, frame);
    previous = frame;
  }
  return s;
}
