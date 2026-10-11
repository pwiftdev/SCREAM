import { useId, useState } from 'react';
import {
  CHART_RANGES,
  type ChartRange,
  type TokenCandle,
} from '../../shared/token-market';
import { useTokenHistory } from '../lib/use-token-history';
import { tokenUsd } from '../lib/token-format';
const date = (time: number) =>
  new Date(time).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
function PricePlot({ candles }: { candles: TokenCandle[] }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const index = Math.min(hover ?? candles.length - 1, candles.length - 1),
    selected = candles[index];
  const first = candles[0].time,
    last = candles.at(-1)!.time;
  const low = Math.min(...candles.map((c) => c.close)),
    high = Math.max(...candles.map((c) => c.close));
  const padding = Math.max((high - low) * 0.12, high * 0.015);
  const min = low - padding,
    max = high + padding;
  const x = (c: TokenCandle) =>
    60 + (last === first ? 0.5 : (c.time - first) / (last - first)) * 840;
  const y = (c: TokenCandle) => 24 + ((max - c.close) / (max - min)) * 240;
  const line = candles.map((c) => `${x(c)},${y(c)}`).join(' ');
  const volume = Math.max(1, ...candles.map((c) => c.volume ?? 0));
  return (
    <>
      <div className="chart-readout">
        <strong>{tokenUsd(selected.close, true)}</strong>
        <span>{date(selected.time)}</span>
        <small>Volume {tokenUsd(selected.volume)}</small>
      </div>
      <div
        className="token-price-plot"
        tabIndex={0}
        role="group"
        aria-label="Price history. Use left and right arrow keys to inspect prices."
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            setHover(
              Math.max(
                0,
                Math.min(
                  candles.length - 1,
                  index + (e.key === 'ArrowLeft' ? -1 : 1),
                ),
              ),
            );
          }
        }}
      >
        <svg
          viewBox="0 0 960 350"
          role="img"
          aria-label={`USD price from ${date(first)} to ${date(last)}`}
          onPointerLeave={() => setHover(null)}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect(),
              px = ((e.clientX - rect.left) / rect.width) * 960;
            let nearest = 0;
            for (let i = 1; i < candles.length; i++)
              if (
                Math.abs(x(candles[i]) - px) <
                Math.abs(x(candles[nearest]) - px)
              )
                nearest = i;
            setHover(nearest);
          }}
        >
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7fd8c8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7fd8c8" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <line
                x1="60"
                x2="900"
                y1={24 + i * 80}
                y2={24 + i * 80}
                stroke="#cfc3e620"
              />
              <text x="960" textAnchor="end" y={28 + i * 80}>
                {tokenUsd(max - ((max - min) * i) / 3, true)}
              </text>
            </g>
          ))}
          <polygon points={`60,264 ${line} 900,264`} fill={`url(#${id})`} />
          <polyline
            points={line}
            fill="none"
            stroke="#7fd8c8"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {candles.map((c) => (
            <rect
              key={c.time}
              x={x(c) - 2}
              width="4"
              y={320 - ((c.volume ?? 0) / volume) * 36}
              height={((c.volume ?? 0) / volume) * 36}
              rx="1"
              fill="#b9a0ff60"
            />
          ))}
          <line
            x1={x(selected)}
            x2={x(selected)}
            y1="20"
            y2="322"
            stroke="#fff6e560"
            strokeDasharray="4 5"
          />
          <circle
            cx={x(selected)}
            cy={y(selected)}
            r="5"
            fill="#fff6e5"
            stroke="#7fd8c8"
            strokeWidth="3"
          />
          <text x="60" y="344">
            {new Date(first).toLocaleDateString()}
          </text>
          <text x="900" y="344" textAnchor="end">
            {new Date(last).toLocaleDateString()}
          </text>
        </svg>
      </div>
      <p className="chart-note">
        Price and volume from recorded trades · times shown in your timezone.
      </p>
    </>
  );
}
export function TokenChart() {
  const [range, setRange] = useState<ChartRange>('24h');
  const history = useTokenHistory(range),
    candles = history?.value?.candles ?? [];
  return (
    <section className="token-chart" aria-label="token price chart">
      <div className="token-section-heading">
        <div>
          <span className="eyebrow">THE MARKET</span>
          <h2>
            Price history <small>USD</small>
          </h2>
        </div>
        <div
          className="chart-ranges"
          role="group"
          aria-label="chart time range"
        >
          {CHART_RANGES.map((value) => (
            <button
              key={value}
              aria-pressed={range === value}
              onClick={() => setRange(value)}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {!history ? (
        <p className="chart-empty" role="status">
          Loading price history…
        </p>
      ) : history.failed || history.value?.status === 'unavailable' ? (
        <p className="chart-empty" role="status">
          Price history is temporarily unavailable.
        </p>
      ) : !candles.length ? (
        <p className="chart-empty">No recorded trades in this period.</p>
      ) : (
        <PricePlot key={range} candles={candles} />
      )}
      {history?.value?.status === 'stale' && (
        <p className="quiet">
          Chart refresh delayed · showing the last available history.
        </p>
      )}
    </section>
  );
}
