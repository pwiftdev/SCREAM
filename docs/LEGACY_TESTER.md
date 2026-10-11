# Local tester handoff

This build is ready for a first critical local playtest. The automated checks cover the complete match flow, rendering, animation assets, audio, networking and collisions. Human acceptance of the art direction, fairness and horror atmosphere is still pending.

## Start

Open **http://127.0.0.1:5173** while `npm run dev` runs. Enter the fairground, choose a role, select a character, click **Step Inside**, then **Start the Night**. Default practice adds up to four bots. Matches have **four survivors and one killer**; the five survivor portraits are character choices.

For two human windows, open `http://127.0.0.1:5173/?bots=3`. The second window enters the host's room code before starting. For five humans, use `?bots=0`. Choose High for the lighting review, Medium for the performance baseline. `?perf=1` displays frame rate, render scale and draw calls. Use the on-screen help for controls and Settings for remapping, volume, Reduced Motion and Flash Reduction.

Repair five of nine generators, open one of two gates and escape. The killer injures, downs, carries and cages survivors. Rescue teammates and use pallets, vaults and lockers during a chase.

## World and movement review

The arena is 90 × 90 metres, with eight chase loops, a two-level house, nine objective sites and two opposing exits. All 102 combinations of six spawn candidates and seventeen generator/cage/gate destinations passed collision-controller traversal. The exit-to-exit route is about 88 metres. See [the map](map-overview.svg) and [travel measurements](map-travel.json).

Walk and sprint from the south exit through the camp, carousel and north exit. Visit both stall lanes, the western perimeter and the house stairs/balcony. Check that paths, silhouettes and interactions remain readable at Low, Medium, High and Ultra. Listen for changes between indoor/outdoor space, footsteps, generators and the carousel. With two windows, watch the other character walk, run, crouch, change direction, vault, take a hit, recover, get carried and return from a cage.

## What has been verified

- Four-survivor capacity, rejection of an extra player, signed ready queues and 128 delayed spectators.
- Full authoritative bot matches, objectives, injuries, rescue/carry/cages, gates, match end, scores and reconnects.
- Every exported clip on all six model choices; interruption blends, one-shot completion, gait selection, angle wrap, irregular snapshots and hidden-player resets.
- Two-window browser flow at 1280 × 720, 1600 × 900 and 2560 × 1440; responsive results screens and asset failure recovery.
- Real audio decoding, audible output, volume/mute, listener orientation, source limits and disposal.

Exact final results and measured hardware performance are in [AUDIT.md](AUDIT.md). These are automated/local checks, not a completed external tester review.

## Known limits to challenge

The survivor clothing and some architecture retain a stylized free-asset look. Several gameplay animations are adaptations, including the prone movement; they are not a bespoke motion-capture set. The shoulder carry has a visual offset rather than full hand-contact inverse kinematics. Voices remain synthesized. Surface footsteps and indoor muffling are approximations. Desktop mouse/keyboard is the tested control scheme; other devices and sustained low-end hardware performance remain unverified.

Practice bots are training opponents. Five seeded samples now produce both escape and killer-win outcomes, but that does not establish four-human balance. Record the role, character, seed/room, graphics preset, resolution, observed frame rate, location and steps for any problem. Prioritize stuck movement, unreadable opponents, camera obstruction, animation popping, loud/missing cues, unfair chases and unclear objectives.

Everything stays local. Rewards and external data are off. No paid service, public host or commit is part of this handoff.
