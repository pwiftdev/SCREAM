export class RateLimit {
  private tokens: number;
  private updated: number;
  constructor(
    private capacity: number,
    private refill: number,
    now = Date.now(),
  ) {
    this.tokens = capacity;
    this.updated = now;
  }
  take(now = Date.now()) {
    this.tokens = Math.min(
      this.capacity,
      this.tokens + (Math.max(0, now - this.updated) * this.refill) / 1000,
    );
    this.updated = Math.max(this.updated ?? now, now);
    if (this.tokens < 1) return false;
    this.tokens--;
    return true;
  }
}
