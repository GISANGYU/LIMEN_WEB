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
  frame: 16, footY: 16, topY: 1, walkFrames: 4, fps: 9, speed: 46,
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
  frame: 64, footY: 62, topY: 10, walkFrames: 8, fps: 12, speed: 40,
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

const STYLES = { ninja: NINJA, lpc: LPC };

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

/* ---------- 마당 ---------- */
let W = 0, H = 0, DPR = 1, bg = null;
let style = NINJA, chars = [], entries = [], gen = 0, talkClock = 0;

function resize() {
  const r = field.getBoundingClientRect();
  W = Math.round(r.width); H = Math.round(r.height);
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
  bg = makeGrass();
  for (const ch of chars) { ch.x = Math.min(ch.x, W - 20); ch.y = Math.min(ch.y, H - 8); ch.tx = ch.x; ch.ty = ch.y; }
}

// 잔디 바닥: 4px 블록, 시드 고정이라 다시 그려도 같은 무늬
function makeGrass() {
  const px = 4, cols = Math.ceil(W / px), rows = Math.ceil(H / px);
  const c = document.createElement('canvas'); c.width = cols; c.height = rows;
  const x = c.getContext('2d');
  x.fillStyle = '#a8d58a'; x.fillRect(0, 0, cols, rows);
  const r = rng('grass');
  for (let i = 0; i < cols * rows * 0.06; i++) {
    const gx = Math.floor(r() * cols), gy = Math.floor(r() * rows), v = r();
    x.fillStyle = v < 0.7 ? '#98c97b' : v < 0.95 ? '#b7df9b' : '#fff2a8';
    x.fillRect(gx, gy, 1, 1);
    if (v < 0.25) x.fillRect(gx + 1, gy - 1, 1, 1);
  }
  // 군데군데 작은 꽃
  for (let i = 0; i < cols * rows * 0.0016; i++) {
    const gx = Math.floor(r() * (cols - 2)) + 1, gy = Math.floor(r() * (rows - 2)) + 1;
    x.fillStyle = pick(r, ['#ffffff', '#ffb3cd', '#ffe27a']);
    x.fillRect(gx - 1, gy, 1, 1); x.fillRect(gx + 1, gy, 1, 1); x.fillRect(gx, gy - 1, 1, 1); x.fillRect(gx, gy + 1, 1, 1);
    x.fillStyle = '#f2a33a'; x.fillRect(gx, gy, 1, 1);
  }
  return c;
}

const maxChars = () => (W < 600 ? 18 : 30);
const maxTalk = () => (W < 600 ? 2 : 4);
const topPad = () => style.frame * style.scale() * 0.9 + 64; // 머리 위 말풍선 자리

function spawnPos() {
  return [rand(28, W - 28), rand(Math.min(topPad(), H * 0.5), H - 14)];
}

async function addChar(entry, opts = {}) {
  const myGen = gen;
  const look = await style.make(entry.seed || entry.id);
  if (myGen !== gen) return null; // 그 사이 스타일이 바뀜
  const [x, y] = spawnPos();
  const ch = {
    entry, look, x, y, tx: x, ty: y, dir: 'down', moving: false, anim: Math.random() * 3,
    wait: rand(0.2, 2.5), speed: style.speed * rand(0.85, 1.2),
    talkUntil: 0, bubble: null, drop: opts.drop ? 0 : 1, isNew: !!opts.isNew, puff: [],
  };
  chars.push(ch);
  if (chars.length > maxChars()) {
    const old = chars.shift(); if (old.bubble) old.bubble.remove();
  }
  if (opts.talk) talk(ch, opts.talk);
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
  const free = chars.filter((c) => c.talkUntil <= now && c.drop >= 1 &&
    cur.every((o) => Math.abs(o.x - c.x) > 150 || Math.abs(o.y - c.y) > 90));
  if (free.length) talk(pick(Math.random, free), rand(3.5, 5));
}

/* ---------- 움직임 ---------- */
function newTarget(ch) {
  const hop = W < 600 ? 120 : 200;
  ch.tx = Math.max(24, Math.min(W - 24, ch.x + rand(-hop, hop)));
  ch.ty = Math.max(Math.min(topPad(), H * 0.5), Math.min(H - 12, ch.y + rand(-hop, hop) * 0.6));
}

function update(dt) {
  const now = performance.now() / 1000;
  for (const ch of chars) {
    if (ch.drop < 1) { // 새 글: 위에서 떨어진다
      ch.drop = Math.min(1, ch.drop + dt / 0.7);
      if (ch.drop >= 1) { // 착지 먼지
        for (let i = 0; i < 8; i++) ch.puff.push({ a: (i / 8) * Math.PI * 2, t: 0 });
      }
      continue;
    }
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
  for (const ch of chars) ch.puff = ch.puff.filter((p) => (p.t += dt) < 0.45);
  talkClock -= dt;
  if (talkClock <= 0) { talkClock = rand(1.2, 2.2); maybeStartTalk(); }
}

/* ---------- 그리기 ---------- */
function dropOffset(ch) {
  if (ch.drop >= 1) return 0;
  const t = ch.drop; return -(1 - t) * (1 - t) * (ch.y + 80);
}

function draw() {
  ctx.drawImage(bg, 0, 0, bg.width * 4, bg.height * 4);
  const s = style.scale(), F = style.frame;
  const sorted = chars.slice().sort((a, b) => a.y - b.y);
  for (const ch of sorted) {
    const x = Math.round(ch.x), y = Math.round(ch.y + dropOffset(ch));
    // 그림자 (픽셀 타원)
    const sw = (style.key === 'ninja' ? 10 : 20) * s, shy = Math.round(ch.y);
    ctx.fillStyle = 'rgba(40,60,30,.28)';
    ctx.fillRect(x - sw / 2 + s, shy - s, sw - 2 * s, 2 * s);
    ctx.fillRect(x - sw / 2, shy - s * 0.5, sw, s);
    // 몸
    const [sx, sy] = style.src(ch);
    ctx.drawImage(ch.look.sheet, sx, sy, F, F,
      Math.round(x - (F / 2) * s), Math.round(y - style.footY * s), F * s, F * s);
    // 착지 먼지
    for (const p of ch.puff) {
      const r = 6 + p.t * 60, a = 1 - p.t / 0.45;
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      ctx.fillRect(Math.round(x + Math.cos(p.a) * r) - 2, Math.round(shy + Math.sin(p.a) * r * 0.4) - 2, 4, 4);
    }
  }
  // 말풍선 위치
  for (const ch of chars) {
    if (!ch.bubble || !ch.talkUntil) continue;
    const s2 = style.scale();
    const headY = ch.y + dropOffset(ch) - (style.footY - style.topY) * s2;
    let left = ch.x - ch.bw / 2;
    left = Math.max(6, Math.min(W - ch.bw - 6, left));
    const top = Math.max(4, headY - ch.bh - 14);
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
    Math.abs(px - ch.x) < (style.key === 'ninja' ? 9 : 16) * s &&
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
  addChar(e, { drop: true, isNew: true }).then((ch) => { if (ch) setTimeout(() => talk(ch, 7), 750); });
  renderList();
});

$('#more').addEventListener('click', () => {
  const e = { id: 'r-' + Math.random().toString(36).slice(2), name: '', msg: pick(Math.random, SAMPLE_LINES) };
  addChar(e, { drop: true, isNew: false }).then((ch) => { if (ch) setTimeout(() => talk(ch, 5), 750); });
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
setStyle(STYLES[startKey] ? startKey : 'ninja');
requestAnimationFrame(loop);

// 검증용
window.__gb = { get chars() { return chars; }, get style() { return style.key; }, talk };
})();
