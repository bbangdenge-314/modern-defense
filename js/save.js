/* ─────────────────────────────────────────────
   save.js — 영구 진행 (localStorage)
   ───────────────────────────────────────────── */
'use strict';

const Save = {
  KEY: 'modern-defense-save-v1',
  data: null,

  defaults() {
    return {
      v: 1,
      points: 0,
      unlocked: ['pistol'],
      turretUnlocked: [],
      perks: {},
      best: { wave: 0, kills: 0 },
      stats: { runs: 0, kills: 0, wins: 0 },
      settings: { shake: true, sound: true, autoAim: false, dmgText: true },
    };
  },

  load() {
    let raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch (e) { raw = null; }
    let d = this.defaults();
    if (raw) {
      try {
        const p = JSON.parse(raw);
        d = Object.assign(d, p);
        d.settings = Object.assign(this.defaults().settings, p.settings || {});
        d.best = Object.assign({ wave: 0, kills: 0 }, p.best || {});
        d.stats = Object.assign({ runs: 0, kills: 0, wins: 0 }, p.stats || {});
        d.perks = p.perks || {};
        d.unlocked = Array.isArray(p.unlocked) && p.unlocked.length ? p.unlocked : ['pistol'];
        if (!d.unlocked.includes('pistol')) d.unlocked.push('pistol');
        d.turretUnlocked = Array.isArray(p.turretUnlocked) ? p.turretUnlocked : [];
        d.points = Math.max(0, d.points | 0);
      } catch (e) { d = this.defaults(); }
    }
    this.data = d;
    return d;
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (e) {}
  },

  addPoints(n) {
    this.data.points = Math.max(0, this.data.points + n);
    this.save();
    return this.data.points;
  },

  spend(n) {
    if (this.data.points < n) return false;
    this.data.points -= n;
    this.save();
    return true;
  },

  hasWeapon(id) { return this.data.unlocked.includes(id); },
  hasTurret(id) { return id !== 'rail' || this.data.turretUnlocked.includes('rail'); },

  unlockWeapon(id) {
    const w = WEAPON_BY_ID[id];
    if (!w || this.hasWeapon(id)) return false;
    if (!this.spend(w.cost)) return false;
    this.data.unlocked.push(id);
    this.save();
    return true;
  },

  unlockTurret(id) {
    if (this.hasTurret(id)) return false;
    if (id !== 'rail') return false;
    if (!this.spend(8)) return false;
    this.data.turretUnlocked.push(id);
    this.save();
    return true;
  },

  perkLevel(id) { return this.data.perks[id] | 0; },
  perkCost(p) { return p.baseCost + p.costStep * this.perkLevel(p.id); },

  buyPerk(id) {
    const p = PERK_BY_ID[id];
    if (!p) return false;
    const lv = this.perkLevel(id);
    if (lv >= p.max) return false;
    if (!this.spend(this.perkCost(p))) return false;
    this.data.perks[id] = lv + 1;
    this.save();
    return true;
  },

  recordRun(wave, kills, win, difficultyId) {
    this.data.best.wave = Math.max(this.data.best.wave, wave);
    this.data.best.kills = Math.max(this.data.best.kills, kills);
    this.data.stats.runs++;
    this.data.stats.kills += kills;
    if (win) this.data.stats.wins++;
    this.save();
  },

  reset() {
    const settings = this.data ? this.data.settings : this.defaults().settings;
    this.data = this.defaults();
    this.data.settings = settings;
    this.save();
  },
};
