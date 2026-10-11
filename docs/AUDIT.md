# Heroku deployment and HUD audit — 11 October 2026

- Reduced the outdoor top-left HUD to the live street count. The browser entry helper now checks the whole label so introductory copy cannot silently return. Kept the existing HUD container and styles.
- Fixed production binding, exact configured HTTP/WebSocket origin acceptance and opt-in guest profile entry. Signed nonce validation, hashed bearer sessions, moderation, ownership checks and admin allowlists remain in place. Real rewards and external market access remain off.
- Scoped Heroku Postgres TLS handling to an explicit database setting, bounded pool connections and connection timeout, and added idle pool error handling. Heroku refuses startup without persistent database configuration. Existing transactional schema creation and query helpers are reused; no duplicate storage system or new recovery/lease state machine.
- Reviewed imports, unused code, duplicate logic, startup/error paths, origin validation, query parameters and deployment contents. Runtime dependency audit reports zero known vulnerabilities. Candidate source scan found no private keys, GitHub tokens, cloud access keys or embedded database credentials; environment files and local data stay ignored.
- Updated the existing packaged smoke script for the current world, two real browser players, map controls, compact HUD and optional restart persistence. Corrected the asset test's obsolete empty weapon-slot expectation. Source asset packs stay in version control but are excluded from the Heroku slug.
- Validation: 186 unit/integration tests plus four tests against a disposable PostgreSQL cluster passed; all 29 browser tests passed. TypeScript, ESLint, direct Prettier and the production build passed. Heroku built the same game successfully, and two HTTPS browser sessions verified multiplayer count, map opening/closing and the compact HUD. A real dyno restart preserved the authenticated profile and house in PostgreSQL; untrusted origins receive 403. Deployment capture: `docs/screens/production-street.png`.
- Existing limitation: guest signing keys are memory-only and bearer sessions expire after 24 hours. Hosting is suitable for current playtests; durable guest identity, multi-dyno presence and real reward integration remain separate launch work.

# Held parchment map audit — 11 October 2026

- Replaced the side-panel diagram with a held paper map, blocky sleeves/hands, terrain pixels, plot symbols, landmark labels and a directional player arrow. M and slot 4 open it; M, Escape and the focused close button fold it. Reading pauses local movement while the server world continues, and death closes the map.
- Reused the real terrain height grid, forest biomes/instances, paths, plot locations and landmark data. One lazily cached canvas/data URL supplies the map artwork, inventory icon and held-item surface; changing the player marker does not regenerate terrain. Free, reserved, occupied and home plots have distinct symbols.
- Kept the supplied map model and added a private, nearest-filtered paper surface. Shared source geometry/materials remain untouched; existing renderer disposal releases the new GPU texture. The held model and hotbar hide while the full paper view is open, avoiding doubled items or overlapping controls.
- Removed the obsolete side-panel styles and unused plot-selection callbacks. Checked imports, helper reuse, allocation frequency, source-asset isolation, keyboard focus, held-key repeat behavior and reduced-motion handling. No new endpoints, database queries, remote requests, persistence or recovery/lease state machine.
- Browser coverage checks M/4/Escape/button transitions, focus, stationary position while reading, facing direction, terrain/marker rendering, 1080p/720p bounds, artwork reuse and private texture disposal without disposing source assets. Screenshots: `docs/screens/parchment-map-1920.png` and `parchment-map-1280.png`.

# Open-world combat and plot-flow audit — 11 October 2026

Scope: world-first entry, quieter footfalls, darker lighting, authoritative melee combat, distant spawns, plot access, in-place building and immediate return from raids. Reviewed helper reuse, unused code/imports, duplicate state, error paths, security, queries, cleanup and rendering costs.

## Findings addressed

- The main entry no longer gates exploration or public raids on house ownership. Plot claims and editor access require the player's authenticated, connected server position near the actual sign. Recently attacked/attacking players cannot escape into building or a house. Plot ownership, tier rules, optimistic draft hashes, verified clears and transaction-backed publication remain in the existing services.
- Added shared weapon/spawn definitions and one small server combat helper. The server decides targets using range, facing, terrain height and obstruction checks; clients cannot submit damage or teleport coordinates. Cooldown, stamina, death and protection are authoritative. Rejected forged weapon ownership and duplicate live profile connections are covered by integration tests.
- Reused the existing session store for health, position, kills, deaths and carried candy across scene changes/rejoins. Combat logout counts as death. Found weapons and loose candy are reset on death. Removed obsolete client position storage so it cannot become a second authority. Connected night sessions are not evicted while a player is present.
- Reused the house editor and full world scene for building at the plot's actual transform. Ray selection and highlights convert between world and plot coordinates. Added a persistent foundation so an erased floor can be rebuilt. Palette/focus changes clear movement keys. Distant remote respawns snap to their new location instead of interpolating through the map.
- The existing verified-run endpoint remains idempotent. Verification runs after returning outside; retries retain the original ticket and recorded inputs. Pending/failed verification prevents starting a second run or editing a draft. No new recovery lease or durable retry queue was introduced. Pending browser submissions remain in memory and do not survive a full page reload.
- Reused existing weapons, actor joints, sound buffers, effects bus and scene disposal. Footsteps on leaves/grass are reduced from 0.28 to 0.085 gain; mud is 0.12 and paths 0.2. Outdoor ambient is 0.007, sky 0.028 and moon 0.12. House lighting is unchanged. Comfort controls and bounded creature encounters remain available.
- Added a four-slot outdoor hotbar, health/death feedback and contextual plot/weapon prompts. Moved control hints away from the microphone UI. Sign text now reads correctly from either side. Shared neighborhood loading replaces duplicate request definitions, and asynchronous refresh errors are caught.
- The local browser runner has a keyed positioning fixture, registered only by that runner. It is absent from production routes. Its key is generated per run and is never bundled into the client. Tests use this to reach precise combat and plot locations without accepting player-supplied positions in the game.
- No new database schema, paid assets, external API, hosting, or real token transfer was added. Added API lookups are parameterized and use existing indexed plot codes. Combat operates on the bounded room population; no per-tick database queries were introduced. Historical lobby/report components remain available as source references but are no longer imported by the main game entry.

## Validation

- `npm run check`: TypeScript, ESLint and direct Prettier pass; 184 tests passed and four optional PostgreSQL tests were skipped.
- Fourteen affected browser checks pass across the final regression run and the targeted public-raid rerun. These cover two-player combat/death/respawn, shovel pickup, remote-claim rejection, in-world building, verified publication after a lost acknowledgement, public-house entry/return, lighting, controller movement, scares and six sound-system checks. The public-raid test now waits for the visit controller to start before pressing Escape.
- Production client/server build passes. Visually reviewed the new HUD, death, weapon, builder, dark forest and district captures. Compass labels use separate rows when landmarks align; the outdoor hotbar contains four slots.
- Local Chromium on Apple M4 at 1920×1080 measured about 60 FPS across twelve world views and the house interior. First-load transfer was 14.82 MB, house entry about 169 ms, with no page errors. Full measurements are in `docs/hollow-performance.json`; these are local-machine results.
- No commit or public deployment was made.

## Local scope

This is a local multiplayer playtest, not an AAA quality or broad-device certification. Combat scores/session positions reset with the in-memory server session. Builds and verified house rewards retain the existing persistence rules. Interiors and the builder use separate scenes; outdoor PvP does not run inside them. No live payouts or real token holding checks were enabled.

# Outdoor horror and movement audit — 11 October 2026

Scope: outdoor movement, camera comfort, night lighting, lantern controls and local creature encounters. Reviewed unused code/imports, helper reuse, duplication, cleanup, failure behavior, performance and security. No database queries, endpoints, economy, authentication or recovery/lease state machines changed.

## Findings addressed

- Outdoor walking is now 3.9 m/s, close to the existing indoor 3.6 m/s, down from 7 m/s. Client prediction and the authoritative street room use the same movement function and constant. Sprint retains the existing stamina rules and multiplier; diagonal movement stays normalized.
- Reused the existing distance-based camera motion helper instead of adding another bob calculation. Walking into an obstacle no longer produces continuous walking bob. Motion settles at rest; scare recoil is bounded and never changes movement yaw. A separate Outdoor Camera Motion control can disable it, and Reduced Flashing suppresses it.
- Lowered outdoor ambient, sky and moon fill, darkened ordinary and Final Night fog, and preserved indoor lighting. F now controls both outdoor lantern lights and the held lantern's emissive material. Those materials are private copies, so toggling the held item cannot darken lamps elsewhere.
- Added one bounded encounter director and two reused pack actors. An unseen stalker slowly approaches from behind, holds briefly when noticed, then fades. A later rushing apparition stops short of the player, triggers one impact cue and disappears. Shared collision and terrain sampling reject obstructed or steep approaches; no pathfinding service or physics bodies were added.
- Encounters use active play time, a first-scare delay and randomized quiet gaps. Pausing, losing focus or pointer capture, opening a map/menu, approaching doors/the bank, holding E, or disabling scares cancels the encounter. Reduced Flashing also suppresses these encounters. A long frame cannot fast-forward a pending scare. No damage, candy loss, rewards or multiplayer authority is attached to the visual actors.
- Reused the existing sound library, voice/effects buses, limiter, jumpscare cooldown and music ducking. A small mixer movement helper makes the positional sound follow the approaching creature. Pause and scene changes stop its handles and restore the music envelope; muted settings remain respected.
- Reused asset loading, joint animation and scene disposal. Only two actor clones are allocated, with isolated fade materials and shared source textures/geometry. Disposal tests check that local materials are released without changing source assets. Removed an unused encounter impact flag during review. No new downloads, external services, paid resources or public deployment were introduced.

## Validation

- **180 unit/integration tests passed**, with four unchanged PostgreSQL tests skipped. TypeScript, ESLint and direct Prettier pass. Movement checks cover walking/sprinting/diagonals, collision, camera settling, pause/reduced effects, cooldowns, obstructed and steep routes, one-shot impact cues, long frames and teleport cancellation.
- **17 browser checks passed together** across gameplay, lighting, audio and the new outdoor behavior. After the final stalking, moving-audio and lantern-emission refinements, all **10 affected lighting/audio/outdoor checks passed again**. They verify positional sound updates, cooldown/cancellation, real controller movement, live settings, both lantern lights and isolated material disposal.
- Visually reviewed the darker district captures and `docs/screens/outdoor-{lantern-off,lantern-on,stalker,rush,impact}.png`. The lantern-on image also passes a measured brightness comparison against the same unlit view. Subjective scare timing and sound quality remain playtest feedback, rather than claims from automated checks.
- The production client/server build passes. Everything remains local; no paid services, public deployment or commit.

---

# Dense forest audit — 11 October 2026

Scope: the supplied forest pack, outdoor placement and terrain materials, collision lookup, animation, local atmosphere and positional forest audio. Reviewed reuse, unused imports/code, duplicate resources, failure handling, cleanup, performance and security. No database queries, endpoints, authentication, economy or lease state machines changed.

## Findings addressed

- Integrated all 72 individual forest models through the existing importer, loader, catalog and regional instance batches. The manifest contains 72 models, not 74; the combined preview is kept separate. All source GLBs are unchanged and hash checked. Missing forest downloads block entry and retry only missing models.
- Preserved material isolation across three packs and extended the existing texture helper with a pack key for terrain textures. Reused the house/world texture renderer rather than introducing a second terrain engine. Transparent surfaces do not write opaque depth.
- Replaced the previous bare-tree distribution with biome-specific canopy layers and deterministic undergrowth. All 261 supplied models still appear in the game. Protected plots, searches and landmarks; moved a camp clearing that initially overlapped a plot foundation and reshaped a steep hollow approach. The same terrain grid continues to define rendered and sampled heights.
- Replaced full-list movement collision scans with a shared spatial index. Tests compare it with the reference rotated-box checks at thousands of random and cell-boundary positions. Dense trunks, boulders and solid landmarks are represented on both client and server. Removed procedural boulders without collision and replaced them with authored solid placements.
- Wind uses per-scene material uniforms in the existing batches and the same deformation in shadow materials. Shared source materials remain intact. Cleanup now includes custom depth materials, with browser disposal checks. Small ground cover has a bounded drawing distance and does not cast thousands of tiny shadows.
- Forest animation composes with existing district animation. Distant creatures and veils are culled; reduced flashing freezes motion. Fog/light shafts fade by distance, with no opaque depth writes. Wolf sounds and campfire positions reuse shared scene data and the existing mixer/voice cap. Background-loop keys include their position so two fires coexist without duplicate loops.
- Added forest location labels and map markers while preserving the forty plot interactions. No new combat, payout, staking, teleportation or claimable-land mechanics are implied by the pack's descriptive notes. No paid resources, external runtime requests or public deployment were introduced.
- Increased the profiling browser's resource timing buffer to 3,000 entries. Its default 250-entry limit truncated the larger asset list and understated transfer size; the current report includes the complete initial load. Earlier transfer measurements below are historical and may be incomplete.

## Validation

- TypeScript, ESLint, direct Prettier and the production client/server build pass. **172 unit/integration tests passed**, with four unchanged PostgreSQL tests skipped.
- **18 browser checks passed together**, covering gameplay, all 261 models, missing-download recovery, forest animation and reduced motion, lighting, audio and resource disposal. Shared collision checks cover random positions and spatial-index boundaries; all six forest clearings remain reachable and all forty plots retain clear approaches.
- Visually reviewed seven forest views: pines, watcher, camp, autumn cabin, wetland, standing stones and root hollow. Captures are in `docs/screens/forest-*.png`; production views are in the refreshed `rework-*` captures. The world now contains **3,541 canopy trees and 4,109 undergrowth instances**, with four forest biomes.
- The packaged production build measured approximately **60 FPS at 1920×1080**, p95 **16.7–16.8 ms**, across twelve outdoor views and a house on local headless Chromium / Apple M4 Metal. Complete initial transfer was **14.90 MB**, cached house entry approximately **456 ms**, with no page errors. See [the measured report](hollow-performance.json). This measures one local machine, not midrange hardware or internet latency.

---

# Pack II and terrain world audit — 11 October 2026

Scope: the current open world, both supplied model packs, shared scenery collision, terrain-aware rendering and outdoor audio. Reviewed unused code/imports, duplication, helper reuse, loading failures, resource ownership, performance and security. No database query, endpoint, authentication, economy or lease-state changes.

## Findings addressed

- Imported all 100 Pack II GLBs unchanged, retaining the first 89 models. One importer and loader handle both packs. Material cache keys include the pack identity; Pack II cannot overwrite the original house-atlas textures through a shared material name. Failed requests retain the existing retry behavior and entry gate.
- Reused the existing instance batches, shared asset resources, lighting pool, sound mixer and animation callback. Only six selected props keep independent moving pivots; distant static batches and actors are culled. Reduced Flashing stops the new animations. Removed superseded procedural wheel, windmill, church and unused shape geometry.
- Extracted shared layout data from movement code. One terrain grid defines the rendered triangles and sampled heights; no separate visual-only hills. Level plot pads preserve foundations and door approaches. Checked every rendered triangle orientation, both interpolation branches, path grades and plot corners. Smoothed overly steep transitions found during the first pass.
- Player cameras, interpolated rivals, name labels, plots, lamps, shadow focus, mist, cinematic cameras and positional sounds follow ground height. Rivals sample height after horizontal interpolation so they do not cut through curved hills. Footsteps share the visible path width and winding route data.
- Replaced six older invisible crate/bench collision objects with fitted supplied models. A browser regression checks that each collision position has a matching rendered instance.
- Full-size buildings and solid props have shared client/server collision. Woodland placement leaves routes, searches and plot approaches clear. New scenery adds no unverified loot, damage or payout rules. No external services, runtime third-party downloads, paid assets or live hosting were introduced.
- Screen cleanup continues to release scene-owned geometry, instance buffers and effects while retaining cached model geometry/materials. Source artwork remains untouched. There are no new database calls or remote state machines to audit.

## Validation

- TypeScript, ESLint, direct Prettier and the production client/server build pass. **169 unit/integration tests passed**, with four unchanged PostgreSQL tests skipped.
- **16 distinct browser checks passed across the final runs**: seven core gameplay flows in the broad run, followed by nine asset, lighting and SFX checks in the final focused run. An old flat-ground sound assertion was updated to verify the raised cemetery source height. Coverage includes all 189 models, missing-download recovery, moving pivots, reduced motion, cross-pack material isolation, visible collision props, lighting settings, disposal, candy transfers and replay.
- Visually reviewed the five districts, village house, asylum, ridge and hills, plus the existing indoor/menu/builder captures. Screenshots are in `docs/screens/horror-*.png` and the refreshed `rework-*` captures.
- The packaged production build measured approximately **60 FPS at 1920×1080**, p95 **16.7–16.8 ms**, across eight outdoor views and a house on local Chromium / Apple M4 Metal. First transfer was **10.75 MB**, cached house entry approximately **412 ms**, with no page errors. See [the measured report](hollow-performance.json). This is a local-machine measurement, not broad hardware certification.
- The terrain spans approximately **−2.5 to 17.1 metres** and the world contains **1,019 collidable woodland trees**, in addition to the new undergrowth and authored scenery. All forty plot approaches, searches and connecting routes pass accessibility checks. Decorative landmarks have no separate interiors; existing player-house entry and candy rules remain the playable interaction loop.

---

# Cinematic lighting audit — 11 October 2026

Scope: the current open-world renderer, interior lighting, cinematic backgrounds and picture settings. No simulation, economy, authentication, database query or endpoint behavior changes.

## Findings addressed

- Removed the atlas shader's uniform surface emission. Only intended emissive textures glow. Lower ambient fill, cold moonlight and short amber light pools now define the scene; the cauldron remains a localized green exception. Vertex colors retain existing voxel occlusion without adding an extra warm tint everywhere.
- One shared lighting rig handles world/menu moonlight and interior darkness. A bounded 1024 px directional shadow map follows the camera, and the flashlight has its own 1024 px shadow map. Static world geometry now receives/casts shadows. Local lamps reuse the existing six-light pool and do not allocate shadow maps per lamp.
- Reused the existing postprocessing library and night-grade helper for half-resolution contact occlusion, restrained bloom, vignette and adjustable grain. All current-game render paths use the same draw function. Removed superseded CSS grain/vignette and duplicated scene lighting/fog setup.
- Normal lamps stay steady. Damaged lamps use position-seeded, occasional dips rather than synchronized flicker. Reduced Flashing disables those dips and animated grain. Music/audio changes remain intact.
- Settings are applied centrally to every renderer, including replays and menu backgrounds; saved older settings receive defaults for the new controls. Direct rendering remains available with Cinematic Effects off and explicitly clears its framebuffer. Effects do not cover HUD/UI text.
- Renderer disposal removes its settings listener and releases compositor targets, shadow maps and scene-local resources while preserving shared asset geometry/textures. Source assets and source licences remain unchanged. No new runtime downloads, permissions, paid services or external endpoints were introduced.

## Validation

- TypeScript, ESLint, direct Prettier and production client/server build pass. **166 unit/integration tests passed**; four unchanged PostgreSQL tests were skipped. The new lamp test covers long steady intervals, occasional failures, independent timing and reduced flashing.
- **Ten browser checks passed together**: the seven current-game flows, two supplied-asset checks and a real WebGL lighting check covering shadow allocation, fog/sky matching, grain/AO/shadow controls, live resize, fallback rendering and disposal. Both lighting checks also passed in a final focused run, bringing coverage to **11 distinct browser checks**; the additional case verifies picture-setting persistence and the menu-to-builder transition. Visually reviewed all five outdoor views, the house, menu, settings and builder. Screenshots are saved as `docs/screens/horror-*.png` and the refreshed `rework-*` captures.
- The packaged production build measured approximately **60 FPS at 1920×1080**, p95 **16.7–16.8 ms**, in all five outdoor areas and a house on local Chromium / Apple M4 Metal with the default effects enabled. Initial transfer was **9.07 MB**, cached house entry approximately **406 ms**, and no page errors were recorded. See [the measured report](hollow-performance.json). These measurements cover this local machine, not broad device certification.

---

# Supplied sound-pack audit — 11 October 2026

Scope: integrate both supplied horror SFX volumes and the additional `soundeffects_new` recordings into the current open-world game. Reviewed reuse, unused imports/code, resource limits, loading failures, event duplication, replay behavior and security. No database queries, endpoints, authentication, payments or lease state machines changed.

## Findings addressed

- All 92 supplied recordings have local derivatives and source/output hashes. Originals remain unchanged. The 4.31 MB prepared pack includes 52 individual 380 ms footfalls, nine winds, twelve doors, twelve growls, two screams, three jumpscares and two background tracks. Long walking recordings no longer restart for each step.
- Reused the existing mixer, movement-distance footstep meter, HRTF positioning, wall filtering, reverb, limiter, 40-voice cap and volume controls. Surface rules, variant selection and visit-event tracking are shared helpers. Rendered creatures and their sounds now read the same location list.
- Removed superseded current-game audio loads while preserving the legacy game's assets. TypeScript unused checks and ESLint pass. Sounds cover the menu, builder, district exploration, doors, candy collection/banking, house scares, results and replay.
- Six concurrent requests share one load operation; retries only request missing files. Disposal aborts queued/in-flight requests and ignores late decode results. Tests cover concurrent unlock, HTTP failure/retry and disposal during decoding.
- Wind transitions crossfade and release old sources. Scene transitions clear positional effects and pending fade timers. Hidden tabs suspend audio. Replay seeks suppress historical events and reset footstep distance; paused visits stop one-shot effects.
- Door changes and scare events are deduplicated, including vertically paired doors. Open doors no longer muffle sound as closed walls. Outdoor growls follow visible creatures with a sixteen-second cooldown; jumpscare accents wait at least nine seconds and until the previous recording ends plus 2.5 seconds. Music and atmosphere use low background levels.
- All files load from local paths, with no third-party runtime calls or new permissions. Existing opt-in microphone behavior is preserved. Credits identify the supplied recordings without inventing licence metadata.
- Follow-up tension pass: menu/results music is separate from gameplay atmosphere; background layers fade in and repeated unlocks preserve their playback position. Retrying a missing background starts that layer without restarting already playing audio.
- Scares use the audio clock for their cooldown, suppress distant jumpscare accents and prevent overlapping scream clips. A separate music gain envelope lowers ambience around nearby scares and restores it smoothly without overriding the user's saved volume or mute setting. Scene changes and pauses cancel that envelope. The shared mixer's legacy behavior stays unchanged unless this new envelope is explicitly triggered.

## Validation

- TypeScript, ESLint, direct Prettier checks and the production client/server build pass.
- **165 unit/integration tests passed**; four PostgreSQL tests were skipped because this pass changes no database code.
- All **15 browser checks passed together**: seven current-game flows, three preserved audio checks and five supplied-pack checks. New cases cover menu/world music separation, missing-background recovery without restarts, both scream variants, non-overlapping jumpscares and music ducking that respects mute. All five supplied-pack checks passed again after the final resource-cleanup audit; playback/mute checks cover every one of the seven handpicked recordings and cancellation of a pending duck envelope. The initial two-second sample check flagged the atmosphere recording’s quiet intro; measuring each complete recording verifies audibility and peak/mute behavior without amplifying the intended intro.
- Automated audio checks verify decoding, sample audibility, mute behavior, event routing, resource cleanup, source integrity and failed-file retry. Human listening on speakers/headphones remains the check for subjective sound quality.

Everything remains local. No public deployment, paid service or commit was made.

---

# Supplied asset-pack audit — 11 October 2026

Scope: replace the current game's generated art with the supplied `lets_scream_together_asset_pack`. No payment, token, authentication, database or endpoint behavior was changed. The archived guide-rework findings below describe the previous pass.

## Findings addressed

- All 89 individual source GLBs are shipped unchanged, with embedded textures and the supplied manifest/PNG sources. Browser verification finds every catalog model in actual world, actor, loot and viewmodel roles. The combined Blender preview is not downloaded by the game.
- Removed the old texture painters, procedural masked characters/monsters/chest and physical-item sprite drawings. Structural houses still reuse the greedy mesher; gameplay uses the existing editor, collisions, verified raid simulation and rewards.
- One asset loader, material cache, model-cloning helper, static batching helper and model icon renderer serve all screens. TypeScript unused checks and ESLint pass. The import script regenerates the typed catalog without modifying the source pack.
- Six concurrent loads report actual progress; a failed asset blocks entry and retry only requests missing models. Tested a blocked wraith download followed by successful recovery. No external asset URLs, executable source-pack files or network services were introduced.
- Shared geometry/textures survive scene disposal; viewmodel materials are independent; instance GPU buffers and scene-local resources are released. Character joints are independent clones. Browser checks verify disposing one actor cannot invalidate another actor's shared resources.
- Static props are grouped by material, instanced in 32-metre regions and culled beyond opaque fog. Warm lamp/pumpkin pools, green cauldron light and red chapel/scare light reuse the fixed six-light pool. No unbounded per-prop point lights were added.
- The new village cottage has a shared client/server collision box. All forty player plot approaches remain clear. Pack doors span paired vertical door blocks, including an odd remaining block; a browser geometry assertion checks a three-block stack. Pack traps and candy keep their existing simulation IDs.
- Sign text is fitted to the supplied wooden boards on both sides, so approaching from the back does not hide navigation labels. Held models and inventory icons use the same source artwork.

## Validation

- TypeScript, ESLint, production client/server build and direct Prettier checks pass.
- **158 unit/integration tests passed**; four PostgreSQL tests remain skipped in this run because no database code changed.
- **Nine browser checks passed**: the seven current-game flows plus asset-loading recovery and full-pack rendering/resource checks. Four focused cases passed again after the door and lighting adjustments, including two-profile candy transfer and replay.
- Production profiling at 1920×1080 measured approximately **60 FPS**, p95 **16.7–16.8 ms**, in all five districts and a house on Chromium / Apple M4 Metal. Initial transfer was **5.99 MB**; cached house entry was approximately **265 ms**; no page errors were recorded. See [the measured report](hollow-performance.json). This is a local-machine result, not broad hardware certification.
- Visually inspected loading, porch, first-person hand and all five district scenes. Screenshots and tester instructions were refreshed. Tests use an isolated local server/database.

Outdoor monsters remain atmospheric inhabitants, and item selection does not add consumable-use rules. The forty editable plots, simulated economy and local-only restriction remain intact. No public deployment, paid service or commit was made.

---

# Let’s Scream Together rework audit — 10 October 2026

Scope: the new `REWORK_GUIDE` presentation and its playable local flow. Reviewed unused code/imports, duplication and helpers, rendering/resource cleanup, database queries, error handling, validation, security and compatibility with the existing architecture. The older fairground audit remains in [LEGACY_AUDIT.md](LEGACY_AUDIT.md).

## Findings addressed

- Read the guide and inspected its seven prototype screens. Recreated them in React/Three.js rather than shipping the prototype runtime. The supplied pixel SVG is copied unchanged. Design tokens, fonts, stage scaling, panels, compass, segmented meters, hotbar, microphone, texture painters and cinematic backgrounds have shared helpers.
- Kept the existing editor, house wire format, greedy mesher, movement/collision, deterministic visit replay, local authentication, SQL reward transactions and licensed audio system. The open world remains 410 × 590 units with 40 plots and five districts. New art does not require external model downloads.
- Added separate color/emissive atlases with nearest filtering, no mipmaps, half-resolution rendering, exponential fog, stars, drifting ground mist, warm flickering lights and a held lantern. Fixed a Three.js texture-source alias that had replaced the color atlas with its emissive image. Removed double-darkening in the material. Dispose helpers now cover sprites, lines and points as well as meshes and textures. Disposed views release their WebGL context and shadow target.
- Replaced remote ghost silhouettes with smoothed masked block characters and walking animation. Kept motion reduction and existing pointer-lock/drag-look fallback. Mic access is opt-in; actual Web Audio RMS drives the meter, V gates scream events, and denial leaves keyboard screaming available. Streams stop on unmount, including permission completion after unmount.
- Added first-person build targeting, translucent previews, target outlines, four palette categories and keys/wheel hotbar selection. Reused undo/redo, draft saving and verified publication. Up to three stash blocks are derived from the existing wire format; validation checks each stash for reachability. Spike/screamer traps and sprint stamina execute in the verified simulation. Invalid sprint payloads are rejected.
- Outdoor search is server-owned and checks distance, facing, continuous hold, repeat collection and bag capacity. Authenticated profiles retain loose candy across reconnects during one server night. Session storage is bounded; inactive-night entries are pruned and active counters reset at dawn. Banking is allowed only at the Lantern Gate. These transient counters never credit the token treasury and deliberately reset on server restart.
- Corrected the old numeric premium-block cutoff to use the actual Cosmetic category. A regression test verifies free publication with every new trap/decor block while preserving the original cosmetic guard.
- Holder plot claims are PLANNED/locked on both client and server. Existing larger saved houses remain compatible. All reward displays are labelled SIMULATED. Building costs are labelled design costs and construction stays free. No fog payout multiplier or new token formula was introduced.
- Results read real verified raids, defense and credits. Aggregate SQL totals are separate from the bounded recent-row display, so display limits cannot silently lower totals. Added a wallet/time index for the report. Queries use bound parameters. The existing unique reward credits, transaction rollback, idempotency and finite-funding protections remain in place.
- Live house alerts use existing delayed visitor streams instead of invented owner activity. The guide’s sample names, party status, XP and reward figures were replaced with actual state or clear empty states. Neighborhood invite links are local URLs; no messages are sent.
- Removed unused scenery adapter, obsolete token-market overlay, replaced candy HUD and several hundred lines of retired splash/plot CSS. Removed duplicate hotbar callback handling and duplicate geometry disposal. Collected stashes keep an opened chest and candy spill, with render state also handling replay rewind. TypeScript’s unused checks and ESLint remain enabled.

## Validation

- TypeScript, ESLint and direct Prettier checks pass.
- Unit/integration suite: **156 passed**. Four PostgreSQL tests passed separately against a disposable local cluster.
- Production client/server build passes. Large-chunk notices still concern shared rendering code and the separately loaded legacy physics bundle.
- All **16 browser tests passed together** on the packaged game: seven current-game scenarios and nine preserved legacy scenarios. They cover real block placement/break/undo, house setup, verified publication, two-profile reward transfer, replay, physical-door return, search, sprint, generated-stream microphone processing and three viewport sizes. Three focused scenarios also passed again after the publishing-guard and cleanup fixes.
- At 1920×1080, packaged rendering measured approximately **60 FPS**, with p95 frame intervals of **16.7–16.8 ms**, across all five districts and a house interior on headless Chromium / Apple M4 Metal. Initial transfer was **4.42 MB** and cached house entry approximately **333 ms**. No rendering errors were recorded. These measurements predate the asset-pack pass; the linked report now contains the latest run.
- Browser testing uses an isolated loopback server and disposable database; it does not reset the saved development world. Screenshots of the seven new screens are in `docs/screens/rework-*`.

## Explicit scope

This is the guide’s pixel-horror direction. House interiors remain separate visits; decorative landmarks have no separate interior levels. Hotbar tool artwork/selection is present, but the guide’s proposed consumables do not add unapproved rules to verified raids. Construction is free; displayed item costs are design placeholders.

Loose-candy session counters are not durable financial state. The funded house economy remains a finite local simulation. Real creator fees, holdings verification, withdrawals, co-op interiors and clip export are not implemented. No recovery lease or remote-payment state machine was introduced.

Automated microphone validation uses a generated MediaStream through the real Web Audio pipeline. Physical microphone hardware, atmosphere, audio taste, long-term balance and broad device/browser support still need human playtesting. No public deployment, paid service, real transfer or commit was made.
