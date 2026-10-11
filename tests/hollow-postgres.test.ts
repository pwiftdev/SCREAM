import { expect, it } from 'vitest';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
import { Houses } from '../server/hollow/houses';
import { Social } from '../server/hollow/social';
import { H } from '../shared/config';
const url = process.env.SCREAM_TEST_DATABASE_URL;
it.skipIf(!url)(
  'Hollow Postgres serializes duplicate deposits and concurrent cosmetics across houses, then survives reopening',
  async () => {
    const parsed = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
      !parsed.pathname.startsWith('/scream_validation')
    )
      throw new Error('isolated local database required');
    const store = new Store(':memory:', url);
    await store.start();
    const h = new Houses(new HollowDatabase(store), Date.now, 'test');
    await h.start();
    let closed = false;
    const owner = `lane-pg-${Date.now()}`;
    try {
      const own = await h.owned(owner),
        other = await h.owned(`${owner}-other`);
      await h.db.query(
        'UPDATE lane_houses SET published=draft,published_hash=draft_hash WHERE owner=$1',
        [owner],
      );
      await h.claimPlot(owner, 40, 0);
      await Promise.all([
        h.economy.operate(
          owner,
          'deposit',
          String(own.code),
          1000,
          `${owner}-deposit`,
        ),
        h.economy.operate(
          owner,
          'deposit',
          String(own.code),
          1000,
          `${owner}-deposit`,
        ),
      ]);
      await Promise.all([
        h.economy.operate(
          owner,
          'premium',
          String(own.code),
          0,
          `${owner}-premium-a`,
        ),
        h.economy.operate(
          owner,
          'premium',
          String(other.code),
          0,
          `${owner}-premium-b`,
        ),
      ]);
      expect((await h.economy.account(owner)).balance).toBe(
        1000000 - 1000 - H.PREMIUM_COST,
      );
      await expect(
        h.db.transaction(async (q) => {
          await q('UPDATE lane_accounts SET balance=0 WHERE wallet=$1', [
            owner,
          ]);
          throw new Error('interrupted before commit');
        }),
      ).rejects.toThrow('before commit');
      expect(
        (await h.list()).find((row) => row.code === own.code)?.bounty,
      ).toBe(1000);
      expect(await new Social(h).leaderboard('houses', 'weekly')).toEqual([]);
      await store.close();
      closed = true;
      const reopened = new Store(':memory:', url);
      await reopened.start();
      try {
        const next = new Houses(new HollowDatabase(reopened), Date.now, 'test');
        expect((await next.economy.account(owner)).balance).toBe(
          1000000 - 1000 - H.PREMIUM_COST,
        );
      } finally {
        await reopened.close();
      }
    } finally {
      if (!closed) await store.close();
    }
  },
  15000,
);

it.skipIf(!url)(
  'Postgres arbitrates plot claims and candy allocations, rolls back credits, and settles once',
  async () => {
    const parsed = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
      !parsed.pathname.startsWith('/scream_validation')
    )
      throw new Error('isolated local database required');
    const store = new Store(':memory:', url);
    await store.start();
    let now = Date.now();
    const h = new Houses(new HollowDatabase(store), () => now, 'test');
    await h.start();
    const name = `candy-pg-${now}`;
    try {
      const choices = await Promise.allSettled([
        h.claimPlot(`${name}-a`, 319, 0),
        h.claimPlot(`${name}-b`, 319, 0),
      ]);
      expect(choices.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const owner =
          choices[0].status === 'fulfilled' ? `${name}-a` : `${name}-b`,
        own = await h.owned(owner),
        code = String(own.code),
        hash = String(own.hash);
      const initial = Number((await h.candy.status(owner)).fund);
      await Promise.all([
        h.db.transaction((q) => h.candy.open(q, code, owner, hash)),
        h.db.transaction((q) => h.candy.open(q, code, owner, hash)),
      ]);
      expect((await h.candy.status(owner)).fund).toBe(initial - 1000);
      const hunter = `${name}-hunter`;
      await h.owned(hunter);
      await h.db.query(
        'UPDATE lane_houses SET published=draft,published_hash=draft_hash WHERE owner=$1',
        [hunter],
      );
      await h.db.query(
        "INSERT INTO lane_runs(id,wallet,code,hash,house,seed,frames,outcome,ticks,x,y,z,created) VALUES($1,$2,$3,$4,'',1,'','escaped',1200,12,1,2,$5)",
        [name, hunter, code, hash, now],
      );
      await expect(
        h.db.transaction(async (q) => {
          await h.candy.raid(q, name);
          throw new Error('rollback');
        }),
      ).rejects.toThrow('rollback');
      expect((await h.candy.status(owner)).round?.remaining).toBe(1000);
      const results = await Promise.all([
        h.db.transaction((q) => h.candy.raid(q, name)),
        h.db.transaction((q) => h.candy.raid(q, name)),
      ]);
      expect(results.sort()).toEqual([0, 100]);
      now += 86400001;
      await Promise.all([h.candy.status(owner), h.candy.status(owner)]);
      expect((await h.candy.status(owner)).defended).toBe(900);
    } finally {
      await store.close();
    }
  },
);
