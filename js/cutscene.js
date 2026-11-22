/* 현대병기 · 중세 방어전 — 시네마틱 컷신 시스템 */
window.Cutscene = (function () {
  'use strict';

  const SCENES = {
    opening: {
      title: '프롤로그 · 37번째 시제품',
      shots: [
        { bg: 'lab', speaker: '나레이션', portrait: 'narrator', fx: 'rain',
          text: '새벽 3시. 연구소엔 나와 커피 6잔, 그리고 37번째 시제품만 남아 있었다.' },
        { bg: 'lab', speaker: '한도현', portrait: 'dohyun', fx: 'rain',
          text: '이번엔 진짜 된다. 열역학 제2법칙도, 내 월급도 이번엔 내 편이야.' },
        { bg: 'flash', speaker: '나레이션', portrait: 'narrator', fx: 'flash', shake: 14,
          text: '그리고 케이블 하나가, 아주 약간, 잘못 연결되어 있었다.' },
        { bg: 'village', speaker: '한도현', portrait: 'dohyun', fx: 'rain',
          text: '…눈을 떴더니 흙길, 닭, 그리고 5G 신호 0칸. 와이파이 비밀번호부터 물어볼까.' },
        { bg: 'throne', speaker: '발드릭 영주', portrait: 'lord', fx: 'embers',
          text: '이 마을은 내 땅이다! 세금은 곡식의 9할. 못 내면 마을을 불태운다!' },
        { bg: 'throne', speaker: '촌장', portrait: 'chief', fx: 'embers',
          text: '저, 저번엔 닭도 가져가셨습니다…' },
        { bg: 'throne', speaker: '발드릭 영주', portrait: 'lord', fx: 'embers',
          text: '닭은 세금이 아니라 취향이다.' },
        { bg: 'workshop', speaker: '한도현', portrait: 'dohyun', fx: 'sparks',
          text: '9할을 뜯어? 우리 회사보다 심하네. …잠깐. 이거, 기회인가?' },
        { bg: 'workshop', speaker: '한도현', portrait: 'dohyun', fx: 'sparks',
          text: '쇠파이프, 화약, 그리고 내 머리. 방패? 7.62mm 앞에서는 그냥 등산 스틱이지.' },
        { bg: 'army', speaker: '병사', portrait: 'soldier', fx: 'torches', shake: 3,
          text: '저, 저 집 마당에서 쇠 파이프가 불을 뿜는데…?!' },
        { bg: 'army', speaker: '발드릭 영주', portrait: 'lord', fx: 'torches',
          text: '마법이다. 마법은 내가 더 잘 안다. …아마도.' },
        { bg: 'title', speaker: '나레이션', portrait: 'narrator', fx: 'dust',
          text: '현대병기 · 중세 방어전 — 마법이 아니라 열역학 제2법칙입니다.' },
      ],
    },

    stage2: {
      title: '제2막 · 철갑 기병대',
      shots: [
        { bg: 'throne', speaker: '정찰병', portrait: 'soldier', fx: 'embers',
          text: '영주님, 그 마을에 이상한 게 늘었습니다. 쇠로 만든 닭이…' },
        { bg: 'throne', speaker: '발드릭 영주', portrait: 'lord', fx: 'embers',
          text: '닭? 좋다. 닭은 세금이다.' },
        { bg: 'throne', speaker: '정찰병', portrait: 'soldier', fx: 'embers',
          text: '그 닭이 3초에 백 발을 쏩니다.' },
        { bg: 'throne', speaker: '발드릭 영주', portrait: 'lord', fx: 'embers',
          text: '…그럼 기병대를 보내라. 말은 총알보다 빠르다!' },
        { bg: 'battle', speaker: '한도현', portrait: 'dohyun', fx: 'battle',
          text: '말이 총알보다 빠르면, 내가 왜 개틀링을 만들었겠어.' },
      ],
    },

    stage3: {
      title: '제3막 · 공성 병기',
      shots: [
        { bg: 'army', speaker: '병사', portrait: 'soldier', fx: 'torches',
          text: '공성추를 보냈습니다! 이번엔 진짜 큽니다!' },
        { bg: 'battle', speaker: '한도현', portrait: 'dohyun', fx: 'battle',
          text: '목재에 철판? 완벽한 연료네. 화염방사기, 네 차례야.' },
        { bg: 'throne', speaker: '발드릭 영주', portrait: 'lord', fx: 'embers',
          text: '잠깐. 우리 공성추 어디 갔어?' },
        { bg: 'throne', speaker: '병사', portrait: 'soldier', fx: 'embers',
          text: '타고 있습니다, 영주님. 아주 열정적으로.' },
      ],
    },

    boss1: {
      title: '보스 · 악덕 군주 강림',
      shots: [
        { bg: 'army', speaker: '발드릭 영주', portrait: 'lord', fx: 'torches', shake: 4,
          text: '내가 직접 나서겠다! 이 갑옷은 마법으로 강화됐다!' },
        { bg: 'battle', speaker: '한도현', portrait: 'dohyun', fx: 'battle',
          text: '마법이 아니라 열역학 제2법칙인데. 갑옷 안에서 열이 안 빠지면… 요리되는 거야.' },
        { bg: 'battle', speaker: '발드릭 영주', portrait: 'lord', fx: 'battle', shake: 6,
          text: '요리라니! 나는 군주다! …왜 이렇게 덥지?' },
      ],
    },

    relic1: {
      title: '고대 유물 · 첫 발굴',
      shots: [
        { bg: 'relic', speaker: '???', portrait: 'relic', fx: 'glow',
          text: '고대의 유물이 잠에서 깨어난다… 위대한 힘을 받아들일 것인가.' },
        { bg: 'relic', speaker: '한도현', portrait: 'dohyun', fx: 'glow',
          text: '이거 우리 연구소 3D 프린터 부품 같은데. …아니다, 그냥 받자.' },
      ],
    },

    stage5: {
      title: '제5막 · 군주의 심장부',
      shots: [
        { bg: 'throne', speaker: '발드릭 영주', portrait: 'lord', fx: 'embers', shake: 3,
          text: '이 미친 마을! 내 군대가 왜 매번 쇠고기 다짐육이 되는 거냐!' },
        { bg: 'battle', speaker: '한도현', portrait: 'dohyun', fx: 'battle',
          text: '품질 관리 문제입니다. 입력은 농민병, 출력은 다짐육. 공정은 안정적이에요.' },
        { bg: 'army', speaker: '발드릭 영주', portrait: 'lord', fx: 'torches',
          text: '좋다! 내 성 전체를 동원하겠다! 이번엔 진짜다!' },
        { bg: 'workshop', speaker: '한도현', portrait: 'dohyun', fx: 'sparks',
          text: '그 말, 지난 4번도 들었어. 슬슬 레일건 충전해 볼까.' },
      ],
    },

    prestige: {
      title: '재회귀 · 또 야근이야?',
      shots: [
        { bg: 'vortex', speaker: '한도현', portrait: 'dohyun', fx: 'vortex', shake: 5,
          text: '또 야근… 아니, 또 회귀야? 이번엔 좀 더 세게 만들어 오지.' },
        { bg: 'vortex', speaker: '나레이션', portrait: 'narrator', fx: 'vortex',
          text: '시간의 균열이 열린다. 기억과 회귀석, 고대 유물만 남은 채 모든 것이 시작점으로.' },
        { bg: 'throne', speaker: '발드릭 영주', portrait: 'lord', fx: 'embers',
          text: '어? 저 녀석, 또 시작점에 있네?' },
        { bg: 'title', speaker: '한도현', portrait: 'dohyun', fx: 'dust',
          text: '이번엔 개틀링부터 깔고 시작한다.' },
      ],
    },
  };

  const S = { active: false, scene: null, shot: 0, t: 0, shotT: 0, typed: 0, done: false, onDone: null, seenKey: null };
  let canvas, ctx, dpr = 1, W = 0, H = 0, raf = 0, last = 0, el = {}, typedTimer = 0;

  /* ───────── 초상화 ───────── */
  const SKIN = '#e9c3a0', SKIN_D = '#c99a76';
  function circle(c, x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fillStyle = fill; c.fill(); }
  function rect(c, x, y, w, h, fill, r) {
    c.beginPath();
    if (r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); }
    else c.rect(x, y, w, h);
    c.fillStyle = fill; c.fill();
  }

  const PORTRAITS = {
    dohyun(c, t) {
      const g = c.createLinearGradient(0, 0, 128, 128);
      g.addColorStop(0, '#1b2b44'); g.addColorStop(1, '#0b1220');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      // 연구원 가운
      c.beginPath(); c.moveTo(24, 128); c.lineTo(34, 92); c.lineTo(52, 84); c.lineTo(76, 84); c.lineTo(94, 92); c.lineTo(104, 128); c.closePath();
      c.fillStyle = '#e8eef5'; c.fill();
      c.beginPath(); c.moveTo(64, 86); c.lineTo(52, 96); c.lineTo(64, 128); c.lineTo(76, 96); c.closePath();
      c.fillStyle = '#cbd6e2'; c.fill();
      // 목
      rect(c, 55, 76, 18, 16, SKIN_D, 4);
      // 얼굴
      c.beginPath(); c.ellipse(64, 54, 22, 26, 0, 0, 6.2832); c.fillStyle = SKIN; c.fill();
      // 머리카락
      c.beginPath(); c.moveTo(41, 50);
      c.quadraticCurveTo(40, 22, 64, 22);
      c.quadraticCurveTo(90, 22, 88, 50);
      c.quadraticCurveTo(82, 36, 64, 38);
      c.quadraticCurveTo(50, 38, 41, 50);
      c.fillStyle = '#1d1a20'; c.fill();
      // 그림자
      c.beginPath(); c.ellipse(64, 62, 20, 18, 0, 0, 6.2832); c.fillStyle = 'rgba(0,0,0,.06)'; c.fill();
      // 안경
      const gl = 0.6 + Math.sin(t * 2) * 0.1;
      c.strokeStyle = '#cfd8e3'; c.lineWidth = 2;
      c.beginPath(); c.arc(53, 54, 9, 0, 6.2832); c.stroke();
      c.beginPath(); c.arc(76, 54, 9, 0, 6.2832); c.stroke();
      c.beginPath(); c.moveTo(62, 54); c.lineTo(67, 54); c.stroke();
      c.fillStyle = 'rgba(160,220,255,' + gl * 0.35 + ')';
      circle(c, 53, 54, 8, 'rgba(150,210,255,.15)'); circle(c, 76, 54, 8, 'rgba(150,210,255,.15)');
      // 눈
      const blink = (Math.sin(t * 0.9) > 0.985) ? 0.15 : 1;
      c.fillStyle = '#20242b';
      c.beginPath(); c.ellipse(53, 55, 2.4, 2.9 * blink, 0, 0, 6.2832); c.fill();
      c.beginPath(); c.ellipse(76, 55, 2.4, 2.9 * blink, 0, 0, 6.2832); c.fill();
      // 눈썹·입
      c.strokeStyle = '#2a2420'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(47, 46); c.lineTo(58, 44); c.moveTo(70, 44); c.lineTo(81, 46); c.stroke();
      c.beginPath(); c.moveTo(58, 68); c.quadraticCurveTo(64, 71, 70, 68); c.stroke();
      // 수염 자국
      c.fillStyle = 'rgba(40,35,35,.18)';
      c.beginPath(); c.ellipse(64, 70, 14, 8, 0, 0, 3.14); c.fill();
    },
    lord(c, t) {
      const g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#3b0d18'); g.addColorStop(1, '#16070c');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      // 망토
      c.beginPath(); c.moveTo(12, 128); c.lineTo(32, 98); c.lineTo(96, 98); c.lineTo(116, 128); c.closePath();
      c.fillStyle = '#6b1322'; c.fill();
      c.fillStyle = '#2c0a10'; c.fillRect(52, 96, 24, 32);
      // 목/얼굴
      rect(c, 55, 78, 18, 16, '#d8b08c', 4);
      c.beginPath(); c.ellipse(64, 52, 23, 27, 0, 0, 6.2832); c.fillStyle = '#dcb692'; c.fill();
      // 수염
      c.beginPath(); c.moveTo(48, 62); c.quadraticCurveTo(64, 96, 80, 62);
      c.quadraticCurveTo(72, 78, 64, 76); c.quadraticCurveTo(56, 78, 48, 62);
      c.fillStyle = '#3a2a24'; c.fill();
      // 왕관
      c.beginPath(); c.moveTo(40, 30); c.lineTo(46, 12); c.lineTo(55, 24); c.lineTo(64, 8); c.lineTo(73, 24); c.lineTo(82, 12); c.lineTo(88, 30); c.closePath();
      c.fillStyle = '#e8b73c'; c.fill();
      c.strokeStyle = '#ffe08a'; c.lineWidth = 1.5; c.stroke();
      circle(c, 64, 22, 3, '#ff5f6d'); circle(c, 50, 26, 2, '#6ee7ff'); circle(c, 78, 26, 2, '#6ee7ff');
      // 눈(분노)
      c.fillStyle = '#1d0f0b';
      c.beginPath(); c.ellipse(54, 52, 3, 2.6, -0.25, 0, 6.2832); c.fill();
      c.beginPath(); c.ellipse(74, 52, 3, 2.6, 0.25, 0, 6.2832); c.fill();
      c.strokeStyle = '#2b1a14'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(46, 45); c.lineTo(59, 49); c.moveTo(69, 49); c.lineTo(82, 45); c.stroke();
      // 입
      c.strokeStyle = '#4a2a20'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(55, 68); c.quadraticCurveTo(64, 64, 73, 68); c.stroke();
      // 분노 이펙트
      const p = 0.5 + Math.sin(t * 3) * 0.5;
      c.strokeStyle = 'rgba(255,70,70,' + (0.25 + p * 0.35) + ')'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(20, 44); c.lineTo(30, 40); c.moveTo(108, 44); c.lineTo(98, 40); c.stroke();
    },
    soldier(c, t) {
      const g = c.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, '#1b2430'); g.addColorStop(1, '#0a0f16');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      c.beginPath(); c.moveTo(20, 128); c.lineTo(34, 96); c.lineTo(94, 96); c.lineTo(108, 128); c.closePath();
      c.fillStyle = '#4a5b6c'; c.fill();
      rect(c, 55, 78, 18, 16, '#d6a985', 4);
      c.beginPath(); c.ellipse(64, 56, 21, 24, 0, 0, 6.2832); c.fillStyle = '#e2bb98'; c.fill();
      // 투구
      c.beginPath(); c.arc(64, 46, 25, Math.PI, 0); c.fillStyle = '#7d8b99'; c.fill();
      c.fillRect(39, 46, 50, 8);
      c.beginPath(); c.moveTo(64, 54); c.lineTo(64, 72); c.lineTo(58, 72); c.lineTo(58, 54); c.closePath();
      c.fillStyle = '#6c7986'; c.fill();
      c.strokeStyle = '#a9b7c5'; c.lineWidth = 2; c.beginPath(); c.arc(64, 46, 25, Math.PI, 0); c.stroke();
      // 눈(걱정)
      c.fillStyle = '#20242b';
      c.beginPath(); c.ellipse(53, 58, 2.4, 3, 0, 0, 6.2832); c.fill();
      c.beginPath(); c.ellipse(75, 58, 2.4, 3, 0, 0, 6.2832); c.fill();
      c.strokeStyle = '#2a2420'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(47, 52); c.lineTo(57, 54); c.moveTo(71, 54); c.lineTo(81, 52); c.stroke();
      // 땀방울
      const dy = (t * 8) % 12;
      circle(c, 85, 48 + dy, 2, 'rgba(160,220,255,.85)');
    },
    chief(c, t) {
      c.fillStyle = '#1a2418'; c.fillRect(0, 0, 128, 128);
      c.beginPath(); c.moveTo(18, 128); c.lineTo(30, 94); c.lineTo(98, 94); c.lineTo(110, 128); c.closePath();
      c.fillStyle = '#5c4a35'; c.fill();
      rect(c, 55, 76, 18, 18, SKIN_D, 4);
      c.beginPath(); c.ellipse(64, 54, 21, 25, 0, 0, 6.2832); c.fillStyle = SKIN; c.fill();
      // 후드
      c.beginPath(); c.moveTo(34, 62); c.quadraticCurveTo(30, 20, 64, 18); c.quadraticCurveTo(98, 20, 94, 62);
      c.lineTo(86, 50); c.quadraticCurveTo(80, 30, 64, 30); c.quadraticCurveTo(48, 30, 42, 50); c.closePath();
      c.fillStyle = '#4c5a3a'; c.fill();
      // 수염
      c.beginPath(); c.moveTo(44, 62); c.quadraticCurveTo(64, 104, 84, 62); c.quadraticCurveTo(74, 80, 64, 80); c.quadraticCurveTo(54, 80, 44, 62);
      c.fillStyle = '#cfc8bb'; c.fill();
      c.fillStyle = '#2a2420';
      circle(c, 55, 54, 2, '#2a2420'); circle(c, 73, 54, 2, '#2a2420');
      c.strokeStyle = '#3a3028'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(48, 48); c.lineTo(59, 46); c.moveTo(69, 46); c.lineTo(80, 48); c.stroke();
      c.beginPath(); c.moveTo(58, 68); c.quadraticCurveTo(64, 66, 70, 68); c.stroke();
    },
    relic(c, t) {
      c.fillStyle = '#0d0a14'; c.fillRect(0, 0, 128, 128);
      const p = 0.5 + Math.sin(t * 2.2) * 0.5;
      const g = c.createRadialGradient(64, 60, 4, 64, 60, 58);
      g.addColorStop(0, 'rgba(255,215,120,' + (0.5 + p * 0.3) + ')');
      g.addColorStop(0.5, 'rgba(190,120,255,' + (0.18 + p * 0.12) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
      c.save(); c.translate(64, 60); c.rotate(t * 0.4);
      c.fillStyle = '#e8b73c';
      c.beginPath(); c.moveTo(0, -26); c.lineTo(24, 0); c.lineTo(0, 26); c.lineTo(-24, 0); c.closePath(); c.fill();
      c.fillStyle = '#7a4fd0';
      c.beginPath(); c.moveTo(0, -16); c.lineTo(15, 0); c.lineTo(0, 16); c.lineTo(-15, 0); c.closePath(); c.fill();
      c.strokeStyle = '#ffeaa0'; c.lineWidth = 1.5; c.stroke();
      c.restore();
      for (let i = 0; i < 6; i++) {
        const a = t * 0.8 + i * 1.047, r = 34 + Math.sin(t * 2 + i) * 6;
        circle(c, 64 + Math.cos(a) * r, 60 + Math.sin(a) * r * 0.8, 1.6, 'rgba(255,235,170,.8)');
      }
    },
    narrator(c, t) {
      c.fillStyle = '#11161f'; c.fillRect(0, 0, 128, 128);
      c.save(); c.translate(64, 64);
      c.fillStyle = '#c9b98f';
      c.fillRect(-26, -34, 52, 68);
      c.fillStyle = '#e6d9b4'; c.fillRect(-22, -30, 44, 60);
      c.strokeStyle = '#9b8a63'; c.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-16, -20 + i * 11); c.lineTo(16, -20 + i * 11); c.stroke(); }
      c.fillStyle = '#7a6a48'; c.fillRect(-30, -36, 8, 72); c.fillRect(22, -36, 8, 72);
      c.restore();
    },
  };

  /* ───────── 배경 그리기 ───────── */
  function sky(c, cols) {
    const g = c.createLinearGradient(0, 0, 0, H);
    cols.forEach((s, i) => g.addColorStop(s[0], s[1]));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function hills(c, y, amp, color, phase) {
    c.beginPath(); c.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) {
      const yy = y + Math.sin(x * 0.006 + phase) * amp + Math.sin(x * 0.017 + phase * 2) * amp * 0.35;
      c.lineTo(x, yy);
    }
    c.lineTo(W, H); c.closePath(); c.fillStyle = color; c.fill();
  }
  function rain(c, t, density, alpha) {
    c.strokeStyle = 'rgba(170,200,230,' + alpha + ')'; c.lineWidth = 1.2;
    const n = density;
    for (let i = 0; i < n; i++) {
      const seed = i * 97.13;
      const x = ((seed * 13 + t * 420) % (W + 120)) - 60;
      const y = ((seed * 31 + t * 900) % (H + 80)) - 40;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 3, y + 12); c.stroke();
    }
  }
  function lightning(c, t, seed) {
    const k = (Math.sin(t * 1.7 + seed) + Math.sin(t * 3.1 + seed * 2));
    if (k < 1.4) return 0;
    const a = Math.min(0.8, (k - 1.4) * 1.6);
    c.fillStyle = 'rgba(190,220,255,' + a * 0.22 + ')'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(230,245,255,' + a + ')'; c.lineWidth = 2.4;
    c.beginPath();
    let x = W * (0.2 + 0.6 * ((seed * 37) % 1)), y = 0;
    c.moveTo(x, y);
    for (let i = 0; i < 9; i++) { x += (Math.random() - 0.5) * 60; y += H / 10; c.lineTo(x, y); }
    c.stroke();
    return a;
  }
  function torches(c, t, count, baseY, spread) {
    for (let i = 0; i < count; i++) {
      const x = (i / count) * W * spread + W * (1 - spread) * 0.5 + Math.sin(t + i) * 2;
      const y = baseY + Math.sin(i * 0.7) * 10;
      const f = 0.7 + Math.sin(t * 9 + i * 2.3) * 0.3;
      const g = c.createRadialGradient(x, y, 1, x, y, 26 * f);
      g.addColorStop(0, 'rgba(255,210,110,.85)'); g.addColorStop(0.4, 'rgba(255,130,40,.35)'); g.addColorStop(1, 'rgba(255,80,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, 26 * f, 0, 6.2832); c.fill();
      c.fillStyle = 'rgba(255,235,180,.9)';
      c.beginPath(); c.ellipse(x, y - 4 * f, 2.6, 6 * f, 0, 0, 6.2832); c.fill();
    }
  }
  function crowd(c, t, n, yBase, color, scale) {
    c.fillStyle = color;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * W + ((i * 37) % 17) - 8 + Math.sin(t * 1.6 + i) * 1.2;
      const s = (0.8 + (((i * 53) % 10) / 10) * 0.5) * scale;
      const y = yBase + Math.sin(i * 1.3) * 6;
      // 몸
      c.beginPath(); c.ellipse(x, y, 5 * s, 13 * s, 0, 0, 6.2832); c.fill();
      // 머리
      c.beginPath(); c.arc(x, y - 14 * s, 4 * s, 0, 6.2832); c.fill();
      // 창
      c.strokeStyle = color; c.lineWidth = 2 * s;
      c.beginPath(); c.moveTo(x + 6 * s, y + 12 * s); c.lineTo(x + 12 * s, y - 30 * s); c.stroke();
      // 깃발
      if (i % 9 === 0) {
        c.fillStyle = '#7c1a28';
        c.beginPath(); c.moveTo(x - 4 * s, y - 34 * s); c.lineTo(x + 10 * s, y - 30 * s); c.lineTo(x - 4 * s, y - 24 * s); c.closePath(); c.fill();
        c.fillStyle = color;
      }
    }
  }
  function grain(c, t) {
    if (!grain.canvas) {
      grain.canvas = document.createElement('canvas');
      grain.canvas.width = 128; grain.canvas.height = 128;
      const g = grain.canvas.getContext('2d');
      const img = g.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = Math.random() * 26;
      }
      g.putImageData(img, 0, 0);
    }
    c.save();
    c.globalAlpha = 0.5;
    c.globalCompositeOperation = 'overlay';
    const ox = Math.floor((t * 400) % 128), oy = Math.floor((t * 300) % 128);
    for (let x = -ox; x < W; x += 128) for (let y = -oy; y < H; y += 128) c.drawImage(grain.canvas, x, y);
    c.restore();
  }
  function vignette(c, strength) {
    const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,' + strength + ')');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  function scanlines(c) {
    c.fillStyle = 'rgba(0,0,0,.12)';
    for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  }

  const BG = {
    lab(c, t) {
      sky(c, [[0, '#070d18'], [0.55, '#0d1626'], [1, '#060a12']]);
      // 창문 비
      c.fillStyle = '#0a1524'; c.fillRect(W * 0.06, H * 0.1, W * 0.28, H * 0.5);
      c.strokeStyle = '#1d2c42'; c.lineWidth = 6; c.strokeRect(W * 0.06, H * 0.1, W * 0.28, H * 0.5);
      c.save(); c.beginPath(); c.rect(W * 0.06, H * 0.1, W * 0.28, H * 0.5); c.clip();
      rain(c, t, 90, 0.35);
      lightning(c, t, 1.7);
      c.restore();
      // 모니터들
      for (let i = 0; i < 3; i++) {
        const x = W * (0.42 + i * 0.14), y = H * (0.22 + (i % 2) * 0.08), w = W * 0.12, h = H * 0.24;
        c.fillStyle = '#0b1420'; c.fillRect(x, y, w, h);
        c.strokeStyle = '#1c3a55'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
        c.strokeStyle = 'rgba(90,200,255,' + (0.5 + Math.sin(t * 2 + i) * 0.2) + ')'; c.lineWidth = 1.4;
        c.beginPath();
        for (let px = 0; px < w; px += 5) {
          const py = y + h / 2 + Math.sin((px * 0.08) + t * 4 + i) * h * 0.18;
          if (px === 0) c.moveTo(x + px, py); else c.lineTo(x + px, py);
        }
        c.stroke();
        c.fillStyle = 'rgba(90,200,255,.7)';
        for (let k = 0; k < 6; k++) c.fillRect(x + 8, y + 10 + k * 9, (w - 20) * (0.3 + ((k * 17 + i * 7) % 10) / 14), 2);
      }
      // 작업대
      c.fillStyle = '#131c28'; c.fillRect(0, H * 0.66, W, H * 0.34);
      c.fillStyle = '#1c2836'; c.fillRect(0, H * 0.66, W, 10);
      // 커피컵
      const cx = W * 0.36, cy = H * 0.64;
      c.fillStyle = '#d9dde3'; c.fillRect(cx, cy - 30, 26, 32);
      c.fillStyle = '#8b3a2a'; c.fillRect(cx + 3, cy - 27, 20, 8);
      for (let i = 0; i < 3; i++) {
        c.strokeStyle = 'rgba(200,210,220,' + (0.25 - i * 0.06) + ')'; c.lineWidth = 2;
        c.beginPath();
        c.moveTo(cx + 8 + i * 5, cy - 34);
        c.bezierCurveTo(cx + 4 + i * 5 + Math.sin(t * 2 + i) * 6, cy - 48, cx + 12 + i * 5, cy - 58, cx + 8 + i * 5, cy - 70);
        c.stroke();
      }
      // 주인공 실루엣
      c.fillStyle = 'rgba(8,12,18,.92)';
      c.beginPath(); c.ellipse(W * 0.2, H * 0.72, W * 0.055, H * 0.12, 0, 0, 6.2832); c.fill();
      c.beginPath(); c.arc(W * 0.2, H * 0.55, W * 0.028, 0, 6.2832); c.fill();
      // 스파크
      for (let i = 0; i < 10; i++) {
        const px = W * 0.7 + Math.sin(t * 3 + i * 2) * 60, py = H * 0.62 + Math.cos(t * 5 + i) * 26;
        c.fillStyle = 'rgba(255,210,120,' + (0.4 + Math.sin(t * 12 + i) * 0.4) + ')';
        c.fillRect(px, py, 2, 2);
      }
      vignette(c, 0.85); grain(c, t);
    },
    flash(c, t) {
      c.fillStyle = '#dff2ff'; c.fillRect(0, 0, W, H);
      const p = Math.min(1, t / 1.6);
      const g = c.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * (0.4 + p * 0.5));
      g.addColorStop(0, 'rgba(255,255,255,' + (1 - p * 0.6) + ')');
      g.addColorStop(0.35, 'rgba(160,220,255,' + (0.7 - p * 0.5) + ')');
      g.addColorStop(1, 'rgba(10,20,40,' + (0.2 + p * 0.8) + ')');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // 파편
      for (let i = 0; i < 60; i++) {
        const a = i * 2.399, r = 60 + p * (200 + (i % 7) * 60);
        const x = W / 2 + Math.cos(a) * r, y = H / 2 + Math.sin(a) * r * 0.7;
        c.save(); c.translate(x, y); c.rotate(a + t * 3);
        c.fillStyle = 'rgba(40,60,90,' + (0.7 - p * 0.5) + ')'; c.fillRect(-4, -2, 8, 4);
        c.restore();
      }
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * 6.2832 + t;
        c.strokeStyle = 'rgba(255,255,255,' + (0.18 - p * 0.12) + ')'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(W / 2, H / 2); c.lineTo(W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * W * 0.7); c.stroke();
      }
      grain(c, t);
    },
    village(c, t) {
      sky(c, [[0, '#101826'], [0.5, '#1b2434'], [1, '#0b1018']]);
      // 달
      circle(c, W * 0.78, H * 0.18, 44, 'rgba(240,240,220,.9)');
      circle(c, W * 0.78, H * 0.18, 44, 'rgba(255,255,240,.12)');
      // 별
      for (let i = 0; i < 40; i++) {
        const x = (i * 137.5) % W, y = (i * 71.3) % (H * 0.45);
        c.fillStyle = 'rgba(255,255,255,' + (0.2 + Math.sin(t * 2 + i) * 0.15) + ')';
        c.fillRect(x, y, 1.6, 1.6);
      }
      hills(c, H * 0.62, 26, '#0f1a20', 1.2);
      hills(c, H * 0.72, 18, '#0b1318', 2.4);
      // 마을 집들
      function house(x, y, s, lit) {
        c.fillStyle = '#1a2028';
        c.fillRect(x - 30 * s, y - 40 * s, 60 * s, 40 * s);
        c.beginPath(); c.moveTo(x - 40 * s, y - 40 * s); c.lineTo(x, y - 72 * s); c.lineTo(x + 40 * s, y - 40 * s); c.closePath();
        c.fillStyle = '#232b33'; c.fill();
        if (lit) {
          const g = c.createRadialGradient(x, y - 22 * s, 2, x, y - 22 * s, 40 * s);
          g.addColorStop(0, 'rgba(255,190,90,.55)'); g.addColorStop(1, 'rgba(255,140,40,0)');
          c.fillStyle = g; c.beginPath(); c.arc(x, y - 22 * s, 40 * s, 0, 6.2832); c.fill();
          c.fillStyle = '#ffcf7a'; c.fillRect(x - 10 * s, y - 30 * s, 18 * s, 14 * s);
        }
      }
      house(W * 0.3, H * 0.82, 1.2, true);
      house(W * 0.46, H * 0.88, 1.0, true);
      house(W * 0.64, H * 0.84, 1.3, false);
      // 연기
      for (let i = 0; i < 5; i++) {
        const yy = H * 0.62 - ((t * 12 + i * 24) % 120);
        circle(c, W * 0.3 + Math.sin(t + i) * 12, yy, 8 + i * 2, 'rgba(160,170,180,.06)');
      }
      rain(c, t, 100, 0.22);
      lightning(c, t, 4.1);
      vignette(c, 0.8); grain(c, t);
    },
    throne(c, t) {
      sky(c, [[0, '#1a0b12'], [0.6, '#2a1018'], [1, '#0a0508']]);
      // 기둥
      for (let i = 0; i < 6; i++) {
        const x = (i / 5) * W;
        c.fillStyle = i % 2 ? '#1c1116' : '#26141a';
        c.fillRect(x - 34, 0, 68, H);
        c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x - 34, 0, 12, H);
      }
      // 계단
      for (let i = 0; i < 4; i++) {
        c.fillStyle = 'rgba(30,18,22,' + (0.6 + i * 0.1) + ')';
        c.fillRect(W * 0.3 - i * 20, H * 0.64 + i * 22, W * 0.4 + i * 40, 24);
      }
      // 왕좌
      c.fillStyle = '#2b1418';
      c.fillRect(W * 0.44, H * 0.32, W * 0.12, H * 0.34);
      c.beginPath(); c.moveTo(W * 0.44, H * 0.32); c.lineTo(W * 0.5, H * 0.2); c.lineTo(W * 0.56, H * 0.32); c.closePath(); c.fill();
      // 군주 실루엣
      c.fillStyle = '#080406';
      c.beginPath(); c.ellipse(W * 0.5, H * 0.53, W * 0.035, H * 0.1, 0, 0, 6.2832); c.fill();
      c.beginPath(); c.arc(W * 0.5, H * 0.4, W * 0.024, 0, 6.2832); c.fill();
      // 왕관 불빛
      const gp = 0.6 + Math.sin(t * 2) * 0.4;
      const cg = c.createRadialGradient(W * 0.5, H * 0.37, 2, W * 0.5, H * 0.37, 70);
      cg.addColorStop(0, 'rgba(255,210,90,' + (0.6 * gp) + ')'); cg.addColorStop(1, 'rgba(255,160,30,0)');
      c.fillStyle = cg; c.beginPath(); c.arc(W * 0.5, H * 0.37, 70, 0, 6.2832); c.fill();
      // 횃불
      for (const x of [0.24, 0.76]) {
        const g = c.createRadialGradient(W * x, H * 0.42, 2, W * x, H * 0.42, 120);
        g.addColorStop(0, 'rgba(255,190,90,.55)'); g.addColorStop(1, 'rgba(255,100,20,0)');
        c.fillStyle = g; c.beginPath(); c.arc(W * x, H * 0.42, 120, 0, 6.2832); c.fill();
        c.fillStyle = 'rgba(255,220,150,.9)';
        c.beginPath(); c.ellipse(W * x, H * 0.42 - 6, 4, 12 + Math.sin(t * 8 + x) * 3, 0, 0, 6.2832); c.fill();
      }
      // 불티
      for (let i = 0; i < 24; i++) {
        const x = (Math.sin(i * 31 + t * 0.5) * 0.5 + 0.5) * W;
        const y = H - ((t * 30 + i * 47) % H);
        c.fillStyle = 'rgba(255,170,70,' + (0.5 * (1 - y / H)) + ')';
        c.fillRect(x, y, 2, 2);
      }
      vignette(c, 0.9); grain(c, t);
    },
    army(c, t) {
      sky(c, [[0, '#2a1010'], [0.4, '#4a1a12'], [0.75, '#1a0d0c'], [1, '#080505']]);
      // 붉은 구름
      for (let i = 0; i < 5; i++) {
        c.fillStyle = 'rgba(120,40,30,.16)';
        c.beginPath(); c.ellipse(W * (0.1 + i * 0.2) + Math.sin(t * 0.2 + i) * 30, H * (0.2 + (i % 3) * 0.06), W * 0.2, H * 0.08, 0, 0, 6.2832); c.fill();
      }
      hills(c, H * 0.58, 20, '#1a0f0e', 3.1);
      crowd(c, t, 120, H * 0.72, '#0c0808', 1.05);
      torches(c, t, 40, H * 0.66, 0.96);
      // 깃발들
      for (let i = 0; i < 6; i++) {
        const x = W * (0.08 + i * 0.17), y = H * 0.68;
        c.strokeStyle = '#1a0d0a'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(x, y + 30); c.lineTo(x, y - 150); c.stroke();
        c.fillStyle = '#5c0f18';
        c.beginPath(); c.moveTo(x, y - 150); c.lineTo(x + 46 + Math.sin(t * 2 + i) * 6, y - 132); c.lineTo(x, y - 112); c.closePath(); c.fill();
      }
      lightning(c, t, 2.3);
      vignette(c, 0.85); grain(c, t);
    },
    workshop(c, t) {
      sky(c, [[0, '#171009'], [0.6, '#241a10'], [1, '#0b0805']]);
      c.fillStyle = '#2a1f14';
      c.fillRect(0, H * 0.7, W, H * 0.3);
      // 벽 판자
      c.strokeStyle = 'rgba(80,60,35,.5)'; c.lineWidth = 2;
      for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(0, i * H * 0.06); c.lineTo(W, i * H * 0.06); c.stroke(); }
      // 설계도 빛
      const g = c.createRadialGradient(W * 0.3, H * 0.5, 10, W * 0.3, H * 0.5, 260);
      g.addColorStop(0, 'rgba(90,180,255,.35)'); g.addColorStop(1, 'rgba(30,80,140,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // 책상 + 설계도
      c.fillStyle = '#1a120a'; c.fillRect(W * 0.12, H * 0.66, W * 0.36, H * 0.34);
      c.save(); c.translate(W * 0.3, H * 0.7); c.rotate(-0.04);
      c.fillStyle = '#d8e6f2'; c.fillRect(-120, -70, 240, 140);
      c.strokeStyle = '#2b6a9c'; c.lineWidth = 1.6;
      c.strokeRect(-108, -58, 216, 116);
      c.beginPath(); c.moveTo(-90, 30); c.lineTo(-40, -10); c.lineTo(0, 20); c.lineTo(50, -30); c.lineTo(92, 10); c.stroke();
      c.fillStyle = '#2b6a9c'; c.font = 'bold 14px monospace'; c.fillText('M134 / 7.62mm', -96, -40);
      c.restore();
      // 화약·부품
      for (let i = 0; i < 5; i++) {
        c.fillStyle = '#3a3a40'; c.fillRect(W * 0.55 + i * 26, H * 0.74, 18, 40);
      }
      // 모루와 불꽃
      const sx = W * 0.72, sy = H * 0.7;
      c.fillStyle = '#20242a'; c.fillRect(sx - 40, sy, 80, 34);
      c.fillStyle = '#2c3238'; c.fillRect(sx - 20, sy + 34, 40, 60);
      for (let i = 0; i < 18; i++) {
        const a = t * 6 + i * 1.7;
        const x = sx + Math.cos(a) * (30 + (i % 5) * 14), y = sy - Math.abs(Math.sin(a)) * (40 + (i % 3) * 25);
        c.fillStyle = 'rgba(255,' + (150 + (i % 4) * 25) + ',80,' + (0.3 + (i % 3) * 0.2) + ')';
        c.fillRect(x, y, 2, 2);
      }
      const fg = c.createRadialGradient(sx, sy + 10, 2, sx, sy + 10, 70);
      fg.addColorStop(0, 'rgba(255,170,60,.5)'); fg.addColorStop(1, 'rgba(255,80,0,0)');
      c.fillStyle = fg; c.beginPath(); c.arc(sx, sy + 10, 70, 0, 6.2832); c.fill();
      vignette(c, 0.85); grain(c, t);
    },
    battle(c, t) {
      sky(c, [[0, '#0b0f16'], [0.5, '#141a22'], [1, '#05070a']]);
      hills(c, H * 0.6, 30, '#0a0f13', 0.7);
      crowd(c, t, 90, H * 0.74, '#080a0c', 1.1);
      // 포탑 실루엣
      c.fillStyle = '#101820';
      c.beginPath(); c.moveTo(W * 0.16, H * 0.8); c.lineTo(W * 0.2, H * 0.68); c.lineTo(W * 0.24, H * 0.8); c.closePath(); c.fill();
      c.fillRect(W * 0.19, H * 0.72, W * 0.02, H * 0.08);
      // 총구 화염 + 예광탄
      const muzzleX = W * 0.215, muzzleY = H * 0.7;
      for (let i = 0; i < 7; i++) {
        const ph = ((t * 1.4 + i * 0.13) % 1);
        if (ph > 0.8) continue;
        c.strokeStyle = 'rgba(255,230,150,' + (0.9 - ph) + ')'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(muzzleX, muzzleY); c.lineTo(muzzleX + ph * W * 0.55, muzzleY + (i - 3) * 6 + ph * 20); c.stroke();
      }
      const mg = c.createRadialGradient(muzzleX, muzzleY, 1, muzzleX, muzzleY, 90);
      mg.addColorStop(0, 'rgba(255,240,190,.95)'); mg.addColorStop(1, 'rgba(255,160,40,0)');
      c.fillStyle = mg; c.beginPath(); c.arc(muzzleX, muzzleY, 90, 0, 6.2832); c.fill();
      // 폭발
      for (let i = 0; i < 4; i++) {
        const ph = ((t * 0.6 + i * 0.25) % 1);
        const ex = W * (0.45 + i * 0.13), ey = H * (0.62 + (i % 2) * 0.08);
        const r = 20 + ph * 110;
        const eg = c.createRadialGradient(ex, ey, 2, ex, ey, r);
        eg.addColorStop(0, 'rgba(255,240,180,' + (0.8 * (1 - ph)) + ')');
        eg.addColorStop(0.35, 'rgba(255,150,40,' + (0.6 * (1 - ph)) + ')');
        eg.addColorStop(1, 'rgba(120,40,10,0)');
        c.fillStyle = eg; c.beginPath(); c.arc(ex, ey, r, 0, 6.2832); c.fill();
      }
      // 연기
      for (let i = 0; i < 6; i++) {
        circle(c, W * (0.4 + i * 0.09) + Math.sin(t + i) * 20, H * 0.66 - ((t * 18 + i * 30) % 140), 24 + i * 4, 'rgba(70,70,75,.08)');
      }
      vignette(c, 0.85); grain(c, t);
    },
    relic(c, t) {
      sky(c, [[0, '#0a0713'], [0.6, '#150d24'], [1, '#050308']]);
      // 광원
      const p = 0.6 + Math.sin(t * 1.8) * 0.4;
      const g = c.createRadialGradient(W / 2, H * 0.48, 10, W / 2, H * 0.48, Math.min(W, H) * 0.55);
      g.addColorStop(0, 'rgba(255,215,130,' + (0.5 * p) + ')');
      g.addColorStop(0.4, 'rgba(150,90,255,' + (0.16 * p) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // 바닥 원
      c.strokeStyle = 'rgba(200,160,255,.3)'; c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.ellipse(W / 2, H * 0.74, 120 + i * 60 + Math.sin(t * 1.4 + i) * 8, 34 + i * 16, 0, 0, 6.2832); c.stroke();
      }
      // 떠 있는 유물
      const y = H * 0.44 + Math.sin(t * 1.6) * 10;
      c.save(); c.translate(W / 2, y); c.rotate(Math.sin(t * 0.6) * 0.3);
      c.fillStyle = '#e8b73c';
      c.beginPath(); c.moveTo(0, -70); c.lineTo(54, 0); c.lineTo(0, 70); c.lineTo(-54, 0); c.closePath(); c.fill();
      c.fillStyle = '#6d3fc9';
      c.beginPath(); c.moveTo(0, -44); c.lineTo(34, 0); c.lineTo(0, 44); c.lineTo(-34, 0); c.closePath(); c.fill();
      c.strokeStyle = '#fff0b0'; c.lineWidth = 3; c.stroke();
      c.restore();
      // 입자
      for (let i = 0; i < 60; i++) {
        const a = i * 0.7 + t * (0.3 + (i % 5) * 0.05);
        const r = 60 + (i % 11) * 24 + Math.sin(t * 2 + i) * 14;
        const x = W / 2 + Math.cos(a) * r, yy = H * 0.48 + Math.sin(a * 1.3) * r * 0.55;
        c.fillStyle = 'rgba(255,235,170,' + (0.2 + 0.5 * (Math.sin(t * 3 + i) * 0.5 + 0.5)) + ')';
        c.fillRect(x, yy, 2.4, 2.4);
      }
      vignette(c, 0.85); grain(c, t);
    },
    vortex(c, t) {
      sky(c, [[0, '#05040a'], [0.5, '#0d0820'], [1, '#020104']]);
      const cx = W * 0.5, cy = H * 0.48;
      // 소용돌이
      for (let i = 0; i < 70; i++) {
        const ph = i / 70;
        const a = t * 1.4 + ph * 22;
        const r = 30 + ph * Math.min(W, H) * 0.62;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.62;
        const alpha = 0.12 + ph * 0.35;
        c.strokeStyle = ph % 0.2 < 0.1 ? 'rgba(140,200,255,' + alpha + ')' : 'rgba(190,130,255,' + alpha + ')';
        c.lineWidth = 1.4 + ph * 2.4;
        c.beginPath(); c.arc(cx, cy, r, a, a + 0.5 + ph); c.stroke();
      }
      // 균열
      c.save(); c.translate(cx, cy);
      const g = c.createRadialGradient(0, 0, 2, 0, 0, 220);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.12, 'rgba(180,230,255,.7)');
      g.addColorStop(0.5, 'rgba(120,80,255,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(0, 0, 220, 0, 6.2832); c.fill();
      c.strokeStyle = 'rgba(220,245,255,.8)'; c.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7 + t * 0.4;
        c.beginPath(); c.moveTo(Math.cos(a) * 20, Math.sin(a) * 14);
        c.lineTo(Math.cos(a + 0.2) * 140, Math.sin(a + 0.2) * 100); c.stroke();
      }
      c.restore();
      // 빨려드는 파편
      for (let i = 0; i < 60; i++) {
        const ph = ((t * 0.28 + i * 0.017) % 1);
        const a = i * 1.7 + t * 2;
        const r = (1 - ph) * Math.min(W, H) * 0.65 + 20;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.6;
        c.fillStyle = 'rgba(210,230,255,' + (0.2 + ph * 0.6) + ')';
        c.fillRect(x, y, 2.5 + ph * 2, 2.5 + ph * 2);
      }
      vignette(c, 0.9); grain(c, t);
    },
    title(c, t) {
      sky(c, [[0, '#05070c'], [0.6, '#0b111c'], [1, '#04060a']]);
      // 배경 성벽 실루엣
      c.fillStyle = 'rgba(20,30,40,.9)';
      c.fillRect(0, H * 0.72, W, H * 0.28);
      for (let i = 0; i < 26; i++) c.fillRect(i * (W / 26), H * 0.70, W / 52, H * 0.03);
      // 빛줄기
      for (let i = 0; i < 6; i++) {
        c.save();
        c.translate(W * 0.5, H * 0.1);
        c.rotate(-0.4 + i * 0.16 + Math.sin(t * 0.2 + i) * 0.02);
        const g = c.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, 'rgba(255,200,110,.10)'); g.addColorStop(1, 'rgba(255,140,40,0)');
        c.fillStyle = g; c.fillRect(-40, 0, 80, H);
        c.restore();
      }
      // 먼지
      for (let i = 0; i < 50; i++) {
        const x = (i * 197 + t * 8 * ((i % 3) + 1)) % W;
        const y = (i * 89 + t * 4) % H;
        c.fillStyle = 'rgba(255,230,180,' + (0.05 + (i % 5) * 0.03) + ')';
        c.fillRect(x, y, 2, 2);
      }
      vignette(c, 0.75); grain(c, t);
    },
  };

  /* ───────── DOM ───────── */
  function buildDom() {
    el.root = document.getElementById('cutscene');
    el.canvas = document.getElementById('csCanvas');
    el.portrait = document.getElementById('csPortrait');
    el.speaker = document.getElementById('csSpeaker');
    el.text = document.getElementById('csText');
    el.title = document.getElementById('csSceneTitle');
    el.next = document.getElementById('csNext');
    el.skip = document.getElementById('csSkip');
    el.progress = document.getElementById('csProgress');
    el.flash = document.getElementById('csFlash');
    ctx = el.canvas.getContext('2d');
    el.next.addEventListener('click', e => { e.stopPropagation(); advance(); });
    el.skip.addEventListener('click', e => { e.stopPropagation(); finish(); });
    el.root.addEventListener('click', e => {
      if (e.target.closest('.cs-controls')) return;
      advance();
    });
    document.addEventListener('keydown', e => {
      if (!S.active) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advance(); }
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
    });
  }

  function resize() {
    if (!el.canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = el.canvas.clientWidth || window.innerWidth;
    H = el.canvas.clientHeight || window.innerHeight;
    el.canvas.width = Math.floor(W * dpr);
    el.canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawPortrait(name) {
    const c = el.portrait.getContext('2d');
    const s = el.portrait.width;
    c.clearRect(0, 0, s, s);
    c.save();
    c.scale(s / 128, s / 128);
    (PORTRAITS[name] || PORTRAITS.narrator)(c, S.t);
    c.restore();
    c.strokeStyle = 'rgba(255,210,120,.5)'; c.lineWidth = 2;
    c.strokeRect(1, 1, s - 2, s - 2);
  }

  function render(now) {
    if (!S.active) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    S.t += dt;
    S.shotT += dt;

    const shot = S.scene.shots[S.shot];
    const bg = BG[shot.bg] || BG.lab;
    ctx.clearRect(0, 0, W, H);
    // 카메라 줌/드리프트
    const z = 1.02 + Math.sin(S.t * 0.2) * 0.015;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
    bg(ctx, S.t);
    ctx.restore();

    // 화면 진동
    if (shot.shake) {
      const k = Math.max(0, 1 - S.shotT * 2.2);
      const sx = (Math.random() - 0.5) * shot.shake * k, sy = (Math.random() - 0.5) * shot.shake * k;
      ctx.save(); ctx.translate(sx, sy); ctx.restore();
    }
    // 전환 페이드
    const fade = Math.min(1, S.shotT / 0.35);
    if (fade < 1) { ctx.fillStyle = 'rgba(0,0,0,' + (1 - fade) + ')'; ctx.fillRect(0, 0, W, H); }

    // 타이프라이터
    if (!S.done) {
      typedTimer += dt;
      const cps = 34;
      S.typed = Math.min(shot.text.length, Math.floor(typedTimer * cps));
      if (S.typed >= shot.text.length) S.done = true;
      el.text.textContent = shot.text.slice(0, S.typed);
      el.text.classList.toggle('typing', !S.done);
    }

    drawPortrait(shot.portrait);

    // 진행 표시
    if (el.progress.children.length !== S.scene.shots.length) {
      el.progress.innerHTML = '';
      S.scene.shots.forEach(() => {
        const d = document.createElement('i'); el.progress.appendChild(d);
      });
    }
    Array.from(el.progress.children).forEach((d, i) => {
      d.className = i < S.shot ? 'done' : i === S.shot ? 'cur' : '';
    });
    el.next.textContent = S.shot >= S.scene.shots.length - 1 ? '완료 ▶' : '다음 ▶';
    el.skip.style.display = 'block';

    raf = requestAnimationFrame(render);
  }

  function showShot() {
    const shot = S.scene.shots[S.shot];
    S.shotT = 0;
    S.typed = 0;
    typedTimer = 0;
    S.done = false;
    el.text.textContent = '';
    el.speaker.textContent = shot.speaker;
    el.text.classList.add('typing');
    el.speaker.className = 'cs-speaker sp-' + (shot.portrait || 'narrator');
    el.root.dataset.bg = shot.bg;
    let tc = el.root.querySelector('.cs-titlecard');
    if (!tc) {
      tc = document.createElement('div');
      tc.className = 'cs-titlecard';
      tc.innerHTML = '<span class="tc-kicker">ISOMETRIC MASS DEFENSE</span><b>현대병기</b><i>중세 방어전</i><small>마법이 아니라 열역학 제2법칙입니다</small>';
      el.root.appendChild(tc);
    }
    if (shot.bg === 'title') {
      tc.style.display = 'block';
      void tc.offsetWidth;
      tc.classList.add('show');
    } else {
      tc.classList.remove('show');
      tc.style.display = 'none';
    }
    if (shot.shake) {
      el.root.classList.remove('shake'); void el.root.offsetWidth; el.root.classList.add('shake');
    }
    if (shot.fx === 'flash') {
      el.flash.classList.remove('boom'); void el.flash.offsetWidth; el.flash.classList.add('boom');
    }
  }

  function advance() {
    if (!S.active) return;
    if (!S.done) { // 타이핑 중이면 즉시 완성
      S.typed = S.scene.shots[S.shot].text.length;
      S.done = true;
      el.text.textContent = S.scene.shots[S.shot].text;
      return;
    }
    if (S.shot >= S.scene.shots.length - 1) { finish(); return; }
    S.shot++;
    showShot();
    if (window.SFX) SFX.play('cs_advance');
  }

  function play(id, onDone) {
    if (!SCENES[id]) { if (onDone) onDone(); return; }
    if (!el.root) buildDom();
    S.active = true; S.scene = SCENES[id]; S.shot = 0; S.t = 0; S.onDone = onDone;
    S.seenKey = id;
    el.root.classList.remove('hidden');
    el.root.classList.add('playing');
    el.title.textContent = SCENES[id].title;
    document.body.classList.add('cs-open');
    resize();
    showShot();
    last = performance.now();
    if (window.SFX) SFX.play('cs_open');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
    // 본 스토리 기록
    if (window.Game) {
      const save = window.Game.saveData;
      if (save) {
        save.seenCutscenes = save.seenCutscenes || {};
        save.seenCutscenes[id] = 1;
        try { lG(); } catch (e) {}
      }
    }
  }
  function lG() { window.Game.persist(); }

  function finish() {
    if (!S.active) return;
    S.active = false;
    cancelAnimationFrame(raf);
    el.root.classList.remove('playing');
    el.root.classList.add('hidden');
    document.body.classList.remove('cs-open');
    const cb = S.onDone; S.onDone = null;
    if (cb) setTimeout(cb, 60);
  }

  function isActive() { return S.active; }
  function list() {
    return Object.keys(SCENES).map(id => ({ id, title: SCENES[id].title, shots: SCENES[id].shots.length }));
  }

  return { play, finish, advance, isActive, list, SCENES, S, _resize: resize, _el: el };
})();
