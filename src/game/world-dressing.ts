import { gateLanterns } from './light-layout';
import * as THREE from 'three';
import { blocks, seeded } from '../../shared/maps/rotten-hollow';
import { GeometryBatch } from './geometry-batch';
import { fairgroundSign } from './landmarks';
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export function dressWorld(b: GeometryBatch, parent: THREE.Group) {
  dressHouse(b);
  for (const { x, z } of gateLanterns) {
    b.box('iron', x, 1.65, z, 0.07, 3.3, 0.07);
    b.box('glow', x, 3.35, z, 0.15, 0.25, 0.15);
    for (const y of [3.17, 3.53]) b.box('rust', x, y, z, 0.32, 0.06, 0.32);
    for (const dx of [-0.12, 0.12])
      for (const dz of [-0.12, 0.12])
        b.box('iron', x + dx, 3.35, z + dz, 0.025, 0.3, 0.025);
  }
  b.box('iron', -13, 3.16, -27.4, 1.2, 0.08, 0.3);
  b.box('glow', -13, 3.1, -27.4, 1.05, 0.025, 0.16);
  for (let x = -13.5; x <= -12.5; x += 0.2)
    b.box('iron', x, 3.065, -27.4, 0.012, 0.025, 0.2);
  dressStalls(b, parent);
  for (const [text, x, y, z, width, height, yaw] of [
    ['ADMIT ONE • STAY FOREVER', 0, 4.5, -7.4, 7.5, 0.65, Math.PI],
    ['INFIRMARY', -16, 2.75, -29.42, 2.2, 0.45, 0],
    ['NO REFUNDS', 25, 2.9, 9.07, 3.2, 0.5, 0],
    ['THE WHEEL IS CLOSED', 30, 1.6, -25.9, 4.5, 0.65, 0],
  ] as const) {
    const sign = fairgroundSign(text, width, height);
    sign.position.set(x, y, z);
    sign.rotation.y = yaw;
    parent.add(sign);
  }
  const random = seeded(690);
  for (let i = 0; i < 140; i++) {
    const x = (random() - 0.5) * 84,
      z = (random() - 0.5) * 84;
    if (
      blocks.some(
        (w) => Math.abs(x - w.x) < w.w / 2 && Math.abs(z - w.z) < w.d / 2,
      )
    )
      continue;
    b.box(
      i % 5 ? 'wood' : 'rust',
      x,
      0.015,
      z,
      0.15 + random() * 0.8,
      0.025,
      0.04 + random() * 0.1,
      0,
      random() * 6.28,
    );
  }
  for (const x of [-17.2, -6.8]) {
    b.beam('iron', v(x, 0.1, -19.25), v(x, 6.7, -19.25), 0.045);
    b.beam('iron', v(x, 6.7, -19.25), v(x + 0.35, 6.9, -19.25), 0.045);
  }
  for (const z of [-16, 22]) {
    cable(b, v(-18, 5.1, z), v(18, 5.5, z + 2), true);
  }
  cable(b, v(-15, 5.4, -19.2), v(0, 6.3, -7.5), false);
  addNotices(parent);
}
function dressHouse(b: GeometryBatch) {
  b.box('wood', -12, 0.015, -25, 11, 0.03, 9);
  for (const z of [-29.42, -20.58]) {
    const spans =
      z < -25
        ? [[-12, 10.9]]
        : [
            [-15, 5],
            [-7, 1],
          ];
    for (const [x, width] of spans) {
      b.box('wood', x, 0.52, z, width, 1.04, 0.08);
      b.box('iron', x, 1.08, z, width, 0.07, 0.1);
      for (let dx = -width / 2; dx < width / 2; dx += 0.55)
        b.box('wood', x + dx, 0.52, z + 0.055, 0.055, 0.9, 0.06);
    }
  }
  for (const x of [-17.44, -6.56]) {
    b.box('wood', x, 0.52, -25, 0.08, 1.04, 8.8);
    b.box('wood', x, 1.08, -25, 0.1, 0.07, 8.8);
    for (let z = -29; z < -20; z += 1.3)
      b.box('wood', x, 4.85, z, 0.12, 3.6, 0.12);
  }
  for (const z of [-28.8, -25, -21.2])
    b.box('wood', -12, 6.65, z, 11, 0.25, 0.2);
  for (let x = -17; x <= -10; x += 0.55) {
    b.box('wood', x, 3.95, -26.04, 0.055, 1.2, 0.055);
    b.box('wood', x, 4.52, -26.04, 0.55, 0.08, 0.1);
  }
  for (const x of [-18.2, -5.8]) b.box('wood', x, 6.85, -25, 0.22, 0.28, 11.2);
  for (const z of [-30.55, -19.45])
    b.box('wood', -12, 6.85, z, 12.6, 0.28, 0.24);
  for (let x = -17.5; x < -6; x += 0.8) {
    b.beam('wood', v(x, 6.83, -19.5), v(x, 7.35, -20.8), 0.04, 4);
    b.box('wood', x, 6.6, -19.45, 0.14, 0.5, 0.15);
  }
  b.box('rust', -12, 3.4, -29.4, 3.5, 0.08, 0.08);
  for (let i = 0; i < 6; i++) {
    b.add('iron', new THREE.TorusGeometry(0.09, 0.012, 5, 10), [
      -13.4 + i * 0.5,
      3.25,
      -29.2,
    ]);
  }
}
function dressStalls(b: GeometryBatch, parent: THREE.Group) {
  for (const block of blocks.filter((w) => w.kind === 'stall' && w.w > w.d)) {
    const { x, z, w } = block;
    const sign = fairgroundSign(
      x < 0 ? 'PRIZES • EVERYONE WINS' : 'FRESH MEAT',
      w - 0.4,
      0.65,
    );
    sign.position.set(x, 3.28, z + 1.07);
    parent.add(sign);
    for (let i = 0; i < 9; i++) {
      const px = x - 2.65 + i * 0.66;
      for (let row = 0; row < (i % 3 === 0 ? 3 : 1); row++) {
        b.add('rust', new THREE.CylinderGeometry(0.1, 0.1, 0.23, 9), [
          px,
          1.48 + row * 0.23,
          z + 1.16,
        ]);
      }
    }
    for (let i = 0; i < 14; i++)
      b.add(
        i % 2 ? 'cream' : 'red',
        new THREE.ConeGeometry(0.25, 0.48 + (i % 3) * 0.06, 3),
        [x - w / 2 + i * 0.5, 2.55, z + 1.65],
        [Math.PI, 0, 0],
        [1, 1, 0.06],
      );
    for (const dx of [-w / 2, w / 2])
      b.beam('iron', v(x + dx, 2, z + 1.5), v(x + dx, 2.75, z + 0.5), 0.028);
  }
}
function cable(
  b: GeometryBatch,
  start: THREE.Vector3,
  end: THREE.Vector3,
  flags: boolean,
) {
  let prev = start;
  for (let i = 1; i <= 42; i++) {
    const t = i / 42,
      p = start.clone().lerp(end, t);
    p.y -= Math.sin(t * Math.PI) * 1.15;
    b.beam('black', prev, p, 0.012, 4);
    if (flags && i % 2 === 0 && i % 7 !== 0) {
      const shape = new THREE.Shape();
      shape.moveTo(-0.25, 0);
      shape.lineTo(0.25, 0);
      shape.lineTo(0.08, -0.65);
      shape.closePath();
      b.add(
        i % 4 ? 'red' : 'cream',
        new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }),
        p.toArray(),
        [0, 0.05 * i, 0.04 * Math.sin(i)],
      );
    }
    prev = p;
  }
}
function addNotices(parent: THREE.Group) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!,
    random = seeded(774);
  ctx.fillStyle = '#aaa080';
  ctx.fillRect(0, 0, 1024, 1024);
  for (let cell = 0; cell < 4; cell++) {
    const x = (cell % 2) * 512,
      y = Math.floor(cell / 2) * 512;
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#302823';
    ctx.lineWidth = 5;
    ctx.strokeRect(23, 23, 466, 466);
    ctx.fillStyle = '#392820';
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px Georgia';
    ctx.fillText(
      ['MISSING', 'LAST NIGHT', 'DO NOT ENTER', 'NOTICE'][cell],
      256,
      94,
      440,
    );
    if (cell === 0) {
      ctx.beginPath();
      ctx.ellipse(256, 205, 46, 60, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(256, 310, 96, 70, 0, Math.PI, 0);
      ctx.fill();
    } else {
      ctx.font = 'bold 102px Georgia';
      ctx.fillText(['', '13', 'X', '!'][cell], 256, 275);
    }
    ctx.font = '24px Georgia';
    ctx.fillText(
      [
        'HAVE YOU SEEN ELSIE?',
        'ONE FINAL PERFORMANCE',
        'RIDE UNDER REPAIR',
        'FAIRGROUND CLOSED',
      ][cell],
      256,
      390,
      430,
    );
    ctx.font = '18px Georgia';
    ctx.fillText(
      [
        'LAST SEEN AT THE FAIR • OCT 13',
        'ROTTEN HOLLOW • AFTER DARK',
        'KEEP CLEAR OF THE MACHINERY',
        'BY ORDER OF THE COUNTY',
      ][cell],
      256,
      434,
      430,
    );
    ctx.restore();
  }
  for (let i = 0; i < 7000; i++) {
    ctx.fillStyle = i % 3 ? '#231d1715' : '#e0d0a825';
    ctx.fillRect(random() * 1024, random() * 1024, random() * 12, random() * 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const places = [
    [-14, 1.9, -19.485, 0, 0],
    [-16.1, 1.8, -19.48, 0, 1],
    [-17.43, 2.1, -27, Math.PI / 2, 0],
    [-16, 2, -29.43, 0, 3],
    [-26.2, 1.95, 4.015, 0, 1],
    [23, 1.9, 9.015, 0, 2],
  ];
  for (const [x, y, z, yaw, cell] of places) {
    const geometry = new THREE.PlaneGeometry(0.7, 0.88, 5, 7),
      uv = geometry.attributes.uv,
      positions = geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i),
        vv = uv.getY(i);
      uv.setXY(i, (u + (cell % 2)) / 2, (vv + (cell < 2 ? 1 : 0)) / 2);
      positions.setZ(
        i,
        Math.sin(u * 11 + vv * 6) * 0.009 + (vv < 0.15 ? 0.018 : 0),
      );
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'weathered-notice';
    mesh.position.set(x, y, z);
    mesh.rotation.set(0, yaw, (random() - 0.5) * 0.13);
    parent.add(mesh);
  }
}
