import type { MarketStatus } from '../shared/token-market';
export function marketCache<
  T extends { updatedAt: number | null; status: MarketStatus },
>(base: T, read: () => Promise<T>, now = Date.now, ttl = 30_000) {
  let cached = base,
    nextRead = 0;
  let pending: Promise<T> | undefined;
  return async (): Promise<T> => {
    if (
      cached.status === 'stale' &&
      cached.updatedAt !== null &&
      now() - cached.updatedAt >= 300_000
    )
      cached = base;
    if (now() < nextRead) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        cached = await read();
        nextRead = now() + ttl;
      } catch {
        cached =
          cached.updatedAt !== null && now() - cached.updatedAt < 300_000
            ? { ...cached, status: 'stale' }
            : base;
        nextRead = now() + 60_000;
      }
      return cached;
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
