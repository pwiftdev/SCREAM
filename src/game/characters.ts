import * as THREE from 'three';
import { contactShadow } from './contact-shadow';
import { loadedCharacter } from './assets';
export interface Character {
  root: THREE.Group;
  dispose: () => void;
  animate: (
    time: number,
    speed: number,
    state: string,
    action?: string,
  ) => void;
}
export function addHolderCharm(root: THREE.Group) {
  const charm = new THREE.Mesh(
    new THREE.TorusGeometry(0.045, 0.012, 6, 12),
    new THREE.MeshStandardMaterial({
      color: '#c39a50',
      metalness: 0.75,
      roughness: 0.35,
    }),
  );
  charm.position.set(0.16, 1.19, 0.25);
  charm.name = 'holder-charm';
  root.add(charm);
}
export function character(killer = false, index = 0): Character {
  const loaded = loadedCharacter(killer ? 5 : index);
  if (loaded) {
    loaded.root.add(contactShadow(killer));
    return rig(loaded.root, loaded.clips);
  }
  throw new Error('Character assets are still loading.');
}

const actionClips: Record<string, string> = {
  lunge: 'attack',
  wipe: 'attack',
  stunned: 'stun',
  pickup: 'pick_up',
  cage: 'cage_drop',
  kick: 'kick_generator',
  locker: 'locker_in',
  drop: 'pallet_drop',
  gate: 'gate_switch',
  break: 'pallet_break',
  vault: 'vault_fast',
  search: 'locker_in',
};
export function disposeCharacter(character: Character) {
  character.dispose();
  character.root.traverse((object) => {
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
    if (
      object instanceof THREE.Mesh &&
      ['contact-shadow', 'holder-charm'].includes(object.name)
    ) {
      object.geometry.dispose();
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        material.dispose();
    }
  });
}
const stateClips: Record<string, string> = {
  downed: 'downed_crawl',
  carried: 'carried_struggle',
  caged: 'caged_idle',
};
const singleClips = new Set([
  'attack',
  'stun',
  'hit',
  'death',
  'pick_up',
  'cage_drop',
  'pallet_drop',
  'vault_fast',
  'vault_slow',
  'locker_out',
]);
const strideSpeeds: Record<string, number> = {
  walk: 2.3,
  run: 4,
  sprint: 6,
  injured_run: 4,
  crouch_walk: 1.4,
  downed_crawl: 0.7,
};
export function animationClip(speed: number, state: string, action?: string) {
  if (stateClips[state]) return stateClips[state];
  if (action === 'crouch_walk')
    return speed > 0.3 ? 'crouch_walk' : 'crouch_idle';
  if (action && !(action === 'scream' && speed > 0.3))
    return actionClips[action] ?? action;
  if (speed <= 0.3) return state === 'injured' ? 'injured_idle' : 'idle';
  if (state === 'injured') return 'injured_run';
  return speed < 2.8 ? 'walk' : speed > 4.4 ? 'sprint' : 'run';
}
export function rig(
  root: THREE.Group,
  clips: THREE.AnimationClip[],
): Character {
  const mixer = new THREE.AnimationMixer(root),
    actions = new Map(clips.map((clip) => [clip.name, mixer.clipAction(clip)]));
  for (const [name, action] of actions) {
    action.setLoop(
      singleClips.has(name) ? THREE.LoopOnce : THREE.LoopRepeat,
      singleClips.has(name) ? 1 : Infinity,
    );
    action.clampWhenFinished = singleClips.has(name);
  }
  let previousTime: number | undefined,
    current: THREE.AnimationAction | undefined,
    smoothSpeed = 0;
  const active = new Set<THREE.AnimationAction>();
  return {
    root,
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
      active.clear();
    },
    animate(time, speed, state, action) {
      const dt =
        previousTime === undefined
          ? 0
          : Math.min(0.05, Math.max(0, time - previousTime));
      previousTime = time;
      smoothSpeed = THREE.MathUtils.lerp(
        smoothSpeed,
        speed,
        1 - Math.exp(-12 * dt),
      );
      const name = animationClip(smoothSpeed, state, action);
      const next = actions.get(name) ?? actions.get('idle')!;
      if (next !== current) {
        const phase =
          current &&
          strideSpeeds[current.getClip().name] &&
          strideSpeeds[next.getClip().name]
            ? current.time / current.getClip().duration
            : 0;
        if (!active.has(next)) {
          next
            .reset()
            .setEffectiveWeight(current ? 0 : 1)
            .play();
          next.time = phase * next.getClip().duration;
          active.add(next);
        }
        current = next;
      }
      for (const playing of active) {
        const weight = THREE.MathUtils.lerp(
          playing.getEffectiveWeight(),
          playing === current ? 1 : 0,
          1 - Math.exp(-20 * dt),
        );
        playing.setEffectiveWeight(weight);
        if (playing !== current && weight < 0.001) {
          playing.stop();
          active.delete(playing);
        }
        const stride = strideSpeeds[playing.getClip().name];
        if (stride)
          playing.setEffectiveTimeScale(
            smoothSpeed < 0.1
              ? 0
              : THREE.MathUtils.clamp(smoothSpeed / stride, 0.35, 1.5),
          );
      }
      mixer.update(dt);
      root.rotation.z = THREE.MathUtils.lerp(
        root.rotation.z,
        state === 'carried' ? 1.3 : 0,
        1 - Math.exp(-14 * dt),
      );
      const shadow = root.getObjectByName('contact-shadow');
      if (shadow) shadow.visible = state !== 'carried' && state !== 'caged';
    },
  };
}
