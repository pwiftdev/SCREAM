import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
const directory = '/.asset-work/killer/source/';
const clipSources: Record<string, string> = {
  idle: 'IdleHeadTilt',
  walk: 'SlowWalk',
  run: 'FastRun',
  sprint: 'FastRun',
  attack: 'SlashFromSideForward',
  pick_up: 'ClawWallScrape',
  cage_drop: 'SlashTopToBottom',
  kick_generator: 'SlashTopToBottom',
  pallet_break: 'SlashTopToBottom',
  locker_in: 'ClawWallScrape',
  vault_fast: 'StrongWalk',
  stun: 'DizzyIdle',
  ability: 'AlertToRunTransition',
  hit: 'DizzyIdle',
  carry: 'TwitchyWalk',
  idle_fidget: 'FiggetIdle',
  idle_threat: 'ClawLicking',
};
export async function prepareKiller() {
  const model = await new FBXLoader().loadAsync(
    `${directory}Game%20Ready%20Mesh/Demon.fbx`,
  );
  const loader = new THREE.TextureLoader();
  const [map, normalMap, roughnessMap] = await Promise.all(
    ['Low Poly_baseTexBaked.jpg', 'Low Poly_normals.jpg', 'roughness.webp'].map(
      (name) =>
        loader.loadAsync(`${directory}Textures/${encodeURIComponent(name)}`),
    ),
  );
  map.colorSpace = THREE.SRGBColorSpace;
  const skin = new THREE.MeshStandardMaterial({
    name: 'Sculpted scarred flesh',
    map,
    normalMap,
    roughnessMap,
    roughness: 1,
    metalness: 0,
    normalScale: new THREE.Vector2(0.9, 0.9),
  });
  const horn = new THREE.MeshStandardMaterial({
    name: 'Worn horn and teeth',
    color: '#9c8c70',
    roughness: 0.65,
  });
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const count = Array.isArray(object.material) ? object.material.length : 1;
    object.material =
      count > 1
        ? Array.from({ length: count }, (_, i) =>
            i === count - 1 ? horn : skin,
          )
        : skin;
    object.castShadow = object.receiveShadow = true;
    object.frustumCulled = false;
    object.name = 'Hollow_body';
  });
  const hips = model.getObjectByName('hips')!;
  const clips = Object.entries(clipSources).map(([name, source]) => {
    const original = model.animations.find(
      (a) => a.name === `metarig|${source}`,
    );
    if (!original) throw new Error(`Missing killer animation: ${source}`);
    const clip =
      name === 'attack'
        ? THREE.AnimationUtils.subclip(original, name, 24, 89, 24)
        : original.clone();
    clip.name = name;
    for (const track of clip.tracks)
      if (track.name === 'hips.position')
        for (let i = 0; i < track.values.length; i += 3) {
          track.values[i] = hips.position.x;
          track.values[i + 1] = hips.position.y;
        }
    return clip;
  });
  const normalised = new THREE.Group();
  normalised.name = 'The Hollow';
  model.rotation.x = -Math.PI / 2;
  model.scale.setScalar(0.0106);
  normalised.add(model);
  normalised.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(normalised);
  model.position.y -= bounds.min.y;
  return { root: normalised, clips };
}
export async function exportKiller() {
  const { root, clips } = await prepareKiller();
  return new GLTFExporter().parseAsync(root, {
    binary: true,
    animations: clips,
  });
}
