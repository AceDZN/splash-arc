// Pure game state machine. The scene reads `state`, sends inputs, and drains `events` to play effects.
import { type Arc, horizontalSpeed, yAt } from '../math/arc';
import type { ShotResult } from '../math/trace';
import { LEVELS, type Level } from './levels';
import { aimArc, catches, clampVertex, FINE_SNAP, resolveShot, SNAP, volleyArc, volleyLanding, type ShotOutcome } from './shot';

export type Phase = 'aim' | 'drift' | 'flight' | 'impact' | 'card' | 'incoming' | 'won' | 'out';

export type GameEvent =
  | { type: 'launch'; arc: Arc }
  | { type: 'swipe'; id: string; x: number; y: number }
  | { type: 'impact'; result: ShotResult; success: boolean }
  | { type: 'incoming'; arc: Arc }
  | { type: 'caught'; x: number }
  | { type: 'soakedUs'; x: number }
  | { type: 'won'; stars: number }
  | { type: 'out' }
  | { type: 'level'; id: number };

export interface LearningEvent {
  level: number;
  attempt: number;
  action: 'shot' | 'catch';
  values: Record<string, number>;
  outcome: string;
  hintsUsed: number;
  /** First try of this level (or volley) with no hint. */
  unaided: boolean;
  success: boolean;
}

export interface GameState {
  levelIndex: number;
  level: Level;
  phase: Phase;
  p: number;
  k: number;
  fine: boolean;
  balloonsLeft: number;
  shotsFired: number;
  /** Raft offset during the drift animation (m). */
  raftX: number;
  /** Ball position while flying. */
  ball: { x: number; y: number } | null;
  /** The shot being flown or just resolved. */
  shot: ShotOutcome | null;
  swiped: string[];
  phaseTime: number;
  // Return-fire levels.
  volleyIndex: number;
  volleyTries: number;
  bucketX: number;
  incoming: Arc | null;
  incomingEnd: number;
  lastCatch: boolean | null;
  /** Rival balloons that landed on us this level. */
  misses: number;
  hintsShown: number;
  stars: number[];
  paused: boolean;
  log: LearningEvent[];
}

const DRIFT_TIME = 1.1;
const IMPACT_TIME = 1.6;
const SLOWMO = 0.75;

export class Game {
  state: GameState;
  events: GameEvent[] = [];

  constructor(levelIndex = 0, stars: number[] = []) {
    this.state = this.fresh(levelIndex, stars, []);
  }

  private fresh(levelIndex: number, stars: number[], log: LearningEvent[]): GameState {
    const level = LEVELS[levelIndex];
    return {
      levelIndex,
      level,
      phase: level.goal.kind === 'catch' ? 'card' : 'aim',
      p: level.start.p,
      k: level.start.k,
      fine: false,
      balloonsLeft: level.balloons,
      shotsFired: 0,
      raftX: 0,
      ball: null,
      shot: null,
      swiped: [],
      phaseTime: 0,
      volleyIndex: 0,
      volleyTries: 0,
      bucketX: level.bucketStart ?? 5,
      incoming: null,
      incomingEnd: 0,
      lastCatch: null,
      misses: 0,
      hintsShown: 0,
      stars,
      paused: false,
      log,
    };
  }

  loadLevel(index: number): void {
    const i = Math.max(0, Math.min(LEVELS.length - 1, index));
    this.state = this.fresh(i, this.state.stars, this.state.log);
    this.events.push({ type: 'level', id: this.state.level.id });
  }

  restart(): void {
    this.loadLevel(this.state.levelIndex);
  }

  /** The arc as currently aimed (before any drift). */
  aim(): Arc {
    return aimArc(this.state.level, this.state.p, this.state.k);
  }

  canAim(): boolean {
    return this.state.phase === 'aim' && !this.state.paused;
  }

  setVertex(p: number, k: number): void {
    if (!this.canAim()) return;
    const s = this.state;
    const v = clampVertex(s.level, p, k, s.fine ? FINE_SNAP : SNAP);
    if (v.p === s.level.launcher.x) return;
    s.p = v.p;
    s.k = v.k;
  }

  nudge(param: 'p' | 'k', dir: 1 | -1): void {
    const step = this.state.fine ? FINE_SNAP : SNAP;
    if (param === 'p') this.setVertex(this.state.p + dir * step, this.state.k);
    else this.setVertex(this.state.p, this.state.k + dir * step);
  }

  toggleFine(): void {
    this.state.fine = !this.state.fine;
  }

  setBucket(x: number): void {
    const s = this.state;
    if (s.phase !== 'card' || s.paused) return;
    const [a, b] = s.level.bucketRange ?? [1, 13];
    s.bucketX = Math.min(b, Math.max(a, Math.round(x / SNAP) * SNAP));
  }

  showHint(): string | null {
    const s = this.state;
    const list = s.level.goal.kind === 'catch' ? s.level.volleys![s.volleyIndex].hint : s.level.hint;
    if (s.hintsShown >= list.length) return list.length ? list[list.length - 1] : null;
    return list[s.hintsShown++];
  }

  fire(): void {
    const s = this.state;
    if (s.paused) return;
    if (s.phase === 'card') return this.ready();
    if (s.phase !== 'aim' || s.balloonsLeft <= 0) return;
    s.shot = resolveShot(s.level, s.p, s.k);
    s.balloonsLeft--;
    s.shotsFired++;
    s.swiped = [];
    s.phaseTime = 0;
    s.raftX = 0;
    if (s.level.drift) {
      s.phase = 'drift';
    } else {
      this.launch();
    }
  }

  private launch(): void {
    const s = this.state;
    s.phase = 'flight';
    s.phaseTime = 0;
    s.ball = { x: s.shot!.flown.x0, y: s.shot!.flown.h };
    this.events.push({ type: 'launch', arc: s.shot!.flown });
  }

  private ready(): void {
    const s = this.state;
    const v = s.level.volleys![s.volleyIndex];
    s.incoming = volleyArc(v);
    s.incomingEnd = volleyLanding(v);
    s.phase = 'incoming';
    s.phaseTime = 0;
    s.ball = { x: v.x0, y: s.incoming.h };
    this.events.push({ type: 'incoming', arc: s.incoming });
  }

  togglePause(force?: boolean): void {
    this.state.paused = force ?? !this.state.paused;
  }

  advance(dtSeconds: number): void {
    const s = this.state;
    if (s.paused) return;
    // Fixed sub-steps keep flights identical regardless of frame rate.
    let left = Math.min(dtSeconds, 0.25);
    while (left > 1e-9) {
      const dt = Math.min(left, 1 / 120);
      this.step(dt);
      left -= dt;
    }
  }

  private step(dt: number): void {
    const s = this.state;
    s.phaseTime += dt;
    switch (s.phase) {
      case 'drift': {
        const d = s.level.drift ?? 0;
        const t = Math.min(1, s.phaseTime / DRIFT_TIME);
        s.raftX = d * (1 - Math.cos(Math.PI * t)) / 2;
        if (t >= 1) this.launch();
        break;
      }
      case 'flight': {
        const shot = s.shot!;
        const arc = shot.flown;
        const vx = horizontalSpeed(arc) * SLOWMO;
        const x = Math.min(arc.x0 + vx * s.phaseTime, shot.result.end.x);
        const y = x >= shot.result.end.x ? shot.result.end.y : yAt(arc, x);
        s.ball = { x, y };
        for (const id of shot.result.rings) {
          const ring = s.level.field.obstacles.find((o) => o.id === id);
          if (ring && ring.kind === 'ring' && x >= ring.x && !s.swiped.includes(id)) {
            s.swiped.push(id);
            this.events.push({ type: 'swipe', id, x: ring.x, y: yAt(arc, ring.x) });
          }
        }
        if (x >= shot.result.end.x) this.impact();
        break;
      }
      case 'incoming': {
        const arc = s.incoming!;
        const vx = horizontalSpeed(arc) * SLOWMO;
        const x = Math.min(arc.x0 + vx * s.phaseTime, s.incomingEnd);
        s.ball = { x, y: x >= s.incomingEnd ? 0 : yAt(arc, x) };
        if (x >= s.incomingEnd) this.catchResolve();
        break;
      }
      case 'impact': {
        if (s.phaseTime >= IMPACT_TIME) this.afterImpact();
        break;
      }
    }
  }

  private impact(): void {
    const s = this.state;
    const shot = s.shot!;
    s.phase = 'impact';
    s.phaseTime = 0;
    s.ball = null;
    const first = s.shotsFired === 1;
    s.log.push({
      level: s.level.id,
      attempt: s.shotsFired,
      action: 'shot',
      values: { a: shot.aimed.a, p: s.p, k: s.k, flownP: shot.flown.p, endX: shot.result.end.x },
      outcome: shot.result.end.kind + (shot.result.end.id ? `:${shot.result.end.id}` : ''),
      hintsUsed: s.hintsShown,
      unaided: first && s.hintsShown === 0,
      success: shot.success,
    });
    this.events.push({ type: 'impact', result: shot.result, success: shot.success });
  }

  private catchResolve(): void {
    const s = this.state;
    const v = s.level.volleys![s.volleyIndex];
    const ok = catches(v, s.bucketX);
    s.volleyTries++;
    s.lastCatch = ok;
    if (!ok) s.misses++;
    s.phase = 'impact';
    s.phaseTime = 0;
    s.ball = null;
    s.log.push({
      level: s.level.id,
      attempt: s.volleyTries,
      action: 'catch',
      values: { volley: s.volleyIndex, bucketX: s.bucketX, landing: s.incomingEnd },
      outcome: ok ? 'caught' : 'soakedUs',
      hintsUsed: s.hintsShown,
      unaided: s.volleyTries === 1 && s.hintsShown === 0,
      success: ok,
    });
    this.events.push(ok ? { type: 'caught', x: s.bucketX } : { type: 'soakedUs', x: s.incomingEnd });
  }

  private afterImpact(): void {
    const s = this.state;
    if (s.level.goal.kind === 'catch') {
      if (s.lastCatch) {
        s.volleyIndex++;
        s.volleyTries = 0;
        s.hintsShown = 0;
        if (s.volleyIndex >= s.level.volleys!.length) return this.win();
      }
      s.phase = 'card';
      s.incoming = null;
      return;
    }
    if (s.shot!.success) return this.win();
    if (s.balloonsLeft <= 0) {
      s.phase = 'out';
      this.events.push({ type: 'out' });
      return;
    }
    s.phase = 'aim';
    s.raftX = 0;
  }

  private win(): void {
    const s = this.state;
    s.phase = 'won';
    const fails = s.level.goal.kind === 'catch' ? s.misses : s.shotsFired - 1;
    const stars = fails === 0 ? 3 : fails === 1 ? 2 : 1;
    s.stars[s.levelIndex] = Math.max(s.stars[s.levelIndex] ?? 0, stars);
    this.events.push({ type: 'won', stars });
  }
}
