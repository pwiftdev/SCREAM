import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SOUND_FILES } from '../src/lib/soundscape';
it('ships the complete local sound library with checked attribution and a small download budget', () => {
  const manifest = JSON.parse(
    readFileSync('public/audio/world/manifest.json', 'utf8'),
  );
  let total = 0;
  for (const [id, file] of Object.entries(SOUND_FILES)) {
    const entry = manifest.assets.find((a: { id: string }) => a.id === id);
    expect(entry.file).toBe(`/audio/world/${file}`);
    const data = readFileSync(`public${entry.file}`);
    expect(createHash('sha256').update(data).digest('hex')).toBe(entry.sha256);
    total += data.length;
    if (entry.source !== 'original')
      expect(
        manifest.sources.find((s: { id: string }) => s.id === entry.source)
          .license,
      ).toBe('CC0-1.0');
  }
  expect(total).toBeLessThan(4_000_000);
});
