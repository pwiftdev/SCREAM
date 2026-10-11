import * as THREE from 'three';
import type { Surface } from './materials';
export function terrainMaterial(
  materials: Record<Surface, THREE.MeshStandardMaterial>,
) {
  const material = materials.earth,
    compile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.uniforms.mudColor = { value: materials.mud.map };
    shader.uniforms.mudNormal = { value: materials.mud.normalMap };
    shader.uniforms.mudRoughness = { value: materials.mud.roughnessMap };
    shader.fragmentShader =
      `uniform sampler2D mudColor; uniform sampler2D mudNormal; uniform sampler2D mudRoughness;
float terrainNoise(vec2 p){return sin(p.x*.93+sin(p.y*1.31))*.5+sin(p.y*.71+p.x*.33)*.35;}
float wornGround(vec2 p){float path=1.-smoothstep(3.2,5.4,min(abs(p.x),abs(p.y))+terrainNoise(p)*.8);float camp=1.-smoothstep(3.3,7.,length(p-vec2(-4.,30.))+terrainNoise(p));return max(path,camp);}
` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
float wear=wornGround(vWorldFog.xz); vec2 groundUV=vWorldFog.xz*.45;
vec3 soil=texture2D(mudColor,groundUV).rgb*vec3(.64,.66,.61);
diffuseColor.rgb=mix(diffuseColor.rgb,soil,wear);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
roughnessFactor=mix(roughnessFactor,max(.24,texture2D(mudRoughness,groundUV).g*.72),wear);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
#ifdef USE_NORMALMAP_TANGENTSPACE
vec3 soilNormal=texture2D(mudNormal,groundUV).xyz*2.-1.;soilNormal.xy*=.7;
normal=normalize(mix(normal,tbn*soilNormal,wear));
#endif`,
    );
  };
  material.customProgramCacheKey = () => 'fairground-terrain-v1';
  return material;
}
