# Build prompt: Let's Scream Together — Hollow Lane ($SCREAM)

You are building **Let's Scream Together: Hollow Lane**, a creepy pixel-block browser game for Halloween 2026.

Every player owns a plot on one pitch-black street and builds a haunted house out of blocks and scare props. Other players go trick-or-treating: they knock on a door, enter with only a flashlight, and try to reach the candy bowl and get back out. **Builders score by scaring visitors. Visitors score by escaping.** Houses are shared by code and link, so streamers can tour their viewers' houses.

The quality bar is a polished indie release: full-screen, moody, cohesive pixel art, and UI that looks designed. Nothing should look like a web page.

Build in the milestones in section 14. Finish each one with tests passing before starting the next. Target: playable public launch by **Oct 24, 2026**, Final Night event on **Oct 31, 2026**.

---

## 1. Reference project: CLUMSY

Clone `pwiftdev/CLUMSY` next to this repo (`../clumsy`). It is our previous shipped game on the same stack. Read its `README.md`, `docs/AUDIT.md` and `design_handoff_clumsy/README.md` first. Reuse its infrastructure and code quality; do not reuse its candy look.

| Need | Port or follow from CLUMSY |
| --- | --- |
| Layout | `src/` client, `shared/` rules and simulation used by client and server, `server/`, `tests/` |
| Build and deploy | `package.json` scripts (`dev`, `build`, `start`, `check`, `heroku-postbuild`), `vite.config.ts` proxy, `tsup` server bundle, `Procfile`, Node 26.x |
| Live street | Colyseus 0.18 rooms (`server/GameRoom.ts`, `server/index.ts`, `server/app.ts`), interpolation in `src/game/session.ts` |
| Hardening | `server/http-guard.ts`, `server/rate-limit.ts`, `server/room-capacity.ts`, origin checks, `TRUST_PROXY` |
| Rendering performance | `src/game/render-resolution.ts`, `src/game/idle-task.ts` |
| Audio | `src/lib/audio-engine.ts`, `src/lib/use-game-audio.ts`, `src/components/SoundSettings.tsx` |
| Wallet | `src/lib/wallet.tsx`, `src/lib/wallet-adapters.ts`, `src/components/WalletOptions.tsx`, wallet-auth signature in `server/house/auth.ts` |
| Token tab | `server/mobula.ts`, `server/market-cache.ts`, `src/screens/Token.tsx`, `src/components/TokenChart.tsx`, Copy CA, `TOKEN_MINT` |
| Money layer | `server/house/*`: house wallet, deposit scan with memos, crash-safe Postgres ledger, automatic payouts and refunds, mint safety checks |
| Quality gate | `eslint.config.js`, `.prettierrc.json`, Vitest, `.github/workflows/check.yml` |

---

## 2. Non-negotiables

1. **Original IP only.** No characters, mobs, textures, sounds or UI from Minecraft or any other game. The block style is generic; every texture is ours or licensed.
2. **One shared simulation.** Player movement, collision, props and monsters run from deterministic code in `shared/` with a fixed 60 Hz timestep and a seeded RNG. The same code runs in the browser and on the server.
3. **Anything that pays money is verified by the server.** Bounty wins are re-simulated server-side from the run's input log (section 9). Mic screams never affect money.
4. **60 fps on a mid-range laptop.** First load under 15 MB. A house loads in under 1 s.
5. **Every tunable number lives in `shared/config.ts`.**
6. **Licensed assets only,** listed in `docs/ASSETS.md`.
7. **`npm run check` passes** at the end of every milestone.

---

## 3. Stack

- Client: React 19, TypeScript, Vite, three.js r180, `postprocessing` (pmndrs) for a small post chain.
- Simulation: custom voxel AABB collision in `shared/` (no Rapier needed; voxel collision is simpler and deterministic).
- Server: Node 26, Express 5, Colyseus 0.18, `pg`, Heroku Postgres.
- Storage: house data and replays in Postgres (compressed), static assets from `ASSET_BASE_URL` (Cloudflare R2 + CDN) in production.
- Wallet and token: Solana adapters and house wallet as in CLUMSY.

---

## 4. World and data

### 4.1 The street
- One street, **Hollow Lane**, with 40 plots (20 per side) for v1. Configurable `PLOTS_PER_STREET`; when full, open Street 2.
- Plot size: **24 x 24 x 16 blocks** (`PLOT_W`, `PLOT_D`, `PLOT_H`). One block = 1 unit.
- The street itself is a fixed, hand-built map: cracked road, dead trees, iron fences, flickering street lamps, fog. Each plot has a front door the visitor walks up to.
- Plot order is a leaderboard: the top-scored houses sit nearest the entrance. Re-sort daily at a fixed time.

### 4.2 House format (`shared/house/format.ts`)
```ts
type HouseV1 = {
  v: 1;
  blocks: Uint8Array;      // PLOT_W*PLOT_D*PLOT_H block ids, run-length encoded on the wire
  rot: Uint8Array;         // 2-bit rotation per block that supports it (stairs, doors, signs)
  props: Prop[];           // max MAX_PROPS (default 40)
  spawn: Vec3i;            // inside the front door (fixed by the plot)
  candy: Vec3i;            // the candy bowl, exactly one
  title: string;           // max 32 chars, filtered
  signs: { pos: Vec3i; text: string }[]; // max 8, 48 chars each, filtered
};
```
- Validate on the server: size caps (compressed under 64 KB), one candy bowl, spawn reachable, prop limits, filtered text.
- Versioned schema with a migration function for future versions.

### 4.3 Blocks (v1: 30 types)
Every block is a 16x16 pixel texture in one atlas, rendered with `NearestFilter`. Categories:
- Structure: rotten planks, dark planks, stone brick, mossy brick, cracked stone, dirt, gravel, iron bars, glass (dirty), cobweb (slows), carpet (red, black).
- Shape: stairs, slab, door (opens), trapdoor (prop-controlled), fence, ladder.
- Light sources: candle, lantern, jack-o'-lantern, red candle, dying bulb (flickers).
- Decor: bookshelf, coffin, bones, portrait (eyes move when you look away), clock, pumpkin, gravestone, bloody sign.
- Special: **fake wall** (looks solid, walkable), **candy bowl** (one per house).

### 4.4 Scare props (v1: 6 types, `shared/props/`)
Each prop has a trigger (tripwire block, pressure plate, look-at, proximity, or timer after entering) and a cooldown/one-shot setting.
1. **Lurker:** a monster stands hidden in an alcove and lunges into the flashlight with a sting when triggered. Catches the visitor if they stay within 1.5 blocks for 0.8 s.
2. **Trapdoor:** floor opens; the visitor falls to the basement (a pit area that ends the run unless the builder placed a way back up).
3. **Slammer:** a door slams and locks behind the visitor for N seconds (2-10).
4. **Blackout:** all light sources in a radius go out for N seconds; flashlight flickers.
5. **Whisper:** positional sound (whisper, footsteps, scream, knock) from a chosen spot.
6. **The Follower:** a slow ghost that spawns and chases with grid A* pathfinding at 70% of visitor walk speed; touching it ends the run. Despawns after N seconds or when the visitor reaches light.

Props, monsters and their timings are deterministic given the seed and the input log.

---

## 5. Visiting (the core loop)

- Enter by knocking on a door on the street, or open a house link/code directly (`/h/K7Q2XA`).
- First-person camera. WASD, mouse look (pointer lock), Space jump, Shift crouch (quieter, slower), E interact, F flashlight on/off, Esc pause.
- **Flashlight:** a narrow cone spotlight with soft edge. Battery 180 s (`FLASHLIGHT_SECONDS`); recharges slowly while off. Batteries can be placed by builders as pickups (+60 s, max 3 per house).
- **Goal:** reach the candy bowl, grab candy (hold E 1 s), then return to the front door. Time limit 6 min (`VISIT_LIMIT_S`).
- **Fail:** caught by a Lurker or The Follower, fall into the pit with no exit, or time runs out.
- **Results:** escaped or caught, time, screams detected (if mic on), the spot where you died, and a "Rate this house" (1-5 skulls) plus Report.
- **Optional mic (opt-in, off by default):** Web Audio level detection with auto gain control disabled. A scream = level above threshold for at least 300 ms. Screams are timestamped into the run log for the owner's replay and the house's Scream Score. Mic audio is never recorded or uploaded, only the timestamps and peak level.
- **Co-op (stretch for M5):** up to 4 visitors in one house via a Colyseus room. Not required for launch.

---

## 6. Building

- Your plot opens in build mode from the street or the My House screen. Free-fly camera inside the plot bounds.
- Hotbar with block and prop palette, search, recently used. Place (left), remove (right), pick block (middle), rotate (R), undo/redo (Ctrl+Z / Ctrl+Y, 200 steps), fill and line tools.
- **Lights-on toggle** for building comfortably, **Preview darkness** to see it as visitors will.
- Prop editor panel: trigger type, target spot, delay, duration, one-shot vs repeat.
- **Publish requires a clear run:** the owner must beat their own house in visit mode (server-verified like a bounty run, section 9). Any change after publishing requires a new clear run before the change goes live.
- Autosave drafts to the server every 30 s and on exit.

---

## 7. The street hub (live multiplayer)

- A Colyseus `StreetRoom` (up to 100 players per room, shard into more rooms beyond that).
- Players appear as dim, slightly translucent pixel ghosts with their name above. Movement synced at 10 Hz with interpolation. No collision between players.
- Doors show the house title, owner, skull rating, Scream Score, and a glowing bounty marker if the house has one.
- Live street feed in the corner: "Dez escaped *The Butcher's Attic*", "*Nana's House* claimed its 50th victim", "Bounty of 250k $SCREAM claimed".
- Spectating: any player can watch another player's live visit from the street (a "peek through the window" view) using the run's input stream with a 5 s delay.

---

## 8. Scoring

- **Visitor score:** escapes, speed bonus, no-damage bonus, harder houses (lower escape rate) worth more.
- **House Scream Score:** visitors caught, screams caused (mic), average rating, unique visitors. Weighted so many honest visits beat a few farmed ones.
- Anti-farming: one scored visit per wallet per house per 24 h; visits under 15 s don't count; a house's own owner never scores on it.
- Leaderboards: Scariest Houses (daily, weekly, season), Best Escapers, Bounty Hunters.

---

## 9. Run verification and replays

- Every run records: house version hash, seed, the input log (per tick: movement bits, look yaw/pitch quantised, actions), and mic scream timestamps.
- Input logs are compressed and capped (6 min at 60 Hz).
- **Verification:** for publish clear runs, bounty claims and leaderboard runs, the server re-simulates the input log against the stored house and seed with the shared simulation and accepts only if the result matches (escaped with candy). Reject logs with impossible input rates or look speeds.
- **Replays:** the owner's My House screen lists recent visits; each plays back in-engine from the log, with markers where the visitor screamed and where they were caught. A death heatmap overlays the house.
- **Clip export (stretch):** record a replay segment to WebM with `MediaRecorder` from the canvas, with the logo watermark.

---

## 10. $SCREAM economy

Rule: **rewards come from real token flow (owner deposits, purchases, creator fees), never from minting.** Candy is an off-chain soft currency for cosmetics.

Ship behind `ECONOMY_MODE=off|test|live` (default `off`), reusing CLUMSY's `test` mode pattern with a built-in Test wallet and a pretend house wallet. `live` refuses to boot half-configured.

### 10.1 Bounty houses (headline feature)
- The owner deposits $SCREAM to the house wallet with a memo naming the house (CLUMSY deposit-scan pattern). The bounty shows on the door and the house page.
- The first verified escape (section 9) wins the whole bounty, paid automatically by the server to the winner's wallet. The ledger records the payout before broadcast, as in CLUMSY.
- Rules that protect visitors: the house is **frozen** (no edits) while a bounty is active; the owner can withdraw a bounty only after a 24 h notice period, during which it still pays out; minimum bounty `MIN_BOUNTY` in $SCREAM.
- The owner's own wallet, and wallets linked to it by recent transfers, cannot claim their own bounty.
- No entry fee to attempt a bounty, ever.

### 10.2 Tips
- From the results screen, a visitor can tip the owner. This is a direct wallet-to-wallet $SCREAM transfer the visitor signs, with a memo naming the house. The server verifies it on chain and shows it on the house page and owner dashboard. No custody.

### 10.3 Premium blocks and props
- A small set of premium blocks and prop skins unlocks for a wallet by paying $SCREAM to the house wallet (one-time). `PREMIUM_BURN_BPS` of each payment is sent to the burn/dead address in the same transaction or by the server afterwards, the rest goes to the weekly prize pool. Premium items are cosmetic variants; they never make a house harder than a free house can be.

### 10.4 Holder perks
- Wallets above `HOLDER_MIN_BALANCE` get: a larger plot height (24 instead of 16), +10 prop slots, a holder badge on the door. Balance checked at publish time and daily.

### 10.5 Weekly Scariest House pool and Final Night
- The weekly pool (premium payments plus any treasury top-up the team deposits) pays the top 3 houses by Scream Score each Sunday, automatically.
- **Final Night, Oct 31:** the season pool pays the top 10 houses and top 10 escapers. The street gets a special event skin for that night.

### 10.6 Safety
- Reuse CLUMSY's mint checks (refuse freeze authority and risky Token-2022 extensions), RPC key separation (`SOLANA_RPC_URL` private, `PUBLIC_SOLANA_RPC_URL` for browsers) and minimum house SOL balance.
- Exactly one server instance owns the house wallet (Postgres advisory lock, as in CLUMSY).
- Write `docs/ECONOMY.md` describing every flow, and list what still needs legal review before `live`.

---

## 11. Look, feel and UI

### 11.1 Art direction
- **Pixel blocks in near-total darkness.** Ambient light close to zero; the flashlight, candles and lamps are the only real light. Fog swallows anything more than ~12 blocks away.
- Lighting: Minecraft-style flood-fill block light (0-15) from light sources computed per house on load, combined with the dynamic flashlight spotlight. Per-vertex ambient occlusion on voxel faces.
- Post: very light film grain, vignette, slight chromatic aberration and screen shake on scares, low-resolution render option (`PIXEL_SCALE` 1-3) for an extra-crunchy look.
- Characters and monsters are low-poly blocky models with pixel textures, animated with simple bone rigs.

### 11.2 Brand tokens (from the logo: white pixel screaming face on black)
| Token | Value | Use |
| --- | --- | --- |
| `--void` | `#07070A` | backgrounds |
| `--ash` | `rgba(21,21,27,.88)` + `backdrop-filter: blur(12px)` + `1px solid rgba(237,230,216,.10)` | panels |
| `--bone` | `#EDE6D8` | main text, primary button fill (void text) |
| `--fog` | `#9A958C` | secondary text |
| `--blood` | `#C8102E` | danger, caught, bounty glow; one accent per screen |
| `--ember` | `#FF8A2B` | candles, candy, progress |
| `--spirit` | `#7FD8C8` | escaped, success, other players' ghosts |

- Fonts (self-hosted via `@fontsource`): **Silkscreen** for logo lockups, labels and HUD; **Anton** for big headings and numbers; **Inter** for body text.
- Pixel-perfect UI icons drawn on a 16 px grid. Panels with sharp 2-4 px corners. Buttons press down 2 px with an 80 ms snap.
- Copy voice: short caps headings, calm lowercase sentences, dry humour. "you got out." "the house got you." "someone left the lights off."

### 11.3 Screens (design at 1600x900, check 1280x720 and 2560x1440)
1. **Splash:** pixel logo assembles from noise, scream sting, "click to enter".
2. **Street hub:** first-person on Hollow Lane, doors with signs, live feed, top bar (logo, MY HOUSE / LEADERBOARD / $SCREAM, wallet pill, settings).
3. **House card** (when looking at a door): title, owner, skull rating, Scream Score, escape rate, bounty, KNOCK [E].
4. **Visit HUD:** flashlight battery, timer, candy status, mic indicator, minimal crosshair. Nothing else on screen.
5. **Caught / Escaped results:** big verdict, stats, rate, tip, report, NEXT DOOR.
6. **Builder:** hotbar, palette panel, prop editor, lights toggle, publish button with clear-run status.
7. **My House dashboard:** visitors, catches, screams, tips, bounty controls, replay list, heatmap.
8. **Replay viewer:** in-engine playback, timeline with scream and catch markers, speed controls.
9. **Leaderboards:** scariest houses, escapers, bounty hunters; your rank pinned.
10. **Wallet modal** and **$SCREAM token tab** (ported from CLUMSY, restyled).
11. **Settings:** graphics (pixel scale, render distance, shadows), audio, mic test with level meter, sensitivity, rebinding, reduced flashing.
12. **Admin moderation** (`/admin`, wallet allowlist): reported houses, hide/restore, ban.

---

## 12. Audio
- Positional Web Audio. Street ambience (wind, distant dogs, a church bell), in-house ambience per depth (creaks, drips), footsteps per block material, door sounds, prop stings, monster sounds, heartbeat when The Follower is near.
- Licensed or original sounds only; credits in `public/audio/CREDITS.md`.

---

## 13. Moderation
- Text filter on titles, signs and names.
- Report button on every house; `REPORT_AUTOHIDE` reports from distinct wallets hides it pending review.
- Houses enter the top 10 street spots only after a manual approval in `/admin`.
- Block-art filter: flag houses for review when they reach the top 50 by score.

---

## 14. Milestones and acceptance checks

**M1. Voxel engine and visiting (Oct 10-14).**
Chunked greedy meshing, texture atlas, block light, AO, flashlight, first-person controller with voxel collision, the 6 scare props, The Follower pathfinding, deterministic shared simulation, run recording.
Accept: three hand-made test houses in `shared/house/samples/` are fully playable; a recorded run re-simulates to the same result in a unit test; 60 fps in the darkest and busiest sample house.

**M2. Builder and publish (Oct 14-17).**
Build mode, tools, undo, prop editor, drafts, server validation, clear-run publish with verification.
Accept: a new player builds and publishes a house in under 10 minutes; an edited house can't go live without a new clear run.

**M3. Street, scoring, replays (Oct 17-20).**
Street room with ghosts, doors, house cards, links and codes, scoring with anti-farming, leaderboards, replays and heatmap, window spectating.
Accept: two browsers see each other on the street; one visits the other's house and the owner sees the replay with markers.

**M4. Economy in test mode, full UI and audio (Oct 20-23).**
Every screen in 11.3, all audio, wallet, token tab, bounties, tips, premium items, holder perks, weekly pool, all in `ECONOMY_MODE=test`.
Accept: in test mode, a bounty is deposited, claimed by a verified run and paid; a claim from the owner's wallet is refused; screenshots of every screen at 1600x900 and 1280x720 in `docs/screens/`.

**M5. Launch (Oct 23-24), then Final Night (Oct 31).**
Moderation tools, 15 seeded houses, load test (300 players on street rooms), Heroku deploy, `docs/OPERATIONS.md`, `docs/ECONOMY.md`. Switch `ECONOMY_MODE=live` only after the team signs off.
Accept: `npm run check` and `npm run build` pass; the deployed build plays build → publish → visit → replay end to end.

---

## 15. Deployment (Heroku)
- One web dyno serving the client and the Colyseus server, preboot off, `TRUST_PROXY=1`, `heroku-postbuild` runs the build, as in CLUMSY.
- Heroku Postgres: wallets, profiles, houses (current and draft), runs, replays (capped), scores, reports, ledger. Migrations run on boot. `/health` returns 503 until startup recovery completes.
- Static assets on R2 with cache-busted names. WebSocket keep-alive pings.
- `.env.example` documents every variable.

---

## 16. Working rules
- Follow CLUMSY's structure: plain data and simulation in `shared/`, rendering in `src/game/`, screens in `src/screens/`, components in `src/components/`.
- Write tests with each feature, especially simulation determinism, run verification, house validation and every economy flow.
- If something here conflicts with what you find, write the question in `docs/QUESTIONS.md` instead of guessing.
- At the end of each milestone, update `README.md` with what works, how to run it and what isn't done yet.
