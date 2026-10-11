import { beforeAll, afterAll, it, expect } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { generateKeyPairSync, sign } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import { loginMessage } from '../shared/auth';
import { createGameServer } from '../server/app';
import type { QueueStatus } from '../server/queue';
import type { Snapshot } from '../shared/types';
let app: Awaited<ReturnType<typeof createGameServer>>, endpoint: string;
const rooms: Room[] = [];
beforeAll(async () => {
  app = await createGameServer({ port: 0 });
  endpoint = `http://127.0.0.1:${app.port}`;
});
afterAll(async () => {
  for (const r of rooms) if (r.connection.isOpen) await r.leave();
  await app.server.gracefullyShutdown(false);
});
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
function message<T>(
  room: Room,
  type: string,
  predicate: (s: T) => boolean = () => true,
  timeout = 6000,
) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      off();
      reject(new Error(`timed out: ${type}`));
    }, timeout);
    const off = room.onMessage(type, (s: T) => {
      if (predicate(s)) {
        clearTimeout(t);
        off();
        resolve(s);
      }
    });
    room.send('sync');
  });
}
function login() {
  const pair = generateKeyPairSync('ed25519'),
    wallet = new PublicKey(
      pair.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32),
    ).toBase58(),
    nonce = app.auth.nonce();
  return {
    wallet,
    nonce,
    signature: sign(
      null,
      Buffer.from(loginMessage(wallet, nonce)),
      pair.privateKey,
    ).toString('base64'),
  };
}
it('cannot forge an internal queued room or claim a seat without signing', async () => {
  const c = new Client(endpoint);
  await expect(c.create('match', { queued: true })).rejects.toThrow();
  await expect(
    c.joinOrCreate('queue', { role: 'killer', login: { wallet: 'fake' } }),
  ).rejects.toThrow();
});
it('verified ready checks start one match, 128 spectators get delayed data across two rooms, and scores persist', async () => {
  const client = new Client(endpoint),
    queued: Room[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await client.joinOrCreate('queue', {
      login: login(),
      role: i ? 'survivor' : 'killer',
      name: `Player${i}`,
      character: i % 5,
      holder: true,
      cosmetic: 'ember',
    });
    queued.push(r);
    rooms.push(r);
    r.onMessage('queue', () => {});
  }
  await message<QueueStatus>(queued[0], 'queue', (q) => q.selected);
  const seats = queued.map((r) =>
    message<{ roomId: string; ticket: string }>(r, 'seat'),
  );
  for (const r of queued) r.send('ready', true);
  const assigned = await Promise.all(seats);
  expect(new Set(assigned.map((s) => s.roomId)).size).toBe(1);
  const players: Room[] = [];
  for (const seat of assigned) {
    const r = await client.joinById(seat.roomId, { ticket: seat.ticket });
    r.onMessage('snapshot', () => {});
    players.push(r);
    rooms.push(r);
  }
  expect(
    (
      await message<Snapshot>(
        players[0],
        'snapshot',
        (s) => s.phase === 'playing',
      )
    ).players,
  ).toHaveLength(5);
  expect(
    (await message<Snapshot>(players[0], 'snapshot')).players.every(
      (p) => p.cosmetic === undefined,
    ),
  ).toBe(true);
  const watchers: Room[] = [];
  for (let i = 0; i < 128; i++) {
    const r = await client.joinOrCreate('watch');
    r.onMessage('notice', () => {});
    r.onMessage('crowd', () => {});
    watchers.push(r);
    rooms.push(r);
  }
  expect(new Set(watchers.map((w) => w.roomId)).size).toBe(2);
  expect(app.hub.watchers).toBe(128);
  let receivedEarly = false;
  const off = watchers[0].onMessage('snapshot', () => (receivedEarly = true));
  if (Date.now() - (app.hub.latest?.startedAt ?? 0) < 9500) {
    await wait(50);
    expect(receivedEarly).toBe(false);
  }
  off();
  const delayed = await message<Snapshot>(
    watchers[0],
    'snapshot',
    () => true,
    15000,
  );
  expect(Date.now() - delayed.now).toBeGreaterThanOrEqual(9990);
  const ended = message<Snapshot>(
    players[1],
    'snapshot',
    (s) => s.phase === 'finished',
  );
  await players[0].leave();
  expect(
    (await ended).players
      .filter((p) => p.role === 'survivor')
      .every((p) => p.health === 'escaped'),
  ).toBe(true);
  await wait(150);
  expect(await app.store.leaderboard()).toHaveLength(5);
}, 30000);
