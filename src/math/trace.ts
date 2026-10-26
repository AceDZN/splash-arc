// Follows a balloon along its exact parabola and reports the first thing it meets.
import { type Arc, yAt, landingX } from './arc';

/** A thin vertical obstacle at x that blocks heights yLow ≤ y ≤ yHigh (a wall: [0, H]; a branch or net: [Y, ∞)). */
export interface Post {
  kind: 'post';
  id: string;
  x: number;
  yLow: number;
  yHigh: number;
  look: 'wall' | 'branch' | 'net' | 'barrier';
}

/** Something solid that soaks when the balloon enters its box. */
export interface Target {
  kind: 'target';
  id: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  look: 'crate' | 'pool' | 'ring' | 'fort';
}

/** Something the balloon swipes on its way through (piñata, lantern) without stopping. */
export interface Ring {
  kind: 'ring';
  id: string;
  x: number;
  y: number;
  r: number;
  look: 'pinata' | 'lantern';
}

/** A span the balloon must stay under (bunting, a tree canopy): blocks every height ≥ y for x1 ≤ x ≤ x2. */
export interface Ceiling {
  kind: 'ceiling';
  id: string;
  x1: number;
  x2: number;
  y: number;
  look: 'bunting' | 'canopy';
}

export type Obstacle = Post | Target | Ring | Ceiling;

export interface Field {
  obstacles: Obstacle[];
  /** Ground stretches that are water: landing there is a splash in the sea. */
  water?: [number, number][];
  xMax: number;
  yMax: number;
}

export type EndKind = 'target' | 'post' | 'ceiling' | 'ground' | 'water' | 'space' | 'outOfField';

export interface ShotResult {
  end: { kind: EndKind; x: number; y: number; id?: string };
  /** Rings swiped before the end, in flight order. */
  rings: string[];
  /** Targets soaked by this shot (the target hit, if any). */
  soaked: string[];
  /** Flight path samples from the launcher to the end point. */
  path: { x: number; y: number }[];
}

const EPS = 1e-9;

/** Every x in [lo, hi] where the arc's height equals Y. */
function crossings(arc: Arc, Y: number, lo: number, hi: number): number[] {
  if (arc.a === 0) return [];
  const r = (Y - arc.k) / arc.a;
  if (r < 0) return [];
  const s = Math.sqrt(r);
  return [arc.p - s, arc.p + s].filter((x) => x >= lo - EPS && x <= hi + EPS);
}

/** First x in [lo, hi] (lo ≥ launch) where yLo ≤ y(x) ≤ yHi, or null. Candidates: the span's left edge and boundary crossings. */
function firstInside(arc: Arc, lo: number, hi: number, yLo: number, yHi: number): number | null {
  if (hi < lo) return null;
  const inside = (x: number) => {
    const y = yAt(arc, x);
    return y >= yLo - EPS && y <= yHi + EPS;
  };
  const cands = [lo, ...crossings(arc, yLo, lo, hi), ...(Number.isFinite(yHi) ? crossings(arc, yHi, lo, hi) : [])].sort((a, b) => a - b);
  for (const x of cands) if (inside(x)) return x;
  return null;
}

/** True (perpendicular) distance from a ring's centre to the flown part of the arc, so what you see is what counts. */
export function ringDistance(arc: Arc, ring: Ring, xFrom: number, xTo: number): number {
  let best = Infinity;
  const lo = Math.max(xFrom, ring.x - 1.5);
  const hi = Math.min(xTo, ring.x + 1.5);
  for (let x = lo; x <= hi; x += 0.002) best = Math.min(best, Math.hypot(x - ring.x, yAt(arc, x) - ring.y));
  return best;
}

export function traceShot(arc: Arc, field: Field, withPath = true): ShotResult {
  type Hit = { x: number; kind: EndKind; id?: string };
  const hits: Hit[] = [];
  const after = arc.x0 + EPS;

  // Ground: where a downward arc comes back to y = 0.
  const land = landingX(arc);
  if (land !== null) {
    const wet = field.water?.some(([a, b]) => land >= a && land <= b);
    hits.push({ x: land, kind: wet ? 'water' : 'ground' });
  }
  const groundX = land ?? Infinity;

  for (const o of field.obstacles) {
    if (o.kind === 'post' && o.x > arc.x0 && o.x <= groundX) {
      const y = yAt(arc, o.x);
      if (y >= o.yLow && y <= o.yHigh) hits.push({ x: o.x, kind: 'post', id: o.id });
    } else if (o.kind === 'ceiling') {
      const x = firstInside(arc, Math.max(o.x1, after), Math.min(o.x2, groundX), o.y, Infinity);
      if (x !== null) hits.push({ x, kind: 'ceiling', id: o.id });
    } else if (o.kind === 'target') {
      const x = firstInside(arc, Math.max(o.x1, after), Math.min(o.x2, groundX), o.y1, o.y2);
      if (x !== null) hits.push({ x, kind: 'target', id: o.id });
    }
  }

  // Leaving the field: over the top (space) or past the far edge.
  const top = crossings(arc, field.yMax, after, field.xMax);
  if (top.length) hits.push({ x: top[0], kind: 'space' });
  hits.push({ x: field.xMax, kind: arc.a >= 0 ? 'space' : 'outOfField' });

  hits.sort((a, b) => a.x - b.x);
  const end = hits[0];
  const endY = end.kind === 'ground' || end.kind === 'water' ? 0 : yAt(arc, end.x);

  const swiped = field.obstacles
    .filter((o): o is Ring => o.kind === 'ring' && o.x > arc.x0 && o.x <= end.x && ringDistance(arc, o, arc.x0, end.x) <= o.r)
    .sort((a, b) => a.x - b.x)
    .map((o) => o.id);

  const path: { x: number; y: number }[] = [];
  if (withPath) for (let x = arc.x0; x < end.x; x += 0.05) path.push({ x, y: yAt(arc, x) });
  path.push({ x: end.x, y: endY });

  return {
    end: { kind: end.kind, x: end.x, y: endY, id: end.id },
    rings: swiped,
    soaked: end.kind === 'target' && end.id ? [end.id] : [],
    path,
  };
}
