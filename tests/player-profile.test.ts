import { expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { playerProfile } from '../shared/player-profile';
import { createGameServer } from '../server/app';
import { Store } from '../server/store';
import { HollowDatabase } from '../server/hollow/database';
import {
  readPlayerProfile,
  savePlayerProfile,
} from '../server/hollow/player-profile';
import type { StreetGhost } from '../server/hollow/StreetRoom';
const publicWallet = '11111111111111111111111111111111';

it('validates public addresses and names without accepting private keys, markup or oversized values', () => {
  expect(
    playerProfile({
      name: '  Night Stalker  ',
      publicWallet: ` ${publicWallet} `,
    }),
  ).toEqual({ name: 'Night Stalker', publicWallet });
  expect(playerProfile({ name: 'Mara', publicWallet: '' })).toEqual({
    name: 'Mara',
    publicWallet: '',
  });
  for (const name of ['', 'a', 'x'.repeat(21), '<script>', 'line\nbreak'])
    expect(() => playerProfile({ name, publicWallet })).toThrow('username');
  for (const wallet of [
    'not-a-wallet',
    '0'.repeat(32),
    '1'.repeat(64),
    ['private key'],
    null,
  ])
    expect(() => playerProfile({ name: 'Mara', publicWallet: wallet })).toThrow(
      'public address',
    );
});

it('migrates existing profiles and keeps avatar and account identity when saving menu fields', async () => {
  const store = new Store(':memory:');
  store.sqlite!.exec(
    "CREATE TABLE profiles(wallet TEXT PRIMARY KEY,name TEXT NOT NULL,character INTEGER NOT NULL DEFAULT 0); INSERT INTO profiles VALUES('existing','Old Name',3)",
  );
  await store.start();
  const db = new HollowDatabase(store);
  try {
    expect(await readPlayerProfile(db, 'existing')).toEqual({
      name: 'Old Name',
      publicWallet: '',
    });
    await savePlayerProfile(db, 'existing', { name: 'Mara', publicWallet });
    await store.start();
    expect(await readPlayerProfile(db, 'existing')).toEqual({
      name: 'Mara',
      publicWallet,
    });
    expect(
      store.sqlite!.prepare('SELECT wallet,character FROM profiles').get(),
    ).toMatchObject({ wallet: 'existing', character: 3 });
    await store.profile('existing', 'Legacy Name', 2);
    expect((await readPlayerProfile(db, 'existing'))?.publicWallet).toBe(
      publicWallet,
    );
  } finally {
    await store.close();
  }
});

it('authenticates profile edits, publishes saved names, keeps pasted addresses private and counts actual street connections', async () => {
  const app = await createGameServer({ port: 0 });
  const url = `http://127.0.0.1:${app.port}`;
  const rooms: Room[] = [];
  const api = async (
    path: string,
    token = '',
    method = 'GET',
    body?: unknown,
  ) =>
    fetch(url + '/api/hollow' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    expect(
      (await api('/profile', '', 'PUT', { name: 'Mara', publicWallet })).status,
    ).toBe(401);
    const a = await app.hollow.session('owner-a'),
      b = await app.hollow.session('owner-b');
    expect(await (await api('/profile', a)).json()).toBe(null);
    expect(
      (await api('/profile', a, 'PUT', { name: '<script>', publicWallet }))
        .status,
    ).toBe(400);
    expect(
      (await api('/profile', a, 'PUT', { name: 'Mara', publicWallet })).status,
    ).toBe(200);
    expect(await (await api('/profile', b)).json()).toBe(null);
    expect(await app.hollow.identity(a)).toBe('owner-a');
    const ownA = await app.hollow.owned('owner-a'),
      ownB = await app.hollow.owned('owner-b');
    expect(ownA.code).not.toBe(ownB.code);
    expect(await (await api('/presence')).json()).toMatchObject({ players: 0 });
    const client = new Client(url);
    const first = await client.joinOrCreate('street', {
      token: a,
      name: 'Forged Name',
    });
    rooms.push(first);
    first.onMessage('*', () => {});
    const second = await client.joinOrCreate('street', { token: b });
    rooms.push(second);
    second.onMessage('*', () => {});
    const snapshot = await new Promise<StreetGhost[]>((resolve) => {
      first.onMessage('street', resolve);
      first.send('sync');
    });
    expect(snapshot.find((p) => p.id === first.sessionId)?.name).toBe('Mara');
    expect(JSON.stringify(snapshot)).not.toContain(publicWallet);
    expect(await (await api('/presence')).json()).toMatchObject({
      players: 2,
      streetCapacity: 100,
    });
    await first.leave();
    await expect
      .poll(async () => (await (await api('/presence')).json()).players)
      .toBe(1);
    await second.leave();
    await expect
      .poll(async () => (await (await api('/presence')).json()).players)
      .toBe(0);
  } finally {
    for (const room of rooms) if (room.connection.isOpen) await room.leave();
    await app.server.gracefullyShutdown(false);
  }
});
