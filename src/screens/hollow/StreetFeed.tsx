import { useEffect, useState } from 'react';
import { laneApi } from '../../lib/hollow-api';
type Entry = { id: string; code: string; wallet: string; outcome: string };
export function StreetFeed({
  homeCode,
  onWatch,
}: {
  homeCode?: string;
  onWatch: () => void;
}) {
  const [inside, setInside] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    if (!inside) return;
    const key = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') onWatch();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [inside, onWatch]);
  useEffect(() => {
    let active = true;
    const refresh = () => {
      void Promise.all([
        laneApi<Entry[]>('/feed'),
        laneApi<{ code: string }[]>('/windows'),
      ])
        .then(([rows, windows]) => {
          if (active) {
            setEntries(rows.slice(0, 3));
            setInside(windows.some((w) => w.code === homeCode));
          }
        })
        .catch(() => {});
    };
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [homeCode]);
  return entries.length || inside ? (
    <aside className="hl-street-feed" aria-label="Recent street activity">
      {inside && (
        <button className="night-house-alert" onClick={onWatch}>
          SOMEONE IS INSIDE YOUR HOUSE · [H] WATCH
        </button>
      )}
      {entries.map((e) => (
        <p key={e.id}>
          <b>{e.wallet.slice(0, 6)}</b>{' '}
          {e.outcome === 'escaped' ? 'escaped' : 'was lost in'}{' '}
          <span>{e.code}</span>
        </p>
      ))}
    </aside>
  ) : null;
}
