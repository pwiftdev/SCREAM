import { loginMessage, type WalletLogin } from '../../shared/auth';
export interface WalletHandle {
  address: string;
  signMessage: (m: Uint8Array) => Promise<Uint8Array>;
  disconnect: () => Promise<void>;
}
export async function signIn(name: string): Promise<WalletLogin> {
  const { connect } = await import('./wallet-adapters');
  const handle = await connect(name);
  const response = await fetch('/api/auth/nonce');
  if (!response.ok) throw new Error('profile service is unavailable');
  const { nonce } = await response.json();
  const signature = await handle.signMessage(
    new TextEncoder().encode(loginMessage(handle.address, nonce)),
  );
  return {
    wallet: handle.address,
    nonce,
    signature: btoa(String.fromCharCode(...signature)),
  };
}
