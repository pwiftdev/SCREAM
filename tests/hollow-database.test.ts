import { expect, it } from 'vitest';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
it('serializes readers behind transactions and rolls back a failed write', async () => {
  const store = new Store(':memory:');
  await store.start();
  const db = new HollowDatabase(store);
  await db.start();
  expect(
    await db.query('SELECT $2 AS second,$1 AS first,$2 AS repeated', [1, 2]),
  ).toEqual([{ second: 2, first: 1, repeated: 2 }]);
  let release!: () => void, started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    const write = db.transaction(async (q) => {
      await q(
        'INSERT INTO lane_sessions(token,wallet,expires) VALUES($1,$2,$3)',
        ['token', 'wallet', 100],
      );
      started();
      await blocked;
      throw new Error('simulated crash before commit');
    });
    const rejected = expect(write).rejects.toThrow('before commit');
    await ready;
    let completed = false;
    const read = db.query('SELECT * FROM lane_sessions').then((rows) => {
      completed = true;
      return rows;
    });
    await Promise.resolve();
    expect(completed).toBe(false);
    release();
    await rejected;
    expect(await read).toEqual([]);
  } finally {
    release();
    await store.close();
  }
});
