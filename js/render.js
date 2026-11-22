/* 현대병기 · 중세 방어전 — 아이소메트릭 렌더러 */
window.Render = (function () {
  'use strict';
  const D = window.DATA;
  const TW = D.TILE_W, TH = D.TILE_H;
  const G = window.Game;
  const S = G.S;

  let canvas, ctx, vw = 800, vh = 600, dpr = 1;
  const cam = { x: 23, y: 23, zoom: 0.85, tzoom: 0.85 };
  let ground = null, groundCtx = null, decal = null, decalCtx = null;
  let viewCv = null, viewCtx = null, viewKey = '', decalDrawn = 0;
  let shakeAmt = 0, shakeT = 0;
  const floaters = [];
  const glowCache = {};
  const buckets = [];
  const BUCKETS = 460;
  for (let i = 0; i < BUCKETS; i++) buckets.push([]);
  let staticObjs = [];
  let hoverPad = -1, selTower = null, buildType = null;
  let time = 0;

  /* ───────── 옵션 ───────── */
  function settings() {
    const s = (G.saveData && G.saveData.settings) || {};
    return {
      unitScale: s.unitScale == null ? 0.82 : s.unitScale,
      zoomBase: s.zoomBase == null ? 0.78 : s.zoomBase,
      effects: s.effects || 'normal',
      dmgNumbers: s.dmgNumbers !== false,
      shake: s.shake !== false,
      sound: s.sound !== false,
      cutscene: s.cutscene !== false,
    };
  }
  function fxDensity() { return { high: 1.35, normal: 1, low: 0.45 }[settings().effects] || 1; }

  /* ───────── 카메라 ───────── */
  function isoX(x, y, unit) {
    const z = unit ? cam.zoom : cam.zoom;
    return ((x - y) - (cam.x - cam.y)) * (TW / 2) * cam.zoom + vw / 2;
  }
  function isoY(x, y) {
    return ((x + y) - (cam.x + cam.y)) * (TH / 2) * cam.zoom + vh / 2;
  }
  function screenToWorld(px, py) {
    const a = (px - vw / 2) / ((TW / 2) * cam.zoom) + (cam.x - cam.y);
    const b = (py - vh / 2) / ((TH / 2) * cam.zoom) + (cam.x + cam.y);
    return { x: (a + b) / 2, y: (b - a) / 2 };
  }
  function worldToScreen(x, y) { return { x: isoX(x, y), y: isoY(x, y) }; }

  function clampCam() {
    cam.x = Math.max(-2, Math.min(D.MAP + 2, cam.x));
    cam.y = Math.max(-2, Math.min(D.MAP + 2, cam.y));
    cam.zoom = Math.max(0.32, Math.min(2.6, cam.zoom));
  }
  function baseZoom() {
    const s = settings();
    const mul = vw < 720 ? 0.52 : vw < 1100 ? 0.9 : 1;
    return Math.max(0.3, s.zoomBase * mul);
  }
  function setCenter(x, y) { cam.x = x; cam.y = y; clampCam(); }
  function setZoom(z, keep) {
    const prev = cam.zoom;
    cam.tzoom = Math.max(0.32, Math.min(2.6, z));
    if (!keep) cam.zoom = cam.tzoom;
  }
  function zoomAt(px, py, factor) {
    const before = screenToWorld(px, py);
    cam.zoom = Math.max(0.32, Math.min(2.6, cam.zoom * factor));
    cam.tzoom = cam.zoom;
    const after = screenToWorld(px, py);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
    clampCam();
  }
  function pan(dxPx, dyPx) {
    cam.x -= dxPx / ((TW / 2) * cam.zoom) * 0.5;
    cam.y -= dyPx / ((TH / 2) * cam.zoom) * 0.5;
    clampCam();
  }
  function shake(amount) {
    if (!settings().shake) return;
    shakeAmt = Math.min(16, shakeAmt + amount);
  }

  /* ───────── 스프라이트 헬퍼 ───────── */
  function mkCanvas(w, h, hi) {
    const k = hi || 2;
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * k); c.height = Math.ceil(h * k);
    const x = c.getContext('2d');
    x.scale(k, k);
    c._k = k;
    return { c, x };
  }
  function shade(color, f) {
    const p = hex(color);
    return 'rgb(' + Math.max(0, Math.min(255, Math.round(p[0] * f))) + ',' + Math.max(0, Math.min(255, Math.round(p[1] * f))) + ',' + Math.max(0, Math.min(255, Math.round(p[2] * f))) + ')';
  }
  function lerpColor(a, b, t) {
    const pa = hex(a), pb = hex(b);
    return 'rgb(' + Math.round(pa[0] + (pb[0] - pa[0]) * t) + ',' + Math.round(pa[1] + (pb[1] - pa[1]) * t) + ',' + Math.round(pa[2] + (pb[2] - pa[2]) * t) + ')';
  }
  function hex(h) {
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  /* 아이소 박스: (x,y) 바닥의 남쪽 꼭짓점 기준, w/h 타일 크기, 높이 px */
  function isoBox(c, x, y, w, h, height, top, left, right, outline) {
    const P = (tx, ty, tz) => [(tx - ty) * (TW / 2), (tx + ty) * (TH / 2) - tz];
    const A = P(x, y + h, 0), B = P(x + w, y + h, 0), C = P(x + w, y, 0), Dd = P(x, y, 0);
    const A2 = P(x, y + h, height), B2 = P(x + w, y + h, height), C2 = P(x + w, y, height), D2 = P(x, y, height);
    // left face (south-west)
    c.beginPath(); c.moveTo(A[0], A[1]); c.lineTo(B[0], B[1]); c.lineTo(B2[0], B2[1]); c.lineTo(A2[0], A2[1]); c.closePath();
    c.fillStyle = left; c.fill();
    // right face
    c.beginPath(); c.moveTo(B[0], B[1]); c.lineTo(C[0], C[1]); c.lineTo(C2[0], C2[1]); c.lineTo(B2[0], B2[1]); c.closePath();
    c.fillStyle = right; c.fill();
    // top
    c.beginPath(); c.moveTo(A2[0], A2[1]); c.lineTo(B2[0], B2[1]); c.lineTo(C2[0], C2[1]); c.lineTo(D2[0], D2[1]); c.closePath();
    c.fillStyle = top; c.fill();
    if (outline) { c.strokeStyle = outline; c.lineWidth = 1; c.stroke(); }
    return { A, B, C, Dd, A2, B2, C2, D2 };
  }

  /* ───────── 건물 스프라이트 ───────── */
  const buildingCache = {};
  const PB = (tx, ty, tz) => [(tx - ty) * (TW / 2), (tx + ty) * (TH / 2) - tz];

  function isoRoof(c, w, h, baseY, peak, colS, colN, colG) {
    const ins = 0.14;
    const ax = -w / 2 + ins, bx = w / 2 - ins;
    const ay = -h / 2 + ins, by = h / 2 - ins;
    let r1, r2, n1, n2, s1, s2, g1, g2;
    if (w >= h) {
      r1 = PB(ax, 0, baseY + peak); r2 = PB(bx, 0, baseY + peak);
      n1 = PB(ax, -h / 2, baseY); n2 = PB(bx, -h / 2, baseY);
      s1 = PB(ax, h / 2, baseY); s2 = PB(bx, h / 2, baseY);
      g1 = [n1, s1]; g2 = [n2, s2];
    } else {
      r1 = PB(0, ay, baseY + peak); r2 = PB(0, by, baseY + peak);
      n1 = PB(-w / 2, ay, baseY); n2 = PB(w / 2, ay, baseY);
      s1 = PB(-w / 2, by, baseY); s2 = PB(w / 2, by, baseY);
      g1 = [n1, s1]; g2 = [n2, s2];
    }
    // 북쪽 사면(뒤)
    c.beginPath();
    if (w >= h) { c.moveTo(r1[0], r1[1]); c.lineTo(r2[0], r2[1]); c.lineTo(n2[0], n2[1]); c.lineTo(n1[0], n1[1]); }
    else { c.moveTo(r1[0], r1[1]); c.lineTo(r2[0], r2[1]); c.lineTo(n2[0], n2[1]); c.lineTo(n1[0], n1[1]); }
    c.closePath(); c.fillStyle = colN; c.fill();
    // 남쪽 사면(앞)
    c.beginPath(); c.moveTo(r1[0], r1[1]); c.lineTo(r2[0], r2[1]); c.lineTo(s2[0], s2[1]); c.lineTo(s1[0], s1[1]); c.closePath();
    c.fillStyle = colS; c.fill();
    // 지붕 결
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const t = i / 5;
      if (w >= h) {
        const p1 = [r1[0] + (s1[0] - r1[0]) * t, r1[1] + (s1[1] - r1[1]) * t];
        const p2 = [r2[0] + (s2[0] - r2[0]) * t, r2[1] + (s2[1] - r2[1]) * t];
        c.beginPath(); c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.stroke();
      }
    }
    // 용마루
    c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(r1[0], r1[1]); c.lineTo(r2[0], r2[1]); c.stroke();
    // 박공
    c.beginPath(); c.moveTo(g1[0][0], g1[0][1]); c.lineTo(g1[1][0], g1[1][1]); c.lineTo(r2[0] - (r2[0] - r1[0]) * 0, r2[1]); c.closePath();
    c.fillStyle = colG; c.globalAlpha = .9; c.fill(); c.globalAlpha = 1;
  }

  function isoCone(c, cx, cy, r, baseY, height, colA, colB) {
    const N = 14;
    const apex = PB(cx, cy, baseY + height);
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      pts.push(PB(cx + Math.cos(a) * r, cy + Math.sin(a) * r, baseY));
    }
    for (let i = 0; i < N; i++) {
      const p = pts[i], q = pts[(i + 1) % N];
      c.beginPath(); c.moveTo(apex[0], apex[1]); c.lineTo(p[0], p[1]); c.lineTo(q[0], q[1]); c.closePath();
      const a0 = (i / N) * Math.PI * 2;
      const f = 0.62 + 0.42 * Math.max(0, Math.cos(a0 - 0.9));
      c.fillStyle = shade(i % 2 ? colA : colB, f); c.fill();
    }
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1;
    for (let i = 0; i < N; i += 2) {
      c.beginPath(); c.moveTo(apex[0], apex[1]); c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    }
  }

  function windowsOnFace(c, w, h, z0, z1, count, faceY, lit) {
    for (let i = 0; i < count; i++) {
      const tx = -w / 2 + (i + 0.5) * (w / count);
      const p = PB(tx, faceY, z0);
      const q = PB(tx, faceY, z1);
      c.fillStyle = '#2e2620';
      c.fillRect(p[0] - 3.5, p[1], 7, Math.max(6, q[1] - p[1]));
      if (lit) {
        c.fillStyle = 'rgba(255,196,110,' + (0.55 + Math.random() * 0.3) + ')';
        c.fillRect(p[0] - 2.4, p[1] + 1, 4.8, Math.max(3, (q[1] - p[1]) * 0.62));
      }
    }
  }

  function drawHouse(c, w, h, wallH, peak, tint) {
    const wallTop = tint || '#a89670';
    isoBox(c, -w / 2, -h / 2, w, h, wallH, wallTop, '#6f6046', '#8a7858', 'rgba(0,0,0,.22)');
    // 석축 기단
    isoBox(c, -w / 2 - 0.06, -h / 2 - 0.06, w + 0.12, h + 0.12, 7, '#7f7a6c', '#514c41', '#645f52');
    // 목재 골조 (남쪽 면)
    c.strokeStyle = 'rgba(58,38,22,.85)'; c.lineWidth = 2.4;
    for (let i = 0; i <= 3; i++) {
      const tx = -w / 2 + i * (w / 3);
      const a = PB(tx, h / 2, 6), b = PB(tx, h / 2, wallH - 2);
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    // 서쪽 면 골조
    for (let i = 0; i <= 2; i++) {
      const ty = -h / 2 + i * (h / 2);
      const a = PB(-w / 2, ty, 6), b = PB(-w / 2, ty, wallH - 2);
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
    }
    const a1 = PB(-w / 2, h / 2, 6), b1 = PB(w / 2, h / 2, wallH - 2);
    c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(b1[0], b1[1]); c.stroke();
    // 문
    const d = PB(0.1, h / 2, 0);
    c.fillStyle = '#2e1f13'; c.fillRect(d[0] - 7, d[1] - 19, 14, 19);
    c.fillStyle = '#5b4227'; c.fillRect(d[0] - 7, d[1] - 19, 14, 2.5);
    c.fillStyle = 'rgba(255,200,120,.95)'; c.fillRect(d[0] + 3, d[1] - 10, 1.8, 2.2);
    // 창
    windowsOnFace(c, w, h, wallH - 18, wallH - 7, 3, h / 2, true);
    // 지붕
    isoRoof(c, w, h, wallH, peak, '#6d4526', '#3f2814', '#54331c');
    // 굴뚝
    const ch = PB(w / 2 - 0.55, -h / 2 + 0.5, wallH + 12);
    c.fillStyle = '#57493a'; c.fillRect(ch[0] - 5, ch[1] - 30, 10, 30);
    c.fillStyle = '#6f5e4a'; c.fillRect(ch[0] - 6, ch[1] - 33, 12, 4);
    c.fillStyle = 'rgba(210,210,215,.14)';
    c.beginPath(); c.arc(ch[0] + 9, ch[1] - 42, 8, 0, 6.2832); c.fill();
    c.fillStyle = 'rgba(210,210,215,.09)';
    c.beginPath(); c.arc(ch[0] + 16, ch[1] - 54, 11, 0, 6.2832); c.fill();
  }

  function drawKeep(c, w, h) {
    // 기단
    isoBox(c, -w / 2 - 0.5, -h / 2 - 0.5, w + 1.0, h + 1.0, 9, '#7d7869', '#514d43', '#64604f', 'rgba(0,0,0,.18)');
    // 본체
    isoBox(c, -w / 2, -h / 2, w, h, 78, '#8f8a7b', '#5a564b', '#726d5e', 'rgba(0,0,0,.2)');
    // 석재 결
    c.strokeStyle = 'rgba(50,45,38,.22)'; c.lineWidth = 1;
    for (let i = 1; i < 9; i++) {
      const a = PB(-w / 2, h / 2, i * 10), b = PB(w / 2, h / 2, i * 10);
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      const a2 = PB(-w / 2, -h / 2, i * 10), b2 = PB(-w / 2, h / 2, i * 10);
      c.beginPath(); c.moveTo(a2[0], a2[1]); c.lineTo(b2[0], b2[1]); c.stroke();
    }
    // 모서리 석재(쿼인)
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const p = PB(sx * w / 2, h / 2, i * 10 + 6);
        c.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)';
        c.fillRect(p[0] - 4, p[1] - 3, 9, 4);
      }
    }
    // 창
    for (let i = 0; i < 4; i++) {
      const tx = -w / 2 + 0.55 + i * 0.85;
      for (const z of [30, 62]) {
        const p = PB(tx, h / 2, z), q = PB(tx, h / 2, z - 10);
        c.fillStyle = '#2b2520';
        c.fillRect(p[0] - 2.4, q[1], 4.8, p[1] - q[1]);
        c.fillStyle = 'rgba(255,190,90,.55)';
        c.fillRect(p[0] - 1.4, q[1] + 1, 2.8, Math.max(2, (p[1] - q[1]) * 0.5));
      }
    }
    // 현관 계단·문
    const d = PB(0, h / 2, 0);
    for (let i = 0; i < 3; i++) {
      c.fillStyle = 'rgba(120,115,102,' + (0.5 + i * 0.1) + ')';
      c.fillRect(d[0] - 16 - i * 3, d[1] - i * 3, 32 + i * 6, 3);
    }
    c.fillStyle = '#2b1e14';
    c.beginPath(); c.moveTo(d[0] - 12, d[1] - 2); c.lineTo(d[0] - 12, d[1] - 30);
    c.quadraticCurveTo(d[0], d[1] - 42, d[0] + 12, d[1] - 30); c.lineTo(d[0] + 12, d[1] - 2); c.closePath(); c.fill();
    c.strokeStyle = '#6b5540'; c.lineWidth = 2; c.stroke();
    // 대형 현수막
    for (const sx of [-0.62, 0.62]) {
      const p = PB(sx * 2.2, h / 2 + 0.02, 62);
      c.fillStyle = '#7c2029';
      c.fillRect(p[0] - 10, p[1], 20, 44);
      c.fillStyle = '#e8b73c';
      c.beginPath(); c.moveTo(p[0], p[1] + 14); c.lineTo(p[0] + 6, p[1] + 22); c.lineTo(p[0], p[1] + 30); c.lineTo(p[0] - 6, p[1] + 22); c.closePath(); c.fill();
      c.fillStyle = '#5d1720';
      c.beginPath(); c.moveTo(p[0] - 10, p[1] + 44); c.lineTo(p[0], p[1] + 37); c.lineTo(p[0] + 10, p[1] + 44); c.closePath(); c.fill();
    }
    // 버트레스
    for (const sx of [-1, 1]) {
      const p = PB(sx * (w / 2 - 0.02), h / 2 - 0.02, 0);
      c.fillStyle = 'rgba(70,65,55,.75)';
      c.fillRect(p[0] - 5, p[1] - 70, 10, 70);
      c.fillStyle = 'rgba(255,255,255,.06)';
      c.fillRect(p[0] - 5, p[1] - 70, 3, 70);
    }
    // 2층(낮은 성벽)
    isoBox(c, -w / 2 + 0.45, -h / 2 + 0.45, w - 0.9, h - 0.9, 30, '#8a8576', '#555146', '#6c6759', 'rgba(0,0,0,.15)');
    for (let i = 0; i < 7; i++) {
      const tx = -w / 2 + 0.7 + i * ((w - 1.4) / 6);
      isoBox(c, tx - 0.13, h / 2 - 0.62, 0.26, 0.26, 10, '#9a9483', '#5f5a4c', '#7a7464');
    }
    // 중앙 탑
    isoBox(c, -0.95, -0.95, 1.9, 1.9, 158, '#96917f', '#5f5b4e', '#797464', 'rgba(0,0,0,.2)');
    for (let i = 0; i < 3; i++) {
      const tx = -0.62 + i * 0.62;
      for (const z of [118, 140]) {
        const p = PB(tx, 0.95, z), q = PB(tx, 0.95, z - 8);
        c.fillStyle = '#2b2520'; c.fillRect(p[0] - 2, q[1], 4, p[1] - q[1]);
        c.fillStyle = 'rgba(255,190,90,.5)'; c.fillRect(p[0] - 1.2, q[1] + 1, 2.4, 3);
      }
    }
    // 탑 상단 총안
    for (let i = 0; i < 6; i++) {
      const tx = -1.15 + i * 0.46;
      isoBox(c, tx - 0.14, 1.14, 0.28, 0.28, 10, '#a19b89', '#645f50', '#807a69');
      isoBox(c, tx - 0.14, -1.42, 0.28, 0.28, 10, '#a19b89', '#645f50', '#807a69');
    }
    // 지붕
    isoCone(c, 0, 0, 1.2, 168, 64, '#8a4040', '#7a3838');
    // 용머리 장식
    c.strokeStyle = '#3a3a3a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -232); c.lineTo(0, -262); c.stroke();
    c.fillStyle = '#e8b73c';
    c.beginPath(); c.arc(0, -262, 3, 0, 6.2832); c.fill();
    c.fillStyle = '#c9583e';
    c.beginPath(); c.moveTo(0, -260); c.lineTo(24, -251); c.lineTo(0, -242); c.closePath(); c.fill();
    // 모서리 탑
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const tx = sx * (w / 2 - 0.05), ty = sy * (h / 2 - 0.05);
        isoBox(c, tx - 0.44, ty - 0.44, 0.88, 0.88, 104, '#9a9584', '#615c4f', '#7b7666', 'rgba(0,0,0,.18)');
        isoCone(c, tx, ty, 0.56, 104, 30, '#8a4040', '#743333');
      }
    }
    // 현수막
    for (const sx of [-1, 1]) {
      const b = PB(sx * 1.75, h / 2 + 0.02, 72);
      c.fillStyle = '#6f2029';
      c.beginPath(); c.moveTo(b[0] - 7, b[1]); c.lineTo(b[0] + 7, b[1]); c.lineTo(b[0] + 7, b[1] + 24); c.lineTo(b[0], b[1] + 18); c.lineTo(b[0] - 7, b[1] + 24); c.closePath(); c.fill();
      c.fillStyle = '#e8b73c'; c.fillRect(b[0] - 1.5, b[1] + 5, 3, 9);
    }
    // 횃불
    for (const sx of [-1, 1]) {
      const t = PB(sx * 1.0, h / 2, 40);
      c.fillStyle = 'rgba(255,190,80,.9)';
      c.beginPath(); c.arc(t[0], t[1], 6, 0, 6.2832); c.fill();
      c.fillStyle = '#ffe1a0';
      c.beginPath(); c.ellipse(t[0], t[1] - 2, 2, 4.5, 0, 0, 6.2832); c.fill();
    }
  }

  function buildingSprite(id) {
    if (buildingCache[id]) return buildingCache[id];
    const B = (S.buildings || []).find(b => b.id === id) || { w: 2, h: 2 };
    const w = B.w, h = B.h;
    const pad = 60;
    const W = (w + h) * (TW / 2) + pad * 2;
    const H = (w + h) * (TH / 2) + 330;
    const { c, x } = mkCanvas(W, H);
    const ox = W / 2, oy = H - 70;
    x.translate(ox, oy);
    // 그림자
    x.beginPath(); x.ellipse(0, 4, (w + h) * 12, (w + h) * 6, 0, 0, 6.2832);
    x.fillStyle = 'rgba(0,0,0,.28)'; x.fill();
    if (id === 'keep') drawKeep(x, w, h);
    else if (id === 'forge') {
      isoBox(x, -w / 2, -h / 2, w, h, 40, '#8d7a5f', '#5f5142', '#75664f', 'rgba(0,0,0,.18)');
      // 석재 결
      x.strokeStyle = 'rgba(50,40,30,.3)'; x.lineWidth = 1;
      for (let i = 1; i < 4; i++) { const a = PB(-w / 2, h / 2, i * 9), b = PB(w / 2, h / 2, i * 9); x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); }
      isoRoof(x, w, h, 40, 20, '#5d4632', '#3f2f21', '#4f3b29');
      // 굴뚝
      const ch = PB(-w / 2 + 0.4, -h / 2 + 0.4, 54);
      x.fillStyle = '#4a4038'; x.fillRect(ch[0] - 5, ch[1] - 46, 10, 70);
      x.fillStyle = 'rgba(255,140,50,.55)';
      x.beginPath(); x.arc(ch[0], ch[1] - 46, 12, 0, 6.2832); x.fill();
      // 화로 불빛
      const d = PB(0, h / 2, 8);
      const g = x.createRadialGradient(d[0], d[1], 2, d[0], d[1], 26);
      g.addColorStop(0, 'rgba(255,170,60,.75)'); g.addColorStop(1, 'rgba(255,80,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(d[0], d[1], 26, 0, 6.2832); x.fill();
      x.fillStyle = '#2b211a'; x.fillRect(d[0] - 9, d[1] - 16, 18, 16);
      x.fillStyle = '#ffcf7a'; x.fillRect(d[0] - 6, d[1] - 9, 12, 5);
      // 모루
      const an = PB(w / 2 + 0.5, h / 2 + 0.3, 0);
      x.fillStyle = '#3a4048'; x.fillRect(an[0] - 9, an[1] - 14, 18, 8); x.fillRect(an[0] - 4, an[1] - 6, 8, 8);
    } else if (id === 'chapel') {
      isoBox(x, -w / 2, -h / 2, w, h, 34, '#b2ab9a', '#847d6e', '#9a9382', 'rgba(0,0,0,.16)');
      isoRoof(x, w, h, 34, 26, '#55606c', '#3b444e', '#4a545f');
      // 종탑
      isoBox(x, -0.5, -0.5, 1.0, 1.0, 82, '#bdb6a3', '#8b8474', '#a39c8b', 'rgba(0,0,0,.18)');
      isoCone(x, 0, 0, 0.72, 82, 40, '#55606c', '#3b444e');
      x.strokeStyle = '#d9c98f'; x.lineWidth = 2.4;
      const cr = PB(0, 0, 124);
      x.beginPath(); x.moveTo(cr[0], cr[1]); x.lineTo(cr[0], cr[1] - 12); x.moveTo(cr[0] - 5, cr[1] - 7); x.lineTo(cr[0] + 5, cr[1] - 7); x.stroke();
      // 창(스테인드글라스)
      const d = PB(0, h / 2, 16);
      x.fillStyle = '#3a2a30'; x.fillRect(d[0] - 4, d[1] - 20, 8, 14);
      x.fillStyle = 'rgba(160,120,255,.55)'; x.fillRect(d[0] - 3, d[1] - 19, 6, 12);
    } else if (id === 'market') {
      // 노점 2개
      for (let i = 0; i < 2; i++) {
        const bx = -0.55 + i * 1.1;
        const p = PB(bx, 0.3, 0);
        x.fillStyle = '#5c4530'; x.fillRect(p[0] - 16, p[1] - 26, 32, 4);
        x.fillStyle = '#7a5c3d'; x.fillRect(p[0] - 14, p[1] - 24, 2, 24); x.fillRect(p[0] + 12, p[1] - 24, 2, 24);
        // 천막
        x.fillStyle = i ? '#a8452f' : '#b58b3a';
        x.beginPath(); x.moveTo(p[0] - 20, p[1] - 26); x.lineTo(p[0], p[1] - 42); x.lineTo(p[0] + 20, p[1] - 26); x.closePath(); x.fill();
        x.fillStyle = 'rgba(255,255,255,.16)';
        x.beginPath(); x.moveTo(p[0] - 20, p[1] - 26); x.lineTo(p[0] - 6, p[1] - 26); x.lineTo(p[0] - 6, p[1] - 35); x.closePath(); x.fill();
        // 상품
        x.fillStyle = '#cf7c3a'; x.beginPath(); x.arc(p[0] - 6, p[1] - 6, 4, 0, 6.2832); x.fill();
        x.fillStyle = '#8fae52'; x.beginPath(); x.arc(p[0] + 5, p[1] - 6, 3.6, 0, 6.2832); x.fill();
      }
      x.fillStyle = '#6b5334'; x.fillRect(-8, -3, 18, 6);
    } else if (id === 'warehouse') {
      drawHouse(x, w, h, 42, 28, '#9c8a68');
      // 큰 문
      const d = PB(0, h / 2, 8);
      x.fillStyle = '#4a3320'; x.fillRect(d[0] - 12, d[1] - 22, 24, 22);
      x.strokeStyle = '#2e1f13'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(d[0], d[1] - 22); x.lineTo(d[0], d[1]); x.stroke();
      // 상자·자루
      for (let i = 0; i < 3; i++) {
        const c1 = PB(-w / 2 - 0.3, h / 2 - 0.2 + i * 0.35, 0);
        x.fillStyle = i % 2 ? '#8a6a3e' : '#6f5330';
        x.fillRect(c1[0] - 5, c1[1] - 9, 10, 9);
      }
    } else if (id === 'well') {
      x.beginPath(); x.ellipse(0, 0, 22, 11, 0, 0, 6.2832); x.fillStyle = '#6b675c'; x.fill();
      x.beginPath(); x.ellipse(0, -6, 18, 9, 0, 0, 6.2832); x.fillStyle = '#3b5b63'; x.fill();
      x.strokeStyle = '#8b8578'; x.lineWidth = 4;
      x.beginPath(); x.ellipse(0, -2, 21, 10, 0, 0, 6.2832); x.stroke();
      x.fillStyle = '#6b5334'; x.fillRect(-16, -34, 3, 32); x.fillRect(13, -34, 3, 32);
      x.fillStyle = '#7a5c3d'; x.beginPath(); x.moveTo(-22, -34); x.lineTo(0, -46); x.lineTo(22, -34); x.closePath(); x.fill();
      x.strokeStyle = '#4a3a28'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(0, -34); x.lineTo(0, -12); x.stroke();
    } else {
      drawHouse(x, w, h, 40, 34);
    }
    const spr = { c: c, ox: ox, oy: oy, w: W, h: H };
    buildingCache[id] = spr;
    return spr;
  }

  /* ───────── 성벽 ───────── */
  const wallCache = {};
  function wallSprite(side, dmg) {
    const key = side + dmg;
    if (wallCache[key]) return wallCache[key];
    const { c, x } = mkCanvas(230, 170);
    x.translate(115, 128);
    const hgt = dmg === 2 ? 9 : dmg === 1 ? 20 : 28;
    const along = (side === 'N' || side === 'S');
    const bw = along ? 2 : 0.46, bh = along ? 0.46 : 2;
    isoBox(x, -bw / 2, -bh / 2, bw, bh, hgt, dmg === 2 ? '#5f5b50' : '#797466', dmg === 2 ? '#3e3a33' : '#4a463d', dmg === 2 ? '#4f4a40' : '#5d584c');
    if (dmg < 2) {
      x.strokeStyle = 'rgba(40,36,30,.28)'; x.lineWidth = 1;
      for (let z = 7; z < hgt; z += 8) {
        const a = along ? PB(-1, 0.23, z) : PB(0.23, -1, z);
        const b2 = along ? PB(1, 0.23, z) : PB(0.23, 1, z);
        x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b2[0], b2[1]); x.stroke();
        const a3 = along ? PB(-1, -0.23, z) : PB(-0.23, -1, z);
        const b3 = along ? PB(1, -0.23, z) : PB(-0.23, 1, z);
        x.beginPath(); x.moveTo(a3[0], a3[1]); x.lineTo(b3[0], b3[1]); x.stroke();
      }
      for (let i = 0; i < 7; i++) {
        const t = -1 + i * 0.3;
        const p = along ? PB(t, 0.23, 0) : PB(0.23, t, 0);
        const q = along ? PB(t, 0.23, hgt) : PB(0.23, t, hgt);
        x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]); x.stroke();
      }
      x.fillStyle = 'rgba(70,92,58,.22)';
      x.beginPath(); x.ellipse(-14, -3, 22, 7, 0, 0, 6.2832); x.fill();
      x.fillStyle = 'rgba(30,26,20,.16)';
      x.beginPath(); x.ellipse(24, -5, 26, 8, 0, 0, 6.2832); x.fill();
      const n = 4;
      for (let i = 0; i < n; i++) {
        const t = -bw / 2 + 0.16 + i * (bw - 0.32) / (n - 1);
        if (along) isoBox(x, t - 0.1, -0.19, 0.2, 0.38, hgt + 6, '#847e6e', '#514d42', '#666153');
        else isoBox(x, -0.19, t - 0.1, 0.38, 0.2, hgt + 6, '#847e6e', '#514d42', '#666153');
      }
      if (dmg === 1) {
        x.strokeStyle = 'rgba(30,25,20,.6)'; x.lineWidth = 1.6;
        x.beginPath(); x.moveTo(-24, 0); x.lineTo(-16, -12); x.lineTo(-22, -19); x.stroke();
        x.beginPath(); x.moveTo(16, 0); x.lineTo(10, -9); x.stroke();
        x.fillStyle = 'rgba(40,35,28,.45)'; x.fillRect(-8, -6, 10, 6);
      }
    } else {
      x.fillStyle = '#46413a';
      for (let i = 0; i < 5; i++) x.fillRect(-50 + i * 22, -6 - (i % 3) * 3, 12, 7);
    }
    wallCache[key] = { c: c, ox: 115, oy: 128 };
    return wallCache[key];
  }

  const gateCache = {};
  function gateSprite(dmg) {
    if (gateCache[dmg]) return gateCache[dmg];
    const { c, x } = mkCanvas(260, 260);
    x.translate(130, 210);
    const hgt = dmg === 2 ? 20 : dmg === 1 ? 48 : 62;
    isoBox(x, -1.2, -0.55, 2.4, 1.1, hgt, dmg === 2 ? '#6e695d' : '#8e8877', '#5a554a', dmg === 2 ? '#5b564b' : '#76705f', 'rgba(0,0,0,.18)');
    if (dmg < 2) {
      // 아치
      x.fillStyle = '#2f241b';
      x.beginPath(); x.moveTo(-18, 0); x.lineTo(-18, -34); x.quadraticCurveTo(0, -54, 18, -34); x.lineTo(18, 0); x.closePath(); x.fill();
      x.strokeStyle = '#6b6557'; x.lineWidth = 3; x.stroke();
      // 문
      x.fillStyle = '#4a3524'; x.fillRect(-16, -34, 32, 34);
      x.strokeStyle = '#2b1d12'; x.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-16 + i * 9, -34); x.lineTo(-16 + i * 9, 0); x.stroke(); }
    }
    // 탑
    for (const sx of [-1, 1]) {
      isoBox(x, sx * 0.95 - 0.35, -0.35, 0.7, 0.7, hgt + 20, '#a19a87', '#6c675a', '#87816f', 'rgba(0,0,0,.18)');
      if (dmg < 2) {
        isoCone(x, sx * 0.95, 0, 0.5, hgt + 20, 26, '#7c3a3a', '#5d2b2b');
        x.strokeStyle = '#3a3a3a'; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(sx * 30, -96); x.lineTo(sx * 30, -116); x.stroke();
        x.fillStyle = '#c9583e';
        x.beginPath(); x.moveTo(sx * 30, -116); x.lineTo(sx * 30 + 14, -110); x.lineTo(sx * 30, -103); x.closePath(); x.fill();
      }
    }
    gateCache[dmg] = { c: c, ox: 130, oy: 210 };
    return gateCache[dmg];
  }

  /* ───────── 나무·바위 ───────── */
  /* ───────── 나무·바위 ───────── */
  const propCache = {};
  function propSprite(type) {
    if (propCache[type]) return propCache[type];
    const { c, x } = mkCanvas(90, 130);
    x.translate(45, 108);
    if (type === 'rock') {
      x.fillStyle = '#6b6f72';
      x.beginPath(); x.moveTo(-16, 0); x.lineTo(-10, -16); x.lineTo(6, -20); x.lineTo(18, -6); x.lineTo(12, 0); x.closePath(); x.fill();
      x.fillStyle = '#8b9095';
      x.beginPath(); x.moveTo(-10, -16); x.lineTo(6, -20); x.lineTo(10, -12); x.lineTo(-6, -8); x.closePath(); x.fill();
    } else if (type === 'tree2') {
      x.fillStyle = '#4a3728'; x.fillRect(-3, -22, 6, 22);
      x.fillStyle = '#2f5a3a';
      x.beginPath(); x.arc(0, -36, 18, 0, 6.2832); x.fill();
      x.fillStyle = '#3c7048';
      x.beginPath(); x.arc(-6, -42, 12, 0, 6.2832); x.fill();
      x.fillStyle = '#4d8a58';
      x.beginPath(); x.arc(7, -44, 9, 0, 6.2832); x.fill();
    } else if (type === 'barrel') {
      x.fillStyle = '#6b4a2c';
      x.beginPath(); x.ellipse(0, -6, 8, 10, 0, 0, 6.2832); x.fill();
      x.fillStyle = '#8a6136';
      x.beginPath(); x.ellipse(0, -7, 6.5, 8, 0, 0, 6.2832); x.fill();
      x.strokeStyle = '#3f3a32'; x.lineWidth = 1.5;
      x.beginPath(); x.ellipse(0, -4, 8, 10, 0, 0, 6.2832); x.stroke();
    } else if (type === 'crate') {
      x.fillStyle = '#7a5b36'; x.fillRect(-10, -18, 20, 18);
      x.strokeStyle = '#4e3a22'; x.lineWidth = 1.6; x.strokeRect(-10, -18, 20, 18);
      x.beginPath(); x.moveTo(-10, -18); x.lineTo(10, 0); x.moveTo(10, -18); x.lineTo(-10, 0); x.stroke();
    } else if (type === 'cart') {
      x.fillStyle = '#6b4e2e'; x.fillRect(-16, -18, 30, 10);
      x.fillStyle = '#8a6a3e'; x.fillRect(-16, -20, 30, 3);
      x.fillStyle = '#3a2c1c';
      x.beginPath(); x.arc(-10, -3, 6, 0, 6.2832); x.fill();
      x.beginPath(); x.arc(10, -3, 6, 0, 6.2832); x.fill();
      x.strokeStyle = '#8a7a60'; x.lineWidth = 1.4;
      x.beginPath(); x.arc(-10, -3, 4, 0, 6.2832); x.stroke(); x.beginPath(); x.arc(10, -3, 4, 0, 6.2832); x.stroke();
      x.strokeStyle = '#5a4028'; x.lineWidth = 2; x.beginPath(); x.moveTo(14, -16); x.lineTo(24, -22); x.stroke();
    } else if (type === 'hay') {
      x.fillStyle = '#b08a3e';
      x.beginPath(); x.ellipse(0, -9, 15, 11, 0, 0, 6.2832); x.fill();
      x.fillStyle = '#c9a253';
      x.beginPath(); x.ellipse(-3, -12, 10, 7, 0, 0, 6.2832); x.fill();
      x.strokeStyle = 'rgba(90,65,25,.5)'; x.lineWidth = 1;
      for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(-12 + i * 5, -16); x.lineTo(-8 + i * 5, -2); x.stroke(); }
    } else if (type === 'torch') {
      x.fillStyle = '#4a3a28'; x.fillRect(-2, -34, 4, 34);
      x.fillStyle = '#5f4a30'; x.fillRect(-6, -38, 12, 5);
      x.fillStyle = 'rgba(255,170,60,.9)';
      x.beginPath(); x.ellipse(0, -44, 4, 8, 0, 0, 6.2832); x.fill();
      x.fillStyle = '#ffe1a0';
      x.beginPath(); x.ellipse(0, -45, 2, 5, 0, 0, 6.2832); x.fill();
    } else {
      x.fillStyle = '#3b2c20'; x.fillRect(-2.5, -18, 5, 18);
      for (let i = 0; i < 3; i++) {
        x.fillStyle = i === 0 ? '#24463a' : i === 1 ? '#2d5644' : '#376a52';
        const yy = -20 - i * 14;
        x.beginPath(); x.moveTo(-16 + i * 2, yy); x.lineTo(0, yy - 24); x.lineTo(16 - i * 2, yy); x.closePath(); x.fill();
      }
    }
    propCache[type] = { c: c, ox: 45, oy: 108 };
    return propCache[type];
  }

  /* ───────── 적 스프라이트 ───────── */
  const enemyCache = {};
  function enemySprite(type, frame, flash) {
    const key = type + '_' + frame + (flash ? '_f' : '');
    if (enemyCache[key]) return enemyCache[key];
    const def = D.ENEMIES[type];
    const { c, x } = mkCanvas(70, 80, 1);
    x.translate(35, 66);
    // 그림자(스프라이트에 포함)
    x.beginPath(); x.ellipse(0, 1, 9, 4, 0, 0, 6.2832);
    x.fillStyle = 'rgba(0,0,0,.32)'; x.fill();
    const bob = frame === 1 ? 1.5 : 0;
    const step = frame === 1 ? 3 : -3;
    const DARK = flash ? '#ffffff' : null;
    const col = (v) => flash ? '#ffffff' : v;
    const outline = flash ? 'rgba(255,255,255,0)' : 'rgba(0,0,0,.55)';
    if (!flash) { x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 2; x.shadowOffsetY = 0.6; }
    x.lineJoin = 'round';
    function leg(xx, sw) {
      x.strokeStyle = col('#3a2f28'); x.lineWidth = 3.4;
      x.beginPath(); x.moveTo(xx, -12); x.lineTo(xx + sw, -1); x.stroke();
    }
    function head(xx, yy, r, skin, helm) {
      x.fillStyle = col(skin);
      x.beginPath(); x.arc(xx, yy, r, 0, 6.2832); x.fill();
      if (helm) { x.fillStyle = col(helm); x.beginPath(); x.arc(xx, yy - 1.5, r + 0.8, Math.PI, 0); x.fill(); }
    }
    if (def.kind === 'horse') {
      // 말 몸통
      x.fillStyle = col('#5b4436');
      x.beginPath(); x.ellipse(0, -14, 16, 9, 0, 0, 6.2832); x.fill();
      x.strokeStyle = col('#3a2b22'); x.lineWidth = 3;
      x.beginPath(); x.moveTo(-9, -8); x.lineTo(-11 + step, -1); x.moveTo(8, -8); x.lineTo(10 - step, -1); x.stroke();
      // 목·머리
      x.fillStyle = col('#5b4436');
      x.beginPath(); x.moveTo(12, -20); x.lineTo(20, -28); x.lineTo(24, -24); x.lineTo(16, -12); x.closePath(); x.fill();
      // 기수
      x.fillStyle = col('#7d2f2f');
      x.beginPath(); x.ellipse(0, -28, 6, 9, 0, 0, 6.2832); x.fill();
      head(0, -40, 4.5, '#d9b08c', '#8d99a6');
      x.strokeStyle = col('#c9c9c9'); x.lineWidth = 2;
      x.beginPath(); x.moveTo(8, -26); x.lineTo(28, -34); x.stroke();
    } else if (def.kind === 'ram') {
      x.fillStyle = col('#4a3a28'); x.fillRect(-16, -22, 34, 14);
      x.fillStyle = col('#6b5334');
      x.beginPath(); x.moveTo(-20, -22); x.lineTo(-10, -34); x.lineTo(20, -34); x.lineTo(26, -22); x.closePath(); x.fill();
      x.fillStyle = col('#8e949a');
      x.fillRect(-20, -20, 6, 10); x.fillRect(20, -20, 8, 10);
      x.fillStyle = col('#3a2f25');
      x.beginPath(); x.arc(-10, -5, 5, 0, 6.2832); x.fill();
      x.beginPath(); x.arc(12, -5, 5, 0, 6.2832); x.fill();
      x.strokeStyle = col('#2b2118'); x.lineWidth = 3;
      x.beginPath(); x.moveTo(-14, -18); x.lineTo(-24, -30); x.moveTo(12, -18); x.lineTo(22, -30); x.stroke();
    } else if (def.kind === 'catapult') {
      x.fillStyle = col('#5c4a33'); x.fillRect(-18, -12, 36, 10);
      x.fillStyle = col('#6f5a3d');
      x.beginPath(); x.moveTo(-18, -12); x.lineTo(-22, -4); x.lineTo(22, -4); x.lineTo(18, -12); x.closePath(); x.fill();
      x.strokeStyle = col('#3e3024'); x.lineWidth = 4;
      x.beginPath(); x.moveTo(-10, -12); x.lineTo(-4, -40); x.lineTo(12, -34); x.stroke();
      x.fillStyle = col('#3a2f25');
      x.beginPath(); x.arc(-14, -3, 4, 0, 6.2832); x.fill();
      x.beginPath(); x.arc(14, -3, 4, 0, 6.2832); x.fill();
      x.fillStyle = col('#8b8b8b');
      x.beginPath(); x.arc(13, -36, 4, 0, 6.2832); x.fill();
    } else if (def.kind === 'siege') {
      x.fillStyle = col('#5b4a33'); x.fillRect(-18, -52, 36, 44);
      x.fillStyle = col('#6f5a3d');
      x.beginPath(); x.moveTo(-18, -52); x.lineTo(-26, -40); x.lineTo(26, -40); x.lineTo(18, -52); x.closePath(); x.fill();
      x.fillStyle = col('#3a2f25');
      x.beginPath(); x.arc(-12, -4, 5, 0, 6.2832); x.fill();
      x.beginPath(); x.arc(12, -4, 5, 0, 6.2832); x.fill();
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(-9, -32, 18, 14);
      x.strokeStyle = col('#3a2f25'); x.lineWidth = 2;
      for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(-18, -48 + i * 10); x.lineTo(18, -48 + i * 10); x.stroke(); }
    } else if (def.kind === 'knight' || def.kind === 'lord') {
      const sc = def.kind === 'lord' ? 1.35 : 1;
      x.scale(sc, sc);
      // 망토
      x.fillStyle = col(def.kind === 'lord' ? '#6b1322' : '#3f4a5a');
      x.beginPath(); x.moveTo(-9, -30); x.lineTo(-14, -4); x.lineTo(2, -8); x.closePath(); x.fill();
      x.fillStyle = col('#aab6c3');
      x.fillRect(-7, -26 + bob, 14, 16);
      head(0, -34 + bob, 5.4, '#d9b08c', '#9aa7b5');
      x.fillStyle = col('#5d6a78'); x.fillRect(-1, -36 + bob, 2, 8);
      x.strokeStyle = col('#dbe3ec'); x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(7, -20); x.lineTo(16, -32); x.stroke();
      if (def.kind === 'lord') {
        x.fillStyle = col('#e8b73c');
        x.beginPath(); x.moveTo(-6, -41); x.lineTo(-3, -48); x.lineTo(0, -42); x.lineTo(3, -48); x.lineTo(6, -41); x.closePath(); x.fill();
      }
      x.fillStyle = col('#2a2f36');
      x.fillRect(-6, -10, 4, 10); x.fillRect(2, -10, 4, 10);
    } else {
      // 보병 공통
      const bodyCol = def.cloth || '#8a7350';
      leg(-4, step); leg(4, -step);
      x.fillStyle = col(bodyCol);
      x.beginPath(); x.moveTo(-7, -24 + bob); x.lineTo(7, -24 + bob); x.lineTo(6, -11); x.lineTo(-6, -11); x.closePath(); x.fill();
      x.strokeStyle = outline; x.lineWidth = 1; x.stroke();
      head(0, -31 + bob, 5.2, '#d9b08c', def.kind === 'spear' ? '#8d99a6' : null);
      // 무기
      if (def.kind === 'spear') {
        x.strokeStyle = col('#6b5334'); x.lineWidth = 2;
        x.beginPath(); x.moveTo(9, -14); x.lineTo(16, -44); x.stroke();
        x.fillStyle = col('#c9d2da');
        x.beginPath(); x.moveTo(16, -44); x.lineTo(13.5, -36); x.lineTo(18.5, -36); x.closePath(); x.fill();
      } else if (def.kind === 'shield') {
        x.fillStyle = col('#8a6a42');
        x.beginPath(); x.ellipse(8, -19, 6, 9, 0, 0, 6.2832); x.fill();
        x.strokeStyle = col('#c9b27a'); x.lineWidth = 1.5; x.stroke();
        x.strokeStyle = col('#5c4a33'); x.lineWidth = 2;
        x.beginPath(); x.moveTo(6, -22); x.lineTo(6, -15); x.stroke();
      } else if (def.kind === 'bow') {
        x.strokeStyle = col('#6b5334'); x.lineWidth = 2;
        x.beginPath(); x.arc(10, -26, 10, -1.1, 1.1); x.stroke();
        x.strokeStyle = col('#d8d2c0'); x.lineWidth = 1;
        x.beginPath(); x.moveTo(14, -35); x.lineTo(14, -17); x.stroke();
      } else if (def.kind === 'axe') {
        x.strokeStyle = col('#5a4028'); x.lineWidth = 2.4;
        x.beginPath(); x.moveTo(9, -12); x.lineTo(15, -34); x.stroke();
        x.fillStyle = col('#b0b7be');
        x.beginPath(); x.moveTo(15, -34); x.lineTo(22, -32); x.lineTo(18, -26); x.closePath(); x.fill();
      } else {
        // 농민병 낫
        x.strokeStyle = col('#8a8f96'); x.lineWidth = 2;
        x.beginPath(); x.moveTo(8, -16); x.lineTo(12, -30); x.quadraticCurveTo(19, -34, 16, -26); x.stroke();
      }
    }
    x.restore && x.restore();
    const spr = { c: c, ox: 35, oy: 66 };
    enemyCache[key] = spr;
    return spr;
  }

  /* ───────── 포탑 스프라이트 ───────── */
  const towerCache = {};
  function towerSprite(type, tier) {
    const key = type + '_' + tier;
    if (towerCache[key]) return towerCache[key];
    const { c, x } = mkCanvas(150, 170);
    x.translate(75, 128);
    // 기단
    x.beginPath(); x.ellipse(0, 0, 34, 17, 0, 0, 6.2832);
    x.fillStyle = 'rgba(0,0,0,.25)'; x.fill();
    x.beginPath(); x.ellipse(0, -8, 32, 16, 0, 0, 6.2832);
    x.fillStyle = '#4a4f52'; x.fill();
    x.beginPath(); x.ellipse(0, -12, 27, 13, 0, 0, 6.2832);
    x.fillStyle = '#666c70'; x.fill();
    // 모래주머니
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * 6.2832;
      x.fillStyle = i % 2 ? '#7d755c' : '#8a8167';
      x.beginPath(); x.ellipse(Math.cos(a) * 26, -6 + Math.sin(a) * 12, 6, 4, 0, 0, 6.2832); x.fill();
    }
    const metal = tier === 0 ? '#5f6b72' : tier === 1 ? '#6b7d86' : '#7d8f97';
    const dark = '#2f383d';
    const accent = tier === 2 ? '#d08a3a' : '#4c5b64';
    // 유형별 실루엣
    if (type === 'mortar') {
      x.fillStyle = metal; x.beginPath(); x.ellipse(0, -18, 16, 8, 0, 0, 6.2832); x.fill();
      x.fillStyle = dark; x.beginPath(); x.arc(0, -18, 8, 0, 6.2832); x.fill();
      x.save(); x.translate(2, -24); x.rotate(-0.9);
      x.fillStyle = '#3f4a50'; x.fillRect(-4, -30, 8, 34);
      x.fillStyle = '#59666d'; x.fillRect(-4, -30, 3, 34);
      x.restore();
    } else if (type === 'howitzer') {
      x.fillStyle = metal; x.fillRect(-22, -30, 44, 16);
      x.fillStyle = dark; x.beginPath(); x.arc(-16, -8, 8, 0, 6.2832); x.fill();
      x.beginPath(); x.arc(16, -8, 8, 0, 6.2832); x.fill();
      x.fillStyle = accent; x.fillRect(-20, -28, 40, 4);
      x.save(); x.translate(0, -32); x.rotate(-0.5);
      x.fillStyle = '#454f55'; x.fillRect(-5, -52, 10, 56);
      x.fillStyle = '#5b686f'; x.fillRect(-5, -52, 4, 56);
      x.restore();
    } else if (type === 'missile') {
      x.fillStyle = metal; x.fillRect(-24, -40, 48, 30);
      x.fillStyle = dark; x.fillRect(-21, -37, 42, 24);
      for (let i = 0; i < 4; i++) {
        const cx = -15 + (i % 2) * 30, cy = -32 + Math.floor(i / 2) * 14;
        x.fillStyle = '#c8d2d8'; x.beginPath(); x.arc(cx, cy, 5, 0, 6.2832); x.fill();
        x.fillStyle = '#8f3b32'; x.beginPath(); x.arc(cx, cy, 2, 0, 6.2832); x.fill();
      }
      x.fillStyle = accent; x.fillRect(-24, -44, 48, 4);
    } else if (type === 'laser') {
      x.fillStyle = metal; x.fillRect(-10, -46, 20, 34);
      x.fillStyle = dark; x.fillRect(-8, -44, 16, 12);
      x.fillStyle = '#6fd0ff';
      x.beginPath(); x.arc(0, -48, 9, 0, 6.2832); x.fill();
      x.fillStyle = 'rgba(255,255,255,.85)';
      x.beginPath(); x.arc(0, -48, 4, 0, 6.2832); x.fill();
      x.strokeStyle = '#4aa8d8'; x.lineWidth = 2;
      x.beginPath(); x.arc(0, -48, 13, 0, 6.2832); x.stroke();
    } else if (type === 'rail') {
      x.fillStyle = metal; x.fillRect(-12, -40, 24, 30);
      x.fillStyle = '#3c464c'; x.fillRect(-26, -54, 52, 8);
      x.fillStyle = '#8fe0ff'; x.fillRect(-24, -52, 48, 3);
      x.fillStyle = accent; x.fillRect(-14, -44, 28, 4);
      for (let i = 0; i < 3; i++) {
        x.fillStyle = '#7fd8ff';
        x.fillRect(-18 + i * 16, -50, 3, 3);
      }
    } else if (type === 'emp') {
      x.fillStyle = metal; x.fillRect(-5, -40, 10, 28);
      x.strokeStyle = '#8fe8ff'; x.lineWidth = 2;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.ellipse(0, -44 - i * 8, 14 + i * 4, 5, 0, 0, 6.2832); x.stroke(); }
      x.fillStyle = '#8fe8ff'; x.beginPath(); x.arc(0, -42, 5, 0, 6.2832); x.fill();
    } else if (type === 'tesla') {
      x.fillStyle = metal; x.fillRect(-12, -34, 24, 22);
      x.strokeStyle = '#b7a4e8'; x.lineWidth = 3;
      for (let i = 0; i < 4; i++) x.strokeRect(-10 + i * 1.5, -38 - i * 8, 20 - i * 3, 6);
      x.fillStyle = '#c8b6ff';
      x.beginPath(); x.arc(0, -70, 7, 0, 6.2832); x.fill();
      x.fillStyle = 'rgba(200,180,255,.45)';
      x.beginPath(); x.arc(0, -70, 13, 0, 6.2832); x.fill();
    } else if (type === 'cryo') {
      x.fillStyle = '#4a5a63'; x.fillRect(-22, -36, 20, 26); x.fillRect(2, -36, 20, 26);
      x.fillStyle = '#9fe6ff'; x.fillRect(-20, -34, 16, 20); x.fillRect(4, -34, 16, 20);
      x.fillStyle = '#5e7681'; x.fillRect(-8, -24, 16, 12);
      x.strokeStyle = '#bfeeff'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(0, -24); x.lineTo(0, -44); x.stroke();
    } else if (type === 'grenade') {
      x.fillStyle = metal; x.fillRect(-16, -38, 32, 22);
      x.fillStyle = dark; x.beginPath(); x.arc(0, -40, 9, 0, 6.2832); x.fill();
      x.fillStyle = accent; x.fillRect(-14, -36, 28, 4);
    } else if (type === 'sniper') {
      x.fillStyle = metal; x.fillRect(-10, -30, 20, 18);
      x.fillStyle = dark; x.fillRect(-3, -34, 6, 8);
      x.fillStyle = '#3d4a50'; x.fillRect(-2, -52, 4, 24);
      x.fillStyle = '#8fe0ff'; x.fillRect(-4, -58, 8, 4);
    } else if (type === 'flamer') {
      x.fillStyle = '#6b3a2a'; x.fillRect(-22, -34, 18, 28); x.fillRect(4, -34, 18, 28);
      x.fillStyle = '#a85a3a'; x.fillRect(-20, -32, 14, 22); x.fillRect(6, -32, 14, 22);
      x.fillStyle = metal; x.fillRect(-6, -28, 12, 16);
      x.fillStyle = '#d08a3a'; x.fillRect(-26, -40, 52, 5);
    } else {
      // 개틀링 · 중기관총
      x.fillStyle = metal; x.fillRect(-14, -30, 28, 18);
      x.fillStyle = dark; x.beginPath(); x.arc(0, -30, 8, 0, 6.2832); x.fill();
      x.fillStyle = accent; x.fillRect(-12, -27, 24, 3);
      if (type === 'gatling') {
        x.fillStyle = '#4b565c'; x.fillRect(-3, -46, 6, 18);
        x.fillStyle = '#2f383d'; x.fillRect(-8, -46, 16, 4);
      } else {
        x.fillStyle = '#3d4a50'; x.fillRect(-26, -34, 52, 4);
      }
    }
    x.restore && x.restore();
    towerCache[key] = { c: c, ox: 75, oy: 128 };
    return towerCache[key];
  }

  /* ───────── 바닥 ───────── */
  function buildGround() {
    const W = (D.MAP) * TW, H = (D.MAP) * TH;
    ground = document.createElement('canvas');
    ground.width = W; ground.height = H;
    const c = ground.getContext('2d');
    // 잔디
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2b3d2e'); g.addColorStop(0.5, '#314630'); g.addColorStop(1, '#27392b');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // 타イル
    let seed = 99;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    for (let y = 0; y < D.MAP; y++) {
      for (let x = 0; x < D.MAP; x++) {
        const px = (x - y) * TW / 2 + W / 2 - TW / 2;
        const py = (x + y) * TH / 2;
        const v = rnd();
        c.fillStyle = v < 0.5 ? 'rgba(255,255,255,.012)' : v < 0.8 ? 'rgba(0,0,0,.028)' : 'rgba(120,160,90,.04)';
        c.beginPath();
        c.moveTo(px + TW / 2, py); c.lineTo(px + TW, py + TH / 2); c.lineTo(px + TW / 2, py + TH); c.lineTo(px, py + TH / 2);
        c.closePath(); c.fill();
        if (v > 0.93) {
          c.strokeStyle = 'rgba(150,180,120,.16)'; c.lineWidth = 1;
          for (let k = 0; k < 3; k++) {
            const gx = px + TW * 0.3 + rnd() * TW * 0.4, gy = py + TH * 0.4 + rnd() * TH * 0.3;
            c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx - 2, gy - 4); c.stroke();
          }
        }
      }
    }
    // 길 (4방향)
    function road(horizontal) {
      c.save();
      c.strokeStyle = '#6b5b42'; c.lineWidth = (TW * 0.95);
      c.lineCap = 'round';
      const p1 = horizontal ? { x: 0, y: 23 } : { x: 23, y: 0 };
      const p2 = horizontal ? { x: D.MAP, y: 23 } : { x: 23, y: D.MAP };
      c.beginPath();
      c.moveTo((p1.x - p1.y) * TW / 2 + W / 2, (p1.x + p1.y) * TH / 2);
      c.lineTo((p2.x - p2.y) * TW / 2 + W / 2, (p2.x + p2.y) * TH / 2);
      c.stroke();
      c.strokeStyle = 'rgba(150,130,95,.35)'; c.lineWidth = TW * 0.62;
      c.stroke();
      c.restore();
    }
    road(true); road(false);
    // 마을 돌바닥
    const vx0 = D.VILLAGE.x0, vx1 = D.VILLAGE.x1, vy0 = D.VILLAGE.y0, vy1 = D.VILLAGE.y1;
    c.beginPath();
    const pts = [[vx0, vy0], [vx1, vy0], [vx1, vy1], [vx0, vy1]];
    pts.forEach((p, i) => {
      const X = (p[0] - p[1]) * TW / 2 + W / 2, Y = (p[0] + p[1]) * TH / 2 + TH / 2;
      if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
    });
    c.closePath();
    c.fillStyle = '#55534c'; c.fill();
    // 돌 패턴
    c.save(); c.clip();
    for (let y = vy0; y < vy1; y++) for (let x = vx0; x < vx1; x++) {
      const px = (x - y) * TW / 2 + W / 2, py = (x + y) * TH / 2 + TH / 2;
      c.fillStyle = ((x + y) % 2) ? 'rgba(255,255,255,.028)' : 'rgba(0,0,0,.035)';
      c.beginPath(); c.moveTo(px + TW / 2, py); c.lineTo(px + TW, py + TH / 2); c.lineTo(px + TW / 2, py + TH); c.lineTo(px, py + TH / 2); c.closePath(); c.fill();
    }
    c.restore();
    // 광장 원
    const centerX = (23 - 23) * TW / 2 + W / 2, centerY = (23 + 23) * TH / 2;
    c.beginPath(); c.ellipse(centerX, centerY, 300, 150, 0, 0, 6.2832);
    c.strokeStyle = 'rgba(190,180,150,.18)'; c.lineWidth = 6; c.stroke();
    // 밭
    for (let i = 0; i < 14; i++) {
      const fx = 17 + (i % 2) * 10, fy = 31 + Math.floor(i / 2) * 3;
      const px = (fx - fy) * TW / 2 + W / 2, py = (fx + fy) * TH / 2;
      c.save(); c.translate(px, py);
      c.fillStyle = 'rgba(120,100,60,.35)';
      c.beginPath(); c.moveTo(0, -20); c.lineTo(50, -5); c.lineTo(0, 10); c.lineTo(-50, -5); c.closePath(); c.fill();
      c.restore();
    }
    // 연못
    const pondX = (34 - 12) * TW / 2 + W / 2, pondY = (34 + 12) * TH / 2;
    c.beginPath(); c.ellipse(pondX, pondY, 150, 68, 0, 0, 6.2832);
    c.fillStyle = '#274049'; c.fill();
    c.beginPath(); c.ellipse(pondX, pondY - 6, 130, 54, 0, 0, 6.2832);
    c.fillStyle = '#315563'; c.fill();
    // 성벽 바닥 그림자
    c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 30;
    c.beginPath();
    pts.forEach((p, i) => {
      const X = (p[0] - p[1]) * TW / 2 + W / 2, Y = (p[0] + p[1]) * TH / 2 + TH / 2;
      if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
    });
    c.closePath(); c.stroke();

    decal = document.createElement('canvas');
    decal.width = W; decal.height = H;
    decalCtx = decal.getContext('2d');
  }

  function buildStatic() {
    staticObjs = [];
    for (const p of S.props) {
      staticObjs.push({ kind: 'prop', x: p.x, y: p.y, ref: p, depth: p.x + p.y });
    }
    for (const b of S.buildings) {
      staticObjs.push({ kind: 'building', x: b.x, y: b.y, ref: b, depth: b.x + b.y + (b.w || 0) * 0.5 });
    }
    // 성벽
    const V = D.VILLAGE;
    for (const side of ['N', 'E', 'S', 'W']) {
      for (let i = 0; i < 8; i++) {
        let wx, wy;
        if (side === 'N') { wx = V.x0 + i * 2 + 1; wy = V.y0; }
        else if (side === 'S') { wx = V.x0 + i * 2 + 1; wy = V.y1; }
        else if (side === 'W') { wx = V.x0; wy = V.y0 + i * 2 + 1; }
        else { wx = V.x1; wy = V.y0 + i * 2 + 1; }
        staticObjs.push({ kind: 'wall', x: wx, y: wy, side, depth: wx + wy });
      }
      let gx, gy;
      if (side === 'N') { gx = 23; gy = V.y0; }
      else if (side === 'S') { gx = 23; gy = V.y1; }
      else if (side === 'W') { gx = V.x0; gy = 23; }
      else { gx = V.x1; gy = 23; }
      staticObjs.push({ kind: 'gate', x: gx, y: gy, side, depth: gx + gy + 0.01 });
    }
    staticObjs.sort((a, b) => a.depth - b.depth);
  }

  /* ───────── 초기화 ───────── */
  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    resize();
    buildGround();
    buildStatic();
    setZoom(baseZoom());
    cam.zoom = cam.tzoom;
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!canvas) return;
    const cap = window.innerWidth < 720 ? 1.35 : 1.5;
    dpr = Math.min(cap, window.devicePixelRatio || 1);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ───────── 화면 캐시(바닥) ───────── */
  function ensureView() {
    if (!viewCv) {
      viewCv = document.createElement('canvas');
      viewCtx = viewCv.getContext('2d');
    }
    if (viewCv.width !== canvas.width || viewCv.height !== canvas.height) {
      viewCv.width = canvas.width;
      viewCv.height = canvas.height;
      viewKey = '';
    }
  }
  function drawDecalSpot(c, d) {
    const sx = isoX(d.x, d.y), sy = isoY(d.x, d.y);
    c.beginPath(); c.ellipse(sx, sy, d.r * 34 * cam.zoom, d.r * 17 * cam.zoom, 0, 0, 6.2832);
    c.fillStyle = 'rgba(96,18,18,.55)'; c.fill();
  }
  function redrawView() {
    ensureView();
    const z = cam.zoom;
    viewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    viewCtx.clearRect(0, 0, vw, vh);
    viewCtx.fillStyle = '#0b1410';
    viewCtx.fillRect(0, 0, vw, vh);
    const gx = isoX(0, 0) - (D.MAP * TW / 2) * z;
    const gy = isoY(0, 0) - (TH / 2) * z;
    viewCtx.imageSmoothingEnabled = true;
    viewCtx.drawImage(ground, gx, gy, (D.MAP) * TW * z, (D.MAP) * TH * z);
    viewCtx.globalAlpha = 0.7;
    viewCtx.drawImage(decal, gx, gy, (D.MAP) * TW * z, (D.MAP) * TH * z);
    viewCtx.globalAlpha = 1;
    decalDrawn = S.decals.length;
    // 비네트
    const vg = viewCtx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.32, vw / 2, vh / 2, Math.max(vw, vh) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,8,10,.5)');
    viewCtx.fillStyle = vg; viewCtx.fillRect(0, 0, vw, vh);
    viewKey = cam.x + ',' + cam.y + ',' + z + ',' + vw + ',' + vh;
  }

  /* ───────── 렌더 메인 ───────── */
  function draw(dt) {
    if (!ctx) return;
    time += dt;
    // 줌 보간
    cam.zoom += (cam.tzoom - cam.zoom) * Math.min(1, dt * 12);
    const cfg = settings();
    const unit = cfg.unitScale;
    if (shakeAmt > 0) { shakeAmt = Math.max(0, shakeAmt - dt * 40); }
    const shx = shakeAmt ? (Math.random() - 0.5) * shakeAmt : 0;
    const shy = shakeAmt ? (Math.random() - 0.5) * shakeAmt : 0;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(shx, shy);

    // 대지 (화면 캐시)
    const z = cam.zoom;
    const key = cam.x + ',' + cam.y + ',' + z + ',' + vw + ',' + vh;
    if (key !== viewKey) redrawView();
    else if (S.decals.length > decalDrawn) {
      for (let i = decalDrawn; i < S.decals.length; i++) drawDecalSpot(viewCtx, S.decals[i]);
      decalDrawn = S.decals.length;
    }
    ctx.drawImage(viewCv, 0, 0, vw, vh);

    drawPads(unit);
    drawRange();

    // 깊이 정렬
    for (let i = 0; i < BUCKETS; i++) buckets[i].length = 0;
    for (const o of staticObjs) {
      const i = Math.round((o.x + o.y) * 5);
      if (i >= 0 && i < BUCKETS) buckets[i].push(o);
    }
    for (const t of S.towers) {
      const i = Math.round((t.x + t.y) * 5);
      if (i >= 0 && i < BUCKETS) buckets[i].push({ kind: 'tower', x: t.x, y: t.y, ref: t, depth: t.x + t.y });
    }
    const nEnemies = S.enemies.length;
    const lodStep = nEnemies > 1500 ? 2 : nEnemies > 800 ? 3 : 4;
    const lodOn = nEnemies > 600;
    for (let k = 0; k < nEnemies; k++) {
      const e = S.enemies[k];
      if (e.dead) continue;
      if (lodOn && (k % lodStep) === 0 && !e.def.boss) continue;
      const i = Math.round((e.x + e.y) * 5);
      if (i >= 0 && i < BUCKETS) buckets[i].push({ kind: 'enemy', x: e.x, y: e.y, ref: e, depth: e.x + e.y });
    }
    for (let i = 0; i < BUCKETS; i++) {
      const arr = buckets[i];
      if (!arr.length) continue;
      const sy = i / 5;
      if (sy < cam.y + cam.x - (vh / (TH * z)) - 6) continue;
      if (sy > cam.y + cam.x + (vh / (TH * z)) + 6) continue;
      // 정렬은 버킷 내에서만
      if (arr.length > 1) arr.sort((a, b) => a.depth - b.depth);
      for (const o of arr) drawObj(o, unit);
    }

    // 발사체·파티클
    drawProjectiles();
    drawParticles();

    // 플로터
    ctx.textAlign = 'center';
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.t += dt;
      if (f.t > f.life) { floaters.splice(i, 1); continue; }
      const a = 1 - f.t / f.life;
      const sx = isoX(f.x, f.y), sy = isoY(f.x, f.y) - 20 - f.t * 28;
      ctx.font = 'bold ' + (f.crit ? 18 : 13) + 'px system-ui, sans-serif';
      ctx.fillStyle = f.crit ? 'rgba(255,200,70,' + a + ')' : 'rgba(255,255,255,' + a * 0.9 + ')';
      ctx.strokeStyle = 'rgba(0,0,0,' + a * 0.7 + ')'; ctx.lineWidth = 3;
      ctx.strokeText(f.text, sx, sy); ctx.fillText(f.text, sx, sy);
    }

    // 웨이브 방향 화살표
    drawWaveArrows();

    // 건설/선택 안내
    ctx.restore();
  }

  function drawPads(unit) {
    const cfg = settings();
    for (const p of S.pads) {
      const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
      if (sx < -80 || sx > vw + 80 || sy < -80 || sy > vh + 80) continue;
      const r = 0.78 * cam.zoom * TW / 2;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, 6.2832);
      if (!p.unlocked) {
        ctx.fillStyle = 'rgba(30,36,40,.45)'; ctx.fill();
        ctx.strokeStyle = 'rgba(120,130,140,.25)'; ctx.setLineDash([4, 4]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(180,190,200,.35)'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('🔒', sx, sy + 4);
      } else if (p.tower) {
        ctx.fillStyle = 'rgba(60,80,70,.18)'; ctx.fill();
      } else {
        const pulse = 0.5 + Math.sin(time * 2 + p.i) * 0.5;
        ctx.fillStyle = 'rgba(120,200,180,' + (0.06 + pulse * 0.05) + ')'; ctx.fill();
        ctx.strokeStyle = hoverPad === p.i ? 'rgba(150,255,210,.9)' : 'rgba(140,220,190,.45)';
        ctx.lineWidth = hoverPad === p.i ? 2.5 : 1.6;
        ctx.stroke();
        ctx.beginPath(); ctx.ellipse(sx, sy, r * 0.55, r * 0.28, 0, 0, 6.2832);
        ctx.strokeStyle = 'rgba(140,220,190,.25)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawRange() {
    const t = selTower || (buildType ? { x: hoverPad >= 0 ? S.pads[hoverPad].x : cam.x, y: hoverPad >= 0 ? S.pads[hoverPad].y : cam.y, type: buildType, level: 1 } : null);
    if (!t) return;
    const def = D.TOWERS[t.type];
    if (!def) return;
    const range = def.range * S.stats.rangeMul * (1 + ((t.level || 1) - 1) * 0.015);
    const sx = isoX(t.x, t.y), sy = isoY(t.x, t.y);
    ctx.beginPath();
    ctx.ellipse(sx, sy, range * TW / 2 * cam.zoom, range * TH / 2 * cam.zoom, 0, 0, 6.2832);
    ctx.fillStyle = 'rgba(110,220,255,.06)'; ctx.fill();
    ctx.strokeStyle = 'rgba(110,220,255,.5)'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 6]); ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawObj(o, unit) {
    const cfg = settings();
    if (o.kind === 'enemy') { drawEnemy(o.ref, unit); return; }
    if (o.kind === 'tower') { drawTower(o.ref, unit); return; }
    if (o.kind === 'prop') {
      const p = o.ref;
      const spr = propSprite(p.type);
      const sc = cam.zoom * unit * p.scale;
      const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
      if (sx < -120 || sx > vw + 120 || sy < -160 || sy > vh + 120) return;
      ctx.drawImage(spr.c, sx - spr.ox * sc, sy - spr.oy * sc, 90 * sc, 130 * sc);
      if (p.type === 'torch') {
        const f = 0.82 + Math.sin(time * 9 + p.x * 3) * 0.18;
        const g = ctx.createRadialGradient(sx, sy - 38 * sc, 2, sx, sy - 38 * sc, 28 * sc * f);
        g.addColorStop(0, 'rgba(255,190,90,.34)'); g.addColorStop(1, 'rgba(255,120,30,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy - 38 * sc, 28 * sc * f, 0, 6.2832); ctx.fill();
      }
      return;
    }
    if (o.kind === 'building') {
      const b = o.ref;
      const spr = buildingSprite(b.id);
      const sc = cam.zoom * unit;
      const sx = isoX(b.x, b.y), sy = isoY(b.x, b.y);
      if (sx < -400 || sx > vw + 400 || sy < -400 || sy > vh + 400) return;
      if (!b.alive) {
        // 잔해
        ctx.save();
        ctx.fillStyle = 'rgba(40,35,30,.75)';
        ctx.beginPath(); ctx.ellipse(sx, sy, 34 * sc, 16 * sc, 0, 0, 6.2832); ctx.fill();
        ctx.fillStyle = 'rgba(80,70,60,.7)';
        for (let i = 0; i < 4; i++) ctx.fillRect(sx - 20 * sc + i * 11 * sc, sy - 6 * sc, 8 * sc, 5 * sc);
        if (Math.random() < 0.02) addParticle({ kind: 'smoke', x: b.x + (Math.random() - 0.5), y: b.y + (Math.random() - 0.5), size: 1, life: 2, t: 0 });
        ctx.restore();
        return;
      }
      ctx.drawImage(spr.c, sx - spr.ox * sc, sy - spr.oy * sc, spr.w * sc, spr.h * sc);
      // 피해 연기
      if (b.hp < b.hpMax * 0.5 && Math.random() < 0.03) addParticle({ kind: 'smoke', x: b.x + (Math.random() - 0.5) * 2, y: b.y + (Math.random() - 0.5) * 2, size: 1.2, life: 2.4, t: 0 });
      return;
    }
    if (o.kind === 'wall') {
      const w = S.walls[o.side];
      const ratio = w.hp / w.max;
      const dmg = ratio <= 0 ? 2 : ratio < 0.45 ? 1 : 0;
      const spr = wallSprite(o.side, dmg);
      const sc = cam.zoom;
      const sx = isoX(o.x, o.y), sy = isoY(o.x, o.y);
      if (sx < -180 || sx > vw + 180 || sy < -160 || sy > vh + 160) return;
      ctx.drawImage(spr.c, sx - spr.ox * sc, sy - spr.oy * sc + 6 * sc, 230 * sc, 170 * sc);
      return;
    }
    if (o.kind === 'gate') {
      const w = S.walls[o.side];
      const ratio = w.hp / w.max;
      const dmg = ratio <= 0 ? 2 : ratio < 0.45 ? 1 : 0;
      const spr = gateSprite(dmg);
      const sc = cam.zoom;
      const sx = isoX(o.x, o.y), sy = isoY(o.x, o.y);
      ctx.drawImage(spr.c, sx - spr.ox * sc, sy - spr.oy * sc, 260 * sc, 260 * sc);
      return;
    }
  }

  function drawEnemy(e, unit) {
    const sx = isoX(e.x, e.y), sy = isoY(e.x, e.y);
    if (sx < -60 || sx > vw + 60 || sy < -80 || sy > vh + 60) return;
    const frame = Math.floor(e.walk) % 2;
    const spr = enemySprite(e.type, frame, false);
    const sc = cam.zoom * unit * (e.size / 0.7) * 1.18;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(e.flip * sc, sc);
    ctx.drawImage(spr.c, -spr.ox, -spr.oy, 70, 80);
    ctx.restore();
    if (e.hurt > 0) {
      const fs = enemySprite(e.type, frame, true);
      ctx.save(); ctx.globalAlpha = Math.min(0.85, e.hurt * 6);
      ctx.translate(sx, sy); ctx.scale(e.flip * sc, sc);
      ctx.drawImage(fs.c, -fs.ox, -fs.oy, 70, 80);
      ctx.restore();
    }
    // 체력바(보스/큰 적)
    if (e.def.boss || e.hpMax > 800) {
      const w = 40 * sc, h = 3.5 * sc;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(sx - w / 2, sy - 46 * sc, w, h);
      ctx.fillStyle = e.def.boss ? '#ff5f6d' : '#ffb74d';
      ctx.fillRect(sx - w / 2, sy - 46 * sc, w * Math.max(0, e.hp / e.hpMax), h);
    }
  }

  function drawTower(t, unit) {
    const sx = isoX(t.x, t.y), sy = isoY(t.x, t.y);
    if (sx < -100 || sx > vw + 100 || sy < -100 || sy > vh + 100) return;
    const tier = t.level >= 7 ? 2 : t.level >= 4 ? 1 : 0;
    const spr = towerSprite(t.type, tier);
    const sc = cam.zoom * unit;
    ctx.beginPath(); ctx.ellipse(sx, sy, 26 * sc, 12 * sc, 0, 0, 6.2832);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
    ctx.drawImage(spr.c, sx - spr.ox * sc, sy - spr.oy * sc, 150 * sc, 170 * sc);
    // 포신
    const def = D.TOWERS[t.type];
    if (def.aim) {
      const tx = isoX(t.target ? t.target.x : t.x + Math.cos(t.angle), t.target ? t.target.y : t.y + Math.sin(t.angle));
      const ty = isoY(t.target ? t.target.x : t.x + Math.cos(t.angle), t.target ? t.target.y : t.y + Math.sin(t.angle));
      const ang = Math.atan2(ty - sy, tx - sx);
      const bx = sx + Math.cos(ang) * (def.barrel || 24) * sc * 0.6;
      const by = sy - 34 * sc + Math.sin(ang) * (def.barrel || 24) * sc * 0.6;
      ctx.save();
      ctx.translate(sx, sy - 34 * sc);
      ctx.rotate(ang);
      const len = (def.barrel || 26) * sc;
      ctx.fillStyle = '#2b3238';
      ctx.fillRect(0, -2.6 * sc, len, 5.2 * sc);
      ctx.fillStyle = '#4a565e';
      ctx.fillRect(0, -2.6 * sc, len, 1.8 * sc);
      if (t.type === 'gatling') {
        ctx.fillStyle = '#39444b';
        ctx.fillRect(len * 0.4, -4 * sc, len * 0.5, 1.4 * sc);
        ctx.fillRect(len * 0.4, 2.6 * sc, len * 0.5, 1.4 * sc);
      }
      // 반동
      if (t.recoil > 0) {
        ctx.fillStyle = 'rgba(255,220,150,' + (t.recoil * 0.8) + ')';
        ctx.beginPath(); ctx.arc(len, 0, 5 * sc * t.recoil, 0, 6.2832); ctx.fill();
      }
      ctx.restore();
      // 레이저 빔
      if (t.type === 'laser' && t.target && t.target.dead === false && t.cd > 0) {
        ctx.strokeStyle = 'rgba(120,230,255,.8)'; ctx.lineWidth = 2.5 * sc;
        ctx.shadowColor = '#7fe8ff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.moveTo(sx, sy - 44 * sc); ctx.lineTo(isoX(t.target.x, t.target.y), isoY(t.target.x, t.target.y) - 10); ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
    // 레벨 표시
    if (t.level > 1) {
      ctx.font = 'bold ' + Math.round(9 * sc + 6) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,220,140,.9)';
      ctx.fillText('Lv' + t.level, sx, sy + 14 * sc);
    }
    // 체력바
    if (t.hp < t.hpMax) {
      const w = 30 * sc;
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(sx - w / 2, sy + 6 * sc, w, 3);
      ctx.fillStyle = '#7be08a'; ctx.fillRect(sx - w / 2, sy + 6 * sc, w * Math.max(0, t.hp / t.hpMax), 3);
    }
  }

  function drawProjectiles() {
    ctx.strokeStyle = 'rgba(255,236,170,.85)'; ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (const p of S.projectiles) {
      if (p.kind !== 'bullet') continue;
      const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y) - 22;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - p.vx * 0.35 * cam.zoom, sy - p.vy * 0.18 * cam.zoom);
    }
    ctx.stroke();
    for (const p of S.projectiles) {
      if (p.kind === 'shell') {
        const k = Math.min(1, p.t / p.dur);
        const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y) - 20 - Math.sin(k * Math.PI) * 70;
        ctx.fillStyle = '#ffd08a';
        ctx.beginPath(); ctx.arc(sx, sy, 3.4, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(255,180,80,.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, 6.2832); ctx.stroke();
      } else if (p.kind === 'rocket') {
        const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y) - 26;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.angle + Math.PI / 2);
        ctx.fillStyle = '#d8e0e6'; ctx.fillRect(-2, -6, 4, 10);
        ctx.fillStyle = '#ff8a3a'; ctx.fillRect(-2, 4, 4, 5);
        ctx.restore();
      } else if (p.kind === 'rail') {
        const a = 1 - p.t / p.life;
        ctx.strokeStyle = 'rgba(150,240,255,' + a + ')'; ctx.lineWidth = 3;
        ctx.shadowColor = '#8fe8ff'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(isoX(p.x, p.y), isoY(p.x, p.y));
        ctx.lineTo(isoX(p.x2, p.y2), isoY(p.x2, p.y2)); ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.kind === 'arc') {
        const a = 1 - p.t / p.life;
        ctx.strokeStyle = 'rgba(200,180,255,' + a + ')'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        const x1 = isoX(p.x, p.y), y1 = isoY(p.x, p.y) - 18, x2 = isoX(p.x2, p.y2), y2 = isoY(p.x2, p.y2) - 12;
        ctx.moveTo(x1, y1);
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 14, my = (y1 + y2) / 2 + (Math.random() - 0.5) * 14;
        ctx.lineTo(mx, my); ctx.lineTo(x2, y2); ctx.stroke();
      } else if (p.kind === 'ring') {
        const k = p.t / p.life;
        const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
        ctx.strokeStyle = 'rgba(140,230,255,' + (1 - k) + ')'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(sx, sy, p.maxR * TW / 2 * cam.zoom * k, p.maxR * TH / 2 * cam.zoom * k, 0, 0, 6.2832); ctx.stroke();
      }
    }
  }

  function glowSprite(key) {
    if (glowCache[key]) return glowCache[key];
    const R = 64;
    const c = document.createElement('canvas');
    c.width = R * 2; c.height = R * 2;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(R, R, 1, R, R, R);
    if (key === 'explosion') {
      g.addColorStop(0, 'rgba(255,248,210,1)');
      g.addColorStop(0.28, 'rgba(255,196,90,.95)');
      g.addColorStop(0.55, 'rgba(255,120,30,.6)');
      g.addColorStop(1, 'rgba(120,30,5,0)');
    } else if (key === 'flash') {
      g.addColorStop(0, 'rgba(255,255,235,1)');
      g.addColorStop(0.4, 'rgba(255,240,190,.7)');
      g.addColorStop(1, 'rgba(255,200,120,0)');
    } else {
      g.addColorStop(0, 'rgba(120,120,125,.55)');
      g.addColorStop(1, 'rgba(90,90,95,0)');
    }
    x.fillStyle = g; x.fillRect(0, 0, R * 2, R * 2);
    glowCache[key] = c;
    return c;
  }

  function addParticle(p) { if (S.particles.length > 1200) return; S.particles.push(p); }

  function drawParticles() {
    const cfg = settings();
    const mult = fxDensity();
    let count = 0;
    for (const p of S.particles) {
      count++;
      if (cfg.effects === 'low' && count % 3 !== 0) continue;
      const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
      const k = p.t / p.life;
      const a = 1 - k;
      if (p.kind === 'explosion') {
        const r = (p.size * 18 + k * p.size * 44) * cam.zoom;
        const g = ctx.createRadialGradient(sx, sy - 8, 2, sx, sy - 8, r);
        g.addColorStop(0, 'rgba(255,245,200,' + a * 0.95 + ')');
        g.addColorStop(0.4, 'rgba(255,150,50,' + a * 0.7 + ')');
        g.addColorStop(1, 'rgba(120,40,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy - 8, r, 0, 6.2832); ctx.fill();
      } else if (p.kind === 'flash') {
        ctx.fillStyle = 'rgba(255,255,230,' + a * 0.75 + ')';
        ctx.beginPath(); ctx.arc(sx, sy - 10, p.size * 14 * cam.zoom * (0.5 + k), 0, 6.2832); ctx.fill();
      } else if (p.kind === 'muzzle') {
        ctx.fillStyle = 'rgba(255,235,160,' + a + ')';
        ctx.beginPath(); ctx.arc(sx, sy - 26, (4 + k * 10) * cam.zoom, 0, 6.2832); ctx.fill();
      } else if (p.kind === 'flame') {
        const ang = p.ang || 0;
        for (let i = 0; i < 3; i++) {
          const t = k + i * 0.08;
          const dist = (p.range || 3) * 0.55 * t;
          const wx = p.x + Math.cos(ang) * dist, wy = p.y + Math.sin(ang) * dist;
          const fx = isoX(wx, wy), fy = isoY(wx, wy) - 18 - t * 14;
          const r = (7 + t * 16) * cam.zoom;
          const col = p.cryo ? 'rgba(150,230,255,' : 'rgba(255,150,60,';
          ctx.fillStyle = col + (a * 0.55) + ')';
          ctx.beginPath(); ctx.arc(fx, fy, r, 0, 6.2832); ctx.fill();
        }
      } else if (p.kind === 'blood') {
        ctx.fillStyle = 'rgba(120,20,20,' + a * 0.65 + ')';
        ctx.beginPath(); ctx.arc(sx, sy, (3 + k * 6) * cam.zoom * (p.size || 1), 0, 6.2832); ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.fillStyle = 'rgba(255,210,120,' + a + ')';
        ctx.fillRect(sx - 1.5, sy - 14 - k * 18, 3, 3);
      } else if (p.kind === 'smoke') {
        const r = (p.size || 1) * 16 * cam.zoom * (1 + k);
        ctx.globalAlpha = a * 0.2;
        ctx.drawImage(glowSprite('smoke'), sx - r, sy - 20 - k * 40 - r, r * 2, r * 2);
        ctx.globalAlpha = 1;
      } else if (p.kind === 'relic') {
        const tw = 0.6 + Math.sin((p.t * 8) + p.x * 5) * 0.4;
        ctx.fillStyle = 'rgba(255,220,130,' + (a * tw) + ')';
        ctx.beginPath(); ctx.arc(sx, sy - 20 - k * 46, (1.8 + tw * 1.6) * cam.zoom, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,180,' + (a * 0.5) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - 5, sy - 20 - k * 46); ctx.lineTo(sx + 5, sy - 20 - k * 46);
        ctx.moveTo(sx, sy - 25 - k * 46); ctx.lineTo(sx, sy - 15 - k * 46); ctx.stroke();
      } else if (p.kind === 'debris') {
        ctx.fillStyle = 'rgba(90,80,70,' + a + ')';
        ctx.fillRect(sx, sy - 12 + k * 20, 3.5, 3.5);
      }
    }
  }

  function drawWaveArrows() {
    if (S.phase !== 'prep' && S.phase !== 'wave') return;
    const dirs = S.waveDirs || [];
    if (!dirs.length) return;
    const t = time * 2;
    for (const d of dirs) {
      const def = D.DIRS.find(k => k.id === d);
      if (!def) continue;
      const a = (def.angle * Math.PI) / 180;
      const rx = vw * 0.42, ry = vh * 0.34;
      const cx = vw / 2 + Math.cos(a) * rx;
      const cy = vh / 2 + Math.sin(a) * ry;
      const pulse = 0.55 + Math.sin(t + a) * 0.35;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = 'rgba(255,90,80,' + pulse * 0.85 + ')';
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(13, 10); ctx.lineTo(0, 4); ctx.lineTo(-13, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,190,180,' + pulse + ')';
      ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(def.name, cx, cy + 26);
    }
  }

  /* ───────── 입력 보조 ───────── */
  function pickPad(px, py) {
    let best = -1, bd = 1e9;
    for (const p of S.pads) {
      if (!p.unlocked) continue;
      const sx = isoX(p.x, p.y), sy = isoY(p.x, p.y);
      const d = (px - sx) ** 2 + (py - sy) ** 2;
      const rr = (0.85 * cam.zoom * TW / 2) ** 2;
      if (d < rr && d < bd) { bd = d; best = p.i; }
    }
    return best;
  }
  function pickTower(px, py) {
    let best = null, bd = 1e9;
    for (const t of S.towers) {
      const sx = isoX(t.x, t.y), sy = isoY(t.x, t.y) - 22 * cam.zoom;
      const d = (px - sx) ** 2 + (py - sy) ** 2;
      const rr = (26 * cam.zoom) ** 2;
      if (d < rr && d < bd) { bd = d; best = t; }
    }
    return best;
  }
  function addFloater(x, y, text, crit) {
    if (!settings().dmgNumbers) return;
    if (S.floaters.length > 40) return;
    S.floaters.push({ x, y, text, crit, t: 0, life: crit ? 0.9 : 0.6 });
  }

  function focusVillage() {
    cam.x = 23; cam.y = 23;
    cam.tzoom = baseZoom();
    cam.zoom = cam.tzoom;
  }
  function resetForRun() {
    buildingCache && Object.keys(buildingCache).forEach(k => delete buildingCache[k]);
    buildStatic();
    focusVillage();
  }

  return {
    init, draw, resize, focusVillage, resetForRun,
    screenToWorld, worldToScreen, setCenter, setZoom, zoomAt, pan, shake,
    cam, pickPad, pickTower, addFloater,
    setHoverPad(i) { hoverPad = i; },
    setSelected(t) { selTower = t; },
    setBuildType(t) { buildType = t; },
    getTime() { return time; },
    get settings() { return settings(); },
    applySettings() { cam.tzoom = baseZoom(); cam.zoom = cam.tzoom; },
  };
})();
