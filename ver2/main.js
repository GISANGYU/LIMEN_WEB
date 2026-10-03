// LIMEN · Studio — 1) 시연 영상 위 텍스트 시퀀스  2) 블루프린트 도면 → 3D 스튜디오 모델 + 장비 호버
import * as THREE from 'three';
import { buildStudio, INFO, DIM } from './studio.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
window.__lenis = lenis;

/* ===================================================================
   1. VISION — sticky 영상, 스크롤 진행도로 문장이 블러와 함께 바뀐다
   =================================================================== */
const vision = $('#vision'), vTitle = $('#vTitle'), vLines = [...document.querySelectorAll('.v-line')], vPara = $('#vPara');
const paraSpans = [...vPara.querySelectorAll('span')], video = $('#heroVideo'), shade = $('#visionShade');
// [등장 시작, 완전히 보임, 사라지기 시작, 사라짐]
const BEATS = [[0.11, 0.17, 0.25, 0.31], [0.31, 0.37, 0.45, 0.51], [0.51, 0.56, 0.62, 0.67]];
function beat(el, [a, b, c, d], p) {
  const inK = ss(a, b, p), outK = ss(c, d, p), o = inK * (1 - outK);
  el.style.opacity = o.toFixed(3);
  el.style.filter = `blur(${((1 - inK) * 14 + outK * 10).toFixed(1)}px)`;
  el.style.transform = `translateY(calc(-50% + ${((1 - inK) * 30 - outK * 30).toFixed(1)}px))`;
}
function updateVision() {
  const r = vision.getBoundingClientRect(), total = r.height - innerHeight;
  const p = clamp(-r.top / total);
  // 큰 제목: 처음엔 또렷, 스크롤하면 커지며 흐려진다
  const t = ss(0.02, 0.1, p);
  vTitle.style.opacity = (1 - t).toFixed(3);
  vTitle.style.filter = `blur(${(t * 16).toFixed(1)}px)`;
  vTitle.style.transform = `translateY(-50%) scale(${(1 + t * 0.18).toFixed(3)})`;
  vLines.forEach((el, i) => beat(el, BEATS[i], p));
  // 문단: 줄 단위로 차례로 밝아진다
  const pin = ss(0.67, 0.72, p), pout = ss(0.93, 0.98, p);
  vPara.style.opacity = (pin * (1 - pout)).toFixed(3);
  vPara.style.filter = `blur(${((1 - pin) * 12).toFixed(1)}px)`;
  const k = (p - 0.72) / 0.2 * paraSpans.length;
  paraSpans.forEach((s, i) => s.classList.toggle('on', k >= i && k < i + 1.35));
  // 영상: 아주 천천히 다가가고, 끝에서 어두워진다
  video.style.transform = `scale(${(1.04 + p * 0.1).toFixed(4)})`;
  shade.style.background = `radial-gradient(ellipse at 50% 55%, rgba(0,0,0,${(0.12 + p * 0.2).toFixed(3)}), rgba(0,0,0,${(0.55 + p * 0.25).toFixed(3)}))`;
  $('#vScroll').style.opacity = (1 - ss(0.01, 0.05, p)).toFixed(3);
  document.querySelectorAll('.hd-nav a').forEach((a, i) => a.classList.toggle('on', i === (p < 1 ? 0 : 1)));
}

/* ===================================================================
   2. STUDIO — 도면이 그려지고, 같은 카메라의 3D 모델로 바뀐다
   =================================================================== */
const stage = $('#bpStage'), drawEl = $('#bpDraw'), svg = $('#bpSvg'), tagSvg = $('#bpTag'), chip = $('#bpChip');
const canvas = $('#bpCanvas');
const S = buildStudio();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor('#233d70', 1);
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
scene.add(S.root);
scene.add(new THREE.HemisphereLight('#ffffff', '#233d70', 1.6));
const sun = new THREE.DirectionalLight('#ffffff', 1.4); sun.position.set(3, 9, 8); scene.add(sun);
const fill = new THREE.DirectionalLight('#bcd2ff', 0.5); fill.position.set(-6, 3, -2); scene.add(fill);
const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
S.mats.forEach((m) => { m.clippingPlanes = [clip]; m.transparent = true; });

// 모델 위의 얇은 모서리선 (도면의 흔적)
const edgeMat = new THREE.LineBasicMaterial({ color: '#233d70', transparent: true, opacity: 0.35, clippingPlanes: [clip] });
const devEdgeMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, clippingPlanes: [clip] });
const hiEdgeMat = new THREE.LineBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 1, clippingPlanes: [clip] });
S.root.traverse((o) => {
  if (!o.isMesh || o.userData.noEdges) return;
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), o.userData.id ? devEdgeMat : edgeMat);
  e.userData.edgeOf = o; o.add(e); o.userData.edge = e;
});
// 곡면 벽 위 와이어 (SVG 단면선과 같은 자리)
{
  const wire = S.lines.filter((l) => l.cls === 'k-wire' || l.cls === 'k-struct').flatMap((l) => l.pts.slice(1).flatMap((p, i) => [l.pts[i], p]));
  const wm = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: '#233d70', transparent: true, opacity: 0.16, clippingPlanes: [clip] }));
  scene.add(wm);
}

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
const TARGET = new THREE.Vector3(0, 1.55, 1.45);
const view = { az: 30, el: 31, zoom: 1, cx: 0, cy: 0, half: 5 };
let W = 1, Hh = 1;

function placeCamera(az, el) {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el), d = 40;
  camera.position.set(TARGET.x + Math.sin(a) * Math.cos(e) * d, TARGET.y + Math.sin(e) * d, TARGET.z + Math.cos(a) * Math.cos(e) * d);
  camera.up.set(0, 1, 0); camera.lookAt(TARGET);
}
// 방 전체가 그림 영역에 꼭 맞게 정사영 범위를 잡는다 (기준 각도에서 한 번)
function fitCamera() {
  W = drawEl.clientWidth; Hh = drawEl.clientHeight;
  renderer.setSize(W, Hh, false);
  placeCamera(view.az0 ?? 30, 31);
  const asp = W / Hh;
  camera.left = -asp; camera.right = asp; camera.top = 1; camera.bottom = -1; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const { X0, X1, ZB, ZR, H } = DIM, pts = [];
  for (const x of [X0 - 1.1, X1 + 1.9]) for (const y of [0, H + 0.4]) for (const z of [ZB - 1.25, ZR]) pts.push(new THREE.Vector3(x, y, z).project(camera));
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const p of pts) { mnx = Math.min(mnx, p.x * asp); mxx = Math.max(mxx, p.x * asp); mny = Math.min(mny, p.y); mxy = Math.max(mxy, p.y); }
  const padTop = 150 / Hh * 2, padBot = 70 / Hh * 2;          // 위쪽 제목·아래 진행바 자리
  const half = Math.max((mxx - mnx) / 2 / asp / 0.9, (mxy - mny) / (2 - padTop - padBot));
  const cx = (mnx + mxx) / 2, cy = (mny + mxy) / 2 + (padTop - padBot) / 2 * half;
  Object.assign(view, { half, cx, cy });
  setFrustum(1);
}
function setFrustum(zoom) {
  const asp = W / Hh, h = view.half / zoom;
  camera.left = view.cx - h * asp; camera.right = view.cx + h * asp; camera.top = view.cy + h; camera.bottom = view.cy - h;
  camera.updateProjectionMatrix();
}
view.az0 = 30;

/* ---------- SVG 도면 만들기 (현재 카메라로 투영) ---------- */
const NS = 'http://www.w3.org/2000/svg';
let svgPaths = [], svgTexts = [], svgMarks = [], world = null, worldO = [0, 0];
const toScreen = (v) => { const p = v.clone().project(camera); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * Hh]; };
function buildSvg() {
  svg.innerHTML = ''; svg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
  world = document.createElementNS(NS, 'g'); svg.appendChild(world); worldO = toScreen(new THREE.Vector3(0, 0, 1.6));
  const gLines = document.createElementNS(NS, 'g');
  svgPaths = S.lines.map((l) => {
    const d = l.pts.map((p, i) => { const [x, y] = toScreen(p); return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }).join('');
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', d); el.setAttribute('class', l.cls); el.setAttribute('pathLength', '1');
    el.style.strokeDasharray = '1 1'; el.style.strokeDashoffset = '1';
    gLines.appendChild(el); return { el, a: l.a, b: l.b, cls: l.cls, op: l.op, lin: /k-grid/.test(l.cls), last: -1, lastO: -1 };
  });
  world.appendChild(gLines);
  svgTexts = S.texts.map((t) => {
    const [x, y] = toScreen(t.pos), el = document.createElementNS(NS, 'text');
    el.setAttribute('x', x); el.setAttribute('y', y); el.setAttribute('text-anchor', t.cls === 'left' ? 'start' : 'middle'); if (t.cls === 'bub') el.setAttribute('dominant-baseline', 'central'); el.textContent = t.text;
    world.appendChild(el); return { el, a: t.a };
  });
  svgMarks = S.marks.map((m) => {
    const [x, y] = toScreen(m.pos), g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'mark'); g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    g.innerHTML = `<circle r="11"></circle><text>${m.no}</text>`;
    world.appendChild(g); return { el: g, a: m.a };
  });
  lastP = -1;
}

/* ---------- 오른쪽 목록 ---------- */
const list = $('#bpList');
INFO.forEach((it) => {
  const li = document.createElement('li'); li.dataset.id = it.id;
  li.innerHTML = `<span class="no">${it.no}</span><span class="tt">${[...it.title].map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span><span class="ds">${it.lines.map((l) => `<i>${l}</i>`).join('')}</span>`;
  li.addEventListener('mouseenter', () => { if (explore) setActive(it.id, 'list'); });
  li.addEventListener('mouseleave', () => { if (activeFrom === 'list') setActive(null); });
  li.addEventListener('click', () => { if (explore) setActive(it.id, 'list'); });
  list.appendChild(li);
});

/* ---------- 호버 강조 ---------- */
let active = null, activeFrom = null;
function setActive(id, from = 'model') {
  if (id === active) return;
  active = id; activeFrom = id ? from : null;
  document.querySelectorAll('#bpList li').forEach((li) => {
    const on = li.dataset.id === id; li.classList.toggle('on', on);
    if (on) {
      gsap.fromTo(li.querySelectorAll('.tt span'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, stagger: 0.025, ease: 'power3.out' });
      gsap.fromTo(li.querySelectorAll('.ds i'), { opacity: 0, x: -8, filter: 'blur(4px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.08, delay: 0.15 });
    }
  });
  for (const k in S.groups) {
    const on = k === id;
    S.groups[k].helpers.forEach((h) => (h.visible = on));
    S.groups[k].objs.forEach((o) => o.traverse((m) => {
      if (m.isLineSegments && m.userData.edgeOf) m.material = on ? hiEdgeMat : (m.userData.edgeOf.userData.id ? devEdgeMat : edgeMat);
    }));
  }
  drawEl.classList.toggle('hovering', !!id);
  const info = INFO.find((i) => i.id === id);
  chip.classList.toggle('on', !!id);
  if (info) {
    chip.querySelector('span').innerHTML = [...`${info.no}  ${info.title}`].map((c) => `<b>${c === ' ' ? '&nbsp;' : c}</b>`).join('');
    gsap.fromTo(chip.querySelectorAll('b'), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, stagger: 0.018, ease: 'power2.out' });
  }
}
// 강조된 장비는 청록으로 빛나고, 나머지 장비는 살짝 물러난다
function applyHighlight(time) {
  const pulse = 0.55 + 0.25 * Math.sin(time * 4);
  // 재질을 공유하므로 메쉬별로 복제한 강조 재질을 끼운다
  for (const k in S.groups) {
    const on = k === active;
    S.groups[k].objs.forEach((obj) => obj.traverse((m) => {
      if (!m.isMesh) return;
      if (on) {
        if (!m.userData.hiMat) { m.userData.baseMat = m.material; m.userData.hiMat = m.material.clone(); m.userData.hiMat.clippingPlanes = [clip]; m.userData.hiMat.transparent = false; m.userData.hiMat.opacity = 1; }
        m.userData.hiMat.emissive.set('#3fd9c0').multiplyScalar(k === 'space' ? 0.12 : pulse);
        m.material = m.userData.hiMat;
      } else if (m.userData.baseMat) m.material = m.userData.baseMat;
    }));
  }
}

/* ---------- 포인터 ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9), mouse = { nx: 0, ny: 0, x: 0, y: 0, inside: false };
drawEl.addEventListener('pointermove', (e) => {
  const r = drawEl.getBoundingClientRect();
  mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.inside = true;
  ndc.set(mouse.x / r.width * 2 - 1, -(mouse.y / r.height) * 2 + 1);
  mouse.nx = ndc.x; mouse.ny = ndc.y;
});
drawEl.addEventListener('pointerleave', () => { mouse.inside = false; ndc.set(9, 9); if (activeFrom === 'model') setActive(null); });

/* ---------- 스크롤 핀 ---------- */
let bpP = 0, lastP = -1, explore = false;
ScrollTrigger.create({
  trigger: stage, start: 'top top', end: '+=900%', pin: true, scrub: true,
  onUpdate: (st) => { bpP = st.progress; },
});
const PHASES = [
  [0.0, '01', 'GRID · 작도', '격자를 깔고<br>공간의 기준선을 잡는다'],
  [0.22, '02', 'SPACE · 공간', '모서리가 둥글게 이어지는<br>벽 세 면과 바닥 한 면'],
  [0.4, '03', 'DEVICE · 장비', '천장 트러스에 매달린<br>프로젝터 · 조명 · 카메라'],
  [0.58, '04', 'MODEL · 모델', '도면이 그대로<br>입체가 된다'],
  [0.74, '05', 'EXPLORE · 탐색', '장비에 마우스를 올려<br>각자의 역할을 확인하세요'],
];
let phaseIdx = -1;
function setPhase(p) {
  let i = 0; PHASES.forEach((ph, k) => { if (p >= ph[0]) i = k; });
  if (i === phaseIdx) return; phaseIdx = i;
  const [, no, name, cap] = PHASES[i];
  const ph = $('#bpPhase'); ph.querySelector('b').textContent = no; ph.querySelector('span').textContent = name;
  const c = $('#bpCap'); gsap.fromTo(c, { opacity: 0, y: 10, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6 }); c.innerHTML = cap;
  gsap.fromTo(ph, { opacity: 0 }, { opacity: 0.85, duration: 0.4 });
}

function updateDrawing(p) {
  if (Math.abs(p - lastP) < 1e-4) return; lastP = p;
  const svgFade = 1 - ss(0.62, 0.74, p);
  svg.style.opacity = svgFade.toFixed(3);
  for (const s of svgPaths) {
    const k = s.lin ? clamp((p - s.a) / (s.b - s.a)) : ss(s.a, s.b, p);
    if (Math.abs(k - s.last) > 1e-4) { s.el.style.strokeDashoffset = (1 - k).toFixed(4); s.last = k; }
  }
  // 격자는 모델로 넘어가기 전에 먼저 물러난다 (먼 격자일수록 옅다)
  const gridK = 1 - ss(0.5, 0.62, p);
  for (const s of svgPaths) {
    if (!/k-grid|k-construct|k-center/.test(s.cls)) continue;
    const o = s.op * gridK; if (Math.abs(o - s.lastO) > 1e-3) { s.el.style.opacity = o.toFixed(3); s.lastO = o; }
  }
  // 처음엔 크게 확대된 상태에서 제자리로 내려앉는다
  const z = 1 + 1.5 * Math.pow(1 - ss(0.0, 0.18, p), 2);
  const [ox, oy] = worldO;
  world.setAttribute('transform', `translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${z.toFixed(4)}) translate(${(-ox).toFixed(1)} ${(-oy).toFixed(1)})`);
  svgTexts.forEach((t) => t.el.classList.toggle('on', p >= t.a && p < 0.64));
  svgMarks.forEach((m) => m.el.classList.toggle('on', p >= m.a && p < 0.66));
  stage.style.setProperty('--paper', (ss(0.0, 0.05, p) * (1 - ss(0.66, 0.76, p) * 0.6)).toFixed(3));
  $('#bpBar').style.width = (p * 100).toFixed(2) + '%';
  setPhase(p);
}

/* ---------- 루프 ---------- */
const clock = new THREE.Clock();
let camAz = 30, camEl = 31, zoomS = 1;
function frame() {
  requestAnimationFrame(frame);
  const time = clock.getElapsedTime();
  updateVision();
  const p = bpP;
  updateDrawing(p);

  // 모델 등장: 바닥부터 위로 차오른다
  const m = ss(0.58, 0.7, p);
  canvas.style.opacity = ss(0.56, 0.64, p).toFixed(3);
  clip.constant = -0.05 + m * (DIM.H + 0.8);
  const op = 0.35 + 0.65 * ss(0.6, 0.72, p), solid = op > 0.995;
  S.mats.forEach((mt) => { mt.opacity = op; if (mt.transparent === solid) { mt.transparent = !solid; mt.needsUpdate = true; } });

  // 탐색 구간: 카메라가 돌아 입체감을 보여주고, 마우스를 따라 조금씩 움직인다
  explore = p > 0.72 && p < 0.999;
  $('#bpList').classList.toggle('on', p > 0.7);
  const e = ss(0.72, 0.86, p);
  const tAz = 30 - e * 48 + (explore ? mouse.nx * 10 * e : 0), tEl = 31 + e * 4 - (explore ? mouse.ny * 5 * e : 0);
  camAz += (tAz - camAz) * 0.08; camEl += (tEl - camEl) * 0.08;
  zoomS += ((1 + e * 0.12) - zoomS) * 0.08;
  if (p > 0.6) { placeCamera(camAz, camEl); setFrustum(zoomS); }

  // 호버
  if (explore && mouse.inside && activeFrom !== 'list') {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(S.pick, false).find((h) => h.object.userData.id);
    setActive(hit ? hit.object.userData.id : null, 'model');
  } else if (!explore && active) setActive(null);
  applyHighlight(time);

  // 이름표와 지시선
  if (active && explore) {
    const a = S.anchors[active].clone().project(camera), ax = (a.x + 1) / 2 * W, ay = (1 - a.y) / 2 * Hh;
    const cx = activeFrom === 'model' ? mouse.x + 26 : ax + 70, cy = activeFrom === 'model' ? mouse.y - 34 : ay - 60;
    chip.style.transform = `translate(${cx.toFixed(1)}px, ${(cy - 14).toFixed(1)}px)`;
    tagSvg.innerHTML = `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="5"></circle><line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}"></line>`;
  } else tagSvg.innerHTML = '';

  if (p > 0.5) renderer.render(scene, camera);
}

function resize() {
  fitCamera(); camAz = 30; camEl = 31;
  buildSvg(); updateDrawing(bpP);
  tagSvg.setAttribute('viewBox', `0 0 ${W} ${Hh}`);
}
resize();
addEventListener('resize', () => { resize(); ScrollTrigger.refresh(); });
requestAnimationFrame(frame);
window.__bp = { get p() { return bpP; }, S, camera };
