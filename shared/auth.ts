export interface WalletLogin {
  wallet: string;
  nonce: string;
  signature: string;
}
export const loginMessage = (wallet: string, nonce: string) =>
  `Let's Scream Together\nSign in to your free profile. No transaction or funds.\nWallet: ${wallet}\nNonce: ${nonce}`;
