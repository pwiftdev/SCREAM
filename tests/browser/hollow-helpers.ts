import { expect, type Page } from '@playwright/test';
import { plotLocation } from '../../shared/house/neighborhood';
export async function menu(page: Page) {
  await page
    .getByRole('button', { name: 'PRESS ANY KEY', exact: true })
    .click();
  const name = page.getByLabel('YOUR USERNAME', { exact: true });
  await name.waitFor();
  if (!(await name.inputValue())) await name.fill('Night Wanderer');
  await page
    .getByRole('button', { name: 'JOIN THE WORLD', exact: true })
    .click();
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.night-hud-top')).toHaveText(
    /^[1-9]\d* ON THE STREET$/,
  );
}
export async function positionWorld(
  page: Page,
  x: number,
  z: number,
  yaw: number,
) {
  const token = await page.evaluate(() =>
    localStorage.getItem('hollow-session'),
  );
  await page.goto('about:blank');
  const response = await page.request.post('/__test/position', {
    headers: { 'x-test-key': process.env.SCREAM_TEST_KEY ?? '' },
    data: { token, x, z, yaw },
  });
  expect(response.ok(), await response.text()).toBe(true);
  await page.goto('/');
  await menu(page);
}
export async function atPlot(page: Page, slot: number) {
  const p = plotLocation(slot);
  await positionWorld(
    page,
    p.approach.x,
    p.approach.z,
    Math.atan2(Math.sin(p.yaw + Math.PI), Math.cos(p.yaw + Math.PI)),
  );
}
export async function clearVisit(page: Page) {
  await expect(page.locator('.hl-visit')).toBeVisible();
  const start = page.getByRole('button', { name: 'STEP INSIDE', exact: true });
  if (await start.isVisible()) await start.click();
  await page.keyboard.down('KeyE');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector('[aria-label="Stash search progress"]')
          ?.getAttribute('aria-valuenow'),
      ) > 0,
    undefined,
    { timeout: 15000 },
  );
  await page.keyboard.up('KeyW');
  await expect(
    page.getByRole('heading', { name: 'STASH FOUND', exact: true }),
  ).toBeVisible();
  await page.keyboard.up('KeyE');
  await page.keyboard.down('KeyS');
  await expect(
    page.getByRole('meter', { name: 'Health', exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await page.keyboard.up('KeyS');
}
export async function buildHome(page: Page, retryVerification = false) {
  await page.goto('/');
  await menu(page);
  const plots = await page.request.get('/api/hollow/plots');
  const occupied = ((await plots.json()) as { slot: number }[]).map(
    (p) => p.slot,
  );
  const slot = [3, 5, 7, 11, 13, 15, 19, 21, 23, 27, 29, 31, 35, 37, 39].find(
    (s) => !occupied.includes(s),
  )!;
  await atPlot(page, slot);
  await page.keyboard.press('KeyE');
  await expect(page.locator('.night-builder')).toBeVisible();
  await page.getByRole('button', { name: 'PALETTE', exact: true }).click();
  await page
    .getByRole('button', { name: 'HIDE AT THE BACK', exact: true })
    .click();
  await page.getByRole('button', { name: 'TEST RAID', exact: true }).click();
  await clearVisit(page);
  if (retryVerification) {
    await page
      .getByRole('button', { name: 'RETRY VERIFICATION', exact: true })
      .click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await expect(page.locator('.world-toast')).toContainText(
    'Your tested house is open',
    { timeout: 15000 },
  );
}
export async function openMenu(page: Page) {
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'RETURN TO THE WORLD', exact: true }),
  ).toBeVisible();
}
