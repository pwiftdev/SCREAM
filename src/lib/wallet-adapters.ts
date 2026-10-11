import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { StandardWalletAdapter } from '@solana/wallet-standard-wallet-adapter-base';
import {
  isWalletAdapterCompatibleStandardWallet,
  type Adapter,
  WalletReadyState,
} from '@solana/wallet-adapter-base';
import { getWallets } from '@wallet-standard/app';
import { PublicKey } from '@solana/web3.js';
import type { WalletHandle } from './wallet';
let active: Adapter | undefined, testKey: CryptoKeyPair | undefined;
export async function connect(name: string): Promise<WalletHandle> {
  if (name === 'Local test profile') {
    const config = await (await fetch('/api/config')).json();
    if (!config.local && !config.guestProfiles)
      throw new Error('guest profiles are disabled');
    testKey ??= (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
      'sign',
      'verify',
    ])) as CryptoKeyPair;
    const key = testKey;
    return {
      address: new PublicKey(
        new Uint8Array(await crypto.subtle.exportKey('raw', key.publicKey)),
      ).toBase58(),
      signMessage: async (m) =>
        new Uint8Array(
          await crypto.subtle.sign(
            'Ed25519',
            key.privateKey,
            new Uint8Array(m),
          ),
        ),
      disconnect: async () => {
        testKey = undefined;
      },
    };
  }
  const standard = getWallets()
    .get()
    .filter(isWalletAdapterCompatibleStandardWallet)
    .find((w) => w.name === name);
  const adapter: Adapter = standard
    ? new StandardWalletAdapter({ wallet: standard })
    : name === 'Phantom'
      ? new PhantomWalletAdapter()
      : new SolflareWalletAdapter();
  if (adapter.readyState !== WalletReadyState.Installed)
    throw new Error(
      `${name} is not installed in this browser. use the local test profile to play here.`,
    );
  await active?.disconnect();
  await adapter.connect();
  active = adapter;
  const signer = adapter as Adapter & {
    signMessage?: (m: Uint8Array) => Promise<Uint8Array>;
  };
  if (!adapter.publicKey || !signer.signMessage)
    throw new Error('this wallet cannot sign a profile message');
  return {
    address: adapter.publicKey.toBase58(),
    signMessage: (m) => signer.signMessage!(m),
    disconnect: () => adapter.disconnect(),
  };
}
