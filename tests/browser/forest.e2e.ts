import { test, expect } from '@playwright/test';
test('forest biomes render, wind and creatures respect reduced motion, and local GPU resources dispose', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /shader|WebGL|THREE/.test(m.text()))
      errors.push(m.text());
  });
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.route('**/__forest-look', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<style>body{margin:0}#world{position:fixed;inset:0}</style><div id="world"></div>',
    }),
  );
  await page.goto('/__forest-look');
  await page.evaluate(async () => {
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
    (window as unknown as { forestRenderer: unknown }).forestRenderer = r;
  });
  for (const [name, x, z, tx, tz] of [
    ['pines', -69, 265, -100, 273],
    ['watcher', -20, 264, -20, 275],
    ['camp', -55, 266, -55, 276],
    ['autumn', -167, 94, -165, 110],
    ['wetland', 172, 432, 172, 442],
    ['stones', 45, 272, 45, 285],
    ['hollow', -175, 233, -175, 245],
  ] as const) {
    const stats = await page.evaluate(
      async ({ x, z, tx, tz }) => {
        const { terrainHeight } = await import(
          String('/shared/house/terrain.ts')
        );
        const { HollowRenderer } = await import(
          String('/src/game/hollow/renderer.ts')
        );
        const r = (
          window as unknown as {
            forestRenderer: InstanceType<typeof HollowRenderer>;
          }
        ).forestRenderer;
        if (!(r instanceof HollowRenderer))
          throw new Error('Missing forest renderer');
        r.camera.position.set(x, terrainHeight(x, z) + 1.65, z);
        r.camera.lookAt(tx, terrainHeight(tx, tz) + 3, tz);
        r.draw(12);
        r.draw(12.016);
        return {
          calls: r.gl.info.render.calls,
          triangles: r.gl.info.render.triangles,
        };
      },
      { x, z, tx, tz },
    );
    expect(stats.calls).toBeLessThan(1200);
    await page.screenshot({ path: `docs/screens/forest-${name}.png` });
  }
  const state = await page.evaluate(async () => {
    const { HollowRenderer } = await import(
      String('/src/game/hollow/renderer.ts')
    );
    const { terrainHeight } = await import(String('/shared/house/terrain.ts'));
    const r = (
      window as unknown as {
        forestRenderer: InstanceType<typeof HollowRenderer>;
      }
    ).forestRenderer;
    if (!(r instanceof HollowRenderer))
      throw new Error('Missing forest renderer');
    const wind = r.world.userData.forestWind;
    r.camera.position.set(-20, terrainHeight(-20, 265) + 1.65, 265);
    const wisp = r.world.getObjectByName('cre_wisp');
    r.world.userData.animateAssets(10, r.camera, false);
    const y = wisp.position.y;
    r.world.userData.animateAssets(12, r.camera, false);
    const moves = y !== wisp.position.y;
    r.world.userData.animateAssets(12, r.camera, true);
    const rest = wisp.position.y;
    r.world.userData.animateAssets(19, r.camera, true);
    const stopped = rest === wisp.position.y && wind.strength.value === 0;
    const windMaterials = new Set();
    const depthMaterials = new Set();
    r.world.traverse(
      (o: { customDepthMaterial?: unknown; material?: unknown }) => {
        if (o.customDepthMaterial) {
          windMaterials.add(o.material);
          depthMaterials.add(o.customDepthMaterial);
        }
      },
    );
    let disposed = 0;
    for (const m of [...windMaterials, ...depthMaterials] as {
      addEventListener: (s: string, f: () => void) => void;
    }[])
      m.addEventListener('dispose', () => disposed++);
    r.dispose();
    return {
      moves,
      stopped,
      windMaterials: windMaterials.size,
      depthMaterials: depthMaterials.size,
      disposed,
    };
  });
  expect(state.moves).toBe(true);
  expect(state.stopped).toBe(true);
  expect(state.windMaterials).toBeGreaterThan(5);
  expect(state.disposed).toBe(state.windMaterials + state.depthMaterials);
  expect(errors).toEqual([]);
});
