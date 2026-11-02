// 11-02: 푸터 슬로건(흐름 속에서, / 나의 선택을 / 마주하다.) — 스크롤로 한 줄씩 화면에 들어오면 0.5초 동안 블러가 걷히며 밝아진다.
// 다시 위로 올려 줄이 화면 아래로 빠지면 원래대로 돌아가, 내려올 때마다 다시 등장한다. (스타일: figma-update.css)
(() => {
  const lines = document.querySelectorAll('#footerSlogan > span');
  if (!lines.length || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('footer-reveal-ready');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) e.target.classList.add('is-in');
      else if (e.boundingClientRect.top > 0) e.target.classList.remove('is-in');   // 화면 아래로 빠질 때만 되돌림
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  lines.forEach((l) => io.observe(l));
})();
