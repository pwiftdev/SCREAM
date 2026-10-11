import * as THREE from 'three';
export function bakeGeometry(
  source: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
) {
  const geometry = source.clone();
  for (const name of ['position', 'normal', 'uv']) {
    const attribute = geometry.getAttribute(name);
    if (!attribute) continue;
    const data = new Float32Array(attribute.count * attribute.itemSize);
    for (let i = 0; i < attribute.count; i++) {
      data[i * attribute.itemSize] = attribute.getX(i);
      data[i * attribute.itemSize + 1] = attribute.getY(i);
      if (attribute.itemSize > 2)
        data[i * attribute.itemSize + 2] = attribute.getZ(i);
    }
    geometry.setAttribute(
      name,
      new THREE.BufferAttribute(data, attribute.itemSize),
    );
  }
  geometry.applyMatrix4(matrix);
  return geometry;
}
