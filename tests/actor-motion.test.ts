import { expect, it } from 'vitest';
import * as THREE from 'three';
import { ActorMotion, angleDelta } from '../src/game/actor-motion';
import { animationClip, rig } from '../src/game/characters';
import type { Snapshot } from '../shared/types';
const snapshot = (now: number, x?: number, yaw = 0, id = 'match') =>
  ({
    id,
    now,
    players: [{ id: 'p', x, y: 0, z: x === undefined ? undefined : 0, yaw }],
  }) as Snapshot;
it('buffers irregular snapshots without running backwards or changing the actual walking speed', () => {
  const motion = new ActorMotion();
  for (const [now, arrival] of [
    [1000, 0],
    [1033, 33],
    [1100, 109],
    [1133, 135],
    [1200, 207],
  ])
    motion.update(snapshot(now, (now - 1000) / 250), arrival);
  const positions = [207, 217, 227, 237, 257, 277, 307].map((time) =>
    motion.sample('p', time)!,
  );
  expect(positions[0].x).toBeCloseTo(0.4);
  expect(
    positions.every(
      (pose, index) => !index || pose.x >= positions[index - 1].x,
    ),
  ).toBe(true);
  expect(positions.every((pose) => Math.abs(pose.speed - 4) < 0.001)).toBe(
    true,
  );
  expect(motion.sample('p', 700)?.speed).toBe(0);
  expect(motion.sample('p', 700)?.x).toBeCloseTo(0.8);
});
it('crosses the yaw seam by the shortest angle and drops hidden positions and old match history', () => {
  const motion = new ActorMotion();
  motion.update(snapshot(1000, 0, Math.PI - 0.1), 0);
  motion.update(snapshot(1100, 0.4, -Math.PI + 0.1), 100);
  expect(Math.abs(motion.sample('p', 150)!.yaw)).toBeCloseTo(Math.PI);
  expect(angleDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
  motion.update(snapshot(1200), 200);
  expect(motion.sample('p', 200)).toBeUndefined();
  motion.update(snapshot(1300, 30), 300);
  expect(motion.sample('p', 300)?.x).toBe(30);
  motion.update(snapshot(1400, -20), 400);
  expect(motion.sample('p', 400)?.x).toBe(-20);
  motion.update(snapshot(10, 8, 0, 'new'), 500);
  expect(motion.sample('p', 500)?.x).toBe(8);
});
it('selects walk, run, sprint and both crouch poses without sliding in idle', () => {
  expect(animationClip(2.3, 'healthy')).toBe('walk');
  expect(animationClip(4, 'healthy')).toBe('run');
  expect(animationClip(4, 'healthy', 'scream')).toBe('run');
  expect(animationClip(6, 'healthy')).toBe('sprint');
  expect(animationClip(1.4, 'healthy', 'crouch_walk')).toBe('crouch_walk');
  expect(animationClip(0, 'healthy', 'crouch_walk')).toBe('crouch_idle');
  expect(animationClip(0, 'injured')).toBe('injured_idle');
});
it('one-shot attacks hold their final pose, interrupted blends remain continuous, and locomotion resumes', () => {
  const root = new THREE.Group(),
    bone = new THREE.Object3D();
  bone.name = 'bone';
  root.add(bone);
  const clip = (name: string, values: number[]) =>
    new THREE.AnimationClip(name, 0.5, [
      new THREE.NumberKeyframeTrack('bone.position[x]', [0, 0.5], values),
    ]);
  const actor = rig(root, [
    clip('idle', [0, 0]),
    clip('attack', [0, 1]),
    clip('run', [0, 0.2]),
    clip('stun', [0.5, 0.7]),
  ]);
  let time = 0,
    previous = 0;
  const advance = (seconds: number, action?: string, speed = 0) => {
    for (let i = 0; i < seconds * 60; i++) {
      actor.animate((time += 1 / 60), speed, 'healthy', action);
      expect(Math.abs(bone.position.x - previous)).toBeLessThan(0.3);
      previous = bone.position.x;
    }
  };
  advance(0.2);
  advance(1.5, 'lunge');
  expect(bone.position.x).toBeCloseTo(1, 2);
  advance(0.1, 'stunned');
  advance(0.1);
  advance(0.1, 'stunned');
  advance(1, undefined, 4);
  expect(bone.position.x).toBeLessThan(0.21);
  advance(1.5, 'lunge');
  expect(bone.position.x).toBeCloseTo(1, 2);
  actor.dispose();
});

it('the carried pose eases into and out of its shoulder tilt', () => {
  const actor = rig(
    new THREE.Group(),
    ['idle', 'carried_struggle'].map(
      (name) => new THREE.AnimationClip(name, 1, []),
    ),
  );
  actor.animate(0, 0, 'healthy');
  actor.animate(1 / 60, 0, 'carried');
  expect(actor.root.rotation.z).toBeGreaterThan(0);
  expect(actor.root.rotation.z).toBeLessThan(0.3);
  for (let i = 2; i <= 60; i++) actor.animate(i / 60, 0, 'carried');
  expect(actor.root.rotation.z).toBeCloseTo(1.3, 3);
  for (let i = 61; i <= 120; i++) actor.animate(i / 60, 0, 'healthy');
  expect(actor.root.rotation.z).toBeCloseTo(0, 3);
  actor.dispose();
});
