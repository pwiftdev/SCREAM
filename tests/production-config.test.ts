import { afterEach, expect, it, vi } from 'vitest';
import { createGameServer } from '../server/app';
import { Store } from '../server/store';

afterEach(() => vi.unstubAllEnvs());

it('serves the configured public origin with opt-in guest profiles and rewards off', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('PUBLIC_ORIGIN', 'https://scream.example');
  vi.stubEnv('ALLOW_GUEST_PROFILES', 'true');
  vi.stubEnv('REWARDS_MODE', 'off');
  const app = await createGameServer({ port: 0 });
  const endpoint = `http://127.0.0.1:${app.port}`;
  try {
    const config = await fetch(`${endpoint}/api/config`, {
      headers: { Origin: 'https://scream.example' },
    });
    expect(config.status).toBe(200);
    expect(await config.json()).toMatchObject({
      local: false,
      guestProfiles: true,
      rewards: 'off',
    });
    expect(await (await fetch(`${endpoint}/health`)).json()).toMatchObject({
      ok: true,
      mode: 'production',
    });
    expect(
      (
        await fetch(`${endpoint}/api/config`, {
          headers: { Origin: 'https://scream.example.evil.test' },
        })
      ).status,
    ).toBe(403);
    vi.stubEnv('ALLOW_GUEST_PROFILES', 'false');
    expect(await (await fetch(`${endpoint}/api/config`)).json()).toMatchObject({
      local: false,
      guestProfiles: false,
    });
  } finally {
    await app.server.gracefullyShutdown(false);
  }
});

it('limits Heroku certificate handling to explicitly configured database pools', async () => {
  vi.stubEnv('DATABASE_SSL', 'heroku');
  const remote = new Store(':memory:', 'postgres://localhost/scream');
  vi.stubEnv('DATABASE_SSL', '');
  const local = new Store(':memory:', 'postgres://localhost/scream');
  try {
    expect(remote.pool!.options.ssl).toEqual({ rejectUnauthorized: false });
    expect(local.pool!.options.ssl).toBeUndefined();
    expect(remote.pool!.options.max).toBe(3);
  } finally {
    await Promise.all([remote.close(), local.close()]);
  }
});
