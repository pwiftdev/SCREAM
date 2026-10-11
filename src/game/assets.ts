import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
const characters = new Map<
  number,
  { root: THREE.Group; clips: THREE.AnimationClip[] }
>();
let loading: Promise<void> | undefined;
export function streamCharacters() {
  return (loading ??= (async () => {
    const response = await fetch('/api/config');
    if (!response.ok)
      throw new Error('Could not load the asset configuration.');
    const config = await response.json();
    const base = config.assetBase || '/assets';
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const gltf = await loader.loadAsync(`${base}/characters/${i}.glb`);
        characters.set(i, { root: gltf.scene, clips: gltf.animations });
      }),
    );
  })());
}
export function loadedCharacter(index: number) {
  const source = characters.get(index);
  if (!source) return;
  const root = clone(source.root) as THREE.Group;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.frustumCulled = false;
    }
  });
  return { root, clips: source.clips };
}
