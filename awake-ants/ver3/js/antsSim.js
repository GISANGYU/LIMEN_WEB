// A·B 흐름(레퍼런스 2-1 Contour Lines) 위치 계산 + 커서가 흐름을 끌고 휘젓는 힘.
// 상태 텍스처 RGBA = (x, y, 속도계수, 수명). 좌표는 lines 공간(±카메라 거리).
// C·D 의 3D 개미는 room.js.
import * as THREE from 'three';

export const SIM_FRAG = /* glsl */`
varying vec2 vUv;
uniform sampler2D uBaseTexture;   // 처음 자리 (x, y, 속도계수[+1000=커서 방출], 난수)
uniform sampler2D uTexture;       // 이전 상태
uniform sampler2D tNoise;
uniform float uTime, uDelta, uDecay, uSpeed;
uniform bool uEnablePointer, uReset;
uniform vec2 uPointer;
uniform float uPointerRadius;
uniform vec3 uCameraPosition;
uniform vec3 uStartOffset;
uniform vec2 uPointerVel;         // lines 공간 커서 속도
uniform float uDragR, uDrag;      // 커서가 흐름을 끄는 반경·세기

vec3 noiseAt(vec2 p) { return texture2D(tNoise, p * (1. / uCameraPosition.z / 2.) + 0.5).xyz; }

void main() {
	vec4 st = texture2D(uTexture, vUv);
	vec4 base = texture2D(uBaseTexture, vUv);
	base.xyz += uStartOffset;
	if (base == vec4(0.)) { gl_FragColor = st; return; }

	if (uReset) {                       // 레퍼런스와 같이 오프셋을 한 번 더 더한다
		vec4 r = base; r.xyz += uStartOffset; r.z = base.z - uStartOffset.z;
		gl_FragColor = r; return;
	}

	vec2 ptr = (uPointer - 0.5) * 2. * uCameraPosition.z + uCameraPosition.xy;
	bool emitter = base.z > 999.;
	float spd = emitter ? base.z - 1000. : base.z;

	vec4 pf = st;
	if (emitter && pf.w <= 0.) {
		pf.xy = ptr + normalize(base.xy) * uPointerRadius;
		if (!uEnablePointer) pf.xy = vec2(1000.);
		pf.w = 1.;
	} else if (emitter) {
		pf.xy += noiseAt(pf.xy).xy * uDelta * uSpeed * spd;
		pf.w -= uDelta * uDecay * 15.;
	} else {
		pf.xy += noiseAt(pf.xy).xy * uDelta * uSpeed * spd;
		pf.w -= uDelta * uDecay;
		if (pf.w <= 0.) { pf.xy = base.xy; pf.w = 1.; }
	}

	// 커서 둘레: 커서가 움직인 쪽으로 끌려가고, 둘레를 감아 돈다
	if (uEnablePointer && uDrag > 0.) {
		vec2 d = pf.xy - ptr; float l = length(d);
		float k = smoothstep(uDragR, 0., l);
		if (l > 1e-4 && k > 0.) {
			vec2 tg = vec2(-d.y, d.x) / l;
			pf.xy += (uPointerVel * 0.9 + tg * 1.6 * (0.3 + length(uPointerVel) * 0.15)) * k * uDrag * uDelta;
		}
	}

	pf.z = base.z - uStartOffset.z;
	gl_FragColor = pf;
}`;

const QUAD_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

// 레퍼런스의 ps(핑퐁) 도우미와 같은 역할: uBaseTexture=data, uTexture=이전 결과.
export class PingPong {
	constructor(renderer, { width, height, fragmentShader, uniforms = {}, type = THREE.FloatType,
		filter = THREE.NearestFilter, data = null, rtOptions = {} }) {
		this.renderer = renderer;
		const opt = { type, minFilter: filter, magFilter: filter, depthBuffer: false, ...rtOptions };
		this.a = new THREE.WebGLRenderTarget(width, height, opt);
		this.b = new THREE.WebGLRenderTarget(width, height, opt);
		this.uniforms = Object.assign({
			uBaseTexture: { value: null }, uTexture: { value: null },
			uTime: { value: 0 }, uDelta: { value: 0.016 },
		}, uniforms);
		if (data) {
			const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
			tex.needsUpdate = true;
			this.uniforms.uBaseTexture.value = tex;
			this.baseTexture = tex;
		}
		this.material = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader, uniforms: this.uniforms, depthTest: false, depthWrite: false });
		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
		this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material));
		if (data) this.seed();
	}

	seed() { // 첫 상태 = 처음 자리
		const copy = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, uniforms: { t: { value: this.baseTexture } },
			fragmentShader: 'varying vec2 vUv; uniform sampler2D t; void main(){ gl_FragColor = texture2D(t, vUv); }' });
		const m = this.scene.children[0]; m.material = copy;
		for (const rt of [this.a, this.b]) { this.renderer.setRenderTarget(rt); this.renderer.render(this.scene, this.camera); }
		this.renderer.setRenderTarget(null); m.material = this.material; copy.dispose();
	}

	get texture() { return this.a.texture; }
	get alternateTexture() { return this.b.texture; }

	update() {
		[this.a, this.b] = [this.b, this.a];          // b = 이전, a = 새로 씀
		this.uniforms.uTexture.value = this.b.texture;
		const prev = this.renderer.getRenderTarget();
		this.renderer.setRenderTarget(this.a);
		this.renderer.render(this.scene, this.camera);
		this.renderer.setRenderTarget(prev);
	}

	setSize(w, h) { this.a.setSize(w, h); this.b.setSize(w, h); }
}
