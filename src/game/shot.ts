// Turns the player's vertex choice into the arc that actually flies, and judges it against the level goal.
import { type Arc, arcFromEquation, arcFromVertex, landingX, shiftArc } from '../math/arc';
import { traceShot, type ShotResult } from '../math/trace';
import type { Level, Volley } from './levels';

export interface ShotOutcome {
  /** The arc the player set, relative to where the launcher is now. */
  aimed: Arc;
  /** The arc that flies (after any raft drift). */
  flown: Arc;
  result: ShotResult;
  /** Goal ids swiped or soaked by this shot. */
  hits: string[];
  success: boolean;
}

export const SNAP = 0.5;
export const FINE_SNAP = 0.1;

export function snap(v: number, step: number): number {
  return Math.round(v / step) * step;
}

/** Clamp and snap a dragged vertex to the level's allowed window. */
export function clampVertex(level: Level, p: number, k: number, step = SNAP): { p: number; k: number } {
  const [p0, p1] = level.pRange;
  const [k0, k1] = level.kRange;
  const sp = Math.min(p1, Math.max(p0, snap(p, step)));
  const sk = Math.min(k1, Math.max(k0, snap(k, step)));
  // Keep one decimal of precision so 0.1-steps don't accumulate float noise.
  return { p: Math.round(sp * 100) / 100, k: Math.round(sk * 100) / 100 };
}

export function aimArc(level: Level, p: number, k: number): Arc {
  return arcFromVertex(level.launcher.x, level.launcher.h, p, k);
}

export function resolveShot(level: Level, p: number, k: number, withPath = true): ShotOutcome {
  const aimed = aimArc(level, p, k);
  const flown = level.drift ? shiftArc(aimed, level.drift) : aimed;
  const result = traceShot(flown, level.field, withPath);
  const goalIds = level.goal.kind === 'soak' ? level.goal.ids : [];
  const got = new Set([...result.rings, ...result.soaked]);
  const hits = goalIds.filter((id) => got.has(id));
  return { aimed, flown, result, hits, success: goalIds.length > 0 && hits.length === goalIds.length };
}

export const BUCKET_REACH = 0.3;

export function volleyArc(v: Volley): Arc {
  return arcFromEquation(v.a, v.p, v.k, v.x0);
}

export function volleyLanding(v: Volley): number {
  const x = landingX(volleyArc(v));
  if (x === null) throw new Error('rival volley never lands');
  return x;
}

/** The bucket catches the rival's balloon when it sits at the landing zero. */
export function catches(v: Volley, bucketX: number): boolean {
  return Math.abs(volleyLanding(v) - bucketX) <= BUCKET_REACH;
}

/** Every snapped vertex in the level window that wins, for tests and the solver. */
export function winningVertices(level: Level, step = SNAP): { p: number; k: number }[] {
  const wins: { p: number; k: number }[] = [];
  for (let p = level.pRange[0]; p <= level.pRange[1] + 1e-9; p += step) {
    for (let k = level.kRange[0]; k <= level.kRange[1] + 1e-9; k += step) {
      const v = clampVertex(level, p, k, step);
      if (v.p === level.launcher.x) continue;
      if (resolveShot(level, v.p, v.k, false).success) wins.push(v);
    }
  }
  return wins;
}
