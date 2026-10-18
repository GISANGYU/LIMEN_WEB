// 후처리: Bloom(밝은 부분 → 5단 흐림 합성) + 색수차 + 비네팅 + 그레인. 레퍼런스 2-1 Post FX 값을 기본으로.
import * as THREE from 'three';

const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const HIGHPASS = /* glsl */`
varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uThreshold;
void main() {
	vec4 c = texture2D(tDiffuse, vUv);
	float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
	gl_FragColor = c * smoothstep(uThreshold, uThreshold + 0.01, l);
}`;

const BLUR = /* glsl */`
varying vec2 vUv; uniform sampler2D tDiffuse; uniform vec2 uDir; uniform vec2 uTexel; uniform int uRadius;
float gauss(float x, float s) { return exp(-0.5 * x * x / (s * s)); }
void main() {
	float s = float(uRadius) * 0.5;
	vec3 sum = texture2D(tDiffuse, vUv).rgb; float wsum = 1.;
	for (int i = 1; i <= 11; i++) {
		if (i > uRadius) break;
		float w = gauss(float(i), s);
		vec2 o = uDir * uTexel * float(i);
		sum += (texture2D(tDiffuse, vUv + o).rgb + texture2D(tDiffuse, vUv - o).rgb) * w;
		wsum += 2. * w;
	}
	gl_FragColor = vec4(sum / wsum, 1.);
}`;

const FINAL = /* glsl */`
varying vec2 vUv;
uniform sampler2D tScene, tB0, tB1, tB2, tB3, tB4;
uniform float uStrength, uRadius, uTime;
uniform float uCaDistort, uCaBend;
uniform float uVigStrength, uVigOuter, uVigInner; uniform vec3 uVigColor;
uniform float uNoise, uFade;
float lf(float f) { return mix(f, 1.2 - f, uRadius); }
float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
	vec2 c = vUv - 0.5;
	float d = dot(c, c);
	vec2 off = c * d * uCaDistort * uCaBend * 0.06;
	vec3 col = vec3(texture2D(tScene, vUv + off).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - off).b);
	vec3 bloom = lf(1.0) * texture2D(tB0, vUv).rgb + lf(0.8) * texture2D(tB1, vUv).rgb + lf(0.6) * texture2D(tB2, vUv).rgb
	           + lf(0.4) * texture2D(tB3, vUv).rgb + lf(0.2) * texture2D(tB4, vUv).rgb;
	col += bloom * uStrength;
	float v = smoothstep(uVigInner, uVigOuter * 0.75, length(c) * 1.4142);
	col = mix(col, uVigColor, v * uVigStrength);
	col += (rand(vUv * 1000. + fract(uTime * 7.13)) - 0.5) * uNoise * 0.12;
	col *= uFade;
	gl_FragColor = vec4(max(col, 0.), 1.);
	#include <colorspace_fragment>
}`;

export class PostFX {
	constructor(renderer) {
		this.renderer = renderer;
		const opt = { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 };
		this.sceneRT = new THREE.WebGLRenderTarget(1, 1, opt);
		const bopt = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
		this.hp = new THREE.WebGLRenderTarget(1, 1, bopt);
		this.levels = [];
		for (let i = 0; i < 5; i++) this.levels.push([new THREE.WebGLRenderTarget(1, 1, bopt), new THREE.WebGLRenderTarget(1, 1, bopt)]);
		const q = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
		this.mHigh = q(HIGHPASS, { tDiffuse: { value: null }, uThreshold: { value: 0.28 } });
		this.mBlur = q(BLUR, { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() }, uTexel: { value: new THREE.Vector2() }, uRadius: { value: 3 } });
		this.uniforms = {
			tScene: { value: this.sceneRT.texture },
			tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null }, tB4: { value: null },
			uStrength: { value: 0.71 }, uRadius: { value: 0.89 }, uTime: { value: 0 },
			uCaDistort: { value: 1.165 }, uCaBend: { value: 0.155 },
			uVigStrength: { value: 0.994 }, uVigOuter: { value: 1.32 }, uVigInner: { value: 0 }, uVigColor: { value: new THREE.Color(0.0118, 0.0078, 0.0078) },
			uNoise: { value: 0.19 }, uFade: { value: 1 },
		};
		this.levels.forEach((l, i) => { this.uniforms['tB' + i].value = l[1].texture; });
		this.mFinal = q(FINAL, this.uniforms);
		this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mHigh);
		this.qScene = new THREE.Scene(); this.qScene.add(this.quad);
		this.qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	}

	setSize(w, h) {
		const pr = this.renderer.getPixelRatio();
		this.sceneRT.setSize(w * pr, h * pr);
		let bw = Math.round(w * pr / 2), bh = Math.round(h * pr / 2);
		this.hp.setSize(bw, bh);
		for (const [a, b] of this.levels) { a.setSize(bw, bh); b.setSize(bw, bh); bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1); }
	}

	pass(material, target) {
		this.quad.material = material;
		this.renderer.setRenderTarget(target);
		this.renderer.render(this.qScene, this.qCam);
	}

	render(scene, camera, time) {
		const r = this.renderer;
		r.setRenderTarget(this.sceneRT);
		r.render(scene, camera);
		this.uniforms.uTime.value = time;
		if (this.uniforms.uStrength.value <= 0) { this.pass(this.mFinal, null); return; }
		this.mHigh.uniforms.tDiffuse.value = this.sceneRT.texture;
		this.pass(this.mHigh, this.hp);
		let src = this.hp;
		const radii = [3, 5, 7, 9, 11];
		this.levels.forEach(([a, b], i) => {
			const m = this.mBlur.uniforms;
			m.uRadius.value = radii[i];
			m.tDiffuse.value = src.texture; m.uTexel.value.set(1 / a.width, 1 / a.height); m.uDir.value.set(1, 0);
			this.pass(this.mBlur, a);
			m.tDiffuse.value = a.texture; m.uDir.value.set(0, 1);
			this.pass(this.mBlur, b);
			src = b;
		});
		this.uniforms.uTime.value = time;
		this.pass(this.mFinal, null);
	}
}
