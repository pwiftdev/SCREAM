import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import type { Material, Mesh, PointLight } from 'three';
import type { HollowRenderer } from '../../src/game/hollow/renderer';
import type { EncounterActors } from '../../src/game/rework/encounter-actors';
import type { OutdoorEncounters } from '../../src/game/rework/outdoor-encounters';
type HorrorWindow = {
  horror: {
    r: HollowRenderer;
    actors: EncounterActors;
    director: OutdoorEncounters;
    cues: string[];
  };
};

test('outdoor horror renders a visible lantern pool, stalking and rushing creatures, with isolated materials', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /shader|WebGL|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.route('**/__outdoor-horror', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<style>body{margin:0}#world{position:fixed;inset:0}</style><div id="world"></div>',
    }),
  );
  await page.goto('/__outdoor-horror');
  await page.evaluate(async () => {
    const { loadAssetPack } = await import(
      String('/src/game/rework/asset-pack.ts')
    );
    const { HollowRenderer } = await import(
      String('/src/game/hollow/renderer.ts')
    );
    const { streetScene } = await import(String('/src/game/hollow/street.ts'));
    const { EncounterActors } = await import(
      String('/src/game/rework/encounter-actors.ts')
    );
    const { OutdoorEncounters } = await import(
      String('/src/game/rework/outdoor-encounters.ts')
    );
    const { worldBlocked } = await import(
      String('/shared/house/neighborhood.ts')
    );
    const { terrainHeight } = await import(String('/shared/house/terrain.ts'));
    await loadAssetPack();
    const r = new HollowRenderer(document.querySelector('#world'));
    streetScene(r);
    r.camera.position.set(0, terrainHeight(0, 260) + 1.52, 260);
    r.camera.rotation.set(-0.15, 0, 0);
    const actors = new EncounterActors(r.world);
    const cues: string[] = [];
    const director = new OutdoorEncounters(
      worldBlocked,
      terrainHeight,
      (cue: string) => cues.push(cue),
      () => 0,
    );
    Object.assign(window, { horror: { r, actors, director, cues } });
    r.flash.visible = false;
    r.held.userData.lightEnabled(false);
    r.draw(10);
  });
  const dark = await page.screenshot({
    path: 'docs/screens/outdoor-lantern-off.png',
  });
  await page.evaluate(() => {
    const { r } = (window as unknown as HorrorWindow).horror;
    r.flash.visible = true;
    r.held.userData.lightEnabled(true);
    r.draw(10);
  });
  const lit = await page.screenshot({
    path: 'docs/screens/outdoor-lantern-on.png',
  });
  const brightness = async (png: Buffer) => {
    const { channels } = await sharp(png)
      .extract({ left: 400, top: 350, width: 800, height: 400 })
      .stats();
    return channels.slice(0, 3).reduce((sum, c) => sum + c.mean, 0) / 3;
  };
  expect(await brightness(lit)).toBeGreaterThan(
    (await brightness(dark)) * 1.25,
  );
  const stalker = await page.evaluate(() => {
    const { r, director, actors } = (window as unknown as HorrorWindow).horror;
    for (let i = 0; i < 1510; i++)
      director.step(1 / 60, r.camera.position, 0, 0, true, false);
    r.camera.rotation.set(0, Math.PI, 0);
    actors.update(director.current, r.camera, 25);
    r.draw(25);
    return director.current?.kind;
  });
  expect(stalker).toBe('stalker');
  await page.screenshot({ path: 'docs/screens/outdoor-stalker.png' });
  const rush = await page.evaluate(() => {
    const { r, director, actors } = (window as unknown as HorrorWindow).horror;
    for (let i = 0; i < 60; i++)
      director.step(1 / 60, r.camera.position, Math.PI, 0, true, false);
    r.camera.rotation.set(0, 0, 0);
    for (let i = 0; i < 2400 && !director.current; i++)
      director.step(1 / 60, r.camera.position, 0, 0, true, false);
    for (let i = 0; i < 95; i++)
      director.step(1 / 60, r.camera.position, 0, 0, true, false);
    actors.update(director.current, r.camera, 65);
    r.draw(65);
    return director.current?.kind;
  });
  expect(rush).toBe('rush');
  await page.screenshot({ path: 'docs/screens/outdoor-rush.png' });
  await page.evaluate(() => {
    const { r, director, actors } = (window as unknown as HorrorWindow).horror;
    for (let i = 0; i < 80 && director.current && !director.current.fade; i++)
      director.step(1 / 60, r.camera.position, 0, 0, true, false);
    actors.update(director.current, r.camera, 65.5);
    r.draw(65.5);
  });
  await page.screenshot({ path: 'docs/screens/outdoor-impact.png' });
  const cleanup = await page.evaluate(async () => {
    const { assetModel } = await import(
      String('/src/game/rework/asset-pack.ts')
    );
    const { r, director, actors, cues } = (window as unknown as HorrorWindow)
      .horror;
    for (let i = 0; i < 80; i++)
      director.step(1 / 60, r.camera.position, 0, 0, true, false);
    let disposed = 0;
    const owned = new Set<Material>();
    for (const root of r.world.children.filter(
      (o) => o.name === 'outdoor-encounter',
    ))
      root.traverse((node) => {
        const o = node as Mesh;
        if (o.material)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            owned.add(m);
      });
    for (const material of owned)
      material.addEventListener('dispose', () => disposed++);
    actors.dispose();
    const original = assetModel('mon_stalker');
    let sharedIntact = true;
    original.traverse((node: Mesh) => {
      const o = node;
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          sharedIntact &&= m.userData.assetPack && m.opacity === 1;
    });
    r.dispose();
    return {
      cues,
      disposed,
      owned: owned.size,
      sharedIntact,
      active: !!director.current,
    };
  });
  expect(cleanup.cues).toEqual(['behind', 'approach', 'impact']);
  expect(cleanup.active).toBe(false);
  expect(cleanup.sharedIntact).toBe(true);
  expect(cleanup.disposed).toBe(cleanup.owned);
  expect(errors).toEqual([]);
});

test('street controls use slow movement, stop on pause, toggle both lantern lights, and respect comfort settings', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/health');
  await page.setContent(
    '<style>#world{width:960px;height:540px}</style><div id="world"></div>',
  );
  const state = await page.evaluate(async () => {
    const { loadAssetPack } = await import(
      String('/src/game/rework/asset-pack.ts')
    );
    const { StreetController } = await import(
      String('/src/game/hollow/street-controller.ts')
    );
    const { readHollowSettings, saveHollowSettings } = await import(
      String('/src/lib/hollow-settings.ts')
    );
    await loadAssetPack();
    const c = new StreetController(
      document.querySelector('#world'),
      () => {},
      () => {},
    );
    for (let i = 0; i < 150 && !c.connected; i++)
      await new Promise((resolve) => setTimeout(resolve, 20));
    cancelAnimationFrame(c.raf);
    c.walking = true;
    c.yaw = 0;
    c.renderer.camera.position.set(0, 1.52, 260);
    c.last = 1000;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    for (let i = 1; i <= 30; i++) {
      c.loop(1000 + (i * 1000) / 30);
      cancelAnimationFrame(c.raf);
    }
    const distance = 260 - c.renderer.camera.position.z;
    const roll = c.renderer.camera.rotation.z;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
    const lanternOff =
      !c.renderer.flash.visible &&
      c.renderer.held.children.find((o: PointLight) => o.isPointLight)
        .intensity === 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));
    const lanternOn =
      c.renderer.flash.visible &&
      c.renderer.held.children.find((o: PointLight) => o.isPointLight)
        .intensity > 0;
    saveHollowSettings({
      ...readHollowSettings(),
      cameraMotion: 0,
      creatureScares: false,
    });
    c.loop(2033);
    cancelAnimationFrame(c.raf);
    const noMotion =
      c.renderer.camera.rotation.z === 0 &&
      c.renderer.camera.rotation.x === c.pitch;
    c.pause();
    const z = c.renderer.camera.position.z;
    c.loop(2066);
    cancelAnimationFrame(c.raf);
    const paused =
      !c.walking && c.renderer.camera.position.z === z && !c.encounters.current;
    c.dispose();
    return {
      connected: c.connected,
      notice: c.notice,
      distance,
      roll,
      lanternOff,
      lanternOn,
      noMotion,
      paused,
      settings: readHollowSettings(),
    };
  });
  expect(state.connected, JSON.stringify(state)).toBe(true);
  expect(state.distance).toBeCloseTo(3.9);
  expect(Math.abs(state.roll)).toBeGreaterThan(0);
  expect(state).toMatchObject({
    lanternOff: true,
    lanternOn: true,
    noMotion: true,
    paused: true,
  });
  expect(state.settings).toMatchObject({
    cameraMotion: 0,
    creatureScares: false,
  });
  expect(errors).toEqual([]);
});
