# Assets — Splash Arc (קשת המים)

## Gameplay mockups (design targets only)

`docs/visual-targets/01-first-30s.png`, `02-impact.png`, `03-consequence.png`, `04-night-raid.png` were generated with ChatGPT image generation in the user's Chrome on 2026-10-25. Exact prompts, the chat URL and known deviations are in `docs/visual-targets/PROMPTS.md`. They are targets, not evidence, and the Hebrew in them may be wrong.

## Tripo models

All models were generated in **Tripo Studio** (https://studio.tripo3d.ai/workspace/generate/) in the user's Chrome on 2026-10-25/26, signed in as the user. Settings for every generation: **HD Model, text-to-3D, AI model "H3.1 – Best Quality"**, Geometry & Texture panel: texture on, 2K texture quality, PBR on, Triangle topology, **polycount 20,000** (the panel's saved setting). T-Pose toggle on for the two characters, off for the props. No credits were bought, nothing was upgraded, no API was used.

Budget used: **6 of 6 model generations, 2 of 2 rig jobs** (one Humanoid/Mixamo auto-rig per character). Preset animations do not cost credits.

### Credits

The credit balance is shared with two other builder crews that were generating at the same time, so the header balance can't be split per builder. Balance before this crew's first generation: **7755**. Displayed cost of each of this crew's actions:

| Action | Displayed cost |
|---|---|
| 6 × text-to-3D generation (HD, H3.1) | 6 × 30 = 180 |
| 2 × Auto Rig (Humanoid, Mixamo) | 2 × 20 = 40 |
| Preset animations (retarget) | 0 (balance unchanged when applied) |
| Export GLB | 0 |
| **Total** | **220** |

### Models

| Optimized file | Tripo task | Prompt | Notes |
|---|---|---|---|
| `public/models/camper.glb` | https://studio.tripo3d.ai/workspace/generate/517bc28e-a427-4598-a11c-deca78a523bf | "A cheerful 13-year-old summer camp kid, stylized toon game character with chunky slightly oversized head and hands, big friendly grin, bright orange camp T-shirt with a small white sun logo, navy blue shorts, white-and-blue sneakers, light khaki bucket hat, tanned skin, short curly brown hair, hand-painted toon texture, clean readable silhouette, full body, T-pose with arms straight out, standing on no base, game-ready" | Shorts came out olive, not navy. Rigged + animated (below). |
| `public/models/rival.glb` | https://studio.tripo3d.ai/workspace/generate/7a77e90b-0b47-461a-8180-5a1ac7c6112f | "A mischievous 13-year-old rival summer camp kid, stylized toon game character with chunky slightly oversized head and hands, cheeky smirk, completely plain solid teal T-shirt with no logo, no print and no text, grey cargo shorts, red sneakers, white sweatband headband, messy black hair, hand-painted toon texture, clean readable silhouette, full body, T-pose with arms straight out, standing on no base, game-ready" | Second attempt. The first rival (task `e727db02-dd73-49d5-bec6-6cf8d4d05723`, same prompt but "teal camp T-shirt with a small white wave logo") came out with a Nike-like swoosh on the shirt, so it was not used or downloaded. |
| `public/models/slingshot.glb` | https://studio.tripo3d.ai/workspace/generate/de0bb9c3-112f-47cc-8b60-bb59d0582fe1 | "A big wooden Y-shaped slingshot launcher for water balloons, mounted upright on a small sturdy square wooden stand with four short legs, chunky carved wood with visible grain and rope wrapping on the fork, a thick bright red rubber band stretched between the two prongs with a leather pouch in the middle holding a round magenta water balloon, stylized toon game prop, hand-painted texture, clean readable silhouette, summer camp style" | The magenta balloon is baked into the pouch; hide it behind the procedural balloon or accept it as the "loaded" look. The red band is a rigid strip across the fork tops. |
| `public/models/lifeguard-tower.glb` | https://studio.tripo3d.ai/workspace/generate/c72f5e2b-f368-47e5-8a41-86704e0d0ae4 | "An Israeli Mediterranean beach lifeguard tower, wooden hut painted in bold red and white stripes raised high on four wooden stilts with diagonal cross braces, a steep wooden ladder at the front, a small viewing deck with railing, a flat shade roof overhang, a red-and-white life ring hanging on the railing, a small flag pole, stylized toon game set piece, hand-painted texture, clean readable silhouette, standing on a small patch of sand" | Set piece only. |
| `public/models/cabin.glb` | https://studio.tripo3d.ai/workspace/generate/9726c05d-5d2e-4400-9bee-a1f47415ede5 | "A colorful wooden summer camp cabin, small single-room bungalow raised on short wooden posts, walls of painted vertical planks in turquoise with sunny yellow window shutters and an orange front door, a pitched red tin roof with a slight overhang, a little front porch with three steps and a railing, a string of colorful pennant flags along the eaves, a hand-painted wooden sign above the door, stylized toon game set piece, hand-painted texture, clean readable silhouette" | Set piece only; tint copies for variety. |

ANIMATION_SECTION

### Orientation and scale (all files)

Tripo normalizes every model so its largest dimension is ~1 unit; glTF is Y-up. Characters: feet at y = 0, height ≈ 1.0, T-pose arms along ±X, so they face ±Z (the Tripo viewer shows the front along the glTF +Z axis for these exports). Scale in code to the game's metres (e.g. a 13-year-old ≈ 1.5 m → `scale = 1.5`). Props: base at y = 0. Measured bounding boxes are in the table below.

SIZE_TABLE

### Processing

Raw Tripo exports (Export dialog: GLB, texture resolution 1k, for characters "Export Skeleton" on and "Animation stay in Place" on) are kept in `assets-src/` and are not meant for git. Optimized with `assets-src/optimize-model.mjs` (copied from the Goose on the Scale pipeline: weld, meshoptimizer `simplifySloppy` only if above the target, prune, dedup, WebP textures at 1024 px quality 82, meshopt compression), run with @gltf-transform/core 4.5.1, meshoptimizer 1.3.0, sharp 0.35.5:

```
node assets-src/optimize-model.mjs assets-src/<raw>.glb public/models/<name>.glb <targetTris> 1024
```

All models were already under 20k triangles from Tripo, so no mesh was simplified (target 20000 for characters, 100000 for props, meaning "don't simplify"). Skins (1 skin, 65 joints per character) and all clips survive the pass (checked by reading the output back).

**Loader requirement:** the optimized files use `EXT_meshopt_compression`, `KHR_mesh_quantization` and `EXT_texture_webp`, so the GLTFLoader needs `loader.setMeshoptDecoder(MeshoptDecoder)` from `three/examples/jsm/libs/meshopt_decoder.module.js`. No Draco and no KTX2.

HASH_SECTION
