import { expect, it } from 'vitest';
import { Client } from '@colyseus/sdk';
import { StreetLife } from '../server/hollow/street-combat';
import {
  distantSpawn,
  SPAWN_SITES,
  WEAPON_SITES,
  meleeTarget,
} from '../shared/house/combat';
import { worldBlocked } from '../shared/house/neighborhood';
import { plotLocation } from '../shared/house/world-layout';
import { createGameServer } from '../server/app';
const pause = (ms = 120) => new Promise((r) => setTimeout(r, ms));
it('selects walkable distant spawns and safely handles crowded areas', () => {
  expect(SPAWN_SITES.length).toBeGreaterThan(5);
  for (const p of SPAWN_SITES) expect(worldBlocked(p.x, p.z)).toBe(false);
  const a = distantSpawn([], () => 0),
    b = distantSpawn([a], () => 0);
  expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(100);
  expect(SPAWN_SITES).toContainEqual(distantSpawn(SPAWN_SITES, () => 0));
});
it('validates melee aim, cover, elevation, invulnerability, cooldown and stamina', () => {
  const a = new StreetLife(),
    b = new StreetLife();
  Object.assign(a, { x: 0, z: 260, yaw: 0 });
  Object.assign(b, { x: 0, z: 258 });
  expect(a.attack([b], 100, 10000)?.target).toBe(b);
  expect(b.health).toBe(75);
  expect(a.attack([b], 100, 10001)).toBeUndefined();
  expect(a.attack([b], 0, 11000)).toBeUndefined();
  b.shieldUntil = 12000;
  expect(a.attack([b], 100, 11000)?.target).toBeUndefined();
  b.shieldUntil = 0;
  b.z = 264;
  expect(a.attack([b], 100, 12000)?.target).toBeUndefined();
  b.z = 261;
  expect(meleeTarget(a, b, 'crowbar', 13000)).toBe(false);
  Object.assign(a, { x: -20, z: 23, yaw: Math.PI });
  Object.assign(b, { x: -20, z: 25 });
  expect(meleeTarget(a, b, 'shovel', 13000)).toBe(false);
});
it('requires proximity for the shovel, records one death and respawns with protection', () => {
  const a = new StreetLife(),
    b = new StreetLife();
  expect(a.pickup()).toBe(false);
  a.equip('shovel');
  expect(a.weapon).toBe('crowbar');
  Object.assign(a, WEAPON_SITES[0]);
  expect(a.pickup()).toBe(true);
  expect(a.pickup()).toBe(false);
  Object.assign(a, { x: 0, z: 260, yaw: 0 });
  Object.assign(b, { x: 0, z: 258 });
  for (let i = 0; i < 3; i++) a.attack([b], 100, 10000 + i * 1100);
  expect(b.health).toBe(0);
  expect(a.kills).toBe(1);
  expect(b.deaths).toBe(1);
  expect(a.attack([b], 100, 14000)?.target).toBeUndefined();
  expect(a.kills).toBe(1);
  expect(b.attack([a], 100, 15000)).toBeUndefined();
  expect(b.canInteract(15000)).toBe(false);
  b.spawn([a], 20000);
  expect(b.health).toBe(100);
  expect(b.shieldUntil).toBe(25000);
  expect(b.weapon).toBe('crowbar');
  expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(100);
});
it('keeps combat authoritative across connections and rejects remote plot access', async () => {
  const app = await createGameServer({ port: 0 }),
    client = new Client(`ws://127.0.0.1:${app.port}`);
  const tokenA = await app.hollow.session('combat-a'),
    tokenB = await app.hollow.session('combat-b');
  const a = await client.joinOrCreate('street', {
    token: tokenA,
    spawn: { x: 0, z: 0, yaw: 0 },
  });
  const b = await client.joinOrCreate('street', { token: tokenB });
  a.onMessage('*', () => {});
  b.onMessage('*', () => {});
  const sa = app.outdoor.get('combat-a'),
    sb = app.outdoor.get('combat-b');
  try {
    expect(sa.life.z).not.toBe(0);
    await expect(
      client.joinOrCreate('street', { token: tokenA }),
    ).rejects.toThrow('another tab');
    const post = async (path: string, body: unknown) =>
      fetch(`http://127.0.0.1:${app.port}/api/hollow${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenA}`,
        },
        body: JSON.stringify(body),
      });
    Object.assign(sa.life, { x: 0, z: 260, yaw: 0, shieldUntil: 0 });
    Object.assign(sb.life, { x: 0, z: 258, shieldUntil: 0 });
    expect((await post('/plots', { slot: 3, style: 0 })).status).toBe(400);
    a.send('equip', 'shovel');
    a.send('attack', { damage: 99999, target: b.sessionId });
    await pause();
    expect(sb.life.health).toBe(75);
    expect(sa.life.weapon).toBe('crowbar');
    a.send('attack');
    await pause();
    expect(sb.life.health).toBe(75);
    await b.leave();
    await pause();
    expect(sb.life.health).toBe(0);
    const rejoin = await client.joinOrCreate('street', {
      token: tokenB,
      spawn: { x: 150, z: 150, yaw: 0 },
    });
    rejoin.onMessage('*', () => {});
    expect(sb.life.health).toBe(0);
    expect(sb.life.z).toBe(258);
    sb.life.deadUntil = Date.now() - 1;
    await pause();
    expect(sb.life.health).toBe(100);
    expect(sb.life.shieldUntil).toBeGreaterThan(Date.now());
    await rejoin.leave();
    Object.assign(sa.life, plotLocation(3).approach, { attackAt: 0 });
    const claim = await post('/plots', { slot: 3, style: 0 });
    expect(claim.status).toBe(200);
    expect((await post('/build-access', {})).status).toBe(200);
    sa.life.damagedAt = Date.now();
    expect((await post('/build-access', {})).status).toBe(400);
    sa.life.damagedAt = -Infinity;
    Object.assign(sa.life, plotLocation(0).approach);
    expect(
      (await post('/ticket', { code: 'HOLLOW1', purpose: 'visit' })).status,
    ).toBe(200);
    expect((await app.hollow.owned('combat-a')).published).toBe(false);
  } finally {
    await a.leave();
    await app.server.gracefullyShutdown(false);
  }
}, 15000);
