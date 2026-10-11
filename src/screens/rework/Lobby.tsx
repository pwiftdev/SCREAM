import { hollowAudio } from '../../lib/hollow-audio';
import { useEffect, useMemo, useState } from 'react';
import type { OwnHouse } from '../../lib/hollow-api';
import { decodeHouse } from '../../../shared/house/format';
import { B } from '../../../shared/house/blocks';
import { nightmare } from '../../../shared/house/rework';
import { Logo } from '../hollow/Arrival';
import { useCandyStatus } from '../hollow/CandyVault';
import { Backdrop } from './Backdrop';
import { PanelTitle, Segments, ItemIcon, useDawn } from './ui';
export function Lobby({
  own,
  onPlay,
  onBuild,
  onPlots,
  onReport,
  onSettings,
  busy,
  onExtra,
}: {
  own: OwnHouse | null;
  onPlay: () => void;
  onBuild: () => void;
  onPlots: () => void;
  onReport: () => void;
  onSettings: () => void;
  busy: boolean;
  onExtra: (panel: string) => void;
}) {
  useEffect(() => {
    hollowAudio.menu();
  }, []);
  const house = useMemo(
      () => (own ? decodeHouse(own.house, true) : undefined),
      [own],
    ),
    { status } = useCandyStatus(!!own),
    dawn = useDawn(),
    [invite, setInvite] = useState('');
  const candy = (status?.hunted ?? 0) + (status?.defended ?? 0),
    rating = house ? nightmare(house).total : 0;
  const choices = [
    ['PLAY TONIGHT', 'Head out and hunt for candy', onPlay],
    ['MY HAUNTED HOUSE', 'Build traps, hide your stashes', onBuild],
    ['CHOOSE A PLOT', 'Free plots open in the neighborhood', onPlots],
    ['LAST NIGHT’S REPORT', 'Raids, scares and candy', onReport],
    ['SETTINGS', 'Audio, mic and controls', onSettings],
  ] as const;
  return (
    <section className="night-lobby">
      <Backdrop mode="menu" house={house} />
      <div className="night-menu-shade" />
      <header className="night-brand">
        <Logo />
        <div>
          <h2>LET’S SCREAM TOGETHER</h2>
          <small>NIGHT {dawn.index} · FOG NIGHT</small>
        </div>
      </header>
      <nav className="night-menu">
        {choices.map(([title, sub, action], i) => (
          <button
            disabled={busy}
            key={title}
            className={i === 0 ? 'primary' : ''}
            onClick={action}
          >
            <strong>{title}</strong>
            <span>{sub}</span>
          </button>
        ))}
      </nav>
      <aside className="night-lobby-side">
        <section className="night-profile night-panel">
          <Logo />
          <div>
            <h3>{own ? `WANDERER ${own.code.slice(0, 4)}` : 'NEW WANDERER'}</h3>
            <small>YOUR LOCAL PROFILE</small>
            <Segments
              value={own?.published ? 100 : own?.plot ? 50 : 0}
              count={20}
              label="House setup progress"
            />
          </div>
        </section>
        <div className="night-wallets">
          <section className="night-panel">
            <ItemIcon name="sprite:candy" />
            <div>
              <strong>{candy.toLocaleString()}</strong>
              <small>CANDY · SIMULATED</small>
            </div>
          </section>
          <section className="night-panel">
            <Logo />
            <div>
              <strong>{candy.toLocaleString()}</strong>
              <small>$SCREAM · SIMULATED</small>
            </div>
          </section>
        </div>
        <section className="night-panel night-house-card">
          <PanelTitle>YOUR HOUSE</PanelTitle>
          <h3>
            {own?.plot
              ? `PLOT ${String(own.plot.slot + 1).padStart(2, '0')} · YOUR HAUNT`
              : 'YOUR NIGHTMARE STARTS HERE'}
          </h3>
          <div className="night-house-stats">
            <div>
              <b>{house?.blocks.filter((b) => b === B.CANDY).length ?? 0}</b>
              <small>STASHES</small>
            </div>
            <div>
              <b className="candy-text">{status?.round?.remaining ?? 0}</b>
              <small>HIDDEN · SIMULATED</small>
            </div>
            <div>
              <b>{rating}</b>
              <small>NIGHTMARE</small>
            </div>
          </div>
          <p>
            {own?.published
              ? 'Your door is open. Keep your hiding places secret.'
              : 'Choose a free plot, hide candy and test your escape.'}
          </p>
          <button className="night-outline" onClick={onBuild}>
            FORTIFY HOUSE
          </button>
        </section>
        <section className="night-panel night-tonight">
          <PanelTitle>
            TONIGHT <span>DAWN IN {dawn.text}</span>
          </PanelTitle>
          <h3>FOG NIGHT</h3>
          <p>
            Visibility drops in the graveyard. Find a stash, escape the house
            and keep your reward.
          </p>
          <div className="night-party-slots">
            <div>
              <b>YOU</b>
              <small>READY</small>
            </div>
            {[1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => {
                  navigator.clipboard
                    .writeText(
                      `${location.origin}/?neighborhood=${Math.floor((own?.plot?.slot ?? 0) / 40)}`,
                    )
                    .then(() => setInvite('Invite link copied.'))
                    .catch(() => setInvite(location.origin));
                }}
              >
                <b>+</b>
                <small>INVITE</small>
              </button>
            ))}
          </div>
          {invite && <small role="status">{invite}</small>}
        </section>
      </aside>
      <footer className="night-lobby-foot">
        FREE ENTRY · LOCAL PLAYTEST · ALL $SCREAM REWARDS ARE SIMULATED
        <button onClick={() => onExtra('my house')}>HOUSE RECORDS</button>
        <button onClick={() => onExtra('leaderboard')}>LEADERBOARD</button>
        <button onClick={() => onExtra('windows')}>LIVE WINDOWS</button>
        <button onClick={() => onExtra('wallet')}>PROFILE</button>
      </footer>
    </section>
  );
}
