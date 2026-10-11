import * as THREE from 'three';
import { carousel } from '../../shared/maps/rotten-hollow';
import { GeometryBatch } from './geometry-batch';
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export function buildLandmarks(b: GeometryBatch) {
  b.add(
    'wood',
    new THREE.CylinderGeometry(
      carousel.radius,
      carousel.radius + carousel.rim,
      carousel.height,
      64,
    ),
    [carousel.x, carousel.height / 2, carousel.z],
  );
  b.add('rust', new THREE.CylinderGeometry(0.28, 0.4, 6, 20), [0, 3.2, 0]);
  const canopy = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 8),
      new THREE.Vector2(0.9, 7.3),
      new THREE.Vector2(3.5, 6.7),
      new THREE.Vector2(7.3, 5.7),
    ],
    64,
  );
  b.add('red', canopy, [0, 0, 0]);
  for (const radius of [6.9, 7.2])
    b.add(
      'cream',
      new THREE.TorusGeometry(radius, 0.13, 8, 64),
      [0, 5.65, 0],
      [Math.PI / 2, 0, 0],
    );
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2,
      x = Math.sin(angle) * 5.8,
      z = Math.cos(angle) * 5.8;
    b.beam(
      'rust',
      v(0, 7.8, 0),
      v(Math.sin(angle) * 7.2, 5.7, Math.cos(angle) * 7.2),
      0.025,
    );
    b.beam('iron', v(x, 0.4, z), v(x, 5.6, z), 0.035);
    b.box('wood', x, 1, z, 0.7, 0.1, 0.85, 0, angle);
    b.box('wood', x, 1.55, z + 0.25, 0.7, 1.1, 0.08, 0, angle);
    b.add('glow', new THREE.SphereGeometry(0.045, 6, 5), [
      Math.sin(angle) * 7.1,
      5.5,
      Math.cos(angle) * 7.1,
    ]);
  }
  const center = v(30, 3.7, -31),
    rotation = new THREE.Matrix4().makeRotationX(1.12),
    point = (angle: number, radius = 8.6) =>
      v(Math.sin(angle) * radius, Math.cos(angle) * radius, 0)
        .applyMatrix4(rotation)
        .add(center);
  for (const offset of [-0.45, 0.45]) {
    b.add(
      'rust',
      new THREE.TorusGeometry(8.7, 0.085, 7, 64),
      [30, 3.7, -31 + offset],
      [1.12, 0, 0],
    );
    for (let i = 0; i < 16; i++) {
      const p = point((i / 16) * Math.PI * 2);
      p.z += offset;
      b.beam('iron', center, p, 0.04);
    }
  }
  for (let i = 0; i < 12; i++) {
    const p = point((i / 12) * Math.PI * 2);
    p.y = Math.max(0.4, p.y - 0.5);
    b.box(
      i % 2 ? 'cream' : 'red',
      p.x,
      p.y,
      p.z,
      1.25,
      0.7,
      0.8,
      i % 3 ? 0.07 : 0.4,
    );
    for (const dx of [-0.55, 0.55])
      b.beam('rust', v(p.x + dx, p.y, p.z), v(p.x + dx, p.y + 1.3, p.z), 0.035);
    b.beam(
      'iron',
      v(p.x - 0.55, p.y + 1.3, p.z),
      v(p.x + 0.55, p.y + 1.3, p.z),
      0.04,
    );
  }
  for (const x of [27, 33]) b.beam('rust', v(x, 0, -26), center, 0.14);
  for (let span = -36; span < 36; span += 9) {
    b.beam('wood', v(span, 0, 10), v(span, 6.4, 10), 0.085);
    let previous = v(span, 6.2, 10);
    for (let j = 1; j <= 18; j++) {
      const p = v(
        span + j * 0.5,
        6.2 - Math.sin((j / 18) * Math.PI) * 0.75,
        10,
      );
      b.beam('black', previous, p, 0.009, 4);
      if (j % 2 === 0)
        b.add('glow', new THREE.SphereGeometry(0.055, 7, 5), [
          p.x,
          p.y - 0.1,
          p.z,
        ]);
      previous = p;
    }
  }
}
export function fairgroundSign(text: string, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#302822';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#9a8061';
  ctx.lineWidth = 7;
  ctx.strokeRect(15, 15, 994, 226);
  ctx.fillStyle = '#bca888';
  ctx.font = 'bold 94px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 512, 128, 920);
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = i % 2 ? '#0e100d24' : '#c1b69913';
    ctx.fillRect((i * 137) % 1024, (i * 43) % 256, 18, 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.12),
    new THREE.MeshStandardMaterial({ map, roughness: 0.9 }),
  );
}
