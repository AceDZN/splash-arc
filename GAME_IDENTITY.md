# Splash Arc — קשת המים — game identity

## One line

A summer-camp water-balloon war where you don't pull back and guess: you grab the glowing **vertex** of the flight arc, drag it, and the balloon flies exactly along `y = a(x − p)² + k` into a wobbling cardboard-and-pillow fort.

## Who and why

Hebrew-speaking grade-9 students (Workbook grade 9, chapter 4: the quadratic function). The parabola is the aiming system itself. Every level is a question about the vertex, the axis of symmetry, the zeros, shifts or the sign of `a`, and the only way to soak the target is to answer it with the arc.

## Feel

Besiege-meets-Peggle. Slow, deliberate aiming, then a loud, physical payoff: the balloon whooshes along the dotted arc, bursts in a big splash, cardboard walls topple, pillows bounce, the rival campers get drenched and shake themselves off. Misses are funny (a splat on the wall with a cartoon drip, a balloon that "flies off to space" when `a ≥ 0`, a rival balloon on your own head) and instantly recoverable: free retry, balloons refill.

## Time structure and input

Turn-based volleys. One gesture: drag the vertex handle in the vertical plane of the shot (snaps to 0.5 m; a fine mode snaps to 0.1 m). A second representation: tap a tile `a`, `p` or `k` in the live equation and nudge it with − / +. Fire with the big button (or Space). In return-fire levels you drag the bucket along the beach to the rival's zero.

## Camera

A side-on 3/4 view of the shot plane: the camera sits to the side of the field, slightly elevated and angled ~20° toward the fort, so the parabola reads as a true parabola while the beach, cabins and fort have real depth. The shot plane is x (metres, increasing left → right, math convention, even in the RTL UI) and y (height). The camera eases toward the impact and shakes on a hit, then returns.

## World and look

A sunny Israeli summer camp on the Mediterranean: pale sand, eucalyptus trees, a red-and-white lifeguard tower, colorful wooden cabins, a striped beach umbrella, the sea behind. Toon shading with soft rim light, saturated but warm palette (sand #f2d7a0, sea #2bb3c0, camp orange #ff8a3d, balloon magenta #ff3d8b / cyan #3dd6ff, cardboard #c89b62). Level 7 is the night raid: a sunset turning to dusk, string lights on the counselors' fort, lanterns, flashlights.

Procedural and exact (never generated meshes): the arc, the vertex handle, the axis of symmetry line, the zero markers, the metre grid and height poles, walls with their exact heights, the tree canopy, branches, lanterns, buckets and fort blocks (physics bodies).

Tripo models: the two camper crews (our crew in orange camp shirts, the rival cabin in teal; rigged, throw / dodge / cheer / soaked), the wooden slingshot launcher, the lifeguard tower and a camp cabin as set pieces.

## HUD (Hebrew, RTL)

- Top right: level name and number (שלב 3 · מגדל המציל), balloons left as balloon icons.
- Top center: the **equation card**: `y = −0.25(x − 2)² + 4` in a large LTR formula, with `a`, `p` and `k` as tappable colored tiles (a = magenta, p = cyan, k = yellow) that match the on-world markers (the vertex dot, the axis line, the height bar). Below it, small chips: קדקוד (2, 4) · ציר סימטרייה x = 2 · נקודות אפס 0, 6 (zeros hidden in later levels).
- Top left: soaked targets counter (רטובים 2/3) and pause / mute.
- Bottom: the − / + nudge row for the selected tile, a fine-mode toggle, and a big round fire button (שגר!).
- Mission line under the level name: one short sentence (״הקפיצו את הבלון מעל החומה ופגעו בארגז ב־x = 8״).
- Feedback is never color only: icons, words (״נרטב!״, ״פגע בחומה בגובה 3.75 מ׳״), sounds.

## First 30 seconds

Level 1 opens on the beach: the slingshot at x = 0, a cardboard wall (3 m) at x = 2, a crate at x = 8, and a eucalyptus crown that starts 6 m up. The vertex handle pulses. The default arc (vertex (4, 2)) clips the wall: you fire, splat, the wall wobbles, the rival kid laughs. You drag the vertex up; the equation's `k` and `a` change together and the landing marker stays at x = 8 because p didn't move. At k = 5 the balloon sails over the wall and soaks the crate. You drag too high and the balloon gets stuck in the tree's leaves.

## What it is not

Not a quiz with a typed answer, not a courier, not a pull-back-and-guess slingshot (Angry Birds). The arc is never hidden physics: it is the equation.
