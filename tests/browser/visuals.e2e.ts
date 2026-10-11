import { test, expect } from '@playwright/test';
import type * as Three from 'three';
test('all graphics presets render and the creature rig stays grounded through its gameplay clips', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.route('**/__render-check', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><div id="view" style="width:960px;height:540px"></div>',
    }),
  );
  await page.goto('/__render-check');
  const result = await page.evaluate(async () => {
    const rendererPath = '/src/game/renderer.ts',
      assetPath = '/src/game/assets.ts',
      threePath = '/node_modules/three/build/three.module.js';
    const { GameRenderer } = await import(rendererPath),
      { loadedCharacter, streamCharacters } = await import(assetPath);
    const THREE = (await import(threePath)) as typeof import('three');
    const game = new GameRenderer(document.getElementById('view'), {
      quality: 'High',
      fov: 65,
      reducedMotion: true,
      flashReduction: true,
    });
    await game.ready;
    cancelAnimationFrame(game.handle);
    try {
      for (const quality of ['Low', 'Medium', 'High', 'Ultra']) {
        game.configure({
          quality,
          fov: 65,
          reducedMotion: true,
          flashReduction: true,
        });
        if (quality === 'Low') game.renderer.render(game.scene, game.camera);
        else game.composer.render();
      }
      await streamCharacters();
      const character = loadedCharacter(5) as {
        root: Three.Group;
        clips: Three.AnimationClip[];
      };
      const mixer = new THREE.AnimationMixer(character.root),
        bounds: number[][] = [];
      for (const name of [
        'idle',
        'run',
        'attack',
        'pallet_break',
        'stun',
        'vault_fast',
      ]) {
        mixer.stopAllAction();
        const clip = character.clips.find((c) => c.name === name)!;
        mixer.clipAction(clip).reset().play();
        for (let frame = 0; frame < 12; frame++) {
          mixer.update(clip.duration / 12);
          character.root.updateMatrixWorld(true);
          character.root.traverse((node) => {
            if ((node as Three.SkinnedMesh).isSkinnedMesh)
              (node as Three.SkinnedMesh).computeBoundingBox();
          });
          const box = new THREE.Box3().setFromObject(character.root);
          bounds.push([...box.min.toArray(), ...box.max.toArray()]);
        }
      }
      character.root.traverse((node) => {
        if ((node as Three.SkinnedMesh).isSkinnedMesh)
          (node as Three.SkinnedMesh).skeleton.dispose();
      });
      return { ready: game.renderer.domElement.dataset.ready, bounds };
    } finally {
      game.dispose();
    }
  });
  expect(result.ready).toBe('true');
  expect(errors).toEqual([]);
  for (const [minX, minY, minZ, maxX, maxY, maxZ] of result.bounds) {
    expect([minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)).toBe(
      true,
    );
    expect(minY).toBeGreaterThan(-0.35);
    expect(minY).toBeLessThan(0.5);
    expect(maxY).toBeGreaterThan(1.5);
    expect(maxY).toBeLessThan(3.5);
    expect(
      Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minZ), Math.abs(maxZ)),
    ).toBeLessThan(3);
  }
});
test('a missing scenery asset blocks entry and shows a recoverable load error', async ({
  page,
}) => {
  await page.route('**/assets/environment/wild_rooibos_bush.glb', (route) =>
    route.fulfill({ status: 503, body: 'Asset unavailable' }),
  );
  await page.goto('/legacy');
  await expect(page.getByText(/3D assets could not load:/)).toBeVisible();
  await expect(page.locator('button.boot')).toBeDisabled();
});

test('every character and every exported animation stays finite and bounded through transitions', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/__animation-check', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><div id="view" style="width:960px;height:540px"></div>',
    }),
  );
  await page.goto('/__animation-check');
  const results = await page.evaluate(async () => {
    const assetsPath = '/src/game/assets.ts',
      charactersPath = '/src/game/characters.ts',
      threePath = '/node_modules/three/build/three.module.js';
    const { streamCharacters, loadedCharacter } = await import(assetsPath),
      { rig, disposeCharacter } = await import(charactersPath);
    const THREE = (await import(threePath)) as typeof import('three');
    await streamCharacters();
    const results: { index: number; clip: string; bounds: number[] }[] = [];
    for (let index = 0; index < 6; index++) {
      const loaded = loadedCharacter(index) as {
        root: Three.Group;
        clips: Three.AnimationClip[];
      };
      const actor = rig(loaded.root, loaded.clips);
      let time = 0;
      for (const clip of loaded.clips) {
        for (
          let frame = 0;
          frame < Math.ceil((clip.duration + 0.3) * 30);
          frame++
        ) {
          actor.animate((time += 1 / 30), 3, 'healthy', clip.name);
          if (frame % 10) continue;
          actor.root.updateMatrixWorld(true);
          actor.root.traverse((node: Three.Object3D) => {
            if ((node as Three.SkinnedMesh).isSkinnedMesh)
              (node as Three.SkinnedMesh).computeBoundingBox();
          });
          const box = new THREE.Box3().setFromObject(actor.root);
          results.push({
            index,
            clip: clip.name,
            bounds: [...box.min.toArray(), ...box.max.toArray()],
          });
        }
      }
      disposeCharacter(actor);
    }
    return results;
  });
  expect(errors).toEqual([]);
  expect(new Set(results.map((result) => result.index)).size).toBe(6);
  for (const { index, clip, bounds } of results) {
    const label = `character ${index}, ${clip}: ${bounds}`;
    expect(bounds.every(Number.isFinite), label).toBe(true);
    expect(bounds[1], label).toBeGreaterThan(-0.5);
    expect(bounds[4], label).toBeGreaterThan(0.15);
    expect(bounds[4], label).toBeLessThan(3.8);
    expect(
      Math.max(...[bounds[0], bounds[2], bounds[3], bounds[5]].map(Math.abs)),
      label,
    ).toBeLessThan(3.5);
  }
});
