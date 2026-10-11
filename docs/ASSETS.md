# Let’s Scream Together: current asset pass

The current game uses all 261 models from the two user-supplied `lets_scream_together_asset_pack` folders and `lets_scream_together_forest_pack`, served unchanged from `public/assets/scream`, `public/assets/scream-2` and `public/assets/scream-forest`. Its embedded 16×16 textures now replace the generated block painters. The current logo remains `REWORK_GUIDE/assets/logo-3a-pixel-48.svg`, copied unchanged to `public/scream-logo.svg`.

See [the asset-pack integration notes](ASSET_PACK.md) for model roles, animation, rendering and rebuild instructions. Both supplied horror SFX volumes and `soundeffects_new` now provide 92 local sound variations; selected existing effects remain in use. See [audio credits](../public/audio/CREDITS.md). The downloaded photorealistic assets and their credits below belong to the preserved `/legacy` game.

# Assets and licences

All game assets are served locally. No paid packs, ripped franchise content or remote asset requests are used during play. The original UI, gameplay identity and map layout remain project work; downloaded models are credited to their creators.

## The Hollow

The creature mesh, skin textures and source animations are **Demon by Aaron Neal**. The author permits use for any purpose with credit in the [original release](https://forums.unrealengine.com/t/free-aaa-quality-horror-game-monster-animations-and-ai-included/71474). This is custom permission, not CC0. Credit is included in the game's **Settings → Art and asset credits**, the shipped `public/assets/credits.html`, and this document.

The browser version in `public/assets/characters/5.glb` is a derivative: the FBX was converted to Y-up metres, horizontal root movement was removed, the attack's lead-in was trimmed, roughness was derived from the supplied skin mask, textures were resized to 2K WebP, and geometry was simplified and Meshopt-compressed. It retains 17 named animation clips and the original skeleton. The first-person claws reuse its skinned geometry with a separate camera pose; other players see the full creature and its original movement animations. No Unreal project code or AI was imported.

Source archives:

- [Game-ready mesh and animations](https://www.mediafire.com/download/7i5gexwackl20ag/Demon_-_Game_Ready_Mesh.rar)
- [Textures](https://www.mediafire.com/download/laeacdehq5eswcg/Demon_-_Textures.rar)

`scripts/download-killer.py` checks pinned SHA-256 hashes and extracts only the named model and image files. Source downloads stay in ignored `.asset-work/`.

## Survivors

The five selectable survivor models combine Quaternius's **free Standard** packs: [Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html), [Modular Character Outfits – Fantasy](https://quaternius.itch.io/modular-character-outfits-fantasy), and [Universal Animation Library](https://quaternius.itch.io/universal-animation-library). These source assets are CC0. No paid Pro pack was used.

The browser exports have approximately 19–23k triangles per survivor, textured clothing and hair, humanoid skeletons, and 33 named clips. The exporter retargets the animation library to each body and clothing rig, joins clips by name, and compresses geometry and 1K WebP textures. Crouch idle and crouch locomotion have separate clips; the downed pose adapts the prone swimming motion with a lowered pelvis, rather than using the crouch walk. It is an adapted free animation, not bespoke motion capture. Portraits are rendered from the same final models. The clothing remains stylized; these are not scanned human characters.

## Environment

The photogrammetry models, PBR surfaces and night panorama come from **Poly Haven**, under [CC0](https://polyhaven.com/license). Individual authors and direct source links are preserved in [`public/assets/environment/manifest.json`](../public/assets/environment/manifest.json) and the shipped credits. The manifest records the actual processed triangle counts.

- Models: pine tree, pine sapling, wild rooibos bush, grass, fern, dead tree, mossy rocks, stump, crate, barrel, tyre, bench, generator, wall lamp, wheelchair and oil can.
- Surfaces: forest floor, mud, weathered planks, rusty metal, bark and plaster. Each uses colour, normal and packed occlusion/roughness/metalness maps.
- Lighting: Dikhololo Night, with a 1K HDR for reflections and a separate 4K WebP panorama for the visible sky.

Model variants are selected before simplification. Meshopt geometry and 1K WebP textures are self-contained in local GLBs. Repeated scenery is instanced; the original fairground architecture and landmarks use batched geometry and these PBR surfaces. KTX2 is not currently used.

## Environmental sound

All 26 environmental clips are served from `public/audio/world`, totalling about 3.17 MB. The [audio manifest](../public/audio/world/manifest.json) records sources, licence, processing and SHA-256 hashes. The source download hashes are pinned in `scripts/prepare-audio.mjs`.

| Source                                                                                           | Creator        | Licence | Use                                                                             |
| ------------------------------------------------------------------------------------------------ | -------------- | ------- | ------------------------------------------------------------------------------- |
| [Impact Sounds](https://kenney.nl/assets/impact-sounds)                                          | Kenney         | CC0     | Four grass and four wood footsteps, metal/tool/wood impacts, bell and hit foley |
| [Forest Ambience 2](https://freesound.org/people/deadrobotmusic/sounds/687054/)                  | deadrobotmusic | CC0     | Public HQ preview, filtered and looped outdoor field recording                  |
| [Dark environment / Horror games](https://opengameart.org/content/dark-environment-horror-games) | Kilua Boy      | CC0     | Filtered piano playing from the carousel                                        |
| [Ancient caverns](https://opengameart.org/content/ancient-caverns-horror-ambient-loop)           | congusbongus   | CC0     | Quiet ambient score with chase ducking                                          |

Long recordings are trimmed, filtered, overlap-looped and loudness-normalized; effects use mono PCM for dependable browser decoding. Fire, engine, swing, heartbeat and room impulse response are original deterministic synthesis. The existing 30 character voices remain synthesized.

The design uses distinct soundscapes and physical source placement, informed by [Frictional's SOMA sound-design account](https://frictionalgames.com/2015-09-soma-behind-the-sound/). Web Audio implementation follows [distance attenuation](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/distanceModel) and [convolution reverb](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode) documentation. No Frictional recordings or game assets are used.

## Other assets

| Asset                                   | Source and permission                                                                                 | Use                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Logo and token image                    | User-supplied `scream-3a-48px.svg` and `scream-7d.png`; external ownership not independently verified | Branding and token screen                                                       |
| Fairground architecture, signage and UI | Created for this project                                                                              | Buildings, rides, signs, interface and pixel icons                              |
| Original audio                          | `scripts/prepare-audio.mjs` and `scripts/voice-scene.ts`                                              | Fire, engine, swing, heartbeat and 30 synthesized scream WAVs; not human actors |
| Anton                                   | Vernon Adams, SIL Open Font License 1.1                                                               | Headings                                                                        |
| Inter                                   | Rasmus Andersson, SIL Open Font License 1.1                                                           | Body text                                                                       |
| Silkscreen                              | Jason Kottke, SIL Open Font License 1.1                                                               | Pixel labels                                                                    |

Fonts are self-hosted through Fontsource. The source patterns for server guards, wallet authentication and optional transaction recovery were adapted from the user-supplied sibling CLUMSY project. Its artwork, characters, paid entry and live configuration were not copied.

## Rebuilding the art locally

The final assets are already included; downloading or conversion is unnecessary to play. To reproduce them, with Node 26, Python 3, curl and bsdtar installed:

```sh
npm run assets:download
npm run assets:environment
npm run assets
```

Keep the local Vite development client running on `127.0.0.1:5173`, then run:

```sh
npm run assets:killer
npm run assets:portraits
```

The last two commands use local Chromium for FBX/GLTF export and portrait rendering. They do not contact a conversion service. The source importers accept only free downloads; changed archives fail their checksum checks for review.

To rebuild the world audio, install FFmpeg and unzip, then run `npm run assets:audio`. Run `node scripts/export-credits.mjs` after rebuilding environment or audio manifests, followed by direct Prettier formatting. Assets are already included for local play; these tools are only needed for reproducible conversion.

## Rework art and interface

The supplied rework guide still defines the seven-screen interface, layout and branding. The new asset pack supplies characters, monsters, props, structures, block surfaces, inventory models and model-rendered inventory icons. Only abstract HUD symbols (microphone, heart, alert and movement) retain the guide’s small pixel sprites. Editable houses still use the existing greedy voxel mesher for structural blocks, with pack models for doors, traps, stashes and decoration. The prototype runtime is not shipped. No Minecraft assets are used.

Big Shoulders Display and Archivo are self-hosted via Fontsource under OFL-1.1; Silkscreen remains the pixel-label font. Anton/Inter remain for legacy and secondary panels. Existing credited local audio recordings and their manifest remain in use.

## Supplied horror SFX volumes

All 85 files from `horror_sfx_vol_1` and `horror_sfx_vol_2` feed the current game through the existing Web Audio mixer. Source recordings are preserved; browser-ready derivatives are in `public/audio/horror`. The [audio credits](../public/audio/CREDITS.md) and [manifest](../public/audio/horror/manifest.json) document processing and source/output hashes. The pack is user-provided, with no separate licence metadata included.

Footsteps are isolated footfalls rather than overlapping eight-second walking tracks. Surface choice comes from actual house blocks or world paths/terrain. Nine wind loops serve five districts, the gate, woods, porch and results. Door creaks accompany doors, slammers, trapdoors, entry and chests. Monster growls originate at the visible outdoor inhabitants or triggered house creatures, with a cooldown. Replays reuse event tracking and reset it when seeking.

The seven additional recordings in `soundeffects_new` supply the low music/atmosphere beds, two player screams and three jumpscares. These are processed by the same importer, preserved in the same manifest and routed through the existing volume controls. Jumpscares wait at least nine seconds and until the previous recording has finished plus 2.5 seconds. Nearby scares briefly lower the background mix before it returns smoothly; changing or muting Music still takes priority.
