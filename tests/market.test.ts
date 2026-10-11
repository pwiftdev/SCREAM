import { it, expect, vi } from 'vitest';
import { tokenMarket } from '../server/token-market';
import { parseDetails, safeLink } from '../server/mobula';
const mint = '11111111111111111111111111111111';
it('offline market never invokes an external provider and has no invented mint or prices', async () => {
  const fetcher = vi.fn();
  expect(await tokenMarket('', fetcher)()).toMatchObject({
    address: '',
    marketCap: null,
    status: 'unavailable',
    symbol: 'SCREAM',
  });
  expect(fetcher).not.toHaveBeenCalled();
});
it('coalesces provider reads, marks delayed data stale and expires it', async () => {
  let now = 1;
  const fetcher = vi.fn(
    async () =>
      ({
        ok: true,
        json: async () => ({
          data: {
            address: mint,
            chainId: 'solana:solana',
            marketCapUSD: 10000,
          },
        }),
      }) as Response,
  );
  const read = tokenMarket(mint, fetcher, () => now, 'test-key');
  const [a, b] = await Promise.all([read(), read()]);
  expect(a).toEqual(b);
  expect(a.status).toBe('live');
  expect(fetcher).toHaveBeenCalledTimes(1);
  now = 31000;
  fetcher.mockRejectedValue(new Error('offline'));
  expect((await read()).status).toBe('stale');
  now = 310001;
  expect((await read()).status).toBe('unavailable');
});
it('rejects mismatched identities and unsafe metadata links', () => {
  expect(() =>
    parseDetails({ address: 'wrong', chainId: 'solana:solana' }, mint),
  ).toThrow();
  expect(safeLink('javascript:alert(1)')).toBeNull();
  expect(safeLink('https://user:password@example.com')).toBeNull();
  expect(safeLink('https://example.com')).toBe('https://example.com/');
});
