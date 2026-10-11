import * as T from 'three';
export function disposeGroup(group: T.Object3D, shared?: T.Material) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>();
  group.traverse((o) => {
    if (!(
      o instanceof T.Mesh ||
      o instanceof T.Points ||
      o instanceof T.LineSegments ||
      o instanceof T.Sprite
    ))
      return;
    if (o instanceof T.InstancedMesh) o.dispose();
    if (!(o instanceof T.Sprite)) {
      if (!o.geometry.userData.assetPack) geometries.add(o.geometry);
    }
    const owned = Array.isArray(o.material) ? [...o.material] : [o.material];
    if (o instanceof T.Mesh && o.customDepthMaterial)
      owned.push(o.customDepthMaterial);
    for (const material of owned) {
      if (material === shared || material.userData.assetPack) continue;
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof T.Texture && !value.userData.assetPack)
          textures.add(value);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}
