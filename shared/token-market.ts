export type MarketStatus = 'live' | 'stale' | 'unavailable';
export interface TokenDetails {
  name: string;
  description: string;
  price: number | null;
  volume24h: number | null;
  liquidity: number | null;
  fdv: number | null;
  change24h: number | null;
  change1h: number | null;
  holders: number | null;
  supply: number | null;
  circulatingSupply: number | null;
  buys24h: number | null;
  sells24h: number | null;
  buyVolume24h: number | null;
  sellVolume24h: number | null;
  ath: number | null;
  atl: number | null;
  createdAt: string | null;
  pool: string | null;
  exchange: string | null;
  top10Percent: number | null;
  mintable: boolean | null;
  freezable: boolean | null;
  links: { label: string; url: string }[];
}
export interface TokenMarket {
  address: string;
  symbol: string;
  marketCap: number | null;
  details: TokenDetails | null;
  updatedAt: number | null;
  status: MarketStatus;
}
export const CHART_RANGES = ['24h', '7d', '30d'] as const;
export type ChartRange = (typeof CHART_RANGES)[number];
export interface TokenCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}
export interface TokenHistory {
  address: string;
  range: ChartRange;
  candles: TokenCandle[];
  updatedAt: number | null;
  status: MarketStatus;
}
