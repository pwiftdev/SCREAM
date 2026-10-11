import * as T from 'three';
import { index, rotation, type HouseV1 } from '../../../shared/house/format';
export function houseSigns(h: HouseV1) {
  const group = new T.Group();
  for (const sign of h.signs) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#292025';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#65332f';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 248, 120);
    ctx.fillStyle = '#ede6d8';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    const lines = sign.text.match(/.{1,20}(?:\s|$)|.{1,20}/g) ?? [];
    lines
      .slice(0, 3)
      .forEach((line, i) => ctx.fillText(line.trim(), 128, 40 + i * 24, 232));
    const texture = new T.CanvasTexture(canvas);
    texture.magFilter = T.NearestFilter;
    texture.minFilter = T.NearestFilter;
    texture.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(
      new T.PlaneGeometry(1.6, 0.8),
      new T.MeshStandardMaterial({
        map: texture,
        roughness: 1,
      }),
    );
    mesh.position.set(sign.pos.x + 0.5, sign.pos.y + 0.5, sign.pos.z + 0.35);
    mesh.rotation.y =
      (rotation(h, index(sign.pos.x, sign.pos.y, sign.pos.z)) * Math.PI) / 2;
    const back = mesh.clone();
    back.rotation.y += Math.PI;
    group.add(mesh, back);
  }
  return group;
}
