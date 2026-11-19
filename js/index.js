// LIMEN INDEX (전시용) — 스크롤 엔진 하나로 모든 구간을 돌린다.
//  · 부드러운 스크롤: smooth.js (임계 감쇠 스프링 = 이즈인아웃, 링크 이동은 easeInOutCubic)
//  · [data-par]   : 틀은 제자리, 안쪽 이미지만 스크롤보다 늦게 따라옴 (odysseeclinic.com.au 식)
//  · [data-drift] : 고정 배경 요소가 스크롤의 일부만큼만 움직임
//  · [data-reveal]: 화면에 들어오면 줄 단위로 마스크 밖에서 올라옴 (아래로 빠지면 되돌아가 다시 등장)
//  · 02 질문: 스티키 동안 왼쪽부터 글자 채움 / 03 기획 의도: 오른쪽 글 스티키, 사진이 글 높이에 닿으면 함께 올라감
//  · 04 키워드: 고정 무대, 글자별 블러+translateY ±50% 로 FLOW → AWARENESS → CHOICE, 왼쪽 이미지 블러 교차
//  · 07 SPACE: 기존 INDEX 의 space-layered.js 를 그대로 (진행도만 여기서 넘김)
import { initSpace } from './space-layered.js?v=1120b';
import { createFooterFilm } from './footer-film.js?v=1120b';
import { Smooth } from './smooth.js?v=1120b';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// ───────── scroll
const lenis = new Smooth({ stiffness: 5.2, wheelMultiplier: 1.1 });
window.__app = { lenis };
$$('[data-goto]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); closeProfile();
  const id = a.dataset.goto;
  if (id === 'top') lenis.scrollTo(0, { duration: 1.4, easing: easeInOut });
  else lenis.scrollTo('#' + id, { duration: 1.6, easing: easeInOut });
}));
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

// ───────── 글자 나누기 도우미 — <br> 은 줄바꿈으로 남기고 나머지는 글자 span
function splitChars(el, cls = 'ch') {
  const parts = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = '';
  const out = [];
  parts.forEach((part, i) => {
    const tmp = document.createElement('div'); tmp.innerHTML = part;
    [...tmp.textContent].forEach((c) => {
      const s = document.createElement('span'); s.className = cls; s.textContent = c === ' ' ? ' ' : c;
      el.appendChild(s); out.push(s);
    });
    if (i < parts.length - 1) el.appendChild(document.createElement('br'));
  });
  return out;
}

// ───────── 줄 단위 등장
$$('[data-reveal]').forEach((el) => {
  const lines = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = lines.map((l, i) => `<span class="rl" style="--i:${i}"><span>${l.trim() || '&nbsp;'}</span></span>`).join('');
});
const revealIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) e.target.classList.add('is-in');
    else if (e.boundingClientRect.top > 0) e.target.classList.remove('is-in');   // 화면 아래로 빠질 때만 되돌림
  }
}, { rootMargin: '0px 0px -10% 0px' });
$$('[data-reveal]').forEach((el) => revealIO.observe(el));

// ───────── 시차 이미지 · 떠다니는 배경
const pars = $$('[data-par]').map((el) => ({ el, img: el.querySelector('img, video'), k: parseFloat(el.dataset.par) || .2 }));
// [data-sweep]: 사진을 틀 높이의 n 배로 길게 두고, 틀이 화면 아래에서 들어와 위로 나갈 때까지 위 → 아래를 훑는다
const sweeps = $$('[data-sweep]').map((el) => ({ el, img: el.querySelector('img'), n: parseFloat(el.dataset.sweep) || 1.8 }));
sweeps.forEach((s) => { s.img.style.height = (s.n * 100) + '%'; s.img.style.bottom = 'auto'; });
const lags = $$('[data-lag]').map((el) => ({ el, k: parseFloat(el.dataset.lag) || .2 }));
const drifts = $$('[data-drift]').map((el) => ({ el, k: parseFloat(el.dataset.drift) || .2 }));
const PAR_BOOST = 2;   // 11-19 사용자 요청: 고정 이미지 움직임을 기존의 2배로
function updateParallax(vh) {
  for (const p of pars) {
    const r = p.el.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) continue;
    // 틀 가운데가 화면 가운데에서 얼마나 떨어졌나 → 이미지는 그 거리의 k 만큼 반대로 밀려 '늦게' 따라온다
    const off = (r.top + r.height / 2) - vh / 2;
    // 확대는 1.22 배까지만 — 그 안에서 밀 수 있는 만큼만 밀어 가장자리가 비지 않게
    const k = p.k * PAR_BOOST;
    const s = Math.min(1.5, 1 + (vh + r.height) * k / r.height + .02);
    const room = (s - 1) * r.height / 2;
    const shift = clamp(-off * k, -room, room);
    p.img.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0) scale(${s.toFixed(4)})`;
  }
  for (const s of sweeps) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) continue;
    const t = clamp((vh - r.top) / (vh + r.height));
    s.img.style.transform = `translate3d(0, ${(-t * (s.n - 1) * r.height).toFixed(1)}px, 0)`;
  }
  const y = lenis.scroll;
  // 히어로 이미지: 틀째로 스크롤의 k 만큼 늦게 올라감 (처음 화면은 피그마 배치 그대로)
  for (const l of lags) if (y < vh * 1.6) l.el.style.translate = `0 ${(y * l.k * PAR_BOOST).toFixed(1)}px`;
  for (const d of drifts) {
    if (d.el.classList.contains('q-atmo')) continue;   // 질문 안개는 질문 구간 진행도로 따로 움직임
    d.el.style.transform = `translate3d(0, ${(-y * d.k * PAR_BOOST).toFixed(1)}px, 0)`;
  }
}

// ───────── 02 질문 — 스티키 구간 동안 왼쪽부터 글자 채움
const qSec = $('#question'), qChars = splitChars($('#qText')), qAtmo = $('.q-atmo');
let qLit = -1;
function updateQuestion(vh) {
  const r = qSec.getBoundingClientRect();
  if (r.bottom < 0 || r.top > vh) return;
  const p = clamp(-r.top / (r.height - vh));
  const lit = Math.round(ss(0.04, 0.72, p) * qChars.length);
  if (lit !== qLit) { qChars.forEach((c, i) => c.classList.toggle('on', i < lit)); qLit = lit; }
  qAtmo.style.transform = `translate3d(${(p * -4).toFixed(2)}%, ${((p - .5) * -10).toFixed(2)}%, 0) scale(${(1 + p * .08).toFixed(3)})`;
}

// ───────── 03 기획 의도 — 오른쪽 글 트랙 높이 = 사진 시작 위치 + 글 높이 → 사진 위 끝이 글 위 끝에 닿는 순간 스티키가 풀린다
const cSec = $('#concept'), cTrack = $('#cTrack'), cText = $('#cText'), cImg = $('#cImg');
function layoutConcept() {
  const narrow = innerWidth <= 820;
  const stickTop = narrow ? 90 : Math.round(innerHeight * 0.22);
  cSec.style.setProperty('--stick-top', stickTop + 'px');
  const imgTop = cImg.getBoundingClientRect().top - cTrack.getBoundingClientRect().top;   // 트랙 위 끝 기준 사진 위치
  cTrack.style.setProperty('--track-h', (imgTop + cText.offsetHeight) + 'px');
}

// ───────── 04 키워드 — 고정 무대, 글자별 블러 · translateY ±50%
const kSec = $('#keys'), kItems = $$('.k-item', kSec), kImgs = $$('.k-img', kSec), kDots = $$('#kDots li');
const kChars = kItems.map((it) => ({ title: splitChars($('.k-title', it)), sub: splitChars($('.k-sub', it)) }));
const FIRST_IN = -0.05;   // 11-20: 첫 단어 등장 시작(무대가 붙기 약 230px 전)
const N = kItems.length, CUT = [1 / 3, 2 / 3], W = 0.11;   // 11-20: 0.075 → 0.11 + 구간 460 → 520vh → 글자 퇴장·등장 각각 스크롤 약 290 → 500px(1920×1080)
function charState(chars, v, dir, stagger) {
  // v: 0 → 1 진행, 글자 j 는 j/n*stagger 만큼 늦게 출발 → 타다다닥
  const n = chars.length;
  for (let j = 0; j < n; j++) {
    const t = clamp(v * (1 + stagger) - (j / Math.max(1, n - 1)) * stagger);
    const e = t * t * (3 - 2 * t);
    let y, b, o;
    if (dir < 0) { y = -50 * e; b = 12 * e; o = 1 - e; }        // 퇴장: 위로 -50%
    else { y = 50 * (1 - e); b = 12 * (1 - e); o = e; }         // 등장: 아래 +50% 에서
    const c = chars[j];
    c.style.transform = y ? `translate3d(0, ${y.toFixed(1)}%, 0)` : '';
    c.style.filter = b > .05 ? `blur(${b.toFixed(2)}px)` : '';
    c.style.opacity = o.toFixed(3);
  }
}
function updateKeys(vh) {
  const r = kSec.getBoundingClientRect();
  if (r.bottom < 0 || r.top > vh) return;
  const pr = -r.top / (r.height - vh), p = clamp(pr);   // pr: 무대가 붙기 전에는 음수
  let active = 0;
  for (let i = 0; i < N; i++) {
    const cIn = i ? CUT[i - 1] : null, cOut = i < N - 1 ? CUT[i] : null;
    // 첫 단어(FLOW)도 무대가 화면에 붙는 즈음(FIRST_IN) 같은 방식으로 등장, 나머지는 앞 글이 다 빠진 뒤 등장
    const vin = cIn === null ? clamp((pr - FIRST_IN) / W) : clamp((p - cIn) / W);
    const vout = cOut === null ? 0 : clamp((p - (cOut - W)) / W);   // 전환 지점 직전에 퇴장
    const k = kChars[i];
    if (vout > 0) { charState(k.title, vout, -1, 1.1); charState(k.sub, clamp(vout * 1.15), -1, 1.4); }
    else { charState(k.title, vin, 1, 1.1); charState(k.sub, clamp(vin * 1.15 - .1), 1, 1.4); }
    kItems[i].style.visibility = (vin <= 0 || vout >= 1) ? 'hidden' : '';
    if (vin > .5 && vout < .5) active = i;
    // 이미지: 나갈 땐 블러가 걷히지 않고 커지며 흐려지고, 들어올 땐 블러 0 으로
    const imIn = cIn === null ? ss(FIRST_IN - W * .6, FIRST_IN + W, pr) : ss(cIn - W, cIn + W * .6, p);
    const imOut = cOut === null ? 0 : ss(cOut - W, cOut + W * .6, p);
    const vis = imIn * (1 - imOut);
    const blur = (1 - imIn) * 22 + imOut * 22;
    kImgs[i].style.opacity = vis.toFixed(3);
    kImgs[i].style.filter = blur > .05 ? `blur(${blur.toFixed(2)}px)` : '';
    kImgs[i].style.transform = `scale(${(1.06 - .06 * imIn + .04 * imOut).toFixed(4)}) translate3d(0, ${((p - .5) * -3).toFixed(2)}%, 0)`;
  }
  kDots.forEach((d, i) => d.classList.toggle('on', i === active));
}

// ───────── 06 관객 경험 영상 — 기존 INDEX 쇼릴(greymac): 구간 위끝이 화면 아래(vh) → −0.8vh 로 가는 동안 카드 .4 → 1
const expFilm = $('#expFilm'), expCard = $('#expCard'), expMedia = $('#expMedia'), expVid = $('video', expMedia), expUi = $('#expUi');
const cubicOut = (t) => 1 - Math.pow(1 - t, 3);
function updateExpFilm(vh) {
  const r = expFilm.getBoundingClientRect();
  if (r.bottom < 0 || r.top > vh) { if (!expVid.paused) expVid.pause(); return; }
  const p = cubicOut(clamp((vh * 0.75 - r.top) / (vh * 1.35)));   // 위끝 0.75vh → −0.6vh
  const s = 0.4 + 0.6 * p, rad = 50 * (1 - p);   // 다 차면 네 모서리 모두 0 — 화면에 꽉 차게
  expCard.style.transform = `translateY(${((1 - p) * 8).toFixed(2)}vh) scale(${s.toFixed(4)})`;
  const rT = (rad / s).toFixed(1), rB = (50 * (1 - p) / s).toFixed(1);
  expCard.style.borderRadius = `${rT}px ${rT}px ${rB}px ${rB}px`;
  expCard.style.clipPath = `inset(0 round ${rT}px ${rT}px ${rB}px ${rB}px)`;   // 영상 층이 둥근 모서리를 무시하지 못하게
  expMedia.style.transform = `scale(${(1 / s).toFixed(4)})`;                    // 창은 커지고 영상은 제 크기 그대로
  const u = clamp((p - 0.7) / 0.3);   // 거의 다 찼을 때 좌하단 제목이 올라옴
  expUi.style.opacity = u.toFixed(3); expUi.style.transform = `translateY(${((1 - u) * 30).toFixed(1)}px)`;
  if (expVid.paused) expVid.play().catch(() => {});
}

// 큰 영상 (기존 INDEX .showreel)
const reel = $('#showreel'), reelBig = $('#reelBig');
$('#openReel').addEventListener('click', (e) => { e.preventDefault(); reel.classList.add('is-open'); reel.setAttribute('aria-hidden', 'false'); lenis.stop(); reelBig.currentTime = 0; reelBig.play().catch(() => {}); });
function closeReel() { if (!reel.classList.contains('is-open')) return; reel.classList.remove('is-open'); reel.setAttribute('aria-hidden', 'true'); reelBig.pause(); lenis.start(); }
$$('[data-close]', reel).forEach((el) => el.addEventListener('click', closeReel));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeReel(); });

// ───────── 07 SPACE (기존 그대로)
const space = initSpace();
const spSec = $('#space');

// ───────── 09 푸터 필름 (기존 그대로)
const footerFilm = createFooterFilm($('#footerFilm'));
new IntersectionObserver(([e]) => { footerFilm.active = e.isIntersecting; }, { threshold: 0 }).observe($('#footerFilm'));

// ───────── 프로필 층 (햄버거 → 위에서 내려옴)
const TEAM = [
  ['유기상', 'YU GI SANG', '개발'], ['김현기', 'KIM HYUN GI', '영상'], ['배정훈', 'BAE JUNG HUN', '영상'],
  ['심혜민', 'SHIM HAE MIN', '영상'], ['김노은', 'KIM NO HEUN', 'UI · UX'], ['조가연', 'CHO GA YEON', 'UI · UX'], ['이채연', 'LEE CHAE YEON', '기획'],
];
$('#pfGrid').innerHTML = TEAM.map(([ko, en, role], i) => `
  <li class="pf-card" style="--i:${i}">
    <div class="pf-ph"><img src="assets/figma-1102/portrait-${i}.png" alt="${ko}" loading="lazy" /><b>${String(i + 1).padStart(2, '0')}</b></div>
    <p class="pf-name">${ko}</p><p class="pf-en">${en}</p><p class="pf-role">${role}</p>
  </li>`).join('');
const root = document.documentElement, profile = $('#profile'), burger = $('#burger');
function openProfile() {
  root.classList.add('is-profile'); profile.removeAttribute('inert'); profile.setAttribute('aria-hidden', 'false');
  burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', '팀 프로필 닫기'); lenis.stop();
}
function closeProfile() {
  if (!root.classList.contains('is-profile')) return;
  root.classList.remove('is-profile'); profile.setAttribute('inert', ''); profile.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', '팀 프로필 열기'); lenis.start();
}
burger.addEventListener('click', () => (root.classList.contains('is-profile') ? closeProfile() : openProfile()));
$$('[data-open-profile]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); openProfile(); }));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProfile(); });

// ───────── 프레임 루프
function onResize() { layoutConcept(); }
addEventListener('resize', onResize, { passive: true });
addEventListener('load', onResize);
document.fonts?.ready.then(onResize);
onResize();

function frame(now) {
  requestAnimationFrame(frame);
  lenis.raf(now);
  if (document.hidden) return;
  const vh = innerHeight;
  root.classList.toggle('is-scrolled', lenis.scroll > vh * .6);
  updateParallax(vh);
  updateQuestion(vh);
  updateKeys(vh);
  updateExpFilm(vh);
  const rS = spSec.getBoundingClientRect();
  if (rS.bottom > 0 && rS.top < vh) space.update(clamp(-rS.top / (rS.height - vh))); else space.sleep();
}
requestAnimationFrame(frame);
