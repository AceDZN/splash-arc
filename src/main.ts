import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import '@fontsource/rubik/800.css';
import './style.css';
import * as THREE from 'three';
import { Game, type GameEvent } from './game/game';
import { LEVELS, type Level } from './game/levels';
import { aimArc, volleyArc } from './game/shot';
import { fmt, formatFactoredForm, formatVertexForm, landingX, yAt, zeros } from './math/arc';
import type { ShotResult } from './math/trace';
import { Stage, toon } from './scene/stage';
import { Physics } from './scene/physics';
import { buildLevel, type LevelView } from './scene/level-view';
import { ArcView } from './scene/arc-view';
import { Fx } from './scene/fx';
import { Camper, loadProp } from './scene/characters';
import { disposeObject } from './scene/labels';
import { Hud } from './ui/hud';
import { Sfx } from './audio';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const stage = new Stage(canvas);
const physics = new Physics();
const fx = new Fx();
const arcView = new ArcView();
const sfx = new Sfx();
stage.scene.add(fx.group, arcView.group);

const STORE = 'splash-arc-v1';
const saved = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '{}') as { stars?: number[]; muted?: boolean; reduced?: boolean };
  } catch {
    return {};
  }
})();
const game = new Game(0, saved.stars ?? []);
const persist = () => {
  try {
    localStorage.setItem(STORE, JSON.stringify({ stars: game.state.stars, muted: sfx.muted, reduced: stage.reducedMotion }));
    localStorage.setItem(`${STORE}-log`, JSON.stringify(game.state.log.slice(-500)));
  } catch {
    /* storage may be unavailable */
  }
};

// ---------- Characters and props ----------
const hero = new Camper('#ff8a3d', '#f4f0e6', 2.0);
const rivals = [new Camper('#2ec4b6', '#1f8a80'), new Camper('#2ec4b6', '#ff5d8f')];
stage.scene.add(hero.root, ...rivals.map((r) => r.root));
void hero.useModel('./models/camper.glb', 2.0);
void rivals[0].useModel('./models/rival.glb', 1.9).then(() => {
  if (!rivals[0].usingModel) void rivals[0].useModel('./models/camper.glb', 1.9, '#2ec4b6');
});
void rivals[1].useModel('./models/rival.glb', 1.7).then(() => {
  if (!rivals[1].usingModel) void rivals[1].useModel('./models/camper.glb', 1.7, '#2ec4b6');
});

const slingshot = new THREE.Group();
const slingFallback = (() => {
  const g = new THREE.Group();
  const wood = toon('#9a6a3a');
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.7, 8), wood);
  stem.position.y = 0.35;
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8), wood);
  fl.position.set(0, 0.88, 0.16);
  fl.rotation.x = 0.4;
  const fr = fl.clone();
  fr.position.z = -0.16;
  fr.rotation.x = -0.4;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.5), wood);
  base.position.y = 0.06;
  for (const m of [stem, fl, fr, base]) { m.castShadow = true; g.add(m); }
  return g;
})();
slingshot.add(slingFallback);
stage.scene.add(slingshot);
void loadProp('./models/slingshot.glb', 1.15).then((m) => {
  if (!m) return;
  slingshot.remove(slingFallback);
  m.rotation.y = Math.PI / 2;
  slingshot.add(m);
});
const forkTips = [new THREE.Vector3(0, 1.1, 0.24), new THREE.Vector3(0, 1.1, -0.24)];
const bandMat = new THREE.LineBasicMaterial({ color: '#ff5d8f' });
const bands = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), bandMat);
stage.scene.add(bands);

void loadProp('./models/lifeguard-tower.glb', 5.2).then((m) => {
  if (!m) return;
  m.position.set(12.5, 0, -8);
  m.rotation.y = -0.4;
  stage.scene.add(m);
});
void loadProp('./models/cabin.glb', 4.2).then((m) => {
  if (!m) return;
  m.position.set(-6.5, 0, -9);
  m.rotation.y = 0.5;
  stage.scene.add(m);
});

const bucket = (() => {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.6, 18, 1, true), toon('#2f8cff', { side: THREE.DoubleSide }));
  b.position.y = 0.3;
  b.castShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 6, 20), toon('#dfeeff'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.6;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.39, 18), toon('#8fe9ff'));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.2;
  water.name = 'water';
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 28), new THREE.MeshBasicMaterial({ color: '#3dd6ff', transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  g.add(b, rim, water, ring);
  return g;
})();
stage.scene.add(bucket);

// ---------- Level lifecycle ----------
let view: LevelView | null = null;
let impactTimer = 0;
let pendingOverlay: (() => void) | null = null;
let started = false;

function yTopFor(level: Level): number {
  let top = level.kRange[1];
  for (const o of level.field.obstacles) {
    if (o.kind === 'post' && Number.isFinite(o.yLow) && o.yLow > 0) top = Math.max(top, o.yLow + 1.5);
    if (o.kind === 'ring') top = Math.max(top, o.y + 1);
  }
  for (const v of level.volleys ?? []) top = Math.max(top, v.k + 1);
  return Math.min(15, Math.ceil(top + 0.3));
}

function buildCurrentLevel(): void {
  const s = game.state;
  const level = s.level;
  if (view) {
    stage.scene.remove(view.root);
    disposeObject(view.root);
  }
  physics.clear();
  fx.clear();
  arcView.setTrail(null);
  arcView.setRivalTrail(null);
  const yTop = yTopFor(level);
  view = buildLevel(level, physics, yTop);
  stage.scene.add(view.root);
  stage.setTheme(level.theme);
  stage.setView({ x0: -2.8, x1: 14.4, y0: -0.6, y1: yTop + 0.4 }, !started);
  placeCast();
  hud.say(null);
  hud.selectParam('k');
}

function placeCast(): void {
  const s = game.state;
  const level = s.level;
  const catchLevel = level.goal.kind === 'catch';
  const { x, h } = level.launcher;
  slingshot.visible = !catchLevel;
  bands.visible = !catchLevel;
  bucket.visible = catchLevel;
  if (catchLevel) {
    const v = level.volleys![Math.min(s.volleyIndex, level.volleys!.length - 1)];
    rivals[0].root.position.set(v.x0 - 0.9, 0, 0.5);
    rivals[0].face(1);
    rivals[1].root.position.set(v.x0 - 2.1, 0, -1.4);
    rivals[1].face(1);
    hero.root.position.set(s.bucketX + 0.9, 0, 0.6);
    hero.face(-1);
  } else {
    const rx = s.raftX;
    slingshot.position.set(x - 0.75 + rx, h, 0);
    hero.root.position.set(x - 1.6 + rx, h, h > 0 ? -0.6 : 2.6);
    hero.face(1);
    const spot = view!.rivalSpot;
    rivals[0].root.position.set(spot.x, 0, 1.8);
    rivals[0].face(-1);
    rivals[1].root.position.set(spot.x + 1.1, 0, spot.z - 1.4);
    rivals[1].face(-1);
  }
}

// ---------- Explanations (worked feedback after a shot) ----------
function obstacleName(id: string | undefined, level: Level): string {
  const o = level.field.obstacles.find((q) => q.id === id);
  if (!o) return 'משהו';
  if (o.kind === 'post') return { wall: 'החומה', net: 'הרשת', branch: 'הענף', barrier: 'המצוף' }[o.look];
  if (o.kind === 'ceiling') return 'הדגלונים';
  if (o.kind === 'ring') return o.look === 'pinata' ? 'הפיניאטה' : 'הפנס';
  return { crate: 'הארגז', pool: 'הבריכה', ring: 'גלגל ההצלה', fort: 'המבצר' }[o.look];
}

function explainMiss(level: Level, r: ShotResult): string {
  const shot = game.state.shot!;
  const arc = shot.flown;
  const e = r.end;
  const o = level.field.obstacles.find((q) => q.id === e.id);
  let text = '';
  if (e.kind === 'post' && o?.kind === 'post') {
    text = o.yLow === 0
      ? `ב־{x = ${fmt(e.x)}} הקשת בגובה {y = ${fmt(e.y)}}, אבל ${obstacleName(e.id, level)} בגובה {${fmt(o.yHigh)}} מ׳. צריך שהקשת תהיה גבוהה יותר שם.`
      : `ב־{x = ${fmt(e.x)}} הקשת בגובה {y = ${fmt(e.y)}}, ו${obstacleName(e.id, level)} מתחיל ב־{${fmt(o.yLow)}} מ׳. צריך לעבור מתחת.`;
  } else if (e.kind === 'ceiling' && o?.kind === 'ceiling') {
    text = `הקשת עלתה לגובה {${fmt(e.y)}} ליד {x = ${fmt(e.x)}}, והדגלונים בגובה {${fmt(o.y)}}. נסו קדקוד נמוך יותר.`;
  } else if (e.kind === 'space') {
    text = `{a = ${fmt(arc.a)}}: כש־{a ≥ 0} הפרבולה פתוחה כלפי מעלה והבלון לא חוזר לקרקע! הקדקוד צריך להיות מעל המשגר.`;
  } else if (e.kind === 'ground' || e.kind === 'water' || e.kind === 'outOfField') {
    const land = landingX(arc);
    text = `הבלון נחת ב־{x = ${fmt(land ?? e.x)}}: נקודת האפס השנייה של {${formatVertexForm(arc)}}.`;
  } else if (e.kind === 'target') {
    text = `פגעתם ב${obstacleName(e.id, level)}.`;
  }
  if (level.drift) text += ` הרפסודה זזה {${fmt(level.drift)}} מ׳, אז הקדקוד עבר מ־{x = ${fmt(shot.aimed.p)}} ל־{x = ${fmt(arc.p)}}.`;
  const goal = level.goal.kind === 'soak' ? level.goal.ids : [];
  for (const id of goal) {
    const ring = level.field.obstacles.find((q) => q.id === id);
    if (ring?.kind === 'ring' && !r.rings.includes(id) && ring.x <= e.x + 1e-9) {
      text += ` ב־{x = ${ring.x}} הקשת עברה בגובה {${fmt(yAt(arc, ring.x))}} — ${obstacleName(id, level)} ב־{${ring.y}}.`;
    }
  }
  return text;
}

function explainWin(level: Level): string {
  const s = game.state;
  if (level.goal.kind === 'catch') return 'קראתם את נקודות האפס מתוך המשוואה ותפסתם את כל הבלונים. כשיודעים איפה הזורק עומד, נקודת האפס השנייה סימטרית לו סביב הציר.';
  const arc = s.shot!.flown;
  const z = zeros(arc).map((x) => fmt(x));
  const base = `{${formatVertexForm(arc)}}: קדקוד {(${fmt(arc.p)}, ${fmt(arc.k)})}, ציר סימטרייה {x = ${fmt(arc.p)}}${z.length ? `, נקודות אפס {${z.join(', ')}}` : ''}.`;
  if (game.challengeRound > 0) {
    const wall = level.field.obstacles.find((o) => o.id === 'wall');
    const branch = level.field.obstacles.find((o) => o.id === 'branch');
    if (wall?.kind === 'post' && branch?.kind === 'post') {
      return `${base} {y(${wall.x}) = ${fmt(yAt(arc, wall.x))} > ${wall.yHigh}} מעל החומה, {y(${branch.x}) = ${fmt(yAt(arc, branch.x))} < ${branch.yLow}} מתחת לענף.`;
    }
  }
  switch (level.id) {
    case 1: return `${base} ב־{x = 2} הגובה {${fmt(yAt(arc, 2))}} מעל החומה ({3}), והנחיתה ב־{2p = 8}.`;
    case 2: return `${base} הפיניאטה הייתה הקדקוד, והנחיתה סימטרית ל־{0}: {x = 10}.`;
    case 3: return `${base} מהמגדל בגובה {3}: {a = (3 − k)/p² = ${fmt(arc.a)}}. הנחיתה לא ב־{2p}!`;
    case 5: return `${base} כיוונתם לנחיתה ב־{${fmt(s.shot!.aimed.p * 2)}}, והסחיפה הזיזה את כל הקשת {2} מ׳ ימינה.`;
    case 6: return `${base} שני פנסים באותו גובה ← הציר באמצע, {x = 4}. ומהנקודה {(0, 0)}: {16a + k = 0}.`;
    case 7: return `${base} {y(8) = ${fmt(yAt(arc, 8))} > 6} מעל החומה, {y(3) = ${fmt(yAt(arc, 3))} < 11} מתחת לענף.`;
    default: return base;
  }
}

// ---------- Events from the game ----------
function handle(ev: GameEvent): void {
  const s = game.state;
  const level = s.level;
  switch (ev.type) {
    case 'launch':
      sfx.whoosh();
      hero.play('throw');
      arcView.setTrail(null);
      arcView.setBallColor(false);
      break;
    case 'incoming':
      sfx.whoosh();
      rivals[0].play('throw');
      arcView.setRivalTrail(null);
      arcView.setBallColor(true);
      break;
    case 'swipe': {
      const g = view?.rings.get(ev.id);
      const at = new THREE.Vector3(ev.x, ev.y, 0);
      const ring = level.field.obstacles.find((o) => o.id === ev.id);
      if (ring?.kind === 'ring' && ring.look === 'pinata') {
        sfx.pop();
        fx.confetti(at);
        fx.pop('בום!', at.clone().add(new THREE.Vector3(0, 0.6, 0.5)), { bg: '#ffd23d', fg: '#3a2a00' });
        if (g) g.userData.burst = 1;
      } else {
        sfx.ding();
        fx.splash(at, '#ffd98a', 30, 0.5);
        if (g) g.userData.lit = 1;
      }
      break;
    }
    case 'impact':
      onImpact(ev.result, ev.success);
      break;
    case 'caught': {
      sfx.catchIt();
      hero.play('cheer');
      rivals[0].play('soaked');
      const at = new THREE.Vector3(ev.x, 0.6, 0);
      fx.splash(at, '#3dd6ff', 50, 0.6);
      fx.pop('תפיסה!', at.clone().add(new THREE.Vector3(0, 1.4, 0.5)), { bg: '#2f8cff' });
      arcView.setRivalTrail(volleyPath());
      hud.toast(`תפסתם! הבלון נחת בדיוק ב־{x = ${fmt(ev.x)}}.`, 2.6, 'good');
      break;
    }
    case 'soakedUs': {
      sfx.splash(true);
      sfx.laugh();
      hero.play('soaked');
      rivals[0].play('cheer');
      const at = new THREE.Vector3(ev.x, 0.2, 0);
      fx.splash(at, '#3dd6ff', 110, 1);
      fx.wetSpot(at, 1);
      stage.addShake(0.6);
      arcView.setRivalTrail(volleyPath());
      const v = level.volleys![s.volleyIndex];
      const eq = v.form === 'factored' ? formatFactoredForm(v.a, ...(zeros(volleyArc(v)) as [number, number])) : formatVertexForm(v);
      hud.toast(`נרטבתם! {${eq}} נוחת ב־{x = ${fmt(ev.x)}}, והדלי היה ב־{x = ${fmt(s.bucketX)}}.`, 4.5, 'bad');
      break;
    }
    case 'won':
      sfx.fanfare();
      hero.play('cheer');
      persist();
      pendingOverlay = () => hud.winScreen(ev.stars, explainWin(level));
      impactTimer = 1.0;
      break;
    case 'out':
      sfx.sad();
      persist();
      pendingOverlay = () => hud.outScreen(explainMiss(level, s.shot!.result));
      impactTimer = 0.4;
      break;
    case 'level':
      buildCurrentLevel();
      break;
  }
}

function volleyPath(): { x: number; y: number }[] {
  const s = game.state;
  const arc = s.incoming;
  if (!arc) return [];
  const pts: { x: number; y: number }[] = [];
  for (let x = arc.x0; x <= s.incomingEnd; x += 0.1) pts.push({ x, y: Math.max(0, yAt(arc, x)) });
  pts.push({ x: s.incomingEnd, y: 0 });
  return pts;
}

function onImpact(r: ShotResult, success: boolean): void {
  const level = game.state.level;
  const at = new THREE.Vector3(r.end.x, r.end.y, 0);
  arcView.setTrail(r.path);
  const o = level.field.obstacles.find((q) => q.id === r.end.id);
  if (success) {
    sfx.splash(true);
    fx.splash(at.clone().add(new THREE.Vector3(0, 0.3, 0)), '#ff3d8b', 160, 1.3);
    fx.wetSpot(at, 1.6, '#c2557f');
    fx.pop('נרטב!', at.clone().add(new THREE.Vector3(-0.8, 1.6, 0.8)), { bg: '#2f8cff', size: 1.0, rtl: true });
    fx.pop('SPLASH!', at.clone().add(new THREE.Vector3(1.4, 2.6, 0.4)), { bg: '#ffd23d', fg: '#1d4f91', size: 1.1 });
    physics.blast(at, 4, 7);
    stage.addShake(1);
    for (const rv of rivals) rv.play('soaked');
    hud.toast('נרטבו! פגיעה ישירה.', 2, 'good');
    return;
  }
  // Recoverable, funny failures.
  rivals[0].play('cheer');
  sfx.laugh();
  if (r.end.kind === 'post' || r.end.kind === 'ceiling') {
    const isNet = o?.kind === 'post' && (o.look === 'net' || o.look === 'branch');
    if (isNet) sfx.boing(); else sfx.splat();
    if (o?.kind === 'post' && (o.look === 'wall' || o.look === 'barrier')) {
      fx.wallSplat(at, '#ff3d8b');
      physics.nudge(at, 2.5, 1.2);
    }
    fx.splash(at, '#ff3d8b', 70, 0.8);
    fx.pop(`${fmt(r.end.y)} מ׳`, at.clone().add(new THREE.Vector3(-0.6, 0.7, 0.6)), { bg: '#d6283f', size: 0.6 });
    stage.addShake(0.5);
  } else if (r.end.kind === 'space') {
    sfx.space();
    fx.pop('לחלל!', new THREE.Vector3(Math.min(12, r.end.x), Math.min(12, r.end.y), 0.4), { bg: '#6a4cff', rtl: true });
  } else if (r.end.kind === 'target') {
    sfx.splash(false);
    fx.splash(at, '#ff3d8b', 80, 0.8);
    physics.blast(at, 2, 3);
  } else {
    sfx.splash(false);
    fx.splash(at, r.end.kind === 'water' ? '#8fe9ff' : '#ff3d8b', 70, 0.8);
    if (r.end.kind !== 'water') fx.wetSpot(at, 0.9);
    fx.pop(`x = ${fmt(r.end.x)}`, at.clone().add(new THREE.Vector3(0, 1.0, 0.6)), { bg: '#d6283f', size: 0.6 });
    stage.addShake(0.25);
  }
  hud.toast(explainMiss(level, r), 5, 'bad');
}

// ---------- HUD ----------
const hud: Hud = new Hud(document.getElementById('hud')!, game, {
  fire: () => { sfx.unlock(); game.fire(); },
  nudge: (param, dir) => {
    sfx.unlock();
    game.nudge(param, dir);
    sfx.tick(param === 'k' ? 0.8 + game.state.k * 0.06 : 1);
  },
  nudgeBucket: (dir) => { sfx.unlock(); game.setBucket(game.state.bucketX + dir * 0.5); sfx.tick(); },
  toggleFine: () => game.toggleFine(),
  hint: () => {
    const h = game.showHint();
    if (h) hud.say(h);
    persist();
  },
  pause: () => { game.togglePause(true); hud.pauseScreen(); },
  resume: () => { game.togglePause(false); hud.showOverlay(null); },
  restart: () => { hud.showOverlay(null); pendingOverlay = null; game.restart(); },
  next: () => { hud.showOverlay(null); pendingOverlay = null; game.loadLevel(game.state.levelIndex + 1); },
  goLevel: (i) => { sfx.unlock(); started = true; hud.showOverlay(null); pendingOverlay = null; game.loadLevel(i); },
  toggleMute: () => { sfx.setMuted(!sfx.muted); hud.muted = sfx.muted; persist(); if (game.state.paused) hud.pauseScreen(); },
  toggleMotion: () => {
    stage.reducedMotion = !stage.reducedMotion;
    fx.reducedMotion = hud.reducedMotion = stage.reducedMotion;
    persist();
    hud.pauseScreen();
  },
  start: () => { sfx.unlock(); started = true; hud.showOverlay(null); game.loadLevel(Math.min(game.state.levelIndex, LEVELS.length - 1)); },
  challenge: () => {
    sfx.unlock();
    started = true;
    hud.showOverlay(null);
    pendingOverlay = null;
    if (game.challengeRound === 0) game.challengeSeed = Math.floor(Math.random() * 100000);
    game.loadChallenge(game.challengeRound + 1);
  },
});
sfx.setMuted(saved.muted ?? false);
hud.muted = sfx.muted;
stage.reducedMotion = fx.reducedMotion = hud.reducedMotion = saved.reduced ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Pointer input: drag the vertex (or the bucket) in the shot plane ----------
const ray = new THREE.Raycaster();
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let dragging = false;
let lastSnap = '';

function planePoint(e: PointerEvent): THREE.Vector3 | null {
  const r = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, stage.camera);
  const p = new THREE.Vector3();
  return ray.ray.intersectPlane(plane, p) ? p : null;
}

function applyDrag(e: PointerEvent): void {
  const p = planePoint(e);
  if (!p) return;
  const s = game.state;
  if (s.phase === 'card') game.setBucket(p.x);
  else game.setVertex(p.x, p.y);
  const key = `${s.p},${s.k},${s.bucketX}`;
  if (key !== lastSnap) {
    lastSnap = key;
    sfx.tick(0.8 + s.k * 0.05);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (!started || game.state.paused) return;
  const ph = game.state.phase;
  if (ph !== 'aim' && ph !== 'card') return;
  dragging = true;
  canvas.setPointerCapture(e.pointerId);
  applyDrag(e);
});
canvas.addEventListener('pointermove', (e) => {
  if (dragging) applyDrag(e);
  else if (game.state.phase === 'aim') {
    const p = planePoint(e);
    const near = p && Math.hypot(p.x - game.state.p, p.y - game.state.k) < 1.2;
    canvas.style.cursor = near ? 'grab' : 'crosshair';
  }
});
const endDrag = () => { if (dragging) sfx.stretch(); dragging = false; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

window.addEventListener('keydown', (e) => {
  if (!started) {
    if (e.key === 'Enter') hud.root.querySelector<HTMLElement>('[data-a="start"]')?.click();
    return;
  }
  const s = game.state;
  const catchLevel = s.level.goal.kind === 'catch';
  const k = e.key.toLowerCase();
  if (k === 'arrowleft' || k === 'arrowright') {
    const dir = k === 'arrowright' ? 1 : -1;
    if (catchLevel) game.setBucket(s.bucketX + dir * 0.5);
    else game.nudge('p', dir);
    sfx.tick();
    e.preventDefault();
  } else if (k === 'arrowup' || k === 'arrowdown') {
    if (!catchLevel) game.nudge('k', k === 'arrowup' ? 1 : -1);
    sfx.tick(0.8 + s.k * 0.06);
    e.preventDefault();
  } else if (k === ' ' || k === 'enter') {
    if (hud.root.querySelector('.overlay:not([hidden])')) return;
    sfx.unlock();
    game.fire();
    e.preventDefault();
  } else if (k === 'f') game.toggleFine();
  else if (k === 'h') { const h = game.showHint(); if (h) hud.say(h); }
  else if (k === 'p' || k === 'escape') {
    if (s.paused) { game.togglePause(false); hud.showOverlay(null); } else { game.togglePause(true); hud.pauseScreen(); }
  } else if (k === 'r') { hud.showOverlay(null); pendingOverlay = null; game.restart(); }
  else if (k === 'm') { sfx.setMuted(!sfx.muted); hud.muted = sfx.muted; }
});

// ?autopause=0 keeps automated runs going in a background tab.
const autoPause = new URLSearchParams(location.search).get('autopause') !== '0';
document.addEventListener('visibilitychange', () => {
  if (autoPause && document.hidden && started && !game.state.paused) { game.togglePause(true); hud.pauseScreen(); }
});
window.addEventListener('resize', () => stage.resize());
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  game.togglePause(true);
  hud.showOverlay('<h2>הגרפיקה נעצרה לרגע</h2><p>מנסים לשחזר…</p>');
});
canvas.addEventListener('webglcontextrestored', () => {
  hud.showOverlay(null);
  game.togglePause(false);
  buildCurrentLevel();
});

// ---------- Frame update ----------
let lastPhase = game.state.phase;

function frame(dt: number): void {
  const s = game.state;
  if (started) game.advance(dt);
  for (const ev of game.events.splice(0)) handle(ev);

  if (impactTimer > 0) {
    impactTimer -= dt;
    if (impactTimer <= 0 && pendingOverlay) { pendingOverlay(); pendingOverlay = null; }
  }
  if (s.phase !== lastPhase) {
    if (s.phase === 'aim' && (lastPhase === 'impact')) physics.reset();
    if (s.phase === 'card' && lastPhase === 'impact') {
      arcView.setRivalTrail(null);
      placeCast();
    }
    lastPhase = s.phase;
  }

  const level = s.level;
  const catchLevel = level.goal.kind === 'catch';
  if (view) {
    view.time += dt;
    // Raft drift and the cast that rides it.
    view.launcherRig.position.x = s.raftX;
    if (!catchLevel) placeCast();
    else {
      bucket.position.set(s.bucketX, 0, 0);
      hero.root.position.x += (s.bucketX + 0.9 - hero.root.position.x) * Math.min(1, dt * 10);
      const w = bucket.getObjectByName('water')!;
      w.position.y = 0.2 + Math.sin(view.time * 3) * 0.02;
    }
    for (const [, g] of view.rings) {
      const body = g.userData.body as THREE.Object3D;
      if (!stage.reducedMotion) body.rotation.z = Math.sin(view.time * 1.6 + body.position.x) * 0.12;
      if (g.userData.burst) {
        g.userData.burst = Math.min(3, g.userData.burst + dt * 3);
        body.scale.setScalar(Math.max(0.01, 1.4 - g.userData.burst * 0.5));
      }
      if (g.userData.lit && body.userData.lamp) {
        const m = (body.userData.lamp as THREE.Mesh).material as THREE.MeshToonMaterial;
        m.emissive.set('#ffb000');
      }
    }
    const flag = view.root.getObjectByName('flag');
    if (flag) flag.rotation.y = Math.sin(view.time * 3) * 0.25;
  }

  // Aim visuals.
  const aiming = s.phase === 'aim' && started && !catchLevel;
  if (!catchLevel) {
    const arc = s.phase === 'flight' || s.phase === 'impact' || s.phase === 'drift' ? s.shot!.aimed : aimArc(level, s.p, s.k);
    arcView.updateAim(arc, level.help, aiming, level.drift ?? 0);
  } else {
    arcView.updateAim(aimArc(level, 4, 4), level.help, false);
  }
  const rest = catchLevel
    ? (s.phase === 'card' ? new THREE.Vector3(level.volleys![Math.min(s.volleyIndex, level.volleys!.length - 1)].x0, 0, 0) : undefined)
    : (s.phase === 'aim' || s.phase === 'drift' ? new THREE.Vector3(level.launcher.x + s.raftX, level.launcher.h, 0) : undefined);
  arcView.setBall(s.ball, rest);
  if (catchLevel && s.phase === 'card') arcView.setBallColor(true);
  if (!catchLevel && (s.phase === 'aim' || s.phase === 'drift')) arcView.setBallColor(false);

  // Slingshot bands to the balloon.
  const bp = arcView.ball.visible ? arcView.ball.position : slingshot.position.clone().add(new THREE.Vector3(0, 1, 0));
  const t0 = slingshot.position.clone().add(forkTips[0]);
  const t1 = slingshot.position.clone().add(forkTips[1]);
  const mid = s.phase === 'aim' || s.phase === 'drift' ? bp : slingshot.position.clone().add(new THREE.Vector3(0.1, 1.05, 0));
  (bands.geometry as THREE.BufferGeometry).setFromPoints([t0, mid, t1]);

  arcView.tick(dt, stage.reducedMotion);
  hero.update(dt, stage.reducedMotion);
  for (const r of rivals) r.update(dt, stage.reducedMotion);
  physics.step(dt);
  fx.update(dt);
  stage.update(dt);
  hud.tick(dt);
  hud.update();
  stage.render();
}

// ---------- Test hooks ----------
function renderGameToText(): string {
  const s = game.state;
  const level = s.level;
  const catchLevel = level.goal.kind === 'catch';
  const arc = aimArc(level, s.p, s.k);
  const v = catchLevel ? level.volleys![Math.min(s.volleyIndex, level.volleys!.length - 1)] : null;
  const strip = (t: string) => t.replace(/[{}]/g, '');
  return JSON.stringify({
    coords: 'shot plane: x metres to the right, y metres up; launcher at (x0, h); balloon flies toward +x',
    started,
    level: { id: level.id, name: level.name, index: s.levelIndex, of: LEVELS.length },
    objective: strip(level.mission),
    phase: s.phase,
    paused: s.paused,
    launcher: { x0: level.launcher.x + s.raftX, h: level.launcher.h, drift: level.drift ?? 0 },
    aim: catchLevel ? null : {
      vertex: { p: s.p, k: s.k }, a: Math.round(arc.a * 10000) / 10000, equation: formatVertexForm(arc),
      zeros: level.help.landing ? zeros(arc).map((x) => Math.round(x * 1000) / 1000) : 'hidden',
      fine: s.fine, preview: level.help.preview,
    },
    balloonsLeft: s.balloonsLeft,
    obstacles: level.field.obstacles.map((o) => ({ ...o, yHigh: o.kind === 'post' && !Number.isFinite(o.yHigh) ? 'inf' : (o as { yHigh?: number }).yHigh })),
    ball: s.ball && { x: Math.round(s.ball.x * 100) / 100, y: Math.round(s.ball.y * 100) / 100 },
    lastShot: s.shot && { flownVertex: { p: s.shot.flown.p, k: s.shot.flown.k }, end: s.shot.result.end, swiped: s.shot.result.rings, hits: s.shot.hits, success: s.shot.success },
    returnFire: v && {
      volley: s.volleyIndex + 1, of: level.volleys!.length,
      card: v.form === 'factored' ? formatFactoredForm(v.a, ...(zeros(volleyArc(v)) as [number, number])) : formatVertexForm(v),
      thrower: v.x0, bucketX: s.bucketX, lastCatch: s.lastCatch,
    },
    hintsShown: s.hintsShown,
    stars: s.stars,
    overlay: hud.root.querySelector('.overlay:not([hidden]) h2')?.textContent ?? (hud.root.querySelector('.overlay:not([hidden]) .logo') ? 'title' : null),
  });
}

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    __splash: { game: Game; stage: Stage; hero: Camper; rivals: Camper[] };
  }
}
let manual = false;
window.render_game_to_text = renderGameToText;
window.advanceTime = (ms: number) => {
  manual = true;
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) frame(1 / 60);
};
window.__splash = { game, stage, hero, rivals };

// ---------- Boot ----------
async function boot(): Promise<void> {
  stage.resize();
  await physics.init();
  // ?level=N jumps straight into a level (handy for testing and sharing).
  const lv = Number(new URLSearchParams(location.search).get('level'));
  if (lv >= 1 && lv <= LEVELS.length) {
    started = true;
    game.loadLevel(lv - 1);
  } else {
    buildCurrentLevel();
    hud.titleScreen();
  }
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (!manual) frame(dt);
    else stage.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
void boot();
