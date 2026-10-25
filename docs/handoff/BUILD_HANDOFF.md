# Splash Arc — קשת המים — build handoff

Read `../COMMON.md` first. Repo `/Users/acedzn/dev/AceDZN-exp/splash-arc` → public `AceDZN/splash-arc`, port 5212 (preview 4212).

## Promise

A summer-camp water-balloon war, Besiege-meets-Peggle. Your crew's slingshot sits on the beach. Across the field, the rival cabin's cardboard-and-pillow fort is guarded by walls, trees and a lifeguard tower. You don't pull back and guess: you **grab the glowing vertex of the arc and drag it**. The live equation `y = a(x − p)² + k` updates in the HUD, the arc stays pinned to your launcher, and the landing point (the second zero) slides with it, mirrored by symmetry. Release, and the balloon flies exactly along your curve and smashes the fort with real physics, splash particles and soaked campers. The rival camp fires back with arcs written as equations: read their zeros to dodge, or catch the balloon in a bucket for a combo.

Map evidence: Besiege × Peggle Deluxe (related, density 0.723). Fireworks Mania × Peggle (0.713) was close but has less agency; Slime Rancher × Peggle (0.715) is similar.

## Curriculum (Workbook grade 9, chapter 4)

[parabola-y-equals-x2](https://math.workbook.co.il/grade-9/chapter-4/parabola-y-equals-x2), [parabola-symmetry-and-vertex](https://math.workbook.co.il/grade-9/chapter-4/parabola-symmetry-and-vertex), [vertical-shifts](https://math.workbook.co.il/grade-9/chapter-4/vertical-shifts), [horizontal-shifts](https://math.workbook.co.il/grade-9/chapter-4/horizontal-shifts), [stretch-reflect-parabola](https://math.workbook.co.il/grade-9/chapter-4/stretch-reflect-parabola), [vertex-form](https://math.workbook.co.il/grade-9/chapter-4/vertex-form), [factored-form](https://math.workbook.co.il/grade-9/chapter-4/factored-form). Optional: [quadratic-positive-negative](https://math.workbook.co.il/grade-9/chapter-4/quadratic-positive-negative) (where the arc is above a wall's height).

Rules: the flight path is exactly `y = a(x − p)² + k` in metres in the vertical plane of the shot (the balloon moves along it with a time parameter; it is not a separate physics sim). Vertex `(p, k)`; axis of symmetry `x = p`; zeros symmetric around p. With the launcher at the origin, `a = −k/p²` and the landing zero is `2p`; with a raised launcher `(0, h)`, `a = (h − k)/p²`. a < 0 opens downward. If the player makes a ≥ 0 (vertex below the launcher), the balloon "flies off to space" or splats at their feet, which is funny and recoverable. Show the equation in Workbook form with LTR rendering, rounding a to at most 2 decimals for display, and keep exact values internally. Hebrew terms: פרבולה, קדקוד, ציר סימטרייה, נקודות אפס, הזזה, מתיחה.

Misconceptions to catch: `(x − p)` shifts left when p > 0; the vertex is the landing point; a bigger k always lands farther (it doesn't with fixed p); zeros aren't symmetric about the axis.

## Loop

- Turn-based volleys. Drag the vertex handle (snap 0.5 m, with an optional fine 0.1 mode). Equation tiles show `a`, `p`, `k`; tapping a tile lets you nudge that value (a second representation of the same curve). A short dotted arc preview is shown on early levels, then shortened, then removed for the transfer level, so reasoning replaces aiming.
- Impact: Rapier physics on cardboard walls, pillows and buckets; the score counts soaked targets. Limited balloons per level, free retry.
- Return fire: the rival's arc appears as an equation card a beat before launch; move your camper (drag along the beach) to dodge, or place a bucket at the zero to catch it.

## Levels (author exactly; tests prove each)

1. **Over the wall** — launcher (0, 0), target crate at x = 8 → p = 4. Wall at x = 2, height 3; net at height 6. Arc `y = a·x(x − 8)` with `a = −k/16`: `y(2) = 0.75k > 3` → k > 4, and k < 6 (net). E.g. k = 5 → `y(2) = 3.75` ✓.
2. **Piñata** — piñata hanging at (5, 7): it's the peak → vertex (5, 7), lands at x = 10 in the pool.
3. **Lifeguard tower** — launcher raised to (0, 3), vertex (2, 4) → `a = −1/4`, lands at x = 6 (target there).
4. **Return fire** — the rival throws `y = −0.5(x − 4)² + 8` → zeros 0 and 8. Catch it with the bucket at x = 8.
5. **Drifting raft** — the launcher rides a raft that drifts +2 m before firing. The whole arc shifts right by 2 (horizontal shift), so aim the vertex 2 m short.
6. **Double hit** — two lanterns at (2, 6) and (6, 6) on one arc from the origin → symmetric about p = 4; through (0, 0): `a = −0.5`, `k = 8`; lands at 8.
7. **Transfer: night raid on the counselors' fort (no preview, no grid labels)** — launcher (0, 0), target at x = 10, wall at x = 8 height 6 (`y(8) = 16k/25 > 6` → k > 9.375), branch at x = 3 height 11 (`y(3) = 21k/25 < 11` → k < 13.1). Vertex (5, k) with 9.5 ≤ k ≤ 13.

After the slice works: generated volleys from a solver that guarantees a valid window (and that a fixed "always k = 8" strategy fails across them).

## 3D and art

Sunny Israeli summer camp by the sea: eucalyptus trees, a lifeguard tower, colorful cabins, a sunset for the night raid. Toon shading, big readable silhouettes, water-splash VFX. Procedural: the arc, vertex handle, grid, walls' exact heights, buckets, and fort blocks (physics). Tripo: the **two camper crews** (rigged, Mixamo throw/dodge/cheer/soaked reactions, 1–2 characters reused with tints), the **slingshot/launcher**, and the **lifeguard tower** and a cabin as set pieces.

## Acceptance

In the first 30 seconds: drag the vertex, watch the equation and the landing point move together, hit the wall once (a funny splat), adjust k, and soak the crate. All curve math comes from the pure module; tests cover every authored level, and in the transfer window only the intended range of k works.
