import { useState } from 'react';
import { QUALITY } from '../../shared/config';
import { defaultSettings, type Settings as Values } from '../lib/settings';
import { Panel, keyLabel } from '../components/ui';
export function Settings({
  value,
  onChange,
  onClose,
}: {
  value: Values;
  onChange: (v: Values) => void;
  onClose: () => void;
}) {
  const [binding, setBinding] = useState('');
  const set = <K extends keyof Values>(k: K, v: Values[K]) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="modal-backdrop">
      <Panel
        title="MAKE YOURSELF UNEASY"
        eyebrow="settings"
        className="settings"
      >
        <button className="close" onClick={onClose} aria-label="Close settings">
          ×
        </button>
        <div className="settings-grid">
          <div>
            <h3>GRAPHICS</h3>
            <div className="segmented">
              {Object.keys(QUALITY).map((q) => (
                <button
                  className={value.quality === q ? 'selected' : ''}
                  key={q}
                  onClick={() => set('quality', q as Values['quality'])}
                >
                  {q}
                </button>
              ))}
            </div>
            {(['fov', 'sensitivity'] as const).map((k) => (
              <label className="range" key={k}>
                {k === 'fov' ? 'field of view' : 'mouse sensitivity'}
                <output>{value[k]}</output>
                <input
                  type="range"
                  min={k === 'fov' ? 50 : 0.2}
                  max={k === 'fov' ? 100 : 3}
                  step={k === 'fov' ? 1 : 0.1}
                  value={value[k]}
                  onChange={(e) => set(k, Number(e.target.value))}
                />
              </label>
            ))}
            {(['reducedMotion', 'flashReduction'] as const).map((k) => (
              <label className="toggle" key={k}>
                <input
                  type="checkbox"
                  checked={value[k]}
                  onChange={(e) => set(k, e.target.checked)}
                />
                {k === 'reducedMotion'
                  ? 'reduce camera motion'
                  : 'reduce flashes'}
              </label>
            ))}
            <h3>AUDIO</h3>
            {(['master', 'music', 'effects', 'voices'] as const).map((k) => (
              <label className="range" key={k}>
                {k}
                <output>{Math.round(value[k] * 100)}%</output>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step=".05"
                  value={value[k]}
                  onChange={(e) => set(k, Number(e.target.value))}
                />
              </label>
            ))}
          </div>
          <div>
            <h3>CONTROLS</h3>
            <p>select a binding, then press a key.</p>
            <div className="bindings">
              {Object.entries(value.keys).map(([action, key]) => (
                <button
                  key={action}
                  onClick={() => setBinding(action)}
                  onKeyDown={(e) => {
                    if (binding === action) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.code !== 'Escape') {
                        const keys = { ...value.keys };
                        const duplicate = Object.entries(keys).find(
                          ([a, k]) => a !== action && k === e.code,
                        );
                        if (duplicate) keys[duplicate[0]] = keys[action];
                        keys[action] = e.code;
                        set('keys', keys);
                      }
                      setBinding('');
                    }
                  }}
                >
                  <span>{action}</span>
                  <kbd>{binding === action ? 'press key' : keyLabel(key)}</kbd>
                </button>
              ))}
            </div>
            <p className="muted">
              left mouse: attack · right mouse: hush
              <br />
              esc: pause · click the world to look around
            </p>
            <button
              className="text-button"
              onClick={() => onChange(defaultSettings)}
            >
              restore defaults
            </button>
            <p className="muted">
              <a href="/assets/credits.html" target="_blank" rel="noreferrer">
                Art and asset credits
              </a>
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
