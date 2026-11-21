/* ─────────────────────────────────────────────
   data.js — 밸런스·무기·적·웨이브·연구 데이터
   ───────────────────────────────────────────── */
'use strict';

const FIELD = {
  WALL: 0.878,          // 성벽 y (H 대비)
  HERO_OFF: 26,          // 성벽 아래 영웅 위치
  BUILD_MIN: 0.26,       // 바리케이드 설치 가능 y 최소
  BUILD_MAX: 0.83,
  PAD_ROWS: [0.50, 0.735], // 포탑 패드 y
  PAD_COLS_WIDE: 4,
  PAD_COLS_NARROW: 3,
};

/* ── 무기 ───────────────────────────────────── */
const WEAPONS = [
  { id:'pistol',  short:'권총',  name:'M1911 9mm 권총',      cost:0,  kind:'bullet',
    dmg:30,  rpm:280,  mag:12,  reload:1.05, spread:1.6, pellets:1, pierce:0, speed:2200, range:900,
    color:'#ffd166', sfx:'pistol', crit:0.10,
    desc:'기본 지급 화기. 단발 화력은 준수하지만 연사력이 아쉽다.' },
  { id:'rifle',   short:'소총',  name:'M4A1 돌격소총',        cost:3,  kind:'bullet',
    dmg:20,  rpm:660,  mag:30,  reload:1.7,  spread:3.0, pellets:1, pierce:0, speed:2500, range:1000,
    color:'#ffe08a', sfx:'rifle', crit:0.08,
    desc:'균형 잡힌 주력 소총. 빠른 연사로 물량을 갈아낸다.' },
  { id:'shotgun', short:'샷건',  name:'컴뱃 샷건',            cost:4,  kind:'bullet',
    dmg:15,  rpm:95,   mag:8,   reload:2.2,  spread:13, pellets:8, pierce:1, speed:1700, range:520,
    color:'#ffb35c', sfx:'shotgun', crit:0.05,
    desc:'한 발에 8개 산탄. 붙어 있는 적 덩어리를 통째로 지운다.' },
  { id:'minigun', short:'미니건', name:'M134 미니건',          cost:6,  kind:'bullet',
    dmg:12,  rpm:1500, mag:150, reload:4.0,  spread:7.5, pellets:1, pierce:0, speed:2700, range:920,
    color:'#fff2a8', sfx:'minigun', crit:0.03,
    desc:'압도적인 연사력. 탄 퍼짐이 크지만 화력 밀도는 최강.' },
  { id:'sniper',  short:'저격',  name:'대구경 저격총',         cost:7,  kind:'bullet',
    dmg:280, rpm:52,   mag:5,   reload:2.6,  spread:0.35, pellets:1, pierce:3, speed:4200, range:1500,
    color:'#bfe9ff', sfx:'sniper', crit:0.35,
    desc:'관통 3. 중갑 기사도 한 발에 꿰뚫는다. 재장전이 느리다.' },
  { id:'flame',   short:'화염',  name:'화염방사기',           cost:8,  kind:'flame',
    dmg:11,  rpm:600,  mag:100, reload:2.8,  spread:8,  pellets:1, pierce:0, speed:0,    range:235,
    color:'#ff8a3d', sfx:'flame', crit:0,
    desc:'근거리 부채꼴 화염. 방어구를 무시하고 불태운다.' },
  { id:'grenade', short:'유탄',  name:'유탄발사기',           cost:9,  kind:'grenade',
    dmg:115, rpm:78,   mag:6,   reload:2.4,  spread:1.2, pellets:1, pierce:0, speed:780, range:900,
    color:'#ffc65e', sfx:'thump', crit:0.05, splash:74,
    desc:'곡사 유탄. 착탄 지점에 광역 폭발을 일으킨다.' },
  { id:'rail',    short:'레일',  name:'레일건',               cost:12, kind:'rail',
    dmg:430, rpm:38,   mag:4,   reload:3.0,  spread:0.1, pellets:1, pierce:99, speed:0, range:1400,
    color:'#8ce8ff', sfx:'rail', crit:0.2,
    desc:'충전 후 초고속 철심을 발사. 일직선의 적을 전부 관통한다.' },
  { id:'missile', short:'미사일', name:'전술 미사일 런처',      cost:14, kind:'missile',
    dmg:250, rpm:42,   mag:3,   reload:3.4,  spread:0,  pellets:1, pierce:0, speed:620, range:1200,
    color:'#ffb0a0', sfx:'missile', crit:0.05, splash:95,
    desc:'유도 미사일. 명중 지점에 큰 폭발을 남긴다.' },
];
const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

/* ── 적 ───────────────────────────────────── */
const ENEMIES = {
  peasant: { id:'peasant', name:'농노', en:'농노', hp:58,  speed:44, dmg:4,  interval:1.2, armor:0,
    gold:2,  scrap:1, r:11, color:'#8a6a46', kind:'melee', ico:'🔱' },
  spearman:{ id:'spearman', name:'창병', hp:115, speed:40, dmg:7,  interval:1.2, armor:1,
    gold:3,  scrap:1, r:12, color:'#6f7f56', kind:'melee', ico:'🗡️' },
  shield:  { id:'shield', name:'방패병', hp:245, speed:31, dmg:6,  interval:1.3, armor:6,
    gold:4,  scrap:2, r:13, color:'#5e7185', kind:'melee', ico:'🛡️' },
  archer:  { id:'archer', name:'궁병', hp:78,  speed:37, dmg:6,  interval:2.5, armor:0,
    gold:4,  scrap:1, r:11, color:'#7a5a74', kind:'archer', range:235, ico:'🏹' },
  cavalry: { id:'cavalry', name:'기병', hp:175, speed:92, dmg:16, interval:1.0, armor:2,
    gold:6,  scrap:2, r:16, color:'#7a4636', kind:'melee', ico:'🐎' },
  knight:  { id:'knight', name:'중갑 기사', hp:540, speed:28, dmg:18, interval:1.3, armor:10,
    gold:12, scrap:4, r:16, color:'#9aa7b5', kind:'melee', ico:'⚔️' },
  ram:     { id:'ram', name:'공성추', hp:920, speed:20, dmg:60, interval:2.4, armor:4,
    gold:18, scrap:7, r:23, color:'#6b4a2a', kind:'melee', siege:true, ico:'🪵' },
  siege:   { id:'siege', name:'공성탑', hp:1550, speed:15, dmg:75, interval:2.8, armor:6,
    gold:26, scrap:9, r:26, color:'#5a4a3a', kind:'melee', siege:true, ico:'🏯' },
  lord:    { id:'lord', name:'악덕 군주', hp:5400, speed:18, dmg:130, interval:1.8, armor:14,
    gold:200, scrap:50, r:31, color:'#b02a3a', kind:'boss', boss:true, ico:'👑' },
};

/* ── 포탑 ─────────────────────────────────── */
const TURRETS = {
  sentry: { id:'sentry', name:'센트리 건', cost:110, dmg:17, interval:0.19, range:310, hp:260,
    kind:'bullet', color:'#ffd479', desc:'빠른 연사 단일 표적. 어디에나 무난하다.' },
  flame:  { id:'flame',  name:'화염 포탑', cost:190, dmg:9, interval:0.10, range:158, hp:300,
    kind:'flame', color:'#ff8a3d', desc:'근거리 부채꼴 화염. 밀집한 물량에 강하다.' },
  mortar: { id:'mortar', name:'박격포 포대', cost:270, dmg:95, interval:2.3, range:500, hp:280,
    kind:'mortar', splash:78, color:'#ffc65e', desc:'느리지만 광역 폭발. 후방에서 뭉친 적을 지운다.' },
  rail:   { id:'rail',   name:'레일 포탑', cost:320, dmg:150, interval:1.6, range:540, hp:320,
    kind:'rail', color:'#8ce8ff', research:'turret_rail', desc:'관통 3의 전자기 포. 일직선을 정리한다.' },
};
const TURRET_ORDER = ['sentry','flame','mortar','rail'];

/* ── 전술 스킬 ────────────────────────────── */
const SKILLS = {
  grenade:  { id:'grenade',  name:'수류탄',    cd:9,  dmg:160, radius:84,  delay:0,   ico:'💣', desc:'조준 지점에 수류탄을 투척. 광역 피해.' },
  airstrike:{ id:'airstrike',name:'집속 포격',  cd:28, dmg:170, radius:100, delay:0.55, ico:'🚀', desc:'지점에 4발의 집속 포격. 연쇄 폭발.' },
};

/* ── 웨이브 ───────────────────────────────── */
const WAVES = [
  { name:'국경의 발소리', groups:[['peasant',12]] },
  { name:'창병 소대', groups:[['peasant',16],['spearman',5]] },
  { name:'방패벽', groups:[['peasant',12],['spearman',10],['shield',6]] },
  { name:'궁병의 비', groups:[['peasant',14],['spearman',8],['archer',9]] },
  { name:'기병 돌격', groups:[['peasant',10],['spearman',12],['cavalry',8]] },
  { name:'공성추의 굉음', groups:[['peasant',20],['shield',8],['ram',2]] },
  { name:'강철 전위', groups:[['spearman',14],['shield',8],['archer',8],['knight',3]] },
  { name:'대군의 물결', groups:[['peasant',34],['spearman',16],['archer',10],['cavalry',6]] },
  { name:'공성 부대', groups:[['shield',14],['ram',3],['siege',1],['knight',4]] },
  { name:'군주의 정예', groups:[['peasant',20],['knight',6],['cavalry',12],['archer',14]] },
  { name:'살아있는 성벽', groups:[['peasant',46],['spearman',22],['shield',14]] },
  { name:'공성탑 행렬', groups:[['archer',18],['cavalry',10],['ram',4],['siege',2],['knight',6]] },
  { name:'혼성 대군', groups:[['peasant',40],['spearman',24],['shield',18],['knight',8],['archer',14]] },
  { name:'왕의 친위대', groups:[['knight',12],['cavalry',18],['archer',20],['siege',3],['ram',4]] },
  { name:'최후의 심판', groups:[['lord',1],['knight',10],['peasant',50],['archer',20],['cavalry',10]] },
];
const MAX_WAVE = WAVES.length;

/* ── 난이도 ───────────────────────────────── */
const DIFFICULTIES = [
  { id:'normal', name:'보통', en:'NORMAL', hp:1.0, count:1.0, gold:1.0, rp:1.0, color:'#7ddc8a',
    desc:'처음이라면 여기서. 현대 화력의 손맛을 익히기 좋다.',
    mods:['적 체력 ×1.0','물량 ×1.0','설계도 ×1.0'] },
  { id:'hard', name:'어려움', en:'HARD', hp:1.45, count:1.22, gold:1.15, rp:1.4, color:'#ffb02e',
    desc:'방어선 구축이 늦으면 순식간에 밀린다. 포탑 위치가 승부처.',
    mods:['적 체력 ×1.45','물량 ×1.22','설계도 ×1.4'] },
  { id:'hell', name:'지옥', en:'HELL', hp:2.05, count:1.42, gold:1.3, rp:1.8, color:'#ff5d5d',
    desc:'군주의 진심. 완전 무장한 영구 연구 없이는 버티기 어렵다.',
    mods:['적 체력 ×2.05','물량 ×1.42','설계도 ×1.8'] },
];
const DIFF_BY_ID = Object.fromEntries(DIFFICULTIES.map(d => [d.id, d]));

/* ── 영구 연구 ────────────────────────────── */
const PERKS = [
  { id:'turretDmg', name:'포탑 화력 증폭', max:5, baseCost:2, costStep:2, ico:'🎯',
    effect:'모든 포탑 피해 +12%', fmt:(l)=>`+${l*12}%` },
  { id:'wallHp',    name:'마을 성벽 보강', max:5, baseCost:2, costStep:2, ico:'🏰',
    effect:'마을 최대 체력 +450', fmt:(l)=>`+${l*450}` },
  { id:'startGold', name:'비상 자금',      max:5, baseCost:2, costStep:2, ico:'🪙',
    effect:'전투 시작 골드 +80', fmt:(l)=>`+${l*80}` },
  { id:'goldGain',  name:'전리품 수집',    max:4, baseCost:3, costStep:2, ico:'💰',
    effect:'골드 획득 +12%', fmt:(l)=>`+${l*12}%` },
  { id:'scrapGain', name:'고철 회수 기술', max:4, baseCost:3, costStep:2, ico:'⚙️',
    effect:'고철 획득 +15%', fmt:(l)=>`+${l*15}%` },
  { id:'skillCd',   name:'전술 지원 단축', max:4, baseCost:3, costStep:2, ico:'⏱️',
    effect:'스킬 재사용 대기 -10%', fmt:(l)=>`-${l*10}%` },
];
const PERK_BY_ID = Object.fromEntries(PERKS.map(p => [p.id, p]));

/* ── 인런 무기 강화 ───────────────────────── */
const WUPG = {
  dmg:    { id:'dmg', name:'공격력', icon:'💥', max:8, cost:(l)=>30 + l*22, effect:'피해 +13%' },
  rate:   { id:'rate', name:'연사력', icon:'⚡', max:8, cost:(l)=>34 + l*24, effect:'연사 +7%' },
  pierce: { id:'pierce', name:'관통력', icon:'➡️', max:6, cost:(l)=>60 + l*45, effect:'2레벨마다 관통 +1' },
  reload: { id:'reload', name:'재장전', icon:'🔄', max:6, cost:(l)=>25 + l*18, effect:'재장전 -6%' },
};

/* ── 포탑 업그레이드 ─────────────────────── */
const TURRET_MAX_LV = 5;
const turretUpgradeCost = (lv) => 80 + lv * 70;   // lv1→2 비용
const turretSellRate = 0.5;

/* ── 유틸 ─────────────────────────────────── */
const clamp = (v,a,b) => v < a ? a : (v > b ? b : v);
const lerp = (a,b,t) => a + (b-a)*t;
const rand = (a,b) => a + Math.random()*(b-a);
const randInt = (a,b) => Math.floor(rand(a,b+1));
const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];
const dist2 = (ax,ay,bx,by) => { const dx=ax-bx, dy=ay-by; return dx*dx+dy*dy; };

function waveCount(typeId, waveIndex, diff) {
  const w = WAVES[waveIndex];
  if (!w) return 0;
  let n = 0;
  for (const g of w.groups) if (g[0] === typeId) n += g[1];
  return Math.round(n * diff.count);
}
function waveComposition(waveIndex, diff) {
  const w = WAVES[waveIndex];
  if (!w) return [];
  return w.groups.map(g => ({ id:g[0], n: Math.max(1, Math.round(g[1]*diff.count)) }));
}
