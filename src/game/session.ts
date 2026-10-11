import { Client, type Room } from '@colyseus/sdk';
import type { Snapshot, Role, Input } from '../../shared/types';
export const endpoint = () =>
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${import.meta.env.DEV ? `${location.hostname}:2567` : location.host}`;
export class Session {
  closed = false;
  constructor(
    readonly room: Room,
    readonly onSnapshot: (s: Snapshot) => void,
    readonly onError: (message: string) => void,
  ) {
    this.remember();
    room.reconnection.enabled = true;
    room.reconnection.minUptime = 0;
    room.onMessage('snapshot', (s: Snapshot) => {
      if (!this.closed) onSnapshot(s);
    });
    room.onDrop(() =>
      onError('connection lost. your seat is held for 30 seconds.'),
    );
    room.onReconnect(() => {
      this.remember();
      onError('');
      room.send('sync');
    });
    room.onLeave(() => {
      if (!this.closed)
        onError('the connection ended. return to the fire and join again.');
    });
    room.onError((_code, message) =>
      onError(message ?? 'connection interrupted'),
    );
    room.onMessage('notice', (v: string) => onError(v));
    room.send('sync');
  }
  remember() {
    if (this.room.name === 'match')
      try {
        sessionStorage.setItem('scream.seat', this.room.reconnectionToken);
      } catch {
        return;
      }
  }
  static async restore(
    onSnapshot: (s: Snapshot) => void,
    onError: (s: string) => void,
  ) {
    let token: string | null;
    try {
      token = sessionStorage.getItem('scream.seat');
    } catch {
      return null;
    }
    if (!token) return null;
    try {
      return new Session(
        await new Client(endpoint()).reconnect(token),
        onSnapshot,
        onError,
      );
    } catch {
      sessionStorage.removeItem('scream.seat');
      return null;
    }
  }
  static async practice(
    options: {
      name: string;
      role: Role;
      character: number;
      bots: number;
      roomId?: string;
    },
    onSnapshot: (s: Snapshot) => void,
    onError: (m: string) => void,
  ) {
    const client = new Client(endpoint());
    const room = options.roomId
      ? await client.joinById(options.roomId, options)
      : await client.create('match', { ...options, practice: true });
    return new Session(room, onSnapshot, onError);
  }
  static async watch(
    onSnapshot: (s: Snapshot) => void,
    onError: (s: string) => void,
  ) {
    const r = await new Client(endpoint()).joinOrCreate('watch');
    return new Session(r, onSnapshot, onError);
  }
  input(i: Input) {
    this.room.send('input', i);
  }
  intent(kind: string, data?: unknown) {
    this.room.send('intent', { kind, data });
  }
  start() {
    this.room.send('start');
  }
  leave() {
    this.closed = true;
    if (this.room.name === 'match')
      try {
        sessionStorage.removeItem('scream.seat');
      } catch {
        this.closed = true;
      }
    void this.room.leave().catch(() => {});
  }
}
