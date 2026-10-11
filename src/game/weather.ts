import * as THREE from 'three';
import { seeded } from '../../shared/maps/rotten-hollow';
export function windMaterial(
  material: THREE.MeshStandardMaterial,
  time: { value: number },
  strength: number,
) {
  const compile = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    shader.uniforms.windTime = time;
    shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float bend=pow(clamp(position.y,0.,1.),2.);
      transformed.x+=sin(windTime*1.15+position.y*1.7+position.z*.6)*bend*${strength.toFixed(3)};
      transformed.z+=cos(windTime*.83+position.x*2.)*bend*${(strength * 0.4).toFixed(3)};`,
    );
  };
  material.customProgramCacheKey = () => `wind-${strength}`;
}
export function makeWeather(parent: THREE.Group) {
  const time = { value: 0 },
    group = new THREE.Group(),
    random = seeded(934);
  group.name = 'ground-mist';
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { time, tint: { value: new THREE.Color('#6d8588') } },
    vertexShader: `varying vec2 vUv; varying vec3 world; varying float depth;
    void main(){vUv=uv; vec4 p=vec4(position,1.);p=instanceMatrix*p;world=(modelMatrix*p).xyz;vec4 view=modelViewMatrix*p;depth=-view.z;gl_Position=projectionMatrix*view;}`,
    fragmentShader: `uniform float time;uniform vec3 tint;varying vec2 vUv;varying vec3 world;varying float depth;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec2 p=world.xz*.22+vec2(time*.035,-time*.018);float n=noise(p)*.65+noise(p*2.7)*.35;
    float edge=smoothstep(0.,.22,vUv.x)*smoothstep(1.,.78,vUv.x)*smoothstep(0.,.2,vUv.y)*smoothstep(1.,.55,vUv.y);
    float a=edge*smoothstep(.24,.7,n)*.14*smoothstep(1.5,6.,depth)*smoothstep(0.,.5,world.y);a*=1.-smoothstep(8.,18.,cameraPosition.y);gl_FragColor=vec4(tint,a);}`,
  });
  const mist = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      material,
      26,
    ),
    dummy = new THREE.Object3D();
  for (let i = 0; i < 26; i++) {
    dummy.position.set(
      (random() - 0.5) * 85,
      0.65 + random() * 0.25,
      (random() - 0.5) * 85,
    );
    dummy.rotation.y = random() * Math.PI;
    dummy.scale.set(9 + random() * 9, 1.5 + random() * 0.8, 1);
    dummy.updateMatrix();
    mist.setMatrixAt(i, dummy.matrix);
  }
  mist.computeBoundingSphere();
  mist.raycast = () => {};
  group.add(mist);
  parent.add(group);
  return {
    time,
    group,
    update: (seconds: number, reducedMotion: boolean) => {
      time.value = reducedMotion ? 0 : seconds;
    },
  };
}
export function hangingCurtains(
  parent: THREE.Group,
  base: THREE.MeshStandardMaterial,
  time: { value: number },
) {
  const material = base.clone();
  material.color.set('#68674e');
  material.side = THREE.DoubleSide;
  windMaterial(material, time, 0.035);
  for (const x of [-13.4, -11]) {
    const geometry = new THREE.PlaneGeometry(1.15, 2.35, 16, 16),
      pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, Math.sin(pos.getX(i) * 28) * 0.055);
      if (pos.getY(i) < -0.9)
        pos.setY(i, pos.getY(i) + Math.sin(pos.getX(i) * 33) * 0.065);
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 2.1, -29.2);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
  }
}
