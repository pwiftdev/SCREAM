export class Holders {
  private cache = new Map<string, { at: number; holder: boolean }>();
  constructor(
    private rpc = process.env.SOLANA_RPC_URL,
    private mint = process.env.TOKEN_MINT,
    private minimum = Number(process.env.HOLDER_MIN_BALANCE ?? 100000),
  ) {}
  async check(wallet: string) {
    if (process.env.ALLOW_EXTERNAL_DATA !== 'true' || !this.rpc || !this.mint)
      return false;
    const cached = this.cache.get(wallet);
    if (cached && Date.now() - cached.at < 60000) return cached.holder;
    try {
      const r = await fetch(this.rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            wallet,
            { mint: this.mint },
            { encoding: 'jsonParsed', commitment: 'confirmed' },
          ],
        }),
        signal: AbortSignal.timeout(3000),
      });
      if (!r.ok) return false;
      const data = await r.json();
      if (!Array.isArray(data.result?.value)) return false;
      let balance = 0;
      for (const row of data.result.value) {
        const amount = Number(
          row?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString,
        );
        if (Number.isFinite(amount) && amount >= 0) balance += amount;
      }
      const holder = balance >= this.minimum;
      if (this.cache.size > 1000) this.cache.clear();
      this.cache.set(wallet, { at: Date.now(), holder });
      return holder;
    } catch {
      return false;
    }
  }
}
