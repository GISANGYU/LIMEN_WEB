// LIMEN ARCHIVE — SNOOZE 앱 기록(LIMEN_WEB/test-logs/data/test-logs.json · 2026-10-18 확인) + 한국어(archive/ko.json)
//  intro   : INDEX 와 같은 그라디언트 히어로. 갤러리를 처음 움직이면 걷히고, 처음 자리로 돌아오면 다시 덮인다
//  gallery : test-logs 의 흐물거리는 무한 갤러리 (아래에서 올라와 → 위에서 뒤로 말리며 접히고 → 물결) — archive/gallery.js
//  hud     : 지금 화면 가운데 기록의 번호 · 제목 · 날짜, 오른쪽 날짜 레일로 바로 이동
//  detail  : 카드를 누르면 그 카드가 커져 대표 화면이 되고 한국어 기록이 열린다 (#log/날짜 로 바로 열기)
import { $, clamp } from './_shared/js/core.js';
import { createGradient } from './gradient.js';
import { Gallery } from './archive/gallery.js';
import { EntryDetail } from './archive/entry-detail.js';
import { loadImageUrl } from './archive/textures.js';

const BASE = document.body.dataset.archiveBase;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
// 움직임 값 — test-logs 의 'reference · Waves and folds' 그대로, 색 번짐만 조금 줄임 (웹 모션 조절값 · 전시 수치 아님)
const PRESET = { depth: 1200, dip: 0.95, wave: 12, speed: 1.0, chroma: 0.7, smoothing: 0.055, bendStart: 0.17, touch: 1, parallax: 1, scrollGain: 0.35 };
const STILL = { depth: 0, dip: 0, wave: 0, speed: 0, chroma: 0, smoothing: 1, bendStart: 0.12, touch: 0, parallax: 0, scrollGain: 0.35 };
const settings = { ...(reducedMotion.matches ? STILL : PRESET), single: false, pause: false, wire: false };
reducedMotion.addEventListener('change', (e) => Object.assign(settings, e.matches ? STILL : PRESET));

const fail = (msg) => { const el = $('#error'); el.hidden = false; el.textContent = msg; };
const kDate = (d) => d.replaceAll('-', '.');
const kNum = (n) => String(n).padStart(2, '0');

// 히어로 — INDEX 와 같이 줄마다 마스크 안에서 떠오른다
document.querySelectorAll('.c-PixiIntro-title .ln').forEach((ln) => { ln.innerHTML = `<span class="in">${ln.innerHTML}</span>`; });
const gradEl = $('#grad'), grad = createGradient(gradEl);
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-ready')));

let gallery, entries;
try {
  const [raw, ko] = await Promise.all([
    fetch(BASE + 'data/test-logs.json').then((r) => { if (!r.ok) throw Error('data'); return r.json(); }),
    fetch('archive/ko.json').then((r) => r.json()),
  ]);
  // 오래된 기록부터 — 스크롤해 내려갈수록 시간이 앞으로 간다
  entries = raw.entries.slice().sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({
    ...e,
    poster: BASE + e.poster,
    video: e.video && BASE + e.video,
    media: e.media.map((m) => ({ ...m, image: m.image && BASE + m.image, video: m.video && BASE + m.video })),
    ko: { ...ko.entries[e.id], place: ko.places[e.place] || e.place },
  }));
  await Promise.all(['300 18px "Pretendard Variable"', '400 13px "Pretendard Variable"', '800 11px "Pretendard Variable"'].map((f) => document.fonts.load(f).catch(() => {})));
  const assets = await Promise.all(entries.map((e) => loadImageUrl(e.poster)));
  gallery = new Gallery($('#stage'), settings);
  gallery.setItems(entries, assets);
  const detail = new EntryDetail(gallery, entries, reducedMotion);
  requestAnimationFrame(() => detail.openFromHash());
  $('#stage').addEventListener('webglcontextlost', (e) => { e.preventDefault(); fail('그래픽 연결이 끊겼습니다. 새로고침해 주세요.'); });
} catch (e) {
  console.error(e);
  fail('기록을 불러오지 못했습니다. 로컬 서버로 열었는지, test-logs 폴더가 함께 있는지 확인해 주세요. WebGL 이 필요합니다.');
}

// ---------- HUD · 날짜 레일
const total = entries?.length || 0;
$('#nowTotal').textContent = kNum(total); $('#pillCount').textContent = `${total} Sessions`;
const rail = $('#rail');
if (entries) rail.innerHTML = entries.map((e, i) => `<li><button type="button" data-i="${i}" aria-label="${kDate(e.date)} ${e.ko.title}">${kDate(e.date).slice(5)}<i></i></button></li>`).join('');
const railBtns = [...rail.querySelectorAll('button')];
// 레일에서 고르면 그 기록이 화면 가운데로 흘러온다 (같은 기록이 여러 줄에 반복되므로 가장 가까운 것)
railBtns.forEach((b) => b.addEventListener('click', () => {
  const i = +b.dataset.i;
  const near = gallery.items.filter((it) => it.index === i).sort((a, c) => Math.abs(a.art.position.y - FOCUS()) - Math.abs(c.art.position.y - FOCUS()))[0];
  if (near) gallery.scroll.target += FOCUS() - near.art.position.y;
}));
const FOCUS = () => -innerHeight * .06;   // 기준선: 화면 가운데보다 살짝 아래 (위쪽은 카드가 접히는 자리)
let shown = -1;
function hud() {
  let best = null, bd = Infinity;
  for (const it of gallery.items) {
    if (!it.art.visible) continue;
    const d = Math.abs(it.art.position.y - FOCUS());
    if (d < bd) { bd = d; best = it; }
  }
  if (!best || best.index === shown) return;
  shown = best.index; const e = entries[shown];
  $('#nowNo').textContent = kNum(shown + 1);
  $('#nowTitle').textContent = e.ko.title;
  $('#nowMeta').textContent = `${kDate(e.date)} · ${e.ko.place}`;
  railBtns.forEach((b, i) => b.classList.toggle('on', i === shown));
}

// ---------- 매 프레임
const intro = $('#intro');
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (!gallery) return;
  const t = now / 1000, dt = Math.min(.05, (now - last) / 1000); last = now;
  try { gallery.frame(now); } catch (e) { console.error(e); fail('화면을 그리지 못했습니다. 새로고침하거나 다른 브라우저로 열어 주세요.'); return; }
  // 히어로 — 갤러리를 화면 높이의 1/4 남짓 움직이면 다 걷힌다
  const k = clamp(1 - gallery.scroll.current / (innerHeight * .28));
  intro.style.opacity = k.toFixed(3);
  intro.classList.toggle('is-gone', k <= 0);
  grad.visible = k > 0;
  if (grad.visible) { grad.dim = 1; grad.scroll = (1 - k) * .4; grad.update(t, dt); }
  hud();
}
requestAnimationFrame(frame);
document.addEventListener('visibilitychange', () => { last = performance.now(); if (gallery) gallery.last = performance.now(); });
