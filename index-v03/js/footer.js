// FOOTER — 피그마 푸터 배경 위로, uncommon.nl/studio 푸터처럼 크게 흐린 검은 사람 실루엣이 지나간다.
// 영상 원본은 uncommon 것이 아니라 우리 Unity 사람 씬 녹화(media/ghost_one.mp4, LIMEN_people_front_v01 3~16초 정면 가운데 크롭 · 흑백).
// 1단계(저해상도 버퍼): 밝기 → 몸 마스크, 이전 프레임과 섞어 느린 잔상. 2단계(화면): 넓게 흐리고 파란 바탕을 깎아 실루엣으로.
// 커서를 대면 그 자리의 형체가 흩어진다.
import * as THREE from 'three';
import { $, clamp, pointer, ensurePlay } from './util.js';

const QUAD_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const NOISE = /* glsl */`
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }`;

const MASK_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uVideo, uPrev;
uniform vec2 uRes, uMouse;
uniform float uTime, uVidAsp, uMouseAmt;
${NOISE}
void main() {
  vec2 uv = vUv;
  // 한 사람이 다가오는 구간(정면 가운데 크롭). 영상 높이 = 화면 높이의 125%, 가운데보다 살짝 왼쪽
  float vh = 1.25, vw = vh * uRes.y * uVidAsp / uRes.x;
  vec2 v = vec2((uv.x - 0.47) / vw + 0.5, (uv.y + 0.12) / vh);
  vec2 dm = (uv - uMouse) * vec2(uRes.x / uRes.y, 1.0);
  float g = exp(-dot(dm, dm) * 14.0) * (0.35 + uMouseAmt);
  v += (vec2(noise(v * 6.0 + uTime * 0.4), noise(v * 6.0 + 9.0 - uTime * 0.3)) - 0.5) * (0.01 + g * 0.08);
  float l = 0.0;
  for (int i = 0; i < 12; i++) { float a = float(i) * 2.399, r = sqrt(float(i) / 12.0) * 0.012; l += texture2D(uVideo, v + vec2(cos(a), sin(a)) * r).r; }
  l /= 12.0;
  float m = smoothstep(0.07, 0.42, l) * step(0.0, v.y) * step(v.y, 1.0) * step(0.0, v.x) * step(v.x, 1.0);
  m *= 1.0 - g * smoothstep(0.35, 0.75, noise(uv * 40.0 + uTime * 2.0)) * 1.4;
  float prev = texture2D(uPrev, uv + vec2(0.0, -0.0006)).r;
  float o = mix(prev, max(m, 0.0), 0.16);                   // 느린 잔상
  gl_FragColor = vec4(o, o, o, 1.0);
}`;

const SHOW_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uMask, uBg;
uniform vec2 uCover;
uniform float uTime, uOn;
uniform vec2 uTexel;
${NOISE}
void main() {
  // 넓은 블러 (16탭 · 저해상도 버퍼라 실제로는 더 넓다)
  float m = 0.0;
  for (int i = 0; i < 16; i++) { float a = float(i) * 2.399, r = sqrt(float(i) / 16.0) * 9.0; m += texture2D(uMask, vUv + vec2(cos(a), sin(a)) * r * uTexel).r; }
  m /= 16.0;
  // 파란 바탕: 아래가 밝고 위가 짙다 + 느리게 흐르는 빛 얼룩
  // 바탕 = 피그마 푸터 배경(흐린 남색 · 라벤더, 글자 지움). 느리게 숨 쉬며 흐른다
  vec2 buv = (vUv - 0.5) * uCover + 0.5;
  buv += (vec2(noise(buv * 2.0 + uTime * 0.03), noise(buv * 2.0 + 4.0 - uTime * 0.025)) - 0.5) * 0.04;
  vec3 bg = texture2D(uBg, buv).rgb * 1.15;
  bg *= 0.88 + 0.24 * noise(vUv * vec2(2.0, 1.5) + uTime * 0.03);
  vec3 c = bg * (1.0 - 0.82 * smoothstep(0.05, 0.75, m));                            // 실루엣 = 바탕을 깎는 검은 형체
  c += (hash(vUv * 900.0 + uTime) - 0.5) * 0.025;
  gl_FragColor = vec4(max(c, 0.0) * uOn, 1.0);
}`;

export function initFooter() {
  const section = $('#footer'), canvas = $('#ftCanvas'), video = $('#ghostVideo');
  ensurePlay(video);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setClearColor(0x050a18, 1);
  const vtex = new THREE.VideoTexture(video);
  const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let rtA = new THREE.WebGLRenderTarget(4, 4, opts), rtB = new THREE.WebGLRenderTarget(4, 4, opts);

  const mU = { uVideo: { value: vtex }, uPrev: { value: rtA.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uMouse: { value: new THREE.Vector2(9, 9) }, uTime: { value: 0 }, uVidAsp: { value: 400 / 608 }, uMouseAmt: { value: 0 } };
  const bgTex = new THREE.TextureLoader().load('media/figma/footer_bg.jpg'); bgTex.colorSpace = THREE.NoColorSpace;
  const sU = { uMask: { value: rtB.texture }, uBg: { value: bgTex }, uCover: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 }, uOn: { value: 0 }, uTexel: { value: new THREE.Vector2(1, 1) } };
  const quad = new THREE.PlaneGeometry(2, 2), cam = new THREE.Camera();
  const mScene = new THREE.Scene(); mScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: MASK_FRAG, uniforms: mU })));
  const sScene = new THREE.Scene(); sScene.add(new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: SHOW_FRAG, uniforms: sU })));

  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setPixelRatio(1); renderer.setSize(W, H, false);
    const w = Math.round(W * 0.25), h = Math.round(H * 0.25);
    rtA.setSize(w, h); rtB.setSize(w, h);
    mU.uRes.value.set(W, H); sU.uTexel.value.set(1 / w, 1 / h);
    const ia = 1920 / 1410, ea = W / H;
    sU.uCover.value.set(ea > ia ? 1 : ea / ia, ea > ia ? ia / ea : 1);
  }
  resize(); addEventListener('resize', resize);

  let time = 0, last = performance.now(), amt = 0, on = 0;
  const m = new THREE.Vector2(9, 9);
  function update() {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    if (video.paused) video.play().catch(() => {});
    const r = canvas.getBoundingClientRect();
    m.x += ((pointer.x - r.left) / r.width - m.x) * 0.12; m.y += ((1 - (pointer.y - r.top) / r.height) - m.y) * 0.12;
    amt += (clamp(Math.hypot(pointer.vx, pointer.vy) / 1000) - amt) * 0.08;
    on += (1 - on) * 0.04;
    mU.uMouse.value.copy(m); mU.uMouseAmt.value = amt; mU.uTime.value = time; mU.uPrev.value = rtA.texture;
    renderer.setRenderTarget(rtB); renderer.render(mScene, cam);
    sU.uMask.value = rtB.texture; sU.uTime.value = time; sU.uOn.value = on;
    renderer.setRenderTarget(null); renderer.render(sScene, cam);
    [rtA, rtB] = [rtB, rtA];
  }
  return { section, update };
}
