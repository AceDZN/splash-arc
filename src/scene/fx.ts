// Splash particles, wet spots on the sand, confetti and pop-up words.
import * as THREE from 'three';
import { makeLabel, disposeObject } from './labels';

interface Drop { p: THREE.Vector3; v: THREE.Vector3; life: number; max: number; s: number; color: THREE.Color }
interface Pop { obj: THREE.Object3D; life: number; max: number; rise: number; base: number }
interface Spot { mesh: THREE.Mesh; life: number }

const MAX = 600;

export class Fx {
  group = new THREE.Group();
  private drops: Drop[] = [];
  private mesh: THREE.InstancedMesh;
  private pops: Pop[] = [];
  private spots: Spot[] = [];
  private tmp = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  reducedMotion = false;

  constructor() {
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 });
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.07, 0), mat, MAX);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.group.add(this.mesh);
  }

  splash(at: THREE.Vector3, color: string, n = 90, power = 1): void {
    const c1 = new THREE.Color(color);
    const c2 = new THREE.Color('#bfefff');
    const count = this.reducedMotion ? Math.round(n * 0.4) : n;
    for (let i = 0; i < count && this.drops.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 0.4 + Math.random() * 0.9;
      const sp = (2 + Math.random() * 5) * power;
      this.drops.push({
        p: at.clone(),
        v: new THREE.Vector3(Math.cos(a) * sp * 0.7, up * sp, Math.sin(a) * sp * 0.5),
        life: 0,
        max: 0.6 + Math.random() * 0.7,
        s: 0.6 + Math.random() * 1.4,
        color: Math.random() < 0.6 ? c1 : c2,
      });
    }
  }

  confetti(at: THREE.Vector3): void {
    const cols = ['#ff3d8b', '#ffd23d', '#3dd6ff', '#7ee07e', '#ff8a3d'];
    for (let i = 0; i < 70 && this.drops.length < MAX; i++) {
      const a = Math.random() * Math.PI * 2;
      this.drops.push({
        p: at.clone(),
        v: new THREE.Vector3(Math.cos(a) * 3, 2 + Math.random() * 4, Math.sin(a) * 2),
        life: 0, max: 1.2 + Math.random(), s: 0.8, color: new THREE.Color(cols[i % cols.length]),
      });
    }
  }

  wetSpot(at: THREE.Vector3, r = 0.9, color = '#3b82a8'): void {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(at.x, 0.015, at.z);
    this.group.add(m);
    this.spots.push({ mesh: m, life: 6 });
  }

  /** A splat stuck to a vertical surface. */
  wallSplat(at: THREE.Vector3, color: string): void {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.45, 10), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }));
    const pos = m.geometry.attributes.position;
    for (let i = 1; i < pos.count; i++) {
      const k = 0.7 + Math.random() * 0.6;
      pos.setXY(i, pos.getX(i) * k, pos.getY(i) * k);
    }
    m.rotation.y = -Math.PI / 2;
    m.position.copy(at).add(new THREE.Vector3(-0.08, 0, 0));
    this.group.add(m);
    this.spots.push({ mesh: m, life: 4 });
  }

  pop(text: string, at: THREE.Vector3, opts: { bg: string; fg?: string; size?: number; rtl?: boolean }): void {
    const s = makeLabel(text, { size: opts.size ?? 0.8, bg: opts.bg, fg: opts.fg ?? '#ffffff', border: '#ffffff', rtl: opts.rtl, depthTest: false });
    s.position.copy(at);
    s.userData.base = s.scale.clone();
    this.group.add(s);
    this.pops.push({ obj: s, life: 0, max: 1.8, rise: this.reducedMotion ? 0.2 : 1.2, base: at.y });
  }

  clear(): void {
    this.drops = [];
    for (const p of this.pops) { this.group.remove(p.obj); disposeObject(p.obj); }
    for (const s of this.spots) { this.group.remove(s.mesh); disposeObject(s.mesh); }
    this.pops = [];
    this.spots = [];
  }

  update(dt: number): void {
    let n = 0;
    this.drops = this.drops.filter((d) => (d.life += dt) < d.max);
    for (const d of this.drops) {
      d.v.y -= 9.8 * dt;
      d.p.addScaledVector(d.v, dt);
      if (d.p.y < 0.03) { d.p.y = 0.03; d.v.multiplyScalar(0.3); d.v.y = Math.abs(d.v.y) * 0.2; }
      const s = d.s * (1 - d.life / d.max);
      this.tmp.compose(d.p, this.q, new THREE.Vector3(s, s, s));
      this.mesh.setMatrixAt(n, this.tmp);
      this.mesh.setColorAt(n, d.color);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    this.pops = this.pops.filter((p) => {
      p.life += dt;
      const t = p.life / p.max;
      const pop = t < 0.15 ? t / 0.15 : 1;
      p.obj.position.y = p.base + p.rise * t;
      const sprite = p.obj as THREE.Sprite;
      sprite.material.opacity = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
      p.obj.scale.copy(p.obj.userData.base).multiplyScalar(0.6 + 0.4 * pop);
      if (t >= 1) { this.group.remove(p.obj); disposeObject(p.obj); return false; }
      return true;
    });

    this.spots = this.spots.filter((s) => {
      s.life -= dt;
      const m = s.mesh.material as THREE.MeshBasicMaterial;
      if (s.life < 1) m.opacity = Math.max(0, s.life) * 0.45;
      if (s.life <= 0) { this.group.remove(s.mesh); disposeObject(s.mesh); return false; }
      return true;
    });
  }
}
