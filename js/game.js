/* 현대병기 · 중세 방어전 — 시뮬레이션 코어 (월드·적·포탑·자원·재회귀) */
window.Game = (function () {
  'use strict';
  const D = window.DATA;
  const V = D.VILLAGE;
  const SAVE_KEY = 'md_isometric_save_v1';

  const S = {
    phase: 'lobby',            // lobby | prep | wave | stageclear | defeat | paused
    stage: 1, wi: 1, globalWave: 0,
    gold: 0, rp: 0, shards: 0,
    keepHp: 1, keepMax: 1,
    walls: {},
    towers: [], enemies: [], projectiles: [], particles: [], decals: [], floaters: [],
    pads: [], buildings: [], props: [],
    waveComp: [], waveDirs: [], spawnQueue: [], spawnCursor: 0,
    waveTimer: 0, waveDur: 0, waveEnded: true,
    time: 0, speed: 1, paused: false,
    kills: 0, waveKills: 0, totalGold: 0, totalDamage: 0, lastKillAt: 0, enraged: false,
    prepTime: 22, prepLeft: 22,
    stats: null,
    bossRef: null,
    notifications: [],
    stats_extra: { relicChance: 1 },
    lastWaveSummary: null,
    damageTakenThisWave: 0,
    cheat: { invincible: false, relicBoost: 1 },
  };

  let save = null;
  let pool = [];
  const grid = { cell: 2, cols: 0, rows: 0, items: [] };
  const handlers = {};

  /* ───────── 유틸 ───────── */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); }
  function emit(name, data) { (handlers[name] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

  /* ───────── 저장 ───────── */
  function defaultSave() {
    return {
      v: 3, shards: 0, prestige: {}, research: {}, relics: {}, relicNew: {},
      bestWave: 0, maxStage: 1, stagesCleared: 0, prestigeCount: 0, totalKills: 0,
      seenCutscenes: {},
      settings: {
        sound: true, shake: true, particles: true, dmgNumbers: true,
        unitScale: 0.82, zoomBase: 0.85, effects: 'normal', cutscene: true,
      },
      run: null,
    };
  }
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      save = raw ? Object.assign(defaultSave(), JSON.parse(raw)) : defaultSave();
      save.settings = Object.assign(defaultSave().settings, save.settings || {});
      if (!save.relics) save.relics = {};
      if (!save.prestige) save.prestige = {};
      if (!save.research) save.research = {};
      if (!save.seenCutscenes) save.seenCutscenes = {};
      if (window.SFX) SFX.setEnabled(save.settings.sound);
    } catch (e) { save = defaultSave(); }
    S.shards = save.shards || 0;
    return save;
  }
  function persist() {
    if (!save) return;
    save.shards = S.shards;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
  }
  function saveRun() {
    if (!save) return;
    if (S.phase === 'lobby') { save.run = null; persist(); return; }
    save.run = {
      stage: S.stage, wi: S.wi, globalWave: S.globalWave,
      gold: Math.round(S.gold), rp: Math.round(S.rp),
      keepHp: S.keepHp, wallHp: { N: S.walls.N.hp, E: S.walls.E.hp, S: S.walls.S.hp, W: S.walls.W.hp },
      towers: S.towers.map(t => ({ pad: t.pad, type: t.type, level: t.level, hp: t.hp })),
      research: save.research, kills: S.kills, time: S.time,
    };
    save.bestWave = Math.max(save.bestWave || 0, S.globalWave);
    save.maxStage = Math.max(save.maxStage || 1, S.stage);
    save.totalKills = (save.totalKills || 0) + 0;
    persist();
  }

  /* ───────── 스탯 계산 ───────── */
  function applyEff(st, eff, lv) {
    if (!eff) return;
    for (const k in eff) {
      const v = eff[k] * lv;
      if (k === 'unlock') continue;
      if (k === 'startGold' || k === 'startRP' || k === 'armorPen' || k === 'burn' ||
          k === 'pierce' || k === 'chain' || k === 'slots' || k === 'freeTower' ||
          k === 'crit' || k === 'keepResearch' || k === 'doubleShot' || k === 'slowHit' ||
          k === 'repair') st[k] += v;
      else st[k] *= (1 + v);
    }
  }
  function computeStats() {
    const st = {
      dmgMul: 1, rateMul: 1, rangeMul: 1, aoeMul: 1, goldMul: 1, rpMul: 1, shardMul: 1,
      keepHpMul: 1, wallHpMul: 1, buildCostMul: 1, armorPen: 0, crit: 0, critMul: 1.8,
      burn: 0, chain: 0, pierce: 0, slowHit: 0, slots: 0, startGold: 0, startRP: 0,
      repair: 0.08, freeTower: 0, keepResearch: 0, doubleShot: 0,
      unlocked: new Set(['gatling', 'mortar']),
    };
    for (const id in save.research) {
      const node = D.TECHS.find(t => t.id === id);
      if (!node) continue;
      const lv = save.research[id];
      if (node.eff && node.eff.unlock) st.unlocked.add(node.eff.unlock);
      applyEff(st, node.eff, lv);
    }
    for (const id in save.prestige) {
      const node = D.PRESTIGE.find(t => t.id === id);
      if (!node) continue;
      applyEff(st, node.eff, save.prestige[id]);
    }
    for (const id in save.relics) {
      const r = D.RELIC_BY_ID[id];
      if (r) applyEff(st, r.eff, 1);
    }
    st.buildCostMul = Math.max(0.35, st.buildCostMul);
    S.stats = st;
    return st;
  }

  /* ───────── 마을·맵 초기화 ───────── */
  function wallMax() {
    return 12000 * S.stats.wallHpMul * (1 + 0.05 * (S.stage - 1)) * (1 + 0.03 * Math.max(0, S.globalWave - 1));
  }
  function keepMax() {
    return 8000 * S.stats.keepHpMul * (1 + 0.04 * (S.stage - 1)) * (1 + 0.02 * Math.max(0, S.globalWave - 1));
  }
  function makeWalls(full) {
    const mx = wallMax();
    const prev = S.walls;
    S.walls = {};
    for (const id of ['N', 'E', 'S', 'W']) {
      S.walls[id] = { id, hp: full ? mx : (prev[id] ? Math.min(prev[id].hp, mx) : mx), max: mx };
    }
  }

  function buildPads() {
    const base = [
      [23, 17.2], [29.2, 23], [23, 28.8], [16.8, 23],
      [20.4, 20.4], [25.6, 20.4], [25.6, 25.6], [20.4, 25.6],
      [23, 12.6], [33.4, 23], [23, 33.4], [12.6, 23],
      [14.2, 14.2], [31.8, 14.2], [31.8, 31.8], [14.2, 31.8],
    ];
    S.pads = base.map((p, i) => ({
      i, x: p[0], y: p[1], unlocked: i < 8 + S.stats.slots - (save.prestige && 0), tower: null,
    }));
    // 기술/재회귀 슬롯: 안쪽 8칸부터 순서대로 해금
    const total = clamp(8 + Math.round(S.stats.slots), 8, S.pads.length);
    S.pads.forEach((p, i) => { p.unlocked = i < total; });
  }

  function buildBuildings() {
    const hpBase = 1000;
    const list = [
      { id: 'keep', name: '시청', icon: '🏯', x: 23, y: 23, w: 3.8, h: 3.8, hp: 1, keep: true },
      { id: 'house1', name: '민가', icon: '🏠', x: 17.3, y: 17.3, w: 2.2, h: 2.2, hp: hpBase },
      { id: 'house2', name: '민가', icon: '🏠', x: 28.7, y: 17.3, w: 2.2, h: 2.2, hp: hpBase },
      { id: 'house3', name: '민가', icon: '🏠', x: 28.7, y: 28.7, w: 2.2, h: 2.2, hp: hpBase },
      { id: 'chapel', name: '예배당', icon: '⛪', x: 17.3, y: 28.7, w: 2.2, h: 2.2, hp: hpBase * 0.9 },
      { id: 'market', name: '시장', icon: '🏪', x: 23, y: 27.2, w: 1.7, h: 1.5, hp: hpBase * 0.7 },
      { id: 'forge', name: '대장간', icon: '⚒️', x: 26.2, y: 23, w: 1.6, h: 1.6, hp: hpBase * 1.1 },
      { id: 'well', name: '우물', icon: '⛲', x: 19.8, y: 23, w: 1.1, h: 1.1, hp: hpBase * 0.6 },
      { id: 'warehouse', name: '창고', icon: '📦', x: 20.4, y: 18.1, w: 1.7, h: 1.4, hp: hpBase * 1.15 },
    ];
    S.buildings = list.map(b => Object.assign({}, b, { hpMax: b.hp, alive: true }));
  }

  function buildProps() {
    // 나무·바위·수레 — 연출용(전투 판정 없음)
    S.props = [];
    let seed = 1337;
    const rnd2 = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const inner = [
      ['barrel', 21.2, 26.4], ['barrel', 21.7, 26.5], ['crate', 20.0, 26.9],
      ['cart', 25.2, 26.5], ['barrel', 24.9, 26.3], ['crate', 25.9, 19.6],
      ['barrel', 20.4, 19.5], ['cart', 20.1, 21.0], ['crate', 26.4, 20.2],
      ['torch', 21.6, 25.8], ['torch', 24.4, 25.8], ['torch', 21.6, 20.3], ['torch', 24.4, 20.3],
      ['hay', 16.8, 24.6], ['hay', 29.2, 21.4], ['barrel', 16.8, 24.0],
    ];
    for (const p of inner) S.props.push({ x: p[1], y: p[2], type: p[0], scale: 1 });
    for (let i = 0; i < 180; i++) {
      const x = rnd2() * 45, y = rnd2() * 45;
      if (x > 12 && x < 34 && y > 12 && y < 34) continue;   // 마을 내부 제외
      if (Math.abs(x - 23) < 2.4 || Math.abs(y - 23) < 2.4) continue; // 길 제외
      const roll = rnd2();
      S.props.push({
        x, y, type: roll < 0.58 ? 'tree' : roll < 0.88 ? 'tree2' : 'rock',
        scale: 0.8 + rnd2() * 0.55,
      });
    }
  }

  /* ───────── 새 게임 ───────── */
  function startRun(opts) {
    opts = opts || {};
    computeStats();
    S.phase = 'prep';
    S.stage = opts.stage || 1;
    S.wi = 1;
    S.globalWave = 0;
    S.paused = false;
    S.speed = 1;
    S.gold = Math.round(650 + S.stats.startGold);
    S.rp = Math.round(20 + S.stats.startRP);
    S.walls = {};
    makeWalls(true);
    S.keepMax = keepMax();
    S.keepHp = S.keepMax;
    S.towers = [];
    S.enemies = [];
    S.projectiles = [];
    S.particles = [];
    S.decals = [];
    S.floaters = [];
    S.kills = 0; S.waveKills = 0; S.totalGold = 0;
    S.bossRef = null;
    S.lastWaveSummary = null;
    S.time = 0;
    buildPads();
    buildBuildings();
    buildProps();
    // 재회귀 '배치된 포탑' 영구 강화
    let free = Math.round(S.stats.freeTower);
    for (const p of S.pads) {
      if (free <= 0) break;
      if (p.unlocked) { placeTower(p.i, 'gatling', true); free--; }
    }
    S.prepTime = 26; S.prepLeft = 26;
    S.waveComp = D.waveComp(S.stage, S.wi);
    S.waveDirs = D.waveDirs(S.stage, S.wi);
    S.waveEnded = true;
    save.research = save.research || {};
    S.phase = 'prep';
    startPrep(true);
    saveRun();
    emit('start');
  }

  function continueRun() {
    if (!save.run) return false;
    computeStats();
    const r = save.run;
    S.stage = r.stage || 1; S.wi = r.wi || 1; S.globalWave = r.globalWave || 0;
    S.gold = r.gold || 0; S.rp = r.rp || 0;
    S.kills = r.kills || 0;
    makeWalls(true);
    S.keepMax = keepMax();
    S.keepHp = clamp(r.keepHp || S.keepMax, 1, S.keepMax);
    for (const id in (r.wallHp || {})) if (S.walls[id]) S.walls[id].hp = clamp(r.wallHp[id], 0, S.walls[id].max);
    buildPads(); buildBuildings(); buildProps();
    S.towers = [];
    S.enemies = []; S.projectiles = []; S.particles = []; S.decals = [];
    for (const t of (r.towers || [])) {
      const pad = S.pads[t.pad];
      if (!pad) continue;
      placeTower(t.pad, t.type, true);
      const tw = pad.tower;
      if (tw) { tw.level = t.level || 1; tw.hp = t.hp || tw.hpMax; }
    }
    S.phase = 'prep';
    startPrep(true);
    emit('start');
    return true;
  }

  /* ───────── 준비/웨이브 ───────── */
  function startPrep(silent) {
    S.phase = 'prep';
    S.prepTime = S.stage === 1 && S.globalWave === 0 ? 30 : 16;
    S.prepLeft = S.prepTime;
    S.waveComp = D.waveComp(S.stage, S.wi);
    S.waveDirs = D.waveDirs(S.stage, S.wi);
    S.waveEnded = true;
    if (!silent) emit('prep');
  }

  function startWave() {
    if (S.phase !== 'prep') return;
    S.phase = 'wave';
    S.globalWave = (S.stage - 1) * D.WAVES_PER_STAGE + S.wi;
    if (window.SFX) SFX.play('wave');
    S.waveKills = 0;
    S.waveComp = D.waveComp(S.stage, S.wi);
    S.waveDirs = D.waveDirs(S.stage, S.wi);
    const comp = S.waveComp;
    const total = comp.reduce((a, c) => a + c.count, 0);
    const dirs = S.waveDirs;
    const scale = D.stageScale(S.stage, S.wi);
    const dur = clamp(14 + total * 0.055, 18, 78);
    S.waveDur = dur;
    S.waveTimer = 0;
    S.spawnQueue = [];
    let idx = 0;
    for (const c of comp) {
      const per = c.count;
      for (let i = 0; i < per; i++) {
        const side = dirs[(idx + i) % dirs.length];
        const t = (i / Math.max(1, per)) * dur * 0.88 + rnd(0, 1.6);
        S.spawnQueue.push({ type: c.type, side, t, lane: Math.random() });
        idx++;
      }
    }
    S.spawnQueue.sort((a, b) => a.t - b.t);
    S.spawnCursor = 0;
    S.waveEnded = false;
    S.damageTakenThisWave = 0;
    S.lastKillAt = S.time; S.enraged = false;
    if (S.stats) baseBoss = null;
    emit('waveStart', { stage: S.stage, wi: S.wi, comp, dirs, total, scale });
    saveRun();
  }

  function spawnFromQueue(dt) {
    S.waveTimer += dt;
    while (S.spawnCursor < S.spawnQueue.length && S.spawnQueue[S.spawnCursor].t <= S.waveTimer) {
      const q = S.spawnQueue[S.spawnCursor++];
      if (S.enemies.length > 2600) continue;
      spawnEnemy(q.type, q.side, q.lane);
    }
  }

  function waveCompleteCheck() {
    if (S.phase !== 'wave' || S.waveEnded) return;
    if (S.spawnCursor >= S.spawnQueue.length && S.enemies.length === 0) {
      S.waveEnded = true;
      endWave();
    }
  }

  let baseBoss = null;
  function endWave() {
    const g = S.globalWave;
    const goldReward = Math.round((120 + 26 * g) * S.stats.goldMul);
    const rpReward = Math.round((7 + 3.2 * g) * S.stats.rpMul);
    S.gold += goldReward; S.totalGold += goldReward;
    S.rp += rpReward;
    // 수리
    const rep = (0.12 + S.stats.repair);
    for (const id in S.walls) {
      const w = S.walls[id];
      w.hp = Math.min(w.max, w.hp + w.max * rep);
    }
    S.keepHp = Math.min(S.keepMax, S.keepHp + S.keepMax * rep * 0.6);
    for (const b of S.buildings) if (b.alive && b.hp < b.hpMax) b.hp = Math.min(b.hpMax, b.hp + b.hpMax * 0.25);
    if (window.SFX) SFX.play('victory');
    save.totalKills = (save.totalKills || 0) + S.waveKills;
    S.lastWaveSummary = { wave: g, gold: goldReward, rp: rpReward, kills: S.waveKills, damage: Math.round(S.damageTakenThisWave) };
    save.bestWave = Math.max(save.bestWave || 0, g);
    save.maxStage = Math.max(save.maxStage || 1, S.stage);
    persist();
    if (S.wi >= D.WAVES_PER_STAGE) {
      stageClear();
    } else {
      S.wi += 1;
      S.phase = 'prep';
      startPrep(true);
      emit('waveClear', S.lastWaveSummary);
      saveRun();
    }
  }

  function stageClear() {
    S.phase = 'stageclear';
    save.stagesCleared = Math.max(save.stagesCleared || 0, S.stage);
    save.maxStage = Math.max(save.maxStage || 1, S.stage + 1);
    persist();
    const bonusGold = Math.round((180 + 40 * S.stage) * S.stats.goldMul);
    const bonusRp = Math.round((30 + 12 * S.stage) * S.stats.rpMul);
    S.gold += bonusGold;
    S.rp += bonusRp;
    S.lastStageSummary = { stage: S.stage, gold: bonusGold, rp: bonusRp };
    emit('stageClear', { stage: S.stage, gold: bonusGold, rp: bonusRp, shards: prestigeGain() });
    saveRun();
  }

  function nextStage() {
    S.stage += 1;
    S.wi = 1;
    makeWalls(false);
    for (const id in S.walls) S.walls[id].hp = S.walls[id].max;
    S.keepMax = keepMax();
    S.keepHp = S.keepMax;
    for (const b of S.buildings) { b.alive = true; b.hp = b.hpMax; }
    buildPadsKeepTowers();
    S.phase = 'prep';
    startPrep(false);
    saveRun();
    emit('nextStage', S.stage);
  }

  function buildPadsKeepTowers() {
    const old = S.towers.slice();
    buildPads();
    S.towers = [];
    for (const t of old) {
      const pad = S.pads[t.pad];
      if (!pad || !pad.unlocked) {
        // 슬롯이 줄면 보상 없이 제거하지 않고 가장 가까운 빈 슬롯으로 이동
        const target = S.pads.find(p => p.unlocked && !p.tower);
        if (target) { S.towers.push(t); target.tower = t; t.pad = target.i; t.x = target.x; t.y = target.y; continue; }
        continue;
      }
      S.towers.push(t); pad.tower = t; t.x = pad.x; t.y = pad.y;
    }
  }

  /* ───────── 재회귀 ───────── */
  function prestigeGain() {
    const g = Math.max(S.globalWave, save.bestWave || 0);
    const raw = Math.pow(g, 1.32) * 0.85 + S.kills / 1600 + (save.stagesCleared || 0) * 4;
    return Math.max(0, Math.floor(raw * S.stats.shardMul));
  }
  function canPrestige() {
    return S.globalWave >= D.WAVES_PER_STAGE || S.phase === 'defeat' || (save.bestWave || 0) >= D.WAVES_PER_STAGE;
  }
  function doPrestige() {
    const gain = prestigeGain();
    S.shards += gain;
    save.shards = S.shards;
    save.prestigeCount = (save.prestigeCount || 0) + 1;
    save.bestWave = Math.max(save.bestWave || 0, S.globalWave);
    // 연구 초기화(회귀 기억 유지분)
    const keep = S.stats.keepResearch;
    const nextResearch = {};
    if (keep > 0) {
      for (const id in save.research) {
        const lv = Math.floor(save.research[id] * keep);
        if (lv > 0) nextResearch[id] = lv;
      }
    }
    save.research = nextResearch;
    save.run = null;
    S.phase = 'lobby';
    S.enemies = []; S.towers = []; S.projectiles = []; S.particles = []; S.decals = [];
    persist();
    computeStats();
    emit('prestige', { gain });
    return gain;
  }

  /* ───────── 포탑 ───────── */
  function towerCost(typeId, level) {
    const t = D.TOWERS[typeId];
    if (!t) return 0;
    if (!level) return Math.round(t.cost * S.stats.buildCostMul);
    return Math.round(t.cost * 0.62 * Math.pow(1.52, level - 1) * S.stats.buildCostMul);
  }
  function placeTower(padIndex, typeId, free) {
    const pad = S.pads[padIndex];
    const def = D.TOWERS[typeId];
    if (!pad || !def || pad.tower) return false;
    if (!S.stats.unlocked.has(typeId)) return false;
    const cost = towerCost(typeId, 0);
    if (!free && S.gold < cost) return false;
    if (!free) S.gold -= cost;
    const scale = 1;
    const tower = {
      id: 'tw' + (S.towers.length + 1) + '_' + Math.floor(Math.random() * 9999),
      type: typeId, pad: padIndex, x: pad.x, y: pad.y, level: 1,
      hpMax: def.hp * (1 + 0.08 * (S.stage - 1)), hp: def.hp * (1 + 0.08 * (S.stage - 1)),
      cd: 0.2, target: null, angle: -Math.PI / 2, recoil: 0, beamTime: 0, charge: 0,
      kills: 0, damage: 0, ramp: 0,
    };
    pad.tower = tower;
    S.towers.push(tower);
    emit('towerChange');
    return true;
  }
  function upgradeTower(tower) {
    if (!tower || tower.level >= D.TOWER_MAX_LEVEL) return false;
    const cost = towerCost(tower.type, tower.level);
    if (S.gold < cost) return false;
    S.gold -= cost;
    tower.level++;
    tower.hpMax *= 1.12;
    tower.hp = Math.min(tower.hpMax, tower.hp + tower.hpMax * 0.25);
    emit('towerChange');
    return true;
  }
  function sellTower(tower) {
    if (!tower) return false;
    const idx = S.towers.indexOf(tower);
    if (idx < 0) return false;
    let spent = towerCost(tower.type, 0);
    for (let l = 1; l < tower.level; l++) spent += towerCost(tower.type, l);
    S.gold += Math.round(spent * 0.6);
    S.towers.splice(idx, 1);
    const pad = S.pads[tower.pad];
    if (pad) pad.tower = null;
    emit('towerChange');
    return true;
  }

  function towerStats(t) {
    const def = D.TOWERS[t.type];
    const lvl = 1 + (t.level - 1) * D.UPGRADE_STEP;
    const st = S.stats;
    return {
      def, level: t.level,
      dmg: def.dmg * lvl * st.dmgMul,
      rate: def.rate * (1 + (t.level - 1) * 0.03) * st.rateMul,
      range: def.range * st.rangeMul * (1 + (t.level - 1) * 0.015),
      aoe: (def.aoe || 0) * st.aoeMul * (1 + (t.level - 1) * 0.02),
      armorPen: (def.armorPen || 0) + st.armorPen + (t.level - 1) * 1.2,
      burn: (def.burn || 0) + st.burn,
      pierce: (def.pierce || 0) + st.pierce,
      chains: (def.chains || 0) + Math.floor(st.chain),
      salvo: def.salvo || 1,
      crit: st.crit, critMul: st.critMul,
      slow: (def.slow || 0) + (st.slowHit || 0),
    };
  }
  function towerDps(t) {
    const s = towerStats(t);
    const def = s.def;
    let dps = s.dmg * s.rate;
    if (def.proj === 'shell' || def.proj === 'grenade') dps *= 2.2;
    if (def.salvo) dps *= def.salvo;
    if (def.proj === 'chain') dps *= 2.6;
    if (def.proj === 'beam') dps *= 1.5;
    if (def.proj === 'flame') dps *= 2.4;
    return Math.round(dps);
  }

  /* ───────── 적 ───────── */
  function spawnEnemy(type, side, lane) {
    const def = D.ENEMIES[type];
    if (!def) return;
    const scale = D.stageScale(S.stage, S.wi);
    const hp = def.hp * scale.hp;
    const e = pool.pop() || {};
    e.id = e.id || (spawnEnemy._n = (spawnEnemy._n || 0) + 1);
    e.type = type; e.def = def;
    e.hp = hp; e.hpMax = hp;
    e.armor = def.armor + scale.armor;
    e.speed = def.speed * scale.speed;
    e.dmg = def.dmg * scale.dmg;
    e.interval = def.interval || 1;
    e.bounty = def.bounty * scale.bounty;
    e.side = side;
    e.size = def.size || 0.7;
    e.state = 'march';
    e.atkCd = rnd(0, 0.5);
    e.slowT = 0; e.slowAmt = 0; e.stun = 0; e.burnT = 0; e.burnDps = 0;
    e.hurt = 0; e.dead = false; e.anim = Math.random() * 6.28; e.walk = 0;
    e.flip = 1;
    const off = 3.0 + lane * 10.0;       // 성문 앞쪽으로 모이는 위치
    let x, y, tx, ty;
    if (side === 'N') { x = V.x0 + off; y = 4.4; tx = V.x0 + off; ty = V.y0 - 0.55; }
    else if (side === 'S') { x = V.x0 + off; y = 41.6; tx = V.x0 + off; ty = V.y1 + 0.55; }
    else if (side === 'W') { x = 4.4; y = V.y0 + off; tx = V.x0 - 0.55; ty = V.y0 + off; }
    else { x = 41.6; y = V.y0 + off; tx = V.x1 + 0.55; ty = V.y0 + off; }
    e.x = x + rnd(-0.5, 0.5); e.y = y + rnd(-0.5, 0.5);
    e.tx = tx; e.ty = ty;
    e.homeX = e.x; e.homeY = e.y;
    e.spawnR = 20;
    if (def.ranged) { e.ranged = def.ranged; e.rangeStop = def.ranged; }
    S.enemies.push(e);
    return e;
  }

  function enemiesInRadius(x, y, r, out) {
    out = out || [];
    out.length = 0;
    const cell = grid.cell;
    const c0 = Math.max(0, Math.floor((x - r) / cell)), c1 = Math.min(grid.cols - 1, Math.floor((x + r) / cell));
    const r0 = Math.max(0, Math.floor((y - r) / cell)), r1 = Math.min(grid.rows - 1, Math.floor((y + r) / cell));
    const r2 = r * r;
    for (let cy = r0; cy <= r1; cy++) {
      for (let cx = c0; cx <= c1; cx++) {
        const arr = grid.items[cy * grid.cols + cx];
        for (let i = 0; i < arr.length; i++) {
          const e = arr[i];
          if (e.dead) continue;
          const dx = e.x - x, dy = e.y - y;
          if (dx * dx + dy * dy <= r2) out.push(e);
        }
      }
    }
    return out;
  }

  function rebuildGrid() {
    const cell = grid.cell;
    grid.cols = Math.ceil(D.MAP / cell);
    grid.rows = grid.cols;
    if (grid.items.length !== grid.cols * grid.rows) {
      grid.items = new Array(grid.cols * grid.rows);
      for (let i = 0; i < grid.items.length; i++) grid.items[i] = [];
    } else {
      for (let i = 0; i < grid.items.length; i++) grid.items[i].length = 0;
    }
    for (let i = 0; i < S.enemies.length; i++) {
      const e = S.enemies[i];
      if (e.dead) continue;
      const cx = clamp(Math.floor(e.x / cell), 0, grid.cols - 1);
      const cy = clamp(Math.floor(e.y / cell), 0, grid.rows - 1);
      grid.items[cy * grid.cols + cx].push(e);
    }
  }

  /* ───────── 피해 ───────── */
  function damageEnemy(e, dmg, opts) {
    if (e.dead) return;
    opts = opts || {};
    const armor = Math.max(0, e.armor - (opts.pen || 0));
    let eff = dmg * (25 / (25 + armor));
    if (opts.crit) eff *= opts.critMul || 1.8;
    e.hp -= eff;
    e.hurt = 0.12;
    S.totalDamage += eff;
    if (opts.burn) { e.burnDps = Math.max(e.burnDps, opts.burn); e.burnT = Math.max(e.burnT, 2.6); }
    if (opts.slow) { e.slowAmt = Math.max(e.slowAmt, opts.slow); e.slowT = Math.max(e.slowT, 1.8); }
    if (opts.stun) { e.stun = Math.max(e.stun, opts.stun); }
    if (opts.tower) opts.tower.damage += eff;
    if ((opts.crit || eff > 60) && window.Render) {
      window.Render.addFloater(e.x, e.y, Math.round(eff).toLocaleString('ko-KR'), !!opts.crit);
    }
    if (e.hp <= 0) killEnemy(e, opts);
  }

  function killEnemy(e, opts) {
    if (e.dead) return;
    e.dead = true;
    S.kills++; S.waveKills++; S.lastKillAt = S.time;
    const gold = e.bounty * S.stats.goldMul;
    S.gold += gold; S.totalGold += gold;
    if (opts && opts.tower) opts.tower.kills++;
    addParticle({ kind: 'blood', x: e.x, y: e.y, size: e.size, life: 0.6, t: 0 });
    if (S.decals.length < 260) S.decals.push({ x: e.x, y: e.y, r: 0.22 * e.size, a: 0.55, t: 0 });
    if (e.def.boss) {
      addParticle({ kind: 'flash', x: e.x, y: e.y, size: 4, life: 0.5, t: 0 });
      if (window.Render) window.Render.shake(9);
      emit('bossDead', { x: e.x, y: e.y });
    }
    rollRelic(e);
    const idx = S.enemies.indexOf(e);
    if (idx >= 0) { S.enemies[idx] = S.enemies[S.enemies.length - 1]; S.enemies.pop(); }
  }

  function rollRelic(e) {
    if (S.cheat.relicTest) { grantRandomRelic(); S.cheat.relicTest = false; return; }
    const isBoss = !!e.def.boss;
    const isElite = isBoss || e.def.siege || e.type === 'knight';
    let chance = 0.00065;
    if (e.type === 'berserker') chance *= 1.6;
    if (isElite) chance *= 5;
    if (isBoss) chance *= 25;
    chance *= (S.cheat.relicBoost || 1);
    if (Math.random() < chance) {
      const r = grantRandomRelic(isBoss ? 'boss' : 'normal');
      if (r) {
        for (let i = 0; i < 18; i++) {
          addParticle({ kind: 'relic', x: e.x + rnd(-1.2, 1.2), y: e.y + rnd(-1.2, 1.2), size: 0.6, life: 1.4 + Math.random() * 0.8, t: 0 });
        }
        addParticle({ kind: 'flash', x: e.x, y: e.y, size: 2.2, life: 0.5, t: 0 });
      }
    }
  }

  function grantRandomRelic(source) {
    const owned = save.relics || {};
    const missing = D.RELICS.filter(r => !owned[r.id]);
    if (!missing.length) {
      S.shards += 8; save.shards = S.shards; persist();
      emit('relic', { dupe: true, shards: 8 });
      return null;
    }
    // 등급 추첨 (보스는 상위 등급 확률 상승)
    const weights = source === 'boss'
      ? { common: 34, rare: 34, epic: 22, legendary: 10 }
      : { common: 66, rare: 24, epic: 8, legendary: 2 };
    let total = 0; for (const k in weights) total += weights[k];
    let roll = Math.random() * total, rarity = 'common';
    for (const k in weights) { roll -= weights[k]; if (roll <= 0) { rarity = k; break; } }
    let cands = missing.filter(r => r.rarity === rarity);
    if (!cands.length) cands = missing;
    const relic = cands[Math.floor(Math.random() * cands.length)];
    save.relics[relic.id] = 1;
    if (!save.relicNew) save.relicNew = {};
    save.relicNew[relic.id] = 1;
    persist();
    computeStats();
    if (window.SFX) SFX.play('relic');
    emit('relic', { relic });
    return relic;
  }

  function addParticle(p) { if (S.particles.length < 900) S.particles.push(p); }

  /* ───────── 적 업데이트 ───────── */
  function updateEnemies(dt) {
    const cell = grid.cell;
    for (let i = S.enemies.length - 1; i >= 0; i--) {
      const e = S.enemies[i];
      if (e.dead) continue;
      if (e.hurt > 0) e.hurt -= dt;
      if (e.stun > 0) e.stun -= dt;
      if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
      if (e.burnT > 0) {
        e.burnT -= dt;
        damageEnemy(e, e.burnDps * dt, {});
        if (e.dead) continue;
      }
      const wall = S.walls[e.side];
      const breached = wall.hp <= 0;
      let tx = e.tx, ty = e.ty;
      if (breached) {
        if (!e.inside) { e.inside = true; }
        const target = enemyInnerTarget(e);
        tx = target.x; ty = target.y;
        e.innerTarget = target;
      }
      let dx = tx - e.x, dy = ty - e.y;
      let d = Math.sqrt(dx * dx + dy * dy) || 1;

      // 원거리 유닛: 정지 거리
      const stopAt = e.ranged ? Math.max(1.1, e.rangeStop || 0) * 0.9 : 0.35;
      const arrived = d <= Math.max(0.35, stopAt);
      const wallDist = e.side === 'N' ? e.y - D.VILLAGE.y0
        : e.side === 'S' ? D.VILLAGE.y1 - e.y
        : e.side === 'W' ? e.x - D.VILLAGE.x0
        : D.VILLAGE.x1 - e.x;
      const atWall = !breached && wallDist > -0.5 && wallDist < 0.85;

      if (!arrived && !atWall) {
        e.state = 'march';
        let spd = e.speed * (S.enraged ? 1.35 : 1) * (e.stun > 0 ? 0 : (1 - e.slowAmt));
        // 분리(무리 밀집) — 주변 셀만 샘플링
        let sx = 0, sy = 0;
        const cx = clamp(Math.floor(e.x / cell), 0, grid.cols - 1);
        const cy = clamp(Math.floor(e.y / cell), 0, grid.rows - 1);
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const arr = grid.items[(cy + oy) * grid.cols + (cx + ox)];
            if (!arr) continue;
            for (let j = 0; j < arr.length; j++) {
              const o = arr[j];
              if (o === e || o.dead) continue;
              const ddx = e.x - o.x, ddy = e.y - o.y;
              const dd = ddx * ddx + ddy * ddy;
              const min = (e.size + o.size) * 0.42;
              if (dd < min * min && dd > 0.0001) {
                const inv = 1 / Math.sqrt(dd);
                sx += ddx * inv; sy += ddy * inv;
              }
            }
          }
        }
        let mx = dx / d, my = dy / d;
        mx += sx * 0.22 + Math.cos(e.anim + S.time * 2.2) * 0.06;
        my += sy * 0.22 + Math.sin(e.anim + S.time * 2.2) * 0.06;
        const ml = Math.hypot(mx, my) || 1;
        e.x += (mx / ml) * spd * dt;
        e.y += (my / ml) * spd * dt;
        e.walk += spd * dt * 3.4;
        e.flip = mx >= 0 ? 1 : -1;
        e.state = 'march';
        // 성벽에 닿았는지
        if (!breached && d < 0.9 && !e.ranged) { e.state = 'attack'; }
      } else {
        e.state = 'attack';
        e.walk += dt * 1.2;
        if (e.ranged && !breached) {
          // 원거리: 성벽 또는 포탑 저격
          e.atkCd -= dt;
          if (e.atkCd <= 0) {
            e.atkCd = e.interval;
            const tw = nearestTower(e.x, e.y, e.ranged + 1.5);
            if (tw && Math.random() < 0.55) {
              damageTower(tw, e.dmg * 1.1);
              addParticle({ kind: 'spark', x: tw.x, y: tw.y, size: 0.5, life: 0.4, t: 0 });
            } else if (!breached) {
              damageWall(e.side, e.dmg * (e.def.siege ? 1.0 : 0.42), e.x, e.y);
            }
          }
        } else if (!breached) {
          e.atkCd -= dt;
          if (e.atkCd <= 0) {
            e.atkCd = e.interval;
            damageWall(e.side, e.dmg * (e.def.siege ? 1.3 : 0.46), e.x, e.y);
            if (e.type === 'siege' && Math.random() < 0.25) {
              // 공성탑은 농민병을 쏟아낸다
              const ee = spawnEnemy('peasant', e.side, Math.random());
              if (ee) { ee.x = e.x; ee.y = e.y; ee.tx = e.x + rnd(-1, 1); ee.ty = e.y + 1; }
            }
          }
        } else {
          // 성벽 붕괴 → 내부 시설 공격
          e.atkCd -= dt;
          if (e.atkCd <= 0) {
            e.atkCd = e.interval;
            const t = e.innerTarget || enemyInnerTarget(e);
            if (t && t.kind === 'tower') damageTower(t.ref, e.dmg);
            else if (t && t.kind === 'building') damageBuilding(t.ref, e.dmg);
            else damageKeep(e.dmg);
          }
        }
      }
    }
  }

  function nearestTower(x, y, range) {
    let best = null, bd = range * range;
    for (const t of S.towers) {
      const d = dist2(x, y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  function enemyInnerTarget(e) {
    // 가장 가까운 내부 시설/포탑/keep
    let best = null, bd = 1e9;
    for (const b of S.buildings) {
      if (!b.alive) continue;
      const d = dist2(e.x, e.y, b.x, b.y) - (b.keep ? 4 : 0);
      if (d < bd) { bd = d; best = { kind: 'building', ref: b, x: b.x, y: b.y + (b.keep ? 1.4 : 0) }; }
    }
    for (const t of S.towers) {
      const d = dist2(e.x, e.y, t.x, t.y);
      if (d < bd) { bd = d; best = { kind: 'tower', ref: t, x: t.x, y: t.y + 0.3 }; }
    }
    return best || { kind: 'keep', x: 23, y: 23 };
  }

  function damageWall(side, amount, x, y) {
    if (S.cheat.invincible) return;
    const w = S.walls[side];
    if (!w || w.hp <= 0) return;
    w.hp -= amount;
    S.damageTakenThisWave += amount;
    if (w.hp < 0) w.hp = 0;
    if (Math.random() < 0.25) addParticle({ kind: 'spark', x: x || 23, y: y || 17, size: 0.4, life: 0.35, t: 0 });
    if (w.hp <= 0) {
      if (window.SFX) SFX.play('breach');
      if (window.Render) window.Render.shake(8);
      emit('wallBreach', { side });
      for (let i = 0; i < 20; i++) addParticle({ kind: 'debris', x: 23 + rnd(-6, 6), y: 17 + rnd(-2, 2), size: 0.5, life: 1, t: 0 });
    }
  }
  function damageKeep(amount) {
    if (S.cheat.invincible) return;
    S.keepHp -= amount;
    S.damageTakenThisWave += amount;
    if (S.keepHp <= 0) { S.keepHp = 0; defeat(); }
  }
  function damageBuilding(b, amount) {
    if (S.cheat.invincible) return;
    b.hp -= amount;
    if (b.hp <= 0 && b.alive) {
      b.alive = false; b.hp = 0;
      addParticle({ kind: 'debris', x: b.x, y: b.y, size: 1, life: 1.2, t: 0 });
      emit('buildingDown', b);
    }
  }
  function damageTower(t, amount) {
    if (S.cheat.invincible) return;
    t.hp -= amount;
    if (t.hp <= 0) {
      const idx = S.towers.indexOf(t);
      if (idx >= 0) S.towers.splice(idx, 1);
      const pad = S.pads[t.pad]; if (pad) pad.tower = null;
      for (let i = 0; i < 10; i++) addParticle({ kind: 'debris', x: t.x, y: t.y, size: 0.6, life: 0.9, t: 0 });
      emit('towerDestroyed', t);
    }
  }

  function defeat() {
    if (S.phase === 'defeat') return;
    S.phase = 'defeat';
    save.bestWave = Math.max(save.bestWave || 0, S.globalWave);
    persist();
    if (window.SFX) SFX.play('defeat');
    emit('defeat', { wave: S.globalWave, stage: S.stage, kills: S.kills });
    saveRun();
  }

  /* ───────── 포탑 업데이트 ───────── */
  const qbuf = [];
  function updateTowers(dt) {
    for (const t of S.towers) {
      const s = towerStats(t);
      const def = s.def;
      t.cd -= dt;
      if (t.recoil > 0) t.recoil = Math.max(0, t.recoil - dt * 6);
      // 표적 선택
      let target = t.target;
      if (!target || target.dead || dist2(target.x, target.y, t.x, t.y) > s.range * s.range) {
        target = pickTarget(t, s);
        t.target = target;
      }
      if (target) {
        const ang = Math.atan2(target.y - t.y, target.x - t.x);
        let da = ang - t.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        t.angle += clamp(da, -8 * dt, 8 * dt);
      }
      if (t.cd > 0 || !target) {
        if (def.proj === 'beam' && target) fireTower(t, s, target, dt);
        continue;
      }
      t.cd = 1 / s.rate;
      t.recoil = 1;
      fireTower(t, s, target, dt);
    }
  }

  function pickTarget(t, s) {
    const cands = enemiesInRadius(t.x, t.y, s.range, qbuf);
    if (!cands.length) return null;
    let best = null, bs = -1e9;
    for (const e of cands) {
      let sc = 100 - Math.hypot(e.x - t.x, e.y - t.y);
      if (e.def.boss) sc += 30;
      if (e.def.siege) sc += 6;
      sc += (1 - e.hp / e.hpMax) * 8;
      if (sc > bs) { bs = sc; best = e; }
    }
    return best;
  }

  function fireTower(t, s, target, dt) {
    const def = s.def;
    if (window.SFX) SFX.play(def.sound || 'mg');
    if (window.Render) window.Render.shake(def.proj === 'shell' ? 1.2 : def.sound === 'cannon' ? 2.2 : 0);
    const crit = Math.random() < s.crit;
    const ang = Math.atan2(target.y - t.y, target.x - t.x);
    switch (def.proj) {
      case 'bullet': {
        const shots = 1 + (Math.random() < S.stats.doubleShot ? 1 : 0);
        for (let i = 0; i < shots; i++) {
          const spread = (def.spread || 0.04) * (Math.random() - 0.5) * 2;
          const dist = Math.hypot(target.x - t.x, target.y - t.y);
          S.projectiles.push({
            kind: 'bullet', x: t.x, y: t.y - 0.5,
            vx: Math.cos(ang + spread) * 38, vy: Math.sin(ang + spread) * 38,
            dmg: s.dmg, life: Math.min(0.9, dist / 38 + 0.12),
            pen: s.armorPen + (def.armorPen ? 0 : 0), burn: s.burn, crit, critMul: s.critMul,
            pierce: s.pierce, hits: 0, tower: t, trail: 0.035, slow: s.slow, color: '#ffe6a3',
          });
        }
        addParticle({ kind: 'muzzle', x: t.x + Math.cos(ang) * 0.45, y: t.y - 0.55 + Math.sin(ang) * 0.28, size: 0.35, life: 0.08, t: 0, ang });
        break;
      }
      case 'shell': case 'grenade': {
        const salvo = def.proj === 'grenade' ? (Math.random() < S.stats.doubleShot ? 2 : 1) : 1;
        for (let i = 0; i < salvo; i++) {
          S.projectiles.push({
            kind: 'shell', x: t.x, y: t.y - 0.4,
            sx: t.x, sy: t.y - 0.4, tx: target.x + rnd(-0.35, 0.35), ty: target.y + rnd(-0.35, 0.35),
            t: 0, dur: 0.65 + Math.random() * 0.1, dmg: s.dmg, aoe: s.aoe, pen: s.armorPen,
            crit, critMul: s.critMul, burn: s.burn, tower: t, color: def.proj === 'grenade' ? '#ffd06a' : '#ffb35c',
            arcH: def.proj === 'grenade' ? 1.4 : 2.4, chain: S.stats.chain,
          });
        }
        addParticle({ kind: 'muzzle', x: t.x + Math.cos(ang) * 0.4, y: t.y - 0.7, size: 0.5, life: 0.12, t: 0, ang });
        break;
      }
      case 'rocket': {
        for (let i = 0; i < s.salvo; i++) {
          const cands = enemiesInRadius(t.x, t.y, s.range, qbuf);
          const tg = cands.length ? cands[Math.floor(Math.random() * cands.length)] : target;
          if (!tg) continue;
          S.projectiles.push({
            kind: 'rocket', x: t.x + rnd(-0.4, 0.4), y: t.y - 0.8, tx: tg.x, ty: tg.y,
            target: tg, spd: 12, dmg: s.dmg, aoe: s.aoe, pen: s.armorPen, crit: false,
            critMul: s.critMul, burn: s.burn, tower: t, life: 3, angle: ang,
          });
        }
        break;
      }
      case 'flame': {
        const range = s.range, spread = 0.5;
        const cands = enemiesInRadius(t.x, t.y, range + 0.6, qbuf);
        for (const e of cands) {
          const ea = Math.atan2(e.y - t.y, e.x - t.x);
          let da = Math.abs(ea - ang);
          while (da > Math.PI) da = Math.abs(da - Math.PI * 2);
          if (da <= spread) {
            damageEnemy(e, s.dmg * (1 - Math.hypot(e.x - t.x, e.y - t.y) / (range * 1.35)), {
              pen: s.armorPen, burn: s.burn, slow: s.slow, tower: t,
            });
          }
        }
        addParticle({ kind: 'flame', x: t.x + Math.cos(ang) * 0.5, y: t.y - 0.55, size: 1, life: 0.3, t: 0, ang, range, cryo: !!def.freeze });
        break;
      }
      case 'beam': {
        // 지속 광선: 틱마다 피해, 램프업
        t.ramp = Math.min(2.4, (t.ramp || 0) + dt * 1.6);
        damageEnemy(target, s.dmg * dt * t.ramp, { pen: s.armorPen, burn: s.burn, tower: t, crit: false });
        t.beamTime = 0.1;
        t.beamTarget = target;
        break;
      }
      case 'rail': {
        const dx = target.x - t.x, dy = target.y - t.y;
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L;
        const hits = [];
        for (const e of S.enemies) {
          if (e.dead) continue;
          const px = e.x - t.x, py = e.y - t.y;
          const proj = px * ux + py * uy;
          if (proj < 0 || proj > s.range * 1.2) continue;
          const perp = Math.abs(px * uy - py * ux);
          if (perp < 0.45 + e.size * 0.3) hits.push({ e, proj });
        }
        hits.sort((a, b) => a.proj - b.proj);
        for (const h of hits) damageEnemy(h.e, s.dmg, { pen: s.armorPen, burn: s.burn, crit: Math.random() < s.crit, critMul: s.critMul, tower: t });
        S.projectiles.push({ kind: 'rail', x: t.x, y: t.y - 0.7, x2: t.x + ux * s.range * 1.2, y2: t.y - 0.7 + uy * s.range * 1.2, life: 0.28, t: 0, tower: t });
        addParticle({ kind: 'muzzle', x: t.x + ux * 0.5, y: t.y - 0.7 + uy * 0.3, size: 0.9, life: 0.18, t: 0, ang });
        break;
      }
      case 'chain': {
        let cur = target;
        let dmg = s.dmg;
        const hit = new Set();
        let px = t.x, py = t.y - 0.7;
        for (let i = 0; i < s.chains; i++) {
          if (!cur) break;
          hit.add(cur);
          damageEnemy(cur, dmg, { pen: s.armorPen, burn: s.burn, tower: t, crit: false });
          S.projectiles.push({ kind: 'arc', x: px, y: py, x2: cur.x, y2: cur.y - 0.4, life: 0.18, t: 0 });
          px = cur.x; py = cur.y - 0.4;
          dmg *= 0.82;
          let next = null, bd = 3.2 * 3.2;
          for (const e of S.enemies) {
            if (e.dead || hit.has(e)) continue;
            const d = dist2(px, py, e.x, e.y);
            if (d < bd) { bd = d; next = e; }
          }
          cur = next;
        }
        break;
      }
      case 'pulse': {
        const cands = enemiesInRadius(t.x, t.y, s.range, qbuf);
        for (const e of cands) {
          damageEnemy(e, s.dmg, { pen: s.armorPen, slow: s.slow, stun: (def.stun || 0) * (e.def.boss ? 0.25 : 1), tower: t });
        }
        S.projectiles.push({ kind: 'ring', x: t.x, y: t.y, r: 0, maxR: s.range, life: 0.55, t: 0, color: '#8fe8ff' });
        break;
      }
    }
  }

  /* ───────── 발사체 ───────── */
  function updateProjectiles(dt) {
    for (let i = S.projectiles.length - 1; i >= 0; i--) {
      const p = S.projectiles[i];
      p.t = (p.t || 0) + dt;
      let remove = false;
      if (p.kind === 'bullet') {
        const ox = p.x, oy = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const dx = p.x - ox, dy = p.y - oy;
        const seg = Math.hypot(dx, dy);
        if (p.t > p.life) { remove = true; }
        else {
          // 이동 구간 전체와 충돌 검사(고속·배속에서도 탄환 관통 판정)
          const cands = enemiesInRadius((ox + p.x) / 2, (oy + p.y) / 2, seg / 2 + 0.6, qbuf);
          let best = null, bestT = 1e9;
          for (const e of cands) {
            const ex = e.x - ox, ey = e.y - oy;
            const L2 = dx * dx + dy * dy || 1;
            const t = Math.max(0, Math.min(1, (ex * dx + ey * dy) / L2));
            const px = ox + dx * t, py = oy + dy * t;
            const dd = (e.x - px) ** 2 + (e.y - py) ** 2;
            const rr = (0.4 + e.size * 0.35) ** 2;
            if (dd <= rr && t < bestT) { bestT = t; best = e; }
          }
          if (best) {
            damageEnemy(best, p.dmg, { pen: p.pen, burn: p.burn, crit: p.crit, critMul: p.critMul, slow: p.slow, tower: p.tower });
            if (p.pierce > 0) { p.pierce--; } else { remove = true; }
          }
        }
      } else if (p.kind === 'shell') {
        const k = Math.min(1, p.t / p.dur);
        p.x = lerp(p.sx, p.tx, k); p.y = lerp(p.sy, p.ty, k);
        if (k >= 1) {
          explode(p.x, p.y, p.aoe, p.dmg, p.pen, p.burn, p.tower, p.chain, p.crit, p.critMul);
          remove = true;
        }
      } else if (p.kind === 'rocket') {
        const tg = p.target;
        if (tg && !tg.dead) { p.tx = tg.x; p.ty = tg.y; }
        const ang = Math.atan2(p.ty - p.y, p.tx - p.x);
        p.angle = ang;
        p.x += Math.cos(ang) * p.spd * dt; p.y += Math.sin(ang) * p.spd * dt;
        if (dist2(p.x, p.y, p.tx, p.ty) < 0.35 * 0.35 || p.t >= p.life) {
          explode(p.x, p.y, p.aoe, p.dmg, p.pen, p.burn, p.tower, 0, false, p.critMul);
          remove = true;
        }
        if (Math.random() < 0.4) addParticle({ kind: 'smoke', x: p.x, y: p.y, size: 0.14, life: 0.35, t: 0 });
      } else {
        if (p.t >= p.life) remove = true;
      }
      if (remove) { S.projectiles.splice(i, 1); }
    }
  }

  function explode(x, y, aoe, dmg, pen, burn, tower, chain, crit, critMul) {
    const cands = enemiesInRadius(x, y, aoe, qbuf);
    for (const e of cands) {
      const d = Math.hypot(e.x - x, e.y - y);
      const falloff = 1 - 0.45 * Math.min(1, d / Math.max(0.1, aoe));
      damageEnemy(e, dmg * falloff, { pen, burn, tower, crit, critMul, slow: 0 });
    }
    addParticle({ kind: 'explosion', x, y, size: aoe, life: 0.45, t: 0 });
    addParticle({ kind: 'flash', x, y, size: aoe * 1.2, life: 0.18, t: 0 });
    if (chain > 0) {
      // 연쇄 폭발: 주변에 작은 2차 폭발
      for (let c = 0; c < chain; c++) {
        const ox = x + rnd(-aoe, aoe) * 1.2, oy = y + rnd(-aoe, aoe) * 1.2;
        const sub = enemiesInRadius(ox, oy, aoe * 0.55, qbuf);
        for (const e of sub) damageEnemy(e, dmg * 0.35, { pen, burn, tower });
        addParticle({ kind: 'explosion', x: ox, y: oy, size: aoe * 0.5, life: 0.3, t: 0 });
      }
    }
  }

  /* ───────── 파티클 ───────── */
  function updateParticles(dt) {
    for (let i = S.particles.length - 1; i >= 0; i--) {
      const p = S.particles[i];
      p.t += dt;
      if (p.kind === 'smoke') { p.x += rnd(-0.2, 0.2) * dt; p.y -= dt * 0.5; }
      if (p.kind === 'debris') { p.vy = (p.vy || 0) + dt * 3; p.x += (p.vx || 0) * dt; p.y += p.vy * dt * 0.35; }
      if (p.t >= p.life) S.particles.splice(i, 1);
    }
    for (let i = S.decals.length - 1; i >= 0; i--) {
      S.decals[i].t += dt;
      if (S.decals[i].t > 90) S.decals.splice(i, 1);
    }
  }

  /* ───────── 메인 업데이트 ───────── */
  let runSaveTimer = 0;
  function update(realDt) {
    if (S.phase === 'lobby' || S.phase === 'paused') return;
    if (S.phase === 'stageclear' || S.phase === 'defeat') { updateParticles(realDt); return; }
    const speed = S.speed;
    const total = realDt * speed;
    const steps = clamp(Math.ceil(total / 0.034), 1, 7);
    const dt = total / steps;
    for (let i = 0; i < steps; i++) {
      S.time += dt;
      if (S.phase === 'prep') {
        S.prepLeft -= dt;
        if (S.prepLeft <= 0) startWave();
      } else if (S.phase === 'wave') {
        spawnFromQueue(dt);
      }
      if (S.phase === 'wave' || S.phase === 'prep') {
        rebuildGrid();
        updateEnemies(dt);
        updateTowers(dt);
        updateProjectiles(dt);
      }
      if (S.phase === 'wave' && !S.enraged && S.enemies.length > 0 &&
          S.waveTimer > 30 && S.time - S.lastKillAt > 26) {
        S.enraged = true;
        emit('toast', '적들이 광폭화했습니다! 성벽이 위험합니다.');
        emit('enrage');
      }
      updateParticles(dt);
    }
    waveCompleteCheck();
    runSaveTimer += realDt;
    if (runSaveTimer > 6) { runSaveTimer = 0; saveRun(); }
  }

  /* ───────── 편의 ───────── */
  function setSpeed(v) { S.speed = v; }
  function togglePause() { S.paused = !S.paused; }
  function repairWallCost() { return Math.round((140 + 22 * Math.max(1, S.globalWave)) * (1 + (1 - wallRatio()) * 1.5)); }
  function wallRatio() {
    let hp = 0, mx = 0;
    for (const id in S.walls) { hp += S.walls[id].hp; mx += S.walls[id].max; }
    return mx ? hp / mx : 0;
  }
  function repairWalls() {
    const cost = repairWallCost();
    if (S.gold < cost) return false;
    S.gold -= cost;
    for (const id in S.walls) {
      const w = S.walls[id];
      w.hp = Math.min(w.max, w.hp + w.max * 0.22);
    }
    S.keepHp = Math.min(S.keepMax, S.keepHp + S.keepMax * 0.08);
    emit('toast', '성벽을 긴급 수리했습니다.');
    return true;
  }
  function repairKeepCost() { return Math.round(200 + 30 * Math.max(1, S.globalWave)); }
  function repairKeep() {
    const cost = repairKeepCost();
    if (S.gold < cost) return false;
    S.gold -= cost;
    S.keepHp = Math.min(S.keepMax, S.keepHp + S.keepMax * 0.3);
    return true;
  }

  /* ───────── 치트 ───────── */
  const cheat = {
    gold(v) { S.gold = Math.max(0, v); },
    addGold(v) { S.gold = Math.max(0, S.gold + v); },
    rp(v) { S.rp = Math.max(0, v); },
    addRp(v) { S.rp = Math.max(0, S.rp + v); },
    shards(v) { S.shards = Math.max(0, v); save.shards = S.shards; persist(); },
    addShards(v) { S.shards = Math.max(0, S.shards + v); save.shards = S.shards; persist(); },
    waveJump(n) {
      S.wi = clamp(S.wi + n, 1, D.WAVES_PER_STAGE);
      S.globalWave = (S.stage - 1) * D.WAVES_PER_STAGE + S.wi;
      S.enemies.length = 0; S.projectiles.length = 0; S.spawnCursor = 0;
      S.phase = 'prep'; startPrep(true); saveRun();
    },
    stageJump(n) {
      S.stage = clamp(S.stage + n, 1, 30);
      S.wi = 1; S.globalWave = (S.stage - 1) * D.WAVES_PER_STAGE + 1;
      S.enemies.length = 0; S.projectiles.length = 0;
      S.phase = 'prep'; startPrep(true); saveRun();
    },
    killAll() {
      for (const e of S.enemies.slice()) { e.hp = 0; killEnemy(e, { tower: null }); }
      S.enemies.length = 0;
    },
    win() {
      if (S.phase === 'prep') startWave();
      this.killAll();
      S.spawnQueue.length = 0;
      S.spawnCursor = 0;
      S.waveEnded = false;
    },
    invincible(v) { S.cheat.invincible = !!v; },
    relicBoost(v) { S.cheat.relicBoost = v; },
    giveRelic(id) {
      const r = D.RELIC_BY_ID[id];
      if (!r) return false;
      save.relics[id] = 1; persist(); computeStats();
      emit('relic', { relic: r });
      return true;
    },
    giveAllRelics() {
      D.RELICS.forEach(r => { save.relics[r.id] = 1; });
      persist(); computeStats(); emit('relicAll');
    },
    clearRelics() { save.relics = {}; persist(); computeStats(); },
    unlockAllResearch() {
      D.TECHS.forEach(t => { save.research[t.id] = t.max; });
      computeStats(); saveRun(); emit('towerChange');
    },
    clearResearch() { save.research = {}; computeStats(); emit('towerChange'); },
    resetSave() { localStorage.removeItem(SAVE_KEY); location.reload(); },
  };

  /* ───────── 초기화 ───────── */
  function init() {
    loadSave();
    computeStats();
    // 로비 배경용 마을
    makeWalls(true);
    S.keepMax = keepMax();
    S.keepHp = S.keepMax;
    buildPads();
    buildBuildings();
    buildProps();
    S.stage = 1; S.wi = 1; S.globalWave = 0;
    S.gold = 0;
  }

  return {
    S, on, emit, init, save: save, get saveData() { return save; },
    startRun, continueRun, startWave, startPrep, nextStage,
    computeStats, towerStats, towerDps, towerCost, placeTower, upgradeTower, sellTower,
    prestigeGain, canPrestige, doPrestige,
    update, setSpeed, togglePause,
    repairWalls, repairKeep, repairWallCost, repairKeepCost, wallRatio,
    cheat, persist, saveRun, grantRandomRelic,
    getSpawnPool() { return pool; },
    D,
  };
})();
