// 5 VISIT — 디자인관 → 정보관 8층. 3D 캠퍼스(남색 유리 덩어리 + 가장자리 빛 + 층 줄무늬) 위에
// 스크롤 진행만큼 빛의 길이 그려지고, 정보관이 아래층부터 8층까지 켜진다. 카메라는 키프레임 사이를 미끄러진다.
// 배치 출처: 8주차 visit_infographic.svg (학교 캠퍼스맵 단순화 · 1280×540). 높이 · 입구는 그림용 추정.
import * as THREE from 'three';
import { $, $$, ss, clamp, lerp, pointer } from './util.js';

const PX = 40;                                   // SVG 40px = 1 단위
const X = (x) => (x - 640) / PX, Z = (y) => (y - 270) / PX;
const FLOOR_H = 0.62;
// [번호, 이름, x, y, w, h, 층수]
const BUILDINGS = [
  ['8', '창조관', 38, 182, 100, 128, 5], ['7', '조형관', 100, 322, 210, 66, 4], ['D', '', 310, 135, 58, 48, 3],
  ['E', '', 415, 228, 36, 52, 3], ['1', '본관', 478, 172, 190, 64, 6], ['2', '디자인관', 730, 165, 130, 50, 6],
  ['6', '우경아트홀', 625, 345, 105, 65, 3], ['5', '학생식당', 737, 300, 64, 110, 2], ['4', '평생교육관', 990, 408, 100, 82, 5],
  ['A', '', 950, 268, 56, 34, 2], ['3', '정보관', 955, 160, 120, 92, 9],
];
const ROADS = [
  [[20, 128], [350, 225], [430, 350], [600, 350], [660, 295], [780, 290], [1260, 432], 0.42],
  [[655, 300], [655, 238], [1000, 238], 0.24], [[876, 238], [876, 300], 0.24], [[150, 245], [350, 225], 0.2],
];
// 디자인관 앞 → 동쪽 길 → 정보관 서쪽 입구 (입구 위치 추정)
const ROUTE = [[795, 216], [795, 238], [880, 238], [940, 238], [955, 226]];
const INFO_C = [1015, 206], TARGET_FLOOR = 8;

const BLD_VERT = /* glsl */`
varying vec3 vN, vW, vV;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const BLD_FRAG = /* glsl */`
precision highp float;
varying vec3 vN, vW, vV;
uniform float uKey, uRise, uTarget, uTime, uFloorH, uHot, uFade;
void main() {
  float fres = pow(1.0 - abs(dot(vN, vV)), 2.2);
  float lvl = vW.y / uFloorH;
  float line = 1.0 - smoothstep(0.0, 0.06, abs(fract(lvl) - 0.0));
  vec3 base = vec3(0.016, 0.03, 0.065) + vec3(0.02, 0.045, 0.1) * max(vN.y, 0.0);
  vec3 c = base + vec3(0.2, 0.45, 0.75) * fres * (0.18 + 0.32 * uKey);
  c += vec3(0.4, 0.75, 1.0) * line * 0.06 * (1.0 - abs(vN.y));
  // 정보관: 아래층부터 차례로 켜짐 → 목표 층은 민트로 맥박
  if (uHot > 0.5) {
    float f = floor(lvl);
    float lit = step(f + 1.0, uRise * uTarget + 0.001) * (1.0 - abs(vN.y));
    float band = smoothstep(0.15, 0.3, fract(lvl)) * smoothstep(0.85, 0.7, fract(lvl));
    c += vec3(0.25, 0.6, 1.0) * lit * band * 0.22;
    float isT = step(uTarget - 1.0, f) * step(f, uTarget - 1.0) * step(0.999, uRise);
    c += vec3(0.44, 0.94, 0.85) * isT * band * (0.9 + 0.5 * sin(uTime * 4.0)) * (1.0 - abs(vN.y));
    c += vec3(0.44, 0.94, 0.85) * fres * 0.25;
  }
  gl_FragColor = vec4(c * uFade, 1.0);
}`;
const GROUND_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uFade;
void main() {
  vec2 p = (vUv - 0.5) * 120.0;
  vec2 g = abs(fract(p) - 0.5) / fwidth(p);
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  vec2 g5 = abs(fract(p / 5.0) - 0.5) / fwidth(p / 5.0);
  float line5 = 1.0 - min(min(g5.x, g5.y), 1.0);
  float fall = exp(-length(p - vec2(4.0, -1.0)) * 0.06);
  vec3 c = vec3(0.3, 0.7, 1.0) * (line * 0.05 + line5 * 0.1) * fall + vec3(0.01, 0.02, 0.045) * fall;
  gl_FragColor = vec4(c * uFade, 1.0);
}`;
const ROUTE_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uProg, uTime, uFade;
void main() {
  float u = vUv.x;
  if (u > uProg) discard;
  float head = exp(-(uProg - u) * 40.0);
  float pulse = 0.5 + 0.5 * sin((u * 30.0 - uTime * 3.0));
  vec3 c = vec3(0.44, 0.94, 0.85) * (0.75 + 0.35 * pulse) + vec3(1.0) * head * 1.2;
  gl_FragColor = vec4(c * uFade, 1.0);
}`;

export function initVisit() {
  const section = $('#visit'), canvas = $('#visitCanvas'), labelsEl = $('#visitLabels'), steps = $$('#visitSteps li'), bar = $('#visitBar');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(0x03060c, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x03060c, 30, 70);
  const cam = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
  const T = { time: { value: 0 }, fade: { value: 1 } };

  // 바닥 격자
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: GROUND_FRAG, uniforms: { uFade: T.fade }, extensions: { derivatives: true },
  }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);

  // 길 (납작한 띠)
  const roadMat = new THREE.MeshBasicMaterial({ color: 0x14223c });
  for (const r of ROADS) {
    const w = r[r.length - 1], pts = r.slice(0, -1);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = new THREE.Vector3(X(pts[i][0]), 0.01, Z(pts[i][1])), b = new THREE.Vector3(X(pts[i + 1][0]), 0.01, Z(pts[i + 1][1]));
      const len = a.distanceTo(b), m = new THREE.Mesh(new THREE.PlaneGeometry(len + w, w), roadMat);
      m.rotation.x = -Math.PI / 2; m.position.copy(a).lerp(b, 0.5); m.rotation.z = -Math.atan2(b.z - a.z, b.x - a.x);
      scene.add(m);
    }
  }

  // 건물
  const labels = [];
  let infoMat = null, infoTop = 0;
  for (const [no, name, x, y, w, h, floors] of BUILDINGS) {
    const hot = no === '3', key = no === '2' || hot;
    const H = floors * FLOOR_H;
    const mat = new THREE.ShaderMaterial({
      vertexShader: BLD_VERT, fragmentShader: BLD_FRAG,
      uniforms: { uKey: { value: key ? 1 : 0 }, uRise: { value: 0 }, uTarget: { value: TARGET_FLOOR }, uTime: T.time, uFloorH: { value: FLOOR_H }, uHot: { value: hot ? 1 : 0 }, uFade: T.fade },
    });
    const g = new THREE.BoxGeometry(w / PX, H, h / PX);
    const m = new THREE.Mesh(g, mat); m.position.set(X(x + w / 2), H / 2, Z(y + h / 2)); scene.add(m);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: hot ? 0x6ff0d8 : key ? 0x8fe8ee : 0x2f4e78, transparent: true, opacity: hot ? 0.9 : key ? 0.6 : 0.4 }));
    e.position.copy(m.position); scene.add(e);
    if (hot) { infoMat = mat; infoTop = H; }
    if (name) {
      const el = document.createElement('div'); el.className = 'vl' + (hot ? ' hot' : key ? ' key' : '');
      el.innerHTML = `<small>${no}</small>${name}`; labelsEl.appendChild(el);
      labels.push({ el, pos: new THREE.Vector3(X(x + w / 2), H + 0.15, Z(y + h / 2)), hot, key });
    }
  }
  // 8층 라벨
  const tEl = document.createElement('div'); tEl.className = 'vl hot'; tEl.innerHTML = '<small>8F</small>HORIZON STUDIO'; tEl.style.opacity = 0; labelsEl.appendChild(tEl);
  const tPos = new THREE.Vector3(X(INFO_C[0]) + 1.6, (TARGET_FLOOR - 0.5) * FLOOR_H, Z(INFO_C[1]) + 1.2);

  // 경로: 땅 위 길 + 엘리베이터(수직)
  const rpts = ROUTE.map(([x, y]) => new THREE.Vector3(X(x), 0.08, Z(y)));
  const curve = new THREE.CatmullRomCurve3(rpts, false, 'catmullrom', 0.1);
  const routeMat = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }', fragmentShader: ROUTE_FRAG, uniforms: { uProg: { value: 0 }, uTime: T.time, uFade: T.fade } });
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.06, 8, false), routeMat));
  const lift0 = new THREE.Vector3(X(INFO_C[0]), 0.05, Z(INFO_C[1])), lift1 = lift0.clone().setY((TARGET_FLOOR - 0.5) * FLOOR_H);
  const liftMat = routeMat.clone(); liftMat.uniforms = { uProg: { value: 0 }, uTime: T.time, uFade: T.fade };
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(lift0, lift1), 40, 0.05, 8, false), liftMat));
  // 입구 → 엘리베이터 바닥 연결
  const link = new THREE.LineCurve3(rpts[rpts.length - 1], lift0);
  const linkMat = routeMat.clone(); linkMat.uniforms = { uProg: { value: 0 }, uTime: T.time, uFade: T.fade };
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(link, 20, 0.05, 8, false), linkMat));

  // 출발점 · 도착점 고리
  const ringGeo = new THREE.RingGeometry(0.32, 0.38, 48);
  const startRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x8fe8ee, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  startRing.rotation.x = -Math.PI / 2; startRing.position.copy(rpts[0]).setY(0.03); scene.add(startRing);
  const goalRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.06, 64), new THREE.MeshBasicMaterial({ color: 0x6ff0d8, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  goalRing.rotation.x = -Math.PI / 2; goalRing.position.copy(lift0).setY(0.03); scene.add(goalRing);   // 정보관 발밑에 퍼지는 고리

  // 길 위를 흐르는 빛 알갱이
  const NP = 160, pp = new Float32Array(NP * 3), pOff = Float32Array.from({ length: NP }, () => Math.random());
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xbff7ff, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts);

  // 카메라 키프레임 [진행도, 위치, 바라보는 곳]
  const KEYS = [
    [0.0, [-6, 26, 30], [1, 0, 0]],
    [0.28, [0, 13, 17], [5, 0.5, -0.5]],
    [0.55, [3, 11, 16], [8, 1.5, -1]],
    [0.76, [20, 11, 13], [9.4, 3.2, -1.6]],
    [1.0, [19.5, 10, 8], [9.4, 4.2, -1.6]],
  ];
  const posC = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k[1])));
  const tgtC = new THREE.CatmullRomCurve3(KEYS.map((k) => new THREE.Vector3(...k[2])));
  const keyT = (p) => {   // 키프레임 진행도 → 곡선 매개변수 (구간마다 부드럽게)
    for (let i = 0; i < KEYS.length - 1; i++) if (p <= KEYS[i + 1][0]) { const k = ss(KEYS[i][0], KEYS[i + 1][0], p); return (i + k) / (KEYS.length - 1); }
    return 1;
  };

  let W = 1, Hh = 1;
  function resize() { W = canvas.clientWidth; Hh = canvas.clientHeight; renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(W, Hh, false); cam.aspect = W / Hh; cam.updateProjectionMatrix(); }
  resize(); addEventListener('resize', resize);

  let time = 0, last = performance.now(), sp = 0, stepI = -1;
  const v = new THREE.Vector3(), mo = { x: 0, y: 0 };
  function update(p) {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    T.time.value = time;
    sp += (p - sp) * 0.12;
    const t = keyT(sp);
    mo.x += ((pointer.x / innerWidth - 0.5) - mo.x) * 0.05; mo.y += ((pointer.y / innerHeight - 0.5) - mo.y) * 0.05;
    cam.position.copy(posC.getPoint(t)).add(v.set(mo.x * 1.6, -mo.y * 0.9, 0));
    cam.lookAt(tgtC.getPoint(t));

    const groundProg = ss(0.18, 0.58, sp), linkProg = ss(0.58, 0.63, sp), liftProg = ss(0.63, 0.82, sp);
    routeMat.uniforms.uProg.value = groundProg; linkMat.uniforms.uProg.value = linkProg; liftMat.uniforms.uProg.value = liftProg;
    infoMat.uniforms.uRise.value = liftProg;
    startRing.material.opacity = ss(0.12, 0.2, sp) * (0.6 + 0.4 * Math.sin(time * 3));
    startRing.scale.setScalar(1 + 0.15 * Math.sin(time * 3));
    goalRing.material.opacity = ss(0.8, 0.86, sp);
    goalRing.scale.setScalar(1 + (time * 0.6 % 1) * 0.6); goalRing.material.opacity *= 1 - (time * 0.6 % 1);
    // 빛 알갱이: 그려진 길 위에서만 흐른다
    for (let i = 0; i < NP; i++) {
      const u = ((pOff[i] + time * 0.08) % 1) * groundProg;
      curve.getPointAt(u, v); pp[i * 3] = v.x + Math.sin(i) * 0.05; pp[i * 3 + 1] = v.y + 0.05 + Math.sin(time * 3 + i) * 0.04; pp[i * 3 + 2] = v.z + Math.cos(i) * 0.05;
    }
    pGeo.attributes.position.needsUpdate = true;
    pts.material.opacity = groundProg > 0.01 ? 0.9 : 0;

    // 라벨
    for (const l of labels) {
      v.copy(l.pos).project(cam);
      l.el.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v.y) / 2 * Hh).toFixed(1)}px) translate(-50%, -100%)`;
      l.el.style.opacity = v.z < 1 ? (l.hot || l.key ? 1 : 0.7) : 0;
    }
    v.copy(tPos).project(cam);
    tEl.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v.y) / 2 * Hh).toFixed(1)}px) translate(0, -50%)`;
    tEl.style.opacity = ss(0.82, 0.9, sp).toFixed(3);

    const si = sp < 0.25 ? 0 : sp < 0.56 ? 1 : sp < 0.8 ? 2 : 3;
    if (si !== stepI) { stepI = si; steps.forEach((li, i) => li.classList.toggle('on', i === si)); }
    bar.style.width = (p * 100).toFixed(2) + '%';
    T.fade.value = 1;
    renderer.render(scene, cam);
  }
  return { section, update };
}
