/* 현대병기 · 중세 방어전 — 정적 데이터 (포탑·적·웨이브·기술 트리·재회귀) */
window.DATA = (function () {
  'use strict';

  const TILE_W = 64, TILE_H = 32;
  const MAP = 46;          // 46 x 46 타일
  const CX = 23, CY = 23;  // 마을 중심
  const VILLAGE = { x0: 15, y0: 15, x1: 31, y1: 31 };
  const WALL = 14.55;      // 성벽 바깥선

  /* ───────────────────────── 포탑 ───────────────────────── */
  const TOWERS = {
    gatling: {
      id: 'gatling', name: 'M134 개틀링', short: '개틀링', icon: '🔫', cat: 'gun',
      cost: 130, range: 9, dmg: 5.6, rate: 11, proj: 'bullet', spread: 0.055,
      hp: 420, desc: '분당 3,000발 7.62mm 탄막. 가까운 물량을 갈아버리는 기본 화력.',
      start: true, aim: true, barrel: 26, sound: 'mg',
    },
    hmgun: {
      id: 'hmgun', name: 'M2 중기관총', short: '중기관총', icon: '⛓️', cat: 'gun',
      cost: 240, range: 10, dmg: 26, rate: 3, proj: 'bullet', spread: 0.025, armorPen: 2,
      hp: 520, desc: '12.7mm 중기관총. 사거리가 길고 방어구를 뚫는 탄을 쏜다.',
      unlock: 'ball_hmgun', aim: true, barrel: 30, sound: 'hmg',
    },
    mortar: {
      id: 'mortar', name: '81mm 박격포', short: '박격포', icon: '💣', cat: 'arty',
      cost: 280, range: 14, dmg: 62, rate: 0.62, proj: 'shell', aoe: 1.9, arc: true,
      hp: 380, desc: '곡사 포탄이 적 무리 한가운데 떨어져 범위 피해를 준다.',
      start: true, sound: 'mortar',
    },
    flamer: {
      id: 'flamer', name: '화염방사기', short: '화염', icon: '🔥', cat: 'gun',
      cost: 210, range: 6.2, dmg: 40, rate: 6, proj: 'flame', aoe: 2.2, burn: 14,
      hp: 460, desc: '전방 부채꼴로 화염을 뿌려 다수에게 지속 화상을 입힌다.',
      unlock: 'ball_flamer', sound: 'flame',
    },
    grenade: {
      id: 'grenade', name: 'Mk19 유탄발사기', short: '유탄', icon: '🧨', cat: 'arty',
      cost: 360, range: 10.5, dmg: 44, rate: 1.35, proj: 'grenade', aoe: 1.65, arc: true,
      hp: 430, desc: '40mm 유탄을 연사해 뭉친 보병을 흩어 놓는다.',
      unlock: 'arty_grenade', sound: 'thump',
    },
    sniper: {
      id: 'sniper', name: '.50 대물 저격', short: '저격', icon: '🎯', cat: 'gun',
      cost: 430, range: 18, dmg: 320, rate: 0.45, proj: 'bullet', pierce: 1, armorPen: 6,
      hp: 340, desc: '초장거리 단일 저격. 중장갑 기사와 군주를 노린다.',
      unlock: 'ball_sniper', aim: true, barrel: 38, sound: 'sniper',
    },
    howitzer: {
      id: 'howitzer', name: '155mm 자주포', short: '자주포', icon: '💥', cat: 'arty',
      cost: 640, range: 19.5, dmg: 210, rate: 0.34, proj: 'shell', aoe: 3.3, arc: true,
      hp: 560, desc: '전장을 가로지르는 대구경 포격. 웨이브 밀집 구간을 통째로 지운다.',
      unlock: 'arty_howitzer', sound: 'cannon',
    },
    laser: {
      id: 'laser', name: '지향성 레이저', short: '레이저', icon: '🔆', cat: 'energy',
      cost: 660, range: 10.5, dmg: 165, rate: 1, proj: 'beam', beam: true,
      hp: 380, desc: '지속 광선으로 한 대상을 태운다. 조사 시간이 길수록 위력이 커진다.',
      unlock: 'en_laser', sound: 'laser',
    },
    railgun: {
      id: 'railgun', name: '전자기 레일건', short: '레일건', icon: '⚡', cat: 'energy',
      cost: 880, range: 16.5, dmg: 620, rate: 0.32, proj: 'rail', pierce: 99, armorPen: 20,
      hp: 400, desc: '일직선상의 모든 적을 관통하는 초전도 탄환.',
      unlock: 'en_rail', sound: 'rail',
    },
    missile: {
      id: 'missile', name: '미사일 포대', short: '미사일', icon: '🚀', cat: 'energy',
      cost: 720, range: 15.5, dmg: 78, rate: 1.7, proj: 'rocket', salvo: 4, aoe: 1.25,
      hp: 470, desc: '4연장 유도 미사일이 흩어진 표적을 각자 추적한다.',
      unlock: 'arty_missile', sound: 'rocket',
    },
    emp: {
      id: 'emp', name: '전자기 펄스', short: 'EMP', icon: '🌀', cat: 'energy',
      cost: 420, range: 9.4, dmg: 26, rate: 0.28, proj: 'pulse', aoe: 5.2, slow: 0.55, stun: 0.9,
      hp: 420, desc: '주기적으로 광역 전자기 펄스를 터뜨려 적을 감속·경직시킨다.',
      unlock: 'en_emp', sound: 'emp',
    },
    cryo: {
      id: 'cryo', name: '냉동 분사기', short: '냉동', icon: '❄️', cat: 'energy',
      cost: 300, range: 6.8, dmg: 22, rate: 5, proj: 'flame', aoe: 2, slow: 0.5, freeze: true,
      hp: 440, desc: '액화질소를 분사해 적 무리를 얼려 이동 속도를 절반으로 떨어뜨린다.',
      unlock: 'en_cryo', sound: 'cryo',
    },
    tesla: {
      id: 'tesla', name: '테슬라 코일', short: '테슬라', icon: '🌩️', cat: 'energy',
      cost: 620, range: 9.8, dmg: 95, rate: 1.2, proj: 'chain', chains: 5,
      hp: 450, desc: '번개가 최대 5개의 적을 연쇄로 태운다. 밀집 대형에 치명적.',
      unlock: 'en_tesla', sound: 'tesla',
    },
  };

  /* ───────────────────────── 적 ───────────────────────── */
  const ENEMIES = {
    peasant: {
      id: 'peasant', name: '농민병', hp: 30, speed: 1.95, dmg: 4, interval: 1.1, bounty: 5,
      armor: 0, size: 0.62, color: '#8d6b4a', cloth: '#a8895f', kind: 'foot',
      desc: '낫과 곡괭이를 든 징집 농민. 수로 압도한다.',
    },
    spearman: {
      id: 'spearman', name: '창병', hp: 58, speed: 1.65, dmg: 7, interval: 1.05, bounty: 7,
      armor: 1, size: 0.68, color: '#6f7e8c', cloth: '#8d9aa8', kind: 'spear',
      desc: '밀집 대형으로 성벽에 달라붙는 정규 보병.',
    },
    shield: {
      id: 'shield', name: '방패병', hp: 130, speed: 1.2, dmg: 8, interval: 1.15, bounty: 11,
      armor: 4, size: 0.72, color: '#7d6b52', cloth: '#9b8763', kind: 'shield',
      desc: '커다란 방패로 탄환을 막아낸다. 폭발 피해에 약하다.',
    },
    archer: {
      id: 'archer', name: '궁병', hp: 46, speed: 1.55, dmg: 6, interval: 1.4, bounty: 8,
      armor: 0, size: 0.6, color: '#4f6b52', cloth: '#6f8f6f', kind: 'bow',
      ranged: 4.6, desc: '원거리에서 포탑과 성벽을 저격한다.',
    },
    cavalry: {
      id: 'cavalry', name: '기병', hp: 105, speed: 3.05, dmg: 15, interval: 0.9, bounty: 14,
      armor: 2, size: 0.9, color: '#6b4c3a', cloth: '#8a6248', kind: 'horse',
      desc: '빠르게 측면을 파고들어 포탑을 직접 노린다.',
    },
    berserker: {
      id: 'berserker', name: '광전사', hp: 95, speed: 2.25, dmg: 18, interval: 0.7, bounty: 12,
      armor: 0, size: 0.7, color: '#8a3a2a', cloth: '#a84a35', kind: 'axe',
      desc: '방어구 없이 돌진하는 광전사. 성벽을 빠르게 깎는다.',
    },
    ram: {
      id: 'ram', name: '공성추', hp: 1100, speed: 0.72, dmg: 70, interval: 1.3, bounty: 55,
      armor: 9, size: 1.35, color: '#5b4a34', cloth: '#7a6647', kind: 'ram',
      siege: true, desc: '두꺼운 목재와 철판. 성벽에 큰 피해를 준다.',
    },
    catapult: {
      id: 'catapult', name: '투석기', hp: 340, speed: 0.95, dmg: 45, interval: 1.6, bounty: 28,
      armor: 2, size: 1.1, color: '#6a563b', cloth: '#8a7350', kind: 'catapult',
      ranged: 8, siege: true, desc: '멀찍이서 바위를 던져 성벽과 포탑을 부순다.',
    },
    knight: {
      id: 'knight', name: '중장갑 기사', hp: 480, speed: 1.25, dmg: 28, interval: 1.0, bounty: 40,
      armor: 12, size: 0.82, color: '#9aa7b5', cloth: '#c3cfda', kind: 'knight',
      desc: '전신 판금. 철갑탄과 레일건이 아니면 잘 뚫리지 않는다.',
    },
    siege: {
      id: 'siege', name: '공성탑', hp: 1600, speed: 0.65, dmg: 55, interval: 1.4, bounty: 70,
      armor: 7, size: 1.5, color: '#6b5334', cloth: '#8c7048', kind: 'siege',
      siege: true, desc: '성벽에 닿으면 농민병을 쏟아낸다.',
    },
    lord: {
      id: 'lord', name: '악덕 군주', hp: 7000, speed: 0.9, dmg: 220, interval: 1.2, bounty: 420,
      armor: 18, size: 1.65, color: '#5a1f28', cloth: '#8f2f3c', kind: 'lord',
      boss: true, siege: true, desc: '웨이브마다 찾아오는 군주. 주변 적을 광폭화시킨다.',
    },
  };

  /* ───────────────────────── 기술 트리 ───────────────────────── */
  const CATS = [
    { id: 'gun', name: '탄도·화기', icon: '🔫', color: '#f0b25c' },
    { id: 'arty', name: '폭발·포병', icon: '💥', color: '#ef7b52' },
    { id: 'energy', name: '첨단·에너지', icon: '⚡', color: '#6fd0ff' },
    { id: 'base', name: '기지·성벽·경제', icon: '🏰', color: '#9fe08a' },
  ];

  // eff 값은 레벨당 가산(배율 항목은 +n). unlock 은 1회 해금.
  const TECHS = [
    /* ── 탄도·화기 (14) ── */
    { id: 'ball_basic', cat: 'gun', name: '화기 교본', icon: '📕', x: 0, y: 2, max: 5, cost: 12,
      desc: '모든 총기류의 기본 사격 술기를 익힌다.', eff: { dmgMul: 0.05 } },
    { id: 'ball_hmgun', cat: 'gun', name: '중기관총 도입', icon: '⛓️', x: 1, y: 1, max: 1, cost: 60,
      req: ['ball_basic'], desc: 'M2 중기관총을 방어 슬롯에 배치할 수 있다.', eff: { unlock: 'hmgun' } },
    { id: 'ball_belt', cat: 'gun', name: '탄약 벨트', icon: '🧷', x: 1, y: 2, max: 5, cost: 22,
      req: ['ball_basic'], desc: '탄약 공급이 끊기지 않아 발사 속도가 오른다.', eff: { rateMul: 0.05 } },
    { id: 'ball_steel', cat: 'gun', name: '철갑탄', icon: '🔩', x: 1, y: 3, max: 4, cost: 30,
      req: ['ball_basic'], desc: '방어구 관통력이 증가한다.', eff: { armorPen: 2 } },
    { id: 'ball_scope', cat: 'gun', name: '조준 보정', icon: '🔭', x: 2, y: 1, max: 4, cost: 34,
      req: ['ball_basic'], desc: '약점을 노려 치명타 확률이 오른다.', eff: { crit: 0.05 } },
    { id: 'ball_cool', cat: 'gun', name: '총열 냉각', icon: '🌬️', x: 2, y: 2, max: 4, cost: 38,
      req: ['ball_belt'], desc: '과열을 잡아 연사 속도를 더 끌어올린다.', eff: { rateMul: 0.07 } },
    { id: 'ball_pierce', cat: 'gun', name: '관통 탄두', icon: '➡️', x: 2, y: 3, max: 2, cost: 90,
      req: ['ball_steel'], desc: '모든 탄환이 적 하나를 더 꿰뚫는다.', eff: { pierce: 1 } },
    { id: 'ball_flamer', cat: 'gun', name: '화염방사기', icon: '🔥', x: 2, y: 0, max: 1, cost: 85,
      req: ['ball_basic'], desc: '화염방사기를 해금한다. 근거리 다수 처리에 탁월.', eff: { unlock: 'flamer' } },
    { id: 'ball_incend', cat: 'gun', name: '소이탄', icon: '🧯', x: 3, y: 3, max: 3, cost: 70,
      req: ['ball_pierce'], desc: '모든 탄환에 화상을 입혀 지속 피해를 준다.', eff: { burn: 9 } },
    { id: 'ball_sniper', cat: 'gun', name: '대물 저격수', icon: '🎯', x: 3, y: 0, max: 1, cost: 130,
      req: ['ball_scope'], desc: '.50 대물 저격포를 해금한다.', eff: { unlock: 'sniper' } },
    { id: 'ball_dmg', cat: 'gun', name: '대구경 탄약', icon: '💢', x: 3, y: 2, max: 5, cost: 65,
      req: ['ball_cool'], desc: '탄자 무게를 늘려 화력을 끌어올린다.', eff: { dmgMul: 0.06 } },
    { id: 'ball_salvo', cat: 'gun', name: '다중 사격', icon: '🎇', x: 4, y: 1, max: 2, cost: 150,
      req: ['ball_cool'], desc: '탄환 계열 포탑이 한 번에 두 발씩 쏜다.', eff: { doubleShot: 0.35 } },
    { id: 'ball_jack', cat: 'gun', name: '강화 장갑탄', icon: '🧲', x: 4, y: 3, max: 2, cost: 120,
      req: ['ball_incend'], desc: '관통력과 치명타 피해를 함께 올린다.', eff: { armorPen: 4, crit: 0.03 } },
    { id: 'ball_elite', cat: 'gun', name: '정예 사격 통제', icon: '🥇', x: 5, y: 2, max: 3, cost: 200,
      req: ['ball_dmg', 'ball_salvo'], desc: '모든 화기 피해와 치명타 확률을 크게 올린다.', eff: { dmgMul: 0.09, crit: 0.04 } },

    /* ── 폭발·포병 (12) ── */
    { id: 'arty_basic', cat: 'arty', name: '포병 교리', icon: '📐', x: 0, y: 2, max: 5, cost: 14,
      desc: '폭발 범위와 포격 정밀도를 높인다.', eff: { aoeMul: 0.06 } },
    { id: 'arty_grenade', cat: 'arty', name: '유탄발사기', icon: '🧨', x: 1, y: 1, max: 1, cost: 95,
      req: ['arty_basic'], desc: 'Mk19 유탄발사기를 해금한다.', eff: { unlock: 'grenade' } },
    { id: 'arty_load', cat: 'arty', name: '장약 개량', icon: '🧪', x: 1, y: 3, max: 5, cost: 26,
      req: ['arty_basic'], desc: '폭발 피해가 증가한다.', eff: { dmgMul: 0.04 } },
    { id: 'arty_cluster', cat: 'arty', name: '확산탄', icon: '✳️', x: 2, y: 2, max: 4, cost: 70,
      req: ['arty_load'], desc: '폭발 범위가 넓어진다.', eff: { aoeMul: 0.09 } },
    { id: 'arty_he', cat: 'arty', name: '고폭탄', icon: '💣', x: 2, y: 3, max: 4, cost: 85,
      req: ['arty_load'], desc: '폭발 피해를 크게 올린다.', eff: { dmgMul: 0.07 } },
    { id: 'arty_howitzer', cat: 'arty', name: '자주포 도입', icon: '🚚', x: 2, y: 0, max: 1, cost: 160,
      req: ['arty_grenade'], desc: '155mm 자주포를 해금한다.', eff: { unlock: 'howitzer' } },
    { id: 'arty_chain', cat: 'arty', name: '연쇄 폭발', icon: '🔗', x: 3, y: 2, max: 2, cost: 180,
      req: ['arty_cluster'], desc: '폭발이 주변 적에게 연쇄 피해를 준다.', eff: { chain: 1 } },
    { id: 'arty_observer', cat: 'arty', name: '포격 관측병', icon: '🛰️', x: 3, y: 3, max: 4, cost: 80,
      req: ['arty_he'], desc: '모든 포탑의 사거리가 늘어난다.', eff: { rangeMul: 0.05 } },
    { id: 'arty_missile', cat: 'arty', name: '미사일 포대', icon: '🚀', x: 4, y: 1, max: 1, cost: 210,
      req: ['arty_howitzer'], desc: '4연장 유도 미사일 포대를 해금한다.', eff: { unlock: 'missile' } },
    { id: 'arty_napalm', cat: 'arty', name: '소이 포격', icon: '🔥', x: 4, y: 3, max: 3, cost: 150,
      req: ['arty_chain'], desc: '폭발 지점에 불이 남아 지속 피해를 준다.', eff: { burn: 16 } },
    { id: 'arty_heavy', cat: 'arty', name: '중포 위력', icon: '💥', x: 4, y: 2, max: 3, cost: 190,
      req: ['arty_chain'], desc: '폭발 피해와 범위를 함께 올린다.', eff: { dmgMul: 0.08, aoeMul: 0.05 } },
    { id: 'arty_barrage', cat: 'arty', name: '집중 포격', icon: '🎆', x: 5, y: 2, max: 3, cost: 240,
      req: ['arty_heavy', 'arty_missile'], desc: '포병 포탑이 연속 발사로 화력을 쏟아붓는다.', eff: { rateMul: 0.1, aoeMul: 0.04 } },

    /* ── 첨단·에너지 (12) ── */
    { id: 'en_basic', cat: 'energy', name: '첨단 병기 연구', icon: '🧬', x: 0, y: 2, max: 5, cost: 18,
      desc: '에너지 병기의 출력 효율을 높인다.', eff: { dmgMul: 0.04 } },
    { id: 'en_laser', cat: 'energy', name: '지향성 레이저', icon: '🔆', x: 1, y: 2, max: 1, cost: 150,
      req: ['en_basic'], desc: '지향성 레이저 포탑을 해금한다.', eff: { unlock: 'laser' } },
    { id: 'en_cryo', cat: 'energy', name: '냉동 분사', icon: '❄️', x: 1, y: 3, max: 1, cost: 120,
      req: ['en_basic'], desc: '냉동 분사기를 해금한다.', eff: { unlock: 'cryo' } },
    { id: 'en_emp', cat: 'energy', name: '전자기 펄스', icon: '🌀', x: 2, y: 0, max: 1, cost: 170,
      req: ['en_laser'], desc: 'EMP 포탑을 해금한다. 광역 감속·경직.', eff: { unlock: 'emp' } },
    { id: 'en_coolant', cat: 'energy', name: '냉각기', icon: '🧊', x: 1, y: 1, max: 4, cost: 55,
      req: ['en_basic'], desc: '발열을 잡아 전체 공격 속도를 올린다.', eff: { rateMul: 0.06 } },
    { id: 'en_cap', cat: 'energy', name: '커패시터', icon: '🔋', x: 2, y: 2, max: 4, cost: 75,
      req: ['en_coolant'], desc: '방전 용량을 키워 에너지 병기 피해가 오른다.', eff: { dmgMul: 0.06 } },
    { id: 'en_tesla', cat: 'energy', name: '테슬라 코일', icon: '🌩️', x: 3, y: 3, max: 1, cost: 220,
      req: ['en_cap'], desc: '연쇄 번개를 뿜는 테슬라 코일을 해금한다.', eff: { unlock: 'tesla' } },
    { id: 'en_focus', cat: 'energy', name: '집속 렌즈', icon: '🔎', x: 3, y: 2, max: 4, cost: 90,
      req: ['en_cap'], desc: '광선을 더 멀리 정확히 모은다.', eff: { rangeMul: 0.05 } },
    { id: 'en_rail', cat: 'energy', name: '전자기 레일건', icon: '⚡', x: 3, y: 1, max: 1, cost: 300,
      req: ['en_tesla'], desc: '관통형 레일건을 해금한다.', eff: { unlock: 'railgun' } },
    { id: 'en_ai', cat: 'energy', name: '전술 AI', icon: '🤖', x: 4, y: 0, max: 3, cost: 160,
      req: ['en_focus'], desc: '표적 우선순위를 학습해 치명타 확률이 오른다.', eff: { crit: 0.06 } },
    { id: 'en_overcharge', cat: 'energy', name: '과충전', icon: '⚡', x: 4, y: 2, max: 2, cost: 240,
      req: ['en_rail'], desc: '모든 포탑 피해를 크게 올린다.', eff: { dmgMul: 0.12 } },
    { id: 'en_singularity', cat: 'energy', name: '특이점 코어', icon: '🌌', x: 5, y: 2, max: 1, cost: 500,
      req: ['en_overcharge', 'en_ai'], desc: '최종 병기. 전 포탑 피해 +25%, 사거리 +8%.', eff: { dmgMul: 0.25, rangeMul: 0.08 } },

    /* ── 기지·성벽·경제 (14) ── */
    { id: 'base_wall', cat: 'base', name: '성벽 보강', icon: '🧱', x: 0, y: 1, max: 5, cost: 12,
      desc: '성벽 최대 내구도를 높인다.', eff: { wallHpMul: 0.1 } },
    { id: 'base_keep', cat: 'base', name: '기지 보강', icon: '🏯', x: 0, y: 3, max: 5, cost: 12,
      desc: '마을 중심부(시청) 내구도를 높인다.', eff: { keepHpMul: 0.1 } },
    { id: 'base_tax', cat: 'base', name: '세금 개혁', icon: '🪙', x: 1, y: 1, max: 5, cost: 22,
      req: ['base_wall'], desc: '적 처치·웨이브 보상 골드가 늘어난다.', eff: { goldMul: 0.06 } },
    { id: 'base_repair', cat: 'base', name: '자동 수리', icon: '🔧', x: 1, y: 2, max: 3, cost: 45,
      req: ['base_wall'], desc: '웨이브 사이 성벽·기지가 더 많이 회복된다.', eff: { repair: 0.05 } },
    { id: 'base_slots', cat: 'base', name: '방어 슬롯 확장', icon: '🛠️', x: 1, y: 3, max: 3, cost: 70,
      req: ['base_keep'], desc: '방어 슬롯을 1칸 더 연다.', eff: { slots: 1 } },
    { id: 'base_house', cat: 'base', name: '민가 증축', icon: '🏘️', x: 2, y: 1, max: 3, cost: 55,
      req: ['base_tax'], desc: '주민이 늘어 시작 자금과 골드 수입이 증가한다.', eff: { goldMul: 0.05, startGold: 60 } },
    { id: 'base_discount', cat: 'base', name: '건설 할인', icon: '📉', x: 2, y: 2, max: 5, cost: 40,
      req: ['base_repair'], desc: '포탑 건설·업그레이드 비용이 줄어든다.', eff: { buildCostMul: -0.04 } },
    { id: 'base_forge', cat: 'base', name: '대장간', icon: '⚒️', x: 2, y: 3, max: 4, cost: 60,
      req: ['base_slots'], desc: '모든 포탑 피해가 증가한다.', eff: { dmgMul: 0.05 } },
    { id: 'base_rp', cat: 'base', name: '연구 효율', icon: '📘', x: 3, y: 1, max: 4, cost: 75,
      req: ['base_house'], desc: '얻는 연구 포인트가 증가한다.', eff: { rpMul: 0.09 } },
    { id: 'base_smith', cat: 'base', name: '야금술', icon: '🔨', x: 3, y: 3, max: 3, cost: 90,
      req: ['base_forge'], desc: '관통력과 피해를 함께 올린다.', eff: { armorPen: 2, dmgMul: 0.03 } },
    { id: 'base_fortify', cat: 'base', name: '철벽', icon: '🛡️', x: 4, y: 1, max: 2, cost: 180,
      req: ['base_rp'], desc: '성벽 내구도와 자동 수리를 크게 올린다.', eff: { wallHpMul: 0.15, repair: 0.03 } },
    { id: 'base_prestige', cat: 'base', name: '회귀 공명', icon: '🔮', x: 4, y: 2, max: 4, cost: 160,
      req: ['base_rp'], desc: '재회귀 시 받는 회귀석이 증가한다.', eff: { shardMul: 0.1 } },
    { id: 'base_tower', cat: 'base', name: '포탑 증설', icon: '🗼', x: 4, y: 3, max: 2, cost: 200,
      req: ['base_smith'], desc: '방어 슬롯을 1칸 더 연다.', eff: { slots: 1 } },
    { id: 'base_industry', cat: 'base', name: '군수 산업', icon: '🏭', x: 5, y: 2, max: 2, cost: 320,
      req: ['base_prestige'], desc: '골드·연구 획득이 모두 크게 증가한다.', eff: { goldMul: 0.1, rpMul: 0.1 } },
  ];

  /* ───────────────────────── 재회귀 영구 강화 ───────────────────────── */
  const PRESTIGE = [
    { id: 'p_gold', cat: 'economy', name: '전시 비축금', icon: '🪙', max: 10, cost: 3,
      desc: '시작 골드 +200.', eff: { startGold: 200 } },
    { id: 'p_rp', cat: 'economy', name: '회귀 지식', icon: '📘', max: 8, cost: 4,
      desc: '시작 연구 포인트 +30.', eff: { startRP: 30 } },
    { id: 'p_goldmul', cat: 'economy', name: '전시 경제', icon: '💰', max: 10, cost: 5,
      desc: '골드 획득 +8%.', eff: { goldMul: 0.08 } },
    { id: 'p_rpmul', cat: 'economy', name: '연구 본능', icon: '🧠', max: 8, cost: 6,
      desc: '연구 포인트 획득 +10%.', eff: { rpMul: 0.1 } },
    { id: 'p_cost', cat: 'economy', name: '군수 계약', icon: '📉', max: 6, cost: 8,
      desc: '건설·업그레이드 비용 -5%.', eff: { buildCostMul: -0.05 } },
    { id: 'p_shard', cat: 'economy', name: '회귀 결정', icon: '💎', max: 10, cost: 6,
      desc: '재회귀 회귀석 획득 +8%.', eff: { shardMul: 0.08 } },
    { id: 'p_dmg', cat: 'power', name: '영구 화력', icon: '💥', max: 12, cost: 4,
      desc: '모든 포탑 피해 +8%.', eff: { dmgMul: 0.08 } },
    { id: 'p_rate', cat: 'power', name: '영구 공속', icon: '⚡', max: 10, cost: 5,
      desc: '모든 포탑 공격 속도 +5%.', eff: { rateMul: 0.05 } },
    { id: 'p_range', cat: 'power', name: '영구 사거리', icon: '🎯', max: 8, cost: 6,
      desc: '모든 포탑 사거리 +4%.', eff: { rangeMul: 0.04 } },
    { id: 'p_crit', cat: 'power', name: '영구 치명타', icon: '🎲', max: 6, cost: 7,
      desc: '치명타 확률 +4%.', eff: { crit: 0.04 } },
    { id: 'p_pen', cat: 'power', name: '영구 관통', icon: '🔩', max: 6, cost: 6,
      desc: '방어구 관통 +3.', eff: { armorPen: 3 } },
    { id: 'p_aoe', cat: 'power', name: '영구 폭발', icon: '✳️', max: 6, cost: 7,
      desc: '폭발 범위 +6%.', eff: { aoeMul: 0.06 } },
    { id: 'p_keep', cat: 'fort', name: '영구 기지', icon: '🏯', max: 10, cost: 4,
      desc: '기지 내구도 +12%.', eff: { keepHpMul: 0.12 } },
    { id: 'p_wall', cat: 'fort', name: '영구 성벽', icon: '🧱', max: 10, cost: 4,
      desc: '성벽 내구도 +15%.', eff: { wallHpMul: 0.15 } },
    { id: 'p_repair', cat: 'fort', name: '영구 수리', icon: '🔧', max: 6, cost: 5,
      desc: '웨이브 사이 자동 수리 +6%.', eff: { repair: 0.06 } },
    { id: 'p_slot', cat: 'fort', name: '영구 슬롯', icon: '🛠️', max: 4, cost: 9,
      desc: '시작 방어 슬롯 +1칸.', eff: { slots: 1 } },
    { id: 'p_tower', cat: 'fort', name: '배치된 포탑', icon: '🔫', max: 4, cost: 10,
      desc: '시작 시 개틀링 1기를 무료 배치.', eff: { freeTower: 1 } },
    { id: 'p_keepresearch', cat: 'fort', name: '회귀 기억', icon: '🧬', max: 3, cost: 14,
      desc: '재회귀 후 일반 연구 레벨을 20% 유지.', eff: { keepResearch: 0.2 } },
  ];

  const PRESTIGE_CATS = [
    { id: 'economy', name: '경제', icon: '🪙' },
    { id: 'power', name: '화력', icon: '💥' },
    { id: 'fort', name: '기지', icon: '🏰' },
  ];

  /* ───────────────────────── 고대 유물 ───────────────────────── */
  const RARITIES = {
    common: { id: 'common', name: '일반', color: '#9fb3c8', glow: 'rgba(160,180,200,.55)', mult: 1 },
    rare: { id: 'rare', name: '희귀', color: '#63b8ff', glow: 'rgba(80,170,255,.6)', mult: 2 },
    epic: { id: 'epic', name: '영웅', color: '#c58cff', glow: 'rgba(180,110,255,.65)', mult: 3 },
    legendary: { id: 'legendary', name: '전설', color: '#ffc14d', glow: 'rgba(255,190,70,.7)', mult: 5 },
  };

  const RELICS = [
    { id: 'r_tincan', name: '낡은 탄피', icon: '🪙', rarity: 'common', desc: '골드 획득 +6%', eff: { goldMul: 0.06 } },
    { id: 'r_scope', name: '녹슨 조준경', icon: '🔭', rarity: 'common', desc: '포탑 사거리 +3%', eff: { rangeMul: 0.03 } },
    { id: 'r_knuckle', name: '철제 너클', icon: '🥊', rarity: 'common', desc: '포탑 피해 +4%', eff: { dmgMul: 0.04 } },
    { id: 'r_charm', name: '사냥꾼의 부적', icon: '🧿', rarity: 'common', desc: '치명타 확률 +2%', eff: { crit: 0.02 } },
    { id: 'r_powder', name: '화약 주머니', icon: '🧨', rarity: 'common', desc: '폭발 범위 +4%', eff: { aoeMul: 0.04 } },
    { id: 'r_nail', name: '수리공의 못', icon: '🔩', rarity: 'common', desc: '자동 수리 +4%', eff: { repair: 0.04 } },
    { id: 'r_coin', name: '상인의 동전', icon: '💰', rarity: 'common', desc: '골드 +5%, 시작 골드 +100', eff: { goldMul: 0.05, startGold: 100 } },
    { id: 'r_shard', name: '성벽의 파편', icon: '🧱', rarity: 'common', desc: '성벽 내구도 +8%', eff: { wallHpMul: 0.08 } },
    { id: 'r_scorch', name: '화상 흔적', icon: '🔥', rarity: 'common', desc: '화상 피해 +5', eff: { burn: 5 } },

    { id: 'r_silver', name: '은빛 탄환', icon: '🔫', rarity: 'rare', desc: '피해 +6%, 관통 +2', eff: { dmgMul: 0.06, armorPen: 2 } },
    { id: 'r_horseshoe', name: '기병의 편자', icon: '🐎', rarity: 'rare', desc: '공격 속도 +4%', eff: { rateMul: 0.04 } },
    { id: 'r_map', name: '정찰병의 지도', icon: '🗺️', rarity: 'rare', desc: '사거리 +5%', eff: { rangeMul: 0.05 } },
    { id: 'r_alchemy', name: '연금술 병', icon: '⚗️', rarity: 'rare', desc: '화상 피해 +10', eff: { burn: 10 } },
    { id: 'r_frost', name: '서리 결정', icon: '❄️', rarity: 'rare', desc: '명중 시 10% 확률로 감속', eff: { slowHit: 0.1 } },
    { id: 'r_hammer', name: '대장장이의 망치', icon: '⚒️', rarity: 'rare', desc: '피해 +5%, 골드 +4%', eff: { dmgMul: 0.05, goldMul: 0.04 } },
    { id: 'r_key', name: '왕실 금고 열쇠', icon: '🗝️', rarity: 'rare', desc: '골드 획득 +10%', eff: { goldMul: 0.1 } },
    { id: 'r_aegis', name: '수호자의 방패', icon: '🛡️', rarity: 'rare', desc: '기지 +10%, 성벽 +8%', eff: { keepHpMul: 0.1, wallHpMul: 0.08 } },

    { id: 'r_dragon', name: '용의 비늘', icon: '🐲', rarity: 'epic', desc: '기지 내구도 +15%, 피해 +5%', eff: { keepHpMul: 0.15, dmgMul: 0.05 } },
    { id: 'r_storm', name: '폭풍의 심장', icon: '🌩️', rarity: 'epic', desc: '공속 +8%, 치명타 +3%', eff: { rateMul: 0.08, crit: 0.03 } },
    { id: 'r_fang', name: '관통하는 송곳니', icon: '🦷', rarity: 'epic', desc: '관통 +5, 피해 +5%', eff: { armorPen: 5, dmgMul: 0.05 } },
    { id: 'r_eternal', name: '불멸의 성벽', icon: '🏯', rarity: 'epic', desc: '성벽 +20%, 수리 +5%', eff: { wallHpMul: 0.2, repair: 0.05 } },
    { id: 'r_sand', name: '시간의 모래', icon: '⏳', rarity: 'epic', desc: '시작 골드 +400, 연구 +5%', eff: { startGold: 400, rpMul: 0.05 } },

    { id: 'r_crown', name: '회귀자의 왕관', icon: '👑', rarity: 'legendary', desc: '모든 피해 +12%, 회귀석 +10%', eff: { dmgMul: 0.12, shardMul: 0.1 } },
    { id: 'r_core', name: '심연의 핵', icon: '🔮', rarity: 'legendary', desc: '피해 +10%, 폭발 +10%, 치명타 +5%', eff: { dmgMul: 0.1, aoeMul: 0.1, crit: 0.05 } },
    { id: 'r_mag', name: '무한 탄창', icon: '♾️', rarity: 'legendary', desc: '공속 +12%, 연발 확률 +20%', eff: { rateMul: 0.12, doubleShot: 0.2 } },
    { id: 'r_grail', name: '황금 성배', icon: '🍷', rarity: 'legendary', desc: '골드 +20%, 시작 골드 +600', eff: { goldMul: 0.2, startGold: 600 } },
  ];
  const RELIC_BY_ID = {}; RELICS.forEach(r => RELIC_BY_ID[r.id] = r);

  /* ───────────────────────── 스테이지 ───────────────────────── */
  const WAVES_PER_STAGE = 8;
  const STAGE_UNLOCK = {
    1: ['peasant', 'spearman', 'shield'],
    2: ['peasant', 'spearman', 'shield', 'archer', 'cavalry'],
    3: ['peasant', 'spearman', 'shield', 'archer', 'cavalry', 'ram', 'berserker'],
    4: ['peasant', 'spearman', 'shield', 'archer', 'cavalry', 'ram', 'berserker', 'catapult', 'knight'],
    5: ['peasant', 'spearman', 'shield', 'archer', 'cavalry', 'ram', 'berserker', 'catapult', 'knight', 'siege', 'lord'],
  };
  for (let s = 6; s <= 40; s++) STAGE_UNLOCK[s] = STAGE_UNLOCK[5];

  const STAGE_NAMES = [
    '', '변경의 들판', '잿빛 협곡', '몰락한 성채', '기사단의 진군', '군주의 심장부',
    '피의 황야', '망각의 폐허', '강철의 장막', '종말의 성문', '영원의 전장',
  ];
  function stageName(s) { return STAGE_NAMES[s] || ('심연 ' + (s - 10)); }

  /* ───────────────────────── 웨이브 편성 ───────────────────────── */
  const DIRS = [
    { id: 'N', name: '북쪽', icon: '▲', angle: -90 },
    { id: 'E', name: '동쪽', icon: '▶', angle: 0 },
    { id: 'S', name: '남쪽', icon: '▼', angle: 90 },
    { id: 'W', name: '서쪽', icon: '◀', angle: 180 },
  ];

  /* 웨이브 총 물량: 완만한 지수 상승 */
  function waveTotal(globalWave) {
    return Math.min(3200, Math.round(46 * Math.pow(1.11, globalWave - 1) + 14 * globalWave));
  }

  /* 스테이지·웨이브 편성 (상위 스테이지에서 새 적종이 순차 등장) */
  function waveComp(stage, wi) {
    const g = (stage - 1) * WAVES_PER_STAGE + wi;
    const total = waveTotal(g);
    const unlocked = STAGE_UNLOCK[Math.min(stage, 40)] || STAGE_UNLOCK[5];
    const weights = {};
    for (const k of unlocked) {
      if (k === 'lord') { weights[k] = wi === WAVES_PER_STAGE ? 1 : 0; continue; }
      const base = { peasant: 10, spearman: 7, shield: 5.5, archer: 4, cavalry: 3.4, ram: 0.55, berserker: 3, catapult: 0.55, knight: 1.3, siege: 0.35 }[k] || 1;
      // 스테이지가 오를수록 상위 병종 비중이 서서히 증가
      const bias = (k === 'peasant') ? 1 : 1 + (stage - 1) * 0.12;
      weights[k] = base * bias * (wi >= 6 ? 1.25 : 1);
    }
    let sum = 0; for (const k in weights) sum += weights[k];
    const out = [];
    for (const k in weights) {
      if (!weights[k]) continue;
      let n;
      if (k === 'lord') n = 1 + Math.floor(stage / 6);
      else n = Math.round(total * weights[k] / sum);
      if (n > 0) out.push({ type: k, count: n });
    }
    return out;
  }

  /* 웨이브 적 능력치 배율 — 급격하지 않은 미세 상승 */
  function stageScale(stage, wi) {
    const g = (stage - 1) * WAVES_PER_STAGE + wi;
    return {
      hp: Math.pow(1.055, g - 1) * (1 + 0.05 * (stage - 1)),
      dmg: Math.pow(1.03, g - 1) * (1 + 0.03 * (stage - 1)),
      speed: 1 + 0.008 * (stage - 1),
      armor: Math.floor((stage - 1) * 0.6),
      bounty: Math.pow(1.035, g - 1),
    };
  }

  /* 웨이브마다 오는 방향(1~4개) */
  function waveDirs(stage, wi) {
    const g = (stage - 1) * WAVES_PER_STAGE + wi;
    const count = g <= 2 ? 1 : g <= 4 ? 2 : stage <= 2 ? 2 : stage <= 4 ? 3 : 4;
    const pool = ['N', 'E', 'S', 'W'];
    let s = (g * 2654435761) % 2147483647;
    const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    const shuffled = pool.slice().sort(() => rnd() - 0.5);
    return shuffled.slice(0, count);
  }

  const UPGRADE_STEP = 0.24;      // 포탑 레벨당 피해 +24%
  const TOWER_MAX_LEVEL = 10;

  return {
    TILE_W, TILE_H, MAP, CX, CY, VILLAGE, WALL, DIRS,
    TOWERS, ENEMIES, TECHS, PRESTIGE, PRESTIGE_CATS, CATS,
    RELICS, RELIC_BY_ID, RARITIES, STAGE_UNLOCK, STAGE_NAMES, stageName,
    WAVES_PER_STAGE, waveTotal, waveComp, stageScale, waveDirs,
    UPGRADE_STEP, TOWER_MAX_LEVEL,
  };
})();
