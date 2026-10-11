import { PublicKey } from '@solana/web3.js';
import {
  CHART_RANGES,
  type TokenMarket,
  type TokenHistory,
  type ChartRange,
} from '../shared/token-market';
import { marketCache } from './market-cache';
import { mobula, parseDetails, parseCandles } from './mobula';
import { configuredTokenMint } from './token-config';
export function publicTokenMint(env: NodeJS.ProcessEnv = process.env) {
  return configuredTokenMint(env);
}
export function tokenMarket(
  mint = publicTokenMint(),
  fetcher: typeof fetch = fetch,
  now = Date.now,
  apiKey = process.env.ALLOW_EXTERNAL_DATA === 'true'
    ? process.env.MOBULA_API_KEY
    : undefined,
) {
  const address = mint ? new PublicKey(mint).toBase58() : '';
  const base: TokenMarket = {
    address,
    symbol: 'SCREAM',
    marketCap: null,
    details: null,
    updatedAt: null,
    status: 'unavailable',
  };
  return marketCache(
    base,
    async () => ({
      ...base,
      ...parseDetails(
        await mobula(
          'token/details',
          { address, chainId: 'solana:solana' },
          apiKey,
          fetcher,
        ),
        address,
      ),
      updatedAt: now(),
      status: 'live',
    }),
    now,
  );
}
export function tokenHistory(
  mint = publicTokenMint(),
  fetcher: typeof fetch = fetch,
  now = Date.now,
  apiKey = process.env.ALLOW_EXTERNAL_DATA === 'true'
    ? process.env.MOBULA_API_KEY
    : undefined,
) {
  const address = mint ? new PublicKey(mint).toBase58() : '';
  const periods = {
    '24h': ['15m', 1],
    '7d': ['1h', 7],
    '30d': ['4h', 30],
  } as const;
  const readers = new Map(
    CHART_RANGES.map((range) => {
      const base: TokenHistory = {
        address,
        range,
        candles: [],
        updatedAt: null,
        status: 'unavailable',
      };
      return [
        range,
        marketCache(
          base,
          async () => {
            const [period, days] = periods[range],
              to = now(),
              from = to - days * 86400000;
            const data = await mobula(
              'token/ohlcv-history',
              {
                address,
                chainId: 'solana:solana',
                from: String(from),
                to: String(to),
                period,
                usd: 'true',
                fill: 'false',
              },
              apiKey,
              fetcher,
            );
            return {
              ...base,
              candles: parseCandles(data, from, to),
              updatedAt: now(),
              status: 'live',
            };
          },
          now,
          60_000,
        ),
      ];
    }),
  );
  return (range: ChartRange) => readers.get(range)!();
}
