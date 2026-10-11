import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  renameSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
const root = '.asset-work/audio';
const output = 'public/audio/world';
mkdirSync(root, { recursive: true });
mkdirSync(output, { recursive: true });
const sources = [
  {
    id: 'impact',
    sha256: '029d734af1582474edf3a694d1b0cebc97c1c152f2f39fa34d4c2bafc5de77f8',
    url: 'https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip',
    file: 'impact.zip',
    author: 'Kenney',
    source: 'https://kenney.nl/assets/impact-sounds',
  },
  {
    id: 'forest',
    sha256: '8fc7a0e9259c713ebc1736a900d431a3b73774ca935b04bd154fd63127455812',
    url: 'https://cdn.freesound.org/previews/687/687054_11532701-hq.mp3',
    file: 'forest.mp3',
    author: 'deadrobotmusic',
    source: 'https://freesound.org/people/deadrobotmusic/sounds/687054/',
  },
  {
    id: 'piano',
    sha256: '34106a287f3f8d4f9de51418c9a2a9d7caf2dd430dffc9f1e86b49aae333547f',
    url: 'https://opengameart.org/sites/default/files/GoshtPiano2.ogg',
    file: 'piano.ogg',
    author: 'Kilua Boy',
    source: 'https://opengameart.org/content/dark-environment-horror-games',
  },
  {
    id: 'caverns',
    sha256: '5c841ef1a7bacd2a038801ecee0741e200d1cf1cd08f36a6a89cce95bcfb6a8a',
    url: 'https://opengameart.org/sites/default/files/caverns.ogg',
    file: 'caverns.ogg',
    author: 'congusbongus',
    source:
      'https://opengameart.org/content/ancient-caverns-horror-ambient-loop',
  },
];
for (const source of sources) {
  const path = `${root}/${source.file}`;
  if (!existsSync(path)) {
    execFileSync('curl', [
      '-fLsS',
      '--retry',
      '2',
      source.url,
      '-o',
      `${path}.part`,
    ]);
    renameSync(`${path}.part`, path);
  }
  if (
    source.sha256 !==
    createHash('sha256').update(readFileSync(path)).digest('hex')
  )
    throw new Error(`Audio source checksum mismatch: ${source.id}`);
  source.license = 'CC0-1.0';
}
mkdirSync(`${root}/kenney/Audio`, { recursive: true });
execFileSync('unzip', [
  '-ojq',
  `${root}/impact.zip`,
  'Audio/*.ogg',
  '-d',
  `${root}/kenney/Audio`,
]);
const ffmpeg = (args) =>
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const manifest = [];
function record(id, file, source, processing) {
  const bytes = readFileSync(`${output}/${file}`);
  manifest.push({
    id,
    file: `/audio/world/${file}`,
    source,
    processing,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
for (const [id, input, seconds, filter] of [
  ['forest', 'forest.mp3', 34, 'highpass=f=100,lowpass=f=5500'],
  ['piano', 'piano.ogg', 55, 'highpass=f=230,lowpass=f=2400'],
  ['caverns', 'caverns.ogg', 60, 'highpass=f=35,lowpass=f=1800'],
]) {
  const graph = `${filter},atrim=end=${seconds},asetpts=PTS-STARTPTS,asplit[a][b];[a]atrim=start=1,asetpts=PTS-STARTPTS[tail];[b]atrim=end=1,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=1,loudnorm=I=-23:TP=-3:LRA=9`;
  ffmpeg([
    '-i',
    `${root}/${input}`,
    '-filter_complex',
    graph,
    '-ar',
    '32000',
    '-ac',
    '2',
    '-codec:a',
    'libmp3lame',
    '-q:a',
    '4',
    `${output}/${id}.mp3`,
  ]);
  record(
    id,
    `${id}.mp3`,
    id,
    'Filtered, trimmed, one-second overlap seam, loudness normalized, MP3',
  );
}
for (const [id, prefix, count] of [
  ['grass', 'footstep_grass', 4],
  ['wood', 'footstep_wood', 4],
  ['metal', 'impactMetal_medium', 3],
  ['wood-hit', 'impactWood_heavy', 3],
  ['hit', 'impactPunch_heavy', 2],
  ['bell', 'impactBell_heavy', 1],
  ['tool', 'impactMetal_light', 2],
])
  for (let i = 0; i < count; i++) {
    const name = `${id}-${i}`;
    ffmpeg([
      '-i',
      `${root}/kenney/Audio/${prefix}_00${i}.ogg`,
      '-af',
      'loudnorm=I=-20:TP=-3:LRA=7',
      '-ar',
      '32000',
      '-ac',
      '1',
      '-c:a',
      'pcm_s16le',
      `${output}/${name}.wav`,
    ]);
    record(
      name,
      `${name}.wav`,
      'impact',
      `Source ${prefix}_00${i}.ogg; mono PCM, normalized`,
    );
  }
let seed = 4181;
const random = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
};
function synth(id, seconds, sample) {
  const rate = 32000,
    n = Math.floor(rate * seconds),
    wav = Buffer.alloc(44 + n * 2);
  wav.write('RIFF');
  wav.writeUInt32LE(36 + n * 2, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++)
    wav.writeInt16LE(
      Math.round(
        Math.max(-0.9, Math.min(0.9, sample(i / rate, i / n))) * 32767,
      ),
      44 + i * 2,
    );
  writeFileSync(`${output}/${id}.wav`, wav);
  record(
    id,
    `${id}.wav`,
    'original',
    'Deterministic original synthesis; no external recording',
  );
}
let low = 0;
synth('fire', 8, (t) => {
  const noise = random() * 2 - 1;
  low = low * 0.96 + noise * 0.04;
  return low * 0.7 + (random() > 0.999 ? noise * 0.45 : 0);
});
synth(
  'engine',
  4,
  (t) =>
    Math.sin(t * Math.PI * 2 * 48) * 0.09 +
    Math.sin(t * Math.PI * 2 * 96) * 0.035 +
    (random() * 2 - 1) * 0.03 * (0.5 + 0.5 * Math.sin(t * Math.PI * 24)),
);
synth(
  'swing',
  0.55,
  (t, p) => (random() * 2 - 1) * Math.pow(Math.sin(p * Math.PI), 3) * 0.16,
);
synth(
  'heartbeat',
  0.5,
  (t) =>
    Math.sin(t * Math.PI * 2 * 52) *
    0.4 *
    (Math.exp(-t * 35) + (t > 0.16 ? 0.65 * Math.exp(-(t - 0.16) * 42) : 0)),
);
writeFileSync(
  `${output}/manifest.json`,
  JSON.stringify({ sources, assets: manifest }, null, 2),
);
console.log(
  `Prepared ${manifest.length} local sounds (${manifest.reduce((n, a) => n + a.bytes, 0)} bytes)`,
);
