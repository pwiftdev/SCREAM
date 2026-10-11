import type {
  ChartRange,
  TokenHistory,
  TokenMarket,
} from '../../shared/token-market';
async function get<T>(path: string): Promise<T> {
  const response = await fetch(path, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('market data unavailable');
  return response.json();
}
export const fetchTokenHistory = (range: ChartRange) =>
  get<TokenHistory>(`/api/token/history?range=${range}`);
export const fetchTokenMarket = () => get<TokenMarket>('/api/token');
