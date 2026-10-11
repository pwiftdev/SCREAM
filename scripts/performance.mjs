import { chromium } from '@playwright/test';
const quality = process.argv[2] ?? 'Medium';
if (!['Low', 'Medium', 'High', 'Ultra'].includes(quality))
  throw new Error('Unknown graphics preset');
const browser = await chromium.launch({
  headless: false,
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
  });
  await page.addInitScript(
    (q) =>
      localStorage.setItem('scream.settings', JSON.stringify({ quality: q })),
    quality,
  );
  await page.goto('http://127.0.0.1:5173/?perf=1');
  await page.getByText('CLICK TO ENTER', { exact: false }).click();
  await page.getByRole('button', { name: 'ENTER THE FAIRGROUND' }).click();
  await page
    .getByRole('button', { name: 'THE HOLLOW make sure nobody leaves.' })
    .click();
  await page.getByRole('button', { name: 'STEP INSIDE' }).click();
  await page
    .getByRole('button', { name: 'EVERYONE IN? START THE NIGHT' })
    .click();
  await page.locator('.hud.killer').waitFor();
  await page.waitForTimeout(8000);
  const samples = [];
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1000);
    if (!(await page.locator('.hud.killer').isVisible()))
      throw new Error('Match ended during sampling');
    samples.push(await page.locator('.perf').textContent());
  }
  const gpu = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl2');
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return extension
      ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
      : 'unknown';
  });
  console.log(
    JSON.stringify({ quality, gpu, viewport: '1600x900', samples }, null, 2),
  );
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'leave the fairground', exact: true })
    .click();
  await page.getByRole('button', { name: 'LEAVE MATCH', exact: true }).click();
} finally {
  await browser.close();
}
