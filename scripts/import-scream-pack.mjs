import { readFile, mkdir, cp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const catalog = {};
for (const [source, pack] of [
  ['lets_scream_together_asset_pack', 'scream'],
  ['lets_scream_together_asset_pack_2', 'scream-2'],
  ['lets_scream_together_forest_pack', 'scream-forest'],
]) {
  const destination = `public/assets/${pack}`;
  const manifest = JSON.parse(
    await readFile(join(source, 'manifest.json'), 'utf8'),
  );
  await mkdir(destination, { recursive: true });
  for (const file of ['assets', 'textures', 'manifest.json', 'README.md'])
    await cp(join(source, file), join(destination, file), { recursive: true });
  for (const asset of manifest.assets) {
    if (catalog[asset.id]) throw new Error(`Duplicate asset: ${asset.id}`);
    catalog[asset.id] = { file: asset.file, size: asset.size_m, pack };
  }
}
await writeFile(
  'src/game/rework/asset-catalog.ts',
  `export const ASSET_CATALOG = ${JSON.stringify(catalog, null, 2)} as const;\nexport type AssetId = keyof typeof ASSET_CATALOG;\n`,
);
console.log(
  `Imported ${Object.keys(catalog).length} supplied models and their textures.`,
);
