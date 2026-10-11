import { afterEach, expect, it } from 'vitest';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
import { Houses } from '../server/hollow/houses';
import { CANDY_RULES } from '../server/hollow/candy';
const stores: Store[] = [];
afterEach(async () => {
  for (const s of stores.splice(0)) await s.close();
});
async function setup() {
  const store = new Store(':memory:');
  stores.push(store);
  await store.start();
  let now = 100000;
  const h = new Houses(new HollowDatabase(store), () => now, 'test');
  await h.start();
  const own = await h.owned('owner');
  const code = String(own.code);
  await h.db.query(
    'UPDATE lane_houses SET published=draft,published_hash=draft_hash WHERE owner=$1',
    ['owner'],
  );
  await h.db.transaction((q) =>
    h.candy.open(q, code, 'owner', String(own.hash)),
  );
  async function run(
    wallet: string,
    id: string,
    options: {
      ticks?: number;
      outcome?: string;
      hash?: string;
      ready?: boolean;
    } = {},
  ) {
    if (options.ready !== false) {
      await h.owned(wallet);
      await h.db.query(
        'UPDATE lane_houses SET published=draft,published_hash=draft_hash WHERE owner=$1',
        [wallet],
      );
    }
    await h.db.query(
      "INSERT INTO lane_runs(id,wallet,code,hash,house,seed,frames,outcome,ticks,x,y,z,created) VALUES($1,$2,$3,$4,'',1,'',$5,$6,12,1,2,$7)",
      [
        id,
        wallet,
        code,
        options.hash ?? String(own.hash),
        options.outcome ?? 'escaped',
        options.ticks ?? 1200,
        now,
      ],
    );
    return h.db.transaction((q) => h.candy.raid(q, id));
  }
  return {
    h,
    code,
    hash: String(own.hash),
    run,
    advance: () => {
      now += CANDY_RULES.duration + 1;
    },
  };
}
it('conserves funding across two raids, idempotent retries, round settlement and a new allocation', async () => {
  const { h, code, hash, run, advance } = await setup();
  expect(await run('hunter', 'run1')).toBe(100);
  expect(await h.db.transaction((q) => h.candy.raid(q, 'run1'))).toBe(0);
  expect(await run('hunter', 'run2')).toBe(0);
  expect(await run('hunter2', 'run3')).toBe(90);
  expect((await h.candy.status('owner')).round?.remaining).toBe(810);
  await h.db.transaction((q) => h.candy.open(q, code, 'owner', hash));
  expect((await h.candy.status('owner')).fund).toBe(CANDY_RULES.fixture - 1000);
  advance();
  await Promise.all([h.candy.status('owner'), h.candy.status('owner')]);
  expect((await h.candy.status('owner')).defended).toBe(810);
  expect((await h.candy.status('hunter')).hunted).toBe(100);
  await h.db.transaction((q) => h.candy.open(q, code, 'owner', hash));
  expect((await h.candy.status('owner')).fund).toBe(CANDY_RULES.fixture - 2000);
  const [credits] = await h.db.query(
    'SELECT SUM(amount) AS total FROM scream_candy_credits',
  );
  expect(Number(credits.total)).toBe(1000);
});
it('rejects self raids, short runs, failures, old hashes, unpublished hunters and linked tips', async () => {
  const { h, code, run } = await setup();
  expect(await run('owner', 'self')).toBe(0);
  expect(await run('fast', 'fast', { ticks: 899 })).toBe(0);
  expect(await run('caught', 'caught', { outcome: 'caught' })).toBe(0);
  expect(await run('old', 'old', { hash: 'old' })).toBe(0);
  expect(await run('new', 'new', { ready: false })).toBe(0);
  await h.economy.operate('linked', 'tip', code, 10, 'linked-tip-candy');
  expect(await run('linked', 'linked')).toBe(0);
  expect((await h.candy.status('owner')).round?.remaining).toBe(1000);
});
it('rolls back a failed credit and remains exactly once after an acknowledged payout or restart', async () => {
  const { h, run } = await setup();
  const [house] = await h.db.query(
    "SELECT * FROM lane_houses WHERE owner='owner'",
  );
  await h.owned('hunter');
  await h.db.query(
    "UPDATE lane_houses SET published=draft,published_hash=draft_hash WHERE owner='hunter'",
  );
  await h.db.query(
    "INSERT INTO lane_runs(id,wallet,code,hash,house,seed,frames,outcome,ticks,x,y,z,created) VALUES('crash','hunter',$1,$2,'',1,'','escaped',1200,12,1,2,100000)",
    [String(house.code), String(house.draft_hash)],
  );
  await expect(
    h.db.transaction(async (q) => {
      await h.candy.raid(q, 'crash');
      throw new Error('crash before commit');
    }),
  ).rejects.toThrow('crash');
  expect((await h.candy.status('owner')).round?.remaining).toBe(1000);
  const payouts = await Promise.all([
    h.db.transaction((q) => h.candy.raid(q, 'crash')),
    h.db.transaction((q) => h.candy.raid(q, 'crash')),
  ]);
  expect(payouts.sort()).toEqual([0, 100]);
  await h.candy.start();
  expect((await h.candy.status('owner')).fund).toBe(CANDY_RULES.fixture - 1000);
  expect(await run('hunter', 'after-ack')).toBe(0);
  expect((await h.candy.status('hunter')).hunted).toBe(100);
});
it('cannot publish a different reward layout mid-round or allocate unfunded rewards', async () => {
  const { h, code, advance } = await setup();
  await expect(
    h.db.transaction((q) => h.candy.open(q, code, 'owner', 'changed')),
  ).rejects.toThrow('active');
  advance();
  await h.db.query('UPDATE scream_candy_fund SET balance=999 WHERE id=1');
  await h.db.transaction((q) => h.candy.open(q, code, 'owner', 'changed'));
  const s = await h.candy.status('owner');
  expect(s.round?.settled).toBe(true);
  expect(s.fund).toBe(999);
});

it('night reports use actual credits, exclude other wallets and keep totals beyond the display limit', async () => {
  const { nightReport } = await import('../server/hollow/night-report');
  const { h, run } = await setup();
  await run('hunter', 'report-paid');
  await h.db.query(
    "UPDATE lane_runs SET scored=1,mic=$1 WHERE id='report-paid'",
    ['[{"tick":10,"peak":0.87}]'],
  );
  for (let i = 0; i < 51; i++) {
    await run('hunter', `report-repeat-${i}`);
    await h.db.query('UPDATE lane_runs SET scored=1 WHERE id=$1', [
      `report-repeat-${i}`,
    ]);
  }
  const hunter = await nightReport(h, 'hunter');
  expect(hunter.raids).toHaveLength(50);
  expect(hunter.totals).toEqual({ visits: 52, escaped: 52, stolen: 100 });
  expect(hunter.simulated).toBe(true);
  const owner = await nightReport(h, 'owner');
  expect(owner.defense).toEqual({
    visits: 52,
    found: 52,
    stopped: 0,
    lost: 100,
  });
  expect((await nightReport(h, 'stranger')).totals.stolen).toBe(0);
});
