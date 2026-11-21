/* ─────────────────────────────────────────────
   ui.js — HUD·메뉴·연구소·모달
   ───────────────────────────────────────────── */
'use strict';

const UI = {
  game: null,
  inGame: false,
  els: {},
  cache: {},
  toastTimer: 0,
  comboData: { n: 0, t: 0 },
  bannerTimer: 0,
  labTab: 'weapons',
  resetArmed: false,
  modalKind: null,
  resultState: null,

  init(game) {
    this.game = game;
    const ids = ['hud', 'waveNum', 'waveMax', 'wavePhase', 'waveProgress', 'wavePreview', 'hpText', 'hpBar',
      'gateState', 'btnRepairWall', 'repairCost', 'gold', 'scrap', 'rp', 'btnSpeed', 'btnPause', 'btnSettings',
      'bossBar', 'bossName', 'bossFill', 'banner', 'bannerSub', 'bannerTitle', 'combo', 'toast', 'dock',
      'btnUpgrade', 'btnNextWave', 'nextTimer', 'weaponSlots', 'btnAutoAim', 'reloadStrip', 'menu', 'btnStart',
      'btnLab', 'menuRp', 'menuBest', 'menuWeapons', 'menuPerks', 'btnHow', 'btnSettings2', 'modalRoot', 'modalCard',
      'moveLeft', 'moveRight', 'btnSettings3'];
    for (const id of ids) this.els[id] = document.getElementById(id);

    this.buildWeaponSlots();
    this.bind();
    this.syncMenu();
    this.applySettings();
  },

  /* ── build static parts ─────────────────── */
  buildWeaponSlots() {
    const wrap = this.els.weaponSlots;
    if (!wrap) return;
    wrap.innerHTML = '';
    WEAPONS.forEach((w, i) => {
      const b = document.createElement('button');
      b.className = 'slot';
      b.dataset.weapon = w.id;
      b.title = `${w.name}\n${w.desc}\n(단축키 ${i + 1})`;
      b.innerHTML = `<span class="key">${i + 1}</span><span class="wname">${w.short}</span><span class="ammo">${w.mag}</span>`;
      b.addEventListener('click', () => {
        if (!this.inGame) return;
        Sfx.init();
        this.game.switchWeapon(w.id);
      });
      wrap.appendChild(b);
    });
  },

  bind() {
    const g = this.game;
    document.querySelectorAll('.build-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Sfx.init();
        if (!this.inGame) return;
        this.game.enterBuild(btn.dataset.build);
      });
    });
    document.querySelectorAll('.skill-btn[data-skill]').forEach(btn => {
      btn.addEventListener('click', () => {
        Sfx.init();
        if (!this.inGame) return;
        this.game.requestSkill(btn.dataset.skill);
      });
    });
    this.els.btnUpgrade && this.els.btnUpgrade.addEventListener('click', () => { Sfx.init(); this.openUpgrade(); });
    this.els.btnNextWave && this.els.btnNextWave.addEventListener('click', () => {
      Sfx.init();
      if (!this.inGame) return;
      if (this.game.phase === 'prep') this.game.startWave(true);
    });
    this.els.btnPause && this.els.btnPause.addEventListener('click', () => { Sfx.init(); this.togglePause(); });
    this.els.btnSpeed && this.els.btnSpeed.addEventListener('click', () => {
      Sfx.init();
      if (!this.inGame) return;
      this.game.speed = this.game.speed === 1 ? 2 : 1;
      this.els.btnSpeed.textContent = this.game.speed + '×';
      this.els.btnSpeed.classList.toggle('on', this.game.speed === 2);
    });
    this.els.btnSettings && this.els.btnSettings.addEventListener('click', () => { Sfx.init(); this.openSettings(); });
    this.els.btnSettings2 && this.els.btnSettings2.addEventListener('click', () => { Sfx.init(); this.openSettings(); });
    this.els.btnAutoAim && this.els.btnAutoAim.addEventListener('click', () => {
      Sfx.init();
      g.autoAim = !g.autoAim;
      Save.data.settings.autoAim = g.autoAim;
      Save.save();
      this.applySettings();
      this.toast(g.autoAim ? '자동 조준 ON — 탭은 스킬·건설에 사용' : '자동 조준 OFF', 'gold');
    });
    this.els.btnRepairWall && this.els.btnRepairWall.addEventListener('click', () => { Sfx.init(); this.game.repairWall(); });

    this.els.btnStart && this.els.btnStart.addEventListener('click', () => { Sfx.init(); this.openDifficulty(); });
    this.els.btnLab && this.els.btnLab.addEventListener('click', () => { Sfx.init(); this.openLab(); });
    this.els.btnHow && this.els.btnHow.addEventListener('click', () => { Sfx.init(); this.openHelp(); });

    // 이동 버튼
    const move = (el, dir) => {
      if (!el) return;
      const on = (e) => { e.preventDefault(); this.game.touchMove = dir; Sfx.init(); };
      const off = (e) => { if (e) e.preventDefault(); this.game.touchMove = 0; };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointercancel', off);
      el.addEventListener('pointerleave', off);
    };
    move(this.els.moveLeft, -1);
    move(this.els.moveRight, 1);

    // 모달 배경
    const root = this.els.modalRoot;
    if (root) {
      root.addEventListener('pointerdown', (e) => {
        if (e.target.classList.contains('modal-backdrop')) this.closeModal();
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!root.classList.contains('hidden')) {
          if (this.modalKind === 'result') { e.preventDefault(); return; }
          this.closeModal(); e.preventDefault();
        } else if (this.inGame && !this.game.modalOpen) { this.togglePause(); e.preventDefault(); }
      }
    });
    window.addEventListener('resize', () => { setTimeout(() => this.game.layout(), 60); });
  },

  /* ── screens ────────────────────────────── */
  syncMenu() {
    if (!Save.data) return;
    if (this.els.menuRp) this.els.menuRp.textContent = Save.data.points;
    if (this.els.menuBest) this.els.menuBest.textContent = Save.data.best.wave;
    if (this.els.menuWeapons) this.els.menuWeapons.textContent = `${Save.data.unlocked.length} / ${WEAPONS.length}`;
    if (this.els.menuPerks) {
      let sum = 0;
      for (const p of PERKS) sum += Save.perkLevel(p.id);
      this.els.menuPerks.textContent = `Lv.${sum}`;
    }
  },

  showMenu(game) {
    this.inGame = false;
    this.game = game;
    this.resultState = null;
    if (this.els.hud) this.els.hud.classList.add('hidden');
    if (this.els.menu) this.els.menu.classList.remove('hidden');
    this.closeModal(true);
    document.body.classList.remove('playing');
    this.syncMenu();
  },

  enterGame(game) {
    this.inGame = true;
    this.game = game;
    this.resultState = null;
    this.modalKind = null;
    if (this.els.menu) this.els.menu.classList.add('hidden');
    if (this.els.hud) this.els.hud.classList.remove('hidden');
    document.body.classList.add('playing');
    document.body.classList.add('ui-open');
    this.cache = {};
    this.hideBoss();
    this.els.btnSpeed.textContent = '1×';
    this.els.btnSpeed.classList.remove('on');
    this.syncModes(game);
    this.updateWavePreview(true);
    if (this.els.reloadStrip) this.els.reloadStrip.style.width = '0%';
    if (this.els.nextTimer) this.els.nextTimer.textContent = '';
    this.sync(game);
  },

  openDifficulty() {
    const cards = DIFFICULTIES.map(d => `
      <button class="diff-card ${d.id}" data-diff="${d.id}">
        <b style="color:${d.color}">${d.name}</b>
        <div class="d-d">${d.desc}</div>
        <div class="d-m">${d.mods.map(m => `<span>${m}</span>`).join('')}</div>
        <div class="go">▶ 시작</div>
      </button>`).join('');
    this.openModal(`
      <div class="modal-head">
        <div>
          <h2>난이도 선택</h2>
          <p class="tagline2">군주의 대군이 몰려옵니다. 15 웨이브를 버티면 승리.</p>
        </div>
        <button class="modal-close" data-close>✕</button>
      </div>
      <div class="diff-grid">${cards}</div>
      <div class="modal-actions">
        <button class="btn ghost" data-close>돌아가기</button>
      </div>`);
    this.els.modalCard.querySelectorAll('[data-diff]').forEach(b => {
      b.addEventListener('click', () => {
        const diff = DIFF_BY_ID[b.dataset.diff];
        Sfx.init();
        this.closeModal();
        this.game.startRun(diff);
      });
    });
    this.bindModalClose();
  },

  /* ── HUD sync ───────────────────────────── */
  sync(game) {
    if (!this.inGame || !game) return;
    const e = this.els;
    const set = (el, v) => { if (el && this.cache[el.id] !== v) { el.textContent = v; this.cache[el.id] = v; } };
    const css = (el, prop, v) => { if (el && this.cache[el.id + prop] !== v) { el.style[prop] = v; this.cache[el.id + prop] = v; } };

    set(e.gold, Math.floor(game.gold));
    set(e.scrap, Math.floor(game.scrap));
    set(e.rp, Save.data.points);
    set(e.hpText, Math.max(0, Math.ceil(game.villageHp)));
    css(e.hpBar, 'width', `${clamp(game.villageHp / game.villageMax, 0, 1) * 100}%`);
    const hpRatio = game.villageHp / game.villageMax;
    set(e.gateState, hpRatio > 0.7 ? '성벽 안정' : hpRatio > 0.4 ? '성벽 손상' : hpRatio > 0.15 ? '성벽 위험' : '성벽 붕괴 직전');
    set(e.waveNum, game.waveIndex + 1);
    set(e.waveMax, `/ ${MAX_WAVE}`);
    let phase = '준비';
    if (game.state === 'result') phase = '종료';
    else if (game.phase === 'wave') phase = '전투 중';
    else if (game.phase === 'prep') phase = `준비 ${Math.ceil(Math.max(0, game.prepTime))}s`;
    set(e.wavePhase, phase);
    e.wavePhase && e.wavePhase.classList.toggle('hot', game.phase === 'wave');

    let progress = 0;
    if (game.phase === 'wave') {
      const total = Math.max(1, game.waveTotal);
      progress = (game.spawned - game.enemies.length) / total;
      progress = clamp(progress, 0, 1);
    } else if (game.phase === 'prep') {
      progress = clamp(1 - game.prepTime / 24, 0, 1);
    }
    css(e.waveProgress, 'width', `${progress * 100}%`);

    // 다음 웨이브 버튼
    if (e.btnNextWave) {
      const disabled = game.phase === 'wave' || game.state !== 'playing';
      if (e.btnNextWave.disabled !== disabled) e.btnNextWave.disabled = disabled;
      const label = game.phase === 'wave' ? '전투 중' : '다음 웨이브';
      if (this.cache.nextLabel !== label) {
        this.cache.nextLabel = label;
        e.btnNextWave.innerHTML = `${label} <span id="nextTimer"></span>`;
        e.nextTimer = document.getElementById('nextTimer');
      }
      if (e.nextTimer) set(e.nextTimer, game.phase === 'prep' ? `${Math.ceil(Math.max(0, game.prepTime))}s` : '');
    }

    // 재장전 스트립
    let rp = 0;
    if (game.hero.reloading) rp = 1 - game.hero.reloadT / Math.max(0.001, game.hero.reloadMax);
    else rp = 0;
    css(e.reloadStrip, 'width', `${rp * 100}%`);

    // 무기 슬롯
    this.syncWeapons(game);
    this.syncBuild(game);
    this.syncSkills(game);

    // 회복 버튼
    if (e.btnRepairWall) {
      const can = game.villageHp < game.villageMax && game.gold >= 60;
      if (e.btnRepairWall.disabled !== !can) e.btnRepairWall.disabled = !can;
    }

    // 보스 바
    if (game.bossRef && !game.bossRef.dead) {
      e.bossBar.classList.remove('hidden');
      const r = clamp(game.bossRef.hp / game.bossRef.maxHp, 0, 1);
      css(e.bossFill, 'width', `${r * 100}%`);
      set(e.bossName, `${game.bossRef.def.name}  ${Math.ceil(game.bossRef.hp)} / ${game.bossRef.maxHp}`);
    } else if (!e.bossBar.classList.contains('hidden')) {
      this.hideBoss();
    }

    // 웨이브 미리보기 갱신
    this.updateWavePreview(false);
  },

  syncWeapons(game) {
    const wrap = this.els.weaponSlots;
    if (!wrap) return;
    const cur = game.hero.weaponId;
    const slots = wrap.children;
    for (let i = 0; i < slots.length; i++) {
      const el = slots[i];
      const w = WEAPONS[i];
      const owned = Save.hasWeapon(w.id);
      const active = cur === w.id;
      el.classList.toggle('active', active);
      el.classList.toggle('locked', !owned);
      const ammoEl = el.querySelector('.ammo');
      if (ammoEl) {
        const txt = owned ? `${game.hero.mags[w.id] | 0}` : '🔒';
        if (ammoEl.textContent !== txt) ammoEl.textContent = txt;
      }
    }
  },

  syncBuild(game) {
    document.querySelectorAll('.build-btn').forEach(btn => {
      const mode = btn.dataset.build;
      let cost = 0;
      if (TURRETS[mode]) cost = TURRETS[mode].cost;
      else if (mode === 'barricade') cost = 55;
      else if (mode === 'repair') cost = 30;
      btn.classList.toggle('active', game.buildMode === mode);
      const locked = TURRETS[mode] && !Save.hasTurret(mode);
      btn.classList.toggle('hidden', !!locked);
      btn.classList.toggle('broke', game.gold < cost);
    });
  },

  syncSkills(game) {
    document.querySelectorAll('.skill-btn[data-skill]').forEach(btn => {
      const id = btn.dataset.skill;
      const s = game.skills[id];
      const cd = btn.querySelector('.cd');
      if (s) {
        const ratio = clamp(s.cd / Math.max(0.001, s.max), 0, 1);
        if (cd) cd.style.transform = `scaleY(${ratio})`;
        btn.classList.toggle('ready', s.cd <= 0);
        btn.classList.toggle('aiming', game.skillAim === id);
      }
    });
    if (this.els.btnAutoAim) this.els.btnAutoAim.classList.toggle('on', game.autoAim);
  },

  syncModes(game) {
    this.syncBuild(game);
    this.syncSkills(game);
  },

  updateWavePreview(force) {
    const g = this.game;
    if (!g || !this.els.wavePreview) return;
    const key = `${g.waveIndex}-${g.diff.id}-${g.phase}-${g.state}-${g.spawned}-${g.enemies.length}`;
    if (!force && this.cache.previewKey === key) return;
    if (!force && g.phase === 'wave' && this.cache.previewKey && this.cache.previewKey.split('-')[2] === 'wave') {
      // 전투 중에는 남은 적 수만 갱신
      const remain = g.spawnQueue.length + g.enemies.length;
      const txt = `<span class="chip">⚔️ 남은 적 <span class="c-n">${remain}</span></span>`;
      if (this.cache.previewHTML !== txt) { this.els.wavePreview.innerHTML = txt; this.cache.previewHTML = txt; }
      this.cache.previewKey = key;
      return;
    }
    this.cache.previewKey = key;
    if (g.state === 'result' || g.phase === 'wave') {
      const remain = g.spawnQueue.length + g.enemies.length;
      const html = `<span class="chip">⚔️ 남은 적 <span class="c-n">${remain}</span></span>`;
      if (this.cache.previewHTML !== html) { this.els.wavePreview.innerHTML = html; this.cache.previewHTML = html; }
      return;
    }
    const comp = waveComposition(g.waveIndex, g.diff);
    const html = comp.slice(0, 7).map(c => {
      const def = ENEMIES[c.id];
      return `<span class="chip ${def.boss ? 'boss' : ''}" title="${def.name}"><span class="c-ico">${def.ico}</span>${def.name} <span class="c-n">${c.n}</span></span>`;
    }).join('') + (comp.length > 7 ? `<span class="chip">+${comp.length - 7}</span>` : '');
    if (this.cache.previewHTML !== html) { this.els.wavePreview.innerHTML = html; this.cache.previewHTML = html; }
  },

  banner(title, sub) {
    const b = this.els.banner;
    if (!b) return;
    this.els.bannerTitle.textContent = title;
    this.els.bannerSub.textContent = sub || '';
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 2600);
  },

  toast(msg, type) {
    const t = this.els.toast;
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { t.className = 'toast' + (type ? ' ' + type : ''); }, 2200);
  },

  combo(n) {
    const c = this.els.combo;
    if (!c) return;
    c.textContent = `연속 처치 × ${n}`;
    c.classList.add('show');
    clearTimeout(this.comboData.t);
    this.comboData.t = setTimeout(() => c.classList.remove('show'), 1400);
  },

  showBoss(def) {
    if (!this.els.bossBar) return;
    this.els.bossName.textContent = def.name;
    this.els.bossBar.classList.remove('hidden');
  },

  hideBoss() {
    if (this.els.bossBar) this.els.bossBar.classList.add('hidden');
  },

  /* ── modals ─────────────────────────────── */
  openModal(html, kind) {
    const root = this.els.modalRoot;
    if (!root) return;
    this.modalKind = kind || 'normal';
    this.els.modalCard.innerHTML = html;
    root.classList.remove('hidden');
    if (this.inGame && this.game) {
      this.game.modalOpen = true;
      this.game.paused = true;
      this.game.firing = false;
      this.game.touchMove = 0;
    }
    this.bindModalClose();
  },

  closeModal(silent) {
    const root = this.els.modalRoot;
    if (!root || root.classList.contains('hidden')) {
      if (this.inGame && this.game && !silent) { this.game.modalOpen = false; this.game.paused = false; }
      return;
    }
    const kind = this.modalKind;
    this.modalKind = null;
    root.classList.add('hidden');
    this.els.modalCard.innerHTML = '';
    if (this.inGame && this.game) {
      this.game.modalOpen = false;
      if (this.game.state === 'playing') this.game.paused = false;
    }
    // 결과창에서 연구소를 열었다가 닫으면 결과창으로 돌아간다
    if (!silent && kind !== 'result' && this.inGame && this.resultState && this.game && this.game.state === 'result') {
      this.showResult(this.game, this.resultState.win);
    }
  },

  bindModalClose() {
    if (!this.els.modalCard) return;
    this.els.modalCard.querySelectorAll('[data-close]').forEach(b => {
      if (b.__closeBound) return;
      b.__closeBound = true;
      b.addEventListener('click', () => this.closeModal());
    });
  },

  togglePause() {
    if (!this.inGame) return;
    if (this.game.state !== 'playing') return;
    this.openPause();
  },

  openPause() {
    const g = this.game;
    this.openModal(`
      <div class="modal-head">
        <div><h2>일시정지</h2><p class="tagline2">${this.diffName(g.diff)} · WAVE ${g.waveIndex + 1} / ${MAX_WAVE}</p></div>
        <button class="modal-close" data-close>✕</button>
      </div>
      <div class="stats-grid">
        <div class="stat-box"><span>처치</span><b>${g.kills}</b></div>
        <div class="stat-box"><span>골드</span><b>🪙 ${Math.floor(g.gold)}</b></div>
        <div class="stat-box"><span>고철</span><b>⚙️ ${Math.floor(g.scrap)}</b></div>
        <div class="stat-box"><span>설계도</span><b>📘 ${Save.data.points}</b></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="pmQuit">전투 포기</button>
        <button class="btn ghost" id="pmSettings">⚙ 설정</button>
        <button class="btn primary" data-close>계속하기</button>
      </div>`);
    document.getElementById('pmSettings').addEventListener('click', () => { this.openSettings(); });
    document.getElementById('pmQuit').addEventListener('click', () => {
      this.closeModal(true);
      this.game.paused = false;
      this.game.modalOpen = false;
      this.game.quitToMenu();
    });
  },

  diffName(d) { return d ? d.name : '보통'; },

  openSettings() {
    const s = Save.data.settings;
    const row = (key, title, sub) => `
      <div class="setting-row">
        <div><div>${title}</div><small>${sub}</small></div>
        <button class="switch ${s[key] ? 'on' : ''}" data-toggle="${key}" aria-label="${title}"></button>
      </div>`;
    this.openModal(`
      <div class="modal-head">
        <div><h2>설정</h2><p class="tagline2">전투 감각과 편의 기능을 조절합니다.</p></div>
        <button class="modal-close" data-close>✕</button>
      </div>
      <div>
        ${row('shake', '화면 흔들림', '발사·폭발 시 카메라 셰이크')}
        ${row('sound', '사운드', '총성·폭발·타격음')}
        ${row('autoAim', '자동 조준', '가장 위험한 적을 자동으로 조준·사격')}
        ${row('dmgText', '피해 수치 표시', '적 피격 시 데미지 숫자 표시')}
      </div>
      <div class="modal-actions">
        <button class="btn ghost" data-close>닫기</button>
      </div>`);
    this.els.modalCard.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        s[key] = !s[key];
        btn.classList.toggle('on', s[key]);
        Save.save();
        this.applySettings();
        Sfx.init(); Sfx.ui();
      });
    });
    this.bindModalClose();
  },

  applySettings() {
    const s = Save.data.settings;
    Sfx.setMuted(!s.sound);
    if (this.game) this.game.autoAim = !!s.autoAim;
  },

  openHelp() {
    const rows = [
      ['마우스 / 터치', '전장을 조준하고 누르고 있으면 사격. 움직이며 연사 가능.'],
      ['WASD / ← →', '영웅을 성벽 앞에서 좌우로 이동. 모바일은 화면 좌우 ◀ ▶ 버튼.'],
      ['1 ~ 9', '해금한 무기로 즉시 교체.'],
      ['R', '재장전 (자동 재장전도 됩니다).'],
      ['Q / E', '수류탄 / 집속 포격 → 원하는 지점을 탭해 발동.'],
      ['B / V / N', '센트리 / 화염 포탑 / 박격포 건설.'],
      ['M', '바리케이드 설치. 전장 중앙에만 가능.'],
      ['F', '자동 조준 ON/OFF. 켜두면 탭은 건설·스킬에 사용.'],
      ['Space', '일시정지. S는 1×/2× 배속. Esc는 모드 취소·메뉴.'],
      ['포탑', '설치 지점(원형 패드)을 탭해 건설. 설치된 포탑을 탭하면 강화/철거.'],
      ['방어선', '적은 바리케이드와 성벽을 공격합니다. 성벽이 0이 되면 패배.'],
      ['설계도 📘', '웨이브를 막을 때마다 획득. 연구소에서 새 무기·영구 강화에 사용.'],
    ];
    this.openModal(`
      <div class="modal-head">
        <div><h2>조작법</h2><p class="tagline2">중세 마을을 지키는 현대 병기 사용 설명서</p></div>
        <button class="modal-close" data-close>✕</button>
      </div>
      <ul class="help-list">
        ${rows.map(r => `<li><span class="k">${r[0]}</span><span class="v">${r[1]}</span></li>`).join('')}
      </ul>
      <div class="modal-actions"><button class="btn primary" data-close>알겠습니다</button></div>`);
    this.bindModalClose();
  },

  /* ── research lab ───────────────────────── */
  openLab() {
    this.labTab = this.labTab || 'weapons';
    this.renderLab();
  },

  renderLab() {
    const tab = this.labTab;
    const pts = Save.data.points;
    const weaponsHtml = WEAPONS.map(w => {
      const owned = Save.hasWeapon(w.id);
      return `
        <div class="card ${owned ? 'owned' : ''}">
          <div class="c-t"><span>${w.short} · ${w.name}</span><span style="color:#ffd479;font-size:11px">${owned ? '보유' : '📘 ' + w.cost}</span></div>
          <div class="c-d">${w.desc}</div>
          <div class="c-e">피해 ${w.dmg}${w.pellets > 1 ? ` ×${w.pellets}` : ''} · 연사 ${w.rpm}/분 · 탄창 ${w.mag}${w.pierce ? ` · 관통 ${w.pierce}` : ''}${w.splash ? ` · 폭발 ${w.splash}` : ''}</div>
          ${owned
            ? '<button class="buy" disabled>해금 완료</button>'
            : `<button class="buy" data-unlock="${w.id}" ${pts < w.cost ? 'disabled' : ''}>📘 ${w.cost} 로 해금</button>`}
        </div>`;
    }).join('');

    const railHtml = (() => {
      const owned = Save.hasTurret('rail');
      return `
        <div class="card ${owned ? 'owned' : ''}">
          <div class="c-t"><span>⚡ 레일 포탑</span><span style="color:#ffd479;font-size:11px">${owned ? '보유' : '📘 8'}</span></div>
          <div class="c-d">전자기 가속으로 일직선의 적을 관통하는 상위 포탑.</div>
          <div class="c-e">피해 150 · 관통 · 사거리 540 · 건설 🪙320</div>
          ${owned ? '<button class="buy" disabled>해금 완료</button>'
            : `<button class="buy" data-unlock-turret="rail" ${pts < 8 ? 'disabled' : ''}>📘 8 로 해금</button>`}
        </div>`;
    })();

    const perksHtml = PERKS.map(p => {
      const lv = Save.perkLevel(p.id);
      const maxed = lv >= p.max;
      const cost = Save.perkCost(p);
      const pips = Array.from({ length: p.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      return `
        <div class="card ${maxed ? 'maxed' : ''}">
          <div class="c-t"><span>${p.ico} ${p.name}</span><span class="lvl">Lv.${lv} / ${p.max}</span></div>
          <div class="c-d">${p.effect}</div>
          <div class="c-e">현재 효과: ${lv ? p.fmt(lv) : '없음'}</div>
          <div class="pips">${pips}</div>
          ${maxed ? '<button class="buy" disabled>최대 레벨</button>'
            : `<button class="buy" data-perk="${p.id}" ${pts < cost ? 'disabled' : ''}>📘 ${cost} 강화</button>`}
        </div>`;
    }).join('');

    this.openModal(`
      <div class="modal-head">
        <div>
          <h2>🔬 연구소</h2>
          <p class="tagline2">설계도로 영구 해금·강화. 전투가 끝나도 유지됩니다.</p>
        </div>
        <div class="pts">📘 ${pts}</div>
      </div>
      <div class="tabs">
        <button class="tab ${tab === 'weapons' ? 'on' : ''}" data-tab="weapons">무기 해금</button>
        <button class="tab ${tab === 'perks' ? 'on' : ''}" data-tab="perks">영구 강화</button>
        <button class="tab ${tab === 'system' ? 'on' : ''}" data-tab="system">진행 관리</button>
      </div>
      ${tab === 'weapons' ? `<div class="grid cards">${weaponsHtml}${railHtml}</div>`
        : tab === 'perks' ? `<div class="grid cards">${perksHtml}</div>`
        : `<div>
            <div class="setting-row"><div><div>최고 도달 웨이브</div><small>최다 처치 ${Save.data.best.kills}</small></div><b>WAVE ${Save.data.best.wave}</b></div>
            <div class="setting-row"><div><div>누적 전투</div><small>승리 ${Save.data.stats.wins}회</small></div><b>${Save.data.stats.runs}회</b></div>
            <div class="setting-row"><div><div>진행 초기화</div><small>설계도·해금·영구 강화가 모두 사라집니다.</small></div>
              <button class="reset-btn" id="labReset">${this.resetArmed ? '정말 초기화?' : '초기화'}</button></div>
          </div>`}
      <div class="modal-actions">
        <button class="btn ghost" data-close>닫기</button>
        ${this.inGame ? (this.resultState ? '<button class="btn" id="labBackResult">결과로 돌아가기</button>' : '') : '<button class="btn primary" id="labStart">전투 시작</button>'}
      </div>`, 'lab');

    this.els.modalCard.querySelectorAll('[data-tab]').forEach(b => {
      b.addEventListener('click', () => { Sfx.ui(); this.labTab = b.dataset.tab; this.renderLab(); });
    });
    this.els.modalCard.querySelectorAll('[data-unlock]').forEach(b => {
      b.addEventListener('click', () => {
        this.resetArmed = false;
        if (Save.unlockWeapon(b.dataset.unlock)) {
          Sfx.build(); this.toast('무기 해금 완료', 'gold'); this.syncMenu(); this.renderLab();
        } else { Sfx.deny(); this.toast('설계도가 부족합니다', 'warn'); }
      });
    });
    this.els.modalCard.querySelectorAll('[data-unlock-turret]').forEach(b => {
      b.addEventListener('click', () => {
        if (Save.unlockTurret(b.dataset.unlockTurret)) {
          Sfx.build(); this.toast('레일 포탑 해금 완료', 'gold'); this.renderLab();
        } else { Sfx.deny(); this.toast('설계도가 부족합니다', 'warn'); }
      });
    });
    this.els.modalCard.querySelectorAll('[data-perk]').forEach(b => {
      b.addEventListener('click', () => {
        this.resetArmed = false;
        if (Save.buyPerk(b.dataset.perk)) {
          Sfx.build(); this.toast('영구 강화 완료', 'gold'); this.syncMenu(); this.renderLab();
        } else { Sfx.deny(); this.toast('설계도가 부족합니다', 'warn'); }
      });
    });
    const rs = document.getElementById('labReset');
    if (rs) rs.addEventListener('click', () => {
      if (!this.resetArmed) {
        this.resetArmed = true;
        rs.textContent = '정말 초기화?';
        rs.style.background = 'rgba(255,93,93,.25)';
        return;
      }
      Save.reset();
      this.resetArmed = false;
      this.syncMenu();
      this.toast('진행이 초기화되었습니다', 'warn');
      this.renderLab();
    });
    const st = document.getElementById('labStart');
    if (st) st.addEventListener('click', () => { this.closeModal(); this.openDifficulty(); });
    const br = document.getElementById('labBackResult');
    if (br) br.addEventListener('click', () => this.closeModal());
    this.bindModalClose();
  },

  /* ── upgrade ────────────────────────────── */
  openUpgrade() {
    if (!this.inGame || this.game.state !== 'playing') return;
    const g = this.game;
    const w = WEAPON_BY_ID[g.hero.weaponId];
    const st = g.stats(w);
    const p = g.upg[w.id];
    const rows = Object.keys(WUPG).map(key => {
      const def = WUPG[key];
      const lv = p[key];
      const maxed = lv >= def.max;
      const cost = def.cost(lv);
      const pips = Array.from({ length: def.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      const val = key === 'dmg' ? `${Math.round(st.dmg)}` : key === 'rate' ? `${Math.round(st.rpm)}/분` :
        key === 'pierce' ? `${st.pierce}` : `${st.reload.toFixed(2)}s`;
      return `
        <div class="upg-row">
          <div class="u-info">
            <b>${def.icon} ${def.name} <span class="lvl">Lv.${lv}/${def.max}</span></b>
            <small>${def.effect} · 현재 ${val}</small>
            <div class="pips">${pips}</div>
          </div>
          ${maxed ? '<button class="upg-buy" disabled>MAX</button>'
            : `<button class="upg-buy" data-upg="${key}" ${g.scrap < cost ? 'disabled' : ''}>⚙️ ${cost}</button>`}
        </div>`;
    }).join('');

    this.openModal(`
      <div class="modal-head">
        <div><h2>무기 강화</h2><p class="tagline2">${w.name} · 전투 중에만 적용되는 임시 강화</p></div>
        <div class="pts">⚙️ ${Math.floor(g.scrap)}</div>
      </div>
      <div>${rows}</div>
      <div class="modal-actions">
        <button class="btn ghost" data-close>닫기</button>
        <button class="btn primary" id="upgClose">계속 전투</button>
      </div>`);
    this.els.modalCard.querySelectorAll('[data-upg]').forEach(b => {
      b.addEventListener('click', () => {
        if (g.upgradeWeapon(w.id, b.dataset.upg)) this.openUpgrade();
      });
    });
    const uc = document.getElementById('upgClose');
    if (uc) uc.addEventListener('click', () => this.closeModal());
    this.bindModalClose();
  },

  openTurretPanel(game, b) {
    if (!b) return;
    const def = TURRETS[b.type];
    const dmg = def.dmg * (1 + 0.12 * Save.perkLevel('turretDmg')) * (1 + 0.2 * (b.lv - 1));
    const cost = turretUpgradeCost(b.lv);
    const maxed = b.lv >= TURRET_MAX_LV;
    this.openModal(`
      <div class="modal-head">
        <div><h2>${def.name} <span class="lvl">Lv.${b.lv}</span></h2><p class="tagline2">${def.desc}</p></div>
        <button class="modal-close" data-close>✕</button>
      </div>
      <div class="stats-grid">
        <div class="stat-box"><span>피해/발사</span><b>${dmg.toFixed(1)}</b></div>
        <div class="stat-box"><span>연사</span><b>${(60 / def.interval).toFixed(1)}/초</b></div>
        <div class="stat-box"><span>사거리</span><b>${Math.round(def.range * (1 + 0.05 * (b.lv - 1)))}</b></div>
        <div class="stat-box"><span>내구도</span><b>${Math.ceil(b.hp)} / ${b.maxHp}</b></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="turretSell">철거 · 🪙 +${Math.round(def.cost * turretSellRate)}</button>
        ${maxed ? '<button class="btn" disabled>최대 레벨</button>'
          : `<button class="btn primary" id="turretUpg" ${game.gold < cost ? 'disabled' : ''}>강화 · 🪙 ${cost}</button>`}
      </div>`);
    const up = document.getElementById('turretUpg');
    if (up) up.addEventListener('click', () => {
      if (game.upgradeBuilding(b)) { this.closeModal(); this.toast(`${def.name} 강화 완료`, 'gold'); }
    });
    const sell = document.getElementById('turretSell');
    if (sell) sell.addEventListener('click', () => {
      game.sellBuilding(b);
      this.closeModal();
    });
    this.bindModalClose();
  },

  showResult(game, win) {
    const acc = game.shots ? Math.min(100, Math.round(game.hits / game.shots * 100)) : 0;
    const best = Save.data.best.wave;
    this.resultState = { win: !!win };
    this.openModal(`
      <div class="result-hero">
        <div class="big ${win ? 'w' : 'l'}">${win ? '마을을 지켜냈다' : '마을이 함락되었다'}</div>
        <p class="tagline2">${win ? `15 웨이브의 대군을 모두 격퇴했습니다. 군주는 무너졌다.` : `${game.waveIndex + 1} 웨이브에서 방어선이 무너졌습니다. 연구소에서 다시 준비하세요.`}</p>
      </div>
      <div class="stats-grid">
        <div class="stat-box"><span>도달 웨이브</span><b>${win ? MAX_WAVE : game.waveIndex + 1} / ${MAX_WAVE}</b></div>
        <div class="stat-box"><span>처치</span><b>${game.kills}</b></div>
        <div class="stat-box"><span>명중률</span><b>${acc}%</b></div>
        <div class="stat-box"><span>획득 설계도</span><b>📘 +${game.runPoints}</b></div>
        <div class="stat-box"><span>골드 획득</span><b>🪙 ${game.goldEarned}</b></div>
        <div class="stat-box"><span>최고 기록</span><b>WAVE ${best}</b></div>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="resMenu">메인으로</button>
        <button class="btn" id="resLab">🔬 연구소</button>
        <button class="btn primary" id="resRetry">다시 도전</button>
      </div>`, 'result');
    const retry = document.getElementById('resRetry');
    if (retry) retry.addEventListener('click', () => {
      const d = game.diff;
      this.closeModal(true);
      game.modalOpen = false;
      game.paused = false;
      game.startRun(d);
    });
    const lab = document.getElementById('resLab');
    if (lab) lab.addEventListener('click', () => { this.labTab = 'weapons'; this.renderLab(); });
    const menu = document.getElementById('resMenu');
    if (menu) menu.addEventListener('click', () => {
      this.closeModal(true);
      game.modalOpen = false;
      game.paused = false;
      game.quitToMenu();
    });
  },
};
