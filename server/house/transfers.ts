import type { Ledger, Reward } from './ledger';
export interface TransferPort {
  prepare(
    reward: Reward,
  ): Promise<{ signature: string; raw: string; lastValid: number }>;
  status(
    signature: string,
  ): Promise<'missing' | 'pending' | 'failed' | 'finalized'>;
  height(): Promise<number>;
  broadcast(raw: string): Promise<void>;
}
export class Transfers {
  private running?: Promise<void>;
  constructor(
    readonly ledger: Ledger,
    readonly port: TransferPort,
  ) {}
  recover() {
    return (this.running ??= this.run().finally(() => {
      this.running = undefined;
    }));
  }
  private async run() {
    for (const reward of this.ledger.rewards) {
      this.ledger.available();
      if (reward.status !== 'done') await this.transfer(reward);
    }
  }
  private async transfer(reward: Reward) {
    const { ledger, port } = this;
    if (reward.status === 'sending') {
      const status = await port.status(reward.signature!);
      ledger.available();
      if (status === 'finalized') {
        reward.status = 'done';
        await ledger.save();
        return;
      }
      if (status === 'pending') return;
      if (status === 'missing') {
        const height = await port.height();
        ledger.available();
        if (height <= reward.lastValid!) {
          await port.broadcast(reward.raw!);
          return;
        }
        const recheck = await port.status(reward.signature!);
        ledger.available();
        if (recheck !== 'missing') return;
      }
    }
    ledger.available();
    const signed = await port.prepare(reward);
    ledger.available();
    Object.assign(reward, signed, { status: 'sending' });
    await ledger.save();
    ledger.available();
    await port.broadcast(signed.raw);
  }
}
