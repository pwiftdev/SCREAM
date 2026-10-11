import { afterEach, expect, it, vi } from 'vitest';
import { SfxLibrary } from '../src/lib/sfx-library';
afterEach(() => vi.unstubAllGlobals());
it('ignores a decode that finishes after disposal and aborts queued requests', async () => {
  let release!: (buffer: AudioBuffer) => void;
  const decoded = new Promise<AudioBuffer>((resolve) => {
    release = resolve;
  });
  const decodeAudioData = vi.fn(() => decoded);
  const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
  vi.stubGlobal('fetch', fetcher);
  const library = new SfxLibrary(
    { decodeAudioData } as unknown as BaseAudioContext,
    Object.fromEntries(
      Array.from({ length: 9 }, (_, i) => [
        `step-${i}`,
        `horror/step-${i}.wav`,
      ]),
    ),
  );
  const loading = library.load();
  await vi.waitFor(() => expect(decodeAudioData).toHaveBeenCalledTimes(6));
  library.dispose();
  release({ duration: 0.38 } as AudioBuffer);
  await loading;
  expect(fetcher).toHaveBeenCalledTimes(6);
  expect(library.buffers.size).toBe(0);
  expect(library.failed.size).toBe(0);
  await library.load();
  expect(fetcher).toHaveBeenCalledTimes(6);
});
it('shares concurrent loads and retries only a failed file', async () => {
  let failed = true;
  const fetcher = vi.fn(
    async (url: string) =>
      new Response(new Uint8Array([1]), {
        status: url.endsWith('bad.wav') && failed ? 503 : 200,
      }),
  );
  vi.stubGlobal('fetch', fetcher);
  const decodeAudioData = vi.fn(async () => ({ duration: 1 }) as AudioBuffer);
  const library = new SfxLibrary(
    { decodeAudioData } as unknown as BaseAudioContext,
    { good: 'good.wav', bad: 'bad.wav' },
  );
  await Promise.all([library.load(), library.load()]);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect([...library.failed]).toEqual(['bad']);
  failed = false;
  await library.load();
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(library.buffers.size).toBe(2);
  expect(library.failed.size).toBe(0);
  library.dispose();
});
