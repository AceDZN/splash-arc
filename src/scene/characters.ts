// Rigged Tripo campers (with a procedural stand-in until the GLB loads or if it is missing),
// plus the Tripo set pieces: slingshot, lifeguard tower and cabin.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { toon } from './stage';

export type Move = 'idle' | 'throw' | 'cheer' | 'soaked' | 'dodge' | 'run';

const KEYWORDS: Record<Move, string[]> = {
  idle: ['idle', 'stand', 'breath'],
  throw: ['throw', 'attack', 'cast', 'punch', 'shoot'],
  cheer: ['cheer', 'victory', 'celebrat', 'happy', 'dance', 'win', 'clap'],
  soaked: ['hit', 'react', 'hurt', 'damage', 'fall', 'stun', 'shake', 'soak'],
  dodge: ['dodge', 'jump', 'roll'],
  run: ['run', 'walk', 'jog'],
};
const LOOPING: Move[] = ['idle', 'run'];

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF | null>>();

export function loadModel(url: string): Promise<GLTF | null> {
  if (!cache.has(url)) {
    cache.set(url, loader.loadAsync(url).catch((e) => {
      console.info(`[splash-arc] model ${url} not available, using stand-in`, e?.message ?? e);
      return null;
    }));
  }
  return cache.get(url)!;
}

function fitHeight(obj: THREE.Object3D, height: number): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const s = height / Math.max(0.001, size.y);
  obj.scale.multiplyScalar(s);
  obj.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= b2.min.y;
  const c = b2.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
}

export class Camper {
  root = new THREE.Group();
  private inner = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<Move, THREE.AnimationAction>();
  private current: Move = 'idle';
  private current_action: THREE.AnimationAction | null = null;
  private standIn: THREE.Group;
  private time = Math.random() * 10;
  private moveTime = 0;
  /** True once the Tripo model is in the scene. */
  usingModel = false;
  wet = 0;

  constructor(private shirt: string, private hat: string, height = 1.55) {
    this.root.add(this.inner);
    this.standIn = this.makeStandIn(height);
    this.inner.add(this.standIn);
  }

  private makeStandIn(height: number): THREE.Group {
    const g = new THREE.Group();
    const s = height / 1.55;
    const skin = toon('#f1c49b');
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.12 * s, 0.45 * s, 4, 8), toon('#3b4a6b'));
    legs.position.y = 0.38 * s;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * s, 0.35 * s, 4, 10), toon(this.shirt));
    body.position.y = 0.9 * s;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 16, 12), skin);
    head.position.y = 1.33 * s;
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * s, 0.26 * s, 0.12 * s, 14), toon(this.hat));
    hat.position.y = 1.5 * s;
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06 * s, 0.38 * s, 4, 6), skin);
    armL.position.set(0, 0.95 * s, 0.28 * s);
    armL.name = 'armL';
    const armR = armL.clone();
    armR.position.z = -0.28 * s;
    armR.name = 'armR';
    for (const m of [legs, body, head, hat, armL, armR]) { m.castShadow = true; g.add(m); }
    return g;
  }

  async useModel(url: string, height: number, tint?: string): Promise<void> {
    const gltf = await loadModel(url);
    if (!gltf) return;
    const model = cloneSkinned(gltf.scene);
    model.traverse((n) => {
      const m = n as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = false;
        m.frustumCulled = false;
        if (tint && m.material) {
          const mat = (m.material as THREE.MeshStandardMaterial).clone();
          mat.color = new THREE.Color(tint).lerp(new THREE.Color('#ffffff'), 0.35);
          m.material = mat;
        }
      }
    });
    const holder = new THREE.Group();
    holder.add(model);
    fitHeight(holder, height);
    this.inner.remove(this.standIn);
    this.inner.add(holder);
    this.usingModel = true;
    if (gltf.animations.length) {
      this.mixer = new THREE.AnimationMixer(model);
      for (const move of Object.keys(KEYWORDS) as Move[]) {
        const clip = gltf.animations.find((c) => KEYWORDS[move].some((k) => c.name.toLowerCase().includes(k)));
        if (clip) {
          const a = this.mixer.clipAction(clip);
          if (!LOOPING.includes(move)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
          this.actions.set(move, a);
        }
      }
      if (!this.actions.has('idle')) this.actions.set('idle', this.mixer.clipAction(gltf.animations[0]));
      this.mixer.addEventListener('finished', () => this.play('idle'));
      this.play(this.current, true);
    }
  }

  clipNames(): string[] {
    return [...this.actions.keys()];
  }

  play(move: Move, force = false): void {
    if (move === this.current && !force && move === 'idle') return;
    this.current = move;
    this.moveTime = 0;
    if (move === 'soaked') this.wet = 1;
    const a = this.actions.get(move) ?? (move !== 'idle' ? this.actions.get('cheer') : undefined) ?? this.actions.get('idle');
    if (!a || !this.mixer) return;
    a.reset().setEffectiveWeight(1).fadeIn(0.18).play();
    if (this.current_action && this.current_action !== a) this.current_action.fadeOut(0.18);
    this.current_action = a;
  }

  face(dirX: number, towardCamera = 0.55): void {
    // Tripo characters face +z; turn toward ±x but keep some of the face to the camera.
    this.inner.rotation.y = dirX > 0 ? Math.PI / 2 * (1 - towardCamera) : -Math.PI / 2 * (1 - towardCamera);
  }

  update(dt: number, reducedMotion: boolean): void {
    this.time += dt;
    this.moveTime += dt;
    this.wet = Math.max(0, this.wet - dt * 0.3);
    if (this.mixer) {
      this.mixer.update(dt);
      return;
    }
    // Stand-in animation.
    const g = this.standIn;
    const armL = g.getObjectByName('armL')!;
    const armR = g.getObjectByName('armR')!;
    const t = this.moveTime;
    g.position.y = 0;
    g.rotation.z = 0;
    armL.rotation.set(0, 0, 0);
    armR.rotation.set(0, 0, 0);
    const amp = reducedMotion ? 0.3 : 1;
    switch (this.current) {
      case 'idle': g.position.y = Math.abs(Math.sin(this.time * 2)) * 0.03 * amp; break;
      case 'throw': armR.rotation.z = Math.min(1, t * 4) * -2.6; if (t > 0.7) this.play('idle'); break;
      case 'cheer': g.position.y = Math.abs(Math.sin(t * 9)) * 0.25 * amp; armL.rotation.x = armR.rotation.x = 2.8; if (t > 1.6) this.play('idle'); break;
      case 'soaked': g.rotation.z = Math.sin(t * 30) * 0.12 * amp * Math.max(0, 1 - t); if (t > 1.4) this.play('idle'); break;
      case 'dodge': g.position.y = Math.sin(Math.min(1, t * 2) * Math.PI) * 0.6 * amp; if (t > 0.6) this.play('idle'); break;
      case 'run': g.position.y = Math.abs(Math.sin(t * 14)) * 0.08; armL.rotation.z = Math.sin(t * 14) * 0.8; armR.rotation.z = -armL.rotation.z; break;
    }
  }
}

/** Load a static Tripo set piece, scaled to a height; returns null if missing. */
export async function loadProp(url: string, height: number): Promise<THREE.Group | null> {
  const gltf = await loadModel(url);
  if (!gltf) return null;
  const holder = new THREE.Group();
  const model = gltf.scene.clone(true);
  model.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
  });
  holder.add(model);
  fitHeight(holder, height);
  const outer = new THREE.Group();
  outer.add(holder);
  return outer;
}
