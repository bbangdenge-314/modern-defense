/* 현대병기 · 중세 방어전 — Web Audio 효과음 */
window.SFX = (function () {
  'use strict';
  let ctx = null, master = null, enabled = true, last = {};
  function init() {
    if (ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.32;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function setEnabled(v) {
    enabled = !!v;
    if (master) master.gain.value = enabled ? 0.32 : 0;
  }
  function resume() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }
  function noise(dur, filterFreq, vol, type) {
    const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = filterFreq;
    const g = ctx.createGain(); g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }
  function tone(freq, dur, vol, type, slide) {
    const o = ctx.createOscillator(); o.type = type || 'square';
    const g = ctx.createGain(); g.gain.value = vol;
    o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), ctx.currentTime + dur);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  const SOUNDS = {
    mg() { noise(0.05, 2600, 0.25); tone(180, 0.04, 0.06, 'square', 90); },
    hmg() { noise(0.09, 1800, 0.34); tone(120, 0.08, 0.1, 'square', 60); },
    sniper() { noise(0.2, 1200, 0.4); tone(90, 0.16, 0.12, 'sawtooth', 40); },
    mortar() { tone(90, 0.22, 0.22, 'sine', 40); noise(0.25, 500, 0.18); },
    thump() { tone(70, 0.14, 0.2, 'sine', 35); noise(0.12, 700, 0.16); },
    cannon() { noise(0.5, 700, 0.5); tone(60, 0.4, 0.3, 'sine', 25); },
    rocket() { noise(0.4, 1400, 0.16); tone(300, 0.3, 0.06, 'sawtooth', 700); },
    rail() { tone(1200, 0.25, 0.08, 'sawtooth', 180); noise(0.15, 3000, 0.14); },
    laser() { tone(1400, 0.16, 0.07, 'sine', 900); },
    tesla() { noise(0.18, 4000, 0.16); tone(900, 0.12, 0.05, 'square', 300); },
    emp() { tone(220, 0.5, 0.14, 'sine', 60); noise(0.4, 900, 0.12); },
    cryo() { noise(0.3, 3000, 0.12, 'highpass'); },
    flame() { noise(0.18, 900, 0.1); },
    build() { tone(320, 0.09, 0.1, 'square'); setTimeout(() => tone(440, 0.09, 0.08, 'square'), 70); },
    upgrade() { tone(520, 0.08, 0.09, 'triangle'); setTimeout(() => tone(700, 0.1, 0.08, 'triangle'), 60); },
    sell() { tone(400, 0.08, 0.08, 'sine', 200); },
    click() { tone(600, 0.04, 0.05, 'square'); },
    wave() { tone(140, 0.7, 0.14, 'sawtooth', 90); setTimeout(() => tone(110, 0.8, 0.12, 'sawtooth', 70), 260); },
    relic() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.35, 0.09, 'sine'), i * 90));
    },
    breach() { noise(0.7, 400, 0.4); tone(70, 0.6, 0.2, 'sawtooth', 30); },
    defeat() { [330, 262, 196, 131].forEach((f, i) => setTimeout(() => tone(f, 0.5, 0.12, 'sawtooth'), i * 200)); },
    victory() { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.4, 0.1, 'triangle'), i * 140)); },
    cs_open() { tone(80, 1.6, 0.1, 'sine', 40); noise(1.2, 400, 0.06); },
    cs_advance() { tone(500, 0.06, 0.03, 'sine'); },
    prestige() { [523, 392, 587, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.6, 0.09, 'sine'), i * 160)); },
  };
  const MIN_INT = { mg: 60, hmg: 50, flame: 120, laser: 140, cryo: 100, tesla: 90, mortar: 70, thump: 70, cannon: 90, rocket: 90, mg2: 0 };
  function play(name) {
    if (!enabled) return;
    resume();
    if (!ctx) return;
    const fn = SOUNDS[name];
    if (!fn) return;
    const now = performance.now();
    const gap = MIN_INT[name] || 40;
    if (last[name] && now - last[name] < gap) return;
    last[name] = now;
    try { fn(); } catch (e) {}
  }
  return { init, play, setEnabled, resume, get enabled() { return enabled; } };
})();
