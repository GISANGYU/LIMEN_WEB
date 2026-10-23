// C · DRIFT — composition
//  scroll   : Lenis as measured on monopo.london { lerp .1, smoothWheel, wheelMultiplier 1, autoRaf false → own rAF }
//             back-to-top: lenis.scrollTo(0, { duration 1.2, easeInOut })  (skarlo also lerp .1)
//  hero     : monopo gradient + skarlo liquify/blinds (gradient.js), monopo title/foot entrance
//  slogan   : 공식 슬로건 → 양끝으로 갈라짐 + 단어 짝 렌즈 → 장면이 차오름 (slogan.js, 사용자 참고 영상)
//  scenes   : greymac showreel — rounded card scale .4 → 1 from the bottom while pinned, inner video counter-scaled; link → overlay
//  member   : greymac rounded panel rising over the reel + dogstudio home-cases list — 100ms hover debounce → member video crossfade
//  space    : LIMEN_WEB ver1·ver2 blueprint — SVG drawing → three.js studio model → device hover (space.js · studio.js)
//  visit    : studio10b drag-to-explore (map3d.js)
//  footer   : helloshivam fluid (fluid.js, exact config)
import { $, $$, clamp, invLerp, ease } from './_shared/js/core.js';
import { MEMBERS, STEPS, INFO } from './_shared/js/content.js';
import { createGradient, PALETTES } from './gradient.js';
import { initSlogan } from './slogan.js';
import { initSpace } from './space.js';
import { createMap } from './map3d.js';
import { createFluid } from './fluid.js';

const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, easing: ease.expoOut, autoRaf: false });
window.__app = { lenis };
const easeInOut = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
$$('[data-goto]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); const id = a.dataset.goto;
  if (id === 'intro') lenis.scrollTo(0, { duration: 1.2, easing: easeInOut }); else lenis.scrollTo('#' + id, { duration: 1.6, easing: easeInOut });
}));

// ---------- hero title: wrap each line so it can rise out of its mask (monopo)
$$('.c-PixiIntro-title .ln').forEach((ln) => { ln.innerHTML = `<span class="in">${ln.innerHTML}</span>`; });
const grad = createGradient($('#grad'));
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

// ---------- slogan
const slogan = initSlogan();

// ---------- showreel overlay (dogstudio .showreel)
const reel = $('#showreel'), big = $('#reelBig');
$('#openReel').addEventListener('click', (e) => { e.preventDefault(); reel.classList.add('is-open'); lenis.stop(); big.currentTime = 0; big.play().catch(() => {}); });
$$('[data-close]', reel).forEach((el) => el.addEventListener('click', () => { reel.classList.remove('is-open'); big.pause(); lenis.start(); }));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && reel.classList.contains('is-open')) $('[data-close]', reel).click(); });

// ---------- member list (dogstudio)
// bg = member video (media/). 01~05: SNOOZE 앱 테스트 로그 원본(8주차/키넥트2대_테스트결과/원본_SNOOZE앱), 06·07: 가연back · 노은back
const THEME = [
  { pal: ['#16254b', '#23418a', '#aadfd9', '#e64f0f'], bg: 'm01_hyeongi.mp4' },   // 12_v68
  { pal: ['#0c2a3f', '#1d6f8c', '#9be7f0', '#f0b64a'], bg: 'm02_jeonghun.mp4' },  // 14_v18
  { pal: ['#1d1442', '#4a2fa8', '#c3b4ff', '#ff6a3d'], bg: 'm03_hyemin.mp4' },    // 13_v36
  { pal: ['#3a1d14', '#9A4D33', '#FEA900', '#9BC99B'], bg: 'm04_chaeyeon.mp4' },  // 10_v17
  { pal: ['#2b1630', '#8a2f5e', '#f6b0c8', '#ffd27a'], bg: 'm05_gisang.mp4' },    // 09_v15
  { pal: ['#132a22', '#2f7a5c', '#bfe9c9', '#ff7b4a'], bg: 'm06_gayeon.mp4' },
  { pal: ['#28203b', '#5e4b9a', '#e3d7ff', '#36d3c0'], bg: 'm07_noeun.mp4' },
];
// role shown on the right of each name — [직군, 세부 파트] (shared content.js 의 '영상팀/UI·UX팀' 대신 이 페이지에서만 덮어씀)
const ROLE = [
  ['3D Designer', 'VFX'],                          // 김현기
  ['3D Designer', 'Rendering & Compositing'],      // 배정훈
  ['3D Designer', '3D Modeling'],                  // 심혜민
  ['Project Manager', 'UX & Project Planning'],    // 이채연
  ['Creative Developer', 'Sensor Interaction · Web'], // 유기상
  ['Visual Designer', 'Web UI · Layout · Print'],  // 조가연
  ['Visual Designer', 'Web UI · Layout · Print'],  // 김노은
];
const cases = $('#cases'), themes = $('#themes');
MEMBERS.forEach((m, i) => {
  cases.insertAdjacentHTML('beforeend', `<li data-i="${i}"><a href="#team" data-hover><span class="nm">${m.name}</span><span class="en">${m.en}</span><span class="yr"><b>${ROLE[i][0]}</b><small>${ROLE[i][1]}</small></span></a></li>`);
  themes.insertAdjacentHTML('beforeend', `<div class="sc"><video src="media/${THEME[i].bg}" muted loop playsinline preload="metadata"></video></div>`);
});
const scenes = $$('.sc', themes), vids = scenes.map((s) => $('video', s)), team = $('#team'); let hoverT = 0, curTheme = -1;
const pauseT = [];
const setTheme = (i) => {
  if (i === curTheme) return; const prev = curTheme; curTheme = i;
  $$('li', cases).forEach((li, k) => li.classList.toggle('on', k === i));
  scenes.forEach((s, k) => { s.classList.toggle('is-visible', k === i); s.classList.toggle('has-delay', k === i && prev >= 0); });
  // only the visible member video runs; the others pause after their .8s fade-out
  vids.forEach((v, k) => {
    clearTimeout(pauseT[k]);
    if (k === i) v.play().catch(() => {}); else pauseT[k] = setTimeout(() => v.pause(), 1000);
  });
  team.style.backgroundColor = i < 0 ? '' : THEME[i].pal[0];
  document.body.dataset.theme = i < 0 ? 'night' : 'm' + i;
  grad.setPalette(i < 0 ? PALETTES.night : THEME[i].pal, 3);
};
$$('li', cases).forEach((li) => {
  li.addEventListener('mouseenter', () => { clearTimeout(hoverT); hoverT = setTimeout(() => setTheme(+li.dataset.i), 100); });
  li.addEventListener('click', (e) => { e.preventDefault(); setTheme(+li.dataset.i); });
});
cases.addEventListener('mouseleave', () => { clearTimeout(hoverT); hoverT = setTimeout(() => setTheme(-1), 100); });
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
$$('li', cases).forEach((li, k) => { li.style.transitionDelay = k * .06 + 's'; io.observe(li); });

// ---------- space (blueprint → model → hover)
const space = initSpace();

// ---------- visit
$('#vsteps').innerHTML = STEPS.map(([n, a, b]) => `<li><b>${n}</b><div><strong>${a}</strong><small>${b}</small></div></li>`).join('');
$('#vinfo').innerHTML = INFO.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
const vsteps = $$('#vsteps li');
const map = createMap($('#map3d'), $('#visit'));

// ---------- footer fluid
const fluid = createFluid($('#fluid')); window.__app.fluid = fluid;
new IntersectionObserver(([e]) => { fluid.active = e.isIntersecting; }, { threshold: 0 }).observe($('#footer'));

// ---------- section bookkeeping
const sec = (id) => $(id);
const S = { intro: sec('#intro'), slogan: sec('#slogan'), film: sec('#film'), team: sec('#team'), space: sec('#space'), visit: sec('#visit'), footer: sec('#footer') };
const rect = (el) => el.getBoundingClientRect();
const inView = (r) => r.bottom > 0 && r.top < innerHeight;
const lines = $$('.line-anim');
const reelCard = $('#reelCard'), reelMedia = $('#reelMedia'), reelUi = $('#reelUi'), reelVid = $('video', reelMedia);
const S0 = .4;   // greymac Showreel start scale

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  lenis.raf(now);
  const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); last = now; const vh = innerHeight;

  // gradient: full on hero, dims behind the pinned slogan, returns for scenes / team, off under opaque sections
  const rI = rect(S.intro), rF = rect(S.slogan), rT = rect(S.team), rFi = rect(S.film), rS = rect(S.space);
  const heroK = clamp(1 - (-rI.top) / vh * .6);
  const teamK = inView(rFi) || inView(rT) ? .55 : 0;
  const sloK = inView(rF) ? .32 : 0;
  grad.dim = Math.max(heroK, teamK, sloK * (1 - heroK) + heroK);
  grad.scroll = lenis.scroll / vh;
  grad.visible = rS.top > 0 || inView(rI) || inView(rF) || inView(rT);
  grad.update(t, dt);

  // slogan timeline
  if (inView(rF)) {
    slogan.update(clamp(-rF.top / (rF.height - vh)));
  } else slogan.sleep();
  // greymac showreel: grows while the film section enters and pins (top: vh → -.8vh), panel covers it during top: -vh → -2vh
  if (inView(rFi)) {
    const p = ease.cubicOut(clamp(invLerp(vh, -vh * .8, rFi.top)));
    const s = S0 + (1 - S0) * p, rad = 50 * (1 - p * .2);
    reelCard.style.transform = `translateY(${((1 - p) * 8).toFixed(2)}vh) scale(${s.toFixed(4)})`;
    reelCard.style.borderRadius = `${(rad / s).toFixed(1)}px ${(rad / s).toFixed(1)}px ${(50 * (1 - p) / s).toFixed(1)}px ${(50 * (1 - p) / s).toFixed(1)}px`;
    reelMedia.style.transform = `scale(${(1 / s).toFixed(4)})`;   // window opens on a video that keeps its size (greymac inner 2.5 → 1)
    const u = clamp(invLerp(.7, 1, p)), cover = clamp(invLerp(-vh, -vh * 2, rFi.top));
    reelUi.style.opacity = (u * (1 - cover)).toFixed(3); reelUi.style.transform = `translateY(${((1 - u) * 30).toFixed(1)}px)`;
    reelCard.style.filter = cover > 0 ? `brightness(${(1 - cover * .6).toFixed(3)})` : '';
    if (reelVid.paused) reelVid.play().catch(() => {});
  } else if (!reelVid.paused) reelVid.pause();

  // dogstudio 45° lines: red line-anim draws with scroll
  lines.forEach((l) => { const r = rect(l.parentElement); const k = clamp(invLerp(vh, vh * .2, r.top)); l.style.width = (k * 100).toFixed(1) + '%'; });

  // space
  if (inView(rS)) space.update(clamp(-rS.top / (rS.height - vh))); else space.sleep();

  // visit
  const rV = rect(S.visit);
  if (inView(rV)) {
    const p = clamp(invLerp(vh * .9, -vh * .1, rV.top));
    map.update(t, p);
    const k = Math.min(3, Math.floor(p * 4)); vsteps.forEach((li, i) => li.classList.toggle('on', i <= k && p > .02));
  }
  fluid.update(dt);
}
requestAnimationFrame(frame);
