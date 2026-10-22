// FOOTER — Unity 사람 씬 녹화(media/ghost.mp4, LIMEN_people_front_v01 흑백)를 셰이더로
// 밝기 → 실루엣, 노이즈 일렁임, 블러, 색 번짐, 잔상 버퍼(이전 프레임을 위로 흘리며 섞음)로 유령처럼.
// 커서를 대면 그 자리의 형체가 흩어진다.
import * as THREE from 'three';
import { $, clamp, pointer, ensurePlay } from './util.js';

const QUAD_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const NOISE = /* glsl */`
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.1; a *= 0.5; } return s; }`;

const GHOST_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uVideo, uPrev;
uniform vec2 uRes, uMouse;
uniform float uTime, uVidAsp, uMouseAmt;
${NOISE}
float lumAt(vec2 v) { return texture2D(uVideo, v).r; }
void main() {
  vec2 uv = vUv;
  // 영상 높이 = 화면의 58%, 아래에서 6% 띄움. 가로는 거울 반복 + 아주 느린 흐름
  float vh = 0.58, vw = vh * uRes.y * uVidAsp / uRes.x;
  vec2 v = vec2((uv.x - 0.5) / vw + 0.5 + uTime * 0.006, (uv.y - 0.06) / vh);
  v.x = abs(mod(v.x + 1.0, 2.0) - 1.0);
  // 커서 영향
  vec2 dm = (uv - uMouse) * vec2(uRes.x / uRes.y, 1.0);
  float g = exp(-dot(dm, dm) * 18.0) * (0.4 + uMouseAmt);
  // 일렁임 (가장자리일수록 크게) + 커서 자리 소용돌이
  vec2 n = vec2(fbm(v * vec2(5.0, 3.0) + vec2(0.0, uTime * 0.35)), fbm(v * vec2(5.0, 3.0) + vec2(7.3, uTime * 0.3))) - 0.5;
  v += n * (0.018 + g * 0.09);
  v += vec2(-dm.y, dm.x) * g * 0.05;
  // 블러 (9탭) + 색 번짐
  float r = 0.0035 + g * 0.012;
  float l = 0.0, lr = 0.0, lb = 0.0;
  for (int i = 0; i < 9; i++) {
    float a = float(i) * 2.399, k = sqrt(float(i) / 9.0);
    vec2 o = vec2(cos(a), sin(a)) * r * k;
    l += lumAt(v + o);
    lr += lumAt(v + o + vec2(0.004, 0.0));
    lb += lumAt(v + o - vec2(0.004, 0.0));
  }
  l /= 9.0; lr /= 9.0; lb /= 9.0;
  float inside = step(0.0, v.y) * step(v.y, 1.0);
  inside *= smoothstep(0.0, 0.12, v.y) * smoothstep(1.0, 0.75, v.y);   // 머리 위 · 발밑은 흐리게 사라짐
  // 실루엣: 몸통은 옅게, 윤곽은 진하게 (유령의 테)
  float body = smoothstep(0.15, 0.6, l);
  float e = abs(lumAt(v + vec2(0.006, 0.0)) - lumAt(v - vec2(0.006, 0.0))) + abs(lumAt(v + vec2(0.0, 0.01)) - lumAt(v - vec2(0.0, 0.01)));
  float sil = (body * 0.22 + smoothstep(0.05, 0.5, e) * 0.7) * inside;
  // 몸 안쪽을 흐르는 노이즈 줄기
  sil *= 0.55 + 0.6 * fbm(v * vec2(14.0, 4.0) + vec2(0.0, -uTime * 0.6));
  // 커서 자리는 노이즈 구멍으로 흩어진다
  sil *= 1.0 - g * smoothstep(0.3, 0.7, noise(uv * 60.0 + uTime * 3.0)) * 1.2;
  sil = max(sil, 0.0);
  float cr = (smoothstep(0.15, 0.6, lr) - body), cb = (smoothstep(0.15, 0.6, lb) - body);
  vec3 col = vec3(0.62, 0.8, 1.0) * sil + vec3(0.5, 0.2, 0.9) * max(cb, 0.0) * 0.18 * inside + vec3(0.2, 0.7, 0.8) * max(cr, 0.0) * 0.18 * inside;
  // 잔상: 이전 프레임을 살짝 위로 흘리며 옅게
  vec2 drift = vec2((noise(uv * 4.0 + uTime * 0.2) - 0.5) * 0.002, 0.0014);
  vec3 prev = texture2D(uPrev, uv - drift).rgb * 0.94;
  vec3 c = max(prev, col * 0.6) * 0.98 + col * 0.05;
  gl_FragColor = vec4(min(c, vec3(1.2)), 1.0);
}`;

const SHOW_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime, uOn;
${NOISE}
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  // 은은한 빛 번짐
  c += (texture2D(uTex, vUv + vec2(0.006, 0.0)).rgb + texture2D(uTex, vUv - vec2(0.006, 0.0)).rgb + texture2D(uTex, vUv + vec2(0.0, 0.01)).rgb) * 0.12;
  c *= 0.93 + 0.07 * sin(vUv.y * 700.0 + uTime * 10.0);             // 주사선
  c *= 0.92 + 0.08 * noise(vec2(uTime * 7.0, 0.0));                     // 깜빡임
  c += (hash(vUv * 800.0 + uTime) - 0.5) * 0.05;
  c *= smoothstep(1.0, 0.45, vUv.y) * 0.9;                              // 위쪽은 글자 자리라 어둡게
  vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 1.1;
  gl_FragColor = vec4(max(c, 0.0) * uOn, 1.0);
}`;

export function initFooter() {
  const section = $('#footer'), canvas = $('#ftCanvas'), video = $('#ghostVideo');
  ensurePlay(video);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setClearColor(0x03060c, 1);
  const vtex = new THREE.VideoTexture(video);
  vtex.minFilter = THREE.LinearFilter; vtex.magFilter = THREE.LinearFilter;
  const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let rtA = new THREE.WebGLRenderTarget(4, 4, opts), rtB = new THREE.WebGLRenderTarget(4, 4, opts);

  const gU = { uVideo: { value: vtex }, uPrev: { value: rtA.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(9, 9) }, uTime: { value: 0 }, uVidAsp: { value: 960 / 456 }, uMouseAmt: { value: 0 } };
  const sU = { uTex: { value: rtB.texture }, uTime: { value: 0 }, uOn: { value: 0 } };
  const quad = new THREE.PlaneGeometry(2, 2), cam = new THREE.Camera();
  const gScene = new THREE.Scene(); gScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: GHOST_FRAG, uniforms: gU })));
  const sScene = new THREE.Scene(); sScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SHOW_FRAG, uniforms: sU })));

  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    const s = 0.6;                                  // 잔상 버퍼는 낮은 해상도로 (부드러움 + 성능)
    rtA.setSize(Math.round(W * s), Math.round(H * s)); rtB.setSize(Math.round(W * s), Math.round(H * s));
    gU.uRes.value.set(W, H);
  }
  resize(); addEventListener('resize', resize);

  let time = 0, last = performance.now(), amt = 0, on = 0;
  const m = new THREE.Vector2(9, 9);
  function update() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    if (video.paused) video.play().catch(() => {});
    const r = canvas.getBoundingClientRect();
    const tx = (pointer.x - r.left) / r.width, ty = 1 - (pointer.y - r.top) / r.height;
    m.x += (tx - m.x) * 0.15; m.y += (ty - m.y) * 0.15;
    amt += (clamp(Math.hypot(pointer.vx, pointer.vy) / 1000) - amt) * 0.08;
    on += (1 - on) * 0.03;
    gU.uMouse.value.copy(m); gU.uMouseAmt.value = amt; gU.uTime.value = time; gU.uPrev.value = rtA.texture;
    renderer.setRenderTarget(rtB); renderer.render(gScene, cam);
    sU.uTex.value = rtB.texture; sU.uTime.value = time; sU.uOn.value = on;
    renderer.setRenderTarget(null); renderer.render(sScene, cam);
    [rtA, rtB] = [rtB, rtA];
  }
  return { section, update };
}
