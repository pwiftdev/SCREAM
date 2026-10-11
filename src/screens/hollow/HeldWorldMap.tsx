import { useEffect, useRef } from 'react';
import { WorldMap } from './WorldMap';
export function HeldWorldMap({
  occupied,
  home,
  position,
  onClose,
}: {
  occupied: number[];
  home?: number;
  position: { x: number; z: number; yaw: number };
  onClose: () => void;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
  }, []);
  return (
    <div
      className="held-map-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="held-map-title"
      onKeyDown={(e) => {
        if (e.key === 'Tab') {
          e.preventDefault();
          close.current?.focus();
        }
      }}
    >
      <div className="held-map-sheet">
        <header>
          <span>NO. 13 · NIGHT SURVEY</span>
          <h2 id="held-map-title">THE NEIGHBORHOOD</h2>
          <p>Keep to the paths. Trust no one.</p>
        </header>
        <WorldMap occupied={occupied} selected={home} position={position} />
        <footer>
          <span>
            <i className="map-key-you" /> YOU
          </span>
          <span>
            <i className="map-key-home" /> HOME
          </span>
          <span>
            <i className="map-key-free" /> FREE PLOT
          </span>
          <span>
            <i className="map-key-house" /> HOUSE
          </span>
          <span>
            <i className="map-key-reserved" /> RESERVED
          </span>
        </footer>
        <div className="map-grip map-grip-left" aria-hidden="true" />
        <div className="map-grip map-grip-right" aria-hidden="true" />
      </div>
      <div className="held-map-caption">
        <p>The night keeps moving while you read.</p>
        <button ref={close} onClick={onClose} aria-label="Close map">
          M / ESC · FOLD MAP
        </button>
      </div>
    </div>
  );
}
