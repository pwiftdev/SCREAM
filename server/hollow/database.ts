import type pg from 'pg';
import type { Store } from '../store';
export type Row = Record<string, unknown>;
export interface Query {
  (sql: string, values?: (string | number | null)[]): Promise<Row[]>;
}
export class HollowDatabase {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly store: Store) {}
  private sqliteQuery: Query = async (sql, values = []) => {
    const ordered: (string | number | null)[] = [];
    const statement = sql.replace(/\$(\d+)/g, (_match, index: string) => {
      ordered.push(values[Number(index) - 1]);
      return '?';
    });
    return this.store.sqlite!.prepare(statement).all(...ordered) as Row[];
  };
  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const operation = this.queue.then(work);
    this.queue = operation.catch(() => {});
    return operation;
  }
  query: Query = (sql, values = []) =>
    this.store.pool
      ? this.store.pool.query(sql, values).then((result) => result.rows)
      : this.enqueue(() => this.sqliteQuery(sql, values));
  async start() {
    const schema = `CREATE TABLE IF NOT EXISTS lane_ratings(code TEXT NOT NULL,wallet TEXT NOT NULL,rating INTEGER NOT NULL,PRIMARY KEY(code,wallet));
CREATE TABLE IF NOT EXISTS lane_positions(code TEXT PRIMARY KEY,position INTEGER NOT NULL,day BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS lane_sessions(token TEXT PRIMARY KEY,wallet TEXT NOT NULL,expires BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS lane_houses(code TEXT PRIMARY KEY,owner TEXT NOT NULL UNIQUE,draft TEXT NOT NULL,draft_hash TEXT NOT NULL,published TEXT,published_hash TEXT,clear_hash TEXT,updated BIGINT NOT NULL,hidden INTEGER NOT NULL DEFAULT 0,approved INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS lane_tickets(id TEXT PRIMARY KEY,wallet TEXT NOT NULL,code TEXT NOT NULL,hash TEXT NOT NULL,house TEXT NOT NULL,seed BIGINT NOT NULL,purpose TEXT NOT NULL,created BIGINT NOT NULL,used INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS lane_ticket_wallet ON lane_tickets(wallet,created);
CREATE TABLE IF NOT EXISTS lane_runs(id TEXT PRIMARY KEY,wallet TEXT NOT NULL,code TEXT NOT NULL,hash TEXT NOT NULL,house TEXT NOT NULL,seed BIGINT NOT NULL,frames TEXT NOT NULL,outcome TEXT NOT NULL,ticks INTEGER NOT NULL,x REAL NOT NULL,y REAL NOT NULL,z REAL NOT NULL,created BIGINT NOT NULL,scored INTEGER NOT NULL DEFAULT 0,points INTEGER NOT NULL DEFAULT 0,mic TEXT NOT NULL DEFAULT '[]');
CREATE INDEX IF NOT EXISTS lane_runs_house ON lane_runs(code,created);
CREATE INDEX IF NOT EXISTS lane_runs_night ON lane_runs(wallet,created,scored);
CREATE INDEX IF NOT EXISTS lane_runs_wallet ON lane_runs(wallet,code,created);`;
    if (this.store.pool) await this.store.pool.query(schema);
    else this.store.sqlite!.exec(schema);
  }
  async transaction<T>(work: (q: Query) => Promise<T>): Promise<T> {
    if (this.store.pool) {
      const client = await this.store.pool.connect();
      try {
        await client.query('BEGIN');
        const out = await work(this.clientQuery(client));
        await client.query('COMMIT');
        return out;
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    return this.enqueue(async () => {
      this.store.sqlite!.exec('BEGIN IMMEDIATE');
      try {
        const result = await work(this.sqliteQuery);
        this.store.sqlite!.exec('COMMIT');
        return result;
      } catch (e) {
        this.store.sqlite!.exec('ROLLBACK');
        throw e;
      }
    });
  }
  private clientQuery(client: pg.PoolClient): Query {
    return async (sql, values = []) => (await client.query(sql, values)).rows;
  }
}
