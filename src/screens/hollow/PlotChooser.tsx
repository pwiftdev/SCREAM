import { useCallback, useEffect, useState } from 'react';
import { H } from '../../../shared/config';
import { laneApi, type OwnHouse } from '../../lib/hollow-api';
import { PLOT_TIERS, BLUEPRINTS, plotTier } from '../../../shared/house/plots';
import { plotLocation } from '../../../shared/house/neighborhood';
import { PlotMap } from '../rework/PlotMap';
import { PanelTitle, ItemIcon } from '../rework/ui';
export function PlotChooser({
  onClaim,
  onClose,
  onRaid,
}: {
  onClaim: (own: OwnHouse) => void;
  onClose: () => void;
  onRaid: (slot: number) => void;
}) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  const [occupied, setOccupied] = useState<number[]>([]),
    [slot, setSlot] = useState(3),
    [style, setStyle] = useState(0),
    [loaded, setLoaded] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const load = useCallback(async (active: () => boolean = () => true) => {
    const plots = await laneApi<{ slot: number }[]>('/plots');
    if (!active()) return;
    const slots = plots.map((p) => Number(p.slot));
    setOccupied(slots);
    setLoaded(true);
    setSlot((s) =>
      slots.includes(s)
        ? (Array.from({ length: 320 }, (_, i) => i).find(
            (i) => !slots.includes(i) && plotTier(i) === 0,
          ) ?? s)
        : s,
    );
  }, []);
  useEffect(() => {
    let active = true;
    void load(() => active).catch((e) => setError(e.message));
    return () => {
      active = false;
    };
  }, [load]);
  const neighborhood = Math.floor(slot / 40),
    tier = PLOT_TIERS[plotTier(slot)],
    p = plotLocation(slot % 40),
    taken = occupied.includes(slot),
    locked = plotTier(slot) > 0;
  async function claim() {
    setBusy(true);
    setError('');
    try {
      onClaim(await laneApi<OwnHouse>('/plots', { slot, style }));
    } catch (e) {
      setError((e as Error).message);
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="night-plots">
      <header>
        <button className="night-back" onClick={onClose}>
          ‹ BACK [ESC]
        </button>
        <h1>CHOOSE YOUR PLOT</h1>
        <p>
          Your plot is your haunted house. Build on it, hide candy in it, and
          defend it every night.
        </p>
      </header>
      <div className="night-map-area">
        <PlotMap
          occupied={occupied
            .filter((s) => Math.floor(s / 40) === neighborhood)
            .map((s) => s % 40)}
          selected={slot % 40}
          onSelect={(s) => setSlot(s + neighborhood * 40)}
        />
        <div className="night-map-legend">
          <span>□ FREE</span>
          <span className="blood-text">□ SELECTED</span>
          <span>■ TAKEN</span>
          <span>□ HOLDER PLOT · PLANNED</span>
          <select
            aria-label="Choose neighborhood"
            value={neighborhood}
            onChange={(e) => setSlot(Number(e.target.value) * 40 + 3)}
          >
            {Array.from({ length: H.STREET_MAX_ROOMS }, (_, i) => (
              <option key={i} value={i}>
                NEIGHBORHOOD {i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>
      <aside className="night-plot-detail night-panel">
        <PanelTitle>SELECTED PLOT</PanelTitle>
        <div className="night-plot-preview">
          <div className="night-iso-land" />
          <ItemIcon name="pumpkin_face" />
          <ItemIcon name="mossy" />
          <ItemIcon name="log_side" />
        </div>
        <h2>PLOT {String(slot + 1).padStart(2, '0')}</h2>
        <p>{p.district} · Haunted neighborhood</p>
        <dl>
          <div>
            <dt>Size</dt>
            <dd>
              {tier.x1 - tier.x0 + 1} × {tier.z1} blocks
            </dd>
          </div>
          <div>
            <dt>Tier</dt>
            <dd>{locked ? 'Holder · planned' : 'Free'}</dd>
          </div>
          <div>
            <dt>Neighbors</dt>
            <dd>
              {
                occupied.filter((s) => Math.floor(s / 40) === neighborhood)
                  .length
              }{' '}
              houses
            </dd>
          </div>
        </dl>
        <label className="night-shell">
          STARTING SHELL
          <select
            aria-label="Starting shell"
            value={style}
            onChange={(e) => setStyle(Number(e.target.value))}
          >
            {BLUEPRINTS.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {error && <p role="alert">{error}</p>}
        <button
          className={
            locked ? 'night-planned' : taken ? 'night-outline' : 'night-primary'
          }
          disabled={!loaded || busy || (locked && !taken)}
          onClick={taken ? () => onRaid(slot) : claim}
        >
          {busy
            ? 'CLAIMING…'
            : taken
              ? 'RAID THIS HOUSE TONIGHT'
              : locked
                ? 'HOLDER PLOTS · PLANNED'
                : 'CLAIM PLOT · FREE'}
        </button>
        <small>
          Free plots stay free. Larger plots for $SCREAM holders are planned.
        </small>
      </aside>
    </section>
  );
}
