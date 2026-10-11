import { it, expect, afterEach } from 'vitest';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
import { Houses, pack } from '../server/hollow/houses';
import { LaneEconomy } from '../server/hollow/economy';
import { decodeHouse, encodeHouse } from '../shared/house/format';
import {
  INPUT,
  startVisit,
  tickVisit,
  type Frame,
} from '../shared/house/simulation';
import { H } from '../shared/config';
const stores: Store[] = [];
afterEach(async () => {
  for (const s of stores.splice(0)) await s.close();
});
async function setup() {
  const store = new Store(':memory:');
  stores.push(store);
  await store.start();
  let now = 100000;
  const houses = new Houses(new HollowDatabase(store), () => now, 'test');
  await houses.start();
  const own = await houses.owned('owner');
  async function finish(
    wallet: string,
    code: string,
    purpose: 'clear' | 'visit',
  ) {
    const t = await houses.ticket(wallet, code, purpose),
      h = decodeHouse(t.house),
      s = startVisit(h, t.seed),
      frames: Frame[] = [];
    for (let n = 0; n < 700 && s.outcome === 'playing'; n++) {
      const f = {
        bits: n < 260 ? INPUT.FORWARD : n < 321 ? INPUT.USE : INPUT.BACK,
        yaw: 3142,
        pitch: 0,
      };
      frames.push(f);
      tickVisit(h, s, f);
    }
    now += 30000;
    return houses.finish(wallet, t.id, pack(frames));
  }
  await finish('owner', String(own.code), 'clear');
  await houses.publish('owner', String(own.hash));
  return { houses, own, finish, advance: (ms: number) => (now += ms) };
}
it('deposits exactly once, freezes editing, refuses the owner and pays one verified visitor', async () => {
  const { houses, own, finish } = await setup(),
    e = houses.economy,
    code = String(own.code);
  await e.account('visitor');
  await Promise.all([
    e.operate('owner', 'deposit', code, 1000, 'deposit-0001'),
    e.operate('owner', 'deposit', code, 1000, 'deposit-0001'),
  ]);
  expect((await e.account('owner')).balance).toBe(999000);
  await expect(
    houses.save(
      'owner',
      { ...own.house, title: 'Changed while frozen' },
      String(own.hash),
    ),
  ).rejects.toThrow('frozen');
  await finish('owner', code, 'visit');
  expect((await e.bounty(code)).balance).toBe(1000);
  await finish('visitor', code, 'visit');
  expect((await e.bounty(code)).balance).toBe(0);
  expect((await e.account('visitor')).balance).toBe(1001000);
  await finish('second', code, 'visit');
  expect((await e.account('visitor')).balance).toBe(1001000);
});
it('recent tips disqualify linked wallets; notice remains claimable until 24 hours', async () => {
  const { houses, own, finish, advance } = await setup(),
    e = houses.economy,
    code = String(own.code);
  await e.operate('owner', 'deposit', code, 1000, 'deposit-0002');
  await e.operate('linked', 'tip', code, 10, 'tip-00000002');
  await finish('linked', code, 'visit');
  expect((await e.bounty(code)).balance).toBe(1000);
  await e.operate('owner', 'notice', code, 0, 'notice-0002');
  await expect(
    e.operate('owner', 'withdraw', code, 0, 'withdraw-0002'),
  ).rejects.toThrow('24-hour');
  advance(H.WITHDRAW_MS);
  await e.operate('owner', 'withdraw', code, 0, 'withdraw-0002');
  await e.operate('owner', 'withdraw', code, 0, 'withdraw-0002');
  expect((await e.bounty(code)).balance).toBe(0);
  expect((await e.account('owner')).balance).toBe(1000010);
});
it('cosmetics split the pretend purchase into burn and pool, then distribute once', async () => {
  const { houses, own } = await setup(),
    e = houses.economy;
  await e.operate('owner', 'premium', String(own.code), 0, 'premium-0003');
  await e.operate('owner', 'premium', String(own.code), 0, 'premium-0003');
  expect((await e.account('owner')).premium).toBe(true);
  expect((await e.account('owner')).balance).toBe(1000000 - H.PREMIUM_COST);
  await e.prizePool('week-2026-10-11', ['a', 'b', 'c']);
  expect(await e.prizePool('week-2026-10-11', ['a', 'b', 'c'])).toBe(0);
  const rows = await houses.db.query(
    "SELECT SUM(amount) AS total FROM lane_ledger WHERE kind='prize'",
  );
  expect(Number(rows[0].total)).toBe(
    H.PREMIUM_COST * (1 - H.PREMIUM_BURN_BPS / 10000),
  );
});
it('fails closed in live/off and rejects operation mutation without changing balances', async () => {
  const { houses, own } = await setup();
  expect(() => new LaneEconomy(houses.db, 'live')).toThrow('sign-off');
  const off = new LaneEconomy(houses.db, 'off');
  await expect(
    off.operate('owner', 'deposit', String(own.code), 100, 'deposit-0004'),
  ).rejects.toThrow('off');
  await houses.economy.operate(
    'owner',
    'deposit',
    String(own.code),
    100,
    'deposit-0004',
  );
  await expect(
    houses.economy.operate(
      'owner',
      'deposit',
      String(own.code),
      200,
      'deposit-0004',
    ),
  ).rejects.toThrow('reused');
  expect((await houses.economy.bounty(String(own.code))).balance).toBe(100);
  const h = decodeHouse(own.house);
  h.title = 'still frozen';
  await expect(
    houses.save('owner', encodeHouse(h), String(own.hash)),
  ).rejects.toThrow('frozen');
});

it('keeps Final Night funding separate from the weekly pool', async () => {
  const { houses, own } = await setup(),
    e = houses.economy,
    code = String(own.code);
  await e.operate('owner', 'weekly', code, 300, 'weekly-topup');
  await e.operate('owner', 'season', code, 1000, 'season-topup');
  expect(await e.prizePool('week-2026-10-11', ['weekly-winner'])).toBe(300);
  expect(await e.prizePool('final-2026', ['season-winner'])).toBe(1000);
  expect(await e.prizePool('final-2026', ['season-winner'])).toBe(0);
});
