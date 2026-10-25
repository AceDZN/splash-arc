// Text sprites drawn on canvases. Hebrew uses an RTL canvas; numbers and formulas stay LTR.
import * as THREE from 'three';

export interface LabelOpts {
  size?: number; // world height in metres
  bg?: string;
  fg?: string;
  border?: string;
  rtl?: boolean;
  bold?: boolean;
  padding?: number;
  radius?: number;
  depthTest?: boolean;
}

const FONT = '"Rubik", "Heebo", system-ui, sans-serif';

export function makeLabel(text: string, opts: LabelOpts = {}): THREE.Sprite {
  const size = opts.size ?? 0.45;
  const px = 64;
  const pad = (opts.padding ?? 0.35) * px;
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const font = `${opts.bold === false ? 500 : 700} ${px}px ${FONT}`;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width + pad * 2);
  const h = Math.ceil(px * 1.35 + pad);
  c.width = w;
  c.height = h;
  g.font = font;
  g.direction = opts.rtl ? 'rtl' : 'ltr';
  if (opts.bg) {
    const r = (opts.radius ?? 0.35) * h;
    g.fillStyle = opts.bg;
    g.beginPath();
    g.roundRect(2, 2, w - 4, h - 4, r);
    g.fill();
    if (opts.border) {
      g.lineWidth = 5;
      g.strokeStyle = opts.border;
      g.stroke();
    }
  }
  g.fillStyle = opts.fg ?? '#1d2433';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + px * 0.05);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: opts.depthTest ?? true, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set((size * w) / h, size, 1);
  s.renderOrder = 10;
  return s;
}

export function disposeObject(o: THREE.Object3D): void {
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    for (const mat of mats) {
      for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
      mat.dispose();
    }
  });
}
