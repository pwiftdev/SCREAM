export interface Reward {
  id: string;
  wallet: string;
  lamports: string;
  status: 'pending' | 'sending' | 'done';
  signature?: string;
  raw?: string;
  lastValid?: number;
}
export interface LedgerStore {
  load(): Promise<Reward[] | undefined>;
  write(json: string): Promise<void>;
  assertAvailable(): void;
  close(): Promise<void>;
}
export class Ledger {
  rewards: Reward[] = [];
  private failed = false;
  constructor(readonly store: LedgerStore) {}
  async start() {
    this.rewards = (await this.store.load()) ?? [];
  }
  available() {
    if (this.failed) throw new Error('reward ledger requires restart');
    this.store.assertAvailable();
  }
  async save() {
    this.available();
    try {
      await this.store.write(JSON.stringify(this.rewards));
      this.available();
    } catch (error) {
      this.failed = true;
      throw error;
    }
  }
  async add(rewards: Reward[]) {
    this.available();
    for (const reward of rewards)
      if (!this.rewards.some((r) => r.id === reward.id))
        this.rewards.push(reward);
    await this.save();
  }
}
