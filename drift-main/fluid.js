// helloshivam.com footer fluid — the site runs Pavel Dobryakov's WebGL Fluid Simulation (via 'webgl-fluid').
// This is a compact WebGL2 rewrite of the same pass chain with the exact config read from the site:
//   SIM_RESOLUTION 128, DYE_RESOLUTION 1024, DENSITY_DISSIPATION 1, VELOCITY_DISSIPATION .2, PRESSURE .8,
//   PRESSURE_ITERATIONS 20, CURL 30, SPLAT_RADIUS .25, SPLAT_FORCE 6000, SHADING, COLORFUL (COLOR_UPDATE_SPEED 10),
//   BACK_COLOR #000, BLOOM (iterations 8, res 256, intensity .8, threshold .6, soft knee .7), SUNRAYS (res 196, weight 1),
//   TRIGGER 'hover' (splats on pointer move, no click needed)
export const CONFIG = {
  SIM_RESOLUTION: 128, DYE_RESOLUTION: 1024, DENSITY_DISSIPATION: 1, VELOCITY_DISSIPATION: 0.2, PRESSURE: 0.8, PRESSURE_ITERATIONS: 20,
  CURL: 30, SPLAT_RADIUS: 0.25, SPLAT_FORCE: 6000, SHADING: true, COLORFUL: true, COLOR_UPDATE_SPEED: 10,
  BLOOM: true, BLOOM_ITERATIONS: 8, BLOOM_RESOLUTION: 256, BLOOM_INTENSITY: 0.8, BLOOM_THRESHOLD: 0.6, BLOOM_SOFT_KNEE: 0.7,
  SUNRAYS: true, SUNRAYS_RESOLUTION: 196, SUNRAYS_WEIGHT: 1.0,
};

const BASE_VS = `#version 300 es
precision highp float;
in vec2 aPosition; out vec2 vUv, vL, vR, vT, vB; uniform vec2 texelSize;
void main(){ vUv = aPosition*.5+.5; vL = vUv - vec2(texelSize.x,0.); vR = vUv + vec2(texelSize.x,0.); vT = vUv + vec2(0.,texelSize.y); vB = vUv - vec2(0.,texelSize.y); gl_Position = vec4(aPosition,0.,1.); }`;
const H = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv, vL, vR, vT, vB; out vec4 o;
`;
const FS = {
  copy: H + `uniform sampler2D uTexture; void main(){ o = texture(uTexture, vUv); }`,
  clear: H + `uniform sampler2D uTexture; uniform float value; void main(){ o = value * texture(uTexture, vUv); }`,
  splat: H + `uniform sampler2D uTarget; uniform float aspectRatio; uniform vec3 color; uniform vec2 point; uniform float radius;
    void main(){ vec2 p = vUv - point; p.x *= aspectRatio; vec3 s = exp(-dot(p,p)/radius) * color; o = vec4(texture(uTarget, vUv).xyz + s, 1.); }`,
  advection: H + `uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;
    void main(){ vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize; vec4 r = texture(uSource, coord); float decay = 1. + dissipation * dt; o = r / decay; }`,
  divergence: H + `uniform sampler2D uVelocity;
    void main(){ float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x, T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y; vec2 C = texture(uVelocity, vUv).xy;
      if (vL.x < 0.) L = -C.x; if (vR.x > 1.) R = -C.x; if (vT.y > 1.) T = -C.y; if (vB.y < 0.) B = -C.y; o = vec4(.5*(R-L+T-B),0.,0.,1.); }`,
  curl: H + `uniform sampler2D uVelocity;
    void main(){ float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y, T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x; o = vec4(.5*(R-L-T+B),0.,0.,1.); }`,
  vorticity: H + `uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
    void main(){ float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x, T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
      vec2 f = .5 * vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f) + .0001; f *= curl * C; f.y *= -1.;
      vec2 v = texture(uVelocity, vUv).xy + f * dt; v = min(max(v, -1000.), 1000.); o = vec4(v,0.,1.); }`,
  pressure: H + `uniform sampler2D uPressure, uDivergence;
    void main(){ float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
      float d = texture(uDivergence, vUv).x; o = vec4((L+R+B+T-d)*.25,0.,0.,1.); }`,
  gradSub: H + `uniform sampler2D uPressure, uVelocity;
    void main(){ float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
      vec2 v = texture(uVelocity, vUv).xy - vec2(R-L, T-B); o = vec4(v,0.,1.); }`,
  bloomPre: H + `uniform sampler2D uTexture; uniform vec3 curve; uniform float threshold;
    void main(){ vec3 c = texture(uTexture, vUv).rgb; float br = max(c.r, max(c.g, c.b)); float rq = clamp(br - curve.x, 0., curve.y); rq = curve.z * rq * rq;
      c *= max(rq, br - threshold) / max(br, .0001); o = vec4(c, 0.); }`,
  bloomBlur: H + `uniform sampler2D uTexture;
    void main(){ vec4 s = texture(uTexture, vL) + texture(uTexture, vR) + texture(uTexture, vT) + texture(uTexture, vB); o = s * .25; }`,
  bloomFinal: H + `uniform sampler2D uTexture; uniform float intensity;
    void main(){ vec4 s = texture(uTexture, vL) + texture(uTexture, vR) + texture(uTexture, vT) + texture(uTexture, vB); o = s * .25 * intensity; }`,
  sunMask: H + `uniform sampler2D uTexture;
    void main(){ vec4 c = texture(uTexture, vUv); float br = max(c.r, max(c.g, c.b)); c.a = 1. - min(max(br*20., 0.), .8); o = c; }`,
  sunrays: H + `uniform sampler2D uTexture; uniform float weight;
    void main(){ float Density = .3, Decay = .95, Exposure = .7; vec2 coord = vUv; vec2 dir = vUv - .5; dir *= 1. / 16. * Density;
      float illum = 1.; float color = texture(uTexture, vUv).a;
      for (int i = 0; i < 16; i++){ coord -= dir; float col = texture(uTexture, coord).a; color += col * illum * weight; illum *= Decay; }
      o = vec4(color * Exposure, 0., 0., 1.); }`,
  blur: H + `uniform sampler2D uTexture; uniform vec2 dir;
    void main(){ vec4 s = texture(uTexture, vUv) * .29411764; s += texture(uTexture, vUv + dir * 1.33333333) * .35294117; s += texture(uTexture, vUv - dir * 1.33333333) * .35294117; o = s; }`,
  display: H + `uniform sampler2D uTexture, uBloom, uSunrays; uniform vec2 texelSize; uniform bool shading, bloom, sunrays;
    vec3 lin2g(vec3 c){ c = max(c, vec3(0)); return max(1.055 * pow(c, vec3(.416666667)) - .055, vec3(0)); }
    void main(){ vec3 c = texture(uTexture, vUv).rgb;
      if (shading){ vec3 lc = texture(uTexture, vL).rgb, rc = texture(uTexture, vR).rgb, tc = texture(uTexture, vT).rgb, bc = texture(uTexture, vB).rgb;
        float dx = length(rc) - length(lc), dy = length(tc) - length(bc); vec3 n = normalize(vec3(dx, dy, length(texelSize))); float diffuse = clamp(dot(n, vec3(0,0,1)) + .7, .7, 1.); c *= diffuse; }
      vec3 bl = bloom ? texture(uBloom, vUv).rgb : vec3(0);
      if (sunrays){ float s = texture(uSunrays, vUv).r; c *= s; bl *= s; }
      if (bloom){ bl = lin2g(bl); c += bl; }
      float a = max(c.r, max(c.g, c.b)); o = vec4(c, a); }`,
};

export function createFluid(canvas, config = CONFIG) {
  const gl = canvas.getContext('webgl2', { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false });
  if (!gl) return { update() {}, set active(v) {} };
  gl.getExtension('EXT_color_buffer_float');
  const linear = !!gl.getExtension('OES_texture_float_linear');
  const HF = gl.HALF_FLOAT;
  const filter = linear ? gl.LINEAR : gl.NEAREST;
  // pass the inverted full-screen triangle pair, like the original blit()
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
  const compile = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
  const vs = compile(gl.VERTEX_SHADER, BASE_VS);
  const P = {};
  for (const k in FS) {
    const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FS[k])); gl.bindAttribLocation(p, 0, 'aPosition'); gl.linkProgram(p);
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    P[k] = { p, u, bind() { gl.useProgram(p); return u; } };
  }
  const blit = (target) => {
    if (!target) { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    else { gl.viewport(0, 0, target.w, target.h); gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
  const fbo = (w, h, ifmt, fmt, f) => {
    gl.activeTexture(gl.TEXTURE0); const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, HF, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo: fb, w, h, tx: 1 / w, ty: 1 / h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
  };
  const dfbo = (w, h, i, f, fl) => { let a = fbo(w, h, i, f, fl), b = fbo(w, h, i, f, fl); return { w, h, tx: 1 / w, ty: 1 / h, get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; } }; };
  const res = (r) => { let ar = gl.drawingBufferWidth / gl.drawingBufferHeight; if (ar < 1) ar = 1 / ar; const mn = Math.round(r), mx = Math.round(r * ar); return gl.drawingBufferWidth > gl.drawingBufferHeight ? { w: mx, h: mn } : { w: mn, h: mx }; };

  let dye, velocity, divergence, curl, pressure, bloom, blooms = [], sunrays, sunraysTemp;
  const RGBA = [gl.RGBA16F, gl.RGBA], RG = [gl.RG16F, gl.RG], R = [gl.R16F, gl.RED];
  const initFBOs = () => {
    const s = res(config.SIM_RESOLUTION), d = res(config.DYE_RESOLUTION);
    gl.disable(gl.BLEND);
    dye = dfbo(d.w, d.h, ...RGBA, filter); velocity = dfbo(s.w, s.h, ...RG, filter);
    divergence = fbo(s.w, s.h, ...R, gl.NEAREST); curl = fbo(s.w, s.h, ...R, gl.NEAREST); pressure = dfbo(s.w, s.h, ...R, gl.NEAREST);
    const b = res(config.BLOOM_RESOLUTION); bloom = fbo(b.w, b.h, ...RGBA, filter); blooms = [];
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) { const w = b.w >> (i + 1), h = b.h >> (i + 1); if (w < 2 || h < 2) break; blooms.push(fbo(w, h, ...RGBA, filter)); }
    const sr = res(config.SUNRAYS_RESOLUTION); sunrays = fbo(sr.w, sr.h, ...R, filter); sunraysTemp = fbo(sr.w, sr.h, ...R, filter);
  };
  const resize = () => { const dpr = Math.min(devicePixelRatio || 1, 1.5); const w = canvas.clientWidth * dpr | 0, h = canvas.clientHeight * dpr | 0; if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; initFBOs(); } };
  resize(); addEventListener('resize', resize);

  const HSV = (h, s, v) => { const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s); return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; };
  const genColor = () => HSV(Math.random(), 1, 1).map((c) => c * 0.15);
  const ptr = { x: 0, y: 0, dx: 0, dy: 0, moved: false, color: [30 / 255 * .15, 0, 300 / 255 * .15], down: false }; // default pointer colour [30,0,300]
  const correctR = (r) => { const ar = canvas.width / canvas.height; return ar > 1 ? r * ar : r; };
  const splat = (x, y, dx, dy, color) => {
    let u = P.splat.bind(); gl.uniform1i(u.uTarget, velocity.read.attach(0)); gl.uniform1f(u.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(u.point, x, y); gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, correctR(config.SPLAT_RADIUS / 100)); blit(velocity.write); velocity.swap();
    gl.uniform1i(u.uTarget, dye.read.attach(0)); gl.uniform3f(u.color, ...color); blit(dye.write); dye.swap();
  };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    if (!ptr.init) { ptr.x = x; ptr.y = y; ptr.init = true; ptr.color = genColor(); return; }
    let dx = x - ptr.x, dy = y - ptr.y; const ar = canvas.width / canvas.height; if (ar < 1) dx *= ar; else dy /= ar;   // correctDeltaX/Y
    ptr.dx = dx; ptr.dy = dy; ptr.x = x; ptr.y = y; ptr.moved = Math.abs(dx) > 0 || Math.abs(dy) > 0;
  };
  addEventListener('pointermove', onMove, { passive: true });
  // a few random splats on first activation (IMMEDIATE: true → multipleSplats on start)
  const randomSplats = (n) => { for (let i = 0; i < n; i++) { const c = genColor().map((v) => v * 10); splat(Math.random(), Math.random(), 1000 * (Math.random() - .5), 1000 * (Math.random() - .5), c); } };

  let colorTimer = 0, active = false, started = false;
  const step = (dt) => {
    gl.disable(gl.BLEND);
    let u = P.curl.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); blit(curl);
    u = P.vorticity.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uCurl, curl.attach(1));
    gl.uniform1f(u.curl, config.CURL); gl.uniform1f(u.dt, dt); blit(velocity.write); velocity.swap();
    u = P.divergence.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); blit(divergence);
    u = P.clear.bind(); gl.uniform1i(u.uTexture, pressure.read.attach(0)); gl.uniform1f(u.value, config.PRESSURE); blit(pressure.write); pressure.swap();
    u = P.pressure.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) { gl.uniform1i(u.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
    u = P.gradSub.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uPressure, pressure.read.attach(0)); gl.uniform1i(u.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap();
    u = P.advection.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); const vid = velocity.read.attach(0);
    gl.uniform1i(u.uVelocity, vid); gl.uniform1i(u.uSource, vid); gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, config.VELOCITY_DISSIPATION); blit(velocity.write); velocity.swap();
    gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uSource, dye.read.attach(1)); gl.uniform1f(u.dissipation, config.DENSITY_DISSIPATION); blit(dye.write); dye.swap();
  };
  const applyBloom = (src, dst) => {
    let last = dst; gl.disable(gl.BLEND);
    let u = P.bloomPre.bind(); const knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + .0001;
    gl.uniform3f(u.curve, config.BLOOM_THRESHOLD - knee, knee * 2, .25 / knee); gl.uniform1f(u.threshold, config.BLOOM_THRESHOLD); gl.uniform1i(u.uTexture, src.attach(0)); blit(last);
    u = P.bloomBlur.bind();
    for (const d of blooms) { gl.uniform2f(u.texelSize, last.tx, last.ty); gl.uniform1i(u.uTexture, last.attach(0)); blit(d); last = d; }
    gl.blendFunc(gl.ONE, gl.ONE); gl.enable(gl.BLEND);
    for (let i = blooms.length - 2; i >= 0; i--) { const b = blooms[i]; gl.uniform2f(u.texelSize, last.tx, last.ty); gl.uniform1i(u.uTexture, last.attach(0)); blit(b); last = b; }
    gl.disable(gl.BLEND);
    u = P.bloomFinal.bind(); gl.uniform2f(u.texelSize, last.tx, last.ty); gl.uniform1i(u.uTexture, last.attach(0)); gl.uniform1f(u.intensity, config.BLOOM_INTENSITY); blit(dst);
  };
  const applySunrays = (src, mask, dst) => {
    gl.disable(gl.BLEND);
    let u = P.sunMask.bind(); gl.uniform1i(u.uTexture, src.attach(0)); blit(mask);
    u = P.sunrays.bind(); gl.uniform1f(u.weight, config.SUNRAYS_WEIGHT); gl.uniform1i(u.uTexture, mask.attach(0)); blit(dst);
    u = P.blur.bind(); gl.uniform2f(u.dir, dst.tx, 0); gl.uniform1i(u.uTexture, dst.attach(0)); blit(sunraysTemp);
    gl.uniform2f(u.dir, 0, dst.ty); gl.uniform1i(u.uTexture, sunraysTemp.attach(0)); blit(dst);
  };
  const render = () => {
    if (config.BLOOM) applyBloom(dye.read, bloom);
    if (config.SUNRAYS) applySunrays(dye.read, dye.write, sunrays);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 1); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.clear(gl.COLOR_BUFFER_BIT); // BACK_COLOR #000
    const u = P.display.bind(); gl.uniform2f(u.texelSize, 1 / gl.drawingBufferWidth, 1 / gl.drawingBufferHeight);
    gl.uniform1i(u.uTexture, dye.read.attach(0)); gl.uniform1i(u.shading, config.SHADING ? 1 : 0); gl.uniform1i(u.bloom, config.BLOOM ? 1 : 0); gl.uniform1i(u.sunrays, config.SUNRAYS ? 1 : 0);
    if (config.BLOOM) gl.uniform1i(u.uBloom, bloom.attach(1)); if (config.SUNRAYS) gl.uniform1i(u.uSunrays, sunrays.attach(2));
    blit(null);
  };
  return {
    set active(v) { active = v; if (v && !started) { started = true; randomSplats(innerWidth < 820 ? 2 : 4); } },
    get active() { return active; },
    update(dt) {
      if (!active) return;
      resize(); dt = Math.min(dt, 0.016666);
      if (config.COLORFUL) { colorTimer += dt * config.COLOR_UPDATE_SPEED; if (colorTimer >= 1) { colorTimer %= 1; ptr.color = genColor(); } }
      if (ptr.moved) { ptr.moved = false; splat(ptr.x, ptr.y, ptr.dx * config.SPLAT_FORCE, ptr.dy * config.SPLAT_FORCE, ptr.color); }
      step(dt); render();
    },
    splatAt(x, y, dx, dy) { splat(x, y, dx, dy, genColor().map((v) => v * 10)); },
  };
}
