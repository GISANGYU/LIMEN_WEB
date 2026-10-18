// 레퍼런스 2-1 "Contour Lines" 파이프라인:
// 노이즈 흐름장(1024²) → 위치 계산(100×100) → 흐름 방향으로 눕힌 막대 → lines RT → 잔상 → 투사면.
import * as THREE from 'three';
import { PingPong, SIM_FRAG } from './antsSim.js';

// 2D simplex noise: Ashima Arts / Stefan Gustavson (MIT)
const NOISE_FRAG = /* glsl */`
varying vec2 vUv;
uniform float uFrequency, uAmplitude, uRoughness, uDetail;
uniform vec2 uNoiseTranslation;
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
	const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
	vec2 i = floor(v + dot(v, C.yy)); vec2 x0 = v - i + dot(i, C.xx);
	vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
	vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1; i = mod(i, 289.0);
	vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
	vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0); m = m * m; m = m * m;
	vec3 x = 2.0 * fract(p * C.www) - 1.0; vec3 h = abs(x) - 0.5; vec3 ox = floor(x + 0.5); vec3 a0 = x - ox;
	m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
	vec3 g; g.x = a0.x * x0.x + h.x * x0.y; g.yz = a0.yz * x12.xz + h.yz * x12.yw;
	return 130.0 * dot(m, g);
}
float turbulence(vec2 p, float f, float a, float persistence) {
	float t = 0.0;
	for (int i = 0; i < 4; i++) { t += snoise(p * f) * a; f *= 2.; a *= persistence; }
	return t;
}
void main() {
	float n = turbulence(vUv * 0.5 + uNoiseTranslation, uFrequency, uAmplitude, uRoughness);
	float ang = n * uDetail;
	gl_FragColor = vec4(cos(ang), sin(ang), n, 1.);
}`;

const PARTICLE_VERT = /* glsl */`
attribute vec2 aFboUv;
attribute float aPathOffset;
attribute float aSize;
varying float vSize, vPathOffset, vSpeed;
uniform sampler2D tPosition, tPrevPosition;
uniform float uPathSpread, uLineLength, uLineWidth;
void main() {
	vPathOffset = aPathOffset;
	vec4 tp = vec4(position, 1.0);
	vec4 pp = texture2D(tPosition, aFboUv);
	vec4 prev = texture2D(tPrevPosition, aFboUv);
	vSpeed = pp.z;
	vec3 vel = vec3(pp.xy - prev.xy, 0.);
	vec3 xDir = length(vel) > 1e-6 ? normalize(vel) : vec3(1., 0., 0.);
	vec3 yDir = normalize(cross(vec3(0., 0., 1.), xDir));
	vec3 zDir = cross(xDir, yDir);
	mat4 rot = mat4(vec4(xDir, 0.), vec4(yDir, 0.), vec4(zDir, 0.), vec4(0., 0., 0., 1.));
	tp.x *= uLineLength;
	tp.y *= uLineWidth * (0.2 + smoothstep(0., 0.3, vSpeed) * 3.);
	tp = instanceMatrix * tp;
	tp = rot * tp;
	float size = smoothstep(0.05, 0.1, pp.w) * smoothstep(0.9, 0.85, pp.w) * aSize;
	size = clamp(size, 0., 1.);
	vSize = size;
	tp.xyz *= size;
	tp.xy += pp.xy;
	tp.xy += yDir.xy * aPathOffset * uPathSpread;
	gl_Position = projectionMatrix * modelViewMatrix * tp;
}`;

const PARTICLE_FRAG = /* glsl */`
varying float vSize, vPathOffset, vSpeed;
uniform vec3 uColor1, uColor2;
float map(float v, float a, float b, float c, float d) { return c + (v - a) * (d - c) / (b - a); }
void main() {
	vec3 color = mix(uColor1, uColor2, step(0.8, vSpeed));
	color *= map(abs(vPathOffset), 0., 0.1, 0.1, 1.5);
	gl_FragColor = vec4(color, 1.);
}`;

const PERSIST_FRAG = /* glsl */`
varying vec2 vUv;
uniform sampler2D uBaseTexture, uTexture;
uniform float uBrightness, uFadeStrength;
uniform bool uReset;
void main() {
	vec4 cur = texture2D(uBaseTexture, vUv);
	vec4 prev = texture2D(uTexture, vUv);
	vec4 c = mix(cur * uBrightness, prev, 1. - uFadeStrength);
	if (uReset) c = vec4(0.);
	gl_FragColor = c;
}`;

const PLANE_VERT = /* glsl */`
varying vec2 vUv;
varying float vFogDepth;
uniform sampler2D tNoise;
uniform float uHeight, uHeightScale;
void main() {
	vUv = uv;
	vec4 p = vec4(position, 1.0);
	p.z += texture2D(tNoise, uv).z * uHeightScale * uHeight;
	vec4 mv = modelViewMatrix * p;
	vFogDepth = -mv.z;
	gl_Position = projectionMatrix * mv;
}`;

const PLANE_FRAG = /* glsl */`
varying vec2 vUv;
varying float vFogDepth;
uniform sampler2D tDiffuse;
uniform float uAlpha, uFogNear, uFogFar, uFogStrength;
uniform vec2 uPointerUv; uniform float uGlow; uniform vec3 uGlowColor;
void main() {
	vec4 c = texture2D(tDiffuse, vUv);
	float pd = length(vUv - uPointerUv);
	c.rgb += uGlowColor * (exp(-pd * pd / 0.0009) * 0.55 + exp(-pd * pd / 0.006) * 0.12) * uGlow;  // 커서 자리
	float e = 0.1;
	float mask = smoothstep(0., e, vUv.x) * smoothstep(1., 1. - e, vUv.x) * smoothstep(0., e, vUv.y) * smoothstep(1., 1. - e, vUv.y);
	c = mix(vec4(0., 0., 0., 1.), c, mask);
	c.a *= uAlpha;
	float f = clamp(smoothstep(uFogNear, uFogFar, vFogDepth) * uFogStrength, 0., 1.);
	c.rgb = mix(c.rgb, vec3(0.), f);
	gl_FragColor = c;
}`;

const QUAD_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

export class ContourLines {
	constructor(renderer, scene) {
		this.renderer = renderer;
		const GX = 100, GY = 100, W = 25, half = W / 2, N = GX * GY;
		this.count = N;

		// 노이즈 흐름장
		this.noiseUniforms = {
			uFrequency: { value: 0.26 }, uAmplitude: { value: 0.7 }, uRoughness: { value: 0.267 },
			uDetail: { value: 75 }, uNoiseTranslation: { value: new THREE.Vector2(100, 100) },
		};
		this.noiseRT = new THREE.WebGLRenderTarget(1024, 1024, { type: THREE.FloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
		this.noiseScene = new THREE.Scene();
		this.noiseScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2),
			new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: NOISE_FRAG, uniforms: this.noiseUniforms })));
		this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		this._noiseKey = '';

		// 입자 처음 자리 — 레퍼런스와 같은 격자·12개마다 커서 방출
		const data = new Float32Array(N * 4);
		const rf = (a, b) => a + Math.random() * (b - a);
		for (let m = 0; m < N; m++) {
			data[m * 4] = (m % GX) / (GX - 1) * W - half;
			data[m * 4 + 1] = Math.floor(m / GY) / (GY - 1) * W - half;
			data[m * 4 + 2] = m % 6 === 0 ? 1000 + rf(0.3, 1) : rf(0.3, 1);   // 레퍼런스는 12개마다, 커서 반응을 키우려 6개마다
			data[m * 4 + 3] = Math.random();
		}

		this.linesCamera = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
		this.linesCamera.position.z = 15;

		const u = (v) => ({ value: v });
		this.sim = new PingPong(renderer, {
			width: GX, height: GY, fragmentShader: SIM_FRAG, data,
			uniforms: {
				tNoise: u(this.noiseRT.texture),
				uDecay: u(0.1), uSpeed: u(1.5), uStartOffset: u(new THREE.Vector3()),
				uPointer: u(new THREE.Vector2(0.5, 0.5)), uPointerRadius: u(1),
				uCameraPosition: u(this.linesCamera.position.clone()), uReset: u(false), uEnablePointer: u(true),
				uPointerVel: u(new THREE.Vector2()), uDragR: u(2.4), uDrag: u(1),
			},
		});

		// 막대 인스턴스
		this.particleUniforms = {
			tPosition: u(null), tPrevPosition: u(null),
			uPathSpread: u(1), uColor1: u(new THREE.Color()), uColor2: u(new THREE.Color()),
			uLineLength: u(1), uLineWidth: u(1),
		};
		const mat = new THREE.ShaderMaterial({ vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG,
			uniforms: this.particleUniforms, transparent: true, depthTest: false, depthWrite: false });
		this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, N);
		this.mesh.frustumCulled = false;
		const o = new THREE.Object3D(), fbo = new Float32Array(N * 2), po = new Float32Array(N), sz = new Float32Array(N);
		o.scale.set(0.1, 0.015, 0.015); o.updateMatrix();
		for (let i = 0; i < N; i++) {
			this.mesh.setMatrixAt(i, o.matrix);
			fbo[i * 2] = ((i % GX) + 0.5) / GX; fbo[i * 2 + 1] = (Math.floor(i / GX) + 0.5) / GY;
			po[i] = rf(-0.1, 0.1); sz[i] = rf(0.3, 1);
		}
		this.mesh.geometry.setAttribute('aFboUv', new THREE.InstancedBufferAttribute(fbo, 2));
		this.mesh.geometry.setAttribute('aPathOffset', new THREE.InstancedBufferAttribute(po, 1));
		this.mesh.geometry.setAttribute('aSize', new THREE.InstancedBufferAttribute(sz, 1));
		this.linesScene = new THREE.Scene();
		this.linesScene.add(this.mesh);

		// lines RT + 잔상
		const rtOpt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
		this.linesRT = new THREE.WebGLRenderTarget(1024, 1024, rtOpt);
		this.persist = new PingPong(renderer, {
			width: 1024, height: 1024, fragmentShader: PERSIST_FRAG, type: THREE.HalfFloatType, filter: THREE.LinearFilter,
			uniforms: { uBrightness: u(2.41), uFadeStrength: u(0.025), uReset: u(false) },
			rtOptions: { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, anisotropy: 4 },
		});

		// 투사면
		this.planeUniforms = {
			tDiffuse: u(null), tNoise: u(this.noiseRT.texture), uHeight: u(0.5), uHeightScale: u(0.05), uAlpha: u(1),
			uPointerUv: u(new THREE.Vector2(-9, -9)), uGlow: u(0), uGlowColor: u(new THREE.Color(1.0, 0.62, 0.3)),
			uFogNear: u(20), uFogFar: u(85), uFogStrength: u(1),
		};
		this.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 100, 100),
			new THREE.ShaderMaterial({ vertexShader: PLANE_VERT, fragmentShader: PLANE_FRAG, uniforms: this.planeUniforms,
				transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
		this.plane.renderOrder = -1;
		this.plane.scale.setScalar(10);
		scene.add(this.plane);

		this.raycaster = new THREE.Raycaster();
		this.resize();
	}

	resize(cap = this.cap || 2048) {
		this.cap = cap;
		const s = Math.min(cap, Math.max(window.innerWidth, window.innerHeight) * 2);
		this.linesRT.setSize(s, s);
		this.persist.setSize(s, s);
	}

	updateNoise() {
		const n = this.noiseUniforms;
		const key = [n.uFrequency.value, n.uAmplitude.value, n.uRoughness.value, n.uDetail.value, n.uNoiseTranslation.value.x, n.uNoiseTranslation.value.y].map((v) => v.toFixed(4)).join();
		if (key === this._noiseKey) return;
		this._noiseKey = key;
		const prev = this.renderer.getRenderTarget();
		this.renderer.setRenderTarget(this.noiseRT);
		this.renderer.render(this.noiseScene, this.quadCam);
		this.renderer.setRenderTarget(prev);
	}

	// pointerNdc: 화면 커서(−1~1). 투사면에 쏴서 uv 로 바꾼다.
	update(time, delta, camera, pointerNdc) {
		this.updateNoise();
		const su = this.sim.uniforms;
		su.uTime.value = time; su.uDelta.value = delta;
		su.uCameraPosition.value.copy(this.linesCamera.position);
		this.raycaster.setFromCamera(pointerNdc, camera);
		const hit = this.raycaster.intersectObject(this.plane);
		if (hit.length) {
			su.uPointer.value.copy(hit[0].uv);
			this.planeUniforms.uPointerUv.value.copy(hit[0].uv);
			const z = this.linesCamera.position.z;
			const lx = (hit[0].uv.x - 0.5) * 2 * z, ly = (hit[0].uv.y - 0.5) * 2 * z;
			if (this._last && delta > 0) {
				const vx = (lx - this._last.x) / delta, vy = (ly - this._last.y) / delta;
				const v = su.uPointerVel.value, k = 1 - Math.exp(-delta * 10);
				v.x += (Math.max(-30, Math.min(30, vx)) - v.x) * k; v.y += (Math.max(-30, Math.min(30, vy)) - v.y) * k;
			}
			this._last = { x: lx, y: ly };
		}
		this.sim.update();

		this.particleUniforms.tPosition.value = this.sim.texture;
		this.particleUniforms.tPrevPosition.value = this.sim.alternateTexture;
		const prev = this.renderer.getRenderTarget();
		this.renderer.setRenderTarget(this.linesRT);
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.clear();
		this.renderer.render(this.linesScene, this.linesCamera);
		this.renderer.setRenderTarget(prev);

		this.persist.uniforms.uBaseTexture.value = this.linesRT.texture;
		this.persist.update();
		this.planeUniforms.tDiffuse.value = this.persist.texture;
	}

	// lines 공간 좌표 → 화면 위 월드 좌표 (커서 표시용)
	linesToWorld(p, out) {
		const z = this.linesCamera.position.z;
		const uvx = (p.x - this.linesCamera.position.x) / (2 * z) + 0.5;
		const uvy = (p.y - this.linesCamera.position.y) / (2 * z) + 0.5;
		return out.set((uvx - 0.5) * this.plane.scale.x, (uvy - 0.5) * this.plane.scale.y, 0);
	}
}
