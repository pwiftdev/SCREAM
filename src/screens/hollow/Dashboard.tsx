import { CandyVault } from './CandyVault';
import { useEffect, useState } from 'react';
import { laneApi } from '../../lib/hollow-api';
import type { OwnHouse } from '../../lib/hollow-api';
export function Dashboard({
  own,
  busy,
  onBuild,
  onPublish,
  onClose,
  onReplay,
}: {
  own: OwnHouse;
  busy: boolean;
  onBuild: () => void;
  onPublish: () => void;
  onClose: () => void;
  onReplay: (id: string) => void;
}) {
  const [visits, setVisits] = useState<
      { id: string; outcome: string; ticks: number; x: number; z: number }[]
    >([]),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    laneApi<typeof visits>('/visits')
      .then((v) => {
        if (active) setVisits(v);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="hl-panel hl-dashboard">
      <button className="hl-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <span className="hl-eyebrow">
        YOUR HOUSE · {own.plot ? `PLOT ${own.plot.slot + 1} · ` : ''}
        {own.code}
      </span>
      <h1>{own.house.title}</h1>
      <p>
        {own.published
          ? 'your door is open. give them a reason to regret knocking.'
          : 'build a little nightmare. escape it yourself. then open the door.'}
      </p>
      <div className="hl-result-stats">
        <div>
          <strong>{own.house.props.length}</strong>
          <span>SCARE PROPS</span>
        </div>
        <div>
          <strong>{own.clear ? 'CLEAR' : 'UNTESTED'}</strong>
          <span>CURRENT DRAFT</span>
        </div>
        <div>
          <strong>{own.published ? 'OPEN' : 'CLOSED'}</strong>
          <span>PUBLIC DOOR</span>
        </div>
      </div>
      <p>
        {own.clear
          ? 'this exact draft has a server-verified escape.'
          : 'any edit needs a fresh clear run before it can go live.'}
      </p>
      <button className="hl-primary" disabled={busy} onClick={onBuild}>
        BUILD MY HOUSE →
      </button>
      <button disabled={!own.clear || busy} onClick={onPublish}>
        PUBLISH VERIFIED DRAFT
      </button>
      <CandyVault />
      <div className="hl-dashboard-replays">
        <span className="hl-eyebrow">RECENT VISITORS · {visits.length}</span>
        {error && <p role="alert">{error}</p>}
        {visits.length > 0 ? (
          <>
            <div className="hl-heatmap" aria-label="Death heatmap">
              {visits
                .filter((v) => v.outcome !== 'escaped')
                .map((v) => (
                  <i
                    key={v.id}
                    style={{
                      left: `${(v.x / 24) * 100}%`,
                      top: `${(v.z / 24) * 100}%`,
                    }}
                  />
                ))}
            </div>
            <div className="hl-visits">
              {visits.map((v) => (
                <button key={v.id} onClick={() => onReplay(v.id)}>
                  <span>
                    {v.outcome} · {(v.ticks / 60).toFixed(1)}s
                  </span>
                  <span>WATCH REPLAY →</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p>the footsteps will appear here.</p>
        )}
      </div>
      {own.published && (
        <p className="hl-share">
          house link:{' '}
          <a href={`/h/${own.code}`}>
            {location.origin}/h/{own.code}
          </a>
        </p>
      )}
    </section>
  );
}
