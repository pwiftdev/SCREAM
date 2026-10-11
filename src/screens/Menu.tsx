import { C } from '../../shared/config';
import { Key, Panel, Icon } from '../components/ui';
export function Menu({
  watchers,
  live,
  onPlay,
  onFriends,
  onWatch,
}: {
  watchers: number;
  live: {
    live: boolean;
    generators: number;
    players: { name: string; role: string }[];
  };
  onPlay: () => void;
  onFriends: () => void;
  onWatch: () => void;
}) {
  return (
    <>
      <section className="menu-title">
        <p className="eyebrow">
          <span className="red-line" />
          ASYMMETRIC SURVIVAL HORROR
        </p>
        <h1>
          DON’T GO
          <br />
          QUIETLY.
        </h1>
        <p className="description">
          the fairground closed years ago.
          <br />
          something inside never left.
        </p>
        <div className="edition">
          <span>01</span>
          <div>
            ROTTEN HOLLOW
            <br />
            <small>THE FAIRGROUND</small>
          </div>
        </div>
      </section>
      <Panel
        className="menu-panel"
        eyebrow="TONIGHT, YOU HAVE COMPANY"
        title="FOUR AGAINST THE DARK."
      >
        <div className="match-art">
          <Icon kind="skull" size={60} />
          <span>
            {live.live
              ? `${live.generators} GENERATORS REPAIRED`
              : 'THE HOLLOW IS WAITING'}
          </span>
          <div className="scanline" />
        </div>
        <div className="match-meta">
          <span>
            <i className="status-dot" />
            {live.live ? 'A NIGHT IS IN PROGRESS' : 'LOCAL PRACTICE'}
          </span>
          <span>{C.SURVIVORS} vs 1</span>
        </div>
        <p>
          {live.live
            ? live.players
                .slice(0, 3)
                .map((p) => p.name)
                .join(' · ')
            : 'fix what’s broken. open the gates.'}
          <br />
          try to leave with everyone you came with.
        </p>
        <button className="primary" onClick={onPlay}>
          ENTER THE FAIRGROUND <span>↗</span>
        </button>
        <button className="secondary" onClick={onFriends}>
          PLAY WITH FRIENDS <Key>6</Key>
        </button>
        <button className="text-button" onClick={onWatch}>
          SPECTATE · {watchers} watching
        </button>
        <div className="panel-footnote">
          free local play · no funds · no live services
        </div>
      </Panel>
      <footer>
        <span className="tag">LOCAL BUILD</span>
        <span>some things are better faced together.</span>
        <span>
          <Key>ESC</Key> settings
        </span>
      </footer>
    </>
  );
}
