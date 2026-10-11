import * as THREE from 'three';
import { heightFog } from './post-effects';
export type Surface =
  | 'wood'
  | 'rust'
  | 'bark'
  | 'plaster'
  | 'earth'
  | 'mud'
  | 'iron'
  | 'glass'
  | 'red'
  | 'cream'
  | 'black'
  | 'glow';
const textures: Partial<Record<Surface, string>> = {
  wood: 'weathered_planks',
  rust: 'rusty_metal',
  bark: 'bark_brown_02',
  plaster: 'rough_plaster_03',
  earth: 'forest_floor',
  mud: 'brown_mud_02',
  red: 'weathered_planks',
  cream: 'rough_plaster_03',
  iron: 'rusty_metal',
};
export function surfaceMaterials(manager?: THREE.LoadingManager) {
  const cache = new Map<string, THREE.Texture>();
  const loader = new THREE.TextureLoader(manager),
    result = {} as Record<Surface, THREE.MeshStandardMaterial>;
  const colors = {
    wood: '#a8a39a',
    rust: '#8c8e84',
    bark: '#827c6b',
    plaster: '#77776c',
    earth: '#82836f',
    mud: '#5d635d',
    iron: '#424f50',
    glass: '#101d21',
    red: '#592a26',
    cream: '#aaa184',
    black: '#151b1c',
    glow: '#ffd7a0',
  };
  for (const key of Object.keys(colors) as Surface[]) {
    const name = textures[key];
    const material = heightFog(
      new THREE.MeshStandardMaterial({
        color: colors[key],
        roughness: key === 'glass' ? 0.16 : key === 'iron' ? 0.4 : 0.88,
        metalness: ['rust', 'iron'].includes(key) ? 0.68 : 0,
      }),
    );
    if (name) {
      const load = (kind: string, color = false) => {
        const path = `/assets/materials/${name}/${kind}.webp`;
        if (cache.has(path)) return cache.get(path)!;
        const texture = loader.load(path);
        cache.set(path, texture);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = 8;
        if (color) texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      };
      material.map = load('color', true);
      material.normalMap = load('normal');
      material.roughnessMap = material.aoMap = load('arm');
      material.aoMapIntensity = 0.6;
      if (key === 'rust') material.metalnessMap = material.roughnessMap;
      material.normalScale.setScalar(key === 'earth' ? 1.15 : 0.75);
    }
    if (key === 'glow') {
      material.emissive.set('#ffad4e');
      material.emissiveIntensity = 3;
    }
    result[key] = material;
  }
  return result;
}
