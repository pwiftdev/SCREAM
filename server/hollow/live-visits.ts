import { H } from '../../shared/config';
import { validFrame, type Frame } from '../../shared/house/simulation';
import { type Houses, unpack } from './houses';
interface Stream {
  id: string;
  code: string;
  seed: number;
  house: unknown;
  frames: Frame[];
  chunks: { end: number; at: number }[];
  last: number;
  created: number;
}
export class LiveVisits {
  private streams = new Map<string, Stream>();
  constructor(private houses: Houses) {}
  private prune() {
    const cutoff = this.houses.now() - H.TICKET_MS;
    for (const [id, s] of this.streams)
      if (s.last < cutoff) this.streams.delete(id);
  }
  async push(wallet: string, id: string, from: number, compressed: string) {
    this.prune();
    if (
      !Number.isInteger(from) ||
      from < 0 ||
      typeof compressed !== 'string' ||
      compressed.length > 65536
    )
      throw new Error('invalid live input');
    const frames = unpack(compressed) as Frame[];
    if (
      !Array.isArray(frames) ||
      !frames.length ||
      frames.length > H.TICK_HZ * 2
    )
      throw new Error('live input exceeds two seconds');
    const [t] = await this.houses.db.query(
      "SELECT t.* FROM lane_tickets t JOIN lane_houses h ON h.code=t.code WHERE t.id=$1 AND t.wallet=$2 AND t.used=0 AND h.hidden=0 AND t.purpose='visit'",
      [id, wallet],
    );
    if (!t) throw new Error('this visit has ended');
    let stream = this.streams.get(id);
    if (!stream) {
      if (this.streams.size >= 32) throw new Error('all windows are occupied');
      stream = {
        id,
        code: String(t.code),
        seed: Number(t.seed),
        house: unpack(String(t.house)),
        frames: [],
        chunks: [],
        last: this.houses.now(),
        created: Number(t.created),
      };
      this.streams.set(id, stream);
    }
    if (from < stream.frames.length) return { accepted: stream.frames.length };
    if (
      from !== stream.frames.length ||
      from + frames.length > H.VISIT_LIMIT_S * H.TICK_HZ ||
      from + frames.length >
        ((this.houses.now() - stream.created) / 1000) * H.TICK_HZ + H.TICK_HZ
    )
      throw new Error('invalid live input order');
    let prior = stream.frames.at(-1);
    for (const f of frames) {
      if (!validFrame(f, prior)) throw new Error('invalid live input');
      prior = f;
    }
    stream.frames.push(...frames);
    stream.last = this.houses.now();
    stream.chunks.push({ end: stream.frames.length, at: stream.last });
    return { accepted: stream.frames.length };
  }
  list() {
    this.prune();
    return [...this.streams.values()]
      .filter((s) => this.houses.now() - s.last < 15000)
      .map((s) => ({ id: s.id, code: s.code }));
  }
  async read(id: string) {
    this.prune();
    const s = this.streams.get(id);
    if (!s) throw new Error('the window is dark');
    await this.houses.publicHouse(s.code);
    const end =
      s.chunks
        .filter((c) => c.at <= this.houses.now() - H.SPECTATOR_DELAY_S * 1000)
        .at(-1)?.end ?? 0;
    return {
      id: s.id,
      house: s.house,
      seed: s.seed,
      frames: s.frames.slice(0, end),
      outcome: 'live · 5 second delay',
      mic: [],
    };
  }
}
