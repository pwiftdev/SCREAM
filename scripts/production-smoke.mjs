import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const baseURL = process.env.SCREAM_TEST_BASE_URL ?? 'http://127.0.0.1:2568';
const browser = await chromium.launch({
  headless: process.platform !== 'darwin',
  args: process.platform === 'darwin' ? ['--use-angle=metal'] : [],
});
try {
  const first = await browser.newContext({
    baseURL,
    viewport: { width: 1600, height: 900 },
  });
  const second = await browser.newContext({ baseURL });
  const page = await first.newPage(),
    other = await second.newPage();
  const errors = [];
  for (const p of [page, other])
    p.on('pageerror', (e) => errors.push(e.message));
  const health = await page.request.get('/health');
  if (!health.ok() || (await health.json()).rewards !== 'off')
    throw new Error('Server is not ready with rewards off');
  const config = await (await page.request.get('/api/config')).json();
  if (!config.local && !config.guestProfiles)
    throw new Error('Free guest entry is disabled');
  async function enter(p) {
    await p.goto('/');
    await p
      .getByRole('button', { name: 'PRESS ANY KEY', exact: true })
      .click({ timeout: 90000 });
    await expect(
      p.getByRole('meter', { name: 'Health', exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(p.locator('.night-hud-top')).toHaveText(
      /^[1-9]\d* ON THE STREET$/,
    );
  }
  async function ownHouse() {
    const token = await page.evaluate(() =>
      localStorage.getItem('hollow-session'),
    );
    const response = await page.request.get('/api/hollow/mine', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.ok()).toBe(true);
    return (await response.json()).code;
  }
  await enter(page);
  const house = await ownHouse();
  await enter(other);
  await expect(page.locator('.night-hud-top')).toHaveText(
    /^(?:[2-9]|\d{2,}) ON THE STREET$/,
  );
  await page.keyboard.press('KeyM');
  await expect(
    page.getByRole('dialog', { name: 'THE NEIGHBORHOOD' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'THE NEIGHBORHOOD' }),
  ).toHaveCount(0);
  await page.screenshot({ path: 'docs/screens/production-street.png' });
  expect(errors).toEqual([]);
  await other.close();
  await page.goto('about:blank');
  if (process.env.SCREAM_SMOKE_RESTART_APP) {
    execFileSync(
      'heroku',
      ['ps:restart', '--app', process.env.SCREAM_SMOKE_RESTART_APP],
      { stdio: 'inherit' },
    );
    await expect
      .poll(
        async () => {
          try {
            return (await page.request.get(`${baseURL}/health`)).status();
          } catch {
            return 0;
          }
        },
        { timeout: 90000, intervals: [2000] },
      )
      .toBe(200);
  }
  await enter(page);
  expect(await ownHouse()).toBe(house);
  console.log({
    status:
      'Two browser players, map, compact HUD and persisted guest session verified',
    baseURL,
    restarted: !!process.env.SCREAM_SMOKE_RESTART_APP,
  });
} finally {
  await browser.close();
}
