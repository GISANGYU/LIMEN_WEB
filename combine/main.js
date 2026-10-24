// LIMEN COMBINE — 08_drift_main(Claude) 바탕 + GPT drift_round_01 의 VISIT · FOOTER + LIMEN 팀 소개
//  scroll   : Lenis as measured on monopo.london { lerp .1, smoothWheel, wheelMultiplier 1, autoRaf false → own rAF }
//             back-to-top: lenis.scrollTo(0, { duration 1.2, easeInOut })  (skarlo also lerp .1)
//  hero     : monopo gradient + skarlo liquify/blinds (gradient.js), monopo title/foot entrance
//  slogan   : 공식 슬로건 → 블러되며 위로 사라짐 → 단어 짝 렌즈 (slogan.js, 사용자 참고 영상)
//  scenes   : greymac showreel — rounded card scale .4 → 1 from the bottom while pinned, inner video counter-scaled; link → overlay
//  space    : greymac rounded panel rising over the reel + LIMEN_WEB ver1·ver2 blueprint → model → 장비 차례 포커스 (space.js · studio.js)
//  team     : LIMEN\dist 팀 소개 <limen-team> (team/team.js — index.html 에서 따로 불러옴)
//  visit    : GPT drift_round_01 — 캠퍼스 도면 → 동선 → 8층 (visit-plan.js)
//  footer   : GPT drift_round_01 — UNCOMMON 레퍼런스 필름 푸터 (footer-film.js)
import { $, $$, clamp, invLerp, ease } from './_shared/js/core.js';
import { createGradient } from './gradient.js';
import { initSlogan } from './slogan.js';
import { initSpace } from './space.js';
import { createVisit } from './visit-plan.js';
import { createFooterFilm } from './footer-film.js';

const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, easing: ease.expoOut, autoRaf: false });
window.__app = { lenis };
const easeInOut = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
$$('[data-goto]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); const id = a.dataset.goto;
  if (id === 'intro') lenis.scrollTo(0, { duration: 1.2, easing: easeInOut }); else lenis.scrollTo('#' + id, { duration: 1.6, easing: easeInOut });
}));

// ---------- hero title: wrap each line so it can rise out of its mask (monopo)
$$('.c-PixiIntro-title .ln').forEach((ln) => { ln.innerHTML = `<span class="in">${ln.innerHTML}</span>`; });
const gradEl = $('#grad'), grad = createGradient(gradEl);
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

// ---------- slogan
const slogan = initSlogan();

// ---------- showreel overlay (dogstudio .showreel)
const reel = $('#showreel'), big = $('#reelBig');
$('#openReel').addEventListener('click', (e) => { e.preventDefault(); reel.classList.add('is-open'); lenis.stop(); big.currentTime = 0; big.play().catch(() => {}); });
$$('[data-close]', reel).forEach((el) => el.addEventListener('click', () => { reel.classList.remove('is-open'); big.pause(); lenis.start(); }));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && reel.classList.contains('is-open')) $('[data-close]', reel).click(); });

// ---------- space (blueprint → model → hover)
const space = initSpace();

// ---------- team (LIMEN) — 프로필을 열면 team 쪽이 <html> overflow 를 hidden 으로 바꾼다 → 그동안 Lenis 도 멈춘다
new MutationObserver(() => { if (document.documentElement.style.overflow === 'hidden') lenis.stop(); else lenis.start(); })
  .observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

// ---------- visit (GPT) — 스크롤로 캠퍼스 도면 → 동선 → 8층
const visit = createVisit($('#visit'));

// ---------- footer (GPT) — 보일 때만 레퍼런스 필름 재생
const footerFilm = createFooterFilm($('#footerFilm'));
new IntersectionObserver(([e]) => { footerFilm.active = e.isIntersecting; }, { threshold: 0 }).observe($('#footerFilm'));

// ---------- section bookkeeping
const sec = (id) => $(id);
const S = { intro: sec('#intro'), slogan: sec('#slogan'), film: sec('#film'), space: sec('#space'), visit: sec('#visit') };
const rect = (el) => el.getBoundingClientRect();
const inView = (r) => r.bottom > 0 && r.top < innerHeight;
const reelCard = $('#reelCard'), reelMedia = $('#reelMedia'), reelUi = $('#reelUi'), reelDim = $('#reelDim'), reelVid = $('video', reelMedia);
const S0 = .4;   // greymac Showreel start scale

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  lenis.raf(now);
  const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); last = now; const vh = innerHeight;

  // gradient: full on hero, dims behind the pinned slogan, hidden from the scenes section on (the card sits on a dark ground)
  const rI = rect(S.intro), rF = rect(S.slogan), rFi = rect(S.film), rS = rect(S.space);
  const heroK = clamp(1 - (-rI.top) / vh * .6);
  const sloK = inView(rF) ? .32 : 0;
  grad.dim = Math.max(heroK, sloK * (1 - heroK) + heroK);
  grad.scroll = lenis.scroll / vh;
  grad.visible = inView(rI) || inView(rF);
  // 슬로건이 화면을 떠나는 동안 서서히 꺼지고, 그 뒤엔 숨긴다 — 멈춘 마지막 장면이 영상 카드 뒤에 잔상으로 남지 않게
  gradEl.style.visibility = grad.visible ? '' : 'hidden';
  gradEl.style.opacity = inView(rI) ? '1' : clamp(rF.bottom / vh).toFixed(3);
  grad.update(t, dt);

  // slogan timeline
  if (inView(rF)) {
    slogan.update(clamp(-rF.top / (rF.height - vh)));
  } else slogan.sleep();
  // greymac showreel: grows while the film section enters and pins (top: vh → -.8vh), the SPACE panel covers it during top: -vh → -2vh
  if (inView(rFi)) {
    const p = ease.cubicOut(clamp(invLerp(vh, -vh * .8, rFi.top)));
    const s = S0 + (1 - S0) * p, rad = 50 * (1 - p * .2);
    reelCard.style.transform = `translateY(${((1 - p) * 8).toFixed(2)}vh) scale(${s.toFixed(4)})`;
    const rT = (rad / s).toFixed(1), rB = (50 * (1 - p) / s).toFixed(1);
    reelCard.style.borderRadius = `${rT}px ${rT}px ${rB}px ${rB}px`;
    reelCard.style.clipPath = `inset(0 round ${rT}px ${rT}px ${rB}px ${rB}px)`;   // 둥근 잘라내기를 한 번 더 — 영상 층이 모서리를 무시하지 못하게
    reelMedia.style.transform = `scale(${(1 / s).toFixed(4)})`;   // window opens on a video that keeps its size (greymac inner 2.5 → 1)
    const u = clamp(invLerp(.7, 1, p)), cover = clamp(invLerp(-vh, -vh * 2, rFi.top));
    reelUi.style.opacity = (u * (1 - cover)).toFixed(3); reelUi.style.transform = `translateY(${((1 - u) * 30).toFixed(1)}px)`;
    reelDim.style.opacity = (cover * .6).toFixed(3);
    if (reelVid.paused) reelVid.play().catch(() => {});
  } else if (!reelVid.paused) reelVid.pause();

  // space
  if (inView(rS)) space.update(clamp(-rS.top / (rS.height - vh))); else space.sleep();

  // visit
  const rV = rect(S.visit);
  if (inView(rV)) visit.update(clamp(-rV.top / (rV.height - vh)));
}
requestAnimationFrame(frame);
