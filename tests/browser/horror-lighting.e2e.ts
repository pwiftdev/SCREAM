import { test, expect } from '@playwright/test';
import { menu, openMenu, atPlot } from './hollow-helpers';
test('cinematic lighting renders real scenes, respects settings, resizes and releases resources', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /shader|WebGL|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.route('**/__night-look', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<style>body{margin:0}#world{position:fixed;inset:0}</style><div id="world"></div>',
    }),
  );
  await page.goto('/__night-look');
  const initial = await page.evaluate(async () => {
    const { loadAssetPack } = await import(
      String('/src/game/rework/asset-pack.ts')
    );
    const { HollowRenderer } = await import(
      String('/src/game/hollow/renderer.ts')
    );
    const { streetScene } = await import(String('/src/game/hollow/street.ts'));
    await loadAssetPack();
    const r = new HollowRenderer(document.querySelector('#world'));
    streetScene(r);
    const { terrainHeight } = await import(String('/shared/house/terrain.ts'));
    r.camera.position.set(-100, terrainHeight(-100, 175) + 1.65, 175);
    r.camera.lookAt(-100, terrainHeight(-100, 195) + 1.65, 195);
    r.flash.intensity = 0;
    for (let i = 0; i < 4; i++) r.draw(i / 60);
    (window as unknown as { nightRenderer: unknown }).nightRenderer = r;
    return {
      shadows: !!r.lighting.moon.shadow.map,
      fogMatches: r.scene.fog.color.equals(r.scene.background),
      grain: r.effects.grain.blendMode.opacity.value,
      size: [r.gl.domElement.width, r.gl.domElement.height],
      lamps: r.world.userData.lamps.length,
    };
  });
  expect(initial).toMatchObject({
    shadows: true,
    fogMatches: true,
    grain: 0.024,
    size: [800, 450],
  });
  expect(initial.lamps).toBeGreaterThan(40);
  await page.screenshot({ path: 'docs/screens/horror-cemetery.png' });
  for (const [name, x, z, tx, tz] of [
    ['gate', 0, -45, 0, 25],
    ['harvest', -100, 355, -100, 380],
    ['chapel', 100, 345, 108, 374],
    ['carnival', 100, 145, 100, 175],
    ['asylum', 156, 269, 161, 284],
    ['ridge', -145, 263, -160, 286],
    ['village', 12, 21, 20, 38],
    ['hills', -69, 265, -110, 280],
  ] as const) {
    await page.evaluate(
      async ({ x, z, tx, tz }) => {
        const { terrainHeight } = await import(
          String('/shared/house/terrain.ts')
        );
        const r = (
          window as unknown as {
            nightRenderer: {
              camera: {
                position: { set: (x: number, y: number, z: number) => void };
                lookAt: (x: number, y: number, z: number) => void;
              };
              draw: (time: number) => void;
            };
          }
        ).nightRenderer;
        r.camera.position.set(x, terrainHeight(x, z) + 1.65, z);
        r.camera.lookAt(tx, terrainHeight(tx, tz) + 2, tz);
        r.draw(4);
      },
      { x, z, tx, tz },
    );
    await page.screenshot({ path: `docs/screens/horror-${name}.png` });
  }
  const house = await page.evaluate(async () => {
    const { HollowRenderer } = await import(
      String('/src/game/hollow/renderer.ts')
    );
    const { starterHouse } = await import(String('/shared/house/plots.ts'));
    const { startVisit } = await import(String('/shared/house/simulation.ts'));
    const r = (
      window as unknown as {
        nightRenderer: InstanceType<typeof HollowRenderer>;
      }
    ).nightRenderer;
    if (!(r instanceof HollowRenderer)) throw new Error('Missing renderer');
    const h = starterHouse(0, 0),
      state = startVisit(h, 1);
    state.pos.x = 10.5;
    state.pos.z = 3.5;
    r.house(h);
    r.render(state, 5);
    return {
      moon: r.lighting.moon.visible,
      flashlight: !!r.flash.shadow.map,
      ambient: r.lighting.ambient.intensity,
    };
  });
  expect(house).toEqual({ moon: false, flashlight: true, ambient: 0.065 });
  await page.screenshot({ path: 'docs/screens/horror-house.png' });
  const settings = await page.evaluate(async () => {
    const { readHollowSettings, saveHollowSettings } = await import(
      String('/src/lib/hollow-settings.ts')
    );
    const r = (
      window as unknown as {
        nightRenderer: {
          effects: {
            grain: { blendMode: { opacity: { value: number } } };
            normal: { enabled: boolean };
            composer: { inputBuffer: { width: number; height: number } };
          };
          gl: {
            shadowMap: { enabled: boolean };
            domElement: HTMLCanvasElement;
          };
          draw: (time: number) => void;
        };
      }
    ).nightRenderer;
    saveHollowSettings({
      ...readHollowSettings(),
      pixel: 1,
      reducedFlash: true,
      shadows: false,
      contactShadows: false,
    });
    r.draw(6);
    return {
      grain: r.effects.grain.blendMode.opacity.value,
      shadows: r.gl.shadowMap.enabled,
      ao: r.effects.normal.enabled,
      width: r.effects.composer.inputBuffer.width,
    };
  });
  expect(settings).toEqual({
    grain: 0,
    shadows: false,
    ao: false,
    width: 1600,
  });
  await page.setViewportSize({ width: 960, height: 540 });
  await page.waitForTimeout(100);
  const disposed = await page.evaluate(async () => {
    const { readHollowSettings, saveHollowSettings } = await import(
      String('/src/lib/hollow-settings.ts')
    );
    const { HollowRenderer } = await import(
      String('/src/game/hollow/renderer.ts')
    );
    const r = (
      window as unknown as {
        nightRenderer: InstanceType<typeof HollowRenderer>;
      }
    ).nightRenderer;
    if (!(r instanceof HollowRenderer)) throw new Error('Missing renderer');
    saveHollowSettings({ ...readHollowSettings(), cinematic: false });
    r.draw(7);
    const width = r.gl.domElement.width;
    let released = 0;
    r.effects.composer.inputBuffer.addEventListener(
      'dispose',
      () => released++,
    );
    r.effects.composer.outputBuffer.addEventListener(
      'dispose',
      () => released++,
    );
    r.dispose();
    saveHollowSettings({ ...readHollowSettings(), cinematic: true });
    return {
      width,
      released,
      canvases: document.querySelectorAll('canvas').length,
    };
  });
  expect(disposed).toEqual({ width: 960, released: 2, canvases: 0 });
  expect(errors).toEqual([]);
});

test('picture controls persist and the builder remains readable after menu transitions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await menu(page);
  await openMenu(page);
  await page.getByRole('button', { name: /^SETTINGS/ }).click();
  const cinematic = page.getByRole('checkbox', { name: 'cinematic effects' });
  await expect(cinematic).toBeChecked();
  await cinematic.uncheck();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('hollow-settings')!).cinematic,
    ),
  ).toBe(false);
  await cinematic.check();
  await expect(
    page.getByRole('checkbox', { name: 'contact shadows' }),
  ).toBeChecked();
  await expect(
    page.getByRole('checkbox', { name: 'directional shadows' }),
  ).toBeChecked();
  await page.getByLabel('film grain').focus();
  await page.keyboard.press('Home');
  await expect(page.getByLabel('film grain')).toHaveValue('0');
  await page.screenshot({ path: 'docs/screens/horror-settings.png' });
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'RETURN TO THE WORLD' }).click();
  await atPlot(page, 35);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.night-builder')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/screens/horror-builder.png' });
  await expect(page.locator('.night-builder canvas')).toBeVisible();
});
