import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import type { TransferPort } from './transfers';
export function solanaPort(
  connection: Connection,
  house: Keypair,
): TransferPort {
  return {
    async prepare(reward) {
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');
      const tx = new Transaction({
        feePayer: house.publicKey,
        blockhash,
        lastValidBlockHeight,
      }).add(
        SystemProgram.transfer({
          fromPubkey: house.publicKey,
          toPubkey: new PublicKey(reward.wallet),
          lamports: BigInt(reward.lamports),
        }),
      );
      tx.sign(house);
      return {
        signature: bs58.encode(tx.signature!),
        raw: tx.serialize().toString('base64'),
        lastValid: lastValidBlockHeight,
      };
    },
    async status(signature) {
      const status = (
        await connection.getSignatureStatuses([signature], {
          searchTransactionHistory: true,
        })
      ).value[0];
      if (!status) return 'missing';
      if (status.confirmationStatus !== 'finalized') return 'pending';
      return status.err ? 'failed' : 'finalized';
    },
    height: () => connection.getBlockHeight('finalized'),
    async broadcast(raw) {
      await connection.sendRawTransaction(Buffer.from(raw, 'base64'), {
        maxRetries: 3,
      });
    },
  };
}
export function testPort(): TransferPort {
  return {
    async prepare(reward) {
      return { signature: `local:${reward.id}`, raw: '', lastValid: 0 };
    },
    async status() {
      return 'finalized';
    },
    async height() {
      return 0;
    },
    async broadcast() {},
  };
}
