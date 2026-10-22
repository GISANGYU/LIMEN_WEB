// 피그마 중간 구간들의 스크롤 연출 — 흐림 · 페이드 없이 마스크 · 시차 · 선 긋기로.
// · 01 INFLUENCE: 이미지가 아래에서 위로 걷히며 열리고, 안의 사진은 느리게 따라온다
// · FLOW / AWARENESS / CHOICE: 세 줄이 스크롤에 따라 서로 반대로 미끄러진다
// · 바라보던 흐름 안으로: 가로선이 왼쪽부터 그어진다
// · SCENES: 제목 글자가 마스크에서 솟고, 조각 이미지들이 서로 다른 속도로 떠서 깊이가 생긴다
import { $, $$, clamp, ss } from './util.js';

export function initSections() {
  const inf = $('#influence'), infImg = $('.inf-img', inf), infPic = $('img', infImg);
  const enter = $('#enter'), faw = $$('#faw span'), rule = $('[data-rule]');
  const scenes = $('#scenes'), frags = $$('.frag', scenes), title = $('.sc-title', scenes);

  // 제목 글자 나누기 (마스크용)
  const chars = [...title.textContent].map((c) => { const o = document.createElement('span'); o.className = 'ch'; o.style.overflow = 'hidden'; o.style.verticalAlign = 'top'; const b = document.createElement('b'); b.textContent = c; b.style.display = 'inline-block'; b.style.fontWeight = '400'; o.appendChild(b); return o; });
  title.textContent = ''; chars.forEach((c) => title.appendChild(c));
  gsap.set(chars.map((c) => c.firstChild), { yPercent: 110 });
  let titleShown = false;

  function update() {
    const H = innerHeight, W = innerWidth;
    // 01 INFLUENCE
    const ir = infImg.getBoundingClientRect();
    const open = ss(H * 0.95, H * 0.35, ir.top);
    infImg.style.clipPath = `inset(${((1 - open) * 100).toFixed(2)}% 0 0 0)`;
    infPic.style.transform = `translateY(${(-(1 - clamp((ir.top + ir.height) / (H + ir.height))) * 15).toFixed(2)}%) scale(${(1.12 - open * 0.12).toFixed(3)})`;
    // FAW 미끄러짐
    const er = enter.getBoundingClientRect();
    const p = clamp((H - er.top) / (H + er.height));
    faw.forEach((s, i) => { s.style.transform = `translateX(${(((p - 0.35) * (i === 1 ? -1 : 1)) * W * 0.08).toFixed(1)}px)`; });
    rule.style.transform = `scaleX(${ss(H * 0.85, H * 0.45, rule.getBoundingClientRect().top).toFixed(3)})`;
    // SCENES
    const sr = scenes.getBoundingClientRect();
    if (!titleShown && sr.top < H * 0.7) { titleShown = true; gsap.to(chars.map((c) => c.firstChild), { yPercent: 0, duration: 1.1, stagger: 0.025, ease: 'expo.out' }); }
    const mid = sr.top + sr.height / 2 - H / 2;
    frags.forEach((f) => { f.style.transform = `translateY(${(mid * parseFloat(f.dataset.speed)).toFixed(1)}px)`; });
  }
  const section = { getBoundingClientRect: () => { const a = inf.getBoundingClientRect(), b = scenes.getBoundingClientRect(); return { top: a.top, bottom: b.bottom, height: b.bottom - a.top }; } };
  return { section, update };
}
