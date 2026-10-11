import {
  decodeHouse,
  encodeHouse,
  type HouseV1,
  type HouseWire,
} from '../../shared/house/format';
export interface DraftBackup {
  base: string;
  house: HouseWire;
}
const key = (code: string) => `hollow-draft-${code}`;
export function readDraft(code: string, base: string): HouseV1 | null {
  try {
    const backup = JSON.parse(
      localStorage.getItem(key(code)) ?? 'null',
    ) as DraftBackup | null;
    return backup?.base === base ? decodeHouse(backup.house, true) : null;
  } catch {
    return null;
  }
}
export function writeDraft(code: string, base: string, house: HouseV1) {
  try {
    localStorage.setItem(
      key(code),
      JSON.stringify({ base, house: encodeHouse(house) }),
    );
    return true;
  } catch {
    return false;
  }
}
export function forgetDraft(code: string) {
  try {
    localStorage.removeItem(key(code));
  } catch {
    /* Storage can be disabled. */
  }
}
