// LIMEN INDEX v03 — 피그마 배치 + 레퍼런스 인터랙션. 스크롤(Lenis) · 포인터 · 커서 · 글자 섞임 · 단어 등장 · 섹션 루프
// 각 섹션 모듈은 { section, update(progress) } 를 돌려주고, 화면에 보일 때만 update 가 불린다.
import { $, $$, clamp, progressOf, visible, pointer, splitWords } from './util.js';
import { initHero } from './hero.js';
import { initShift } from './shift.js';
import { initSections } from './sections.js';
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
  e.preventDefault();
  const id = a.getAttribute('href'); if (id.length > 1) lenis.scrollTo(id, { duration: 2.2 });
}));

/* ---------- 포인터 · 커서 ---------- */
const cursor = $('#cursor');
let lastMove = performance.now(), cx = innerWidth / 2, cy = innerHeight / 2;
addEventListener('pointermove', (e) => {
  const now = performance.now(), dt = Math.max(1, now - lastMove) / 1000;
  pointer.vx = (e.clientX - pointer.x) / dt; pointer.vy = (e.clientY - pointer.y) / dt;
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = true; lastMove = now;
});
document.addEventListener('pointerover', (e) => { if (e.target.closest('[data-hover], a, .frag')) cursor.classList.add('big'); });
document.addEventListener('pointerout', (e) => { if (e.target.closest('[data-hover], a, .frag')) cursor.classList.remove('big'); });

/* ---------- 글자 섞임(scramble) — uncommon 링크 호버와 같은 방식 ---------- */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*+/<>_';
function scramble(el, dur = 450) {
  if (el.__scr) return;
  const nodes = []; const walk = (n) => { for (const c of n.childNodes) c.nodeType === 3 ? nodes.push(c) : walk(c); }; walk(el);
  const orig = nodes.map((n) => n.textContent);
  const t0 = performance.now(); el.__scr = true;
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / dur);
    nodes.forEach((n, j) => {
      const o = orig[j], keep = Math.floor(o.length * k);
      n.textContent = [...o].map((ch, i) => (i < keep || /[\s·&.,—\-/↗↑↓]/.test(ch) || /[가-힣]/.test(ch)) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]).join('');
    });
    if (k < 1) requestAnimationFrame(tick); else { nodes.forEach((n, j) => (n.textContent = orig[j])); el.__scr = false; }
  };
  tick();
}
window.__scramble = scramble;
$$('[data-scramble]').forEach((el) => el.addEventListener('mouseenter', () => scramble(el)));

/* ---------- 단어 단위 스크롤 등장 (greymac) — 흐림 없이, 스크롤만큼 단어가 켜지고 되감으면 꺼진다 ---------- */
$$('[data-words-intro]').forEach((el) => splitWords(el));
const wordBlocks = $$('[data-words]').map((el) => ({ el, words: splitWords(el) }));
function updateWords() {
  for (const b of wordBlocks) {
    const r = b.el.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight) continue;
    const k = clamp((innerHeight * 0.9 - r.top) / (innerHeight * 0.38)) * b.words.length;
    b.words.forEach((w, i) => w.classList.toggle('on', k > i));
  }
}

/* ---------- 섹션 ---------- */
const parts = [initHero(), initShift(), initSections(), initMember(), initSpace($('#reelVideo')), initVisit(), initFooter()];

/* ---------- 상단 메뉴: 지금 보이는 구간에 밑줄 ---------- */
const navMap = [['slogan', 0], ['scenes', 1], ['member', 2], ['space', 3], ['visit', 4]];
const navLinks = $$('.hd-nav a');
function updateNav() {
  let cur = -1;
  for (const [id, i] of navMap) { const r = document.getElementById(id).getBoundingClientRect(); if (r.top < innerHeight * 0.5 && r.bottom > innerHeight * 0.5) cur = i; }
  navLinks.forEach((a, i) => a.classList.toggle('on', i === cur));
}

/* ---------- 루프 ---------- */
function frame() {
  requestAnimationFrame(frame);
  if (performance.now() - lastMove > 60) { pointer.vx *= 0.85; pointer.vy *= 0.85; }
  cx += (pointer.x - cx) * 0.22; cy += (pointer.y - cy) * 0.22;
  cursor.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`;
  for (const part of parts) if (visible(part.section, 40)) part.update(progressOf(part.section));
  updateWords();
  updateNav();
}
requestAnimationFrame(frame);
addEventListener('resize', () => ScrollTrigger.refresh());
window.__limen = { parts, lenis, pointer };
