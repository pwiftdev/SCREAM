import { H } from '../../shared/config';
export interface HollowSettings {
  pixel: number;
  distance: number;
  shadows: boolean;
  cinematic: boolean;
  contactShadows: boolean;
  grain: number;
  cameraMotion: number;
  creatureScares: boolean;
  master: number;
  music: number;
  effects: number;
  voices: number;
  sensitivity: number;
  reducedFlash: boolean;
  micThreshold: number;
  keys: Record<string, string>;
}
export const hollowDefaults: HollowSettings = {
  pixel: H.PIXEL_SCALE,
  distance: H.FOG_FAR,
  shadows: true,
  cinematic: true,
  contactShadows: true,
  grain: 0.3,
  cameraMotion: 0.7,
  creatureScares: true,
  master: 0.65,
  music: 0.35,
  effects: 0.8,
  voices: 0.65,
  sensitivity: 1,
  reducedFlash: false,
  micThreshold: H.MIC_THRESHOLD,
  keys: {
    forward: 'KeyW',
    back: 'KeyS',
    left: 'KeyA',
    right: 'KeyD',
    jump: 'Space',
    crouch: 'ControlLeft',
    use: 'KeyE',
    flash: 'KeyF',
  },
};
let fallbackSettings: HollowSettings | undefined;
export function readHollowSettings() {
  const next = { ...hollowDefaults, keys: { ...hollowDefaults.keys } };
  try {
    let raw: Partial<HollowSettings>;
    try {
      raw = JSON.parse(localStorage.getItem('hollow-settings') ?? '{}');
    } catch {
      raw = fallbackSettings ?? {};
    }
    for (const [key, min, max] of [
      ['pixel', 1, 3],
      ['distance', 12, 36],
      ['master', 0, 1],
      ['music', 0, 1],
      ['effects', 0, 1],
      ['voices', 0, 1],
      ['grain', 0, 1],
      ['cameraMotion', 0, 1],
      ['sensitivity', 0.2, 3],
      ['micThreshold', 0.02, 0.8],
    ] as const)
      if (Number.isFinite(raw[key]))
        next[key] = Math.max(min, Math.min(max, Number(raw[key])));
    for (const key of [
      'reducedFlash',
      'creatureScares',
      'shadows',
      'cinematic',
      'contactShadows',
    ] as const)
      if (typeof raw[key] === 'boolean') next[key] = raw[key];
    for (const key of Object.keys(next.keys))
      if (
        typeof raw.keys?.[key] === 'string' &&
        /^(Key[A-Z]|Space|ShiftLeft|ControlLeft|Arrow(Up|Down|Left|Right))$/.test(
          raw.keys[key],
        )
      )
        next.keys[key] =
          key === 'crouch' && raw.keys[key] === 'ShiftLeft'
            ? 'ControlLeft'
            : raw.keys[key];
  } catch {
    return next;
  }
  return next;
}
export function saveHollowSettings(s: HollowSettings) {
  fallbackSettings = s;
  try {
    localStorage.setItem('hollow-settings', JSON.stringify(s));
  } catch {
    /* Settings remain available in this tab. */
  }
  window.dispatchEvent(new Event('hollow-settings'));
}
