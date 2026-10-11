import { PublicKey } from '@solana/web3.js';
export function configuredTokenMint(env: NodeJS.ProcessEnv = process.env) {
  const mint = env.TOKEN_MINT?.trim();
  return mint ? new PublicKey(mint).toBase58() : '';
}
