import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('CONSOLE', m.text());
});
await page.goto('http://127.0.0.1:5173/?perf=1');
await page.getByText('CLICK TO ENTER', { exact: false }).click();
await page.waitForTimeout(2500);
await page.screenshot({ path: 'docs/screens/menu-1600.png' });
await page.getByRole('button', { name: 'ENTER THE FAIRGROUND' }).click();
await page.screenshot({ path: 'docs/screens/characters-1600.png' });
await page.getByRole('button', { name: 'STEP INSIDE' }).click();
await page
  .getByRole('button', { name: 'EVERYONE IN? START THE NIGHT' })
  .waitFor();
await page.screenshot({ path: 'docs/screens/queue-1600.png' });
await page
  .getByRole('button', { name: 'EVERYONE IN? START THE NIGHT' })
  .click();
await page.getByText('GENERATORS').first().waitFor();
await page.waitForTimeout(1500);
await page.screenshot({ path: 'docs/screens/survivor-1600.png' });
console.log(await page.locator('.perf').textContent());
await browser.close();
