import { assetIcon, TEXTURE_ICONS } from './asset-icons';
import { packActor } from './asset-actors';
import * as T from 'three';
import { assetPixels as paintPixel } from './asset-pack';
export const BLOCK_TEXTURES = [
  'void',
  'plank',
  'darkplank',
  'stone',
  'mossy',
  'cobble',
  'dirt',
  'gravel',
  'iron',
  'window',
  'web',
  'screamer',
  'hood',
  'plank',
  'plank',
  'door',
  'trapdoor',
  'darkplank',
  'log_side',
  'lantern',
  'lantern',
  'pumpkin_face',
  'screamer_face',
  'moonwin',
  'shelf_side',
  'chest_side',
  'bone',
  'mask_face',
  'chest_front',
  'pumpkin_side',
  'headstone_face',
  'plank',
  'plank',
  'chest_front',
  'lantern',
  'roof',
  'stone',
  'moonwin',
  'spike',
  'screamer_face',
  'chest_front',
  'roof',
  'leaves',
];
export function pixelTexture(canvas: HTMLCanvasElement) {
  const t = new T.CanvasTexture(canvas);
  t.magFilter = t.minFilter = T.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
export function pixelMaterial(name: string, worldUV = false, pack = 'scream') {
  const p = paintPixel(name, pack);
  const m = new T.MeshLambertMaterial({
    map: pixelTexture(p.color),
    alphaTest: p.alpha ? 0.5 : 0,
    side: p.alpha ? T.DoubleSide : T.FrontSide,
  });
  if (p.glow) {
    m.emissiveMap = pixelTexture(p.emissive);
    m.emissive.set(0xffffff);
    m.emissiveIntensity = 1.5;
  }
  if (worldUV)
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vPixelPosition; varying vec3 vPixelNormal;',
        )
        .replace(
          '#include <project_vertex>',
          `#include <project_vertex>
 vec4 pixelPos = vec4(position,1.0);
 #ifdef USE_INSTANCING
 pixelPos=instanceMatrix*pixelPos;
 #endif
 vPixelPosition=pixelPos.xyz; vPixelNormal=abs(normal);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vPixelPosition; varying vec3 vPixelNormal;',
        )
        .replace(
          '#include <map_fragment>',
          `vec2 pixelUV = vPixelNormal.y > .5 ? vPixelPosition.xz : vPixelNormal.x > .5 ? vPixelPosition.zy : vPixelPosition.xy;
 diffuseColor *= texture2D(map,fract(pixelUV));`,
        );
    };
  return m;
}
const icons = new Map<string, string>();
export function blockIcon(name: string) {
  if (TEXTURE_ICONS[name]) return assetIcon(TEXTURE_ICONS[name]);
  const found = icons.get(name);
  if (found) return found;
  const { color } = paintPixel(name),
    c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const face = (
    a: number,
    b: number,
    c: number,
    d: number,
    x: number,
    y: number,
    shade: number,
  ) => {
    g.save();
    g.setTransform(a, b, c, d, x, y);
    g.drawImage(color, 0, 0);
    g.fillStyle = `rgba(0,0,0,${shade})`;
    g.fillRect(0, 0, 16, 16);
    g.restore();
  };
  face(1.7, -0.85, 1.7, 0.85, 5, 18, 0);
  face(1.7, 0.85, 0, 1.7, 5, 18, 0.25);
  face(1.7, -0.85, 0, 1.7, 32, 32, 0.45);
  const url = c.toDataURL();
  icons.set(name, url);
  return url;
}
export function maskedCharacter(rival = false) {
  return packActor(rival ? 'char_rival' : 'char_player');
}
export { packViewmodel as heldLantern } from './asset-actors';
