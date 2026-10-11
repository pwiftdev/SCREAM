import { randomBytes } from 'node:crypto';
import { C } from '../shared/config';
import type { Role, Snapshot } from '../shared/types';
export interface QueueEntry {
  id: string;
  wallet: string;
  name: string;
  character: number;
  role: Role | 'fill';
  joinedAt: number;
  holder: boolean;
  skipped: number;
  ready: boolean;
  offered?: Role;
}
export interface QueueStatus {
  holder: boolean;
  now: number;
  position: number;
  waiting: number;
  readyUntil: number;
  selected: boolean;
  ready: boolean;
  seats: { name: string; role: Role; ready: boolean; character: number }[];
  live: boolean;
  offerKiller: boolean;
}
export class Queue {
  entries: QueueEntry[] = [];
  selected: QueueEntry[] = [];
  readyUntil = 0;
  live = false;
  add(entry: QueueEntry) {
    if (this.entries.some((e) => e.wallet === entry.wallet)) return false;
    this.entries.push(entry);
    return true;
  }
  remove(id: string) {
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.selected.some((e) => e.id === id)) this.cancel();
  }
  ready(id: string, accept: boolean, now: number) {
    const p = this.selected.find((e) => e.id === id);
    if (!p) return;
    if (accept) p.ready = true;
    else {
      p.joinedAt = now;
      this.entries = this.entries.filter((e) => e !== p).concat(p);
      this.cancel();
    }
  }
  cancel() {
    for (const e of this.selected) {
      e.ready = false;
      e.offered = undefined;
    }
    this.selected = [];
    this.readyUntil = 0;
  }
  ordered() {
    return [...this.entries].sort((a, b) => {
      if (
        a.holder !== b.holder &&
        Math.abs(a.joinedAt - b.joinedAt) <= C.HOLDER_WINDOW_MS
      ) {
        const non = a.holder ? b : a;
        if (non.skipped === 0) return a.holder ? -1 : 1;
      }
      return a.joinedAt - b.joinedAt;
    });
  }
  tick(now: number) {
    if (this.live) return null;
    if (this.selected.length) {
      if (this.selected.every((e) => e.ready)) {
        const result = this.selected.map((e) => ({ ...e }));
        for (const e of result)
          this.entries = this.entries.filter((v) => v.id !== e.id);
        this.cancel();
        this.live = true;
        return result;
      }
      if (now >= this.readyUntil) {
        for (const e of this.selected) if (!e.ready) e.joinedAt = now;
        this.cancel();
      }
      return null;
    }
    const order = this.ordered();
    const killer =
      order.find((e) => e.role === 'killer') ??
      order.find((e) => e.role === 'fill');
    if (!killer) return null;
    const survivors = order
      .filter((e) => e !== killer && e.role !== 'killer')
      .slice(0, C.SURVIVORS);
    if (
      survivors.length < C.SURVIVORS &&
      (survivors.length < C.MIN_SURVIVORS ||
        now - Math.min(...survivors.map((e) => e.joinedAt), killer.joinedAt) <
          C.MIN_WAIT_MS)
    )
      return null;
    this.selected = [killer, ...survivors];
    killer.offered = 'killer';
    for (const e of survivors) e.offered = 'survivor';
    this.readyUntil = now + C.READY_MS;
    for (const e of this.entries)
      if (
        !e.holder &&
        !this.selected.includes(e) &&
        this.selected.some((p) => p.holder && p.joinedAt > e.joinedAt)
      )
        e.skipped++;
    return null;
  }
  status(id: string, now: number): QueueStatus {
    const e = this.entries.find((e) => e.id === id);
    return {
      holder: e?.holder ?? false,
      now,
      position: this.ordered().findIndex((e) => e.id === id) + 1,
      waiting: this.entries.length,
      readyUntil: this.readyUntil,
      selected: this.selected.some((e) => e.id === id),
      ready: e?.ready ?? false,
      seats: this.selected.map((e) => ({
        name: e.name,
        character: e.character,
        role: e.offered ?? 'survivor',
        ready: e.ready,
      })),
      live: this.live,
      offerKiller:
        !!e &&
        e.role !== 'killer' &&
        !this.entries.some((p) => p.role === 'killer') &&
        this.entries.filter((p) => p.role !== 'killer').length >=
          C.MAX_PLAYERS &&
        this.ordered().find(
          (p) => p.role === 'fill' || p.role === 'survivor',
        ) === e &&
        now - e.joinedAt >= C.FILL_OFFER_MS,
    };
  }
}
export class Hub {
  queueKey = randomBytes(32).toString('hex');
  rooms = new Set<string>();
  queue = new Queue();
  active = '';
  latest?: Snapshot;
  buffer: Snapshot[] = [];
  watchers = 0;
  watchRooms = new Set<string>();
  crowd = 0;
  tickets = new Map<
    string,
    { entry: QueueEntry; room: string; expires: number }
  >();
  claim(room: string) {
    if (this.active && this.active !== room) return false;
    this.active = room;
    this.queue.live = true;
    return true;
  }
  publish(s: Snapshot) {
    if (this.active !== s.id) return;
    this.latest = s;
    this.buffer.push(s);
    while (
      this.buffer.length >
      Math.ceil(((C.SPECTATOR_DELAY_MS + C.RESULTS_MS) * C.SNAPSHOT_HZ) / 1000)
    )
      this.buffer.shift();
  }
  delayed(now = Date.now()) {
    for (let i = this.buffer.length - 1; i >= 0; i--)
      if (this.buffer[i].now <= now - C.SPECTATOR_DELAY_MS)
        return this.buffer[i];
    return undefined;
  }
  release(room: string) {
    if (this.active === room) {
      this.active = '';
      this.queue.live = false;
    }
  }
  ticket(entry: QueueEntry, room: string) {
    const token = randomBytes(24).toString('hex');
    this.tickets.set(token, { entry, room, expires: Date.now() + 30000 });
    return token;
  }
  redeem(token: unknown, room: string) {
    if (typeof token !== 'string') return;
    const t = this.tickets.get(token);
    if (!t || t.room !== room || t.expires < Date.now()) return;
    this.tickets.delete(token);
    return t.entry;
  }
  clean() {
    for (const [key, t] of this.tickets)
      if (t.expires < Date.now()) this.tickets.delete(key);
  }
}
