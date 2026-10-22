// 3 MEMBER — 카드 7장이 고리 위에 선다. 드래그 = 회전(관성 · 스냅), 호버 = 앞으로 나와 기울고 빛이 깨어남,
// 드래그 속도만큼 카드가 휜다. 바닥은 HERO 와 같은 수면 — 카드가 거꾸로 비치며 일렁인다.
import * as THREE from 'three';
import { $, clamp, pointer, reduced } from './util.js';

// 사진이 생기면 photo 에 경로를 넣는다 (카드 바탕이 사진으로 바뀜)
const MEMBERS = [
  { name: '김현기', team: '영상팀', en: 'VIDEO', photo: null },
  { name: '배정훈', team: '영상팀', en: 'VIDEO', photo: null },
  { name: '심혜민', team: '영상팀', en: 'VIDEO', photo: null },
  { name: '이채연', team: 'UI · UX팀', en: 'UI · UX', photo: null },
  { name: '유기상', team: 'UI · UX팀', en: 'UI · UX', photo: null },
  { name: '조가연', team: 'UI · UX팀', en: 'UI · UX', photo: null },
  { name: '김노은', team: 'UI · UX팀', en: 'UI · UX', photo: null },
];
const N = MEMBERS.length, STEP = Math.PI * 2 / N, RING = 4.3, CW = 1.9, CH = 2.7, LIFT = 0.25;

const VERT = /* glsl */`
uniform float uBend, uMirror, uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float x = p.x / ${(CW / 2).toFixed(2)};
  p.z -= uBend * x * x * 0.55;                       // 드래그 속도만큼 휜다
  p.z += sin(uTime * 0.8 + x * 2.0) * 0.015;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uText, uPhoto;
uniform float uTime, uHover, uSeed, uWarm, uMirror, uDim, uHasPhoto, uFront;
uniform vec2 uHit;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.05; a *= 0.5; } return s; }
void main() {
  vec2 uv = vUv;
  if (uMirror > 0.5) uv.x += sin(uv.y * 38.0 - uTime * 2.2) * 0.008 * (0.2 + uv.y) + (noise(vec2(uv.y * 30.0, uTime)) - 0.5) * 0.01;
  // 호버 지점에서 퍼지는 물결
  vec2 d = uv - uHit; float r = length(d * vec2(1.0, 1.4));
  uv += normalize(d + 1e-4) * sin(r * 40.0 - uTime * 6.0) * 0.006 * uHover * exp(-r * 3.0);

  // 절차적 빛 초상: 세로 빛기둥 + 흐름
  float t = uTime * 0.12 + uSeed * 10.0;
  float w = fbm(vec2(uv.x * 2.2 + uSeed * 7.0, uv.y * 1.2 - t));
  float col = exp(-pow((uv.x - 0.5 - (w - 0.5) * 0.5) * 3.2, 2.0));
  float rays = fbm(vec2(uv.x * 14.0 + w * 2.0, t * 2.0));
  float body = col * (0.45 + 0.55 * rays) * smoothstep(0.0, 0.55, uv.y) * smoothstep(1.05, 0.45, uv.y);
  vec3 cool = mix(vec3(0.05, 0.14, 0.42), vec3(0.45, 0.9, 0.98), body);
  vec3 warm = mix(vec3(0.12, 0.10, 0.22), vec3(0.94, 0.9, 0.62), body);
  vec3 c = mix(cool, warm, uWarm * 0.55) * body * (0.65 + 1.1 * uHover);
  c += vec3(0.02, 0.04, 0.09);
  if (uHasPhoto > 0.5) { vec3 ph = texture2D(uPhoto, uv).rgb; c = mix(c, ph * (0.7 + 0.5 * uHover), 0.85); }
  // 테두리 1px 빛
  vec2 e = min(uv, 1.0 - uv);
  float edge = 1.0 - smoothstep(0.0, 0.006, min(e.x, e.y * 0.7));
  c += vec3(0.56, 0.91, 0.93) * edge * (0.25 + 0.75 * uHover);
  // 글자
  vec4 tx = texture2D(uText, uv);
  c = mix(c, vec3(0.92, 0.95, 1.0), tx.a);
  float grain = (hash(uv * 900.0 + uTime) - 0.5) * 0.05;
  c += grain;
  c *= uDim;
  c *= mix(0.25, 1.0, uFront);                     // 뒤를 보이는 카드는 어둡게
  float a = 1.0;
  if (uMirror > 0.5) { a = (1.0 - smoothstep(0.0, 0.6, vUv.y)) * 0.42; }
  gl_FragColor = vec4(c * a, a);
}`;

const FLOOR_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uTime;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = (vUv - 0.5) * vec2(30.0, 30.0);
  float d = length(p - vec2(0.0, 4.3));
  float glow = exp(-d * 0.35) * 0.07;
  float lines = pow(noise(vec2(p.x * 0.8, p.y * 6.0 + uTime * 0.6)), 10.0) * 0.4 * exp(-length(p) * 0.12);
  vec3 c = vec3(0.35, 0.75, 1.0) * (glow + lines);
  gl_FragColor = vec4(c, 1.0);
}`;

function textTexture(m, i) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 728;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
  g.font = '300 22px "IBM Plex Mono", monospace'; g.globalAlpha = 0.85;
  g.fillText(String(i + 1).padStart(2, '0'), 34, 58);
  g.textAlign = 'right'; g.font = '500 18px "Cormorant SC", serif';
  g.fillText(m.en.split('').join(String.fromCharCode(8202)), 478, 58);
  g.textAlign = 'left'; g.globalAlpha = 1;
  g.font = '200 66px "Noto Serif KR", serif';
  g.fillText(m.name, 34, 640);
  g.globalAlpha = 0.6; g.font = '300 20px "Pretendard", sans-serif';
  g.fillText(m.team, 36, 684);
  g.globalAlpha = 0.5; g.fillRect(34, 560, 40, 1);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.NoColorSpace; tx.anisotropy = 4;
  return tx;
}

export function initMember() {
  const section = $('#member'), canvas = $('#memberCanvas');
  const miNo = $('#miNo'), miName = $('#miName'), miTeam = $('#miTeam');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x03060c, 1);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  scene.fog = null;

  const ring = new THREE.Group(), mirrorRing = new THREE.Group();
  mirrorRing.scale.y = -1;
  scene.add(ring, mirrorRing);
  const geo = new THREE.PlaneGeometry(CW, CH, 32, 1);
  const cards = [];
  const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;

  MEMBERS.forEach((m, i) => {
    const mk = (mirror) => new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, transparent: mirror, depthWrite: !mirror,
      blending: mirror ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uText: { value: blank }, uPhoto: { value: blank }, uTime: { value: 0 }, uHover: { value: 0 }, uSeed: { value: i * 0.137 + 0.3 },
        uWarm: { value: m.team === '영상팀' ? 1 : 0 }, uMirror: { value: mirror ? 1 : 0 }, uDim: { value: 1 }, uBend: { value: 0 },
        uHasPhoto: { value: 0 }, uHit: { value: new THREE.Vector2(0.5, 0.5) }, uFront: { value: 1 },
      },
    });
    const holder = new THREE.Group(), mesh = new THREE.Mesh(geo, mk(false));
    holder.add(mesh); ring.add(holder);
    const mHolder = new THREE.Group(), mMesh = new THREE.Mesh(geo, mk(true));
    mHolder.add(mMesh); mirrorRing.add(mHolder);
    mesh.userData.i = i;
    if (m.photo) new THREE.TextureLoader().load(m.photo, (t) => { [mesh, mMesh].forEach((o) => { o.material.uniforms.uPhoto.value = t; o.material.uniforms.uHasPhoto.value = 1; }); });
    cards.push({ m, holder, mesh, mHolder, mMesh, hover: 0, push: 0, tiltX: 0, tiltY: 0 });
  });
  // 글자 텍스처는 서체가 준비된 뒤에 그린다
  Promise.all(['200 66px "Noto Serif KR"', '300 22px "IBM Plex Mono"', '500 18px "Cormorant SC"'].map((f) => document.fonts.load(f, '김A1'))).catch(() => {}).then(() => {
    cards.forEach((c, i) => { const t = textTexture(c.m, i); c.mesh.material.uniforms.uText.value = t; c.mMesh.material.uniforms.uText.value = t; });
  });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: FLOOR_FRAG, uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001;
  scene.add(floor);

  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(W, H, false);
    cam.aspect = W / H; cam.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  // ---- 드래그 · 관성 · 스냅 ----
  const st = { rot: 0, vel: 0, drag: false, lastX: 0, idle: 0, hovered: -1, front: -1 };
  canvas.addEventListener('pointerdown', (e) => { st.drag = true; st.lastX = e.clientX; st.idle = 0; st.snap = null; canvas.setPointerCapture(e.pointerId); document.body.classList.add('dragging'); });
  canvas.addEventListener('pointermove', (e) => {
    if (!st.drag) return;
    const dx = e.clientX - st.lastX; st.lastX = e.clientX;
    st.rot += dx * 0.0065; st.vel = dx * 0.0065 * 60;
  });
  const up = () => { st.drag = false; document.body.classList.remove('dragging'); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerenter', () => document.getElementById('cursor').classList.add('drag'));
  canvas.addEventListener('pointerleave', () => { document.getElementById('cursor').classList.remove('drag'); });

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let time = 0, last = performance.now(), bend = 0;

  function showInfo(i) {
    if (i === st.shown) return; st.shown = i;
    const m = MEMBERS[i];
    miNo.textContent = String(i + 1).padStart(2, '0') + ' / 07';
    miName.innerHTML = [...m.name].map((c) => `<b>${c}</b>`).join('');
    miTeam.textContent = m.team === '영상팀' ? 'VIDEO TEAM · 영상팀' : 'UI · UX TEAM · UI·UX팀';
    gsap.fromTo(miName.children, { yPercent: 90, opacity: 0, filter: 'blur(6px)' }, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: 0.6, stagger: 0.06, ease: 'power3.out' });
  }

  function update() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    // 관성 → 스냅
    if (!st.drag) {
      st.idle += dt;
      st.rot += st.vel * dt; st.vel *= Math.pow(0.04, dt);
      if (Math.abs(st.vel) < 0.35) {
        // 가만히 있으면 4초마다 한 칸씩 넘어간다
        if (st.idle > 4 && st.hovered < 0 && !reduced) { st.snap = Math.round(st.rot / STEP) * STEP - STEP; st.idle = 0; }
        const target = st.snap ?? Math.round(st.rot / STEP) * STEP;
        st.rot += (target - st.rot) * (1 - Math.pow(0.02, dt));
        if (st.snap != null && Math.abs(target - st.rot) < 0.002) st.snap = null;
      }
    }
    bend += (clamp(st.vel * 0.12, -1, 1) - bend) * 0.1;
    if (reduced) bend = 0;

    // 호버
    const r = canvas.getBoundingClientRect();
    const inside = pointer.x > r.left && pointer.x < r.right && pointer.y > r.top && pointer.y < r.bottom;
    let hit = null;
    if (inside && !st.drag) {
      ndc.set((pointer.x - r.left) / W * 2 - 1, -((pointer.y - r.top) / H) * 2 + 1);
      ray.setFromCamera(ndc, cam);
      hit = ray.intersectObjects(cards.map((c) => c.mesh), false)[0] || null;
    }
    st.hovered = hit ? hit.object.userData.i : -1;
    if (hit) st.idle = 0;

    // 카메라: 커서 따라 살짝
    const nx = inside ? (pointer.x - r.left) / W - 0.5 : 0, ny = inside ? (pointer.y - r.top) / H - 0.5 : 0;
    cam.position.x += (nx * 1.6 - cam.position.x) * 0.05;
    cam.position.y += (2.0 - ny * 0.8 - cam.position.y) * 0.05;
    cam.position.z = 14.2;
    cam.lookAt(0, 1.35, 0);

    // 카드 배치
    let frontI = 0, best = -9;
    cards.forEach((c, i) => {
      const a = i * STEP + st.rot;
      const facing = Math.cos(a);                     // 1 = 정면
      if (facing > best) { best = facing; frontI = i; }
      const on = i === st.hovered ? 1 : 0;
      c.hover += (on - c.hover) * 0.1;
      c.push += (on * 0.7 - c.push) * 0.1;
      if (on && hit.uv) { c.tiltY += ((hit.uv.x - 0.5) * 0.35 - c.tiltY) * 0.12; c.tiltX += (-(hit.uv.y - 0.5) * 0.25 - c.tiltX) * 0.12; c.mesh.material.uniforms.uHit.value.copy(hit.uv); }
      else { c.tiltY *= 0.9; c.tiltX *= 0.9; }
      const rr = RING + c.push;
      for (const [h, mesh] of [[c.holder, c.mesh], [c.mHolder, c.mMesh]]) {
        h.position.set(Math.sin(a) * rr, CH / 2 + LIFT, Math.cos(a) * rr);
        h.rotation.set(0, a, 0);
        mesh.rotation.set(c.tiltX, c.tiltY, 0);
        mesh.scale.setScalar(1 + c.hover * 0.06);
        const u = mesh.material.uniforms;
        u.uTime.value = time; u.uHover.value = c.hover; u.uBend.value = bend;
        u.uFront.value = clamp(facing * 1.4 + 0.4, 0, 1);
        u.uDim.value = st.hovered >= 0 && i !== st.hovered ? 0.45 : 1;
      }
    });
    st.front = frontI;
    showInfo(st.hovered >= 0 ? st.hovered : frontI);
    floor.material.uniforms.uTime.value = time;
    renderer.render(scene, cam);
  }
  return { section, update };
}
