/* ─────────────────────────────────────────────
   audio.js — Web Audio 합성 총성·폭발·타격음
   ───────────────────────────────────────────── */
'use strict';

const Sfx = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  ready: false,
  _lastHit: 0,
  _lastShot: 0,
  _shotCount: 0,
  _shotWindow: 0,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 18;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.16;
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 1.0);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      this.ready = true;
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) { this.ready = false; }
  },

  setMuted(m) {
    this.muted = !!m;
    if (this.master) {
      try { this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02); } catch (e) {}
    }
  },

  _ok() { return this.ready && !this.muted && this.ctx && this.ctx.state === 'running'; },

  _noise(dur, freq, gain, type, q, delay, freqEnd) {
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + dur);
    f.Q.value = q || 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  },

  _tone(freq, dur, type, gain, slideTo, delay) {
    const c = this.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },

  shot(weapon) {
    if (!this._ok()) return;
    const now = this.ctx.currentTime;
    if (now - this._lastShot < 0.016) return;
    this._lastShot = now;
    try {
      switch (weapon) {
        case 'rifle':
          this._noise(0.10, 2400, 0.30, 'bandpass', 1.1, 0, 900);
          this._tone(150, 0.07, 'triangle', 0.12, 70);
          break;
        case 'shotgun':
          this._noise(0.26, 1100, 0.55, 'lowpass', 1.0, 0, 240);
          this._tone(85, 0.18, 'triangle', 0.22, 40);
          break;
        case 'minigun':
          this._noise(0.07, 3200, 0.20, 'bandpass', 1.4, 0, 1200);
          this._tone(120, 0.05, 'square', 0.06, 60);
          break;
        case 'sniper':
          this._noise(0.34, 3600, 0.55, 'bandpass', 0.9, 0, 500);
          this._tone(160, 0.22, 'sine', 0.26, 42);
          break;
        case 'rail':
          this._tone(1800, 0.16, 'sawtooth', 0.10, 240);
          this._noise(0.22, 5200, 0.30, 'highpass', 1.0, 0.02, 900);
          break;
        case 'flame':
          this._noise(0.14, 700, 0.18, 'lowpass', 0.7, 0, 300);
          break;
        case 'thump':
          this._tone(110, 0.16, 'sine', 0.32, 46);
          this._noise(0.16, 800, 0.24, 'lowpass', 0.9, 0, 200);
          break;
        case 'missile':
          this._noise(0.5, 900, 0.28, 'bandpass', 0.8, 0, 2400);
          this._tone(120, 0.35, 'sawtooth', 0.10, 300);
          break;
        default: // pistol
          this._noise(0.14, 2000, 0.34, 'bandpass', 1.2, 0, 700);
          this._tone(135, 0.10, 'triangle', 0.15, 60);
      }
    } catch (e) {}
  },

  explosion(power) {
    if (!this._ok()) return;
    const p = clamp(power || 1, 0.5, 2.2);
    try {
      this._noise(0.55 * p, 620, 0.42 * p, 'lowpass', 1.1, 0, 70);
      this._noise(0.16, 2400, 0.22 * p, 'highpass', 1.0, 0);
      this._tone(92, 0.5 * p, 'sine', 0.42 * p, 28);
    } catch (e) {}
  },

  impact() {
    if (!this._ok()) return;
    const now = this.ctx.currentTime;
    if (now - this._lastHit < 0.035) return;
    this._lastHit = now;
    try {
      this._noise(0.05, 2600, 0.10, 'bandpass', 2.0, 0, 1400);
    } catch (e) {}
  },

  kill(big) {
    if (!this._ok()) return;
    try {
      this._tone(big ? 90 : 170, big ? 0.4 : 0.16, 'triangle', big ? 0.32 : 0.12, big ? 30 : 70);
      this._noise(big ? 0.4 : 0.12, big ? 500 : 1200, big ? 0.3 : 0.1, 'lowpass', 0.9, 0, 120);
    } catch (e) {}
  },

  wallHit() {
    if (!this._ok()) return;
    try { this._tone(70, 0.24, 'sine', 0.18, 36); this._noise(0.16, 500, 0.14, 'lowpass', 0.8); } catch (e) {}
  },

  build() {
    if (!this._ok()) return;
    try {
      this._tone(520, 0.06, 'square', 0.07, 700);
      this._tone(780, 0.08, 'square', 0.06, 900, 0.07);
    } catch (e) {}
  },

  ui() {
    if (!this._ok()) return;
    try { this._tone(660, 0.045, 'square', 0.05, 880); } catch (e) {}
  },

  deny() {
    if (!this._ok()) return;
    try { this._tone(180, 0.16, 'square', 0.10, 90); } catch (e) {}
  },

  reload() {
    if (!this._ok()) return;
    try {
      this._tone(1200, 0.03, 'square', 0.05, 700);
      this._tone(900, 0.04, 'square', 0.045, 500, 0.14);
    } catch (e) {}
  },

  horn() {
    if (!this._ok()) return;
    try {
      this._tone(98, 1.1, 'sawtooth', 0.14, 92);
      this._tone(147, 1.1, 'sawtooth', 0.10, 138);
      this._tone(196, 0.9, 'triangle', 0.06, 180, 0.1);
      this._noise(0.6, 400, 0.12, 'lowpass', 0.7);
    } catch (e) {}
  },

  roar() {
    if (!this._ok()) return;
    try {
      this._tone(70, 1.2, 'sawtooth', 0.30, 40);
      this._tone(105, 1.0, 'square', 0.14, 55, 0.05);
      this._noise(1.0, 300, 0.25, 'lowpass', 0.9, 0, 90);
    } catch (e) {}
  },

  victory() {
    if (!this._ok()) return;
    try {
      const notes = [392, 523, 659, 784];
      notes.forEach((f, i) => this._tone(f, 0.55, 'triangle', 0.14, f, i * 0.13));
      this._tone(196, 1.4, 'sine', 0.10, 196, 0.1);
    } catch (e) {}
  },

  defeat() {
    if (!this._ok()) return;
    try {
      const notes = [330, 262, 208, 156];
      notes.forEach((f, i) => this._tone(f, 0.7, 'sawtooth', 0.09, f * 0.97, i * 0.2));
    } catch (e) {}
  },

  waveClear() {
    if (!this._ok()) return;
    try {
      this._tone(523, 0.2, 'triangle', 0.10, 660);
      this._tone(784, 0.3, 'triangle', 0.10, 900, 0.14);
    } catch (e) {}
  },
};
