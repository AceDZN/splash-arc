# Curriculum map — Splash Arc (קשת המים)

Source of truth: Workbook, grade 9, chapter 4, הפונקציה הריבועית. Snapshots of every module used are saved in [`docs/curriculum/`](docs/curriculum/) (fetched 25–26 Oct 2026 through the Workbook agent API). Every route below was checked against `https://www.workbook.co.il/llms-full.txt`; the handoff's optional `quadratic-positive-negative` does not exist, and the real module is `quadratic-positive-negative-intervals`.

Notation follows Workbook's ייצוג קדקודי `y = a(x − p)² + k` (vertex `(p, k)`, axis `x = p`) and ייצוג כמכפלה `y = a(x − x₁)(x − x₂)`. Terms used in the HUD and hints: פרבולה, קדקוד, ציר סימטרייה, נקודות אפס, ייצוג קדקודי, ייצוג כמכפלה, הזזה (and "נסחפת" for the raft's horizontal shift), and `a` as the coefficient that sets opening direction and width (מתיחה). Equations are always rendered in LTR isolates.

## The rule the whole game runs on

The balloon flies exactly along `y = a(x − p)² + k` in metres. The player sets the vertex `(p, k)`; the arc must pass through the launcher `(x₀, h)`, so `a = (h − k)/(p − x₀)²`. With a ground launcher at the origin, `a = −k/p²` and the zeros are `0` and `2p`. If `a ≥ 0` (vertex at or below a raised launcher) the parabola opens upward and the balloon "flies to space". All of this is in `src/math/arc.ts` and `src/math/trace.ts` (pure, no Three.js), and every authored level is proven in `tests/levels.test.ts`.

## Levels

| # | Level | Skill practised | Workbook modules | Misconception it exposes (and the visible consequence) |
|---|---|---|---|---|
| 1 | מעל החומה — over the wall | Symmetry of zeros about the axis (`2p` landing); `k` raises the arc without moving the landing; evaluate `y(2) = 0.75k` | [parabola-y-equals-x2](https://math.workbook.co.il/grade-9/chapter-4/parabola-y-equals-x2), [parabola-symmetry-and-vertex](https://math.workbook.co.il/grade-9/chapter-4/parabola-symmetry-and-vertex), [vertical-shifts](https://math.workbook.co.il/grade-9/chapter-4/vertical-shifts) | "A bigger `k` lands farther": with `p = 4` every `k` lands at 8; too low splats on the 3 m wall with the height `y(2)` shown, too high hits the eucalyptus canopy that starts at 6 m (a net was replaced: playtesters read a volleyball net as something to throw over). Window: `p = 4`, `4 < k < 6`. |
| 2 | פיניאטה — piñata | The highest point is the vertex; the second zero mirrors the launcher | [parabola-symmetry-and-vertex](https://math.workbook.co.il/grade-9/chapter-4/parabola-symmetry-and-vertex), [vertex-form](https://math.workbook.co.il/grade-9/chapter-4/vertex-form) | "The vertex is the landing point": a vertex at the pool flies far past. Only vertex `(5, 7)` swipes the piñata and lands in the pool at 10 in one shot. |
| 3 | מגדל המציל — lifeguard tower | Raised launcher: `a = (3 − k)/p²`; solve `−0.25(x − 2)² + 4 = 0` → `x = 6`; `a ≥ 0` opens upward | [vertex-form](https://math.workbook.co.il/grade-9/chapter-4/vertex-form), [stretch-reflect-parabola](https://math.workbook.co.il/grade-9/chapter-4/stretch-reflect-parabola) | "It still lands at `2p`": `p = 3` lands at 9. A vertex at or below the tower (`a ≥ 0`) sends the balloon to space. The bunting at 4.6 m keeps `k ≤ 4.5`; the only 0.5-grid answer is `(2, 4)`. |
| 4 | אש חוזרת — return fire | Read zeros from vertex form and from factored form; zeros are symmetric about the axis | [factored-form](https://math.workbook.co.il/grade-9/chapter-4/factored-form), [parabola-symmetry-and-vertex](https://math.workbook.co.il/grade-9/chapter-4/parabola-symmetry-and-vertex), [vertex-form](https://math.workbook.co.il/grade-9/chapter-4/vertex-form) | "Stand under the vertex": you get soaked. "`(x + 1)` vanishes at 1": the third card `y = −0.5(x + 1)(x − 7)` is thrown from −1. The rival arc is not drawn before it flies; only the equation card is shown. Volleys: `y = −0.5(x − 4)² + 8` from 0 → 8; `y = −0.5(x − 2)(x − 10)` from 2 → 10; `y = −0.5(x + 1)(x − 7)` from −1 → 7; `y = −0.25(x − 5)² + 9` from −1 → 11. After a miss the rival throws a **fresh** volley of the same kind (same form, new thrower and zeros), so the landing revealed by the miss can't be copied. |
| 5 | רפסודה נסחפת — drifting raft | Horizontal shift: `(x − p)` becomes `(x − (p + 2))`; vertex and both zeros move by 2; target at 11 | [horizontal-shifts](https://math.workbook.co.il/grade-9/chapter-4/horizontal-shifts), [vertex-form](https://math.workbook.co.il/grade-9/chapter-4/vertex-form) | The level **starts on the trap**: vertex `(5.5, 4)`, so the pre-drift landing marker sits on the flag at 11 and the throw lands at 13. Only `p = 4.5` works (landing 9 before the drift, 11 after); the buoy at `x = 4` needs `k > 3.62`. The zeros chip is labelled "before the drift". The worked feedback shows the vertex moving from `x = p` to `x = p + 2`. |
| 6 | פנסים כפולים — double lanterns | Two points at the same height fix the axis at their midpoint; lanterns at `(3, 7.5)` and `(5, 7.5)`; through `(0, 0)`: `16a + k = 0`, `a + k = 7.5` | [parabola-symmetry-and-vertex](https://math.workbook.co.il/grade-9/chapter-4/parabola-symmetry-and-vertex), [vertex-form](https://math.workbook.co.il/grade-9/chapter-4/vertex-form), [factored-form](https://math.workbook.co.il/grade-9/chapter-4/factored-form) | "Any arc through one lantern will do": both must be lit in one shot; after a miss the feedback gives the arc's height at each lantern. A lantern lights when the arc passes within 0.2 m of its centre (true distance), and the white ring around it is drawn at exactly that radius, so what looks like a hit is a hit. Unique answer `(4, 8)`, `a = −0.5`. |
| 7 | פשיטת לילה — night raid (transfer) | Combine: landing `2p = 10` → `p = 5`; `y(8) = 16k/25 > 6` and `y(3) = 21k/25 < 11` → `9.375 < k < 13.095` | [vertex-form](https://math.workbook.co.il/grade-9/chapter-4/vertex-form), [factored-form](https://math.workbook.co.il/grade-9/chapter-4/factored-form), [quadratic-positive-negative-intervals](https://math.workbook.co.il/grade-9/chapter-4/quadratic-positive-negative-intervals) | No preview, no grid numbers, no zeros chip, no hints, 3 balloons, a changed (night) scene. On the 0.5 grid only `(5, k)` with `9.5 ≤ k ≤ 13` works. In fine mode (0.1 m) the winners have `4.9 ≤ p ≤ 5.3` (arcs landing inside the fort's 0.8 m width) and, at `p = 5`, `9.4 ≤ k ≤ 13.0`; every fine-mode winner still satisfies the same two inequalities for its own `p`. |

## How the help fades

| Level | Dotted preview | Landing marker / zeros chip | Axis line | Grid numbers | Hints |
|---|---|---|---|---|---|
| 1 | up to the vertex | shown | shown | shown | 2 |
| 2 | short stub | shown | shown | shown | 2 |
| 3 | short stub | hidden | shown | shown | 2 |
| 4 | none (rival arc hidden) | hidden until it lands | — | shown | 2 per volley (fresh volleys get their own) |
| 5 | short stub | shown (pre-drift, a deliberate trap) | shown | shown | 2 |
| 6 | short stub | hidden | shown | shown | 2 |
| 7 | none | hidden | hidden | hidden | none |

The last hint on levels 3 and 6 gives the full answer; using it is logged as hinted, so it never counts as an unaided success.

After every shot the path the balloon really flew stays on screen as a white trail, and a short worked explanation names the exact quantity that decided the outcome (e.g. "ב־x = 2 הקשת בגובה y = 1.5, אבל החומה בגובה 3 מ׳"). That feedback is consequence, not a preview, so it also appears on level 7.

## Learning events

Every shot and every catch is logged (in memory and `localStorage` key `splash-arc-v1-log`, last 500): level, attempt, `a`, `p`, `k`, the flown vertex, end point and outcome, hints used, and `unaided` (first attempt on the level with no hint) versus later or hinted successes. Attempts and hints are counted across restarts of the same level, so restarting can't turn a fourth try into an "unaided" first try (stars use the same count). Nothing leaves the device.

## What this does not claim

The tests prove the rules, the level windows and that a fixed vertex can't win the levels. They do not show that students learn the quadratic function from playing; that needs real students.
