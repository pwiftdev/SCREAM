import { createHash, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { H } from '../../shared/config';
import { BLOCKS } from '../../shared/house/blocks';
import {
  decodeHouse,
  expandHouse,
  encodeHouse,
  type HouseV1,
} from '../../shared/house/format';
import { sampleHouse, seededHouse } from '../../shared/house/samples';
import { replay, type Frame } from '../../shared/house/simulation';
import { micMarks } from '../../shared/house/mic';
import { Plots } from './plots';
import { CandyRewards } from './candy';
import {
  starterHouse,
  fitsPlot,
  LEGACY_PLOT_TIER,
} from '../../shared/house/plots';
import { LaneEconomy } from './economy';
import { scoreRun } from './social';
import { HOUSE_SCORE_SQL } from './scoring';
import { HollowDatabase, type Query, type Row } from './database';
export const pack = (value: unknown) =>
  gzipSync(JSON.stringify(value)).toString('base64');
export const unpack = (value: string) =>
  JSON.parse(
    gunzipSync(Buffer.from(value, 'base64'), {
      maxOutputLength: H.RUN_BYTES,
    }).toString(),
  );
export const houseHash = (h: HouseV1) =>
  createHash('sha256')
    .update(JSON.stringify(encodeHouse(h)))
    .digest('hex');
export const randomId = () => randomBytes(24).toString('hex');
export class Houses {
  readonly economy: LaneEconomy;
  readonly plots: Plots;
  readonly candy: CandyRewards;
  constructor(
    readonly db: HollowDatabase,
    readonly now = Date.now,
    mode = process.env.ECONOMY_MODE ?? 'off',
  ) {
    this.economy = new LaneEconomy(db, mode, now);
    this.plots = new Plots(db);
    this.candy = new CandyRewards(db, now);
  }
  async start() {
    await this.db.start();
    await this.economy.start();
    await this.plots.start();
    await this.candy.start();
    for (let i = 0; i < 15; i++) {
      const h = seededHouse(i),
        hash = houseHash(h);
      await this.db.query(
        'INSERT INTO lane_houses(code,owner,draft,draft_hash,published,published_hash,clear_hash,updated,approved) VALUES($1,$2,$3,$4,$5,$6,$7,$8,1) ON CONFLICT(code) DO UPDATE SET draft=excluded.draft,draft_hash=excluded.draft_hash,published=excluded.published,published_hash=excluded.published_hash,clear_hash=excluded.clear_hash WHERE lane_houses.owner=excluded.owner AND NOT EXISTS(SELECT 1 FROM scream_candy_rounds r WHERE r.code=lane_houses.code AND r.settled=0)',
        [
          `HOLLOW${i + 1}`,
          `lane:sample:${i}`,
          pack(encodeHouse(h)),
          hash,
          pack(encodeHouse(h)),
          hash,
          hash,
          this.now(),
        ],
      );
    }
  }
  async session(wallet: string) {
    const token = randomId();
    await this.db.transaction(async (q) => {
      await q('DELETE FROM lane_sessions WHERE expires<$1', [this.now()]);
      await q(
        'INSERT INTO lane_sessions(token,wallet,expires) VALUES($1,$2,$3)',
        [
          createHash('sha256').update(token).digest('hex'),
          wallet,
          this.now() + H.SESSION_MS,
        ],
      );
    });
    return token;
  }
  async identity(token: unknown) {
    if (typeof token !== 'string' || !/^[a-f0-9]{48}$/.test(token))
      throw new Error('sign in to continue');
    const [s] = await this.db.query(
      'SELECT wallet FROM lane_sessions WHERE token=$1 AND expires>$2',
      [createHash('sha256').update(token).digest('hex'), this.now()],
    );
    if (!s) throw new Error('profile expired. sign in again');
    return String(s.wallet);
  }
  async owned(wallet: string) {
    const account = await this.economy.account(wallet);
    let [row] = await this.db.query(
      'SELECT * FROM lane_houses WHERE owner=$1',
      [wallet],
    );
    if (!row) {
      const h = account.holder ? expandHouse(sampleHouse(0)) : sampleHouse(0);
      h.title = 'My haunted house';
      h.props = [];
      const code = randomBytes(4).toString('hex').toUpperCase(),
        hash = houseHash(h);
      await this.db.query(
        'INSERT INTO lane_houses(code,owner,draft,draft_hash,updated) VALUES($1,$2,$3,$4,$5) ON CONFLICT(owner) DO NOTHING',
        [code, wallet, pack(encodeHouse(h)), hash, this.now()],
      );
      [row] = await this.db.query('SELECT * FROM lane_houses WHERE owner=$1', [
        wallet,
      ]);
    }
    return this.withPlot(this.ownerView(row));
  }
  async withPlot(view: ReturnType<Houses['ownerView']>) {
    const [plot] = await this.db.query(
      'SELECT slot,tier,style FROM scream_plots WHERE code=$1',
      [String(view.code)],
    );
    return {
      ...view,
      plot: plot
        ? {
            slot: Number(plot.slot),
            tier: Number(plot.tier),
            style: Number(plot.style),
          }
        : null,
    };
  }
  private async holdingAccount(q: Query, wallet: string) {
    const [row] = await q(
      'SELECT COALESCE((SELECT balance FROM lane_accounts WHERE wallet=$1),0)+(SELECT COALESCE(SUM(amount),0) FROM scream_candy_credits WHERE wallet=$1) AS balance, COALESCE((SELECT premium FROM lane_accounts WHERE wallet=$1),0) AS premium',
      [wallet],
    );
    return { balance: Number(row.balance), premium: !!row.premium };
  }
  async holdings(wallet: string) {
    await this.economy.account(wallet);
    return {
      ...(await this.holdingAccount(this.db.query, wallet)),
      mode: 'local-simulation',
    };
  }
  async claimPlot(wallet: string, slot: number, style: number) {
    const own = await this.owned(wallet);
    await this.db.transaction(async (q) => {
      const [row] = await q(
        'UPDATE lane_houses SET updated=updated WHERE owner=$1 RETURNING *',
        [wallet],
      );
      const claim = await this.plots.claim(q, String(own.code), slot, style);
      if (claim.created && row.published_hash)
        await q('UPDATE scream_plots SET tier=$2 WHERE code=$1', [
          String(own.code),
          LEGACY_PLOT_TIER,
        ]);
      if (claim.created && !row.published_hash) {
        const h = starterHouse(claim.tier, style);
        await q(
          'UPDATE lane_houses SET draft=$1,draft_hash=$2,clear_hash=NULL WHERE owner=$3',
          [pack(encodeHouse(h)), houseHash(h), wallet],
        );
      }
    });
    return this.owned(wallet);
  }
  ownerView(row: Row) {
    return {
      code: row.code,
      house: unpack(String(row.draft)),
      hash: row.draft_hash,
      clear: row.clear_hash === row.draft_hash,
      published: !!row.published_hash,
      publishedHash: row.published_hash,
      hidden: !!row.hidden,
    };
  }
  async save(wallet: string, raw: unknown, expected: string) {
    const h = decodeHouse(raw, true),
      hash = houseHash(h);
    return this.db.transaction(async (q) => {
      const [owned] = await q(
        'UPDATE lane_houses SET updated=updated WHERE owner=$1 RETURNING *',
        [wallet],
      );
      if (!owned) throw new Error('create your house first');
      const [plot] = await q('SELECT tier FROM scream_plots WHERE code=$1', [
        String(owned.code),
      ]);
      if (plot && !fitsPlot(h, Number(plot.tier)))
        throw new Error('keep blocks and props inside your plot boundary');
      if (owned.draft_hash === hash) return this.ownerView(owned);
      await this.economy.frozen(q, String(owned.code));
      const [row] = await q(
        'UPDATE lane_houses SET draft=$1,draft_hash=$2,updated=$3 WHERE owner=$4 AND draft_hash=$5 RETURNING *',
        [pack(encodeHouse(h)), hash, this.now(), wallet, expected],
      );
      if (!row)
        throw new Error(
          'draft changed in another window. reload before saving',
        );
      return this.ownerView(row);
    });
  }
  async publicHouse(code: string) {
    const [h] = await this.db.query(
      'SELECT code,owner,published,published_hash FROM lane_houses WHERE code=$1 AND hidden=0 AND published IS NOT NULL',
      [code],
    );
    if (!h) throw new Error('this door is closed');
    return {
      code: h.code,
      owner: h.owner,
      house: unpack(String(h.published)),
      hash: h.published_hash,
    };
  }
  async list() {
    return this.db.transaction(async (q) => {
      const rows = await q(
        `SELECT h.code,h.owner,h.published,h.published_hash,h.approved,p.slot,${HOUSE_SCORE_SQL} AS score,COUNT(r.id) AS visits,COALESCE(SUM(CASE WHEN r.outcome='escaped' THEN 1 ELSE 0 END),0) AS escapes,(SELECT AVG(rating) FROM lane_ratings WHERE code=h.code) AS rating,(SELECT balance FROM lane_bounties WHERE code=h.code) AS bounty,(SELECT remaining FROM scream_candy_rounds WHERE code=h.code AND settled=0 AND ends>$1) AS candy FROM lane_houses h JOIN scream_plots p ON p.code=h.code LEFT JOIN lane_runs r ON r.code=h.code AND r.scored=1 WHERE h.published IS NOT NULL AND h.hidden=0 GROUP BY h.code,h.owner,h.published,h.published_hash,h.approved,p.slot ORDER BY h.approved DESC,score DESC,h.code LIMIT 320`,
        [this.now()],
      );
      return rows
        .map((h) => ({
          code: String(h.code),
          owner: String(h.owner),
          title: String(unpack(String(h.published)).title),
          hash: String(h.published_hash),
          slot: Number(h.slot),
          score: Number(h.score),
          visits: Number(h.visits),
          escapes: Number(h.escapes),
          rating: Number(h.rating ?? 0),
          bounty: Number(h.bounty ?? 0),
          candy: Number(h.candy ?? 0),
        }))
        .sort((a, b) => a.slot - b.slot);
    });
  }

  async ticket(wallet: string, code: string, purpose: 'clear' | 'visit') {
    return this.db.transaction(async (q) => {
      await q('DELETE FROM lane_tickets WHERE created<$1', [
        this.now() - H.TICKET_MS,
      ]);
      const [{ total }] = await q('SELECT COUNT(*) AS total FROM lane_tickets');
      if (Number(total) >= H.MAX_TICKETS)
        throw new Error('the street is busy. try again shortly');
      const [{ count }] = await q(
        'SELECT COUNT(*) AS count FROM lane_tickets WHERE wallet=$1 AND used=0',
        [wallet],
      );
      if (Number(count) >= 8)
        throw new Error('finish an open visit before starting another');
      const [row] = await q('SELECT * FROM lane_houses WHERE code=$1', [code]);
      if (!row || row.hidden) throw new Error('this door is closed');
      if (purpose === 'clear' && row.owner !== wallet)
        throw new Error('only the owner can clear a draft');
      const house = String(
          purpose === 'clear' ? row.draft : (row.published ?? ''),
        ),
        hash = String(
          purpose === 'clear' ? row.draft_hash : (row.published_hash ?? ''),
        );
      if (!house) throw new Error('this house is not published');
      decodeHouse(unpack(house));
      const id = randomId(),
        seed = randomBytes(4).readUInt32LE();
      await q(
        'INSERT INTO lane_tickets(id,wallet,code,hash,house,seed,purpose,created) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [id, wallet, code, hash, house, seed, purpose, this.now()],
      );
      return { id, seed, hash, house: unpack(house) };
    });
  }
  async finish(
    wallet: string,
    id: string,
    compressed: string,
    rawMic: unknown = [],
  ) {
    if (typeof compressed !== 'string' || compressed.length > H.RUN_BYTES)
      throw new Error('run is too large');
    const frames = unpack(compressed) as Frame[];
    return this.db.transaction(async (q) => {
      const [prior] = await q(
        "SELECT r.outcome,r.ticks,CASE WHEN t.purpose='clear' THEN 1 ELSE 0 END AS clear,COALESCE((SELECT SUM(amount) FROM lane_ledger WHERE id=$1),0) AS bounty FROM lane_runs r LEFT JOIN lane_tickets t ON t.id=r.id WHERE r.id=$2 AND r.wallet=$3",
        [`claim-${id}`, id, wallet],
      );
      if (prior)
        return {
          ...prior,
          clear: !!prior.clear,
          bounty: Number(prior.bounty),
          candy: Number(
            (
              await q('SELECT amount FROM scream_candy_credits WHERE id=$1', [
                `raid:${id}`,
              ])
            )[0]?.amount ?? 0,
          ),
          verified: true,
        };
      const [t] = await q(
        `UPDATE lane_tickets SET used=1 WHERE id=$1 AND wallet=$2 AND used=0 AND created>$3 RETURNING *`,
        [id, wallet, this.now() - H.TICKET_MS],
      );
      if (!t) throw new Error('visit expired or already submitted');
      const h = decodeHouse(unpack(String(t.house))),
        state = replay(h, Number(t.seed), frames);
      if (state.outcome === 'playing')
        throw new Error('finish the visit before submitting');
      if (
        this.now() - Number(t.created) + 1000 <
        (state.tick / H.TICK_HZ) * 1000
      )
        throw new Error('run arrived faster than real time');
      if (t.purpose === 'clear') {
        if (state.outcome !== 'escaped')
          throw new Error('escape with candy before publishing');
        const rows = await q(
          'UPDATE lane_houses SET clear_hash=$1 WHERE owner=$2 AND draft_hash=$3 RETURNING code',
          [String(t.hash), wallet, String(t.hash)],
        );
        if (!rows.length)
          throw new Error('the draft changed. clear the latest version');
      }
      const mic = micMarks(rawMic, state.tick);
      await this.recordRun(q, t, wallet, compressed, state);
      await q('UPDATE lane_runs SET mic=$1 WHERE id=$2', [
        JSON.stringify(mic),
        id,
      ]);
      const bounty =
        state.outcome === 'escaped' && t.purpose === 'visit'
          ? await this.economy.claim(
              q,
              String(t.code),
              wallet,
              String(t.hash),
              id,
            )
          : 0;
      const candy = t.purpose === 'visit' ? await this.candy.raid(q, id) : 0;
      return {
        verified: true,
        candy,
        bounty,
        outcome: state.outcome,
        ticks: state.tick,
        clear: t.purpose === 'clear',
      };
    });
  }
  private async recordRun(
    q: Query,
    t: Row,
    wallet: string,
    frames: string,
    s: ReturnType<typeof replay>,
  ) {
    const score = await scoreRun(q, t, wallet, s.outcome, s.tick, this.now());
    await q(
      'INSERT INTO lane_runs(id,wallet,code,hash,house,seed,frames,outcome,ticks,x,y,z,created,scored,points) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',
      [
        String(t.id),
        wallet,
        String(t.code),
        String(t.hash),
        String(t.house),
        Number(t.seed),
        frames,
        s.outcome,
        s.tick,
        s.pos.x,
        s.pos.y,
        s.pos.z,
        this.now(),
        score.scored,
        score.points,
      ],
    );
    await q(
      "UPDATE lane_runs SET frames='',house='' WHERE code=$1 AND frames<>'' AND id NOT IN (SELECT id FROM lane_runs WHERE code=$2 ORDER BY created DESC,id DESC LIMIT $3)",
      [String(t.code), String(t.code), H.REPLAYS_PER_HOUSE],
    );
  }
  async publish(wallet: string, hash: string) {
    return this.db.transaction(async (q) => {
      const [owned] = await q(
        'UPDATE lane_houses SET updated=updated WHERE owner=$1 RETURNING code',
        [wallet],
      );
      if (!owned) throw new Error('create your house first');
      await this.economy.frozen(q, String(owned.code));
      const [draft] = await q('SELECT draft FROM lane_houses WHERE owner=$1', [
        wallet,
      ]);
      const h = decodeHouse(unpack(String(draft.draft)));
      const a = await this.holdingAccount(q, wallet);
      if (
        (h.height ?? H.PLOT_H) > H.PLOT_H &&
        Number(a?.balance ?? 0) < H.HOLDER_MIN_BALANCE
      )
        throw new Error('holder balance is required to publish a taller plot');
      if (
        h.blocks.some((b) => BLOCKS[b].category === 'Cosmetic') &&
        !a?.premium
      )
        throw new Error(
          'unlock the cosmetic pack before publishing these blocks',
        );
      const rows = await q(
        'UPDATE lane_houses SET published=draft,published_hash=draft_hash,approved=0,updated=$1 WHERE owner=$2 AND draft_hash=$3 AND clear_hash=draft_hash AND hidden=0 RETURNING code',
        [this.now(), wallet, hash],
      );
      if (!rows.length)
        throw new Error('beat this exact draft before publishing');
      const [plot] = await q('SELECT tier FROM scream_plots WHERE code=$1', [
        String(rows[0].code),
      ]);
      if (plot) {
        if (!fitsPlot(h, Number(plot.tier)))
          throw new Error('keep your house inside the plot boundary');
        await this.candy.open(q, String(rows[0].code), wallet, hash);
      }
      return { code: String(rows[0].code) };
    });
  }
}
