import { afterEach, expect, it, vi } from 'vitest';
import { readDraft, writeDraft, forgetDraft } from '../src/lib/hollow-draft';
import { sampleHouse } from '../shared/house/samples';
afterEach(() => vi.unstubAllGlobals());
function storage() {
  const map = new Map<string, string>();
  const store = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => map.delete(k),
  };
  vi.stubGlobal('localStorage', store);
  return store;
}
it('recovers a pre-save crash, and refuses a backup whose server version changed', () => {
  storage();
  const h = sampleHouse();
  h.title = 'Unsaved work';
  expect(writeDraft('HOME', 'v1', h)).toBe(true);
  expect(readDraft('HOME', 'v1')?.title).toBe('Unsaved work');
  expect(readDraft('HOME', 'v2')).toBeNull();
});
it('post-ack local cleanup failure never replaces the newer server draft', () => {
  const store = storage();
  writeDraft('HOME', 'before-ack', sampleHouse());
  store.removeItem = () => {
    throw new Error('disk unavailable');
  };
  expect(() => forgetDraft('HOME')).not.toThrow();
  expect(readDraft('HOME', 'after-ack')).toBeNull();
});
it('handles corrupt and blocked storage without losing the in-memory draft', () => {
  const store = storage();
  store.setItem('hollow-draft-HOME', '{broken');
  expect(readDraft('HOME', 'v1')).toBeNull();
  store.setItem = () => {
    throw new Error('full');
  };
  expect(writeDraft('HOME', 'v1', sampleHouse())).toBe(false);
});
