import type { Physics } from '../../shared/physics';
import { movement, palletBlocks } from '../../shared/movement';
import { C } from '../../shared/config';
import type { Input, PublicPlayer, Player, Snapshot } from '../../shared/types';
export class Prediction {
  physics?: Physics;
  pending: Input[] = [];
  position?: { x: number; y: number; z: number };
  own?: PublicPlayer;
  now = 0;
  pallets: Snapshot['pallets'] = [];
  disposed = false;
  async init() {
    const module = await import('../../shared/physics');
    await module.initPhysics();
    if (!this.disposed) this.physics = new module.Physics();
  }
  reconcile(s: Snapshot) {
    const p = s.players.find((p) => p.id === s.self);
    if (!p || p.x === undefined) return;
    this.own = p;
    this.pallets = s.pallets;
    this.now = s.now;
    this.pending = this.pending
      .filter((i) => i.seq > (p.ack ?? -1))
      .slice(-C.INPUT_BURST);
    this.position = { x: p.x, y: p.y ?? 0, z: p.z ?? 0 };
    for (const input of this.pending) this.move(input);
  }
  input(i: Input) {
    this.pending.push(i);
    if (this.pending.length > C.INPUT_BURST) this.pending.shift();
    this.move(i);
  }
  move(i: Input) {
    const p = this.own,
      pos = this.position;
    if (
      !p ||
      !pos ||
      !this.physics ||
      p.hidden ||
      !['healthy', 'injured', 'downed'].includes(p.health) ||
      (p.stunUntil ?? 0) > this.now
    )
      return;
    const d = movement(
      {
        role: p.role,
        health: p.health,
        boostUntil: p.boostUntil ?? 0,
        lungeUntil: p.lungeUntil ?? 0,
      },
      i,
      this.now,
      1 / C.TICK_HZ,
      p.carrying,
    );
    if (palletBlocks(pos, d, this.pallets)) return;
    const body = { ...pos, id: p.id } as Player;
    this.physics.move(body, d.x, d.z, 1 / C.TICK_HZ);
    this.position = { x: body.x, y: body.y, z: body.z };
  }
  dispose() {
    this.disposed = true;
    this.physics?.dispose();
  }
}
