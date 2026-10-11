import { it, expect } from 'vitest';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
import { Houses, pack } from '../server/hollow/houses';
import { LiveVisits } from '../server/hollow/live-visits';
it('live windows never expose inputs before the five second delay and enforce ownership/order', async () => {
  const store = new Store(':memory:');
  await store.start();
  let now = 100000;
  const houses = new Houses(new HollowDatabase(store), () => now);
  await houses.start();
  const live = new LiveVisits(houses);
  try {
    const own = await houses.owned('owner');
    const draft = await houses.ticket('owner', String(own.code), 'clear');
    await expect(
      live.push('owner', draft.id, 0, pack([{ bits: 0, yaw: 3142, pitch: 0 }])),
    ).rejects.toThrow('ended');
    const t = await houses.ticket('visitor', 'HOLLOW1', 'visit');
    await expect(live.push('visitor', t.id, 0, pack([]))).rejects.toThrow(
      'two seconds',
    );
    now += 1000;
    const frames = Array.from({ length: 60 }, () => ({
      bits: 0,
      yaw: 3142,
      pitch: 0,
    }));
    await live.push('visitor', t.id, 0, pack(frames));
    expect((await live.read(t.id)).frames).toHaveLength(0);
    now += 4999;
    expect((await live.read(t.id)).frames).toHaveLength(0);
    now++;
    expect((await live.read(t.id)).frames).toHaveLength(60);
    await expect(live.push('thief', t.id, 60, pack(frames))).rejects.toThrow(
      'ended',
    );
    await expect(live.push('visitor', t.id, 100, pack(frames))).rejects.toThrow(
      'order',
    );
    expect(await live.push('visitor', t.id, 0, pack(frames))).toEqual({
      accepted: 60,
    });
  } finally {
    await store.close();
  }
});
