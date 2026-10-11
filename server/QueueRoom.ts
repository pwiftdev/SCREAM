import { Room, ServerError, matchMaker, type Client } from '@colyseus/core';
import { cleanName } from '../shared/protocol';
import { Holders } from './holders';
import { RateLimit } from './rate-limit';
import type { WalletAuth } from './auth';
import type { Hub, QueueEntry } from './queue';
import type { Store } from './store';
export function queueRoom(hub: Hub, auth: WalletAuth, store: Store) {
  const holders = new Holders();
  return class QueueRoom extends Room {
    maxClients = 256;
    maxMessagesPerSecond = 10;
    limits = new Map<string, RateLimit>();
    pending = false;
    onCreate() {
      this.onMessage('ready', (c, v) => {
        if (this.allow(c) && typeof v === 'boolean')
          hub.queue.ready(c.sessionId, v, Date.now());
      });
      this.onMessage('offer', (c) => {
        const e = hub.queue.entries.find((e) => e.id === c.sessionId);
        if (
          this.allow(c) &&
          e &&
          hub.queue.status(e.id, Date.now()).offerKiller
        )
          e.role = 'killer';
      });
      this.onMessage('sync', (c) => this.send(c));
      this.setSimulationInterval(() => {
        if (!this.pending) {
          const entries = hub.queue.tick(Date.now());
          if (entries) {
            this.pending = true;
            void this.launch(entries).finally(() => (this.pending = false));
          }
        }
        for (const c of this.clients) this.send(c);
        hub.clean();
      }, 250);
    }
    onAuth(_c: Client, o: Record<string, unknown>) {
      const wallet = auth.verify(o.login);
      if (!wallet)
        throw new ServerError(
          401,
          'connect your wallet and sign the free profile message',
        );
      if (!['survivor', 'killer', 'fill'].includes(String(o.role)))
        throw new ServerError(400, 'choose a role');
      return { wallet };
    }
    async onJoin(c: Client, o: Record<string, unknown>) {
      const entry: QueueEntry = {
        id: c.sessionId,
        wallet: c.auth.wallet,
        name: cleanName(o.name),
        character: Math.max(
          0,
          Math.min(4, Math.floor(Number(o.character) || 0)),
        ),
        role: o.role as QueueEntry['role'],
        joinedAt: Date.now(),
        holder: await holders.check(c.auth.wallet),
        skipped: 0,
        ready: false,
      };
      if (!hub.queue.add(entry))
        throw new ServerError(409, 'this wallet is already queued');
      try {
        await store.profile(entry.wallet, entry.name, entry.character);
      } catch (e) {
        hub.queue.remove(c.sessionId);
        throw e;
      }
      this.limits.set(c.sessionId, new RateLimit(8, 3));
      this.send(c);
    }
    allow(c: Client) {
      return this.limits.get(c.sessionId)?.take() ?? false;
    }
    send(c: Client) {
      c.send('queue', hub.queue.status(c.sessionId, Date.now()));
    }
    async launch(entries: QueueEntry[]) {
      try {
        const room = await matchMaker.createRoom('match', {
          queued: true,
          queueKey: hub.queueKey,
          seatCount: entries.length,
        });
        for (const entry of entries) {
          const c = this.clients.find((c) => c.sessionId === entry.id);
          if (c)
            c.send('seat', {
              roomId: room.roomId,
              ticket: hub.ticket(entry, room.roomId),
            });
        }
      } catch {
        hub.queue.live = false;
        for (const entry of entries) {
          entry.ready = false;
          hub.queue.add(entry);
          this.clients
            .find((c) => c.sessionId === entry.id)
            ?.send(
              'notice',
              'could not open the match. your queue place was kept.',
            );
        }
      }
    }
    onLeave(c: Client) {
      hub.queue.remove(c.sessionId);
      this.limits.delete(c.sessionId);
    }
  };
}
