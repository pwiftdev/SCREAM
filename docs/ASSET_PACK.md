# Supplied Halloween asset packs

Source: `lets_scream_together_asset_pack`, supplied by the user on 11 October 2026. All 89 individual GLBs are copied unchanged to `public/assets/scream/assets`, with the original manifest, README and source PNG textures. The combined Blender preview scene remains in the source folder; it is not downloaded during play. The pack supplies no separate licence text, so it is documented as user-provided artwork, not relabelled as CC0.

## Where the models appear

| Pack category          | Game use                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 28 blocks              | Ground and house texture atlas, builder models, village timber stacks, cemetery ruins, chapel windows and harvest decorations          |
| 22 props               | Lamps and fences along paths; varied graves, crosses, coffins, cauldron, scarecrows, pews, altar, tents, ticket booth, signs and candy |
| 8 traps/hiding objects | Builder traps, house stash/decoy chests, opened loot, searchable caches, hidden shelf and environmental hazards                        |
| 15 items               | First-person arm and six held items; matching inventory icons; caretaker supplies, carnival stall and candy decorations                |
| 3 characters           | Lobby player, networked rivals and the village pumpkin character                                                                       |
| 10 monsters            | Animated district inhabitants; wraith and stalker replace the house encounter stand-ins                                                |
| 3 structures           | Village caretaker cottage, cemetery mausoleum and parish chapel tower                                                                  |

Decorative buildings are world landmarks, not replacements for editable player plots. There are still forty claimable plot locations. The new cottage has a shared client/server collision box. Ambient monsters do not grant rewards or invent new combat rules. Tool selection displays the held model; consumable-use mechanics remain outside the existing raid rules.

## Rendering and ownership

Six concurrent local loads report actual progress. Failed loads keep entry closed and can be retried without downloading successful models again. The pack totals approximately 1.49 MB of GLBs. Materials are shared by pack plus material name; embedded textures use nearest filtering, repeat wrapping, sRGB and no mipmaps. Alpha-masked foliage/webs and emissive surfaces retain their supplied maps.

Structural blocks reuse the existing greedy house mesher and an atlas drawn from the supplied model textures. Special blocks use fitted pack geometry. Static prop meshes are combined by material within each model and instanced in 32-metre regions; batches beyond opaque fog are culled. Character joints are cloned independently and animated through `pivot_*` nodes. Held items attach to `socket_hand` on the supplied arm. Inventory icons are rendered from the same models once at startup.

The cached model geometry/materials belong to the pack for the browser session. Screen disposal releases instance buffers, local materials, atlases and WebGL contexts without destroying resources used by another screen. Per-view first-person materials disable depth testing without changing shared world materials.

## Reimport

```sh
node scripts/import-scream-pack.mjs
npx prettier --write src/game/rework/asset-catalog.ts
```

The importer preserves source files and regenerates the typed catalog. `tests/scream-pack.test.ts` checks every shipped GLB against the original bytes and verifies the declared joints and sockets. Browser checks assemble the actual world, actors and viewmodel and assert that every catalog model is present; they also cover failed-download retry, independent joint poses, nearest textures, transparent cobwebs, held-slot selection and shared-resource disposal.

## Pack II world rework

`lets_scream_together_asset_pack_2` supplies another 100 models (3.97 MB), copied unchanged to `public/assets/scream-2` with its manifest, README and textures. Both packs load through the existing loader; identical material names in different packs have separate caches, preserving the original house atlas. No separate licence text was supplied with Pack II.

The new models form village porches and outbuildings, cemetery remains and a bone shrine, a broken carnival, harvest slaughteryard, drowned church, asylum annex and ridge watchtower. All ten nature models dress the woods and parish swamp. Static models use the existing regional instance batches; six selected props retain independent pivot nodes for animation. Full-size building shells and solid props use shared client/server collision footprints. Decorative remains, small litter and atmospheric creatures are not new loot or combat mechanics.

The 410 × 590 m world now has deterministic rolling terrain, winding gravel routes and level pads under forty house plots. A shared two-metre height grid defines both visible triangles and player/peer elevations. Camera movement, labels, plot meshes, lamps, moon shadows, ground mist and outdoor sound sources follow those heights. Trails share their width and routes with footstep surface selection. Trees and undergrowth provide occlusion between districts; the scene keeps its supplied pixel-art style.

Reimporting with the command above now imports all three packs. Unit checks cover all 261 source hashes, joints, solid footprints, route grades, terrain interpolation and level plot pads. Browser checks cover every model's rendered presence, independent moving pivots, reduced motion and cross-pack material isolation.

## Forest pack

The supplied `lets_scream_together_forest_pack` manifest contains **72 individual models**, plus a separate combined preview GLB. All 72 are integrated; the combined preview stays out of runtime downloads. Originals, manifest, README and textures are copied unchanged to `public/assets/scream-forest`. The individual models total 1.77 MB. No separate licence text was supplied.

The forest has **3,541 canopy trees and 4,109 undergrowth instances**, in addition to existing world dressing. Deterministic, jittered placement creates pine woods, autumn groves, drowned woodland and blighted patches, with varied tree heights, crowns, density and orientation. Protected spaces keep all forty plots, candy sites, existing landmarks and routes clear. New clearings contain the watching tree, abandoned camp, logging cabin, drowned grove, standing stones and root hollow. They have map markers and HUD location names.

Ground textures now use the forest pack's podzol, litter, mud and exposed-root materials. All ten forest block models also appear as exposed banks and stored timber. Trees, rocks, camp objects and buildings share collision geometry between client and server. A spatial index limits movement checks to nearby objects instead of scanning thousands of trunks every step. Plant cover remains passable. Source notes suggesting damage, stealth bonuses, teleportation, vaulting or new rewards are not implemented game rules; the landmarks and creatures are atmospheric scenery, and the cabin is not an additional claimable plot or interior.

Canopy and foliage wind runs in the existing instance batches with matching shadow deformation. Small plants have a shorter drawing distance and do not cast individual shadows. Per-scene materials and depth materials are disposed without destroying shared textures. Forest creatures have independent idle/head poses; wisps/fireflies drift and leaves fall. Reduced Flashing stops the new movement. Local soft fog and subtle light shafts fade with distance and do not write opaque depth. Campfire audio and wolf growls reuse the existing positional mixer and limits; wetland footsteps use mud.

The existing asset browser check verifies that every catalog model appears in its intended role. Forest checks cover clearings, plot and path access, terrain grades, trunk collision, spatial-index equivalence, wind/creature settings, shader rendering and material cleanup. `docs/screens/forest-*.png` records the seven close-range review views.
