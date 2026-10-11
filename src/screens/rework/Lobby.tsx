import { useEffect, useRef, useState } from 'react';
import {
  playerProfile,
  type PlayerProfile,
} from '../../../shared/player-profile';
import { rememberedProfile, savedProfile } from '../../lib/player-profile';
import { hollowAudio } from '../../lib/hollow-audio';
import { Logo } from '../hollow/Arrival';
import { Backdrop } from './Backdrop';
import { XProfileLink } from './XProfileLink';
import { useWorldPresence } from './useWorldPresence';

export function Lobby({
  onJoin,
  onSettings,
  busy,
  error,
  blocked,
}: {
  onJoin: (profile: PlayerProfile) => void;
  onSettings: () => void;
  busy: boolean;
  error: string;
  blocked: boolean;
}) {
  const [profile, setProfile] = useState(rememberedProfile);
  const [validation, setValidation] = useState('');
  const dirty = useRef(false);
  const presence = useWorldPresence();
  useEffect(() => {
    hollowAudio.menu();
    let active = true;
    void savedProfile()
      .then((saved) => {
        if (active && saved && !dirty.current) setProfile(saved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  function edit(key: keyof PlayerProfile, value: string) {
    dirty.current = true;
    setValidation('');
    setProfile((current) => ({ ...current, [key]: value }));
  }
  return (
    <section
      className="night-lobby night-main-menu"
      aria-label="Main menu"
      inert={blocked}
    >
      <Backdrop mode="menu" />
      <div className="night-menu-shade" />
      <header className="night-brand">
        <Logo />
        <div>
          <h2>LET’S SCREAM TOGETHER</h2>
          <small>EVERY NIGHT IS HALLOWEEN</small>
        </div>
      </header>
      <aside
        className="night-presence night-panel"
        aria-label="Live player count"
        aria-live="polite"
      >
        <span>LIVE · ON THE STREETS</span>
        <div>
          <b>{presence ? presence.players.toLocaleString() : '—'}</b>
          <span>
            PLAYERS
            <br />
            EXPLORING
          </span>
        </div>
        <small>
          {presence
            ? `UP TO ${presence.streetCapacity} PLAYERS PER STREET`
            : 'CONNECTING TO THE NEIGHBORHOOD…'}
        </small>
      </aside>
      <div className="night-entry">
        <span className="hl-eyebrow">THE NIGHT IS BETTER WITH COMPANY</span>
        <h1>
          DON’T SCREAM
          <br />
          <em>ALONE.</em>
        </h1>
        <p>
          Wander into the dark. Hunt for candy.
          <br />
          Give someone a reason to run.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            try {
              const next = playerProfile(profile);
              setValidation('');
              onJoin(next);
            } catch (e) {
              setValidation((e as Error).message);
            }
          }}
        >
          <label htmlFor="player-name">YOUR USERNAME</label>
          <input
            id="player-name"
            name="username"
            autoComplete="nickname"
            placeholder="What should we call you?"
            minLength={2}
            maxLength={20}
            required
            disabled={busy}
            value={profile.name}
            onChange={(e) => edit('name', e.target.value)}
          />
          <label htmlFor="player-wallet">
            PUBLIC SOLANA WALLET <span>OPTIONAL</span>
          </label>
          <input
            id="player-wallet"
            name="publicWallet"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Paste your public Solana address"
            maxLength={64}
            disabled={busy}
            value={profile.publicWallet}
            aria-describedby="player-wallet-help"
            onChange={(e) => edit('publicWallet', e.target.value)}
          />
          <small id="player-wallet-help">
            Saved to your profile. No wallet connection required.
          </small>
          <div className="night-entry-error" aria-live="polite">
            {(validation || error) && (
              <span role="alert">{validation || error}</span>
            )}
          </div>
          <div className="night-entry-actions">
            <button className="hl-primary" type="submit" disabled={busy}>
              {busy ? 'JOINING THE NIGHT…' : 'JOIN THE WORLD'}
            </button>
            <button
              className="night-outline"
              type="button"
              onClick={onSettings}
              disabled={busy}
            >
              SETTINGS
            </button>
          </div>
        </form>
      </div>
      <aside className="night-menu-story" aria-hidden="true">
        <span>LIGHTS ON. DOORS LOCKED.</span>
        <h2>
          SOMETHING
          <br />
          IS STILL OUT THERE.
        </h2>
        <p>
          Explore the woods. Build your haunt.
          <br />
          Trust no footsteps but your own.
        </p>
      </aside>
      <footer className="night-entry-footer">
        <XProfileLink />
        <span>
          FREE TO ENTER · NO HOUSE REQUIRED
          <br />
          <small>$SCREAM REWARDS ARE CURRENTLY SIMULATED</small>
        </span>
      </footer>
    </section>
  );
}
