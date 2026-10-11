import { OutdoorSessions } from './outdoor-sessions';
import { plotLocation } from '../../shared/house/neighborhood';
import express from 'express';
import { nightReport } from './night-report';
import { H } from '../../shared/config';
import type { WalletAuth } from '../auth';
import type { Store } from '../store';
import { HollowDatabase } from './database';
import { LiveVisits } from './live-visits';
import { Social } from './social';
import { Moderation } from './moderation';
import { Houses } from './houses';
import { readPlayerProfile, savePlayerProfile } from './player-profile';
export async function hollowApi(
  store: Store,
  auth: WalletAuth,
  outdoor = new OutdoorSessions(),
) {
  const houses = new Houses(new HollowDatabase(store));
  await houses.start();
  await houses.db.transaction(async (q) => {
    const demos = await q(
      "SELECT code,owner,published_hash FROM lane_houses WHERE owner LIKE 'lane:sample:%' AND published_hash IS NOT NULL",
    );
    for (const h of demos)
      await houses.candy.open(
        q,
        String(h.code),
        String(h.owner),
        String(h.published_hash),
      );
  });
  const social = new Social(houses),
    live = new LiveVisits(houses);
  const moderation = new Moderation(houses);
  await moderation.start();
  const router = express.Router();
  router.use(express.json({ limit: H.RUN_BYTES }));
  router.use((_q, r, next) => {
    r.setHeader('Cache-Control', 'no-store');
    next();
  });
  router.post('/session', async (q, r) => {
    const wallet = auth.verify(q.body?.login);
    if (!wallet) {
      r.status(401).json({ error: 'invalid wallet signature' });
      return;
    }
    await moderation.allowed(wallet);
    r.json({ token: await houses.session(wallet), wallet });
  });
  router.get('/windows', (_q, r) => r.json(live.list()));
  router.get('/presence', (_q, r) =>
    r.json({
      players: outdoor.connectedCount(),
      streetCapacity: H.STREET_CAPACITY,
    }),
  );
  router.get('/windows/:id', async (q, r) =>
    r.json(await live.read(String(q.params.id))),
  );
  router.get('/economy', (_q, r) => r.json({ mode: houses.economy.mode }));
  router.get('/bounty/:code', async (q, r) =>
    r.json(await houses.economy.bounty(String(q.params.code))),
  );
  router.get('/feed', async (_q, r) => r.json(await social.feed()));
  router.get('/leaderboard', async (q, r) =>
    r.json(
      await social.leaderboard(String(q.query.kind), String(q.query.period)),
    ),
  );
  router.get('/stats/:code', async (q, r) =>
    r.json(await social.stats(String(q.params.code))),
  );
  router.get('/plots', async (_q, r) => r.json(await houses.plots.list()));
  router.get('/houses', async (_q, r) => r.json(await houses.list()));
  router.get('/houses/:code', async (q, r) =>
    r.json(await houses.publicHouse(String(q.params.code))),
  );
  router.use(async (q, r, next) => {
    try {
      r.locals.wallet = await houses.identity(
        q.headers.authorization?.replace(/^Bearer /, ''),
      );
      await moderation.allowed(r.locals.wallet);
      next();
    } catch (e) {
      r.status(401).json({ error: (e as Error).message });
    }
  });
  router.get('/profile', async (_q, r) =>
    r.json(await readPlayerProfile(houses.db, r.locals.wallet)),
  );
  router.put('/profile', async (q, r) =>
    r.json(await savePlayerProfile(houses.db, r.locals.wallet, q.body)),
  );
  router.post('/report', async (q, r) =>
    r.json(
      await moderation.report(
        r.locals.wallet,
        String(q.body?.code),
        String(q.body?.reason ?? ''),
      ),
    ),
  );
  router.post('/rate', async (q, r) =>
    r.json(
      await moderation.rate(
        r.locals.wallet,
        String(q.body?.code),
        q.body?.rating,
      ),
    ),
  );
  router.get('/admin', async (_q, r) =>
    r.json(await moderation.list(r.locals.wallet)),
  );
  router.post('/admin', async (q, r) =>
    r.json(
      await moderation.review(
        r.locals.wallet,
        String(q.body?.code),
        String(q.body?.action),
      ),
    ),
  );
  router.post('/stream', async (q, r) =>
    r.json(
      await live.push(
        r.locals.wallet,
        String(q.body?.id),
        q.body?.from,
        q.body?.frames,
      ),
    ),
  );
  router.get('/account', async (_q, r) =>
    r.json(await houses.economy.account(r.locals.wallet)),
  );
  router.post('/economy', async (q, r) =>
    r.json(
      await houses.economy.operate(
        r.locals.wallet,
        String(q.body?.action),
        String(q.body?.code),
        Number(q.body?.amount),
        String(q.body?.id),
      ),
    ),
  );
  router.get('/night-report', async (_q, r) =>
    r.json(await nightReport(houses, r.locals.wallet)),
  );
  router.get('/visits', async (_q, r) =>
    r.json(await social.visits(r.locals.wallet)),
  );
  router.get('/replay/:id', async (q, r) =>
    r.json(await social.replay(r.locals.wallet, String(q.params.id))),
  );
  router.get('/plot-holdings', async (_q, r) =>
    r.json(await houses.holdings(r.locals.wallet)),
  );
  router.get('/candy', async (_q, r) =>
    r.json(await houses.candy.status(r.locals.wallet)),
  );
  function requirePlotPosition(wallet: string, slot: number) {
    const state = outdoor.get(wallet);
    if (
      !Number.isInteger(slot) ||
      slot < 0 ||
      slot >= H.PLOTS_PER_STREET * H.STREET_MAX_ROOMS
    )
      throw new Error('Invalid plot');
    const p = plotLocation(slot % H.PLOTS_PER_STREET).approach;
    if (
      !state.connection ||
      state.life.street !== Math.floor(slot / H.PLOTS_PER_STREET) ||
      !state.life.canInteract(Date.now()) ||
      Math.hypot(state.life.x - p.x, state.life.z - p.z) > 5
    )
      throw new Error('Walk to the plot sign. Leave combat first.');
  }
  router.post('/plots', async (q, r) => {
    requirePlotPosition(r.locals.wallet, q.body?.slot);
    r.json(
      await houses.claimPlot(r.locals.wallet, q.body?.slot, q.body?.style ?? 0),
    );
  });
  router.post('/build-access', async (_q, r) => {
    const own = await houses.owned(r.locals.wallet);
    if (!own.plot) throw new Error('Claim a free plot first');
    requirePlotPosition(r.locals.wallet, own.plot.slot);
    r.json(own);
  });
  router.get('/mine', async (_q, r) =>
    r.json(await houses.owned(r.locals.wallet)),
  );
  router.put('/mine', async (q, r) =>
    r.json(
      await houses.withPlot(
        await houses.save(
          r.locals.wallet,
          q.body?.house,
          String(q.body?.expected ?? ''),
        ),
      ),
    ),
  );
  router.post('/ticket', async (q, r) => {
    if (!['clear', 'visit'].includes(q.body?.purpose))
      throw new Error('invalid visit type');

    if (q.body.purpose === 'visit') {
      const [plot] = await houses.db.query(
        'SELECT slot FROM scream_plots WHERE code=$1',
        [String(q.body.code)],
      );
      if (!plot) throw new Error('No public door here');
      requirePlotPosition(r.locals.wallet, Number(plot.slot));
    }
    r.json(
      await houses.ticket(r.locals.wallet, String(q.body.code), q.body.purpose),
    );
  });
  router.post('/finish', async (q, r) =>
    r.json(
      await houses.finish(
        r.locals.wallet,
        String(q.body?.id),
        q.body?.frames,
        q.body?.mic ?? [],
      ),
    ),
  );
  router.post('/publish', async (q, r) => {
    const own = await houses.owned(r.locals.wallet);
    if (!own.plot) throw new Error('choose a permanent plot first');
    r.json(await houses.publish(r.locals.wallet, String(q.body?.hash)));
  });
  router.use(
    (
      e: Error,
      _q: express.Request,
      r: express.Response,
      _next: express.NextFunction,
    ) => {
      if (r.headersSent) {
        _next(e);
        return;
      }
      const code = (e as Error & { code?: string }).code ?? '';
      const internal =
        e instanceof TypeError ||
        /^(ERR_SQLITE|[0-9A-Z]{5}$|ECONN|ETIMEDOUT)/.test(code);
      r.status(internal ? 500 : 400).json({
        error:
          !internal && e.message.length < 160
            ? e.message
            : 'could not process this request',
      });
    },
  );
  return { router, houses };
}
