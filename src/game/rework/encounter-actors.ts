import * as T from 'three';
import { packActor } from './asset-actors';
import { disposeGroup } from '../hollow/dispose';
import { terrainHeight } from '../../../shared/house/terrain';
import type { Encounter } from './outdoor-encounters';
export class EncounterActors {
  private actors = [packActor('mon_stalker'), packActor('mon_wraith')];
  private materials: T.Material[][] = [];
  constructor(world: T.Group) {
    for (const actor of this.actors) {
      const copies = new Map<T.Material, T.Material>();
      actor.root.name = 'outdoor-encounter';
      actor.root.visible = false;
      const bounds = new T.Box3().setFromObject(actor.root);
      actor.root.scale.setScalar(
        2.35 / Math.max(0.1, bounds.max.y - bounds.min.y),
      );
      actor.root.traverse((o) => {
        if (!(o instanceof T.Mesh)) return;
        const local = (source: T.Material) => {
          if (!copies.has(source)) {
            const material = source.clone();
            delete material.userData.assetPack;
            material.transparent = true;
            material.depthWrite = false;
            copies.set(source, material);
          }
          return copies.get(source)!;
        };
        o.material = Array.isArray(o.material)
          ? o.material.map(local)
          : local(o.material);
        o.castShadow = false;
      });
      this.materials.push([...copies.values()]);
      world.add(actor.root);
    }
  }
  update(e: Encounter | undefined, camera: T.Camera, time: number) {
    this.actors.forEach((actor, i) => {
      actor.root.visible = !!e && i === (e.kind === 'stalker' ? 0 : 1);
      if (!e || !actor.root.visible) return;
      actor.root.position.set(e.x, terrainHeight(e.x, e.z), e.z);
      actor.root.lookAt(
        camera.position.x,
        actor.root.position.y,
        camera.position.z,
      );
      actor.animate(time * (e.kind === 'rush' ? 1.8 : 0.4), e.moving);
      for (const m of this.materials[i])
        m.opacity = Math.max(0, 1 - e.fade / 0.35);
    });
  }
  dispose() {
    for (const actor of this.actors) {
      disposeGroup(actor.root);
      actor.root.removeFromParent();
    }
  }
}
