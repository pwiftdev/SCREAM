import { existsSync } from 'node:fs';
import { createGameServer } from './app';
import { Store } from './store';
if (existsSync('.env')) process.loadEnvFile('.env');
if (process.env.DYNO && !process.env.DATABASE_URL)
  throw new Error('Heroku requires DATABASE_URL for persistent game storage');
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const { server, port } = await createGameServer({
  port: Number(process.env.PORT ?? 2567),
  host,
  store: new Store('data/scream.sqlite', process.env.DATABASE_URL),
});
console.log(`SCREAM server listening on ${host}:${port}`);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    void server.gracefullyShutdown(false).then(() => process.exit(0));
  });
