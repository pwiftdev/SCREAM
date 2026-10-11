import { packActor } from '../rework/asset-actors';
export function monster(follower: boolean) {
  const actor = packActor(follower ? 'mon_wraith' : 'mon_stalker');
  actor.root.scale.setScalar(follower ? 0.66 : 0.62);
  return {
    root: actor.root,
    animate(time: number, active: boolean) {
      actor.root.visible = active;
      actor.animate(time, active);
    },
  };
}
