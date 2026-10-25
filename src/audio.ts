// Small synthesized sound kit (no audio files). Starts after the first user gesture.
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.55;
  }

  private noise(dur: number): AudioBufferSourceNode | null {
    if (!this.ctx) return null;
    const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, freq: number, vol: number, q = 1, slideTo?: number): void {
    if (!this.ctx || !this.master) return;
    const src = this.noise(dur);
    if (!src) return;
    const t = this.ctx.currentTime;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  tick(pitch = 1): void { this.tone(900 * pitch, 0.04, 'triangle', 0.08); }
  stretch(): void { this.tone(140, 0.25, 'sawtooth', 0.05, 320); }
  whoosh(): void { this.burst(0.7, 500, 0.5, 0.8, 2400); this.tone(420, 0.18, 'triangle', 0.12, 160); }
  splash(big = true): void {
    this.burst(big ? 0.75 : 0.45, 1400, 0.9, 0.7, 300);
    this.tone(110, 0.3, 'sine', 0.5, 50);
  }
  splat(): void { this.burst(0.35, 700, 0.9, 1.2, 200); this.tone(180, 0.2, 'square', 0.12, 70); }
  boing(): void { this.tone(220, 0.5, 'sine', 0.3, 520); this.tone(330, 0.4, 'triangle', 0.1, 120, 0.05); }
  pop(): void { this.tone(1400, 0.08, 'square', 0.2, 300); this.burst(0.15, 3000, 0.4, 2); }
  ding(): void { this.tone(1320, 0.5, 'sine', 0.22); this.tone(1980, 0.4, 'sine', 0.08, undefined, 0.02); }
  thud(): void { this.tone(90, 0.25, 'sine', 0.4, 45); this.burst(0.15, 300, 0.4, 1); }
  space(): void { this.tone(300, 1.2, 'sine', 0.2, 1800); this.tone(600, 1.0, 'triangle', 0.06, 2600, 0.1); }
  fanfare(): void { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.2, undefined, i * 0.11)); }
  sad(): void { [392, 330, 262].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.14, undefined, i * 0.16)); }
  catchIt(): void { this.tone(660, 0.12, 'square', 0.12); this.tone(990, 0.2, 'square', 0.12, undefined, 0.1); this.burst(0.3, 900, 0.5, 1); }
  laugh(): void { [520, 470, 520, 470].forEach((f, i) => this.tone(f, 0.09, 'square', 0.06, f * 0.9, i * 0.1)); }
}
