import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  headless: process.platform !== 'darwin',
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
const views = [
  ['house', [-8, 1.7, -15], [-13, 3, -25]],
  ['inside', [-10, 1.7, -22], [-16, 1.8, -28]],
  ['balcony', [-8, 5, -27], [-15, 3.8, -22]],
  ['midway', [-20, 1.7, 10], [-27, 2, 3]],
  ['carousel', [10, 2, -22], [0, 2, 0]],
  ['north-gate', [0, 1.8, -33], [0, 2, -43]],
  ['south-gate', [0, 1.8, 33], [0, 2, 43]],
  ['east-chase', [35, 1.7, 22], [24, 2, 26]],
  ['west-boundary', [-35, 1.7, 24], [-43, 2, 12]],
  ['overview', [0, 72, 44], [0, 0, 0]],
];
try {
  const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
    }),
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/__visual-tour', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><body style="margin:0"><div id="view" style="width:100vw;height:100vh"></div></body>',
    }),
  );
  await page.goto('http://127.0.0.1:5173/__visual-tour');
  await page.evaluate(async () => {
    const { GameRenderer } = await import('/src/game/renderer.ts');
    const game = new GameRenderer(document.getElementById('view'), {
      quality: 'High',
      fov: 65,
      reducedMotion: true,
      flashReduction: true,
    });
    await game.ready;
    cancelAnimationFrame(game.handle);
    window.tour = game;
    game.menuFocus.enabled = false;
    game.menuCharacters.forEach(
      (character) => (character.root.visible = false),
    );
    game.art.update(20, true);
    game.atmosphere(20);
  });
  for (const quality of ['Low', 'Medium', 'High', 'Ultra']) {
    await page.evaluate(
      (quality) =>
        window.tour.configure({
          quality,
          fov: 65,
          reducedMotion: true,
          flashReduction: true,
        }),
      quality,
    );
    for (const [name, position, target] of views) {
      await page.evaluate(
        ({ position, target, quality }) => {
          const game = window.tour;
          game.camera.position.set(...position);
          game.camera.lookAt(...target);
          game.lighting.update(game.camera, 20, true, false);
          if (quality === 'Low') game.renderer.render(game.scene, game.camera);
          else game.composer.render();
        },
        { position, target, quality },
      );
      await page.screenshot({
        path: `docs/screens/lighting-${quality.toLowerCase()}-${name}.png`,
      });
    }
  }
  await page.evaluate(() => window.tour.dispose());
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    'Rendered 10 viewpoints at all four presets without browser errors.',
  );
} finally {
  await browser.close();
}
