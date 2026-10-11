import { expect, test } from '@playwright/test';
const address = '11111111111111111111111111111111';
async function openMainMenu(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'PRESS ANY KEY', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Main menu', exact: true }),
  ).toBeVisible();
}

test('cinematic menu gates spawning, saves pasted profile fields, opens settings and shows live street population', async ({
  page,
  browser,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openMainMenu(page);
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('complementary', { name: 'Live player count' }),
  ).toContainText('100 PLAYERS PER STREET');
  await page.getByLabel('YOUR USERNAME', { exact: true }).fill('Night Mara');
  await page
    .getByLabel('PUBLIC SOLANA WALLET', { exact: false })
    .fill('not an address');
  await page
    .getByRole('button', { name: 'JOIN THE WORLD', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('public address');
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel('PUBLIC SOLANA WALLET', { exact: false })
    .fill(` ${address} `);
  await page.getByRole('button', { name: 'SETTINGS', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused();
  await expect(page.locator('.night-main-menu')).toHaveAttribute('inert', '');
  await page.getByLabel('outdoor camera motion').fill('0');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByLabel('YOUR USERNAME', { exact: true })).toHaveValue(
    'Night Mara',
  );
  await page.screenshot({ path: 'docs/screens/main-menu-1920.png' });
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const control of [
    page.getByLabel('YOUR USERNAME', { exact: true }),
    page.getByLabel('PUBLIC SOLANA WALLET', { exact: false }),
    page.getByRole('button', { name: 'JOIN THE WORLD', exact: true }),
    page.getByRole('link', { name: /Follow @Scream_PF/ }),
  ])
    await expect(control).toBeInViewport();
  await page.screenshot({ path: 'docs/screens/main-menu-1280.png' });
  await page
    .getByRole('button', { name: 'JOIN THE WORLD', exact: true })
    .click();
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toBeVisible();
  const token = await page.evaluate(() =>
    localStorage.getItem('hollow-session'),
  );
  const profile = await page.request.get('/api/hollow/profile', {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(await profile.json()).toEqual({
    name: 'Night Mara',
    publicWallet: address,
  });
  const other = await browser.newContext({ baseURL });
  try {
    const visitor = await other.newPage();
    await openMainMenu(visitor);
    await expect(visitor.locator('.night-presence b')).toHaveText('1');
    await expect(
      visitor.getByRole('meter', { name: 'Health', exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'MAIN MENU', exact: true }).click();
    await expect(page.getByLabel('YOUR USERNAME', { exact: true })).toHaveValue(
      'Night Mara',
    );
    await expect(visitor.locator('.night-presence b')).toHaveText('0', {
      timeout: 15000,
    });
  } finally {
    await other.close();
  }
  await openMainMenu(page);
  await expect(page.getByLabel('YOUR USERNAME', { exact: true })).toHaveValue(
    'Night Mara',
  );
  await expect(
    page.getByLabel('PUBLIC SOLANA WALLET', { exact: false }),
  ).toHaveValue(address);
  expect(errors).toEqual([]);
});

test('failed counts stay unavailable and a failed profile save keeps the player in the menu for retry', async ({
  page,
}) => {
  await page.route('**/api/hollow/presence', (r) =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await openMainMenu(page);
  await expect(page.locator('.night-presence b')).toHaveText('—');
  await page
    .getByLabel('YOUR USERNAME', { exact: true })
    .fill('Night Wanderer');
  await page.route('**/api/hollow/profile', (r) =>
    r.request().method() === 'PUT'
      ? r.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Profile save unavailable' }),
        })
      : r.continue(),
  );
  await page
    .getByRole('button', { name: 'JOIN THE WORLD', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'Profile save unavailable',
  );
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel('YOUR USERNAME', { exact: true })).toHaveValue(
    'Night Wanderer',
  );
  await page.unroute('**/api/hollow/profile');
  await page
    .getByRole('button', { name: 'JOIN THE WORLD', exact: true })
    .click();
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toBeVisible();
});
