import RAPIER from '@dimforge/rapier3d-compat';
import { blocks, carousel } from './maps/rotten-hollow';
import { C } from './config';
import type { Player } from './types';
let ready: Promise<void> | undefined;
export const initPhysics = () => (ready ??= RAPIER.init());
export class Physics {
  world = new RAPIER.World({ x: 0, y: -C.GRAVITY, z: 0 });
  controller = this.world.createCharacterController(C.CONTROLLER_OFFSET);
  bodies = new Map<string, RAPIER.Collider>();
  constructor() {
    this.world.timestep = 1 / C.TICK_HZ;
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(50, 0.2, 50).setTranslation(0, -0.2, 0),
    );
    const deck = new Float32Array(64 * 3);
    for (let i = 0; i < 64; i++) {
      const top = i < 32,
        angle = ((i % 32) / 32) * Math.PI * 2;
      const radius = carousel.radius + (top ? 0 : carousel.rim);
      deck.set(
        [
          Math.sin(angle) * radius,
          top ? carousel.height : 0,
          Math.cos(angle) * radius,
        ],
        i * 3,
      );
    }
    this.world.createCollider(
      RAPIER.ColliderDesc.convexHull(deck)!.setTranslation(
        carousel.x,
        0,
        carousel.z,
      ),
    );
    this.world.createCollider(stairRamp());
    for (const b of blocks.filter((b) => !b.id.startsWith('stair-')))
      this.world.createCollider(
        RAPIER.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(
          b.x,
          (b.y ?? 0) + b.h / 2,
          b.z,
        ),
      );
    this.controller.enableAutostep(0.35, 0.2, true);
    this.controller.enableSnapToGround(0.4);
    this.world.step();
  }
  move(p: Player, dx: number, dz: number, dt: number) {
    let collider = this.bodies.get(p.id);
    if (!collider) {
      collider = this.world.createCollider(
        RAPIER.ColliderDesc.capsule(
          C.PLAYER_HALF_HEIGHT,
          C.PLAYER_RADIUS,
        ).setSensor(true),
      );
      this.bodies.set(p.id, collider);
    }
    const center = C.PLAYER_HALF_HEIGHT + C.PLAYER_RADIUS;
    collider.setTranslation({ x: p.x, y: p.y + center, z: p.z });
    const grounded = this.world.castRay(
      new RAPIER.Ray({ x: p.x, y: p.y + 0.05, z: p.z }, { x: 0, y: -1, z: 0 }),
      0.14,
      true,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    this.controller.computeColliderMovement(
      collider,
      { x: dx, y: grounded ? -0.02 : -C.GRAVITY * dt, z: dz },
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    const m = this.controller.computedMovement();
    p.x = Math.max(-C.PLAYABLE_BOUND, Math.min(C.PLAYABLE_BOUND, p.x + m.x));
    p.z = Math.max(-C.PLAYABLE_BOUND, Math.min(C.PLAYABLE_BOUND, p.z + m.z));
    p.y = Math.max(0, p.y + m.y);
  }
  dispose() {
    this.world.free();
    this.bodies.clear();
  }
}

function stairRamp() {
  const stairs = blocks.filter((b) => b.id.startsWith('stair-'));
  const balcony = blocks.find((b) => b.id === 'house-balcony')!;
  const front = Math.max(...stairs.map((b) => b.z + b.d / 2)) + 0.22;
  const back = balcony.z + balcony.d / 2 - 0.08;
  const top = (balcony.y ?? 0) + balcony.h;
  const left = stairs[0].x - stairs[0].w / 2;
  const right = stairs[0].x + stairs[0].w / 2;
  const vertices = new Float32Array([
    left,
    0,
    front,
    right,
    0,
    front,
    left,
    0,
    back,
    right,
    0,
    back,
    left,
    top,
    back,
    right,
    top,
    back,
  ]);
  return RAPIER.ColliderDesc.convexHull(vertices)!;
}
