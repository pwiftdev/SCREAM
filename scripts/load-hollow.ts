import { Client, type Room } from '@colyseus/sdk';
import { writeFile } from 'node:fs/promises';
import { createGameServer } from '../server/app';
const app = await createGameServer({ port: 0 });
const rooms: Room[] = [];
let snapshots = 0,
  bytes = 0;
const start = performance.now();
try {
  for (let group = 0; group < 30; group++) {
    const joined = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        new Client(`ws://127.0.0.1:${app.port}`)
          .joinOrCreate('street', {
            name: `load-${group * 10 + i}`,
            street: 0,
          })
          .then((room) => {
            room.onMessage('street', (payload) => {
              snapshots++;
              bytes += Buffer.byteLength(JSON.stringify(payload));
            });
            return room;
          }),
      ),
    );
    for (const room of joined) {
      rooms.push(room);
    }
  }
  const ramp = performance.now() - start,
    started = performance.now();
  const timer = setInterval(
    () =>
      rooms.forEach((r, i) =>
        r.send('move', { forward: i % 2 ? 1 : 0, side: 0, yaw: Math.PI }),
      ),
    100,
  );
  await new Promise((resolve) => setTimeout(resolve, 4000));
  clearInterval(timer);
  const elapsed = performance.now() - started;
  const occupancy: Record<string, number> = {};
  for (const r of rooms) occupancy[r.roomId] = (occupancy[r.roomId] ?? 0) + 1;
  const report = {
    clients: rooms.length,
    rooms: Object.values(occupancy),
    rampMs: Math.round(ramp),
    sampleMs: Math.round(elapsed),
    snapshots,
    payloadBytes: bytes,
    rssMB: Math.round(process.memoryUsage().rss / 1048576),
    localOnly: true,
    scope:
      '300 loopback SDK clients. Server/network load only; not 300 rendered browsers.',
  };
  if (
    snapshots < 300 ||
    rooms.length !== 300 ||
    Object.values(occupancy).some((n) => n > 100)
  )
    throw new Error('street capacity failed');
  await writeFile('docs/hollow-load.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await Promise.all(rooms.map((r) => r.leave().catch(() => {})));
  await app.server.gracefullyShutdown(false);
}
