// Builds one level's procedural world: axes, exact-height obstacles, targets, rings and physics forts.
// Everything that carries a mathematical value is built from the level data, never from a generated mesh.
import * as THREE from 'three';
import type { Level } from '../game/levels';
import type { Obstacle } from '../math/trace';
import { makeLabel } from './labels';
import type { Physics } from './physics';
import { toon } from './stage';

const CARDBOARD = '#c89b62';
const WOOD = '#b9824a';

export interface LevelView {
  root: THREE.Group;
  rings: Map<string, THREE.Object3D>;
  targets: Map<string, THREE.Object3D>;
  /** Where the balloon sits before launch and where the slingshot bands meet. */
  launchAnchor: THREE.Vector3;
  /** Whatever the launcher stands on (the raft drifts). */
  launcherRig: THREE.Group;
  /** A spot near the rival fort for rival campers. */
  rivalSpot: THREE.Vector3;
  water: THREE.Mesh | null;
  time: number;
}

function box(w: number, h: number, d: number, color: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  m.castShadow = m.receiveShadow = true;
  return m;
}

function bullseye(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  ['#ff3d5a', '#ffffff', '#ff3d5a', '#ffffff', '#ff3d5a'].forEach((col, i) => {
    g.fillStyle = col;
    g.beginPath();
    g.arc(64, 64, 60 - i * 12, 0, Math.PI * 2);
    g.fill();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.28, 24), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  return m;
}

function arrow(from: THREE.Vector3, to: THREE.Vector3, color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const len = from.distanceTo(to);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), mat);
  shaft.position.copy(from).add(to).multiplyScalar(0.5);
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  g.add(shaft);
  for (const [p, q] of [[to, from], [from, to]] as const) {
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.22, 8), mat);
    head.position.copy(p);
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p.clone().sub(q).normalize());
    g.add(head);
  }
  return g;
}

export function buildLevel(level: Level, physics: Physics, yTop: number): LevelView {
  const root = new THREE.Group();
  const rings = new Map<string, THREE.Object3D>();
  const targets = new Map<string, THREE.Object3D>();
  const { x: lx, h: lh } = level.launcher;
  const labels = level.help.gridLabels;

  // ---- Axes in the shot plane (z = 0), like the Workbook graph.
  const axisMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const xEnd = 13.6;
  const xAxis = new THREE.Mesh(new THREE.BoxGeometry(xEnd + 0.6, 0.07, 0.07), axisMat);
  xAxis.position.set((xEnd - 0.6) / 2, 0.035, 0.05);
  root.add(xAxis);
  const xHead = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), axisMat);
  xHead.rotation.z = -Math.PI / 2;
  xHead.position.set(xEnd, 0.035, 0.05);
  root.add(xHead);
  const yAxis = new THREE.Mesh(new THREE.BoxGeometry(0.07, yTop + 0.2, 0.07), axisMat);
  yAxis.position.set(0, (yTop + 0.2) / 2, 0.05);
  root.add(yAxis);
  const yHead = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 8), axisMat);
  yHead.position.set(0, yTop + 0.3, 0.05);
  root.add(yHead);
  for (let x = 1; x <= 13; x++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), axisMat);
    t.position.set(x, 0.05, 0.05);
    root.add(t);
    if (labels) {
      const l = makeLabel(String(x), { size: 0.5, bg: 'rgba(40,44,60,0.85)', fg: '#ffffff', radius: 0.3 });
      l.position.set(x, 0.3, 1.3);
      root.add(l);
    }
  }
  for (let y = 1; y <= Math.floor(yTop); y++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.05), axisMat);
    t.position.set(0, y, 0.05);
    root.add(t);
    if (labels) {
      const l = makeLabel(String(y), { size: 0.48, bg: 'rgba(40,44,60,0.85)', fg: '#ffffff', radius: 0.3 });
      l.position.set(-0.55, y, 0.3);
      root.add(l);
    }
  }
  if (labels) {
    const zero = makeLabel('0', { size: 0.5, bg: 'rgba(40,44,60,0.85)', fg: '#ffffff', radius: 0.3 });
    zero.position.set(0, 0.3, 1.3);
    root.add(zero);
  }
  const xl = makeLabel('x (מ׳)', { size: 0.42, fg: '#ffffff', bg: 'rgba(40,44,60,0.55)' });
  xl.position.set(xEnd + 0.9, 0.3, 0.1);
  const yl = makeLabel('y (מ׳)', { size: 0.42, fg: '#ffffff', bg: 'rgba(40,44,60,0.55)' });
  yl.position.set(0, yTop + 0.9, 0.1);
  root.add(xl, yl);

  // Faint metre grid on the sand.
  const gridPts: number[] = [];
  for (let x = -2; x <= 14; x++) gridPts.push(x, 0.012, -5, x, 0.012, 3);
  for (let z = -5; z <= 3; z++) gridPts.push(-2, 0.012, z, 14, 0.012, z);
  const grid = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(gridPts, 3)), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22 }));
  root.add(grid);

  // ---- Lagoon for the raft level.
  let water: THREE.Mesh | null = null;
  if (level.field.water) {
    const [a, b] = level.field.water[0];
    water = new THREE.Mesh(new THREE.PlaneGeometry(b - a + 6, 14), new THREE.MeshToonMaterial({ color: '#2bb3c0', transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set((a + b) / 2 - 3, 0.03, -2);
    water.receiveShadow = true;
    root.add(water);
  }

  // ---- Launcher rig: ground pad, lifeguard platform or raft.
  const launcherRig = new THREE.Group();
  root.add(launcherRig);
  if (lh > 0) {
    // A lifeguard-tower platform at exactly the launcher height.
    const deck = box(2.0, 0.18, 1.8, '#c98b52');
    deck.position.set(lx - 0.9, lh - 0.09, -0.3);
    launcherRig.add(deck);
    for (const [dx, dz] of [[-1.9, -1.4], [0.1, -1.4], [-1.9, 0.6], [0.1, 0.6]]) {
      const leg = box(0.16, lh - 0.2, 0.16, '#e84a4a');
      leg.position.set(lx + dx + 0.1, (lh - 0.2) / 2, dz + 0.2);
      launcherRig.add(leg);
    }
    const rail = box(2.2, 0.08, 0.08, '#e84a4a');
    rail.position.set(lx - 0.9, lh + 0.9, -1.45);
    launcherRig.add(rail);
    const ladder = box(0.5, lh, 0.08, '#e84a4a');
    ladder.position.set(lx - 2.3, lh / 2, 0.4);
    ladder.rotation.z = 0.25;
    launcherRig.add(ladder);
  }
  if (level.drift) {
    const raft = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.4, 8), toon(i % 2 ? '#a8723f' : '#b9824a'));
      log.rotation.x = Math.PI / 2;
      log.position.set(lx - 1.8 + i * 0.36, -0.05, -0.2);
      log.castShadow = true;
      raft.add(log);
    }
    launcherRig.add(raft);
  }
  const launchAnchor = new THREE.Vector3(lx, lh, 0);

  // ---- Obstacles and targets.
  // Walls and nets turn about the vertical line x = X, so they cross the shot plane exactly there
  // while showing their face to the side camera.
  const TURN = 0.9;
  const turned = (x: number, y: number, z: number) => new THREE.Vector3(x + Math.sin(TURN) * z, y, Math.cos(TURN) * z);

  const addCardboardWall = (x: number, H: number, id: string) => {
    const g = new THREE.Group();
    const rows = Math.max(1, Math.round(H / 1.2));
    const rowH = H / rows;
    for (let r = 0; r < rows; r++) {
      for (const zc of [-1.5, -0.5, 0.5, 1.5]) {
        const panel = box(0.12, rowH - 0.01, 0.98, (r + Math.round(zc + 2)) % 2 ? '#d1a56c' : CARDBOARD);
        panel.position.copy(turned(x, rowH * r + rowH / 2, zc));
        panel.rotation.y = TURN;
        root.add(panel);
        physics.addBox(panel, new THREE.Vector3(0.06, (rowH - 0.01) / 2, 0.49), 0.25);
      }
    }
    // Tape strip on top makes the exact top edge easy to read.
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    tape.position.set(x, H - 0.03, 0);
    tape.rotation.y = TURN;
    g.add(tape);
    const sign = makeLabel(`חומה ${H} מ׳`, { size: 0.5, bg: '#fff6e0', border: '#6b4a2e', rtl: true, depthTest: false });
    sign.position.set(x - 0.7, H * 0.55, 1.2);
    g.add(sign);
    const arr = arrow(new THREE.Vector3(x - 0.25, 0.05, 0.25), new THREE.Vector3(x - 0.25, H, 0.25), '#ffd23d');
    g.add(arr);
    g.name = id;
    root.add(g);
  };

  const addNet = (x: number, y: number) => {
    const g = new THREE.Group();
    const poleMat = toon('#ffd23d');
    for (const z of [-2.6, 2.6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, y + 2.8, 8), poleMat);
      pole.position.copy(turned(x, (y + 2.8) / 2, z));
      pole.castShadow = true;
      g.add(pole);
    }
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const cg = c.getContext('2d')!;
    cg.strokeStyle = '#ffffff';
    cg.lineWidth = 3;
    for (let i = 0; i <= 256; i += 16) { cg.beginPath(); cg.moveTo(i, 0); cg.lineTo(i, 128); cg.stroke(); }
    for (let j = 0; j <= 128; j += 16) { cg.beginPath(); cg.moveTo(0, j); cg.lineTo(256, j); cg.stroke(); }
    cg.fillStyle = '#ffffff';
    cg.fillRect(0, 0, 256, 10);
    cg.fillRect(0, 118, 256, 10);
    const tex = new THREE.CanvasTexture(c);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2.5), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, alphaTest: 0.1 }));
    net.rotation.y = Math.PI / 2 + TURN;
    net.position.set(x, y + 1.25, 0);
    net.name = 'net-mesh';
    g.add(net);
    const sign = makeLabel(`רשת מגובה ${y} מ׳`, { size: 0.45, bg: '#fff6e0', border: '#6b4a2e', rtl: true, depthTest: false });
    sign.position.set(x + 1.7, y + 0.2, 0.6);
    g.add(sign);
    const arr = arrow(new THREE.Vector3(x + 0.3, 0.05, 0.3), new THREE.Vector3(x + 0.3, y, 0.3), '#ffd23d');
    g.add(arr);
    root.add(g);
  };

  const addBranch = (x: number, y: number) => {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, y + 2, 9), toon('#c9b8a3'));
    trunk.position.set(x - 0.4, (y + 2) / 2, -3.2);
    trunk.castShadow = true;
    g.add(trunk);
    const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 5.4, 8), toon('#bfae98'));
    limb.rotation.x = Math.PI / 2;
    limb.position.set(x, y + 0.24, -0.6);
    limb.castShadow = true;
    g.add(limb);
    const leafMat = toon('#6b9a5c');
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + (i % 3) * 0.3, 0), leafMat);
      leaf.position.set(x + Math.sin(i * 2.1) * 0.7, y + 1.0 + (i % 3) * 0.6, -2.6 + i * 0.75);
      leaf.scale.y = 0.7;
      leaf.castShadow = true;
      g.add(leaf);
    }
    const sign = makeLabel(`ענף בגובה ${y} מ׳`, { size: 0.42, bg: '#fff6e0', border: '#6b4a2e', rtl: true });
    sign.position.set(x + 1.6, y - 0.5, 0.8);
    g.add(sign);
    root.add(g);
  };

  const addBuoy = (x: number, H: number) => {
    const g = new THREE.Group();
    const n = Math.round(H / 0.5);
    for (let i = 0; i < n; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.18, 10, 20), toon(i % 2 ? '#ffffff' : '#ff5d3d'));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, 0.25 + i * (H - 0.25) / Math.max(1, n - 1) - (i === n - 1 ? 0.18 : 0), 0);
      ring.castShadow = true;
      g.add(ring);
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, H, 6), toon('#ffffff'));
    pole.position.set(x, H / 2, 0);
    g.add(pole);
    const sign = makeLabel(`מצוף ${H} מ׳`, { size: 0.4, bg: '#fff6e0', border: '#6b4a2e', rtl: true });
    sign.position.set(x, H + 0.45, 0.4);
    g.add(sign);
    root.add(g);
  };

  const addBunting = (x1: number, x2: number, y: number) => {
    const g = new THREE.Group();
    const ropeY = y + 0.2;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, x2 - x1, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    rope.rotation.z = Math.PI / 2;
    rope.position.set((x1 + x2) / 2, ropeY, 0);
    g.add(rope);
    const cols = ['#ff3d8b', '#ffd23d', '#3dd6ff', '#7ee07e', '#ff8a3d'];
    for (let x = x1 + 0.1, i = 0; x < x2; x += 0.32, i++) {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.2, 3), new THREE.MeshBasicMaterial({ color: cols[i % cols.length] }));
      tri.rotation.z = Math.PI;
      tri.position.set(x, ropeY - 0.1, 0);
      g.add(tri);
    }
    for (const x of [x1, x2]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, ropeY + 0.3, 6), toon('#ffffff'));
      pole.position.set(x, (ropeY + 0.3) / 2, -1.4);
      g.add(pole);
      const tie = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      tie.rotation.x = Math.PI / 2;
      tie.position.set(x, ropeY, -0.7);
      g.add(tie);
    }
    const sign = makeLabel(`דגלונים בגובה ${y} מ׳`, { size: 0.38, bg: '#fff6e0', border: '#6b4a2e', rtl: true });
    sign.position.set((x1 + x2) / 2, ropeY + 0.45, 0.2);
    g.add(sign);
    root.add(g);
  };

  const addTarget = (o: Extract<Obstacle, { kind: 'target' }>) => {
    const cx = (o.x1 + o.x2) / 2;
    const w = o.x2 - o.x1;
    const h = o.y2 - o.y1;
    const g = new THREE.Group();
    if (o.look === 'crate' || o.look === 'fort') {
      const crate = box(w, h, 0.9, WOOD);
      crate.position.set(cx, h / 2, 0);
      g.add(crate);
      const slats = box(w + 0.02, 0.08, 0.92, '#8f5f33');
      slats.position.set(cx, h - 0.1, 0);
      g.add(slats);
      const eye = bullseye();
      eye.position.set(cx, h / 2, 0.46);
      g.add(eye);
      if (o.look === 'fort') {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), toon('#ffffff'));
        pole.position.set(cx + 0.25, h + 0.6, 0);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshBasicMaterial({ color: '#3dd6c4', side: THREE.DoubleSide }));
        flag.position.set(cx + 0.55, h + 1.0, 0);
        flag.name = 'flag';
        g.add(pole, flag);
      }
    } else if (o.look === 'pool') {
      const pool = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2, h, 20, 1, true), toon('#3dd6ff', { side: THREE.DoubleSide }));
      pool.position.set(cx, h / 2, 0);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(w / 2, 0.09, 8, 24), toon('#ff8ad1'));
      rim.rotation.x = Math.PI / 2;
      rim.position.set(cx, h, 0);
      const water = new THREE.Mesh(new THREE.CircleGeometry(w / 2 - 0.02, 20), toon('#8fe9ff'));
      water.rotation.x = -Math.PI / 2;
      water.position.set(cx, h * 0.75, 0);
      g.add(pool, rim, water);
      pool.castShadow = true;
    } else if (o.look === 'ring') {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(w / 2 - 0.12, 0.13, 10, 24), toon('#ff5d3d'));
      ring.rotation.x = Math.PI / 2;
      ring.position.set(cx, 0.15, 0);
      ring.castShadow = true;
      const stripes = new THREE.Mesh(new THREE.TorusGeometry(w / 2 - 0.12, 0.135, 10, 8, Math.PI / 4), toon('#ffffff'));
      stripes.rotation.x = Math.PI / 2;
      stripes.position.copy(ring.position);
      g.add(ring, stripes);
    }
    // The target's own spot on the x-axis.
    const mark = makeLabel(`x = ${cx}`, { size: 0.38, bg: '#ff3d8b', fg: '#ffffff' });
    mark.position.set(cx, 0.3, 2.1);
    if (labels) g.add(mark);
    g.name = o.id;
    root.add(g);
    targets.set(o.id, g);
  };

  const addRing = (o: Extract<Obstacle, { kind: 'ring' }>) => {
    const g = new THREE.Group();
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, yTop + 2 - o.y, 4), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    string.position.set(o.x, (yTop + 2 + o.y) / 2 + 0.3, 0);
    g.add(string);
    const body = new THREE.Group();
    if (o.look === 'pinata') {
      const cols = ['#ff3d8b', '#ffd23d', '#3dd6ff', '#7ee07e', '#ff8a3d'];
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), toon('#ffd23d'));
      body.add(core);
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.45, 8), toon(cols[i]));
        const a = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0);
        spike.rotation.z = a - Math.PI / 2;
        body.add(spike);
      }
    } else {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.42, 12), new THREE.MeshToonMaterial({ color: '#ff9a3d', emissive: '#552200', gradientMap: undefined }));
      const capT = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.1, 12), toon('#7a3b1c'));
      capT.position.y = 0.26;
      const capB = capT.clone();
      capB.rotation.z = Math.PI;
      capB.position.y = -0.26;
      body.add(lamp, capT, capB);
      body.userData.lamp = lamp;
    }
    body.position.set(o.x, o.y, 0);
    body.traverse((n) => ((n as THREE.Mesh).castShadow = true));
    g.add(body);
    g.userData.body = body;
    // A dashed ring shows the swipe window.
    const halo = new THREE.Mesh(new THREE.TorusGeometry(o.r + 0.12, 0.025, 6, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }));
    halo.position.set(o.x, o.y, 0.05);
    g.add(halo);
    const tag = makeLabel(`(${o.x}, ${o.y})`, { size: 0.36, bg: 'rgba(40,44,60,0.8)', fg: '#ffffff' });
    tag.position.set(o.x + 0.9, o.y + 0.45, 0.2);
    if (labels) g.add(tag);
    root.add(g);
    rings.set(o.id, g);
  };

  for (const o of level.field.obstacles) {
    if (o.kind === 'post') {
      if (o.look === 'wall') addCardboardWall(o.x, o.yHigh, o.id);
      else if (o.look === 'net') addNet(o.x, o.yLow);
      else if (o.look === 'branch') addBranch(o.x, o.yLow);
      else if (o.look === 'barrier') addBuoy(o.x, o.yHigh);
    } else if (o.kind === 'ceiling') addBunting(o.x1, o.x2, o.y);
    else if (o.kind === 'target') addTarget(o);
    else if (o.kind === 'ring') addRing(o);
  }

  // ---- The rival fort behind the main target: cardboard blocks and pillows that fly apart.
  const main = level.field.obstacles.find((o) => o.kind === 'target');
  const fortX = main && main.kind === 'target' ? (main.x1 + main.x2) / 2 : 10;
  if (level.goal.kind === 'soak') {
    const pillowCols = ['#ffffff', '#ffd23d', '#8fb8ff', '#ff9ac8'];
    let i = 0;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4 - row; col++) {
        const b = box(0.7, 0.6, 0.7, (row + col) % 2 ? '#d1a56c' : CARDBOARD);
        b.position.set(fortX - 1.1 + col * 0.74 + row * 0.37, 0.3 + row * 0.61, -1.7);
        root.add(b);
        physics.addBox(b, new THREE.Vector3(0.35, 0.3, 0.35), 0.2);
      }
    }
    for (const [dx, dz] of [[-1.6, -0.9], [1.3, -1.0], [0.4, -2.6]]) {
      const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), toon(pillowCols[i++ % pillowCols.length]));
      pillow.scale.set(1.2, 0.5, 0.9);
      pillow.position.set(fortX + dx, 0.22, dz);
      pillow.castShadow = true;
      root.add(pillow);
      physics.addBox(pillow, new THREE.Vector3(0.45, 0.2, 0.35), 0.1);
    }
  }

  return { root, rings, targets, launchAnchor, launcherRig, rivalSpot: new THREE.Vector3(fortX + 1.5, 0, -0.9), water, time: 0 };
}
