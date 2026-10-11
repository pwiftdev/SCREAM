import { terrainHeight } from '../../../shared/house/terrain';
import * as T from 'three';
import { lampBrightness, NIGHT, type NightLamp } from './horror-lighting';
export function atmosphere(scene: T.Scene, camera: T.Camera) {
  const group = new T.Group();
  scene.add(group);
  const points = new Float32Array(600 * 3);
  for (let i = 0; i < 600; i++) {
    const a = i * 2.39996,
      el = 0.15 + ((i % 37) / 37) * 1.2;
    points.set(
      [
        Math.cos(a) * Math.cos(el) * 400,
        Math.sin(el) * 400,
        Math.sin(a) * Math.cos(el) * 400,
      ],
      i * 3,
    );
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(points, 3));
  const stars = new T.Points(
    geometry,
    new T.PointsMaterial({
      color: 0xf2ede4,
      size: 2,
      sizeAttenuation: false,
      fog: false,
      transparent: true,
      opacity: 0.22,
    }),
  );
  group.add(stars);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d')!,
    g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(200,210,230,.7)');
  g.addColorStop(1, 'rgba(200,210,230,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  const texture = new T.CanvasTexture(canvas);
  const mist = Array.from({ length: 16 }, (_, i) => {
    const s = new T.Sprite(
      new T.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
        color: 0xc8d0e0,
      }),
    );
    s.scale.set(10 + (i % 4), 2.4, 1);
    group.add(s);
    return s;
  });
  const lamps = Array.from({ length: 6 }, () => {
    const light = new T.PointLight(NIGHT.amber, 0, 8, 1.8);
    group.add(light);
    return light;
  });
  return {
    group,
    update(
      time: number,
      positions: NightLamp[],
      reduced = false,
      outdoors = true,
    ) {
      const p = camera.position;
      stars.visible = outdoors;
      stars.position.copy(p);
      mist.forEach((m, i) =>
        m.position.set(
          p.x + Math.sin(i * 2.4) * 20 + Math.sin(time * 0.2 + i) * 3,
          0.5 + (i % 3) * 0.4,
          p.z + Math.cos(i * 2.4) * 20,
        ),
      );
      if (outdoors)
        mist.forEach((m) => {
          m.position.y += terrainHeight(m.position.x, m.position.z);
        });
      const nearest = positions
        .map((v) => ({ v, d: (v.x - p.x) ** 2 + (v.z - p.z) ** 2 }))
        .filter((v) => v.d < 45 ** 2)
        .sort((a, b) => a.d - b.d)
        .slice(0, 6);
      lamps.forEach((l, i) => {
        const n = nearest[i];
        l.intensity = 0;
        if (n) {
          l.position.set(n.v.x, n.v.y, n.v.z);
          l.color.setHex(n.v.color ?? NIGHT.amber);
          l.distance = n.v.reach ?? 8;
          l.intensity = (n.v.power ?? 8) * lampBrightness(n.v, time, reduced);
        }
      });
      mist.forEach((m) => {
        m.material.opacity = outdoors ? 0.045 : 0.018;
      });
    },
  };
}
