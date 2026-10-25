# Splash Arc (קשת המים): math review and playtest

Reviewer: independent math reviewer. Date: 2026-10-26. Code reviewed at `ab4c36b` (line numbers below refer to that commit).
Scope: the pure rules (`src/math/*.ts`, `src/game/{levels,shot,game,generator}.ts`), the Hebrew text students see (`src/game/levels.ts`, `src/ui/hud.ts`, `src/main.ts`), the level geometry drawn in `src/scene/level-view.ts` and `src/scene/arc-view.ts`, and the tests.
This review does not claim anything about fun or learning gains. Automated play shows that the rules behave as described. It does not show that students learn.

## How it was checked

1. **By hand.** I derived every level from `a = (h − k)/(p − x0)²` and compared the result with `levels.ts` and the tests.
2. **By script** (scratch `analyze.ts`, `gen.ts`, `l6alt.ts`). I enumerated every 0.5 grid vertex and every 0.1 fine-mode vertex through `resolveShot`. I checked the start positions, the vertices that win more than one level, the near misses at the rings (measured both as vertical offset and as true perpendicular distance), and 400 generated challenges.
3. **Real play** (scratch `play.mjs`, `shots2.mjs`). I used headless Playwright against `localhost:5212`. Inputs were real keyboard input (arrows, Space, H, R) and real mouse drags of the vertex handle (level 2). I only stepped logic with `game.advance` because the machine was overloaded. Each level was played to a full win. Recoverable mistakes were made on levels 1, 2, 3, 4, 5 and 6. Levels 3 and 4 were played with hints. On level 7 all balloons were used up, then R was pressed to restart, then the level was won. Screenshots are in the scratch folder `review/*.png`.
4. **Tests.** `npm test` passes: 25 tests at the time of the run.

## Level-by-level verification (all re-derived; all match the code and tests)

| # | Algebra | Grid winners (0.5) | Fine-mode winners (0.1) |
|---|---|---|---|
| 1 | `a = −k/16`; `y(2) = −k/16·2·(−6) = 0.75k > 3` → `k > 4`; the net post at `x = 4` means `y(4) = k < 6` | `(4, 4.5) (4, 5) (4, 5.5)` ✓. `k = 4` touches the wall top (inclusive) and is a miss ✓ | `p ∈ [3.9, 4.4]`: the crate box is 0.8 tall, so arcs landing up to 8.8 clip its top |
| 2 | Zeros at 0 and 10 → axis `x = 5` → vertex at the piñata `(5, 7)`, `a = −0.28` | `(5, 7)` only ✓ | `p ∈ [4.8, 5.3]`, `k ∈ [6.7, 7.3]` |
| 3 | `a = (3 − k)/p²`; `(2, 4)` gives `a = −0.25`; `(x − 2)² = 16` → `x = 6` (and `−2`, behind the tower) | `(2, 4)` only ✓. `(2, 4.5)` lands at 5.46 and `(2.5, 4.5)` at 6.83, both misses | 54 vertices along a curved band from `(0.9, 3.1)` to `(2.4, 4.5)` |
| 4 | `−0.5(x−4)²+8` has zeros 0 and 8; `−0.5(x−2)(x−10)` equals `−0.5(x−6)²+8` and has zeros 2 and 10; `−0.25(x−5)²+9` has zeros −1 and 11 | Landings 8, 10, 11 ✓. Standing under the vertex is always a miss ✓ | n/a (the bucket snaps to 0.5; catch reach is 0.3) |
| 5 | The flown arc is `y = a(x − (p+2))² + k` from x0 = 2; landing `2p + 2 = 10` → `p = 4`; buoy `y(4) = 0.75k > 2.5` → `k > 3.33` | `p = 4`, `k ∈ {3.5 … 8}` (10 cells) ✓ | `p ∈ [3.9, 4.4]` |
| 6 | Axis `x = (2+6)/2 = 4`; `16a + k = 0` and `4a + k = 6` → `a = −0.5`, `k = 8` ✓ | `(4, 8)` only ✓ | `p ∈ [3.9, 4.1]`, `k ∈ [7.6, 8.4]` |
| 7 | `2p = 10`; `y(8) = 16k/25 > 6` → `k > 9.375`; `y(3) = 21k/25 < 11` → `k < 13.095` ✓ | `(5, 9.5) … (5, 13)` (8 cells) ✓ | At `p = 5`, `k ∈ [9.4, 13.0]` ✓. Overall `p ∈ [4.9, 5.4]`, and at `p = 5.3`, `k ∈ [8.2, 13.5]` (see N6) |

Rendering of the shared rules was checked separately:
- The bunting is drawn honestly. The rope is at 4.8 m and the flag tips reach exactly 4.6 m, matching the ceiling (`L3-bunting.png`).
- The wall's tape top and yellow arrow sit at the exact x and height.
- The axis labels match the metres.
- Equations show a real minus sign and are LTR-isolated.
- Every brace in hints, missions and toasts became `<bdi dir="ltr" class="m">` in the live DOM.

## Findings

### Blockers

**B1. Return fire (level 4) can be passed with no math: one miss reveals the answer, and retries are unlimited.** `src/main.ts:320`, `src/game/game.ts:315-326`
After a miss, the toast says, for example, ״נרטבתם! y = −0.5(x − 2)(x − 10) נוחת ב־x = 10, והדלי היה ב־x = 5״. The same volley is then thrown again from the same thrower. Playtest: I put the bucket at 5 for volley 2, read the toast and moved to 10, which was caught. Every volley costs at most one star, and the level is still won. This is the only level that practises factored form, so a student can skip it entirely.
*Fix:* after a miss, throw a fresh volley that has the same structure but new numbers: the same form, a different thrower and different zeros. A small solver, as in the generator, can produce these. Alternatively, keep the reveal but require a fixed number of consecutive first-try catches. Either way, the next attempt should not be answerable by copying the number.

**B2. Level 6: the balloon visibly passes through a lantern that does not light.** `src/math/trace.ts:126`, `src/game/levels.ts:201-202`, `src/scene/level-view.ts:397`
The rule measures the vertical offset at the lantern's x (`|y(2) − 6| ≤ 0.35`). At the lanterns the arc is steep, with slope ±2. For the neighbouring grid answers `(4, 8.5)` and `(4, 7.5)`, the vertical offset is 0.375, so both count as misses. But the real distance from the arc to the lantern centre is only 0.155 and 0.182 m. That is smaller than the lantern's drawn radius (0.22) and well inside the white halo (radius `r + 0.12 = 0.47`). In `L6-lantern-zoom-crop.png` the white trail goes straight through the lantern and its halo, yet nothing lights up. The explanation text (״ב־x = 2 הקשת עברה בגובה 6.38 — הפנס ב־6״) is correct, but it contradicts what the student sees.
*Fix (pick one):*
- **(a)** Move the lanterns to `(3, 7.5)` and `(5, 7.5)`, where the arc is flatter. The algebra stays the same: `16a + k = 0`, `a + k = 7.5` → `a = −0.5`, `k = 8`. The nearest wrong grid arcs then pass 0.26 to 0.36 m away (perpendicular). Also switch the rule to perpendicular distance with r ≈ 0.2, shrink the lantern, and draw the halo at exactly r.
- **(b)** Keep the vertical rule but draw it as a vertical gate (two ticks at `y ± r` on the line `x = 2`) instead of a round halo, and shrink the lantern body.

In both cases the halo must be drawn at the true hit radius, not `r + 0.12`.

**B3. Level 3: the bunting message gives the wrong advice when a > 0.** `src/main.ts:215`
With a vertex below the tower, for example `(1, 2)` where `a = 1`, the parabola opens upward and climbs into the bunting. 14 of the 70 grid vertices with `a > 0` end this way. The toast says ״הקשת עלתה לגובה 4.6 ליד x = 2.61, והדגלונים בגובה 4.6. נסו קדקוד נמוך יותר.״ A lower vertex makes `a` larger and the arc worse. The right advice is to raise the vertex above the launcher. This is exactly the misconception the level targets (`a ≥ 0` opens upward). The message is also always circular: `e.y` at a crossing equals the bunting height, so it reads "rose to 4.6 … bunting at 4.6".
*Fix:* branch on `arc.a`. For `a > 0`, say for example ״{a = 1} חיובי: הפרבולה פתוחה כלפי מעלה ועולה לדגלונים. הקדקוד צריך להיות גבוה מהמשגר ({k > 3}).״ For `a < 0`, report the vertex height instead of 4.6: ״הקדקוד בגובה {k = 5}, והדגלונים בגובה {4.6}: צריך קדקוד נמוך יותר.״

### Should-fix

**S1. Level 5 starts with the correct `p`, so the drift lesson can be skipped.** `src/game/levels.ts:167`
`start: { p: 4, k: 3 }`. The first shot hits the buoy, and the message says ״צריך שהקשת תהיה גבוהה יותר שם״. One press of ↑ (k = 3.5) then wins without ever thinking about the drift. Separately, `(4, 4.5)`, `(4, 5)` and `(4, 5.5)` win both level 1 and level 5, and `(4, 8)` wins both level 5 and level 6. So a student who repeats the level 1 answer wins level 5.
*Fix:* start at `p = 5`. Then the pre-drift landing marker sits on the flag at 10, which makes the trap concrete, and the student has to move to `p = 4`. Also fix the test title at `tests/levels.test.ts:114`: it says "never wins more than one level" but asserts `≤ 2` (line 119). Assert `≤ 1` once level 5 changes. Note that `(4, 5)` would still win levels 1 and 5, because both need `p = 4`. Either accept that and say so in the title, or move the level 5 flag (for example to 11 → `p = 4.5`).

**S2. ״כש־a ≥ 0 הפרבולה פתוחה כלפי מעלה״ is wrong for a = 0.** `src/main.ts:217`
At `(2, 3)` on level 3, `a = 0` and the curve is the horizontal line `y = 3`, not a parabola. The toast reads ״a = 0: כש־a ≥ 0 הפרבולה פתוחה כלפי מעלה…״. "הקדקוד צריך להיות מעל המשגר" is also ambiguous, because the vertex may not be directly above the launcher (`p ≠ x0`).
*Fix:* for `a > 0` use ״הפרבולה פתוחה כלפי מעלה״. For `a = 0` use ״זו כבר לא פרבולה אלא קו ישר {y = 3}, והבלון לא יורד״. In both cases end with ״הקדקוד צריך להיות גבוה מהמשגר ({k > 3})״.

**S3. Hebrew grammar in feedback.** `src/main.ts:213`, `src/main.ts:222`
- ״והרשת **מתחיל** ב־6 מ׳״ (level 1, seen in play). רשת is feminine, so it should be ״מתחילה״. The same template serves ״הענף מתחיל״, which is correct. Pick the verb by noun, or rephrase as ״והחלק התחתון של {name} בגובה…״.
- ״פגעתם **בהבריכה**״ (level 2, seen in play). Prefixing ב to a word with ה is wrong; it should be ״בבריכה״ (likewise ״בארגז״, ״במבצר״, ״בגלגל ההצלה״). Return names without ה from `obstacleName`, or use a separate locative form. On level 2 this case also deserves a clearer sentence: ״נחתם בבריכה, אבל הפספסתם את הפיניאטה״.

**S4. Displayed `a` rounds the wrong way on negative halves.** `src/math/arc.ts:54`
`Math.round(-12.5) = -12`, so `a = −0.125` shows as **−0.12** (level 1 start) and `a = −0.375` as **−0.37** (level 1 at `k = 6`, level 7 start). A student computing `−k/p² = −6/16 = −0.375` by hand gets −0.38 with school rounding.
*Fix:* `let r = Math.sign(n) * Math.round(Math.abs(n) * f) / f;`

**S5. Visible walls and the net are much wider than the exact x-line.** `src/scene/level-view.ts:175-237`
The cardboard wall is 4 m of panels turned 0.9 rad about `x = X`. From the camera it covers about `X ± 1.2` m. The volleyball net spans about `x = 2…6`. `L1-wall-zoom.png`, at the winning vertex `(4, 4.5)`, shows the trail running across the wall face between x ≈ 0.5 and 2 below the 3 m tape. At `x = 1.5` the real height is 2.74. Likewise an arc with `p = 3`, `k = 6.5` visibly passes through the net mesh above 6 m at x ≈ 3 without being stopped, because the rule only exists at `x = 4`. Students are asked to reason about "the height at x = 2", so the geometry should not suggest a 2 m-thick obstacle.
*Fix:* reduce TURN, for example to about 0.3 rad. Alternatively make the wall a single thin slab in the shot plane, with the depth-wise panels behind it at z < 0, so that nothing in front of the shot plane overlaps the flight path. Shorten the net to a narrow band around x = 4, or draw it edge-on.

**S6. Restart wipes stars and the learning log's `unaided` flag.** `src/game/game.ts:126`, `:278`, `:286`, `:342`
Restart builds a fresh state with `shotsFired = 0` and `hintsShown = 0`. Playtest on level 7: three misses, then out of balloons, then R, then a win on the next shot. Result: 3 stars, and the log entry has `attempt: 1, unaided: true`. The same happens after any mid-level R. `CURRICULUM.md` presents `unaided` as the learning signal, but it can be produced just by restarting.
*Fix:* keep per-level counters (total shots and hints for this level in this session) outside `fresh()`, and base both `unaided` and the stars on them.

**S7. Win explanations hard-code the 0.5-grid answer and are false for fine-mode wins.** `src/main.ts:249-250`
- Level 1: ״והנחיתה ב־2p = 8״ also appears for the fine-mode winners `(3.9, 4)` (lands at 7.8) and `(4.4, 4.5)` (lands at 8.8).
- Level 2: ״הפיניאטה הייתה הקדקוד… x = 10״ also appears for the winner `(5.3, 6.7)`, whose vertex is not the piñata and which lands at 10.6.

*Fix:* print `2p = ${fmt(2*p)}` and the computed landing. On level 2, say "the vertex was close to the piñata" when `(p, k) ≠ (5, 7)`.

**S8. Level 2's first hint asserts the conclusion instead of the reasoning.** `src/game/levels.ts:99-100`
״הפיניאטה היא הנקודה הכי גבוהה בקשת״ is not given in the mission. It follows from the two zeros, 0 and 10, which give the axis `x = 5`. Hint 2 then reasons from the vertex to the landing, which is the reverse of what the student has to do.
*Suggest:* hint 1 ״הקשת יוצאת מ־{0} ונוחתת ב־{10}. איפה ציר הסימטרייה?״ and hint 2 ״הציר {x = 5} עובר בפיניאטה, אז היא הקדקוד: {(5, 7)}.״

**S9. Generated challenge hints show inconsistent rounded arithmetic.** `src/game/generator.ts:61`
In real output, ״k > 6 / 0.8 ≈ 7.48״ and ״k < 7.5 / 0.8 ≈ 9.35״ appear, because the divisor is rounded but the quotient is not. Similarly ״6 / 0.79 ≈ 7.56״ (6/0.79 = 7.59). A careful student will think the hint is wrong.
*Fix:* show the factor as an exact fraction. It is always rational, for example `1 − (3.5/4.5)² = 32/81`. Alternatively show three decimals and compute the quotient from the displayed value. Also ״**ב**גובה של הקשת ב־x:״ should be ״הגובה של הקשת ב־x:״ (line 60).

**S10. A misconception from the handoff is never exercised: `(x − p)` shifts left when p > 0.** In every level `p > 0` and the card always shows `(x − p)`. No level shows `(x + c)` or asks for a vertex left of the y-axis. Either add one volley on level 4 with a card such as `y = −0.5(x + 1)(x − 7)` (thrower at −1), or remove the item from the handoff's list.

### Nits

- **N1. Singular imperative.** The fire button ״שגר!״ (`src/ui/hud.ts:63`, `:205`) and the intro bubble ״ואז: שגר!״ (`src/main.ts:159`) use masculine singular, while everything else uses the plural (״גררו״, ״פגעו״). Use ״שגרו!״ or the noun ״שיגור!״.
- **N2. Word choices in prompts.**
  - ״ולחצו מוכן!״ → ״ולחצו על ׳מוכן!׳״ (`src/main.ts:160`).
  - In level 1's mission, ״הקפיצו את הבלון״ suggests bouncing. ״העיפו את הבלון מעל החומה״ reads better (`levels.ts:57`).
  - In level 2, ״ונחתו בבריכה״ reads as if the players land. Use ״והנחיתו את הבלון בבריכה״ (`levels.ts:83`).
- **N3. Level 4 hint vs Workbook wording.** ״במכפלה, כל סוגריים שמתאפסים נותנים נקודת אפס״ (`levels.ts:148`): Workbook's factored-form module says ״מאפסים כל גורם״. Suggest ״מכפלה מתאפסת כשאחד הגורמים מתאפס: מאפסים כל גורם.״
- **N4. Level 3 hint 2 drops a root and gives the answer away.** ״(x − 2)² = 16 ← x = 6״ (`levels.ts:125`) drops the second root. Write ״x − 2 = ±4 ← x = 6 (הפתרון x = −2 מאחורי המגדל)״. Hint 2 is also the full answer (״נסו קדקוד (2, 4)״), as is level 6's hint 2 (k = 8). That is acceptable for a last hint because the log marks it as hinted, but say so in `CURRICULUM.md`.
- **N5. Landing label direction.** The landing label ״נחיתה x = 8״ is drawn on an LTR canvas (`src/scene/arc-view.ts:116`, `rtl: false`). A Hebrew reader meets "x = 8" before the word. Use `rtl: true`; the canvas bidi keeps "x = 8" intact. The same applies to the height pop ״3.75 מ׳״ (`src/main.ts`, `fx.pop(... מ׳)`).
- **N6. `CURRICULUM.md` level 7 fine-mode wording.** "p may wobble ±0.4 … k stays in [9.4, 13.0] at p = 5" is literally true, but the real fine-mode region is `p ∈ [4.9, 5.4]`, and at `p = 5.3`, `k` runs from 8.2 to 13.5. The 1.4 m-tall fort box lets descending arcs clip its top corner up to a landing of about 10.8. Either reword the claim, or lower the fort box (`y2: 0.8`) to tighten the window around `p = 5`.
- **N7. Catch-level win heading.** The heading is ״נרטבו!״ (`src/ui/hud.ts:276`), but nothing got soaked; you caught everything. Use ״תפסתם הכול!״.
- **N8. Equation tile shows `1(x − 1)²`.** At `a = 1` the tile reads `y = 1(x − 1)² + 2`, and at `a = 0` it reads `0(x − 2)² + 3`. Workbook writes `(x − 1)²`. This is fine as a tile, but `render_game_to_text` already uses the cleaner `formatVertexForm`, so consider showing that string in the card when a is 1 or 0.
- **N9. Level 5's chip ״נקודות אפס 0, 8״ is the pre-drift arc (the intended trap).** Consider labelling it ״(לפני הסחיפה)״ so that the feedback afterwards reads as a consequence rather than a contradiction.
- **N10. `render_game_to_text` reports `volley: 4, of: 3` after the level 4 win.** This only affects the test hook; clamp it.

## Bypass hunt summary

- **Constant strategy:** no fixed vertex wins more than two authored levels; `(4, 4.5…5.5)` wins levels 1 and 5, and `(4, 8)` wins levels 5 and 6 (S1). In 400 generated challenges, "p = T/2, k = 8.5" wins 36% and k = 8 wins 29%. So a fixed k fails most challenges, but reading `p = T/2` is free. That is acceptable, since it is the intended first step.
- **Eyeballing:**
  - Level 1 and level 2 can be solved by dragging the landing marker onto the target, or the handle onto the piñata. That is the intended scaffold, because the handle is the vertex.
  - On level 5 the marker is a deliberate trap (S1).
  - Levels 3, 6 and 7 have no landing marker. The trail and the worked feedback make guess-and-correct possible within the balloon budget, which is consequence feedback, not a bypass.
- **Fine mode (0.1 m):** it enlarges every window (for example, 54 winners on level 3 and 233 on level 7). Each winner still satisfies the same inequalities, so fine mode is not an exploit, but see S7 and N6 for text that assumes the grid answer.
- **Return fire:** guess, read the reveal, then copy it (B1).
- **Visual vs rule:** the lantern halo (B2), and the wall and net width (S5). The bunting and the wall tape heights are exact.

## Playtest log (headless; logic stepped, so this says nothing about frame rate)

| Level | Sequence (real keys or drags) | Result |
|---|---|---|
| L1 | Space at the default (4, 2) → wall at y = 1.5 ✓; ↑×8 to k = 6 → net ✓ (״והרשת מתחיל״, S3); ↓×2 to k = 5 → crate soaked | Won, 1 star |
| L2 | Mouse drag of the handle to (5, 6.5) → pool soaked, piñata missed (״פגעתם בהבריכה״, S3); drag to (5, 7) | Won |
| L3 | H, H, H: the third press repeats hint 2; (1, 2) → bunting with "lower vertex" advice (B3); (2, 3) → `a = 0` space message (S2); (2, 5) → bunting; (2, 4) | Won with the last balloon |
| L4 | Space with the bucket at 5 → soaked, toast reveals 8; →×6 to 8 → caught; volley 2: miss at 5, then copy the revealed 10 (B1); volley 3: hint, then 11 | Won |
| L5 | Space at the start (4, 3) → buoy (S1); →×2 ↑×4 to (5, 5) → lands at 12, drift explanation ✓; ←×2 to (4, 5) | Won; explanation correct |
| L6 | (4, 8.5) → miss although the trail crosses both lanterns (B2); (4, 8) | Won |
| L7 | (5, 8) → wall at y = 5.12; (5, 14) → branch at 11.76; (4, 10) → lands at 8 → out screen ״נגמרו הבלונים!״; R → refilled; (5, 10) | Won, **3 stars** after 3 misses (S6) |

Screenshots (scratch folder): `L1-wall-zoom.png`, `L3-bunting.png`, `L3-a-positive.png`, `L6-lantern-zoom-crop.png`, `L7-start.png`, `L7-out.png`, `L7-win.png`, `L4-miss.png`.

## Resolution (crew lead, 26 Oct 2026, commit after `41c267e`)

| Finding | Status | What changed |
|---|---|---|
| B1 return fire copyable | Fixed | A missed catch swaps in a fresh volley of the same form with a new thrower and zeros (`freshVolley` in `src/game/generator.ts`, `game.ts afterImpact`); test in `tests/game.test.ts`. |
| B2 lanterns | Fixed | Lanterns moved to `(3, 7.5)` and `(5, 7.5)`; rings now use true perpendicular distance (`ringDistance`), lantern `r = 0.2`, smaller lantern body, halo drawn at exactly `r`; test checks neighbouring arcs pass > `r + 0.05` away. Same answer `(4, 8)`. |
| B3 bunting advice for a > 0 | Fixed | Feedback branches on the sign of `a` and reports the vertex height when `a < 0`. |
| S1 level 5 starts at the answer | Fixed | Flag moved to 11 (answer `p = 4.5`), level starts at `(5.5, 4)` so the pre-drift marker sits on the flag; no vertex now wins two authored levels (test asserts ≤ 1). |
| S2 a = 0 called a parabola | Fixed | "זו כבר לא פרבולה אלא קו ישר…" for `a = 0`; "הקדקוד צריך להיות גבוה מהמשגר (k > h)". |
| S3 grammar | Fixed | Names carry gender and a ב form (״הרשת מתחילה״, ״פגעתם בבריכה״). |
| S4 rounding | Fixed | Halves round away from zero (−0.125 → −0.13). |
| S5 wide walls/net | Improved | Turn reduced to 0.5 rad, most of the wall and net moved behind the shot plane, height arrows on the exact x-line. Still a 3D panel, so it has some apparent width. |
| S6 restart wipes record | Fixed | Attempts, hints and misses persist across restarts of the same level; stars and `unaided` use them; test added. |
| S7 win texts | Fixed | Level 1 prints `2p` from the actual `p`; level 2 says "close to the piñata" when the vertex isn't `(5, 7)`. |
| S8 level 2 hints | Fixed | Hint 1 reasons from the zeros 0 and 10 to the axis; hint 2 concludes the vertex. |
| S9 challenge hints | Fixed | Exact fractions (`k·21/25 < 9`), "הגובה של הקשת". |
| S10 `(x + c)` never shown | Fixed | Level 4 has a fourth volley `y = −0.5(x + 1)(x − 7)` thrown from −1, with a hint about the sign. |
| N1–N7, N9, N10 | Fixed | "שגרו!", wording, Workbook's "מאפסים כל גורם", ±4 root, RTL landing label and height pops, CURRICULUM fine-mode wording, "תפסתם הכול!", "האפסים לפני הסחיפה" chip, clamped volley counter. |
| N8 `1(x − 1)²` tile | Not changed | The tile keeps showing the coefficient so the three tiles stay in place; `render_game_to_text` uses the clean form. |
