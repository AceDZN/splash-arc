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

Balance after this crew's last action: **6815** (the 940-credit drop includes the other crews' spending).

### Models

| Optimized file | Tripo task | Prompt | Notes |
|---|---|---|---|
| `public/models/camper.glb` | https://studio.tripo3d.ai/workspace/generate/517bc28e-a427-4598-a11c-deca78a523bf | "A cheerful 13-year-old summer camp kid, stylized toon game character with chunky slightly oversized head and hands, big friendly grin, bright orange camp T-shirt with a small white sun logo, navy blue shorts, white-and-blue sneakers, light khaki bucket hat, tanned skin, short curly brown hair, hand-painted toon texture, clean readable silhouette, full body, T-pose with arms straight out, standing on no base, game-ready" | Shorts came out olive, not navy. Rigged + animated (below). |
| `public/models/rival.glb` | https://studio.tripo3d.ai/workspace/generate/7a77e90b-0b47-461a-8180-5a1ac7c6112f | "A mischievous 13-year-old rival summer camp kid, stylized toon game character with chunky slightly oversized head and hands, cheeky smirk, completely plain solid teal T-shirt with no logo, no print and no text, grey cargo shorts, red sneakers, white sweatband headband, messy black hair, hand-painted toon texture, clean readable silhouette, full body, T-pose with arms straight out, standing on no base, game-ready" | Second attempt. The first rival (task `e727db02-dd73-49d5-bec6-6cf8d4d05723`, same prompt but "teal camp T-shirt with a small white wave logo") came out with a Nike-like swoosh on the shirt, so it was not used or downloaded. |
| `public/models/slingshot.glb` | https://studio.tripo3d.ai/workspace/generate/de0bb9c3-112f-47cc-8b60-bb59d0582fe1 | "A big wooden Y-shaped slingshot launcher for water balloons, mounted upright on a small sturdy square wooden stand with four short legs, chunky carved wood with visible grain and rope wrapping on the fork, a thick bright red rubber band stretched between the two prongs with a leather pouch in the middle holding a round magenta water balloon, stylized toon game prop, hand-painted texture, clean readable silhouette, summer camp style" | The magenta balloon is baked into the pouch; hide it behind the procedural balloon or accept it as the "loaded" look. The red band is a rigid strip across the fork tops. |
| `public/models/lifeguard-tower.glb` | https://studio.tripo3d.ai/workspace/generate/c72f5e2b-f368-47e5-8a41-86704e0d0ae4 | "An Israeli Mediterranean beach lifeguard tower, wooden hut painted in bold red and white stripes raised high on four wooden stilts with diagonal cross braces, a steep wooden ladder at the front, a small viewing deck with railing, a flat shade roof overhang, a red-and-white life ring hanging on the railing, a small flag pole, stylized toon game set piece, hand-painted texture, clean readable silhouette, standing on a small patch of sand" | Set piece only. |
| `public/models/cabin.glb` | https://studio.tripo3d.ai/workspace/generate/9726c05d-5d2e-4400-9bee-a1f47415ede5 | "A colorful wooden summer camp cabin, small single-room bungalow raised on short wooden posts, walls of painted vertical planks in turquoise with sunny yellow window shutters and an orange front door, a pitched red tin roof with a slight overhang, a little front porch with three steps and a railing, a string of colorful pennant flags along the eaves, a hand-painted wooden sign above the door, stylized toon game set piece, hand-painted texture, clean readable silhouette" | Set piece only; tint copies for variety. |

### Rigs and animations

Both characters: Tripo **Rig → Humanoid, Skeleton Preset "Mixamo"**, Auto Rig (20 credits each) → 1 skin, 65 joints named `mixamorig:Hips`, `mixamorig:Spine`, … (identical skeletons, so clips from one file can also drive the other). Then **Animate → Preset** clips (free), applied one at a time; each retarget queued for 1–15 minutes. Exported from the Animate page with Export → GLB, texture 1k, **Export Skeleton on, Number of Animations = the clips below, "Animation stay in Place" on** (no root motion: move the character in code).

| File | Clips in the GLB (name as stored, duration) | Use |
|---|---|---|
| `camper.glb` | `idle` (15.33 s), `pitch_baseball` (3.79 s), `jump` (2.21 s), `cheer` (12.08 s), `hit_to_head` (1.83 s), `frustrated_01` (3.54 s) | idle; throw = `pitch_baseball` (release around the middle of the clip, tune in code); dodge = `jump`; win = `cheer`; soaked = `hit_to_head`; splat on the wall / facepalm = `frustrated_01` |
| `rival.glb` | `idle` (15.33 s), `pitch_baseball` (3.79 s), `jump` (2.21 s), `cheer` (12.08 s), `hit_to_head` (1.83 s), `laugh_01` (5.58 s) | same, plus `laugh_01` for the rival laughing at a miss |

The clip order inside each file differs (`camper`: cheer, frustrated_01, hit_to_head, jump, pitch_baseball, idle; `rival`: idle, cheer, jump, pitch_baseball, laugh_01, hit_to_head), so look clips up by name (`THREE.AnimationClip.findByName`). `cheer` and `idle` are long; play sub-ranges or loop as needed. A `jump_down` clip was applied to the camper by a misclick and deliberately left out of the export.

Interim exports with 3 clips each (`assets-src/splash-arc-camper-3anims.glb`, `assets-src/splash-arc-rival-3anims.glb`) were made while the queue was slow; they are superseded by the 6-clip files.

### Orientation and scale (all files)

Tripo normalizes every model so its largest dimension is ~1 unit; glTF is Y-up, base at y = 0. Characters (bind pose, computed by skinning the vertices): height 1.0, T-pose arms along ±X, and the toes point to **+Z**, so the characters **face +Z**. Scale in code to the game's metres (a 13-year-old ≈ 1.5 m → `scale ≈ 1.5`). Don't trust `Box3.setFromObject` on the skinned meshes; use these numbers. The props were shown front-on in the same Tripo viewer as the characters, and their widths along X match those front views (slingshot fork spreads along X, tower and cabin fronts along X), so their front is most likely +Z too; confirm in the scene (the slingshot needs a 90° turn if the band should face the shot plane).

| File | Size | Triangles | Bounding box (min → max, units) | Textures |
|---|---|---|---|---|
| `camper.glb` | 1.08 MB | 19,446 | (−0.500, 0, −0.164) → (0.500, 0.999, 0.164) | 3 × 1024² WebP (base color, normal, metal-rough) |
| `rival.glb` | 1.16 MB | 19,716 | (−0.458, 0, −0.172) → (0.458, 1.000, 0.172) | 3 × 1024² WebP |
| `slingshot.glb` | 0.32 MB | 18,932 | (−0.219, 0, −0.363) → (0.219, 1.000, 0.363) | 3 × 1024² WebP |
| `lifeguard-tower.glb` | 0.32 MB | 17,894 | (−0.388, 0, −0.247) → (0.388, 1.000, 0.247) | 3 × 1024² WebP |
| `cabin.glb` | 0.48 MB | 18,166 | (−0.380, 0, −0.500) → (0.380, 0.764, 0.500) | 3 × 1024² WebP |

Total for `public/models/`: 3.35 MB.

### Processing

Raw Tripo exports (Export dialog: GLB, texture resolution 1k, for characters "Export Skeleton" on and "Animation stay in Place" on) are kept in `assets-src/` and are not meant for git. Optimized with `assets-src/optimize-model.mjs` (copied from the Goose on the Scale pipeline: weld, meshoptimizer `simplifySloppy` only if above the target, prune, dedup, WebP textures at 1024 px quality 82, meshopt compression), run with @gltf-transform/core 4.5.1, meshoptimizer 1.3.0, sharp 0.35.5:

```
node assets-src/optimize-model.mjs assets-src/<raw>.glb public/models/<name>.glb <targetTris> 1024
```

All models were already under 20k triangles from Tripo, so no mesh was simplified (target 20000 for characters, 100000 for props, meaning "don't simplify"). Skins (1 skin, 65 joints per character) and all clips survive the pass (checked by reading the output back).

**Loader requirement:** the optimized files use `EXT_meshopt_compression`, `KHR_mesh_quantization` and `EXT_texture_webp`, so the GLTFLoader needs `loader.setMeshoptDecoder(MeshoptDecoder)` from `three/examples/jsm/libs/meshopt_decoder.module.js`. No Draco and no KTX2.

Verification: `npx @gltf-transform/cli inspect public/models/<file>.glb` reads every file without errors; `gltf-transform validate public/models/camper.glb` reports no errors (only an info that the validator can't check `EXT_meshopt_compression`). A read-back with `@gltf-transform/core` + `MeshoptDecoder` confirmed 1 skin / 65 joints and the 6 clip names per character, and the skinned bind-pose bounds of the optimized files match the raw exports exactly. Not yet checked in the actual Three.js scene.

### SHA-256

Raw Tripo exports (`assets-src/`, keep out of git):

| File | Bytes | SHA-256 |
|---|---|---|
| `splash-arc-camper-6anims.glb` (source of `camper.glb`) | 2,266,280 | `9b0ce2a04805b4b9fc8c48596e135ef2c63c0914ba1be77554af878cee12a85b` |
| `splash-arc-rival-6anims.glb` (source of `rival.glb`) | 2,472,304 | `1f2fd5ad27129d8244173c5d8e1c9b25c3a298d36cf17a887f31289f836767f9` |
| `splash-arc-slingshot.glb` | 1,072,812 | `1dd3d0fef7f7f2fba1b1cdcc1d846043c8e4f403a52c47174a0a224741840dbf` |
| `splash-arc-lifeguard-tower.glb` | 1,056,964 | `c3208b55c01661c08601ee1c443d92cd4cd35eefdcac9623c471539c46e0d595` |
| `splash-arc-cabin.glb` | 1,446,184 | `043fa581fa578686b7b92d05e4801b45f99c1df70ed32d761b06bee13a28723b` |
| `splash-arc-camper-3anims.glb` (superseded) | 2,036,424 | `6279036741dc9ecbc5b3c53b777ec4871dc2b715e65123e9b8f7509bfdc423c9` |
| `splash-arc-rival-3anims.glb` (superseded) | 1,930,220 | `96b705472885f1684ae1b3d69f5d5307aa7aa20f23dc33c21bd20207aff9459d` |

Optimized (`public/models/`):

| File | Bytes | SHA-256 |
|---|---|---|
| `camper.glb` | 1,076,136 | `7a2bcb84fa398872a5405b7e13191caa3ead1684e815b0f578a6b8dee37f5109` |
| `rival.glb` | 1,155,236 | `20ce916ee4836a38bd6f8c20b92ef680ad411cb0787ec484c1bc85fbdd2af841` |
| `slingshot.glb` | 323,264 | `a3d7a041fe7304c12d8bf3fad2701ea5006b224b8f0b7b34fb128d21283e46c4` |
| `lifeguard-tower.glb` | 320,196 | `d83264ff32c962c5754e7e7b5a11424d0ddd0179f65b2a0de66dfb3ef76477d2` |
| `cabin.glb` | 478,084 | `9cbaa3bf2c8ab27a72127b8c1c8753a7bf08158a01d24f62445ebd7261548f3e` |

### Exact commands

```
node assets-src/optimize-model.mjs assets-src/splash-arc-camper-6anims.glb public/models/camper.glb 20000 1024
node assets-src/optimize-model.mjs assets-src/splash-arc-rival-6anims.glb  public/models/rival.glb  20000 1024
node assets-src/optimize-model.mjs assets-src/splash-arc-slingshot.glb       public/models/slingshot.glb       100000 1024
node assets-src/optimize-model.mjs assets-src/splash-arc-lifeguard-tower.glb public/models/lifeguard-tower.glb 100000 1024
node assets-src/optimize-model.mjs assets-src/splash-arc-cabin.glb           public/models/cabin.glb           100000 1024
```

(The script needs `@gltf-transform/core`, `@gltf-transform/extensions`, `@gltf-transform/functions`, `meshoptimizer` and `sharp` installed; they were run from a scratch install, not the game's `package.json`.)

## Other notes

- The ChatGPT and Tripo work used only this crew's own new tabs in the shared Chrome; other crews' tabs were not touched. One Tripo tab froze once while rigging (renderer unresponsive) and recovered after re-navigating to the same task URL; the rig job was unaffected.
- Generated meshes are visual only: never colliders or math surfaces.
