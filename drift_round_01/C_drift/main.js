// C · DRIFT — composition
//  scroll   : Lenis as measured on monopo.london { lerp .1, smoothWheel, wheelMultiplier 1, autoRaf false → own rAF }
//             back-to-top: lenis.scrollTo(0, { duration 1.2, easeInOut })  (skarlo also lerp .1)
//  hero     : monopo gradient + skarlo liquify/blinds (gradient.js), monopo title/foot entrance
//  slogan   : continuous hero light / local refraction / complete sentence
//  scenes   : Greymac observed sticky/scale/rounded-panel structure; LIMEN scroll timeline below.
//  member   : original C_drift list + lazy, muted video backgrounds and gradient crossfade.
//  space    : measured studio geometry / scroll construction (space-plan.js)
//  visit    : campus SVG construction / route tracing / 8F elevation (visit-plan.js)
//  footer   : original UNCOMMON Studio reference film, no pointer effects (footer-film.js)
import { $, $$, clamp, invLerp, ease } from '../_shared/js/core.js';
import { MEMBERS } from '../_shared/js/content.js';
import { createGradient } from './gradient.js?v=flow-1';
import { createSloganFlow } from './slogan-flow.js';
import { createSpace } from './space-plan.js';
import { createVisit } from './visit-plan.js';
import { createFooterFilm } from './footer-film.js';
import { MEMBER_MEDIA } from './member-media.js';

const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, easing: ease.expoOut, autoRaf: false });
window.__app = { lenis };
const easeInOut = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
// Remove data-page-pending and aria-disabled when each subpage is implemented.
$$('[data-page-pending]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));
$$('[data-goto]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); const id = a.dataset.goto;
  if (id === 'intro') lenis.scrollTo(0, { duration: 1.2, easing: easeInOut }); else lenis.scrollTo('#' + id, { duration: 1.6, easing: easeInOut });
}));

// ---------- hero title: wrap each line so it can rise out of its mask (monopo)
$$('.c-PixiIntro-title .ln').forEach((ln) => { ln.innerHTML = `<span class="in">${ln.innerHTML}</span>`; });
const grad = createGradient($('#grad'));
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

// ---------- full-sentence slogan, sharing the hero WebGL field
const slogan = createSloganFlow($('#slogan'));

// ---------- expanding inline film and optional full player
const reel = $('#showreel'), big = $('#reelBig'), inline = $('#reelInline');
const surface = $('#reelSurface'), pauseButton = $('#pauseReel');
let filmInView = false, filmCovered = false, manuallyPaused = false;
function syncFilm() {
  if (filmInView && !filmCovered && !manuallyPaused && !document.hidden && !reel.classList.contains('is-open')) inline.play().catch(() => {});
  else inline.pause();
}
new IntersectionObserver(([e]) => { filmInView = e.isIntersecting; syncFilm(); }, {threshold: 0}).observe($('.film-pin'));
pauseButton.addEventListener('click', () => {
  manuallyPaused = !manuallyPaused;
  pauseButton.textContent = manuallyPaused ? '▶' : 'Ⅱ';
  pauseButton.setAttribute('aria-label', manuallyPaused ? '배경 영상 재생' : '배경 영상 일시정지');
  syncFilm();
});
$('#openReel').addEventListener('click', () => {
  reel.inert = false; reel.setAttribute('aria-hidden', 'false'); reel.classList.add('is-open');
  lenis.stop(); inline.pause(); big.currentTime = inline.currentTime;
  big.play().catch(() => {}); $('.showreel-close').focus();
});
function closeReel() {
  big.pause(); reel.classList.remove('is-open'); $('#openReel').focus();
  reel.inert = true; reel.setAttribute('aria-hidden', 'true'); lenis.start(); syncFilm();
}
$$('[data-close]', reel).forEach(el => el.addEventListener('click', closeReel));
addEventListener('keydown', e => {
  if (!reel.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeReel();
  if (e.key === 'Tab') {
    const focusables = [big, $('.showreel-close')];
    if (e.shiftKey && document.activeElement === big) { e.preventDefault(); focusables[1].focus(); }
    else if (!e.shiftKey && document.activeElement === focusables[1]) { e.preventDefault(); big.focus(); }
  }
});

// ---------- member list (dogstudio)
const THEME = [
  { pal: ['#16254b', '#23418a', '#aadfd9', '#e64f0f'], bg: 'fragment_1.jpg' },
  { pal: ['#0c2a3f', '#1d6f8c', '#9be7f0', '#f0b64a'], bg: 'fragment_2.jpg' },
  { pal: ['#1d1442', '#4a2fa8', '#c3b4ff', '#ff6a3d'], bg: 'fragment_3.jpg' },
  { pal: ['#3a1d14', '#9A4D33', '#FEA900', '#9BC99B'], bg: 'fragment_4.jpg' },   // monopo second gradient
  { pal: ['#2b1630', '#8a2f5e', '#f6b0c8', '#ffd27a'], bg: 'fragment_5.jpg' },
  { pal: ['#132a22', '#2f7a5c', '#bfe9c9', '#ff7b4a'], bg: 'mood_aurora.jpg' },
  { pal: ['#28203b', '#5e4b9a', '#e3d7ff', '#36d3c0'], bg: 'mood_band.jpg' },
];
const cases = $('#cases'), themes = $('#themes');
const teamGrad = createGradient($('#teamGrad'));
MEMBERS.forEach((m, i) => {
  const media = MEMBER_MEDIA[m.name];
  cases.insertAdjacentHTML('beforeend', `<li data-i="${i}"><a href="#team" data-hover aria-label="${m.name} ${m.ko} 배경 영상"><span class="nm">${m.name}</span><span class="en">${m.en}</span><span class="yr">${m.ko}</span></a></li>`);
  themes.insertAdjacentHTML('beforeend', `<div class="sc"><video data-src="${media.src}" muted loop playsinline preload="none" style="object-position:${media.position || '50% 50%'}"></video></div>`);
});
const scenes = $$('.sc', themes), videos = $$('.sc video', themes);
let hoverT = 0, curTheme = -1, teamInView = false;
let pauseTimers = videos.map(() => 0);
function playMember(i) {
  const v = videos[i];
  if (!v || !teamInView || document.hidden) return;
  clearTimeout(pauseTimers[i]);
  if (!v.getAttribute('src')) { v.src = v.dataset.src; v.muted = true; }
  v.play().catch(() => {});
}
function setTheme(i) {
  if (i === curTheme) { playMember(i); return; }
  curTheme = i;
  $$('li', cases).forEach((li, k) => {
    li.classList.toggle('on', k === i);
    li.querySelector('a').setAttribute('aria-current', k === i ? 'true' : 'false');
  });
  scenes.forEach((s, k) => {
    s.classList.toggle('is-visible', k === i);
    clearTimeout(pauseTimers[k]);
    if (k !== i) pauseTimers[k] = setTimeout(() => videos[k].pause(), 850);
  });
  playMember(i);
  teamGrad.setPalette(THEME[i].pal, 1.8);
}
$$('li', cases).forEach(li => {
  li.addEventListener('mouseenter', () => { clearTimeout(hoverT); hoverT = setTimeout(() => setTheme(+li.dataset.i), 80); });
  li.addEventListener('focusin', () => { clearTimeout(hoverT); setTheme(+li.dataset.i); });
  li.addEventListener('click', e => { e.preventDefault(); clearTimeout(hoverT); setTheme(+li.dataset.i); });
});
cases.addEventListener('mouseleave', () => clearTimeout(hoverT));
new IntersectionObserver(([e]) => {
  teamInView = e.isIntersecting;
  if (teamInView) setTheme(curTheme < 0 ? 0 : curTheme);
  else { clearTimeout(hoverT); videos.forEach(v => v.pause()); }
}, {threshold: 0}).observe($('#team'));
document.addEventListener('visibilitychange', () => {
  syncFilm();
  if (document.hidden) videos.forEach(v => v.pause());
  else playMember(curTheme);
});
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .2 });
$$('li', cases).forEach((li, k) => { li.style.transitionDelay = k * .06 + 's'; io.observe(li); });

// ---------- measured SVG studio, constructed by scroll
const space = createSpace($('#space'));

// ---------- scroll-drawn campus and vertical wayfinding
const visit = createVisit($('#visit'));

// ---------- original reference film, muted loop while visible
const footerFilm = createFooterFilm($('#footerFilm'));
new IntersectionObserver(([e]) => { footerFilm.active = e.isIntersecting; }, { threshold: 0 }).observe($('#footerFilm'));

// ---------- section bookkeeping
const sec = (id) => $(id);
const S = { intro: sec('#intro'), slogan: sec('#slogan'), film: sec('#film'), team: sec('#team'), space: sec('#space'), visit: sec('#visit'), footer: sec('#footer') };
const rect = (el) => el.getBoundingClientRect();
const inView = (r) => r.bottom > 0 && r.top < innerHeight;
const lines = $$('.line-anim');

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  lenis.raf(now);
  const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); last = now; const vh = innerHeight;

  // One continuous field: hero → narrow light → navy stillness.
  const rI = rect(S.intro), rF = rect(S.slogan), rT = rect(S.team), rFi = rect(S.film), rS = rect(S.space);
  const passage = slogan.update(rF, vh);
  grad.passage = passage;
  grad.dim = 1;
  grad.scroll = Math.min(lenis.scroll / vh, 1.6);
  grad.visible = rF.bottom > 0;
  $('#grad').style.opacity = grad.visible ? '1' : '0';
  grad.update(t, dt);

  // Film grows from 60% to full width; the next rounded panel covers it.
  // 24vh heading; video rises through the last 60vh of the slogan.
  const filmP = clamp((vh * .55 - (rFi.top + vh * .24)) / (vh * 1.35));
  const filmScale = .6 + .4 * filmP;
  surface.style.transform = `scale(${filmScale.toFixed(5)})`;
  surface.style.borderRadius = `${(50 / filmScale).toFixed(2)}px ${(50 / filmScale).toFixed(2)}px 0 0`;
  const covered = rS.top <= 0;
  if (covered !== filmCovered) { filmCovered = covered; syncFilm(); }
  teamGrad.visible = inView(rT);
  if (teamGrad.visible) { teamGrad.dim = .65; teamGrad.scroll = lenis.scroll / vh; teamGrad.update(t, dt); }

  // dogstudio 45° lines: red line-anim draws with scroll
  lines.forEach((l) => { const r = rect(l.parentElement); const k = clamp(invLerp(vh, vh * .2, r.top)); l.style.width = (k * 100).toFixed(1) + '%'; });

  // space
  if (inView(rS)) space.update(t, clamp(-rS.top / (rS.height - vh)));
  else space.setActive(false);

  // visit
  const rV = rect(S.visit);
  if (inView(rV)) {
    visit.update(clamp(-rV.top / (rV.height - vh)));
  }
}
requestAnimationFrame(frame);
