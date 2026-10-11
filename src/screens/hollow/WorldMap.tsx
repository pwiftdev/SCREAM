import { FOREST_CLEARINGS } from '../../../shared/house/forest-sites';
import { LANDMARKS, plotLocation } from '../../../shared/house/world-layout';
import { plotTier } from '../../../shared/house/plots';
import { MAP_BOUNDS, paperMapImage } from '../../game/rework/paper-map';
export function WorldMap({
  occupied = [],
  selected,
  position,
}: {
  occupied?: number[];
  selected?: number;
  position?: { x: number; z: number; yaw?: number };
}) {
  return (
    <svg
      className="scream-map paper-world-map"
      viewBox={`${MAP_BOUNDS.x} ${MAP_BOUNDS.z} ${MAP_BOUNDS.width} ${MAP_BOUNDS.height}`}
      role="img"
      aria-label="Open world map: five districts and forty plots"
    >
      <image
        href={paperMapImage()}
        x={MAP_BOUNDS.x}
        y={MAP_BOUNDS.z}
        width={MAP_BOUNDS.width}
        height={MAP_BOUNDS.height}
        preserveAspectRatio="none"
      />
      {Array.from({ length: 40 }, (_, slot) => {
        const p = plotLocation(slot),
          taken = occupied.includes(slot),
          active = slot === selected;
        const state = active
          ? 'your home'
          : taken
            ? 'occupied'
            : plotTier(slot)
              ? 'reserved'
              : 'free';
        return (
          <g
            key={slot}
            aria-label={`Plot ${slot + 1}, ${state}`}
            transform={`translate(${p.center.x} ${p.center.z})`}
          >
            <title>{`Plot ${slot + 1} · ${state}`}</title>
            <rect
              x="-9"
              y="-9"
              width="18"
              height="18"
              fill={
                active
                  ? '#e1c75e'
                  : taken
                    ? '#7c4133'
                    : plotTier(slot)
                      ? '#aaa07e'
                      : '#dfc897'
              }
              stroke="#403528"
              strokeWidth="2"
            />
            {taken || active ? (
              <path
                d="M-7-3h3v-3h8v3h3v3H5v6H-5V0H-7z"
                fill={active ? '#674723' : '#e1bd7a'}
              />
            ) : plotTier(slot) ? (
              <path d="M-4-1V5H4V-1H2V-5H-2V-1z" fill="#665c46" />
            ) : (
              <path d="M-4 0h8M0-4v8" stroke="#4a6241" strokeWidth="2" />
            )}
          </g>
        );
      })}
      {LANDMARKS.map((l, i) => (
        <g key={l.name} transform={`translate(${l.x} ${l.z})`}>
          <title>{l.name}</title>
          <path
            d="M-4-4H4V4H-4zM-7-1H7V1H-7z"
            fill="#e7ce91"
            stroke="#493b2a"
            strokeWidth="1.5"
          />
          <text
            y={i === 0 ? -12 : 17}
            textAnchor="middle"
            className="paper-map-label"
          >
            {l.name.replace(/^The /, '')}
          </text>
        </g>
      ))}
      {FOREST_CLEARINGS.map((site) => (
        <g key={site.name} transform={`translate(${site.x} ${site.z})`}>
          <title>{site.name}</title>
          <path
            d="M-3-5H3V-2H5V2H2V5H-2V2H-5V-2H-3z"
            fill="#d4b982"
            stroke="#47513a"
            strokeWidth="1.5"
          />
        </g>
      ))}
      <g
        transform="translate(-181 -67)"
        fill="#493b2a"
        className="paper-map-north"
      >
        <path d="M0-16L7 3 0-1-7 3z" />
        <text y="18" textAnchor="middle">
          N
        </text>
      </g>
      {position && (
        <g
          className="paper-map-player"
          aria-label="Your location"
          transform={`translate(${position.x} ${position.z}) rotate(${(-(position.yaw ?? 0) * 180) / Math.PI})`}
        >
          <path
            d="M0-11H2V-7H4V-3H6V4H2V1H-2V4H-6V-3H-4V-7H-2V-11z"
            fill="#fff6d5"
            stroke="#362f27"
            strokeWidth="2"
            strokeLinejoin="miter"
          />
        </g>
      )}
    </svg>
  );
}
