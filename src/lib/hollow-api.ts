import type { HouseV1, HouseWire } from '../../shared/house/format';
import { decodeHouse } from '../../shared/house/format';
import type { Frame } from '../../shared/house/simulation';
import { signIn } from './wallet';
export interface OwnHouse {
  code: string;
  house: HouseWire;
  hash: string;
  clear: boolean;
  published: boolean;
  publishedHash: string | null;
  hidden: boolean;
  plot?: { slot: number; tier: number; style: number } | null;
}
export interface Ticket {
  id: string;
  seed: number;
  hash: string;
  house: HouseWire;
}
export interface Door {
  slot: number;
  score: number;
  visits?: number;
  escapes?: number;
  rating?: number;
  bounty?: number;
  candy?: number;
  code: string;
  owner: string;
  title: string;
  hash: string;
}
let token = '';
try {
  token = localStorage.getItem('hollow-session') ?? '';
} catch {
  /* Session remains in memory when storage is unavailable. */
}
export const laneSession = () => token;
export class LaneApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function laneApi<T>(
  path: string,
  body?: unknown,
  method = body ? 'POST' : 'GET',
): Promise<T> {
  const r = await fetch(`/api/hollow${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json();
  if (!r.ok)
    throw new LaneApiError(data.error ?? 'the street is unavailable', r.status);
  return data;
}
export async function connectLane(name = 'Local test profile') {
  const login = await signIn(name);
  const session = await laneApi<{ token: string; wallet: string }>('/session', {
    login,
  });
  token = session.token;
  try {
    localStorage.setItem('hollow-session', token);
  } catch {
    /* Keep the connected session in memory. */
  }
  return session.wallet;
}
export async function myHouse() {
  if (!token) await connectLane();
  return laneApi<OwnHouse>('/mine');
}
export async function runTicket(code: string, purpose: 'clear' | 'visit') {
  if (!token) await connectLane();
  const t = await laneApi<Ticket>('/ticket', { code, purpose });
  return { ...t, house: decodeHouse(t.house) } as Omit<Ticket, 'house'> & {
    house: HouseV1;
  };
}
export async function compressFrames(frames: Frame[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(frames));
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream('gzip'));
  const out = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  for (const b of out) binary += String.fromCharCode(b);
  return btoa(binary);
}
