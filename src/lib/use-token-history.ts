import { useEffect, useState } from 'react';
import type { ChartRange, TokenHistory } from '../../shared/token-market';
import { fetchTokenHistory } from './api';
export function useTokenHistory(range: ChartRange) {
  const [result, setResult] = useState<{
    range: ChartRange;
    value: TokenHistory | null;
    failed: boolean;
  } | null>(null);
  useEffect(() => {
    let cancelled = false,
      pending = false;
    const read = async () => {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const value = await fetchTokenHistory(range);
        if (!cancelled) setResult({ range, value, failed: false });
      } catch {
        if (!cancelled) setResult({ range, value: null, failed: true });
      } finally {
        pending = false;
      }
    };
    void read();
    const timer = setInterval(() => void read(), 60_000);
    document.addEventListener('visibilitychange', read);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', read);
    };
  }, [range]);
  return result?.range === range ? result : null;
}
