import * as T from 'three';
import { H } from '../../../shared/config';
import { BLOCKS } from '../../../shared/house/blocks';
import { assetPixels as paintPixel } from '../rework/asset-pack';
import { BLOCK_TEXTURES, pixelTexture } from '../rework/pixels';
export function makeAtlas() {
  const rows = Math.ceil(BLOCKS.length / H.ATLAS_COLS),
    canvas = document.createElement('canvas'),
    glow = document.createElement('canvas');
  canvas.width = glow.width = H.ATLAS_COLS * 16;
  canvas.height = glow.height = rows * 16;
  const c = canvas.getContext('2d')!,
    e = glow.getContext('2d')!;
  for (const b of BLOCKS) {
    const p = paintPixel(BLOCK_TEXTURES[b.id] ?? 'stone'),
      x = (b.id % H.ATLAS_COLS) * 16,
      y = Math.floor(b.id / H.ATLAS_COLS) * 16;
    c.drawImage(p.color, x, y);
    e.drawImage(p.emissive, x, y);
  }
  const texture = pixelTexture(canvas),
    emissive = pixelTexture(glow);
  texture.flipY = emissive.flipY = false;
  const material = new T.MeshLambertMaterial({
    map: texture,
    emissiveMap: emissive,
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
    vertexColors: true,
  });
  const darkness = { value: 1 };
  material.userData.darkness = darkness;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.blockBrightness = darkness;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec2 tile; varying vec2 vTile;',
      )
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTile = tile;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec2 vTile; uniform float blockBrightness;',
      )
      .replace(
        '#include <map_fragment>',
        `vec2 atlasUV = (vTile + (fract(vMapUv) * 15.0 + 0.5) / 16.0) / vec2(${H.ATLAS_COLS}.0,${rows}.0); vec4 sampledDiffuseColor = texture2D(map, atlasUV); diffuseColor *= sampledDiffuseColor;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        'totalEmissiveRadiance *= texture2D(emissiveMap,atlasUV).rgb * blockBrightness;',
      );
  };
  return { material, texture, emissive };
}
