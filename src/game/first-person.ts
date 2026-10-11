import * as THREE from 'three';
export function armGeometry(mesh: THREE.SkinnedMesh) {
  const geometry = mesh.geometry.clone(),
    joints = geometry.getAttribute('skinIndex'),
    weights = geometry.getAttribute('skinWeight');
  const allowed = new Set(
    mesh.skeleton.bones.flatMap((bone, index) =>
      /forearm|hand|palm|f_|thumb/.test(bone.name) ? [index] : [],
    ),
  );
  const reads = ['getX', 'getY', 'getZ', 'getW'] as const;
  const arm = (vertex: number) =>
    reads.reduce(
      (sum, read) =>
        sum + (allowed.has(joints[read](vertex)) ? weights[read](vertex) : 0),
      0,
    ) > 0.6;
  const index = geometry.getIndex(),
    count = index?.count ?? joints.count,
    triangles: number[] = [];
  for (let offset = 0; offset < count; offset += 3) {
    const a = index ? index.getX(offset) : offset,
      b = index ? index.getX(offset + 1) : offset + 1,
      c = index ? index.getX(offset + 2) : offset + 2;
    if (arm(a) && arm(b) && arm(c)) triangles.push(a, b, c);
  }
  geometry.clearGroups();
  geometry.setIndex(triangles);
  geometry.computeBoundingSphere();
  return geometry;
}
export function viewModelPose(root: THREE.Group, space: THREE.Group) {
  const arms = ['L', 'R'].map((side) => ({
    bone: root.getObjectByName(`forearm${side}`)!,
    hand: root.getObjectByName(`hand${side}`)!,
    sign: side === 'R' ? 1 : -1,
  }));
  const elbow = new THREE.Vector3(),
    wrist = new THREE.Vector3(),
    current = new THREE.Vector3(),
    direction = new THREE.Vector3(),
    localElbow = new THREE.Vector3();
  const rotation = new THREE.Quaternion(),
    worldRotation = new THREE.Quaternion(),
    parentRotation = new THREE.Quaternion();
  return (swing: number) => {
    root.updateWorldMatrix(true, true);
    for (const { bone, hand, sign } of arms) {
      const strike =
        sign > 0 ? Math.sin(Math.min(1, (1 - swing) * 3.5) * Math.PI) : 0;
      elbow.set(sign * (0.63 - strike * 0.12), -0.65 + strike * 0.12, -0.22);
      wrist.set(
        sign * (0.2 - strike * 0.5),
        -0.12 + strike * 0.32,
        -0.9 - strike * 0.3,
      );
      space.localToWorld(elbow);
      space.localToWorld(wrist);
      bone.position.copy(bone.parent!.worldToLocal(localElbow.copy(elbow)));
      bone.updateWorldMatrix(true, true);
      direction.subVectors(hand.getWorldPosition(current), elbow).normalize();
      rotation.setFromUnitVectors(direction, wrist.sub(elbow).normalize());
      bone.getWorldQuaternion(worldRotation);
      bone.parent!.getWorldQuaternion(parentRotation).invert();
      bone.quaternion.copy(
        parentRotation.multiply(rotation).multiply(worldRotation),
      );
      bone.updateWorldMatrix(false, true);
    }
  };
}
