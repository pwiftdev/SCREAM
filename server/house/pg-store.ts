import type { Pool, PoolClient } from 'pg';
import type { LedgerStore } from './ledger';
const LOCK = 7_264_002;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
export class PostgresStore implements LedgerStore {
  private pool?: Pool;
  private guard?: PoolClient;
  private failure?: Error;
  private owned = false;
  constructor(
    private url: string,
    private lockWaitMs = 90_000,
    private onLoss?: () => void,
    private slot = 1,
  ) {}
  private lost = () => {
    const wasOwned = this.owned;
    this.owned = false;
    this.failure ??= new Error(
      'ledger database ownership lost; restart required',
    );
    if (wasOwned) this.onLoss?.();
  };
  assertAvailable() {
    if (this.failure) throw this.failure;
    if (!this.owned || !this.guard)
      throw new Error('ledger database is not ready');
  }
  async load() {
    const { default: pg } = await import('pg');
    this.pool = new pg.Pool({
      connectionString: this.url,
      max: 1,
    });
    this.pool.on('error', this.lost);
    try {
      this.guard = await this.pool.connect();
      this.guard.on('error', this.lost);
      this.guard.on('end', this.lost);
      const until = Date.now() + this.lockWaitMs;
      for (;;) {
        if (this.failure) throw this.failure;
        const { rows } = await this.guard.query(
          'select pg_try_advisory_lock($1) as ok',
          [LOCK],
        );
        if (rows[0].ok) break;
        if (Date.now() >= until)
          throw new Error('another server is already running this ledger');
        await wait(2000);
      }
      this.owned = true;
      await this.guard.query(
        'create table if not exists scream_reward_ledger (id int primary key, data jsonb not null, updated_at timestamptz not null default now())',
      );
      const { rows } = await this.guard.query(
        'select data from scream_reward_ledger where id = $1',
        [this.slot],
      );
      this.assertAvailable();
      return rows[0]?.data;
    } catch (error) {
      await this.close();
      throw error;
    }
  }
  async write(json: string) {
    this.assertAvailable();
    try {
      await this.guard!.query(
        'insert into scream_reward_ledger (id, data) values ($1, $2::jsonb) on conflict (id) do update set data = excluded.data, updated_at = now()',
        [this.slot, json],
      );
      this.assertAvailable();
    } catch (error) {
      this.lost();
      throw error;
    }
  }
  async close() {
    this.owned = false;
    this.lost();
    const guard = this.guard,
      pool = this.pool;
    this.guard = undefined;
    this.pool = undefined;
    guard?.release(true);
    await pool?.end();
  }
}
