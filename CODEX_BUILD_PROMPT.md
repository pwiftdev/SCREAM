# Build prompt: Let's Scream Together ($SCREAM)

You are building **Let's Scream Together**, a 5 vs 1 asymmetric horror game that runs fully in a desktop browser. Five survivors repair generators to power two exit gates while one killer hunts them through a haunted fairground at night. One match is live at a time; everyone else spectates or waits in the queue.

The bar is high: it must look and feel like a game you would find on Steam or the Epic Games Store. Full-screen, cinematic, polished UI. No web-page look anywhere.

Work in milestones (section 13). Finish each milestone fully, with tests passing, before starting the next.

---

## 1. Reference project: CLUMSY

Clone `pwiftdev/CLUMSY` next to this repo (`../clumsy`). It is our previous game, shipped on the same stack, and it is the reference for infrastructure, code quality and UI craft. Read its `README.md`, `docs/AUDIT.md` and `design_handoff_clumsy/README.md` before writing code.

Reuse its patterns and, where it fits, port its code (adapting names and rules):

| Need | Port or follow from CLUMSY |
| --- | --- |
| Project layout | `src/` (client), `shared/` (rules, config, physics shared by client and server), `server/`, `tests/` |
| Build and scripts | `package.json` scripts (`dev`, `build`, `start`, `check`, `heroku-postbuild`), `vite.config.ts` proxy, `tsup` server bundle, `Procfile`, Node 26.x |
| Authoritative multiplayer | `server/GameRoom.ts`, `server/index.ts`, `server/app.ts`, Colyseus 0.18 |
| One live match + waiting players | `server/EarnRoom.ts`, `server/match-queues.ts` (one concurrent match, waiting retries) |
| Spectators | `server/WatchRoom.ts` (64 per room, snapshot subscription, rate-limited sync) |
| Prediction and interpolation | `src/game/prediction.ts`, `src/game/session.ts`, `shared/movement.ts` |
| Server hardening | `server/http-guard.ts`, `server/rate-limit.ts`, `server/room-capacity.ts`, origin checks, `TRUST_PROXY` |
| Rendering performance | `src/game/render-resolution.ts`, `src/game/idle-task.ts`, instancing and batching approach in `src/game/course/batch.ts` |
| Audio | `src/lib/audio-engine.ts`, `src/lib/use-game-audio.ts`, `src/components/SoundSettings.tsx` |
| Wallet | `src/lib/wallet.tsx`, `src/lib/wallet-adapters.ts`, `src/components/WalletOptions.tsx` (Phantom, Solflare, wallet-standard/Backpack, dev-only Test wallet) |
| Token tab | `server/mobula.ts`, `server/market-cache.ts`, `src/screens/Token.tsx`, `src/components/TokenChart.tsx`, Copy CA |
| Optional money layer | `server/house/*` (house wallet, crash-safe Postgres ledger). Port it but keep it **switched off** (section 11). |
| Fonts and assets | Self-hosted fonts via `@fontsource/*`, audio credits file `public/audio/CREDITS.md` |
| Quality gate | `eslint.config.js`, `.prettierrc.json`, `vitest`, `.github/workflows/check.yml` |

Do not copy CLUMSY's look (candy colours, jelly characters, banana buttons). Copy its craft: full-bleed 3D behind glass panels, panels anchored to screen edges, consistent tokens, spring-free but deliberate motion, key-cap hints, and every screen designed at 1600x900 and scaled with the viewport.

---

## 2. Non-negotiables

1. **Original IP only.** The game is inspired by the asymmetric horror genre. Do not use names, characters, maps, perks, UI layouts, icons, sounds or text from Dead by Daylight or any other game, and nothing from the Scream film franchise (including the Ghost Face mask). Generic genre mechanics (generators, pallets, windows, exit gates) are fine.
2. **Server-authoritative everything.** Clients send inputs and intents only. The server decides movement, hits, repairs, skill-check results, cages, escapes and results.
3. **No hidden information leaks.** A client must never receive data its player is not allowed to see (section 6.4). Spectators get full data, delayed by 10 s.
4. **60 fps on a mid-range laptop at the Medium preset.** Under 60 MB downloaded before the first match.
5. **Every tunable number lives in `shared/config.ts`.** No magic numbers in game logic.
6. **Licensed assets only**, each listed in `docs/ASSETS.md` and credits files.
7. **`npm run check` passes** at the end of every milestone.

---

## 3. Stack

- Client: React 19, TypeScript, Vite, three.js r180, `postprocessing` (pmndrs), `three-mesh-bvh` for raycasts, GLTF with Meshopt compression and KTX2 textures.
- Physics: `@dimforge/rapier3d-compat`, shared between client and server (kinematic character controllers).
- Server: Node 26, Express 5, Colyseus 0.18, `pg`.
- Wallet: Solana wallet adapters as in CLUMSY.
- Tests: Vitest + Testing Library + jsdom; real HTTP/WebSocket clients for room tests.
- Hosting: Heroku, one web dyno (client served by the same Node process), Heroku Postgres. Large assets on an S3-compatible CDN bucket (Cloudflare R2), configured by `ASSET_BASE_URL`.

---

## 4. Game rules (put all values in `shared/config.ts`)

### 4.1 Roles and win conditions
- 5 survivors, 1 killer. Survivors who escape through a gate score an escape. The killer scores each survivor taken.
- Minimum to start: 1 killer + 3 survivors after a 90 s wait. With fewer than 5 survivors, generators required = survivors + 1.

### 4.2 Generators
| Key | Value |
| --- | --- |
| `GENERATOR_SPOTS` | 9 fixed spots, all active |
| `GENERATORS_REQUIRED` | 6 (or survivors + 1) |
| `REPAIR_SECONDS_SOLO` | 75 |
| `REPAIR_MULTIPLIER` | [1, 1.8, 2.4, 2.8] for 1-4 survivors on one generator |
| `SKILL_CHECK_INTERVAL` | random 8-14 s per repairing survivor |
| Skill check | needle sweeps a ring; great zone +2% progress, good zone 0, miss −10% and a loud noise event the killer hears and sees (marker for 3 s) |
| Killer kick | killer can kick a partly repaired generator: it loses 5% at once and regresses 0.25%/s until a survivor touches it |

Skill checks are server-timed: the server sends `skillCheck {id, startAt, zoneStart, zoneEnd, durationMs}`, the client sends the press time, the server judges it with a latency allowance (`SKILL_CHECK_LATENCY_MS`, default 120).

### 4.3 Health and cages
- States: `healthy → injured → downed → carried → caged(1) → caged(2) → taken`. Also `escaped`.
- Hit: healthy → injured, injured → downed. Survivor gets +50% speed for 2 s. Killer has a 2.7 s cooldown after a hit (1.1 s after a miss).
- Heal: self 32 s, by teammate 16 s (injured → healthy). A teammate can pick up a downed survivor in 16 s (downed → injured).
- Bleed-out: 180 s downed → taken.
- Carry: killer picks up a downed survivor (1.5 s). The survivor struggles; at 16 s of struggle they break free (→ injured). A pallet stun or a Scream Together stun on the killer also frees them.
- Cages: 6 in the map. Stage 1 lasts 60 s, stage 2 lasts 60 s, then taken. A survivor caged for the third time is taken at once. A teammate rescues with a 1.5 s hold; the rescued survivor gets 10 s of speed and goes to injured. The killer cannot re-cage the same survivor from the same cage for 10 s.

### 4.4 Movement and chase
| Key | Value |
| --- | --- |
| Survivor run / walk / crouch | 4.0 / 2.3 / 1.4 m/s |
| Killer | 4.6 m/s, 0.75 m/s slower while carrying |
| Killer lunge | hold attack: +40% speed for 0.6 s, range 3.0 m arc 60° |
| Window vault | survivor fast 0.5 s (running), normal 0.9 s; killer 1.7 s |
| Pallets | 12-16 per match; survivor drops in 0.4 s; stuns killer 2 s if within the drop volume; killer breaks a dropped pallet in 2.6 s; survivors vault dropped pallets |
| Lockers | 8; one survivor each; entering while seen reveals the locker to the killer |
| Dread radius | 32 m: survivors hear a heartbeat that rises as the killer closes in |

### 4.5 The killer: The Hollow
Original character: very tall, stitched burlap face with a crude scream sewn into it, long coat, rusted carnival bell on his belt, cleaver. He is **not** a masked slasher in a hood.
- First-person camera with visible arms and cleaver.
- Power **Hush** (key: right mouse): 10 s with no heartbeat and no bell; 40 s cooldown. HUD shows charge.
- His bell rings for everyone when he breaks a pallet or cages a survivor.
- Sees survivor scratch marks (short-lived ground marks behind running survivors) and pools of blood behind injured survivors.

### 4.6 Survivors
Five original characters, cosmetic differences only (same hitbox, speed and abilities): Mara, Dez, Ollie, Juniper, Teo. Third-person over-the-shoulder camera.

### 4.7 Scream Together (signature mechanic)
- Two or more survivors within 6 m of each other press **Q** within the same 1 s window.
- If the killer is within 12 m with line of sight to at least one screamer, he is stunned and blinded for 3 s + 0.5 s per screamer after the second.
- Cost: every screamer is revealed to the killer through walls for 6 s.
- Once per survivor per match. HUD shows a "Q" charge and, when a teammate presses Q nearby, a 1 s pulse inviting you to join.
- Full-screen audio moment: layered screams, slow-motion audio dip, white flash for the killer.

Survivors also scream (positional audio) when hit, downed, picked up and caged. Those screams show the killer a marker for 2 s.

### 4.8 Endgame
- When `GENERATORS_REQUIRED` are done: siren, gates get power, gate lights turn red.
- Gate switch: 20 s hold, progress kept if interrupted.
- When the first gate opens, **Dawn Collapse** starts: 120 s, then anyone still inside is taken. A hard match cap of 15 min starts Dawn Collapse automatically.
- Match ends when all survivors have escaped or been taken.

### 4.9 Points
Four categories, shown on the results screen: Survival, Repair, Rescue, Hunt (killer). Award points for repairs, great skill checks, heals, rescues, chases survived, escapes; killer for hits, downs, cages, takes, pallets broken. Store per wallet in Postgres. Display a season leaderboard.

---

## 5. Map: Rotten Hollow Fairground

- About 90 x 90 m playable, surrounded by a cornfield wall and fog. No invisible walls without a visible reason.
- Landmarks: central dead carousel, two-floor haunted-house ride, collapsed Ferris wheel, pumpkin-patch hedge maze, food stalls, ring of caravans.
- Placement data in `shared/maps/rotten-hollow.ts` as plain data (spots, volumes, colliders), like CLUMSY's `shared/course/`. Server and client read the same data.
- Seeded per match: which pallet spots are active, which locker spots, spawn points. Generators: 9 fixed spots.
- Chase design: 6-8 "loops" (a pallet or window with a short obstacle you can circle), spaced so no two strong loops are within 20 m.
- Lighting: moon key light with soft shadows, height fog, sodium-orange flickering string lights, generators light up progressively as they're repaired, red gate lights when powered.
- Interactables get a soft outline and a key prompt when in range.
- Build the greybox first (milestone 1) from primitives, then replace with art (milestone 3).

---

## 6. Multiplayer architecture

### 6.1 Rooms
- `MatchRoom`: the one live match. Max 6 players. Simulation at 30 Hz (`setSimulationInterval`), snapshots to each client at 20 Hz.
- `QueueRoom` (or HTTP + a lightweight room): role queues (survivor, killer, fill), ready check, queue position, holder priority.
- `WatchRoom`: spectators, up to 64 per room; spin up additional watch rooms fed from the same match buffer when full.

### 6.2 Queue
- Separate survivor and killer queues plus "fill". When 1 killer + 5 survivors are available, run a 10 s ready check. Decliners go to the back.
- If 5 survivors wait 60 s with no killer, offer the killer seat to the longest-waiting fill player, then survivors.
- After 90 s, start with 1 killer + 3 or 4 survivors.
- Holder priority (section 11): wallets above `HOLDER_MIN_BALANCE` are placed ahead of non-holders who joined within the last 5 minutes. Never skip a non-holder more than once.
- While a match is live, queued players are spectators.

### 6.3 Netcode
- Client-side prediction for your own movement, server reconciliation (follow CLUMSY `prediction.ts`).
- Interpolate other players 100 ms behind.
- Lag compensation for killer attacks: keep 1 s of survivor capsule history; rewind up to `MAX_REWIND_MS` (150) to the attacker's input time to judge the hit.
- Interactions (repair, heal, rescue, gate, vault, pallet) are server-validated: distance, facing, state, cooldowns.
- Disconnect: hold the seat 30 s. After that a survivor counts as taken, a killer forfeits (survivors win).
- Rate-limit and validate every message (bounded floats, enums, tick numbers).

### 6.4 Visibility filtering (anti-cheat)
Build each client's snapshot on the server for that client:
- **Killer receives** a survivor's position only if: line of sight within 60 m, or within a reveal effect (Scream Together reveal, noise marker, scream marker), or carried by him. Otherwise he receives nothing about that survivor except state (healthy/injured/...) for the HUD. Scratch marks and blood are sent as world events.
- **Survivor receives** the killer's position only with line of sight within 60 m or within 12 m. During Hush, no heartbeat data. Teammates' positions always (allies), plus states.
- Locker occupancy is never sent to the killer.
- **Spectators** receive full snapshots delayed by `SPECTATOR_DELAY_MS` (10000).
Unit-test the filter: a killer behind a wall must get no survivor coordinates.

---

## 7. Rendering and art direction

**Stylized horror with cinematic lighting.** Chunky readable silhouettes, PBR materials, strong light and shadow, heavy fog. Think of a premium indie horror game, not photorealism.

- Post-processing chain (pmndrs `postprocessing`): SMAA, bloom (generators, gate lights, string lights), filmic tone mapping, colour grading LUT (cold blue night, warm sodium highlights), vignette, film grain, chromatic aberration only on damage. Depth of field in menus only.
- Shadows: one moon directional light with cascaded or fitted shadow map; flickering point lights limited to 4 shadow-casting at once (pick nearest to camera).
- Fog: exponential height fog, denser at the cornfield edge.
- Characters: skinned GLB, about 15-25k triangles each, shared animation set (idle, walk, run, crouch walk, vault fast, vault slow, repair loop, heal loop, injured run, downed crawl, carried struggle, caged idle, rescue, gate switch, hit react, scream, locker in/out). Killer: idle, walk, lunge, attack, wipe, kick generator, pick up, carry walk, cage drop, pallet break, stunned, blinded.
- Quality presets: Low, Medium, High, Ultra (shadow resolution, post effects, render scale, light count). Auto-pick on first run from a short GPU benchmark; adaptive render scale as in CLUMSY.
- Performance budget at Medium: under 150 draw calls and 400k visible triangles; instancing for corn, fences, bulbs, pumpkins.
- Asset loading: a menu bundle first, then stream the map in the background while the player sits in the menu or queue.

---

## 8. UI system

### 8.1 Principles
- Every screen is full-bleed 3D with UI layered on top. No scrolling pages, no browser-looking forms.
- Designed at 1600x900, scaled with `clamp()` like CLUMSY's root font size. Panels anchored to edges with a 40 px safe margin.
- Pointer lock in matches; Esc opens the pause menu.
- Every action has a key hint shown as a key cap.
- Motion: panels enter with 220-320 ms ease-out slides and fades. No bounce. Danger uses screen shake, a red vignette pulse and short chromatic aberration.

### 8.2 Tokens (CSS custom properties)
Derived from the logo: a white pixel-art screaming face on black.

| Token | Value | Use |
| --- | --- | --- |
| `--void` | `#07070A` | backgrounds |
| `--ash` | `rgba(21,21,27,.88)` + `backdrop-filter: blur(14px)` + `1px solid rgba(237,230,216,.10)` | panels |
| `--bone` | `#EDE6D8` | main text, primary button fill (ink text `#07070A`) |
| `--fog` | `#9A958C` | secondary text |
| `--blood` | `#C8102E` | danger, killer, hits; the one accent per screen |
| `--ember` | `#FF8A2B` | generators, progress, power |
| `--spirit` | `#7FD8C8` | teammates, healing, success |

- Type: **Anton** (headings, HUD numbers, buttons, uppercase), **Inter** (body, labels, tabular numbers), **Silkscreen** (logo lockups, small tags, kill feed). Self-host via `@fontsource/anton`, `@fontsource/inter`, `@fontsource/silkscreen`.
- Radii: panels 6, buttons 4, chips 2. Sharp, not rounded and soft.
- Primary button: bone fill, void text, Anton 28-40 px, 1 px inner highlight, hover lifts 2 px and adds a faint blood-red underglow; press 80 ms.
- Pixel accents: small pixel-art icons (generator, cage, gate, skull, heartbeat) drawn as SVG on a pixel grid to echo the logo.
- Copy voice: headings short and in caps; sentences calm, lowercase, slightly dark-humoured. "you made it out." "the hollow got you." "the gates are open. run." No hype words.

### 8.3 Screens (build each at 1600x900, then check 1280x720 and 2560x1440)
1. **Boot / splash:** black, pixel logo assembles, short scream sting, "click to enter" (unlocks audio).
2. **Main menu:** full-screen 3D campfire clearing at the fairground edge; the five survivors around the fire, The Hollow standing still in the treeline (only visible when the camera drifts). Top bar: logo, PLAY / CHARACTERS / LEADERBOARD / $SCREAM tabs, wallet pill, settings. Right panel: live match card (who's playing, generators done, spectator count) with **SPECTATE** and **JOIN QUEUE**.
3. **Role and character:** pick survivor, killer or fill; survivor carousel with a 3D model on a lit plinth; name field.
4. **Queue:** six seats (5 survivor, 1 killer) as tall portrait cards; queue position, estimated wait, holder priority badge; ready check overlay with a 10 s ring.
5. **Loading:** full-bleed key art of the map, map name in Anton, rotating tips, six player cards along the bottom with load progress.
6. **Survivor HUD:** bottom-left teammate cards (portrait, name, state icon, cage timer bar); top-left generators remaining (pixel generator icons); centre prompts ("HOLD E · REPAIR"); skill-check ring centred; Scream Together charge; heartbeat vignette tied to the dread radius.
7. **Killer HUD:** survivors' state strip, Hush charge, cages in use, attack cooldown; first-person arms and cleaver.
8. **Spectator HUD:** camera mode switcher (follow survivor 1-5, follow killer, free fly, overview map), all six player cards, generator progress, live event feed, Crowd Scream meter (reactions, cosmetic only), "you're #3 in the queue".
9. **Pause / Esc:** resume, settings, leave match (with confirm).
10. **Results:** escaped or taken per player with portraits, points by category, MVP highlight, "next match in" countdown, return to spectating or queue.
11. **Settings:** graphics presets plus advanced options, audio channels (master, music, effects, voices), key rebinding, mouse sensitivity, FOV, reduced motion and flash reduction.
12. **Wallet modal** and **$SCREAM token tab:** port from CLUMSY and restyle.
13. **Leaderboard:** season points, escapes, takes; your rank pinned.

---

## 9. Audio

- Positional Web Audio for footsteps, generators, screams, bell, heartbeat, pallets, gates.
- Music layers: menu theme; in-match ambient bed; chase layer that fades in when the killer has line of sight to you within 24 m; endgame layer after power on.
- Screams: at least 6 variants per survivor (hit, downed, picked up, caged, Scream Together). Record originals or use licensed packs; list them in `public/audio/CREDITS.md`.
- Mix rules: heartbeat and chase layer duck the ambient bed; Scream Together ducks everything for 1.5 s.

---

## 10. Assets and licensing

- Allowed sources: CC0 (Quaternius, Kenney, Poly Haven), Mixamo animations (used inside the game, not redistributed as raw files), purchased packs with game licences, and assets we create.
- Every asset goes into `docs/ASSETS.md`: file, source URL, licence, author, where used.
- Until real assets exist, use clean procedural placeholders that already follow the art direction (correct scale, colour, lighting), so the game never looks broken.
- Load from `ASSET_BASE_URL` in production; from `public/assets` in development.

---

## 11. $SCREAM integration

- Wallet connect with one free signature = profile (name, survivor look, points). Playing without a wallet: allowed for spectating only.
- `TOKEN_MINT` env var (same pattern as CLUMSY) drives Copy CA, the token tab and balance checks.
- Holder perks: `HOLDER_MIN_BALANCE` gives queue priority (section 6.2) and access to holder-only survivor cosmetics. Cosmetics never change gameplay.
- Port CLUMSY's house wallet and ledger behind `REWARDS_MODE=off|test|live`, default `off`. When on, it pays configured nightly rewards (e.g. top survivor and top killer by points). Do not build paid entry or pots.
- Never expose server keys to the client; never put secrets in `VITE_` variables.

---

## 12. Deployment (Heroku)

- One web dyno, preboot off, `TRUST_PROXY=1`, Node 26.x, `heroku-postbuild` runs the build (as CLUMSY).
- Heroku Postgres for players, matches, points, leaderboard and (if enabled) the ledger. Migrations run on boot.
- `/health` returns 503 until startup recovery completes (as CLUMSY).
- WebSockets: send keep-alive pings so idle connections are not dropped.
- Assets on R2 behind a CDN, cache-busted file names, `Cache-Control: immutable`.
- `.env.example` documents every variable.

---

## 13. Milestones and acceptance checks

**M1. Greybox match (playable core).**
Primitive-built map with correct layout data; 6 players over the network; survivor and killer movement, cameras, generators with skill checks, hits, downs, carry, cages, rescue, gates, Dawn Collapse, results. Bots are not allowed in real matches; add a dev-only `?bots=5` flag for local testing only.
Accept: two browser windows plus dev bots complete a full match; `tests/rules.test.ts` covers every state transition in 4.3; the visibility filter test from 6.4 passes.

**M2. Queue, spectators, persistence.**
Role queues, ready check, holder priority, one live match, watch rooms with 10 s delay, reconnect, Postgres profiles and points, wallet connect.
Accept: a 7th client spectates live with delay; after a match the queue seats the next six; a killer disconnect ends the match correctly.

**M3. Art pass.**
Real map art, characters, animations, lighting, fog, post-processing, quality presets, streamed loading.
Accept: Medium preset holds 60 fps in the busiest view on a mid-range laptop (log it with a built-in `?perf=1` overlay); first-match download under 60 MB.

**M4. Full UI and audio.**
All 13 screens from 8.3 at the specified quality, all audio from section 9, settings and rebinding.
Accept: screenshots of every screen at 1600x900 and 1280x720 saved to `docs/screens/`; no layout overflow at either size.

**M5. Polish and launch readiness.**
Scream Together presentation, hit feedback, camera shake, Crowd Scream, leaderboard, token tab, load test (6 players + 128 spectators), Heroku deploy, `docs/OPERATIONS.md`.
Accept: `npm run check` and `npm run build` pass; a deployed build plays a full match end to end.

---

## 14. Working rules

- Keep the code organized like CLUMSY: plain data in `shared/`, rendering in `src/game/`, screens in `src/screens/`, components in `src/components/`.
- Write tests alongside features. Prefer tests that run a real room over mocked logic.
- When a requirement here conflicts with something you find, stop and write the question into `docs/QUESTIONS.md` rather than guessing.
- At the end of each milestone, update `README.md` with what works, how to run it, and what is not done yet.
