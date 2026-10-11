import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import pg from 'pg';
import type { Snapshot } from '../shared/types';
export interface Standing {
  wallet: string;
  name: string;
  points: number;
  escapes: number;
  takes: number;
  matches: number;
}
const schema = `CREATE TABLE IF NOT EXISTS profiles(wallet TEXT PRIMARY KEY,name TEXT NOT NULL,character INTEGER NOT NULL DEFAULT 0);CREATE TABLE IF NOT EXISTS results(match_id TEXT NOT NULL,wallet TEXT NOT NULL,points INTEGER NOT NULL,escaped INTEGER NOT NULL,takes INTEGER NOT NULL,PRIMARY KEY(match_id,wallet));CREATE INDEX IF NOT EXISTS results_wallet ON results(wallet);`;
const standings = `SELECT p.wallet,p.name,COALESCE(SUM(r.points),0) AS points,COALESCE(SUM(r.escaped),0) AS escapes,COALESCE(SUM(r.takes),0) AS takes,COUNT(r.match_id) AS matches FROM profiles p JOIN results r ON r.wallet=p.wallet GROUP BY p.wallet,p.name ORDER BY points DESC,p.wallet LIMIT 100`;
export class Store {
  sqlite?: DatabaseSync;
  pool?: pg.Pool;
  constructor(path = 'data/scream.sqlite', databaseUrl?: string) {
    if (databaseUrl) {
      this.pool = new pg.Pool({
        connectionString: databaseUrl,
        max: 3,
        connectionTimeoutMillis: 10000,
        ...(process.env.DATABASE_SSL === 'heroku'
          ? { ssl: { rejectUnauthorized: false } }
          : {}),
      });
      this.pool.on('error', () =>
        console.error('Idle database connection lost'),
      );
    } else {
      if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
      this.sqlite = new DatabaseSync(path);
      this.sqlite.exec('PRAGMA journal_mode=WAL;');
    }
  }
  async start() {
    if (this.pool) await this.pool.query(schema);
    else this.sqlite!.exec(schema);
    for (const [table, column, definition] of [
      ['profiles', 'public_wallet', "TEXT NOT NULL DEFAULT ''"],
      ['results', 'finished_at', 'BIGINT NOT NULL DEFAULT 0'],
      ['results', 'role', "TEXT NOT NULL DEFAULT 'survivor'"],
    ]) {
      if (this.pool)
        await this.pool.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`,
        );
      else if (
        !this.sqlite!.prepare(`PRAGMA table_info(${table})`)
          .all()
          .some((r) => r.name === column)
      )
        this.sqlite!.exec(
          `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
        );
    }
    const index =
      'CREATE INDEX IF NOT EXISTS results_finished ON results(finished_at,role)';
    if (this.pool) await this.pool.query(index);
    else this.sqlite!.exec(index);
  }
  async profile(wallet: string, name: string, character: number) {
    const query =
      'INSERT INTO profiles(wallet,name,character) VALUES($1,$2,$3) ON CONFLICT(wallet) DO UPDATE SET name=excluded.name,character=excluded.character';
    if (this.pool) await this.pool.query(query, [wallet, name, character]);
    else
      this.sqlite!.prepare(query.replaceAll(/\$\d/g, '?')).run(
        wallet,
        name,
        character,
      );
  }
  async save(s: Snapshot, wallets: Map<string, string>) {
    const query =
      'INSERT INTO results(match_id,wallet,points,escaped,takes,finished_at,role) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(match_id,wallet) DO NOTHING';
    const rows = s.players.flatMap((p) => {
      const wallet = wallets.get(p.id);
      return wallet
        ? [
            [
              s.id,
              wallet,
              Math.round(Object.values(p.points).reduce((a, b) => a + b, 0)),
              p.health === 'escaped' ? 1 : 0,
              p.role === 'killer'
                ? s.players.filter((p) => p.health === 'taken').length
                : 0,
              s.endedAt || Date.now(),
              p.role,
            ],
          ]
        : [];
    });
    if (this.pool) {
      const c = await this.pool.connect();
      try {
        await c.query('BEGIN');
        for (const row of rows) await c.query(query, row);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK');
        throw e;
      } finally {
        c.release();
      }
    } else {
      this.sqlite!.exec('BEGIN');
      try {
        const q = this.sqlite!.prepare(query.replaceAll(/\$\d/g, '?'));
        for (const row of rows) q.run(...row);
        this.sqlite!.exec('COMMIT');
      } catch (e) {
        this.sqlite!.exec('ROLLBACK');
        throw e;
      }
    }
  }
  async leaderboard(): Promise<Standing[]> {
    const rows = this.pool
      ? (await this.pool.query(standings)).rows
      : this.sqlite!.prepare(standings).all();
    return rows.map((r) => ({
      wallet: String(r.wallet),
      name: String(r.name),
      points: Number(r.points),
      escapes: Number(r.escapes),
      takes: Number(r.takes),
      matches: Number(r.matches),
    }));
  }
  async rewardWinners(now = Date.now()) {
    const end = Math.floor(now / 86400000) * 86400000;
    const query = `WITH totals AS (SELECT wallet,role,CAST(FLOOR(finished_at/86400000.0) AS BIGINT) AS day,SUM(points) AS points FROM results WHERE finished_at>0 AND finished_at<$1 GROUP BY wallet,role,CAST(FLOOR(finished_at/86400000.0) AS BIGINT)), ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY day,role ORDER BY points DESC,wallet) AS rank FROM totals) SELECT wallet,role,day FROM ranked WHERE rank=1 ORDER BY day,role`;
    const rows = this.pool
      ? (await this.pool.query(query, [end])).rows
      : this.sqlite!.prepare(query.replace('$1', '?')).all(end);
    return rows.map((r) => ({
      wallet: String(r.wallet),
      role: String(r.role),
      day: Number(r.day),
    }));
  }
  async close() {
    this.sqlite?.close();
    await this.pool?.end();
  }
}
