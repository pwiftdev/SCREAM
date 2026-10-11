import { H } from '../../shared/config';
import { cleanText } from '../../shared/house/format';
import { type Houses, unpack } from './houses';
export class Moderation {
  private admins: Set<string>;
  constructor(
    private houses: Houses,
    allowlist = process.env.ADMIN_WALLETS ?? '',
  ) {
    this.admins = new Set(
      allowlist
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean),
    );
  }
  async start() {
    const schema = `CREATE TABLE IF NOT EXISTS lane_reports(code TEXT NOT NULL,wallet TEXT NOT NULL,reason TEXT NOT NULL,created BIGINT NOT NULL,PRIMARY KEY(code,wallet));CREATE TABLE IF NOT EXISTS lane_bans(wallet TEXT PRIMARY KEY,created BIGINT NOT NULL);CREATE TABLE IF NOT EXISTS lane_review_log(id TEXT PRIMARY KEY,admin TEXT NOT NULL,code TEXT NOT NULL,action TEXT NOT NULL,created BIGINT NOT NULL);`;
    if (this.houses.db.store.pool)
      await this.houses.db.store.pool.query(schema);
    else this.houses.db.store.sqlite!.exec(schema);
  }
  async allowed(wallet: string) {
    const rows = await this.houses.db.query(
      'SELECT wallet FROM lane_bans WHERE wallet=$1',
      [wallet],
    );
    if (rows.length) throw new Error('this profile is banned');
  }
  async report(wallet: string, code: string, reason: string) {
    await this.allowed(wallet);
    const text = cleanText(reason, 160);
    if (text.length < 4) throw new Error('briefly describe the problem');
    return this.houses.db.transaction(async (q) => {
      const [h] = await q(
        'UPDATE lane_houses SET updated=updated WHERE code=$1 RETURNING owner',
        [code],
      );
      if (!h) throw new Error('house not found');
      if (h.owner === wallet)
        throw new Error('use your dashboard to edit your own house');
      await q(
        'INSERT INTO lane_reports(code,wallet,reason,created) VALUES($1,$2,$3,$4) ON CONFLICT(code,wallet) DO NOTHING',
        [code, wallet, text, this.houses.now()],
      );
      const [{ count }] = await q(
        'SELECT COUNT(*) AS count FROM lane_reports WHERE code=$1',
        [code],
      );
      if (Number(count) >= H.REPORT_AUTOHIDE)
        await q('UPDATE lane_houses SET hidden=1,approved=0 WHERE code=$1', [
          code,
        ]);
      return { ok: true };
    });
  }
  async rate(wallet: string, code: string, rating: number) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new Error('choose one to five skulls');
    const rows = await this.houses.db.query(
      'SELECT r.id FROM lane_runs r JOIN lane_houses h ON h.code=r.code WHERE r.wallet=$1 AND r.code=$2 AND r.scored=1 AND h.owner<>$3 LIMIT 1',
      [wallet, code, wallet],
    );
    if (!rows.length) throw new Error('a scored visit is needed before rating');
    await this.houses.db.query(
      'INSERT INTO lane_ratings(code,wallet,rating) VALUES($1,$2,$3) ON CONFLICT(code,wallet) DO UPDATE SET rating=excluded.rating',
      [code, wallet, rating],
    );
    return { ok: true };
  }
  authorize(wallet: string) {
    if (!this.admins.has(wallet))
      throw new Error('this wallet is not on the moderator allowlist');
  }
  async list(wallet: string) {
    this.authorize(wallet);
    const rows = await this.houses.db.query(
      'SELECT h.code,h.owner,h.hidden,h.approved,h.published,COUNT(r.wallet) AS reports FROM lane_houses h LEFT JOIN lane_reports r ON r.code=h.code WHERE h.published IS NOT NULL GROUP BY h.code,h.owner,h.hidden,h.approved,h.published ORDER BY reports DESC,h.approved,h.code LIMIT 200',
    );
    return rows.map((r) => ({
      ...r,
      title: unpack(String(r.published)).title,
      published: undefined,
      review: 'text and block-art review required before top-ten placement',
    }));
  }
  async review(wallet: string, code: string, action: string) {
    this.authorize(wallet);
    if (!['hide', 'restore', 'approve', 'ban'].includes(action))
      throw new Error('unknown moderation action');
    return this.houses.db.transaction(async (q) => {
      const [h] = await q(
        'UPDATE lane_houses SET updated=updated WHERE code=$1 RETURNING owner',
        [code],
      );
      if (!h) throw new Error('house not found');
      if (action === 'ban') {
        await q(
          'INSERT INTO lane_bans(wallet,created) VALUES($1,$2) ON CONFLICT(wallet) DO NOTHING',
          [String(h.owner), this.houses.now()],
        );
        await q('UPDATE lane_houses SET hidden=1,approved=0 WHERE owner=$1', [
          String(h.owner),
        ]);
        await q('DELETE FROM lane_sessions WHERE wallet=$1', [String(h.owner)]);
      } else {
        await q('UPDATE lane_houses SET hidden=$1,approved=$2 WHERE code=$3', [
          action === 'hide' ? 1 : 0,
          action === 'approve' ? 1 : 0,
          code,
        ]);
        if (action === 'restore')
          await q('DELETE FROM lane_reports WHERE code=$1', [code]);
      }
      await q(
        'INSERT INTO lane_review_log(id,admin,code,action,created) VALUES($1,$2,$3,$4,$5)',
        [crypto.randomUUID(), wallet, code, action, this.houses.now()],
      );
      return { ok: true };
    });
  }
}
