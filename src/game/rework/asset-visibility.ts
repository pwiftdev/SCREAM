import * as T from 'three';
const center = new T.Vector3();
export function cullAssetBatches(
  world: T.Group,
  camera: T.Camera,
  fog: T.Fog | T.FogExp2 | null,
) {
  const distance =
    fog instanceof T.FogExp2 ? 2.8 / fog.density : (fog?.far ?? 160);
  world.updateMatrixWorld(true);
  world.traverse((object) => {
    if (!(object instanceof T.InstancedMesh) || !object.userData.assetBatch)
      return;
    const bounds = object.boundingSphere!;
    center.copy(bounds.center).applyMatrix4(object.matrixWorld);
    const radius = bounds.radius * object.matrixWorld.getMaxScaleOnAxis();
    object.visible =
      center.distanceToSquared(camera.position) <
      (Math.min(distance, object.userData.drawDistance ?? distance) + radius) **
        2;
  });
}
