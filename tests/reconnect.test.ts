import { it, expect } from 'vitest';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../server/app';
import type { Snapshot } from '../shared/types';
it('a dropped transport reconnects into the same held seat without duplicating a player', async () => {
  const app = await createGameServer({ port: 0 });
  const client = new Client(`http://127.0.0.1:${app.port}`);
  const room = await client.create('match', {
    practice: true,
    bots: 4,
    role: 'survivor',
    name: 'Returning',
  });
  room.onMessage('snapshot', () => {});
  room.onMessage('notice', () => {});
  room.reconnection.enabled = true;
  room.reconnection.minUptime = 0;
  room.reconnection.minDelay = 50;
  room.reconnection.maxDelay = 100;
  const original = room.sessionId;
  try {
    room.send('start');
    await new Promise((r) => setTimeout(r, 100));
    const back = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('reconnection timed out')),
        5000,
      );
      room.onReconnect(() => {
        clearTimeout(timer);
        resolve();
      });
    });
    room.connection.close(4010);
    await back;
    expect(room.sessionId).toBe(original);
    const snap = await new Promise<Snapshot>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('snapshot missing')),
        2000,
      );
      const off = room.onMessage('snapshot', (s: Snapshot) => {
        if (s.players.find((p) => p.id === original)?.connected) {
          clearTimeout(timeout);
          off();
          resolve(s);
        }
      });
      room.send('sync');
    });
    expect(snap.players.filter((p) => p.id === original)).toHaveLength(1);
    expect(snap.phase).toBe('playing');
  } finally {
    await room.leave();
    await app.server.gracefullyShutdown(false);
  }
}, 10000);
