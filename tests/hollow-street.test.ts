import { it, expect } from 'vitest';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../server/app';
import type { StreetGhost } from '../server/hollow/StreetRoom';
it('street ghosts spawn far apart and share authoritative normalized movement', async () => {
  const app = await createGameServer({ port: 0 }),
    client = new Client(`ws://127.0.0.1:${app.port}`);
  const a = await client.joinOrCreate('street', { name: 'a' }),
    b = await client.joinOrCreate('street', { name: 'b' });
  a.onMessage('*', () => {});
  b.onMessage('*', () => {});
  try {
    const first = await new Promise<StreetGhost[]>((resolve) => {
      a.onMessage('street', resolve);
      a.send('sync');
    });
    const start = first.find((p) => p.id === b.sessionId)!,
      other = first.find((p) => p.id === a.sessionId)!;
    expect(Math.hypot(start.x - other.x, start.z - other.z)).toBeGreaterThan(
      100,
    );
    const next = new Promise<StreetGhost[]>((resolve) =>
      a.onMessage('street', (g: StreetGhost[]) => {
        if (g.some((p) => p.id === b.sessionId && p.z > start.z)) resolve(g);
      }),
    );
    b.send('move', { forward: 1, side: 0, yaw: Math.PI });
    const p = (await next).find((p) => p.id === b.sessionId)!;
    expect(p.z - start.z).toBeGreaterThan(0);
    expect(p.z - start.z).toBeLessThan(1);
    b.send('move', { forward: 999, side: Infinity, yaw: NaN });
  } finally {
    await a.leave();
    await b.leave();
    await app.server.gracefullyShutdown(false);
  }
}, 15000);
