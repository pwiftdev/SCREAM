import { createHmac, createPublicKey, randomBytes, verify } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import { loginMessage, type WalletLogin } from '../shared/auth';
const SPKI_ED25519 = Buffer.from('302a300506032b6570032100', 'hex');
const MAX_AGE = 10 * 60_000;
/**
 * Stateless wallet sign-in: the server hands out HMAC'd timestamps, the wallet
 * signs one, and the signature is checked with Node's own ed25519.
 */
export class WalletAuth {
  constructor(
    private secret = randomBytes(32),
    private now = Date.now,
  ) {}
  nonce() {
    const stamp = String(this.now());
    return `${stamp}.${this.mac(stamp)}`;
  }
  private mac(stamp: string) {
    return createHmac('sha256', this.secret)
      .update(stamp)
      .digest('hex')
      .slice(0, 32);
  }
  /** Returns the verified wallet address, or null. */
  verify(login: unknown): string | null {
    const l = login as Partial<WalletLogin> | null;
    if (
      !l ||
      typeof l.wallet !== 'string' ||
      typeof l.nonce !== 'string' ||
      typeof l.signature !== 'string' ||
      l.signature.length > 200 ||
      l.nonce.length > 100
    )
      return null;
    const [stamp, mac] = l.nonce.split('.');
    if (!stamp || mac !== this.mac(stamp)) return null;
    const age = this.now() - Number(stamp);
    if (!(age >= 0 && age < MAX_AGE)) return null;
    try {
      const key = new PublicKey(l.wallet);
      if (!PublicKey.isOnCurve(key.toBytes())) return null;
      const publicKey = createPublicKey({
        key: Buffer.concat([SPKI_ED25519, key.toBuffer()]),
        format: 'der',
        type: 'spki',
      });
      const ok = verify(
        null,
        Buffer.from(loginMessage(l.wallet, l.nonce)),
        publicKey,
        Buffer.from(l.signature, 'base64'),
      );
      return ok ? key.toBase58() : null;
    } catch {
      return null;
    }
  }
}
