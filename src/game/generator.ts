// Fresh "night raid" volleys for replay: a target, a wall to clear and a branch to stay under.
// Every generated level is checked by the solver before it is offered.
import type { Level } from './levels';
import { winningVertices } from './shot';

/** Small deterministic PRNG so a seed always gives the same challenge. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

/**
 * Launcher at the origin, target at T (so p = T/2), wall at xw with height Hw, branch at xb from height Hb.
 * Height of the arc at x: y(x) = k·(1 − ((x − p)/p)²), so the window on k is
 * Hw / (1 − ((xw − p)/p)²) < k < Hb / (1 − ((xb − p)/p)²).
 */
export function generateChallenge(seed: number, round = 1): Level {
  const r = rng(seed * 7919 + 13);
  for (let attempt = 0; attempt < 200; attempt++) {
    const T = pick(r, [8, 9, 10, 11, 12]);
    const p = T / 2;
    const xw = T - pick(r, [1.5, 2, 2.5, 3]);
    const xb = pick(r, [1.5, 2, 2.5, 3]);
    const fw = 1 - ((xw - p) / p) ** 2;
    const fb = 1 - ((xb - p) / p) ** 2;
    const Hw = pick(r, [3, 3.5, 4, 4.5, 5, 5.5, 6]);
    // Aim for a window about 1–2 m wide somewhere between 4 and 13.
    const kLow = Hw / fw;
    const width = 0.9 + r() * 1.4;
    const Hb = Math.round((kLow + width) * fb * 2) / 2;
    if (kLow < 3.5 || kLow + width > 13.5 || Hb <= Hw + 1) continue;
    const level: Level = {
      id: 100 + round,
      name: `אתגר ${round}`,
      mission: `פגעו במבצר ב־{x = ${T}}. החומה ב־{x = ${xw}} בגובה {${Hw}} מ׳, הענף ב־{x = ${xb}} מתחיל בגובה {${Hb}} מ׳.`,
      launcher: { x: 0, h: 0 },
      start: { p: 3, k: 4 },
      pRange: [1, 7],
      kRange: [0.5, 14],
      balloons: 3,
      field: {
        xMax: 16,
        yMax: 40,
        obstacles: [
          { kind: 'post', id: 'branch', x: xb, yLow: Hb, yHigh: Infinity, look: 'branch' },
          { kind: 'post', id: 'wall', x: xw, yLow: 0, yHigh: Hw, look: 'wall' },
          { kind: 'target', id: 'fort', x1: T - 0.4, x2: T + 0.4, y1: 0, y2: 1.0, look: 'fort' },
        ],
      },
      goal: { kind: 'soak', ids: ['fort'] },
      help: { preview: 'stub', landing: false, axis: true, gridLabels: true },
      hint: [
        `הנחיתה ב־{${T}} ← {p = ${p}}. בגובה של הקשת ב־{x}: {y = k·(1 − ((x − ${p})/${p})²)}.`,
        `מעל החומה: {k > ${Hw} / ${round2(fw)} ≈ ${round2(kLow)}}. מתחת לענף: {k < ${Hb} / ${round2(fb)} ≈ ${round2(Hb / fb)}}.`,
      ],
      theme: round % 2 ? 'sunset' : 'night',
      modules: ['vertex-form', 'factored-form', 'quadratic-positive-negative-intervals'],
    };
    const wins = winningVertices(level);
    // A real window (at least one grid answer, all at p = T/2) that isn't a giveaway.
    if (wins.length >= 1 && wins.length <= 4 && wins.every((w) => w.p === p)) return level;
  }
  throw new Error(`no challenge found for seed ${seed}`);
}

function round2(n: number): string {
  return String(Math.round(n * 100) / 100);
}
