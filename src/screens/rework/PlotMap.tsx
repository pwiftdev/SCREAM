import {
  WORLD_PATHS,
  LANDMARKS,
  plotLocation,
} from '../../../shared/house/neighborhood';
import { plotTier } from '../../../shared/house/plots';
const point = (x: number, z: number) => ({
  x: ((x + 213) / 426) * 64,
  y: ((z + 98) / 606) * 36,
});
export function PlotMap({
  occupied,
  selected,
  onSelect,
}: {
  occupied: number[];
  selected: number;
  onSelect: (n: number) => void;
}) {
  return (
    <svg
      className="night-plot-map"
      viewBox="0 0 1216 684"
      role="group"
      aria-label="Neighborhood plot map"
    >
      <g transform="scale(19)">
        {Array.from({ length: 64 * 36 }, (_, i) => (
          <rect
            key={i}
            x={i % 64}
            y={Math.floor(i / 64)}
            width="1"
            height="1"
            fill={
              ['#1d301b', '#20321e', '#263d22', '#192817', '#243720'][
                (i * 73 + Math.floor(i / 64) * 17) % 5
              ]
            }
          />
        ))}
        {WORLD_PATHS.map(([a, b], i) => {
          const p = point(a.x, a.z),
            q = point(b.x, b.z);
          return (
            <path
              key={i}
              d={`M${p.x} ${p.y}L${q.x} ${q.y}`}
              stroke="#584c3e"
              strokeWidth=".6"
            />
          );
        })}
        {Array.from({ length: 40 }, (_, i) => {
          const p = plotLocation(i),
            q = point(p.center.x, p.center.z),
            locked = plotTier(i) > 0,
            taken = occupied.includes(i),
            active = i === selected;
          return (
            <g
              key={i}
              role="button"
              tabIndex={0}
              aria-label={`Plot ${i + 1}${taken ? ', occupied' : locked ? ', holder planned' : ', free'}`}
              aria-pressed={active}
              onClick={() => onSelect(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(i);
                }
              }}
            >
              <rect
                x={q.x - 1.3}
                y={q.y - 1}
                width="2.6"
                height="2"
                fill={
                  active
                    ? '#6e0b0f'
                    : taken
                      ? '#493723'
                      : locked
                        ? '#111114'
                        : '#2b4627'
                }
                stroke={
                  active
                    ? '#e01b22'
                    : taken
                      ? '#6a6c7466'
                      : locked
                        ? '#6a6c74'
                        : '#f2ede4'
                }
                strokeWidth={active ? 0.15 : 0.08}
              />
              {taken && (
                <rect
                  x={q.x - 0.8}
                  y={q.y - 0.5}
                  width="1.6"
                  height=".8"
                  fill="#392c44"
                />
              )}
              <text
                x={q.x - 1.05}
                y={q.y - 0.4}
                fontSize=".4"
                fontFamily="Silkscreen"
                fill="#f2ede4"
              >
                {String(i + 1).padStart(2, '0')}
              </text>
              {locked && !taken && (
                <text
                  x={q.x}
                  y={q.y + 0.45}
                  textAnchor="middle"
                  fontSize=".27"
                  fill="#9a958c"
                >
                  LOCKED
                </text>
              )}
            </g>
          );
        })}
        {LANDMARKS.map((l) => {
          const p = point(l.x, l.z);
          return (
            <g key={l.name}>
              <rect
                x={p.x - 1.5}
                y={p.y - 1}
                width="3"
                height="1.3"
                fill="#34353b"
              />
              <rect
                x={p.x - 0.25}
                y={p.y - 0.75}
                width=".5"
                height=".4"
                fill="#e01b22"
              />
              <text
                x={p.x}
                y={p.y + 1}
                textAnchor="middle"
                fontSize=".45"
                fontFamily="Big Shoulders Display"
                fontWeight="900"
                fill="#f2ede4"
                stroke="#060607"
                strokeWidth=".2"
                paintOrder="stroke"
              >
                {l.name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
