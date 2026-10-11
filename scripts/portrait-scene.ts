import * as THREE from 'three';
import { character } from '../src/game/characters';
import { streamCharacters } from '../src/game/assets';
export async function portraits() {
  await streamCharacters();
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(320, 400);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  const camera = new THREE.PerspectiveCamera(32, 0.8, 0.1, 10);
  camera.position.set(0.35, 1.7, 3.8);
  camera.lookAt(0, 1.25, 0);
  const images: string[] = [];
  for (let i = 0; i < 6; i++) {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#c0cfdb', '#2e3225', 2));
    const light = new THREE.DirectionalLight('#ffd6a1', 3);
    light.position.set(-2, 3, 2);
    scene.add(light);
    const rim = new THREE.DirectionalLight('#6792bf', 2);
    rim.position.set(2, 2, -2);
    scene.add(rim);
    const model = character(i === 5, i % 5);
    model.root.rotation.y = 0.1;
    scene.add(model.root);
    model.animate(0, 0, 'healthy');
    model.animate(0.04, 0, 'healthy');
    renderer.render(scene, camera);
    images.push(renderer.domElement.toDataURL('image/png'));
  }
  renderer.dispose();
  return images;
}
