import { test, expect, type Page } from '@playwright/test';
async function shot(page: Page, name: string, width: number) {
  await page.screenshot({
    animations: 'disabled',
    path: `docs/screens/${name}-${width}.png`,
  });
  const overflow = await page.locator('.panel').evaluateAll((nodes) =>
    nodes
      .filter((n) => {
        const r = n.getBoundingClientRect();
        return (
          r.width > 0 &&
          (r.left < 0 ||
            r.top < 0 ||
            r.right > innerWidth + 1 ||
            r.bottom > innerHeight + 1)
        );
      })
      .map((n) => n.className),
  );
  expect(overflow).toEqual([]);
  if (name === 'results') {
    const clipped = await page.locator('.results').evaluate((panel) => {
      const bounds = panel.getBoundingClientRect();
      return [...panel.querySelectorAll('tr, button, p')].some((node) => {
        const r = node.getBoundingClientRect();
        return (
          r.bottom > bounds.bottom ||
          r.right > bounds.right ||
          r.top < bounds.top
        );
      });
    });
    expect(clipped).toBe(false);
  }
}
async function enter(page: Page) {
  await page.goto('/legacy?bots=3&perf=1');
  await page.getByText('CLICK TO ENTER', { exact: false }).click();
}
for (const [width, height] of [
  [1600, 900],
  [1280, 720],
  [2560, 1440],
])
  test(`local game screens and two-window match at ${width}`, async ({
    browser,
    baseURL,
  }) => {
    const errors: string[] = [];
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto('/legacy?bots=3&perf=1');
    await shot(page, 'boot', width);
    await page.getByText('CLICK TO ENTER', { exact: false }).click();
    await page.waitForTimeout(1000);
    await expect(page.getByText('4 vs 1', { exact: true })).toBeVisible();
    await shot(page, 'menu', width);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await shot(page, 'settings', width);
    await page.getByLabel('Close settings').click();
    await page
      .getByRole('button', { name: 'CONNECT WALLET', exact: true })
      .click();
    await shot(page, 'wallet', width);
    await page
      .getByRole('button', { name: 'LOCAL TEST PROFILE', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'TEST PROFILE', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'LEADERBOARD', exact: true })
      .click();
    await shot(page, 'leaderboard', width);
    await page.getByRole('button', { name: '$SCREAM', exact: true }).click();
    await shot(page, 'token', width);
    await page.getByRole('button', { name: 'CHARACTERS', exact: true }).click();
    await shot(page, 'characters', width);
    await page.getByLabel('Player name').fill('Mara');
    await page.route('**/matchmake/create/match', async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });
    await page.getByRole('button', { name: 'STEP INSIDE' }).click();
    await shot(page, 'loading', width);
    await page
      .getByRole('button', { name: 'EVERYONE IN? START THE NIGHT' })
      .waitFor();
    await shot(page, 'queue', width);
    const code = (await page.locator('.room-code').textContent())!.trim();
    const killer = await browser.newPage({
      viewport: { width, height },
      baseURL,
    });
    killer.on('pageerror', (e) => errors.push(e.message));
    killer.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await enter(killer);
    await killer.getByRole('button', { name: 'ENTER THE FAIRGROUND' }).click();
    await killer
      .getByRole('button', { name: 'THE HOLLOW make sure nobody leaves.' })
      .click();
    await killer.getByLabel('Room code').fill(code);
    await killer.getByRole('button', { name: 'STEP INSIDE' }).click();
    await killer
      .getByRole('button', { name: 'EVERYONE IN? START THE NIGHT' })
      .waitFor();
    await page
      .getByRole('button', { name: 'EVERYONE IN? START THE NIGHT' })
      .click();
    await expect(page.locator('.hud.survivor')).toBeVisible({ timeout: 20000 });
    await expect(killer.locator('.hud.killer')).toBeVisible();
    await page.waitForTimeout(800);
    await shot(page, 'survivor', width);
    await shot(killer, 'killer', width);
    await page.reload();
    await expect(page.locator('.hud.survivor')).toBeVisible({ timeout: 20000 });
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(600);
    await page.keyboard.up('KeyW');
    await page.getByRole('button', { name: 'PAUSE' }).click();
    await shot(page, 'pause', width);
    await page.getByRole('button', { name: 'KEEP GOING' }).click();
    const watcher = await browser.newPage({
      viewport: { width, height },
      baseURL,
    });
    await enter(watcher);
    await watcher.getByRole('button', { name: /SPECTATE ·/ }).click();
    await watcher.waitForTimeout(10500);
    await shot(watcher, 'spectator', width);
    await watcher.getByRole('button', { name: 'BACK TO THE FIRE' }).click();
    await watcher.close();
    await killer.getByRole('button', { name: 'PAUSE' }).click();
    await killer.getByRole('button', { name: 'leave the fairground' }).click();
    await killer
      .getByRole('button', { name: 'LEAVE MATCH', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'THE NIGHT IS OVER.' }),
    ).toBeVisible();
    await shot(page, 'results', width);
    await page.getByRole('button', { name: 'BACK TO THE FIRE' }).click();
    expect(errors).toEqual([]);
    await killer.close();
    await context.close();
  });
