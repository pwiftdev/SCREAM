import { isFinalNight } from '../../shared/house/neighborhood';
import type { Houses } from './houses';
export async function payScheduledPrizes(h: Houses, now = new Date(h.now())) {
  if (h.economy.mode !== 'test') return;
  const final = isFinalNight(now);
  if (now.getUTCDay() !== 0 && !final) return;
  const limit = final ? 10 : 3,
    rows = await h.db.query(
      `SELECT h.owner,COUNT(r.id)*10+SUM(CASE WHEN r.outcome='escaped' THEN 0 ELSE 30 END) AS score FROM lane_houses h JOIN lane_runs r ON r.code=h.code WHERE h.hidden=0 AND h.approved=1 AND r.scored=1 AND r.created>$1 GROUP BY h.owner ORDER BY score DESC,h.owner LIMIT ${limit}`,
      [final ? 0 : h.now() - 7 * 86400000],
    );
  const winners = rows.map((r) => String(r.owner));
  if (final) {
    const visitors = await h.db.query(
      'SELECT wallet,SUM(points) AS score FROM lane_runs WHERE scored=1 GROUP BY wallet HAVING SUM(points)>0 ORDER BY score DESC,wallet LIMIT 10',
    );
    winners.push(...visitors.map((v) => String(v.wallet)));
  }
  if (winners.length)
    await h.economy.prizePool(
      final ? 'final-2026' : `week-${now.toISOString().slice(0, 10)}`,
      [...new Set(winners)],
    );
}
