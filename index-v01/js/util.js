// 공용 도구 — 섹션 모듈들이 같이 쓴다
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ss = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 스티키 섹션의 진행도 0~1 (섹션 위끝이 화면 위에 닿을 때 0, 아래끝이 화면 아래에 닿을 때 1)
export function progressOf(el) {
  const r = el.getBoundingClientRect(), total = r.height - innerHeight;
  return total > 0 ? clamp(-r.top / total) : clamp(-r.top / innerHeight);
}
// 화면에 조금이라도 보이는지 (여유 margin px)
export function visible(el, margin = 0) {
  const r = el.getBoundingClientRect();
  return r.bottom > -margin && r.top < innerHeight + margin;
}

// 전역 포인터 — 화면 좌표 + 속도. main.js 가 갱신한다
export const pointer = { x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, down: false, moved: false };

// 영상이 자동재생을 막히면 첫 상호작용 때 다시 시도
export function ensurePlay(video) {
  const tryPlay = () => video.play().catch(() => {});
  tryPlay();
  const once = () => { tryPlay(); removeEventListener('pointerdown', once); removeEventListener('wheel', once); };
  addEventListener('pointerdown', once); addEventListener('wheel', once, { passive: true });
}
