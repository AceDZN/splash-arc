// Renderer, camera, lights, sky, beach and the summer-camp set dressing.
import * as THREE from 'three';

export type Theme = 'day' | 'sunset' | 'night';

let gradientMap: THREE.DataTexture | null = null;
function toonRamp(): THREE.DataTexture {
  if (gradientMap) return gradientMap;
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
  gradientMap = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  gradientMap.minFilter = gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

export function toon(color: THREE.ColorRepresentation, extra: Partial<THREE.MeshToonMaterialParameters> = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...extra });
}

function noiseTexture(base: string, spots: string[], size = 256, count = 1400): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < count; i++) {
    g.fillStyle = spots[i % spots.length];
    g.globalAlpha = 0.25 + rnd() * 0.35;
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, 0.6 + rnd() * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const THEMES: Record<Theme, { top: string; bottom: string; sun: string; sunI: number; hemiSky: string; hemiGround: string; hemiI: number; fog: string; sea: string }> = {
  day: { top: '#3fa9f5', bottom: '#cdeffd', sun: '#fff3d6', sunI: 2.6, hemiSky: '#bfe6ff', hemiGround: '#f2d7a0', hemiI: 1.35, fog: '#cdeffd', sea: '#21a7bf' },
  sunset: { top: '#5b6cc9', bottom: '#ffb36b', sun: '#ffc48a', sunI: 2.2, hemiSky: '#ffc9a0', hemiGround: '#d9a46a', hemiI: 1.15, fog: '#ffb990', sea: '#3a7fb0' },
  night: { top: '#2a1f5c', bottom: '#f07a8c', sun: '#ffb08a', sunI: 1.6, hemiSky: '#a99af0', hemiGround: '#8a6a5a', hemiI: 1.45, fog: '#5a3a6a', sea: '#2d3f7a' },
};

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;
  private sea: THREE.Mesh;
  private seaMat: THREE.ShaderMaterial;
  private stringLights: THREE.Group;
  private time = 0;
  /** World rectangle the camera keeps in view, in the shot plane. */
  view = { x0: -3.2, x1: 13.8, y0: -0.6, y1: 10.5 };
  private camPos = new THREE.Vector3();
  private basePos = new THREE.Vector3(NaN, NaN, NaN);
  private camLook = new THREE.Vector3();
  private shake = 0;
  reducedMotion = false;
  theme: Theme = 'day';

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(24, 16 / 9, 0.5, 700);

    this.hemi = new THREE.HemisphereLight('#bfe6ff', '#f2d7a0', 1.3);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3d6', 2.6);
    this.sun.position.set(-8, 18, 14);
    this.sun.target.position.set(6, 0, 0);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -10; sc.near = 1; sc.far = 60;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);

    // Sky dome with a vertical gradient.
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float t = smoothstep(-0.05, 0.55, vP.y); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), skyMat);
    this.scene.add(this.sky);

    // Sand.
    const sandTex = noiseTexture('#f2d7a0', ['#e2c084', '#fbe7bf', '#d9b27a']);
    sandTex.repeat.set(30, 30);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(160, 130), toon('#ffffff', { map: sandTex }));
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(6, 0, 20);
    sand.receiveShadow = true;
    this.scene.add(sand);

    // Sea with gentle animated bands.
    this.seaMat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, color: { value: new THREE.Color('#21a7bf') } },
      vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform float t; uniform vec3 color; varying vec3 vW;
        void main(){ float band = sin(vW.x*0.35 + t*0.9 + sin(vW.z*0.6)*1.5) * sin(vW.z*1.3 - t*0.7);
          float foam = smoothstep(0.82, 0.98, band);
          float depth = clamp((-vW.z - 22.0) / 80.0, 0.0, 1.0);
          vec3 c = mix(color*1.18, color*0.78, depth) + foam*0.35;
          gl_FragColor = vec4(c, 1.0); }`,
    });
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(500, 220), this.seaMat);
    this.sea.rotation.x = -Math.PI / 2;
    this.sea.position.set(6, 0.02, -132);
    this.scene.add(this.sea);

    this.stringLights = new THREE.Group();
    this.scene.add(this.stringLights);
    this.dressSet();
    this.setTheme('day');
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    const t = THEMES[theme];
    const sky = this.sky.material as THREE.ShaderMaterial;
    sky.uniforms.top.value.set(t.top);
    sky.uniforms.bottom.value.set(t.bottom);
    this.sun.color.set(t.sun);
    this.sun.intensity = t.sunI;
    this.sun.position.set(theme === 'day' ? -8 : -16, theme === 'day' ? 18 : 9, theme === 'day' ? 14 : -6);
    this.hemi.color.set(t.hemiSky);
    this.hemi.groundColor.set(t.hemiGround);
    this.hemi.intensity = t.hemiI;
    this.scene.fog = new THREE.Fog(t.fog, 70, 260);
    this.seaMat.uniforms.color.value.set(t.sea);
    this.stringLights.visible = theme !== 'day';
  }

  /** Eucalyptus trees, cabins, umbrella and a boat. Big set pieces from Tripo are added by the model loader. */
  private dressSet(): void {
    const trunkMat = toon('#c9b8a3');
    const leafMats = [toon('#7fae6a'), toon('#93bf78'), toon('#6b9a5c')];
    const tree = (x: number, z: number, s: number) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.32 * s, 6 * s, 7), trunkMat);
      trunk.position.y = 3 * s;
      trunk.rotation.z = 0.06;
      trunk.castShadow = true;
      g.add(trunk);
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry((1.2 + (i % 3) * 0.35) * s, 0), leafMats[i % 3]);
        const ang = (i / 7) * Math.PI * 2;
        leaf.position.set(Math.cos(ang) * 1.3 * s, (5.6 + (i % 2) * 0.9) * s, Math.sin(ang) * 1.0 * s);
        leaf.scale.y = 0.65;
        leaf.castShadow = true;
        g.add(leaf);
      }
      g.position.set(x, 0, z);
      this.scene.add(g);
    };
    tree(-11, -12, 1.5);
    tree(-6, -19, 1.3);
    tree(19, -12, 1.5);
    tree(23, -17, 1.2);
    tree(8, -19, 1.1);

    const cabinColors = ['#ff8a3d', '#3dd6c4', '#ffd23d', '#ff5d8f'];
    cabinColors.forEach((col, i) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 3), toon(col));
      body.position.y = 1.3;
      body.castShadow = body.receiveShadow = true;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.6, 4), toon('#b5523b'));
      roof.position.y = 3.4;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1.05, 1, 0.8);
      roof.castShadow = true;
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.05), toon('#6b4a2e'));
      door.position.set(0.6, 0.8, 1.52);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), toon('#bfe9ff', { emissive: '#000000' }));
      win.position.set(-0.9, 1.5, 1.52);
      win.name = 'window';
      g.add(body, roof, door, win);
      g.position.set(-12 + i * 5.2 + (i > 1 ? 18 : 0), 0, -18 - (i % 2) * 3);
      g.rotation.y = (i % 2 ? -0.2 : 0.15);
      this.scene.add(g);
    });

    // Beach umbrella.
    const umb = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), toon('#ffffff'));
    pole.position.y = 1.3;
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.6, 12, 1, true), [toon('#ff5d5d', { side: THREE.DoubleSide })][0]);
    top.position.y = 2.6;
    top.castShadow = true;
    umb.add(pole, top);
    umb.position.set(15.5, 0, -4);
    this.scene.add(umb);

    // A sailboat far out.
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), toon('#ffffff'));
    const sail = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 3), toon('#fff7e6'));
    sail.position.set(0, 2.3, 0);
    sail.scale.z = 0.15;
    boat.add(hull, sail);
    boat.position.set(4, 0.2, -70);
    boat.name = 'boat';
    this.scene.add(boat);

    // Beach ball.
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), toon('#ffffff', { vertexColors: false }));
    (ball.material as THREE.MeshToonMaterial).color.set('#ffe04d');
    ball.position.set(13.2, 0.35, -2.5);
    ball.castShadow = true;
    this.scene.add(ball);

    // String lights for sunset and night.
    const bulbMat = new THREE.MeshBasicMaterial({ color: '#ffd98a' });
    for (let i = 0; i < 26; i++) {
      const x = 7 + i * 0.4;
      const y = 4.2 - Math.sin((i / 25) * Math.PI) * 0.8;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), bulbMat);
      b.position.set(x, y, -3.2);
      this.stringLights.add(b);
    }
    const glow = new THREE.PointLight('#ffb35c', 6, 14, 1.6);
    glow.position.set(12, 3.5, -2);
    this.stringLights.add(glow);
  }

  setView(v: { x0: number; x1: number; y0: number; y1: number }, instant = false): void {
    this.view = v;
    this.computeCamera();
    if (instant) {
      this.basePos.copy(this.camPos);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
    }
  }

  private computeCamera(): void {
    const w = this.renderer.domElement.clientWidth || window.innerWidth;
    const h = this.renderer.domElement.clientHeight || window.innerHeight;
    const aspect = w > 0 && h > 0 ? w / h : 16 / 9;
    this.camera.aspect = aspect;
    const portrait = aspect < 1;
    // The HUD covers the top and bottom bands; keep the field in the middle.
    const short = !portrait && h < 520;
    const topFrac = portrait ? 0.4 : short ? 0.24 : 0.15;
    const botFrac = portrait ? 0.16 : short ? 0.2 : 0.18;
    const { x0, x1, y0, y1 } = this.view;
    const W = x1 - x0;
    const H = (y1 - y0) / (1 - topFrac - botFrac);
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const d = Math.max(H / 2 / tanV, W / 2 / (tanV * aspect)) * 0.98;
    const cx = (x0 + x1) / 2;
    const visibleH = 2 * d * tanV;
    const cy = (y0 + y1) / 2 + ((topFrac - botFrac) / 2) * visibleH;
    // Slight yaw (~8°) and pitch so walls and nets across the shot plane read as solid things.
    const yaw = THREE.MathUtils.degToRad(14);
    const pitch = THREE.MathUtils.degToRad(6);
    this.camLook.set(cx, cy, 0);
    this.camPos.set(cx - Math.sin(yaw) * d, cy + Math.sin(pitch) * d, Math.cos(yaw) * d);
    this.camera.updateProjectionMatrix();
  }

  resize(): void {
    const c = this.renderer.domElement;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    this.computeCamera();
  }

  addShake(amount: number): void {
    if (this.reducedMotion) return;
    this.shake = Math.min(1, this.shake + amount);
  }

  update(dt: number): void {
    this.time += dt;
    this.seaMat.uniforms.t.value = this.time;
    if (!Number.isFinite(this.basePos.x)) this.basePos.copy(this.camPos);
    this.basePos.lerp(this.camPos, 1 - Math.exp(-Math.max(0, dt) * 3));
    const sh = this.shake * this.shake * 0.35;
    this.shake = Math.max(0, this.shake - dt * 2.2);
    const off = new THREE.Vector3(Math.sin(this.time * 61) * sh, Math.cos(this.time * 47) * sh, 0);
    this.camera.position.copy(this.basePos).add(off);
    this.camera.lookAt(this.camLook.clone().addScaledVector(off, 0.5));
    const boat = this.scene.getObjectByName('boat');
    if (boat) boat.position.x = 4 + Math.sin(this.time * 0.05) * 20;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
