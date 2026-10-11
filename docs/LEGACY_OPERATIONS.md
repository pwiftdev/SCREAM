# Local operation

Requires Node 26. No external infrastructure is required.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Vite and the game process both bind to loopback. The production bundle can also be tested locally:

```sh
npm run build
npm start
```

Then open http://127.0.0.1:2567. Do not set `NODE_ENV=production` for bot practice: that disables practice rooms. Stop a process with Ctrl+C. Do not run both game servers on port 2567 at once.

## Play

Click to enter and unlock audio. Choose a role and character, then Step Inside. The host sees the room code. A second browser window can enter that code and choose the other role. Start the night when everyone is connected. The local default fills empty seats with up to four development bots; `?bots=0` disables them and `?bots=3` leaves room for a second human. Bots never enter verified role-queue matches.

- WASD: move relative to the camera; click the world for mouse look.
- Shift: walk. Ctrl: crouch. E: hold the nearby interaction; struggle when carried.
- Space: skill check. Q: Scream Together, once per survivor per match.
- Killer: left mouse to lunge/attack, right mouse for Hush.
- Esc: pause menu. A networked match continues while paused.

Repair the required generators, hold a gate switch, and reach an open exit. Nearby teammates can heal, revive and rescue each other. The killer can pick up downed survivors, take them to cages, kick generators, break pallets and search lockers. Match rules and timings are in `shared/config.ts`.

A single match can run at a time. Spectating is anonymous and delayed 10 seconds. The free camera uses WASD, Q/E for height and mouse look after clicking the world. Crowd reactions do not affect gameplay.

## Profiles, queues and scores

Use Connect Wallet → Local Test Profile for an actual signed, zero-fund development identity. Phantom, Solflare and wallet-standard wallets use a free message signature. No transaction is requested. A role queue needs five people, or a killer plus three survivors after 90 seconds. Selected players must accept the 10-second ready check. Queue positions are kept while a match is running; queued players can watch its delayed stream.

SQLite at `data/scream.sqlite` stores local profiles and verified-match points. Practice never changes the leaderboard. Optional `DATABASE_URL` selects Postgres instead. The schema is installed on startup. This local build does not recover an in-progress match after a server restart; clients must requeue. Transport drops and page reloads keep seats for 30 seconds while the server remains up. Scores already written are deduplicated by match and wallet.

Back up the SQLite database with the server stopped, including any `-wal`/`-shm` sidecars if present. Use a local disposable database for Postgres validation. Never point local tests at an existing application's database.

## Offline defaults

`REWARDS_MODE=off` is the default and is the setting for this review. There is no paid entry or transfer endpoint. Leave all reward and provider settings unchanged until local approval. The optional holder balance reader makes no requests unless `ALLOW_EXTERNAL_DATA=true`, a mint and an RPC endpoint are explicitly configured. Market information remains unavailable offline rather than showing invented prices.

The environment example documents configuration. No secrets belong in browser variables. The server returns only public token/asset settings to the client.

## Verification

```sh
npm run check
npm run build
npm run test:e2e
```

The checks include type checking, lint, rule and real-room tests, signed queues, 128 delayed spectators, persistence and direct Prettier checking. Browser tests cover two windows plus bots at 1600×900, 1280×720 and 2560×1440. They save screenshots to `docs/screens/`. On macOS they use native Chromium with Metal; Linux CI uses headless Chromium. Run `npx playwright install chromium` if the browser is missing.

`node scripts/test-postgres.mjs` creates a fresh local Postgres cluster, runs the opt-in database test and stops/removes only that temporary cluster. It requires the PostgreSQL CLI tools.

Add `?perf=1` for FPS, draw calls, triangle count and actual adaptive render scale. Measurements depend on the GPU and active tabs. `node scripts/performance.mjs` samples the native menu on macOS.

## Public hosting remains deferred

No deployment, cloud account, public server, paid API, funds, or commits were created. The Procfile and build script are preparation only. The server intentionally binds to loopback. A public release requires the user's local review first, followed by explicit host/origin configuration, asset/audio acceptance, device performance review, wallet-extension testing and a production security review. The adapted CLUMSY reward path remains switched off.

## Deferred reward system

The house module adapts CLUMSY’s dedicated Postgres advisory-lock connection and persist-before-broadcast transfer recovery. It pays the top survivor and killer for each completed UTC day, using deterministic wallet ordering to break ties. Results have a finish timestamp and role; old migrated rows with no timestamp are excluded. Reward identities include day and role, so polling and restarts cannot enqueue the same award twice.

`REWARDS_MODE=test` uses a separate Postgres ledger slot and a local simulated transfer port. It never calls an RPC or loads a house key. `REWARDS_MODE=live` additionally requires `ALLOW_EXTERNAL_DATA=true`, `SOLANA_RPC_URL`, a server-only `HOUSE_SECRET_KEY` JSON byte array and positive `NIGHTLY_REWARD_LAMPORTS`. It is implemented for later review, not activated now. The amount is the SOL base-unit reward per winning role; there are no entry payments or pots.

The worker holds one dedicated database connection, stops on ownership loss, persists signed transaction bytes before broadcast and reconciles historical finalized signatures after interruption. Only a finalized failed transaction, or an expired transaction absent in two historical reads, may be replaced. A storage failure requires a process restart. `/health` returns 503 if enabled reward recovery is unhealthy. Preserve the reward ledger when restoring backups; restoring old monetary data after a transfer requires reconciliation, not blind replay.

Local validation covers concurrent workers, terminated Postgres ownership, durable signed records, pre-send failure, uncertain broadcast outcomes, expiry rechecks and post-ack write failure. No live-chain payment has been validated or authorized.
