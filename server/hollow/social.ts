import { HOUSE_SCORE_SQL } from './scoring';
import { H } from '../../shared/config';
import { type Houses, unpack } from './houses';
import { type Query, type Row } from './database';
export async function scoreRun(
  q: Query,
  t: Row,
  wallet: string,
  outcome: string,
  ticks: number,
  now: number,
) {
  const [house] = await q(
    'UPDATE lane_houses SET updated=updated WHERE code=$1 RETURNING owner',
    [String(t.code)],
  );
  if (
    t.purpose !== 'visit' ||
    house.owner === wallet ||
    ticks < H.MIN_SCORED_S * H.TICK_HZ
  )
    return { scored: 0, points: 0 };
  const prior = await q(
    'SELECT id FROM lane_runs WHERE wallet=$1 AND code=$2 AND scored=1 AND created>$3 LIMIT 1',
    [wallet, String(t.code), now - H.SCORE_WINDOW_MS],
  );
  if (prior.length) return { scored: 0, points: 0 };
  const [totals] = await q(
    "SELECT COUNT(*) AS visits,SUM(CASE WHEN outcome='escaped' THEN 1 ELSE 0 END) AS escapes FROM lane_runs WHERE code=$1 AND scored=1",
    [String(t.code)],
  );
  const difficulty =
    1 - Number(totals.escapes ?? 0) / Math.max(1, Number(totals.visits));
  return {
    scored: 1,
    points:
      outcome === 'escaped'
        ? Math.round(
            100 +
              100 * difficulty +
              Math.max(0, H.VISIT_LIMIT_S - ticks / H.TICK_HZ),
          )
        : 0,
  };
}
export class Social {
  constructor(readonly houses: Houses) {}
  async stats(code: string) {
    const [row] = await this.houses.db.query(
      "SELECT COUNT(*) AS visitors,COALESCE(SUM(CASE WHEN outcome='escaped' THEN 1 ELSE 0 END),0) AS escapes,COALESCE(SUM(CASE WHEN outcome='caught' OR outcome='pit' THEN 1 ELSE 0 END),0) AS catches FROM lane_runs WHERE code=$1 AND scored=1",
      [code],
    );
    return row;
  }
  async visits(wallet: string) {
    return this.houses.db.query(
      "SELECT r.id,r.code,r.wallet,r.outcome,r.ticks,r.x,r.y,r.z,r.created,r.mic FROM lane_runs r JOIN lane_houses h ON h.code=r.code WHERE h.owner=$1 AND r.frames<>'' ORDER BY r.created DESC LIMIT 100",
      [wallet],
    );
  }
  async replay(wallet: string, id: string) {
    const [r] = await this.houses.db.query(
      'SELECT r.* FROM lane_runs r JOIN lane_houses h ON h.code=r.code WHERE r.id=$1 AND (h.owner=$2 OR r.wallet=$3)',
      [id, wallet, wallet],
    );
    if (!r) throw new Error('this replay belongs to another house');
    if (!r.frames)
      throw new Error('this replay has expired; the result is still recorded');
    return {
      ...r,
      house: unpack(String(r.house)),
      frames: unpack(String(r.frames)),
      mic: JSON.parse(String(r.mic)),
    };
  }
  async leaderboard(kind: string, period: string) {
    const now = this.houses.now(),
      since =
        period === 'daily'
          ? now - 86400000
          : period === 'weekly'
            ? now - 7 * 86400000
            : 0;
    if (kind === 'hunters')
      return this.houses.db.query(
        "SELECT recipient AS wallet,SUM(amount) AS score,COUNT(*) AS escapes FROM lane_ledger WHERE kind='claim' AND created>$1 GROUP BY recipient ORDER BY score DESC LIMIT 100",
        [since],
      );
    if (kind === 'escapers')
      return this.houses.db.query(
        "SELECT wallet,SUM(points) AS score,SUM(CASE WHEN outcome='escaped' THEN 1 ELSE 0 END) AS escapes FROM lane_runs WHERE scored=1 AND created>$1 GROUP BY wallet HAVING SUM(points)>0 ORDER BY score DESC,wallet LIMIT 100",
        [since],
      );
    return this.houses.db
      .query(
        `SELECT h.code,h.owner,h.published,COUNT(r.id) AS visits,${HOUSE_SCORE_SQL} AS score FROM lane_houses h JOIN lane_runs r ON r.code=h.code WHERE r.scored=1 AND r.created>$1 AND h.hidden=0 GROUP BY h.code,h.owner,h.published ORDER BY score DESC,h.code LIMIT 100`,
        [since],
      )
      .then((rows) =>
        rows.map((r) => ({
          ...r,
          title: unpack(String(r.published)).title,
          published: undefined,
        })),
      );
  }
  async feed() {
    return this.houses.db.query(
      'SELECT r.id,r.code,r.wallet,r.outcome,r.created FROM lane_runs r JOIN lane_houses h ON h.code=r.code WHERE h.hidden=0 ORDER BY r.created DESC LIMIT 8',
    );
  }
}
