// F — 반딧불이 (ver3). Unity FIREFLY_NEBULA_SYNC 의 흐름을 웹으로:
//   어둠 속 짜잘한 반딧불이만 제각각 반짝 → 커서(=관객이 선 자리)에서 보라·분홍 물결이 3D 로 일렁이며 번짐(깨어남)
//   → 물결이 지나간 자리부터 모두 깨어나고 → 같은 숨(어두움 머묾 · 밝아짐 · 어두워짐, 직선)으로 맞춰진다.
//   커서 둘레는 늘 밝다(Unity nearSteady 규칙). 깨어난(초록) 반딧불이는 커서를 피해 비켜난다.
//   보라·분홍은 깨어남 물결 한 번에만 나온다 — 커서를 움직여 생기는 작은 물결은 없다(사용자 지시 10-18).
// 입자는 공간(x ±10 · y 0~5 · z −22~15)에 흩어져 있고, 카메라가 위에서 내려와 그 안으로 걸어 들어간다.
import * as THREE from 'three';

export const RIPPLES = 1;          // 깨어남 물결 하나

const COMMON = /* glsl */`
uniform vec4 uRip[${RIPPLES}];     // xyz 중심, w 시작 시각 (없으면 -1e4)
uniform vec4 uRipP[${RIPPLES}];    // x 세기, y 속도, z 가속, w 최대 반경
uniform float uTime;
const vec3 PURPLE = vec3(0.66, 0.44, 1.0), PINK = vec3(1.0, 0.46, 0.78);
// 물마루 3겹. 반경 = 0.3 + v·age + a·age² (Unity awakenRipple 의 r0 + k·t² 꼴), 방향마다 일렁임
void ripples(vec3 p, out float crest, out float hue, out vec3 push, out float wake) {
	crest = 0.; hue = 0.; push = vec3(0.); wake = 0.;
	for (int i = 0; i < ${RIPPLES}; i++) {
		vec4 r = uRip[i], q = uRipP[i];
		float age = uTime - r.w;
		if (age < 0. || age > 40.) continue;
		vec3 d = p - r.xyz; float l = length(d); vec3 n = d / max(l, 1e-3);
		float R = 0.3 + q.y * age + q.z * age * age;
		float wob = (sin(3. * atan(n.z, n.x) + age * 1.2) + sin(5. * asin(clamp(n.y, -1., 1.)) - age * 0.9)) * 0.22;
		float life = q.x * smoothstep(q.w, q.w * 0.6, R);
		for (int k = 0; k < 3; k++) {
			float rk = R - float(k) * 0.9 + wob;
			float w = exp(-pow((l - rk) / 0.35, 2.)) * life * step(0., rk);
			crest += w; hue += w * float(k);
			push += n * w * 0.22;
		}
		if (i == 0) wake = smoothstep(R + 0.4, R - 0.8, l) * step(0., r.w + 1e3);
	}
}`;

// 물결 입자: 물마루(3겹) 위에 사는 보라·분홍 입자. 0번 물결(깨어남)에 절반, 나머지는 작은 물결들에 나눠 준다.
const WAVE_VERT = /* glsl */`
attribute vec4 aDir;     // xyz 방향(위쪽 반구), w 물마루 번호 0~2
attribute vec4 aRnd;     // x 물결 칸, y 두께 흩음, z 위상, w 크기
uniform float uHalfH, uLevel;
varying vec3 vCol; varying float vA, vSoft;
${COMMON}
void main() {
	vec4 r = uRip[0], q = uRipP[0];
	float age = uTime - r.w;
	vec3 n = aDir.xyz;
	float R = 0.3 + q.y * age + q.z * age * age;
	float wob = (sin(3. * atan(n.z, n.x) + age * 1.2) + sin(5. * asin(clamp(n.y, -1., 1.)) - age * 0.9)) * 0.22;
	float rk = R - aDir.w * 0.9 + wob + (aRnd.y - .5) * 0.3;
	float life = q.x * smoothstep(q.w, q.w * 0.6, R) * step(0., age) * step(age, 40.) * step(0.05, rk);
	vec3 p = r.xyz + n * rk;
	p += vec3(sin(uTime * 1.7 + aRnd.z * 30.), sin(uTime * 1.3 + aRnd.z * 17.), cos(uTime * 1.5 + aRnd.z * 23.)) * 0.07;
	p.y = abs(p.y);                                           // 바닥에서 되튄다
	vec4 mv = modelViewMatrix * vec4(p, 1.);
	float z = -mv.z;
	gl_Position = projectionMatrix * mv;
	gl_PointSize = clamp(mix(0.02, 0.05, aRnd.w) * projectionMatrix[1][1] * uHalfH / max(z, 0.05), 1.2, 26.);
	vSoft = smoothstep(2.5, 0.6, z);
	float tw = 0.6 + 0.4 * sin(uTime * 6. + aRnd.z * 50.);    // 일렁이며 반짝
	vA = life * tw * 0.75 * exp(-max(z - 3., 0.) / 18.) * smoothstep(0.25, 1.2, z) * uLevel;
	vCol = mix(PURPLE, PINK, aDir.w * 0.5 + (aRnd.y - .5) * 0.3);
}`;

const VERT = /* glsl */`
attribute vec4 aRnd;     // x 종류(작은 반딧불이 < 0.16), y 색, z 반짝 위상, w 크기
uniform float uHalfH, uWakeAll, uSync, uBreath, uReach, uLevel;
uniform vec3 uPtr, uAvoid;
uniform float uAvoidR;
varying vec3 vCol; varying float vA, vSoft;
${COMMON}
vec3 pal(float h) {      // 비취 → 초록 → 연두 (깨어난 반딧불이는 초록으로 밝아진다)
	vec3 a = vec3(0.30, 1.0, 0.70), b = vec3(0.42, 1.0, 0.45), c = vec3(0.75, 1.0, 0.35);
	return h < .5 ? mix(a, b, h * 2.) : mix(b, c, h * 2. - 1.);
}
void main() {
	vec3 p = position;
	float s = uTime * 0.22 + aRnd.z * 40.;
	p += vec3(sin(s * 1.3 + aRnd.y * 6.), sin(s * 0.9) * 0.6, cos(s * 1.1)) * 0.2;
	float crest, hue, wake; vec3 push;
	ripples(p, crest, hue, push, wake);
	p += push;
	bool tiny = aRnd.x < 0.2;
	float awk = max(wake, uWakeAll);
	float vis = tiny ? 1. : awk;
	// 깨어난 반딧불이는 커서를 피한다: 카메라→커서 광선 둘레가 비워지고(커서 자리에서 가장 넓게), 안쪽 것일수록 많이 비켜난다
	vec3 rd = normalize(uAvoid - cameraPosition);
	float D = length(uAvoid - cameraPosition), rt = dot(p - cameraPosition, rd);
	if (rt > 0.3) {
		vec3 rq = cameraPosition + rd * rt, ad = p - rq; float al = length(ad);
		float rr = uAvoidR * clamp(rt / D, 0.3, 1.0) * smoothstep(D + 2.5, D, rt) + 1e-3;
		if (al < rr && al > 1e-4) {
			float k = smoothstep(rr, rr * 0.15, al) * awk;
			p = rq + ad / al * mix(al, rr * (1. + 0.15 * aRnd.w), k);
		}
	}
	// 제각각 반짝임 (간격 1.2~4.5초, 0.3초 남짓)
	float iv = mix(1.2, 4.5, aRnd.y);
	float f = fract(uTime / iv + aRnd.z);
	float own = 0.1 + 0.9 * exp(-pow((f - 0.5) * iv / 0.28, 2.)) * mix(0.45, 1., aRnd.w);
	float b = mix(own, 0.05 + 0.95 * uBreath, uSync);
	// 커서 둘레: 가까울수록 세게, 늘 밝게
	float dp = length(p - uPtr);
	float near = 1. / (1. + pow(dp / uReach, 2.5));
	b = mix(b, 1., near * 0.9);
	float glow = vis * b * (tiny ? mix(0.6, 1., vis * step(0.5, max(wake, uWakeAll))) : 1.) * (1. + near * 1.6);
	vec3 col = pal(aRnd.y);
	vec3 rc = mix(PURPLE, PINK, clamp(hue / max(crest, 1e-3) * 0.5, 0., 1.));
	float cw = clamp(crest, 0., 1.);
	col = mix(col, rc, cw);
	glow += cw * 1.4;                                      // 물마루는 어둠 속 입자도 켠다
	vec4 mv = modelViewMatrix * vec4(p, 1.);
	float z = -mv.z;
	gl_Position = projectionMatrix * mv;
	float wsz = mix(0.026, 0.065, aRnd.w) * (tiny ? 0.85 : 1.) * (1. + near * 1.1 + cw * 0.7);
	gl_PointSize = clamp(wsz * projectionMatrix[1][1] * uHalfH / max(z, 0.05), 1.2, 34.);
	vSoft = smoothstep(2.5, 0.6, z);                       // 아주 가까운 것은 흐릿한 보케
	vA = glow * exp(-max(z - 3., 0.) / 16.) * smoothstep(0.25, 1.2, z) * uLevel;
	vCol = col;
}`;

const FRAG = /* glsl */`
varying vec3 vCol; varying float vA, vSoft;
void main() {
	vec2 q = gl_PointCoord - .5; float d2 = dot(q, q) * 4.;
	float core = exp(-d2 * mix(14., 3., vSoft)), halo = exp(-d2 * 2.5) * 0.35;
	gl_FragColor = vec4(vCol * (core * 1.5 + halo) * vA * mix(1., 0.5, vSoft), 1.);
}`;

// 바닥: 아주 옅은 격자 + 물결이 바닥과 만나는 고리 + 커서 아래 빛웅덩이 → 공간·깊이 단서
const FLOOR_VERT = /* glsl */`varying vec3 vW; varying float vD;
void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; vec4 mv = viewMatrix * w; vD = -mv.z; gl_Position = projectionMatrix * mv; }`;
const FLOOR_FRAG = /* glsl */`
varying vec3 vW; varying float vD;
uniform vec3 uPtr; uniform float uLevel, uWakeAll;
${COMMON}
void main() {
	vec2 g = abs(fract(vW.xz) - .5) / fwidth(vW.xz);
	float line = 1. - min(min(g.x, g.y), 1.);
	float crest, hue, wake; vec3 push;
	ripples(vW, crest, hue, push, wake);
	vec3 rc = mix(PURPLE, PINK, clamp(hue / max(crest, 1e-3) * 0.5, 0., 1.));
	float pool = exp(-dot(vW.xz - uPtr.xz, vW.xz - uPtr.xz) / 0.9) / (1. + uPtr.y * 0.6);
	vec3 c = vec3(0.42, 0.4, 0.62) * line * 0.05 * (0.4 + 0.6 * max(wake, uWakeAll))
	       + rc * min(crest, 1.) * 0.05
	       + vec3(0.55, 0.85, 0.75) * pool * 0.07;
	gl_FragColor = vec4(c * exp(-vD / 15.) * uLevel, 1.);
}`;

export class FireflyField {
	constructor() {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x010103);
		const N = 14000, pos = new Float32Array(N * 3), rnd = new Float32Array(N * 4);
		for (let i = 0; i < N; i++) {
			pos[i * 3] = (Math.random() - 0.5) * 20;
			pos[i * 3 + 1] = 0.05 + Math.pow(Math.random(), 1.3) * 5;     // 바닥 가까이 조금 더 많이
			pos[i * 3 + 2] = 15 - Math.random() * 37;
			for (let k = 0; k < 4; k++) rnd[i * 4 + k] = Math.random();
		}
		const g = new THREE.BufferGeometry();
		g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
		const rip = [], ripP = [];
		for (let i = 0; i < RIPPLES; i++) { rip.push(new THREE.Vector4(0, -99, 0, -1e4)); ripP.push(new THREE.Vector4()); }
		this.common = { uRip: { value: rip }, uRipP: { value: ripP }, uTime: { value: 0 } };
		this.uniforms = {
			...this.common,
			uHalfH: { value: innerHeight / 2 }, uWakeAll: { value: 0 }, uSync: { value: 0 }, uBreath: { value: 0 },
			uReach: { value: 1.2 }, uLevel: { value: 1 }, uPtr: { value: new THREE.Vector3(0, -99, 0) },
			uAvoid: { value: new THREE.Vector3(0, -99, 0) }, uAvoidR: { value: 1.3 },
		};
		const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
			transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
		const pts = new THREE.Points(g, m); pts.frustumCulled = false;
		this.scene.add(pts);

		// 물결 입자
		const W = 7000, dir = new Float32Array(W * 4), wr = new Float32Array(W * 4);
		for (let i = 0; i < W; i++) {
			const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, y = Math.abs(u) * 0.85 + 0.02, h = Math.sqrt(1 - y * y);
			dir.set([Math.cos(a) * h, y, Math.sin(a) * h, Math.floor(Math.random() * 3)], i * 4);
			wr.set([0, Math.random(), Math.random(), Math.random()], i * 4);
		}
		const wg = new THREE.BufferGeometry();
		wg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(W * 3), 3));
		wg.setAttribute('aDir', new THREE.BufferAttribute(dir, 4));
		wg.setAttribute('aRnd', new THREE.BufferAttribute(wr, 4));
		const wave = new THREE.Points(wg, new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: WAVE_VERT, fragmentShader: FRAG,
			transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
		wave.frustumCulled = false;
		this.scene.add(wave);

		// 커서 자리의 옅은 빛 (공중에 뜬 작은 빛무리) — 관객이 선 자리
		const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => {
			const c = document.createElement('canvas'); c.width = c.height = 64;
			const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
			gr.addColorStop(0, 'rgba(200,255,200,0.26)'); gr.addColorStop(0.3, 'rgba(120,220,150,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
			x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
		})(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true }));
		halo.scale.setScalar(1.1);
		this.halo = halo; this.scene.add(halo);

		this.floorUniforms = { ...this.common, uPtr: this.uniforms.uPtr, uLevel: this.uniforms.uLevel, uWakeAll: this.uniforms.uWakeAll };
		const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 44).rotateX(-Math.PI / 2).translate(0, 0, -4),
			new THREE.ShaderMaterial({ uniforms: this.floorUniforms, vertexShader: FLOOR_VERT, fragmentShader: FLOOR_FRAG,
				transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
		this.scene.add(floor);

		this.raycaster = new THREE.Raycaster();
		this.ptr = new THREE.Vector3(0, 1.2, 4);
		this.avoid = new THREE.Vector3(0, 1.2, 4);      // 피하는 기준은 조금 늦게 따라가 반딧불이가 스르륵 비켜나게
		this.ptrTarget = new THREE.Vector3();
	}

	clearRipples() {
		for (const r of this.common.uRip.value) r.set(0, -99, 0, -1e4);
	}

	// 깨어남 물결 (0번): 천천히 시작해 가속하며 들판 끝까지
	wake(t0, at) {
		this.common.uRip.value[0].set(at.x, at.y, at.z, t0);
		this.common.uRipP.value[0].set(1, 0.5, 0.085, 30);
	}
	get wakeRadius() {
		const r = this.common.uRip.value[0], q = this.common.uRipP.value[0], age = this.common.uTime.value - r.w;
		return r.w < -1e3 || age < 0 ? 0 : 0.3 + q.y * age + q.z * age * age;
	}

	// 커서 광선 위의 한 점 = 관객이 선 자리. 바닥에 닿으면 그 앞(2.5~7m), 아니면 5.5m
	pointer(camera, ndc, dt) {
		this.raycaster.setFromCamera(ndc, camera);
		const { origin: o, direction: d } = this.raycaster.ray;
		let D = 5.5;
		if (d.y < -1e-3) D = Math.min(7, Math.max(2.5, (0.15 - o.y) / d.y));
		this.ptrTarget.copy(o).addScaledVector(d, D);
		this.ptr.lerp(this.ptrTarget, 1 - Math.exp(-dt * 10));
		this.uniforms.uPtr.value.copy(this.ptr);
		this.avoid.lerp(this.ptr, 1 - Math.exp(-dt * 3.5));
		this.uniforms.uAvoid.value.copy(this.avoid);
		this.halo.position.copy(this.ptr);
		return this.ptr;
	}

	update(t, { wakeAll, sync, breath, level }) {
		const u = this.uniforms;
		u.uTime.value = t; u.uWakeAll.value = wakeAll; u.uSync.value = sync; u.uBreath.value = breath; u.uLevel.value = level;
		this.halo.material.opacity = level * (0.55 + 0.45 * Math.max(wakeAll, Math.min(1, this.wakeRadius / 4)));
	}

	resize() { this.uniforms.uHalfH.value = innerHeight / 2; }
}
