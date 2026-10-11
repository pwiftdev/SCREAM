import type { WorldKit } from './world-kit';
export function buildLandmarks(k: WorldKit) {
  const { box, shape, pumpkin, lamp, sign, model } = k;
  for (const side of [-1, 1]) {
    box(side * 6, 4, -59, 1.3, 8, 1.4, 0x44413d);
    shape('cone', side * 6, 9, -59, 1.3, 2, 1.3, 0x242629);
    lamp(side * 6, -59, 7.8);
  }
  box(0, 7.5, -59, 13, 0.6, 0.5, 0x342c2a);
  sign(-10, -53, "Let's Scream Together", 7);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    box(
      Math.sin(a) * 2,
      0.25,
      25 + Math.cos(a) * 2,
      1,
      0.5,
      0.7,
      0x5a5851,
      0,
      a,
    );
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    box(
      Math.sin(a) * 0.6,
      0.5,
      25 + Math.cos(a) * 0.6,
      0.35,
      0.35,
      2.3,
      0x44302a,
      0,
      a,
    );
    shape(
      'cone',
      Math.sin(a) * 0.35,
      1.5,
      25 + Math.cos(a) * 0.35,
      0.5,
      2.5,
      0.5,
      i % 2 ? 0xd76923 : 0xffb84f,
      0,
      0,
      true,
    );
  }
  for (let i = 0; i < 12; i++) {
    const a = i * 0.52;
    pumpkin(Math.sin(a) * 9, 25 + Math.cos(a) * 9, 1 + (i % 3) * 0.35);
  }
  sign(-6, 12, 'Leave one for the dead');
  model('str_mausoleum', -110, 0, 198, [8 / 4.4, 1, 7 / 5.4], Math.PI);
  for (let i = 0; i < 45; i++) {
    if (i > 20 && i < 25) continue;
    model('prop_fence_iron', -126 + i * 1.1, 0, 182, 1.5);
  }
  model('prop_gate_iron', -101, 0, 182, 1.5, Math.PI);
  sign(-105, 166, 'Old Mercy • 1692');
  for (let i = 0; i < 3; i++) {
    const x = 84 + i * 11;
    model('prop_circus_tent', x, 0, 159, [7 / 4.8, 1, 4 / 4.8], Math.PI);
    pumpkin(x + 2, 156, 1.1);
  }
  sign(100, 165, 'The deadlight carnival', 7);
  for (let row = 0; row < 12; row++)
    for (let col = 0; col < 14; col++) {
      const x = -129 + col * 3.5,
        z = 377 + row * 2;
      box(x, 1.1, z, 0.1, 2.2, 0.1, 0x615237);
      box(x, 1.4, z, 0.06, 1, 0.08, 0x827240, 0.8);
    }
  for (const x of [-116, -93]) {
    model('prop_scarecrow', x, 0, 369, 1.25, Math.PI);
  }
  sign(-101, 354, 'The harvest is listening', 6);
  model('str_chapel_tower', 122, 0, 379, 1, Math.PI);
  model('nat_swamp_pool', 85, 0, 376, 4);
  sign(99, 355, 'No service after midnight', 6);
  for (let i = 0; i < 7; i++) {
    lamp(-10 + i * 3, 469, 2.5);
    pumpkin(-10 + i * 3, 471, 0.8);
  }
}
