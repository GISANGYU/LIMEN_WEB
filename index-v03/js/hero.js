// 1 HERO + 2 SLOGAN 배경 — 피그마 원본 빛 이미지(media/figma/hero_bg.jpg, 1920×2096, 글자 지움)를 WebGL 로.
// · 천처럼 천천히 흐른다(도메인 왜곡)  · 커서가 지나간 길이 물처럼 밀리고 퍼진다(최근 궤적 16점)
// · 커서 둘레가 밝아지고 색이 살짝 갈라진다  · 3D 먼지가 z 로 흘러와 커서를 피한다
// · 캔버스는 화면에 고정(sticky)하고 스크롤만큼 이미지를 0.86 배속으로 옮겨 시차를 만든다
import * as THREE from 'three';
import { $, $$, ss, clamp, pointer, reduced } from './util.js';

const NT = 16;
const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes, uImg;             // 캔버스 px, 이미지가 차지하는 블록 크기 px
uniform float uOffset, uTime, uIntro, uPar;
uniform vec4 uTrail[${NT}];          // xy = 블록 px, z = 나이(초), w = 세기
uniform vec2 uMouse;                 // 블록 px
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
void main() {
  vec2 frag = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  vec2 bp = vec2(frag.x, frag.y + uOffset);                 // 블록 좌표 (커서와 같은 공간)
  vec2 ip = vec2(frag.x, frag.y + uOffset * uPar);          // 이미지 좌표 (시차)
  // 등장: 살짝 확대된 상태에서 제자리로
  vec2 c0 = vec2(uImg.x * 0.6, uImg.y * 0.22);
  ip = c0 + (ip - c0) / (1.0 + (1.0 - uIntro) * 0.08);
  vec2 uv = ip / uImg; uv.y = 1.0 - uv.y;            // 텍스처는 아래가 0
  // 천처럼 흐름
  float t = uTime;
  vec2 q = uv * vec2(2.2, 2.0);
  vec2 flow = vec2(fbm(q + vec2(0.0, t * 0.035)), fbm(q + vec2(5.2, 1.3) - t * 0.03)) - 0.5;
  vec2 off = flow * 0.016;
  // 커서 궤적: 밀어내기 + 물결
  float glow = 0.0;
  for (int i = 0; i < ${NT}; i++) {
    vec4 tr = uTrail[i];
    if (tr.w <= 0.0) continue;
    vec2 d = bp - tr.xy; float r = length(d) + 1e-3;
    float life = exp(-tr.z * 1.3);
    off -= (d / r) * exp(-r * r / 16000.0) * tr.w * life * 0.018;                    // 밀림
    off += (d / r) * sin(r * 0.05 - tr.z * 7.0) * exp(-r / 220.0) * tr.w * life * 0.004; // 퍼지는 물결
    glow += exp(-r * r / 30000.0) * tr.w * life;
  }
  vec2 dm = bp - uMouse; float mg = exp(-dot(dm, dm) / 60000.0);
  float k = length(off) * 6.0 + mg * 0.4;
  vec3 col;
  col.r = texture2D(uTex, uv + off * (1.0 + k * 0.6)).r;
  col.g = texture2D(uTex, uv + off).g;
  col.b = texture2D(uTex, uv + off * (1.0 - k * 0.6)).b;
  // 숨 쉬는 빛 + 커서 둘레 밝힘
  col *= 0.92 + 0.12 * fbm(uv * 3.0 + t * 0.05);
  col += col * (mg * 0.35 + clamp(glow, 0.0, 1.5) * 0.25);
  col += vec3(0.55, 0.6, 1.0) * clamp(glow, 0.0, 1.0) * 0.03;
  float inside = step(0.0, uv.y) * step(uv.y, 1.0);
  col *= inside * uIntro;
  col += (hash(frag + t) - 0.5) * 0.03;
  gl_FragColor = vec4(col, 1.0);
}`;

// 3D 먼지 (v01 과 같은 방식, 빛 색만 피그마 팔레트로)
const P_VERT = /* glsl */`
uniform float uTime, uPix, uMouseAmt; uniform vec2 uMouseNdc;
attribute vec4 aSeed; varying float vA;
void main() {
  vec3 p = position;
  p.z = mod(p.z + uTime * (0.4 + aSeed.x * 0.8), 34.0) - 30.0;
  p.x += sin(uTime * 0.3 + aSeed.y * 6.28) * 0.25; p.y += cos(uTime * 0.25 + aSeed.z * 6.28) * 0.18;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); vec4 cp = projectionMatrix * mv;
  vec2 dd = cp.xy / cp.w - uMouseNdc; dd.x *= 1.7;
  float g = exp(-dot(dd, dd) * 26.0);
  mv.xy += normalize(dd + 1e-4) * g * (0.5 + 1.6 * uMouseAmt) * (-mv.z) * 0.06;
  gl_Position = projectionMatrix * mv;
  float near = smoothstep(0.2, 3.5, -mv.z), far = 1.0 - smoothstep(16.0, 28.0, -mv.z);
  vA = near * far * (0.3 + 0.7 * aSeed.w) * (0.5 + 0.5 * sin(uTime * (1.0 + aSeed.y * 2.0) + aSeed.z * 30.0)) * (1.0 + g * 1.5);
  gl_PointSize = uPix * (0.6 + aSeed.w * 1.5) * (16.0 / -mv.z);
}`;
const P_FRAG = /* glsl */`
precision highp float; varying float vA; uniform float uFade;
void main() { vec2 c = gl_PointCoord - 0.5; float a = exp(-dot(c, c) * 14.0) * vA * uFade; gl_FragColor = vec4(vec3(0.72, 0.78, 1.0) * a, a); }`;

export function initHero() {
  const section = $('#top'), canvas = $('#heroCanvas'), logo = $('#heroLogo'), sub = $('.hero-sub');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 1); renderer.autoClear = false;
  const tex = new THREE.TextureLoader().load('media/figma/hero_bg.jpg');
  tex.colorSpace = THREE.NoColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const U = {
    uTex: { value: tex }, uRes: { value: new THREE.Vector2(1, 1) }, uImg: { value: new THREE.Vector2(1, 1) },
    uOffset: { value: 0 }, uTime: { value: 0 }, uIntro: { value: 0 }, uPar: { value: reduced ? 1 : 0.86 },
    uTrail: { value: Array.from({ length: NT }, () => new THREE.Vector4(0, 0, 99, 0)) }, uMouse: { value: new THREE.Vector2(-9999, -9999) },
  };
  const bg = new THREE.Scene(); bg.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: U, depthTest: false, depthWrite: false })));
  const bgCam = new THREE.Camera();

  const N = reduced ? 1200 : 4200;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * 18, -2 + Math.random() * 8, Math.random() * 34], i * 3); seed.set([Math.random(), Math.random(), Math.random(), Math.pow(Math.random(), 3)], i * 4); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const PU = { uTime: { value: 0 }, uPix: { value: 1 }, uMouseNdc: { value: new THREE.Vector2(9, 9) }, uMouseAmt: { value: 0 }, uFade: { value: 0 } };
  const pts = new THREE.Points(pg, new THREE.ShaderMaterial({ vertexShader: P_VERT, fragmentShader: P_FRAG, uniforms: PU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pts.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(pts);
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 80); cam.position.set(0, 1, 6);

  let W = 1, H = 1;
  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25)); renderer.setSize(W, H, false);
    U.uRes.value.set(W, H); U.uImg.value.set(W, W * 2096 / 1920);
    cam.aspect = W / H; cam.updateProjectionMatrix(); PU.uPix.value = Math.min(W, 1920) / 1920 * 4.2;
  }
  resize(); addEventListener('resize', resize);

  // 등장: 배경이 어둠에서 밝아지며 제자리로 → 로고 글자가 아래 마스크에서 솟음 → 부제 단어 → 아래 줄은 글자 섞임
  const intro = { k: 0 };
  gsap.to(intro, { k: 1, duration: 2.4, ease: 'power2.out', delay: 0.1 });
  gsap.fromTo($$('b', logo), { yPercent: 108 }, { yPercent: 0, duration: 1.2, stagger: 0.06, ease: 'expo.out', delay: 0.7 });
  const subWords = [...sub.querySelectorAll('.w')];
  subWords.forEach((w, i) => setTimeout(() => w.classList.add('on'), 1300 + i * 70));
  $$('[data-scramble-in]').forEach((el, i) => { el.style.visibility = 'hidden'; setTimeout(() => { el.style.visibility = 'visible'; window.__scramble?.(el, 700); }, 1700 + i * 160); });

  const trail = []; let lastAdd = 0, time = 0, last = performance.now(), amt = 0;
  function update() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    const r = section.getBoundingClientRect();
    const offset = clamp(-r.top, 0, r.height - H);
    // 커서 → 블록 좌표, 움직일 때 궤적 점 추가
    const bx = pointer.x, by = pointer.y - r.top;
    const sp = Math.hypot(pointer.vx, pointer.vy);
    amt += (clamp(sp / 900) - amt) * 0.08;
    if (pointer.moved && sp > 40 && time - lastAdd > 0.03) { trail.unshift({ x: bx, y: by, t: time, w: clamp(sp / 1500, 0.25, 1) }); lastAdd = time; if (trail.length > NT) trail.pop(); }
    U.uTrail.value.forEach((v, i) => { const p = trail[i]; if (p) v.set(p.x, p.y, time - p.t, p.w); else v.set(0, 0, 99, 0); });
    U.uMouse.value.set(pointer.moved ? bx : -9999, by);
    U.uOffset.value = offset; U.uTime.value = PU.uTime.value = time; U.uIntro.value = intro.k;
    PU.uMouseNdc.value.set(pointer.x / W * 2 - 1, -(pointer.y / H) * 2 + 1); PU.uMouseAmt.value = amt;
    PU.uFade.value = intro.k * (1 - ss(0.0, H * 1.2, offset));
    const nx = pointer.x / W - 0.5, ny = pointer.y / H - 0.5;
    cam.position.x += (-nx * 0.8 - cam.position.x) * 0.05; cam.position.y += (1 + ny * 0.4 - cam.position.y) * 0.05; cam.lookAt(0, 1, -12);
    // 로고: 스크롤에 조금 더 빨리 올라가며 옅어짐
    logo.style.transform = `translateY(${(-offset * 0.18).toFixed(1)}px)`;
    logo.style.opacity = (1 - ss(H * 0.15, H * 0.75, offset)).toFixed(3);
    renderer.clear(); renderer.render(bg, bgCam); renderer.render(scene, cam);
  }
  return { section, update };
}
