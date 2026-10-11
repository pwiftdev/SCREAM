import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ASSET_CATALOG } from '../src/game/rework/asset-catalog';
import {
  WORLD_BOXES,
  plotLocation,
  worldBlocked,
} from '../shared/house/neighborhood';
describe('supplied Halloween asset packs', () => {
  it('ships all 261 source models intact with embedded textures and declared joints', () => {
    expect(Object.keys(ASSET_CATALOG)).toHaveLength(261);
    let bytes = 0;
    for (const [folder, pack] of [
      ['lets_scream_together_asset_pack', 'scream'],
      ['lets_scream_together_asset_pack_2', 'scream-2'],
      ['lets_scream_together_forest_pack', 'scream-forest'],
    ]) {
      const manifest = JSON.parse(
        readFileSync(`${folder}/manifest.json`, 'utf8'),
      );
      for (const asset of manifest.assets) {
        const source = readFileSync(`${folder}/${asset.file}`);
        const shipped = readFileSync(`public/assets/${pack}/${asset.file}`);
        const hash = (buffer: Buffer) =>
          createHash('sha256').update(buffer).digest('hex');
        expect(hash(shipped)).toBe(hash(source));
        bytes += shipped.length;
        expect(shipped.readUInt32LE(0)).toBe(0x46546c67);
        const doc = JSON.parse(
          shipped.subarray(20, 20 + shipped.readUInt32LE(12)).toString(),
        );
        expect(
          doc.images.every(
            (image: { bufferView?: number }) => image.bufferView !== undefined,
          ),
        ).toBe(true);
        for (const name of [...asset.pivots, ...asset.sockets])
          expect(
            doc.nodes.some((node: { name: string }) => node.name === name),
          ).toBe(true);
      }
    }
    expect(bytes).toBeLessThan(8_000_000);
  });
  it('blocks the new village cottage without changing the forty playable plots', () => {
    expect(worldBlocked(-20, 27)).toBe(true);
    expect(worldBlocked(-14, 27)).toBe(false);
    expect(WORLD_BOXES.filter((box) => box.kind === 'house')).toHaveLength(40);
    for (let i = 0; i < 40; i++) {
      const p = plotLocation(i).approach;
      expect(worldBlocked(p.x, p.z)).toBe(false);
    }
  });
});
