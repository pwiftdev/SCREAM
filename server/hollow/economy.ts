import { H } from '../../shared/config';
import type { HollowDatabase, Query } from './database';
export type EconomyMode = 'off' | 'test' | 'live';
export class LaneEconomy {
  readonly mode: EconomyMode;
  constructor(
    readonly db: HollowDatabase,
    mode = process.env.ECONOMY_MODE ?? 'off',
    readonly now = Date.now,
  ) {
    if (!['off', 'test', 'live'].includes(mode))
      throw new Error('ECONOMY_MODE must be off, test or live');
    if (mode === 'live')
      throw new Error(
        'SCREAM live settlement requires a completed live integration and team sign-off; use off or test',
      );
    this.mode = mode as EconomyMode;
  }
  async start() {
    const schema = `CREATE TABLE IF NOT EXISTS lane_accounts(wallet TEXT PRIMARY KEY,balance BIGINT NOT NULL DEFAULT 0,premium INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS lane_bounties(code TEXT PRIMARY KEY,owner TEXT NOT NULL,balance BIGINT NOT NULL DEFAULT 0,notice BIGINT NOT NULL DEFAULT 0,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lane_ledger(id TEXT PRIMARY KEY,kind TEXT NOT NULL,sender TEXT NOT NULL,recipient TEXT NOT NULL,amount BIGINT NOT NULL,code TEXT NOT NULL,created BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS lane_ledger_link ON lane_ledger(sender,recipient,created);`;
    if (this.db.store.pool) await this.db.store.pool.query(schema);
    else this.db.store.sqlite!.exec(schema);
  }
  private enabled() {
    if (this.mode !== 'test')
      throw new Error('economy is off. no tokens are moved');
  }
  async account(wallet: string) {
    if (this.mode === 'test')
      await this.db.query(
        'INSERT INTO lane_accounts(wallet,balance) VALUES($1,1000000) ON CONFLICT(wallet) DO NOTHING',
        [wallet],
      );
    const [account] = await this.db.query(
      'SELECT balance,premium FROM lane_accounts WHERE wallet=$1',
      [wallet],
    );
    return {
      mode: this.mode,
      balance: Number(account?.balance ?? 0),
      premium: !!account?.premium,
      holder: Number(account?.balance ?? 0) >= H.HOLDER_MIN_BALANCE,
    };
  }
  async bounty(code: string) {
    const [b] = await this.db.query(
      'SELECT balance,notice,owner FROM lane_bounties WHERE code=$1',
      [code],
    );
    return {
      balance: Number(b?.balance ?? 0),
      notice: Number(b?.notice ?? 0),
      mode: this.mode,
    };
  }
  async frozen(q: Query, code: string) {
    const [b] = await q('SELECT balance FROM lane_bounties WHERE code=$1', [
      code,
    ]);
    if (Number(b?.balance) > 0)
      throw new Error('this house is frozen while its bounty is active');
  }
  private async move(
    q: Query,
    id: string,
    kind: string,
    sender: string,
    recipient: string,
    amount: number,
    code: string,
  ) {
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e12)
      throw new Error('invalid test-token amount');
    const existing = await q(
      'SELECT id,kind,sender,recipient,amount,code FROM lane_ledger WHERE id=$1',
      [id],
    );
    if (existing.length) {
      const p = existing[0];
      if (
        p.kind !== kind ||
        p.sender !== sender ||
        p.recipient !== recipient ||
        Number(p.amount) !== amount ||
        p.code !== code
      )
        throw new Error('operation id reused for a different transfer');
      return false;
    }
    const debit = await q(
      'UPDATE lane_accounts SET balance=balance-$1 WHERE wallet=$2 AND balance>=$3 RETURNING wallet',
      [amount, sender, amount],
    );
    if (!debit.length) throw new Error('not enough pretend tokens');
    await q(
      'INSERT INTO lane_accounts(wallet,balance) VALUES($1,$2) ON CONFLICT(wallet) DO UPDATE SET balance=lane_accounts.balance+excluded.balance',
      [recipient, amount],
    );
    await q(
      'INSERT INTO lane_ledger(id,kind,sender,recipient,amount,code,created) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [id, kind, sender, recipient, amount, code, this.now()],
    );
    return true;
  }
  async operate(
    wallet: string,
    action: string,
    code: string,
    amount: number,
    id: string,
  ) {
    this.enabled();
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(id))
      throw new Error('invalid operation id');
    await this.account(wallet);
    return this.db.transaction(async (q) => {
      const [house] = await q(
        'UPDATE lane_houses SET updated=updated WHERE code=$1 RETURNING owner,published_hash',
        [code],
      );
      if (!house) throw new Error('house not found');
      if (action === 'deposit') {
        if (house.owner !== wallet || !house.published_hash)
          throw new Error('publish your own house first');
        if (amount < H.MIN_BOUNTY)
          throw new Error(`minimum bounty is ${H.MIN_BOUNTY} pretend tokens`);
        const changed = await this.move(
          q,
          id,
          'deposit',
          wallet,
          `bounty:${code}`,
          amount,
          code,
        );
        if (changed)
          await q(
            'INSERT INTO lane_bounties(code,owner,balance,hash) VALUES($1,$2,$3,$4) ON CONFLICT(code) DO UPDATE SET balance=lane_bounties.balance+excluded.balance,notice=0,hash=excluded.hash',
            [code, wallet, amount, String(house.published_hash)],
          );
      } else if (action === 'tip') {
        if (house.owner === wallet)
          throw new Error('choose another house to tip');
        await this.move(
          q,
          id,
          'tip',
          wallet,
          String(house.owner),
          amount,
          code,
        );
      } else if (action === 'notice') {
        if (house.owner !== wallet)
          throw new Error('only the owner can withdraw');
        await q(
          'UPDATE lane_bounties SET notice=$1 WHERE code=$2 AND balance>0 AND notice=0',
          [this.now() + H.WITHDRAW_MS, code],
        );
      } else if (action === 'withdraw') {
        if (house.owner !== wallet)
          throw new Error('only the owner can withdraw');
        const [prior] = await q(
          'SELECT kind,sender,recipient,code FROM lane_ledger WHERE id=$1',
          [id],
        );
        if (prior) {
          if (
            prior.kind !== 'withdraw' ||
            prior.sender !== `bounty:${code}` ||
            prior.recipient !== wallet ||
            prior.code !== code
          )
            throw new Error('operation id reused for a different transfer');
          return { ok: true };
        }
        const [b] = await q(
          'UPDATE lane_bounties SET balance=0 WHERE code=$1 AND balance>0 AND notice>0 AND notice<=$2 RETURNING balance,hash',
          [code, this.now()],
        );
        if (!b)
          throw new Error(
            'the 24-hour notice has not elapsed, or the bounty was claimed',
          );
        const [account] = await q(
          'SELECT balance FROM lane_accounts WHERE wallet=$1',
          [`bounty:${code}`],
        );
        await this.move(
          q,
          id,
          'withdraw',
          `bounty:${code}`,
          wallet,
          Number(account.balance),
          code,
        );
      } else if (action === 'weekly' || action === 'season') {
        await this.move(q, id, 'topup', wallet, `pool:${action}`, amount, code);
      } else if (action === 'premium') {
        const [a] = await q(
          'UPDATE lane_accounts SET balance=balance WHERE wallet=$1 RETURNING premium',
          [wallet],
        );
        if (a?.premium) return { ok: true };
        const burn = Math.floor((H.PREMIUM_COST * H.PREMIUM_BURN_BPS) / 10000);
        await this.move(
          q,
          `${id}-burn`,
          'premium',
          wallet,
          'pool:burn',
          burn,
          code,
        );
        await this.move(
          q,
          `${id}-pool`,
          'premium',
          wallet,
          'pool:weekly',
          H.PREMIUM_COST - burn,
          code,
        );
        await q('UPDATE lane_accounts SET premium=1 WHERE wallet=$1', [wallet]);
      } else throw new Error('unknown economy action');
      return { ok: true };
    });
  }
  async claim(
    q: Query,
    code: string,
    wallet: string,
    hash: string,
    runId: string,
  ) {
    if (this.mode !== 'test') return 0;
    const [house] = await q(
      'UPDATE lane_houses SET updated=updated WHERE code=$1 RETURNING owner',
      [code],
    );
    if (house.owner === wallet) return 0;
    const linked = await q(
      "SELECT id FROM lane_ledger WHERE kind='tip' AND created>$1 AND ((sender=$2 AND recipient=$3) OR (sender=$4 AND recipient=$5)) LIMIT 1",
      [
        this.now() - H.SCORE_WINDOW_MS,
        wallet,
        String(house.owner),
        String(house.owner),
        wallet,
      ],
    );
    if (linked.length) return 0;
    const [b] = await q(
      'SELECT balance FROM lane_bounties WHERE code=$1 AND hash=$2',
      [code, hash],
    );
    const amount = Number(b?.balance ?? 0);
    if (!amount) return 0;
    const claimed = await q(
      'UPDATE lane_bounties SET balance=0 WHERE code=$1 AND balance=$2 RETURNING code',
      [code, amount],
    );
    if (!claimed.length) return 0;
    await this.move(
      q,
      `claim-${runId}`,
      'claim',
      `bounty:${code}`,
      wallet,
      amount,
      code,
    );
    return amount;
  }
  async prizePool(period: string, winners: string[]) {
    this.enabled();
    if (
      !/^(week-\d{4}-\d{2}-\d{2}|final-2026)$/.test(period) ||
      !winners.length ||
      new Set(winners).size !== winners.length
    )
      throw new Error('invalid prize period');
    const pool = period.startsWith('final-') ? 'pool:season' : 'pool:weekly';
    return this.db.transaction(async (q) => {
      const [p] = await q(
        'UPDATE lane_accounts SET balance=balance WHERE wallet=$1 RETURNING balance',
        [pool],
      );
      const paid = await q('SELECT id FROM lane_ledger WHERE id=$1', [
        `${period}-0`,
      ]);
      if (paid.length || !p || Number(p.balance) < winners.length) return 0;
      const total = Number(p.balance),
        share = Math.floor(total / winners.length);
      for (let i = 0; i < winners.length; i++)
        await this.move(
          q,
          `${period}-${i}`,
          'prize',
          pool,
          winners[i],
          share + (i === 0 ? total % winners.length : 0),
          '',
        );
      return total;
    });
  }
}
