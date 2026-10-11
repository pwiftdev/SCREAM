import { useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import { readHollowSettings } from '../../lib/hollow-settings';
import { spriteIcon } from '../../game/rework/sprites';
import { blockIcon } from '../../game/rework/pixels';
import { NIGHT, clockText } from '../../../shared/house/rework';
export function Stage({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(
    () => readHollowSettings().reducedFlash,
  );
  useEffect(() => {
    const update = () => setReduced(readHollowSettings().reducedFlash);
    window.addEventListener('hollow-settings', update);
    return () => window.removeEventListener('hollow-settings', update);
  }, []);
  const [scale, setScale] = useState(() =>
    Math.min(innerWidth / 1920, innerHeight / 1080),
  );
  useEffect(() => {
    const resize = () =>
      setScale(Math.min(innerWidth / 1920, innerHeight / 1080));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return (
    <div className="night-viewport">
      <div
        className={`night-stage${reduced ? ' night-reduced' : ''}`}
        style={{ transform: `translate(-50%,-50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
export function Segments({
  value,
  max = 100,
  count = 10,
  color = 'bone',
  label,
}: {
  value: number;
  max?: number;
  count?: number;
  color?: string;
  label?: string;
}) {
  return (
    <div
      className={`night-segments ${color}`}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(0, value))}
    >
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i < (count * value) / max ? 'filled' : ''} />
      ))}
    </div>
  );
}
export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div className="night-panel-title">
      <i />
      {children}
    </div>
  );
}
export function KeyCap({ children }: { children: ReactNode }) {
  return <kbd>{children}</kbd>;
}
export function ItemIcon({ name }: { name: string }) {
  return (
    <img
      className="night-item-icon"
      src={
        name.startsWith('sprite:') ? spriteIcon(name.slice(7)) : blockIcon(name)
      }
      alt=""
    />
  );
}
export function useDawn() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = NIGHT.seconds - (Math.floor(now / 1000) % NIGHT.seconds);
  return {
    text: clockText(seconds),
    seconds,
    index: (Math.floor(now / 1000 / NIGHT.seconds) % 365) + 1,
  };
}
export interface HotItem {
  name: string;
  texture: string;
  count?: number;
}
export const EXPLORE_ITEMS: HotItem[] = [
  { name: 'Lantern', texture: 'sprite:lantern' },
  { name: 'Lockpick', texture: 'sprite:key', count: 3 },
  { name: 'Firecracker', texture: 'sprite:firecracker', count: 2 },
  { name: 'Smoke bomb', texture: 'sprite:smoke', count: 1 },
  { name: 'Map', texture: 'sprite:map' },
  { name: 'Candy corn', texture: 'sprite:candy', count: 12 },
];
export function Hotbar({
  items,
  selected,
  onSelect,
  stamina = 100,
  bag = 0,
  slots = 9,
}: {
  items: HotItem[];
  selected: number;
  onSelect: (n: number) => void;
  stamina?: number;
  bag?: number;
  slots?: number;
}) {
  return (
    <div className="night-hotbar">
      <div className="night-hotbar-stats">
        <Segments
          value={stamina}
          color={stamina < 30 ? 'blood' : 'bone'}
          label="Stamina"
        />
        <span>{items[selected]?.name ?? 'EMPTY HAND'}</span>
        <Segments
          value={bag}
          max={NIGHT.bagCapacity}
          color="candy"
          label="Bag capacity"
        />
      </div>
      <div className="night-slots">
        {Array.from({ length: slots }, (_, i) => (
          <button
            key={i}
            aria-label={`Slot ${i + 1}: ${items[i]?.name ?? 'empty'}`}
            aria-pressed={i === selected}
            onClick={() => onSelect(i)}
          >
            <small>{i + 1}</small>
            {items[i] && <ItemIcon name={items[i].texture} />}
            <b>{items[i]?.count}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
export function useHotbar(enabled = true, count = 9) {
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.matches('input,textarea,select')
      )
        return;
      if (/^Digit[1-9]$/.test(e.code)) {
        const n = Number(e.code.slice(-1)) - 1;
        if (n < count) setSelected(n);
      }
    };
    const wheel = (e: WheelEvent) => {
      if (e.target instanceof Element && e.target.closest('aside,.hl-panel'))
        return;
      setSelected((s) => {
        const n = (s + (e.deltaY > 0 ? 1 : count - 1)) % count;
        return n;
      });
    };
    window.addEventListener('keydown', key);
    window.addEventListener('wheel', wheel);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('wheel', wheel);
    };
  }, [enabled, count]);
  return [
    selected,
    (n: number) => {
      setSelected(n);
    },
  ] as const;
}
export interface Marker {
  label: string;
  bearing: number;
  color?: string;
}
export function Compass({
  heading,
  markers = [],
}: {
  heading: number;
  markers?: Marker[];
}) {
  const delta = (v: number) => ((v - heading + 540) % 360) - 180;
  return (
    <div
      className="night-compass"
      aria-label={`Heading ${Math.round(heading)} degrees`}
    >
      <div className="night-compass-line">
        {Array.from({ length: 72 }, (_, i) => {
          const d = delta(i * 5);
          return Math.abs(d) < 70 ? (
            <i
              key={i}
              style={{
                left: `${50 + (d / 140) * 100}%`,
                height: i % 3 === 0 ? 12 : 6,
              }}
            >
              {i % 18 === 0 ? (
                <b>{['N', 'E', 'S', 'W'][i / 18]}</b>
              ) : i % 9 === 0 ? (
                <small>{i * 5}</small>
              ) : null}
            </i>
          ) : null;
        })}
      </div>
      {markers.map((m, i) => {
        const d = delta(m.bearing);
        return (
          <div
            key={m.label}
            className="night-marker"
            style={{
              left: `${50 + (Math.max(-66, Math.min(66, d)) / 140) * 100}%`,
              opacity: Math.abs(d) > 70 ? 0.5 : 1,
              color: m.color ?? 'var(--bone)',
            }}
          >
            <i />
            <span style={{ top: 66 + i * 18 }}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}
export function Terror({
  distance,
  heist = false,
  reduced = false,
}: {
  distance: number;
  heist?: boolean;
  reduced?: boolean;
}) {
  const near = distance < NIGHT.terrorDistance;
  return (
    <>
      <div
        className={`night-terror ${reduced ? 'reduced' : ''}`}
        style={{ '--terror': heist ? 0.24 : near ? 0.14 : 0 } as CSSProperties}
      />
      {(near || heist) && (
        <div className={`night-heart ${reduced ? 'reduced' : ''}`}>
          <div>
            <strong>
              {heist ? 'GET OUT WHILE YOU CAN' : 'YOU’RE BEING WATCHED'}
            </strong>
            <small>
              {near
                ? `SOMEONE IS WITHIN ${Math.ceil(distance)}M`
                : 'THE CANDY IS NOT SAFE YET'}
            </small>
          </div>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M2 2h4v2h4V2h4v2h2v6h-2v2h-2v2h-2v2H6v-2H4v-2H2v-2H0V4h2z" />
          </svg>
        </div>
      )}
    </>
  );
}
