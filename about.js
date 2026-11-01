// LIMEN ABOUT — INDEX(main.js) 와 같은 Lenis · 그라디언트 · 히어로 등장 · 푸터 필름을 쓰고, ABOUT 구간만 여기서 움직인다
//  hero     : monopo gradient (gradient.js) 가 히어로에서 꺼졌다가 마지막 질문에서 다시 차오른다
//  signals  : 흐름선 24줄. 스크롤로 신호(리뷰 · 순위 · 주변)가 하나씩 켜지며 각자의 선이 그쪽으로 휘고 모인다. 민트 선 = 나의 선택
//  field    : ‘자각은 통제가 아니다’ — 커서(관객) 가까운 흐름만 반응하고 전체 흐름은 스스로 움직인다. 커서가 없으면 혼자 돈다
//  name     : LIMEN 을 가로지르는 문턱선 — 위는 흐린 꿈, 아래는 또렷한 현실. 스크롤로 선이 내려온다
//  journey  : 사전 웹사이트 → LUCID DREAM → AWAKE 점선이 차오름 · scenes : 장면 노드를 잇는 흐름선이 그려지고 빛이 지나간다
import { $, $$, clamp, lerp, invLerp, smooth as ss, reduced } from './_shared/js/core.js';
import { initSub } from './sub-common.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
const sub = initSub({ hero: '#top', close: '#question' });

// =====================================================================
// 02 SIGNALS — 흐름선 도면
// =====================================================================
function initSignals() {
  const svg = $('#sigSvg'), W = 1200, H = 640, N = 24, STEP = 15, ME = 15;
  const top = 64, bottom = H - 64;
  const lanesY = Array.from({ length: N }, (_, i) => top + (i * (bottom - top)) / (N - 1));
  // 신호 자리 — 선들이 지나가며 차례로 만나는 세 점
  const NODES = [
    { x: 330, y: 210, key: 'REVIEW', kr: '리뷰와 추천' },
    { x: 640, y: 440, key: 'RANKING', kr: '인기와 순위' },
    { x: 930, y: 270, key: 'OTHERS', kr: '주변의 선택' },
  ];
  const defs = el('defs', {}, svg);
  const rg = el('radialGradient', { id: 'sigHalo' }, defs);
  el('stop', { offset: '0', 'stop-color': '#6ff0d8', 'stop-opacity': '.28' }, rg);
  el('stop', { offset: '1', 'stop-color': '#6ff0d8', 'stop-opacity': '0' }, rg);
  // 왼쪽 출발 눈금 · 오른쪽 도착 눈금 (도면 느낌)
  const gTicks = el('g', {}, svg);
  lanesY.forEach((y) => { el('line', { class: 'tick', x1: -14, x2: -4, y1: y, y2: y }, gTicks); });

  const gHalo = el('g', {}, svg), gLines = el('g', {}, svg), gNodes = el('g', {}, svg);
  const halos = NODES.map((n) => el('circle', { class: 'halo', cx: n.x, cy: n.y, r: 150 }, el('g', { class: 'node' }, gHalo)));
  const order = lanesY.map((_, i) => i).filter((i) => i !== ME).concat(ME);   // 나의 선을 맨 위에
  const paths = [];
  order.forEach((i) => { paths[i] = el('path', { class: 'ln-p' + (i === ME ? ' me' : ''), pathLength: 1 }, gLines); });
  const nodeEls = NODES.map((n) => {
    const g = el('g', { class: 'node', opacity: 0 }, gNodes);
    const ring = el('circle', { class: 'ring', cx: n.x, cy: n.y, r: 14 }, g);
    el('circle', { class: 'core', cx: n.x, cy: n.y, r: 4.5 }, g);
    el('text', { x: n.x + 24, y: n.y - 20 }, g).textContent = n.key;
    el('text', { class: 'kr', x: n.x + 24, y: n.y - 2 }, g).textContent = n.kr;
    return { g, ring };
  });
  const meRing = el('circle', { class: 'me-ring', r: 11 }, svg), meDot = el('circle', { class: 'me-dot', r: 3.5 }, svg);
  const meTag = el('text', { class: 'me-tag' }, svg); meTag.textContent = 'ME';

  // 한 줄의 모양: 신호의 x 를 지나면 그 신호 쪽으로 옮겨 가고(이후에도 유지), 가까이 지날 때는 더 끌린다.
  // 앞 신호에 끌린 위치에서 다음 신호를 만나므로 갈수록 몇 갈래로 모인다
  const yAt = (y0, x, a, t, i) => {
    let y = y0 + Math.sin(x * .011 + t * .7 + i * 1.7) * 2.4;
    for (let k = 0; k < 3; k++) {
      if (a[k] <= 0) continue;
      const n = NODES[k], dy = n.y - y;
      const reach = Math.exp(-(dy * dy) / (2 * 210 * 210));
      const after = 1 / (1 + Math.exp(-(x - n.x) / 42));
      const near = Math.exp(-((x - n.x) ** 2) / (2 * 70 * 70));
      y += dy * a[k] * reach * (.68 * after + .24 * near);
    }
    return y;
  };
  const sigNo = $('#sigNo'), sigName = $('#sigName'), notice = $('#sigNotice'), bar = $('#sigBar'), items = $$('#sigList li');
  const NAMES = ['Each its own way', 'Review', 'Ranking', 'Others'];
  let lastStep = -1, t = 0, prog = 0;
  function draw() {
    const p = prog;
    const drawK = ss(0, .1, p);
    const a = [ss(.14, .32, p), ss(.38, .56, p), ss(.62, .8, p)];
    for (let i = 0; i < N; i++) {
      let d = '';
      for (let x = 0; x <= W; x += STEP) d += (x ? 'L' : 'M') + x + ' ' + yAt(lanesY[i], x, a, t, i).toFixed(1);
      const pth = paths[i];
      pth.setAttribute('d', d);
      pth.style.strokeDasharray = '1';
      pth.style.strokeDashoffset = String(1 - clamp(drawK * 1.4 - (i % 6) * .06));
      if (i !== ME) {
        // 신호에 가까이 붙은 선일수록 밝다
        let pull = 0; for (let k = 0; k < 3; k++) { const dy = NODES[k].y - lanesY[i]; pull = Math.max(pull, a[k] * Math.exp(-(dy * dy) / (2 * 120 * 120))); }
        pth.style.opacity = (.16 + pull * .34).toFixed(3);
      }
    }
    nodeEls.forEach((n, k) => {
      n.g.setAttribute('opacity', a[k].toFixed(3));
      n.ring.setAttribute('r', (14 + (Math.sin(t * 2 + k) * .5 + .5) * 6).toFixed(1));
      halos[k].setAttribute('opacity', (a[k] * .9).toFixed(3));
    });
    // 나의 선 위를 지나가는 점
    const u = (t * .06) % 1, mx = u * W, my = yAt(lanesY[ME], mx, a, t, ME), vis = drawK > .95 ? 1 : 0;
    meDot.setAttribute('cx', mx); meDot.setAttribute('cy', my); meRing.setAttribute('cx', mx); meRing.setAttribute('cy', my);
    meTag.setAttribute('x', mx + 16); meTag.setAttribute('y', my + 4);
    [meDot, meRing, meTag].forEach((n) => n.setAttribute('opacity', vis));

    const step = p < .14 ? 0 : p < .38 ? 1 : p < .62 ? 2 : 3;
    if (step !== lastStep) {
      lastStep = step;
      sigNo.textContent = String(step).padStart(2, '0'); sigName.textContent = NAMES[step];
      items.forEach((li, k) => li.classList.toggle('on', k === step - 1));
    }
    notice.classList.toggle('on', p > .86);
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  }
  return {
    update(p, dt) { prog = p; if (!reduced) t += dt; draw(); },
  };
}

// =====================================================================
// 05 FIELD — 자각은 통제가 아니다
// =====================================================================
function initField() {
  const panel = $('#fieldPanel'), svg = $('#fieldSvg'), W = 1400, H = 560, GAP = 40, LEN = 15;
  const cells = [];
  for (let y = GAP / 2; y < H; y += GAP) for (let x = GAP / 2; x < W; x += GAP) cells.push({ x, y, l: el('line', {}, svg), a: 0, k: 0 });
  const you = el('g', {}, svg);
  const ring = el('circle', { class: 'you-ring', r: 26 }, you), dot = el('circle', { class: 'you-dot', r: 4 }, you);
  const tag = el('text', { class: 'you-tag', x: 34, y: 4 }, you); tag.textContent = 'YOU';
  const target = { x: W * .62, y: H * .55 }, pos = { ...target };
  let lastMove = -1e9, t = 0, inside = false;
  const toLocal = (e) => {
    const r = svg.getBoundingClientRect();
    // preserveAspectRatio slice — 화면 좌표를 viewBox 좌표로
    const s = Math.max(r.width / W, r.height / H), ox = (r.width - W * s) / 2, oy = (r.height - H * s) / 2;
    return { x: (e.clientX - r.left - ox) / s, y: (e.clientY - r.top - oy) / s };
  };
  panel.addEventListener('pointermove', (e) => { const p = toLocal(e); target.x = p.x; target.y = p.y; lastMove = performance.now(); inside = true; }, { passive: true });
  panel.addEventListener('pointerleave', () => { inside = false; });
  const flowAngle = (x, y, tt) => Math.sin(x * .0042 + tt * .35) * .9 + Math.cos(y * .0075 - tt * .27) * .7 + Math.sin((x + y) * .002 + tt * .15) * .5;
  return {
    update(dt, now) {
      if (!reduced) t += dt;
      // 커서가 없으면 혼자 천천히 맴돈다 (모바일 · 처음 볼 때도 관계가 보이게)
      if (!inside && now - lastMove > 2500) { target.x = W * (.6 + Math.sin(t * .23) * .22); target.y = H * (.5 + Math.sin(t * .37) * .28); }
      // 관객도 흐름의 영향을 받는다 — 서 있는 자리의 흐름 방향으로 조금 밀린다
      const fa = flowAngle(pos.x, pos.y, t);
      pos.x = lerp(pos.x, target.x + Math.cos(fa) * 22, .08); pos.y = lerp(pos.y, target.y + Math.sin(fa) * 22, .08);
      you.setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`);
      ring.setAttribute('r', (26 + Math.sin(t * 2.2) * 3).toFixed(1));
      for (const c of cells) {
        const base = flowAngle(c.x, c.y, t);
        const dx = c.x - pos.x, dy = c.y - pos.y, d = Math.hypot(dx, dy);
        const k = Math.exp(-(d * d) / (2 * 120 * 120));   // 관객 둘레만
        // 관객 둘레에서는 흐름이 관객을 감싸 돌도록 접선 방향으로 기운다 — 그러나 바깥은 그대로
        const tang = Math.atan2(dy, dx) + Math.PI / 2;
        let diff = tang - base; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        const ang = base + diff * k * .85;
        c.k = lerp(c.k, k, .15);
        const len = LEN * (1 + c.k * .5), hx = Math.cos(ang) * len / 2, hy = Math.sin(ang) * len / 2;
        c.l.setAttribute('x1', (c.x - hx).toFixed(1)); c.l.setAttribute('y1', (c.y - hy).toFixed(1));
        c.l.setAttribute('x2', (c.x + hx).toFixed(1)); c.l.setAttribute('y2', (c.y + hy).toFixed(1));
        const m = c.k;
        c.l.setAttribute('stroke', m > .25 ? `rgba(111,240,216,${(.35 + m * .65).toFixed(2)})` : `rgba(255,255,255,${(.16 + m * .5).toFixed(2)})`);
        c.l.setAttribute('stroke-width', (1 + m * .8).toFixed(2));
      }
    },
  };
}

// =====================================================================
// 08 SCENES — 장면 노드를 잇는 흐름선
// =====================================================================
function initScenes() {
  const flow = $('#scFlow'), lis = $$('#scList li'), n = lis.length;
  const pts = lis.map((li, i) => ({ x: 4 + (i * 92) / (n - 1), y: +li.dataset.y }));
  // 위쪽 마루의 장면은 이름을 점 위에, 골의 장면은 점 아래에 — 곡선과 글자가 겹치지 않게
  lis.forEach((li, i) => { li.style.left = pts[i].x + '%'; li.style.top = pts[i].y + '%'; li.classList.toggle('up', pts[i].y < 45); });
  // 노드를 지나는 부드러운 곡선 (viewBox 1000×200, % → 좌표)
  const P = pts.map((p) => [p.x * 10, p.y * 2]);
  let d = `M0 ${P[0][1]} L${P[0][0]} ${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, y0] = P[i], [x1, y1] = P[i + 1], mx = (x0 + x1) / 2;
    d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  d += ` L1000 ${P[P.length - 1][1]}`;
  ['#scTrack', '#scLine', '#scPulse'].forEach((s) => $(s).setAttribute('d', d));
  const line = $('#scLine');
  lis.forEach((li) => {
    li.addEventListener('pointerenter', () => li.classList.add('peek'));
    li.addEventListener('pointerleave', () => li.classList.remove('peek'));
  });
  return {
    update(p) {
      line.style.strokeDashoffset = String(1 - p);
      lis.forEach((li, i) => li.classList.toggle('on', p >= (pts[i].x / 100) * .98 || p > .99));
      flow.classList.toggle('is-drawn', p > .99);
    },
  };
}

const signals = initSignals(), field = initField(), scenes = initScenes();
const S = { sig: $('#signals'), drift: $('#perspective'), lucid: $('#lucid'), field: $('#fieldPanel'), img: $('.lucid-img img'),
  name: $('#nameStage'), jr: $('#jrList'), sc: $('#scFlow') };
const driftRows = $$('.drift-row'), jrItems = $$('.jr');
const rect = (e) => e.getBoundingClientRect();
const inView = (r, m = 0) => r.bottom > -m && r.top < innerHeight + m;

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  sub.lenis.raf(now);
  const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); last = now; const vh = innerHeight;

  sub.frame(t, dt);

  // signals — 고정 구간 진행률
  const rS = rect(S.sig);
  if (inView(rS)) signals.update(clamp(-rS.top / (rS.height - vh)), dt);

  // das Man — 뒤의 말이 서로 반대로 흘러간다
  const rD = rect(S.drift);
  if (inView(rD) && !reduced) { const k = (vh - rD.top) / (rD.height + vh); driftRows.forEach((r) => { r.style.transform = `translateX(${(+r.dataset.dir * (k - .5) * 30 - 20).toFixed(2)}%)`; }); }

  // lucid 이미지 — 살짝 늦게 따라오는 시차
  const rI = rect(S.img);
  if (inView(rI) && !reduced) S.img.style.setProperty('--py', `${clamp((vh / 2 - (rI.top + rI.height / 2)) * .06, -30, 30).toFixed(1)}px`);
  if (inView(rect(S.field), 100)) field.update(dt, now);

  // name — 문턱선이 화면을 지나며 30% → 66% 로 내려온다
  const rN = rect(S.name);
  if (inView(rN)) S.name.style.setProperty('--cut', `${(30 + ss(vh, vh * .2, rN.top) * 36).toFixed(2)}%`);

  // journey — 점선이 차오르고 지나간 지점이 켜진다
  const rJ = rect(S.jr);
  if (inView(rJ)) {
    const k = reduced ? 1 : clamp(invLerp(vh * .85, vh * .3, rJ.top));
    S.jr.style.setProperty('--jr', k.toFixed(3));
    jrItems.forEach((li, i) => li.classList.toggle('on', i === 0 || k >= i / (jrItems.length - 1) - .02));
  }

  // scenes — 흐름선이 그려지며 장면이 차례로 켜진다
  const rSc = rect(S.sc);
  if (inView(rSc)) scenes.update(reduced ? 1 : clamp(invLerp(vh * .9, vh * .25, rSc.top)));
}
requestAnimationFrame(frame);
