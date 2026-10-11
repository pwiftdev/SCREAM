import { it, expect } from 'vitest';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
import { Houses } from '../server/hollow/houses';
import { Moderation } from '../server/hollow/moderation';
import { H } from '../shared/config';
import { seededHouse } from '../shared/house/samples';
import { validateHouse } from '../shared/house/format';
it('ships fifteen valid original houses', () => {
  for (let i = 0; i < 15; i++)
    expect(() => validateHouse(seededHouse(i))).not.toThrow();
});
it('distinct reports hide a house, allowlisted review restores it, and bans revoke sessions', async () => {
  const store = new Store(':memory:');
  await store.start();
  const houses = new Houses(new HollowDatabase(store));
  await houses.start();
  const moderation = new Moderation(houses, 'moderator');
  await moderation.start();
  try {
    await expect(
      moderation.review('stranger', 'HOLLOW1', 'approve'),
    ).rejects.toThrow('allowlist');
    for (let i = 0; i < 10; i++)
      await moderation.report('same-wallet', 'HOLLOW1', 'inappropriate sign');
    expect(await houses.publicHouse('HOLLOW1')).toBeDefined();
    for (let i = 1; i < H.REPORT_AUTOHIDE; i++)
      await moderation.report(`wallet-${i}`, 'HOLLOW1', 'inappropriate sign');
    await expect(houses.publicHouse('HOLLOW1')).rejects.toThrow('closed');
    await moderation.review('moderator', 'HOLLOW1', 'restore');
    expect(await houses.publicHouse('HOLLOW1')).toBeDefined();
    const token = await houses.session('lane:sample:0');
    await moderation.review('moderator', 'HOLLOW1', 'ban');
    await expect(houses.identity(token)).rejects.toThrow('expired');
    await expect(moderation.allowed('lane:sample:0')).rejects.toThrow('banned');
  } finally {
    await store.close();
  }
});
