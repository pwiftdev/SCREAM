import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({
  headless: process.platform !== 'darwin',
});
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173');
  const images = await page.evaluate(async () => {
    const module = await import('/scripts/portrait-scene.ts');
    return module.portraits();
  });
  mkdirSync('public/assets/portraits', { recursive: true });
  images.forEach((data, i) =>
    writeFileSync(
      `public/assets/portraits/${i}.png`,
      Buffer.from(data.split(',')[1], 'base64'),
    ),
  );
} finally {
  await browser.close();
}
