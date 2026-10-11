import { H } from '../config';
export interface MicMark {
  tick: number;
  peak: number;
}
export function micMarks(raw: unknown, ticks: number): MicMark[] {
  if (
    !Array.isArray(raw) ||
    raw.length > Math.ceil((H.VISIT_LIMIT_S * 1000) / H.MIC_COOLDOWN_MS)
  )
    throw new Error('invalid scream markers');
  let last = -Infinity;
  return raw.map((m) => {
    if (
      !m ||
      !Number.isInteger(m.tick) ||
      m.tick < 0 ||
      m.tick > ticks ||
      m.tick - last < (H.MIC_COOLDOWN_MS / 1000) * H.TICK_HZ ||
      !Number.isFinite(m.peak) ||
      m.peak < 0 ||
      m.peak > 1
    )
      throw new Error('invalid scream marker');
    last = m.tick;
    return { tick: m.tick, peak: m.peak };
  });
}
