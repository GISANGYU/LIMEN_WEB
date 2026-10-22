// 4 SPACE — LIMEN_WEB ver2(limen_launch/main.js 2부) 이식.
// 도면(SVG)이 스크롤로 그려지고 → 같은 카메라의 3D 모델로 바뀌고 → 장비 호버로 설명.
// 바뀐 점: ScrollTrigger 핀 대신 CSS sticky 진행도, 밤 색, 모델 4면에 SCENES 영상 투사.
import * as THREE from 'three';
import { $, $$, ss, clamp, pointer } from './util.js';
import { buildStudio, INFO, DIM, ULEN } from './studio.js';

const PHASES = [
  [0.0, '01', 'GRID · 작도', '격자를 깔고<br>공간의 기준선을 잡는다'],
  [0.22, '02', 'SPACE · 공간', '모서리가 둥글게 이어지는<br>벽 세 면과 바닥 한 면'],
  [0.4, '03', 'DEVICE · 장비', '천장 철골에 매달린<br>프로젝터 · 조명 · 카메라'],
  [0.58, '04', 'MODEL · 모델', '도면이 그대로 입체가 되고,<br>네 면에 장면이 떠오른다'],
  [0.74, '05', 'EXPLORE · 탐색', '장비에 마우스를 올려<br>각자의 역할을 확인하세요'],
];

const PROJ_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uOn, uA, uB, uFloor;
void main() {
  vec2 t;
  float k = 1.0;
  if (uFloor > 0.5) { t = vec2(vUv.x, 1.0 - vUv.y); k = 0.55; }
  else {
    float fu = (vUv.x - uA) / (uB - uA);
    if (fu < 0.0) { fu = -fu * (uB - uA) / uA * 0.5; k = 0.6; }          // 좌벽: 정면 영상을 거울처럼 이어 붙임
    else if (fu > 1.0) { fu = 1.0 - (fu - 1.0) * (uB - uA) / (1.0 - uB) * 0.5; k = 0.6; }
    t = vec2(clamp(fu, 0.0, 1.0), vUv.y);
  }
  vec3 c = texture2D(uTex, t).rgb * k * uOn;
  gl_FragColor = vec4(c, 1.0);
}`;

export function initSpace(reelVideo) {
  const section = $('#space'), stage = $('#spStage'), drawEl = $('#spDraw'), svg = $('#spSvg'), tagSvg = $('#spTag'), chip = $('#spChip');
  const canvas = $('#spCanvas');
  const S = buildStudio();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  scene.add(S.root);
  scene.add(new THREE.HemisphereLight('#9fc4ff', '#07101f', 1.5));
  const sun = new THREE.DirectionalLight('#dfe9ff', 1.3); sun.position.set(3, 9, 8); scene.add(sun);
  const fill = new THREE.DirectionalLight('#6ff0d8', 0.35); fill.position.set(-6, 3, -2); scene.add(fill);
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  S.mats.forEach((m) => { m.clippingPlanes = [clip]; m.transparent = true; });

  // 모델 모서리선
  const edgeMat = new THREE.LineBasicMaterial({ color: '#8fe8ee', transparent: true, opacity: 0.22, clippingPlanes: [clip] });
  const devEdgeMat = new THREE.LineBasicMaterial({ color: '#dfe7f2', transparent: true, opacity: 0.55, clippingPlanes: [clip] });
  const hiEdgeMat = new THREE.LineBasicMaterial({ color: '#6ff0d8', transparent: true, opacity: 1, clippingPlanes: [clip] });
  S.root.traverse((o) => {
    if (!o.isMesh || o.userData.noEdges) return;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 25), o.userData.id ? devEdgeMat : edgeMat);
    e.userData.edgeOf = o; o.add(e); o.userData.edge = e;
  });
  {
    const wire = S.lines.filter((l) => l.cls === 'k-wire' || l.cls === 'k-struct').flatMap((l) => l.pts.slice(1).flatMap((p, i) => [l.pts[i], p]));
    scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wire), new THREE.LineBasicMaterial({ color: '#8fe8ee', transparent: true, opacity: 0.12, clippingPlanes: [clip] })));
  }

  // ---- 4면 투사: 곡면 벽 + 바닥 위에 영상을 더한다 ----
  const vtex = new THREE.VideoTexture(reelVideo); vtex.colorSpace = THREE.SRGBColorSpace;
  const { X0, X1, ZB, ZF, R, RC } = DIM;
  const segA = (ZF - (ZB + RC)) + Math.PI / 2 * RC, segF = (X1 - RC) - (X0 + RC);
  const projU = { uTex: { value: vtex }, uOn: { value: 0 }, uA: { value: segA / ULEN }, uB: { value: (segA + segF) / ULEN }, uFloor: { value: 0 } };
  const projVert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  const projMat = (floor) => new THREE.ShaderMaterial({
    vertexShader: projVert, fragmentShader: PROJ_FRAG, side: THREE.FrontSide, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, clippingPlanes: [clip],
    uniforms: { ...projU, uFloor: { value: floor ? 1 : 0 } },
  });
  const wallProj = new THREE.Mesh(S.cycMesh.geometry, projMat(false));
  // 바닥 UV 를 0~1 로 다시 매긴다 (ShapeGeometry 의 uv 는 미터 단위)
  const fg = S.floor.geometry.clone(), fp = fg.attributes.position, fuv = new Float32Array(fp.count * 2);
  for (let i = 0; i < fp.count; i++) { fuv[i * 2] = (fp.getX(i) - X0) / (X1 - X0); fuv[i * 2 + 1] = (fp.getZ(i) - ZB) / (ZF - ZB); }
  fg.setAttribute('uv', new THREE.BufferAttribute(fuv, 2));
  const floorProj = new THREE.Mesh(fg, projMat(true)); floorProj.position.y = 0.004;
  scene.add(wallProj, floorProj);

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
    const padTop = 260 / Hh * 2, padBot = 90 / Hh * 2;
    const half = Math.max((mxx - mnx) / 2 / asp / 0.9, (mxy - mny) / (2 - padTop - padBot));
    Object.assign(view, { half, cx: (mnx + mxx) / 2 - 0.08 * half, cy: (mny + mxy) / 2 + (padTop - padBot) / 2 * half });
    setFrustum(1);
  }
  function setFrustum(zoom) {
    const asp = W / Hh, h = view.half / zoom;
    camera.left = view.cx - h * asp; camera.right = view.cx + h * asp; camera.top = view.cy + h; camera.bottom = view.cy - h;
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

  // ---- 오른쪽 목록 ----
  const list = $('#spList');
  INFO.forEach((it) => {
    const li = document.createElement('li'); li.dataset.id = it.id; li.setAttribute('data-hover', '');
    li.innerHTML = `<span class="no">${it.no}</span><span class="tt">${[...it.title].map((c) => `<span>${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</span><span class="ds">${it.lines.map((l) => `<i>${l}</i>`).join('')}</span>`;
    li.addEventListener('mouseenter', () => { if (explore) setActive(it.id, 'list'); });
    li.addEventListener('mouseleave', () => { if (activeFrom === 'list') setActive(null); });
    list.appendChild(li);
  });

  // ---- 호버 강조 ----
  let active = null, activeFrom = null, explore = false;
  function setActive(id, from = 'model') {
    if (id === active) return;
    active = id; activeFrom = id ? from : null;
    $$('#spList li').forEach((li) => {
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
    document.getElementById('cursor').classList.toggle('big', !!id);
    const info = INFO.find((i) => i.id === id);
    chip.classList.toggle('on', !!id);
    if (info) {
      chip.querySelector('span').innerHTML = [...`${info.no}  ${info.title}`].map((c) => `<b>${c === ' ' ? '&nbsp;' : c}</b>`).join('');
      gsap.fromTo(chip.querySelectorAll('b'), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, stagger: 0.018, ease: 'power2.out' });
    }
  }
  function applyHighlight(time) {
    const pulse = 0.55 + 0.25 * Math.sin(time * 4);
    for (const k in S.groups) {
      const on = k === active;
      S.groups[k].objs.forEach((obj) => obj.traverse((m) => {
        if (!m.isMesh) return;
        if (on) {
          if (!m.userData.hiMat) { m.userData.baseMat = m.material; m.userData.hiMat = m.material.clone(); m.userData.hiMat.clippingPlanes = [clip]; m.userData.hiMat.transparent = false; m.userData.hiMat.opacity = 1; }
          m.userData.hiMat.emissive.set('#3fd9c0').multiplyScalar(k === 'space' ? 0.025 : pulse);
          m.material = m.userData.hiMat;
        } else if (m.userData.baseMat) m.material = m.userData.baseMat;
      }));
    }
  }

  // ---- 포인터 ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(9, 9), mouse = { nx: 0, ny: 0, x: 0, y: 0, inside: false };
  function readPointer() {
    const r = drawEl.getBoundingClientRect();
    mouse.inside = pointer.x > r.left && pointer.x < r.right && pointer.y > r.top && pointer.y < r.bottom;
    mouse.x = pointer.x - r.left; mouse.y = pointer.y - r.top;
    if (mouse.inside) { ndc.set(mouse.x / r.width * 2 - 1, -(mouse.y / r.height) * 2 + 1); mouse.nx = ndc.x; mouse.ny = ndc.y; }
    else { ndc.set(9, 9); if (activeFrom === 'model') setActive(null); }
  }

  let phaseIdx = -1;
  function setPhase(p) {
    let i = 0; PHASES.forEach((ph, k) => { if (p >= ph[0]) i = k; });
    if (i === phaseIdx) return; phaseIdx = i;
    const [, no, name, cap] = PHASES[i];
    const ph = $('#spPhase'); ph.querySelector('b').textContent = no; ph.querySelector('span').textContent = name;
    const c = $('#spCap'); c.innerHTML = cap;
    gsap.fromTo(c, { opacity: 0, y: 10, filter: 'blur(6px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6 });
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
    const z = 1 + 1.5 * Math.pow(1 - ss(0.0, 0.18, p), 2);
    const [ox, oy] = worldO;
    world.setAttribute('transform', `translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${z.toFixed(4)}) translate(${(-ox).toFixed(1)} ${(-oy).toFixed(1)})`);
    svgTexts.forEach((t) => t.el.classList.toggle('on', p >= t.a && p < 0.64));
    svgMarks.forEach((m) => m.el.classList.toggle('on', p >= m.a && p < 0.66));
    stage.style.setProperty('--paper', (ss(0.0, 0.05, p) * (1 - ss(0.66, 0.76, p) * 0.6)).toFixed(3));
    $('#spBar').style.width = (p * 100).toFixed(2) + '%';
    setPhase(p);
  }

  const t0 = performance.now();
  let camAz = 30, camEl = 31, zoomS = 1;
  function update(p) {
    const time = (performance.now() - t0) / 1000;
    readPointer();
    updateDrawing(p);
    const m = ss(0.58, 0.7, p);
    canvas.style.opacity = ss(0.56, 0.64, p).toFixed(3);
    clip.constant = -0.05 + m * (DIM.H + 0.8);
    const op = 0.35 + 0.65 * ss(0.6, 0.72, p), solid = op > 0.995;
    S.mats.forEach((mt) => { mt.opacity = op; if (mt.transparent === solid) { mt.transparent = !solid; mt.needsUpdate = true; } });
    // 모델이 다 차오른 뒤 네 면에 장면이 켜진다 (호버 중엔 조금 낮춘다)
    const on = ss(0.68, 0.78, p) * (active && active !== 'space' ? 0.45 : 1);
    wallProj.material.uniforms.uOn.value = on * 1.1; floorProj.material.uniforms.uOn.value = on;

    explore = p > 0.72 && p < 0.999;
    $('#spList').classList.toggle('on', p > 0.7);
    const e = ss(0.72, 0.86, p);
    const tAz = 30 - e * 48 + (explore && mouse.inside ? mouse.nx * 10 * e : 0), tEl = 31 + e * 4 - (explore && mouse.inside ? mouse.ny * 5 * e : 0);
    camAz += (tAz - camAz) * 0.08; camEl += (tEl - camEl) * 0.08;
    zoomS += ((1 + e * 0.32) - zoomS) * 0.08;
    if (p > 0.6) { placeCamera(camAz, camEl); setFrustum(zoomS); }

    if (explore && mouse.inside && activeFrom !== 'list') {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(S.pick, false).find((h) => h.object.userData.id);
      setActive(hit ? hit.object.userData.id : null, 'model');
    } else if (!explore && active) setActive(null);
    applyHighlight(time);

    if (active && explore) {
      const a = S.anchors[active].clone().project(camera), ax = (a.x + 1) / 2 * W, ay = (1 - a.y) / 2 * Hh;
      const cx = activeFrom === 'model' ? mouse.x + 26 : ax + 70, cy = activeFrom === 'model' ? mouse.y - 34 : ay - 60;
      chip.style.transform = `translate(${cx.toFixed(1)}px, ${(cy - 14).toFixed(1)}px)`;
      tagSvg.innerHTML = `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="5"></circle><line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}"></line>`;
    } else tagSvg.innerHTML = '';

    if (p > 0.5) renderer.render(scene, camera);
  }

  function resize() { fitCamera(); camAz = 30; camEl = 31; buildSvg(); tagSvg.setAttribute('viewBox', `0 0 ${W} ${Hh}`); }
  resize();
  addEventListener('resize', resize);
  return { section, update };
}
