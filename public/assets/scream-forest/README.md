# Let's Scream Together — 3D Asset Pack

Every asset is a separate GLB in assets/<category>/<id>.glb. See manifest.json for sizes, pivots, sockets and notes.

Conventions
- Units: meters. 1 block = 1 m. Characters are 2 blocks tall.
- Axes: +Y up, +Z forward (faces, doors, signs point at +Z).
- Origin: base center. Every asset rests on y = 0.
- Textures: 16×16 px pixel art per 1 m face. Use NEAREST filtering, no mipmaps, REPEAT wrap, sRGB. Large faces tile the texture at 16 px/m, so block density stays consistent on props.
- Emissive: glowing parts (jack-o'-lanterns, lanterns, windows, eyes, candy loot, slime) carry an emissive map. Add real point lights in-engine: warm #ffb04a for lanterns and pumpkins, red #e0303a for stained glass and screamer eyes, green for cauldrons.
- Alpha: dead leaves and cobwebs use alpha MASK (cutoff 0.5), double-sided.
- Rigging: no skeletons. Animate the Group nodes named pivot_* (they sit at the joint: neck, shoulders, hips, lids, hinges, wings, jaws). socket_* nodes are attachment points (e.g. item_viewmodel_arm/socket_hand).
- Characters share one rig: pivot_head, pivot_armL/R, pivot_legL/R.

Folders
- assets/ — one GLB per asset, at the origin.
- textures/ — every 16×16 texture as PNG (+ _emissive.png where it glows), for rebuilding materials or atlasing.
- scream_forest_pack_all.glb — every asset in one scene, laid out in rows by category (for previewing in Blender).
- manifest.json — machine-readable list of every asset.
