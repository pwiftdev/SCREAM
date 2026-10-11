# Let’s Scream Together: operation

Use Node 26. Run `npm ci`, then `npm run dev`. Open **http://127.0.0.1:5173**. Both processes bind to loopback. No account, public service, wallet extension or funds are needed to explore and build. The original fairground remains at `/legacy`; its instructions are in [LEGACY_OPERATIONS.md](LEGACY_OPERATIONS.md).

## Play and build

Enter the neighborhood, walk off the road into the woods, and follow paths to the cemetery, chapel, orchard and last light. The outdoor map spans 410 × 590 units, with 40 plots per street and 15 seeded houses. Interiors are separate visit instances; the outdoor neighborhood is continuous. The chapel is an outdoor landmark, not a visit interior.

- Outdoors: WASD move, mouse look (drag if pointer capture is unavailable), Shift sprint, E search or knock, Q scream, hold V with the microphone enabled, M map, 1–9/wheel hotbar, Esc menu.
- Inside: WASD move, Space jump, Shift sprint, Ctrl crouch, F flashlight, hold E at a stash, then return to the entrance. Esc pauses your local visit.
- My House: open the builder, edit blocks, signs and scares, save, then Test Raid. Only that exact server-verified draft can publish. Draft changes do not replace the existing public version until cleared and published.
- Builder: left place, right remove, middle pick, R rotate, Alt + drag look, WASD fly, Space/Shift height. Block, line, fill, undo and redo are available. Use the advanced work light to inspect geometry; test raids always use the actual night lighting.
- Windows: view recent live visits with a five-second delay. My House stores visitor replays with scream markers and a death heatmap.

Microphone detection is optional and off initially. It uploads timestamps and peak levels only. Browser microphone permission still requires the player's choice. Settings include volume, sensitivity, graphics, key bindings and reduced flashing.

## Storage and restart

SQLite at `data/scream.sqlite` is the default. Optional `DATABASE_URL` selects Postgres; use only a disposable local database for tests. Schemas are created at startup. Published houses, drafts, runs, moderation and pretend-token operations persist. Street players, loose-candy session banks and live window buffers are temporary and do not recover after restart. Loose candy is separate from simulated token credits; it also resets at the four-hour session dawn.

Drafts autosave every 30 seconds, on explicit builder exit and when the page becomes hidden. A device backup protects unsaved edits across a crash. Recovery applies only while the server version still matches its base; another window's saved version wins. Device storage can be disabled or full, so the builder shows a warning and retains the in-memory draft. Browser shutdown cannot guarantee an in-flight request completes.

Stop the server before backing up SQLite; include WAL/SHM sidecars if present. Never blindly restore an old monetary ledger into a future real-money environment. Local test balances are fictional.

## Moderation

Set `ADMIN_WALLETS` to comma-separated public wallet addresses for local admin testing, then sign in with one of those identities and open `/admin`. The default empty allowlist grants nobody access. Five distinct reports hide a house; repeated reports from one profile do not count twice. Admins can approve, hide, restore or ban an owner. A ban revokes active sessions. Block art requires human review; there is no automatic offensive-shape detector.

## Verification and packaged build

```sh
npm run check
npm run build
npm run test:e2e
npx tsx scripts/load-hollow.ts
npx tsx scripts/profile-hollow.ts
node scripts/test-postgres.mjs
```

Run Prettier directly after scripts regenerate JSON reports. Browser screenshots are saved under `docs/screens/`. The load script uses a temporary loopback server and 300 SDK clients in three rooms; it does not measure 300 browser renderers. The profile script serves the built assets on temporary loopback port 2568, measures five scenes, and closes its browser and in-memory backend. Native browser performance is machine-specific. The PostgreSQL script creates and removes only its temporary local validation cluster; PostgreSQL CLI tools must already be installed.

After stopping the development backend, `npm start` serves the built game at **http://127.0.0.1:2567**. Do not run two backends on that port. House links and `/admin` work in the packaged server.

## Economy boundary

`ECONOMY_MODE=off`, `REWARDS_MODE=off` and `ALLOW_EXTERNAL_DATA=false` are the defaults. Market data shows unavailable when external data is disabled. The candy treasury is always a local simulation with a finite fixture; no real payments are enabled. Use `ECONOMY_MODE=test` only to grant pretend holding balances for larger-plot testing. Let’s Scream Together's `live` mode intentionally refuses startup because its on-chain integration and release review are unfinished.

The owner authorized GitHub push, Heroku hosting, a running dyno and a database on 11 October 2026. This does not enable real-money rewards. See [ECONOMY.md](ECONOMY.md) for the money boundary and [AUDIT.md](AUDIT.md) for evidence and remaining work.

`npm run test:e2e` builds the game and runs browser checks against a disposable, in-memory server on loopback port 2568. It serves the packaged game and mounts source-module middleware for the low-level audio/animation checks. It closes that server afterward and does not claim plots in the developer’s saved neighborhood. Port 2568 must be free. The optional direct `npx playwright test` command still targets the active development server.

## Heroku hosting

App: `lets-scream-together`, EU region, Heroku-24, Node 26. Public URL: <https://lets-scream-together-63d5be671be9.herokuapp.com/>. One Basic web dyno and one Essential-0 PostgreSQL database cost approximately $12/month before tax at the listed plan rates.

`PUBLIC_ORIGIN` is the exact HTTPS app origin. `ALLOW_GUEST_PROFILES=true` enables the existing signed browser profile flow without a wallet extension. It does not grant admin rights or enable rewards. `TRUST_PROXY=1` trusts the Heroku router's appended client address. `DATABASE_SSL=heroku` enables TLS with Heroku's provider-managed certificate handling only on the database pool; all other TLS verification remains unchanged. `DATABASE_URL` is managed by the attached add-on and must never be committed or printed.

`npm run build` runs during deployment and `npm start` binds to `0.0.0.0:$PORT`. Heroku startup refuses ephemeral SQLite storage. Runtime assets are included; `.slugignore` excludes original source packs and documentation from the deployment archive. Keep exactly one web dyno: street rooms, combat state and live visit buffers are held in that process. PostgreSQL retains profiles, house drafts, published houses, runs and sessions across restarts. A restart disconnects players and resets outdoor session state.

Guest sessions currently expire after 24 hours and browser signing keys are in memory. This existing playtest account limitation needs durable guest identity before a long-term player launch. Real-wallet profiles can authenticate again with their existing key. Clearing browser data removes a guest's saved session.

Deploy with `git push heroku main`; check `heroku ps --app lets-scream-together` and `/health`. Run `SCREAM_TEST_BASE_URL=https://lets-scream-together-63d5be671be9.herokuapp.com node scripts/production-smoke.mjs` for two-browser entry, multiplayer count, compact HUD, map and session reload checks. Set `SCREAM_SMOKE_RESTART_APP=lets-scream-together` only during a planned restart test; it disconnects all current players. Do not run database test fixtures against the hosted database.
