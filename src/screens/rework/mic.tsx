import { useEffect, useRef, useState } from 'react';
import { ScreamDetector } from '../../lib/hollow-mic';
import { readHollowSettings } from '../../lib/hollow-settings';
import { Segments } from './ui';
export function useVoice(onScream: (peak: number) => void, enabled = true) {
  const [level, setLevel] = useState(0),
    [on, setOn] = useState(false),
    [error, setError] = useState('');
  const detector = useRef<ScreamDetector | null>(null),
    held = useRef(false),
    callback = useRef(onScream),
    busy = useRef(false),
    alive = useRef(true),
    active = useRef(enabled);
  active.current = enabled;
  callback.current = onScream;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      detector.current?.stop();
    };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyV') held.current = true;
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'KeyV') held.current = false;
    };
    const blur = () => {
      held.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      held.current = false;
    };
  }, [enabled]);
  async function toggle() {
    if (on) {
      detector.current?.stop();
      setOn(false);
      setLevel(0);
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setError('');
    const d = (detector.current = new ScreamDetector());
    try {
      await d.start(
        readHollowSettings().micThreshold,
        (v) => {
          if (alive.current) setLevel(v);
        },
        (p) => {
          if (held.current && active.current) callback.current(p);
        },
      );
      if (alive.current) setOn(true);
      else d.stop();
    } catch {
      if (alive.current)
        setError('Microphone unavailable. Q still lets you scream.');
    } finally {
      busy.current = false;
    }
  }
  return { level, on, error, toggle };
}
export function MicMeter({ voice }: { voice: ReturnType<typeof useVoice> }) {
  const db =
    voice.level > 0 ? Math.max(-60, 20 * Math.log10(voice.level)) : -60;
  return (
    <div className="night-mic">
      <div>
        <button onClick={voice.toggle}>
          {voice.on ? 'SCREAM' : 'ENABLE MIC'}
        </button>
        <small>
          [V] HOLD · {voice.on ? `${db.toFixed(0)} DBFS` : 'MIC OFF'}
        </small>
      </div>
      <Segments
        value={((db + 60) / 60) * 100}
        count={24}
        color="mic"
        label="Microphone level"
      />
      <small>
        {voice.error || 'VOICE LEVEL ONLY · AUDIO NEVER LEAVES YOUR DEVICE'}
      </small>
    </div>
  );
}
