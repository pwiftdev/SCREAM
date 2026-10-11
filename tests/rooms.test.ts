import { afterAll, beforeAll, it, expect } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { createGameServer } from '../server/app';
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
function next(room: Room, test: (s: Snapshot) => boolean = () => true) {
  return new Promise<Snapshot>((resolve, reject) => {
    const timeout = setTimeout(() => {
      off();
      reject(new Error('snapshot timeout'));
    }, 4000);
    const off = room.onMessage('snapshot', (s: Snapshot) => {
      if (test(s)) {
        clearTimeout(timeout);
        off();
        resolve(s);
      }
    });
    room.send('sync');
  });
}
it('local health, rejected origins and bounded request bodies', async () => {
  expect((await fetch(`${endpoint}/health`)).status).toBe(200);
  expect(
    (
      await fetch(`${endpoint}/matchmake/create/match`, {
        method: 'POST',
        headers: {
          Origin: 'https://evil.example',
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await fetch(`${endpoint}/matchmake/create/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'x'.repeat(5000) }),
      })
    ).status,
  ).toBe(413);
});
it('five real clients share server-owned positions; sixth cannot play; killer leave resolves match', async () => {
  const client = new Client(endpoint),
    first = await client.create('match', {
      practice: true,
      name: 'Hollow',
      role: 'killer',
    });
  rooms.push(first);
  for (let i = 0; i < 4; i++) {
    const r = await client.joinById(first.roomId, {
      name: `Survivor ${i}`,
      role: 'survivor',
    });
    rooms.push(r);
  }
  expect(
    (await next(first, (s) => s.players.length === 5)).players,
  ).toHaveLength(5);
  await expect(
    client.joinById(first.roomId, { name: 'sixth', role: 'survivor' }),
  ).rejects.toThrow();
  first.send('start');
  const started = await next(first, (s) => s.phase === 'playing');
  expect(started.required).toBe(5);
  expect(started.players.filter((p) => p.role === 'survivor')).toHaveLength(4);
  expect(started.players.filter((p) => p.role === 'killer')).toHaveLength(1);
  first.send('input', {
    seq: 1,
    x: 999,
    z: 999,
    yaw: 0,
    time: Date.now(),
    run: true,
    crouch: false,
    interact: false,
  });
  const after = await next(first);
  expect(after.players[0].x).toBe(started.players[0].x);
  await first.leave();
  const end = await next(rooms[1], (s) => s.phase === 'finished');
  expect(
    end.players
      .filter((p) => p.role === 'survivor')
      .every((p) => p.health === 'escaped'),
  ).toBe(true);
});
it('bots are explicit local practice only', async () => {
  for (const r of rooms) if (r.connection.isOpen) await r.leave();
  await new Promise((r) => setTimeout(r, 50));
  const client = new Client(endpoint);
  await expect(
    client.create('match', { role: 'survivor', bots: 4 }),
  ).rejects.toThrow();
  const r = await client.create('match', {
    practice: true,
    role: 'survivor',
    name: 'solo',
    bots: 4,
  });
  rooms.push(r);
  r.send('start');
  expect((await next(r, (s) => s.phase === 'playing')).players).toHaveLength(5);
});
