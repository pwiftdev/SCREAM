# Handoff: Let's Scream Together — Game UI & First-Person Screens

## Overview
**Let's Scream Together** is a free-to-play, open-world multiplayer horror game where every night is Halloween. Players claim a plot, build a haunted house, hide candy in stashes, then go out at night to raid other players' houses and scare people. If a raider finds a stash and escapes, they take a share of that house's remaining reward. The game is built around the **$SCREAM** token; token rewards currently run as a **local simulation** (must be labelled "SIMULATED" everywhere they appear).

This package covers 7 screens: Loading, Main Menu (lobby), Choose a Plot, Build Mode, Explore HUD, Stash Found (heist), Night Results.

Art direction: **first-person, Minecraft-style block world** (16×16 pixel textures, nearest-neighbour filtering), **full horror** (night, heavy fog, flickering warm lights, red accents). UI tone: dark, grim, condensed all-caps type, heavy vignettes, red alarm states — original design, not a copy of any existing game's UI.

## About the Design Files
The files in `prototype/` are **design references built in HTML** — a working prototype that shows the intended look and behaviour. They are **not production code to ship**. The task is to **recreate these designs in the real game client** (Unity, Unreal, Godot, a three.js/Babylon web client, etc.), using that engine's UI system and rendering pipeline. If no engine has been chosen, a web client using **three.js** (the prototype already uses it) plus a DOM/React HUD layer is a reasonable default.

To view the prototype: serve the `prototype/` folder with any static server (e.g. `npx serve prototype`) and open `Lets Scream Together - Game UI v2.dc.html`. Use the top nav bar or ←/→ keys to switch screens. Requires internet for Google Fonts and three.js (unpkg CDN).

## Fidelity
**High-fidelity** for HUD/UI: colors, type, sizes, spacing and copy are final-intent. Recreate pixel-accurately at a 1920×1080 reference resolution and scale uniformly.
**Mid-fidelity** for the 3D scenes: block palette, textures, lighting mood and camera framing are the target look; geometry/level layout is illustrative (hand-placed blocks), not a level design.

---

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| ink | `#000000` | stage background |
| panel | `rgba(8,8,10,0.84–0.88)` | all HUD/menu panels |
| panel-solid | `#0c0c0f` / `#111114` | plot panel, item tiles |
| line | `#2a2a30` | 1px panel borders, dividers |
| line-dim | `#1c1c20` | unselected tile borders |
| bone | `#f2ede4` | primary text, crosshair, selected outlines |
| bone-2 | `#cfc8ba` | secondary text |
| muted | `#9a958c` | labels |
| muted-2 | `#8d887f` | fine print |
| stone | `#6a6c74` | disabled / trapped / done |
| blood | `#e01b22` | primary accent, alerts, CTA buttons |
| blood-hover | `#ff2a31` | CTA hover |
| blood-deep | `#6e0b0f` | key-cap shadow |
| alert-bg | `rgba(110,8,12,0.75)` | alert feed rows |
| candy | `#f08a24` | candy amounts, bag pips, loot |
| pip-empty | `rgba(0,0,0,0.6)` | empty segments over 3D |
| seg-empty | `#2a2a30` / `#222226` / `#1a1a1e` | empty segments on panels |

### Typography (Google Fonts)
- **Big Shoulders Display** 700/800/900 — titles, numbers, menu items, prompts. Always UPPERCASE. line-height 0.85–1.
- **Archivo** 400/500/600/700 — body copy, descriptions, feed text.
- **Silkscreen** 400/700 — pixel micro-labels, key hints, stat labels. letter-spacing 1–4px.

Scale used (px @1080p): 132 (STASH FOUND), 128 (results title), 120 (loading title), 96/88 (screen titles, rating), 80 (primary menu item), 72/64 (big numbers, timers), 56 (secondary menu items, loot), 48/46 (clock, zone name), 40/36 (panel titles), 30/28/26/24/22 (prompts, names), 20/18/17/16/15 (body), 14/13/12/11/10 (Silkscreen labels).

### Shape & effects
- Corners: **square** everywhere (no radius). Pixel/blocky feel.
- Panels: 1px `#2a2a30` border, no shadow.
- Text over 3D: `text-shadow: 0 2px 0 #000` (or `0 3px 0`, `0 6px 0` for huge type).
- Key caps: solid bone (or blood) box, black Silkscreen text, `box-shadow: 0 3px 0 #6a6c74` (or `#6e0b0f`).
- Panel header pattern: 10×10 blood square + Silkscreen 14px, letter-spacing 2px, muted.
- Segmented bars: N equal cells, 2–4px gaps, filled = bone/blood/candy, empty = seg-empty.

### Spacing
HUD safe margins: 40px (first-person screens), 64px/96px (menus). Common gaps: 4, 6, 8, 10, 12, 14, 16, 18, 22, 28, 32px.

---

## 3D World (first-person)
Reference implementation: `prototype/fp.js` (three.js r160).
- **Blocks**: 1×1×1 unit cubes, plus slim shapes (headstones 0.78×1.1×0.24, crosses, posts 0.22 wide, iron fence posts 0.14 + rails, slabs 0.5 high, candles, lanterns 0.4).
- **Textures**: procedural 16×16 pixel art, `NearestFilter`, no mipmaps. Emissive pixels are painted into a separate emissive map (pumpkin faces, lantern glass, windows, chapel stained glass, chest loot, screamer eyes). Painters for every block are in `PAINT` in fp.js (grass top/side, dirt, gravel, stone, mossy, cobble, planks ×3, log, roof shingles, dead leaves w/ alpha, iron, pumpkin, lantern, windows, stained glass, chest, candy, bookshelf, cobweb, spikes, trapdoor, door, bone, screamer box).
- **Render**: internal 960×540 upscaled 2× with nearest-neighbour (intentional gritty pixel look). FOV 72°.
- **Lighting**: HemisphereLight (sky `#3a4a70`, ground `#0a0806`, 0.45–0.75), dim blue moon DirectionalLight (`#8fa4d8`, 0.35–0.45), flickering warm PointLights at lanterns/pumpkins (`#ffb04a`), red PointLights at chapel windows and the Screamer Box, a camera-mounted flashlight SpotLight (`#ffe9c8`, angle 0.42, penumbra 0.55, range 32) and a held-lantern PointLight.
- **Atmosphere**: FogExp2 density 0.035–0.06, fog colour = background (`#05060a`; dawn `#2a1216`). Stars, a square pixel moon, drifting fog sprites near the ground.
- **Camera feel**: head-bob (amp 0.01–0.04, faster when sprinting in heist), slow look sway, light flicker (sine noise).
- **Viewmodel**: cloaked arm holding a small lantern, bottom-right, rendered on top (no depth test).
- **Player model**: Minecraft proportions (head 0.5, body 0.5×0.75×0.28, limbs 0.25). Black hood/cloak; head front = **3a mask face** (16×16 `FACE16` pattern in fp.js: white mask, slanted black eyes, small nose, long tapered mouth). Rival variant: dark red cloak `#3a0d11`.

## Screens

### 01 Loading
- Full-screen 3D graveyard (slow dolly toward the chapel), radial dark overlay `rgba(0,0,0,0.25)→0.9`.
- Centered: pixel 3a logo 216×216 (glow `0 0 90px rgba(224,27,34,0.3)`), title "LET'S SCREAM TOGETHER" 120/900, subtitle "EVERY NIGHT IS HALLOWEEN" Silkscreen 20, blood, letter-spacing 8.
- Progress: 40-segment block bar (18px tall, 4px gaps), width 880px, 250px from bottom. Filled blood, empty `#1a1a1e`. Status line cycles: RAISING THE DEAD / CARVING PUMPKINS / LOADING THE GRAVEYARD / HIDING EVERYONE'S CANDY / WAKING THE NEIGHBORHOOD + percentage.
- Tip card bottom-left (560 wide), rotates tips every ~4.5s.
- At 100%: "PRESS ANY KEY" bottom-right, blinking (~0.6s). Any key/click → Main Menu.

### 02 Main Menu (lobby)
- 3D: third-person view of your masked character on the porch of your house; red rim light behind, warm key light in front. Left-to-right black gradient (0.94→0 at 56%).
- Top-left brand: logo 76 + wordmark 46/900 + "NIGHT 1 · FOG NIGHT".
- Left menu (x 96, y 290, gap 18): red 18px block marker for the primary item. PLAY TONIGHT (80px) / MY HAUNTED HOUSE / CHOOSE A PLOT / LAST NIGHT'S REPORT / SETTINGS (56px), each with an 18px Archivo subline. Hover: translateX(14px), 150ms ease.
- Right column (430 wide, 64 from the right): profile (avatar, HOLLOWBONES, LV 12, 20-segment XP bar); currency chips: CANDY 2,480 and "$SCREAM · SIMULATED" 1,250. "YOUR HOUSE" card: Plot 07 · Hollow Lane, 3 stashes / 700 candy hidden / 72 nightmare rating, alert line, FORTIFY HOUSE outline button → Build. "TONIGHT" card: Fog Night modifier copy, live "DAWN IN hh:mm:ss", 4 party slots (you, friend ready, 2× + INVITE).

### 03 Choose a Plot
- Solid `#060607`. Title "CHOOSE YOUR PLOT" 96/900 + subtitle.
- Map panel 1216×684 at (64,220): top-down pixel map, 64×36 tiles at 19px. Zones: Fog-Covered Graveyard, Forgotten Chapel, Abandoned Carnival, Black Pond, Hollow Lane (9 free/taken plots 5×4), Crown Hill (4 holder plots 7×6, locked/planned).
- Plot overlays are clickable: free = 2px bone border, taken = faint border, holder = stone border + dark fill + "LOCKED", selected = 3px blood border + `rgba(224,27,34,0.25)` fill.
- Legend under the map. Right detail panel 528×684: isometric preview, PLOT id (60/900), sub, 3 stat rows, CTA by state: free → "CLAIM PLOT · FREE" (blood, → Build); taken → "RAID THIS HOUSE TONIGHT" (outline, → Explore); holder → dashed "HOLDER PLOTS · PLANNED". Note: "Free plots stay free. Larger plots for $SCREAM holders are planned."

### 04 Build Mode (first person)
- 3D: standing in your yard looking at your half-built house. **Placement preview**: translucent copy of the selected block (opacity 0.55) with a bone edge outline in the target slot; black outline on the block being targeted.
- Top bar: back ‹, "BUILD MODE" / "PLOT 07 · HOLLOW LANE"; tools PLACE [1], BREAK [2], ROTATE [R], MOVE [M] (selected = blood fill); BLOCKS 1,240 / 2,000 bar; TEST RAID (outline → heist) and PUBLISH HOUSE (blood).
- Under the crosshair: selected block name + key hints LMB PLACE · RMB BREAK · R ROTATE · E PALETTE.
- Left palette panel (380 wide): category tabs STRUCTURE / TRAPS / HIDING / DECOR (2×2), 3-col item tiles (64px iso icon, name, cost in candy), selected-item description card.
- Right panel (380): YOUR STASHES 2/3 (rows with amounts, dashed empty slot), NIGHTMARE RATING 72/100 with Traps / Hiding / Darkness 10-segment bars, raid-share rule text.
- Bottom: shared hotbar (see HUD components) with 9 block icons; selecting changes the preview block.
- Items + costs: Plank Wall 2, Dark Beam 2, Stone 3, Mossy Stone 3, Lit Window 6, Door 10 · Spike Floor 25, Trapdoor 30, Screamer Box 40, Cobweb 8 · Stash Chest free (max 3), Decoy Chest 20, Bookshelf 15, Bone Pile 4 · Jack-o'-Lantern 5, Lantern 6, Roof Tile 2, Dead Leaves 1 (descriptions in prototype `ITEMS`).

### 05 Explore HUD (first person)
- 3D: foggy graveyard at night, lantern in hand, crosshair on an old tomb, rival player standing on the path ahead.
- Overlays: edge vignette `rgba(0,0,0,0.75)` + red **terror vignette** `rgba(170,8,14,a)` pulsing like a heartbeat (base 0.14, peak ~0.36, double-beat every ~0.9s).
- **Crosshair** center: 22×4 + 4×22 bone bars, 1px black outline.
- **Interaction prompt** (y 584, centered): target "OLD TOMB · 4M" (Silkscreen 12), key cap [E] + "HOLD TO SEARCH" (28/800), 20-segment hold-progress bar 240px. Hold completes in ~1.6s → toast "+24 CANDY · LOOSE CANDY IN THE TOMB" (3s), carried candy +24.
- **Compass** top-center (760×62 at y 22): ±70° window, ticks every 5° (major 15°), N/E/S/W letters, degrees every 45°, edge fade mask. World markers (14px squares) + labels below: CHAPEL (blood), PLOT 03 · 180M (candy), HOME · 240M (bone); off-screen markers clamp to the edge at 50% opacity. Heading follows the camera.
- **Top-left**: "02:14:37 UNTIL DAWN" (48/900), zone line "FOG-COVERED GRAVEYARD · FOG NIGHT" (blood), 3 objectives with checkboxes (done = filled stone, muted text).
- **Top-right**: candy bag icon + carried count (64/900 candy) + "CARRIED / 500 · 700 SAFE AT HOME".
- **Left-middle** party status: 48px portrait frames (border = state color) + name + state (RAIDING PLOT 11 candy / HIDING · CARNIVAL bone / TRAPPED blood at 50% opacity).
- **Right-middle** event feed (380 wide): rows with a 3px left accent; first row is an alert "Someone is inside your house · [H] WATCH" on alert-bg.
- **Bottom-center** stats + hotbar (552 wide): 10 stamina pips (left) and 10 bag pips (right, candy), active item name in the middle (fades to 55% after ~3s), then a 9-slot hotbar (60px tall, 1px slot outline, selected = 3px bone inset + 12% bone fill, slot number top-left, stack count bottom-right). Items: Lantern, Lockpick ×3, Firecracker ×2, Smoke Bomb ×1, Map, Candy Corn ×12, 3 empty.
- **Bottom-left** SCREAM (mic): 24-segment live level meter (cells 17+ turn blood), "[V] HOLD · NN DB", rule line.
- **Bottom-right** terror: "YOU'RE BEING WATCHED" (30/900 blood) + "SOMEONE IS WITHIN 15M" + pixel heart 64px scaling 1→1.18 on each beat.

### 06 Stash Found (first person)
- 3D: inside Willowmere's house, crosshair on an open, glowing chest surrounded by candy; cobwebs, bookshelves, moonlit window, screamer box glowing red, spike floor between you and the doorway; faster head-bob (running).
- Stronger red pulse (base 0.2, peak ~0.45). "STASH FOUND" 132/900 blood at y 130, flickers to 60% every ~1.4s; "WILLOWMERE'S HOUSE · PLOT 03".
- Top-left escape timer "0:38" counting down (72/900) + "GATE · 24M EAST". Top-right carried 492 + "NOT SAFE UNTIL HOME".
- Under the crosshair: "+312 CANDY" (56/900 candy), "YOUR SHARE OF THE REMAINING REWARD · HOUSE 936 → 624", key cap [SPACE] + "RUN FOR THE GATE" → Results.
- Compass shows GATE · 24M (blood). Party list updated. Warnings feed: OWNER ONLINE (alert), TRAP AHEAD. Bottom-right: "OWNER IS COMING HOME · WILLOWMERE · 60M AND CLOSING" + heart. Stamina pips low and red; bag pips nearly full.

### 07 Night Results (dawn)
- 3D graveyard at dawn (red/orange fog `#2a1216`, warm hemisphere light). Dark gradient overlay.
- "DAWN · NIGHT 1 COMPLETE" + "YOU MADE IT TO DAWN" 128/900; buttons FORTIFY HOUSE (outline → Build) and NEXT NIGHT (blood → Menu).
- 3 cards: YOUR RAIDS (Willowmere +312 ESCAPED, Hexling +120 ESCAPED, Nocturne 0 TRAPPED; stolen +432), YOUR HOUSE · PLOT 07 (break-ins 5, stopped by traps 3, stashes found 1, candy lost −180; best trap), SCARES (loudest scream 87 Scream Power, players scared 14, candy from scares +60).
- Totals strip: NET CANDY +312 · $SCREAM · SIMULATED +38 ("Rewards run as a local simulation for now.") · LV 12 → 13 +640 XP bar.

## Interactions & Behavior
- Flow: Loading → (any key) Menu. Menu: Play Tonight → Explore, My Haunted House → Build, Choose a Plot → Plots, Last Night's Report → Results. Plots: claim → Build, raid → Explore. Build: Test Raid → Stash Found, Publish → Menu. Explore: hold E on target → loot toast. Stash Found: Space → Results. Results: Fortify → Build, Next Night → Menu. Esc → Menu anywhere.
- Hotbar: keys 1–9 select slots; the active item name shows, then fades.
- Timers: dawn countdown (1s), heist escape countdown (1s), loading progress, heartbeat pulse (~0.9s cycle), mic meter (live; the prototype fakes it — wire it to real mic input/RMS).
- Gameplay values shown are placeholders unless confirmed by design: Fog Night +20% stash payout, traps stun for 2s, bag capacity 500, a maximum of 3 stashes.

## State (suggested)
`screen`, `night {index, modifier, dawnAt}`, `player {name, level, xp, candyBank, candyCarried, bagCap, stamina, screamLevel}`, `house {plotId, stashes[], nightmareRating, blocksUsed/cap}`, `party[] {name, state}`, `feed[]`, `objectives[]`, `hotbar {slots[9], selected}`, `interaction {target, holdProgress}`, `heist {houseId, timeLeft, loot, gateDistance}`, `results {raids[], defense, scares, net}`, `token {balance, simulated:true}`, `plots[] {id, x, y, w, h, state: free|taken|holder, owner}`, `compass {heading, markers[] {bearing, label, color}}`.

## Assets
- `assets/logo-3a-pixel-48.svg` — official 48×48 pixel logo (white on black, crisp edges). Used for the loading screen, brand, portraits, and the token icon.
- `assets/logo-3a-traced.svg` — smooth vector version of the mask.
- All block textures, item sprites (candy, bag, lantern, key, firecracker, smoke, map, skull, heart, mic, alert, house) and the mask face are procedural pixel art defined in `prototype/fp.js` (`PAINT`, `FACE16`) and `prototype/voxel.js` (`SPR`). Port or re-author them as 16×16 PNG atlases.

## Files
- `prototype/Lets Scream Together - Game UI v2.dc.html` — all screens and HUD (inline styles = exact values). Open it in a browser.
- `prototype/fp.js` — three.js first-person block renderer: textures, block types, scene builders (graveyard, heist room, yard), lighting, camera bob, viewmodel, build preview.
- `prototype/voxel.js` — 2D/iso helpers: top-down plot map, isometric block icons, pixel sprites.
- `prototype/support.js` — prototype runtime only (not needed in production).
- `reference/SCREAM-core-concept.md` — product concept notes.
- `BUILD_PROMPT.md` — ready-to-paste prompt for your coding agent.
