Original prompt: build the web-based 3D educational game Splash Arc (קשת המים), a summer-camp water-balloon war where you drag the vertex of y = a(x − p)² + k and the balloon flies exactly along that parabola into physics forts (Workbook grade 9, chapter 4). Same workflow as the earlier released games: ChatGPT gameplay mockups → Tripo models and rigs in the user's Chrome → build → visual review against the mockups; public repo AceDZN/splash-arc, commits to main. Full rules: docs/handoff/COMMON.md and docs/handoff/BUILD_HANDOFF.md.

# Progress log

## 25–26 Oct 2026

- Repo created locally at `/Users/acedzn/dev/AceDZN-exp/splash-arc` with the handoff in `docs/handoff/`. **Creating the public GitHub repo was blocked** by the session's auto-mode permission classifier ("Create Public Surface") on `gh repo create AceDZN/splash-arc --public`. All work is committed locally on `main`; it needs the user's approval (or the user creating the empty repo) to push. Reported to the starting session.
- Visual/Chrome helper generated four ChatGPT gameplay mockups (`docs/visual-targets/`, prompts in `PROMPTS.md`) and the Tripo models (`public/models/`, details in `ASSETS.md`).
- Pure rules first: `src/math/arc.ts` (vertex form, zeros, shift, formatting), `src/math/trace.ts` (exact analytic tracing against posts, ceilings, targets, rings), `src/game/levels.ts` (7 authored levels), `src/game/shot.ts` (aim, drift, catches, brute-force solver), `src/game/game.ts` (state machine, learning log). Brute force tightened two hitboxes (L5 flag, L7 fort) that let off-plan arcs win.
- 3D slice: stage (toon beach, sea shader, sky, set dressing), level view (axes with metre tiles, exact-height cardboard walls and nets turned about their x-line so they read from the side camera, branch, buoy, bunting, targets, piñata/lanterns, Rapier fort blocks and pillows), arc view (dotted preview, glowing vertex handle, axis line, k bar, landing ring, flown trail), FX (splash particles, wet spots, wall splats, pop-up words), audio (synthesized), HUD (Hebrew RTL, LTR math isolates, a/p/k tiles, k and p nudge groups, fire bottom-right like the mockups), overlays (title, pause with level select, win with worked explanation, out-of-balloons refill).
- Replay: `src/game/generator.ts` creates night-raid challenges; each is solver-checked to have 1–4 grid answers at `p = T/2`; a test shows "always k = 8" fails most of them.
- Tests: 26 passing (`npm test`): arc math, every authored level's exact winning set, the advertised consequences, eyeballing/constant-strategy checks, generator, state machine (snapping, misses, stars, out-of-balloons, hints, pause, drift, return fire).
- Browser checks in the built-in browser at 1280×720, 375×812 and 812×375; console clean. The machine was extremely loaded by other crews' browsers (load average 150–220, ~1.5 fps in the pane), so flights were checked with `advanceTime` and any FPS measured here is not representative.

- Tripo helper finished: camper and rival rigged (Humanoid + Mixamo) with six clips each, bundled per GLB; all five models meshopt-compressed with WebP textures (0.3–1.2 MB). Clips wired to events: throw on launch, cheer on a win or catch, hit (soaked) when splashed, frustrated on our miss, laugh for the rival, jump for "flew to space". 220 Tripo credits (6 generations, 2 rigs); details in ASSETS.md.
- Independent math review (docs/MATH_REVIEW.md) found 3 blockers and 10 should-fixes; all blockers and should-fixes are fixed except that walls/nets are improved rather than perfect (see the resolution table). Level changes: L4 gets a fourth `(x + 1)(x − 7)` card and fresh volleys after a miss; L5 target moved to 11 and starts on the drift trap; L6 lanterns moved to (3, 7.5)/(5, 7.5) with true-distance hits; L7 fort box lowered.
- Counselor onboarding line on level 1 and return fire; challenge raids with exact-fraction hints; captures redone; PLAYTEST.md written. 27 tests pass. Headless Chrome measured 60 fps at 1280×720 DPR 2 (M2 Max, load ≈ 12).

## Open items / next

- Pushed: the user approved on 26 Oct 2026, and the repo is public at https://github.com/AceDZN/splash-arc (main).
- Real students on real phones: fun and learning are unverified.
- Optional: lazy-load Rapier to cut the first download; a teacher view of the learning log; a dedicated stretch (`a`) control.
