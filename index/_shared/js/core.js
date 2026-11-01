// LIMEN reference-combo shared core
// Each helper here is a re-implementation of a value/algorithm measured on a reference site.
// The source of every constant is noted next to it.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a));
export const smooth = (a, b, v) => { const t = invLerp(a, b, v); return t * t * (3 - 2 * t); };
export const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
export const ease = {
  expoOut: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),          // Lenis default (frequency, intframe, monopo)
  cubicOut: (t) => 1 - Math.pow(1 - t, 3),                             // meech213 Lenis easing, shopify intro
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), // intframe core morph
  quadOut: (t) => t * (2 - t),                                         // hubtown section autoscroll
  quintInOut: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
};
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Split text into spans (chars / words). Keeps spaces as non-breaking spans.
export function splitChars(el, cls = 'ch') {
  const t = el.textContent; el.textContent = '';
  [...t].forEach((c) => { const s = document.createElement('span'); s.className = cls; s.textContent = c === ' ' ? ' ' : c; el.appendChild(s); });
  return $$('.' + cls, el);
}
export function splitWords(el, cls = 'w') {
  const words = el.textContent.trim().split(/\s+/); el.textContent = '';
  words.forEach((w, i) => { const s = document.createElement('span'); s.className = cls; s.textContent = w; el.appendChild(s); if (i < words.length - 1) el.appendChild(document.createTextNode(' ')); });
  return $$('.' + cls, el);
}

// ---------------------------------------------------------------------------
// SecondOrderDynamics — measured in lusion.co / 1105-ddd2024-homepage.lusion.co
//   k1 = z/(PI f), k2 = 1/(2PI f)^2, k3 = r z/(2PI f), robust stable coefficients.
//   Scroll uses f=3 (desktop) z=1 r=0.2; eased mouse uses f=1.35 z=0.5 r=1.25.
// ---------------------------------------------------------------------------
export class SOD {
  constructor(x0 = 0, f = 1.5, z = 0.8, r = 2) { this.setFZR(f, z, r); this.xp = x0; this.y = x0; this.yd = 0; }
  setFZR(f, z, r) {
    const w = 2 * Math.PI * f; this.f = f; this.w = w; this.z = z; this.r = r;
    this.d = w * Math.sqrt(Math.abs(z * z - 1));
    this.k1 = z / (Math.PI * f); this.k2 = 1 / (w * w); this.k3 = (r * z) / w;
  }
  reset(x) { this.xp = x; this.y = x; this.yd = 0; }
  update(T, x) {
    if (T <= 0) return this.y;
    const xd = (x - this.xp) / T; this.xp = x;
    let k1s, k2s;
    if (this.w * T < this.z) { k1s = this.k1; k2s = Math.max(this.k2, (T * T) / 2 + (T * this.k1) / 2, T * this.k1); }
    else {
      const t1 = Math.exp(-this.z * this.w * T);
      const a1 = 2 * t1 * (this.z <= 1 ? Math.cos(T * this.d) : Math.cosh(T * this.d));
      const b2 = t1 * t1; const t2 = T / (1 + b2 - a1);
      k1s = (1 - b2) * t2; k2s = T * t2;
    }
    this.y += T * this.yd;
    this.yd += (T * (x + this.k3 * xd - this.y - k1s * this.yd)) / k2s;
    return this.y;
  }
}

// ---------------------------------------------------------------------------
// VirtualScroll — Lusion-style ScrollPane: html overflow hidden, content translated.
// Wheel delta normalisation is the Lenis/VirtualScroll one (deltaMode 1 -> 100/6 px).
// Pins: <section data-pin> with a .pin child; the child is counter-translated so it stays.
// ---------------------------------------------------------------------------
export class VirtualScroll {
  constructor({ content, f = 3, z = 1, r = 0.2, indicator = null }) {
    this.content = content; this.target = 0; this.y = 0; this.max = 0; this.vel = 0;
    this.motion = new SOD(0, f, z, r); this.f = f; this.z = z; this.r = r;
    this.listeners = []; this.pins = []; this.indicator = indicator; this.lastInput = -1e9; this.indRatio = 0; this.locked = false;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const onWheel = (e) => {
      if (this.locked) return; e.preventDefault();
      const k = e.deltaMode === 1 ? 100 / 6 : e.deltaMode === 2 ? innerHeight : 1;
      this.scrollBy(e.deltaY * k);
    };
    addEventListener('wheel', onWheel, { passive: false });
    let ty = 0;
    addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchmove', (e) => { const y = e.touches[0].clientY; this.scrollBy((ty - y) * 2); ty = y; }, { passive: true });
    addEventListener('keydown', (e) => {
      const map = { ArrowDown: 100, ArrowUp: -100, PageDown: innerHeight * 0.9, PageUp: -innerHeight * 0.9, ' ': innerHeight * 0.9, Home: -1e9, End: 1e9 };
      if (map[e.key] !== undefined && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); this.scrollBy(map[e.key]); }
    });
    // native scroll can still be triggered (focus, find-in-page, scrollIntoView) — keep it at 0
    addEventListener('scroll', () => { if (scrollX || scrollY) scrollTo(0, 0); });
    this.resize(); addEventListener('resize', () => this.resize());
    new ResizeObserver(() => this.resize()).observe(content);
  }
  scrollBy(d) { this.target = clamp(this.target + d, 0, this.max); this.lastInput = performance.now(); }
  scrollTo(v, jump = false) {
    this.target = clamp(v, 0, this.max);
    // large jumps soften the spring exactly like Lusion: f * exp(-dist/total/800)
    const dist = Math.abs(this.target - this.y); const k = Math.exp(-dist / Math.max(1, this.max) / 800);
    this.motion.setFZR(this.f * k, lerp(1, this.z, k), lerp(1, this.r, k));
    if (jump) { this.motion.reset(this.target); this.y = this.target; }
  }
  resize() {
    this.vh = innerHeight; this.max = Math.max(0, this.content.scrollHeight - this.vh);
    this.pins = [...this.content.querySelectorAll('[data-pin]')].map((s) => ({ s, inner: s.querySelector(':scope > .pin'), top: s.offsetTop, h: s.offsetHeight }));
    this.target = clamp(this.target, 0, this.max);
  }
  on(fn) { this.listeners.push(fn); }
  update(dt) {
    const prev = this.y;
    this.y = this.motion.update(Math.min(dt, 1 / 20), this.target);
    if (Math.abs(this.y - this.target) < 0.05) this.motion.setFZR(this.f, this.z, this.r);
    this.vel = (this.y - prev) / Math.max(dt, 1e-4);
    this.content.style.transform = `translate3d(0,${-this.y.toFixed(2)}px,0)`;
    for (const p of this.pins) {
      const run = Math.max(1, p.h - this.vh); const local = clamp(this.y - p.top, 0, run);
      if (p.inner) p.inner.style.transform = `translate3d(0,${local.toFixed(2)}px,0)`;
      p.progress = local / run; p.visible = this.y + this.vh > p.top && this.y < p.top + p.h;
    }
    if (this.indicator) {
      // DDD: indicator visible while scrolling, fades 0.5s after last input (±2/s)
      const active = performance.now() - this.lastInput < 500 || Math.abs(this.vel) > 5;
      this.indRatio = clamp(this.indRatio + (active ? 2 : -2) * dt);
      const bar = this.indicator.firstElementChild; const ih = this.indicator.clientHeight;
      const sc = Math.max(1 / 10, this.vh / (this.max + this.vh)); const p = this.max ? this.y / this.max : 0;
      bar.style.transform = `translate3d(0,${(p * ih * (1 - sc)).toFixed(1)}px,0) scaleY(${sc.toFixed(4)})`;
      this.indicator.style.opacity = this.indRatio.toFixed(3);
    }
    for (const fn of this.listeners) fn(this.y, this);
  }
  pin(sec) { return this.pins.find((p) => p.s === sec) || { progress: 0, visible: false }; }
  // rect of an element in "page" coordinates (content space)
  top(el) { let t = 0; while (el && el !== this.content) { t += el.offsetTop; el = el.offsetParent; } return t; }
}

// ---------------------------------------------------------------------------
// Cursor — intframe.com: 6px dot follows instantly, 34px ring lerps 0.14 per frame,
// .big on [data-hover], .drag on draggable cores.
// ---------------------------------------------------------------------------
export function cursor({ hover = '[data-hover],a,button', drag = '[data-drag]' } = {}) {
  if (!matchMedia('(pointer:fine)').matches) return;
  const dot = document.createElement('div'); dot.className = 'cur-dot';
  const ring = document.createElement('div'); ring.className = 'cur-ring';
  document.body.append(dot, ring);
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; });
  const loop = () => { requestAnimationFrame(loop); if (Math.abs(x - rx) + Math.abs(y - ry) < 0.15) return; rx += (x - rx) * 0.14; ry += (y - ry) * 0.14; ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`; };
  loop();
  document.addEventListener('mouseover', (e) => { if (e.target.closest(hover)) ring.classList.add('big'); if (e.target.closest(drag)) ring.classList.add('drag'); });
  document.addEventListener('mouseout', (e) => { if (e.target.closest(hover)) ring.classList.remove('big'); if (e.target.closest(drag)) ring.classList.remove('drag'); });
}

// Film-grain overlay (intframe .noise: fixed 200% layer, offset -50%, stepped jitter)
export function grain(el, alpha = 0.06) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const d = g.createImageData(256, 256);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255 * alpha; }
  g.putImageData(d, 0, 0); el.style.backgroundImage = `url(${c.toDataURL()})`;
}

// Seoul clock (intframe footer #footClock)
export function clock(el) {
  const f = () => { el.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()) + ' KST'; };
  f(); setInterval(f, 1000);
}

// Preloader counter (intframe loader / lusion digits): resolves after assets + min time
export function preload({ urls = [], onProgress, min = 1400 }) {
  let done = 0; const total = urls.length || 1; const t0 = performance.now();
  return new Promise((res) => {
    const tick = () => { onProgress && onProgress(done / total); };
    const finish = () => { const wait = Math.max(0, min - (performance.now() - t0)); setTimeout(res, wait); };
    if (!urls.length) { onProgress && onProgress(1); return finish(); }
    urls.forEach((u) => {
      const ok = () => { done++; tick(); if (done === total) finish(); };
      if (/\.(mp4|webm)$/.test(u)) { const v = document.createElement('video'); v.muted = true; v.preload = 'auto'; v.src = u; v.addEventListener('canplaythrough', ok, { once: true }); v.addEventListener('error', ok, { once: true }); setTimeout(ok, 4000); }
      else { const i = new Image(); i.onload = i.onerror = ok; i.src = u; }
    });
  });
}

// Keep video playing (muted autoplay can be refused before first gesture)
export function ensurePlay(v) {
  v.muted = true; v.playsInline = true; const p = () => v.play().catch(() => {});
  p(); addEventListener('pointerdown', p, { once: true }); addEventListener('keydown', p, { once: true });
}

// Render text into a canvas and sample N points from the filled pixels (used for point portraits)
export function samplePoints(text, n, { font = '900 360px "Pretendard Variable", Pretendard, sans-serif', w = 900, h = 440, step = 3 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 10);
  const d = g.getImageData(0, 0, w, h).data; const pts = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) if (d[(y * w + x) * 4] > 128) pts.push([x / w - 0.5, 0.5 - y / h]);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = pts.length ? pts[(Math.random() * pts.length) | 0] : [Math.random() - 0.5, Math.random() - 0.5];
    out[i * 3] = p[0] * (w / h); out[i * 3 + 1] = p[1]; out[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
  }
  return out;
}
