import * as THREE from 'three';
import { LUT3DEffect, LookupTexture } from 'postprocessing';
export function nightGrade() {
  const lut = LookupTexture.createNeutral(16),
    data = lut.image.data as Float32Array;
  for (let i = 0; i < data.length; i += 4) {
    const luminance =
        data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722,
      shadow = 1 - luminance;
    data[i] = Math.min(1, Math.max(0, data[i] * 0.98 - shadow * 0.01));
    data[i + 1] = Math.min(1, data[i + 1] * 0.99 + shadow * 0.008);
    data[i + 2] = Math.min(1, data[i + 2] + shadow * 0.022);
  }
  lut.needsUpdate = true;
  return new LUT3DEffect(lut);
}
export function heightFog(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying vec3 vWorldFog;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `vec4 fogPosition = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
fogPosition = instanceMatrix * fogPosition;
#endif
vWorldFog = (modelMatrix * fogPosition).xyz;
#include <project_vertex>`,
    );
    shader.fragmentShader = 'varying vec3 vWorldFog;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      `#include <fog_fragment>
#ifdef USE_FOG
float lowFog=(1.0-exp(-vFogDepth*0.012))*exp(-max(0.0,vWorldFog.y)*0.24);
float edgeFog=smoothstep(32.0,47.0,max(abs(vWorldFog.x),abs(vWorldFog.z)));
gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,clamp(lowFog*0.5+edgeFog*0.2,0.0,0.8));
#endif`,
    );
  };
  return material;
}
