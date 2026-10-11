export class SfxLibrary {
  readonly buffers = new Map<string, AudioBuffer>();
  readonly failed = new Set<string>();
  private pending?: Promise<void>;
  private abort = new AbortController();
  constructor(
    private context: BaseAudioContext,
    private files: Record<string, string>,
  ) {}
  load(progress?: (value: number) => void) {
    if (this.abort.signal.aborted) return Promise.resolve();
    if (this.pending) return this.pending;
    const entries = Object.entries(this.files).filter(
      ([id]) => !this.buffers.has(id),
    );
    let completed = this.buffers.size;
    this.pending = Promise.all(
      Array.from({ length: 6 }, async () => {
        while (entries.length && !this.abort.signal.aborted) {
          const [id, file] = entries.shift()!;
          try {
            const response = await fetch(`/audio/${file}`, {
              signal: this.abort.signal,
            });
            if (!response.ok) throw new Error(`Audio HTTP ${response.status}`);
            const buffer = await this.context.decodeAudioData(
              await response.arrayBuffer(),
            );
            if (!this.abort.signal.aborted) {
              this.buffers.set(id, buffer);
              this.failed.delete(id);
            }
          } catch {
            if (!this.abort.signal.aborted) this.failed.add(id);
          } finally {
            progress?.(++completed / Object.keys(this.files).length);
          }
        }
      }),
    )
      .then(() => {})
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }
  dispose() {
    this.abort.abort();
    this.buffers.clear();
    this.failed.clear();
  }
}
