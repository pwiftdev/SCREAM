import type { Houses } from './houses';
import { NIGHT } from '../../shared/house/rework';
const credits = "LEFT JOIN scream_candy_credits c ON c.id=('raid:' || r.id)";
export async function nightReport(houses: Houses, wallet: string) {
  const since =
    Math.floor(houses.now() / 1000 / NIGHT.seconds) * NIGHT.seconds * 1000;
  const raidScope = 'r.wallet=$1 AND r.created>=$2 AND r.scored=1';
  const [raids, [totals], [defense]] = await Promise.all([
    houses.db.query(
      `SELECT r.id,r.code,r.outcome,r.mic,COALESCE(c.amount,0) AS amount FROM lane_runs r ${credits} WHERE ${raidScope} ORDER BY r.created DESC LIMIT 50`,
      [wallet, since],
    ),
    houses.db.query(
      `SELECT COUNT(*) AS visits, COALESCE(SUM(CASE WHEN r.outcome='escaped' THEN 1 ELSE 0 END),0) AS escaped, COALESCE(SUM(c.amount),0) AS stolen FROM lane_runs r ${credits} WHERE ${raidScope}`,
      [wallet, since],
    ),
    houses.db.query(
      `SELECT COUNT(*) AS visits, COALESCE(SUM(CASE WHEN r.outcome='escaped' THEN 1 ELSE 0 END),0) AS found, COALESCE(SUM(c.amount),0) AS lost FROM lane_runs r JOIN lane_houses h ON h.code=r.code ${credits} WHERE h.owner=$1 AND r.wallet<>$1 AND r.created>=$2`,
      [wallet, since],
    ),
  ]);
  const peak = Math.max(
    0,
    ...raids.flatMap((r) => {
      try {
        const marks = JSON.parse(String(r.mic));
        return Array.isArray(marks)
          ? marks.map((m) =>
              Number.isFinite(m.peak) ? Math.max(0, Math.min(1, m.peak)) : 0,
            )
          : [];
      } catch {
        return [];
      }
    }),
  );
  return {
    raids: raids.map((r) => ({
      id: String(r.id),
      code: String(r.code),
      outcome: String(r.outcome),
      amount: Number(r.amount),
    })),
    totals: {
      visits: Number(totals.visits),
      escaped: Number(totals.escaped),
      stolen: Number(totals.stolen),
    },
    defense: {
      visits: Number(defense.visits),
      stopped: Number(defense.visits) - Number(defense.found),
      found: Number(defense.found),
      lost: Number(defense.lost),
    },
    loudest: Math.round(peak * 100),
    simulated: true,
  };
}
