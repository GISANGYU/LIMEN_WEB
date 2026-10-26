// LIMEN TECHNOLOGY — 공통(sub-common.js) + TECHNOLOGY 구간
//  path   : 관객 → 키넥트 A·B → 송출 노트북 → 메인 PC(보정·합치기 → Unity → Spout → MadMapper) → 프로젝터 4대 → 네 면 → 관객.
//           스크롤과 무관하게 신호 점이 계속 흐르고, 장치를 누르면 오른쪽 설명이 바뀐다
//  sense  : 방 평면(7.2 × 4 m) 위 두 센서의 시야(70.6° · 0.5–4.5 m). 커서가 관객 — 누가 보는지 · 합치기 · 세이프존 유지를 보여 준다
//  net    : 네 면 전개도. 커서를 올린 면(없으면 차례로 돌아가며)의 담당 프로젝터와 제작 규격
// 수치 근거: 통합 p.16(출력 규격 · 흐름) · 키넥트2대_연구노트(시야 · 합치기 · 세이프존 · UDP · 랜선) · studio.js(실측 · 센서 배치 · 프로젝터 배정)
import { $, $$, lerp, reduced } from './_shared/js/core.js';
import { initSub } from './sub-common.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
const txt = (parent, cls, x, y, s, extra = {}) => { const t = el('text', { class: cls, x, y, ...extra }, parent); t.textContent = s; return t; };
const sub = initSub({ hero: '#top', close: '#next' });

// ---------- 영상: 화면에 보일 때만 재생 (움직임 줄이기 설정이면 포스터만)
const vio = new IntersectionObserver((es) => es.forEach((e) => {
  const v = e.target;
  if (e.isIntersecting && !reduced) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
}), { threshold: .25 });
$$('video.lazy-play').forEach((v) => vio.observe(v));

// ---------- 실시간 장면 개발 화면 탭
const makeVid = $('#makeVid');
$$('.tc-tabs button').forEach((b, _, all) => b.addEventListener('click', () => {
  all.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  makeVid.poster = b.dataset.src + '.jpg'; makeVid.src = b.dataset.src + '.mp4';
  if (!reduced) makeVid.play().catch(() => {});
}));

// =====================================================================
// 02 SIGNAL PATH
// =====================================================================
const PATH_NODES = [
  { id: 'visitor', no: '01', x: 80, y: 215, nm: '관객', sb: 'VISITOR', tag: '몸 · 움직임', lines: ['걷고, 멈추고, 방향을 바꾸는 움직임이 입력이 됩니다', '센서는 몸을 관절 25개의 점으로 읽습니다', '네 면의 반응을 보고, 관객은 다시 움직입니다'] },
  { id: 'ka', no: '02', x: 240, y: 120, nm: '키넥트 A', sb: 'KINECT V2', tag: '왼쪽 · 메인 PC 에 연결', lines: ['관객 뒤쪽 왼편 스탠드에서 무대 안쪽으로 비스듬히 봅니다', '가로 시야 70.6° · 사람 인식 0.5 – 4.5 m', '관절과 뎁스(거리 영상)를 함께 읽습니다'] },
  { id: 'kb', no: '03', x: 240, y: 310, nm: '키넥트 B', sb: 'KINECT V2', tag: '오른쪽 · 송출 노트북에 연결', lines: ['관객 뒤쪽 오른편에서 A 와 엇갈려 봅니다', 'Kinect v2 는 PC 한 대에 한 대만 연결되어, 노트북이 따로 읽습니다'] },
  { id: 'send', no: '04', x: 450, y: 310, nm: '송출', sb: 'LAPTOP', tag: 'Sender', lines: ['키넥트 B 가 본 것을 판단하지 않고 그대로 보냅니다', '관절은 초당 30번, 사람 점구름은 초당 15번', 'UDP 로 메인 PC 에 — 두 PC 는 랜선으로 직접 연결', '현장에서 센서를 옮겨도 노트북은 손대지 않아도 됩니다'] },
  { id: 'fuse', no: '05', x: 450, y: 120, nm: '보정 · 합치기', sb: 'FUSION', tag: 'Main PC', lines: ['두 센서를 방 좌표 하나로 맞춥니다 — 겹치는 곳을 한 사람이 걸으면 맞춰지는 걷기 보정', '0.5 m 안의 두 몸은 한 사람으로 묶고, 더 잘 보이는 센서에 무게를 둡니다', '세이프존 안에서 잠시 놓친 사람은 마지막 자리에 둡니다'] },
  { id: 'unity', no: '06', x: 620, y: 120, nm: 'Unity', sb: 'REAL-TIME', tag: 'Main PC · 실시간 장면', lines: ['합쳐진 관객의 자리를 받아 개미 · 반딧불이 · 사람·군중 장면이 반응합니다', '장면의 큰 흐름은 정해져 있고, 반응은 관객 둘레에서 일어납니다'] },
  { id: 'spout', no: '07', x: 770, y: 120, nm: 'Spout', sb: 'OPEN SOURCE', tag: 'Main PC · 화면 공유', lines: ['Unity 가 그린 화면을 같은 PC 의 매핑 프로그램으로 바로 넘기는 오픈소스', '파일로 저장하지 않고 실시간으로 넘깁니다'] },
  { id: 'mad', no: '08', x: 920, y: 120, nm: 'MadMapper', sb: 'MAPPING', tag: 'Main PC · 워핑 · 블렌딩', lines: ['한 화면을 네 면으로 나누고, 면 모양에 맞게 휘고(워핑) 이음매를 섞습니다(블렌딩)', '격자를 투사해 곡면 모서리까지 맞춥니다'] },
  { id: 'proj', no: '09', x: 1100, y: 120, nm: '프로젝터 × 4', sb: 'P1 – P4', tag: '한 대가 한 면씩', lines: ['P1 정면 · P2 바닥 · P3 좌벽 · P4 우벽', '천장 철골에 걸려 각자 맡은 면을 비춥니다'] },
  { id: 'room', no: '10', x: 1100, y: 310, nm: '네 면', sb: 'FOUR SURFACES', tag: '정면 · 좌 · 우 · 바닥', lines: ['정면 · 좌 · 우 벽과 바닥이 같은 순간의 한 공간이 됩니다', '빛이 바뀌면 관객은 다시 움직이고, 흐름은 처음으로 돌아갑니다'] },
];
const PATH_EDGES = [
  { a: 'visitor', b: 'ka', kind: 'air' }, { a: 'visitor', b: 'kb', kind: 'air' },
  { a: 'ka', b: 'fuse', label: 'USB' }, { a: 'kb', b: 'send', label: 'USB' },
  { a: 'send', b: 'fuse', kind: 'net', label: 'UDP · 랜선 직결', lx: 462, ly: 222 },
  { a: 'fuse', b: 'unity' }, { a: 'unity', b: 'spout' }, { a: 'spout', b: 'mad' }, { a: 'mad', b: 'proj' }, { a: 'proj', b: 'room' },
  { a: 'room', b: 'visitor', kind: 'loop', label: '빛을 보고, 다시 움직인다' },
];

function initPath() {
  const svg = $('#pathSvg'), byId = Object.fromEntries(PATH_NODES.map((n) => [n.id, n]));
  // 두 PC 의 경계
  el('rect', { class: 'box', x: 365, y: 40, width: 640, height: 150, rx: 26 }, svg);
  txt(svg, 'box-t', 385, 64, 'MAIN PC · 맵핑 · 전시');
  el('rect', { class: 'box', x: 365, y: 255, width: 190, height: 135, rx: 26 }, svg);
  txt(svg, 'box-t', 385, 279, '송출 PC · 노트북');
  // 선 + 흐르는 점
  const gE = el('g', {}, svg), gP = el('g', {}, svg), gN = el('g', {}, svg);
  const edges = PATH_EDGES.map((e) => {
    const A = byId[e.a], B = byId[e.b];
    // 네 면 → 관객은 아래로 크게 돌아오는 고리 (영향을 주고받는 순환)
    const d = e.kind === 'loop' ? `M${A.x} ${A.y + 70} C${A.x} 430 ${B.x} 430 ${B.x} ${B.y + 70}` : `M${A.x} ${A.y} L${B.x} ${B.y}`;
    const p = el('path', { class: 'edge' + (e.kind ? ' ' + e.kind : ''), d }, gE);
    if (e.label) {
      const len = p.getTotalLength(), mid = p.getPointAtLength(len / 2);
      const lx = e.lx ?? mid.x, ly = e.ly ?? (e.kind === 'loop' ? 438 : mid.y - 10);
      txt(gE, 'e-t' + (e.kind === 'net' ? ' net' : ''), lx, ly, e.label, { 'text-anchor': e.lx ? 'start' : 'middle' });
    }
    const n = e.kind === 'loop' ? 4 : e.kind === 'net' ? 3 : 2;
    const pk = Array.from({ length: n }, (_, i) => el('circle', { class: 'pkt' + (e.kind === 'net' ? ' m' : ''), r: e.kind === 'net' ? 3 : 2.2, opacity: 0 }, gP));
    return { p, len: p.getTotalLength(), pk, speed: e.kind === 'loop' ? 60 : e.kind === 'air' ? 70 : 110, kind: e.kind };
  });
  // 노드
  const side = { no: $('#pathNo'), title: $('#pathTitle'), tag: $('#pathTag'), lines: $('#pathLines') };
  let sel = 'fuse';
  const ring = el('circle', { class: 'ring', r: 24 }, gN);
  const nodes = PATH_NODES.map((n) => {
    const g = el('g', { class: 'node', transform: `translate(${n.x} ${n.y})`, tabindex: 0, role: 'button', 'aria-label': `${n.nm} — ${n.tag}` }, gN);
    el('circle', { class: 'hit', r: 44 }, g);
    el('circle', { class: 'dot', r: 17 }, g);
    txt(g, 'num', 0, 0, n.no);
    txt(g, 'nm', 0, 44, n.nm);
    txt(g, 'sb', 0, 60, n.sb);
    const pick = () => select(n.id);
    g.addEventListener('pointerenter', pick); g.addEventListener('click', pick); g.addEventListener('focus', pick);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    return { n, g };
  });
  function select(id) {
    sel = id; const n = byId[id];
    nodes.forEach((o) => o.g.classList.toggle('on', o.n.id === id));
    ring.setAttribute('cx', n.x); ring.setAttribute('cy', n.y);
    side.no.textContent = n.no; side.title.textContent = n.nm; side.tag.textContent = n.tag;
    side.lines.innerHTML = n.lines.map((l) => `<li>${l}</li>`).join('');
  }
  select(sel);
  // 모바일 · 스크린리더용 목록
  $('#pathList').innerHTML = PATH_NODES.map((n) => `<li data-no="${n.no}"><h3>${n.nm}</h3><p class="tag">${n.tag}</p><p>${n.lines.join('<br>')}</p></li>`).join('');
  return {
    update(t) {
      for (const e of edges) e.pk.forEach((c, i) => {
        const u = ((t * e.speed) / e.len + i / e.pk.length) % 1, q = e.p.getPointAtLength(u * e.len);
        c.setAttribute('cx', q.x.toFixed(1)); c.setAttribute('cy', q.y.toFixed(1));
        c.setAttribute('opacity', (Math.sin(u * Math.PI) * .95).toFixed(2));
      });
      ring.setAttribute('r', (22 + (Math.sin(t * 2.4) * .5 + .5) * 7).toFixed(1));
      ring.setAttribute('opacity', (.9 - (Math.sin(t * 2.4) * .5 + .5) * .6).toFixed(2));
    },
  };
}

// =====================================================================
// 03 SENSING — 방 평면 위 두 센서의 시야
// =====================================================================
function initSense() {
  const svg = $('#planSvg'), M = 100;                 // 1 m = 100
  const RX = 70, RY = 70, RW = 7.2 * M, RD = 4 * M;    // 방: 정면 7.2 m × 깊이 4 m (위 = 정면 벽, 아래 = 관객이 들어오는 쪽)
  const SAFE = .5 * M, HALF = 35.3 * Math.PI / 180, NEAR = .5 * M, FAR = 4.5 * M;
  // 센서: 관객 뒤쪽(아래) 좌 · 우 스탠드, 벽에서 0.6 m, 안쪽으로 35° (studio.js · 현장 확정 전 값)
  const S = [
    { key: 'A', cls: 'a', x: RX + .6 * M, y: RY + RD + 12, yaw: 35 * Math.PI / 180, label: 'A', who: '메인 PC' },
    { key: 'B', cls: 'b', x: RX + RW - .6 * M, y: RY + RD + 12, yaw: -35 * Math.PI / 180, label: 'B', who: '송출 노트북' },
  ];
  const defs = el('defs', {}, svg);
  const cp = el('clipPath', { id: 'roomClip' }, defs); el('rect', { x: RX, y: RY, width: RW, height: RD }, cp);
  for (let x = 0; x <= 7.2; x += .5) el('line', { class: 'grid', x1: RX + x * M, x2: RX + x * M, y1: RY, y2: RY + RD }, svg);
  for (let y = 0; y <= 4; y += .5) el('line', { class: 'grid', x1: RX, x2: RX + RW, y1: RY + y * M, y2: RY + y * M }, svg);
  // 시야 부채꼴 (0.5 – 4.5 m 고리)
  const wedge = (s) => {
    const a0 = s.yaw - HALF, a1 = s.yaw + HALF, pt = (r, a) => `${(s.x + Math.sin(a) * r).toFixed(1)} ${(s.y - Math.cos(a) * r).toFixed(1)}`;
    return `M${pt(NEAR, a0)} L${pt(FAR, a0)} A${FAR} ${FAR} 0 0 1 ${pt(FAR, a1)} L${pt(NEAR, a1)} A${NEAR} ${NEAR} 0 0 0 ${pt(NEAR, a0)} Z`;
  };
  const gF = el('g', { 'clip-path': 'url(#roomClip)' }, svg);
  S.forEach((s) => { s.fov = el('path', { class: 'fov ' + s.cls, d: wedge(s) }, gF); });
  el('rect', { class: 'room', x: RX, y: RY, width: RW, height: RD }, svg);
  el('rect', { class: 'safe', x: RX + SAFE, y: RY + SAFE, width: RW - 2 * SAFE, height: RD - 2 * SAFE }, svg);
  txt(svg, 'wall-t', RX + RW / 2, RY - 16, 'FRONT WALL · 정면 벽');
  txt(svg, 'dim', RX + RW / 2, RY + RD + 52, '7.2 m');
  txt(svg, 'dim', RX + RW + 26, RY + RD / 2, '4 m');
  txt(svg, 'dim', RX + SAFE + 6, RY + SAFE + 18, 'SAFE ZONE', { 'text-anchor': 'start', style: 'fill:#6ff0d8;opacity:.7' });
  const gR = el('g', {}, svg);
  S.forEach((s) => {
    s.ray = el('line', { class: 'ray ' + s.cls, opacity: 0 }, gR);
    const g = el('g', { transform: `translate(${s.x} ${s.y}) rotate(${s.yaw * 180 / Math.PI})` }, svg);
    el('rect', { class: 'sensor', x: -16, y: -6, width: 32, height: 12, rx: 3 }, g);
    txt(svg, 's-t', s.x + (s.key === 'A' ? -46 : 24), s.y + 30, 'KINECT ' + s.label);
    txt(svg, 's-k', s.x + (s.key === 'A' ? -46 : 24), s.y + 48, s.who);
  });
  // 관객 + 놓쳤을 때 남겨 둔 자리
  const held = el('g', { class: 'vis held', opacity: 0 }, svg);
  el('circle', { class: 'vis-dot', r: 9 }, held); txt(held, 'vis-t', 16, -12, 'HELD');
  const vis = el('g', { class: 'vis' }, svg);
  const vRing = el('circle', { class: 'vis-ring', r: 20 }, vis); el('circle', { class: 'vis-dot', r: 6 }, vis);
  const vTag = txt(vis, 'vis-t', 26, -14, 'YOU');
  const ro = { A: $('#roA'), B: $('#roB'), R: $('#roR') };

  const target = { x: RX + RW / 2, y: RY + RD / 2 }, pos = { ...target }, last = { x: 0, y: 0, ok: false };
  let inside = false, lastMove = -1e9, tt = 0;
  const box = $('#planBox');
  const toSvg = (e) => { const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse()); return p; };
  box.addEventListener('pointermove', (e) => { const p = toSvg(e); target.x = p.x; target.y = p.y; inside = true; lastMove = performance.now(); }, { passive: true });
  box.addEventListener('pointerleave', () => { inside = false; });

  const see = (s, x, y) => {
    const dx = (x - s.x) / M, dy = (y - s.y) / M, d = Math.hypot(dx, dy);
    const a = Math.atan2(dx, -dy) - s.yaw, ang = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
    return { ok: d >= .5 && d <= 4.5 && ang <= HALF, d, edge: ang > HALF * .8 || d > 4.1 };
  };
  let lastText = '';
  return {
    update(dt, now) {
      if (!reduced) tt += dt;
      if (!inside && now - lastMove > 2500) {   // 커서가 없으면 관객이 방을 천천히 돈다 — 가장자리 · 사각지대도 지나가게
        target.x = RX + RW / 2 + Math.sin(tt * .31) * (RW / 2 - 15);
        target.y = RY + RD / 2 + Math.sin(tt * .47 + 1.2) * (RD / 2 - 10);
      }
      pos.x = lerp(pos.x, target.x, .12); pos.y = lerp(pos.y, target.y, .12);
      vis.setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`);
      vRing.setAttribute('r', (20 + Math.sin(tt * 3) * 3).toFixed(1));
      const inRoom = pos.x >= RX && pos.x <= RX + RW && pos.y >= RY && pos.y <= RY + RD;
      const inSafe = pos.x >= RX + SAFE && pos.x <= RX + RW - SAFE && pos.y >= RY + SAFE && pos.y <= RY + RD - SAFE;
      const r = S.map((s) => see(s, pos.x, pos.y));
      S.forEach((s, i) => {
        const ok = r[i].ok && inRoom;
        s.fov.classList.toggle('sees', ok);
        s.ray.setAttribute('opacity', ok ? 1 : 0);
        if (ok) { s.ray.setAttribute('x1', s.x); s.ray.setAttribute('y1', s.y); s.ray.setAttribute('x2', pos.x.toFixed(1)); s.ray.setAttribute('y2', pos.y.toFixed(1)); }
      });
      const okA = r[0].ok && inRoom, okB = r[1].ok && inRoom, any = okA || okB;
      if (any) { last.x = pos.x; last.y = pos.y; last.ok = true; }
      vis.classList.toggle('seen', any);
      let res, heldOn = false;
      if (!inRoom) { res = '방 밖 — 장면에 들어가지 않습니다'; last.ok = false; }
      else if (okA && okB) res = '두 시점을 합쳐 한 사람으로';
      else if (any) res = '한 센서의 시야로 이어서 추적';
      else if (inSafe && last.ok) { res = '잠시 놓침 — 세이프존이라 마지막 자리에 둡니다'; heldOn = true; }
      else { res = '가장자리 · 시야 밖 — 잠시 뒤 나간 것으로 처리'; last.ok = false; }
      held.setAttribute('opacity', heldOn ? 1 : 0);
      if (heldOn) held.setAttribute('transform', `translate(${last.x.toFixed(1)} ${last.y.toFixed(1)})`);
      vTag.textContent = heldOn ? 'NOT SEEN' : 'YOU';
      const fmt = (o, ok) => (ok ? `보임 · ${o.d.toFixed(1)} m${o.edge ? ' · 시야 가장자리' : ''}` : '보이지 않음');
      const sA = fmt(r[0], okA), sB = fmt(r[1], okB), key = sA + sB + res;
      if (key !== lastText) {
        lastText = key;
        ro.A.textContent = sA; ro.A.classList.toggle('on', okA);
        ro.B.textContent = sB; ro.B.classList.toggle('on', okB);
        ro.R.textContent = res;
      }
    },
  };
}

// =====================================================================
// 04 OUTPUT — 네 면 전개도
// =====================================================================
function initNet() {
  const svg = $('#netSvg'), K = 64, W = (4 + 7.2 + 4) * K, X = (1200 - W) / 2, Y = 20, H = 4 * K;
  const F = [
    { id: 'left', x: X, y: Y, w: 4 * K, h: H, nm: '좌벽', px: '1200 × 912 px', m: '4 × 4 m', p: 'P3' },
    { id: 'front', x: X + 4 * K, y: Y, w: 7.2 * K, h: H, nm: '정면 벽', px: '1920 × 912 px', m: '7.2 × 4 m', p: 'P1' },
    { id: 'right', x: X + 11.2 * K, y: Y, w: 4 * K, h: H, nm: '우벽', px: '1200 × 912 px', m: '4 × 4 m', p: 'P4' },
    { id: 'floor', x: X + 4 * K, y: Y + H, w: 7.2 * K, h: H, nm: '바닥', px: '1920 × 1200 px', m: '7.2 × 4 m', p: 'P2' },
  ];
  const groups = F.map((f) => {
    const g = el('g', { class: 'face-g' }, svg);
    el('rect', { class: 'face', x: f.x, y: f.y, width: f.w, height: f.h }, g);
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
    txt(g, 'f-p', cx, cy - 34, f.p);
    txt(g, 'f-name', cx, cy, f.nm);
    txt(g, 'f-px', cx, cy + 26, f.px);
    txt(g, 'f-m', cx, cy + 46, f.m);
    g.addEventListener('pointerenter', () => { hover = f.id; show(f.id); });
    g.addEventListener('pointerleave', () => { hover = null; });
    return { f, g };
  });
  // 면과 면이 만나는 이음매 — 블렌딩이 일어나는 자리
  const seams = [[X + 4 * K, Y, X + 4 * K, Y + H], [X + 11.2 * K, Y, X + 11.2 * K, Y + H], [X + 4 * K, Y + H, X + 11.2 * K, Y + H]];
  seams.forEach(([x1, y1, x2, y2]) => el('line', { class: 'seam', x1, y1, x2, y2 }, svg));
  txt(svg, 'f-m', X + 13.2 * K, Y + H + 34, '벽 3면 합계 4320 × 912 px', { style: 'text-anchor:middle' });
  let hover = null, i = 0, acc = 0;
  function show(id) { groups.forEach((o) => { o.g.classList.toggle('on', o.f.id === id); o.g.querySelector('.face').classList.toggle('on', o.f.id === id); }); }
  show(F[1].id);
  return {
    update(dt) {   // 커서가 없으면 2.4초마다 다음 면으로
      if (hover || reduced) return;
      acc += dt; if (acc > 2.4) { acc = 0; i = (i + 1) % F.length; show(F[[1, 3, 0, 2][i]].id); }
    },
  };
}

const path = initPath(), sense = initSense(), net = initNet();
const R = { path: $('#path'), sense: $('#planBox'), net: $('#netBox') };
const inView = (e) => { const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; };

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  sub.lenis.raf(now);
  const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
  sub.frame(t, dt);
  if (inView(R.path)) path.update(reduced ? 0 : t);
  if (inView(R.sense)) sense.update(dt, now);
  if (inView(R.net)) net.update(dt);
}
requestAnimationFrame(frame);
