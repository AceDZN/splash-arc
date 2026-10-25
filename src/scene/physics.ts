// Rapier physics for the cardboard forts, pillows and buckets. Purely the visual consequence:
// what the balloon hits is decided by the pure trace, never by these bodies.
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

interface Prop {
  body: RAPIER.RigidBody;
  mesh: THREE.Object3D;
  restPos: THREE.Vector3;
  restQuat: THREE.Quaternion;
}

export class Physics {
  private world: RAPIER.World | null = null;
  private props: Prop[] = [];
  private acc = 0;

  async init(): Promise<void> {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.8, z: 0 });
    const ground = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(6, -0.5, 0));
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(80, 0.5, 40).setFriction(0.9), ground);
  }

  get ready(): boolean {
    return this.world !== null;
  }

  /** A box-shaped prop whose mesh is centred on its body. */
  addBox(mesh: THREE.Object3D, half: THREE.Vector3, density = 0.4): void {
    if (!this.world) return;
    const p = mesh.position;
    const q = mesh.quaternion;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setLinearDamping(0.15).setAngularDamping(0.4).setCanSleep(true),
    );
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setDensity(density).setFriction(0.8).setRestitution(0.15), body);
    body.sleep();
    this.props.push({ body, mesh, restPos: p.clone(), restQuat: q.clone() });
  }

  addBall(mesh: THREE.Object3D, r: number, density = 0.2): void {
    if (!this.world) return;
    const p = mesh.position;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setLinearDamping(0.3).setAngularDamping(0.5));
    this.world.createCollider(RAPIER.ColliderDesc.ball(r).setDensity(density).setRestitution(0.5), body);
    body.sleep();
    this.props.push({ body, mesh, restPos: p.clone(), restQuat: mesh.quaternion.clone() });
  }

  /** Push everything near the impact outward and up. */
  blast(center: THREE.Vector3, radius: number, strength: number): void {
    for (const pr of this.props) {
      const t = pr.body.translation();
      const d = new THREE.Vector3(t.x - center.x, t.y - center.y, t.z - center.z);
      const dist = d.length();
      if (dist > radius) continue;
      const f = (1 - dist / radius) * strength * pr.body.mass();
      d.normalize();
      pr.body.wakeUp();
      pr.body.applyImpulse({ x: d.x * f + 0.4 * f, y: Math.abs(d.y) * f + 0.8 * f, z: d.z * f }, true);
      pr.body.applyTorqueImpulse({ x: (Math.random() - 0.5) * f * 0.3, y: (Math.random() - 0.5) * f * 0.3, z: -f * 0.2 }, true);
    }
  }

  /** A small wobble for a splat that only nudges a wall. */
  nudge(center: THREE.Vector3, radius: number, strength: number): void {
    for (const pr of this.props) {
      const t = pr.body.translation();
      if (Math.hypot(t.x - center.x, t.y - center.y) > radius) continue;
      pr.body.wakeUp();
      pr.body.applyImpulse({ x: strength * pr.body.mass(), y: 0, z: 0 }, true);
    }
  }

  /** Put every prop back where the level built it (exact heights for the next aim). */
  reset(): void {
    for (const pr of this.props) {
      pr.body.setTranslation(pr.restPos, true);
      pr.body.setRotation(pr.restQuat, true);
      pr.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      pr.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      pr.body.sleep();
      pr.mesh.position.copy(pr.restPos);
      pr.mesh.quaternion.copy(pr.restQuat);
    }
  }

  clear(): void {
    if (!this.world) return;
    for (const pr of this.props) this.world.removeRigidBody(pr.body);
    this.props = [];
  }

  step(dt: number): void {
    if (!this.world) return;
    this.acc += Math.min(dt, 0.1);
    const h = 1 / 60;
    while (this.acc >= h) {
      this.world.timestep = h;
      this.world.step();
      this.acc -= h;
    }
    for (const pr of this.props) {
      if (pr.body.isSleeping()) continue;
      const t = pr.body.translation();
      const r = pr.body.rotation();
      pr.mesh.position.set(t.x, t.y, t.z);
      pr.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }
}
