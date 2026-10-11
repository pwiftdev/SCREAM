import { assetIcon, ITEM_ICONS } from './asset-icons';
const SPR: Record<string, { r: string[]; p: Record<string, string> }> = {
  alert: {
    r: [
      '....RR....',
      '...RRRR...',
      '...RWWR...',
      '..RRWWRR..',
      '..RRWWRR..',
      '.RRRRRRRR.',
      '.RRRWWRRR.',
      'RRRRRRRRRR',
    ],
    p: { R: '#e01b22', W: '#0a0a0c' },
  },
  mic: {
    r: [
      '...WWW...',
      '..WWWWW..',
      '..WWWWW..',
      '..WWWWW..',
      '.W.WWW.W.',
      '.W.....W.',
      '..WWWWW..',
      '....W....',
      '..WWWWW..',
    ],
    p: { W: '#f2ede4' },
  },
  heart: {
    r: [
      '..RR.RR..',
      '.RRRRRRR.',
      'RRWRRRRRR',
      'RRRRRRRRR',
      '.RRRRRRR.',
      '..RRRRR..',
      '...RRR...',
      '....R....',
    ],
    p: { R: '#e01b22', W: '#ff8a8a' },
  },
  boot: {
    r: ['..BB....', '..BB....', '..BB....', '..BBBB..', '..BBBBBB'],
    p: { B: '#cfc8ba' },
  },
};

const cache = new Map<string, string>();
export function spriteIcon(name: string) {
  if (ITEM_ICONS[name]) return assetIcon(ITEM_ICONS[name]);
  const cached = cache.get(name);
  if (cached) return cached;
  const sprite = SPR[name];
  if (!sprite) return '';
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d')!,
    k = Math.floor(64 / Math.max(sprite.r[0].length, sprite.r.length));
  const x = Math.floor((64 - sprite.r[0].length * k) / 2),
    y = Math.floor((64 - sprite.r.length * k) / 2);
  sprite.r.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch !== '.') {
        c.fillStyle = sprite.p[ch];
        c.fillRect(x + i * k, y + j * k, k, k);
      }
    }),
  );
  const url = canvas.toDataURL();
  cache.set(name, url);
  return url;
}
