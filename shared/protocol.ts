import { C } from './config';
import type { Input } from './types';
export function parseInput(raw: unknown): Input | null {
  if (!raw || typeof raw !== 'object') return null;
  const v = raw as Record<string, unknown>;
  for (const k of ['seq', 'x', 'z', 'yaw', 'time'])
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k])) return null;
  if (
    !Number.isInteger(v.seq) ||
    Number(v.seq) < 0 ||
    Number(v.seq) > C.MAX_SEQUENCE ||
    Math.abs(Number(v.x)) > 1 ||
    Math.abs(Number(v.z)) > 1 ||
    Math.abs(Number(v.yaw)) > Math.PI * 4 ||
    Math.abs(Number(v.time)) > 1e15
  )
    return null;
  for (const k of ['run', 'crouch', 'interact'])
    if (typeof v[k] !== 'boolean') return null;
  return {
    seq: Number(v.seq),
    x: Number(v.x),
    z: Number(v.z),
    yaw: Number(v.yaw),
    time: Number(v.time),
    run: !!v.run,
    crouch: !!v.crouch,
    interact: !!v.interact,
  };
}
export const emptyInput = (): Input => ({
  seq: 0,
  x: 0,
  z: 0,
  yaw: 0,
  run: true,
  crouch: false,
  interact: false,
  time: 0,
});
export function cleanName(raw: unknown) {
  return typeof raw === 'string'
    ? [...raw]
        .filter((c) => c.charCodeAt(0) >= 32 && c !== '<' && c !== '>')
        .join('')
        .trim()
        .slice(0, 20) || 'Wanderer'
    : 'Wanderer';
}
