import { expect, it } from 'vitest';
import * as THREE from 'three';
import { armGeometry, viewModelPose } from '../src/game/first-person';
it('first-person geometry retains arms and excludes torso, head and mixed seam triangles without changing the source', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      Array.from({ length: 27 }, (_, i) => i / 10),
      3,
    ),
  );
  geometry.setAttribute(
    'skinIndex',
    new THREE.Uint16BufferAttribute(
      [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
        0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
      ],
      4,
    ),
  );
  geometry.setAttribute(
    'skinWeight',
    new THREE.Float32BufferAttribute(
      [
        1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
        0.4, 0.6, 0, 0, 0.4, 0.6, 0, 0, 0.4, 0.6, 0, 0,
      ],
      4,
    ),
  );
  geometry.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  const mesh = new THREE.SkinnedMesh(geometry);
  const arm = new THREE.Bone(),
    torso = new THREE.Bone();
  arm.name = 'forearmR';
  torso.name = 'spine';
  mesh.bind(new THREE.Skeleton([arm, torso]));
  const result = armGeometry(mesh);
  expect(Array.from(result.index!.array)).toEqual([0, 1, 2]);
  expect(Array.from(geometry.index!.array)).toEqual([
    0, 1, 2, 3, 4, 5, 6, 7, 8,
  ]);
  expect(result.attributes.position).not.toBe(geometry.attributes.position);
});
it('first-person pose stays attached to the camera and returns after repeated swings', () => {
  const camera = new THREE.Group(),
    space = new THREE.Group(),
    root = new THREE.Group();
  camera.add(space);
  space.add(root);
  for (const side of ['L', 'R']) {
    const bone = new THREE.Bone(),
      hand = new THREE.Bone();
    bone.name = `forearm${side}`;
    hand.name = `hand${side}`;
    hand.position.y = 0.5;
    bone.add(hand);
    root.add(bone);
  }
  const pose = viewModelPose(root, space);
  pose(0);
  const hand = root.getObjectByName('handR')!,
    start = hand.getWorldPosition(new THREE.Vector3());
  for (let i = 0; i < 50; i++) {
    pose(0.85);
    pose(0);
  }
  expect(
    hand.getWorldPosition(new THREE.Vector3()).distanceTo(start),
  ).toBeLessThan(0.00001);
  camera.position.set(10, 2, 8);
  camera.rotation.y = 1.2;
  pose(0);
  const local = space.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
  expect(local.distanceTo(start)).toBeLessThan(0.00001);
  pose(0.85);
  expect(
    space
      .worldToLocal(hand.getWorldPosition(new THREE.Vector3()))
      .distanceTo(start),
  ).toBeGreaterThan(0.1);
});

it('hit and miss cooldowns both begin a complete first-person swing', async () => {
  const { Feedback } = await import('../src/game/feedback');
  const { C } = await import('../shared/config');
  for (const cooldown of [C.MISS_COOLDOWN_MS, C.HIT_COOLDOWN_MS]) {
    const feedback = new Feedback(
      new THREE.Scene(),
      new THREE.PerspectiveCamera(),
    );
    const poses: number[] = [];
    feedback.poseHands = (swing) => poses.push(swing);
    const snapshot = {
      self: 'killer',
      now: 0,
      players: [{ id: 'killer', role: 'killer', attackUntil: cooldown }],
      events: [],
      generators: [],
      gates: [],
      pallets: [],
    } as unknown as import('../shared/types').Snapshot;
    feedback.update(snapshot, false, 10);
    snapshot.now = 200;
    feedback.update(snapshot, false, 10.2);
    snapshot.now = cooldown;
    feedback.update(snapshot, false, 10 + cooldown / 1000);
    expect(poses[0]).toBe(1);
    expect(poses[1]).toBeCloseTo(1 - 0.2 / 2.7);
    expect(poses[2]).toBe(0);
  }
});
it('public attack and stun states choose the creature gameplay clips', async () => {
  const { animationClip } = await import('../src/game/characters');
  expect(animationClip(5, 'healthy', 'lunge')).toBe('attack');
  expect(animationClip(0, 'healthy', 'wipe')).toBe('attack');
  expect(animationClip(0, 'healthy', 'stunned')).toBe('stun');
  expect(animationClip(5, 'downed', 'lunge')).toBe('downed_crawl');
  expect(animationClip(5, 'injured')).toBe('injured_run');
});
