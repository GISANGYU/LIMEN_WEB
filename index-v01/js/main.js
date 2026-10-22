// LIMEN INDEX v01 — 스크롤(Lenis) · 포인터 · 커서 · 진행 표시 · 섹션 루프
// 각 섹션 모듈은 { section, update(progress) } 를 돌려주고, 화면에 보일 때만 update 가 불린다.
import { $, $$, progressOf, visible, pointer } from './util.js';
import { initHero } from './hero.js';
import { initSlogan } from './slogan.js';
import { initMember } from './member.js';
import { initSpace } from './space.js';
import { initVisit } from './visit.js';
import { initFooter } from './footer.js';

history.scrollRestoration = 'manual';
scrollTo(0, 0);

/* ---------- 부드러운 스크롤 ---------- */
gsap.registerPlugin(ScrollTrigger);
const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
window.__lenis = lenis;
$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href'); if (id.length < 2) { e.preventDefault(); return; }
  e.preventDefault(); lenis.scrollTo(id, { duration: 2.2 });
}));

/* ---------- 포인터 · 커서 ---------- */
const cursor = $('#cursor');
let lastMove = performance.now(), cx = innerWidth / 2, cy = innerHeight / 2;
addEventListener('pointermove', (e) => {
  const now = performance.now(), dt = Math.max(1, now - lastMove) / 1000;
  pointer.vx = (e.clientX - pointer.x) / dt; pointer.vy = (e.clientY - pointer.y) / dt;
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = true; lastMove = now;
});
document.addEventListener('pointerover', (e) => { if (e.target.closest('[data-hover], a')) cursor.classList.add('big'); });
document.addEventListener('pointerout', (e) => { if (e.target.closest('[data-hover], a')) cursor.classList.remove('big'); });

/* ---------- 섹션 ---------- */
const reelVideo = $('#reelVideo');
const parts = [initHero(), initSlogan(), initMember(), initSpace(reelVideo), initVisit(), initFooter()];

/* ---------- 왼쪽 진행 표시 ---------- */
const rail = $('#rail'), railItems = $$('#rail li');
railItems.forEach((li) => li.addEventListener('click', () => lenis.scrollTo('#' + li.dataset.to, { duration: 2.2 })));
function updateRail() {
  let cur = 0;
  railItems.forEach((li, i) => { const r = document.getElementById(li.dataset.to).getBoundingClientRect(); if (r.top < innerHeight * 0.5) cur = i; });
  railItems.forEach((li, i) => li.classList.toggle('on', i === cur));
  const atFooter = $('#footer').getBoundingClientRect().top < innerHeight * 0.6;
  rail.classList.toggle('dim', atFooter);
  document.body.classList.toggle('at-footer', atFooter);
}

/* ---------- 루프 ---------- */
function frame() {
  requestAnimationFrame(frame);
  // 포인터 속도는 멈추면 0 으로 감쇠
  if (performance.now() - lastMove > 60) { pointer.vx *= 0.85; pointer.vy *= 0.85; }
  cx += (pointer.x - cx) * 0.22; cy += (pointer.y - cy) * 0.22;
  cursor.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
  for (const part of parts) if (visible(part.section, 40)) part.update(progressOf(part.section));
  updateRail();
}
requestAnimationFrame(frame);
addEventListener('resize', () => ScrollTrigger.refresh());
window.__limen = { parts, lenis, pointer };
