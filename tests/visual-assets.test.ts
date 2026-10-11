import { it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { C } from '../shared/config';
import {
  generators,
  gates,
  cages,
  activeLockers,
  activePallets,
} from '../shared/maps/rotten-hollow';
it('textured GLB characters include their own rigs, gameplay clips and Meshopt compression', () => {
  let bytes = 0;
  for (let i = 0; i < 6; i++) {
    const file = `public/assets/characters/${i}.glb`,
      b = readFileSync(file);
    bytes += statSync(file).size;
    expect(b.readUInt32LE(0)).toBe(0x46546c67);
    const length = b.readUInt32LE(12),
      doc = JSON.parse(b.subarray(20, 20 + length).toString());
    expect(doc.skins.length).toBeGreaterThan(0);
    expect(
      doc.nodes.some(
        (n: { name: string }) => n.name === (i === 5 ? 'handR' : 'body_hand_r'),
      ),
    ).toBe(true);
    expect(
      doc.materials.some((m: { normalTexture?: unknown }) => m.normalTexture),
    ).toBe(true);
    expect(doc.images.length).toBeGreaterThanOrEqual(i === 5 ? 3 : 4);
    for (const name of i === 5
      ? [
          'idle',
          'run',
          'attack',
          'vault_fast',
          'pallet_break',
          'stun',
          'ability',
        ]
      : [
          'idle',
          'walk',
          'run',
          'sprint',
          'crouch_idle',
          'crouch_walk',
          'repair',
          'attack',
          'vault_fast',
          'downed_crawl',
        ])
      expect(
        doc.animations.some((a: { name: string }) => a.name === name),
      ).toBe(true);
    expect(doc.animations.length).toBeGreaterThanOrEqual(i === 5 ? 17 : 28);
    expect(doc.extensionsUsed).toContain('EXT_meshopt_compression');
    const triangles = doc.meshes.reduce(
      (sum: number, mesh: { primitives: { indices: number }[] }) =>
        sum +
        mesh.primitives.reduce(
          (n, p) => n + doc.accessors[p.indices].count / 3,
          0,
        ),
      0,
    );
    expect(triangles).toBeGreaterThanOrEqual(15000);
    expect(triangles).toBeLessThanOrEqual(i === 5 ? 60000 : 30000);
  }
  expect(bytes).toBeLessThan(12_000_000);
});
it('each survivor has six playable original PCM scream recordings', () => {
  for (let person = 0; person < 5; person++)
    for (let variant = 0; variant < 6; variant++) {
      const bytes = readFileSync(
        `public/audio/voices/${person}-${variant}.wav`,
      );
      expect(bytes.subarray(0, 4).toString()).toBe('RIFF');
      expect(bytes.subarray(8, 12).toString()).toBe('WAVE');
      expect(bytes.readUInt16LE(20)).toBe(1);
      expect(bytes.length).toBeGreaterThan(10000);
    }
});
it('shared map has the specified objective counts and seeded pallet selection', () => {
  expect(generators).toHaveLength(C.GENERATOR_SPOTS);
  expect(gates).toHaveLength(2);
  expect(cages).toHaveLength(6);
  expect(activeLockers(1)).toHaveLength(8);
  expect(activeLockers(1)).toEqual(activeLockers(1));
  expect(activeLockers(1)).not.toEqual(activeLockers(2));
  expect(activePallets(1)).toHaveLength(14);
  expect(activePallets(1)).toEqual(activePallets(1));
  expect(activePallets(1)).not.toEqual(activePallets(2));
});
