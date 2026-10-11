import { Connection, Keypair } from '@solana/web3.js';
import { Ledger } from './ledger';
import { PostgresStore } from './pg-store';
import { Transfers } from './transfers';
import { solanaPort, testPort } from './solana';
import type { Store } from '../store';
export async function createRewards(
  store: Store,
  env: NodeJS.ProcessEnv = process.env,
) {
  const mode = env.REWARDS_MODE ?? 'off';
  if (mode === 'off')
    return { mode, healthy: () => true, close: async () => {} };
  if (mode !== 'test' && mode !== 'live')
    throw new Error('invalid REWARDS_MODE');
  if (!env.DATABASE_URL) throw new Error('rewards require Postgres');
  const amount = env.NIGHTLY_REWARD_LAMPORTS ?? '0';
  if (!/^[1-9]\d{0,12}$/.test(amount))
    throw new Error('set a positive NIGHTLY_REWARD_LAMPORTS');
  if (
    mode === 'live' &&
    (env.ALLOW_EXTERNAL_DATA !== 'true' ||
      !env.SOLANA_RPC_URL ||
      !env.HOUSE_SECRET_KEY)
  )
    throw new Error(
      'live rewards require explicit external access, RPC and a server house key',
    );
  const port =
    mode === 'test'
      ? testPort()
      : solanaPort(
          new Connection(env.SOLANA_RPC_URL!, 'finalized'),
          Keypair.fromSecretKey(
            Uint8Array.from(JSON.parse(env.HOUSE_SECRET_KEY!)),
          ),
        );
  let healthy = false;
  const ledger = new Ledger(
    new PostgresStore(
      env.DATABASE_URL,
      0,
      () => {
        healthy = false;
      },
      mode === 'test' ? 2 : 1,
    ),
  );
  await ledger.start();
  const transfers = new Transfers(ledger, port);
  let running: Promise<void> | undefined;
  const tick = () =>
    (running ??= (async () => {
      const winners = await store.rewardWinners();
      await ledger.add(
        winners.map((w) => ({
          id: `${mode}:${w.day}:${w.role}`,
          wallet: w.wallet,
          lamports: amount,
          status: 'pending' as const,
        })),
      );
      await transfers.recover();
      ledger.available();
      healthy = true;
    })()
      .catch((error: unknown) => {
        healthy = false;
        console.error(
          'reward recovery paused:',
          error instanceof Error ? error.message : 'unavailable',
        );
      })
      .finally(() => {
        running = undefined;
      }));
  await tick();
  const timer = setInterval(() => {
    void tick();
  }, 30000);
  timer.unref();
  return {
    mode,
    healthy: () => healthy,
    async close() {
      clearInterval(timer);
      await running;
      await ledger.store.close();
    },
  };
}
