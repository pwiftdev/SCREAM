import { useEffect, useState } from 'react';
import { laneApi } from '../../lib/hollow-api';
export function Leaderboards({ onClose }: { onClose: () => void }) {
  const [kind, setKind] = useState('houses'),
    [period, setPeriod] = useState('daily'),
    [rows, setRows] = useState<Record<string, string | number>[]>([]),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    setRows([]);
    laneApi<Record<string, string | number>[]>(
      `/leaderboard?kind=${kind}&period=${period}`,
    )
      .then((v) => {
        if (active) setRows(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [kind, period]);
  return (
    <section className="hl-panel">
      <button className="hl-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <span className="hl-eyebrow">NAMES THE STREET REMEMBERS</span>
      <h1>AFTER DARK.</h1>
      <div className="hl-tab-row">
        {['houses', 'escapers', 'hunters'].map((k) => (
          <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k}>
            {k === 'houses'
              ? 'SCARIEST HOUSES'
              : k === 'hunters'
                ? 'BOUNTY HUNTERS'
                : 'BEST ESCAPERS'}
          </button>
        ))}
      </div>
      <div className="hl-tab-row">
        {['daily', 'weekly', 'season'].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            aria-pressed={period === p}
          >
            {p.toUpperCase()}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {rows.length ? (
        <ol className="hl-rankings">
          {rows.map((r, i) => (
            <li key={String(r.code ?? r.wallet)}>
              <span>{String(i + 1).padStart(2, '0')}</span>
              <strong>{r.title ?? `${String(r.wallet).slice(0, 8)}…`}</strong>
              <b>{r.score}</b>
            </li>
          ))}
        </ol>
      ) : (
        <p>
          the street is quiet. verified visits lasting at least 15 seconds will
          appear here.
        </p>
      )}
    </section>
  );
}
