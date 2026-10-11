import type { Snapshot } from '../../shared/types';
import { Meter, Key } from '../components/ui';
export function Spectator({
  snapshot: s,
  follow,
  onFollow,
  crowd,
  onScream,
  onLeave,
}: {
  snapshot: Snapshot | null;
  follow: string;
  onFollow: (id: string) => void;
  crowd: number;
  onScream: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="spectator">
      <div className="spectator-top">
        <span className="tag">SPECTATING · 10 SECOND DELAY</span>
        <button onClick={onLeave}>
          BACK TO THE FIRE <Key>ESC</Key>
        </button>
      </div>
      {!s ? (
        <div className="center-message">
          <h2>LET THE DARK CATCH UP.</h2>
          <p>the broadcast begins after the safety delay.</p>
        </div>
      ) : (
        <>
          <div className="spectator-objectives">
            <h3>
              {s.generators.filter((g) => g.progress >= 1).length} /{' '}
              {s.required} GENERATORS
            </h3>
            <div>
              {s.generators.map((g) => (
                <Meter key={g.id} value={g.progress} />
              ))}
            </div>
          </div>
          <div className="watch-feed">
            {s.events
              .filter((e) => !['scratch', 'blood'].includes(e.kind))
              .slice(-5)
              .map((e) => (
                <p key={e.id}>
                  {e.kind === 'power'
                    ? 'something came back to life.'
                    : e.kind === 'take'
                      ? 'another voice went quiet.'
                      : e.kind === 'together'
                        ? 'they screamed together.'
                        : e.kind === 'escape'
                          ? 'someone made it out.'
                          : `${e.kind} in the fairground.`}
                </p>
              ))}
          </div>
        </>
      )}
      <div className="watch-cameras">
        <button
          className={follow === 'overview' ? 'selected' : ''}
          onClick={() => onFollow('overview')}
        >
          OVERVIEW
        </button>
        <button
          className={follow === 'free' ? 'selected' : ''}
          onClick={() => onFollow('free')}
        >
          FREE FLY<span>WASD · Q/E · mouse</span>
        </button>
        {s?.players.map((p) => (
          <button
            key={p.id}
            className={follow === p.id ? 'selected' : ''}
            onClick={() => onFollow(p.id)}
          >
            <b>{p.name}</b>
            <span>{p.health}</span>
          </button>
        ))}
      </div>
      <div className="crowd">
        <button onClick={onScream}>
          SCREAM FROM THE STANDS <Key>Q</Key>
        </button>
        <Meter value={crowd / 100} />
        <p>crowd reactions are cosmetic.</p>
      </div>
    </div>
  );
}
