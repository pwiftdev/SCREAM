# Build prompt — paste this to your coding agent

You are building the client UI and first-person presentation for **Let's Scream Together**, a free-to-play, open-world multiplayer horror game where every night is Halloween. Players claim a plot, build a haunted house with traps, and hide candy in stashes. At night they explore (graveyard, chapel, carnival, village), scare other players, and raid other players' houses. A raider who finds a stash and escapes takes a share of that house's remaining reward. The game is built around the $SCREAM token, but **rewards are a local simulation for now**. Every token number in the UI must be labelled "SIMULATED".

## Source of truth
Read `README.md` in this folder first. It holds every color, font, size, layout, copy string and behavior. Then open `prototype/Lets Scream Together - Game UI v2.dc.html` in a browser (serve the `prototype/` folder statically) and click through all 7 screens using the top nav or the ←/→ keys. The HTML is a **design reference, not production code**. Recreate it in our stack.

## Stack
- If this repo already has a game client or engine, use it and follow its conventions.
- If not, build a web client: **Vite + TypeScript + three.js** for the 3D world, and **React** (or plain DOM) for the HUD/menus as an overlay on the canvas. Design at a 1920×1080 reference and scale uniformly to fit the window (letterbox, keep 16:9).

## What to build (in order)
1. **Design tokens + fonts**: colors, Big Shoulders Display / Archivo / Silkscreen, the panel, key-cap and segmented-bar primitives (all values are in the README).
2. **Block renderer**: port `prototype/fp.js`. Use 16×16 procedural (or atlas) textures with nearest filtering and emissive maps, instanced cubes plus the slim shapes (headstones, crosses, fences, posts, slabs, lanterns, candles), FogExp2, hemisphere + moon light, flickering point lights, a camera flashlight and a held-lantern light. Render at half resolution with nearest upscaling.
3. **First-person controller**: WASD + mouse-look (pointer lock), sprint (Shift) driving the stamina pips, head-bob, and raycast targeting. The target name and action go under the crosshair. Hold E has a progress bar.
4. **HUD** (Explore / Stash Found / Build), matching the README exactly:
   - crosshair and interaction prompt
   - compass strip with world markers that clamp to the edge
   - dawn clock and objectives
   - candy carried
   - party status
   - event feed with an alert row
   - stamina and bag pips
   - 9-slot hotbar (keys 1–9 and scroll wheel)
   - SCREAM mic meter: real microphone RMS→dB via the Web Audio API, [V] to scream
   - terror heartbeat vignette and heart icon, driven by distance to the nearest other player
5. **Build mode**: voxel place/break against the targeted face, placement preview (translucent block + edge outline), palette panel (STRUCTURE/TRAPS/HIDING/DECOR with costs), stash panel (max 3) and nightmare rating.
6. **Flow screens**: Loading (40-segment bar, tips, press any key), Main Menu lobby (third-person character on the porch), Choose a Plot (64×36 tile map with free/taken/holder plots and a detail panel), Night Results.
7. **Character**: Minecraft-proportioned player with a black hood and cloak. The head front is the 3a mask (`FACE16` in fp.js). Rivals get a dark red cloak.

## Rules
- Keep the UI square-cornered, condensed, uppercase and dark, with blood red (#e01b22) only for alerts and primary actions, and candy orange (#f08a24) only for candy.
- Text over the 3D view always gets `text-shadow: 0 2px 0 #000`.
- Don't invent token economics. $SCREAM values come from a local simulation module and are always labelled SIMULATED.
- Holder plots are shown as "PLANNED" and locked. Free plots stay free.
- Placeholder gameplay numbers (Fog Night +20%, 2s trap stun, bag 500, 3 stashes) go in one config file so design can tune them.
- Use `assets/logo-3a-pixel-48.svg` for the brand mark. Don't redraw it.

## Done when
All 7 screens match the prototype screenshots side by side at 1920×1080. The explore → search → heist → results loop is playable. Build mode can place and break blocks. The mic meter reacts to a real voice.
