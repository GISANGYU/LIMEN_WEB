/* LIMEN 방명록 프로토타입
 * 방명록 글 하나 = 캐릭터 하나. 글 id 를 시드로 써서 같은 글은 언제나 같은 캐릭터가 된다.
 * A: Ninja Adventure (CC0) 84종 중 하나를 고른다.
 * B: LPC 부품(몸·머리·헤어·상의·하의·신발)을 겹치고 팔레트로 색을 바꿔 조합한다.
 */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const field = $('#field'), cv = $('#cv'), ctx = cv.getContext('2d'), bubLayer = $('#bubbles');

/* ---------- 시드 난수 ---------- */
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return h >>> 0;
}
function rng(seedStr) {
  let a = hash32(String(seedStr));
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- 이미지 ---------- */
const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res, rej) => {
      const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src;
    }));
  }
  return imgCache.get(src);
}

/* ---------- A: Ninja Adventure ---------- */
const NINJA_NAMES = ['Boy','CamouflageGreen','CamouflageRed','CaveLion2','CaveLion','Cavegirl2','Cavegirl','Caveman2','Caveman','DemonGreen','DemonRed','EggBoy','EggGirl','Eskimo','FighterRed','FighterWhite','Flam','GladiatorBlue','GoldStatue','GreenPig','Hunter','Inspector','KnightGold','Knight','LionBoy','LionOrange','LionYellow','Lion','ManGreen','MaskFrog','MaskGoldRacoon','MaskRacoon','Master','Monk2','Monk','MonkeyBoxerBlue','MonkeyBoxerRed','Monkey','NinjaBlue2','NinjaBlue','NinjaBomb','NinjaDark','NinjaEskimo','NinjaGray','NinjaGreen','NinjaMageBlack','NinjaMageOrange','NinjaMasked','NinjaRed2','NinjaRed','NinjaYellow','Noble','OldMan2','OldMan3','OldMan','Pig','Princess','RedGladiator','RedNinja3','RobotCamouflage','RobotGreen','RobotGrey','SamuraiBlue','SamuraiRed','Samurai','ShamanLion','Shaman','SkeletonDemon','Skeleton','SorcererBlack','SorcererOrange','Spirit','Statue','Sultan2','Sultan','Tengu2','Tengu','Vampire','Villager2','Villager3','Villager4','Villager5','Villager','Woman'];

const NINJA = {
  key: 'ninja',
  frame: 16, footY: 16, topY: 1, walkFrames: 4, fps: 9, speed: 46, poolW: 22, hitW: 9,
  scale: () => (W >= 900 ? 4 : 3),
  comboText: () => `A · 캐릭터 ${NINJA_NAMES.length}종 중 하나`,
  async make(seed) {
    const r = rng('ninja:' + seed);
    const name = pick(r, NINJA_NAMES);
    const sheet = await loadImg(`assets/ninja/${name}_walk.png`);
    return { sheet, label: name };
  },
  // 열 = 방향(아래·위·왼·오), 행 = 프레임
  src(ch) {
    const col = { down: 0, up: 1, left: 2, right: 3 }[ch.dir];
    const f = ch.moving ? Math.floor(ch.anim * this.fps) % this.walkFrames : 0;
    return [col * 16, f * 16];
  },
  face(ch, c2) {
    // 정면 첫 프레임을 얼굴 썸네일로
    c2.drawImage(ch.look.sheet, 0, 0, 16, 16, 0, 0, c2.canvas.width, c2.canvas.height);
  },
};

/* ---------- B: LPC 조합 ---------- */
const LPC_HAIR = ['afro','bangs','bedhead','bob','buzzcut','cowlick','curly_short','curtains','idol','long','long_straight','messy1','mop','parted','pigtails','pixie','spiked','swoop'];
const LPC_TORSO = ['shortsleeve_tshirt', 'longsleeve_longsleeve', 'sleeveless_sleeveless2'];
const LPC_LEGS = ['pants', 'shorts_shorts', 'skirts_plain'];
const SKIN_COMMON = ['light','amber','olive','taupe','bronze','brown','black'];
const SKIN_RARE = ['blue','lavender','pale_green','green'];
const SHOE_COLORS = ['brown','leather','walnut','black','charcoal','white','gray','navy','red'];
const BASE = { body: 'light', hair: 'orange', cloth: 'white', eye: 'blue' };
let PAL = null; // { body:{}, hair:{}, cloth:{}, eye:{} }

async function loadPalettes() {
  if (PAL) return PAL;
  const names = { body: 'body_ulpc', hair: 'hair_ulpc', cloth: 'cloth_ulpc', eye: 'eye_ulpc' };
  const out = {};
  await Promise.all(Object.entries(names).map(async ([k, f]) => {
    out[k] = await (await fetch(`assets/lpc/pal/${f}.json`)).json();
  }));
  PAL = out; return PAL;
}
const hexInt = (h) => parseInt(h.replace('#', ''), 16);

// 기본 팔레트 색 → 목표 팔레트 색 표
function mapFor(group, key) {
  const from = PAL[group][BASE[group]], to = PAL[group][key];
  const m = new Map();
  from.forEach((c, i) => { const t = hexInt(to[i]); m.set(hexInt(c), [t >> 16 & 255, t >> 8 & 255, t & 255]); });
  return m;
}

const srcData = new Map();
async function getData(file) {
  if (!srcData.has(file)) {
    srcData.set(file, loadImg(`assets/lpc/${file}.png`).then((im) => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      return x.getImageData(0, 0, c.width, c.height);
    }));
  }
  return srcData.get(file);
}
function recolor(data, maps) {
  const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
  const d = out.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    for (const m of maps) {
      const t = m.get(k);
      if (t) { d[i] = t[0]; d[i + 1] = t[1]; d[i + 2] = t[2]; break; }
    }
  }
  return out;
}
const layerCache = new Map();
async function layer(file, maps, cacheKey) {
  const key = file + '|' + cacheKey;
  if (!layerCache.has(key)) {
    layerCache.set(key, getData(file).then((data) => {
      const c = document.createElement('canvas'); c.width = data.width; c.height = data.height;
      c.getContext('2d').putImageData(recolor(data, maps), 0, 0);
      return c;
    }));
  }
  return layerCache.get(key);
}

const LPC = {
  key: 'lpc',
  frame: 64, footY: 62, topY: 10, walkFrames: 8, fps: 12, speed: 40, poolW: 34, hitW: 16,
  scale: () => (W >= 900 ? (DPR >= 2 ? 1.5 : 2) : 1),
  comboText() {
    if (!PAL) return 'B · 부품 조합';
    const n = 2 * (SKIN_COMMON.length + SKIN_RARE.length) * LPC_HAIR.length * Object.keys(PAL.hair).length *
      Object.keys(PAL.eye).length * (LPC_TORSO.length * Object.keys(PAL.cloth).length) *
      (LPC_LEGS.length * Object.keys(PAL.cloth).length) * SHOE_COLORS.length;
    return `B · 부품 조합 약 ${Math.round(n / 1e8).toLocaleString()}억 가지`;
  },
  async make(seed) {
    await loadPalettes();
    const r = rng('lpc:' + seed);
    const fem = r() < 0.5;
    const skin = r() < 0.1 ? pick(r, SKIN_RARE) : pick(r, SKIN_COMMON);
    const hair = pick(r, LPC_HAIR), hairC = pick(r, Object.keys(PAL.hair));
    const eye = pick(r, Object.keys(PAL.eye));
    const torso = pick(r, LPC_TORSO), torsoC = pick(r, Object.keys(PAL.cloth));
    const legs = pick(r, LPC_LEGS), legsC = pick(r, Object.keys(PAL.cloth));
    const shoeC = pick(r, SHOE_COLORS);
    const g = fem ? 'female' : 'male', lg = fem ? 'thin' : 'male';

    const skinMap = mapFor('body', skin), eyeMap = mapFor('eye', eye);
    // 겹치는 순서: 몸 → 신발 → 하의 → 상의 → 머리(눈 포함) → 헤어
    const parts = await Promise.all([
      layer(`body_bodies_${g}`, [skinMap], skin),
      layer(`feet_shoes_basic_${lg}`, [mapFor('cloth', shoeC)], shoeC),
      layer(`legs_${legs}_${lg}`, [mapFor('cloth', legsC)], legsC),
      layer(`torso_clothes_${torso}_${g}`, [mapFor('cloth', torsoC)], torsoC),
      layer(`head_heads_human_${g}`, [skinMap, eyeMap], skin + '/' + eye),
      layer(`hair_${hair}_adult`, [mapFor('hair', hairC)], hairC),
    ]);
    const sheet = document.createElement('canvas'); sheet.width = 576; sheet.height = 256;
    const sx = sheet.getContext('2d');
    for (const p of parts) sx.drawImage(p, 0, 0);
    return { sheet, label: `${fem ? '여' : '남'}·${hair}·${hairC}` };
  },
  // 행 = 방향(위·왼·아래·오), 열 = 프레임(0 = 서 있기, 1~8 = 걷기)
  src(ch) {
    const row = { up: 0, left: 1, down: 2, right: 3 }[ch.dir];
    const f = ch.moving ? 1 + (Math.floor(ch.anim * this.fps) % this.walkFrames) : 0;
    return [f * 64, row * 64];
  },
  face(ch, c2) {
    c2.drawImage(ch.look.sheet, 16, 128 + 10, 32, 32, 0, 0, c2.canvas.width, c2.canvas.height);
  },
};

/* ---------- C: 빛 정령 (레퍼런스 무드 오리지널 20종) ----------
 * 시트 규격: 768×512 = 6열 × 4행, 한 칸 128×128, 투명 배경
 *   열 0~1 서 있기(1 = 숨쉬기·눈 깜빡), 열 2~5 걷기 4프레임
 *   행 0 정면 · 1 왼쪽 · 2 오른쪽 · 3 뒷모습, 발끝 y = 120
 * 목록: assets/glow/index.json [{id, name, top}] — top = 머리 꼭대기 y (말풍선 위치)
 * 기준판은 tools/make_glow_chars.py 가 그린다. 이미지 생성판도 같은 규격으로 바꿔 끼우면 된다.
 */
let GLOW_INDEX = null;
async function loadGlowIndex() {
  if (!GLOW_INDEX) GLOW_INDEX = (await fetch('assets/glow/index.json')).json();
  return GLOW_INDEX;
}
const GLOW = {
  key: 'glow',
  frame: 128, footY: 120, topY: 56, walkFrames: 4, fps: 8, speed: 38,
  smooth: true, glow: true, poolW: 30, hitW: 22,
  scale: () => (W >= 900 ? 0.75 : 0.56),
  comboText: () => 'C · 빛 정령 20종',
  async make(seed) {
    const list = await loadGlowIndex();
    const c = pick(rng('glow:' + seed), list);
    const sheet = await loadImg(`assets/glow/${c.id}/walk.png`);
    return { sheet, label: c.name, top: c.top };
  },
  src(ch) {
    const row = { down: 0, left: 1, right: 2, up: 3 }[ch.dir];
    // 서 있을 땐 3초에 한 번 0.25초 동안 숨쉬기 프레임(눈 깜빡)
    const f = ch.moving ? 2 + (Math.floor(ch.anim * this.fps) % this.walkFrames) : ((ch.anim % 3.2) > 2.95 ? 1 : 0);
    return [f * 128, row * 128];
  },
  face(ch, c2) {
    c2.imageSmoothingEnabled = true;
    c2.drawImage(ch.look.sheet, 22, 36, 84, 84, 0, 0, c2.canvas.width, c2.canvas.height);
  },
};

const STYLES = { ninja: NINJA, lpc: LPC, glow: GLOW };

/* ---------- 방명록 글 ---------- */
const DUMMY = [
  ['소금빵', '빛이 나를 따라와서 깜짝 놀랐어요'],
  ['', '반딧불이 장면에서 한참 서 있었어요'],
  ['도토리', '친구랑 같이 와서 더 재밌었다!'],
  ['밤산책', '어두운데 하나도 안 무서웠어요 ㅎㅎ'],
  ['', '다음에 또 올게요~'],
  ['고양이발', '내 움직임에 반응하는 게 신기해'],
  ['', '사진 백 장 찍고 감'],
  ['문어', '소리가 진짜 좋았어요'],
  ['', '졸업 축하드려요!!'],
  ['몽글', '꿈속에 들어온 기분'],
  ['', '빨빨빨 걸어다니는 거 귀엽다'],
  ['하루', '여운이 오래 남네요'],
];
const SAMPLE_LINES = DUMMY.map((d) => d[1]).concat(['안녕하세요!', '여기 어디예요?', '저도 왔다 감', '오늘 날씨 좋다', '한 바퀴 더 돌고 갈게요']);
const LS_KEY = 'limen_gb_proto_v1', LS_STYLE = 'limen_gb_proto_style';

function loadEntries() {
  let mine = [];
  try { mine = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { mine = []; }
  const dummy = DUMMY.map((d, i) => ({ id: 'dummy-' + i, name: d[0], msg: d[1], t: 0 }));
  return dummy.concat(mine);
}
function saveEntry(e) {
  try {
    const mine = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    mine.push(e); localStorage.setItem(LS_KEY, JSON.stringify(mine.slice(-60)));
  } catch (err) { /* 저장 못 해도 화면엔 보인다 */ }
}

/* ---------- 마당 (남색 밤 들판) ---------- */
let W = 0, H = 0, DPR = 1, bg = null, vignette = null;
let TOP = 120, BOTTOM = 0; // 걸어다닐 수 있는 세로 범위
let style = NINJA, chars = [], entries = [], gen = 0, talkClock = 0;
let flies = [];

// 미리 그려 두는 빛 스프라이트
function glowSprite(size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  return c;
}
const GLOW_MINT = glowSprite(64, [[0, 'rgba(190,255,240,1)'], [0.18, 'rgba(111,240,216,.55)'], [0.5, 'rgba(111,240,216,.12)'], [1, 'rgba(111,240,216,0)']]);
const GLOW_LAV = glowSprite(64, [[0, 'rgba(235,230,255,1)'], [0.18, 'rgba(181,166,255,.55)'], [0.5, 'rgba(181,166,255,.12)'], [1, 'rgba(181,166,255,0)']]);
const POOL = glowSprite(64, [[0, 'rgba(181,166,255,.5)'], [0.45, 'rgba(140,130,255,.16)'], [1, 'rgba(120,110,255,0)']]);

function resize() {
  const r = field.getBoundingClientRect();
  W = Math.round(r.width); H = Math.round(r.height);
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
  // 위쪽 UI(헤더·안내·버튼) 아래부터, 입력창 위까지만 걷는다
  const hb = Math.max(...['.top', '#hud', '#more'].map((q) => $(q).getBoundingClientRect().bottom));
  TOP = hb + 8; BOTTOM = $('#form').getBoundingClientRect().top - 10;
  bg = makeNight(); vignette = makeVignette();
  makeFlies();
  for (const ch of chars) { ch.x = clampX(ch.x); ch.y = clampY(ch.y); ch.tx = ch.x; ch.ty = ch.y; }
}
const clampX = (x) => Math.max(24, Math.min(W - 24, x));
const minY = () => Math.min(TOP + (style.footY - style.topY) * style.scale() + 58, BOTTOM - 40); // 머리 위 말풍선 두 줄 자리
const clampY = (y) => Math.max(minY(), Math.min(BOTTOM, y));

// 밤 들판: 4px 픽셀 블록 + 위쪽 하늘 그라데이션 + 안개 띠
function makeNight() {
  const c = document.createElement('canvas'); c.width = W * DPR; c.height = H * DPR;
  const x = c.getContext('2d'); x.scale(DPR, DPR);
  // 하늘 → 땅
  const sky = x.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0b1240'); sky.addColorStop(0.35, '#182467'); sky.addColorStop(0.62, '#141c52'); sky.addColorStop(1, '#070b26');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  // 픽셀 풀
  const px = 4, cols = Math.ceil(W / px), rows = Math.ceil(H / px), r = rng('night');
  const g = document.createElement('canvas'); g.width = cols; g.height = rows;
  const gx = g.getContext('2d');
  for (let i = 0; i < cols * rows * 0.07; i++) {
    const cx = Math.floor(r() * cols), cy = Math.floor(r() * rows), v = r();
    const depth = cy / rows; // 아래로 갈수록 풀이 진하다
    if (depth < 0.18) continue;
    gx.fillStyle = v < 0.6 ? `rgba(40,52,130,${0.35 + depth * 0.4})` : v < 0.93 ? `rgba(90,96,190,${0.18 + depth * 0.3})` : 'rgba(181,166,255,.35)';
    gx.fillRect(cx, cy, 1, 1);
    if (v < 0.3) gx.fillRect(cx + 1, cy - 1, 1, 1);
  }
  // 작은 빛 꽃
  for (let i = 0; i < cols * rows * 0.0005; i++) {
    const cx = Math.floor(r() * (cols - 2)) + 1, cy = Math.floor((0.3 + r() * 0.7) * (rows - 2)) + 1;
    gx.fillStyle = r() < 0.5 ? 'rgba(181,166,255,.32)' : 'rgba(111,240,216,.28)';
    gx.fillRect(cx - 1, cy, 1, 1); gx.fillRect(cx + 1, cy, 1, 1); gx.fillRect(cx, cy - 1, 1, 1); gx.fillRect(cx, cy + 1, 1, 1);
    gx.fillStyle = 'rgba(233,239,243,.5)'; gx.fillRect(cx, cy, 1, 1);
  }
  x.imageSmoothingEnabled = false;
  x.drawImage(g, 0, 0, cols * px, rows * px);
  // 안개 띠 · 빛 번짐
  x.globalCompositeOperation = 'lighter';
  const blobs = [[0.18, 0.28, 0.55, 'rgba(120,110,255,.16)'], [0.82, 0.22, 0.5, 'rgba(160,140,255,.14)'], [0.55, 0.6, 0.65, 'rgba(90,120,255,.10)'], [0.3, 0.85, 0.5, 'rgba(111,240,216,.06)']];
  for (const [bx, by, br, col] of blobs) {
    const R = Math.max(W, H) * br, gr = x.createRadialGradient(bx * W, by * H, 0, bx * W, by * H, R);
    gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
  }
  // 하늘에서 내려오는 사선 빛줄기 (메인 SLOGAN 구간 느낌)
  x.save(); x.translate(W * 0.3, -40); x.rotate(-0.32);
  const beam = x.createLinearGradient(-W * 0.12, 0, W * 0.12, 0);
  beam.addColorStop(0, 'rgba(160,160,255,0)'); beam.addColorStop(0.5, 'rgba(160,160,255,.07)'); beam.addColorStop(1, 'rgba(160,160,255,0)');
  x.fillStyle = beam; x.fillRect(-W * 0.12, 0, W * 0.24, H * 1.4);
  x.restore();
  return c;
}
function makeVignette() {
  const c = document.createElement('canvas'); c.width = W * DPR; c.height = H * DPR;
  const x = c.getContext('2d'); x.scale(DPR, DPR);
  const g = x.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.25, W / 2, H * 0.55, Math.max(W, H) * 0.8);
  g.addColorStop(0, 'rgba(3,5,20,0)'); g.addColorStop(1, 'rgba(3,5,20,.6)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return c;
}

/* 반딧불이: 각자 깜빡이다가 이웃 박자에 조금씩 맞춰 간다 */
function makeFlies() {
  const n = Math.round(Math.min(90, Math.max(22, (W * H) / 13000)));
  flies = [];
  for (let i = 0; i < n; i++) {
    flies.push({
      x: Math.random() * W, y: rand(H * 0.08, H * 0.95), a: Math.random() * Math.PI * 2,
      sp: rand(6, 16), ph: Math.random(), f: rand(0.38, 0.52), mint: Math.random() < 0.7, sz: rand(14, 26),
    });
  }
}
function updateFlies(dt) {
  let sx = 0, sy = 0;
  for (const f of flies) { sx += Math.cos(f.ph * 6.283); sy += Math.sin(f.ph * 6.283); }
  const R = Math.hypot(sx, sy) / flies.length, psi = Math.atan2(sy, sx);
  for (const f of flies) {
    f.ph += dt * (f.f + 0.2 * R * Math.sin(psi - f.ph * 6.283));
    f.ph -= Math.floor(f.ph);
    f.a += rand(-1.6, 1.6) * dt;
    f.x += Math.cos(f.a) * f.sp * dt; f.y += Math.sin(f.a) * f.sp * 0.6 * dt;
    if (f.x < -20) f.x = W + 20; if (f.x > W + 20) f.x = -20;
    if (f.y < H * 0.05) f.a = Math.abs(f.a); if (f.y > H * 0.97) f.a = -Math.abs(f.a);
  }
}
function drawFlies() {
  ctx.globalCompositeOperation = 'lighter';
  for (const f of flies) {
    const b = Math.pow(Math.max(0, Math.sin(f.ph * 6.283)), 3) * 0.9 + 0.1;
    const s = f.sz * (0.6 + b * 0.6);
    ctx.globalAlpha = b;
    ctx.drawImage(f.mint ? GLOW_MINT : GLOW_LAV, f.x - s / 2, f.y - s / 2, s, s);
    ctx.fillStyle = f.mint ? '#d8fff6' : '#efeaff';
    ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

const maxChars = () => (W < 600 ? 18 : 30);
const maxTalk = () => (W < 600 ? 2 : 4);

function spawnPos() { return [rand(28, W - 28), rand(minY(), BOTTOM)]; }

async function addChar(entry, opts = {}) {
  const myGen = gen;
  const look = await style.make(entry.seed || entry.id);
  if (myGen !== gen) return null; // 그 사이 스타일이 바뀜
  const [x, y] = spawnPos();
  const ch = {
    entry, look, x, y, tx: x, ty: y, dir: 'down', moving: false, anim: Math.random() * 3,
    wait: rand(0.2, 2.5), speed: style.speed * rand(0.85, 1.2),
    talkUntil: 0, bubble: null, isNew: !!opts.isNew, sparks: [],
    // 새 글: 빛 한 점이 내려와(orb 0→1) 터지고 캐릭터가 깨어난다(wake 0→1)
    orb: opts.drop ? 0 : 1, wake: opts.drop ? 0 : 1, orbX: rand(W * 0.2, W * 0.8),
  };
  chars.push(ch);
  if (chars.length > maxChars()) {
    const old = chars.shift(); if (old.bubble) old.bubble.remove();
  }
  updateHud();
  return ch;
}

async function rebuild() {
  gen++;
  for (const ch of chars) if (ch.bubble) ch.bubble.remove();
  chars = [];
  updateHud();
  const list = entries.slice(-maxChars());
  await Promise.all(list.map((e) => addChar(e)));
  renderList();
}

function setStyle(key) {
  style = STYLES[key] || NINJA;
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.style === style.key)));
  try { localStorage.setItem(LS_STYLE, style.key); } catch (e) { /* 무시 */ }
  const u = new URL(location.href); u.searchParams.set('style', style.key); history.replaceState(null, '', u);
  rebuild();
}

/* ---------- 말풍선 ---------- */
function talk(ch, secs) {
  if (!ch.bubble) {
    const b = document.createElement('div'); b.className = 'bubble';
    const who = document.createElement('span'); who.className = 'who'; who.textContent = ch.entry.name || '익명';
    const txt = document.createElement('span'); txt.textContent = ch.entry.msg;
    const tail = document.createElement('i'); tail.className = 'tail';
    b.append(who, txt, tail);
    bubLayer.appendChild(b);
    ch.bubble = b; ch.tail = tail;
  }
  ch.bubble.classList.toggle('new', ch.isNew);
  ch.bubble.classList.add('on');
  ch.bw = ch.bubble.offsetWidth; ch.bh = ch.bubble.offsetHeight;
  ch.talkUntil = performance.now() / 1000 + secs;
  ch.wait = Math.max(ch.wait, secs);      // 말할 땐 멈춰서
  ch.moving = false; ch.dir = 'down';     // 정면을 본다
  ch.tx = ch.x; ch.ty = ch.y;
}
function hush(ch) {
  if (ch.bubble) ch.bubble.classList.remove('on');
  ch.talkUntil = 0; ch.isNew = false;
}
function talking() { const now = performance.now() / 1000; return chars.filter((c) => c.talkUntil > now); }

function maybeStartTalk() {
  const now = performance.now() / 1000, cur = talking();
  if (cur.length >= maxTalk()) return;
  const free = chars.filter((c) => c.talkUntil <= now && c.wake >= 1 &&
    cur.every((o) => Math.abs(o.x - c.x) > 150 || Math.abs(o.y - c.y) > 90));
  if (free.length) talk(pick(Math.random, free), rand(3.5, 5));
}

/* ---------- 움직임 ---------- */
function newTarget(ch) {
  const hop = W < 600 ? 120 : 200;
  ch.tx = clampX(ch.x + rand(-hop, hop));
  ch.ty = clampY(ch.y + rand(-hop, hop) * 0.6);
}

function update(dt) {
  const now = performance.now() / 1000;
  updateFlies(dt);
  for (const ch of chars) {
    ch.sparks = ch.sparks.filter((p) => (p.t += dt) < p.life);
    if (ch.orb < 1) {
      ch.orb = Math.min(1, ch.orb + dt / 1.1);
      if (ch.orb >= 1) { // 착지: 빛 조각이 흩어진다
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + rand(-0.2, 0.2);
          ch.sparks.push({ a, v: rand(40, 110), t: 0, life: rand(0.5, 0.9), mint: Math.random() < 0.6 });
        }
      }
      continue;
    }
    if (ch.wake < 1) { ch.wake = Math.min(1, ch.wake + dt / 0.6); continue; }
    if (ch.talkUntil && ch.talkUntil <= now) hush(ch);
    ch.anim += dt;
    if (ch.wait > 0) { ch.wait -= dt; ch.moving = false; if (ch.wait <= 0) newTarget(ch); continue; }
    const dx = ch.tx - ch.x, dy = ch.ty - ch.y, d = Math.hypot(dx, dy);
    if (d < 2) { ch.moving = false; ch.wait = rand(0.6, 3); continue; }
    const step = Math.min(d, ch.speed * dt);
    ch.x += (dx / d) * step; ch.y += (dy / d) * step;
    ch.moving = true;
    ch.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }
  talkClock -= dt;
  if (talkClock <= 0) { talkClock = rand(1.2, 2.2); maybeStartTalk(); }
}

/* ---------- 그리기 ---------- */
function drawChars(sorted, s, F, alpha = 1) {
  for (const ch of sorted) {
    if (ch.orb < 1) continue;
    const x = ch.x, y = ch.y;
    const [sx, sy] = style.src(ch);
    ctx.globalAlpha = ch.wake * alpha;
    const dx = x - (F / 2) * s, dy = y - style.footY * s;
    ctx.drawImage(ch.look.sheet, sx, sy, F, F,
      style.smooth ? dx : Math.round(dx), style.smooth ? dy : Math.round(dy), F * s, F * s);
  }
  ctx.globalAlpha = 1;
}
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bg, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const s = style.scale(), F = style.frame;
  const sorted = chars.slice().sort((a, b) => a.y - b.y);
  const poolW = style.poolW * s;

  // 1) 발밑 빛 웅덩이
  ctx.globalCompositeOperation = 'lighter';
  for (const ch of sorted) {
    if (ch.orb < 1) continue;
    ctx.globalAlpha = 0.55 * ch.wake + (ch.talkUntil ? 0.35 : 0);
    ctx.drawImage(POOL, ch.x - poolW, ch.y - poolW * 0.32, poolW * 2, poolW * 0.64);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // 2) 픽셀 캐릭터 (A·B) — 밤빛을 입히려고 multiply 전에 그린다
  if (!style.glow) drawChars(sorted, s, F);

  // 3) 밤빛 입히기: 전체를 라벤더 빛으로 살짝 눌러 스티커처럼 뜨지 않게
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#c3c0f2'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(vignette, 0, 0, W, H);

  // 2') 빛 정령 (C) — 스스로 빛나므로 어둡게 누르지 않고 위에 그린 뒤 빛을 한 번 더 더한다
  if (style.glow) {
    ctx.imageSmoothingEnabled = true;
    drawChars(sorted, s, F);
    ctx.globalCompositeOperation = 'lighter';
    drawChars(sorted, s, F, 0.15);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
  }

  // 4) 반딧불이 · 내려오는 빛 · 흩어지는 조각 · 깨어나는 빛
  drawFlies();
  ctx.globalCompositeOperation = 'lighter';
  for (const ch of chars) {
    if (ch.orb < 1) {
      const t = ch.orb, e = 1 - Math.pow(1 - t, 3);
      const ox = ch.orbX + (ch.x - ch.orbX) * e, oy = -30 + (ch.y - 20 + 30) * e;
      for (let k = 0; k < 6; k++) { // 꼬리
        const tt = Math.max(0, e - k * 0.035), tx = ch.orbX + (ch.x - ch.orbX) * tt, ty = -30 + (ch.y - 20 + 30) * tt;
        ctx.globalAlpha = 0.5 - k * 0.07; ctx.drawImage(GLOW_MINT, tx - 18, ty - 18, 36, 36);
      }
      ctx.globalAlpha = 1; ctx.drawImage(GLOW_MINT, ox - 30, oy - 30, 60, 60);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(ox) - 2, Math.round(oy) - 2, 4, 4);
    } else if (ch.wake < 1) {
      ctx.globalAlpha = 1 - ch.wake;
      const r = 50 + ch.wake * 40;
      ctx.drawImage(GLOW_LAV, ch.x - r, ch.y - 20 - r, r * 2, r * 2);
    }
    for (const p of ch.sparks) {
      const k = p.t / p.life, d = p.v * p.t;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.mint ? '#a8fff0' : '#d9d2ff';
      ctx.fillRect(Math.round(ch.x + Math.cos(p.a) * d) - 1, Math.round(ch.y - 20 + Math.sin(p.a) * d * 0.7 + 30 * k * k) - 1, 3, 3);
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // 말풍선 위치
  for (const ch of chars) {
    if (!ch.bubble || !ch.talkUntil) continue;
    const headY = ch.y - (style.footY - (ch.look.top ?? style.topY)) * s;
    let left = ch.x - ch.bw / 2;
    left = Math.max(8, Math.min(W - ch.bw - 8, left));
    const top = Math.max(TOP, headY - ch.bh - 14);
    ch.bubble.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    ch.tail.style.left = `${Math.round(Math.max(10, Math.min(ch.bw - 10, ch.x - left)))}px`;
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw();
  requestAnimationFrame(loop);
}

/* ---------- 화면 ---------- */
function updateHud() {
  $('#count').textContent = `마당에 ${chars.length}명`;
  $('#combo').textContent = style.comboText();
}

async function renderList() {
  const ol = $('#listItems'); ol.textContent = '';
  const myGen = gen;
  const list = entries.slice().reverse();
  for (const e of list) {
    const li = document.createElement('li');
    const c = document.createElement('canvas'); c.width = 40; c.height = 40;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const body = document.createElement('div');
    const who = document.createElement('span'); who.className = 'who'; who.textContent = e.name || '익명';
    const msg = document.createElement('span'); msg.textContent = e.msg;
    body.append(who, msg); li.append(c, body); ol.appendChild(li);
    style.make(e.seed || e.id).then((look) => { if (myGen === gen) style.face({ look }, x); });
  }
}

cv.addEventListener('pointerdown', (ev) => {
  const r = cv.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
  const s = style.scale();
  const hit = chars.slice().sort((a, b) => b.y - a.y).find((ch) =>
    Math.abs(px - ch.x) < style.hitW * s &&
    py < ch.y + 4 && py > ch.y - (style.footY - style.topY) * s - 6);
  if (!hit) return;
  const cur = talking().filter((c) => c !== hit);
  if (cur.length >= maxTalk()) hush(cur.sort((a, b) => a.talkUntil - b.talkUntil)[0]);
  talk(hit, 5);
});

$('#form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const msg = $('#msg').value.trim(); if (!msg) return;
  const e = { id: 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), name: $('#name').value.trim().slice(0, 8), msg: msg.slice(0, 40), t: Date.now() };
  entries.push(e); saveEntry(e);
  $('#msg').value = '';
  addChar(e, { drop: true, isNew: true }).then((ch) => { if (ch) setTimeout(() => talk(ch, 7), 1750); });
  renderList();
});

$('#more').addEventListener('click', () => {
  const e = { id: 'r-' + Math.random().toString(36).slice(2), name: '', msg: pick(Math.random, SAMPLE_LINES) };
  addChar(e, { drop: true, isNew: false }).then((ch) => { if (ch) setTimeout(() => talk(ch, 5), 1750); });
});

document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => setStyle(b.dataset.style)));
$('#listBtn').addEventListener('click', () => { $('#list').hidden = false; });
$('#listClose').addEventListener('click', () => { $('#list').hidden = true; });
window.addEventListener('resize', resize);

/* ---------- 시작 ---------- */
entries = loadEntries();
resize();
let startKey = new URL(location.href).searchParams.get('style');
if (!STYLES[startKey]) { try { startKey = localStorage.getItem(LS_STYLE); } catch (e) { startKey = null; } }
setStyle(STYLES[startKey] ? startKey : 'glow');
requestAnimationFrame(loop);

// 검증용
window.__gb = { get chars() { return chars; }, get style() { return style.key; }, talk };
})();
