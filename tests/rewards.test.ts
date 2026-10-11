import { it, expect, vi } from 'vitest';
import { Ledger, type LedgerStore, type Reward } from '../server/house/ledger';
import { Transfers, type TransferPort } from '../server/house/transfers';
import { createRewards } from '../server/house';
import { Store } from '../server/store';
import type { Snapshot } from '../shared/types';
import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { solanaPort } from '../server/house/solana';
it('the upgraded RPC client and house signer work against a local fake provider', async () => {
  const connection = new Connection('http://127.0.0.1:1', {
    fetch: async (_url, init) => {
      const request = JSON.parse(String(init?.body));
      const value =
        request.method === 'getLatestBlockhash'
          ? {
              blockhash: Keypair.generate().publicKey.toBase58(),
              lastValidBlockHeight: 100,
            }
          : 123;
      return new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: request.id,
          result: { context: { slot: 1 }, value },
        }),
        { status: 200 },
      );
    },
  });
  const house = Keypair.generate(),
    recipient = Keypair.generate();
  expect(await connection.getBalance(house.publicKey)).toBe(123);
  const signed = await solanaPort(connection, house).prepare({
    id: 'test',
    wallet: recipient.publicKey.toBase58(),
    lamports: '100',
    status: 'pending',
  });
  const transaction = Transaction.from(Buffer.from(signed.raw, 'base64'));
  expect(transaction.verifySignatures()).toBe(true);
  expect(
    transaction.instructions[0].keys[1].pubkey.equals(recipient.publicKey),
  ).toBe(true);
  expect(signed.lastValid).toBe(100);
});
class Memory implements LedgerStore {
  saved?: Reward[];
  owned = true;
  failWrite = false;
  afterWrite?: () => void;
  async load() {
    return structuredClone(this.saved);
  }
  async write(json: string) {
    if (this.failWrite) throw new Error('disk failure');
    this.saved = JSON.parse(json);
    this.afterWrite?.();
  }
  assertAvailable() {
    if (!this.owned) throw new Error('lease lost');
  }
  async close() {
    this.owned = false;
  }
}
async function setup(store = new Memory()) {
  const ledger = new Ledger(store);
  await ledger.start();
  if (!ledger.rewards.length)
    await ledger.add([
      {
        id: 'test:day:survivor',
        wallet: 'wallet',
        lamports: '100',
        status: 'pending',
      },
    ]);
  const port = {
    prepare: vi.fn(async () => ({
      signature: 'sig-1',
      raw: 'signed-bytes',
      lastValid: 10,
    })),
    status: vi.fn<TransferPort['status']>(async () => 'missing'),
    height: vi.fn(async () => 5),
    broadcast: vi.fn(async () => {}),
  };
  return { store, ledger, port, transfers: new Transfers(ledger, port) };
}
it('off mode does not open a ledger, call a provider or need keys', async () => {
  const rewards = await createRewards({} as Store, {});
  expect(rewards.mode).toBe('off');
  expect(rewards.healthy()).toBe(true);
  await rewards.close();
});
it('nightly winners are selected per UTC day and role with deterministic ties and no current-day payout', async () => {
  const store = new Store(':memory:');
  await store.start();
  const day = 20000 * 86400000;
  try {
    for (const [id, role, score, endedAt] of [
      ['a', 'survivor', 1000, day - 1],
      ['b', 'survivor', 1000, day - 1],
      ['c', 'killer', 500, day - 1],
      ['d', 'killer', 9999, day + 1],
    ] as const) {
      await store.save(
        {
          id,
          endedAt,
          players: [
            {
              id,
              role,
              health: 'escaped',
              points: { Survival: score, Repair: 0, Rescue: 0, Hunt: 0 },
            },
          ],
        } as Snapshot,
        new Map([[id, id]]),
      );
    }
    expect(await store.rewardWinners(day + 100)).toEqual([
      { wallet: 'c', role: 'killer', day: 19999 },
      { wallet: 'a', role: 'survivor', day: 19999 },
    ]);
  } finally {
    await store.close();
  }
});
it('persists the signature before sending and deduplicates concurrent recovery', async () => {
  const s = await setup();
  s.port.broadcast.mockImplementation(async () => {
    expect(s.store.saved?.[0]).toMatchObject({
      status: 'sending',
      signature: 'sig-1',
      raw: 'signed-bytes',
    });
  });
  await Promise.all([s.transfers.recover(), s.transfers.recover()]);
  expect(s.port.prepare).toHaveBeenCalledTimes(1);
  expect(s.port.broadcast).toHaveBeenCalledTimes(1);
  s.port.status.mockResolvedValue('finalized');
  await s.transfers.recover();
  expect(s.store.saved?.[0].status).toBe('done');
});
it('lease loss during signing prevents persistence and broadcast', async () => {
  const s = await setup();
  s.port.prepare.mockImplementation(async () => {
    s.store.owned = false;
    return { signature: 'sig-1', raw: 'bytes', lastValid: 10 };
  });
  await expect(s.transfers.recover()).rejects.toThrow('lease lost');
  expect(s.port.broadcast).not.toHaveBeenCalled();
  expect(s.store.saved?.[0].status).toBe('pending');
});
it('lease loss after durable signing prevents broadcast; restart reuses the same bytes', async () => {
  const s = await setup();
  s.store.afterWrite = () => {
    s.store.owned = false;
  };
  await expect(s.transfers.recover()).rejects.toThrow();
  expect(s.port.broadcast).not.toHaveBeenCalled();
  s.store.owned = true;
  s.store.afterWrite = undefined;
  const restarted = await setup(s.store);
  await restarted.transfers.recover();
  expect(restarted.port.prepare).not.toHaveBeenCalled();
  expect(restarted.port.broadcast).toHaveBeenCalledWith('signed-bytes');
});
it('an ambiguous broadcast survives a crash and reconciles without a second payment', async () => {
  const s = await setup();
  s.port.broadcast.mockRejectedValue(new Error('RPC timeout after acceptance'));
  await expect(s.transfers.recover()).rejects.toThrow('RPC timeout');
  const restarted = await setup(s.store);
  restarted.port.status.mockResolvedValue('finalized');
  await restarted.transfers.recover();
  expect(restarted.port.prepare).not.toHaveBeenCalled();
  expect(restarted.port.broadcast).not.toHaveBeenCalled();
  expect(s.store.saved?.[0].status).toBe('done');
});
it('post-ack local failure stops the worker and recovers the original signature after restart', async () => {
  const s = await setup();
  await s.transfers.recover();
  s.port.status.mockResolvedValue('finalized');
  s.store.failWrite = true;
  await expect(s.transfers.recover()).rejects.toThrow('disk failure');
  await expect(s.transfers.recover()).rejects.toThrow('requires restart');
  expect(s.store.saved?.[0].status).toBe('sending');
  s.store.failWrite = false;
  const restarted = await setup(s.store);
  restarted.port.status.mockResolvedValue('finalized');
  await restarted.transfers.recover();
  expect(restarted.port.prepare).not.toHaveBeenCalled();
  expect(restarted.port.broadcast).not.toHaveBeenCalled();
});
it('does not replace a pending or ambiguously expired transaction', async () => {
  const s = await setup();
  await s.transfers.recover();
  s.port.status.mockResolvedValue('pending');
  s.port.height.mockResolvedValue(11);
  await s.transfers.recover();
  expect(s.port.prepare).toHaveBeenCalledTimes(1);
  s.port.status
    .mockResolvedValueOnce('missing')
    .mockResolvedValueOnce('finalized');
  await s.transfers.recover();
  expect(s.port.prepare).toHaveBeenCalledTimes(1);
  s.port.status.mockResolvedValue('finalized');
  await s.transfers.recover();
  expect(s.store.saved?.[0].status).toBe('done');
});
it('only replaces a provably expired unseen transfer, retaining the reward identity', async () => {
  const s = await setup();
  await s.transfers.recover();
  s.port.height.mockResolvedValue(11);
  s.port.prepare.mockResolvedValue({
    signature: 'sig-2',
    raw: 'second-bytes',
    lastValid: 20,
  });
  await s.transfers.recover();
  expect(s.port.status).toHaveBeenCalledTimes(2);
  expect(s.store.saved?.[0]).toMatchObject({
    id: 'test:day:survivor',
    signature: 'sig-2',
  });
});
it('a failed pre-send write cannot broadcast and a crash before signing is safe to retry', async () => {
  const s = await setup();
  s.store.failWrite = true;
  await expect(s.transfers.recover()).rejects.toThrow();
  expect(s.port.broadcast).not.toHaveBeenCalled();
  s.store.failWrite = false;
  const restarted = await setup(s.store);
  await restarted.transfers.recover();
  expect(restarted.port.prepare).toHaveBeenCalledTimes(1);
});
