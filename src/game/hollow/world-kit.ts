import { assetBatches } from '../rework/asset-batches';
import * as T from 'three';
import { NIGHT, type NightLamp } from '../rework/horror-lighting';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
function steppedRoof() {
  const layers = Array.from({ length: 4 }, (_, i) =>
    new T.BoxGeometry(2 - i * 0.45, 0.25, 2 - i * 0.45).translate(
      0,
      -0.375 + i * 0.25,
      0,
    ),
  );
  const geometry = mergeGeometries(layers);
  layers.forEach((g) => g.dispose());
  return geometry;
}
import { pixelMaterial } from '../rework/pixels';
export function worldKit(
  root: T.Group,
  elevation: (x: number, z: number) => number = () => 0,
) {
  const models = assetBatches(root);
  const model: typeof models.add = (id, x, y, z, scale, yaw) =>
    models.add(id, x, y + elevation(x, z), z, scale, yaw);
  const boxes = new Map<
    string,
    {
      geometry: T.BufferGeometry;
      color: number;
      glow: boolean;
      matrices: T.Matrix4[];
    }
  >();
  const geometries = {
    box: new T.BoxGeometry(),
    cone: steppedRoof(),
  };
  function shape(
    type: keyof typeof geometries,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    rz = 0,
    ry = 0,
    glow = false,
  ) {
    const key = `${type}:${color}:${glow}`;
    if (!boxes.has(key))
      boxes.set(key, { geometry: geometries[type], color, glow, matrices: [] });
    boxes
      .get(key)!
      .matrices.push(
        new T.Matrix4().compose(
          new T.Vector3(x, y + elevation(x, z), z),
          new T.Quaternion().setFromEuler(new T.Euler(0, ry, rz)),
          new T.Vector3(w, h, d),
        ),
      );
  }
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    rz = 0,
    ry = 0,
    glow = false,
  ) => shape('box', x, y, z, w, h, d, color, rz, ry, glow);
  function light(
    x: number,
    y: number,
    z: number,
    color = NIGHT.amber,
    options: Partial<NightLamp> = {},
  ) {
    (root.userData.lamps ??= []).push({
      x,
      y: y + elevation(x, z),
      z,
      color,
      ...options,
    });
  }
  function pumpkin(x: number, z: number, size = 1) {
    model('blk_jack_o_lantern', x, 0, z, size * 0.8, Math.PI);
    light(x, 0.45 * size, z, NIGHT.amber, { power: 4, reach: 5 });
  }
  function lamp(x: number, z: number, height = 4) {
    model('prop_lamp_post', x, 0, z, height / 2.8);
    light(x, height - 0.3, z, NIGHT.amber, {
      damaged: Math.abs(Math.floor(x * 3 + z * 7)) % 9 === 0,
      power: 11,
      reach: 9,
    });
  }
  function sign(
    x: number,
    z: number,
    text: string,
    width = 5,
    angle = Math.PI,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#171c19';
    c.fillRect(0, 0, 512, 128);
    c.strokeStyle = '#736b4b';
    c.lineWidth = 8;
    c.strokeRect(8, 8, 496, 112);
    c.fillStyle = '#eed9a9';
    c.textAlign = 'center';
    c.font = '24px Silkscreen';
    c.fillText(text.toUpperCase(), 256, 74, 472);
    const texture = new T.CanvasTexture(canvas),
      mesh = new T.Mesh(
        new T.PlaneGeometry(width * 0.9, 0.68),
        new T.MeshStandardMaterial({
          map: texture,
          side: T.DoubleSide,
          roughness: 1,
          emissive: 0x332519,
          emissiveIntensity: 0.3,
        }),
      );
    mesh.position.set(x, 2.17 + elevation(x, z), z);
    mesh.rotation.y = angle;
    root.add(mesh);
    model('prop_plot_sign', x, 0, z, [width / 0.92, 2.6 / 1.47, 1], angle);
    mesh.position.x += Math.sin(angle) * 0.2;
    mesh.position.z += Math.cos(angle) * 0.2;
    const back = mesh.clone();
    back.rotation.y += Math.PI;
    back.position.set(
      x - Math.sin(angle) * 0.2,
      2.17 + elevation(x, z),
      z - Math.cos(angle) * 0.2,
    );
    root.add(back);
  }
  function finish() {
    models.finish();
    for (const batch of boxes.values()) {
      const mesh = new T.InstancedMesh(
        batch.geometry,
        batch.glow
          ? new T.MeshBasicMaterial({ color: batch.color })
          : pixelMaterial(
              batch.color === 0x242e26 || batch.color === 0x263a30
                ? 'grass_top'
                : batch.color === 0x44413a || batch.color === 0x393b31
                  ? 'gravel'
                  : batch.color === 0xb54813
                    ? 'pumpkin_side'
                    : [0x69716a, 0x777775, 0x666a66].includes(batch.color)
                      ? 'mossy'
                      : [0x32372e, 0x4b3b30, 0x4b4831].includes(batch.color)
                        ? 'log_side'
                        : [0x42483e, 0x373736, 0x261b18, 0x272225].includes(
                              batch.color,
                            )
                          ? 'iron'
                          : 'darkplank',
              true,
            ),
        batch.matrices.length,
      );
      batch.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.computeBoundingSphere();
      mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh);
    }
    for (const geometry of Object.values(geometries))
      if (![...boxes.values()].some((b) => b.geometry === geometry))
        geometry.dispose();
  }
  return { box, shape, pumpkin, lamp, light, sign, model, finish };
}
export type WorldKit = ReturnType<typeof worldKit>;
