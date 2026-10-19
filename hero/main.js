// LIMEN HERO proto v01 — 유리 오로라가 열리며 로고가 드러나는 히어로
// 층: 하늘 → 오로라 커튼 4장(깊이 다름) → 별가루 → 수평선 광점 → 빛줄기 → 물 반사 → 블룸 → 유리 굴절·그레인
// 주소 인자: ?t=초 (등장 연출을 그 시점부터) · &hold (그 시점에 멈춤, 오로라는 계속 일렁임) · ?nobloom
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const q = new URLSearchParams(location.search);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const START_T = REDUCED ? 99 : parseFloat(q.get('t') || '0');
const HOLD = q.has('hold');

// 카메라: 물 위 낮은 눈높이, 위로 살짝 들어 수평선이 화면 80% 높이에 오게
const CAM = { y: 0.6, z: 12, pitch: THREE.MathUtils.degToRad(12.3), fov: 40 };
const DPR = Math.min(devicePixelRatio, 1.5);

// ───────────────────────── GLSL 공통 ─────────────────────────
const NOISE = /* glsl */`
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  for (int i = 0; i < 5; i++){ v += a*noise(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; }
  return v;
}`;

const VERT_WORLD = /* glsl */`
varying vec3 vWorld; varying vec2 vUv;
void main(){
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// ───────────────────────── 기본 세팅 ─────────────────────────
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.NoToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);
const camera = new THREE.PerspectiveCamera(CAM.fov, innerWidth / innerHeight, 0.1, 400);
camera.rotation.order = 'YXZ';
camera.position.set(0, CAM.y, CAM.z);

// 여러 재질이 같이 쓰는 값 (객체를 공유하면 한 번만 갱신하면 된다)
const U = {
  uTime: { value: 0 },
  uOpen: { value: 0 },      // 커튼 열림 0→1
  uReveal: { value: 0 },    // 커튼 몸체 드러남
  uMouse: { value: new THREE.Vector2(9, 9) },
  uRes: { value: new THREE.Vector2(innerWidth * DPR, innerHeight * DPR) },
};

// ───────────────────────── 하늘 ─────────────────────────
{
  const z = -90, dist = CAM.z - z;
  const geo = new THREE.PlaneGeometry(dist * 2.6, dist * 0.9);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uDist: { value: dist }, uTime: U.uTime },
    vertexShader: VERT_WORLD,
    fragmentShader: /* glsl */`
      uniform float uDist, uTime; varying vec3 vWorld;
      ${NOISE}
      void main(){
        float h = vWorld.y / uDist, ax = vWorld.x / uDist;
        vec3 top = vec3(.004, .008, .022), hor = vec3(.022, .045, .085);
        vec3 c = mix(hor, top, smoothstep(0., .45, h));
        float streak = fbm(vec2(ax * 26., h * .4 + uTime * .004));
        c *= .75 + .5 * streak;                               // 아주 옅은 세로 결
        c += vec3(.05, .10, .17) * exp(-h * 40.) * .7;        // 수평선 안개
        gl_FragColor = vec4(c, 1.);
      }`,
    depthWrite: false,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(0, dist * 0.45 - 1, z);
  m.renderOrder = -10;
  scene.add(m);
}

// ───────────────────────── 오로라 커튼 ─────────────────────────
// 각 장은 '각도 좌표'(x/거리, y/거리)로 그려서 깊이가 달라도 화면에서 같은 자리에 커튼이 선다.
// 거리는 시작 카메라 기준으로 고정 → 스크롤로 전진하면 커튼 사이 틈을 실제로 지나간다.
const CURTAIN_FRAG = /* glsl */`
uniform float uTime, uOpen, uReveal, uSeed, uDist, uGain, uPillar, uPillarH;
uniform vec2 uMouse, uRes; uniform vec3 uTint;
varying vec3 vWorld;
${NOISE}
void main(){
  float ax = vWorld.x / uDist;
  float h  = vWorld.y / uDist;
  float t  = uTime;

  // 커서 근처: 커튼이 바깥으로 살짝 밀리고 밝아진다
  vec2 sp = gl_FragCoord.xy / uRes * 2. - 1.;
  vec2 dm = sp - uMouse; dm.x *= uRes.x / uRes.y;
  float near = exp(-dot(dm, dm) * 6.);

  float sx = ax * 3.2 + uSeed - sign(dm.x) * near * .14;
  float warp = (fbm(vec2(sx * .7 + uSeed, t * .045)) - .5) * 1.1 + sin(h * 3. + t * .25 + sx) * .05;
  float x = sx + warp;

  float body = smoothstep(.40, .80, fbm(vec2(x * 1.9, h * .1 - t * .03)));
  body *= .35 + .65 * smoothstep(.3, .75, fbm(vec2(x * 5., h * .05 + uSeed)));  // 기둥 사이 어두운 틈
  float fine = fbm(vec2(x * 14., h * .22 + t * .015));
  float rays = pow(fine, 3.) * 2.2;                                 // 가는 세로 빛살
  float H = .45 + .75 * fbm(vec2(x * .35 + 3., t * .02));             // 자리마다 다른 커튼 높이
  float vprof = (.45 + .55 * exp(-h * 3.)) * smoothstep(H, H * .2, h) * smoothstep(-.002, .012, h);
  float vray = exp(-h * .7) * smoothstep(H * 1.3, 0., h) * smoothstep(-.002, .02, h);
  float base = exp(-h * 40.) * .5;                                   // 물 닿는 곳의 흰 띠

  // 색: 아래 흰빛 → 청록/파랑 → 위 남색
  float k = clamp(h / H, 0., 1.);
  float hue = fbm(vec2(x * .45 + 7., t * .01));
  vec3 mid = mix(vec3(.32, .95, .95), vec3(.28, .58, 1.15), smoothstep(.4, .6, hue));
  float hot = clamp(exp(-h * 22.) + pow(body, 3.) * exp(-h * 4.) * .7, 0., 1.);   // 흰빛은 물가와 강한 심지에만
  vec3 col = mix(mid, vec3(.92, 1., 1.05), hot);
  col = mix(col, vec3(.16, .34, .9), smoothstep(.6, 1.2, k)) * uTint;

  float I = body * .8 * vprof + rays * (.25 + .75 * body) * .55 * vray + base * body * .15;

  // 가운데가 열린다
  float a = abs(ax);
  float edge = uOpen * .23;
  float mask = smoothstep(edge - .015, edge + .13, a) * smoothstep(1.1, .75, a);
  float front = exp(-pow((a - edge) / .018, 2.)) * (1. - uOpen) * smoothstep(0., .04, uOpen) * exp(-h * 3.) * 1.4;
  I = (I * mask + front) * uReveal;
  I *= 1. + near * .3;
  I = 1.3 * (1. - exp(-I * 1.2));                                   // 밝은 곳이 하얗게 뭉개지지 않게

  // 열리기 전 가운데 빛기둥 하나
  float pil = exp(-pow(ax / .007, 2.)) * smoothstep(uPillarH, uPillarH * .25, h) * smoothstep(-.002, .01, h);
  vec3 c = col * I * uGain + vec3(.82, .96, 1.) * pil * uPillar * 1.5;
  gl_FragColor = vec4(c, 1.);
}`;

const LAYERS = [
  { z: -14, seed: 11.3, gain: .38, tint: [.85, .95, 1.1] },
  { z: -22, seed: 4.7,  gain: .56, tint: [1., 1., 1.] },
  { z: -32, seed: 23.1, gain: .75, tint: [1., 1.05, 1.] },
  { z: -46, seed: 8.9,  gain: .55, tint: [.8, .9, 1.15] },
];
const curtains = LAYERS.map((L, i) => {
  const dist = CAM.z - L.z;
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ...U,
      uSeed: { value: L.seed }, uDist: { value: dist }, uGain: { value: L.gain },
      uTint: { value: new THREE.Vector3(...L.tint) },
      uPillar: { value: 0 }, uPillarH: { value: 0 },
    },
    vertexShader: VERT_WORLD, fragmentShader: CURTAIN_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const W = dist * 2.4, Hh = dist * 0.75;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, Hh), mat);
  m.position.set(0, Hh / 2, L.z);
  m.renderOrder = -5 + i;
  scene.add(m);
  return m;
});
const pillarLayer = curtains[2].material;

// ───────────────────────── 별가루 ─────────────────────────
const dust = (() => {
  const N = 3600, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const z = -12 - Math.random() * 36, dist = CAM.z - z;
    const side = Math.random() < .68 ? -1 : 1;                  // 무드처럼 왼쪽에 더 많이
    const ax = side * (.22 + Math.pow(Math.random(), 1.6) * .5);
    const h = .02 + Math.pow(Math.random(), 1.3) * .5;
    pos.set([ax * dist, h * dist, z], i * 3);
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uOpen: U.uOpen, uReveal: U.uReveal, uPx: { value: 2.2 * DPR }, uCamZ: { value: CAM.z } },
    vertexShader: /* glsl */`
      attribute float aSeed; uniform float uTime, uOpen, uReveal, uPx, uCamZ; varying float vA;
      void main(){
        vec3 p = position;
        float d = uCamZ - p.z;
        float a = abs(p.x) / d;
        p.y += sin(uTime * .15 + aSeed * 40.) * .35 + uTime * .02 * (aSeed - .5);
        p.x += sin(uTime * .11 + aSeed * 70.) * .25;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPx * (.5 + aSeed * 1.3) * (30. / -mv.z), 1., 6.);
        float tw = .35 + .65 * pow(.5 + .5 * sin(uTime * (.8 + aSeed * 2.5) + aSeed * 90.), 3.);
        vA = tw * smoothstep(uOpen * .23, uOpen * .23 + .09, a) * uReveal * (.4 + .6 * exp(-p.y / d * 2.));
      }`,
    fragmentShader: /* glsl */`
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - .5);
        float s = pow(smoothstep(.5, 0., d), 2.);
        gl_FragColor = vec4(vec3(.78, .92, 1.) * s * vA, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.renderOrder = 2;
  scene.add(pts);
  return pts;
})();

// ───────────────────────── 수평선 광점 ─────────────────────────
const glow = (() => {
  const W = 44, H = 6;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uGlow: { value: 0 } },
    vertexShader: VERT_WORLD,
    fragmentShader: /* glsl */`
      uniform float uTime, uGlow; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - .5) * vec2(${W}., ${H}.); p.x -= 1.4;
        float core = exp(-p.x*p.x / 1.6 - p.y*p.y / .02);
        float line = exp(-p.x*p.x / 70. - p.y*p.y / .002) * .55;
        float halo = exp(-p.x*p.x / 10. - p.y*p.y / .5) * .22;
        float flick = .92 + .08 * sin(uTime * 1.3) * sin(uTime * .7);
        gl_FragColor = vec4(vec3(.86, .96, 1.) * (core * 2.6 + line * 1.2 + halo * 1.4) * uGlow * flick, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat);
  m.position.set(0, 0, -52);
  m.renderOrder = 3;
  scene.add(m);
  return mat;
})();

// ───────────────────────── 빛줄기 (수평선에서 오른쪽 위로) ─────────────────────────
const ribbon = (() => {
  const z = -30;
  // 무드 화면 좌표를 이 깊이의 월드 좌표로 옮긴 점들
  const curve = new THREE.CatmullRomCurve3([
    [2.4, 0.02], [6.8, 2.6], [13.6, 5.5], [20.4, 8.1], [27.2, 9.9], [36, 11.6],
  ].map(([x, y]) => new THREE.Vector3(x, y, z)));
  const N = 220, W = 3.2;
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curve.getPointAt(u), tg = curve.getTangentAt(u);
    const nx = -tg.y, ny = tg.x;
    const w = W * (0.3 + u * 0.8);
    pos.push(p.x + nx * w, p.y + ny * w, z, p.x - nx * w, p.y - ny * w, z);
    uv.push(u, 1, u, -1);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.uTime, uDraw: { value: 0 } },
    vertexShader: VERT_WORLD,
    fragmentShader: /* glsl */`
      uniform float uTime, uDraw; varying vec2 vUv;
      ${NOISE}
      void main(){
        float u = vUv.x, v = vUv.y;
        float wob = (noise(vec2(u * 5. - uTime * .25, uTime * .15)) - .5) * .09;
        float vv = v - wob;
        float core = exp(-pow(vv / .012, 2.)) * .8;
        float glow = exp(-pow(vv / .08, 2.)) * .22;
        float halo = exp(-pow(vv / .5, 2.)) * .2;
        float along = mix(2.2, .2, smoothstep(0., .9, u)) * smoothstep(0., .015, u);
        float pulse = .7 + .4 * noise(vec2(u * 9. - uTime * .5, 1.));
        float draw = smoothstep(uDraw + .001, uDraw - .06, u);
        vec3 col = mix(vec3(.92, 1., 1.), vec3(.38, .92, .86), smoothstep(0., .45, u));
        gl_FragColor = vec4(col * (core * 1.3 + glow + halo) * along * pulse * draw, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 4;
  scene.add(m);
  return mat;
})();

// ───────────────────────── 물 반사 ─────────────────────────
const RIPPLES = 10;
const WaterShader = {
  name: 'LimenWater',
  uniforms: {
    color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null },
    uTime: { value: 0 }, uCam: { value: new THREE.Vector3() },
    uRip: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;
    void main(){
      vUv = textureMatrix * vec4(position, 1.);
      vWorld = (modelMatrix * vec4(position, 1.)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec3 uCam; uniform vec4 uRip[${RIPPLES}];
    varying vec4 vUv; varying vec3 vWorld;
    ${NOISE}
    void main(){
      vec2 p = vWorld.xz;
      float dist = length(vWorld.xz - uCam.xz);
      // 가로로 긴 잔물결
      float n1 = noise(vec2(p.x * .18, p.y * 1.1 + uTime * .25));
      float n2 = noise(vec2(p.x * .6 + 9., p.y * 3.2 - uTime * .45));
      float n3 = noise(vec2(p.x * 2., p.y * 9. + uTime * .6));
      vec2 d = vec2((n1 - .5) * .8 + (n2 - .5) * .5 + (n3 - .5) * .45, (n2 - .5) * .9 + (n3 - .5) * .5);
      // 커서·클릭 동심원
      for (int i = 0; i < ${RIPPLES}; i++){
        vec4 r = uRip[i]; float age = uTime - r.z;
        if (age < 0. || age > 7.) continue;
        vec2 dv = p - r.xy; float dd = length(dv) + 1e-3;
        float k = dd - age * 2.4;
        float w = sin(k * 2.6) * exp(-k * k * .35) * exp(-age * .55) * r.w;
        d += dv / dd * w * 1.6;
      }
      float amt = .045 / (1. + dist * .06);
      vec4 uv = vUv; uv.xy += d * amt * uv.w;
      // 세로로 번진 반사 (물 위 빛기둥처럼 길게)
      float bl = .012 * uv.w;
      vec3 c = texture2DProj(tDiffuse, uv).rgb * .3
             + texture2DProj(tDiffuse, uv + vec4(0., bl, 0., 0.)).rgb * .2
             + texture2DProj(tDiffuse, uv - vec4(0., bl, 0., 0.)).rgb * .2
             + texture2DProj(tDiffuse, uv + vec4(0., bl * 2.5, 0., 0.)).rgb * .15
             + texture2DProj(tDiffuse, uv - vec4(0., bl * 2.5, 0., 0.)).rgb * .15;
      c *= mix(.35, 1.45, smoothstep(3., 40., dist));          // 가까울수록 어둡게
      c += c * smoothstep(.78, 1., n3) * smoothstep(.65, 1., n2) * 2.2;  // 잔 반짝임
      gl_FragColor = vec4(vec3(.004, .008, .016) + c, 1.);
    }`,
};
const water = new Reflector(new THREE.PlaneGeometry(600, 600), {
  shader: WaterShader,
  textureWidth: Math.round(innerWidth * DPR * .5),
  textureHeight: Math.round(innerHeight * DPR * .5),
  clipBias: 0.003,
  multisample: 0,
});
water.rotation.x = -Math.PI / 2;
water.material.uniforms.uTime = U.uTime;
water.material.uniforms.uCam.value = camera.position;
scene.add(water);
const ripUniform = water.material.uniforms.uRip.value;
let ripIdx = 0;
function addRipple(x, z, amp) {
  ripUniform[ripIdx].set(x, z, U.uTime.value, amp);
  ripIdx = (ripIdx + 1) % RIPPLES;
}

// ───────────────────────── 후처리 ─────────────────────────
const composer = new EffectComposer(renderer);
composer.setPixelRatio(DPR);
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.95, 0.7, 0.16);
bloom.highPassUniforms.smoothWidth.value = 0.9;   // 문턱을 완만하게: 딱 끊기면 커튼 아래가 불꽃 덩어리로 뭉친다
if (!q.has('nobloom')) composer.addPass(bloom);
const finalPass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, uTime: U.uTime,
    uGlass: { value: 0 }, uOpen: U.uOpen, uFade: { value: 0 },
    uAspect: { value: innerWidth / innerHeight }, uRibs: { value: innerWidth / 22 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uGlass, uOpen, uFade, uAspect, uRibs; varying vec2 vUv;
    ${NOISE}
    void main(){
      vec2 uv = vUv;
      // 세로 결 유리(리브드 글라스): 열린 가운데부터 맑아진다
      float ax = abs(uv.x - .5) * uAspect;
      float r = uOpen * 1.05;
      float gm = smoothstep(r - .05, r + .2, ax) * uGlass;
      float ph = uv.x * uRibs * 6.2832;
      float off = sin(ph) * .011 + (noise(vec2(uv.x * 6., uv.y * 2. + uTime * .4)) - .5) * .02;
      vec2 o = vec2(off, (noise(vec2(uv.x * 4. + 3., uTime * .3)) - .5) * .012) * gm;
      vec3 c = vec3(texture2D(tDiffuse, uv + o * 1.18).r, texture2D(tDiffuse, uv + o).g, texture2D(tDiffuse, uv + o * .82).b);
      c += vec3(.5, .8, 1.) * pow(max(0., sin(ph + 1.)), 14.) * .05 * gm;
      c = 1.15 * (1. - exp(-c * 1.25));                    // 부드러운 하이라이트 압축
      vec2 qv = (uv - .5) * vec2(1., 1.15);
      c *= clamp(1. - dot(qv, qv) * .85, 0., 1.);
      float g = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 317., vec2(12.9898, 78.233))) * 43758.5453);
      c += (g - .5) * .03;
      gl_FragColor = vec4(c * uFade, 1.);
    }`,
});
composer.addPass(finalPass);

// ───────────────────────── 입력 ─────────────────────────
const mouse = { x: 0, y: 0, sx: 0, sy: 0, active: false };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
let lastRip = { x: 1e9, z: 1e9, t: -1 };
function waterPoint(cx, cy) {
  ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(waterPlane, hit);
}
addEventListener('pointermove', e => {
  mouse.x = e.clientX / innerWidth * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  mouse.active = true;
  const p = waterPoint(e.clientX, e.clientY);
  const t = U.uTime.value;
  if (p && Math.hypot(p.x - lastRip.x, p.z - lastRip.z) > 1.6 && t - lastRip.t > .14) {
    addRipple(p.x, p.z, .35);
    lastRip = { x: p.x, z: p.z, t };
  }
});
addEventListener('pointerleave', () => { mouse.active = false; });
addEventListener('pointerdown', e => {
  const p = waterPoint(e.clientX, e.clientY);
  if (p) addRipple(p.x, p.z, 1.0);
});

addEventListener('resize', () => {
  const w = innerWidth, h = innerHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); composer.setSize(w, h); bloom.setSize(w, h);
  water.getRenderTarget().setSize(Math.round(w * DPR * .5), Math.round(h * DPR * .5));
  U.uRes.value.set(w * DPR, h * DPR);
  finalPass.uniforms.uAspect.value = w / h;
  finalPass.uniforms.uRibs.value = w / 22;
});

// ───────────────────────── 등장 타임라인 ─────────────────────────
const E = {
  io: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  out: t => 1 - Math.pow(1 - t, 3),
};
const seg = (T, a, b, e = E.io) => e(Math.min(1, Math.max(0, (T - a) / (b - a))));

const $logo = document.getElementById('logo');
const $rule = document.getElementById('rule');
const $caps = [...document.querySelectorAll('#caption span')];
const $ui = document.getElementById('ui');
const $disp = document.getElementById('glassDisp');

function intro(T) {
  const s = {
    fade: seg(T, 0, 1.2, E.out),
    glow: seg(T, .3, 1.4, E.out),
    pillar: seg(T, .7, 1.3, E.out) * (1 - seg(T, 1.7, 2.7)),
    pillarH: seg(T, .7, 1.7, E.out) * .55,
    open: seg(T, 1.3, 3.5),
    reveal: seg(T, 1.4, 3.1),
    glass: seg(T, 1.2, 1.6, E.out) * (1 - seg(T, 2.6, 4.2)),
    draw: seg(T, 2.6, 4.3),
    logoR: seg(T, 1.8, 3.5),
    logoK: seg(T, 1.8, 4.0, E.out),
    logoIn: seg(T, 1.9, 2.7, E.out),
    rule: seg(T, 3.4, 4.2),
    ui: seg(T, 4.1, 4.9, E.out),
  };
  s.caps = $caps.map((_, i) => seg(T, 3.8 + i * .16, 4.6 + i * .16, E.out));
  return s;
}

// ───────────────────────── 루프 ─────────────────────────
const clock = new THREE.Clock();
let scrollS = 0;
function frame() {
  const t = clock.getElapsedTime();
  const T = HOLD ? START_T : START_T + t;
  U.uTime.value = t + 20;   // 노이즈가 처음부터 무르익은 상태로
  const s = intro(T);

  // 스크롤: 열린 커튼 사이로 수평선을 향해 전진
  const target = Math.min(1, scrollY / (innerHeight * 1.4));
  scrollS += (target - scrollS) * .07;
  const k = scrollS * scrollS * (3 - 2 * scrollS);

  // 마우스 시차
  const mx = mouse.active ? mouse.x : 0, my = mouse.active ? mouse.y : 0;
  mouse.sx += (mx - mouse.sx) * .04;
  mouse.sy += (my - mouse.sy) * .04;
  camera.position.set(mouse.sx * .9, CAM.y + mouse.sy * .18 + k * .4, CAM.z - k * 30);
  camera.rotation.set(CAM.pitch + mouse.sy * .025 - k * .08, -mouse.sx * .035, 0);
  U.uMouse.value.lerp(mouse.active ? new THREE.Vector2(mouse.x, mouse.y) : new THREE.Vector2(9, 9), .08);

  U.uOpen.value = s.open;
  U.uReveal.value = s.reveal;
  pillarLayer.uniforms.uPillar.value = s.pillar;
  pillarLayer.uniforms.uPillarH.value = s.pillarH;
  glow.uniforms.uGlow.value = s.glow;
  ribbon.uniforms.uDraw.value = s.draw * 1.08;
  finalPass.uniforms.uGlass.value = s.glass;
  finalPass.uniforms.uFade.value = s.fade * (1 - seg(scrollS, .7, 1));

  // 로고: 커튼이 지나간 자리에서 유리 굴절을 지나 또렷해진다
  const lk = s.logoK;
  $logo.style.setProperty('--r', (s.logoR * 70).toFixed(2) + '%');
  $logo.style.setProperty('--ls', (.34 + .55 * (1 - lk)).toFixed(3) + 'em');
  const disp = 70 * (1 - lk), blur = 9 * (1 - lk);
  $disp.setAttribute('scale', disp.toFixed(2));
  $logo.style.filter = disp > .05 ? `url(#glass) blur(${blur.toFixed(2)}px)` : 'none';
  const lo = (1 - seg(scrollS, 0, .35, E.out));
  $logo.style.opacity = lo * s.logoIn;
  $logo.style.transform = `translate(calc(-50% + ${(-mouse.sx * 8).toFixed(2)}px), calc(-50% + ${(-mouse.sy * 5 - k * 60).toFixed(2)}px)) scale(${1 + k * .25})`;
  $rule.style.transform = `translateX(-50%) scaleY(${s.rule})`;
  $rule.style.opacity = lo;
  $caps.forEach((c, i) => { c.style.opacity = s.caps[i] * lo; });
  $ui.style.opacity = s.ui * (1 - seg(scrollS, 0, .25));

  composer.render();
  requestAnimationFrame(frame);
}
document.fonts.ready.then(() => requestAnimationFrame(frame));
