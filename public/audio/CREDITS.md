# Audio credits

All files are served locally. No recordings were purchased and no runtime audio services were used for this integration.

## Supplied horror sound packs

The project owner supplied `horror_sfx_vol_1` and `horror_sfx_vol_2`. Those 85 recordings are represented in `horror/`: nine ambient winds, twelve door creaks, twelve monster growls and 52 footstep variants across carpet, concrete, leaves, metal, exposed ground, gravel, mud, stairs and wood. The folders contain no author or licence text; these sounds are credited as user-provided, without assigning a CC0 licence.

`scripts/import-horror-sfx.mjs` preserves the originals, extracts individual 380 ms steps from the longer walking recordings, applies short edge fades, balances peaks and crossfades wind loop seams. Outputs are mono at 24 kHz. With the seven additional clips below, the 92 prepared files total approximately 4.31 MB. `horror/manifest.json` records each original path, original/output SHA-256 hash, source length and selected segment. Rebuild locally with `node scripts/import-horror-sfx.mjs`, then run Prettier directly on the generated catalog and manifest.

The additional `soundeffects_new` folder supplies a music bed, a low background atmosphere, two screams and three jumpscares. The music loops in the menu/results; the atmosphere loops outdoors and inside houses. Player screams use the voice bus, and trap/monster jumpscares use the effects bus. Jumpscares wait at least nine seconds and until the previous clip ends plus 2.5 seconds; close scares briefly lower the background mix. Original paths and hashes are included in the same manifest.

The current open-world game uses these supplied footsteps, winds, doors, growls, music, atmosphere, screams and jumpscares. The older credited effects below remain for UI taps, bells, fire, heartbeat and carnival piano, and for the preserved legacy game.

## Recorded environmental sound and music

| Work                                                                                             | Creator        | Licence | Local use                                                       |
| ------------------------------------------------------------------------------------------------ | -------------- | ------- | --------------------------------------------------------------- |
| [Impact Sounds](https://kenney.nl/assets/impact-sounds)                                          | Kenney         | CC0     | Grass/wood steps, tools, metal/wood impacts, hit foley and bell |
| [Forest Ambience 2](https://freesound.org/people/deadrobotmusic/sounds/687054/)                  | deadrobotmusic | CC0     | Public HQ preview; outdoor field recording                      |
| [Dark environment / Horror games](https://opengameart.org/content/dark-environment-horror-games) | Kilua Boy      | CC0     | Piano source at the abandoned carousel                          |
| [Ancient caverns](https://opengameart.org/content/ancient-caverns-horror-ambient-loop)           | congusbongus   | CC0     | Ambient score                                                   |

The 26 files in `world/` are normalized, filtered and converted for browser playback. Long recordings have overlapping loop seams. `world/manifest.json` contains exact source URLs, processing details, source hashes and output hashes. Rebuild with `node scripts/prepare-audio.mjs` (FFmpeg, curl and unzip required). The importer verifies pinned source hashes.

## Original project synthesis

`voices/0-0.wav` through `4-5.wav` contain 30 synthesized recordings: six variations for each of Mara, Dez, Ollie, Juniper and Teo. They cover hits, downs, pickup, cages, Scream Together and an alternate hit. Glottal oscillators, formant filters, vibrato and envelopes create synthetic voices; these are not human actor recordings.

The voice source is `scripts/voice-scene.ts`. With the local development server running, `node scripts/export-voices.mjs` renders the WAV files through OfflineAudioContext. No external services are contacted.

Fire, engine, swing and heartbeat clips are original deterministic synthesis in `scripts/prepare-audio.mjs`. The room impulse response is generated locally in `src/lib/audio-mixer.ts`. Web Audio provides camera-relative HRTF playback, wall muffling, indoor reverb, bounded playback and independent master/music/effects/voice controls.
