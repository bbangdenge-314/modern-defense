/* 현대병기 · 중세 방어전 — HUD / 모달 / 트리 UI */
window.UI = (function () {
  'use strict';
  const D = window.DATA;
  const G = window.Game;
  const S = G.S;
  const $ = id => document.getElementById(id);
  const el = {};
  let buildType = null, selTower = null, selPad = -1;
  let activeTechCat = 'gun', activeTechNode = null;
  let activePrestigeCat = 'economy';
  let toastTimer = 0, bannerTimer = 0, relicTimer = 0;
  let lastHud = 0, minimapTick = 0;
  let cheatOpenCount = 0, cheatClickTimer = 0;
  let confirmCb = null;
  let modalPaused = false;
  function refreshModalPause() {
    const open = document.querySelectorAll('.overlay.modal:not(.hidden)').length > 0;
    if (open && !S.paused) { S.paused = true; modalPaused = true; }
    else if (!open && modalPaused) { S.paused = false; modalPaused = false; }
  }

  /* ───────── 숫자 ───────── */
  function fmt(n) {
    n = Math.floor(n);
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 10000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('ko-KR');
  }
  function settings() { return G.saveData.settings; }
  function persist() { G.persist(); }

  /* ───────── 초기화 ───────── */
  function init() {
    [
      'hud', 'lobby', 'gold', 'rp', 'shards', 'waveNum', 'waveOf', 'stageLabel', 'phaseLabel',
      'waveBar', 'waveEnemy', 'waveTimer', 'wavePreview', 'keepBar', 'keepHpText', 'wallBar', 'wallText',
      'repairCost', 'breachLabel', 'btnRepairWall', 'btnResearch', 'btnPrestige', 'btnCodex', 'btnOptions',
      'btnSpeed', 'btnPause', 'bossBar', 'bossName', 'bossFill', 'banner', 'bannerSub', 'bannerTitle',
      'relicDrop', 'relicDropIcon', 'relicDropRarity', 'relicDropName', 'relicDropEffect',
      'minimap', 'toast', 'dock', 'buildBar', 'btnPrep', 'prepLabel', 'prepSub',
      'towerPanel', 'tpName', 'tpLevel', 'tpStats', 'tpUpgrade', 'tpSell', 'tpClose',
      'padPanel', 'padList', 'padClose', 'lobbyBest', 'lobbyStage', 'lobbyShards', 'lobbyRelics',
      'btnStart', 'btnContinue', 'btnStory', 'btnTechLobby', 'btnPrestigeLobby', 'btnCodexLobby',
      'btnOptionsLobby', 'btnStageSelect', 'verBadge', 'stageModal', 'stageGrid',
      'stageClearModal', 'scTitle', 'scSub', 'scGold', 'scRp', 'scShards', 'btnNextStage', 'btnStagePrestige',
      'defeatModal', 'defeatSub', 'dfKills', 'dfShards', 'btnRetry', 'btnDefeatPrestige', 'btnToLobby',
      'techModal', 'techTabs', 'techNodes', 'techLines', 'techInfo', 'techRp', 'techScroll', 'techResetView',
      'prestigeModal', 'prestigeShards', 'psWave', 'psGain', 'psKills', 'prestigeCats', 'prestigeList',
      'btnDoPrestige', 'prestigeHint', 'codexModal', 'codexGrid', 'codexCount', 'storyModal', 'storyList',
      'optionsModal', 'cheatModal', 'cheatRelicPick', 'cheatGold', 'cheatRp', 'cheatShards',
      'btnResetSave', 'optUnitScale', 'optZoom', 'optFx', 'optDmg', 'optShake', 'optSound', 'optCutscene',
      'cheatRelicBoost', 'rotateHint', 'btnZoomIn', 'btnZoomOut', 'btnRecenter',
    ].forEach(id => { el[id] = $(id); });

    buildBuildBar();
    bind();
    buildTechTree();
    buildPrestige();
    buildCodex();
    buildStory();
    buildStageGrid();
    syncOptions();
    updateLobby();
    el.btnContinue.classList.toggle('hidden', !(G.saveData.run));
    el.padList.addEventListener('click', onPadListClick);
    window.addEventListener('keydown', onKey);
    if (window.Cutscene) window.Cutscene._resize && window.Cutscene._resize();
  }

  function bind() {
    el.btnStart.addEventListener('click', () => startGame(1));
    el.btnContinue.addEventListener('click', () => {
      hideLobby();
      if (!G.continueRun()) { startGame(1); return; }
      window.Render.resetForRun();
      UI.toast('이어서 방어전을 재개합니다.');
    });
    el.btnStory.addEventListener('click', () => openStory());
    el.btnTechLobby.addEventListener('click', () => openTech());
    el.btnPrestigeLobby.addEventListener('click', () => openPrestige());
    el.btnCodexLobby.addEventListener('click', () => openCodex());
    el.btnOptionsLobby.addEventListener('click', () => openOptions());
    el.btnStageSelect.addEventListener('click', () => openStageSelect());
    el.btnResearch.addEventListener('click', () => openTech());
    el.btnPrestige.addEventListener('click', () => openPrestige());
    el.btnCodex.addEventListener('click', () => openCodex());
    el.btnOptions.addEventListener('click', () => openOptions());
    el.btnZoomIn.addEventListener('click', () => { Render.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.18); SFX.play('click'); });
    el.btnZoomOut.addEventListener('click', () => { Render.zoomAt(window.innerWidth / 2, window.innerHeight / 2, 0.85); SFX.play('click'); });
    el.btnRecenter.addEventListener('click', () => { Render.focusVillage(); SFX.play('click'); });
    el.btnSpeed.addEventListener('click', () => cycleSpeed());
    el.btnPause.addEventListener('click', () => togglePause());
    el.btnRepairWall.addEventListener('click', () => {
      if (S.phase === 'lobby') return;
      if (G.repairWalls()) { SFX.play('build'); toast('성벽을 수리했습니다.'); }
      else toast('골드가 부족합니다.');
    });
    el.btnPrep.addEventListener('click', () => {
      if (S.phase === 'prep') { G.startWave(); SFX.play('wave'); }
    });
    el.tpClose.addEventListener('click', clearSelection);
    el.padClose.addEventListener('click', clearSelection);
    el.tpUpgrade.addEventListener('click', () => {
      if (!selTower) return;
      if (G.upgradeTower(selTower)) { SFX.play('upgrade'); refreshTowerPanel(); }
      else toast(selTower.level >= D.TOWER_MAX_LEVEL ? '최대 레벨입니다.' : '골드가 부족합니다.');
    });
    el.tpSell.addEventListener('click', () => {
      if (!selTower) return;
      const t = selTower;
      askConfirm('포탑 철거', t.def ? '' : (D.TOWERS[t.type].name + ' Lv.' + t.level + '을(를) 철거하고 건설비의 60%를 돌려받습니다.'), () => {
        G.sellTower(t); SFX.play('sell'); clearSelection();
      });
    });
    document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', e => {
      const m = e.target.closest('.modal'); if (m) m.classList.add('hidden');
      setTimeout(refreshModalPause, 0);
    }));
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('mousedown', e => {
      if (e.target === m) { m.classList.add('hidden'); setTimeout(refreshModalPause, 0); }
    }));
    el.btnNextStage.addEventListener('click', () => {
      el.stageClearModal.classList.add('hidden');
      G.nextStage();
      SFX.play('click');
    });
    el.btnStagePrestige.addEventListener('click', () => { el.stageClearModal.classList.add('hidden'); openPrestige(); });
    el.btnRetry.addEventListener('click', () => { el.defeatModal.classList.add('hidden'); startGame(1); });
    el.btnDefeatPrestige.addEventListener('click', () => { el.defeatModal.classList.add('hidden'); openPrestige(); });
    el.btnToLobby.addEventListener('click', () => { el.defeatModal.classList.add('hidden'); toLobby(); });
    el.btnDoPrestige.addEventListener('click', tryPrestige);
    el.techResetView.addEventListener('click', () => { el.techScroll.scrollTop = 0; el.techScroll.scrollLeft = 0; });
    el.btnResetSave.addEventListener('click', () => {
      askConfirm('저장 초기화', '회귀석·유물·기술·기록이 모두 삭제됩니다. 정말 초기화할까요?', () => G.cheat.resetSave());
    });
    // 옵션
    bindSeg('optUnitScale', 'unitScale', v => parseFloat(v), () => window.Render.applySettings());
    bindSeg('optZoom', 'zoomBase', v => parseFloat(v), () => { window.Render.applySettings(); window.Render.focusVillage(); });
    bindSeg('optFx', 'effects', v => v);
    bindSeg('optDmg', 'dmgNumbers', v => v === '1');
    bindSeg('optShake', 'shake', v => v === '1');
    bindSeg('optSound', 'sound', v => { const on = v === '1'; SFX.setEnabled(on); return on; });
    bindSeg('optCutscene', 'cutscene', v => v === '1');
    bindSeg('cheatRelicBoost', null, null, null, v => { S.cheat.relicBoost = parseFloat(v); });
    // 기술 탭
    el.techTabs.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      activeTechCat = b.dataset.cat; activeTechNode = null;
      buildTechTree(); SFX.play('click');
    });
    // 재회귀 탭
    el.prestigeCats.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      activePrestigeCat = b.dataset.cat; buildPrestige(); SFX.play('click');
    });
    el.codexModal.addEventListener('click', e => {
      if (e.target.closest('[data-close]') || e.target === el.codexModal) el.codexModal.classList.add('hidden');
    });
    // 유물 배너 클릭
    el.relicDrop.addEventListener('click', () => { el.relicDrop.classList.add('hidden'); openCodex(); });
    // 스테이지 선택
    el.stageGrid.addEventListener('click', e => {
      const b = e.target.closest('.stage-card'); if (!b || b.disabled) return;
      const stage = parseInt(b.dataset.stage, 10);
      el.stageModal.classList.add('hidden');
      startGame(stage);
    });
    // 치트
    el.cheatModal.addEventListener('click', e => {
      if (e.target.closest('[data-close]') || e.target === el.cheatModal) el.cheatModal.classList.add('hidden');
    });
    document.querySelectorAll('[data-cheat]').forEach(b => b.addEventListener('click', () => doCheat(b.dataset.cheat)));
    el.verBadge.addEventListener('click', () => {
      cheatOpenCount++;
      clearTimeout(cheatClickTimer);
      cheatClickTimer = setTimeout(() => { cheatOpenCount = 0; }, 1400);
      if (cheatOpenCount >= 5) { cheatOpenCount = 0; openCheat(); }
    });
    // 모달 외부 클릭 닫기 (기술/재회귀 등)
    ['techModal', 'prestigeModal', 'storyModal', 'optionsModal', 'stageModal', 'cheatModal'].forEach(id => {
      $(id).addEventListener('mousedown', e => { if (e.target === $(id)) $(id).classList.add('hidden'); });
    });
    // 게임 이벤트
    G.on('relic', d => { if (d.relic) showRelicDrop(d.relic); });
    G.on('stageClear', d => showStageClear(d));
    G.on('defeat', d => showDefeat(d));
    G.on('wallBreach', d => {
      const dir = D.DIRS.find(x => x.id === d.side);
      banner('성벽 붕괴', (dir ? dir.name : '') + ' 방벽이 무너졌습니다!', 2200);
      Render.shake(7);
    });
    G.on('buildingDown', b => toast(b.name + ' 파괴! 마을 방어에 손실이 생겼습니다.'));
    G.on('towerDestroyed', t => toast(D.TOWERS[t.type].name + ' 파괴! 슬롯이 비었습니다.'));
    G.on('toast', m => toast(m));
    G.on('towerChange', () => updateBuildBar());
    G.on('waveStart', d => {
      maybeBossStory(d);
      setTimeout(() => { updateBuildBar(); }, 60);
    });
    G.on('nextStage', st => maybeStoryForStage(st));
    G.on('prestige', () => { hideModals(); toLobby(); });
    // 5탭 배지 경로 + 키보드 치트
    window.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); openCheat(); }
    });
  }

  function bindSeg(id, key, parse, after, custom) {
    const box = $(id); if (!box) return;
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.dataset.v;
      if (custom) { custom(v); }
      else if (key) {
        const val = parse ? parse(v) : v;
        settings()[key] = val;
        persist();
        if (key === 'sound') SFX.setEnabled(!!val);
        if (after) after(val);
      }
      syncOptions();
      SFX.play('click');
    });
  }

  /* ───────── 로비 ───────── */
  function updateLobby() {
    const s = G.saveData;
    el.lobbyBest.textContent = (s.bestWave || 0);
    el.lobbyStage.textContent = (s.maxStage || 1);
    el.lobbyShards.textContent = fmt(S.shards);
    el.lobbyRelics.textContent = Object.keys(s.relics || {}).length + '/' + D.RELICS.length;
    el.btnContinue.classList.toggle('hidden', !s.run);
  }
  function hideLobby() { el.lobby.classList.add('hidden'); el.hud.classList.remove('hidden'); }
  function showLobby() {
    el.lobby.classList.remove('hidden'); el.hud.classList.add('hidden');
    updateLobby();
  }
  function toLobby() {
    S.phase = 'lobby';
    S.paused = false;
    S.enemies.length = 0; S.towers.length = 0; S.projectiles.length = 0;
    G.persist();
    hideModals();
    showLobby();
    window.Render.focusVillage();
    G.saveRun && G.saveRun();
  }
  function startGame(stage) {
    hideLobby();
    hideModals();
    clearSelection();
    const openFirst = !(G.saveData.seenCutscenes || {}).opening && settings().cutscene;
    if (openFirst) {
      playCutscene('opening', () => {
        G.startRun({ stage });
        window.Render.resetForRun();
        SFX.resume();
      });
    } else {
      G.startRun({ stage });
      window.Render.resetForRun();
      SFX.resume();
    }
  }
  function maybeStoryForStage(stage) {
    if (!settings().cutscene) return;
    const map = { 2: 'stage2', 3: 'stage3', 5: 'stage5' };
    const id = map[stage];
    if (id && !(G.saveData.seenCutscenes || {})[id]) {
      playCutscene(id, () => { S.paused = false; });
    }
  }
  function maybeBossStory(d) {
    if (!settings().cutscene) return;
    const bossWave = d.wi === D.WAVES_PER_STAGE && d.stage === 1;
    if (bossWave && !(G.saveData.seenCutscenes || {}).boss1) {
      setTimeout(() => {
        if (document.querySelector('.overlay.modal:not(.hidden)')) return;
        playCutscene('boss1', () => { S.paused = false; });
      }, 350);
    }
  }
  function playCutscene(id, cb) {
    if (!window.Cutscene) { if (cb) cb(); return; }
    S.paused = true;
    window.Cutscene.play(id, () => { S.paused = false; if (cb) cb(); });
  }

  /* ───────── HUD ───────── */
  function update(dt) {
    lastHud += dt;
    if (lastHud < 0.08) { drawMinimap(dt); return; }
    lastHud = 0;
    updateHud();
    drawMinimap(dt);
    if (toastTimer > 0) { toastTimer -= 0.08; if (toastTimer <= 0) el.toast.classList.remove('show'); }
    if (bannerTimer > 0) { bannerTimer -= 0.08; if (bannerTimer <= 0) el.banner.classList.remove('show'); }
    if (relicTimer > 0) { relicTimer -= 0.08; if (relicTimer <= 0) el.relicDrop.classList.add('hidden'); }
    updateBuildBar();
  }

  function updateHud() {
    if (S.phase === 'lobby') return;
    const st = S.stats || G.computeStats();
    el.gold.textContent = fmt(S.gold);
    el.rp.textContent = fmt(S.rp);
    el.shards.textContent = fmt(S.shards);
    el.stageLabel.textContent = 'STAGE ' + S.stage;
    el.waveNum.textContent = S.wi;
    el.waveOf.textContent = '/' + D.WAVES_PER_STAGE;
    const phaseTxt = { prep: '준비', wave: '전투', stageclear: '클리어', defeat: '함락' }[S.phase] || '준비';
    el.phaseLabel.textContent = phaseTxt;
    el.phaseLabel.className = 'phase-chip' + (S.phase === 'wave' ? ' wave' : '');
    let wpct = 0;
    if (S.phase === 'prep') wpct = 1 - S.prepLeft / Math.max(1, S.prepTime);
    else if (S.phase === 'wave') wpct = 1 - (S.enemies.length + (S.spawnQueue.length - S.spawnCursor)) / Math.max(1, totalWaveCount());
    el.waveBar.style.width = Math.max(0, Math.min(100, wpct * 100)) + '%';
    const alive = S.enemies.length;
    const remain = Math.max(0, S.spawnQueue.length - S.spawnCursor) + alive;
    el.waveEnemy.textContent = S.phase === 'wave' ? ('적 ' + remain + (alive ? ' · 전장 ' + alive : '')) : ('예상 적 ' + totalWaveCount());
    el.waveTimer.textContent = S.phase === 'prep' ? '다음 웨이브 ' + Math.ceil(S.prepLeft) + 's' : S.phase === 'wave' ? '교전 중' : '';
    // 편성 미리보기
    const comp = S.waveComp || [];
    el.wavePreview.innerHTML = comp.slice(0, 5).map(c => '<span title="' + D.ENEMIES[c.type].name + '">' + enemyIcon(c.type) + c.count + '</span>').join('');
    // 기지
    el.keepHpText.textContent = Math.ceil(S.keepHp);
    el.keepBar.style.width = Math.max(0, S.keepHp / Math.max(1, S.keepMax) * 100) + '%';
    const wr = G.wallRatio();
    el.wallText.textContent = Math.round(wr * 100) + '%';
    el.wallBar.style.width = (wr * 100) + '%';
    el.repairCost.textContent = fmt(G.repairWallCost());
    el.btnRepairWall.disabled = S.gold < G.repairWallCost() || S.phase === 'lobby';
    const breached = ['N', 'E', 'S', 'W'].filter(k => S.walls[k] && S.walls[k].hp <= 0);
    el.breachLabel.textContent = breached.length ? ('붕괴 ' + breached.map(k => D.DIRS.find(d => d.id === k).name).join('·')) : '';
    // 알림 배지
    const canBuy = D.TECHS.some(n => {
      const lv = (G.saveData.research || {})[n.id] || 0;
      if (lv >= n.max) return false;
      if (n.req && !n.req.every(r => ((G.saveData.research || {})[r] || 0) >= 1)) return false;
      return S.rp >= nodeCost(n, lv);
    });
    el.btnResearch.classList.toggle('on', canBuy);
    el.btnPrestige.classList.toggle('on', G.canPrestige());
    // 배속/일시정지
    el.btnSpeed.textContent = S.speed + '×';
    el.btnPause.textContent = S.paused ? '▶' : '❚❚';
    el.btnPause.classList.toggle('on', S.paused);
    // 준비 버튼
    if (S.phase === 'prep') {
      el.prepLabel.textContent = '웨이브 시작';
      el.prepSub.textContent = '준비 ' + Math.ceil(S.prepLeft) + '초 · 탭하여 즉시';
      el.btnPrep.classList.remove('wave');
    } else if (S.phase === 'wave') {
      el.prepLabel.textContent = '전투 중';
      el.prepSub.textContent = remain + '마리 남음';
      el.btnPrep.classList.add('wave');
    } else {
      el.prepLabel.textContent = '대기';
      el.prepSub.textContent = '';
    }
    // 보스
    const boss = S.enemies.find(e => e.def.boss);
    if (boss) {
      el.bossBar.classList.remove('hidden');
      el.bossName.textContent = D.ENEMIES[boss.type].name + ' · ' + Math.ceil(boss.hp);
      el.bossFill.style.width = Math.max(0, boss.hp / boss.hpMax * 100) + '%';
    } else el.bossBar.classList.add('hidden');
    // 포탑 패널 실시간
    if (selTower) refreshTowerPanel();
  }

  function enemyIcon(type) {
    return { peasant: '🧑‍🌾', spearman: '🔱', shield: '🛡️', archer: '🏹', cavalry: '🐎', berserker: '🪓', ram: '🪵', catapult: '🪨', knight: '⚔️', siege: '🏯', lord: '👑' }[type] || '❗';
  }
  function totalWaveCount() { return (S.waveComp || []).reduce((a, c) => a + c.count, 0); }

  /* ───────── 미니맵 ───────── */
  function drawMinimap(dt) {
    minimapTick += dt;
    if (minimapTick < 0.12) return;
    minimapTick = 0;
    const c = el.minimap; if (!c) return;
    const x = c.getContext('2d');
    const W = c.width, H = c.height, cx = W / 2, cy = H / 2, R = W * 0.44;
    x.clearRect(0, 0, W, H);
    x.fillStyle = 'rgba(8,12,16,.9)'; x.fillRect(0, 0, W, H);
    const P = (wx, wy) => [cx + ((wx - wy) / D.MAP) * R, cy + (((wx + wy) / (2 * D.MAP)) - 0.5) * R];
    // 맵 외곽
    x.beginPath();
    [[0, 0], [D.MAP, 0], [D.MAP, D.MAP], [0, D.MAP]].forEach((p, i) => {
      const q = P(p[0], p[1]); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]);
    });
    x.closePath(); x.fillStyle = 'rgba(40,60,45,.55)'; x.fill();
    x.strokeStyle = 'rgba(120,160,130,.35)'; x.lineWidth = 1; x.stroke();
    // 마을
    const V = D.VILLAGE;
    x.beginPath();
    [[V.x0, V.y0], [V.x1, V.y0], [V.x1, V.y1], [V.x0, V.y1]].forEach((p, i) => {
      const q = P(p[0], p[1]); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]);
    });
    x.closePath(); x.fillStyle = 'rgba(220,180,90,.28)'; x.fill();
    x.strokeStyle = 'rgba(255,200,100,.7)'; x.stroke();
    // 적
    x.fillStyle = '#ff5f5f';
    for (let i = 0; i < S.enemies.length; i += Math.max(1, Math.floor(S.enemies.length / 260))) {
      const e = S.enemies[i];
      const q = P(e.x, e.y);
      x.fillRect(q[0] - 1, q[1] - 1, 2, 2);
    }
    // 포탑
    x.fillStyle = '#8fd0ff';
    for (const t of S.towers) { const q = P(t.x, t.y); x.fillRect(q[0] - 1.5, q[1] - 1.5, 3, 3); }
    // 카메라
    const cam = window.Render.cam;
    const q = P(cam.x, cam.y);
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1;
    x.strokeRect(q[0] - 6, q[1] - 4, 12, 8);
    // 웨이브 방향
    for (const d of (S.waveDirs || [])) {
      const def = D.DIRS.find(k => k.id === d);
      const a = def.angle * Math.PI / 180;
      x.fillStyle = 'rgba(255,90,80,.8)';
      x.beginPath();
      const ax = cx + Math.cos(a) * R * 0.96, ay = cy + Math.sin(a) * R * 0.48;
      x.arc(ax, ay, 3, 0, 6.2832); x.fill();
    }
    // 보스
    const boss = S.enemies.find(e => e.def.boss);
    if (boss) {
      const q = P(boss.x, boss.y);
      x.fillStyle = '#ff3b4b'; x.beginPath(); x.arc(q[0], q[1], 4, 0, 6.2832); x.fill();
    }
  }

  /* ───────── 건설 바 ───────── */
  function buildBuildBar() {
    el.buildBar.innerHTML = '';
    for (const id in D.TOWERS) {
      const t = D.TOWERS[id];
      const b = document.createElement('button');
      b.className = 'build-btn';
      b.dataset.tower = id;
      b.innerHTML = '<span class="b-ico">' + t.icon + '</span><span class="b-name">' + t.short + '</span><span class="b-cost">' + fmt(G.towerCost(id, 0)) + '</span><span class="b-lock"></span>';
      b.title = t.name + ' — ' + t.desc;
      b.addEventListener('click', () => {
        const st = S.stats || G.computeStats();
        if (!st.unlocked.has(id)) {
          toast(t.name + '은(는) 기술 트리에서 해석해야 합니다.');
          return;
        }
        buildType = buildType === id ? null : id;
        window.Render.setBuildType(buildType);
        clearSelection(true);
        updateBuildBar();
        SFX.play('click');
      });
      el.buildBar.appendChild(b);
    }
    updateBuildBar();
  }
  function updateBuildBar() {
    if (!el.buildBar) return;
    const st = S.stats || G.computeStats();
    el.buildBar.querySelectorAll('.build-btn').forEach(b => {
      const id = b.dataset.tower;
      const t = D.TOWERS[id];
      const unlocked = st.unlocked.has(id);
      const cost = G.towerCost(id, 0);
      b.classList.toggle('locked', !unlocked);
      b.classList.toggle('sel', buildType === id);
      b.classList.toggle('poor', unlocked && S.gold < cost);
      const lock = b.querySelector('.b-lock');
      lock.textContent = unlocked ? '' : '🔒';
      const costEl = b.querySelector('.b-cost');
      costEl.textContent = unlocked ? fmt(cost) : '연구';
      b.title = unlocked ? (t.name + ' — ' + t.desc) : (t.name + ' — 기술 트리에서 해금 필요');
    });
    if (buildType && !st.unlocked.has(buildType)) { buildType = null; window.Render.setBuildType(null); }
  }

  /* ───────── 선택 / 패널 ───────── */
  function selectTower(t) {
    selTower = t; selPad = -1;
    buildType = null; window.Render.setBuildType(null);
    window.Render.setSelected(t);
    el.towerPanel.classList.remove('hidden');
    el.padPanel.classList.add('hidden');
    refreshTowerPanel();
  }
  function selectPad(i) {
    selPad = i; selTower = null;
    window.Render.setSelected(null);
    el.towerPanel.classList.add('hidden');
    el.padPanel.classList.remove('hidden');
    renderPadList();
  }
  function clearSelection(keepBuild) {
    selTower = null; selPad = -1;
    window.Render.setSelected(null);
    el.towerPanel.classList.add('hidden');
    el.padPanel.classList.add('hidden');
    if (!keepBuild) { buildType = null; window.Render.setBuildType(null); }
  }
  function refreshTowerPanel() {
    if (!selTower) return;
    const t = selTower;
    const def = D.TOWERS[t.type];
    const s = G.towerStats(t);
    const cost = G.towerCost(t.type, t.level);
    let spent = G.towerCost(t.type, 0);
    for (let l = 1; l < t.level; l++) spent += G.towerCost(t.type, l);
    el.tpName.textContent = def.icon + ' ' + def.name;
    el.tpLevel.textContent = 'Lv ' + t.level;
    el.tpStats.innerHTML =
      '<span>DPS <b>' + fmt(G.towerDps(t)) + '</b></span>' +
      '<span>피해 <b>' + fmt(s.dmg) + '</b></span>' +
      '<span>사거리 <b>' + s.range.toFixed(1) + '</b></span>' +
      '<span>처치 <b>' + t.kills + '</b></span>' +
      '<span>내구도 <b>' + Math.ceil(t.hp) + '/' + Math.ceil(t.hpMax) + '</b></span>';
    const maxed = t.level >= D.TOWER_MAX_LEVEL;
    el.tpUpgrade.innerHTML = maxed ? '최대 레벨' : ('강화 <em>' + fmt(cost) + '</em>🪙');
    el.tpUpgrade.disabled = maxed || S.gold < cost;
    el.tpSell.innerHTML = '철거 <em>' + fmt(Math.round(spent * 0.6)) + '</em>🪙';
  }
  function renderPadList() {
    const st = S.stats || G.computeStats();
    el.padList.innerHTML = '';
    for (const id in D.TOWERS) {
      const t = D.TOWERS[id];
      const unlocked = st.unlocked.has(id);
      const cost = G.towerCost(id, 0);
      const b = document.createElement('button');
      b.dataset.tower = id;
      b.disabled = !unlocked || S.gold < cost;
      b.innerHTML = '<span class="pi">' + t.icon + '</span><span class="pn">' + t.short + '</span><span class="pc">' + (unlocked ? fmt(cost) : '🔒') + '</span>';
      el.padList.appendChild(b);
    }
  }
  function onPadListClick(e) {
    const b = e.target.closest('button[data-tower]');
    if (!b || selPad < 0) return;
    const id = b.dataset.tower;
    if (G.placeTower(selPad, id)) {
      SFX.play('build');
      selectTower(S.pads[selPad].tower);
      toast(D.TOWERS[id].name + ' 배치 완료');
    } else toast('배치할 수 없습니다. (골드·슬롯 확인)');
  }

  /* ───────── 기술 트리 ───────── */
  function nodeCost(node, level) { return Math.round(node.cost * (1 + level * 0.9)); }
  function techLv(id) { return (G.saveData.research || {})[id] || 0; }
  function reqOk(node) {
    if (!node.req) return true;
    return node.req.every(r => techLv(r) >= 1);
  }
  function buildTechTree() {
    // 탭
    el.techTabs.innerHTML = D.CATS.map(c => '<button data-cat="' + c.id + '" class="' + (c.id === activeTechCat ? 'on' : '') + '">' + c.icon + ' ' + c.name + '</button>').join('');
    el.techRp.textContent = fmt(S.rp);
    const nodes = D.TECHS.filter(t => t.cat === activeTechCat);
    const W = 1120, H = 470;
    el.techNodes.innerHTML = '';
    el.techLines.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    el.techLines.setAttribute('width', W); el.techLines.setAttribute('height', H);
    const pos = {};
    for (const n of nodes) pos[n.id] = { x: 24 + n.x * 176, y: 18 + n.y * 108 };
    // 선
    let paths = '';
    for (const n of nodes) {
      if (!n.req) continue;
      for (const r of n.req) {
        const a = pos[r], b = pos[n.id];
        if (!a || !b) continue;
        const on = techLv(r) >= 1 && techLv(n.id) >= 1;
        paths += '<path d="M' + (a.x + 74) + ' ' + (a.y + 92) + ' C' + (a.x + 74) + ' ' + (a.y + 108) + ', ' + (b.x + 74) + ' ' + (b.y - 16) + ', ' + (b.x + 74) + ' ' + (b.y) + '" class="' + (on ? 'on' : '') + '"/>';
      }
    }
    el.techLines.innerHTML = paths;
    // 노드
    for (const n of nodes) {
      const lv = techLv(n.id);
      const maxed = lv >= n.max;
      const avail = reqOk(n) && !maxed;
      const cost = nodeCost(n, lv);
      const b = document.createElement('button');
      b.className = 'tech-node' + (maxed ? ' maxed' : reqOk(n) ? (avail ? ' avail' : '') : ' locked') + (activeTechNode === n.id ? ' sel' : '');
      b.style.left = pos[n.id].x + 'px'; b.style.top = pos[n.id].y + 'px';
      let pips = '';
      for (let i = 0; i < n.max; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
      b.innerHTML = '<div class="tn-top"><span class="tn-icon">' + n.icon + '</span><span class="tn-name">' + n.name + '</span></div>' +
        '<div class="tn-desc">' + n.desc + '</div>' +
        '<div class="tn-foot"><span class="tn-cost">' + (maxed ? 'MAX' : (n.eff.unlock ? '해금 ' : '') + fmt(cost) + '📘') + '</span><span class="tn-pips">' + pips + '</span></div>';
      b.addEventListener('click', () => { activeTechNode = n.id; buildTechTree(); renderTechInfo(n); SFX.play('click'); });
      el.techNodes.appendChild(b);
    }
    if (activeTechNode) {
      const n = D.TECHS.find(t => t.id === activeTechNode);
      if (n) renderTechInfo(n);
    } else {
      el.techInfo.innerHTML = '<div class="ti-empty">노드를 선택하면 상세 효과와 선행 조건이 표시됩니다.<br><br>연구 포인트(📘)는 웨이브를 막을 때마다 얻습니다. 재회귀하면 일반 연구는 초기화됩니다.</div>';
    }
  }
  function renderTechInfo(n) {
    const lv = techLv(n.id);
    const maxed = lv >= n.max;
    const cost = nodeCost(n, lv);
    const cat = D.CATS.find(c => c.id === n.cat);
    const reqs = (n.req || []).map(r => {
      const rn = D.TECHS.find(t => t.id === r);
      const ok = techLv(r) >= 1;
      return '<div class="' + (ok ? 'ok' : 'no') + '">' + (ok ? '✓' : '✕') + ' ' + (rn ? rn.name : r) + ' Lv.1</div>';
    }).join('') || '<div class="ok">✓ 선행 조건 없음</div>';
    el.techInfo.innerHTML =
      '<div class="ti-icon">' + n.icon + '</div>' +
      '<div class="ti-name">' + n.name + '</div>' +
      '<div class="ti-cat">' + cat.name + ' · 최대 ' + n.max + '레벨</div>' +
      '<div class="ti-level">현재 Lv.' + lv + ' / ' + n.max + '</div>' +
      '<div class="ti-desc">' + n.desc + '</div>' +
      '<div class="ti-eff">' + effectHtml(n.eff, lv) + '</div>' +
      '<div class="ti-req"><b>선행 조건</b>' + reqs + '</div>' +
      (maxed ? '<button class="btn primary ti-buy" disabled>최대 레벨 달성</button>'
        : '<button class="btn primary ti-buy" id="techBuy" ' + (reqOk(n) && S.rp >= cost ? '' : 'disabled') + '>' +
          (reqOk(n) ? '연구 <em>' + fmt(cost) + '</em> 📘' : '선행 연구 필요') + '</button>');
    const buy = $('techBuy');
    if (buy) buy.addEventListener('click', () => {
      if (!reqOk(n) || S.rp < cost) { toast('연구 포인트가 부족하거나 선행 조건이 없습니다.'); return; }
      S.rp -= cost;
      const r = G.saveData.research || (G.saveData.research = {});
      r[n.id] = lv + 1;
      G.computeStats(); G.persist();
      SFX.play('upgrade');
      buildTechTree(); renderTechInfo(n); updateBuildBar();
      el.techRp.textContent = fmt(S.rp);
    });
  }
  function effectHtml(eff, lv) {
    const labels = {
      dmgMul: '모든 포탑 피해', rateMul: '공격 속도', rangeMul: '사거리', aoeMul: '폭발 범위',
      goldMul: '골드 획득', rpMul: '연구 획득', shardMul: '회귀석 획득', keepHpMul: '기지 내구도',
      wallHpMul: '성벽 내구도', buildCostMul: '건설 비용', armorPen: '방어구 관통', crit: '치명타 확률',
      burn: '화상 피해', chain: '연쇄 폭발', pierce: '관통', slots: '방어 슬롯', startGold: '시작 골드',
      startRP: '시작 연구', repair: '자동 수리', freeTower: '무료 포탑', keepResearch: '연구 유지',
      doubleShot: '연발 확률', slowHit: '감속 확률', unlock: '병기 해금',
    };
    let out = '';
    for (const k in eff) {
      if (k === 'unlock') { out += '<div><b>' + (D.TOWERS[eff[k]] ? D.TOWERS[eff[k]].name : eff[k]) + '</b> 해금</div>'; continue; }
      const label = labels[k] || k;
      const v = eff[k];
      const pct = ['dmgMul', 'rateMul', 'rangeMul', 'aoeMul', 'goldMul', 'rpMul', 'shardMul', 'keepHpMul', 'wallHpMul', 'buildCostMul', 'crit', 'repair', 'doubleShot', 'slowHit', 'keepResearch'].includes(k);
      const per = pct ? (v > 0 ? '+' : '') + (v * 100).toFixed(0) + '%' : (v > 0 ? '+' : '') + v;
      out += '<div>' + label + ' <b>' + per + '</b> / 레벨' + (lv ? ' → 누적 ' + (pct ? (v * lv * 100).toFixed(0) + '%' : v * lv) : '') + '</div>';
    }
    return out || '효과 없음';
  }

  /* ───────── 재회귀 ───────── */
  function prestigeCost(node, lv) { return Math.round(node.cost * Math.pow(1.55, lv)); }
  function buildPrestige() {
    el.prestigeCats.innerHTML = D.PRESTIGE_CATS.map(c =>
      '<button data-cat="' + c.id + '" class="' + (c.id === activePrestigeCat ? 'on' : '') + '">' + c.icon + ' ' + c.name + '</button>').join('');
    const list = el.prestigeList;
    list.innerHTML = '';
    for (const n of D.PRESTIGE.filter(p => p.cat === activePrestigeCat)) {
      const lv = (G.saveData.prestige || {})[n.id] || 0;
      const maxed = lv >= n.max;
      const cost = prestigeCost(n, lv);
      const card = document.createElement('div');
      card.className = 'pr-card' + (maxed ? ' maxed' : '');
      let pips = '';
      for (let i = 0; i < n.max; i++) pips += '<i class="' + (i < lv ? 'on' : '') + '"></i>';
      card.innerHTML =
        '<div class="pr-top"><span class="pr-icon">' + n.icon + '</span><span class="pr-name">' + n.name + '</span><span class="pr-lv">Lv.' + lv + '/' + n.max + '</span></div>' +
        '<div class="pr-desc">' + n.desc + '</div>' +
        '<div class="pr-foot"><span class="pr-pips">' + pips + '</span>' +
        '<button ' + (maxed || S.shards < cost ? 'disabled' : '') + '>' + (maxed ? 'MAX' : '💎 ' + fmt(cost)) + '</button></div>';
      card.querySelector('button').addEventListener('click', () => {
        if (maxed || S.shards < cost) return;
        S.shards -= cost;
        const p = G.saveData.prestige || (G.saveData.prestige = {});
        p[n.id] = lv + 1;
        G.saveData.shards = S.shards;
        G.computeStats(); G.persist();
        SFX.play('upgrade');
        buildPrestige(); refreshPrestigeSummary();
      });
      list.appendChild(card);
    }
    refreshPrestigeSummary();
  }
  function refreshPrestigeSummary() {
    const gain = G.prestigeGain();
    el.prestigeShards.textContent = fmt(S.shards);
    el.psWave.textContent = Math.max(S.globalWave, G.saveData.bestWave || 0);
    el.psGain.textContent = fmt(gain);
    el.psKills.textContent = fmt(S.kills);
    const can = G.canPrestige();
    el.btnDoPrestige.disabled = !can;
    el.prestigeHint.textContent = can ? '재회귀하면 골드·포탑·일반 연구가 초기화되고 회귀석을 받습니다.' : '스테이지 1을 클리어해야 재회귀할 수 있습니다.';
  }
  function tryPrestige() {
    if (!G.canPrestige()) { toast('아직 재회귀할 수 없습니다. 스테이지 1을 클리어하세요.'); return; }
    const gain = G.prestigeGain();
    askConfirm('재회귀', '이번 회차의 골드·포탑·일반 연구를 잃고 회귀석 ' + fmt(gain) + '개를 얻습니다. 계속할까요?', () => {
      const gained = G.doPrestige();
      hideModals();
      SFX.play('prestige');
      UI.toast('재회귀 완료 · 회귀석 +' + fmt(gained));
      if (settings().cutscene) {
        playCutscene('prestige', () => { toLobby(); });
      } else toLobby();
    });
  }

  /* ───────── 유물 ───────── */
  function buildCodex() {
    const owned = G.saveData.relics || {};
    const count = Object.keys(owned).length;
    el.codexCount.textContent = count + ' / ' + D.RELICS.length;
    el.codexGrid.innerHTML = '';
    for (const r of D.RELICS) {
      const has = !!owned[r.id];
      const d = document.createElement('div');
      d.className = 'codex-card r-' + r.rarity + (has ? ' owned' : '');
      d.innerHTML =
        '<div class="cc-top"><span class="cc-icon">' + (has ? r.icon : '❔') + '</span><span class="cc-name">' + (has ? r.name : '미발굴 유물') + '</span></div>' +
        '<div class="cc-rarity r-' + r.rarity + '">' + D.RARITIES[r.rarity].name + '</div>' +
        '<div class="cc-desc">' + (has ? r.desc : '아직 발견하지 못한 고대 유물입니다.') + '</div>' +
        (has ? '' : '<div class="cc-lock">🔒</div>');
      el.codexGrid.appendChild(d);
    }
  }
  function showRelicDrop(relic) {
    el.relicDrop.classList.remove('hidden');
    el.relicDropIcon.textContent = relic.icon;
    el.relicDropRarity.textContent = D.RARITIES[relic.rarity].name + ' 등급 고대 유물';
    el.relicDropRarity.className = 'r-' + relic.rarity;
    el.relicDropName.textContent = relic.name;
    el.relicDropEffect.textContent = relic.desc;
    relicTimer = 6;
    window.Render.shake(3);
    Render.addFloater && 0;
    if (!(G.saveData.seenCutscenes || {}).relic1 && settings().cutscene) {
      setTimeout(() => {
        const anyCut = true;
        if (anyCut) playCutscene('relic1', () => {});
      }, 900);
    }
    buildCodex();
    updateLobby();
  }

  /* ───────── 스토리 ───────── */
  function buildStory() {
    const seen = G.saveData.seenCutscenes || {};
    el.storyList.innerHTML = '';
    for (const s of window.Cutscene.list()) {
      const d = document.createElement('div');
      d.className = 'story-item';
      d.innerHTML = '<div class="si-t">' + s.title + '</div><div class="si-s">' + s.shots + '컷 · ' + (seen[s.id] ? '열람함' : '미열람') + '</div><button>재생 ▶</button>';
      d.querySelector('button').addEventListener('click', () => {
        el.storyModal.classList.add('hidden');
        playCutscene(s.id, () => { if (S.phase === 'lobby') showLobby(); });
      });
      el.storyList.appendChild(d);
    }
  }

  /* ───────── 치트 ───────── */
  function openCheat() {
    refreshModalPause();
    el.cheatModal.classList.remove('hidden');
    el.cheatGold.value = Math.round(S.gold);
    el.cheatRp.value = Math.round(S.rp);
    el.cheatShards.value = Math.round(S.shards);
    if (!el.cheatRelicPick.dataset.ready) {
      el.cheatRelicPick.innerHTML = D.RELICS.map(r => '<option value="' + r.id + '">' + r.name + ' (' + D.RARITIES[r.rarity].name + ')</option>').join('');
      el.cheatRelicPick.dataset.ready = '1';
    }
    syncOptions();
    SFX.play('click');
  }
  function doCheat(action) {
    const num = v => parseInt(v, 10) || 0;
    switch (action) {
      case 'gold': G.cheat.gold(num(el.cheatGold.value)); break;
      case 'goldAdd': G.cheat.addGold(100000); break;
      case 'rp': G.cheat.rp(num(el.cheatRp.value)); break;
      case 'rpAdd': G.cheat.addRp(10000); break;
      case 'shards': G.cheat.shards(num(el.cheatShards.value)); break;
      case 'shardsAdd': G.cheat.addShards(1000); break;
      case 'wave1': G.cheat.waveJump(1); break;
      case 'wave5': G.cheat.waveJump(5); break;
      case 'waveSkip': G.cheat.waveJump(99); break;
      case 'stage1': G.cheat.stageJump(1); break;
      case 'stage5': G.cheat.stageJump(5); break;
      case 'killAll': G.cheat.killAll(); break;
      case 'invincible': G.cheat.invincible(!S.cheat.invincible); toast('기지 무적: ' + (S.cheat.invincible ? 'ON' : 'OFF')); break;
      case 'win':
        G.cheat.win();
        break;
      case 'unlockAll': G.cheat.unlockAllResearch(); toast('전체 연구 해금'); break;
      case 'clearResearch': G.cheat.clearResearch(); toast('연구 초기화'); break;
      case 'relicDrop': G.grantRandomRelic('boss'); break;
      case 'relicAll': G.cheat.giveAllRelics(); toast('전체 유물 지급'); buildCodex(); break;
      case 'relicPick': G.cheat.giveRelic(el.cheatRelicPick.value); buildCodex(); break;
    }
    el.cheatGold.value = Math.round(S.gold);
    el.cheatRp.value = Math.round(S.rp);
    el.cheatShards.value = Math.round(S.shards);
    updateHud(); updateLobby();
    SFX.play('click');
  }

  /* ───────── 옵션 ───────── */
  function syncOptions() {
    const s = settings();
    const set = (boxId, val) => {
      const box = $(boxId); if (!box) return;
      box.querySelectorAll('button').forEach(b => {
        b.classList.toggle('on', String(b.dataset.v) === String(val));
      });
    };
    set('optUnitScale', s.unitScale);
    set('optZoom', s.zoomBase);
    set('optFx', s.effects);
    set('optDmg', s.dmgNumbers ? '1' : '0');
    set('optShake', s.shake ? '1' : '0');
    set('optSound', s.sound ? '1' : '0');
    set('optCutscene', s.cutscene ? '1' : '0');
    set('cheatRelicBoost', S.cheat.relicBoost || 1);
  }

  /* ───────── 스테이지 ───────── */
  function buildStageGrid() {
    const max = G.saveData.maxStage || 1;
    el.stageGrid.innerHTML = '';
    for (let s = 1; s <= Math.max(10, max + 1); s++) {
      const unlocked = s <= max;
      const cleared = s < max || (G.saveData.stagesCleared || 0) >= s;
      const d = document.createElement('button');
      d.className = 'stage-card' + (unlocked ? ' unlocked' : '') + (cleared ? ' cleared' : '');
      d.dataset.stage = s;
      d.disabled = !unlocked;
      d.innerHTML = '<b>STAGE ' + s + '</b><span>' + D.stageName(s) + '</span>' +
        '<div class="sc-lock">' + (unlocked ? (cleared ? '클리어' : '도전 가능') : '🔒 잠김') + '</div>';
      el.stageGrid.appendChild(d);
    }
  }

  /* ───────── 모달 열기 ───────── */
  function openTech() {
    refreshModalPause();
    el.techModal.classList.remove('hidden');
    buildTechTree();
    el.techScroll.scrollTop = 0; el.techScroll.scrollLeft = 0;
    SFX.play('click');
  }
  function openPrestige() {
    refreshModalPause();
    el.prestigeModal.classList.remove('hidden');
    buildPrestige();
    refreshPrestigeSummary();
    SFX.play('click');
  }
  function openCodex() {
    refreshModalPause();
    el.codexModal.classList.remove('hidden');
    buildCodex();
    // 새 유물 확인 표시
    if (G.saveData.relicNew) { G.saveData.relicNew = {}; persist(); }
    SFX.play('click');
  }
  function openStory() {
    refreshModalPause();
    el.storyModal.classList.remove('hidden');
    buildStory();
    SFX.play('click');
  }
  function openOptions() {
    refreshModalPause();
    el.optionsModal.classList.remove('hidden');
    syncOptions();
    SFX.play('click');
  }
  function openStageSelect() {
    refreshModalPause();
    el.stageModal.classList.remove('hidden');
    buildStageGrid();
    SFX.play('click');
  }
  function hideModals() {
    document.querySelectorAll('.overlay.modal').forEach(m => m.classList.add('hidden'));
    el.lobby.classList.add('hidden');
    refreshModalPause();
  }

  /* ───────── 클리어/패배 ───────── */
  function showStageClear(d) {
    el.scTitle.textContent = 'STAGE ' + d.stage + ' 클리어';
    el.scSub.textContent = D.stageName(d.stage) + '을(를) 지켜냈습니다. 다음 스테이지의 적은 조금 더 강해집니다.';
    el.scGold.textContent = '+' + fmt(d.gold);
    el.scRp.textContent = '+' + fmt(d.rp);
    el.scShards.textContent = fmt(d.shards);
    el.stageClearModal.classList.remove('hidden');
    banner('스테이지 클리어', D.stageName(d.stage) + ' 방어 성공!', 2800);
    SFX.play('victory');
  }
  function showDefeat(d) {
    el.defeatSub.textContent = 'STAGE ' + d.stage + ' · WAVE ' + S.wi + ' · 처치 ' + fmt(S.kills);
    el.dfKills.textContent = fmt(S.kills);
    el.dfShards.textContent = fmt(G.prestigeGain());
    el.defeatModal.classList.remove('hidden');
  }

  /* ───────── 확인창 ───────── */
  function askConfirm(title, msg, cb) {
    let m = $('confirmModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'confirmModal';
      m.className = 'overlay modal hidden';
      m.innerHTML = '<div class="modal-box confirm-box"><h3 id="cfTitle"></h3><p id="cfMsg"></p><div class="cf-actions"><button id="cfNo" class="btn ghost">취소</button><button id="cfYes" class="btn primary">확인</button></div></div>';
      document.body.appendChild(m);
      $('cfNo').addEventListener('click', () => { m.classList.add('hidden'); setTimeout(refreshModalPause, 0); });
      $('cfYes').addEventListener('click', () => { m.classList.add('hidden'); setTimeout(refreshModalPause, 0); if (confirmCb) confirmCb(); });
    }
    $('cfTitle').textContent = title;
    $('cfMsg').textContent = msg;
    confirmCb = cb;
    m.classList.remove('hidden');
    refreshModalPause();
  }

  /* ───────── 알림 ───────── */
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    toastTimer = 3.2;
  }
  function banner(title, sub, ms) {
    el.bannerTitle.textContent = title;
    el.bannerSub.textContent = sub || '';
    el.banner.classList.add('show');
    bannerTimer = (ms || 2200) / 1000;
  }

  function cycleSpeed() {
    const speeds = [1, 2, 3, 4];
    const i = speeds.indexOf(S.speed);
    S.speed = speeds[(i + 1) % speeds.length];
    SFX.play('click');
    toast('배속 ' + S.speed + '×');
  }
  function togglePause() {
    S.paused = !S.paused;
    if (S.paused && S.phase !== 'lobby') banner('일시정지', 'Space 또는 ❚❚ 로 재개', 1600);
    else if (S.phase !== 'lobby') banner('재개', '', 900);
    SFX.play('click');
  }

  /* ───────── 키보드 ───────── */
  function onKey(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (window.Cutscene && window.Cutscene.isActive()) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      if (!el.techModal.classList.contains('hidden') || !el.prestigeModal.classList.contains('hidden') ||
          !el.codexModal.classList.contains('hidden') || !el.optionsModal.classList.contains('hidden') ||
          !el.storyModal.classList.contains('hidden') || !el.stageModal.classList.contains('hidden') ||
          !el.cheatModal.classList.contains('hidden') || !el.stageClearModal.classList.contains('hidden') ||
          !el.defeatModal.classList.contains('hidden')) {
        hideModals();
      } else { clearSelection(); togglePause(); }
      return;
    }
    if (S.phase === 'lobby' || S.phase === 'stageclear' || S.phase === 'defeat') return;
    if (k === ' ') { e.preventDefault(); togglePause(); }
    else if (k === 't') openTech();
    else if (k === 'p') openPrestige();
    else if (k === 'o') openOptions();
    else if (k >= '1' && k <= '4') { S.speed = parseInt(k, 10); toast('배속 ' + S.speed + '×'); }
    else if (k === 'q') { buildType = buildType ? null : 'gatling'; window.Render.setBuildType(buildType); updateBuildBar(); }
  }

  return {
    init, update, updateHud, updateLobby, hideLobby, showLobby, toLobby, buildBuildBar, updateBuildBar,
    selectTower, selectPad, clearSelection, refreshTowerPanel, openTech, openPrestige, openCodex,
    openStory, openOptions, openStageSelect, openCheat, hideModals, showStageClear, showDefeat,
    toast, banner, askConfirm, startGame, cycleSpeed, togglePause, syncOptions, defaultTarget: 0,
    get buildType() { return buildType; },
    set buildType(v) { buildType = v; window.Render.setBuildType(v); updateBuildBar(); },
  };
})();
