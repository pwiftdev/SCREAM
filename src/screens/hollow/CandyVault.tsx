import { useEffect, useState } from 'react';
import { laneApi } from '../../lib/hollow-api';
interface CandyStatus {
  mode: string;
  fund: number;
  round: {
    remaining: number;
    initial: number;
    ends: number;
    settled: boolean;
  } | null;
  hunted: number;
  defended: number;
}
export function useCandyStatus(enabled = true) {
  const [status, setStatus] = useState<CandyStatus | null>(null),
    [error, setError] = useState(''),
    [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const load = () =>
      laneApi<CandyStatus>('/candy')
        .then((s) => {
          if (active) {
            setStatus(s);
            setNow(Date.now());
            setError('');
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [enabled]);
  return { status, error, now };
}
export function CandyVault() {
  const { status, error, now } = useCandyStatus();
  const round = status?.round,
    hours = round ? Math.max(0, (round.ends - now) / 3600000) : 0;
  return (
    <section className="scream-vault">
      <span className="hl-eyebrow">CANDY VAULT · SIMULATED $SCREAM</span>
      <h2>HIDE IT. KEEP IT.</h2>
      <p>
        Every eligible hunter who escapes with your candy takes 10% of your
        remaining round reward. Defend what is left until dawn.
      </p>
      <div className="hl-result-stats">
        <div>
          <strong>{round?.remaining.toLocaleString() ?? '—'}</strong>
          <span>{round?.settled ? 'DEFENDED LAST ROUND' : 'STILL HIDDEN'}</span>
        </div>
        <div>
          <strong>{status?.hunted.toLocaleString() ?? '0'}</strong>
          <span>EARNED HUNTING</span>
        </div>
        <div>
          <strong>{status?.defended.toLocaleString() ?? '0'}</strong>
          <span>EARNED DEFENDING</span>
        </div>
      </div>
      {round ? (
        <>
          <progress
            aria-label="Candy reward remaining"
            value={round.remaining}
            max={round.initial}
          />
          <p>
            {round.initial - round.remaining} stolen ·{' '}
            {round.settled
              ? 'Round complete. Publish a verified house to begin another.'
              : `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m until your remaining reward settles.`}
          </p>
        </>
      ) : (
        <p>
          Publish your verified house to reserve a 1,000 SIMULATED $SCREAM
          round, while funding remains.
        </p>
      )}
      <p className="scream-fine">
        Free entry. One rewarded escape per hunter per house per round; 15
        seconds minimum. No self-raids. Only funded rewards exist. Test
        treasury: {status?.fund.toLocaleString() ?? '…'} $SCREAM · SIMULATED. No
        real payouts or creator-fee collection are enabled.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
