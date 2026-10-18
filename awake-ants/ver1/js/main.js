import * as THREE from 'three';
import { Timeline } from './timeline.js';
import { ContourLines } from './contour.js';
import { AntRoom } from './room.js';
import { PostFX } from './postfx.js';
import { Narration } from './narration.js';
import { Music } from './music.js';

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const AUTO = params.has('auto');               // 시작 화면 없이 바로 (촬영·확인용, 소리 없음)
const START_T = parseFloat(params.get('t') || '0') || 0;

// ── 구간 ── 레퍼런스 2-1 은 0.75배 시간(1.33배 빠르게)으로 당긴다
const S = 0.75;
const CUT_B = 11.93 * S, CUT_C = 27.8 * S, CUT_SCATTER = 42, CUT_D = 44.5, CUT_END = 66, END = 71;
const PARTS = [
	{ t: 0, name: 'A 흩어진 흐름 (레퍼런스 2-1 컷1)' },
	{ t: CUT_B, name: 'B 지형 위 흐름 (레퍼런스 2-1 컷2)' },
	{ t: CUT_C, name: 'C 방 안 행진 → 원 (ANTMARCH)' },
	{ t: CUT_SCATTER, name: '흩어짐' },
	{ t: CUT_D, name: 'D 회오리 터널 → 둥지 (ANTS)' },
	{ t: CUT_END, name: '끝 · 질문' },
];
const RESETS = [0, CUT_B];                    // 레퍼런스 uReset 펄스

const [sov, cues] = await Promise.all([
	fetch('data/sov_ch2_1.json').then((r) => r.json()),
	fetch('data/cues.json').then((r) => r.json()),
]);

// ── 타임라인 ──
const tl = new Timeline();
tl.load(sov, 0, 27.8, S);
const A = 'Ants', CAM = 'Room Camera';
const add = (k, f) => tl.add(A, [k], f);
add('fade', [[0, 1], [CUT_C - 0.45, 1], [CUT_C, 0], [CUT_C + 0.6, 1], [CUT_END + 1.5, 1], [END, 0]]);
add('laneW', [[CUT_C + 0.6, 0], [CUT_C + 4.5, 1]]);
add('gather', [[32, 0], [37, 1]]);
add('fill', [[36.5, 0], [40.5, 1]]);
add('scatter', [[CUT_SCATTER, 0], [CUT_D + 1, 1]]);
add('swirlW', [[CUT_D, 0], [CUT_D + 3, 1]]);
add('swirl', [[CUT_D, 0], [CUT_D + 3.5, 1]]);
add('nest', [[57, 0], [63.5, 1]]);
add('room', [[CUT_C, 1], [46, 1], [50, 0]]);
add('marker', [[CUT_C, 0], [CUT_C + 3, 1], [CUT_SCATTER, 1], [CUT_D, 0]]);
// 방 카메라: 위치 · 바라보는 곳 · 기울기. 방 안에서 앞으로 들어가다가 D 에서 터널 속을 쭉 날아간다
const cam = {
	px: [[CUT_C, 0], [32, 0.9], [40, -0.3], [CUT_D, 0], [62, 0]],
	py: [[CUT_C, 1.6], [32, 1.8], [40, 1.95], [CUT_D, 2.0]],
	pz: [[CUT_C, 9.6], [32, 6.0], [40, 3.4], [CUT_D, 1.4], [48, -2.5], [62, -26], [65, -27.6], [END, -28.6]],
	lx: [[CUT_C, 0], [CUT_D, 0]],
	ly: [[CUT_C, 1.85], [CUT_D, 2.0]],
	lz: [[CUT_C, -4], [CUT_D, -4], [48, -12.5], [62, -36], [65, -37.6], [END, -38.6]],
	roll: [[CUT_D, 0], [52, 0.25], [62, 0.7], [END, 0.85]],
};
for (const [k, f] of Object.entries(cam)) tl.add(CAM, [k], f);
const NEST_Z = -33.5;

// ── 렌더러 ──
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const flowScene = new THREE.Scene();
flowScene.background = new THREE.Color(0x020202);
const makeCam = (fov = 45) => new THREE.PerspectiveCamera(fov, innerWidth / innerHeight, 0.05, 2000);
const cameras = { camera1: makeCam(), camera2: makeCam() };
const camNames = { camera1: 'Cameras / Camera 1', camera2: 'Cameras / Camera 2' };
const roomCam = makeCam(60);
let flowCam = cameras.camera2;

const contour = new ContourLines(renderer, flowScene);
const room = new AntRoom(renderer);
const post = new PostFX(renderer);
post.setSize(innerWidth, innerHeight);

// 흐름 장면의 떠다니는 먼지 (레퍼런스 Ambient Particles)
const dust = (() => {
	const n = 420, pos = new Float32Array(n * 3), rnd = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		pos[i * 3] = (Math.random() - 0.5) * 10; pos[i * 3 + 1] = (Math.random() - 0.5) * 10; pos[i * 3 + 2] = Math.random() * 3;
		rnd[i] = Math.random();
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
	g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
	const m = new THREE.ShaderMaterial({
		uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0.682, 0.404, 0.149) }, uScale: { value: innerHeight } },
		vertexShader: `attribute float aRnd; uniform float uTime, uScale; varying float vA;
			void main(){ vec3 p = position; float s = uTime * 0.205 + aRnd * 40.;
			p += vec3(sin(s * 1.3), cos(s * 1.1), sin(s * 0.7)) * 0.039 * 4.;
			vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
			gl_PointSize = mix(0.003, 0.007, aRnd) * 6. * uScale / -mv.z; vA = smoothstep(0.5, 2.5, -mv.z); }`,
		fragmentShader: `uniform vec3 uColor; varying float vA;
			void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(uColor * a * vA, 1.); }`,
		transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
	});
	const p = new THREE.Points(g, m); p.frustumCulled = false; flowScene.add(p);
	return m;
})();

// ── 입력: 커서 / 누르고 있기 / 자동 커서 ──
const isTouch = matchMedia('(hover: none)').matches;
const pointer = { ndc: new THREE.Vector2(), smooth: new THREE.Vector2(), pressed: false, idleSince: -1e9, auto: true };
const setPointer = (e) => {
	pointer.ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
	pointer.idleSince = performance.now(); pointer.auto = false;
};
addEventListener('pointermove', (e) => { if (!isTouch || pointer.pressed) setPointer(e); });
addEventListener('pointerdown', (e) => { pointer.pressed = true; setPointer(e); });
addEventListener('pointerup', () => { pointer.pressed = false; });
const ptrNdc = new THREE.Vector2(), ZERO = new THREE.Vector2();
function currentPointer(time, nowMs) {
	pointer.auto = isTouch ? !pointer.pressed : nowMs - pointer.idleSince > 2000;
	if (pointer.auto) return ptrNdc.set(Math.sin(time * 0.578) * 0.65, -Math.cos(time * 0.523) * 0.65);
	return ptrNdc.copy(pointer.ndc);
}

// ── 레퍼런스 카메라 (A·B): 키프레임 + 흔들림 + 마우스 기울임 + 앞으로 밀기 ──
const camMotion = { posAmp: 0.026, rotAmp: 0.007, posFreq: tl.get('Cameras / Settings', ['cameraMotionPosFrequency'], 0, 0.29), rotFreq: 0.1, speed: 0.8 };
const eul = new THREE.Euler(), q = new THREE.Quaternion();
const wobble = (s, f, k) => Math.sin(s * f * 6.283 + k) * 0.6 + Math.sin(s * f * 2.71 * 6.283 + k * 1.7) * 0.4;
function updateFlowCamera(t, time) {
	const name = tl.get('Cameras / Settings', ['activeCamera'], t, 'camera1');
	flowCam = cameras[name] || cameras.camera1;
	const o = camNames[name];
	const g = (a, b, d) => tl.get(o, ['transforms', a, b], t, d);
	flowCam.position.set(g('position', 'x', 0), g('position', 'y', 0), g('position', 'z', 20));
	flowCam.rotation.set(g('rotation', 'x', 0), g('rotation', 'y', 0), g('rotation', 'z', 0));
	const s = time * camMotion.speed;
	flowCam.position.x += wobble(s, camMotion.posFreq, 1) * camMotion.posAmp;
	flowCam.position.y += wobble(s, camMotion.posFreq, 2) * camMotion.posAmp;
	flowCam.rotateX(wobble(s, camMotion.rotFreq, 4) * camMotion.rotAmp);
	flowCam.rotateY(wobble(s, camMotion.rotFreq, 5) * camMotion.rotAmp);
	// 컷마다 앞으로 밀고 들어간다 (z 축 이동)
	const u = t < CUT_B ? t / CUT_B : (t - CUT_B) / (CUT_C - CUT_B);
	flowCam.translateZ(-(t < CUT_B ? 1.6 : 1.2) * u * u * (3 - 2 * u));
	// 마우스: 레퍼런스(0.024)보다 크게 기울이고 조금 옮긴다
	flowCam.translateX(pointer.smooth.x * 0.25); flowCam.translateY(pointer.smooth.y * 0.18);
	flowCam.translateZ(-5);
	eul.set(pointer.smooth.y * 0.07, -pointer.smooth.x * 0.07, 0);
	flowCam.quaternion.multiply(q.setFromEuler(eul));
	flowCam.translateZ(5);
	flowCam.updateMatrixWorld();
}

// ── 방 카메라 (C·D) ──
const look = new THREE.Vector3();
function updateRoomCamera(t, time) {
	const g = (k, d) => tl.get(CAM, [k], t, d);
	roomCam.position.set(g('px', 0), g('py', 1.7), g('pz', 9));
	look.set(g('lx', 0), g('ly', 2), g('lz', -4));
	const s = time * 0.5;
	roomCam.position.x += wobble(s, 0.09, 1) * 0.06 + pointer.smooth.x * 0.55;
	roomCam.position.y += wobble(s, 0.09, 2) * 0.05 + pointer.smooth.y * 0.32;
	look.x += pointer.smooth.x * 0.9; look.y += pointer.smooth.y * 0.55;
	roomCam.up.set(0, 1, 0);
	roomCam.lookAt(look);
	roomCam.rotateZ(g('roll', 0) + pointer.smooth.x * -0.05);
	roomCam.updateMatrixWorld();
}

// ── 값 적용 ──
const CL = 'Contour Lines', U = (n) => ['uniforms', n];
function applyFlow(t, resetNow, userPointer) {
	const g = (n, d) => tl.get(CL, U(n), t, d);
	const nu = contour.noiseUniforms;
	nu.uFrequency.value = g('uFrequency', 0.26); nu.uAmplitude.value = g('uAmplitude', 0.7);
	nu.uRoughness.value = g('uRoughness', 0.267); nu.uDetail.value = g('uDetail', 75);
	nu.uNoiseTranslation.value.set(tl.get(CL, ['uniforms', 'uNoiseTranslation', 'x'], t, 100), tl.get(CL, ['uniforms', 'uNoiseTranslation', 'y'], t, 100));
	const su = contour.sim.uniforms;
	su.uDecay.value = g('uDecay', 0.1);
	su.uSpeed.value = g('uSpeed', 1.5) * 2;                       // 전진 속도 2배
	su.uPointerRadius.value = g('uPointerRadius', 1) * 2.5;      // 커서 방출 고리를 키움
	su.uStartOffset.value.set(tl.get(CL, ['uniforms', 'uStartOffset', 'x'], t, 0), tl.get(CL, ['uniforms', 'uStartOffset', 'y'], t, 0), tl.get(CL, ['uniforms', 'uStartOffset', 'z'], t, 0));
	su.uEnablePointer.value = !!g('uEnablePointer', true);
	su.uDrag.value = userPointer ? 1.3 : 0.5;
	su.uReset.value = resetNow;
	contour.persist.uniforms.uReset.value = resetNow;
	const pu = contour.particleUniforms;
	pu.uPathSpread.value = g('uPathSpread', 1); pu.uLineLength.value = g('uLineLength', 1); pu.uLineWidth.value = g('uLineWidth', 1);
	const c1 = g('uColor1', { r: 0.77, g: 0.47, b: 0.26 }), c2 = g('uColor2', { r: 0.8, g: 0.65, b: 0.44 });
	pu.uColor1.value.setRGB(c1.r, c1.g, c1.b); pu.uColor2.value.setRGB(c2.r, c2.g, c2.b);
	contour.persist.uniforms.uBrightness.value = g('uBrightness', 2.41);
	contour.persist.uniforms.uFadeStrength.value = g('uFadeStrength', 0.025);
	const pl = contour.planeUniforms;
	pl.uHeight.value = g('uHeight', 0.5); pl.uHeightScale.value = 0.32;   // 지형을 높여 입체감
	pl.uAlpha.value = g('uAlpha', 1);
	pl.uFogNear.value = tl.get('Global Settings', U('uFogNear_D'), t, 3.79);
	pl.uFogFar.value = tl.get('Global Settings', U('uFogFar_D'), t, 5.32);
	pl.uGlow.value = su.uEnablePointer.value ? (userPointer ? 1 : 0.35) : 0;
	contour.linesCamera.position.set(tl.get(CL, ['linesPosition', 'x'], t, 0), tl.get(CL, ['linesPosition', 'y'], t, 0), tl.get(CL, ['linesPosition', 'z'], t, 15));
}
function applyRoom(t) {
	const a = (n, d) => tl.get(A, [n], t, d);
	const su = room.sim.uniforms;
	su.uMarchT.value = Math.max(0, t - CUT_C);
	su.uLaneW.value = a('laneW', 0); su.uGather.value = a('gather', 0); su.uFill.value = a('fill', 0);
	su.uScatter.value = a('scatter', 0); su.uSwirlW.value = a('swirlW', 0); su.uSwirl.value = a('swirl', 0);
	su.uNest.value = a('nest', 0); su.uNestZ.value = NEST_Z;
	room.roomUniforms.uOpacity.value = a('room', 1);
	room.antUniforms.uFogFar.value = t < CUT_D ? 14 : 18;
}

// ── UI · 소리 ──
const $ = (s) => document.querySelector(s);
let music = null;
const narration = new Narration($('.js-subtitles'), cues, { onSpeak: (on) => music && music.duck(on) });
const ring = $('.js-progress');
const ringLen = ring.getTotalLength();
ring.style.strokeDasharray = ringLen; ring.style.strokeDashoffset = ringLen;
const hud = $('.js-debug');
if (DEBUG) hud.hidden = false;

let state = AUTO ? 'play' : 'intro';        // intro → card → play → end
let t = START_T, prevT = START_T - 1e-3, cardStart = 0;

function seek(nt) {
	t = nt; prevT = nt - 1e-3;
	if (t >= CUT_C) room.reset();
	narration.seek(t, performance.now() / 1000);
	$('.js-end').classList.remove('is-visible');
	document.body.classList.remove('is-end');
	if (state === 'end') state = 'play';
}

$('.js-enter').addEventListener('click', () => {
	try { music = new Music(); music.start(); } catch (e) { music = null; }
	$('.js-intro').classList.add('is-hidden');
	state = 'card'; cardStart = performance.now() / 1000;
	$('.js-card').classList.add('is-visible');
});
$('.js-skip').addEventListener('click', () => {
	if (state === 'card') { cardStart = -99; return; }
	const next = PARTS.find((p) => p.t > t + 0.5);
	seek(next ? next.t : END);
});
$('.js-restart').addEventListener('click', () => { seek(0); });
$('.js-sound').addEventListener('click', (e) => {
	narration.muted = !narration.muted;
	if (narration.muted) narration.stopVoice();
	if (music) music.setMuted(narration.muted);
	e.currentTarget.classList.toggle('is-muted', narration.muted);
});
$('.js-instr').textContent = isTouch ? '누른 채로 움직이면 흐름이 따라옵니다.' : '커서를 움직이면 흐름이 따라옵니다.';

addEventListener('resize', () => {
	renderer.setSize(innerWidth, innerHeight);
	for (const c of [...Object.values(cameras), roomCam]) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
	post.setSize(innerWidth, innerHeight);
	contour.resize();
	dust.uniforms.uScale.value = innerHeight;
	room.dustUniforms.uScale.value = innerHeight;
});
for (const c of [...Object.values(cameras), roomCam]) c.updateProjectionMatrix();

// ── 품질: 3초 평균이 24fps 아래면 한 단계 낮춘다 (레퍼런스 FPSChecked 와 같은 생각) ──
const quality = { acc: 0, n: 0, level: 0 };
function checkQuality(d) {
	if (quality.level >= 2) return;
	quality.acc += d; quality.n++;
	if (quality.acc < 3) return;
	const fps = quality.n / quality.acc; quality.acc = 0; quality.n = 0;
	if (fps >= 24) return;
	quality.level++;
	if (quality.level === 1) { contour.resize(1024); post.uniforms.uStrength.value = 0; }
	else { renderer.setPixelRatio(Math.min(devicePixelRatio, 1) * 0.75); post.setSize(innerWidth, innerHeight); }
	console.info('[ants] 품질 낮춤', quality.level, fps.toFixed(1) + 'fps');
}

// ── 루프 ──
let lastMs = performance.now(), time = 0;
if (AUTO) { seek(START_T); $('.js-intro').classList.add('is-hidden'); }
function frame() {
	const nowMs = performance.now();
	const realDt = Math.min((nowMs - lastMs) / 1000, 0.25);
	lastMs = nowMs;
	const dt = Math.min(realDt, 1 / 20);      // 계산용 (느린 기기에서 한 번에 너무 멀리 가지 않게)
	time += realDt;
	const now = nowMs / 1000;

	if (state === 'card' && now - cardStart > 4.6) {
		state = 'play';
		$('.js-card').classList.remove('is-visible');
		seek(t);
	}
	if (state === 'play') { t += realDt; checkQuality(realDt); }
	if (state === 'play' && t >= CUT_END + 1.5 && !$('.js-end').classList.contains('is-visible')) {
		$('.js-end').classList.add('is-visible'); document.body.classList.add('is-end');
	}
	if (t >= END) { t = END; state = 'end'; }
	if (prevT < CUT_C && t >= CUT_C) room.reset();

	const ndc = currentPointer(time, nowMs);
	pointer.smooth.lerp(pointer.auto ? ZERO : pointer.ndc, 1 - Math.exp(-realDt * 2.2));
	const simDt = state === 'play' ? dt : 0;
	post.uniforms.uFade.value = tl.get(A, ['fade'], t, 1);

	if (t < CUT_C) {
		const resetNow = state === 'play' && RESETS.some((r) => r > prevT && r <= t);
		applyFlow(t, resetNow || (state !== 'play' && t === 0), !pointer.auto);
		updateFlowCamera(t, time);
		contour.update(t, simDt, flowCam, ndc);
		dust.uniforms.uTime.value = time;
		post.render(flowScene, flowCam, time);
	} else {
		applyRoom(t);
		updateRoomCamera(t, time);
		room.update(time, simDt, roomCam, ndc, true, tl.get(A, ['marker'], t, 0) * (pointer.auto ? 0.35 : 1));
		post.render(room.scene, roomCam, time);
	}
	narration.update(state === 'play' ? t : prevT, now);
	prevT = t;

	ring.style.strokeDashoffset = ringLen * (1 - Math.min(1, t / END));
	if (DEBUG) {
		const part = [...PARTS].reverse().find((p) => t >= p.t);
		const c = t < CUT_C ? flowCam : roomCam, p = c.position;
		const su = room.sim.uniforms;
		hud.textContent = `t ${t.toFixed(2)}  ${part.name}\ncam pos ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.z.toFixed(2)}  ptr ${pointer.auto ? 'auto' : 'user'}  q${quality.level}\n`
			+ `lane ${su.uLaneW.value.toFixed(2)} gather ${su.uGather.value.toFixed(2)} fill ${su.uFill.value.toFixed(2)} scatter ${su.uScatter.value.toFixed(2)} swirl ${su.uSwirlW.value.toFixed(2)} nest ${su.uNest.value.toFixed(2)}`;
	}
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__ants = { seek, get t() { return t; }, tl, contour, room };
