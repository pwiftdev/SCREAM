import { afterEach, expect, it } from 'vitest';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
import { Houses } from '../server/hollow/houses';
import {
  fitsPlot,
  starterHouse,
  LEGACY_PLOT_TIER,
} from '../shared/house/plots';
import { decodeHouse, encodeHouse, put } from '../shared/house/format';
import { B } from '../shared/house/blocks';
const stores: Store[] = [];
afterEach(async () => {
  for (const s of stores.splice(0)) await s.close();
});
async function setup(mode = 'off') {
  const store = new Store(':memory:');
  stores.push(store);
  await store.start();
  const h = new Houses(new HollowDatabase(store), Date.now, mode);
  await h.start();
  return h;
}
it('offers free entry, rejects forged holder choices and persists a chosen empty-candy house', async () => {
  const h = await setup();
  await expect(h.claimPlot('free', 4, 0)).rejects.toThrow('planned and locked');
  const own = await h.claimPlot('free', 3, 1);
  expect(own.plot).toEqual({ slot: 3, tier: 0, style: 1 });
  expect(decodeHouse(own.house, true).blocks.includes(B.CANDY)).toBe(false);
  expect(await h.claimPlot('free', 3, 1)).toEqual(own);
  expect((await h.ticket('free', 'HOLLOW1', 'visit')).id).toBeTruthy();
  await expect(h.claimPlot('free', 5, 1)).rejects.toThrow('permanent');
  const draft = decodeHouse(own.house, true);
  put(draft, 0, 1, 2, B.BRICK);
  await expect(
    h.save('free', encodeHouse(draft), String(own.hash)),
  ).rejects.toThrow('boundary');
  expect((await h.owned('free')).plot?.slot).toBe(3);
});
it('arbitrates concurrent claims without duplicate plots or resetting the winner draft', async () => {
  const h = await setup();
  const results = await Promise.allSettled([
    h.claimPlot('a', 3, 0),
    h.claimPlot('b', 3, 0),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const winner = results[0].status === 'fulfilled' ? 'a' : 'b',
    own = await h.owned(winner);
  const draft = decodeHouse(own.house, true);
  draft.title = 'Keep my changes';
  await h.save(winner, encodeHouse(draft), String(own.hash));
  expect((await h.claimPlot(winner, 3, 0)).house.title).toBe('Keep my changes');
});
it('all nine shells fit their true build bounds and never hide candy automatically', () => {
  for (let tier = 0; tier < 3; tier++)
    for (let style = 0; style < 3; style++) {
      const h = starterHouse(tier, style);
      expect(fitsPlot(h, tier)).toBe(true);
      expect(h.blocks.includes(B.CANDY)).toBe(false);
      h.candy = { x: 12, y: 1, z: 18 };
      put(h, 12, 1, 18, B.CANDY);
      expect(() => decodeHouse(encodeHouse(h))).not.toThrow();
    }
});

it('counts earned candy holdings even when the legacy economy is off and has no account row', async () => {
  const h = await setup();
  await h.db.query(
    "INSERT INTO scream_candy_credits(id,round_id,wallet,amount,kind) VALUES('earned-fixture','fixture','earned',100000,'defended')",
  );
  expect((await h.holdings('earned')).balance).toBe(100000);
  await expect(h.claimPlot('earned', 6, 0)).rejects.toThrow(
    'planned and locked',
  );
});

it('preserves editable full-size bounds for a previously published house on its first claim', async () => {
  const h = await setup();
  const old = await h.owned('legacy');
  const draft = decodeHouse(old.house, true);
  put(draft, 0, 0, 0, B.BRICK);
  put(draft, 23, 0, 23, B.BRICK);
  await h.save('legacy', encodeHouse(draft), String(old.hash));
  await h.db.query(
    'UPDATE lane_houses SET published=draft,published_hash=draft_hash WHERE owner=$1',
    ['legacy'],
  );
  const claimed = await h.claimPlot('legacy', 3, 0);
  expect(claimed.plot?.tier).toBe(LEGACY_PLOT_TIER);
  expect(decodeHouse(claimed.house, true).blocks).toEqual(draft.blocks);
  draft.title = 'My original full-size house';
  await expect(
    h.save('legacy', encodeHouse(draft), String(claimed.hash)),
  ).resolves.toMatchObject({
    house: { title: draft.title },
  });
  expect(fitsPlot(draft, 0)).toBe(false);
  expect(fitsPlot(draft, 99)).toBe(false);
});
