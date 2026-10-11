import { H } from '../../shared/config';
import { plotTier, BLUEPRINTS } from '../../shared/house/plots';
import type { HollowDatabase, Query } from './database';
export class Plots {
  constructor(private db: HollowDatabase) {}
  async start() {
    await this.db.query(
      'CREATE TABLE IF NOT EXISTS scream_plots(slot INTEGER PRIMARY KEY,code TEXT NOT NULL UNIQUE,tier INTEGER NOT NULL,style INTEGER NOT NULL)',
    );
    for (let i = 0; i < 15; i++)
      await this.db.query(
        'INSERT INTO scream_plots(slot,code,tier,style) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [Math.floor(i / 3) * 8 + (i % 3), `HOLLOW${i + 1}`, 2, i % 3],
      );
  }
  async list() {
    return this.db.query(
      'SELECT slot,code,tier,style FROM scream_plots ORDER BY slot',
    );
  }
  async claim(q: Query, code: string, slot: number, style: number) {
    if (
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot >= H.PLOTS_PER_STREET * H.STREET_MAX_ROOMS ||
      !Number.isInteger(style) ||
      !BLUEPRINTS[style]
    )
      throw new Error('choose a valid plot and blueprint');
    const [prior] = await q('SELECT * FROM scream_plots WHERE code=$1', [code]);
    if (prior) {
      if (Number(prior.slot) !== slot || Number(prior.style) !== style)
        throw new Error('you already have a permanent plot');
      return { tier: Number(prior.tier), created: false };
    }
    const tier = plotTier(slot);
    if (tier > 0) throw new Error('holder plots are planned and locked');
    const rows = await q(
      'INSERT INTO scream_plots(slot,code,tier,style) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING slot',
      [slot, code, tier, style],
    );
    if (!rows.length)
      throw new Error('someone claimed that plot. Choose another');
    return { tier, created: true };
  }
}
