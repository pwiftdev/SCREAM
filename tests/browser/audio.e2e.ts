import { test, expect } from '@playwright/test';
async function audioPage(page: import('@playwright/test').Page) {
  await page.route('**/__audio-check', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><button>Start audio</button>',
    }),
  );
  await page.goto('/__audio-check');
  await page.getByRole('button').click();
}
test('recorded audio decodes, follows the camera, resets and releases voices', async ({
  page,
}) => {
  await audioPage(page);
  const result = await page.evaluate(async () => {
    const path = '/src/lib/audio.ts',
      settingsPath = '/src/lib/settings.ts';
    const { GameAudio } = await import(path),
      { defaultSettings } = await import(settingsPath);
    const audio = new GameAudio();
    audio.start(defaultSettings);
    await audio.ready;
    const count = audio.buffers.size;
    audio.view({ x: -12, y: 1.7, z: -25 }, { x: 1, y: 0, z: 0 });
    const listener = [
      audio.context.listener.positionX.value,
      audio.context.listener.forwardX.value,
    ];
    const base = {
      id: 'one',
      phase: 'playing',
      now: 1000,
      players: [],
      generators: [],
      pallets: [],
      events: [],
      dawnAt: 0,
    };
    const hit = {
      id: 'hit1',
      kind: 'hit',
      x: -12,
      z: -25,
      at: 1000,
      until: 2000,
    };
    audio.update({ ...base, events: [hit] });
    const first = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => !s.loop,
    ).length;
    audio.update({ ...base, events: [hit] });
    const repeated = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => !s.loop,
    ).length;
    audio.reset();
    const reset = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => !s.loop,
    ).length;
    audio.update({ ...base, id: 'two', events: [hit] });
    const next = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => !s.loop,
    ).length;
    const durations = [...audio.buffers.values()].map(
      (b) => (b as AudioBuffer).duration,
    );
    const mixer = audio.mixer;
    for (let i = 0; i < 100; i++) mixer.play(audio.buffers.get('wood-0'), 0.1);
    const capped = mixer.active.size;
    audio.dispose();
    return {
      count,
      listener,
      first,
      repeated,
      reset,
      next,
      capped,
      remaining: mixer.active.size,
      durations,
    };
  });
  expect(result.count).toBe(56);
  expect(result.listener).toEqual([-12, 1]);
  expect(result.first).toBe(1);
  expect(result.repeated).toBe(1);
  expect(result.reset).toBe(0);
  expect(result.next).toBe(1);
  expect(result.capped).toBeLessThanOrEqual(40);
  expect(result.remaining).toBe(0);
  expect(result.durations.every((d: number) => d > 0.01 && d < 65)).toBe(true);
});
test('real offline audio is audible, bounded, and silenced by its settings bus', async ({
  page,
}) => {
  await audioPage(page);
  const results = await page.evaluate(async () => {
    const path = '/src/lib/audio-mixer.ts';
    const { AudioMixer } = await import(path);
    const bytes = await (
      await fetch('/audio/world/wood-hit-0.wav')
    ).arrayBuffer();
    const render = async (muted: boolean) => {
      const context = new OfflineAudioContext(2, 32000, 32000),
        mixer = new AudioMixer(context);
      mixer.configure({
        master: 0.6,
        effects: muted ? 0 : 0.75,
        music: 0.4,
        voices: 0.65,
      });
      const buffer = await context.decodeAudioData(bytes.slice(0));
      const paused = context.suspend(0.25);
      const rendering = context.startRendering();
      await paused;
      mixer.play(buffer, 0.7);
      await context.resume();
      const rendered = await rendering,
        data = rendered.getChannelData(0);
      let peak = 0,
        energy = 0;
      for (const sample of data) {
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
      }
      mixer.dispose();
      return { peak, rms: Math.sqrt(energy / data.length) };
    };
    return { sound: await render(false), mute: await render(true) };
  });
  expect(results.sound.rms).toBeGreaterThan(0.002);
  expect(results.sound.peak).toBeLessThan(0.9);
  expect(results.mute.peak).toBe(0);
});
test('failed audio assets and disposal during loading remain recoverable', async ({
  page,
}) => {
  await audioPage(page);
  await page.route('**/audio/world/forest.mp3', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  const result = await page.evaluate(async () => {
    const path = '/src/lib/audio.ts',
      settingsPath = '/src/lib/settings.ts';
    const { GameAudio } = await import(path),
      { defaultSettings } = await import(settingsPath);
    const audio = new GameAudio();
    audio.start(defaultSettings);
    await audio.ready;
    const loaded = audio.buffers.size;
    audio.view({ x: 0, z: 0 }, { x: 0, z: 1 });
    audio.dispose();
    const interrupted = new GameAudio();
    interrupted.start(defaultSettings);
    interrupted.dispose();
    await interrupted.ready;
    return {
      loaded,
      remaining: interrupted.buffers.size,
      context: !!interrupted.context,
    };
  });
  expect(result.loaded).toBe(55);
  expect(result.remaining).toBe(0);
  expect(result.context).toBe(false);
});
