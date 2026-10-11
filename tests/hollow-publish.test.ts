import { afterEach, describe, it, expect } from 'vitest';
import { B } from '../shared/house/blocks';
import { put } from '../shared/house/format';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
import { Houses, pack } from '../server/hollow/houses';
import { decodeHouse, encodeHouse, cloneHouse } from '../shared/house/format';
import {
  INPUT,
  startVisit,
  tickVisit,
  type Frame,
} from '../shared/house/simulation';
const stores: Store[] = [];
afterEach(async () => {
  for (const s of stores.splice(0)) await s.close();
});
async function setup() {
  const store = new Store(':memory:');
  stores.push(store);
  await store.start();
  let now = 100000;
  const houses = new Houses(new HollowDatabase(store), () => now);
  await houses.start();
  return { houses, advance: () => (now += 30000) };
}
function clear(h: ReturnType<typeof decodeHouse>, seed: number) {
  const s = startVisit(h, seed),
    frames: Frame[] = [];
  for (let i = 0; i < 700 && s.outcome === 'playing'; i++) {
    const bits = i < 260 ? INPUT.FORWARD : i < 321 ? INPUT.USE : INPUT.BACK;
    const frame = { bits, yaw: 3142, pitch: 0 };
    frames.push(frame);
    tickVisit(h, s, frame);
  }
  expect(s.outcome).toBe('escaped');
  return frames;
}
describe('verified draft publication', () => {
  it('publishes only the exact owner-cleared version and preserves the previous public house', async () => {
    const { houses, advance } = await setup();
    const own = await houses.owned('owner');
    await expect(houses.publish('owner', String(own.hash))).rejects.toThrow(
      'beat',
    );
    const t = await houses.ticket('owner', String(own.code), 'clear');
    advance();
    await houses.finish(
      'owner',
      t.id,
      pack(clear(decodeHouse(t.house), t.seed)),
    );
    await houses.publish('owner', t.hash);
    const original = await houses.publicHouse(String(own.code));
    const edited = cloneHouse(decodeHouse(own.house));
    edited.title = 'A changed house';
    const saved = await houses.save(
      'owner',
      encodeHouse(edited),
      String(own.hash),
    );
    expect(saved.clear).toBe(false);
    await expect(houses.publish('owner', String(saved.hash))).rejects.toThrow(
      'beat',
    );
    expect((await houses.publicHouse(String(own.code))).hash).toBe(
      original.hash,
    );
  });
  it('rejects changed drafts, stolen tickets, replay reuse, bad logs and edit conflicts', async () => {
    const { houses, advance } = await setup();
    const own = await houses.owned('owner'),
      t = await houses.ticket('owner', String(own.code), 'clear');
    await expect(
      houses.ticket('other', String(own.code), 'clear'),
    ).rejects.toThrow('owner');
    advance();
    const frames = pack(clear(decodeHouse(t.house), t.seed));
    await expect(houses.finish('other', t.id, frames)).rejects.toThrow();
    const h = decodeHouse(own.house);
    h.title = 'changed';
    await houses.save('owner', encodeHouse(h), String(own.hash));
    await expect(houses.finish('owner', t.id, frames)).rejects.toThrow(
      'changed',
    );
    expect(
      (await houses.save('owner', encodeHouse(h), String(own.hash))).house,
    ).toEqual(encodeHouse(h));
    h.title = 'conflicting edit';
    await expect(
      houses.save('owner', encodeHouse(h), String(own.hash)),
    ).rejects.toThrow('another window');
    await expect(
      houses.finish('owner', t.id, pack([{ bits: 999, yaw: 0, pitch: 0 }])),
    ).rejects.toThrow('input');
  });
  it('requires real elapsed time and makes duplicate finishes idempotent', async () => {
    const { houses, advance } = await setup();
    const own = await houses.owned('owner'),
      t = await houses.ticket('owner', String(own.code), 'clear'),
      frames = pack(clear(decodeHouse(t.house), t.seed));
    await expect(houses.finish('owner', t.id, frames)).rejects.toThrow(
      'real time',
    );
    advance();
    expect(await houses.finish('owner', t.id, frames)).toMatchObject({
      verified: true,
      outcome: 'escaped',
    });
    expect(await houses.finish('owner', t.id, frames)).toMatchObject({
      verified: true,
      outcome: 'escaped',
    });
    const rows = await houses.db.query(
      'SELECT COUNT(*) AS count FROM lane_runs',
    );
    expect(Number(rows[0].count)).toBe(1);
  });
});

it('publishes the guide trap and decor palette for a free player while retaining the original cosmetic guard', async () => {
  const { houses, advance } = await setup();
  const own = await houses.claimPlot('free-builder', 3, 0);
  const h = decodeHouse(own.house, true);
  h.candy = { x: 12, y: 1, z: 18 };
  put(h, 12, 1, 18, B.CANDY);
  [B.SPIKES, B.SCREAMER, B.DECOY, B.ROOF, B.LEAVES].forEach((b, i) =>
    put(h, 6 + i, 1, 10, b),
  );
  const saved = await houses.save(
    'free-builder',
    encodeHouse(h),
    String(own.hash),
  );
  const t = await houses.ticket('free-builder', String(own.code), 'clear');
  advance();
  await houses.finish(
    'free-builder',
    t.id,
    pack(clear(decodeHouse(t.house), t.seed)),
  );
  await expect(
    houses.publish('free-builder', String(saved.hash)),
  ).resolves.toEqual({
    code: String(own.code),
  });
  expect((await houses.candy.status('free-builder')).round?.remaining).toBe(
    1000,
  );
  const other = await houses.owned('cosmetics-guard'),
    locked = decodeHouse(other.house);
  put(locked, 6, 1, 10, 35);
  const draft = await houses.save(
    'cosmetics-guard',
    encodeHouse(locked),
    String(other.hash),
  );
  await expect(
    houses.publish('cosmetics-guard', String(draft.hash)),
  ).rejects.toThrow('cosmetic pack');
});
