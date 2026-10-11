import { useEffect, useRef, useState } from 'react';
import { laneApi } from '../../lib/hollow-api';
import { Replay, type ReplayData } from './Replay';
export function Windows({ onClose }: { onClose: () => void }) {
  const [windows, setWindows] = useState<{ id: string; code: string }[]>([]),
    [chosen, setChosen] = useState<string | null>(null),
    [run, setRun] = useState<ReplayData | null>(null),
    [error, setError] = useState(''),
    current = useRef<ReplayData | null>(null);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        if (chosen) {
          const next = await laneApi<ReplayData>(`/windows/${chosen}`);
          if (!active) return;
          if (!current.current || !current.current.frames.length) {
            current.current = next;
            setRun(next);
          } else current.current.frames = next.frames;
        } else {
          const list = await laneApi<typeof windows>('/windows');
          if (active) setWindows(list);
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [chosen]);
  if (run && run.frames.length) return <Replay run={run} onClose={onClose} />;
  return (
    <div className="hl-scrim">
      <section className="hl-panel">
        <button className="hl-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <span className="hl-eyebrow">FIVE SECONDS BEHIND THE FOOTSTEPS</span>
        <h1>AT THE WINDOW.</h1>
        <p>
          {error ||
            (chosen
              ? 'waiting for the delayed footsteps…'
              : 'peek into a live visit. the final result is verified separately.')}
        </p>
        {windows.map((w) => (
          <button key={w.id} onClick={() => setChosen(w.id)}>
            {w.code} · WATCH
          </button>
        ))}
        {!windows.length && !chosen && <p>no one is inside right now.</p>}
      </section>
    </div>
  );
}
