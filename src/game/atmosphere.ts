import * as THREE from 'three';
import { seeded } from '../../shared/maps/rotten-hollow';
export function makeFire() {
  const geometry = new THREE.PlaneGeometry(1.4, 2.3),
    uniforms = { time: { value: 0 } };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader:
      'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){ vec2 p=vUv; float n=noise(vec2(p.x*6.,p.y*7.-time*3.))+noise(vec2(p.x*15.,p.y*13.-time*6.))*.35;
      float edge=abs(p.x-.5+sin(p.y*10.-time*4.)*.06); float flame=smoothstep(.45*(1.-p.y),.04,edge+(n-.5)*.12);
      flame*=smoothstep(1.,.15,p.y+n*.16); float core=pow(flame,3.); vec3 col=mix(vec3(1.,.08,.008),vec3(1.,.68,.18),core);gl_FragColor=vec4(col*2.3,flame*.8); }`,
  });
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.y = (i * Math.PI) / 3;
    mesh.position.y = 0.95;
    group.add(mesh);
  }
  return {
    group,
    update: (time: number) => {
      uniforms.time.value = time;
    },
  };
}
export function makeAtmosphere(scene: THREE.Scene) {
  const random = seeded(871),
    positions = new Float32Array(240 * 3);
  for (let i = 0; i < 240; i++) {
    positions[i * 3] = (random() - 0.5) * 90;
    positions[i * 3 + 1] = random() * 8;
    positions[i * 3 + 2] = (random() - 0.5) * 90;
  }
  const geometry = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  );
  const material = new THREE.PointsMaterial({
    color: '#c1c8bb',
    size: 0.025,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const dust = new THREE.Points(geometry, material);
  scene.add(dust);
  const embers = makeEmbers(scene);
  return (time: number) => {
    dust.position.y = Math.sin(time * 0.13) * 0.35;
    dust.rotation.y = Math.sin(time * 0.015) * 0.015;
    embers(time);
  };
}
function makeEmbers(scene: THREE.Scene) {
  const random = seeded(351),
    positions = new Float32Array(60 * 3);
  for (let i = 0; i < positions.length; i++) positions[i] = random();
  const geometry = new THREE.BufferGeometry().setAttribute(
    'position',
    new THREE.BufferAttribute(positions, 3),
  );
  const time = { value: 0 };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { time },
    vertexShader: `uniform float time; varying float life;
    void main(){life=fract(position.y+time*(.12+position.z*.08));float angle=position.x*6.283+life*3.;
    vec3 p=vec3(-4.+cos(angle)*(.15+life*.7),.3+life*3.,30.+sin(angle)*(.15+life*.7));
    vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(26./-view.z,1.,5.);}`,
    fragmentShader: `varying float life; void main(){float circle=1.-smoothstep(.05,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(1.,.28,.025,circle*(1.-life)*.9);}`,
  });
  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  scene.add(particles);
  return (seconds: number) => {
    time.value = seconds;
  };
}
