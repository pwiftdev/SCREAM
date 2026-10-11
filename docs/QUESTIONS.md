# Current direction

The latest user instruction supersedes the Hollow Lane working title: the game is **Let’s Scream Together**, token **$SCREAM**, using `scream-7d.png`. First-time players claim a plot, build a house and hide candy before hunting. The world is a connected set of horror districts with permanent plots. Rewards use a finite local candy treasury; real creator-fee funding and payments remain disabled.

# Build decisions

The user instruction to keep everything local overrides the prompt's Heroku deployment acceptance. Deployment is deferred until the user plays and approves the local game. No paid asset packs, paid APIs, cloud resources, real funds, or production credentials are used.

The requested CLUMSY checkout already exists at `../CLUMSY` (case-insensitive filesystem); its README, audit and handoff were inspected. Do not clone over or modify it.

Local practice uses an explicitly marked test identity without wallet signing. Wallet authentication remains required for a non-practice player seat. The user explicitly requested free Internet models and more realistic graphics. The local build now uses credited free character assets and scanned environment art; synthesized audio remains original project work. Visual quality and balance still require the owner’s playtest.

## Hollow Lane pivot

The new prompt replaces the earlier realistic fairground direction with original pixel-block horror. The earlier game remains available at `/legacy` while the pivot is built.

The block list says 30 types but names 33, plus batteries. All named blocks and a battery are included (34 placeable types plus air).

The fixed HouseV1 array describes a 16-block height, while holder perks request 24. The backward-compatible v1 decoder now accepts an explicit `height: 24` extension; missing height still means exactly 24 × 24 × 16. Publish checks the holder balance, while existing published versions remain intact if a balance drops.

The local-only instruction still overrides public Heroku deployment. Economy stays off by default. Live money requires the separately requested team sign-off and completed flow verification.

The latest open-world instruction expands the street into a continuous 220 × 635-unit neighborhood with woods, footpaths and landmarks. The 40 plots remain; interiors run as separate verified visits. Outdoor movement and collision are shared by the browser and room server. Q is a nearby social scream, not a combat ability.

Scream Score includes a bounded mic bonus and subjective ratings for discovery. Pretend prize eligibility uses verified run outcomes so fabricated microphone peaks cannot decide even a test award. This distinction must be revisited explicitly before any real-money design.
