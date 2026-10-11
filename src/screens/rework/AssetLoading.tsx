import { useEffect, useState, type ReactNode } from 'react';
import { loadAssetPack } from '../../game/rework/asset-pack';
import { Logo } from '../hollow/Arrival';
import { Segments } from './ui';
import { XProfileLink } from './XProfileLink';
export function AssetLoading({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadAssetPack((value) => {
      if (active) setProgress(value);
    })
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  if (ready) return children;
  return (
    <section className="night-loading">
      <XProfileLink />
      <div className="night-loading-brand">
        <Logo />
        <h1>LET’S SCREAM TOGETHER</h1>
        <p>EVERY NIGHT IS HALLOWEEN</p>
      </div>
      <div className="night-loading-progress">
        <div>
          <span>WAKING THE NEIGHBORHOOD</span>
          <b>{progress}%</b>
        </div>
        <Segments
          value={progress}
          count={40}
          color="blood"
          label="Loading world assets"
        />
        {error && <p role="alert">{error}</p>}
      </div>
      {error && (
        <button
          className="night-press"
          onClick={() => {
            setError('');
            setAttempt((n) => n + 1);
          }}
        >
          RETRY LOADING
        </button>
      )}
    </section>
  );
}
