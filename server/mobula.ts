import type { TokenDetails, TokenCandle } from '../shared/token-market';
export function numeric(value: unknown, negative = false): number | null {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    (negative || value >= 0)
    ? value
    : null;
}
function text(value: unknown, limit = 200) {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}
export function safeLink(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
export async function mobula(
  path: string,
  query: Record<string, string>,
  apiKey: string | undefined,
  fetcher: typeof fetch,
) {
  if (!apiKey) throw new Error('Mobula is not configured');
  const response = await fetcher(
    `https://api.mobula.io/api/2/${path}?${new URLSearchParams(query)}`,
    {
      headers: { Authorization: apiKey },
      signal: AbortSignal.timeout(6000),
      redirect: 'error',
    },
  );
  if (!response.ok) throw new Error('Token data unavailable');
  return object(await response.json()).data;
}
export function parseDetails(value: unknown, address: string) {
  const d = object(value);
  if (d.address !== address || d.chainId !== 'solana:solana')
    throw new Error('Token identity mismatch');
  const security = object(d.security),
    socials = object(d.socials);
  const details: TokenDetails = {
    name: text(d.name, 80) || 'Token',
    description: text(d.description, 2000),
    price: numeric(d.priceUSD),
    volume24h: numeric(d.volume24hUSD),
    liquidity: numeric(d.liquidityUSD),
    fdv: numeric(d.marketCapDilutedUSD),
    change24h: numeric(d.priceChange24hPercentage, true),
    change1h: numeric(d.priceChange1hPercentage, true),
    holders: numeric(d.holdersCount),
    supply: numeric(d.totalSupply),
    circulatingSupply: numeric(d.circulatingSupply),
    buys24h: numeric(d.buys24h),
    sells24h: numeric(d.sells24h),
    buyVolume24h: numeric(d.volumeBuy24hUSD),
    sellVolume24h: numeric(d.volumeSell24hUSD),
    ath: numeric(d.athUSD),
    atl: numeric(d.atlUSD),
    createdAt:
      typeof d.createdAt === 'string' &&
      Number.isFinite(Date.parse(d.createdAt))
        ? new Date(d.createdAt).toISOString()
        : null,
    pool: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(d.poolAddress ?? ''))
      ? String(d.poolAddress)
      : null,
    exchange: text(object(d.exchange).name, 80) || null,
    top10Percent: numeric(d.top10HoldingsPercentage),
    mintable:
      typeof security.isMintable === 'boolean'
        ? security.isMintable
        : typeof security.noMintAuthority === 'boolean'
          ? !security.noMintAuthority
          : null,
    freezable:
      typeof security.isFreezable === 'boolean' ? security.isFreezable : null,
    links: Object.entries({
      Website: socials.website,
      X: socials.twitter,
      Telegram: socials.telegram,
    }).flatMap(([label, value]) => {
      const url = safeLink(value);
      return url ? [{ label, url }] : [];
    }),
  };
  return {
    symbol: text(d.symbol, 24) || 'TOKEN',
    marketCap: numeric(d.marketCapUSD),
    details,
  };
}
export function parseCandles(
  value: unknown,
  from: number,
  to: number,
): TokenCandle[] {
  if (!Array.isArray(value)) throw new Error('Invalid price history');
  const candles = new Map<number, TokenCandle>();
  for (const raw of value.slice(0, 2000)) {
    const d = object(raw),
      time = numeric(d.t),
      open = numeric(d.o),
      high = numeric(d.h),
      low = numeric(d.l),
      close = numeric(d.c);
    if (
      time === null ||
      open === null ||
      high === null ||
      low === null ||
      close === null ||
      time < from ||
      time > to ||
      low <= 0 ||
      high < Math.max(open, close) ||
      low > Math.min(open, close)
    )
      continue;
    candles.set(time, { time, open, high, low, close, volume: numeric(d.v) });
  }
  return [...candles.values()].sort((a, b) => a.time - b.time);
}
