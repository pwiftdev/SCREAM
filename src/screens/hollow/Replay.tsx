import { hollowAudio } from '../../lib/hollow-audio';
import { useEffect, useRef, useState } from 'react';
import { H } from '../../../shared/config';
import { decodeHouse, type HouseWire } from '../../../shared/house/format';
import {
  startVisit,
  tickVisit,
  type Frame,
} from '../../../shared/house/simulation';
import { HollowRenderer } from '../../game/hollow/renderer';
export interface ReplayData {
  id: string;
  house: HouseWire;
  seed: number;
  frames: Frame[];
  outcome: string;
  mic: { tick: number; peak: number }[];
}
export function Replay({
  run,
  onClose,
}: {
  run: ReplayData;
  onClose: () => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    [tick, setTick] = useState(0),
    [speed, setSpeed] = useState(1),
    [playing, setPlaying] = useState(true),
    request = useRef<number | null>(null),
    controls = useRef({ speed, playing });
  controls.current = { speed, playing };
  useEffect(() => {
    const h = decodeHouse(run.house),
      r = new HollowRenderer(host.current!);
    r.house(h);
    hollowAudio.enter(h);
    let s = startVisit(h, run.seed),
      frame = 0,
      last = 0,
      acc = 0;
    const loop = (now: number) => {
      if (request.current !== null) {
        s = startVisit(h, run.seed);
        for (let i = 0; i < request.current; i++)
          tickVisit(h, s, run.frames[i]);
        request.current = null;
        hollowAudio.seek(s);
      }
      acc +=
        Math.min(0.1, (now - (last || now)) / 1000) * controls.current.speed;
      last = now;
      if (controls.current.playing)
        while (acc >= 1 / H.TICK_HZ && s.tick < run.frames.length) {
          tickVisit(h, s, run.frames[s.tick]);
          acc -= 1 / H.TICK_HZ;
        }
      else acc = 0;
      if (controls.current.playing) hollowAudio.update(s);
      r.render(s, now / 1000);
      if (s.tick % 6 === 0) setTick(s.tick);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      hollowAudio.menu();
      r.dispose();
    };
  }, [run]);
  return (
    <main className="hl-app">
      <div ref={host} className="hl-world" />
      <header className="hl-build-header">
        <div>
          <span className="hl-eyebrow">VISITOR REPLAY</span>
          <h2>{run.house.title}</h2>
        </div>
        <button onClick={onClose}>CLOSE REPLAY</button>
      </header>
      <footer className="hl-replay-controls hl-panel">
        <div>
          <button
            onClick={() => {
              hollowAudio.silenceEffects();
              setPlaying(!playing);
            }}
          >
            {playing ? 'PAUSE' : 'PLAY'}
          </button>
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              aria-pressed={speed === s}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
          <span>
            {(tick / H.TICK_HZ).toFixed(1)} /{' '}
            {(run.frames.length / H.TICK_HZ).toFixed(1)}s · {run.outcome}
          </span>
        </div>
        <input
          aria-label="Replay timeline"
          type="range"
          min="0"
          max={run.frames.length - 1}
          value={tick}
          onChange={(e) => {
            request.current = Number(e.target.value);
            setTick(Number(e.target.value));
          }}
        />
        <div className="hl-replay-markers">
          {run.mic.map((m, i) => (
            <button
              key={i}
              style={{ left: `${(m.tick / run.frames.length) * 100}%` }}
              onClick={() => (request.current = m.tick)}
            >
              SCREAM
            </button>
          ))}
        </div>
      </footer>
    </main>
  );
}
