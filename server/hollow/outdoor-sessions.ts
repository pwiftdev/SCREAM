import { NIGHT } from '../../shared/house/rework';
import { OutdoorSession } from './outdoor';
export class OutdoorSessions {
  private sessions = new Map<
    string,
    { night: number; state: OutdoorSession }
  >();
  constructor(private now = Date.now) {}
  connectedCount() {
    let count = 0;
    for (const { state } of this.sessions.values())
      if (state.connection) count++;
    return count;
  }
  get(identity: string) {
    const night = Math.floor(this.now() / (NIGHT.seconds * 1000));
    for (const [key, value] of this.sessions)
      if (value.night !== night && !value.state.connection)
        this.sessions.delete(key);
    const saved = this.sessions.get(identity);
    if (saved) return saved.state;
    if (this.sessions.size >= 2048)
      throw new Error('The neighborhood is full.');
    const state = new OutdoorSession(this.now);
    this.sessions.set(identity, { night, state });
    return state;
  }
}
