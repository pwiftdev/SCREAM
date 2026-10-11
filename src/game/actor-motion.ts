import type { Snapshot } from '../../shared/types';
import { C } from '../../shared/config';

interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  time: number;
}
export const angleDelta = (from: number, to: number) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

export class ActorMotion {
  private tracks = new Map<string, Pose[]>();
  private match = '';
  private received = 0;
  private latest = 0;
  private cursor = 0;

  update(snapshot: Snapshot, received: number) {
    if (snapshot.id !== this.match) {
      this.tracks.clear();
      this.cursor = 0;
      this.match = snapshot.id;
    }
    this.received = received;
    this.latest = snapshot.now;
    const visible = new Set<string>();
    for (const player of snapshot.players) {
      if (player.x === undefined || player.z === undefined) continue;
      visible.add(player.id);
      let track = this.tracks.get(player.id) ?? [];
      const last = track.at(-1);
      if (
        last &&
        (snapshot.now < last.time ||
          Math.hypot(player.x - last.x, player.z - last.z) > 4)
      )
        track = [];
      if (track.at(-1)?.time === snapshot.now) track.pop();
      track.push({
        x: player.x,
        y: player.y ?? 0,
        z: player.z,
        yaw: player.yaw ?? 0,
        time: snapshot.now,
      });
      if (track.length > 12) track.shift();
      this.tracks.set(player.id, track);
    }
    for (const id of this.tracks.keys())
      if (!visible.has(id)) this.tracks.delete(id);
  }

  sample(id: string, now: number) {
    const track = this.tracks.get(id);
    if (!track?.length) return;
    this.cursor = Math.max(
      this.cursor,
      Math.min(
        this.latest,
        this.latest + now - this.received - C.INTERPOLATION_MS,
      ),
    );
    let index = track.findIndex((pose) => pose.time >= this.cursor);
    if (index < 0) index = track.length - 1;
    const b = track[index],
      a = track[Math.max(0, index - 1)];
    const duration = b.time - a.time;
    const blend =
      duration > 0
        ? Math.max(0, Math.min(1, (this.cursor - a.time) / duration))
        : 1;
    const stale = now - this.received > 200;
    const speed =
      duration > 0 && !stale
        ? Math.hypot(b.x - a.x, b.z - a.z) / (duration / 1000)
        : 0;
    return {
      x: a.x + (b.x - a.x) * blend,
      y: a.y + (b.y - a.y) * blend,
      z: a.z + (b.z - a.z) * blend,
      yaw: a.yaw + angleDelta(a.yaw, b.yaw) * blend,
      speed,
      movementYaw: speed > 0.1 ? Math.atan2(b.x - a.x, b.z - a.z) : b.yaw,
    };
  }
}
