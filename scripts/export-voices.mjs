import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173');
  const files = await page.evaluate(async () => {
    const module = await import('/scripts/voice-scene.ts');
    return module.voices();
  });
  mkdirSync('public/audio/voices', { recursive: true });
  for (const file of files)
    writeFileSync(
      `public/audio/voices/${file.name}`,
      Buffer.from(file.data, 'base64'),
    );
} finally {
  await browser.close();
}
