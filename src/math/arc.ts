// Pure parabola math for Splash Arc. No Three.js here: the scene only renders what this module decides.
// Units are metres in the vertical plane of the shot: x is horizontal distance, y is height.

export interface Arc {
  /** Launch point; the balloon starts here and travels toward +x. */
  x0: number;
  h: number;
  /** Vertex form y = a(x − p)² + k. Exact values; round only for display. */
  a: number;
  p: number;
  k: number;
}

/** The arc pinned to the launcher (x0, h) with vertex (p, k): a = (h − k) / (p − x0)². */
export function arcFromVertex(x0: number, h: number, p: number, k: number): Arc {
  const d = p - x0;
  if (d === 0) throw new Error('vertex cannot sit directly above the launcher');
  return { x0, h, a: (h - k) / (d * d), p, k };
}

/** An arc given directly by its equation (used for rival throws). */
export function arcFromEquation(a: number, p: number, k: number, x0: number): Arc {
  return { x0, h: a * (x0 - p) ** 2 + k, a, p, k };
}

export function yAt(arc: Arc, x: number): number {
  return arc.a * (x - arc.p) ** 2 + arc.k;
}

/** Real zeros of a(x − p)² + k, ascending. Empty when the parabola never meets y = 0. */
export function zeros(arc: Arc): number[] {
  if (arc.a === 0) return [];
  const r = -arc.k / arc.a;
  if (r < 0) return [];
  if (r === 0) return [arc.p];
  const s = Math.sqrt(r);
  return [arc.p - s, arc.p + s];
}

/** Where a downward arc comes back to the ground after leaving the launcher, or null if it never does. */
export function landingX(arc: Arc): number | null {
  const z = zeros(arc).filter((x) => x > arc.x0 + 1e-9);
  return z.length ? z[z.length - 1] : null;
}

/** Shift the whole arc horizontally by dx (the drifting raft): y = a(x − (p + dx))² + k. */
export function shiftArc(arc: Arc, dx: number): Arc {
  return { ...arc, x0: arc.x0 + dx, p: arc.p + dx };
}

/** Round for display: at most `digits` decimals, no trailing zeros. */
export function fmt(n: number, digits = 2): string {
  const f = Math.pow(10, digits);
  // School rounding: halves round away from zero (−0.125 → −0.13).
  let r = (Math.sign(n) * Math.round(Math.abs(n) * f)) / f;
  if (Object.is(r, -0)) r = 0;
  const s = r.toFixed(digits).replace(/\.?0+$/, '');
  return s.replace('-', '−');
}

/** Workbook vertex form, e.g. "y = −0.25(x − 2)² + 4". Always render inside an LTR element. */
export function formatVertexForm(arc: Pick<Arc, 'a' | 'p' | 'k'>): string {
  const { a, p, k } = arc;
  if (Math.abs(a) < 1e-9) return `y = ${fmt(k)}`;
  let aPart: string;
  if (Math.abs(a - 1) < 1e-9) aPart = '';
  else if (Math.abs(a + 1) < 1e-9) aPart = '−';
  else aPart = fmt(a);
  let inner: string;
  if (Math.abs(p) < 1e-9) inner = 'x²';
  else inner = `(x ${p > 0 ? '−' : '+'} ${fmt(Math.abs(p))})²`;
  let kPart = '';
  if (Math.abs(k) >= 1e-9) kPart = ` ${k > 0 ? '+' : '−'} ${fmt(Math.abs(k))}`;
  return `y = ${aPart}${inner}${kPart}`;
}

/** Factored form a(x − r1)(x − r2), e.g. "y = −0.5(x − 2)(x − 10)". */
export function formatFactoredForm(a: number, r1: number, r2: number): string {
  const f = (r: number) => (Math.abs(r) < 1e-9 ? 'x' : `(x ${r > 0 ? '−' : '+'} ${fmt(Math.abs(r))})`);
  const aPart = Math.abs(a - 1) < 1e-9 ? '' : Math.abs(a + 1) < 1e-9 ? '−' : fmt(a);
  return `y = ${aPart}${f(r1)}${f(r2)}`;
}

/** Horizontal speed for a real projectile on this arc: y'' = 2a·vx² = −g, so vx = √(g / (−2a)). */
export function horizontalSpeed(arc: Arc, g = 9.8): number {
  if (arc.a >= 0) return 6;
  return Math.sqrt(g / (-2 * arc.a));
}
