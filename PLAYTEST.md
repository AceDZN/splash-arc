# Playtest and verification — Splash Arc

What was verified, how, and what wasn't. Automation proves the rules and flows work; it does not show that the game is fun or that students learn the quadratic function. That needs real students.

## Automated tests (`npm test`, 27 passing)

- **Arc math** (`tests/arc.test.ts`): `a = −k/p²` and landing `2p` from the origin; `a = (h − k)/p²` from a raised launcher; zeros symmetric about `x = p`; `a ≥ 0` never lands; a horizontal shift moves vertex and zeros together; Workbook-style formatting with real minus signs and school rounding.
- **Every authored level** (`tests/levels.test.ts`): the exact set of winning vertices on the 0.5 m grid (L1 `p = 4, k ∈ {4.5, 5, 5.5}`; L2 `(5, 7)`; L3 `(2, 4)`; L5 only `p = 4.5`; L6 `(4, 8)`; L7 `(5, 9.5…13)`), the handoff's algebra (`y(2) = 0.75k`, `y(8) = 16k/25`, `y(3) = 21k/25`), fine-mode windows, and the advertised consequences (wall, net, branch, space, overshoot after the drift, "standing under the vertex" in return fire, the `(x + 1)` card).
- **Eyeballing / constant strategies:** no single snapped vertex wins two authored levels; under 6 % of snapped vertices win any one level; neighbouring arcs pass visibly outside a lantern's hit radius; generated challenges always have 1–4 answers and "always k = 8" fails most of them.
- **State machine** (`tests/game.test.ts`): snapping and clamping, miss → impact → aim with a balloon spent, first-try 3 stars at three different frame rates (timing independent of frame size), out of balloons → refill, hints mark attempts as hinted, pause freezes flight, the raft drift, return fire with a fresh volley after a miss, and restarts that don't erase misses or hints.

## Real play

- **Independent reviewer** (headless Playwright, real keys and a real mouse drag; logic stepped because the machine was overloaded): won every level, made recoverable mistakes on levels 1–6, used hints on 3 and 4, ran out of balloons on 7 and restarted. Findings and their fixes: [docs/MATH_REVIEW.md](docs/MATH_REVIEW.md).
- **Crew lead in the built-in browser** at 1280×720: full win and wall splat on level 1, the return-fire miss and catch, the a > 0 and a = 0 messages on level 3, a lantern near-miss on level 6, hint bubble, title screen and level select, challenge mode. Phone portrait 375×812 and phone landscape 812×375 layouts checked by screenshot. Console clean once all models load.
- **Visual captures** with real drags and keys at the mockups' framing: [docs/VISUAL_REVIEW.md](docs/VISUAL_REVIEW.md).
- **Tripo models in gameplay:** camper and rival load with six clips each (throw, cheer, hit, jump, frustrated/laugh, idle) and play on game events; slingshot, lifeguard tower and cabin load as set pieces.

## Performance (measured)

- Headless Chrome, ANGLE Metal on an Apple M2 Max, 1280×720 at DPR 2, level 1: **60 fps** (vsync cap), ~212 draw calls, ~237k triangles (`scripts/fps.mjs`). Measured when the machine's load average was about 12.
- Earlier, while other crews' browsers pushed the load average to 150–220, the browser pane ran at ~1.5 fps; that's the machine, not the game, but it means real-time feel was mostly judged through stepped captures.
- Production build: `dist/` 8.3 MB; main JS 5.1 MB (1.9 MB gzipped), mostly Rapier's inlined WASM and Three.js; models 0.3–1.2 MB each.

## Known limits

- Not played by real students or on a real phone; touch was tested by emulation only.
- No measured learning outcome. The learning log records first unaided attempts versus hinted ones, but nobody has analysed it.
- Walls and nets are 3D panels turned about their exact x-line; they still look somewhat wider than the rule they represent.
- Mobile portrait shows a small field; the title screen suggests rotating.
- The bundle is large for a phone on a slow connection (Rapier WASM is inlined).
- Not deployed; the public GitHub repo could not be created from this session (see progress.md).
