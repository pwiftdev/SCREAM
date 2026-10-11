# Let’s Scream Together

**$SCREAM · Build a nightmare. Hide your candy. Hunt the neighbors.**

A free-entry, open-world Halloween horror game. The current presentation follows `REWORK_GUIDE`: pixel textures, masked block characters, an in-world first-person house builder and a compact survival HUD. The supplied guide’s `logo-3a-pixel-48.svg` is the current brand mark. All 261 models from the supplied world and forest packs now furnish the world, characters, traps and inventory. See [asset-pack notes](docs/ASSET_PACK.md). Both supplied horror SFX volumes now provide surface-specific footsteps, door creaks, spatial monster growls and district wind ambience. The additional `soundeffects_new` recordings provide quiet music, atmosphere, player screams and jumpscare accents. Cinematic lighting adds cold moonlight, short amber light pools, fog, directional/contact shadows and adjustable film grain; picture settings include a lighter rendering option and reduced flashing.

Run `npm ci`, then `npm run dev` with Node 26. Play at **http://127.0.0.1:5173**. Everything remains local: no public hosting, paid services or real token transfers. The earlier fairground remains at `/legacy`.

## Your first night

1. Press a key after loading to open the cinematic main menu. Enter a username, optionally paste your public Solana wallet address, and choose **Join the world** to spawn in a distant part of the map. No house or plot is required.
2. Explore, use Q to scare nearby players, and select the crowbar with 2 to fight. Find a grave shovel in the world and press E to collect it; select it with 3.
3. Walk to a free plot sign and press E to claim it and build right there. E opens the material palette; M returns to building. Save and return outside at any time.
4. Hide up to three stash chests. Test Raid, find a stash and escape: the server verifies the draft and opens the house automatically.
5. Walk to public haunted houses and press E to raid. Escape or leave the visit to return to that doorstep; verification appears as a small notice while you explore.

The outdoor world spans **410 × 590 units**, with 40 plots per neighborhood and five connected districts: Wickerman village, Old Mercy cemetery, the deadlight carnival, the harvest fields and the drowned parish. House interiors are separate visits.

**WASD** moves, mouse/drag looks, **Shift** sprints, **E** interacts or searches, **Q** screams, **V** holds the optional voice scream, **1–4 / wheel** selects outdoor hotbar slots, **M** opens the outdoor map. Inside, **Space** jumps, **Ctrl** crouches and **F** toggles the flashlight. Left-click attacks with a selected weapon. Death loses loose candy and the found shovel, then respawns you after seven seconds with brief protection. The pause panel does not protect you from other players; disconnecting just after taking damage counts as a death. Escape releases the mouse and opens pause controls. Builder: left-click place, right-click break, **R** rotate, **M** capture mouse, **E** release for the palette; Space/Shift move up/down.

Search the six outdoor caches by holding E while facing them. Loose candy is ordinary session gameplay: bank it at the Lantern Gate with E. It survives screen changes and reconnects during the same server night, and resets at the next night or server restart. It never credits the token treasury.

## Simulated rewards

A published house reserves 1,000 **SIMULATED $SCREAM** for a 24-hour round when treasury funds are available. A qualifying hunter takes 10% of the remaining reward; the owner keeps the remainder when the round ends. Repeat hunters, self-raids, short runs and known tip-linked profiles do not earn again. The finite treasury cannot be overdrawn. Extra stashes do not multiply the payout.

See [reward rules](docs/ECONOMY.md), [tester guide](docs/TESTER.md), [local operations](docs/OPERATIONS.md), and [code audit](docs/AUDIT.md). Live economy startup is blocked. The four-hour visual night clock does not change the existing 24-hour funded house round.

`npm run check` runs TypeScript, ESLint, tests and direct Prettier checking. `npm run build` builds client and server. `npm run test:e2e` runs the packaged game on a disposable local server. Screenshots and machine-specific performance measurements are in `docs/screens/rework-*` and `docs/hollow-performance.json`.
