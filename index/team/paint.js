// TEAM 배경 — 마우스 주변에서 배경 영상의 색이 물감처럼 번지며 살짝 일그러진다.
// 08 푸터(helloshivam · Pavel Dobryakov WebGL Fluid)와 같은 속도장 계산을 쓰되, 색 물감을 뿌리는 대신
// "영상 색"을 속도장으로 밀어 옮기고(advect) 매 프레임 원래 영상 쪽으로 천천히 되돌린다 → 번졌다가 가라앉는 얼룩.
const VS = `#version 300 es
precision highp float;
in vec2 aPosition; out vec2 vUv, vL, vR, vT, vB; uniform vec2 texelSize;
void main(){ vUv = aPosition*.5+.5; vL = vUv - vec2(texelSize.x,0.); vR = vUv + vec2(texelSize.x,0.); vT = vUv + vec2(0.,texelSize.y); vB = vUv - vec2(0.,texelSize.y); gl_Position = vec4(aPosition,0.,1.); }`;
const H = `#version 300 es
precision highp float; precision highp sampler2D;
in vec2 vUv, vL, vR, vT, vB; out vec4 o;
`;
const FS = {
  splat: H + `uniform sampler2D uTarget; uniform float aspectRatio, radius; uniform vec3 color; uniform vec2 point;
    void main(){ vec2 p = vUv - point; p.x *= aspectRatio; o = vec4(texture(uTarget, vUv).xyz + exp(-dot(p,p)/radius) * color, 1.); }`,
  advection: H + `uniform sampler2D uVelocity, uSource; uniform vec2 texelSize; uniform float dt, dissipation;
    void main(){ vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * texelSize; o = texture(uSource, coord) / (1. + dissipation * dt); }`,
  divergence: H + `uniform sampler2D uVelocity;
    void main(){ float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x, T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y; vec2 C = texture(uVelocity, vUv).xy;
      if (vL.x < 0.) L = -C.x; if (vR.x > 1.) R = -C.x; if (vT.y > 1.) T = -C.y; if (vB.y < 0.) B = -C.y; o = vec4(.5*(R-L+T-B),0.,0.,1.); }`,
  curl: H + `uniform sampler2D uVelocity;
    void main(){ float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y, T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x; o = vec4(.5*(R-L-T+B),0.,0.,1.); }`,
  vorticity: H + `uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
    void main(){ float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x, T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
      vec2 f = .5 * vec2(abs(T)-abs(B), abs(R)-abs(L)); f /= length(f) + .0001; f *= curl * C; f.y *= -1.;
      o = vec4(clamp(texture(uVelocity, vUv).xy + f * dt, -1000., 1000.),0.,1.); }`,
  clear: H + `uniform sampler2D uTexture; uniform float value; void main(){ o = value * texture(uTexture, vUv); }`,
  pressure: H + `uniform sampler2D uPressure, uDivergence;
    void main(){ float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
      o = vec4((L+R+B+T-texture(uDivergence, vUv).x)*.25,0.,0.,1.); }`,
  gradSub: H + `uniform sampler2D uPressure, uVelocity;
    void main(){ float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x, T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
      o = vec4(texture(uVelocity, vUv).xy - vec2(R-L, T-B),0.,1.); }`,
  // 번진 색을 원래 영상 쪽으로 되돌린다 (영상은 object-fit: cover 처럼 잘라 맞춘다)
  relax: H + `uniform sampler2D uColor, uVideo; uniform vec2 cover; uniform float amount;
    void main(){ vec3 v = texture(uVideo, (vUv - .5) * cover + .5).rgb; o = vec4(mix(texture(uColor, vUv).rgb, v, amount), 1.); }`,
  // 화면: 번진 색 + 움직이는 자리에서 색이 살짝 갈라짐
  display: H + `uniform sampler2D uColor, uVelocity; uniform float split;
    void main(){ vec2 v = texture(uVelocity, vUv).xy * split;
      o = vec4(texture(uColor, vUv + v).r, texture(uColor, vUv).g, texture(uColor, vUv - v).b, 1.); }`,
};

export function createPaint(canvas, video) {
  const gl = canvas.getContext('webgl2', { alpha: false, depth: false, stencil: false, antialias: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;
  const linear = gl.getExtension('OES_texture_float_linear') ? gl.LINEAR : gl.NEAREST;
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0);
  const compile = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; };
  const vs = compile(gl.VERTEX_SHADER, VS), P = {};
  for (const k in FS) {
    const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FS[k])); gl.bindAttribLocation(p, 0, 'aPosition'); gl.linkProgram(p);
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    P[k] = { bind() { gl.useProgram(p); return u; } };
  }
  const blit = (t) => {
    if (!t) { gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); gl.bindFramebuffer(gl.FRAMEBUFFER, null); }
    else { gl.viewport(0, 0, t.w, t.h); gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); }
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  };
  const fbo = (w, h, ifmt, fmt, f) => {
    gl.activeTexture(gl.TEXTURE0); const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.clear(gl.COLOR_BUFFER_BIT);
    return { fbo: fb, w, h, attach(id) { gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; } };
  };
  const dfbo = (w, h, i, f, fl) => { let a = fbo(w, h, i, f, fl), b = fbo(w, h, i, f, fl); return { w, h, tx: 1 / w, ty: 1 / h, get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; } }; };

  // 영상 프레임 텍스처
  const vtex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, vtex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let hasFrame = false;

  const SIM = 128, COLOR = 512;
  let velocity, color, divergence, curl, pressure;
  const res = (r) => { const ar = canvas.width / canvas.height; return ar >= 1 ? { w: Math.round(r * ar), h: r } : { w: r, h: Math.round(r / ar) }; };
  const init = () => {
    const s = res(SIM), c = res(COLOR);
    velocity = dfbo(s.w, s.h, gl.RG16F, gl.RG, linear); color = dfbo(c.w, c.h, gl.RGBA16F, gl.RGBA, linear);
    divergence = fbo(s.w, s.h, gl.R16F, gl.RED, gl.NEAREST); curl = fbo(s.w, s.h, gl.R16F, gl.RED, gl.NEAREST); pressure = dfbo(s.w, s.h, gl.R16F, gl.RED, gl.NEAREST);
  };
  const resize = () => { const w = Math.max(2, canvas.clientWidth * .6 | 0), h = Math.max(2, canvas.clientHeight * .6 | 0); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; init(); } };   // 뒤에서 블러로 흐리므로 낮은 해상도
  resize(); addEventListener('resize', resize);

  const ptr = { x: 0, y: 0, dx: 0, dy: 0, moved: false, init: false };
  addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = 1 - (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) { ptr.init = false; return; }
    if (!ptr.init) { ptr.x = x; ptr.y = y; ptr.init = true; return; }
    let dx = x - ptr.x, dy = y - ptr.y; const ar = canvas.width / canvas.height; if (ar < 1) dx *= ar; else dy /= ar;
    ptr.dx = dx; ptr.dy = dy; ptr.x = x; ptr.y = y; ptr.moved = true;
  }, { passive: true });

  const splat = (x, y, dx, dy) => {
    const u = P.splat.bind(); gl.uniform1i(u.uTarget, velocity.read.attach(0)); gl.uniform1f(u.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(u.point, x, y); gl.uniform3f(u.color, dx, dy, 0); gl.uniform1f(u.radius, (canvas.width > canvas.height ? canvas.width / canvas.height : 1) * 0.0022);
    blit(velocity.write); velocity.swap();
  };
  const step = (dt) => {
    let u = P.curl.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); blit(curl);
    u = P.vorticity.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uCurl, curl.attach(1));
    gl.uniform1f(u.curl, 22); gl.uniform1f(u.dt, dt); blit(velocity.write); velocity.swap();
    u = P.divergence.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uVelocity, velocity.read.attach(0)); blit(divergence);
    u = P.clear.bind(); gl.uniform1i(u.uTexture, pressure.read.attach(0)); gl.uniform1f(u.value, 0.8); blit(pressure.write); pressure.swap();
    u = P.pressure.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uDivergence, divergence.attach(0));
    for (let i = 0; i < 16; i++) { gl.uniform1i(u.uPressure, pressure.read.attach(1)); blit(pressure.write); pressure.swap(); }
    u = P.gradSub.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty); gl.uniform1i(u.uPressure, pressure.read.attach(0)); gl.uniform1i(u.uVelocity, velocity.read.attach(1)); blit(velocity.write); velocity.swap();
    u = P.advection.bind(); gl.uniform2f(u.texelSize, velocity.tx, velocity.ty);
    gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uSource, velocity.read.attach(0)); gl.uniform1f(u.dt, dt); gl.uniform1f(u.dissipation, 0.9); blit(velocity.write); velocity.swap();
    // 영상 색을 속도장으로 밀어 옮긴다 (색은 사라지지 않게 dissipation 0)
    gl.uniform1i(u.uVelocity, velocity.read.attach(0)); gl.uniform1i(u.uSource, color.read.attach(1)); gl.uniform1f(u.dissipation, 0); blit(color.write); color.swap();
  };

  let active = false, raf = 0, last = 0;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.0167, (now - last) / 1000 || 0.0167); last = now;
    resize();
    if (video.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, vtex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video); hasFrame = true;
    }
    if (!hasFrame) return;
    if (ptr.moved) { ptr.moved = false; splat(ptr.x, ptr.y, ptr.dx * 4200, ptr.dy * 4200); }
    step(dt);
    // 원래 영상 쪽으로 되돌림 — 처음 한 번은 그대로 채운다
    const va = (video.videoWidth || 16) / (video.videoHeight || 9), ca = canvas.width / canvas.height;
    let u = P.relax.bind(); gl.uniform1i(u.uColor, color.read.attach(0)); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, vtex); gl.uniform1i(u.uVideo, 1);
    gl.uniform2f(u.cover, ca > va ? 1 : ca / va, ca > va ? va / ca : 1); gl.uniform1f(u.amount, color.filled ? 0.022 : 1); color.filled = true;
    blit(color.write); color.swap();
    u = P.display.bind(); gl.uniform1i(u.uColor, color.read.attach(0)); gl.uniform1i(u.uVelocity, velocity.read.attach(1)); gl.uniform1f(u.split, 0.00006);
    blit(null);
  };
  return {
    set active(v) {
      if (v === active) return; active = v;
      if (v) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
    },
  };
}
