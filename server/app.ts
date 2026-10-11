import { tokenMarket, tokenHistory } from './token-market';
import { CHART_RANGES, type ChartRange } from '../shared/token-market';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import express from 'express';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { matchRoom } from './MatchRoom';
import { Hub } from './queue';
import { queueRoom } from './QueueRoom';
import { watchRoom } from './WatchRoom';
import { WalletAuth } from './auth';
import { Store } from './store';
import { guardHttp } from './http-guard';
import { createRewards } from './house';
import { payScheduledPrizes } from './hollow/events';
import { OutdoorSessions } from './hollow/outdoor-sessions';
import { StreetRoom } from './hollow/StreetRoom';
import { hollowApi } from './hollow/api';
import { readPlayerProfile } from './hollow/player-profile';
export async function createGameServer({
  port = 2567,
  host = '127.0.0.1',
  store = new Store(':memory:'),
} = {}) {
  const origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:2567',
    'http://127.0.0.1:2567',
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
  ];
  if (process.env.PUBLIC_ORIGIN)
    origins.push(new URL(process.env.PUBLIC_ORIGIN).origin);
  const hub = new Hub(),
    auth = new WalletAuth();
  await store.start();
  const rewards = await createRewards(store);
  const app = express();
  app.disable('x-powered-by');
  const outdoor = new OutdoorSessions();
  const hollow = await hollowApi(store, auth, outdoor);
  app.use('/api/hollow', hollow.router);
  const prizeTimer = setInterval(
    () =>
      void payScheduledPrizes(hollow.houses).catch((e) =>
        console.error('Hollow prize scheduler:', e.message),
      ),
    60000,
  );
  prizeTimer.unref();
  app.use(express.json({ limit: '4kb' }));
  app.get('/health', (_q, r) =>
    r.status(rewards.healthy() ? 200 : 503).json({
      ok: rewards.healthy(),
      mode: process.env.NODE_ENV === 'production' ? 'production' : 'local',
      rewards: rewards.mode,
    }),
  );
  app.get('/api/config', (_q, r) =>
    r.json({
      local: process.env.NODE_ENV !== 'production',
      guestProfiles: process.env.ALLOW_GUEST_PROFILES === 'true',
      tokenMint: process.env.TOKEN_MINT ?? '',
      assetBase: process.env.ASSET_BASE_URL ?? '/assets',
      rewards: rewards.mode,
    }),
  );
  app.get('/api/auth/nonce', (_q, r) => r.json({ nonce: auth.nonce() }));
  app.get('/api/live', (_q, r) =>
    r.json({
      live: !!hub.active,
      players:
        hub.latest?.players.map((p) => ({ name: p.name, role: p.role })) ?? [],
      generators:
        hub.delayed()?.generators.filter((g) => g.progress >= 1).length ?? 0,
      watchers: hub.watchers,
      waiting: hub.queue.entries.length,
    }),
  );
  app.get('/api/leaderboard', async (_q, r) => {
    try {
      r.json(await store.leaderboard());
    } catch {
      r.status(503).json({ error: 'scores are temporarily unavailable' });
    }
  });
  const market = tokenMarket(),
    history = tokenHistory();
  app.get('/api/token', async (_q, r) => {
    r.setHeader('Cache-Control', 'no-store');
    r.json(await market());
  });
  app.get('/api/token/history', async (q, r) => {
    const range = q.query.range;
    if (
      typeof range !== 'string' ||
      !CHART_RANGES.includes(range as ChartRange)
    ) {
      r.status(400).json({ error: 'choose 24h, 7d or 30d' });
      return;
    }
    r.setHeader('Cache-Control', 'no-store');
    r.json(await history(range as ChartRange));
  });
  app.use(express.static(resolve('dist')));
  app.get(['/h/:code', '/admin', '/legacy'], (_q, r) => {
    const entry = resolve('dist/index.html');
    if (existsSync(entry)) r.sendFile(entry);
    else
      r.status(404).json({
        error: 'build the client or use the local Vite URL',
      });
  });
  const http = createServer(app);
  const server = new Server({
    transport: new WebSocketTransport({
      server: http,
      maxPayload: 4096,
      pingInterval: 15000,
      pingMaxRetries: 3,
      verifyClient: (info: { origin: string }) =>
        !info.origin || origins.includes(info.origin),
    }),
    greet: false,
    gracefullyShutdown: false,
  });
  server
    .define('street', StreetRoom, {
      identify: (token: string) => hollow.houses.identity(token),
      profileName: async (wallet: string) =>
        (await readPlayerProfile(hollow.houses.db, wallet))?.name,
      sessions: outdoor,
    })
    .filterBy(['street']);
  server.define('match', matchRoom(hub, store));
  server.define('queue', queueRoom(hub, auth, store));
  server.define('watch', watchRoom(hub));
  server.onShutdown(async () => {
    clearInterval(prizeTimer);
    await rewards.close();
    await store.close();
  });
  await server.listen(port, host);
  guardHttp(http, origins);
  const address = http.address();
  return {
    app,
    server,
    hub,
    auth,
    store,
    hollow: hollow.houses,
    outdoor,
    port: address && typeof address !== 'string' ? address.port : port,
  };
}
