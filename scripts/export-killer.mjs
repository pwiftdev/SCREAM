import { chromium } from '@playwright/test';
import { writeFileSync, readFileSync } from 'node:fs';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  prune,
  weld,
  meshopt,
  textureCompress,
  simplify,
} from '@gltf-transform/functions';
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from 'meshoptimizer';
await sharp('.asset-work/killer/source/Textures/SkinMaskBW.jpg')
  .linear(0.35, 97)
  .webp({ quality: 94 })
  .toFile('.asset-work/killer/source/Textures/roughness.webp');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route('**/asset-export', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Local model conversion</title>',
    }),
  );
  await page.goto('http://127.0.0.1:5173/asset-export');
  const data = await page.evaluate(async () => {
    const { exportKiller } = await import('/scripts/killer-scene.ts');
    const buffer = await exportKiller();
    const bytes = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < bytes.length; i += 32768)
      result += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(result);
  });
  writeFileSync(
    '.asset-work/killer/converted.glb',
    Buffer.from(data, 'base64'),
  );
} finally {
  await browser.close();
}
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });
const document = await io.read('.asset-work/killer/converted.glb');
await document.transform(
  prune(),
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.8, error: 0.002 }),
  textureCompress({
    encoder: sharp,
    targetFormat: 'webp',
    resize: [2048, 2048],
    quality: 94,
  }),
  meshopt({ encoder: MeshoptEncoder, level: 'high' }),
);
await io.write('public/assets/characters/5.glb', document);
console.log(
  'Exported the sculpted Hollow:',
  readFileSync('public/assets/characters/5.glb').length,
  'bytes',
);
