# Let’s Scream Together local playtest

Open **http://127.0.0.1:5173** while `npm run dev` runs. The interface follows `REWORK_GUIDE`; the current world art comes from both `lets_scream_together_asset_pack` folders and `lets_scream_together_forest_pack`. All token rewards are **SIMULATED**.

## First session

1. Press a key after loading to open the cinematic main menu. Enter a username, optionally paste a public Solana wallet address, open Settings and return, then select Join the world without claiming a house. Invalid names/addresses should stay in the menu with a clear error. Check that the live count changes when another player enters or leaves the streets, and that an unavailable count shows a dash rather than a fake zero. Use separate browser profiles to check distant random spawns; reloading the same profile should preserve its location, health and night score.
2. Explore all five districts. Check that unlit forest areas are dark, lamps form small pools, and the lantern reveals nearby ground. Grass/leaf footfalls should stay quiet beneath the atmosphere. Compare gravel and mud.
3. Select crowbar (2), approach another player and left-click. Hits require facing, reach, clear terrain and stamina. Four crowbar hits kill. Attack cooldown and spawn protection must work; swinging immediately ends the attacker's protection.
4. Collect a shovel with E at a marked site, select it with 3 and attack. Three shovel hits kill. Check weapon/arm animations, positional impacts, hurt feedback, death delay and distant respawn. Found shovels and loose candy are lost on death. Pause is not PvP immunity; disconnecting within eight seconds of damage counts as death. A second tab with the same profile must be rejected.
5. Walk to a free plot sign, press E and build at that physical location. There is no plot-selection lobby. Holder plots remain planned and locked. E opens the palette, M captures the mouse, left-click places, right-click breaks, R rotates, Space/Shift flies, undo/redo restores edits. Palette input must not move the camera. Try removing the entire floor and rebuilding from the foundation.
6. Save and return outside before hiding candy; reenter from your plot sign and confirm the draft. Add up to three stashes, test the house, search and escape. Verification publishes the tested draft and returns you outside automatically. Failed tests return outside without publication.
7. Without owning a house, walk to a public house and enter with E. Search and escape, or leave through pause. Both return to the same doorstep. There is no blocking results screen. A failed reward verification offers retry while you remain outside; new visits wait until resolved or explicitly discarded.
8. Search outdoor caches with held E. Return to the Lantern Gate to bank loose candy. Menu and house transitions retain it. The bank resets with the four-hour session night or server restart and is separate from simulated token rewards.
9. Check stalking/rushing creature scares, Q screams, optional V microphone input, camera-motion controls, reduced flashing and audio mute. No recorded voice leaves the device.
10. Judge the same experience at 1280×720 and 1920×1080. Check readable health, stamina, compass, four-slot outdoor hotbar, interaction prompts and unobstructed microphone controls.

Outdoor combat and scores are local session gameplay, with no token payout for kills. House reward rules remain simulated and server-verified. Building and house interiors currently use separate scene instances, preserving the world location when you return; players cannot fight each other inside a raid or while building. The material palette is an editing tool, not a menu required to enter the world.

## Main menu and profile

- Reload: your saved username and pasted address should return. Escape → Main Menu leaves the street and restores the form. Verify 720p/1080p bounds and keyboard focus on inputs, Settings, Join and the X link.
- Other players should see the saved username on your character. Pasted wallet addresses must never appear in street snapshots, grant ownership of another house, verify a wallet or change simulated holdings. Joining without a wallet address must work.
- A failed profile save must keep your entries and leave you in the menu. Retry after restoring connectivity. Settings, reduced motion, music and X links must work before joining.

## What to judge critically

- Does the world-first flow feel continuous, with readable controls and useful landmarks?
- Can you understand building, hiding, clearing, publishing and raiding without help?
- Are landmarks and paths distinct enough to navigate?
- Are texture detail, flashlight reach, fog and nighttime visibility comfortable?
- Do footsteps and screams sound convincing without becoming tiring?
- Are stash layouts and scares fun to revisit?

Record browser/OS, viewport, settings, house code and reproduction steps. The automated microphone test uses a generated stream; a human still needs to judge real hardware, audio taste and scare strength. Performance measurements apply only to the measured machine/browser. Decorative landmarks have no separate interiors. Co-op house visits, clip export, live payouts and real holding verification remain outside this local build.

## Supplied asset-pack pass

- Check the real asset-loading progress and retry after a failed model request. Entry stays blocked until all 261 models load.
- Inspect the caretaker cottage and pumpkin character in the village, varied headstones and open graves in Old Mercy, striped carnival tents and candy stall, scarecrows and cauldron in the harvest fields, and the chapel tower and offering altar.
- Look for animated ghosts, bats, crows and monsters. These outdoor creatures are atmospheric scenery; the existing house lurker/follower rules still control hostile encounters.
- Switch outdoor slots 1–4: lantern, crowbar, collected shovel and map should match. House raids retain their existing tool slots. Inspect the same models in hotbar and builder icons.
- Place a chest, spikes, screamer, cobweb, lantern and door. Enter and replay a raid; collected candy must leave the supplied open-chest model. Returning to the menu or builder must not corrupt textures or other players’ limbs.

## Supplied SFX pass

- After the first key/click unlocks audio, check the porch wind and quiet menu taps. Loading itself remains silent until browser audio permission is unlocked by that gesture.
- Walk on the gravel paths, then into fallen leaves and the parish mud. In a house, compare wood, concrete, carpet, metal and stairs. Stop moving: footfalls should stop; sprinting should increase their cadence without starting overlapping walking recordings.
- Open and close a door, trigger a slammer/screamer/follower, and collect a chest. Check that each event sounds once. An open door should stop muffling sound from the next room.
- Approach the cemetery ghost or harvest monsters. Growls should come from the creature's position, remain spaced apart and stop when you leave for the menu. Crossing a district boundary should fade between winds.
- Music controls wind/ambience; Effects controls footsteps/doors; Voices controls growls/player screams; Master controls everything. Test zero volume for each and background-tab suspension.
- Pause and scrub a replay. Seeking must not replay every old scare or create a burst of footsteps. Returning to the menu should clear old positional sounds and wind fades.

Automated checks verify decoded playback, audibility, mute behavior, source/output integrity, event deduplication, retry and disposal. A human should still judge the recordings' character and loudness on their own speakers/headphones.

The `soundeffects_new` recordings now provide quiet music and atmosphere, Q/V player screams and trap/monster jumpscare accents. Rapid triggers must not overlap screams or jumpscare accents. Jumpscares wait at least nine seconds and until the previous clip ends plus 2.5 seconds. Nearby scares should briefly lower the background and then restore it smoothly, without changing your Music setting. The main-menu music must stop when entering the world; the atmosphere takes its place. Music/atmosphere obey Music, screams obey Voices, and jumpscares obey Effects.

## Cinematic lighting pass

- Compare the amber pools under lamps and pumpkins with the cold, darker gaps between them. At the cemetery and chapel, check that trees, gates and pillars cast directional shadows as you walk.
- Enter a house and switch the flashlight off/on. Ordinary walls must not glow on their own; the beam should reveal surfaces and be interrupted by solid geometry. Corners retain the existing voxel shading plus subtle contact shadows.
- Watch one damaged lamp for roughly 25 seconds. Most lamps stay steady; damaged lamps occasionally dip or fail, independently of the other lamps.
- Look towards the distant carnival wheel or windmill. Fog should gradually hide detail and match the sky, while nearby paths, candy and doors stay readable.
- In settings, adjust Film Grain and toggle Cinematic Effects, Contact Shadows and Directional Shadows. They update immediately in menus, visits, replays and the builder. Reduced Flashing stops damaged-lamp flicker and animated grain. The HUD is drawn after the scene effects, so text stays clear.
- Resize the window, revisit a house and return to the menu. Check for stale frames, bright flashes, doubled dark edges or growing GPU memory. Cinematic Effects can be disabled for slower machines.

## Hills and second asset pack

- Walk and sprint along the winding woodland routes between districts, then explore off-road. Hills should reveal and hide the next landmark naturally; the camera, rivals, name labels, mist and positional sounds should follow their elevations.
- Visit the ruined village house, cemetery crypt and bone shrine, carousel and Ferris wheel, harvest barn and windmill, drowned church, Mercy annex at (161, 284), and hanging ridge watchtower at (-160, 286). Check their collision footprints and clear routes back to plots and candy caches. These buildings are decorative landmarks without separate interiors.
- Watch the wheel, carousel, sails, rocking chair and gibbet sway. The village doll changes its head pose when outside your view. Reduced Flashing freezes these props as well as the existing atmosphere animations.
- Check all forty plot approaches and foundations, including a freshly published house. Walk uphill/downhill with another local player; their feet should follow the ground and labels should remain above their heads.
- Inspect grass, bushes, logs, rocks and dead trees across the hills. Repeated details should disappear into fog without leaving visible holes nearby. Report any floating props, exposed terrain seams or paths sinking into hills.

## Dense forest pass

- Compare pine woods around (-69, 265), autumn woodland near the logging cabin (-165, 110), and the drowned grove (172, 442). Look for canopy cover, trunks at different heights, ferns, brush, litter and distinct ground textures. Keep paths and house approaches readable.
- Follow the new trails to the watching tree (-20, 275), lost camp (-55, 275), stone vigil (45, 285) and root hollow (-175, 245). Check the map diamonds and HUD location names. These are exploration scenery, not new paid plots or reward sources.
- Approach the campfire and wolf: sounds should come from their actual positions without drowning out voices. Inspect the owl, quiet stag, drifting wisp/fireflies and falling leaves. Turn Reduced Flashing on; canopy motion and the new animations should stop.
- Walk into trunks, boulders, cabin walls and the fallen tree. They should block movement; ferns and other soft ground cover stay passable. Walk around each obstacle and confirm there is a way back to the main paths.
- Inspect fog and light shafts from both sides and at close range. They should fade without forming opaque walls. Toggle shadows and cinematic effects, change resolution, enter a house and return to the woods; check for stale shaders or growing memory use.

## Outdoor movement and creature scares

- Compare walking in a house with walking outside: indoor speed is 3.6 m/s and outdoor speed is now 3.9 m/s (previously 7). Sprint still costs stamina. Diagonal movement must not be faster, and pushing against a wall should not keep the camera bobbing.
- Leave the lantern gate and compare a woodland path with the lantern on and off using F (or your rebound flashlight key). Both the beam and nearby glow should switch. Dark areas should hide detail while silhouettes and lamp pools remain readable.
- Wander away from doors and the bank for at least 25 active seconds. Encounters need an unobstructed route, so allow longer in dense woods. A stalker appears behind you with a positional growl; turn toward it and it should vanish after a short glimpse. Later, a rushing creature approaches quickly, stops short of the camera and disappears with a jumpscare sound. These apparitions cause no damage or candy loss.
- Allow quiet gaps between encounters. Opening the map/menu, losing focus, using a door or holding E should cancel them. Returning from a paused or hidden tab must not immediately trigger a queued scare.
- Adjust Camera Motion to zero and disable Outdoor Creature Scares independently. Reduced Flashing should also suppress the new camera motion and encounters. Check that settings persist after reloading and that normal player screams and environmental audio still work.
- Listen on headphones as a creature approaches. Its sound should follow its position. Test muted Effects/Voices and confirm the new cues use those controls, respect the existing jumpscare cooldown, and stop when entering a house or returning to the menu.

## Held world map

Press M or select outdoor slot 4. The map should unfold as pixelated parchment held by two blocky hands, with the world visible behind it. Its terrain and roads match the actual world; the white arrow shows your location and facing direction. Gold marks home, cream/green marks free plots, brown houses are occupied and gray locks mark reserved plots. Check both 720p and 1080p, then fold it with M, Escape or the button. Movement stops while reading, but other players can still attack; death closes the map. The inventory icon and held paper use the same terrain artwork.
