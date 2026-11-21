/* ─────────────────────────────────────────────
   render.js — 전장 렌더러 (야간 2.5D 물량 디펜스)
   ───────────────────────────────────────────── */
'use strict';

const Render = {
  bg: null,
  bgKey: '',

  frame(g) {
    const ctx = g.ctx;
    const dpr = g.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // 화면 밖 여백 (HUD 뒤) 채우기
    const sky = ctx.createLinearGradient(0, 0, 0, g.insetTop + 10);
    sky.addColorStop(0, '#050a12');
    sky.addColorStop(1, '#0a1520');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, window.innerWidth, g.insetTop + 2);
    ctx.fillStyle = '#0a0d09';
    ctx.fillRect(0, g.insetTop + g.H - 1, window.innerWidth, g.insetBottom + 4);

    ctx.save();
    ctx.translate(0, g.insetTop);
    if (g.shakeAmt > 0.2) {
      const s = g.shakeAmt;
      ctx.translate(rand(-s, s) * 0.5, rand(-s, s) * 0.5);
    }

    this.background(ctx, g);

    if (g.state === 'menu') {
      this.menuScene(ctx, g);
    } else {
      this.decals(ctx, g);
      this.pads(ctx, g);
      this.barricades(ctx, g);
      this.buildings(ctx, g);
      this.corpses(ctx, g);
      this.enemies(ctx, g);
      this.hero(ctx, g);
      this.projectiles(ctx, g);
      this.particles(ctx, g);
      this.beams(ctx, g);
      this.texts(ctx, g);
      this.wallDamage(ctx, g);
      this.buildGhost(ctx, g);
      this.crosshair(ctx, g);
      if (g.hero.flash > 0) this.viewFlash(ctx, g);
      this.vignette(ctx, g);
    }
    ctx.restore();

    if (g.flashAlpha > 0.01) {
      ctx.fillStyle = `rgba(255,240,220,${Math.min(0.5, g.flashAlpha)})`;
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    }
  },

  /* ── background ─────────────────────────── */
  background(ctx, g) {
    const key = `${g.W}x${g.H}x${g.dpr}x${g.wallY}x${g.insetTop}`;
    if (!this.bg || this.bgKey !== key) this.buildBackground(g, key);
    ctx.drawImage(this.bg, 0, 0, g.W, g.H);
    // 밤의 횃불 (애니메이션)
    if (g.decor) {
      for (const t of g.decor.torches) this.torch(ctx, t, g.time);
    }
    // 마을 연기
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const x = g.W * (0.18 + i * 0.32) + Math.sin(g.time * 0.3 + i) * 6;
      const y = g.wallY + 16;
      const grd = ctx.createRadialGradient(x, y - 20 - (g.time * 6 + i * 20) % 60, 2, x, y - 20 - (g.time * 6 + i * 20) % 60, 26);
      grd.addColorStop(0, 'rgba(140,140,145,0.10)');
      grd.addColorStop(1, 'rgba(140,140,145,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(x, y - 20 - (g.time * 6 + i * 20) % 60, 26, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  buildBackground(g, key) {
    const dpr = g.dpr;
    const c = document.createElement('canvas');
    c.width = Math.ceil(g.W * dpr);
    c.height = Math.ceil(g.H * dpr);
    const x = c.getContext('2d');
    x.scale(dpr, dpr);

    const W = g.W, H = g.H, wallY = g.wallY;

    // ── 하늘 ──
    const sky = x.createLinearGradient(0, 0, 0, H * 0.42);
    sky.addColorStop(0, '#040812');
    sky.addColorStop(0.45, '#0a1726');
    sky.addColorStop(0.8, '#132433');
    sky.addColorStop(1, '#1b2c33');
    x.fillStyle = sky;
    x.fillRect(0, -g.insetTop, W, H * 0.42 + g.insetTop);

    // 별
    if (g.decor) {
      for (const s of g.decor.stars) {
        x.globalAlpha = s.a * (0.6 + 0.4 * Math.sin(s.x));
        x.fillStyle = '#dfeaff';
        x.beginPath(); x.arc(s.x, s.y, s.r, 0, TAU); x.fill();
      }
      x.globalAlpha = 1;
    }
    // 달
    const mx = W * 0.79, my = H * 0.075;
    const moon = x.createRadialGradient(mx, my, 3, mx, my, H * 0.16);
    moon.addColorStop(0, 'rgba(210,225,245,0.30)');
    moon.addColorStop(0.25, 'rgba(160,185,215,0.10)');
    moon.addColorStop(1, 'rgba(120,150,190,0)');
    x.fillStyle = moon;
    x.beginPath(); x.arc(mx, my, H * 0.16, 0, TAU); x.fill();
    x.fillStyle = '#e8f0fb';
    x.beginPath(); x.arc(mx, my, Math.min(26, H * 0.035), 0, TAU); x.fill();
    x.fillStyle = 'rgba(120,140,160,0.18)';
    x.beginPath(); x.arc(mx - 6, my - 4, 5, 0, TAU); x.fill();
    x.beginPath(); x.arc(mx + 7, my + 6, 3.5, 0, TAU); x.fill();

    // 구름
    x.fillStyle = 'rgba(90,110,135,0.10)';
    for (let i = 0; i < 5; i++) {
      const cx = (i * 0.27 + 0.08) * W, cy = H * (0.06 + (i % 3) * 0.045);
      for (let j = 0; j < 4; j++) {
        x.beginPath();
        x.ellipse(cx + j * 34, cy + Math.sin(j + i) * 5, 48 - j * 6, 12 - j * 1.5, 0, 0, TAU);
        x.fill();
      }
    }

    // ── 원경 산맥 ──
    const mtnY = H * 0.26;
    x.fillStyle = '#0c1a20';
    x.beginPath();
    x.moveTo(0, mtnY + 26);
    for (let i = 0; i <= 12; i++) {
      const px = (i / 12) * W;
      const py = mtnY - Math.sin(i * 1.7 + 0.4) * H * 0.035 - ((i * 37) % 23);
      x.lineTo(px, py);
    }
    x.lineTo(W, mtnY + 40);
    x.lineTo(W, H * 0.34);
    x.lineTo(0, H * 0.34);
    x.closePath();
    x.fill();
    x.fillStyle = '#101f26';
    x.beginPath();
    x.moveTo(0, mtnY + 50);
    for (let i = 0; i <= 9; i++) {
      const px = (i / 9) * W;
      const py = mtnY + 10 - Math.cos(i * 2.1) * H * 0.028 - ((i * 53) % 17);
      x.lineTo(px, py);
    }
    x.lineTo(W, H * 0.375);
    x.lineTo(0, H * 0.375);
    x.closePath();
    x.fill();

    // ── 군주의 성 (상단) ──
    this.enemyCastle(x, W * 0.5, H * 0.105, Math.min(W * 0.34, 460), g);

    // ── 들판 ──
    const field = x.createLinearGradient(0, H * 0.30, 0, wallY);
    field.addColorStop(0, '#111d18');
    field.addColorStop(0.45, '#17231a');
    field.addColorStop(1, '#1d2418');
    x.fillStyle = field;
    x.fillRect(0, H * 0.30, W, wallY - H * 0.30);

    // 흙길 (성 → 마을 성문)
    const pathGrad = x.createLinearGradient(0, H * 0.3, 0, wallY);
    pathGrad.addColorStop(0, 'rgba(70,58,40,0.06)');
    pathGrad.addColorStop(1, 'rgba(92,74,48,0.22)');
    x.fillStyle = pathGrad;
    x.beginPath();
    x.moveTo(W * 0.46, H * 0.3);
    x.lineTo(W * 0.55, H * 0.3);
    x.lineTo(W * 0.62, wallY);
    x.lineTo(W * 0.38, wallY);
    x.closePath();
    x.fill();

    // 풀·자갈
    if (g.decor) {
      for (const t of g.decor.tufts) {
        x.strokeStyle = t.k ? `rgba(96,120,70,${t.a})` : `rgba(80,100,60,${t.a})`;
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(t.x, t.y);
        x.lineTo(t.x - 2 * t.s, t.y - 4 * t.s);
        x.moveTo(t.x, t.y);
        x.lineTo(t.x + 2 * t.s, t.y - 5 * t.s);
        x.stroke();
      }
      for (const r of g.decor.rocks) {
        x.fillStyle = 'rgba(40,48,42,0.55)';
        x.beginPath(); x.ellipse(r.x, r.y, r.r, r.r * 0.6, 0, 0, TAU); x.fill();
        x.fillStyle = 'rgba(90,100,90,0.10)';
        x.beginPath(); x.ellipse(r.x - 1, r.y - 1, r.r * 0.7, r.r * 0.35, 0, 0, TAU); x.fill();
      }
    }

    // 전장의 흔적 - 부러진 창, 해골
    x.strokeStyle = 'rgba(150,140,120,0.22)';
    x.lineWidth = 1.5;
    for (let i = 0; i < Math.round(W / 160); i++) {
      const px = ((i * 197) % 97) / 97 * W, py = wallY - 60 - ((i * 71) % 180);
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + 9, py - 18); x.stroke();
    }

    // ── 성벽 ──
    this.wall(x, g, W, H, wallY);

    // ── 마을 ──
    const village = x.createLinearGradient(0, wallY, 0, H);
    village.addColorStop(0, '#141a12');
    village.addColorStop(1, '#080b07');
    x.fillStyle = village;
    x.fillRect(0, wallY, W, H - wallY);

    // 집들
    const houses = Math.max(4, Math.round(W / 150));
    for (let i = 0; i < houses; i++) {
      const hx = (i + 0.5) / houses * W + ((i * 37) % 20 - 10);
      const hw = 54 + (i * 23) % 34;
      const hy = wallY + 12 + (i * 17) % 12;
      x.fillStyle = '#0c100c';
      x.fillRect(hx - hw / 2, hy, hw, 32);
      x.fillStyle = '#151b14';
      x.beginPath();
      x.moveTo(hx - hw / 2 - 5, hy);
      x.lineTo(hx, hy - 16 - (i % 3) * 4);
      x.lineTo(hx + hw / 2 + 5, hy);
      x.closePath(); x.fill();
      // 창문 불빛
      x.fillStyle = `rgba(255,170,70,${0.35 + (i % 3) * 0.15})`;
      x.fillRect(hx - 9, hy + 10, 5, 6);
      x.fillRect(hx + 5, hy + 10, 5, 6);
      x.fillStyle = 'rgba(255,150,50,0.05)';
      x.beginPath(); x.arc(hx, hy + 14, 26, 0, TAU); x.fill();
    }

    // 성문 앞 바닥 자갈
    x.fillStyle = 'rgba(110,95,70,0.10)';
    x.beginPath(); x.ellipse(W / 2, wallY + 4, W * 0.12, 12, 0, 0, TAU); x.fill();

    // 비네트
    const vg = x.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.28, W / 2, H * 0.55, Math.max(W, H) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = vg;
    x.fillRect(0, 0, W, H);

    this.bg = c;
    this.bgKey = key;
  },

  enemyCastle(x, cx, cy, w, g) {
    const baseY = cy + w * 0.12;
    x.save();
    // 성 본체 실루엣
    x.fillStyle = '#0a1216';
    x.fillRect(cx - w * 0.34, cy - w * 0.02, w * 0.68, w * 0.16);
    // 탑들
    for (let i = 0; i < 3; i++) {
      const tx = cx - w * 0.34 + w * 0.33 * i;
      const th = w * (i === 1 ? 0.20 : 0.14);
      x.fillRect(tx - w * 0.055, cy - th, w * 0.11, th + w * 0.16);
      // 총안
      x.fillStyle = '#060b0e';
      x.fillRect(tx - w * 0.012, cy - th + 8, w * 0.024, 10);
      x.fillStyle = '#0a1216';
    }
    // 깃발 (붉은)
    x.strokeStyle = '#0a1216'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(cx + w * 0.02, cy - w * 0.20); x.lineTo(cx + w * 0.02, cy - w * 0.30); x.stroke();
    const flag = x.createLinearGradient(cx + w * 0.02, 0, cx + w * 0.12, 0);
    flag.addColorStop(0, 'rgba(150,30,40,0.55)');
    flag.addColorStop(1, 'rgba(90,10,20,0.05)');
    x.fillStyle = flag;
    const wav = Math.sin(g.time * 1.6) * 2;
    x.beginPath();
    x.moveTo(cx + w * 0.02, cy - w * 0.30);
    x.quadraticCurveTo(cx + w * 0.075, cy - w * 0.30 + 4 + wav, cx + w * 0.115, cy - w * 0.275);
    x.lineTo(cx + w * 0.10, cy - w * 0.245);
    x.quadraticCurveTo(cx + w * 0.06, cy - w * 0.245 + 3 - wav, cx + w * 0.02, cy - w * 0.255);
    x.closePath(); x.fill();

    // 횃불 불빛
    for (let i = 0; i < 3; i++) {
      const fx = cx - w * 0.3 + i * w * 0.3;
      const grd = x.createRadialGradient(fx, cy + w * 0.04, 1, fx, cy + w * 0.04, w * 0.09);
      grd.addColorStop(0, 'rgba(255,140,50,0.30)');
      grd.addColorStop(1, 'rgba(255,100,20,0)');
      x.fillStyle = grd;
      x.beginPath(); x.arc(fx, cy + w * 0.04, w * 0.09, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,170,70,0.75)';
      x.beginPath(); x.arc(fx, cy + w * 0.04, 1.6, 0, TAU); x.fill();
    }
    x.restore();
  },

  wall(x, g, W, H, wallY) {
    // 성벽 그림자
    x.fillStyle = 'rgba(0,0,0,0.45)';
    x.fillRect(0, wallY, W, 10);
    // 본체
    const wg = x.createLinearGradient(0, wallY - 30, 0, wallY + 12);
    wg.addColorStop(0, '#3a3f42');
    wg.addColorStop(0.4, '#2b3033');
    wg.addColorStop(1, '#1a1e20');
    x.fillStyle = wg;
    x.fillRect(0, wallY - 26, W, 38);
    // 돌 블록
    x.strokeStyle = 'rgba(0,0,0,0.25)';
    x.lineWidth = 1;
    const bw = 34, bh = 13;
    for (let row = 0; row < 2; row++) {
      for (let i = -1; i < W / bw + 1; i++) {
        const ox = (row % 2) * bw / 2;
        x.strokeRect(i * bw + ox, wallY - 26 + row * bh, bw, bh);
      }
    }
    // 총안 (메를론)
    x.fillStyle = '#252a2c';
    for (let i = 0; i < W / 46 + 1; i++) {
      const px = i * 46 + 8;
      x.fillRect(px, wallY - 34, 22, 10);
      x.fillStyle = '#1a1e20';
      x.fillRect(px + 2, wallY - 32, 18, 7);
      x.fillStyle = '#252a2c';
    }
    // 성문
    const gw = Math.min(120, W * 0.16);
    x.fillStyle = '#2a1d11';
    x.fillRect(W / 2 - gw / 2, wallY - 30, gw, 44);
    x.fillStyle = '#3a2818';
    x.fillRect(W / 2 - gw / 2 + 4, wallY - 26, gw - 8, 40);
    x.strokeStyle = '#5a4126'; x.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      x.beginPath();
      x.moveTo(W / 2 - gw / 2 + 4 + i * (gw - 8) / 4, wallY - 26);
      x.lineTo(W / 2 - gw / 2 + 4 + i * (gw - 8) / 4, wallY + 14);
      x.stroke();
    }
    x.strokeStyle = '#6b6257'; x.lineWidth = 3;
    x.beginPath();
    x.moveTo(W / 2 - gw / 2 + 2, wallY - 30); x.lineTo(W / 2 + gw / 2 - 2, wallY - 30);
    x.stroke();
    // 문 손잡이
    x.fillStyle = '#c9a24a';
    x.beginPath(); x.arc(W / 2 - 8, wallY - 6, 2.4, 0, TAU); x.fill();

    // 횃불 거치대
    if (g.decor) {
      for (const t of g.decor.torches) {
        x.fillStyle = '#20160c';
        x.fillRect(t.x - 2, t.y - 4, 4, 14);
        x.fillStyle = 'rgba(255,160,60,0.14)';
        x.beginPath(); x.arc(t.x, t.y - 8, 22, 0, TAU); x.fill();
      }
    }

    // 하단 흙더미
    x.fillStyle = 'rgba(28,30,22,0.9)';
    x.fillRect(0, wallY + 12, W, 6);
  },

  torch(ctx, t, time) {
    const fl = Math.sin(time * 9 + t.ph) * 0.5 + Math.sin(time * 15.3 + t.ph * 2) * 0.3;
    const h = 8 + fl * 2;
    ctx.save();
    const grd = ctx.createRadialGradient(t.x, t.y - 10, 1, t.x, t.y - 10, 34 + fl * 4);
    grd.addColorStop(0, 'rgba(255,190,90,0.35)');
    grd.addColorStop(0.4, 'rgba(255,130,40,0.12)');
    grd.addColorStop(1, 'rgba(255,100,20,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(t.x, t.y - 10, 34 + fl * 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb54a';
    ctx.beginPath();
    ctx.moveTo(t.x - 3, t.y - 4);
    ctx.quadraticCurveTo(t.x - 3 + fl * 2, t.y - 10 - h, t.x + fl, t.y - 12 - h * 0.9);
    ctx.quadraticCurveTo(t.x + 3 + fl * 2, t.y - 8, t.x + 3, t.y - 4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.ellipse(t.x + fl * 0.5, t.y - 8 - h * 0.35, 1.8, 3.4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },

  menuScene(ctx, g) {
    // 메뉴: 영웅과 마을 실루엣, 불씨
    this.corpses(ctx, g);
    this.hero(ctx, g);
    this.particles(ctx, g);
    // 어두운 오버레이
    ctx.fillStyle = 'rgba(3,6,10,0.35)';
    ctx.fillRect(0, 0, g.W, g.H);
  },

  /* ── decals ─────────────────────────────── */
  decals(ctx, g) {
    for (const d of g.decals) {
      const a = Math.min(1, d.life / d.maxLife * 1.6);
      ctx.globalAlpha = a * (d.kind === 'blood' ? 0.8 : 0.6);
      if (d.kind === 'blood') {
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.55, 0, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = d.color;
        ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 0.6, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },

  corpses(ctx, g) {
    for (const c of g.corpses) {
      const k = c.t / c.life;
      const a = Math.min(1, (1 - k) * 2.2);
      ctx.save();
      ctx.globalAlpha = a * 0.85;
      ctx.translate(c.x + k * 4, c.y + 2);
      ctx.rotate(c.rot + k * 0.5);
      ctx.fillStyle = 'rgba(14,10,8,0.55)';
      ctx.beginPath(); ctx.ellipse(0, 0, c.r * 1.1, c.r * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = c.def ? c.def.color : '#5a4a3a';
      ctx.beginPath(); ctx.ellipse(0, 0, c.r * 0.8, c.r * 0.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2020';
      ctx.beginPath(); ctx.arc(c.r * 0.7, -c.r * 0.1, c.r * 0.3, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  pads(ctx, g) {
    const active = g.buildMode && g.buildMode !== 'barricade' && g.buildMode !== 'repair';
    for (const p of g.pads) {
      if (p.type) continue;
      const pulse = 0.5 + 0.5 * Math.sin(g.time * 3 + p.x * 0.02);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = active ? `rgba(255,176,46,${0.5 + pulse * 0.4})` : `rgba(150,180,200,${0.16 + pulse * 0.08})`;
      ctx.lineWidth = active ? 2 : 1.2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = ctx.strokeStyle;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
      ctx.moveTo(0, -6); ctx.lineTo(0, 6);
      ctx.stroke();
      ctx.restore();
    }
  },

  barricades(ctx, g) {
    for (const b of g.barricades) {
      const ratio = clamp(b.hp / b.maxHp, 0, 1);
      ctx.save();
      ctx.translate(b.x, b.y);
      // 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, b.h * 0.5 + 4, b.w * 0.52, 7, 0, 0, TAU); ctx.fill();
      // 본체 (나무 방벽)
      const wg = ctx.createLinearGradient(0, -b.h, 0, b.h);
      wg.addColorStop(0, '#6b4e2d');
      wg.addColorStop(1, '#402d19');
      ctx.fillStyle = wg;
      this.rrect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,12,6,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
      // 판자
      ctx.strokeStyle = 'rgba(120,90,55,0.55)';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * b.w / 5, -b.h / 2);
        ctx.lineTo(i * b.w / 5, b.h / 2);
        ctx.stroke();
      }
      // 못
      ctx.fillStyle = 'rgba(30,20,10,0.7)';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.arc(i * b.w / 3, -2, 1.5, 0, TAU); ctx.fill();
      }
      // 철판
      ctx.fillStyle = 'rgba(120,130,140,0.28)';
      ctx.fillRect(-b.w * 0.18, -b.h / 2 - 1, b.w * 0.36, 3);
      // 피해 균열
      if (ratio < 0.7) {
        ctx.strokeStyle = 'rgba(15,8,4,0.7)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-b.w * 0.2, -b.h / 2);
        ctx.lineTo(-b.w * 0.08, 0);
        ctx.lineTo(-b.w * 0.16, b.h / 2);
        ctx.moveTo(b.w * 0.22, -b.h / 2);
        ctx.lineTo(b.w * 0.1, -1);
        ctx.stroke();
      }
      if (b.flash > 0) {
        ctx.globalAlpha = b.flash * 0.6;
        ctx.fillStyle = '#fff';
        this.rrect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // HP
      if (ratio < 1) {
        this.hpBar(ctx, 0, -b.h / 2 - 8, b.w * 0.8, 3, ratio, ratio > 0.5 ? '#7ddc8a' : ratio > 0.25 ? '#ffb02e' : '#ff5d5d');
      }
      ctx.restore();
    }
  },

  buildings(ctx, g) {
    for (const b of g.buildings) {
      const def = TURRETS[b.type];
      const ratio = clamp(b.hp / b.maxHp, 0, 1);
      ctx.save();
      ctx.translate(b.x, b.y);
      // 그림자
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(0, 8, 24, 9, 0, 0, TAU); ctx.fill();
      // 샌드백 기지
      ctx.fillStyle = '#4a4433';
      ctx.beginPath();
      ctx.ellipse(0, 2, 22, 13, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5c5541';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 14, Math.sin(a) * 7 + 2, 7, 5, a, 0, TAU);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, 2, 22, 13, 0, 0, TAU); ctx.stroke();

      // 기종별 몸체
      ctx.save();
      ctx.rotate(b.angle);
      if (b.type === 'sentry') {
        ctx.fillStyle = '#2b3238';
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3d4650';
        ctx.beginPath(); ctx.arc(-2, -2, 8, 0, TAU); ctx.fill();
        ctx.fillStyle = '#20262b';
        ctx.fillRect(4, -3.2, 22, 6.4);
        ctx.fillStyle = '#4b5560';
        ctx.fillRect(6, -4.6, 8, 9.2);
        ctx.fillStyle = '#0e1215';
        ctx.fillRect(24, -2, 4, 4);
        // 탄창
        ctx.fillStyle = '#6b5a30';
        ctx.fillRect(-2, 7, 6, 8);
      } else if (b.type === 'flame') {
        ctx.fillStyle = '#3a3128';
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
        // 연료 탱크
        ctx.fillStyle = '#6b3b22';
        this.rrect(ctx, -8, -13, 16, 26, 5);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,140,50,0.35)';
        this.rrect(ctx, -5, -9, 10, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#2a211a';
        ctx.fillRect(8, -4, 20, 8);
        ctx.fillStyle = '#ffb066';
        ctx.fillRect(26, -3, 3, 6);
        ctx.fillStyle = '#c9843c';
        ctx.beginPath(); ctx.arc(-12, 0, 7, 0, TAU); ctx.fill();
      } else if (b.type === 'mortar') {
        ctx.fillStyle = '#31363a';
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4a5157';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#242a2e';
        ctx.fillRect(2, -6, 24, 12);
        ctx.fillStyle = '#5e666d';
        ctx.fillRect(8, -7, 6, 14);
        ctx.fillStyle = '#141a1e';
        ctx.beginPath(); ctx.arc(27, 0, 5, 0, TAU); ctx.fill();
        // 받침
        ctx.strokeStyle = '#6b7178'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-4, 2); ctx.lineTo(-14, 14);
        ctx.moveTo(-4, -2); ctx.lineTo(-16, 10);
        ctx.stroke();
      } else if (b.type === 'rail') {
        ctx.fillStyle = '#232a30';
        ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2e3a44';
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4a6b7a';
        ctx.fillRect(2, -4, 24, 8);
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = `rgba(120,230,255,${0.5 + 0.4 * Math.sin(g.time * 6 + i)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(8 + i * 6, 0, 6, 0, TAU);
          ctx.stroke();
        }
        ctx.fillStyle = '#9fe8ff';
        ctx.fillRect(26, -2, 3, 4);
      }
      // 총구 화염
      if (b.flash > 0) {
        const f = b.flash;
        ctx.globalAlpha = f;
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.moveTo(b.type === 'mortar' ? 28 : 30, 0);
        ctx.lineTo(38 + f * 6, -5 * f);
        ctx.lineTo(46 + f * 8, 0);
        ctx.lineTo(38 + f * 6, 5 * f);
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      // 레벨 핍
      for (let i = 0; i < b.lv; i++) {
        ctx.fillStyle = '#ffcf5e';
        ctx.fillRect(-9 + i * 5, 14, 3, 2.5);
      }
      // HP
      if (ratio < 1) {
        this.hpBar(ctx, 0, -26, 38, 3.5, ratio, ratio > 0.5 ? '#7ddc8a' : ratio > 0.25 ? '#ffb02e' : '#ff5d5d');
      }
      // 피격 플래시
      if (b.flash > 0) {
        ctx.globalAlpha = b.flash * 0.35;
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0, 0, 22, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  },

  enemies(ctx, g) {
    const list = g.enemies;
    if (!list.length) return;
    const sorted = list.slice().sort((a, b) => a.y - b.y);
    for (const e of sorted) {
      if (e.dead) continue;
      this.enemy(ctx, g, e);
    }
  },

  enemy(ctx, g, e) {
    const r = e.r;
    const walking = e.state === 'walk';
    const bob = walking ? Math.sin(e.t * 7 + e.seed) * 1.4 : Math.sin(e.t * 3 + e.seed) * 0.4;
    const x = e.x + e.ox, y = e.y + e.oy + bob;

    if (e.def.boss) {
      const aura = ctx.createRadialGradient(x, y, 5, x, y, r * 3);
      aura.addColorStop(0, 'rgba(255,40,60,0.20)');
      aura.addColorStop(1, 'rgba(255,20,40,0)');
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
    }

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath(); ctx.ellipse(x, y + r * 0.75, r * 0.95, r * 0.42, 0, 0, TAU); ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    const tilt = walking ? Math.sin(e.t * 7 + e.seed) * 0.06 : (e.state === 'attackWall' || e.state === 'attackBar' ? Math.sin(e.t * 14) * 0.08 : 0);
    ctx.rotate(tilt);

    switch (e.type) {
      case 'peasant': this.drawPeasant(ctx, r, e); break;
      case 'spearman': this.drawSpearman(ctx, r, e); break;
      case 'shield': this.drawShield(ctx, r, e); break;
      case 'archer': this.drawArcher(ctx, r, e); break;
      case 'cavalry': this.drawCavalry(ctx, r, e); break;
      case 'knight': this.drawKnight(ctx, r, e); break;
      case 'ram': this.drawRam(ctx, r, e); break;
      case 'siege': this.drawSiege(ctx, r, e); break;
      case 'lord': this.drawLord(ctx, r, e); break;
      default: this.drawPeasant(ctx, r, e);
    }

    // 피격 화이트 플래시
    if (e.flash > 0.02) {
      ctx.globalAlpha = Math.min(1, e.flash) * 0.8;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 1.15, 0, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    // 화상
    if (e.burnT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,120,30,${0.15 + Math.random() * 0.1})`;
      ctx.beginPath(); ctx.arc(0, -r * 0.2, r * 0.9, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();

    // 체력바
    if (e.hp < e.maxHp && !e.def.boss) {
      const w = Math.max(18, r * 1.8);
      const ratio = clamp(e.hp / e.maxHp, 0, 1);
      this.hpBar(ctx, x, y - r - 12, w, 2.6, ratio, ratio > 0.5 ? '#9be8a4' : ratio > 0.25 ? '#ffcf5e' : '#ff6b6b');
    }
    if (e.def.boss) {
      // 보스 머리 위 표식
      ctx.fillStyle = '#ff5d5d';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼', x, y - r - 8);
    }
  },

  drawPeasant(ctx, r, e) {
    const step = Math.sin(e.t * 8 + e.seed);
    // 다리
    ctx.strokeStyle = '#4a3826'; ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    ctx.moveTo(-r * 0.28, r * 0.4); ctx.lineTo(-r * 0.34 + step * 2, r * 0.95);
    ctx.moveTo(r * 0.28, r * 0.4); ctx.lineTo(r * 0.34 - step * 2, r * 0.95);
    ctx.stroke();
    // 몸
    ctx.fillStyle = '#6d5335';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7f6340';
    ctx.beginPath(); ctx.ellipse(-r * 0.15, -r * 0.15, r * 0.5, r * 0.55, 0.3, 0, TAU); ctx.fill();
    // 팔
    ctx.fillStyle = '#8d6f4c';
    ctx.beginPath(); ctx.arc(-r * 0.7, r * 0.05, r * 0.22, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.7, r * 0.05, r * 0.22, 0, TAU); ctx.fill();
    // 머리/후드
    ctx.fillStyle = '#7a5c3a';
    ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c79a70';
    ctx.beginPath(); ctx.arc(0, -r * 0.48, r * 0.27, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1c10';
    ctx.beginPath(); ctx.arc(-r * 0.08, -r * 0.5, r * 0.06, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.1, -r * 0.5, r * 0.06, 0, TAU); ctx.fill();
    // 쇠스랑
    ctx.strokeStyle = '#8f7c58'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.62, -r * 0.1); ctx.lineTo(r * 0.95, r * 1.35);
    ctx.stroke();
    ctx.strokeStyle = '#b0a68c'; ctx.lineWidth = 1.4;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(r * 0.95, r * 1.3);
      ctx.lineTo(r * 0.95 + i * 3.4, r * 1.62);
      ctx.stroke();
    }
  },

  drawSpearman(ctx, r, e) {
    const step = Math.sin(e.t * 7 + e.seed);
    ctx.strokeStyle = '#3d4a30'; ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.4); ctx.lineTo(-r * 0.3 + step * 2, r * 0.95);
    ctx.moveTo(r * 0.25, r * 0.4); ctx.lineTo(r * 0.3 - step * 2, r * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#5c7047';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.7, r * 0.85, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6d8255';
    ctx.beginPath(); ctx.ellipse(-r * 0.1, -r * 0.15, r * 0.45, r * 0.5, 0, 0, TAU); ctx.fill();
    // 방패
    ctx.fillStyle = '#7a6a48';
    ctx.beginPath(); ctx.ellipse(-r * 0.66, r * 0.05, r * 0.3, r * 0.36, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3c3424'; ctx.lineWidth = 1; ctx.stroke();
    // 머리 + 투구
    ctx.fillStyle = '#b08a63';
    ctx.beginPath(); ctx.arc(0, -r * 0.58, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8d99a3';
    ctx.beginPath(); ctx.arc(0, -r * 0.64, r * 0.34, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#6c7882';
    ctx.fillRect(-r * 0.34, -r * 0.66, r * 0.68, 2);
    // 창
    ctx.strokeStyle = '#9b8a68'; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.2); ctx.lineTo(r * 0.78, r * 1.9);
    ctx.stroke();
    ctx.fillStyle = '#c9d2da';
    ctx.beginPath();
    ctx.moveTo(r * 0.78, r * 1.86);
    ctx.lineTo(r * 0.72, r * 2.12);
    ctx.lineTo(r * 0.84, r * 2.12);
    ctx.closePath(); ctx.fill();
  },

  drawShield(ctx, r, e) {
    const step = Math.sin(e.t * 6 + e.seed);
    ctx.strokeStyle = '#2e3a44'; ctx.lineWidth = r * 0.3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, r * 0.4); ctx.lineTo(-r * 0.3 + step, r * 0.95);
    ctx.moveTo(r * 0.25, r * 0.4); ctx.lineTo(r * 0.3 - step, r * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#5a6c7d';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.78, r * 0.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6d8092';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.12, r * 0.5, r * 0.6, 0, 0, TAU); ctx.fill();
    // 헬멧
    ctx.fillStyle = '#9aa7b3';
    ctx.beginPath(); ctx.arc(0, -r * 0.58, r * 0.34, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5c6874';
    ctx.fillRect(-r * 0.3, -r * 0.58, r * 0.6, 2);
    // 대형 방패
    ctx.fillStyle = '#4f6273';
    this.rrect(ctx, -r * 0.95, r * 0.05, r * 1.9, r * 1.05, r * 0.4);
    ctx.fill();
    ctx.strokeStyle = '#9fb3c4'; ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#2c3a46';
    ctx.beginPath(); ctx.arc(0, r * 0.55, r * 0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7f96a8'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, r * 0.06); ctx.lineTo(0, r * 1.08); ctx.stroke();
    // 창
    ctx.strokeStyle = '#8c8a76'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(r * 0.62, 0); ctx.lineTo(r * 0.86, r * 1.5); ctx.stroke();
  },

  drawArcher(ctx, r, e) {
    const step = Math.sin(e.t * 7 + e.seed);
    ctx.strokeStyle = '#4a3648'; ctx.lineWidth = r * 0.26;
    ctx.beginPath();
    ctx.moveTo(-r * 0.24, r * 0.4); ctx.lineTo(-r * 0.3 + step * 2, r * 0.92);
    ctx.moveTo(r * 0.24, r * 0.4); ctx.lineTo(r * 0.3 - step * 2, r * 0.92);
    ctx.stroke();
    ctx.fillStyle = '#5e4159';
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.66, r * 0.82, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6f4f68';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.2, r * 0.42, r * 0.48, 0, 0, TAU); ctx.fill();
    // 후드/얼굴
    ctx.fillStyle = '#4a3048';
    ctx.beginPath(); ctx.arc(0, -r * 0.55, r * 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#cfae8f';
    ctx.beginPath(); ctx.arc(0, -r * 0.5, r * 0.23, 0, TAU); ctx.fill();
    // 활
    ctx.strokeStyle = '#a9885a'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, r * 0.6, r * 0.75, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,220,190,0.7)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * 0.72, r * 0.42);
    ctx.lineTo(r * 0.72, r * 0.98);
    ctx.stroke();
    // 화살
    ctx.strokeStyle = '#d8cba8'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, r * 0.5); ctx.lineTo(0, r * 1.2); ctx.stroke();
  },

  drawCavalry(ctx, r, e) {
    const step = Math.sin(e.t * 10 + e.seed);
    // 말 몸통
    ctx.fillStyle = '#4a3128';
    ctx.beginPath(); ctx.ellipse(0, r * 0.15, r * 0.82, r * 1.15, 0, 0, TAU); ctx.fill();
    // 다리
    ctx.strokeStyle = '#3a2620'; ctx.lineWidth = r * 0.26;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.7); ctx.lineTo(-r * 0.7 + step * 6, r * 1.35);
    ctx.moveTo(r * 0.5, r * 0.7); ctx.lineTo(r * 0.7 + step * 6, r * 1.3);
    ctx.stroke();
    // 말 머리
    ctx.fillStyle = '#54382c';
    ctx.beginPath(); ctx.ellipse(0, r * 1.05, r * 0.36, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2c1d17';
    ctx.beginPath(); ctx.arc(-r * 0.22, r * 0.95, r * 0.07, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.22, r * 0.95, r * 0.07, 0, TAU); ctx.fill();
    // 안장
    ctx.fillStyle = '#6b2b22';
    ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.6, r * 0.42, 0, 0, TAU); ctx.fill();
    // 기수
    ctx.fillStyle = '#6e4a35';
    ctx.beginPath(); ctx.ellipse(0, -r * 0.25, r * 0.44, r * 0.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8c9aa6';
    ctx.beginPath(); ctx.arc(0, -r * 0.7, r * 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#b33a2a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.lineTo(-r * 0.16, -r * 1.18);
    ctx.lineTo(r * 0.04, -r * 1.05);
    ctx.closePath(); ctx.fill();
    // 랜스
    ctx.strokeStyle = '#a7a08a'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.4); ctx.lineTo(r * 1.05, r * 1.9);
    ctx.stroke();
    ctx.fillStyle = '#d6dde3';
    ctx.beginPath();
    ctx.moveTo(r * 1.05, r * 1.86); ctx.lineTo(r * 0.98, r * 2.14); ctx.lineTo(r * 1.12, r * 2.1);
    ctx.closePath(); ctx.fill();
  },

  drawKnight(ctx, r, e) {
    const step = Math.sin(e.t * 5 + e.seed);
    ctx.strokeStyle = '#5a6570'; ctx.lineWidth = r * 0.3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.4); ctx.lineTo(-r * 0.36 + step, r * 1.0);
    ctx.moveTo(r * 0.3, r * 0.4); ctx.lineTo(r * 0.36 - step, r * 1.0);
    ctx.stroke();
    // 몸통 갑옷
    const armor = ctx.createLinearGradient(-r, -r, r, r);
    armor.addColorStop(0, '#b6c2cd');
    armor.addColorStop(0.5, '#7e8b97');
    armor.addColorStop(1, '#55606b');
    ctx.fillStyle = armor;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.85, r * 0.92, 0, 0, TAU); ctx.fill();
    // 어깨 갑주
    ctx.fillStyle = '#9aa7b3';
    ctx.beginPath(); ctx.ellipse(-r * 0.78, -r * 0.18, r * 0.32, r * 0.42, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.78, -r * 0.18, r * 0.32, r * 0.42, 0.3, 0, TAU); ctx.fill();
    // 붉은 장식
    ctx.fillStyle = '#8f2b33';
    ctx.fillRect(-r * 0.08, -r * 0.55, r * 0.16, r * 0.9);
    // 투구
    ctx.fillStyle = '#c4cfd9';
    ctx.beginPath(); ctx.arc(0, -r * 0.66, r * 0.36, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2b333a';
    ctx.fillRect(-r * 0.26, -r * 0.7, r * 0.52, 3);
    // 깃털
    ctx.fillStyle = '#c33a44';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95);
    ctx.quadraticCurveTo(r * 0.18, -r * 1.2, r * 0.1, -r * 1.38);
    ctx.quadraticCurveTo(-r * 0.02, -r * 1.1, -r * 0.06, -r * 0.98);
    ctx.closePath(); ctx.fill();
    // 대검
    ctx.save();
    ctx.rotate(-0.25 + Math.sin(e.t * 3) * 0.05);
    ctx.fillStyle = '#d4dde5';
    ctx.fillRect(r * 0.55, -r * 0.4, r * 0.16, r * 1.6);
    ctx.fillStyle = '#8a6a2a';
    ctx.fillRect(r * 0.48, r * 0.9, r * 0.3, r * 0.16);
    ctx.fillRect(r * 0.56, r * 1.02, r * 0.14, r * 0.3);
    ctx.restore();
  },

  drawRam(ctx, r, e) {
    const sway = Math.sin(e.t * 3) * 0.03;
    ctx.rotate(sway);
    // 바퀴
    ctx.fillStyle = '#2b1e12';
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath(); ctx.arc(i * r * 0.7, r * 0.7, r * 0.28, 0, TAU); ctx.fill();
    }
    // 나무 프레임
    const wg = ctx.createLinearGradient(0, -r, 0, r);
    wg.addColorStop(0, '#7a5836');
    wg.addColorStop(1, '#4a3320');
    ctx.fillStyle = wg;
    this.rrect(ctx, -r * 1.25, -r * 0.95, r * 2.5, r * 1.75, r * 0.2);
    ctx.fill();
    ctx.strokeStyle = '#2e1f12'; ctx.lineWidth = 2;
    ctx.strokeRect(-r * 1.25, -r * 0.95, r * 2.5, r * 1.75);
    // 철 밴드
    ctx.fillStyle = '#6e767e';
    ctx.fillRect(-r * 0.8, -r * 0.95, r * 0.18, r * 1.75);
    ctx.fillRect(r * 0.6, -r * 0.95, r * 0.18, r * 1.75);
    // 지붕
    ctx.fillStyle = '#5a452c';
    ctx.beginPath();
    ctx.moveTo(-r * 1.2, -r * 0.95);
    ctx.lineTo(0, -r * 1.55);
    ctx.lineTo(r * 1.2, -r * 0.95);
    ctx.closePath(); ctx.fill();
    // 공성추 머리
    ctx.fillStyle = '#394049';
    ctx.beginPath(); ctx.arc(0, r * 1.15, r * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a939c';
    ctx.beginPath(); ctx.arc(-r * 0.08, r * 1.08, r * 0.16, 0, TAU); ctx.fill();
    // 밧줄
    ctx.strokeStyle = '#b09870'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.9);
    ctx.lineTo(-r * 0.5, r * 0.8);
    ctx.moveTo(r * 0.8, -r * 0.9);
    ctx.lineTo(r * 0.5, r * 0.8);
    ctx.stroke();
  },

  drawSiege(ctx, r, e) {
    // 바퀴
    ctx.fillStyle = '#2b1e12';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.arc(i * r * 0.8, r * 0.85, r * 0.26, 0, TAU); ctx.fill();
    }
    // 본체
    const wg = ctx.createLinearGradient(0, -r * 2, 0, r);
    wg.addColorStop(0, '#6b5538');
    wg.addColorStop(1, '#3e2f1e');
    ctx.fillStyle = wg;
    this.rrect(ctx, -r * 1.1, -r * 1.85, r * 2.2, r * 2.6, 3);
    ctx.fill();
    ctx.strokeStyle = '#241a10'; ctx.lineWidth = 2;
    ctx.strokeRect(-r * 1.1, -r * 1.85, r * 2.2, r * 2.6);
    // 판자
    ctx.strokeStyle = 'rgba(140,110,70,0.4)'; ctx.lineWidth = 1.4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(-r * 1.05, i * r * 0.45 - r * 0.2); ctx.lineTo(r * 1.05, i * r * 0.45 - r * 0.2); ctx.stroke();
    }
    // 상단 방패벽
    ctx.fillStyle = '#7a8694';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * r * 0.38 - r * 0.16, -r * 2.05, r * 0.32, r * 0.35);
    }
    // 사다리
    ctx.strokeStyle = '#b09468'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, r * 0.4); ctx.lineTo(-r * 0.9, r * 1.6);
    ctx.moveTo(-r * 0.6, r * 0.4); ctx.lineTo(-r * 0.6, r * 1.6);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(-r * 0.9, r * 0.5 + i * r * 0.3); ctx.lineTo(-r * 0.6, r * 0.5 + i * r * 0.3); ctx.stroke();
    }
    // 깃발
    ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 2.05); ctx.lineTo(r * 0.5, -r * 2.9); ctx.stroke();
    ctx.fillStyle = 'rgba(170,40,50,0.8)';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 2.85);
    ctx.quadraticCurveTo(r * 0.9, -r * 2.7, r * 0.85, -r * 2.35);
    ctx.lineTo(r * 0.5, -r * 2.45);
    ctx.closePath(); ctx.fill();
  },

  drawLord(ctx, r, e) {
    const sway = Math.sin(e.t * 2) * 0.04;
    ctx.rotate(sway);
    // 망토
    const cape = ctx.createLinearGradient(0, -r, 0, r * 1.4);
    cape.addColorStop(0, '#8e1b26');
    cape.addColorStop(1, '#3c0a10');
    ctx.fillStyle = cape;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.7);
    ctx.quadraticCurveTo(-r * 1.6, -r * 0.2, -r * 1.5, r * 1.5);
    ctx.lineTo(-r * 0.4, r * 1.1);
    ctx.lineTo(0, r * 0.7);
    ctx.lineTo(r * 0.4, r * 1.1);
    ctx.lineTo(r * 1.5, r * 1.5);
    ctx.quadraticCurveTo(r * 1.6, -r * 0.2, r * 0.2, -r * 0.7);
    ctx.closePath(); ctx.fill();
    // 몸통
    const armor = ctx.createLinearGradient(-r, -r, r, r);
    armor.addColorStop(0, '#3a3f4a');
    armor.addColorStop(0.5, '#1f242c');
    armor.addColorStop(1, '#12161c');
    ctx.fillStyle = armor;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.95, r * 1.05, 0, 0, TAU); ctx.fill();
    // 금장식
    ctx.strokeStyle = '#c8a451'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.75); ctx.lineTo(0, r * 0.8);
    ctx.moveTo(-r * 0.55, -r * 0.2); ctx.lineTo(r * 0.55, -r * 0.2);
    ctx.stroke();
    // 어깨
    ctx.fillStyle = '#2b3038';
    ctx.beginPath(); ctx.ellipse(-r * 0.95, -r * 0.15, r * 0.34, r * 0.46, -0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.95, -r * 0.15, r * 0.34, r * 0.46, 0.3, 0, TAU); ctx.fill();
    // 투구
    ctx.fillStyle = '#22272e';
    ctx.beginPath(); ctx.arc(0, -r * 0.9, r * 0.42, 0, TAU); ctx.fill();
    // 뿔
    ctx.fillStyle = '#c8a451';
    ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 1.15); ctx.lineTo(-r * 0.62, -r * 1.5); ctx.lineTo(-r * 0.18, -r * 1.25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.3, -r * 1.15); ctx.lineTo(r * 0.62, -r * 1.5); ctx.lineTo(r * 0.18, -r * 1.25); ctx.closePath(); ctx.fill();
    // 왕관
    ctx.fillStyle = '#ffcf5e';
    ctx.beginPath();
    ctx.moveTo(-r * 0.26, -r * 1.24);
    ctx.lineTo(-r * 0.2, -r * 1.45);
    ctx.lineTo(-r * 0.06, -r * 1.3);
    ctx.lineTo(0, -r * 1.52);
    ctx.lineTo(r * 0.06, -r * 1.3);
    ctx.lineTo(r * 0.2, -r * 1.45);
    ctx.lineTo(r * 0.26, -r * 1.24);
    ctx.closePath(); ctx.fill();
    // 붉은 눈
    ctx.fillStyle = '#ff3b4e';
    ctx.beginPath(); ctx.arc(-r * 0.13, -r * 0.9, r * 0.06, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.13, -r * 0.9, r * 0.06, 0, TAU); ctx.fill();
    // 대검
    ctx.save();
    ctx.rotate(0.35);
    ctx.fillStyle = '#8a929c';
    ctx.fillRect(r * 0.8, -r * 0.6, r * 0.2, r * 2.3);
    ctx.fillStyle = '#c8a451';
    ctx.fillRect(r * 0.68, r * 1.5, r * 0.44, r * 0.16);
    ctx.fillRect(r * 0.84, r * 1.66, r * 0.12, r * 0.4);
    ctx.restore();
  },

  /* ── hero ───────────────────────────────── */
  hero(ctx, g) {
    const h = g.hero;
    const x = h.x + Math.sin((h.moveAnim || 0)) * 0.6;
    const y = h.y;
    const moving = g.keys['a'] || g.keys['d'] || g.keys['arrowleft'] || g.keys['arrowright'] || g.touchMove !== 0;
    const bob = moving ? Math.sin(h.moveAnim || 0) * 1.2 : Math.sin(g.time * 2) * 0.3;

    ctx.save();
    ctx.translate(x, y + bob);
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(0, 12, 14, 6, 0, 0, TAU); ctx.fill();

    // 몸통
    ctx.fillStyle = '#3f4a38';
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 12, 0, 0, TAU); ctx.fill();
    // 조끼
    ctx.fillStyle = '#56643f';
    ctx.beginPath(); ctx.ellipse(0, -1, 7.5, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a3324';
    ctx.fillRect(-7, -3, 14, 2.2);
    ctx.fillStyle = '#8a9478';
    for (let i = -1; i <= 1; i++) ctx.fillRect(i * 3.5 - 1.2, 0, 2.4, 3);
    // 어깨
    ctx.fillStyle = '#6b7a52';
    ctx.beginPath(); ctx.arc(-8, -5, 3.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -5, 3.6, 0, TAU); ctx.fill();
    // 헬멧
    ctx.fillStyle = '#6e7d52';
    ctx.beginPath(); ctx.arc(0, -9, 6.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#26301e';
    ctx.fillRect(-5, -10, 10, 3);
    ctx.fillStyle = '#9fe8ff';
    ctx.fillRect(-4.5, -9.6, 3, 1.4);
    ctx.fillRect(1.5, -9.6, 3, 1.4);
    // 백팩
    ctx.fillStyle = '#3d4630';
    this.rrect(ctx, -6, 5, 12, 7, 2);
    ctx.fill();

    // 총 (조준 방향)
    ctx.save();
    const recoil = (h.recoil || 0) * 3;
    ctx.rotate(h.angle);
    ctx.translate(-recoil, 0);
    // 팔
    ctx.strokeStyle = '#6b7a52'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(10, -1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.lineTo(12, 2); ctx.stroke();
    // 총기
    ctx.fillStyle = '#22262a';
    ctx.fillRect(6, -2.4, 24, 4.8);
    ctx.fillStyle = '#3a4046';
    ctx.fillRect(10, -3.6, 8, 7);
    ctx.fillStyle = '#171a1d';
    ctx.fillRect(26, -1.4, 8, 2.8);
    ctx.fillStyle = '#4a525a';
    ctx.fillRect(13, 3, 3, 6);
    // 스코프
    ctx.fillStyle = '#0d1013';
    ctx.fillRect(18, -5.6, 7, 2.6);
    // 머즐 플래시
    if (h.flash > 0) {
      const f = h.flash / 0.07;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,220,120,${0.9 * f})`;
      ctx.beginPath();
      ctx.moveTo(34, 0);
      ctx.lineTo(42 + f * 9, -7 * f);
      ctx.lineTo(50 + f * 12, 0);
      ctx.lineTo(42 + f * 9, 7 * f);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,220,${0.9 * f})`;
      ctx.beginPath(); ctx.arc(35, 0, 4 + f * 3, 0, TAU); ctx.fill();
      const grd = ctx.createRadialGradient(38, 0, 2, 38, 0, 55);
      grd.addColorStop(0, `rgba(255,200,90,${0.30 * f})`);
      grd.addColorStop(1, 'rgba(255,150,40,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(38, 0, 55, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    ctx.restore();

    // 레이저 조준선
    if (g.state === 'playing' && !g.modalOpen) {
      const far = 300;
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = '#ff4a4a';
      ctx.lineWidth = 1;
      ctx.setLineDash([7, 9]);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(h.angle) * 34, y + bob + Math.sin(h.angle) * 34);
      ctx.lineTo(x + Math.cos(h.angle) * far, y + bob + Math.sin(h.angle) * far);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 재장전 표시
    if (h.reloading) {
      const p = 1 - h.reloadT / Math.max(0.001, h.reloadMax);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y - 24, 12, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#7fe7ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y - 24, 12, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
      ctx.fillStyle = '#cfe9f5';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RELOAD', x, y - 21);
      ctx.restore();
    }
  },

  /* ── projectiles & fx ───────────────────── */
  projectiles(ctx, g) {
    // 총알
    ctx.lineCap = 'round';
    for (const b of g.bullets) {
      const a = Math.min(1, b.life * 4 + 0.4);
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * 2.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = a * 0.95;
      ctx.strokeStyle = '#fffbe8';
      ctx.lineWidth = b.width;
      ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    // 적 화살
    for (const a of g.arrows) {
      const k = a.t / a.dur;
      const x = lerp(a.sx, a.tx, k), y = lerp(a.sy, a.ty, k);
      const hgt = Math.sin(k * Math.PI) * 26;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - hgt); ctx.stroke();
      ctx.strokeStyle = '#e7d9b0';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a.ang) * 6, y - hgt - Math.sin(a.ang) * 6);
      ctx.lineTo(x, y - hgt);
      ctx.stroke();
      ctx.fillStyle = '#9aa5ae';
      ctx.beginPath(); ctx.arc(x, y - hgt, 1.6, 0, TAU); ctx.fill();
    }
    // 포탄/유탄/미사일
    for (const s of g.shells) {
      const k = clamp(s.t / s.dur, 0, 1);
      const dist = Math.hypot(s.tx - s.sx, s.ty - s.sy);
      const hgt = Math.sin(k * Math.PI) * Math.min(90, dist * 0.22 + 14);
      const x = s.x, y = s.y;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y, 4, 2, 0, 0, TAU); ctx.fill();
      if (s.kind === 'missile') {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grd = ctx.createRadialGradient(x, y - hgt, 1, x, y - hgt, 15);
        grd.addColorStop(0, 'rgba(255,220,150,0.9)');
        grd.addColorStop(1, 'rgba(255,100,30,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, y - hgt, 15, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(x, y - hgt);
      ctx.rotate(Math.atan2(s.ty - s.sy, s.tx - s.sx));
      ctx.fillStyle = s.kind === 'mortar' ? '#3a3f45' : (s.kind === 'missile' ? '#c9c2b2' : '#4a5240');
      this.rrect(ctx, -5, -3, 10, 6, 2);
      ctx.fill();
      if (s.kind === 'missile') {
        ctx.fillStyle = '#ffb066';
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-12, -3); ctx.lineTo(-9, 0); ctx.lineTo(-12, 3); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  },

  particles(ctx, g) {
    const ps = g.particles;
    // 일반 파티클
    for (const p of ps) {
      const k = Math.max(0, p.life / p.maxLife);
      if (p.kind === 'smoke' || p.kind === 'dust') {
        ctx.globalAlpha = k * (p.kind === 'smoke' ? 0.55 : 0.5);
        ctx.fillStyle = p.color;
        const size = p.size + (1 - k) * (p.grow || 10);
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
      } else if (p.kind === 'blood') {
        ctx.globalAlpha = Math.min(1, k * 1.5);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.kind === 'debris' || p.kind === 'casing') {
        ctx.globalAlpha = Math.min(1, k * 1.4);
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.x + p.y) * 0.1);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      } else if (p.kind === 'ember') {
        ctx.globalAlpha = k * 0.7;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // 발광 계열
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of ps) {
      const k = Math.max(0, p.life / p.maxLife);
      if (p.kind === 'spark') {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * 0.9;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.018, p.y - p.vy * 0.018);
        ctx.stroke();
      } else if (p.kind === 'fire') {
        ctx.globalAlpha = k * 0.85;
        const size = p.size + (1 - k) * (p.grow || 16);
        const grd = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, size);
        grd.addColorStop(0, p.color);
        grd.addColorStop(1, 'rgba(255,80,0,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, TAU); ctx.fill();
      } else if (p.kind === 'glow') {
        ctx.globalAlpha = k;
        const grd = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
        grd.addColorStop(0, p.color);
        grd.addColorStop(1, 'rgba(255,200,100,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
      } else if (p.kind === 'ring') {
        const t = 1 - k;
        ctx.globalAlpha = k * 0.8;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.5, (p.width || 3) * k);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size + t * (p.grow || 60), 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  beams(ctx, g) {
    if (!g.beams.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of g.beams) {
      const k = b.life / b.maxLife;
      ctx.globalAlpha = k;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * 2.6 * k;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, b.width * 0.7 * k);
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  },

  texts(ctx, g) {
    ctx.textAlign = 'center';
    for (const t of g.texts) {
      const k = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = Math.min(1, k * 1.6);
      ctx.font = `${t.crit ? '900' : '800'} ${t.size}px 'Pretendard', system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },

  wallDamage(ctx, g) {
    const ratio = clamp(g.villageHp / g.villageMax, 0, 1);
    if (ratio > 0.86) return;
    const W = g.W, wallY = g.wallY;
    ctx.save();
    ctx.globalAlpha = (1 - ratio) * 0.7;
    ctx.strokeStyle = '#0a0a08';
    ctx.lineWidth = 2;
    const cracks = Math.round((1 - ratio) * 12);
    for (let i = 0; i < cracks; i++) {
      const x = ((i * 197) % 100) / 100 * W;
      ctx.beginPath();
      ctx.moveTo(x, wallY - 26);
      ctx.lineTo(x + ((i % 3) - 1) * 9, wallY - 12);
      ctx.lineTo(x + ((i % 5) - 2) * 7, wallY);
      ctx.stroke();
    }
    // 붉은 위험 글로우
    if (ratio < 0.35) {
      const pulse = 0.12 + 0.08 * Math.sin(g.time * 5);
      const grd = ctx.createLinearGradient(0, wallY - 60, 0, wallY + 20);
      grd.addColorStop(0, 'rgba(255,40,40,0)');
      grd.addColorStop(1, `rgba(255,40,40,${pulse})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, wallY - 60, W, 80);
    }
    ctx.restore();
  },

  buildGhost(ctx, g) {
    if (!g.buildMode) return;
    const x = g.aimX, y = g.aimY;
    ctx.save();
    if (g.buildMode === 'barricade') {
      const w = g.W < 620 ? 104 : 132;
      const ok = y >= g.H * FIELD.BUILD_MIN && y <= g.H * FIELD.BUILD_MAX && g.gold >= 55;
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = ok ? '#7ddc8a' : '#ff5d5d';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      this.rrect(ctx, clamp(x, w / 2, g.W - w / 2) - w / 2, y - 10, w, 20, 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = ok ? 'rgba(125,220,138,0.12)' : 'rgba(255,93,93,0.12)';
      ctx.fill();
    } else if (g.buildMode === 'repair') {
      ctx.strokeStyle = '#7fe7ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 24, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(127,231,255,0.12)';
      ctx.fill();
    } else if (TURRETS[g.buildMode]) {
      const def = TURRETS[g.buildMode];
      let pad = null, bd = 1e9;
      for (const p of g.pads) {
        if (p.type) continue;
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < bd) { bd = d; pad = p; }
      }
      const px = pad ? pad.x : x, py = pad ? pad.y : y;
      const ok = pad && bd < 78 * 78 && g.gold >= def.cost;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = ok ? '#7ddc8a' : '#ff5d5d';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 22, 0, TAU); ctx.stroke();
      // 사거리
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.arc(px, py, def.range, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = ok ? '#7ddc8a' : '#ff5d5d';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${def.name} 🪙${def.cost}`, px, py - 30);
    }
    if (g.skillAim) {
      const s = SKILLS[g.skillAim];
      const pulse = 0.6 + 0.4 * Math.sin(g.time * 8);
      ctx.strokeStyle = `rgba(255,140,60,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath(); ctx.arc(x, y, s.radius, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 14); ctx.stroke();
      ctx.fillStyle = 'rgba(255,140,60,0.10)';
      ctx.beginPath(); ctx.arc(x, y, s.radius, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd6a1';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${s.name} · 탭하여 발동`, x, y - s.radius - 8);
    }
    ctx.restore();
  },

  crosshair(ctx, g) {
    if (g.state !== 'playing' || g.modalOpen) return;
    const x = g.aimX, y = g.aimY;
    let over = false;
    for (const e of g.enemies) {
      if (!e.dead && Math.hypot(e.x - x, e.y - y) < e.r + 16) { over = true; break; }
    }
    const h = g.hero;
    const col = over ? '#ff5d5d' : 'rgba(235,245,255,0.85)';
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(g.time * 0.6);
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(7, 0); ctx.lineTo(13, 0);
      ctx.stroke();
    }
    ctx.rotate(-g.time * 0.6);
    ctx.beginPath(); ctx.arc(0, 0, 2, 0, TAU); ctx.fillStyle = col; ctx.fill();
    if (h.hitMark > 0) {
      ctx.globalAlpha = h.hitMark / 0.12;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-9, -9); ctx.lineTo(-4, -4);
      ctx.moveTo(9, -9); ctx.lineTo(4, -4);
      ctx.moveTo(-9, 9); ctx.lineTo(-4, 4);
      ctx.moveTo(9, 9); ctx.lineTo(4, 4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (h.killMark > 0) {
      ctx.globalAlpha = h.killMark / 0.18;
      ctx.strokeStyle = '#ff5d5d';
      ctx.lineWidth = 2.4;
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(-12, -12); ctx.lineTo(-5, -5);
      ctx.moveTo(12, -12); ctx.lineTo(5, -5);
      ctx.moveTo(-12, 12); ctx.lineTo(-5, 5);
      ctx.moveTo(12, 12); ctx.lineTo(5, 5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  },

  viewFlash(ctx, g) {
    // 발사 시 화면 하단 은은한 발광
    const a = g.hero.flash / 0.07;
    const grd = ctx.createRadialGradient(g.hero.x, g.hero.y, 10, g.hero.x, g.hero.y, 260);
    grd.addColorStop(0, `rgba(255,200,110,${0.06 * a})`);
    grd.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, g.W, g.H);
  },

  vignette(ctx, g) {
    const W = g.W, H = g.H;
    const grd = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    if (g.villageHp / g.villageMax < 0.3) {
      const pulse = 0.10 + 0.07 * Math.sin(g.time * 6);
      const red = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
      red.addColorStop(0, 'rgba(150,0,0,0)');
      red.addColorStop(1, `rgba(180,0,0,${pulse})`);
      ctx.fillStyle = red;
      ctx.fillRect(0, 0, W, H);
    }
  },

  hpBar(ctx, x, y, w, h, ratio, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2 + 0.5, y + 0.5, (w - 1) * clamp(ratio, 0, 1), Math.max(1, h - 1));
  },

  rrect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  },
};
