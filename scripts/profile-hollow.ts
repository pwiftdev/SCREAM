import { plotLocation } from '../shared/house/neighborhood';
import { menu } from '../tests/browser/hollow-helpers';
import { chromium, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createGameServer } from '../server/app';
const app = await createGameServer({ port: 2568 });
const browser = await chromium.launch({
  headless: process.env.CI === '1' || process.platform !== 'darwin',
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
async function sample(page: Page) {
  return page.evaluate<{
    frames: number;
    fps: number;
    p95Ms: number;
  }>(`new Promise(resolve => {
    const times = []; let last = 0, start = 0;
    function frame(now) {
      if (!start) start = now;
      if (last) times.push(now - last);
      last = now;
      if (now - start < 5000) requestAnimationFrame(frame);
      else {
        const sorted = [...times].sort((a,b) => a-b);
        resolve({ frames: times.length, fps: times.length * 1000 / (now-start), p95Ms: sorted[Math.floor(sorted.length * 0.95)] });
      }
    }
    requestAnimationFrame(frame);
  })`);
}
try {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    baseURL: 'http://127.0.0.1:2568',
  });
  await page.addInitScript(() => performance.setResourceTimingBufferSize(3000));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await menu(page);
  const identity = await app.hollow.identity(
    (await page.evaluate(() => localStorage.getItem('hollow-session')))!,
  );
  const life = app.outdoor.get(identity).life;
  await page
    .locator('.night-hud-top small')
    .filter({ hasText: '1 ON THE STREET' })
    .waitFor();
  await page.waitForTimeout(1500);
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .reduce((n, e) => n + (e as PerformanceResourceTiming).transferSize, 0),
  );
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector('canvas')!.getContext('webgl2')!;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  const world: Record<string, Awaited<ReturnType<typeof sample>>> = {};
  await page.goto('about:blank');
  Object.assign(life, { x: 0, z: -65, yaw: Math.PI });
  await page.goto('/');
  await menu(page);
  world.gate = await sample(page);
  for (const [width, height] of [
    [1920, 1080],
    [1280, 720],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `docs/screens/rework-world-${width}.png` });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  for (const [name, x, z] of [
    ['cemetery', -100, 175],
    ['carnival', 100, 175],
    ['chapel', 100, 365],
    ['harvest', -100, 365],
    ['asylum', 156, 269],
    ['ridge', -145, 263],
    ['hills', -69, 265],
    ['watcher', -20, 264],
    ['forest-camp', -55, 266],
    ['wetland', 172, 432],
    ['forest-cabin', -165, 101],
  ] as const) {
    await page.goto('about:blank');
    Object.assign(life, { x, z, yaw: Math.PI });
    await page.goto('/');
    await menu(page);
    await page.waitForTimeout(1000);
    world[name] = await sample(page);
    await page.screenshot({ path: `docs/screens/rework-${name}-1920.png` });
  }
  await page.goto('about:blank');
  const doorway = plotLocation(0);
  Object.assign(life, doorway.approach, {
    yaw: doorway.yaw - Math.PI,
    attackAt: 0,
  });
  await page.goto('/');
  await menu(page);
  const entered = performance.now();
  await page.keyboard.press('KeyE');
  await page.locator('.hl-visit').waitFor();
  const houseReadyMs = performance.now() - entered;
  const house = await sample(page);
  const report = {
    viewport: [1920, 1080],
    gpu,
    productionAssets: true,
    headless: process.env.CI === '1' || process.platform !== 'darwin',
    firstLoadTransferBytes: resources,
    resourceTimingBufferSize: 3000,
    houseReadyMs,
    world,
    house,
    errors,
    scope:
      'One native Chromium renderer on this local machine. Not a midrange-device or internet-latency certification.',
  };
  if (errors.length || resources > 15000000 || houseReadyMs > 2000)
    throw new Error(JSON.stringify(report));
  await writeFile(
    'docs/hollow-performance.json',
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  await app.server.gracefullyShutdown(false);
}
