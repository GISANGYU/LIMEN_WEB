// 04 SPACE — 호라이즌 스튜디오 도면.
//  스크롤: 격자 → 곡면 벽 → 치수 → 장비 선이 SVG 로 그려지고(LIMEN_WEB ver1 studio · ver2 limen_launch),
//          같은 카메라의 three.js 모델이 아래에서 차올라 도면과 겹친다.
//  포커스: 이어서 스크롤마다 장비 01 → 06 을 하나씩 비추며 카메라가 다가가고 설명이 붙는다 (10-23: 호버 대신 스크롤 순서).
//          영상: 01 프로젝터에서 P1~P4 차례마다 그 프로젝터가 맡은 면에만 켜지고, 02 4면 투사 공간에서 네 면이 한꺼번에 켜진다.
// 06_index_v03/js/space.js 를 DRIFT 에 맞게 옮김 — util.js 대신 core.js, 마우스 호버 · 커서 요소 없음,
// 단계 표시는 monopo 식 큰 번호(01/05), 진행도는 main.js 프레임 루프에서 받는다.
import * as THREE from 'three';
import { $, $$, clamp, smooth as ss } from './_shared/js/core.js';
import { buildStudio, INFO, DIM, ULEN } from './studio.js';

const PHASES = [
  [0.0, 'Grid'],
  [0.22, 'Space'],
  [0.4, 'Device'],
  [0.58, 'Model'],
  [0.74, 'Focus'],
];
// 전체 진행도 P 를 나눈다: DRAW_END 까지 = 도면(기존 타임라인 d 0 → D_MAX), FOCUS_A~FOCUS_B = 장비 7개를 차례로 포커스
const DRAW_END = 0.42, FOCUS_A = 0.45, FOCUS_B = 0.97, D_MAX = 0.74;

// 곡면 벽 · 바닥에 영상 투사 (정면 구간에 원본, 좌우 벽은 정면 가장자리를 거울처럼 이어 붙임)
const PROJ_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uOn, uA, uB, uFloor, uL, uF, uR;   // uL · uF · uR = 좌벽 · 정면 · 우벽 각각의 밝기
void main() {
  vec2 t;
  float k = 1.0;
  if (uFloor > 0.5) { t = vec2(vUv.x, 1.0 - vUv.y); k = 1.0; }   // 바닥은 uOn 만
  else {
    float fu = (vUv.x - uA) / (uB - uA);
    if (fu < 0.0) { fu = -fu * (uB - uA) / uA * 0.5; k = 1.1 * uL; }
    else if (fu > 1.0) { fu = 1.0 - (fu - 1.0) * (uB - uA) / (1.0 - uB) * 0.5; k = 1.1 * uR; }
    else k = uF;
    t = vec2(clamp(fu, 0.0, 1.0), vUv.y);
  }
  gl_FragColor = vec4(texture2D(uTex, t).rgb * k * uOn, 1.0);
}`;

export function initSpace() {
  const section = $('#space'), stage = $('#spStage'), drawEl = $('#spDraw'), svg = $('#spSvg'), tagSvg = $('#spTag'), chip = $('#spChip');
  const canvas = $('#spCanvas'), video = $('#spVideo');
  const S = buildStudio();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.add(S.root);
  scene.add(new THREE.HemisphereLight('#c9d6ee', '#05070c', 1.4));
  const sun = new THREE.DirectionalLight('#eef2fa', 1.25); sun.position.set(3, 9, 8); scene.add(sun);
  const fill = new THREE.DirectionalLight('#6ff0d8', 0.3); fill.position.set(-6, 3, -2); scene.add(fill);
  // 모델은 바닥에서 위로 차오른다 (y 클리핑)
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  S.mats.forEach((m) => { m.clippingPlanes = [clip]; m.transparent = true; });

  const edgeMat = new THREE.LineBasicMaterial({ color: '#cfd5e3', transparent: true, opacity: 0.2, clippingPlanes: [clip] });
  const devEdgeMat = new THREE.LineBasicMaterial({ color: '#eef1f7', transparent: true, opacity: 0.55, clippingPlanes: [clip] });
  const hiEdgeMat = new THREE.LineBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 1, clippingPlanes: [clip] });
  const trussEdgeMat = new THREE.LineBasicMaterial({ color: '#cfd5e3', transparent: true, opacity: 0.2, clippingPlanes: [clip] });
  S.root.traverse((o) => {
    if (!o.isMesh || o.userData.noEdges) return;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), o.material === S.trussGrid ? trussEdgeMat : o.userData.id ? devEdgeMat : edgeMat);
    e.userData.edgeOf = o; o.add(e);
  });
  {
    const wire = S.lines.filter((l) => l.cls === 'k-wire' || l.cls === 'k-struct').flatMap((l) => l.pts.slice(1).flatMap((p, i) => [l.pts[i], p]));
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: '#cfd5e3', transparent: true, opacity: 0.12, clippingPlanes: [clip] })));
  }

  // ---- 4면 투사 ----
  const vtex = new THREE.VideoTexture(video); vtex.colorSpace = THREE.SRGBColorSpace;
  const { X0, X1, ZB, ZF, RC } = DIM;
  const segA = (ZF - (ZB + RC)) + Math.PI / 2 * RC, segF = (X1 - RC) - (X0 + RC);
  const projVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  const projMat = (floor) => new THREE.ShaderMaterial({
    vertexShader: projVert, fragmentShader: PROJ_FRAG, side: floor ? THREE.DoubleSide : THREE.FrontSide, transparent: true, depthWrite: false,   // 바닥 도형은 법선이 아래라 양면으로
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, clippingPlanes: [clip],
    uniforms: { uTex: { value: vtex }, uOn: { value: 0 }, uA: { value: segA / ULEN }, uB: { value: (segA + segF) / ULEN }, uFloor: { value: floor ? 1 : 0 }, uL: { value: 0 }, uF: { value: 0 }, uR: { value: 0 } },
  });
  const wallProj = new THREE.Mesh(S.cycMesh.geometry, projMat(false));
  const fg = S.floor.geometry.clone(), fp = fg.attributes.position, fuv = new Float32Array(fp.count * 2);
  for (let i = 0; i < fp.count; i++) { fuv[i * 2] = (fp.getX(i) - X0) / (X1 - X0); fuv[i * 2 + 1] = (fp.getZ(i) - ZB) / (ZF - ZB); }
  fg.setAttribute('uv', new THREE.BufferAttribute(fuv, 2));
  const floorProj = new THREE.Mesh(fg, projMat(true)); floorProj.position.y = 0.004;
  scene.add(wallProj, floorProj);

  // ---- 정사영 카메라 (SVG 와 모델이 같은 투영을 쓴다) ----
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const TARGET = new THREE.Vector3(0, 1.55, 1.45);
  const view = { half: 5, cx: 0, cy: 0 };
  let W = 1, Hh = 1;
  function placeCamera(az, el) {
    const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el), d = 40;
    camera.position.set(TARGET.x + Math.sin(a) * Math.cos(e) * d, TARGET.y + Math.sin(e) * d, TARGET.z + Math.cos(a) * Math.cos(e) * d);
    camera.up.set(0, 1, 0); camera.lookAt(TARGET);
  }
  function fitCamera() {
    W = drawEl.clientWidth; Hh = drawEl.clientHeight;
    renderer.setSize(W, Hh, false);
    placeCamera(30, 31);
    const asp = W / Hh;
    camera.left = -asp; camera.right = asp; camera.top = 1; camera.bottom = -1; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const { ZR, H } = DIM, pts = [];
    for (const x of [X0 - 1.1, X1 + 1.9]) for (const y of [0, H + 0.4]) for (const z of [ZB - 1.25, ZR]) pts.push(new THREE.Vector3(x, y, z).project(camera));
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    for (const p of pts) { mnx = Math.min(mnx, p.x * asp); mxx = Math.max(mxx, p.x * asp); mny = Math.min(mny, p.y); mxy = Math.max(mxy, p.y); }
    const padTop = Math.min(240, Hh * .26) / Hh * 2, padBot = 110 / Hh * 2;
    const half = Math.max((mxx - mnx) / 2 / asp / 0.9, (mxy - mny) / (2 - padTop - padBot));
    Object.assign(view, { half, cx: (mnx + mxx) / 2 - 0.04 * half, cy: (mny + mxy) / 2 + (padTop - padBot) / 2 * half });
    setFrustum(1);
  }
  function setFrustum(zoom, ox = 0, oy = 0) {
    const asp = W / Hh, h = view.half / zoom, cx = view.cx + ox, cy = view.cy + oy;
    camera.left = cx - h * asp; camera.right = cx + h * asp; camera.top = cy + h; camera.bottom = cy - h;
    camera.updateProjectionMatrix();
  }

  // ---- SVG 도면 ----
  const NS = 'http://www.w3.org/2000/svg';
  let svgPaths = [], svgTexts = [], svgMarks = [], world = null, worldO = [0, 0], lastP = -1;
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
      el.setAttribute('x', x); el.setAttribute('y', y); el.setAttribute('text-anchor', t.cls === 'left' ? 'start' : 'middle');
      if (t.cls === 'bub') el.setAttribute('dominant-baseline', 'central');
      el.textContent = t.text; world.appendChild(el); return { el, a: t.a };
    });
    svgMarks = S.marks.map((m) => {
      const [x, y] = toScreen(m.pos), g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'mark'); g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      g.innerHTML = `<circle r="11"></circle><text>${m.no}</text>`;
      world.appendChild(g); return { el: g, a: m.a };
    });
    lastP = -1;
  }

  // ---- 관객: 정면 실루엣(people-drafts 01) — 카메라를 늘 향하는 SVG. 05 관객 차례엔 실루엣이 옅어지고
  //      키넥트가 읽는 관절 점 + 뼈대(people-drafts 08)가 민트로 겹친다
  // 키 100 단위 · 발끝 y=100 · 가운데 x=0. 오른쪽 반쪽 곡선을 좌우로 접는다
  const RIGHT = [   // [c1x,c1y, c2x,c2y, x,y] — 시작점 (2.2, 12.4) 목 오른쪽
    [2.3, 14.2, 3.4, 15.6, 6, 16.3], [9, 17, 10.8, 17.6, 11.3, 19.8],
    [12, 24, 12.4, 30, 12.6, 35], [12.8, 40, 13, 44, 12.8, 48],
    [12.7, 51, 11.6, 52.6, 10.7, 51.6], [10.1, 50.8, 10.3, 48, 10.4, 46],
    [10.5, 41, 10, 36, 9.6, 31], [9.3, 27, 8.9, 24, 8.4, 22.5],
    [8.2, 27, 7.2, 32, 7, 36.5], [6.9, 40, 8.6, 43, 8.9, 47],
    [9.2, 53, 8.6, 62, 7.4, 70], [6.6, 76, 6, 84, 5, 92],
    [4.8, 94.5, 5.2, 96.5, 6.6, 98], [7.4, 99, 7, 100, 5.6, 100],
    [4.5, 100, 3.4, 100, 2.4, 100], [1.6, 100, 1.4, 98.8, 1.6, 96.5],
    [1.9, 90, 1.4, 82, 1.6, 74], [1.7, 66, 1.2, 57, 0.8, 51.5], [0.5, 50.6, 0.2, 50.4, 0, 50.4],
  ];
  const SIL = (() => {
    let d = 'M 5.1 6.3 A 5.1 6.3 0 1 1 -5.1 6.3 A 5.1 6.3 0 1 1 5.1 6.3 Z M 2.2 12.4 ' + RIGHT.map((c) => `C ${c.join(' ')}`).join(' ');
    const pts = [[2.2, 12.4], ...RIGHT.map((c) => [c[4], c[5]])];
    for (let k = RIGHT.length - 1; k >= 0; k--) { const c = RIGHT[k], q = pts[k]; d += ` C ${-c[2]} ${c[3]} ${-c[0]} ${c[1]} ${-q[0]} ${q[1]}`; }
    return d + ' C -1.4 13.4 1.4 13.4 2.2 12.4 Z';
  })();
  // 키넥트 관절 (서 있는 자세, 실루엣에 맞춘 자리)
  const J = { neck: [0, 15], spine: [0, 30], base: [0, 46], sh: [[-9.5, 18.5], [9.5, 18.5]], el: [[-11.2, 33], [11.2, 33]], wr: [[-11.6, 47], [11.6, 47]],
    hip: [[-6, 49], [6, 49]], kn: [[-5.6, 72], [5.6, 72]], an: [[-4.8, 95], [4.8, 95]], ft: [[-5.6, 99], [5.6, 99]] };
  const BONES = [[J.neck, J.spine], [J.spine, J.base], [J.sh[0], J.sh[1]], [J.hip[0], J.hip[1]],
    ...[0, 1].flatMap((k) => [[J.sh[k], J.el[k]], [J.el[k], J.wr[k]], [J.hip[k], J.kn[k]], [J.kn[k], J.an[k]], [J.an[k], J.ft[k]]])];
  const JOINTS = [J.neck, J.spine, J.base, ...J.sh, ...J.el, ...J.wr, ...J.hip, ...J.kn, ...J.an];
  // 관객 차례에 발끝 → 머리 순으로 시간차를 두고 켜진다 (전체 1초: 지연 0~0.7s + 각 0.3s 페이드)
  const dl = (y) => `style="--d:${((100 - y) / 100 * 0.7).toFixed(3)}s"`;
  const SKEL = BONES.map(([a, b]) => `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" ${dl(Math.max(a[1], b[1]))}></line>`).join('')
    + JOINTS.map((q) => `<circle cx="${q[0]}" cy="${q[1]}" r="1.5" ${dl(q[1])}></circle>`).join('') + `<circle class="hd" cx="0" cy="6.5" r="5" ${dl(1.5)}></circle>`;
  const peopleSvg = document.createElementNS(NS, 'svg'); peopleSvg.setAttribute('class', 'sp-people'); peopleSvg.setAttribute('aria-hidden', 'true');
  canvas.after(peopleSvg);
  const people = S.visitors.map((v) => {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<ellipse cx="0" cy="100" rx="12" ry="2.6"></ellipse><path class="body" d="${SIL}"></path><g class="skel">${SKEL}</g>`; peopleSvg.appendChild(g);
    return { ...v, g };
  });
  function drawPeople(op) {
    peopleSvg.style.opacity = (op > 0.36 ? ss(0.4, 0.9, op) : 0).toFixed(3);
    peopleSvg.classList.toggle('on', active === 'visitor');
    if (op <= 0.36) return;
    for (const v of people) {
      const [fx, fy] = toScreen(_p.set(v.x, 0, v.z)), [, hy] = toScreen(_p.set(v.x, 1.72 * v.s, v.z));
      const k = Math.max(0.01, fy - hy) / 100;
      v.g.setAttribute('transform', `translate(${fx.toFixed(1)} ${hy.toFixed(1)}) scale(${k.toFixed(4)})`);
    }
  }
  const _p = new THREE.Vector3();

  // 장비 id 의 포커스 차례로 스크롤 (목록 클릭 · 모델 클릭 공용) — 그 차례에서 카메라가 다가가고 설명 칩이 붙는다
  function goTo(id) {
    const lenis = window.__app && window.__app.lenis, i = INFO.findIndex((it) => it.id === id); if (!lenis || i < 0) return;
    const run = section.offsetHeight - innerHeight, P = FOCUS_A + (FOCUS_B - FOCUS_A) * (i + 0.5) / INFO.length;
    lenis.scrollTo(section.offsetTop + run * P, { duration: 1.2 });
  }

  // ---- 모델 드래그 회전 · 클릭 확대 (모델이 보이는 동안만) ----
  // 드래그: 스크롤이 정하는 각도 위에 사용자 회전을 더한다(좌우 = 방위, 위아래 = 내려다보는 각). 5px 안쪽으로 움직이고 떼면 클릭
  let userAz = 0, userEl = 0, drag = null, modelOn = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickAt(cx, cy) {
    // 관객은 SVG 실루엣이라 화면 상자로, 나머지는 3D 메시로 고른다
    for (const v of people) { const r = v.g.getBoundingClientRect(); if (cx >= r.left - 4 && cx <= r.right + 4 && cy >= r.top && cy <= r.bottom) return 'visitor'; }
    const r = canvas.getBoundingClientRect();
    ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(S.pick, false).find((h) => h.object.visible);
    return hit ? hit.object.userData.id : null;
  }
  drawEl.addEventListener('pointerdown', (e) => {
    if (!modelOn || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, az: userAz, el: userEl, moved: false };
    drawEl.setPointerCapture(e.pointerId);
  });
  drawEl.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; drawEl.classList.add('is-dragging'); }
      // 좌우 = 방위, 위아래 = 내려다보는 각(12°~62°)
      if (drag.moved) { userAz = drag.az - dx * 0.25; userEl = Math.min(62, Math.max(12, 31 + drag.el + dy * 0.15)) - 31; }
      return;
    }
    if (modelOn) drawEl.classList.toggle('is-pick', !!pickAt(e.clientX, e.clientY));
  });
  const endDrag = (e) => {
    if (!drag) return;
    const click = !drag.moved; drag = null; drawEl.classList.remove('is-dragging');
    if (click) { const id = pickAt(e.clientX, e.clientY); if (id) goTo(id); }
  };
  drawEl.addEventListener('pointerup', endDrag);
  drawEl.addEventListener('pointercancel', () => { drag = null; drawEl.classList.remove('is-dragging'); });

  // ---- 오른쪽 장비 목록 — 클릭하면 그 장비 차례로 스크롤 ----
  const list = $('#spList');
  INFO.forEach((it, i) => {
    const li = document.createElement('li'); li.dataset.id = it.id;
    li.innerHTML = `<span class="no">${it.no}</span><span class="tt">${[...it.title].map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span><span class="ds">${it.lines.map((l) => `<i>${l}</i>`).join('')}</span>`;
    li.addEventListener('click', () => goTo(it.id));
    list.appendChild(li);
  });

  // ---- 포커스 강조 ----
  let active = null, projSub = -1;   // projSub: 01 프로젝터 구간 안의 차례 — 0 P1 정면 · 1 P2 바닥 · 2 P3+P4 좌·우벽(같은 출력·투사 크기라 한 번에)
  const PROJ_STEPS = [[0], [1], [2, 3]], STEP_NAME = ['P1 · 정면 벽', 'P2 · 바닥', 'P3 · P4 · 좌 · 우벽'], STEP_FACE = ['F', 'B', 'LR'];
  const chipSub = chip.querySelector('.c-s');
  // 06 운영 데스크: 메인 PC · 송출 PC 두 대에 카드를 하나씩 → 두 번째 칩
  const chipB = chip.cloneNode(true); chipB.id = 'spChipB'; drawEl.appendChild(chipB);
  const fillChip = (el, no, title, lines) => {
    el.querySelector('.c-n').textContent = no;
    el.querySelector('.c-t').innerHTML = [...title].map((c) => `<b>${c === ' ' ? '&nbsp;' : c}</b>`).join('');
    el.querySelector('.c-d').innerHTML = lines.map((l) => `<i>${l}</i>`).join('');
    if (window.gsap) {
      gsap.fromTo(el, { y: 12 }, { y: 0, duration: 0.5, ease: 'power3.out' });   // opacity 는 .on 클래스가 맡는다(인라인으로 남기면 안 꺼짐)
      gsap.fromTo(el.querySelectorAll('.c-t b'), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, stagger: 0.02, ease: 'power2.out', delay: 0.1 });
      gsap.fromTo(el.querySelectorAll('.c-d i'), { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.45, stagger: 0.07, delay: 0.2 });
    }
  };
  function setActive(id) {
    if (id === active) return;
    active = id;
    $$('li', list).forEach((li) => {
      const on = li.dataset.id === id; li.classList.toggle('on', on);
      if (on && window.gsap) {
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
    const info = INFO.find((i) => i.id === id);
    chip.classList.toggle('on', !!id);
    chipB.classList.toggle('on', !!(info && info.subs));
    if (info && info.subs) { fillChip(chip, info.subs[0].no, info.subs[0].title, info.subs[0].lines); fillChip(chipB, info.subs[1].no, info.subs[1].title, info.subs[1].lines); }
    else if (info) fillChip(chip, info.no, info.title, info.lines);
    // 01 프로젝터에 들어오면 장면을 처음부터 — 02 4면 투사 공간까지 끊기지 않고 이어서 재생
    if (id === 'projector') { try { video.currentTime = 0; } catch (err) { /* 메타데이터 전 */ } }
  }
  // 01 프로젝터: 지금 차례인 프로젝터만 투사선 · 면을 진하게, 나머지는 흐린 선만
  function setProjSub(i) {
    if (i === projSub) return; projSub = i;
    S.projHelp.forEach((ph, k) => {
      const cur = i >= 0 && PROJ_STEPS[i].includes(k);
      ph.frustum.material.opacity = cur ? 0.9 : 0.1;
      ph.face.visible = active === 'projector' && cur;
    });
    chipSub.classList.toggle('on', i >= 0);
    if (i >= 0) {
      chipSub.innerHTML = `<u>${PROJ_STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</u><span>${STEP_NAME[i]}</span>`;
      if (window.gsap) gsap.fromTo(chipSub.lastElementChild, { opacity: 0, x: -6 }, { opacity: 1, x: 0, duration: 0.4 });
    }
  }
  function applyHighlight(time) {
    const pulse = 0.55 + 0.25 * Math.sin(time * 4);
    for (const k in S.groups) {
      const on = k === active;
      S.groups[k].objs.forEach((obj, oi) => obj.traverse((m) => {
        if (!m.isMesh) return;
        if (on && (k !== 'projector' || (projSub >= 0 && PROJ_STEPS[projSub].includes(oi)))) {
          if (!m.userData.hiMat) { m.userData.baseMat = m.material; m.userData.hiMat = m.material.clone(); m.userData.hiMat.clippingPlanes = [clip]; m.userData.hiMat.transparent = false; m.userData.hiMat.opacity = 1; }
          m.userData.hiMat.emissive.set('#3fd9c0').multiplyScalar(k === 'space' ? 0.025 : pulse);
          m.material = m.userData.hiMat;
        } else if (m.userData.baseMat) m.material = m.userData.baseMat;
      }));
    }
  }

  // ---- 단계 표시 (monopo 식 큰 번호) ----
  let phaseIdx = -1;
  const phNo = $('#spNo'), phName = $('#spPhaseName');
  function setPhase(i) {
    if (i === phaseIdx) return; phaseIdx = i;
    phNo.textContent = String(i + 1).padStart(2, '0'); phName.textContent = PHASES[i][1];
    if (window.gsap) {
      gsap.fromTo(phNo, { yPercent: 100 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' });
    }
  }

  function updateDrawing(p) {
    if (Math.abs(p - lastP) < 1e-4) return; lastP = p;
    svg.style.opacity = (1 - ss(0.62, 0.74, p)).toFixed(3);
    for (const s of svgPaths) {
      const k = s.lin ? clamp((p - s.a) / (s.b - s.a)) : ss(s.a, s.b, p);
      if (Math.abs(k - s.last) > 1e-4) { s.el.style.strokeDashoffset = (1 - k).toFixed(4); s.last = k; }
    }
    const gridK = 1 - ss(0.5, 0.62, p);
    for (const s of svgPaths) {
      if (!/k-grid|k-construct|k-center/.test(s.cls)) continue;
      const o = s.op * gridK; if (Math.abs(o - s.lastO) > 1e-3) { s.el.style.opacity = o.toFixed(3); s.lastO = o; }
    }
    // 처음엔 크게 확대된 상태에서 빠져나온다
    const z = 1 + 1.5 * Math.pow(1 - ss(0.0, 0.18, p), 2);
    const [ox, oy] = worldO;
    world.setAttribute('transform', `translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${z.toFixed(4)}) translate(${(-ox).toFixed(1)} ${(-oy).toFixed(1)})`);
    svgTexts.forEach((t) => t.el.classList.toggle('on', p >= t.a && p < 0.64));
    svgMarks.forEach((m) => m.el.classList.toggle('on', p >= m.a && p < 0.66));
    stage.style.setProperty('--paper', (ss(0.0, 0.05, p) * (1 - ss(0.66, 0.76, p) * 0.6)).toFixed(3));
  }

  const t0 = performance.now(), _v = new THREE.Vector3();
  let camAz = 30, camEl = 31, zoomS = 1, offX = 0, offY = 0;
  const faceOn = { F: 0, B: 0, L: 0, R: 0 };   // 정면 · 바닥 · 좌벽 · 우벽 영상 밝기 (P1 · P2 · P3 · P4 가 맡는 면)
  function update(P) {
    const time = (performance.now() - t0) / 1000;
    const p = clamp(P / DRAW_END) * D_MAX;                      // 도면 타임라인
    modelOn = p > 0.62; drawEl.classList.toggle('is-model', modelOn);
    const f = clamp((P - FOCUS_A) / (FOCUS_B - FOCUS_A));         // 포커스 진행
    const focusing = P >= FOCUS_A && P < 0.995;
    const idx = focusing ? Math.min(INFO.length - 1, Math.floor(f * INFO.length)) : -1;

    updateDrawing(p);
    let ph = 0; PHASES.forEach((x, k) => { if (p >= x[0]) ph = k; });
    setPhase(focusing ? PHASES.length - 1 : Math.min(ph, PHASES.length - 2));
    $('#spBar').style.transform = `scaleX(${P.toFixed(4)})`;
    const m = ss(0.58, 0.7, p);
    canvas.style.opacity = ss(0.56, 0.64, p).toFixed(3);
    clip.constant = -0.05 + m * (DIM.H + 0.8);
    const op = 0.35 + 0.65 * ss(0.6, 0.72, p), solid = op > 0.995;
    S.mats.forEach((mt) => { mt.opacity = op; if (mt.transparent === solid) { mt.transparent = !solid; mt.needsUpdate = true; } });
    // 천장 철골: 01 프로젝터 포커스부터 끝까지 반투명 — 장비가 가려지지 않게
    const see = ss(FOCUS_A - 0.015, FOCUS_A + 0.01, P), tg = S.trussGrid;
    tg.opacity = op * (1 - 0.82 * see); tg.depthWrite = see < 0.5;
    if (!tg.transparent && see > 0) { tg.transparent = true; tg.needsUpdate = true; }
    trussEdgeMat.opacity = 0.2 * (1 - 0.6 * see);

    setActive(idx >= 0 ? INFO[idx].id : null);
    const local = f * INFO.length - idx;                           // 지금 장비 구간 안의 진행 0~1
    setProjSub(active === 'projector' ? Math.min(2, Math.floor(local * 3)) : -1);
    list.classList.toggle('on', P > FOCUS_A - 0.02);
    stage.classList.toggle('is-focus', focusing);

    // 영상: 프로젝터 차례면 그 대가 맡은 면만, 4면 투사 공간이면 네 면 모두
    const want = active === 'space' ? 'FBLR' : active === 'projector' && projSub >= 0 ? STEP_FACE[projSub] : '';
    for (const k in faceOn) faceOn[k] += ((want.includes(k) ? 1 : 0) - faceOn[k]) * 0.07;
    const wu = wallProj.material.uniforms;
    wu.uOn.value = 1.1; wu.uF.value = faceOn.F; wu.uL.value = faceOn.L; wu.uR.value = faceOn.R;
    floorProj.material.uniforms.uOn.value = faceOn.B;
    const anyOn = Math.max(faceOn.F, faceOn.B, faceOn.L, faceOn.R) > 0.01;
    wallProj.visible = Math.max(faceOn.F, faceOn.L, faceOn.R) > 0.01; floorProj.visible = faceOn.B > 0.01;
    if (anyOn) { if (video.paused) video.play().catch(() => {}); } else if (!video.paused) video.pause();

    // 카메라: 포커스 동안 천천히 돌아가며, 포커스된 장비 쪽으로 화면 중심을 옮기고 다가간다
    const e = P >= FOCUS_A ? ss(0, 1, f) : 0;
    camAz += ((30 - e * 48 + userAz) - camAz) * 0.08; camEl += ((31 + e * 4 + userEl) - camEl) * 0.08;   // + 사용자 드래그 회전
    let tz = 1, tx = 0, ty = 0;
    if (active) {
      const pts = S.anchors[active], c = new THREE.Vector3();
      pts.forEach((q) => c.add(q)); c.multiplyScalar(1 / pts.length);
      _v.copy(c).applyMatrix4(camera.matrixWorldInverse);
      const spread = active === 'space' ? 0 : 0.55;             // 공간 전체일 땐 다가가지 않고 방 전체를 보여 준다
      tz = active === 'space' ? 1.05 : active === 'pc' ? 1.15 : active === 'projector' ? 1.12 : active === 'speaker' ? 1.3 : 1.55;   // 프로젝터는 비춰지는 면이 보이게 덜 다가감
      tx = (_v.x - view.cx) * spread; ty = (_v.y - view.cy) * spread;
    }
    zoomS += (tz - zoomS) * 0.06; offX += (tx - offX) * 0.06; offY += (ty - offY) * 0.06;
    if (p > 0.6) { placeCamera(camAz, camEl); setFrustum(zoomS, offX, offY); camera.updateMatrixWorld(); }
    drawPeople(op);
    applyHighlight(time);

    // 설명 칩 + 지시선 (같은 장비 여러 대면 모두 점으로 표시)
    if (active === 'pc') drawPcFlow(time);
    else if (active) {
      let pts = S.anchors[active];
      if (active === 'projector' && projSub >= 0) { const s = PROJ_STEPS[projSub]; pts = [pts[s[0]], ...pts.filter((_, k) => k !== s[0])]; }   // 지시선은 지금 차례인 프로젝터로
      const scr = pts.map((q) => { const a = q.clone().project(camera); return [(a.x + 1) / 2 * W, (1 - a.y) / 2 * Hh]; });
      const [ax, ay] = scr[0];
      const cw = chip.offsetWidth || 260, chh = chip.offsetHeight || 90;
      let cx = ax + 90, cy = ay - 110;
      if (cx + cw > W - 24) cx = ax - 90 - cw;
      cx = clamp(cx, 24, W - cw - 24); cy = clamp(cy, 200, Hh - chh - 120);
      chip.style.left = cx.toFixed(1) + 'px'; chip.style.top = cy.toFixed(1) + 'px';
      const lx = cx > ax ? cx : cx + cw, ly = cy + 22, r = (8 + 3 * Math.sin(time * 4)).toFixed(1);
      let fx = '';
      if (active === 'projector' && projSub >= 0) fx = projBeams(time);
      if (active === 'speaker') fx = soundWaves(scr, time);
      tagSvg.innerHTML = fx + scr.map(([x, y], k) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5"></circle><circle class="ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"></circle>${k ? '' : `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}"></line>`}`).join('');
    } else tagSvg.innerHTML = '';

    if (p > 0.5) renderer.render(scene, camera);
  }
  // ---- 01 프로젝터: 지금 차례 프로젝터 렌즈 → 맡은 면 가운데로 영상 신호가 흐른다 (06 송출 그래픽과 같은 점선 · 점) ----
  function projBeams(time) {
    let out = '';
    for (const k of PROJ_STEPS[projSub]) {
      const ph = S.projHelp[k], [ax, ay] = toScr(ph.lensW), [bx, by] = toScr(ph.center);
      out += `<path class="flow beam" d="M${f1(ax)} ${f1(ay)}L${f1(bx)} ${f1(by)}" style="stroke-dashoffset:${f1(-time * 40)}"></path>`;
      for (let j = 0; j < 3; j++) { const t = (time * 0.6 + j / 3) % 1; out += `<circle class="pkt" cx="${f1(ax + (bx - ax) * t)}" cy="${f1(ay + (by - ay) * t)}" r="${f1(2.8 * Math.sin(t * Math.PI) + 0.6)}"></circle>`; }
      const rr = f1(10 + ((time * 0.8) % 1) * 26);
      out += `<circle class="wave" cx="${f1(bx)}" cy="${f1(by)}" r="${rr}" style="opacity:${(1 - (time * 0.8) % 1).toFixed(2)}"></circle><circle class="pkt" cx="${f1(bx)}" cy="${f1(by)}" r="3"></circle>`;
    }
    return out;
  }
  // ---- 04 스피커: 네 대에서 소리 파장이 번갈아 퍼진다 ----
  function soundWaves(scr, time) {
    let out = '';
    scr.forEach(([x, y], i) => {
      for (let j = 0; j < 3; j++) {
        const t = (time * 0.7 + j / 3 + i * 0.13) % 1;
        out += `<circle class="wave" cx="${f1(x)}" cy="${f1(y)}" r="${f1(8 + t * 46)}" style="opacity:${(0.9 * (1 - t)).toFixed(2)};stroke-width:${f1(1.6 - t)}"></circle>`;
      }
    });
    return out;
  }

  // ---- 06: 두 PC 카드 + 데이터 흐름 그래픽 ----
  const toScr = (v) => { const a = v.clone().project(camera); return [(a.x + 1) / 2 * W, (1 - a.y) / 2 * Hh]; };
  const qb = (a, c, b, t) => a.clone().multiplyScalar((1 - t) * (1 - t)).add(c.clone().multiplyScalar(2 * (1 - t) * t)).add(b.clone().multiplyScalar(t * t));
  const f1 = (n) => n.toFixed(1);
  function placeAt(el, ax, ay, side) {
    const cw = el.offsetWidth || 240, chh = el.offsetHeight || 90;
    let cx = side < 0 ? ax - 70 - cw : ax + 70, cy = ay - chh - 70;
    cx = clamp(cx, 24, W - cw - 24); cy = clamp(cy, 150, Hh - chh - 120);
    el.style.left = f1(cx) + 'px'; el.style.top = f1(cy) + 'px';
    return [cx > ax ? cx : cx + cw, cy + 22];
  }
  // 3D 이차 곡선(가운데를 위로 들어 올린 포물선)을 화면 좌표 경로로
  function arcPath(a, b, lift, n = 40, tEnd = 1) {
    const c = a.clone().lerp(b, 0.5); c.y += lift;
    const pts = []; for (let i = 0; i <= n; i++) pts.push(toScr(qb(a, c, b, i / n * tEnd)));
    return { pts, d: pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') };
  }
  function drawPcFlow(time) {
    const L = S.links, [mx, my] = toScr(L.main), [sx, sy] = toScr(L.sub);
    const [l1x, l1y] = placeAt(chip, mx, my, -1), [l2x, l2y] = placeAt(chipB, sx, sy, 1);
    const r = f1(8 + 3 * Math.sin(time * 4));
    let s = '';
    // 센서 → 각 PC 연결 (흐린 점선)
    for (const [k, pc] of [[L.kL, L.main], [L.kR, L.sub]]) s += `<path class="cable" d="${arcPath(k, pc, 0.25, 16).d}" style="stroke-dashoffset:${f1(-time * 14)}"></path>`;
    // 송출 PC → 메인 PC 포물선 점선 화살표
    const arc = arcPath(L.sub, L.main, 2.2, 40, 0.96), pts = arc.pts,   // PC 표식 바로 앞에서 끝내 화살촉이 보이게
    end = pts[pts.length - 1], pre = pts[pts.length - 4];
    s += `<path class="flow" d="${arc.d}" style="stroke-dashoffset:${f1(time * 36)}"></path>`;
    const ang = Math.atan2(end[1] - pre[1], end[0] - pre[0]), hx = (a, d) => f1(end[0] + Math.cos(ang + a) * d), hy = (a, d) => f1(end[1] + Math.sin(ang + a) * d);
    s += `<path class="head" d="M${f1(end[0])} ${f1(end[1])}L${hx(Math.PI - 0.45, 13)} ${hy(Math.PI - 0.45, 13)}L${hx(Math.PI + 0.45, 13)} ${hy(Math.PI + 0.45, 13)}Z"></path>`;
    // 곡선을 따라 흐르는 점 3개 (송출 → 메인)
    for (let k = 0; k < 3; k++) { const t = (time * 0.45 + k / 3) % 1, p = pts[Math.min(pts.length - 1, Math.round(t * (pts.length - 1)))]; s += `<circle class="pkt" cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(2.6 * Math.sin(t * Math.PI) + 0.6)}"></circle>`; }
    const top = pts[Math.round(pts.length / 2)];
    s += `<text x="${f1(top[0])}" y="${f1(top[1] - 12)}" text-anchor="middle">${end[0] < pts[0][0] ? '← Sensor data' : 'Sensor data →'}</text>`;
    // 두 PC 표식 + 카드 지시선
    for (const [x, y, lx, ly] of [[mx, my, l1x, l1y], [sx, sy, l2x, l2y]]) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.5"></circle><circle class="ring" cx="${f1(x)}" cy="${f1(y)}" r="${r}"></circle><line x1="${f1(x)}" y1="${f1(y)}" x2="${f1(lx)}" y2="${f1(ly)}"></line>`;
    tagSvg.innerHTML = s;
  }
  function sleep() { if (!video.paused) video.pause(); }

  function resize() { fitCamera(); camAz = 30; camEl = 31; buildSvg(); tagSvg.setAttribute('viewBox', `0 0 ${W} ${Hh}`); peopleSvg.setAttribute('viewBox', `0 0 ${W} ${Hh}`); }
  resize();
  addEventListener('resize', resize);
  return { section, update, sleep };
}
