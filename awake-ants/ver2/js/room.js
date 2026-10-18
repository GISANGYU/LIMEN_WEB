// C·D — 3D 방 안의 개미. 우리 전시장(벽 3 + 바닥, 실측 7.2 × 4 × 4m)을 그대로 세우고 그 안에서 움직인다.
//   C 행진 (Unity ANTMARCH): 바닥 5줄 · 좌벽 3줄 · 우벽 3줄이 정면 벽 가운데 원으로 → 고리 → 꽉 찬 원
//   흩어짐: 원이 방 안(카메라 쪽, z+)으로 터지듯 퍼진다
//   D 회오리 (Unity ANTS): z 축으로 길게 이어진 나선 터널. 카메라가 그 안을 앞으로 날아가고, 끝에서 둥지 덩어리
// 상태 RGBA = (x, y, z, 밝기). 모든 움직임은 '목표 자리'를 계산하고 이전 자리에서 따라간다.
import * as THREE from 'three';
import { PingPong } from './antsSim.js';

export const ROOM = { HW: 3.6, H: 4, ZF: -4, ZIN: 9, C: new THREE.Vector3(0, 2, -3.97), R: 0.75 };

const SIM = /* glsl */`
varying vec2 vUv;
uniform sampler2D uTexture, uAux;
uniform float uTime, uDelta;
uniform bool uReset;
uniform float uLaneW, uMarchT, uMarchSpeed, uGather, uFill, uSpin;
uniform float uScatter, uSwirlW, uNest, uSwirl;
uniform float uCamZ, uCamZ0, uFlowV, uNestZ;
uniform vec3 uPerson; uniform float uPersonOn, uAvoidR;
uniform vec3 uRayO, uRayD;

const float TAU = 6.2831853;
const float HW = 3.6, ZF = -4.0, ZIN = 9.0, R = 0.75;
const vec3 C = vec3(0., 2., -3.97);
const float LANES = 11.;

float h(float n) { return fract(sin(n * 78.233) * 43758.5453); }

// 흩어진 점: 바닥·좌벽·우벽 위 아무 데나 (1-01)
vec3 scatterPos(vec4 a) {
	float f = a.x;
	vec3 p;
	if (f < 0.5) p = vec3((a.y * 2. - 1.) * HW, 0.01, mix(ZF, ZIN, a.z));
	else if (f < 0.75) p = vec3(-HW + 0.01, a.y * 3.6 + 0.2, mix(ZF, ZIN, a.z));
	else p = vec3(HW - 0.01, a.y * 3.6 + 0.2, mix(ZF, ZIN, a.z));
	p += vec3(sin(uTime * 0.7 + a.w * 30.), 0., cos(uTime * 0.6 + a.w * 20.)) * 0.08;
	return p;
}

// 레인 위 자리. 1구간: 입구 → 정면 벽 모서리(물결), 2구간: 정면 벽 위로 원 가장자리까지
vec3 lanePos(float lane, float s, float off, out float L) {
	float h1 = h(lane + 1.), h2 = h(lane + 7.);
	vec3 A, B, n;
	if (lane < 5.) {
		float x0 = (lane - 2.) * 1.25 + (h1 - .5) * 0.5;
		A = vec3(x0, 0.01, ZIN); B = vec3(x0 * 0.4, 0.01, ZF + 0.01); n = vec3(1., 0., 0.);
	} else if (lane < 8.) {
		float y0 = 1.0 + (lane - 5.) * 1.0;
		A = vec3(-HW + 0.01, y0, ZIN); B = vec3(-HW + 0.01, 2. + (h1 - .5) * 0.6, ZF + 0.01); n = vec3(0., 1., 0.);
	} else {
		float y0 = 1.0 + (lane - 8.) * 1.0;
		A = vec3(HW - 0.01, y0, ZIN); B = vec3(HW - 0.01, 2. + (h1 - .5) * 0.6, ZF + 0.01); n = vec3(0., 1., 0.);
	}
	vec2 d2 = normalize(B.xy - C.xy);
	vec3 E = vec3(C.xy + d2 * R, ZF + 0.01);
	float L1 = length(B - A), L2 = length(E - B);
	L = L1 + L2;
	float d = s * L;
	if (d < L1) {
		float u = d / L1;
		float wl = 3.2 * mix(0.6, 1.5, h1);
		float wave = sin(d / wl * TAU + h2 * TAU) * 0.65 * mix(0.5, 1.2, h2) * (1. - u) * (1. - u);
		return mix(A, B, u) + n * (wave + off);
	}
	float u = (d - L1) / L2;
	vec3 side = vec3(-d2.y, d2.x, 0.);
	return mix(B, E, u) + side * off * (1. - u);
}

// 원: 고리(0.68~0.98R) → fill 로 안이 참, 천천히 돈다
vec3 ringPos(vec4 a) {
	float an = a.w * TAU + uTime * uSpin;
	float rr = mix(mix(0.68, 0.98, a.z), 0.98 * sqrt(a.z), uFill) * R;
	return C + vec3(cos(an) * rr, sin(an) * rr, 0.);
}

vec3 aroundPerson(vec3 p) {
	if (uPersonOn < 0.5) return p;
	vec3 d = p - uPerson; float l = length(d);
	if (l >= uAvoidR || l < 1e-4) return p;
	return uPerson + d / l * mix(l, uAvoidR, smoothstep(uAvoidR, uAvoidR * 0.3, l));
}

vec3 aroundRay(vec3 p, float r0) {
	if (uPersonOn < 0.5) return p;
	vec3 w = p - uRayO; float t = dot(w, uRayD);
	if (t < 0.5) return p;
	vec3 q = uRayO + uRayD * t; vec3 d = p - q; float l = length(d);
	float rr = r0 * (0.6 + t * 0.06);
	if (l >= rr || l < 1e-4) return p;
	return q + d / l * mix(l, rr, smoothstep(rr, rr * 0.3, l));
}

void main() {
	vec4 st = texture2D(uTexture, vUv);
	vec4 a = texture2D(uAux, vUv);
	if (uReset) { gl_FragColor = vec4(scatterPos(a), 1.); return; }

	// ── 행진 ──
	float lane = floor(a.x * LANES);
	float hz = mix(2.6, 4.0, a.z), ph = a.w * TAU, dp = 0.65, om = TAU * hz, T = uMarchT;
	float travel = (T * (1. - dp * .5) + dp * .5 * (cos(ph) - cos(om * T + ph)) / om) * mix(0.85, 1.35, a.y) * uMarchSpeed;
	float L;
	vec3 dummy = lanePos(lane, 0., 0., L);
	float s = fract(a.y * 7.31 + travel / L);
	vec3 P = lanePos(lane, s, (fract(a.x * LANES) - 0.5) * 0.22, L);
	bool feeder = a.y < 0.25;                         // feederShare 25%
	float g = feeder ? 0. : smoothstep(0., 1., uGather * 1.6 - fract(a.y * 3.7) * 0.6);
	vec3 march = mix(P, ringPos(a), g);
	march = mix(scatterPos(a), march, uLaneW);
	float wM = mix(smoothstep(0., .04, s) * smoothstep(1., .96, s), 1., max(g, 1. - uLaneW)) * mix(1., 0.32, g);   // 원 안은 겹쳐서 밝아지니 낮춘다

	// ── 흩어짐: 원에서 방 안으로 ──
	vec3 dir = normalize(vec3(a.x * 2. - 1., a.y * 2. - 1., 0.35 + a.z * 1.4));
	vec3 burst = dir * mix(1.5, 6.5, a.w) * uScatter + vec3(0., -0.6, 0.) * uScatter * uScatter * a.z;
	march += burst;
	march = aroundPerson(march);

	// ── 회오리 터널 (z 축) ──
	float Lt = 46.;
	float trav = (uCamZ0 - uCamZ) - uFlowV * uTime;
	float ahead = mod(a.y * Lt - trav, Lt) - 3.;      // 카메라 앞 거리 (-3 = 카메라 뒤)
	float r = mix(0.45, 3.1, sqrt(a.x));
	float th = a.w * TAU + uTime * uSwirl * (0.5 + 1.4 / (1. + r * 0.6)) + ahead * 0.16;
	r += sin(th * 3. - ahead * 0.35 + uTime * 0.8) * 0.55 * uSwirl;      // 나선 팔 3개
	vec3 tun = vec3(cos(th) * r, 2. + sin(th) * r, uCamZ - ahead);
	tun = aroundRay(tun, 0.45);
	float wT = smoothstep(-3., 0.5, ahead) * smoothstep(Lt - 3., Lt - 12., ahead);
	// 둥지 덩어리
	vec3 sp = normalize(vec3(h(a.x * 91.) - .5, h(a.y * 37.) - .5, h(a.z * 53.) - .5) + 1e-3) * pow(a.w, 0.4) * 0.95;
	float ra = uTime * 0.35;
	sp.xy = mat2(cos(ra), sin(ra), -sin(ra), cos(ra)) * sp.xy;
	vec3 nest = vec3(0., 2., uNestZ) + sp;
	float gn = smoothstep(0., 1., uNest * 1.5 - a.y * 0.5);
	vec3 swirl = mix(tun, nest, gn);
	float wS = mix(wT, 0.3, gn);                       // 덩어리는 겹쳐 밝아지니 낮춘다

	vec3 target = mix(march, swirl, uSwirlW);
	float wOut = mix(wM, wS, uSwirlW);

	float k = mix(mix(5., 2.2, uScatter), 6., uSwirlW);
	vec3 p = distance(st.xyz, target) > 5. ? target : mix(st.xyz, target, 1. - exp(-k * uDelta));
	gl_FragColor = vec4(p, wOut);
}`;

const VERT = /* glsl */`
attribute vec2 aFboUv;
attribute float aSize;
uniform sampler2D tPos, tPrev;
uniform float uWidth, uLenScale, uMaxLen, uDt, uAspect;
varying float vA, vDepth;
varying vec2 vQ;
// 머리·꼬리를 화면에 투영한 뒤 화면에서 수직으로 폭을 준다 (월드 공간 외적은 시선과 나란할 때 NaN)
void main() {
	vec4 p = texture2D(tPos, aFboUv), q = texture2D(tPrev, aFboUv);
	vec3 v = p.xyz - q.xyz; float sp = length(v);
	bool jump = sp > 0.8;
	vec3 dir = (sp > 1e-5 && !jump) ? v / max(sp, 1e-5) : vec3(0., 0., -1.);
	float len = clamp(sp / max(uDt, 1e-3) * uLenScale, 0.02, uMaxLen);
	vec4 hv = viewMatrix * vec4(p.xyz, 1.);
	vec4 tv = viewMatrix * vec4(p.xyz - dir * len, 1.);
	tv.z = min(tv.z, -0.05);
	vec4 hc = projectionMatrix * hv, tc = projectionMatrix * tv;
	vec2 d = (hc.xy / hc.w - tc.xy / tc.w) * vec2(uAspect, 1.);
	float dl = length(d);
	vec2 n = dl > 1e-6 ? vec2(-d.y, d.x) / dl : vec2(0., 1.);
	n.x /= uAspect;
	vec4 c = mix(tc, hc, position.x + 0.5);
	c.xy += n * position.y * min(uWidth * aSize * projectionMatrix[1][1], 0.0055 * c.w);   // 가까워도 화면에서 2px 안팎
	vA = jump ? 0. : p.w * aSize;
	vQ = position.xy * 2.;
	vDepth = -hv.z;
	gl_Position = c;
}`;

const FRAG = /* glsl */`
uniform vec3 uColor; uniform float uOpacity, uFogFar;
varying float vA, vDepth;
varying vec2 vQ;
void main() {
	float edge = 1. - smoothstep(0.4, 1., abs(vQ.y));
	float tip = smoothstep(-1., -0.6, vQ.x);
	float fog = exp(-max(vDepth - 2., 0.) / uFogFar);
	float near = smoothstep(0.3, 1.8, vDepth);
	gl_FragColor = vec4(uColor * vA * edge * tip * fog * near * uOpacity, 1.);
}`;

export class AntRoom {
	constructor(renderer) {
		this.renderer = renderer;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x020202);
		const GX = 100, GY = 100, N = GX * GY;
		const aux = new Float32Array(N * 4);
		for (let i = 0; i < aux.length; i++) aux[i] = Math.random();
		const auxTex = new THREE.DataTexture(aux, GX, GY, THREE.RGBAFormat, THREE.FloatType);
		auxTex.needsUpdate = true;
		const u = (v) => ({ value: v });
		this.sim = new PingPong(renderer, {
			width: GX, height: GY, fragmentShader: SIM,
			uniforms: {
				uAux: u(auxTex), uReset: u(true),
				uLaneW: u(0), uMarchT: u(0), uMarchSpeed: u(1.3), uGather: u(0), uFill: u(0), uSpin: u(0.12),
				uScatter: u(0), uSwirlW: u(0), uNest: u(0), uSwirl: u(0),
				uCamZ: u(0), uCamZ0: u(0), uFlowV: u(1.2), uNestZ: u(-30),
				uPerson: u(new THREE.Vector3()), uPersonOn: u(0), uAvoidR: u(0.5),
				uRayO: u(new THREE.Vector3()), uRayD: u(new THREE.Vector3(0, 0, -1)),
			},
		});

		this.antUniforms = {
			tPos: u(null), tPrev: u(null), uWidth: u(0.028), uLenScale: u(0.06), uMaxLen: u(0.5), uDt: u(0.016), uAspect: u(innerWidth / innerHeight),
			uColor: u(new THREE.Color(0.86, 0.9, 1.0).multiplyScalar(1.6)), uOpacity: u(1), uFogFar: u(14),
		};
		const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1),
			new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.antUniforms,
				transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }), N);
		mesh.frustumCulled = false;
		const fbo = new Float32Array(N * 2), sz = new Float32Array(N);
		for (let i = 0; i < N; i++) {
			fbo[i * 2] = ((i % GX) + 0.5) / GX; fbo[i * 2 + 1] = (Math.floor(i / GX) + 0.5) / GY;
			sz[i] = 0.55 + Math.random() * 0.45;
		}
		mesh.geometry.setAttribute('aFboUv', new THREE.InstancedBufferAttribute(fbo, 2));
		mesh.geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(sz, 1));
		this.scene.add(mesh);

		this.buildRoom();
		this.buildDust();
		this.buildMarker();
		this.raycaster = new THREE.Raycaster();
	}

	// 방 윤곽: 바닥·벽에 아주 옅은 격자 → 깊이를 읽게 하는 단서
	buildRoom() {
		const { HW, H, ZF, ZIN } = ROOM, pts = [], step = 0.6;
		const L = (a, b) => pts.push(...a, ...b);
		for (let x = -HW; x <= HW + 1e-3; x += step) L([x, 0, ZF], [x, 0, ZIN]);
		for (let z = ZF; z <= ZIN + 1e-3; z += step) { L([-HW, 0, z], [HW, 0, z]); L([-HW, 0, z], [-HW, H, z]); L([HW, 0, z], [HW, H, z]); }
		for (let y = 0; y <= H + 1e-3; y += step) { L([-HW, y, ZF], [-HW, y, ZIN]); L([HW, y, ZF], [HW, y, ZIN]); L([-HW, y, ZF], [HW, y, ZF]); }
		for (let x = -HW; x <= HW + 1e-3; x += step) L([x, 0, ZF], [x, H, ZF]);
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
		this.roomUniforms = { uOpacity: { value: 1 }, uFogFar: { value: 14 } };
		const m = new THREE.ShaderMaterial({
			uniforms: this.roomUniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
			vertexShader: `varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
			fragmentShader: `uniform float uOpacity, uFogFar; varying float vD; void main(){ gl_FragColor = vec4(vec3(0.75, 0.62, 0.5) * 0.055 * exp(-vD / uFogFar) * uOpacity, 1.); }`,
		});
		this.room = new THREE.LineSegments(g, m);
		this.scene.add(this.room);
	}

	buildDust() {
		const n = 900, pos = new Float32Array(n * 3), rnd = new Float32Array(n);
		for (let i = 0; i < n; i++) {
			pos[i * 3] = (Math.random() - 0.5) * 9; pos[i * 3 + 1] = Math.random() * 4.6 - 0.3; pos[i * 3 + 2] = 9 - Math.random() * 46;
			rnd[i] = Math.random();
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
		this.dustUniforms = { uTime: { value: 0 }, uScale: { value: innerHeight } };
		const m = new THREE.ShaderMaterial({
			uniforms: this.dustUniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
			vertexShader: `attribute float aRnd; uniform float uTime, uScale; varying float vA;
				void main(){ vec3 p = position; float s = uTime * 0.2 + aRnd * 40.;
				p += vec3(sin(s * 1.3), cos(s * 1.1), sin(s * 0.7)) * 0.15;
				vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
				gl_PointSize = mix(0.008, 0.02, aRnd) * uScale / -mv.z; vA = smoothstep(0.3, 2., -mv.z) * exp(-(-mv.z) / 18.); }`,
			fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(0.68, 0.45, 0.25) * smoothstep(.5, 0., d) * vA, 1.); }`,
		});
		const p = new THREE.Points(g, m); p.frustumCulled = false;
		this.scene.add(p);
	}

	// 커서가 닿은 자리(=관객이 선 자리) 표시: 표면에 눕힌 옅은 고리
	buildMarker() {
		this.marker = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.47, 64),
			new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.7, 0.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
		this.scene.add(this.marker);
	}

	// 커서 광선이 방 표면(바닥·좌벽·우벽·정면)에 닿는 자리
	hitRoom(camera, ndc) {
		this.raycaster.setFromCamera(ndc, camera);
		const o = this.raycaster.ray.origin, d = this.raycaster.ray.direction, { HW, H, ZF, ZIN } = ROOM;
		let best = null;
		const test = (t, n) => {
			if (!(t > 0.05) || (best && t >= best.t)) return;
			const p = o.clone().addScaledVector(d, t);
			if (p.x < -HW - 1e-3 || p.x > HW + 1e-3 || p.y < -1e-3 || p.y > H + 1e-3 || p.z < ZF - 1e-3 || p.z > ZIN + 1e-3) return;
			best = { t, p, n };
		};
		if (d.y) test((0 - o.y) / d.y, new THREE.Vector3(0, 1, 0));
		if (d.x) { test((-HW - o.x) / d.x, new THREE.Vector3(1, 0, 0)); test((HW - o.x) / d.x, new THREE.Vector3(-1, 0, 0)); }
		if (d.z) test((ZF - o.z) / d.z, new THREE.Vector3(0, 0, 1));
		return { hit: best, ray: this.raycaster.ray };
	}

	reset() { this.sim.uniforms.uReset.value = true; }

	update(time, dt, camera, ndc, pointerActive, markerOpacity) {
		const su = this.sim.uniforms;
		su.uTime.value = time; su.uDelta.value = dt;
		su.uCamZ.value = camera.position.z;
		const { hit, ray } = this.hitRoom(camera, ndc);
		su.uRayO.value.copy(ray.origin); su.uRayD.value.copy(ray.direction);
		su.uPersonOn.value = pointerActive ? 1 : 0;
		if (hit) {
			su.uPerson.value.copy(hit.p);
			this.marker.position.copy(hit.p).addScaledVector(hit.n, 0.015);
			this.marker.lookAt(hit.p.clone().add(hit.n));
		} else su.uPerson.value.set(0, -99, 0);
		this.marker.material.opacity = hit ? markerOpacity * (0.55 + 0.25 * Math.sin(time * 3)) : 0;
		this.sim.update();
		su.uReset.value = false;
		this.antUniforms.tPos.value = this.sim.texture;
		this.antUniforms.tPrev.value = this.sim.alternateTexture;
		this.antUniforms.uDt.value = Math.max(dt, 1e-3);
		this.antUniforms.uAspect.value = camera.aspect;
		this.dustUniforms.uTime.value = time;
	}
}
