# Let's Scream Together

A local, browser-based 4-vs-1 horror game set in Rotten Hollow Fairground. Four survivors repair generators and open the exits while The Hollow hunts them. Textured characters, a sculpted creature killer, a shared Rapier map, authoritative Colyseus matches, delayed spectating, signed profiles and persistent scores.

No public deployment, paid services, funds or commits have been used.

## Play locally

Requires Node 26.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Click to enter → choose your role → Step Inside → Start the Night. Development bots fill empty seats. For two browser windows, the second player enters the first window's room code before the host starts. `?bots=0` disables bots; `?perf=1` shows rendering statistics.

| Control            | Action                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------- |
| WASD + mouse       | Move and look; click the world to lock the pointer                                     |
| Shift / Ctrl       | Walk / crouch                                                                          |
| Hold E             | Repair, heal, rescue, carry, cage, gate, pallet, vault, locker; struggle while carried |
| Space              | Skill check                                                                            |
| Q                  | Scream Together, once per survivor                                                     |
| Left / right mouse | Killer lunge / Hush                                                                    |
| Esc                | Pause menu; the networked match continues                                              |

Use **Connect Wallet → Local Test Profile** to try the verified role queue without an extension or funds. The profile uses a real, local signature. Real queues have no bots. Anonymous visitors can spectate with a 10-second delay. One match runs at a time.

## Implemented and verified locally

- Shared map with nine generators, two gates, six cages, eight seeded lockers, seeded pallets and survivor spawn order, the carousel, haunted house, Ferris wheel, stalls, hedges and cornfield boundary.
- Server-owned movement, hits, bounded attack rewind, repairs, timed skill checks, healing, downs, bleed-out, carry/struggle, cage stages/rescue, pallets, vaults, lockers, Hush, Scream Together, exits, collapse and results.
- Per-player visibility filters, prediction/reconciliation, interpolation, bounded messages, role queues, ready checks, a held reconnect seat including page reload, and spectator rooms.
- SQLite scores by default; the Postgres adapter is tested against an isolated local instance. Duplicate results are idempotent. No in-progress match survives a server process restart.
- A 55k-triangle sculpted killer by Aaron Neal with 17 animation clips and 2K textures; five Quaternius survivors with 33 clips each; Poly Haven scanned vegetation and props, blended PBR terrain, a 4K night panorama, rendered portraits, first-person claws, local moon shadows, contact shadows, height fog, bloom, SMAA, High/Ultra ambient occlusion, menu depth of field and adaptive resolution. Asset credits are available in Settings.
- All requested UI categories, audio settings, key rebinding, reduced motion/flashes, positional synthesized screams, recorded environmental sound, surface footsteps, spatial music, reverb and wall muffling.
- Wallet adapters, Copy CA and the ported Mobula market/chart reader. External data defaults off; absent data stays unavailable. Holder-only brass charms are assigned by the server. The optional nightly reward ledger is ported from CLUMSY’s ownership and transaction-recovery patterns, with rewards off.

## Verification

```sh
npm run check
npm run build
npm run test:e2e
```

`check` runs TypeScript, ESLint, rule/integration tests and Prettier's check mode. Use `npx prettier --write <files>` for formatting; there is no format script. Browser tests run the two-window match, reload/reconnect, delayed spectating and results at 1600×900, 1280×720 and 2560×1440. Screenshots are in `docs/screens/`. The network load test uses five signed players and 128 spectators. The visual checks also cover all four presets, creature animation bounds and a failed asset download. The packaged first match is checked against a 60 MB download target. See [the tester handoff](docs/TESTER.md) for the map, playtest route and known limits, and the audit for measured frame rates and exact test scope. Select High in Settings for ambient occlusion and sharper shadows.

Optional real local Postgres check, with PostgreSQL CLI tools installed:

```sh
node scripts/test-postgres.mjs
```

It creates and destroys its own temporary loopback-only cluster. It never uses another application's database.

For a local production bundle, stop the dev server, run `npm run build && npm start`, and open http://127.0.0.1:2567.

## Acceptance status

M1's playable core and M2's queue/persistence tests pass locally. M3 and M4 include the downloaded and adapted character/environment assets, recorded environmental sound, synthesized creature voices and browser screenshots; art quality, sustained FPS on a representative mid-range laptop and multiplayer balance still need human acceptance. M5's local checks, load test, feedback, leaderboard, token screen and operations notes are implemented. Heroku deployment is intentionally deferred under the user's instruction.

The optional reward ledger is implemented and tested through lease loss, crash boundaries, ambiguous remote outcomes and post-ack local failures. Test and live records are isolated; neither reward mode is enabled. No live wallet extension, holder-balance provider or market API has been exercised. This is not a claim that every production acceptance item in the build prompt has passed. See [the audit](docs/AUDIT.md) for exact evidence and limits.

## Layout

- `shared/`: configuration, map, physics, rules, visibility and protocol.
- `server/`: Colyseus rooms, queue, HTTP protection, authentication, persistence and optional read-only market providers.
- `src/game/`: rendering, assets, animation, prediction, controls and cameras.
- `src/screens/`, `src/components/`, `src/lib/`: game UI, audio, wallet and settings.
- `scripts/`: reproducible character, portrait and voice generation plus local validation tools.
- `tests/`: rules, real rooms, load, storage, reconnect, assets and browser checks.

[Operations and configuration](docs/OPERATIONS.md) · [Asset licences](docs/ASSETS.md) · [Audit](docs/AUDIT.md)

## Local world and sound pass

Rotten Hollow now has a dressed infirmary interior, worn fairground notices, maintenance props, damaged bunting, moving foliage and ground mist. Lighting separates warm practical lamps from the colder grounds. The shared physics includes the carousel deck and a smooth staircase collision surface; the visible steps remain intact.

The local sound library adds recorded surface footsteps, positional ride music, forest ambience, impacts and generator/fire loops. Walls muffle sources, the house adds reverb, and major cues briefly lower the score. Audio follows the actual camera, including spectator views. Music, effects and voices have separate volume controls. Reduced Motion disables added camera bob and weather movement; Flash Reduction keeps the fire light steady.

Sources and rebuild instructions are in [ASSETS.md](docs/ASSETS.md). No public hosting, paid services or live rewards are enabled.
