import { useEffect, useRef, useState } from 'react';
import type { PerformanceStats, ViewSettings } from '../game/renderer';
export interface Settings extends ViewSettings {
  master: number;
  music: number;
  effects: number;
  voices: number;
  sensitivity: number;
  keys: Record<string, string>;
}
export const defaultSettings: Settings = {
  quality: 'Medium',
  fov: 65,
  reducedMotion: false,
  flashReduction: false,
  master: 0.6,
  music: 0.4,
  effects: 0.75,
  voices: 0.65,
  sensitivity: 1,
  keys: {
    forward: 'KeyW',
    backward: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    interact: 'KeyE',
    scream: 'KeyQ',
    skill: 'Space',
    walk: 'ShiftLeft',
    crouch: 'ControlLeft',
  },
};
export function readSettings(): Settings {
  try {
    const v = JSON.parse(localStorage.getItem('scream.settings') ?? '{}');
    const next = { ...defaultSettings, keys: { ...defaultSettings.keys } };
    if (['Low', 'Medium', 'High', 'Ultra'].includes(v.quality))
      next.quality = v.quality;
    for (const k of ['reducedMotion', 'flashReduction'] as const)
      if (typeof v[k] === 'boolean') next[k] = v[k];
    for (const [key, min, max] of [
      ['master', 0, 1],
      ['music', 0, 1],
      ['effects', 0, 1],
      ['voices', 0, 1],
      ['fov', 50, 100],
      ['sensitivity', 0.2, 3],
    ] as const) {
      if (typeof v[key] === 'number' && Number.isFinite(v[key]))
        next[key] = Math.max(min, Math.min(max, v[key]));
    }
    for (const k of Object.keys(next.keys)) {
      const binding = v.keys?.[k];
      if (
        typeof binding === 'string' &&
        /^(Key[A-Z]|Digit[0-9]|Space|ShiftLeft|ControlLeft|AltLeft|Arrow(Up|Down|Left|Right))$/.test(
          binding,
        )
      )
        next.keys[k] = binding;
    }
    return next;
  } catch {
    return defaultSettings;
  }
}
export function useSettings() {
  const [settings, set] = useState(readSettings);
  return [
    settings,
    (next: Settings) => {
      set(next);
      try {
        localStorage.setItem('scream.settings', JSON.stringify(next));
      } catch {
        return;
      }
    },
  ] as const;
}
export function useAutoQuality(
  perf: PerformanceStats | null,
  onChange: (settings: Settings) => void,
) {
  const samples = useRef<number[]>([]);
  const previous = useRef<PerformanceStats | null>(null);
  useEffect(() => {
    if (
      !perf ||
      perf === previous.current ||
      document.hidden ||
      samples.current.length >= 8
    )
      return;
    previous.current = perf;
    try {
      if (localStorage.getItem('scream.settings')) return;
      samples.current.push(perf.fps);
      if (samples.current.length === 8) {
        const average = samples.current.slice(2).reduce((a, b) => a + b, 0) / 6;
        onChange({
          ...readSettings(),
          quality: average < 45 ? 'Low' : 'Medium',
        });
      }
    } catch {
      return;
    }
  }, [perf, onChange]);
}
