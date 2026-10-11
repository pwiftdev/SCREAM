import { test, expect } from '@playwright/test';
for (const [pack, path] of [
  ['original', '**/assets/scream/assets/monsters/mon_wraith.glb'],
  ['forest', '**/assets/scream-forest/assets/trees/tre_ancient_watcher.glb'],
]) {
  test(`a missing ${pack} model blocks entry and retry recovers the complete world`, async ({
    page,
  }) => {
    await page.route(path, (route) => route.abort());
    await page.goto('/');
    await expect(page.getByRole('alert')).toContainText(
      'Some world assets could not load',
    );
    await expect(
      page.getByRole('button', { name: 'PRESS ANY KEY', exact: true }),
    ).toHaveCount(0);
    await page.unroute(path);
    await page
      .getByRole('button', { name: 'RETRY LOADING', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'PRESS ANY KEY', exact: true }),
    ).toBeVisible({ timeout: 30000 });
  });
}
test('all supplied models render in their game roles with independent joints and safe shared resources', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader|WebGL|THREE/.test(message.text()))
      errors.push(message.text());
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await page
    .getByRole('button', { name: 'PRESS ANY KEY', exact: true })
    .waitFor();
  const result = await page.evaluate<{
    missing: string[];
    independent: boolean;
    disposedShared: number;
    slots: string[][];
    calls: number;
    farHidden: number;
    badTextures: number;
    transparent: boolean;
    doorHeight: number;
    dynamics: boolean[];
    packMaterialsIsolated: boolean;
    sceneryVisible: boolean;
  }>(`(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { loadAssetPack, assetModel, assetPixels } = await import('/src/game/rework/asset-pack.ts');
    const { ASSET_CATALOG } = await import('/src/game/rework/asset-catalog.ts');
    const { packActor } = await import('/src/game/rework/asset-actors.ts');
    const { HollowRenderer } = await import('/src/game/hollow/renderer.ts');
    const { streetScene } = await import('/src/game/hollow/street.ts');
    const { disposeGroup } = await import('/src/game/hollow/dispose.ts');
    const { stashLoot } = await import('/src/game/rework/stash-loot.ts');
    await loadAssetPack();
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000';
    document.body.append(host);
    const r = new HollowRenderer(host);
    streetScene(r);
    r.scene.fog.density = 0.035;
    const {terrainHeight} = await import('/shared/house/terrain.ts');
    r.camera.position.set(-98, terrainHeight(-98,165) + 1.65, 165);
    r.camera.lookAt(-106, terrainHeight(-106,191) + 1.65, 191);
    const player = packActor('char_player'), rival = packActor('char_rival');
    r.world.add(player.root, rival.root, stashLoot(1, 0, 1));
    player.root.position.set(-97, terrainHeight(-97,168), 168);
    rival.root.position.set(-99, terrainHeight(-99,170), 170);
    const names = new Set();
    r.scene.traverse(o => names.add(o.name));
    const missing = Object.keys(ASSET_CATALOG).filter(id => !names.has(id));
    const a = packActor('char_player'), b = packActor('char_player');
    const before = b.root.getObjectByName('pivot_armL').rotation.x;
    for (let i = 0; i < 120; i++) a.animate(i / 60, true);
    const independent = b.root.getObjectByName('pivot_armL').rotation.x === before && a.root.getObjectByName('pivot_armL').rotation.x !== before;
    let disposedShared = 0;
    b.root.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.addEventListener('dispose', () => disposedShared++);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) m.addEventListener('dispose', () => disposedShared++);
    });
    disposeGroup(a.root);
    const slots = [];
    for (let i = 0; i < 9; i++) {
      r.selectItem(i);
      const visible = [];
      r.held.traverseVisible(o => { if (o.name.startsWith('item_') && o.name !== 'item_viewmodel_arm') visible.push(o.name); });
      slots.push([...new Set(visible)]);
    }
    r.selectItem(0);
    r.updateAtmosphere(2);
    r.gl.render(r.scene, r.camera);
    const calls = r.gl.info.render.calls;
    const farHidden = r.world.children.filter(o => o.userData.assetBatch && !o.visible).length;
    let badTextures = 0;
    for (const id of Object.keys(ASSET_CATALOG)) {
      assetModel(id).traverse(o => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          for (const t of [m.map, m.emissiveMap]) if (t && (t.magFilter !== T.NearestFilter || t.generateMipmaps)) badTextures++;
        }
      });
    }
    const transparent = assetPixels('web').color.getContext('2d').getImageData(0,0,16,16).data.some((v,i) => i % 4 === 3 && v === 0);
    const { meshHouse } = await import('/src/game/hollow/mesher.ts');
    const { starterHouse } = await import('/shared/house/plots.ts');
    const { index } = await import('/shared/house/format.ts');
    const house = starterHouse(0, 0);
    house.blocks.fill(0);
    for (let y = 1; y <= 3; y++) house.blocks[index(5, y, 5)] = 15;
    const doors = meshHouse(house, r.atlas.material);
    doors.updateMatrixWorld(true);
    const doorBounds = new T.Box3();
    doors.traverse(o => { if (o.name === 'blk_door') doorBounds.union(new T.Box3().setFromObject(o)); });
    const doorHeight = doorBounds.max.y - doorBounds.min.y;
    disposeGroup(doors, r.atlas.material);
    const {SCENERY_PROPS} = await import('/shared/house/neighborhood.ts');
    const matrix = new T.Matrix4(), position = new T.Vector3();
    const sceneryVisible = SCENERY_PROPS.every(p => r.world.children.some(o => {
      if (!o.isInstancedMesh || o.name !== p.asset) return false;
      for (let i=0;i<o.count;i++) {
        o.getMatrixAt(i,matrix); position.setFromMatrixPosition(matrix);
        if (Math.abs(position.x-p.x)<0.001 && Math.abs(position.z-p.z)<0.001 && Math.abs(position.y-terrainHeight(p.x,p.z))<0.001) return true;
      }
      return false;
    }));
    const dynamics = [];
    for (const [id, jointName, axis] of [['car_ferris_wheel','pivot_wheel','z'], ['car_carousel','pivot_spin','y'], ['bld_windmill_broken','pivot_sails','z'], ['hp_rocking_chair','pivot_rock','x'], ['rem_gibbet','pivot_cage','z']]) {
      const root = r.world.getObjectByName(id), joint = root.getObjectByName(jointName);
      r.camera.position.copy(root.position).add(new T.Vector3(0,2,-8));
      r.world.userData.animateAssets(0, r.camera, true);
      const rest = joint.rotation[axis];
      r.world.userData.animateAssets(5, r.camera, false);
      const moved = joint.rotation[axis] !== rest;
      r.world.userData.animateAssets(7, r.camera, true);
      dynamics.push(moved && joint.rotation[axis] === rest);
    }
    const material = id => {
      let found;
      assetModel(id).traverse(o => { if(o.isMesh) for(const m of Array.isArray(o.material) ? o.material : [o.material]) if(m.name === 'm_bone') found = m; });
      return found;
    };
    const oldBone = material('blk_bone'), newBone = material('rem_skull');
    const packMaterialsIsolated = !!oldBone && !!newBone && oldBone !== newBone && oldBone.map !== newBone.map;
    r.camera.position.set(-98, terrainHeight(-98,165) + 1.65, 165);
    r.camera.lookAt(-106, terrainHeight(-106,191) + 1.65, 191);
    r.draw(8);
    window.packRenderer = r;
    return { missing, independent, disposedShared, slots, calls, farHidden, badTextures, transparent, doorHeight, dynamics, packMaterialsIsolated, sceneryVisible };
  })()`);
  expect(result.missing).toEqual([]);
  expect(result.dynamics).toEqual([true, true, true, true, true]);
  expect(result.packMaterialsIsolated).toBe(true);
  expect(result.sceneryVisible).toBe(true);
  expect(result.independent).toBe(true);
  expect(result.doorHeight).toBeCloseTo(3, 1);
  expect(result.disposedShared).toBe(0);
  expect(result.badTextures).toBe(0);
  expect(result.transparent).toBe(true);
  expect(result.farHidden).toBeGreaterThan(0);
  expect(result.calls).toBeLessThan(900);
  expect(result.slots.slice(0, 6)).toEqual([
    ['item_lantern'],
    ['item_lockpick'],
    ['item_firecracker'],
    ['item_smoke_bomb'],
    ['item_map'],
    ['item_candy_corn'],
  ]);
  expect(result.slots.slice(6)).toEqual([
    ['item_crowbar'],
    ['item_shovel'],
    [],
  ]);
  await page.screenshot({ path: 'docs/screens/asset-pack-cemetery.png' });
  await page.evaluate('window.packRenderer.dispose()');
  expect(errors).toEqual([]);
});
