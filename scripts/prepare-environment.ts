import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  prune,
  weld,
  simplify,
  meshopt,
  textureCompress,
} from '@gltf-transform/functions';
import {
  MeshoptEncoder,
  MeshoptDecoder,
  MeshoptSimplifier,
} from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });
const root = '.asset-work/polyhaven';
const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, 'utf8'));
const budgets: Record<string, number> = {
  pine_tree_01: 12000,
  wild_rooibos_bush: 4000,
  grass_medium_01: 900,
  pine_sapling_small: 8000,
  dead_tree_trunk: 5000,
  fern_02: 1500,
  rock_moss_set_01: 3500,
  tree_stump_01: 2500,
  wooden_crate_01: 2500,
  barrel_03: 1500,
  old_tyre: 1000,
  painted_wooden_bench: 700,
  portable_generator: 9000,
  industrial_wall_lamp: 1800,
  wheelchair_01: 7000,
  small_oil_can_01: 1800,
};
mkdirSync('public/assets/environment', { recursive: true });
mkdirSync('public/assets/materials', { recursive: true });
for (const asset of manifest) {
  if (asset.type === 'model') {
    const doc = await io.read(`${root}/${asset.id}/${asset.id}.gltf`);
    if (
      [
        'pine_sapling_small',
        'pine_tree_01',
        'grass_medium_01',
        'wild_rooibos_bush',
        'fern_02',
      ].includes(asset.id)
    )
      for (const scene of doc.getRoot().listScenes())
        for (const child of scene.listChildren().slice(1)) child.dispose();
    await doc.transform(prune(), dedup(), weld());
    const count = () =>
      doc
        .getRoot()
        .listMeshes()
        .reduce(
          (sum, m) =>
            sum +
            m
              .listPrimitives()
              .reduce(
                (n, p) =>
                  n +
                  (p.getIndices()?.getCount() ??
                    p.getAttribute('POSITION')!.getCount()) /
                    3,
                0,
              ),
          0,
        );
    await doc.transform(
      simplify({
        simplifier: MeshoptSimplifier,
        ratio: Math.min(1, budgets[asset.id] / count()),
        error: 0.015,
      }),
      textureCompress({
        encoder: sharp,
        targetFormat: 'webp',
        resize: [1024, 1024],
        quality: 83,
      }),
      meshopt({ encoder: MeshoptEncoder, level: 'high' }),
    );
    asset.triangles = count();
    asset.file = `/assets/environment/${asset.id}.glb`;
    await io.write(`public${asset.file}`, doc);
  } else if (asset.type === 'material') {
    mkdirSync(`public/assets/materials/${asset.id}`, { recursive: true });
    for (const kind of ['color', 'normal', 'arm'])
      await sharp(`${root}/${asset.id}/${kind}.jpg`)
        .resize(1024, 1024)
        .webp({ quality: kind === 'normal' ? 95 : 88 })
        .toFile(`public/assets/materials/${asset.id}/${kind}.webp`);
    asset.file = `/assets/materials/${asset.id}/`;
  }
  console.log(asset.id, asset.triangles ?? 'PBR textures');
}
writeFileSync(
  'public/assets/environment/manifest.json',
  JSON.stringify(manifest, null, 2),
);

await sharp(`${root}/night.jpg`)
  .resize(4096, 2048)
  .webp({ quality: 90 })
  .toFile('public/assets/environment/night-sky.webp');
