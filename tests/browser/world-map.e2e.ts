import { expect, test } from '@playwright/test';
import { menu, positionWorld } from './hollow-helpers';
test('the held parchment map shows actual terrain and closes with keyboard or button', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await menu(page);
  await positionWorld(page, 0, 260, Math.PI / 2);
  await page.keyboard.press('KeyM');
  const map = page.getByRole('dialog', { name: 'THE NEIGHBORHOOD' });
  await expect(map).toBeVisible();
  await expect(map.getByRole('button', { name: 'Close map' })).toBeFocused();
  await expect(map.locator('.paper-map-player')).toHaveAttribute(
    'transform',
    /translate\(0 260\) rotate\(-90\)/,
  );
  await expect(map.locator('image')).toHaveAttribute(
    'href',
    /^data:image\/png;base64,/,
  );
  await expect(map.locator('g > title')).toHaveCount(53);
  await page.keyboard.press('Tab');
  await expect(map.getByRole('button', { name: 'Close map' })).toBeFocused();
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(350);
  await page.keyboard.up('KeyW');
  await expect(map.locator('.paper-map-player')).toHaveAttribute(
    'transform',
    /translate\(0 260\)/,
  );
  for (const [width, height] of [
    [1920, 1080],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `docs/screens/parchment-map-${width}.png` });
    const bounds = await map.locator('.held-map-sheet').boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThan(height);
  }
  await page.keyboard.press('Escape');
  await expect(map).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Slot 1: Lantern' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Digit4');
  await expect(map).toBeVisible();
  await page.getByRole('button', { name: 'Close map' }).click();
  await expect(map).toHaveCount(0);
  await page.keyboard.press('KeyM');
  await expect(map).toBeVisible();
  await page.keyboard.press('KeyM');
  await expect(map).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the held map reuses the paper artwork and releases its private GPU texture', async ({
  page,
}) => {
  await page.goto('/health');
  await page.setContent(
    '<div id="map-preview" style="width:960px;height:540px"></div>',
  );
  const result = await page.evaluate(async () => {
    const { loadAssetPack, assetModel } = await import(
      String('/src/game/rework/asset-pack.ts')
    );
    const { HollowRenderer } = await import(
      String('/src/game/hollow/renderer.ts')
    );
    const { paperMapCanvas, paperMapImage } = await import(
      String('/src/game/rework/paper-map.ts')
    );
    const { assetIcon } = await import(
      String('/src/game/rework/asset-icons.ts')
    );
    await loadAssetPack();
    let sharedDisposals = 0;
    assetModel('item_map').traverse(
      (o: {
        isMesh: boolean;
        geometry: { addEventListener: (name: string, fn: () => void) => void };
      }) => {
        if (o.isMesh)
          o.geometry.addEventListener('dispose', () => sharedDisposals++);
      },
    );
    const r = new HollowRenderer(document.querySelector('#map-preview'));
    r.selectItem(4);
    const held = r.held.getObjectByName('item_map');
    const surface = held.children.find(
      (o: { material?: { map?: { image: unknown } } }) =>
        o.material?.map?.image === paperMapCanvas(),
    );
    const texture = surface.material.map;
    let disposed = 0;
    texture.addEventListener('dispose', () => disposed++);
    const cached = paperMapCanvas() === paperMapCanvas();
    const iconMatches = assetIcon('item_map') === paperMapImage();
    const pixels = paperMapCanvas()
      .getContext('2d')
      .getImageData(0, 0, 192, 256).data;
    const opaque = pixels.every(
      (n: number, i: number) => i % 4 !== 3 || n === 255,
    );
    r.draw(1);
    r.dispose();
    return {
      disposed,
      sharedDisposals,
      cached,
      iconMatches,
      opaque,
      canvases: document.querySelectorAll('canvas').length,
    };
  });
  expect(result).toEqual({
    disposed: 1,
    sharedDisposals: 0,
    cached: true,
    iconMatches: true,
    opaque: true,
    canvases: 0,
  });
});
