/* ─────────────────────────────────────────────
   game.js — 전투 시뮬레이션 (물량 디펜스)
   ───────────────────────────────────────────── */
'use strict';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((cx - x1) * dx + (cy - y1) * dy) / l2 : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  const px = x1 + dx * t, py = y1 + dy * t;
  const ddx = px - cx, ddy = py - cy;
  return ddx * ddx + ddy * ddy <= r * r;
}

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.state = 'menu';
    this.time = 0;
    this.menuT = 0;
    this.speed = 1;
    this.paused = false;
    this.modalOpen = false;
    this.diff = DIFF_BY_ID.normal;

    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.insetTop = 0;
    this.insetBottom = 0;

    this.enemies = [];
    this.bullets = [];
    this.shells = [];
    this.arrows = [];
    this.pendingBlasts = [];
    this.particles = [];
    this.texts = [];
    this.decals = [];
    this.corpses = [];
    this.beams = [];
    this.buildings = [];
    this.barricades = [];
    this.pads = [];

    this.hero = {
      x: this.W / 2, y: this.H - 30, aimX: this.W / 2, aimY: this.H * 0.3,
      angle: -Math.PI / 2, weaponId: 'pistol', mags: {}, reloading: false, reloadT: 0,
      reloadMax: 1, cd: 0, flash: 0, recoil: 0, hitMark: 0, killMark: 0, moveDir: 0,
    };

    this.upg = {};
    this.aimX = this.W / 2;
    this.aimY = this.H * 0.35;
    this.firing = false;
    this.touchMove = 0;
    this.keys = {};
    this.buildMode = null;
    this.skillAim = null;
    this.selectedBuilding = null;

    this.gold = 0;
    this.scrap = 0;
    this.villageHp = 3200;
    this.villageMax = 3200;
    this.waveIndex = 0;
    this.wave = 1;
    this.phase = 'prep';
    this.prepTime = 0;
    this.waveTime = 0;
    this.spawnQueue = [];
    this.waveTotal = 0;
    this.spawned = 0;
    this.waveNames = [];

    this.kills = 0;
    this.goldEarned = 0;
    this.scrapEarned = 0;
    this.shots = 0;
    this.hits = 0;
    this.dmgDealt = 0;
    this.runPoints = 0;
    this.structuresBuilt = 0;

    this.skills = { grenade: { cd: 0, max: SKILLS.grenade.cd }, airstrike: { cd: 0, max: SKILLS.airstrike.cd } };
    this.bossRef = null;
    this.combo = 0;
    this.comboT = 0;
    this.shakeAmt = 0;
    this.flashAlpha = 0;
    this.hitstop = 0;
    this.autoAim = !!(Save.data && Save.data.settings.autoAim);
    this.decor = null;

    this.layout();
    this.makeDecor();
  }

  /* ── layout ─────────────────────────────── */
  readInsets() {
    const hud = document.getElementById('hud');
    if (!hud || hud.classList.contains('hidden')) { this.insetTop = 0; this.insetBottom = 0; return; }
    const topbar = document.querySelector('.topbar');
    const resCard = document.querySelector('.res-card');
    const dock = document.getElementById('dock');
    let top = 0, bottom = 0;
    if (topbar) top = topbar.getBoundingClientRect().bottom;
    if (resCard) top = Math.max(top, resCard.getBoundingClientRect().bottom);
    if (dock) bottom = window.innerHeight - dock.getBoundingClientRect().top;
    this.insetTop = Math.max(0, Math.round(top + 6));
    this.insetBottom = Math.max(0, Math.round(bottom + 8));
  }

  layout() {
    const oldW = this.W, oldH = this.H;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(window.innerWidth * this.dpr);
    this.canvas.height = Math.round(window.innerHeight * this.dpr);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.readInsets();
    this.W = Math.max(280, window.innerWidth);
    this.H = Math.max(240, window.innerHeight - this.insetTop - this.insetBottom);

    if (this.state !== 'menu' && oldW > 0 && oldH > 0 && (oldW !== this.W || oldH !== this.H)) {
      const sx = this.W / oldW, sy = this.H / oldH;
      const scale = (o) => { o.x *= sx; o.y *= sy; };
      this.enemies.forEach(scale);
      this.bullets.forEach(scale);
      this.shells.forEach(b => { b.x *= sx; b.y *= sy; b.sx *= sx; b.sy *= sy; b.tx *= sx; b.ty *= sy; });
      this.arrows.forEach(b => { b.x *= sx; b.y *= sy; b.tx *= sx; b.ty *= sy; b.sx *= sx; b.sy *= sy; });
      this.particles.forEach(scale);
      this.texts.forEach(scale);
      this.decals.forEach(scale);
      this.corpses.forEach(scale);
      this.buildings.forEach(scale);
      this.barricades.forEach(b => { b.x *= sx; b.y *= sy; });
      this.hero.x *= sx;
      this.aimX *= sx; this.aimY *= sy;
    }

    this.wallY = Math.round(this.H * FIELD.WALL);
    this.hero.y = this.wallY + FIELD.HERO_OFF;
    if (this.state === 'menu') {
      this.hero.x = this.W / 2;
      this.hero.y = this.H - 26;
      this.wallY = Math.round(this.H * 0.86);
      this.hero.y = this.wallY + FIELD.HERO_OFF;
    }
    this.hero.x = clamp(this.hero.x, 42, this.W - 42);
    this.aimX = clamp(this.aimX, 0, this.W);
    this.aimY = clamp(this.aimY, 0, this.H);

    this.padCols = this.W < 700 ? FIELD.PAD_COLS_NARROW : FIELD.PAD_COLS_WIDE;
    const pads = [];
    for (let r = 0; r < FIELD.PAD_ROWS.length; r++) {
      for (let c = 0; c < this.padCols; c++) {
        pads.push({
          x: Math.round(this.W * ((c + 0.5) / this.padCols)),
          y: Math.round(this.H * FIELD.PAD_ROWS[r]),
          type: null,
        });
      }
    }
    // 기존 포탑을 새 패드 위치로 재매핑
    this.pads = pads;
    for (const b of this.buildings) {
      if (b.type === 'barricade') continue;
      let best = null, bd = 1e9;
      for (const p of pads) {
        const d = Math.abs(p.x - b.x) + Math.abs(p.y - b.y);
        if (p.type === null && d < bd) { bd = d; best = p; }
      }
      if (best) { best.type = b.type; b.pad = best; b.x = best.x; b.y = best.y; }
    }
    this.makeDecor();
  }

  makeDecor() {
    let seed = 1337;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; };
    const stars = [];
    for (let i = 0; i < 90; i++) stars.push({ x: rnd() * this.W, y: rnd() * this.H * 0.42, r: rnd() * 1.4 + 0.3, a: rnd() * 0.6 + 0.2 });
    const tufts = [];
    const tuftN = Math.round(this.W * this.H / 12000);
    for (let i = 0; i < tuftN; i++) {
      tufts.push({
        x: rnd() * this.W,
        y: this.H * 0.20 + rnd() * (this.H * 0.66),
        s: rnd() * 1.4 + 0.5,
        a: rnd() * 0.25 + 0.06,
        k: rnd() > 0.5,
      });
    }
    const rocks = [];
    for (let i = 0; i < Math.round(this.W / 130) + 3; i++) {
      rocks.push({ x: rnd() * this.W, y: this.H * 0.24 + rnd() * this.H * 0.58, r: rnd() * 7 + 3 });
    }
    const torches = [];
    const n = Math.max(3, Math.round(this.W / 190));
    for (let i = 0; i < n; i++) torches.push({ x: (i + 0.5) / n * this.W + (rnd() - 0.5) * 30, y: this.wallY - 10, ph: rnd() * 10 });
    this.decor = { stars, tufts, rocks, torches, seed: rnd() };
  }

  /* ── run lifecycle ──────────────────────── */
  startRun(diff, opts) {
    this.diff = diff || DIFF_BY_ID.normal;
    const savedAuto = Save.data.settings.autoAim;
    this.autoAim = !!savedAuto;
    this.state = 'playing';
    this.paused = false;
    this.modalOpen = false;
    this.time = 0;
    this.speed = 1;
    this.enemies.length = 0;
    this.bullets.length = 0;
    this.shells.length = 0;
    this.arrows.length = 0;
    this.pendingBlasts.length = 0;
    this.particles.length = 0;
    this.texts.length = 0;
    this.decals.length = 0;
    this.corpses.length = 0;
    this.beams.length = 0;
    this.buildings.length = 0;
    this.barricades.length = 0;
    this.pads.forEach(p => p.type = null);
    this.bossRef = null;
    this.combo = 0;
    this.comboT = 0;
    this.shakeAmt = 0;
    this.flashAlpha = 0;
    this.hitstop = 0;
    this.buildMode = null;
    this.skillAim = null;
    this.selectedBuilding = null;

    this.gold = 260 + Save.perkLevel('startGold') * 80;
    this.scrap = 40;
    this.villageMax = 3200 + Save.perkLevel('wallHp') * 450;
    this.villageHp = this.villageMax;
    this.kills = 0;
    this.goldEarned = 0;
    this.scrapEarned = 0;
    this.shots = 0;
    this.hits = 0;
    this.dmgDealt = 0;
    this.runPoints = 0;
    this.structuresBuilt = 0;
    this.waveIndex = 0;
    this.wave = 1;
    this.phase = 'prep';
    this.prepTime = 26;
    this.spawnQueue = [];
    this.waveTotal = 0;
    this.spawned = 0;

    this.upg = {};
    for (const w of WEAPONS) this.upg[w.id] = { dmg: 0, rate: 0, pierce: 0, reload: 0 };

    this.hero.weaponId = 'pistol';
    this.hero.mags = {};
    for (const w of WEAPONS) this.hero.mags[w.id] = w.mag;
    this.hero.reloading = false;
    this.hero.reloadT = 0;
    this.hero.cd = 0;
    this.hero.flash = 0;
    this.skills.grenade.cd = 0;
    this.skills.airstrike.cd = 0;

    if (typeof UI !== 'undefined') UI.enterGame(this);
    this.layout();
    this.makeDecor();
    Save.data.stats.runs++;
    Save.save();

    if (typeof UI !== 'undefined') {
      if (typeof UI.pendingResult !== 'undefined') UI.pendingResult = null;
      UI.banner('방어선 구축', `웨이브 1 · ${WAVES[0].name}`);
      UI.toast('포탑과 바리케이드로 방어선을 세우세요', 'gold');
      UI.updateWavePreview(true);
    }
  }

  quitToMenu() {
    this.state = 'menu';
    this.paused = false;
    this.modalOpen = false;
    this.enemies.length = 0;
    this.buildings.length = 0;
    this.barricades.length = 0;
    this.pads.forEach(p => p.type = null);
    this.particles.length = 0;
    this.shells.length = 0;
    this.bullets.length = 0;
    this.arrows.length = 0;
    this.beams.length = 0;
    this.corpses.length = 0;
    this.decals.length = 0;
    this.hero.x = this.W / 2;
    this.hero.reloading = false;
    this.hero.cd = 0;
    this.hero.mags = {};
    this.buildMode = null;
    this.skillAim = null;
    if (typeof UI !== 'undefined') UI.showMenu(this);
    this.layout();
    this.makeDecor();
    if (typeof UI !== 'undefined') UI.syncMenu();
  }

  /* ── weapon stats ───────────────────────── */
  stats(w) {
    const p = (this.upg && this.upg[w.id]) || { dmg: 0, rate: 0, pierce: 0, reload: 0 };
    return {
      dmg: w.dmg * (1 + 0.13 * p.dmg),
      rpm: w.rpm * (1 + 0.07 * p.rate),
      mag: w.mag,
      reload: w.reload * (1 - 0.06 * p.reload),
      pierce: (w.pierce || 0) + Math.floor(p.pierce / 2),
      spread: w.spread,
      pellets: w.pellets || 1,
    };
  }

  upgradeWeapon(id, st) {
    const def = WUPG[st];
    const p = this.upg[this.hero.weaponId];
    if (!p) return false;
    if (p[st] >= def.max) { UI.toast('이미 최대 레벨입니다', 'warn'); return false; }
    const cost = def.cost(p[st]);
    if (this.scrap < cost) { UI.toast(`고철이 부족합니다 (필요 ${cost})`, 'warn'); Sfx.deny(); return false; }
    this.scrap -= cost;
    p[st]++;
    Sfx.build();
    UI.toast(`${WEAPON_BY_ID[this.hero.weaponId].short} ${def.name} Lv.${p[st]}`, 'gold');
    return true;
  }

  switchWeapon(id) {
    if (!Save.hasWeapon(id)) { UI.toast('연구소에서 해금해야 합니다', 'warn'); Sfx.deny(); return; }
    if (this.hero.weaponId === id) return;
    this.hero.weaponId = id;
    this.hero.reloading = false;
    this.hero.reloadT = 0;
    this.hero.cd = 0.12;
    if (this.hero.mags[id] === undefined) this.hero.mags[id] = WEAPON_BY_ID[id].mag;
    Sfx.ui();
  }

  startReload() {
    const h = this.hero;
    if (h.reloading) return;
    const w = WEAPON_BY_ID[h.weaponId];
    if ((h.mags[h.weaponId] | 0) >= w.mag) return;
    h.reloading = true;
    h.reloadT = this.stats(w).reload;
    h.reloadMax = h.reloadT;
    Sfx.reload();
  }

  /* ── input actions ──────────────────────── */
  setAim(x, y) {
    this.aimX = clamp(x, 0, this.W);
    this.aimY = clamp(y, 0, this.H);
    if (!this.autoAim) {
      this.hero.aimX = this.aimX;
      this.hero.aimY = this.aimY;
    }
  }

  pointerDown(x, y) {
    if (this.state !== 'playing' || this.modalOpen || this.paused) return;
    this.setAim(x, y);
    if (this.skillAim) { this.castSkill(this.skillAim, this.aimX, this.aimY); return; }
    if (this.buildMode) { this.tryBuild(this.aimX, this.aimY); return; }
    const b = this.pickBuilding(x, y);
    if (b) { UI.openTurretPanel(this, b); return; }
    const bar = this.pickBarricade(x, y);
    if (bar && !this.firing) { /* 사격 우선, 수리는 repair 모드 */ }
    this.firing = true;
    this.hero.firingNow = true;
    this.fireIfReady();
  }

  pointerUp() {
    this.firing = false;
    this.hero.firingNow = false;
  }

  pointerMove(x, y) {
    this.setAim(x, y);
  }

  cancelModes() {
    this.buildMode = null;
    this.skillAim = null;
    this.firing = false;
    if (typeof UI !== 'undefined') UI.syncModes(this);
  }

  enterBuild(mode) {
    if (this.state !== 'playing') return;
    const t = TURRETS[mode];
    if (mode !== 'barricade' && mode !== 'repair') {
      if (!t) return;
      if (!Save.hasTurret(mode)) { UI.toast('연구소에서 해금해야 합니다', 'warn'); Sfx.deny(); return; }
      if (this.gold < t.cost) { UI.toast(`골드 부족 (필요 ${t.cost})`, 'warn'); Sfx.deny(); return; }
      const freePads = this.pads.filter(p => !p.type).length;
      if (!freePads) { UI.toast('빈 포탑 지점이 없습니다', 'warn'); Sfx.deny(); return; }
    } else if (mode === 'barricade') {
      if (this.gold < 55) { UI.toast('골드 부족 (필요 55)', 'warn'); Sfx.deny(); return; }
    } else if (mode === 'repair') {
      if (this.gold < 30) { UI.toast('골드 부족 (필요 30)', 'warn'); Sfx.deny(); return; }
    }
    this.skillAim = null;
    this.buildMode = this.buildMode === mode ? null : mode;
    Sfx.ui();
    UI.syncModes(this);
  }

  requestSkill(id) {
    if (this.state !== 'playing') return;
    const s = this.skills[id];
    if (!s || s.cd > 0) { Sfx.deny(); return; }
    if (this.skillAim === id) { this.skillAim = null; }
    else { this.skillAim = id; this.buildMode = null; }
    Sfx.ui();
    UI.syncModes(this);
  }

  castSkill(id, x, y) {
    const s = this.skills[id];
    if (!s || s.cd > 0) return;
    this.skillAim = null;
    if (id === 'grenade') {
      this.lobShell(this.hero.x, this.hero.y - 16, x, y, 0.5, 'grenade', SKILLS.grenade.dmg, SKILLS.grenade.radius, this.hero.angle);
    } else if (id === 'airstrike') {
      for (let i = 0; i < 4; i++) {
        this.pendingBlasts.push({
          t: 0.55 + i * 0.22 + Math.random() * 0.1,
          x: x + rand(-55, 55), y: y + rand(-45, 45),
          radius: SKILLS.airstrike.radius * rand(0.8, 1.1), dmg: SKILLS.airstrike.dmg, kind: 'air',
        });
      }
      Sfx.shot('missile');
    }
    s.cd = s.max * (1 - 0.10 * Save.perkLevel('skillCd'));
    s.cd = Math.max(1, s.cd);
    this.shake(3);
    UI.syncModes(this);
  }

  /* ── build ──────────────────────────────── */
  tryBuild(x, y) {
    if (this.buildMode === 'sentry' || this.buildMode === 'flame' || this.buildMode === 'mortar' || this.buildMode === 'rail') {
      const def = TURRETS[this.buildMode];
      if (this.gold < def.cost) { UI.toast('골드가 부족합니다', 'warn'); Sfx.deny(); return; }
      let pad = null, bd = 1e9;
      for (const p of this.pads) {
        if (p.type) continue;
        const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
        if (d < bd) { bd = d; pad = p; }
      }
      if (!pad || bd > 78 * 78) { UI.toast('포탑은 설치 지점에만 배치할 수 있습니다', 'warn'); Sfx.deny(); return; }
      this.gold -= def.cost;
      pad.type = this.buildMode;
      const b = this.makeBuilding(this.buildMode, pad.x, pad.y, pad);
      this.buildings.push(b);
      this.structuresBuilt++;
      this.boom(pad.x, pad.y + 6, 0.4);
      Sfx.build();
      this.buildMode = null;
      UI.syncModes(this);
      UI.toast(`${def.name} 배치 완료`, 'gold');
      return;
    }
    if (this.buildMode === 'barricade') {
      if (this.gold < 55) { UI.toast('골드가 부족합니다', 'warn'); Sfx.deny(); return; }
      const minY = this.H * FIELD.BUILD_MIN, maxY = this.H * FIELD.BUILD_MAX;
      if (y < minY || y > maxY) { UI.toast('바리케이드는 전장 중앙에만 설치할 수 있습니다', 'warn'); Sfx.deny(); return; }
      const w = this.W < 620 ? 104 : 132;
      for (const b of this.barricades) {
        if (Math.abs(b.x - x) < (b.w + w) * 0.42 && Math.abs(b.y - y) < 34) {
          UI.toast('너무 가깝습니다', 'warn'); Sfx.deny(); return;
        }
      }
      if (this.barricades.length >= 12) { UI.toast('바리케이드는 최대 12개까지', 'warn'); Sfx.deny(); return; }
      this.gold -= 55;
      this.barricades.push({
        x: clamp(x, w / 2 + 6, this.W - w / 2 - 6), y: clamp(y, minY, maxY),
        w, h: 20, hp: 520, maxHp: 520, flash: 0,
      });
      this.structuresBuilt++;
      Sfx.build();
      this.boom(x, y, 0.3);
      UI.toast('바리케이드 설치', 'gold');
      this.buildMode = null;
      UI.syncModes(this);
      return;
    }
    if (this.buildMode === 'repair') {
      if (this.gold < 30) { UI.toast('골드가 부족합니다', 'warn'); Sfx.deny(); return; }
      const near = this.nearestDamageable(x, y);
      if (!near) { UI.toast('수리할 구조물이 없습니다', 'warn'); Sfx.deny(); return; }
      this.gold -= 30;
      if (near.isWall) {
        this.healWall(this.villageMax * 0.14);
      } else {
        near.obj.hp = Math.min(near.obj.maxHp, near.obj.hp + near.obj.maxHp * 0.4);
        this.hitspark(near.obj.x, near.obj.y, '#9be8a4', 8);
      }
      Sfx.build();
      UI.toast('수리 완료', 'gold');
      this.buildMode = null;
      UI.syncModes(this);
      return;
    }
    UI.syncModes(this);
  }

  nearestDamageable(x, y) {
    let best = null, bd = 70 * 70;
    for (const b of this.barricades) {
      const d = (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y);
      if (d < bd) { bd = d; best = { obj: b, isWall: false }; }
    }
    for (const b of this.buildings) {
      if (b.hp >= b.maxHp) continue;
      const d = (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y);
      if (d < bd) { bd = d; best = { obj: b, isWall: false }; }
    }
    if (this.villageHp < this.villageMax && y > this.wallY - 90) best = { isWall: true };
    return best;
  }

  pickBuilding(x, y) {
    let best = null, bd = 40 * 40;
    for (const b of this.buildings) {
      const d = (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  pickBarricade(x, y) {
    for (const b of this.barricades) {
      if (Math.abs(b.x - x) < b.w / 2 && Math.abs(b.y - y) < 24) return b;
    }
    return null;
  }

  makeBuilding(type, x, y, pad) {
    const def = TURRETS[type];
    return {
      type, x, y, pad, lv: 1, hp: def.hp, maxHp: def.hp, cd: rand(0, 0.3),
      angle: -Math.PI / 2, flash: 0, flashT: 0, kills: 0, target: null, kind: def.kind,
    };
  }

  upgradeBuilding(b) {
    if (!b || b.lv >= TURRET_MAX_LV) return false;
    const cost = turretUpgradeCost(b.lv);
    if (this.gold < cost) { UI.toast('골드가 부족합니다', 'warn'); Sfx.deny(); return false; }
    this.gold -= cost;
    b.lv++;
    const def = TURRETS[b.type];
    b.maxHp = Math.round(def.hp * (1 + 0.25 * (b.lv - 1)));
    b.hp = b.maxHp;
    Sfx.build();
    this.hitspark(b.x, b.y, '#ffd479', 12);
    UI.toast(`${def.name} Lv.${b.lv}`, 'gold');
    return true;
  }

  sellBuilding(b) {
    if (!b) return;
    const spent = TURRETS[b.type].cost + (b.lv - 1) * 0; // 단순 환불
    const refund = Math.round(TURRETS[b.type].cost * turretSellRate);
    this.gold += refund;
    if (b.pad) b.pad.type = null;
    const i = this.buildings.indexOf(b);
    if (i >= 0) this.buildings.splice(i, 1);
    this.boom(b.x, b.y, 0.25);
    Sfx.kill(false);
    UI.toast(`철거 · 골드 +${refund}`, 'gold');
  }

  healWall(n) {
    const before = this.villageHp;
    this.villageHp = Math.min(this.villageMax, this.villageHp + n);
    const healed = Math.round(this.villageHp - before);
    if (healed > 0) this.hitspark(this.W / 2, this.wallY - 4, '#9be8a4', 10);
  }

  repairWall() {
    const cost = 60;
    if (this.villageHp >= this.villageMax) { UI.toast('성벽이 온전합니다', 'warn'); return; }
    if (this.gold < cost) { UI.toast('골드가 부족합니다', 'warn'); Sfx.deny(); return; }
    this.gold -= cost;
    this.healWall(this.villageMax * 0.14);
    Sfx.build();
    UI.toast('성벽 긴급 수리', 'gold');
  }

  /* ── waves ──────────────────────────────── */
  startWave(manual) {
    if (this.state !== 'playing' || this.phase !== 'prep') return;
    this.phase = 'wave';
    this.waveTime = 0;
    const idx = this.waveIndex;
    const w = WAVES[idx];
    const comp = waveComposition(idx, this.diff);
    const total = comp.reduce((a, c) => a + c.n, 0);
    const dur = clamp(6 + total * 0.30, 10, 34);
    const centers = [];
    const cn = clamp(Math.round(total / 13), 2, 6);
    for (let i = 0; i < cn; i++) centers.push(rand(this.W * 0.08, this.W * 0.92));
    const q = [];
    let acc = 0;
    for (const c of comp) {
      for (let i = 0; i < c.n; i++) {
        acc++;
        let t = (acc / total) * dur + rand(0, 0.9);
        const cx = Math.random() < 0.72 ? pick(centers) : rand(this.W * 0.05, this.W * 0.95);
        const x = clamp(cx + rand(-85, 85), 18, this.W - 18);
        if (c.id === 'lord') t = 1.6;
        q.push({ t: Math.max(0.25, t), type: c.id, x });
      }
    }
    q.sort((a, b) => a.t - b.t);
    this.spawnQueue = q;
    this.waveTotal = total;
    this.spawned = 0;
    this.waveNames = comp;
    Sfx.horn();
    UI.banner(w.name, `WAVE ${idx + 1} · ${total}명 습격`);
    this.shake(1.5);
  }

  spawnEnemy(type, x) {
    const def = ENEMIES[type];
    const hpScale = this.diff.hp * (1 + this.waveIndex * 0.085);
    const hp = Math.round(def.hp * hpScale);
    const e = {
      uid: ++this._uid, type, def, x, y: -26 - rand(0, 40), r: def.r,
      hp, maxHp: hp, t: rand(0, 10), seed: rand(0, 10), flash: 0, ox: 0, oy: 0,
      attackT: rand(0.3, 0.9), slow: 1, burn: 0, burnT: 0, dead: false,
      state: 'walk', anim: rand(0, 6.28), angle: Math.PI / 2,
    };
    if (def.boss) {
      e.y = -60;
      this.bossRef = e;
      UI.showBoss(def);
      Sfx.roar();
      this.shake(12);
      UI.banner('악덕 군주 출현', '모든 화력을 집중하라');
    }
    this.enemies.push(e);
  }

  updateSpawner(dt) {
    if (!this.spawnQueue.length) return;
    let guard = 12;
    while (this.spawnQueue.length && guard-- > 0) {
      const s = this.spawnQueue[0];
      if (s.t > this.waveTime) break;
      if (this.enemies.length >= 300) break;
      this.spawnQueue.shift();
      this.spawnEnemy(s.type, s.x);
      this.spawned++;
    }
  }

  waveCleared() {
    if (this.phase !== 'wave') return false;
    return this.spawnQueue.length === 0 && this.enemies.length === 0 && this.pendingBlasts.length === 0;
  }

  completeWave() {
    const cleared = this.waveIndex + 1;
    const goldR = Math.round((34 + cleared * 9) * this.diff.gold * (1 + 0.12 * Save.perkLevel('goldGain')));
    const scrapR = Math.round((10 + cleared * 2) * (1 + 0.15 * Save.perkLevel('scrapGain')));
    const rp = Math.max(1, Math.round(2 * this.diff.rp));
    this.gold += goldR;
    this.scrap += scrapR;
    this.goldEarned += goldR;
    this.scrapEarned += scrapR;
    this.villageHp = Math.min(this.villageMax, this.villageHp + this.villageMax * 0.06);
    this.runPoints += rp;
    Save.addPoints(rp);
    Save.recordRun(cleared, this.kills, cleared >= MAX_WAVE, this.diff.id);
    Sfx.waveClear();
    this.phase = 'prep';

    if (cleared >= MAX_WAVE) { this.victory(); return; }

    this.waveIndex++;
    this.wave = this.waveIndex + 1;
    this.prepTime = 24;
    this.spawnQueue = [];
    this.waveTotal = 0;
    this.spawned = 0;
    UI.banner('웨이브 클리어', `WAVE ${cleared} 격퇴 · 🪙 +${goldR} · ⚙️ +${scrapR} · 📘 +${rp}`);
    UI.toast(`설계도 +${rp} (보유 ${Save.data.points})`, 'gold');
  }

  victory() {
    if (this.state === 'result') return;
    this.state = 'result';
    this.phase = 'prep';
    const bonus = Math.round(12 * this.diff.rp);
    this.runPoints += bonus;
    Save.addPoints(bonus);
    Save.recordRun(MAX_WAVE, this.kills, true, this.diff.id);
    Sfx.victory();
    this.celebrate();
    UI.showResult(this, true);
  }

  defeat() {
    if (this.state === 'result') return;
    this.state = 'result';
    const reached = Math.max(1, this.waveIndex + 1);
    const bonus = Math.round(Math.floor(reached / 3) * this.diff.rp);
    this.runPoints += bonus;
    Save.addPoints(bonus);
    Save.recordRun(Math.max(0, reached - (this.phase === 'wave' ? 1 : 0)), this.kills, false, this.diff.id);
    Sfx.defeat();
    this.shake(20);
    for (let i = 0; i < 9; i++) {
      this.pendingBlasts.push({ t: 0.2 + i * 0.12, x: rand(this.W * 0.15, this.W * 0.85), y: rand(this.wallY - 100, this.wallY + 20), radius: rand(70, 130), dmg: 0, kind: 'air', silent: true });
    }
    UI.showResult(this, false);
  }

  celebrate() {
    for (let i = 0; i < 40; i++) {
      this.pendingBlasts.push({ t: i * 0.06, x: rand(this.W * 0.1, this.W * 0.9), y: rand(40, this.wallY - 60), radius: rand(20, 40), dmg: 0, kind: 'flare' });
    }
  }

  /* ── firing ─────────────────────────────── */
  fireIfReady() {
    const h = this.hero;
    if (h.cd > 0 || h.reloading) return;
    const w = WEAPON_BY_ID[h.weaponId];
    const st = this.stats(w);
    if ((h.mags[h.weaponId] | 0) <= 0) { this.startReload(); return; }
    const ang = Math.atan2(this.aimY - h.y, this.aimX - h.x);
    h.angle = ang;
    h.mags[h.weaponId]--;
    h.cd = 60 / st.rpm;
    h.flash = 0.07;
    h.recoil = Math.min(1, h.recoil + 0.9);
    this.shots++;
    this.muzzle(ang, w);
    Sfx.shot(w.sfx);

    if (w.kind === 'bullet') this.fireBullets(w, st, ang);
    else if (w.kind === 'rail') this.fireRail(w, st, ang);
    else if (w.kind === 'flame') this.fireFlame(w, st, ang);
    else if (w.kind === 'grenade') this.fireGrenade(w, st, ang);
    else if (w.kind === 'missile') this.fireMissile(w, st, ang);

    if ((h.mags[h.weaponId] | 0) <= 0) this.startReload();
    this.shake(w.kind === 'bullet' ? 0.5 : 1.2);
  }

  muzzle(ang, w) {
    const h = this.hero;
    const mx = h.x + Math.cos(ang) * 26;
    const my = h.y + Math.sin(ang) * 26;
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: mx, y: my, vx: Math.cos(ang + rand(-0.35, 0.35)) * rand(60, 220),
        vy: Math.sin(ang + rand(-0.35, 0.35)) * rand(60, 220) - 20,
        life: rand(0.05, 0.13), maxLife: 0.13, size: rand(1.5, 3.5), color: w.color, kind: 'spark', drag: 0.9,
      });
    }
    this.particles.push({ x: mx, y: my, vx: Math.cos(ang) * 40, vy: Math.sin(ang) * 40, life: 0.06, maxLife: 0.06, size: 11, color: w.color, kind: 'glow', drag: 0.8 });
    // 탄피
    const side = ang + Math.PI / 2;
    this.particles.push({
      x: h.x + Math.cos(ang) * 8, y: h.y + Math.sin(ang) * 8,
      vx: Math.cos(side) * rand(30, 70) + rand(-10, 10), vy: Math.sin(side) * rand(30, 70) - 30,
      life: 0.8, maxLife: 0.8, size: 2.2, color: '#e8c46a', kind: 'casing', gravity: 320, drag: 0.99,
    });
  }

  fireBullets(w, st, ang) {
    const h = this.hero;
    const ox = Math.cos(ang) * 28, oy = Math.sin(ang) * 28;
    for (let i = 0; i < st.pellets; i++) {
      const a = ang + rand(-st.spread / 2, st.spread / 2) * DEG;
      const spd = w.speed * rand(0.95, 1.05);
      const crit = Math.random() < (w.crit || 0.05);
      this.bullets.push({
        x: h.x + ox, y: h.y + oy, px: h.x + ox, py: h.y + oy,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        dmg: st.dmg, pierce: st.pierce, life: w.range / spd,
        color: w.color, width: w.id === 'shotgun' ? 2 : (w.id === 'minigun' ? 1.6 : 2.4),
        crit, hitIds: null, wtype: w.id,
      });
    }
    // 샷건 사격 시 산탄 흔적
    if (w.id === 'shotgun') {
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: h.x + ox, y: h.y + oy, vx: Math.cos(ang + rand(-0.4, 0.4)) * rand(30, 120),
          vy: Math.sin(ang + rand(-0.4, 0.4)) * rand(30, 120), life: rand(0.12, 0.3),
          maxLife: 0.3, size: rand(1, 2.4), color: '#ffcf8b', kind: 'spark', drag: 0.9,
        });
      }
    }
  }

  fireRail(w, st, ang) {
    const h = this.hero;
    const len = w.range;
    const x2 = h.x + Math.cos(ang) * len, y2 = h.y + Math.sin(ang) * len;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const hit = [];
    for (const e of this.enemies) {
      if (e.dead) continue;
      const t = (e.x - h.x) * dx + (e.y - h.y) * dy;
      if (t < 0 || t > len) continue;
      const perp = Math.abs(-(e.x - h.x) * dy + (e.y - h.y) * dx);
      if (perp < e.r + 9) hit.push({ e, t });
    }
    hit.sort((a, b) => a.t - b.t);
    for (const { e } of hit) {
      this.damageEnemy(e, st.dmg, { crit: Math.random() < (w.crit || 0.2), ignoreArmor: true, kx: dx * 120, ky: dy * 120, source: 'rail', heroShot: true });
      this.hits++;
      this.hitspark(e.x, e.y, w.color, 6);
    }
    this.beams.push({ x1: h.x + dx * 26, y1: h.y + dy * 26, x2, y2, life: 0.22, maxLife: 0.22, color: w.color, width: 7 });
    this.shake(4);
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: h.x + dx * 30, y: h.y + dy * 30, vx: dx * rand(100, 400) + rand(-70, 70), vy: dy * rand(100, 400) + rand(-70, 70),
        life: rand(0.1, 0.28), maxLife: 0.28, size: rand(1, 2.6), color: w.color, kind: 'spark', drag: 0.92,
      });
    }
  }

  fireFlame(w, st, ang) {
    const h = this.hero;
    const range = w.range;
    const half = 0.22;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - h.x, e.y - h.y);
      if (d > range + e.r) continue;
      let dAng = Math.atan2(e.y - h.y, e.x - h.x) - ang;
      while (dAng > Math.PI) dAng -= TAU;
      while (dAng < -Math.PI) dAng += TAU;
      if (Math.abs(dAng) < half) {
        this.damageEnemy(e, st.dmg, { ignoreArmor: true, source: 'flame' });
        e.burn = 18; e.burnT = 2.2;
      }
    }
    for (let i = 0; i < 4; i++) {
      const a = ang + rand(-half, half);
      const spd = rand(220, 460);
      this.particles.push({
        x: h.x + Math.cos(ang) * 26, y: h.y + Math.sin(ang) * 26,
        vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: rand(0.18, 0.36), maxLife: 0.36,
        size: rand(5, 12), color: pick(['#ffdd66', '#ff9a2e', '#ff5a1e']), kind: 'fire',
        drag: 0.86, grow: 26,
      });
    }
    this.shake(0.4);
  }

  fireGrenade(w, st, ang) {
    const h = this.hero;
    const dist = clamp(Math.hypot(this.aimX - h.x, this.aimY - h.y), 120, w.range);
    const tx = h.x + Math.cos(ang) * dist;
    const ty = h.y + Math.sin(ang) * dist;
    this.lobShell(h.x + Math.cos(ang) * 24, h.y + Math.sin(ang) * 24, tx, ty, 0.55 + dist / 2200, 'grenade', st.dmg, w.splash || 70, ang);
  }

  fireMissile(w, st, ang) {
    let target = null, bd = 1e9;
    const ax = this.aimX, ay = this.aimY;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = (e.x - ax) ** 2 + (e.y - ay) ** 2;
      if (d < bd) { bd = d; target = e; }
    }
    const h = this.hero;
    this.shells.push({
      x: h.x + Math.cos(ang) * 26, y: h.y + Math.sin(ang) * 26,
      sx: h.x, sy: h.y, tx: ax, ty: ay, t: 0, dur: 0.9,
      kind: 'missile', dmg: st.dmg, radius: w.splash || 90, target, ang, speed: w.speed, smoke: 0,
    });
    this.shake(1.4);
  }

  lobShell(x, y, tx, ty, dur, kind, dmg, radius, ang) {
    this.shells.push({
      x, y, sx: x, sy: y, tx, ty, t: 0, dur, kind, dmg, radius, ang,
      target: null, speed: 0, smoke: 0,
    });
  }

  /* ── damage ─────────────────────────────── */
  damageEnemy(e, dmg, opts) {
    if (!e || e.dead) return;
    opts = opts || {};
    let d = dmg;
    if (!opts.ignoreArmor && e.def.armor) d = Math.max(d * 0.18, d - e.def.armor * 0.9);
    if (opts.crit) d *= 2.1;
    e.hp -= d;
    e.flash = 1;
    this.dmgDealt += d;
    const ang = opts.kx !== undefined ? Math.atan2(opts.ky, opts.kx) : -Math.PI / 2;
    e.ox += (opts.kx ? opts.kx * 0.10 : rand(-4, 4));
    e.oy += (opts.ky ? opts.ky * 0.10 : -rand(0, 4));
    e.ox = clamp(e.ox, -16, 16); e.oy = clamp(e.oy, -22, 8);
    if (opts.source !== 'flame') {
      const n = opts.crit ? 7 : 4;
      for (let i = 0; i < n; i++) {
        this.particles.push({
          x: e.x + rand(-4, 4), y: e.y + rand(-4, 4),
          vx: Math.cos(ang + Math.PI + rand(-0.9, 0.9)) * rand(30, 170),
          vy: Math.sin(ang + Math.PI + rand(-0.9, 0.9)) * rand(30, 170),
          life: rand(0.2, 0.5), maxLife: 0.5, size: rand(1.4, 3.4),
          color: e.def.boss ? '#ff6b6b' : '#a8232a', kind: 'blood', gravity: 240, drag: 0.98,
        });
      }
      this.hero.hitMark = 0.12;
      Sfx.impact();
    }
    if (d >= 1 && Save.data.settings.dmgText !== false) {
      if (this.texts.length < 90) {
        this.texts.push({
          x: e.x + rand(-6, 6), y: e.y - e.r - 4,
          vy: -42, life: opts.crit ? 0.9 : 0.6, maxLife: opts.crit ? 0.9 : 0.6,
          text: String(Math.round(d)), color: opts.crit ? '#ffd44d' : '#e9f1fa',
          size: opts.crit ? 16 : 12, crit: !!opts.crit,
        });
      }
    }
    if (e.hp <= 0) this.killEnemy(e, opts);
  }

  killEnemy(e, opts) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    this.combo++;
    this.comboT = 2.4;
    const def = e.def;
    const goldMul = this.diff.gold * (1 + 0.12 * Save.perkLevel('goldGain'));
    const gold = Math.max(1, Math.round(def.gold * goldMul));
    const scrapMul = (1 + 0.15 * Save.perkLevel('scrapGain'));
    const scrap = Math.max(0, Math.round(def.scrap * scrapMul));
    this.gold += gold;
    this.scrap += scrap;
    this.goldEarned += gold;
    this.scrapEarned += scrap;
    this.hero.killMark = 0.18;
    if (this.texts.length < 110) {
      this.texts.push({
        x: e.x, y: e.y - e.r - 12, vy: -30, life: 0.75, maxLife: 0.75,
        text: `+${gold}`, color: '#ffcf5e', size: 11, coin: true,
      });
    }
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: e.x + rand(-6, 6), y: e.y + rand(-6, 6),
        vx: rand(-180, 180), vy: rand(-200, 60), life: rand(0.25, 0.65), maxLife: 0.65,
        size: rand(1.5, 3.8), color: e.def.boss ? '#ff5b5b' : '#8f1d24', kind: 'blood', gravity: 420, drag: 0.98,
      });
    }
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: e.x + rand(-8, 8), y: e.y + rand(-8, 8), vx: rand(-40, 40), vy: rand(-60, 10),
        life: rand(0.4, 0.9), maxLife: 0.9, size: e.r * rand(0.7, 1.2), color: 'rgba(120,80,50,0.35)',
        kind: 'smoke', drag: 0.96, grow: 18,
      });
    }
    this.corpses.push({ x: e.x, y: e.y, r: e.r, type: e.type, t: 0, life: 5.5, rot: rand(-0.6, 0.6), def: e.def });
    if (this.corpses.length > 80) this.corpses.shift();
    this.decals.push({ x: e.x, y: e.y + 4, r: e.r * rand(0.8, 1.3), color: 'rgba(95,12,18,0.55)', life: 22, maxLife: 22, kind: 'blood' });
    if (this.decals.length > 140) this.decals.shift();

    Sfx.kill(!!def.boss);
    if (def.boss) {
      this.bossRef = null;
      UI.hideBoss();
      this.explode(e.x, e.y, 150, 0, { silent: false, friendly: false });
      this.shake(16);
      this.flashAlpha = 0.5;
      this.hitstop = 0.12;
      this.runPoints += 10;
      Save.addPoints(10);
      UI.banner('군주 처치', '대군의 기세가 꺾였다! 📘 +10');
    } else if (e.type === 'siege' || e.type === 'ram' || e.type === 'knight') {
      this.hitstop = 0.02;
    }
    this.comboToast();
  }

  comboToast() {
    if (this.combo >= 5 && this.combo % 5 === 0) {
      UI.combo(this.combo);
    }
  }

  damageBuilding(b, dmg, src) {
    if (!b) return;
    b.hp -= dmg;
    b.flash = 1;
    this.hitspark(b.x, b.y, '#ff9a5a', 4);
    if (b.hp <= 0) {
      b.hp = 0;
      if (b.pad) b.pad.type = null;
      const i = this.buildings.indexOf(b);
      if (i >= 0) this.buildings.splice(i, 1);
      this.explode(b.x, b.y, 60, 0, { silent: false, friendly: false, small: true });
      UI.toast(`${TURRETS[b.type].name} 파괴!`, 'warn');
      Sfx.explosion(0.7);
    }
  }

  damageBarricade(b, dmg) {
    if (!b || b.hp <= 0) return;
    b.hp -= dmg;
    b.flash = 1;
    this.hitspark(b.x + rand(-b.w / 2, b.w / 2), b.y, '#ffb066', 5);
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: b.x + rand(-b.w / 2, b.w / 2), y: b.y + rand(-6, 6), vx: rand(-90, 90), vy: rand(-120, 20),
        life: rand(0.3, 0.6), maxLife: 0.6, size: rand(2, 4), color: '#8a5a2a', kind: 'debris', gravity: 520, drag: 0.99,
      });
    }
    if (b.hp <= 0) {
      const i = this.barricades.indexOf(b);
      if (i >= 0) this.barricades.splice(i, 1);
      this.boom(b.x, b.y, 0.5);
      UI.toast('바리케이드 파괴!', 'warn');
      Sfx.explosion(0.4);
    }
  }

  damageWall(n) {
    if (this.state !== 'playing') return;
    this.villageHp -= n;
    this.flashAlpha = Math.max(this.flashAlpha, Math.min(0.16, n / 3000));
    this.shake(1.4);
    this.hitspark(rand(this.W * 0.1, this.W * 0.9), this.wallY - 6, '#ff9a5a', 4);
    Sfx.wallHit();
    if (this.villageHp <= 0) { this.villageHp = 0; this.defeat(); }
  }

  /* ── enemy update ───────────────────────── */
  blockingBarricade(e) {
    const bs = this.barricades;
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i];
      if (b.hp <= 0) continue;
      if (e.x > b.x - b.w / 2 - e.r * 0.5 && e.x < b.x + b.w / 2 + e.r * 0.5) {
        if (e.y + e.r * 0.6 >= b.y - b.h * 0.5 && e.y < b.y + 46) return b;
      }
    }
    return null;
  }

  updateEnemies(dt) {
    const wallY = this.wallY;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dead) continue;
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt * 6);
      e.ox *= Math.max(0, 1 - dt * 9);
      e.oy *= Math.max(0, 1 - dt * 9);
      e.attackT -= dt;
      if (e.burnT > 0) {
        e.burnT -= dt;
        e.hp -= e.burn * dt;
        if (Math.random() < dt * 14) {
          this.particles.push({ x: e.x + rand(-5, 5), y: e.y + rand(-5, 5), vx: rand(-15, 15), vy: rand(-60, -20), life: 0.4, maxLife: 0.4, size: rand(2, 5), color: pick(['#ff9a2e', '#ffd166']), kind: 'fire', drag: 0.95, grow: 14 });
        }
        if (e.hp <= 0) { this.killEnemy(e, {}); continue; }
      }
      if (e.def.boss) {
        e.slamT = (e.slamT === undefined ? 4.5 : e.slamT) - dt;
        if (e.slamT <= 0 && e.y > this.H * 0.42) {
          e.slamT = 5.2;
          this.bossSlam(e);
        }
      }

      const def = e.def;
      const bar = this.blockingBarricade(e);
      if (bar) {
        e.state = 'attackBar';
        e.angle = Math.PI / 2;
        if (e.attackT <= 0) {
          e.attackT = def.interval;
          this.damageBarricade(bar, def.dmg * (def.siege ? 2.2 : 1));
          this.lunge(e);
        }
        continue;
      }
      if (def.kind === 'archer') {
        const distToWall = wallY - e.y;
        if (distToWall > def.range) {
          e.y += def.speed * dt;
          e.x += Math.sin(e.t * 1.6 + e.seed) * 9 * dt;
        } else {
          e.state = 'shoot';
          if (e.attackT <= 0) {
            e.attackT = def.interval;
            this.archerShoot(e);
          }
        }
        continue;
      }
      if (e.y + e.r >= wallY - 12) {
        e.state = 'attackWall';
        e.y = Math.min(e.y, wallY - e.r - 8);
        e.angle = Math.PI / 2;
        if (e.attackT <= 0) {
          e.attackT = def.interval;
          this.damageWall(def.dmg);
          this.lunge(e);
        }
      } else {
        e.state = 'walk';
        e.y += def.speed * dt;
        e.x += Math.sin(e.t * 1.3 + e.seed) * 7 * dt;
        e.angle = Math.PI / 2;
      }
      // 사망 정리
    }
    if (this.enemies.some(e => e.dead)) {
      this.enemies = this.enemies.filter(e => !e.dead);
    }
    if (this.bossRef && this.bossRef.dead) this.bossRef = null;
  }

  lunge(e) {
    e.ox += rand(-2, 2);
    e.oy -= 5;
    if (e.def.siege || e.def.boss) this.shake(e.def.boss ? 4 : 2);
  }

  bossSlam(e) {
    this.shake(11);
    this.flashAlpha = 0.16;
    Sfx.explosion(1.4);
    this.pendingBlasts.push({ t: 0.01, x: e.x, y: e.y + 26, radius: 140, dmg: 0, kind: 'slam', silent: false });
    for (const b of this.barricades.slice()) {
      if (Math.hypot(b.x - e.x, b.y - e.y) < 180) this.damageBarricade(b, 130);
    }
    for (const b of this.buildings.slice()) {
      if (Math.hypot(b.x - e.x, b.y - e.y) < 160) this.damageBuilding(b, 70);
    }
    for (let i = 0; i < 22; i++) {
      this.particles.push({
        x: e.x + rand(-40, 40), y: e.y + 20, vx: rand(-260, 260), vy: rand(-180, 40),
        life: rand(0.4, 0.9), maxLife: 0.9, size: rand(2, 6), color: '#ffb066', kind: 'debris', gravity: 460, drag: 0.98,
      });
    }
  }

  archerShoot(e) {
    let target = null, tType = 'wall';
    let bd = 1e9;
    const maxD = 300;
    for (const b of this.buildings) {
      const d = Math.hypot(b.x - e.x, b.y - e.y);
      if (d < maxD && d < bd) { bd = d; target = b; tType = 'building'; }
    }
    let tx, ty;
    if (target) { tx = target.x; ty = target.y; }
    else { tx = clamp(e.x + rand(-60, 60), 20, this.W - 20); ty = this.wallY - 6; }
    const dur = 0.55 + Math.hypot(tx - e.x, ty - e.y) / 900;
    this.arrows.push({
      x: e.x, y: e.y, sx: e.x, sy: e.y, tx, ty, t: 0, dur,
      dmg: e.def.dmg * 3, target, tType, ang: Math.atan2(ty - e.y, tx - e.x),
    });
    Sfx.shot('pistol');
  }

  /* ── projectiles ────────────────────────── */
  updateBullets(dt) {
    const enemies = this.enemies;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.px = b.x; b.py = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = false;
      if (b.life <= 0 || b.x < -40 || b.x > this.W + 40 || b.y < -80 || b.y > this.H + 20) dead = true;
      if (!dead) {
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (e.dead) continue;
          if (Math.abs(e.y - b.y) > e.r + 26 && Math.abs(e.x - b.x) > 60) continue;
          if (b.hitIds && b.hitIds.indexOf(e.uid) >= 0) continue;
          if (segCircle(b.px, b.py, b.x, b.y, e.x, e.y, e.r + 2)) {
            this.damageEnemy(e, b.dmg, { crit: b.crit, kx: b.vx * 0.08, ky: b.vy * 0.08, source: b.wtype, heroShot: true });
            this.hits++;
            this.hitspark(b.x, b.y, b.color, 3);
            if (b.pierce > 0) {
              b.pierce--;
              if (!b.hitIds) b.hitIds = [];
              b.hitIds.push(e.uid);
              b.dmg *= 0.86;
            } else { dead = true; break; }
          }
        }
      }
      if (dead) this.bullets.splice(i, 1);
    }

    // 적 화살
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.t += dt;
      if (a.t >= a.dur) {
        if (a.tType === 'building' && a.target && this.buildings.indexOf(a.target) >= 0) this.damageBuilding(a.target, a.dmg);
        else this.damageWall(a.dmg);
        this.hitspark(a.tx, a.ty, '#e7d5a0', 4);
        this.arrows.splice(i, 1);
      }
    }
  }

  updateShells(dt) {
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.t += dt;
      const k = Math.min(1, s.t / s.dur);
      if (s.kind === 'missile' && s.target && !s.target.dead) {
        s.tx = s.target.x; s.ty = s.target.y;
      }
      s.x = lerp(s.sx, s.tx, k);
      s.y = lerp(s.sy, s.ty, k);
      s.smoke += dt;
      if (s.smoke > 0.035) {
        s.smoke = 0;
        this.particles.push({
          x: s.x, y: s.y, vx: rand(-20, 20), vy: rand(-30, 10), life: rand(0.3, 0.7), maxLife: 0.7,
          size: rand(3, 7), color: 'rgba(180,180,180,0.30)', kind: 'smoke', drag: 0.95, grow: 26,
        });
      }
      if (k >= 1) {
        const friendly = s.kind === 'grenade' || s.kind === 'missile' || s.kind === 'mortar';
        this.explode(s.tx, s.ty, s.radius, s.dmg, { friendly });
        this.shells.splice(i, 1);
      }
    }
    for (let i = this.pendingBlasts.length - 1; i >= 0; i--) {
      const p = this.pendingBlasts[i];
      p.t -= dt;
      if (p.t <= 0) {
        if (p.kind === 'flare') {
          this.particles.push({ x: p.x, y: p.y, vx: rand(-90, 90), vy: rand(-140, -30), life: rand(0.6, 1.2), maxLife: 1.2, size: rand(2, 4), color: pick(['#ffd166', '#ff7b54', '#7fe7ff']), kind: 'spark', gravity: 90, drag: 0.99 });
        } else {
          this.explode(p.x, p.y, p.radius, p.dmg, { silent: true, quiet: p.kind === 'slam' });
        }
        this.pendingBlasts.splice(i, 1);
      }
    }
  }

  explode(x, y, radius, dmg, opts) {
    opts = opts || {};
    const friendly = opts.friendly !== false;
    if (friendly && dmg > 0) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < radius + e.r) {
          const fall = 1 - Math.pow(clamp(d / (radius + e.r), 0, 1), 1.4) * 0.6;
          const ang = Math.atan2(e.y - y, e.x - x);
          this.damageEnemy(e, dmg * fall, {
            ignoreArmor: true, kx: Math.cos(ang) * 220, ky: Math.sin(ang) * 220,
            source: 'explosion', crit: false,
          });
        }
      }
    }
    // 시각 효과
    const size = clamp(radius / 80, 0.6, 1.9);
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.18, maxLife: 0.18, size: radius * 0.55, color: '#fff2c4', kind: 'glow' });
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.34, maxLife: 0.34, size: 8, color: '#ffd479', kind: 'ring', grow: radius * 1.5, width: 4 });
    for (let i = 0; i < Math.round(14 * size); i++) {
      const a = rand(0, TAU), sp = rand(60, 380) * size;
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: rand(0.25, 0.7), maxLife: 0.7, size: rand(1.5, 4) * size,
        color: pick(['#ffdf7e', '#ff9a2e', '#ff5a1e', '#ffffff']), kind: 'spark', gravity: 260, drag: 0.93,
      });
    }
    for (let i = 0; i < Math.round(8 * size); i++) {
      this.particles.push({
        x: x + rand(-radius * 0.4, radius * 0.4), y: y + rand(-radius * 0.3, radius * 0.3),
        vx: rand(-50, 50), vy: rand(-90, -10), life: rand(0.5, 1.2), maxLife: 1.2,
        size: rand(6, 16) * size, color: 'rgba(90,90,95,0.34)', kind: 'smoke', drag: 0.96, grow: 40,
      });
    }
    for (let i = 0; i < Math.round(6 * size); i++) {
      this.particles.push({
        x, y, vx: rand(-200, 200), vy: rand(-260, -40), life: rand(0.5, 1.1), maxLife: 1.1,
        size: rand(2, 5), color: '#6b5a45', kind: 'debris', gravity: 620, drag: 0.99,
      });
    }
    this.decals.push({ x, y, r: radius * 0.55, color: 'rgba(20,14,10,0.5)', life: 30, maxLife: 30, kind: 'scorch' });
    this.shake(6 * size);
    this.flashAlpha = Math.max(this.flashAlpha, 0.18 * size);
    if (!opts.silent) Sfx.explosion(size);
    if (size > 1.2) this.hitstop = 0.03;
  }

  /* ── hero ───────────────────────────────── */
  updateHero(dt) {
    const h = this.hero;
    // 이동
    let dir = 0;
    if (this.keys['a'] || this.keys['arrowleft']) dir -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dir += 1;
    dir += this.touchMove;
    if (dir !== 0) h.x = clamp(h.x + dir * 310 * dt, 40, this.W - 40);
    if (dir !== 0) h.moveAnim = (h.moveAnim || 0) + dt * 9;

    // 자동 조준
    if (this.autoAim && this.enemies.length) {
      let target = null, best = -1e9;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const score = e.y * 2 - Math.abs(e.x - h.x) * 0.35;
        if (score > best) { best = score; target = e; }
      }
      if (target) {
        this.aimX = target.x;
        this.aimY = target.y;
        this.firing = true;
      } else { this.firing = false; }
    } else if (this.autoAim) {
      this.firing = false;
    }
    h.aimX = this.aimX; h.aimY = this.aimY;
    h.angle = Math.atan2(this.aimY - h.y, this.aimX - h.x);
    h.flash = Math.max(0, h.flash - dt * 12);
    h.recoil = Math.max(0, h.recoil - dt * 9);
    h.hitMark = Math.max(0, h.hitMark - dt * 7);
    h.killMark = Math.max(0, h.killMark - dt * 5);
    h.cd -= dt;

    if (h.reloading) {
      h.reloadT -= dt;
      if (h.reloadT <= 0) {
        h.reloading = false;
        h.mags[h.weaponId] = WEAPON_BY_ID[h.weaponId].mag;
        Sfx.ui();
      }
    }
    if (this.firing && !this.autoAim) {
      if (h.cd <= 0 && !h.reloading) this.fireIfReady();
    } else if (this.autoAim && this.firing) {
      if (h.cd <= 0 && !h.reloading) this.fireIfReady();
    }
    // 스킬 쿨다운
    for (const k in this.skills) {
      const s = this.skills[k];
      if (s.cd > 0) s.cd = Math.max(0, s.cd - dt);
    }
  }

  /* ── structures ─────────────────────────── */
  updateBuildings(dt) {
    const perkDmg = 1 + 0.12 * Save.perkLevel('turretDmg');
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      const def = TURRETS[b.type];
      b.flash = Math.max(0, b.flash - dt * 6);
      b.cd -= dt;
      const dmgMul = perkDmg * (1 + 0.2 * (b.lv - 1));
      const range = def.range * (1 + 0.05 * (b.lv - 1));

      if (b.type === 'flame') {
        let target = null, bd = 1e9;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < range && d < bd) { bd = d; target = e; }
        }
        if (target) {
          b.angle = Math.atan2(target.y - b.y, target.x - b.x);
          if (b.cd <= 0) {
            b.cd = def.interval;
            const half = 0.3;
            for (const e of this.enemies) {
              if (e.dead) continue;
              const d = Math.hypot(e.x - b.x, e.y - b.y);
              if (d > range + e.r) continue;
              let da = Math.atan2(e.y - b.y, e.x - b.x) - b.angle;
              while (da > Math.PI) da -= TAU;
              while (da < -Math.PI) da += TAU;
              if (Math.abs(da) < half) { this.damageEnemy(e, def.dmg * dmgMul, { ignoreArmor: true, source: 'flame' }); e.burn = 10; e.burnT = 1.6; }
            }
            b.flash = 1; b.flashT = 0.06;
            for (let n = 0; n < 3; n++) {
              const a = b.angle + rand(-0.28, 0.28);
              this.particles.push({
                x: b.x + Math.cos(b.angle) * 14, y: b.y + Math.sin(b.angle) * 14,
                vx: Math.cos(a) * rand(150, 260), vy: Math.sin(a) * rand(150, 260),
                life: rand(0.2, 0.34), maxLife: 0.34, size: rand(4, 8), color: pick(['#ffd166', '#ff8a3d', '#ff5a1e']), kind: 'fire', drag: 0.87, grow: 22,
              });
            }
            Sfx.shot('flame');
          }
        }
        continue;
      }

      // 표적 선택 (성벽에 가까운 순)
      let target = null, bestScore = -1e9;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d > range) continue;
        const score = e.y - d * 0.15;
        if (score > bestScore) { bestScore = score; target = e; }
      }
      b.target = target;
      if (!target) continue;
      b.angle = Math.atan2(target.y - b.y, target.x - b.x);
      if (b.cd > 0) continue;
      b.cd = def.interval;
      b.flash = 1; b.flashT = 0.08;
      if (b.type === 'sentry') {
        const dmg = def.dmg * dmgMul;
        this.damageEnemy(target, dmg, { source: 'sentry', kx: Math.cos(b.angle) * 30, ky: Math.sin(b.angle) * 30 });
        this.beams.push({ x1: b.x + Math.cos(b.angle) * 16, y1: b.y + Math.sin(b.angle) * 16, x2: target.x, y2: target.y, life: 0.07, maxLife: 0.07, color: '#ffe6a6', width: 2 });
        this.particles.push({ x: b.x + Math.cos(b.angle) * 18, y: b.y + Math.sin(b.angle) * 18, vx: Math.cos(b.angle) * 60, vy: Math.sin(b.angle) * 60, life: 0.07, maxLife: 0.07, size: 8, color: '#ffcf5e', kind: 'glow', drag: 0.8 });
        this.hitspark(target.x, target.y, '#ffd479', 2);
        Sfx.shot('rifle');
        this.hero.hitMark = Math.max(this.hero.hitMark, 0.02);
      } else if (b.type === 'mortar') {
        this.shells.push({
          x: b.x + Math.cos(b.angle) * 12, y: b.y + Math.sin(b.angle) * 12,
          sx: b.x, sy: b.y, tx: target.x + rand(-14, 14), ty: target.y + rand(-10, 10),
          t: 0, dur: 0.75, kind: 'mortar', dmg: def.dmg * dmgMul, radius: def.splash || 70, ang: b.angle, speed: 0, smoke: 0,
        });
        Sfx.shot('thump');
        this.muzzle(b.angle, { color: '#ffc65e' });
      } else if (b.type === 'rail') {
        const ang = b.angle;
        const x2 = b.x + Math.cos(ang) * range, y2 = b.y + Math.sin(ang) * range;
        let hit = [];
        for (const e of this.enemies) {
          if (e.dead) continue;
          const t = (e.x - b.x) * Math.cos(ang) + (e.y - b.y) * Math.sin(ang);
          if (t < 0 || t > range) continue;
          const perp = Math.abs(-(e.x - b.x) * Math.sin(ang) + (e.y - b.y) * Math.cos(ang));
          if (perp < e.r + 8) hit.push(e);
        }
        for (const e of hit) this.damageEnemy(e, def.dmg * dmgMul, { ignoreArmor: true, source: 'rail', kx: Math.cos(ang) * 80, ky: Math.sin(ang) * 80 });
        this.beams.push({ x1: b.x + Math.cos(ang) * 14, y1: b.y + Math.sin(ang) * 14, x2, y2, life: 0.16, maxLife: 0.16, color: '#8ce8ff', width: 5 });
        Sfx.shot('rail');
        this.shake(1.5);
      }
    }
  }

  /* ── effects / misc ─────────────────────── */
  updateParticles(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.drag) { const d = Math.pow(p.drag, dt * 60); p.vx *= d; p.vy *= d; }
    }
    if (ps.length > 800) ps.splice(0, ps.length - 800);
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 0.94;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= dt;
      if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      this.decals[i].life -= dt;
      if (this.decals[i].life <= 0) this.decals.splice(i, 1);
    }
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const c = this.corpses[i];
      c.t += dt;
      if (c.t > c.life) this.corpses.splice(i, 1);
    }
  }

  updateAmbient(dt) {
    this.shakeAmt *= Math.max(0, 1 - dt * 8);
    this.flashAlpha *= Math.max(0, 1 - dt * 9);
    this.ambientT = (this.ambientT || 0) + dt;
    if (this.ambientT > 0.22) {
      this.ambientT = 0;
      // 재와 불씨
      if (this.particles.length < 620) {
        this.particles.push({
          x: rand(0, this.W), y: rand(this.H * 0.55, this.H),
          vx: rand(-8, 14), vy: rand(-26, -10), life: rand(1.6, 3.4), maxLife: 3.4,
          size: rand(0.7, 1.8), color: Math.random() < 0.5 ? 'rgba(255,150,60,0.5)' : 'rgba(200,200,200,0.18)',
          kind: 'ember', drag: 1,
        });
      }
      // 마을 연기
      if (this.decor && this.decor.torches.length) {
        const t = pick(this.decor.torches);
        this.particles.push({ x: t.x + rand(-10, 10), y: t.y - 16, vx: rand(-6, 6), vy: rand(-26, -12), life: rand(1.2, 2.2), maxLife: 2.2, size: rand(3, 6), color: 'rgba(160,160,165,0.16)', kind: 'smoke', drag: 0.99, grow: 20 });
      }
    }
  }

  hitspark(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), sp = rand(40, 200);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.12, 0.32), maxLife: 0.32,
        size: rand(1, 2.4), color: color || '#ffd479', kind: 'spark', gravity: 140, drag: 0.94,
      });
    }
  }

  boom(x, y, size) {
    this.particles.push({ x, y, vx: 0, vy: 0, life: 0.28, maxLife: 0.28, size: 10, color: '#ffd479', kind: 'ring', grow: 80 * size, width: 3 });
    for (let i = 0; i < 10; i++) {
      this.particles.push({ x, y, vx: rand(-120, 120), vy: rand(-140, 20), life: rand(0.25, 0.55), maxLife: 0.55, size: rand(1.5, 3), color: 'rgba(200,190,170,0.5)', kind: 'dust', gravity: 200, drag: 0.95 });
    }
  }

  shake(n) {
    if (!Save.data.settings.shake) return;
    this.shakeAmt = Math.min(26, Math.max(this.shakeAmt, n));
  }

  /* ── master update ──────────────────────── */
  update(dt) {
    this.time += dt;
    this.updateAmbient(dt);
    this.updateParticles(dt);
    this.updateHero(dt);
    this.updateBuildings(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateShells(dt);
    if (this.phase === 'prep') {
      this.prepTime -= dt;
      if (this.prepTime <= 0) this.startWave();
    } else if (this.phase === 'wave') {
      this.waveTime += dt;
      this.updateSpawner(dt);
      if (this.waveCleared()) this.completeWave();
    }
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (this.bossRef && this.bossRef.dead) this.bossRef = null;
  }

  frame(dt) {
    if (this.state === 'playing' && !this.paused && !this.modalOpen) {
      let d = dt;
      if (this.hitstop > 0) { this.hitstop -= dt; d = dt * 0.22; }
      for (let i = 0; i < this.speed; i++) this.update(d);
    } else if (this.state === 'menu') {
      this.menuT += dt;
      this.time += dt * 0.6;
      this.updateAmbient(dt);
      this.updateParticles(dt);
      this.hero.angle = -Math.PI / 2 + Math.sin(this.menuT * 0.4) * 0.25;
      this.hero.aimX = this.hero.x;
      this.hero.aimY = this.hero.y - 100;
    } else if (this.state === 'result') {
      this.updateAmbient(dt);
      this.updateParticles(dt);
      this.updateShells(dt);
      this.updateEnemies(dt);
      if (this.phase === 'prep') this.hero.angle = -Math.PI / 2;
    }
    Render.frame(this);
    UI.sync(this);
  }

  megaBlast(x, y) { this.explode(x, y, 120, 0); }
}
Game.prototype._uid = 0;
