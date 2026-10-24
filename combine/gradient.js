// monopo.london <monopo-gradient> rebuilt + skarlo.co UnicornStudio "liquify / blinds" post layers on top.
// monopo attributes (measured on the live element):
//   color1 #16254b color2 #23418a color3 #aadfd9 color4 #e64f0f, colorsize .75, colorspacing .52,
//   colorrotation -.3816, colorspread 4.52, coloroffset (-.774,-.206), displacement 5, seed .18,
//   position (-.28,-.44), zoom .72, spacing 4.27
//   shader order: pos/=zoom + position → gradient-noise derivative (.xz) * displacement → repeat mod(spacing*2)
//                 → rotate → 4 bands blended by distance smoothstep at colorSpacing*(-1.5,-.5,.5,1.5) + value-noise grain
// skarlo BG layer 4 liquify: pos = .5 + (mouse-.5)*.19, rotation .3807*2π, freq 5*(.14+.1), 5 iterations, chromAbb .47*.5, t=uTime*.025
// skarlo layer 7 blinds: divisions 2+.5*30 = 17, uTime*.01 drift (very low mix here)
import { lerp } from './_shared/js/core.js';

const VS = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uVel; uniform float uDim; uniform float uScroll;
uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 c4;
const float colorSize = .75, colorSpacing = .52, colorRotation = -.3816, colorSpread = 4.52;
const vec2 colorOffset = vec2(-.774, -.206), position = vec2(-.28, -.44);
const float displacement = 5., seed = .18, zoom = .72, spacing = 4.27;
// gradient noise with analytic derivatives (iq) — returns (value, d/dx, d/dy, d/dz)
vec3 hash3(vec3 p){ p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6))); return -1.+2.*fract(sin(p)*43758.5453123); }
vec4 gnoised(vec3 x){
  vec3 i = floor(x), f = fract(x);
  vec3 u = f*f*f*(f*(f*6.-15.)+10.), du = 30.*f*f*(f*(f-2.)+1.);
  vec3 ga=hash3(i), gb=hash3(i+vec3(1,0,0)), gc=hash3(i+vec3(0,1,0)), gd=hash3(i+vec3(1,1,0));
  vec3 ge=hash3(i+vec3(0,0,1)), gf=hash3(i+vec3(1,0,1)), gg=hash3(i+vec3(0,1,1)), gh=hash3(i+vec3(1,1,1));
  float va=dot(ga,f), vb=dot(gb,f-vec3(1,0,0)), vc=dot(gc,f-vec3(0,1,0)), vd=dot(gd,f-vec3(1,1,0));
  float ve=dot(ge,f-vec3(0,0,1)), vf=dot(gf,f-vec3(1,0,1)), vg=dot(gg,f-vec3(0,1,1)), vh=dot(gh,f-vec3(1,1,1));
  float v = va + u.x*(vb-va) + u.y*(vc-va) + u.z*(ve-va) + u.x*u.y*(va-vb-vc+vd) + u.y*u.z*(va-vc-ve+vg) + u.z*u.x*(va-vb-ve+vf) + u.x*u.y*u.z*(-va+vb+vc-vd+ve-vf-vg+vh);
  vec3 d = ga + u.x*(gb-ga) + u.y*(gc-ga) + u.z*(ge-ga) + u.x*u.y*(ga-gb-gc+gd) + u.y*u.z*(ga-gc-ge+gg) + u.z*u.x*(ga-gb-ge+gf) + u.x*u.y*u.z*(-ga+gb+gc-gd+ge-gf-gg+gh)
         + du*(vec3(vb-va,vc-va,ve-va) + u.yzx*vec3(va-vb-vc+vd,va-vc-ve+vg,va-vb-ve+vf) + u.zxy*vec3(va-vb-ve+vf,va-vb-vc+vd,va-vc-ve+vg) + u.yzx*u.zxy*(-va+vb+vc-vd+ve-vf-vg+vh));
  return vec4(v, d);
}
mat2 rot(float a){ float s=sin(a), c=cos(a); return mat2(c,-s,s,c); }
vec3 monopo(vec2 uv){
  vec2 pos = (uv - .5) * vec2(uRes.x/uRes.y, 1.);
  pos = pos / zoom + position;
  pos.y += uScroll * .35;                        // page scroll drifts the field (monopo moves it with the page)
  vec4 n = gnoised(vec3(pos*.5 + .5, seed + uTime*.035));
  pos += n.yw * .5 * displacement * .2;          // derivative .xz → bends the bands
  pos -= colorOffset;
  pos *= rot(colorRotation);
  float v = pos.x * (colorSpread / 4.52);
  v = mod(v + spacing, spacing * 2.) - spacing;  // repeat
  float w = colorSize * .5;
  float b1 = 1. - smoothstep(0., w, abs(v - colorSpacing*-1.5));
  float b2 = 1. - smoothstep(0., w, abs(v - colorSpacing*-.5));
  float b3 = 1. - smoothstep(0., w, abs(v - colorSpacing*.5));
  float b4 = 1. - smoothstep(0., w, abs(v - colorSpacing*1.5));
  vec3 col = c1*b1 + c2*b2 + c3*b3 + c4*b4;
  float halo = 1. - smoothstep(0., colorSpacing*2.6, abs(v));
  col += mix(c1, c2, .5) * halo * .35;
  return col;
}
float h12(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  // --- skarlo blinds (17 divisions) — glass slats refract x slightly
  float div = 2. + .5*30.;
  float sl = fract(uv.x*div + uTime*.01);
  uv.x += (sl - .5) * .006;
  // --- skarlo liquify centred on (momentum) mouse
  vec2 m = .5 + (uMouse - .5) * .19 * 5.;        // our cursor reaches further than the 19% skarlo uses for a full-screen bg
  vec2 asp = vec2(uRes.x/uRes.y, 1.);
  vec2 q = (uv - m) * asp;
  float dist = length(q);
  float amp = .68 * mix(.2, .2/.19, .25) * (.25 + uVel*1.6) * exp(-dist*2.2);
  float freq = 5. * (.14 + .1) * 6.;
  float t = uTime * .025 * 10.;
  q *= rot(.3807 * 6.2831 * .05);
  for (int i = 0; i < 5; i++) {
    q += vec2(cos(q.y*freq + t + float(i)), sin(q.x*freq - t + float(i)*1.3)) * amp * .06;
    q *= rot(.12);
  }
  vec2 wuv = m + q / asp;
  float ch = .47 * .5 * .02 * (.4 + uVel*2.);
  vec2 dir = normalize(q + 1e-4) * ch;
  vec3 col = vec3(monopo(wuv + dir).r, monopo(wuv).g, monopo(wuv - dir).b);
  col += (h12(vUv*uRes + fract(uTime)*91.) - .5) * .06;   // monopo value-noise grain
  o = vec4(col * uDim, 1.);
}`;

export const PALETTES = {
  night: ['#16254b', '#23418a', '#aadfd9', '#e64f0f'],      // monopo home
  amber: ['#9A4D33', '#FEA900', '#FEA900', '#9BC99B'],      // monopo page-transition gradient
};
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

export function createGradient(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) { canvas.style.background = 'radial-gradient(120% 90% at 30% 60%, #23418a, #16254b 40%, #000 70%)'; return { update() {}, setPalette() {}, set dim(v) {} }; }
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uTime', 'uMouse', 'uVel', 'uDim', 'uScroll', 'c1', 'c2', 'c3', 'c4'].forEach((n) => (U[n] = gl.getUniformLocation(pr, n)));
  // render at reduced resolution (the field is soft; monopo renders its canvas at a fraction of DPR too)
  const SCALE = 0.5;
  const resize = () => { canvas.width = Math.max(2, innerWidth * SCALE | 0); canvas.height = Math.max(2, innerHeight * SCALE | 0); gl.viewport(0, 0, canvas.width, canvas.height); };
  resize(); addEventListener('resize', resize);
  let cur = PALETTES.night.map(hex), from = cur, to = cur, k = 1, kDur = 3;
  // skarlo mouseMomentum: delayed follow of the pointer
  const mouse = { x: .5, y: .5, tx: .5, ty: .5, v: 0 };
  addEventListener('pointermove', (e) => { const nx = e.clientX / innerWidth, ny = 1 - e.clientY / innerHeight; mouse.v = Math.min(1, mouse.v + Math.hypot(nx - mouse.tx, ny - mouse.ty) * 4); mouse.tx = nx; mouse.ty = ny; });
  const api = {
    dim: 1, scroll: 0, visible: true,
    setPalette(p, dur = 3) { from = cur.map((c) => c.slice()); to = p.map(hex); k = 0; kDur = dur; },
    update(t, dt) {
      if (!api.visible) return;
      if (k < 1) { k = Math.min(1, k + dt / kDur); const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; cur = from.map((c, i) => c.map((v, j) => lerp(v, to[i][j], e))); }
      mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05; mouse.v *= .96;
      gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform1f(U.uTime, t); gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform1f(U.uVel, mouse.v); gl.uniform1f(U.uDim, api.dim); gl.uniform1f(U.uScroll, api.scroll);
      cur.forEach((c, i) => gl.uniform3fv(U['c' + (i + 1)], c));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
  return api;
}
