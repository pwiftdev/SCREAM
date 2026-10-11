import type { HollowDatabase, Query } from './database';
import { H } from '../../shared/config';
export const CANDY_RULES = {
  fixture: 300000,
  allocation: 1000,
  duration: 86400000,
  raidBps: 1000,
} as const;
export class CandyRewards {
  constructor(
    private db: HollowDatabase,
    private now = Date.now,
  ) {}
  async start() {
    for (const sql of [
      'CREATE TABLE IF NOT EXISTS scream_candy_fund(id INTEGER PRIMARY KEY,balance BIGINT NOT NULL)',
      'CREATE TABLE IF NOT EXISTS scream_candy_rounds(id TEXT PRIMARY KEY,code TEXT NOT NULL,owner TEXT NOT NULL,hash TEXT NOT NULL,remaining BIGINT NOT NULL,initial BIGINT NOT NULL,ends BIGINT NOT NULL,settled INTEGER NOT NULL DEFAULT 0)',
      'CREATE UNIQUE INDEX IF NOT EXISTS scream_candy_active ON scream_candy_rounds(code) WHERE settled=0',
      'CREATE INDEX IF NOT EXISTS scream_candy_house ON scream_candy_rounds(code,ends)',
      'CREATE TABLE IF NOT EXISTS scream_candy_credits(id TEXT PRIMARY KEY,round_id TEXT NOT NULL,wallet TEXT NOT NULL,amount BIGINT NOT NULL,kind TEXT NOT NULL,UNIQUE(round_id,wallet))',
      'CREATE INDEX IF NOT EXISTS scream_candy_wallet ON scream_candy_credits(wallet)',
    ])
      await this.db.query(sql);
    await this.db.query(
      'INSERT INTO scream_candy_fund(id,balance) VALUES(1,$1) ON CONFLICT DO NOTHING',
      [CANDY_RULES.fixture],
    );
  }
  private async settle(q: Query, code: string) {
    const rows = await q(
      'UPDATE scream_candy_rounds SET settled=1 WHERE code=$1 AND settled=0 AND ends<=$2 RETURNING *',
      [code, this.now()],
    );
    for (const row of rows)
      await q(
        'INSERT INTO scream_candy_credits(id,round_id,wallet,amount,kind) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [
          `kept:${row.id}`,
          String(row.id),
          String(row.owner),
          Number(row.remaining),
          'defended',
        ],
      );
  }
  async open(q: Query, code: string, owner: string, hash: string) {
    const rows = await q(
      'UPDATE lane_houses SET updated=updated WHERE code=$1 AND owner=$2 RETURNING code',
      [code, owner],
    );
    if (!rows.length)
      throw new Error('house owner does not match reward allocation');
    await this.settle(q, code);
    const [active] = await q(
      'SELECT * FROM scream_candy_rounds WHERE code=$1 AND settled=0',
      [code],
    );
    if (active) {
      if (active.hash !== hash)
        throw new Error(
          'your candy round is active. Save edits now; publish them after the round ends',
        );
      return;
    }
    const [fund] = await q(
      'UPDATE scream_candy_fund SET balance=balance-$1 WHERE id=1 AND balance>=$1 RETURNING balance',
      [CANDY_RULES.allocation],
    );
    if (!fund) return;
    const id = `${code}:${this.now()}`;
    await q(
      'INSERT INTO scream_candy_rounds(id,code,owner,hash,remaining,initial,ends) VALUES($1,$2,$3,$4,$5,$5,$6)',
      [
        id,
        code,
        owner,
        hash,
        CANDY_RULES.allocation,
        this.now() + CANDY_RULES.duration,
      ],
    );
  }
  async raid(q: Query, runId: string) {
    const [run] = await q('SELECT * FROM lane_runs WHERE id=$1', [runId]);
    if (
      !run ||
      run.outcome !== 'escaped' ||
      Number(run.ticks) < H.MIN_SCORED_S * H.TICK_HZ
    )
      return 0;
    const [own] = await q(
      'SELECT code FROM lane_houses WHERE owner=$1 AND published IS NOT NULL AND hidden=0',
      [String(run.wallet)],
    );
    if (!own) return 0;
    await this.settle(q, String(run.code));
    const [round] = await q(
      'UPDATE scream_candy_rounds SET remaining=remaining WHERE code=$1 AND settled=0 AND hash=$2 AND owner<>$3 RETURNING *',
      [String(run.code), String(run.hash), String(run.wallet)],
    );
    if (!round) return 0;
    const [linked] = await q(
      "SELECT id FROM lane_ledger WHERE kind='tip' AND created>$1 AND ((sender=$2 AND recipient=$3) OR (sender=$3 AND recipient=$2)) LIMIT 1",
      [this.now() - H.SCORE_WINDOW_MS, String(run.wallet), String(round.owner)],
    );
    if (linked) return 0;
    const amount = Math.floor(
      (Number(round.remaining) * CANDY_RULES.raidBps) / 10000,
    );
    if (!amount) return 0;
    const credit = await q(
      'INSERT INTO scream_candy_credits(id,round_id,wallet,amount,kind) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING amount',
      [`raid:${runId}`, String(round.id), String(run.wallet), amount, 'hunted'],
    );
    if (!credit.length) return 0;
    await q(
      'UPDATE scream_candy_rounds SET remaining=remaining-$1 WHERE id=$2',
      [amount, String(round.id)],
    );
    return amount;
  }
  async status(wallet: string) {
    return this.db.transaction(async (q) => {
      const [house] = await q('SELECT code FROM lane_houses WHERE owner=$1', [
        wallet,
      ]);
      if (house) await this.settle(q, String(house.code));
      const [round] = await q(
        'SELECT * FROM scream_candy_rounds WHERE owner=$1 ORDER BY ends DESC LIMIT 1',
        [wallet],
      );
      const credits = await q(
        'SELECT kind,SUM(amount) AS amount FROM scream_candy_credits WHERE wallet=$1 GROUP BY kind',
        [wallet],
      );
      const [fund] = await q(
        'SELECT balance FROM scream_candy_fund WHERE id=1',
      );
      return {
        mode: 'local-simulation',
        fund: Number(fund.balance),
        round: round
          ? {
              remaining: Number(round.remaining),
              initial: Number(round.initial),
              ends: Number(round.ends),
              settled: !!round.settled,
            }
          : null,
        hunted: Number(credits.find((c) => c.kind === 'hunted')?.amount ?? 0),
        defended: Number(
          credits.find((c) => c.kind === 'defended')?.amount ?? 0,
        ),
      };
    });
  }
}
