/* ─────────────────────────────────────────────
   main.js — 부트스트랩·입력·게임 루프
   ───────────────────────────────────────────── */
'use strict';

(function () {
  Save.load();
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  window.__game = game;
  window.__ui = UI;
  window.__save = Save;

  UI.init(game);
  game.state = 'menu';
  game.layout();
  UI.showMenu(game);

  // 오디오는 첫 제스처에서 활성화
  const unlockAudio = () => {
    Sfx.init();
    Sfx.setMuted(!Save.data.settings.sound);
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  /* ── 좌표 변환 ──────────────────────────── */
  function toWorld(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: clamp(e.clientX - r.left, 0, game.W),
      y: clamp(e.clientY - r.top - game.insetTop, 0, game.H),
    };
  }

  /* ── 포인터 ─────────────────────────────── */
  let downId = null;
  let mouseAim = true;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      if (e.button === 2) { game.cancelModes(); }
      return;
    }
    if (game.state !== 'playing' || game.modalOpen) return;
    e.preventDefault();
    downId = e.pointerId;
    mouseAim = e.pointerType === 'mouse';
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    const p = toWorld(e);
    game.pointerDown(p.x, p.y);
    if (game.modalOpen) { game.firing = false; downId = null; }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (game.state !== 'playing' && game.state !== 'menu') return;
    if (e.pointerType !== 'mouse' && downId === null) return;
    const p = toWorld(e);
    game.pointerMove(p.x, p.y);
  });

  const endPointer = (e) => {
    if (downId !== null && e.pointerId !== downId) return;
    downId = null;
    game.pointerUp();
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', endPointer);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

  window.addEventListener('touchmove', (e) => {
    if (e.target === canvas) e.preventDefault();
  }, { passive: false });

  /* ── 키보드 ─────────────────────────────── */
  const norm = (k) => k.toLowerCase();
  window.addEventListener('keydown', (e) => {
    const k = norm(e.key);
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    game.keys[k] = true;
    if (!UI.inGame) return;
    if (game.modalOpen) return;

    if (k === ' ') { e.preventDefault(); UI.togglePause(); }
    else if (k === 's') {
      game.speed = game.speed === 1 ? 2 : 1;
      UI.els.btnSpeed.textContent = game.speed + '×';
      UI.els.btnSpeed.classList.toggle('on', game.speed === 2);
    } else if (k === 'r') { game.startReload(); }
    else if (k === 'q') { game.requestSkill('grenade'); }
    else if (k === 'e') { game.requestSkill('airstrike'); }
    else if (k === 'f') {
      game.autoAim = !game.autoAim;
      Save.data.settings.autoAim = game.autoAim;
      Save.save();
      UI.applySettings();
      UI.syncSkills(game);
      UI.toast(game.autoAim ? '자동 조준 ON' : '자동 조준 OFF', 'gold');
    } else if (k === 'b') { game.enterBuild('sentry'); }
    else if (k === 'v') { game.enterBuild('flame'); }
    else if (k === 'n') { game.enterBuild('mortar'); }
    else if (k === 'm') { game.enterBuild('barricade'); }
    else if (k === 'u') { UI.openUpgrade(); }
    else if (k >= '1' && k <= '9') {
      const w = WEAPONS[parseInt(k, 10) - 1];
      if (w) game.switchWeapon(w.id);
    }
  });
  window.addEventListener('keyup', (e) => {
    game.keys[norm(e.key)] = false;
  });
  window.addEventListener('blur', () => { game.keys = {}; game.touchMove = 0; game.firing = false; });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && UI.inGame && game.state === 'playing' && !game.modalOpen) {
      game.paused = true;
    }
  });

  /* ── 리사이즈 ───────────────────────────── */
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      game.layout();
      Render.bgKey = '';
    }, 80);
  });
  window.addEventListener('orientationchange', () => {
    setTimeout(() => { game.layout(); Render.bgKey = ''; }, 220);
  });

  /* ── 루프 ──────────────────────────────── */
  let last = performance.now();
  function loop(ts) {
    let dt = (ts - last) / 1000;
    last = ts;
    if (!isFinite(dt) || dt <= 0) dt = 0.016;
    dt = Math.min(0.05, dt);
    try {
      game.frame(dt);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 첫 화면 렌더
  game.layout();
})();
