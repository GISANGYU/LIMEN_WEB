// LIMEN 서브페이지(ABOUT · TECHNOLOGY · ARCHIVE) 공통 — INDEX(main.js) 와 같은 Lenis · 그라디언트 · 히어로 등장 · 줄 마스크 · 단어 켜짐 · 푸터 필름
import { $, $$, clamp, ease, reduced } from './_shared/js/core.js';
import { createGradient } from './gradient.js';
import { createFooterFilm } from './footer-film.js';

export function initSub({ hero = '#top', close = null } = {}) {
  const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, easing: ease.expoOut, autoRaf: false });
  window.__app = { lenis };
  const easeInOut = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  $$('[data-goto]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); lenis.scrollTo(0, { duration: 1.2, easing: easeInOut }); }));

  // 히어로 — 줄마다 마스크 안에서 떠오른다
  $$('.c-PixiIntro-title .ln').forEach((ln) => { ln.innerHTML = `<span class="in">${ln.innerHTML}</span>`; });
  const gradEl = $('#grad'), grad = createGradient(gradEl);
  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

  // 제목 줄 나누기 (<br> 단위) · 단어 켜짐 제목
  $$('.split').forEach((h) => {
    h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map((l, i) => `<span class="ln" style="--i:${i}"><span class="in">${l.trim()}</span></span>`).join('');
  });
  const reading = $$('.reading');
  reading.forEach((h) => {
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map((l) => l.trim().split(/\s+/).map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(' ')).join('<br>');
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: .15, rootMargin: '0px 0px -8% 0px' });
  $$('.rv, .split').forEach((n) => io.observe(n));

  // 푸터 필름 (INDEX 와 같음)
  const film = $('#footerFilm');
  if (film) { const f = createFooterFilm(film); new IntersectionObserver(([e]) => { f.active = e.isIntersecting; }, { threshold: 0 }).observe(film); }

  const heroEl = $(hero), closeEl = close && $(close);
  return {
    lenis,
    // 매 프레임: 그라디언트(히어로에서 꽉 찼다가 꺼지고, 마지막 구간에서 다시 차오름) + 단어 켜짐
    frame(t, dt) {
      const vh = innerHeight, rH = heroEl.getBoundingClientRect();
      const heroK = clamp(1 - (-rH.top) / vh * .9);
      let closeK = 0;
      if (closeEl) { const rC = closeEl.getBoundingClientRect(); closeK = clamp((vh - rC.top) / (vh * .9)) * clamp(rC.bottom / (vh * .6)); }
      const gk = Math.max(heroK, closeK * .9);
      grad.visible = gk > .01;
      gradEl.style.visibility = grad.visible ? '' : 'hidden';
      gradEl.style.opacity = gk.toFixed(3);
      grad.dim = Math.max(.35, gk);
      // 마지막 구간에선 히어로와 같은 구도로 돌아온다 (스크롤 이동량을 되돌림)
      grad.scroll = heroK > 0 ? lenis.scroll / vh : (1 - closeK) * .5;
      grad.update(t, dt);
      reading.forEach((h) => {
        const r = h.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
        const k = reduced ? 1 : clamp((vh * .85 - r.top) / (vh * .4)), ws = h.querySelectorAll('.w');
        ws.forEach((w, i) => w.classList.toggle('on', k > i / ws.length));
      });
    },
  };
}
