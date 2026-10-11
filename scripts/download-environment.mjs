import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
const models = [
  'pine_tree_01',
  'wild_rooibos_bush',
  'grass_medium_01',
  'pine_sapling_small',
  'dead_tree_trunk',
  'fern_02',
  'rock_moss_set_01',
  'tree_stump_01',
  'wooden_crate_01',
  'barrel_03',
  'old_tyre',
  'painted_wooden_bench',
  'portable_generator',
  'industrial_wall_lamp',
  'wheelchair_01',
  'small_oil_can_01',
];
const materials = [
  'forest_floor',
  'brown_mud_02',
  'weathered_planks',
  'rusty_metal',
  'bark_brown_02',
  'rough_plaster_03',
];
const root = '.asset-work/polyhaven';
function download(url, path, md5) {
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path))
    execFileSync('curl', [
      '-fLsS',
      '--retry',
      '2',
      '-A',
      'SCREAM-local-asset-importer/1.0',
      url,
      '-o',
      path,
    ]);
  if (md5 && createHash('md5').update(readFileSync(path)).digest('hex') !== md5)
    throw new Error(`checksum mismatch: ${path}`);
}
function api(path) {
  const target = join(root, `${path.replaceAll('/', '-')}.json`);
  download(`https://api.polyhaven.com/${path}`, target);
  return JSON.parse(readFileSync(target));
}
const manifest = [];
for (const id of [...models, ...materials]) {
  const files = api(`files/${id}`),
    info = api(`info/${id}`),
    model = models.includes(id);
  if (model) {
    const entry = files.gltf['1k'].gltf;
    download(entry.url, `${root}/${id}/${id}.gltf`, entry.md5);
    for (const [name, file] of Object.entries(entry.include)) {
      if (name.includes('..') || name.startsWith('/'))
        throw new Error('invalid asset path');
      download(file.url, `${root}/${id}/${name}`, file.md5);
    }
  } else {
    for (const [target, keys] of Object.entries({
      color: ['Diffuse', 'diff'],
      normal: ['nor_gl'],
      arm: ['arm'],
    })) {
      const key = keys.find((k) => files[k]);
      if (!key) throw new Error(`missing ${target} for ${id}`);
      const entry = files[key]['1k'].jpg;
      download(entry.url, `${root}/${id}/${target}.jpg`, entry.md5);
    }
  }
  manifest.push({
    id,
    type: model ? 'model' : 'material',
    source: `https://polyhaven.com/a/${id}`,
    license: 'CC0-1.0',
    licenseUrl: 'https://polyhaven.com/license',
    authors: info.authors,
  });
  console.log(`downloaded ${id}`);
}
const nightFiles = api('files/dikhololo_night'),
  nightInfo = api('info/dikhololo_night');
const night = nightFiles.hdri['1k'].hdr;
download(night.url, 'public/assets/environment/night.hdr', night.md5);
download(
  nightFiles.tonemapped.url,
  `${root}/night.jpg`,
  nightFiles.tonemapped.md5,
);
manifest.push({
  id: 'dikhololo_night',
  type: 'hdri',
  file: '/assets/environment/night.hdr',
  backgroundFile: '/assets/environment/night-sky.webp',
  source: 'https://polyhaven.com/a/dikhololo_night',
  license: 'CC0-1.0',
  licenseUrl: 'https://polyhaven.com/license',
  authors: nightInfo.authors,
});
writeFileSync(`${root}/manifest.json`, JSON.stringify(manifest, null, 2));
