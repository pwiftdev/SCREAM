import { expect, test } from '@playwright/test';
import {
  menu,
  atPlot,
  buildHome,
  openMenu,
  positionWorld,
} from './hollow-helpers';
test('new players enter a dark world without a plot and claim, build and publish in place', async ({
  page,
}) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await menu(page);
  await expect(page.locator('.night-plots')).toHaveCount(0);
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toHaveAttribute('aria-valuenow', '100');
  await page.screenshot({ path: 'docs/screens/open-world-arrival.png' });
  await openMenu(page);
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  await page.getByLabel('outdoor camera motion').fill('0');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .getByRole('button', { name: 'RETURN TO THE WORLD', exact: true })
    .click();
  let lostAcknowledgement = false;
  await page.route('**/api/hollow/finish', async (route) => {
    if (lostAcknowledgement) return route.continue();
    lostAcknowledgement = true;
    const committed = await route.fetch();
    expect(committed.ok()).toBe(true);
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Verification acknowledgement lost' }),
    });
  });
  await buildHome(page, true);
  await page.screenshot({ path: 'docs/screens/open-world-built.png' });
  const token = await page.evaluate(() =>
    localStorage.getItem('hollow-session'),
  );
  const mine = await (
    await page.request.get('/api/hollow/mine', {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  await atPlot(page, mine.plot.slot);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.in-world-build')).toBeVisible();
  await expect(page.locator('.night-build-palette')).toBeHidden();
  await page.screenshot({ path: 'docs/screens/open-world-building.png' });
  await page
    .getByRole('button', { name: 'SAVE & RETURN TO WORLD', exact: true })
    .click();
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('a player without a house can raid public houses and return to the same doorstep', async ({
  page,
}) => {
  await page.goto('/');
  await menu(page);
  await atPlot(page, 0);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.hl-visit')).toBeVisible();
  await expect(page.locator('.hl-visit .hl-scrim')).toBeHidden();
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', { name: 'BACK TO THE STREET', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'E ENTER HAUNTED HOUSE' }),
  ).toBeVisible();
  await expect(page.locator('.night-plots')).toHaveCount(0);
});
test('weapons have real multiplayer hits, kills, death delay and distant respawn', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(150000);
  const ca = await browser.newContext({ baseURL }),
    cb = await browser.newContext({ baseURL });
  const a = await ca.newPage(),
    b = await cb.newPage();
  try {
    await a.goto('/');
    await menu(a);
    await b.goto('/');
    await menu(b);
    await positionWorld(b, 0, 258, Math.PI);
    await positionWorld(a, 0, 260, 0);
    await a.bringToFront();
    await a.keyboard.press('Digit2');
    for (let i = 0; i < 4; i++) {
      await a
        .locator('.hollow-canvas')
        .click({ position: { x: 300, y: 260 }, force: true });
      await a.waitForTimeout(750);
    }
    await expect(
      b.getByRole('meter', { name: 'Health', exact: true }),
    ).toHaveAttribute('aria-valuenow', '0', { timeout: 5000 });
    await expect(a.locator('.world-vitals')).toContainText('1 KILLS');
    await b.screenshot({ path: 'docs/screens/open-world-death.png' });
    await expect(
      b.getByRole('meter', { name: 'Health', exact: true }),
    ).toHaveAttribute('aria-valuenow', '100', { timeout: 12000 });
    await a.screenshot({ path: 'docs/screens/open-world-combat.png' });
  } finally {
    await ca.close();
    await cb.close();
  }
});
test('the shovel is collected in the world and plot claims reject a distant request', async ({
  page,
}) => {
  await page.goto('/');
  await menu(page);
  const token = await page.evaluate(() =>
    localStorage.getItem('hollow-session'),
  );
  const response = await page.request.post('/api/hollow/plots', {
    headers: { Authorization: `Bearer ${token}` },
    data: { slot: 39, style: 0 },
  });
  expect(response.status()).toBe(400);
  await positionWorld(page, 0, 28, 0);
  await page.keyboard.press('KeyE');
  await expect(
    page.getByRole('button', { name: /Slot 3: Grave shovel/ }),
  ).toBeVisible();
  await expect(page.locator('.hl-world-notice')).toContainText(
    'Grave shovel equipped',
  );
  await page.keyboard.press('Digit3');
  await page.screenshot({ path: 'docs/screens/open-world-shovel.png' });
});
