import * as T from 'three';
export function forestWind(root: T.Group) {
  const time = { value: 0 },
    strength = { value: 1 };
  const cache = new Map<
    T.Material,
    { material: T.MeshLambertMaterial; depth: T.MeshDepthMaterial }
  >();
  root.userData.forestWind = { time, strength };
  function apply(material: T.Material) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.forestTime = time;
      shader.uniforms.forestStrength = strength;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform float forestTime; uniform float forestStrength;',
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vec4 forestPosition = vec4(position,1.0);
          #ifdef USE_INSTANCING
          forestPosition = instanceMatrix * forestPosition;
          #endif
          forestPosition = modelMatrix * forestPosition;
          float forestPhase = forestPosition.x * .13 + forestPosition.z * .09;
          float forestBend = smoothstep(.12,3.0,position.y) * forestStrength;
          transformed.x += sin(forestTime * .85 + forestPhase) * .13 * forestBend;
          transformed.z += sin(forestTime * .63 + forestPhase * 1.3) * .08 * forestBend;`,
        );
    };
    material.customProgramCacheKey = () => 'forest-wind-v1';
  }
  return (source: T.Material) => {
    const existing = cache.get(source);
    if (existing) return existing;
    const material = (source as T.MeshLambertMaterial).clone();
    delete material.userData.assetPack;
    const depth = new T.MeshDepthMaterial({
      depthPacking: T.RGBADepthPacking,
      map: material.map,
      alphaTest: material.alphaTest,
      side: material.side,
    });
    apply(material);
    apply(depth);
    const result = { material, depth };
    cache.set(source, result);
    return result;
  };
}
