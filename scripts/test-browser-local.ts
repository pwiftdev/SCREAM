import { randomUUID } from 'node:crypto';
import { worldBlocked } from '../shared/house/neighborhood';
import { createServer as createAssetServer, type ViteDevServer } from 'vite';
import { spawn } from 'node:child_process';
import { createGameServer } from '../server/app';
const app = await createGameServer({ port: 2568 });
const testKey = randomUUID();
app.app.post('/__test/position', async (q, r) => {
  if (q.headers['x-test-key'] !== testKey) {
    r.sendStatus(403);
    return;
  }
  try {
    const { token, x, z, yaw } = q.body;
    if (![x, z, yaw].every(Number.isFinite) || worldBlocked(x, z))
      throw new Error('Invalid test position');
    const identity = await app.hollow.identity(token),
      state = app.outdoor.get(identity);
    Object.assign(state.life, {
      x,
      z,
      yaw,
      shieldUntil: 0,
      attackAt: 0,
      damagedAt: -Infinity,
    });
    r.json({ ok: true });
  } catch (e) {
    r.status(400).json({ error: (e as Error).message });
  }
});
let assets: ViteDevServer | undefined;
try {
  assets = await createAssetServer({
    configFile: false,
    cacheDir: 'node_modules/.vite-browser-tests',
    appType: 'custom',
    define: { 'import.meta.env.DEV': 'false' },
    server: { middlewareMode: true, hmr: false, watch: null },
  });
  app.app.use(assets.middlewares);
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        'node_modules/@playwright/test/cli.js',
        'test',
        ...process.argv.slice(2),
      ],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          CI: process.env.CI ?? '1',
          SCREAM_TEST_BASE_URL: 'http://127.0.0.1:2568',
          SCREAM_TEST_KEY: testKey,
        },
      },
    );
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
  process.exitCode = code;
} finally {
  await Promise.all([assets?.close(), app.server.gracefullyShutdown(false)]);
}
