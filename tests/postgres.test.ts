import { it, expect } from 'vitest';
import { Store } from '../server/store';
import type { Snapshot } from '../shared/types';
import pg from 'pg';
import { PostgresStore } from '../server/house/pg-store';
const url = process.env.SCREAM_TEST_DATABASE_URL;
it.skipIf(!url)(
  'local Postgres stores profiles and idempotent match scores across reconnection',
  async () => {
    const parsed = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
      !parsed.pathname.startsWith('/scream_validation')
    )
      throw new Error('use an isolated local scream_validation database');
    const s = new Store(':memory:', url);
    await s.start();
    const wallet = `test-${Date.now()}`,
      match = `match-${Date.now()}`;
    try {
      await s.profile(wallet, 'Mara', 0);
      const snapshot = {
        id: match,
        players: [
          {
            id: 'p',
            role: 'survivor',
            health: 'escaped',
            points: { Survival: 1500, Repair: 600, Rescue: 500, Hunt: 0 },
          },
        ],
      } as Snapshot;
      await s.save(snapshot, new Map([['p', wallet]]));
      await s.save(snapshot, new Map([['p', wallet]]));
      expect(
        (await s.leaderboard()).find((r) => r.wallet === wallet),
      ).toMatchObject({ points: 2600, matches: 1, escapes: 1 });
      await s.close();
      const reopened = new Store(':memory:', url);
      try {
        await reopened.start();
        expect(
          (await reopened.leaderboard()).find((r) => r.wallet === wallet)
            ?.points,
        ).toBe(2600);
        await reopened.pool!.query('DELETE FROM results WHERE wallet=$1', [
          wallet,
        ]);
        await reopened.pool!.query('DELETE FROM profiles WHERE wallet=$1', [
          wallet,
        ]);
      } finally {
        await reopened.close();
      }
    } catch (e) {
      await s.close().catch(() => {});
      throw e;
    }
  },
  10000,
);
it.skipIf(!url)(
  'Postgres ledger excludes a second owner, survives restart and stops after connection loss',
  async () => {
    const parsed = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
      !parsed.pathname.startsWith('/scream_validation')
    )
      throw new Error('isolated local database required');
    const first = new PostgresStore(url!, 0),
      second = new PostgresStore(url!, 0),
      admin = new pg.Pool({ connectionString: url });
    try {
      await first.load();
      await first.write(
        JSON.stringify([
          {
            id: 'persisted-reward',
            status: 'sending',
            signature: 'known-signature',
          },
        ]),
      );
      await expect(second.load()).rejects.toThrow('another server');
      await first.close();
      let lost = false;
      const resumed = new PostgresStore(url!, 0, () => {
        lost = true;
      });
      try {
        expect((await resumed.load())?.[0].signature).toBe('known-signature');
        await admin.query(
          "SELECT pg_terminate_backend(pid) FROM pg_locks WHERE locktype='advisory' AND objid=7264002 AND granted",
        );
        for (let i = 0; i < 50 && !lost; i++)
          await new Promise((r) => setTimeout(r, 10));
        expect(lost).toBe(true);
        expect(() => resumed.assertAvailable()).toThrow('ownership lost');
        await expect(resumed.write('[]')).rejects.toThrow('ownership lost');
      } finally {
        await resumed.close();
      }
      const recovered = new PostgresStore(url!, 0);
      try {
        expect((await recovered.load())?.[0].signature).toBe('known-signature');
      } finally {
        await recovered.close();
      }
    } finally {
      await first.close();
      await second.close();
      await admin.end();
    }
  },
  10000,
);
