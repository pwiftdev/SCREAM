import { useEffect, useState } from 'react';
import { Panel } from '../components/ui';
import { TokenChart } from '../components/TokenChart';
import { fetchTokenMarket } from '../lib/api';
import { tokenUsd, tokenNumber, tokenPercent } from '../lib/token-format';
import type { TokenMarket } from '../../shared/token-market';
export function Token() {
  const [market, setMarket] = useState<TokenMarket | null>(null),
    [copied, setCopied] = useState(false),
    [fallback, setFallback] = useState(false);
  useEffect(() => {
    let active = true;
    const read = () => {
      if (!document.hidden)
        void fetchTokenMarket()
          .then((v) => {
            if (active) setMarket(v);
          })
          .catch(() => {});
    };
    read();
    const t = setInterval(read, 30000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);
  const mint = market?.address ?? '';
  async function copy() {
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
    } catch {
      setFallback(true);
    }
  }
  return (
    <Panel
      className="wide-panel token-screen"
      eyebrow="THE FAIRGROUND HAS ITS OWN CURRENCY"
      title="$SCREAM"
    >
      <div className="token-layout">
        <aside>
          <img src="/assets/token.png" alt="$SCREAM pixel face" />
          <h3>HOLD A LITTLE HORROR.</h3>
          <p>
            cosmetics. queue priority.
            <br />
            the same chance of surviving.
          </p>
          <button
            className="secondary"
            disabled={!mint}
            onClick={() => void copy()}
          >
            {copied ? 'COPIED' : 'COPY CONTRACT ADDRESS'}
          </button>
          {fallback && (
            <input
              readOnly
              aria-label="Contract address"
              value={mint}
              onFocus={(e) => e.target.select()}
            />
          )}
          <p className="muted">
            {market?.status === 'live'
              ? 'market data is live.'
              : market?.status === 'stale'
                ? 'market refresh is delayed.'
                : 'external market data is offline.'}
          </p>
          <span className="tag">NO PAID ENTRY · REWARDS OFF</span>
        </aside>
        <div>
          <div className="market-stats">
            {[
              ['PRICE', tokenUsd(market?.details?.price, true)],
              ['MARKET CAP', tokenUsd(market?.marketCap)],
              ['24H VOLUME', tokenUsd(market?.details?.volume24h)],
              ['LIQUIDITY', tokenUsd(market?.details?.liquidity)],
              ['HOLDERS', tokenNumber(market?.details?.holders)],
              ['24H CHANGE', tokenPercent(market?.details?.change24h)],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <TokenChart />
        </div>
      </div>
    </Panel>
  );
}
