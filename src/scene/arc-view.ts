// The live arc: dotted preview, the draggable vertex handle, axis of symmetry, zero marker,
// the k height bar, the flown trail and the balloon itself. All positions come from the pure arc.
import * as THREE from 'three';
import { type Arc, fmt, landingX, yAt } from '../math/arc';
import type { Help } from '../game/levels';
import { makeLabel, disposeObject } from './labels';

const MAGENTA = '#ff3d8b';
const CYAN = '#3dd6ff';
const YELLOW = '#ffd23d';
const TEAL = '#2ec4b6';
const MAX_DOTS = 160;

export class ArcView {
  group = new THREE.Group();
  handle: THREE.Group;
  /** Generous invisible sphere for touch picking. */
  pick: THREE.Mesh;
  private dots: THREE.InstancedMesh;
  private axis: THREE.Mesh;
  private kBar: THREE.Mesh;
  private landRing: THREE.Mesh;
  private landLabel: THREE.Sprite | null = null;
  private landText = '';
  private kLabel: THREE.Sprite | null = null;
  private kText = '';
  private trail: THREE.Mesh | null = null;
  private rivalTrail: THREE.Mesh | null = null;
  ball: THREE.Group;
  private ballCore: THREE.Mesh;
  private ghostRaft: THREE.Mesh;
  private time = 0;
  private lastBall = new THREE.Vector3();

  constructor() {
    const dotGeo = new THREE.SphereGeometry(0.075, 8, 6);
    this.dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: MAGENTA }), MAX_DOTS);
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.group.add(this.dots);

    this.handle = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), new THREE.MeshStandardMaterial({ color: MAGENTA, emissive: MAGENTA, emissiveIntensity: 0.8, roughness: 0.3 }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 14), new THREE.MeshBasicMaterial({ color: '#ff9ac8', transparent: true, opacity: 0.35, depthWrite: false }));
    glow.name = 'glow';
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    ring.name = 'ring';
    this.handle.add(core, glow, ring);
    for (const dir of [1, -1]) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      a.position.y = dir * 0.85;
      if (dir < 0) a.rotation.z = Math.PI;
      this.handle.add(a);
    }
    for (const dir of [1, -1]) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      a.position.x = dir * 0.85;
      a.rotation.z = -dir * Math.PI / 2;
      this.handle.add(a);
    }
    this.group.add(this.handle);
    this.pick = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    this.handle.add(this.pick);

    this.axis = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1, 0.05), new THREE.MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.85 }));
    this.group.add(this.axis);
    this.kBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), new THREE.MeshBasicMaterial({ color: YELLOW }));
    this.group.add(this.kBar);
    this.landRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: MAGENTA }));
    this.landRing.rotation.x = Math.PI / 2;
    this.group.add(this.landRing);

    this.ball = new THREE.Group();
    this.ballCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), new THREE.MeshStandardMaterial({ color: MAGENTA, roughness: 0.25, metalness: 0.0, emissive: '#5a0024' }));
    this.ballCore.castShadow = true;
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 6), new THREE.MeshStandardMaterial({ color: MAGENTA }));
    knot.position.x = -0.24;
    knot.rotation.z = Math.PI / 2;
    this.ballCore.add(knot);
    this.ball.add(this.ballCore);
    this.group.add(this.ball);

    this.ghostRaft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 2.4), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false }));
    this.ghostRaft.visible = false;
    this.group.add(this.ghostRaft);
  }

  setBallColor(rival: boolean): void {
    const m = this.ballCore.material as THREE.MeshStandardMaterial;
    m.color.set(rival ? CYAN : MAGENTA);
    m.emissive.set(rival ? '#003a4a' : '#5a0024');
  }

  /** Show the aiming aids for this vertex. `visible` false hides everything but the ball. */
  updateAim(arc: Arc, help: Help, visible: boolean, drift = 0): void {
    const show = visible;
    this.handle.visible = show;
    this.handle.position.set(arc.p, arc.k, 0);
    this.axis.visible = show && help.axis;
    this.axis.scale.y = Math.max(0.01, arc.k + 0.6);
    this.axis.position.set(arc.p, (arc.k + 0.6) / 2, 0.02);
    this.kBar.visible = show && help.gridLabels;
    this.kBar.scale.y = Math.max(0.01, arc.k);
    this.kBar.position.set(arc.p + 0.18, arc.k / 2, 0.08);
    const land = landingX(arc);
    this.landRing.visible = show && help.landing && land !== null;
    if (land !== null) this.landRing.position.set(land, 0.06, 0);
    this.ghostRaft.visible = show && drift !== 0;
    this.ghostRaft.position.set(arc.x0 + drift - 0.9, 0.02, -0.2);

    const landTxt = help.landing && land !== null && show ? `נחיתה x = ${fmt(land)}` : '';
    if (landTxt !== this.landText) {
      this.landText = landTxt;
      if (this.landLabel) { this.group.remove(this.landLabel); disposeObject(this.landLabel); this.landLabel = null; }
      if (landTxt) {
        this.landLabel = makeLabel(landTxt, { size: 0.38, bg: MAGENTA, fg: '#ffffff', rtl: false });
        this.group.add(this.landLabel);
      }
    }
    if (this.landLabel && land !== null) this.landLabel.position.set(land, 0.75, 0.6);

    const kTxt = show && help.gridLabels ? `${fmt(arc.k)} מ׳` : '';
    if (kTxt !== this.kText) {
      this.kText = kTxt;
      if (this.kLabel) { this.group.remove(this.kLabel); disposeObject(this.kLabel); this.kLabel = null; }
      if (kTxt) {
        this.kLabel = makeLabel(kTxt, { size: 0.36, bg: YELLOW, fg: '#3a2a00' });
        this.group.add(this.kLabel);
      }
    }
    if (this.kLabel) this.kLabel.position.set(arc.p + 0.75, arc.k / 2, 0.3);

    // Dotted preview.
    let xEnd = arc.x0;
    if (show) {
      if (help.preview === 'toVertex') xEnd = Math.max(arc.x0, arc.p);
      else if (help.preview === 'stub') xEnd = arc.x0 + 1.4;
    }
    const m = new THREE.Matrix4();
    let n = 0;
    const step = 0.28;
    for (let x = arc.x0 + step * 0.5; x <= xEnd && n < MAX_DOTS; x += step) {
      const y = yAt(arc, x);
      if (y < -0.05 || y > 40) break;
      const fade = help.preview === 'stub' ? 1 - (x - arc.x0) / 1.6 : 1;
      m.makeScale(fade, fade, fade).setPosition(x, y, 0);
      this.dots.setMatrixAt(n++, m);
    }
    this.dots.count = n;
    this.dots.instanceMatrix.needsUpdate = true;
  }

  private tube(points: { x: number; y: number }[], color: string, opacity: number): THREE.Mesh | null {
    if (points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p.x, p.y, 0)));
    const geo = new THREE.TubeGeometry(curve, Math.min(400, points.length * 2), 0.045, 6, false);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    this.group.add(mesh);
    return mesh;
  }

  /** The path the last balloon really flew stays on screen as feedback until the next shot. */
  setTrail(points: { x: number; y: number }[] | null): void {
    if (this.trail) { this.group.remove(this.trail); disposeObject(this.trail); this.trail = null; }
    if (points) this.trail = this.tube(points, '#ffffff', 0.55);
  }

  setRivalTrail(points: { x: number; y: number }[] | null): void {
    if (this.rivalTrail) { this.group.remove(this.rivalTrail); disposeObject(this.rivalTrail); this.rivalTrail = null; }
    if (points) this.rivalTrail = this.tube(points, CYAN, 0.75);
  }

  setBall(pos: { x: number; y: number } | null, rest?: THREE.Vector3): void {
    if (pos) {
      this.ball.visible = true;
      const p = new THREE.Vector3(pos.x, pos.y, 0);
      const v = p.clone().sub(this.lastBall);
      this.ball.position.copy(p);
      if (v.lengthSq() > 1e-6) {
        this.ball.rotation.z = Math.atan2(v.y, v.x);
        const s = Math.min(0.35, v.length() * 2.5);
        this.ballCore.scale.set(1 + s, 1 - s * 0.5, 1 - s * 0.5);
      }
      this.lastBall.copy(p);
    } else if (rest) {
      this.ball.visible = true;
      this.ball.position.set(rest.x, rest.y + 0.22, rest.z);
      this.ball.rotation.z = 0;
      this.ballCore.scale.setScalar(1 + Math.sin(this.time * 4) * 0.03);
      this.lastBall.copy(this.ball.position);
    } else {
      this.ball.visible = false;
    }
  }

  tick(dt: number, reducedMotion: boolean): void {
    this.time += dt;
    const pulse = reducedMotion ? 1 : 1 + Math.sin(this.time * 4.5) * 0.12;
    const glow = this.handle.getObjectByName('glow')!;
    glow.scale.setScalar(pulse);
    const ring = this.handle.getObjectByName('ring')!;
    ring.rotation.z += dt * 0.8;
    this.landRing.scale.setScalar(pulse);
  }
}
