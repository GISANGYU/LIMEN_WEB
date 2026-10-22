// 1 HERO — 무드1 구도(세로 오로라 커튼 + 수평선 섬광 + 수면 반사)를 전체화면 셰이더로,
// 깊이감은 3D 먼지 입자(z 방향으로 흘러옴)로. 마우스: 커튼 헤치기 · 수면 물결 · 입자 밀어내기.
// 스크롤: 커튼 사이로 다이브(z) → 어둠으로 넘어감.
import * as THREE from 'three';
import { $, $$, ss, clamp, pointer, reduced } from './util.js';

const HOR = -0.42;   // 화면 높이 기준 수평선 (-1 ~ 1)
const NRIP = 8;

const VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uTime, uAspect, uDive, uIntro, uMouseAmt, uFade;
uniform vec2 uMouse;
uniform vec4 uRip[${NRIP}];
#define HOR ${HOR.toFixed(3)}

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float ss_(float a, float b, float v) { float k = clamp((v - a) / (b - a), 0.0, 1.0); return k * k * (3.0 - 2.0 * k); }

vec3 aurora(vec2 p, float t, float mouseOn) {
  float h = p.y - HOR;
  float x = p.x;
  // 커서 자리의 커튼을 손으로 헤친 것처럼 좌우로 민다
  vec2 dm = (p - uMouse) * vec2(1.0, 0.55);
  float g = exp(-dot(dm, dm) * 10.0) * mouseOn;
  x -= (p.x - uMouse.x) * g * (0.55 + 0.35 * uMouseAmt);   // 커서 쪽으로 당겨 샘플 → 커튼이 밀려나 보임 (연속)

  float warp = fbm(vec2(x * 0.7, h * 0.5 - t * 0.045));
  float cols = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i), s = 1.0 + fi * 0.75;
    float n = fbm(vec2((x + warp * 0.55) * 1.5 * s + fi * 3.1, h * 0.25 * s - t * (0.035 + fi * 0.012)));
    float streak = pow(smoothstep(0.42, 0.86, n), 1.6);
    float rays = noise(vec2((x + warp * 0.3) * 30.0 * s, t * 0.25 + fi)) * 0.5 + 0.5;
    cols += streak * (0.62 + 0.38 * rays) / (1.0 + fi * 0.55);
  }
  float side = mix(0.18, 1.0, smoothstep(0.12, 1.15, abs(x)));            // 가운데는 비워 둔다
  float prof = exp(-h * mix(2.8, 1.25, side)) * mix(0.45, 1.0, smoothstep(0.0, 0.05, h));
  prof *= smoothstep(uIntro * 2.2 + 0.05, uIntro * 2.2 - 0.55, h);         // 등장: 아래에서 위로 차오름
  vec3 col = mix(vec3(0.04, 0.16, 0.62), vec3(0.36, 0.92, 0.98), exp(-h * 1.9));
  col = mix(col, vec3(0.86, 0.95, 1.0), pow(exp(-h * 5.0), 2.0));
  vec3 c = col * cols * prof * side * 2.3;

  // 무드1의 대각 빛 띠 — 수평선 가운데에서 오른쪽 위로
  float rx = x - 0.02;
  float ry = HOR + 0.015 + max(rx, 0.0) * 0.36 + sin(rx * 2.3 + t * 0.35) * 0.035 * rx;
  float rd = abs(p.y - ry);
  float on = smoothstep(-0.15, 0.22, rx) * (1.0 - smoothstep(0.7, 2.0, rx)) * smoothstep(0.1, 0.6, uIntro);
  c += vec3(0.62, 0.96, 1.0) * on * (exp(-rd * rd * 5000.0) * 1.25 + exp(-rd * 42.0) * 0.12);

  // 별가루
  vec2 sp = floor(p * 150.0);
  float sr = hash(sp);
  c += step(0.9955, sr) * smoothstep(0.15, 0.7, h) * vec3(0.7, 0.86, 1.0) * (0.45 + 0.55 * sin(t * 2.2 + sr * 60.0)) * 0.7 * uIntro;
  // 수평선 섬광
  c += vec3(0.86, 0.96, 1.0) * exp(-abs(h) * 70.0) * exp(-x * x * 2.2) * (0.35 + 0.6 * smoothstep(0.0, 0.3, uIntro));
  // 커서 빛
  c += vec3(0.3, 0.72, 1.0) * g * (0.12 + 0.35 * uMouseAmt) * smoothstep(0.0, 0.12, h);
  return c;
}

void main() {
  float t = uTime;
  vec2 p = vUv * 2.0 - 1.0; p.x *= uAspect;
  // 다이브: 커튼 사이 한 점으로 빨려 들어간다
  vec2 fo = vec2(0.0, HOR + 0.22);
  p = fo + (p - fo) / (1.0 + uDive * uDive * 2.6);

  vec3 c;
  if (p.y >= HOR) {
    c = aurora(p, t, 1.0);
  } else {
    float d = HOR - p.y;
    float persp = 1.0 / (d + 0.035);
    // 기본 수면 일렁임 (원근: 멀수록 촘촘)
    float off = (noise(vec2(p.x * 5.0, d * persp * 0.9 - t * 0.55)) - 0.5) * 0.05 * (0.25 + d * 2.5);
    // 커서가 만든 물결
    for (int i = 0; i < ${NRIP}; i++) {
      vec4 r = uRip[i];
      float age = t - r.z;
      if (r.w <= 0.0 || age < 0.0 || age > 4.0) continue;
      vec2 q = (p - r.xy) * vec2(1.0, 3.2);
      float dist = length(q);
      off += sin(dist * 70.0 - age * 9.0) * exp(-age * 1.1) * exp(-dist * 3.0) * smoothstep(age * 0.55 + 0.05, age * 0.55 - 0.05, dist) * r.w * 0.035;
    }
    vec2 rp = vec2(p.x + off, HOR + d * 1.25 + off * 0.6);
    c = aurora(rp, t, 0.6) * 0.62 * exp(-d * 1.6);
    // 수면 위 가로 반짝임
    float gl = pow(noise(vec2(p.x * 2.5 + off * 20.0, d * persp * 2.2 + t * 0.25)), 9.0);
    c += vec3(0.55, 0.88, 1.0) * gl * 0.55 * exp(-d * 2.4) * uIntro;
  }

  // 다이브 끝에서 한 번 밝아졌다가 어둠으로
  c += vec3(0.5, 0.8, 1.0) * ss_(0.55, 0.8, uDive) * (1.0 - ss_(0.8, 1.0, uDive)) * 0.18;
  c = 1.0 - exp(-c * 1.25);
  vec2 v = vUv - 0.5; c *= 1.0 - dot(v, v) * 0.9;
  c *= uFade;
  gl_FragColor = vec4(pow(c, vec3(0.92)), 1.0);
}`;

// 3D 먼지 — z 로 흘러와 카메라를 지나간다. 커서 근처는 화면 공간에서 밀려난다
const P_VERT = /* glsl */`
uniform float uTime, uDive, uPix;
uniform vec2 uMouseNdc;
uniform float uMouseAmt;
attribute vec4 aSeed;
varying float vA;
void main() {
  vec3 p = position;
  float speed = 0.5 + aSeed.x * 0.9;
  p.z = mod(p.z + uTime * speed + uDive * uDive * 38.0, 36.0) - 31.0;
  p.x += sin(uTime * 0.3 + aSeed.y * 6.28) * 0.25;
  p.y += cos(uTime * 0.25 + aSeed.z * 6.28) * 0.18;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 cp = projectionMatrix * mv;
  vec2 ndc = cp.xy / cp.w;
  vec2 dd = ndc - uMouseNdc; dd.x *= 1.7;
  float g = exp(-dot(dd, dd) * 26.0);
  mv.xy += normalize(dd + 1e-4) * g * (0.5 + 1.6 * uMouseAmt) * (-mv.z) * 0.06;
  gl_Position = projectionMatrix * mv;
  float near = smoothstep(0.2, 3.5, -mv.z), far = 1.0 - smoothstep(18.0, 30.0, -mv.z);
  vA = near * far * (0.35 + 0.65 * aSeed.w) * (0.55 + 0.45 * sin(uTime * (1.0 + aSeed.y * 2.0) + aSeed.z * 30.0));
  vA *= 1.0 + g * 1.5;
  gl_PointSize = uPix * (0.6 + aSeed.w * 1.6) * (16.0 / -mv.z);
}`;
const P_FRAG = /* glsl */`
precision highp float;
varying float vA;
uniform float uFade;
void main() {
  vec2 c = gl_PointCoord - 0.5; float d = dot(c, c) * 4.0;
  float a = exp(-d * 3.5) * vA * uFade;
  gl_FragColor = vec4(vec3(0.7, 0.92, 1.0) * a, a);
}`;

export function initHero() {
  const section = $('#hero'), canvas = $('#heroCanvas'), logo = $('#heroLogo'), hint = $('#heroHint');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x03060c, 1);
  renderer.autoClear = false;

  // 배경 셰이더 (화면 고정 사각형)
  const bgU = {
    uTime: { value: 0 }, uAspect: { value: 1 }, uDive: { value: 0 }, uIntro: { value: 0 }, uMouseAmt: { value: 0 }, uFade: { value: 1 },
    uMouse: { value: new THREE.Vector2(9, 9) }, uRip: { value: Array.from({ length: NRIP }, () => new THREE.Vector4(0, 0, -99, 0)) },
  };
  const bgScene = new THREE.Scene();
  bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: bgU, depthWrite: false, depthTest: false })));
  const bgCam = new THREE.Camera();

  // 입자
  const N = reduced ? 1800 : 6500;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18; pos[i * 3 + 1] = -1.6 + Math.random() * 7.5; pos[i * 3 + 2] = Math.random() * 36;
    seed.set([Math.random(), Math.random(), Math.random(), Math.pow(Math.random(), 3)], i * 4);
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const pU = { uTime: { value: 0 }, uDive: { value: 0 }, uPix: { value: 1 }, uMouseNdc: { value: new THREE.Vector2(9, 9) }, uMouseAmt: { value: 0 }, uFade: { value: 1 } };
  const points = new THREE.Points(pg, new THREE.ShaderMaterial({ vertexShader: P_VERT, fragmentShader: P_FRAG, uniforms: pU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  points.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(points);
  const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 80);
  cam.position.set(0, 1.1, 6);

  let W = 1, H = 1;
  function resize() {
    W = innerWidth; H = innerHeight;
    const dpr = Math.min(devicePixelRatio, 1.25);
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    bgU.uAspect.value = W / H; cam.aspect = W / H; cam.updateProjectionMatrix();
    pU.uPix.value = dpr * Math.min(W, 1920) / 1920 * 4.5;
  }
  resize(); addEventListener('resize', resize);

  // 등장 애니메이션
  const intro = { k: 0 };
  gsap.to(intro, { k: 1, duration: 3.2, ease: 'power2.inOut', delay: 0.2 });
  gsap.to($$('.logo span', logo), { opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.8, stagger: 0.12, ease: 'power3.out', delay: 1.1 });
  gsap.to($('.logo-line', logo), { height: 96, duration: 1.4, ease: 'power2.inOut', delay: 2.2 });
  gsap.to($('.logo-sub', logo), { opacity: 1, duration: 1.4, delay: 2.9 });

  // 마우스 → 셰이더 좌표 (p 공간: x 는 -aspect ~ aspect, y 는 -1 ~ 1)
  const m = { x: 9, y: 9, amt: 0, ripI: 0, lastRip: 0, lx: 0, ly: 0 };
  const toP = (cx, cy) => [((cx / W) * 2 - 1) * (W / H), -((cy / H) * 2 - 1)];

  let time = 0, last = performance.now();
  function update(p) {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    // 커서
    const [px, py] = toP(pointer.x, pointer.y);
    const inHero = pointer.moved;
    m.x += ((inHero ? px : 0) - m.x) * 0.12; m.y += ((inHero ? py : 0.3) - m.y) * 0.12;
    const sp = Math.hypot(pointer.vx, pointer.vy);
    m.amt += (clamp(sp / 900) - m.amt) * 0.08;
    // 물결: 커서가 움직이면 일정 간격으로 수면에 떨어뜨린다
    if (inHero && sp > 60 && time - m.lastRip > 0.09) {
      const rx = px, ry = Math.min(py, HOR - 0.03 - Math.max(0, py - HOR) * 0.08);
      bgU.uRip.value[m.ripI].set(rx, ry, time, clamp(sp / 1400, 0.25, 1));
      m.ripI = (m.ripI + 1) % NRIP; m.lastRip = time;
    }
    const dive = reduced ? 0 : ss(0.0, 1.0, p);
    bgU.uTime.value = pU.uTime.value = time;
    bgU.uIntro.value = intro.k;
    bgU.uMouse.value.set(m.x, m.y); bgU.uMouseAmt.value = pU.uMouseAmt.value = m.amt;
    bgU.uDive.value = pU.uDive.value = dive;
    const fade = 1 - ss(0.72, 1.0, p);
    bgU.uFade.value = fade; pU.uFade.value = fade * intro.k;
    pU.uMouseNdc.value.set((pointer.x / W) * 2 - 1, -((pointer.y / H) * 2 - 1));
    // 카메라: 커서 반대쪽으로 살짝 기울어 시차
    const nx = pointer.x / W - 0.5, ny = pointer.y / H - 0.5;
    cam.position.x += (-nx * 0.8 - cam.position.x) * 0.05;
    cam.position.y += (1.1 + ny * 0.4 - cam.position.y) * 0.05;
    cam.lookAt(0, 1.0, -12);

    // 로고: 커서 시차 + 다이브 때 커지며 흐려짐
    const lk = ss(0.05, 0.6, p);
    logo.style.transform = `translate(calc(-50% + ${(-nx * 14).toFixed(1)}px), calc(-50% + ${(-ny * 10).toFixed(1)}px)) scale(${(1 + lk * 0.55).toFixed(3)})`;
    logo.style.filter = `blur(${(lk * 16).toFixed(1)}px)`;
    logo.style.opacity = (1 - lk).toFixed(3);
    hint.style.opacity = (1 - ss(0.0, 0.08, p)).toFixed(3);

    renderer.clear();
    renderer.render(bgScene, bgCam);
    renderer.render(scene, cam);
  }
  return { section, update };
}
