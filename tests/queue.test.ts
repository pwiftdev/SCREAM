import { it, expect, beforeAll, afterAll } from 'vitest';
import { Queue, Hub, type QueueEntry } from '../server/queue';
import { C } from '../shared/config';
import { Simulation } from '../shared/simulation';
import { initPhysics } from '../shared/physics';
import { Store } from '../server/store';
import { WalletAuth } from '../server/auth';
import { generateKeyPairSync, sign } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import { loginMessage } from '../shared/auth';
const entry = (
  id: string,
  role: QueueEntry['role'] = 'survivor',
  joinedAt = 0,
): QueueEntry => ({
  id,
  wallet: id,
  name: id,
  role,
  joinedAt,
  holder: false,
  skipped: 0,
  ready: false,
  character: 0,
});
beforeAll(initPhysics);
const store = new Store(':memory:');
afterAll(() => store.close());
it('five seats require ready check, roles survive allocation and sixth waits', () => {
  const q = new Queue();
  q.add(entry('k', 'killer'));
  for (let i = 0; i < 5; i++) q.add(entry(`p${i}`));
  q.tick(100);
  expect(q.selected).toHaveLength(5);
  expect(q.readyUntil).toBe(100 + C.READY_MS);
  for (const e of q.selected) q.ready(e.id, true, 200);
  const seated = q.tick(200)!;
  expect(seated[0].offered).toBe('killer');
  expect(seated.slice(1).every((e) => e.offered === 'survivor')).toBe(true);
  expect(q.entries).toHaveLength(1);
  expect(q.tick(100000)).toBeNull();
});
it('minimum starts only after 90 seconds, declines return to back and ready expiry resets', () => {
  const q = new Queue();
  q.add(entry('k', 'killer'));
  for (let i = 0; i < 3; i++) q.add(entry(`p${i}`));
  q.tick(C.MIN_WAIT_MS - 1);
  expect(q.selected).toHaveLength(0);
  q.tick(C.MIN_WAIT_MS);
  expect(q.selected).toHaveLength(4);
  q.ready('p0', false, C.MIN_WAIT_MS + 1);
  expect(q.entries.at(-1)?.id).toBe('p0');
  expect(q.selected).toHaveLength(0);
  q.tick(C.MIN_WAIT_MS + 2);
  q.tick(C.MIN_WAIT_MS + C.READY_MS + 3);
  expect(q.readyUntil).toBe(0);
});
it('holder priority cannot repeatedly skip a non-holder', () => {
  const q = new Queue();
  const old = entry('old');
  q.add(old);
  for (let i = 0; i < 5; i++) {
    const h = entry(`h${i}`, 'survivor', 100);
    h.holder = true;
    q.add(h);
  }
  q.add(entry('k', 'killer'));
  q.tick(200);
  expect(q.selected.some((e) => e.id === 'old')).toBe(false);
  expect(old.skipped).toBe(1);
  q.cancel();
  expect(q.ordered()[0].id).toBe('old');
});
it('spectators never get an undelayed initial or final snapshot; tickets are room-bound and single use', () => {
  const h = new Hub(),
    s = new Simulation(1, 10000, 'match');
  h.claim('match');
  h.publish(s.snapshot());
  expect(h.delayed(19999)).toBeUndefined();
  expect(h.delayed(20000)?.now).toBe(10000);
  s.state.now = 11000;
  s.state.phase = 'finished';
  h.publish(s.snapshot());
  expect(h.delayed(20000)?.phase).toBe('lobby');
  expect(h.delayed(21000)?.phase).toBe('finished');
  const t = h.ticket(entry('a'), 'match');
  expect(h.redeem(t, 'other')).toBeUndefined();
  expect(h.redeem(t, 'match')?.id).toBe('a');
  expect(h.redeem(t, 'match')).toBeUndefined();
  s.dispose();
});
it('leaderboard results are idempotent across repeated acknowledgements', async () => {
  await store.start();
  const s = new Simulation(1, 10000, 'score');
  s.add('a', 'Mara', 'survivor')!.points.Survival = 1500;
  await store.profile('wallet', 'Mara', 0);
  await store.save(s.snapshot(), new Map([['a', 'wallet']]));
  await store.save(s.snapshot(), new Map([['a', 'wallet']]));
  expect((await store.leaderboard())[0]).toMatchObject({
    points: 1500,
    matches: 1,
  });
  s.dispose();
});
it('profile signature binds wallet and nonce and rejects expiry and modified signatures', () => {
  let now = 100000;
  const auth = new WalletAuth(undefined, () => now);
  const pair = generateKeyPairSync('ed25519');
  const raw = pair.publicKey
    .export({ format: 'der', type: 'spki' })
    .subarray(-32);
  const wallet = new PublicKey(raw).toBase58(),
    nonce = auth.nonce();
  const signature = sign(
    null,
    Buffer.from(loginMessage(wallet, nonce)),
    pair.privateKey,
  ).toString('base64');
  expect(auth.verify({ wallet, nonce, signature })).toBe(wallet);
  expect(auth.verify({ wallet, nonce, signature: 'invalid' })).toBeNull();
  now += 601000;
  expect(auth.verify({ wallet, nonce, signature })).toBeNull();
});
