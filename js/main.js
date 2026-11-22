/* 현대병기 · 중세 방어전 — 부트스트랩 · 입력 · 루프 */
(function () {
  'use strict';
  const G = window.Game;
  const S = G.S;
  const canvas = document.getElementById('game');

  G.init();
  window.Render.init(canvas);
  window.Render.focusVillage();
  window.UI.init();
  window.SFX.setEnabled(G.saveData.settings.sound !== false);

  /* ───────── 입력 ───────── */
  const pointers = new Map();
  let dragging = false, moved = 0, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0;
  let pinchStart = 0, pinchZoom = 0;

  function localPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('pointerdown', e => {
    if (window.Cutscene && window.Cutscene.isActive()) return;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    const p = localPos(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 2) {
      const arr = Array.from(pointers.values());
      pinchStart = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      pinchZoom = window.Render.cam.zoom;
      dragging = false;
      return;
    }
    dragging = true; moved = 0;
    lastX = p.x; lastY = p.y; downX = p.x; downY = p.y; downT = performance.now();
  });

  canvas.addEventListener('pointermove', e => {
    const p = localPos(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pointers.size >= 2) {
      const arr = Array.from(pointers.values());
      const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      if (pinchStart > 0) {
        const target = pinchZoom * (d / pinchStart);
        window.Render.setZoom(target);
      }
      return;
    }
    if (dragging) {
      const dx = p.x - lastX, dy = p.y - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 5) {
        window.Render.pan(dx, dy);
        lastX = p.x; lastY = p.y;
      }
    } else {
      updateHover(p.x, p.y);
    }
  });

  function endPointer(e) {
    const p = localPos(e);
    pointers.delete(e.pointerId);
    if (pointers.size === 1) { pinchStart = 0; dragging = true; lastX = p.x; lastY = p.y; }
    if (!dragging) return;
    const dt = performance.now() - downT;
    dragging = false;
    if (moved < 8 && dt < 420) handleClick(p.x, p.y);
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); dragging = false; });

  canvas.addEventListener('wheel', e => {
    if (window.Cutscene && window.Cutscene.isActive()) return;
    if (!document.getElementById('lobby').classList.contains('hidden')) return;
    e.preventDefault();
    const p = localPos(e);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    window.Render.zoomAt(p.x, p.y, factor);
  }, { passive: false });

  function updateHover(x, y) {
    const pad = window.Render.pickPad(x, y);
    window.Render.setHoverPad(pad);
    canvas.style.cursor = pad >= 0 || window.Render.pickTower(x, y) ? 'pointer' : (UI.buildType ? 'crosshair' : 'grab');
  }

  function handleClick(x, y) {
    if (S.phase === 'lobby') return;
    const tower = window.Render.pickTower(x, y);
    if (UI.buildType) {
      const padIdx = window.Render.pickPad(x, y);
      if (padIdx >= 0) {
        const pad = S.pads[padIdx];
        if (pad.tower) { UI.selectTower(pad.tower); return; }
        if (window.Game.placeTower(padIdx, UI.buildType)) {
          window.SFX.play('build');
          UI.toast(window.DATA.TOWERS[UI.buildType].name + ' 배치 완료');
          UI.updateBuildBar();
          if (pad.tower) UI.selectTower(pad.tower);
        } else {
          UI.toast('골드가 부족합니다.');
        }
        return;
      }
      if (tower) { UI.selectTower(tower); return; }
      UI.clearSelection();
      return;
    }
    if (tower) { UI.selectTower(tower); return; }
    const padIdx = window.Render.pickPad(x, y);
    if (padIdx >= 0) { UI.selectPad(padIdx); return; }
    UI.clearSelection();
  }

  /* ───────── 루프 ───────── */
  let last = performance.now(), acc = 0;
  function loop(now) {
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    const csActive = window.Cutscene && window.Cutscene.isActive();
    if (!S.paused && !csActive) G.update(dt);
    window.Render.draw(dt);
    if (S.phase !== 'lobby') window.UI.update(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.addEventListener('resize', () => {
    window.Render.resize();
    if (window.Cutscene) window.Cutscene._resize && window.Cutscene._resize();
  });

  // 첫 입력에서 오디오 활성화
  const unlock = () => { window.SFX.resume(); window.removeEventListener('pointerdown', unlock); };
  window.addEventListener('pointerdown', unlock);

  // 화면이 가려지면 자동 일시정지
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.phase === 'wave') S.paused = true;
  });
})();
