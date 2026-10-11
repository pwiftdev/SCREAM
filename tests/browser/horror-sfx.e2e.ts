import { terrainHeight } from '../../shared/house/terrain';
import { test, expect } from '@playwright/test';
async function audioPage(page: import('@playwright/test').Page) {
  await page.route('**/__horror-audio', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><button>Start audio</button>',
    }),
  );
  await page.goto('/__horror-audio');
  await page.getByRole('button').click();
}
test('supplied sounds decode, follow actual gameplay, crossfade and dispose cleanly', async ({
  page,
}) => {
  await audioPage(page);
  const result = await page.evaluate(async () => {
    const { HollowAudio } = await import(String('/src/lib/hollow-audio.ts'));
    const { starterHouse } = await import(String('/shared/house/plots.ts'));
    const { startVisit } = await import(String('/shared/house/simulation.ts'));
    const { terrainHeight } = await import(String('/shared/house/terrain.ts'));
    const audio = new HollowAudio();
    await Promise.all([audio.unlock(), audio.unlock()]);
    const loaded = audio.library.buffers.size;
    const loops = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => s.loop,
    ).length;
    const footDurations = [...audio.library.buffers.entries()]
      .filter(([key]: [string, unknown]) =>
        /^(wood|carpet|concrete|metal|stairs|leaves|gravel|mud|exposed)-/.test(
          key,
        ),
      )
      .map(([, buffer]: [string, AudioBuffer]) => buffer.duration);
    audio.street();
    audio.worldView({ x: 0, y: 1.65, z: -65 }, Math.PI, true);
    audio.worldView({ x: 0, y: 1.65, z: -63.3 }, Math.PI, true);
    const footPlayed = [...audio.mixer.active].some(
      (s: { source: AudioBufferSourceNode }) =>
        s.source.buffer === audio.library.buffers.get('gravel-0'),
    );
    const idleCount = audio.mixer.active.size;
    audio.worldView({ x: 0, y: 1.65, z: -63.3 }, Math.PI, false);
    const idleAdded = audio.mixer.active.size - idleCount;
    audio.nextGrowl = 0;
    audio.worldView(
      { x: -98, y: terrainHeight(-98, 178) + 1.65, z: 178 },
      0,
      false,
    );
    const growl = [...audio.mixer.active].find(
      (s: { source: AudioBufferSourceNode }) =>
        s.source.buffer === audio.library.buffers.get('growl-0'),
    );
    const creaturePosition = growl?.position;
    const fadesBefore = audio.fades.size;
    audio.menu();
    const fadesAfter = audio.fades.size;
    const house = starterHouse(0, 0),
      state = startVisit(house, 1);
    audio.enter(house);
    audio.silenceEffects();
    state.tick = 1;
    state.doors.add(100);
    state.doors.add(676);
    audio.update(state);
    const doorCount = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => !s.loop,
    ).length;
    audio.update(state);
    const duplicateCount = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => !s.loop,
    ).length;
    audio.seek(state);
    audio.update(state);
    const seekCount = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => !s.loop,
    ).length;
    state.tick = 2;
    state.events.push({ tick: 2, type: 'lurker', pos: { ...state.pos } });
    audio.update(state);
    state.tick = 3;
    state.events.push({ tick: 3, type: 'lurker', pos: { ...state.pos } });
    audio.update(state);
    const jumpBuffers = ['jump-0', 'jump-1', 'jump-2'].map((id) =>
      audio.library.buffers.get(id),
    );
    const jumpCount = [...audio.mixer.active].filter(
      (s: { source: AudioBufferSourceNode }) =>
        jumpBuffers.includes(s.source.buffer),
    ).length;
    audio.results(false);
    const activeBeforeDispose = audio.mixer.active.size;
    const mixer = audio.mixer,
      library = audio.library;
    audio.dispose();
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      loaded,
      jumpCount,
      loops,
      footDurations,
      footPlayed,
      idleAdded,
      creaturePosition,
      fadesBefore,
      fadesAfter,
      doorCount,
      duplicateCount,
      seekCount,
      activeBeforeDispose,
      remaining: mixer.active.size,
      buffers: library.buffers.size,
      state: audio.context.state,
    };
  });
  expect(result.loaded).toBe(98);
  expect(result.jumpCount).toBe(1);
  expect(result.loops).toBe(2);
  expect(result.footDurations).toHaveLength(52);
  expect(result.footDurations.every((n: number) => n > 0.37 && n < 0.4)).toBe(
    true,
  );
  expect(result.footPlayed).toBe(true);
  expect(result.idleAdded).toBe(0);
  expect(result.creaturePosition).toEqual({
    x: -98,
    y: terrainHeight(-98, 180) + 1.3,
    z: 180,
  });
  expect(result.fadesBefore).toBeGreaterThan(0);
  expect(result.fadesAfter).toBe(0);
  expect(result.doorCount).toBe(1);
  expect(result.duplicateCount).toBe(1);
  expect(result.seekCount).toBe(0);
  expect(result.activeBeforeDispose).toBeGreaterThan(0);
  expect(result.remaining).toBe(0);
  expect(result.buffers).toBe(0);
  expect(result.state).toBe('closed');
});
test('supplied effects and background recordings obey their buses and play without clipping', async ({
  page,
}) => {
  await audioPage(page);
  const results = await page.evaluate(async () => {
    const { AudioMixer } = await import(String('/src/lib/audio-mixer.ts'));
    const render = async (file: string, bus: string, muted: boolean) => {
      const decoder = new OfflineAudioContext(1, 1, 24000);
      const buffer = await decoder.decodeAudioData(
        await (await fetch(`/audio/horror/${file}`)).arrayBuffer(),
      );
      const context = new OfflineAudioContext(
          2,
          Math.ceil(Math.max(2, buffer.duration + 0.5) * 24000),
          24000,
        ),
        mixer = new AudioMixer(context);
      mixer.configure({
        master: 0.65,
        music: 0.35,
        effects: 0.8,
        voices: 0.65,
        ...(muted ? { [bus]: 0 } : {}),
      });
      const paused = context.suspend(0.25),
        rendering = context.startRendering();
      await paused;
      mixer.play(buffer, 0.28, bus);
      await context.resume();
      const data = (await rendering).getChannelData(0);
      let peak = 0,
        sum = 0;
      for (const value of data) {
        peak = Math.max(peak, Math.abs(value));
        sum += value * value;
      }
      mixer.dispose();
      return { peak, rms: Math.sqrt(sum / data.length) };
    };
    const result = [];
    for (const [file, bus] of [
      ['gravel-0.wav', 'effects'],
      ['wind-0.mp3', 'music'],
      ['growl-0.mp3', 'voices'],
      ['scream-0.mp3', 'voices'],
      ['scream-1.mp3', 'voices'],
      ['jump-0.mp3', 'effects'],
      ['jump-1.mp3', 'effects'],
      ['jump-2.mp3', 'effects'],
      ['music-0.mp3', 'music'],
      ['atmosphere-0.mp3', 'music'],
    ])
      result.push({
        file,
        audible: await render(file, bus, false),
        muted: await render(file, bus, true),
      });
    return result;
  });
  for (const result of results) {
    expect(result.audible.rms, result.file).toBeGreaterThan(0.001);
    expect(result.audible.peak, result.file).toBeLessThan(0.85);
    expect(result.muted.peak, result.file).toBe(0);
  }
});
test('failed supplied clips retry and late decoding cannot revive disposed audio', async ({
  page,
}) => {
  await audioPage(page);
  const route = '**/audio/horror/growl-0.mp3';
  await page.route(route, (r) =>
    r.fulfill({ status: 503, body: 'Unavailable' }),
  );
  expect(
    await page.evaluate(async () => {
      const { HollowAudio } = await import(String('/src/lib/hollow-audio.ts'));
      const audio = new HollowAudio();
      await audio.unlock();
      (window as unknown as { testAudio: unknown }).testAudio = audio;
      return audio.library.buffers.size;
    }),
  ).toBe(97);
  await page.unroute(route);
  const result = await page.evaluate(async () => {
    const { HollowAudio } = await import(String('/src/lib/hollow-audio.ts'));
    const audio = (
      window as unknown as { testAudio: InstanceType<typeof HollowAudio> }
    ).testAudio;
    await audio.unlock();
    const recovered = audio.library.buffers.size;
    audio.dispose();
    const interrupted = new HollowAudio();
    const pending = interrupted.unlock().catch(() => {});
    interrupted.dispose();
    await pending;
    return {
      recovered,
      buffers: interrupted.library.buffers.size,
      active: interrupted.mixer.active.size,
    };
  });
  expect(result).toEqual({ recovered: 98, buffers: 0, active: 0 });
});

test('handpicked menu music recovers without restarting wind and stays out of gameplay', async ({
  page,
}) => {
  await audioPage(page);
  let requests = 0;
  await page.route('**/audio/horror/music-0.mp3', (r) =>
    ++requests === 1
      ? r.fulfill({ status: 503, body: 'Unavailable' })
      : r.continue(),
  );
  const result = await page.evaluate(async () => {
    const { HollowAudio } = await import(String('/src/lib/hollow-audio.ts'));
    const audio = new HollowAudio();
    await audio.unlock();
    const wind = audio.wind;
    await audio.unlock();
    const music = audio.backgrounds.get('music-0');
    const recovered = !!music && audio.wind === wind;
    await audio.unlock();
    const stableMenu = music === audio.backgrounds.get('music-0');
    audio.street();
    const atmosphere = audio.backgrounds.get('atmosphere-0');
    const worldHasMusic = [...audio.mixer.active].some(
      (s: { source: AudioBufferSourceNode }) =>
        s.source.buffer === audio.library.buffers.get('music-0'),
    );
    await audio.unlock();
    const stableWorld = atmosphere === audio.backgrounds.get('atmosphere-0');
    const position = { x: 0, y: 1.7, z: 0 };
    audio.scare(position);
    const first = audio.scream;
    audio.scare(position);
    const sameScream = first === audio.scream;
    first.stop();
    audio.scare(position);
    const second = audio.scream;
    const bothScreams = first.source.buffer !== second.source.buffer;
    audio.silenceEffects();
    audio.jump({ x: 100, y: 1, z: 100 });
    const farJumps = [...audio.mixer.active].filter(
      (s: { loop: boolean }) => !s.loop,
    ).length;
    audio.jump(position);
    const jumps = () =>
      [...audio.mixer.active].filter((s: { source: AudioBufferSourceNode }) =>
        ['jump-0', 'jump-1', 'jump-2'].some(
          (id) => s.source.buffer === audio.library.buffers.get(id),
        ),
      );
    const jump = jumps()[0];
    const cooldown = audio.nextJump - audio.context.currentTime;
    await new Promise((resolve) => setTimeout(resolve, 6200));
    audio.jump(position);
    const overlapping = jumps().length;
    audio.menu();
    const afterMenu = [...audio.mixer.active].every(
      (s: { loop: boolean }) => s.loop,
    );
    const screamReleased = audio.scream === undefined;
    audio.dispose();
    return {
      recovered,
      stableMenu,
      stableWorld,
      atmosphere: !!atmosphere,
      worldHasMusic,
      sameScream,
      bothScreams,
      farJumps,
      cooldown,
      duration: jump.source.buffer.duration,
      overlapping,
      afterMenu,
      screamReleased,
    };
  });
  expect(result).toMatchObject({
    recovered: true,
    stableMenu: true,
    stableWorld: true,
    atmosphere: true,
    worldHasMusic: false,
    sameScream: true,
    bothScreams: true,
    farJumps: 0,
    overlapping: 1,
    afterMenu: true,
    screamReleased: true,
  });
  expect(result.cooldown).toBeGreaterThan(result.duration + 2.4);
});

test('scares lower background audio smoothly, recover, and preserve a changed music setting', async ({
  page,
}) => {
  await audioPage(page);
  const results = await page.evaluate(async () => {
    const { AudioMixer } = await import(String('/src/lib/audio-mixer.ts'));
    const render = async (mode: 'normal' | 'muted' | 'reset') => {
      const context = new OfflineAudioContext(1, 24000 * 4, 24000);
      const mixer = new AudioMixer(context);
      const settings = { master: 1, music: 1, effects: 0, voices: 0 };
      mixer.configure(settings);
      const tone = context.createBuffer(1, 24000 * 4, 24000);
      tone.getChannelData(0).fill(0.02);
      mixer.play(tone, 1, 'music');
      const duck = context.suspend(0.5);
      const change = context.suspend(1);
      const rendered = context.startRendering();
      await duck;
      mixer.duckMusic(0.8);
      await context.resume();
      await change;
      if (mode === 'muted') mixer.configure({ ...settings, music: 0 });
      if (mode === 'reset') mixer.restoreMusic();
      await context.resume();
      const data = (await rendered).getChannelData(0);
      const rms = (start: number, end: number) => {
        const values = data.slice(start * 24000, end * 24000);
        return Math.sqrt(
          values.reduce((sum, v) => sum + v * v, 0) / values.length,
        );
      };
      const result = {
        before: rms(0.35, 0.45),
        during: rms(0.7, 0.9),
        reset: rms(1.4, 1.6),
        after: rms(3.3, 3.5),
      };
      mixer.dispose();
      return result;
    };
    return {
      normal: await render('normal'),
      muted: await render('muted'),
      reset: await render('reset'),
    };
  });
  expect(results.normal.during).toBeLessThan(results.normal.before * 0.4);
  expect(results.normal.after).toBeGreaterThan(results.normal.before * 0.95);
  expect(results.muted.after).toBeLessThan(0.000001);
  expect(results.reset.reset).toBeGreaterThan(results.reset.before * 0.95);
});

test('outdoor creature cues are positional, rate limited and canceled on pause or scene changes', async ({
  page,
}) => {
  await audioPage(page);
  const result = await page.evaluate(async () => {
    const { HollowAudio } = await import(String('/src/lib/hollow-audio.ts'));
    const audio = new HollowAudio();
    await audio.unlock();
    audio.street();
    audio.worldView({ x: 0, y: 1.5, z: 260 }, 0, false);
    audio.encounter('behind', { x: 0, z: 265 });
    const behind = audio.encounterSounds[0]?.position;
    audio.moveEncounter({ x: 1, z: 263 });
    const moved = audio.encounterSounds[0]?.position;
    audio.encounter('impact', { x: 0, z: 259 });
    const count = audio.encounterSounds.length;
    audio.encounter('impact', { x: 0, z: 259 });
    const limited = audio.encounterSounds.length === count;
    const handles = [...audio.encounterSounds];
    audio.endEncounter();
    const stopped = handles.every((s) => !audio.mixer.active.has(s));
    audio.encounter('approach', { x: 0, z: 248 });
    const approach = audio.encounterSounds[0];
    audio.menu();
    const transitioned =
      !audio.mixer.active.has(approach) && audio.encounterSounds.length === 0;
    audio.encounter('behind', { x: 0, z: 265 });
    const menuSilent = audio.encounterSounds.length === 0;
    audio.dispose();
    return { behind, moved, count, limited, stopped, transitioned, menuSilent };
  });
  expect(result.behind).toMatchObject({ x: 0, z: 265 });
  expect(result.moved).toMatchObject({ x: 1, z: 263 });
  expect(result.count).toBe(2);
  expect(result).toMatchObject({
    limited: true,
    stopped: true,
    transitioned: true,
    menuSilent: true,
  });
});
