import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const groups = [
  [1, 'Ambient Wind', 'wind', 'loop'],
  [1, 'Creaking Door', 'door', 'effect'],
  [1, 'Monster Growl', 'growl', 'voice'],
  [1, 'Carpet Footstep', 'carpet', 'step'],
  [1, 'Concrete Footsteps', 'concrete', 'step'],
  [1, 'Leaves Footsteps', 'leaves', 'step'],
  [1, 'Metal Footsteps', 'metal', 'step'],
  [1, 'Wind Footsteps', 'exposed', 'step'],
  [2, 'Gravel Footsteps', 'gravel', 'step'],
  [2, 'Mud foosteps', 'mud', 'step'],
  [2, 'Stairs Footsteps', 'stairs', 'step'],
  [2, 'Wooden Foosteps', 'wood', 'step'],
  [0, 'soundeffects_new', 'music', 'loop', ['backgroundmusic_gameasset.mp3']],
  [
    0,
    'soundeffects_new',
    'atmosphere',
    'loop',
    ['background_atmosphere_use_for_lower_background_ingame.mp3'],
  ],
  [
    0,
    'soundeffects_new',
    'scream',
    'voice',
    ['shortloudchildscream_gameasset.mp3', 'screamwithecho_gameasset.mp3'],
  ],
  [
    0,
    'soundeffects_new',
    'jump',
    'effect',
    ['jumpscare1.mp3', 'jumpscare2.mp3', 'jumpscare3.mp3'],
  ],
];
const rate = 24000,
  output = 'public/audio/horror';
await mkdir(output, { recursive: true });
const assets = [];
for (const [volume, folder, group, kind, selected] of groups) {
  const dir = volume ? `horror_sfx_vol_${volume}/${folder}` : folder;
  const files = (selected ?? (await readdir(dir)))
    .filter((f) => f.endsWith('.mp3'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  for (const [i, name] of files.entries()) {
    const source = join(dir, name);
    const decoded = execFileSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        source,
        '-ac',
        '1',
        '-ar',
        String(rate),
        '-af',
        kind === 'step' ? 'highpass=f=85,lowpass=f=9500' : 'highpass=f=35',
        '-f',
        'f32le',
        'pipe:1',
      ],
      { maxBuffer: 16_000_000 },
    );
    let pcm = new Float32Array(
      decoded.buffer.slice(
        decoded.byteOffset,
        decoded.byteOffset + decoded.byteLength,
      ),
    );
    const sourceSeconds = pcm.length / rate;
    let start = 0;
    if (kind === 'step') {
      const frame = 240;
      const energy = Array.from(
        { length: Math.floor(pcm.length / frame) },
        (_, n) => {
          let sum = 0;
          for (let j = n * frame; j < (n + 1) * frame; j++) sum += pcm[j] ** 2;
          return sum / frame;
        },
      );
      let best = -Infinity,
        onset = 5;
      for (let n = 5; n < energy.length - 38; n++) {
        const before = energy.slice(n - 5, n).reduce((a, b) => a + b, 0) / 5;
        const attack = energy.slice(n, n + 3).reduce((a, b) => a + b, 0) / 3;
        const score = attack - before;
        if (score > best) {
          best = score;
          onset = n;
        }
      }
      start = Math.max(0, (onset - 2) * frame);
      pcm = pcm.slice(start, start + Math.round(rate * 0.38));
    } else if (kind === 'loop') {
      const overlap = Math.round(rate * 0.65);
      const loop = pcm.slice(overlap);
      for (let j = 0; j < overlap; j++) {
        const t = j / (overlap - 1);
        loop[loop.length - overlap + j] =
          pcm[pcm.length - overlap + j] * (1 - t) + pcm[j] * t;
      }
      pcm = loop;
    }
    let peak = 0;
    for (const sample of pcm) peak = Math.max(peak, Math.abs(sample));
    const gain = Math.min(
      4,
      (kind === 'loop' ? 0.48 : 0.7) / Math.max(peak, 0.001),
    );
    const fade = Math.round(rate * (kind === 'step' ? 0.015 : 0.02));
    for (let j = 0; j < pcm.length; j++) {
      const envelope =
        kind === 'loop'
          ? 1
          : Math.min(1, j / fade, (pcm.length - 1 - j) / fade);
      pcm[j] *= gain * envelope;
    }
    const id = `${group}-${i}`,
      file = `${id}.${kind === 'step' ? 'wav' : 'mp3'}`;
    execFileSync(
      'ffmpeg',
      [
        '-v',
        'error',
        '-y',
        '-f',
        'f32le',
        '-ar',
        String(rate),
        '-ac',
        '1',
        '-i',
        'pipe:0',
        ...(kind === 'step'
          ? ['-c:a', 'pcm_s16le']
          : ['-c:a', 'libmp3lame', '-b:a', '80k']),
        join(output, file),
      ],
      { input: Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength) },
    );
    const bytes = await readFile(join(output, file));
    assets.push({
      id,
      group,
      kind,
      file,
      source,
      sourceSha256: createHash('sha256')
        .update(await readFile(source))
        .digest('hex'),
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
      sourceSeconds,
      startSeconds: start / rate,
      seconds: pcm.length / rate,
      peak: peak * gain,
    });
  }
}
await writeFile(
  join(output, 'manifest.json'),
  JSON.stringify(
    {
      source:
        'User-supplied horror_sfx_vol_1, horror_sfx_vol_2 and soundeffects_new',
      sampleRate: rate,
      channels: 1,
      assets,
    },
    null,
    2,
  ) + '\n',
);
await writeFile(
  'src/lib/horror-sfx-catalog.ts',
  'export const HORROR_SFX = ' +
    JSON.stringify(
      Object.fromEntries(
        groups.map(([, , group]) => [
          group,
          assets
            .filter((a) => a.group === group)
            .map((a) => `horror/${a.file}`),
        ]),
      ),
      null,
      2,
    ) +
    ' as const;\nexport type SfxGroup = keyof typeof HORROR_SFX;\n',
);
console.log(
  `Prepared ${assets.length} clips, ${assets.reduce((n, a) => n + a.bytes, 0)} bytes.`,
);
