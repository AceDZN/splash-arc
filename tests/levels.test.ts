import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/game/levels';
import { resolveShot, winningVertices, catches, volleyLanding, volleyArc } from '../src/game/shot';
import { yAt } from '../src/math/arc';

const L = (id: number) => LEVELS.find((l) => l.id === id)!;
const set = (vs: { p: number; k: number }[]) => vs.map((v) => `${v.p},${v.k}`).sort();

test('there are seven levels and only the last one is a transfer level without help', () => {
  assert.equal(LEVELS.length, 7);
  const last = LEVELS[6];
  assert.equal(last.help.preview, 'none');
  assert.equal(last.help.gridLabels, false);
  assert.equal(last.hint.length, 0);
  for (const l of LEVELS.slice(0, 6)) assert.ok(l.hint.length > 0 || l.volleys?.every((v) => v.hint.length > 0));
});

test('level 1: p = 4 and 4 < k < 6 — exactly k ∈ {4.5, 5, 5.5} on the 0.5 grid', () => {
  assert.deepEqual(set(winningVertices(L(1))), ['4,4.5', '4,5', '4,5.5']);
  // The handoff numbers: y(2) = 0.75k.
  const s = resolveShot(L(1), 4, 5);
  assert.ok(Math.abs(yAt(s.flown, 2) - 3.75) < 1e-12);
  assert.equal(s.success, true);
});

test('level 1 wrong approaches give the advertised consequence', () => {
  assert.equal(resolveShot(L(1), 4, 2).result.end.id, 'wall', 'the default arc splats on the wall');
  assert.equal(resolveShot(L(1), 4, 4).result.end.id, 'wall', 'k = 4 only touches the top: y(2) = 3');
  assert.equal(resolveShot(L(1), 4, 6).result.end.id, 'net', 'k = 6 reaches the net');
  // Bigger k with the same p does not land farther.
  assert.equal(resolveShot(L(1), 4, 4.5).flown.p, resolveShot(L(1), 4, 5.5).flown.p);
  // Treating the vertex as the landing point (p = 8) overshoots.
  assert.notEqual(resolveShot(L(1), 7, 5).success, true);
});

test('level 2: the piñata is the vertex — only (5, 7) swipes it and lands in the pool', () => {
  assert.deepEqual(set(winningVertices(L(2))), ['5,7']);
  const s = resolveShot(L(2), 5, 7);
  assert.deepEqual(s.hits, ['pinata', 'pool']);
  // Through the piñata but with the landing as the vertex misconception: vertex at the pool.
  assert.equal(resolveShot(L(2), 8, 7).success, false);
});

test('level 3: raised launcher (0, 3), vertex (2, 4) → a = −1/4, lands at 6, and is the only grid answer', () => {
  assert.deepEqual(set(winningVertices(L(3))), ['2,4']);
  const s = resolveShot(L(3), 2, 4);
  assert.equal(s.aimed.a, -0.25);
  assert.equal(s.result.end.id, 'lifering');
  // Treating it like a ground launch (land at 2p) overshoots: p = 3 lands at 9.
  assert.equal(resolveShot(L(3), 3, 4).result.end.kind, 'ground');
  assert.ok(Math.abs(resolveShot(L(3), 3, 4).result.end.x - 9) < 1e-9);
});

test('level 3: a vertex below the raised launcher (a ≥ 0) flies off to space', () => {
  assert.equal(resolveShot(L(3), 2, 3).result.end.kind, 'space');
  assert.equal(resolveShot(L(3), 2, 2).result.end.kind, 'space');
});

test('level 4: rival zeros are 8, 10 and 11, and only the zero catches', () => {
  const vs = L(4).volleys!;
  assert.deepEqual(vs.map(volleyLanding), [8, 10, 11]);
  assert.ok(Math.abs(volleyArc(vs[0]).h) < 1e-12, 'launched from a zero');
  assert.ok(Math.abs(volleyArc(vs[1]).h) < 1e-12);
  assert.ok(Math.abs(volleyArc(vs[2]).h) < 1e-12);
  // The factored card y = −0.5(x − 2)(x − 10) is the same curve as −0.5(x − 6)² + 8.
  for (const x of [2, 4, 6, 9]) assert.ok(Math.abs(yAt(volleyArc(vs[1]), x) - -0.5 * (x - 2) * (x - 10)) < 1e-12);
  for (const v of vs) {
    const land = volleyLanding(v);
    assert.equal(catches(v, land), true);
    assert.equal(catches(v, land - 0.5), false);
    assert.equal(catches(v, land + 0.5), false);
    // Standing under the vertex (a common confusion) gets you soaked.
    assert.equal(catches(v, v.p), false);
  }
});

test('level 5: the drift shifts the whole arc by +2, so only p = 4 hits the flag at 10', () => {
  const wins = winningVertices(L(5));
  assert.ok(wins.length > 0);
  assert.ok(wins.every((v) => v.p === 4));
  const naive = resolveShot(L(5), 5, 5);
  assert.equal(naive.flown.p, 7);
  assert.ok(naive.result.end.x > 11, 'aiming the landing at 10 before the drift lands at 12');
  const good = resolveShot(L(5), 4, 5);
  assert.equal(good.flown.p, 6);
  assert.equal(good.flown.x0, 2);
  assert.equal(good.success, true);
});

test('level 6: two lanterns at the same height force p = 4, and through (0, 0): a = −0.5, k = 8', () => {
  assert.deepEqual(set(winningVertices(L(6))), ['4,8']);
  const s = resolveShot(L(6), 4, 8);
  assert.equal(s.aimed.a, -0.5);
  assert.deepEqual(s.hits, ['lantern-a', 'lantern-b']);
});

test('level 7 (transfer): only vertex (5, k) with 9.5 ≤ k ≤ 13 works', () => {
  const wins = winningVertices(L(7));
  assert.deepEqual(set(wins), ['5,10', '5,10.5', '5,11', '5,11.5', '5,12', '5,12.5', '5,13', '5,9.5']);
  // The algebra from the handoff: y(8) = 16k/25 and y(3) = 21k/25.
  const s = resolveShot(L(7), 5, 10);
  assert.ok(Math.abs(yAt(s.flown, 8) - 16 * 10 / 25) < 1e-12);
  assert.ok(Math.abs(yAt(s.flown, 3) - 21 * 10 / 25) < 1e-12);
  assert.equal(resolveShot(L(7), 5, 9).result.end.id, 'wall');
  assert.equal(resolveShot(L(7), 5, 13.5).result.end.id, 'branch');
  // Fine mode (0.1 m) agrees with the exact window k ∈ (9.375, 13.095); p may wobble only inside the fort's width.
  const allFine = winningVertices(L(7), 0.1);
  const fine = allFine.filter((v) => v.p === 5).map((v) => v.k);
  assert.ok(Math.abs(Math.min(...fine) - 9.4) < 1e-9 && Math.abs(Math.max(...fine) - 13) < 1e-9);
  assert.ok(allFine.every((v) => Math.abs(v.p - 5) <= 0.4 + 1e-9));
});

test('eyeballing is not enough: one fixed vertex never wins more than one level, and winning sets are tiny', () => {
  const shootLevels = LEVELS.filter((l) => l.goal.kind === 'soak');
  for (let p = 1; p <= 8; p += 0.5) {
    for (let k = 0.5; k <= 13; k += 0.5) {
      const won = shootLevels.filter((l) => p >= l.pRange[0] && p <= l.pRange[1] && k >= l.kRange[0] && k <= l.kRange[1] && resolveShot(l, p, k).success);
      assert.ok(won.length <= 2, `(${p}, ${k}) wins ${won.map((l) => l.id)}`);
    }
  }
  for (const l of shootLevels) {
    const cells = ((l.pRange[1] - l.pRange[0]) / 0.5 + 1) * ((l.kRange[1] - l.kRange[0]) / 0.5 + 1);
    const share = winningVertices(l).length / cells;
    assert.ok(share < 0.06, `level ${l.id}: a random snapped vertex wins ${(share * 100).toFixed(1)}%`);
  }
});

test('generated challenges always have a solver-verified window, and "always k = 8" fails most of them', async () => {
  const { generateChallenge } = await import('../src/game/generator');
  let fixedWins = 0;
  const N = 40;
  for (let seed = 1; seed <= N; seed++) {
    const l = generateChallenge(seed, 1);
    const wins = winningVertices(l);
    assert.ok(wins.length >= 1 && wins.length <= 4, `seed ${seed}: ${wins.length} answers`);
    const T = (l.field.obstacles.find((o) => o.id === 'fort') as { x1: number; x2: number });
    const p = (T.x1 + T.x2) / 4;
    assert.ok(wins.every((w) => w.p === p));
    if (resolveShot(l, p, 8).success) fixedWins++;
  }
  assert.ok(fixedWins / N < 0.35, `k = 8 at the right p still wins ${fixedWins}/${N}`);
});
