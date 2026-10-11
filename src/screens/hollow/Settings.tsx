import { useEffect, useRef, useState } from 'react';
import {
  readHollowSettings,
  saveHollowSettings,
  type HollowSettings,
} from '../../lib/hollow-settings';
import { ScreamDetector } from '../../lib/hollow-mic';
export function HollowSettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState(readHollowSettings),
    [level, setLevel] = useState(0),
    [testing, setTesting] = useState(false),
    [micBusy, setMicBusy] = useState(false),
    [error, setError] = useState(''),
    mic = useRef<ScreamDetector | null>(null);
  useEffect(() => () => mic.current?.stop(), []);
  function change<K extends keyof HollowSettings>(
    key: K,
    value: HollowSettings[K],
  ) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      saveHollowSettings(next);
    } catch {
      setError(
        'browser storage is unavailable. settings work for this screen only.',
      );
    }
  }
  async function test() {
    if (testing) {
      mic.current?.stop();
      setTesting(false);
      return;
    }
    if (micBusy) return;
    setMicBusy(true);
    const detector = (mic.current = new ScreamDetector());
    try {
      await detector.start(settings.micThreshold, setLevel, () => {});
      setTesting(true);
    } catch {
      setError('microphone access was not granted');
    } finally {
      setMicBusy(false);
    }
  }
  return (
    <section className="hl-panel hl-settings">
      <button className="hl-close" aria-label="Close" onClick={onClose}>
        ×
      </button>
      <span className="hl-eyebrow">MAKE THE DARK YOURS</span>
      <h1>SETTINGS.</h1>
      <div className="hl-settings-grid">
        <section>
          <h3>PICTURE & SOUND</h3>
          {(
            [
              ['pixel', 'pixel scale', 1, 3, 0.5],
              ['distance', 'view distance', 12, 36, 1],
              ['grain', 'film grain', 0, 1, 0.05],
              ['cameraMotion', 'outdoor camera motion', 0, 1, 0.05],
              ['master', 'master', 0, 1, 0.05],
              ['music', 'ambience', 0, 1, 0.05],
              ['effects', 'effects', 0, 1, 0.05],
              ['voices', 'voices', 0, 1, 0.05],
              ['sensitivity', 'mouse sensitivity', 0.2, 3, 0.1],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key}>
              {label}
              <input
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                value={settings[key]}
                onChange={(e) => change(key, Number(e.target.value))}
              />
              <output>{settings[key].toFixed(1)}</output>
            </label>
          ))}
          <label>
            directional shadows
            <input
              type="checkbox"
              checked={settings.shadows}
              onChange={(e) => change('shadows', e.target.checked)}
            />
          </label>
          <label>
            cinematic effects
            <input
              type="checkbox"
              checked={settings.cinematic}
              onChange={(e) => change('cinematic', e.target.checked)}
            />
          </label>
          <label>
            contact shadows
            <input
              type="checkbox"
              checked={settings.contactShadows}
              onChange={(e) => change('contactShadows', e.target.checked)}
            />
          </label>
          <label>
            outdoor creature scares
            <input
              type="checkbox"
              checked={settings.creatureScares}
              onChange={(e) => change('creatureScares', e.target.checked)}
            />
          </label>
          <label>
            reduced flashing
            <input
              type="checkbox"
              checked={settings.reducedFlash}
              onChange={(e) => change('reducedFlash', e.target.checked)}
            />
          </label>
        </section>
        <section>
          <h3>YOUR VOICE</h3>
          <p>
            off until you choose to enable it in a visit. only scream times and
            levels are saved. never audio.
          </p>
          <label>
            detection threshold
            <input
              aria-label="Microphone threshold"
              type="range"
              min=".02"
              max=".8"
              step=".01"
              value={settings.micThreshold}
              onChange={(e) => change('micThreshold', Number(e.target.value))}
            />
          </label>
          <progress aria-label="Microphone level" max="1" value={level} />
          <button disabled={micBusy} onClick={test}>
            {testing ? 'STOP MIC TEST' : 'TEST MICROPHONE'}
          </button>
          <h3>CONTROLS</h3>
          <div className="hl-keybinds">
            {Object.entries(settings.keys).map(([name, key]) => (
              <label key={name}>
                {name}
                <button
                  onKeyDown={(e) => {
                    e.preventDefault();
                    if (
                      /^(Key[A-Z]|Space|ShiftLeft|ControlLeft|Arrow(Up|Down|Left|Right))$/.test(
                        e.code,
                      )
                    )
                      change('keys', { ...settings.keys, [name]: e.code });
                  }}
                >
                  {key.replace('Key', '')}
                </button>
              </label>
            ))}
          </div>
          <small>focus a control, then press its new key.</small>
        </section>
      </div>
      {error && <p role="alert">{error}</p>}
      <p>
        <a href="/audio/CREDITS.md" target="_blank" rel="noreferrer">
          sound credits
        </a>
        {' · '}
        <a href="/assets/credits.html" target="_blank" rel="noreferrer">
          art credits
        </a>
      </p>
    </section>
  );
}
