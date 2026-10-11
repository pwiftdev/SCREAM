import { index } from '../shared/house/format';
import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { HORROR_SFX } from '../src/lib/horror-sfx-catalog';
import {
  houseSoundOccluded,
  indoorSurface,
  outdoorSurface,
  windZone,
  SoundVariants,
  VisitSoundEvents,
} from '../src/lib/hollow-soundscape';
import { B } from '../shared/house/blocks';
import { starterHouse } from '../shared/house/plots';
import { startVisit } from '../shared/house/simulation';
it('imports every supplied clip with bounded volume and isolated footfalls', () => {
  const manifest = JSON.parse(
    readFileSync('public/audio/horror/manifest.json', 'utf8'),
  );
  expect(manifest.assets).toHaveLength(92);
  const catalog = Object.values(HORROR_SFX).flat();
  expect(catalog).toHaveLength(92);
  let bytes = 0;
  for (const asset of manifest.assets) {
    expect(catalog).toContain(`horror/${asset.file}`);
    const data = readFileSync(`public/audio/horror/${asset.file}`);
    expect(createHash('sha256').update(data).digest('hex')).toBe(asset.sha256);
    expect(
      createHash('sha256').update(readFileSync(asset.source)).digest('hex'),
    ).toBe(asset.sourceSha256);
    expect(asset.peak).toBeLessThanOrEqual(0.701);
    if (asset.kind === 'step') expect(asset.seconds).toBeCloseTo(0.38);
    bytes += data.length;
  }
  expect(bytes).toBeLessThan(4_700_000);
});
it('selects footsteps for actual floor blocks and outdoor paths', () => {
  expect(indoorSurface(B.PLANK)).toBe('wood');
  expect(indoorSurface(B.RED)).toBe('carpet');
  expect(indoorSurface(B.BARS)).toBe('metal');
  expect(indoorSurface(B.STAIRS)).toBe('stairs');
  expect(indoorSurface(B.MOSS)).toBe('concrete');
  expect(indoorSurface(B.DIRT)).toBe('mud');
  expect(outdoorSurface({ x: 0, z: -45 })).toBe('gravel');
  expect(outdoorSurface({ x: 85, z: 376 })).toBe('mud');
  expect(outdoorSurface({ x: -180, z: 270 })).toBe('exposed');
  expect(outdoorSurface({ x: -80, z: 370 })).toBe('leaves');
  expect(windZone({ x: -100, z: 175 })).toBe(1);
  expect(windZone({ x: 0, z: -65 })).toBe(5);
});
it('cycles every variation without immediate repeats and keeps surfaces independent', () => {
  const variants = new SoundVariants();
  expect(Array.from({ length: 13 }, () => variants.take('growl', 12))).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0,
  ]);
  expect(variants.take('wood', 8)).toBe(0);
  expect(variants.take('growl', 12)).toBe(1);
});
it('plays new doors, stashes and scares once and suppresses history on replay seeks', () => {
  const state = startVisit(starterHouse(0, 0), 1),
    events = new VisitSoundEvents();
  state.tick = 5;
  state.events.push({ tick: 5, type: 'scream', pos: { x: 1, y: 1, z: 1 } });
  state.doors.add(100);
  state.doors.add(676);
  state.stashes.add(10);
  expect(events.read(state)).toMatchObject({
    doors: [100, 676],
    stash: true,
    events: [state.events[0]],
  });
  expect(events.read(state)).toEqual({ events: [], doors: [], stash: false });
  state.tick = 6;
  state.doors.clear();
  expect(events.read(state).doors).toEqual([100, 676]);
  state.tick = 1;
  expect(events.read(state)).toEqual({ events: [], doors: [], stash: false });
  events.reset(state);
  expect(events.read(state).stash).toBe(false);
});

it('muffles a closed door and restores the sound path when that door opens', () => {
  const house = starterHouse(0, 0);
  house.blocks.fill(0);
  const cell = index(5, 1, 5);
  house.blocks[cell] = B.DOOR;
  const a = { x: 5.5, y: 1.5, z: 3 },
    b = { x: 5.5, y: 1.5, z: 7 };
  expect(houseSoundOccluded(house, new Set(), a, b)).toBe(true);
  expect(houseSoundOccluded(house, new Set([cell]), a, b)).toBe(false);
});
