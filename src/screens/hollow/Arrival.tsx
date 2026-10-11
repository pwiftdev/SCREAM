import { useEffect, useState } from 'react';
import { hollowAudio } from '../../lib/hollow-audio';
import { Backdrop } from '../rework/Backdrop';
import { Segments, PanelTitle } from '../rework/ui';
import { XProfileLink } from '../rework/XProfileLink';
export function Logo({ className = '' }: { className?: string }) {
  return (
    <img
      className={`scream-logo ${className}`}
      src="/scream-logo.svg"
      alt="Let's Scream Together mask"
    />
  );
}
const tips = [
  'You wake far from the others. Select your crowbar with 2. Find a grave shovel, collect it with E and select it with 3.',
  'Walk to a free plot sign and press E to claim it. Build there, save, and step back into the night.',
  'When a raider finds your stash and escapes, they take a share of your house’s remaining reward. Spread your candy across rooms.',
  'Free plots stay free. Build a nightmare, hide your candy, then test your own escape.',
  'Hold E to search. Hold V with your microphone enabled to let the neighborhood hear your scream.',
  'Your lantern reveals the way. It also makes you easy to spot.',
];
const statuses = [
  'RAISING THE DEAD',
  'CARVING PUMPKINS',
  'LOADING THE GRAVEYARD',
  'HIDING EVERYONE’S CANDY',
  'WAKING THE NEIGHBORHOOD',
];
export function Arrival({
  onPlay,
  onSettings,
  busy,
}: {
  onPlay: () => void;
  onSettings: () => void;
  busy: boolean;
}) {
  const [progress, setProgress] = useState(0),
    [tip, setTip] = useState(0),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.src = '/scream-logo.svg';
    void Promise.all([
      image.decode().catch(() => {}),
      document.fonts.ready,
    ]).then(() => {
      if (alive) {
        setProgress(100);
        setReady(true);
      }
    });
    setProgress(25);
    const id = setInterval(() => setTip((v) => (v + 1) % tips.length), 4500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  useEffect(() => {
    if (!ready || busy) return;
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Tab' || e.code === 'Escape') return;
      if (
        e.target instanceof Element &&
        e.target.closest(
          'a, button, input, select, textarea, [contenteditable]',
        )
      )
        return;
      void hollowAudio.unlock().catch(() => {});
      onPlay();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [ready, busy, onPlay]);
  return (
    <section className="night-loading">
      <Backdrop mode="loading" />
      <div className="night-loading-shade" />
      <div className="night-loading-brand">
        <Logo />
        <h1>LET’S SCREAM TOGETHER</h1>
        <p>EVERY NIGHT IS HALLOWEEN</p>
      </div>
      <div className="night-loading-progress">
        <div>
          <span>{statuses[Math.min(4, Math.floor(progress / 20))]}</span>
          <b>{progress}%</b>
        </div>
        <Segments
          value={progress}
          count={40}
          color="blood"
          label="Loading progress"
        />
      </div>
      <aside className="night-tip night-panel">
        <PanelTitle>TIP</PanelTitle>
        <p>{tips[tip]}</p>
      </aside>
      <button
        className="night-press"
        disabled={!ready || busy}
        onClick={() => {
          void hollowAudio.unlock().catch(() => {});
          onPlay();
        }}
      >
        {ready ? 'PRESS ANY KEY' : 'LOADING…'}
      </button>
      <button className="night-loading-settings" onClick={onSettings}>
        AUDIO & ACCESSIBILITY
      </button>
      <XProfileLink />
    </section>
  );
}
