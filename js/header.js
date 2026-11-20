// 헤더 숨김/드롭 (11-21) — INDEX · AWAKE 공통
//  아래로 스크롤하면 위로 올라가 숨고(is-hd-hidden), 위로 스크롤하면 다시 내려온다.
//  두 페이지의 부드러운 스크롤(smooth.js · Lenis)은 모두 실제 window 스크롤을 움직이므로 scroll 이벤트만 보면 된다.
(() => {
  const root = document.documentElement;
  const DOWN = 14, UP = 6;                 // 방향이 이만큼(px) 이어져야 바꿈 — 손떨림·스프링 끝자락 무시
  const nearTop = () => scrollY < Math.max(80, innerHeight * .12);   // 맨 위 근처에선 항상 보임
  let lastY = scrollY, run = 0;
  addEventListener('scroll', () => {
    const y = scrollY, d = y - lastY; lastY = y;
    if (nearTop()) { root.classList.remove('is-hd-hidden'); run = 0; return; }
    if (!d || root.classList.contains('is-profile')) return;
    if ((d > 0) !== (run > 0)) run = 0;    // 방향이 바뀌면 처음부터 다시 셈
    run += d;
    if (run > DOWN) root.classList.add('is-hd-hidden');
    else if (run < -UP) root.classList.remove('is-hd-hidden');
  }, { passive: true });
})();
