import { Room, ServerError, type Client } from '@colyseus/core';
import { C } from '../shared/config';
import { RateLimit } from './rate-limit';
import type { Hub } from './queue';
export function watchRoom(hub: Hub) {
  return class WatchRoom extends Room {
    maxClients = C.MAX_WATCHERS;
    maxMessagesPerSecond = 5;
    limits = new Map<string, RateLimit>();
    last = 0;
    onCreate() {
      if (hub.watchRooms.size >= C.MAX_WATCH_ROOMS)
        throw new ServerError(503, 'all viewing seats are full');
      hub.watchRooms.add(this.roomId);
      this.onMessage('sync', (c) => {
        if (this.allowed(c)) this.send(c);
      });
      this.onMessage('scream', (c) => {
        if (this.allowed(c)) {
          hub.crowd = Math.min(100, hub.crowd + 3);
          this.broadcast('crowd', hub.crowd);
        }
      });
      this.setSimulationInterval(() => {
        const s = hub.delayed();
        if (s && s.now !== this.last) {
          this.last = s.now;
          this.broadcast('snapshot', s);
        }
        hub.crowd = Math.max(0, hub.crowd - 0.02);
      }, 1000 / C.SNAPSHOT_HZ);
    }
    allowed(c: Client) {
      return this.limits.get(c.sessionId)?.take() ?? false;
    }
    send(c: Client) {
      const s = hub.delayed();
      if (s) c.send('snapshot', s);
      else
        c.send(
          'notice',
          hub.active
            ? 'the broadcast begins after the 10-second delay.'
            : 'no match is running. stay by the fire.',
        );
    }
    onJoin(c: Client) {
      hub.watchers++;
      this.limits.set(c.sessionId, new RateLimit(3, 0.5));
      this.send(c);
    }
    onDispose() {
      hub.watchRooms.delete(this.roomId);
    }
    onLeave(c: Client) {
      hub.watchers--;
      this.limits.delete(c.sessionId);
    }
  };
}
