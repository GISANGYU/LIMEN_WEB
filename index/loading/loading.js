// 00 LOADING — INDEX 에 들어오면 /loading/ver2/ 를 위에 띄운다.
//  ver2: 성운 로딩(빛 줄기가 사방에서 한 점으로 빨려 듦) → 100% → SNOOZE 밀어서 잠금해제 → 중심으로 전진 · 페이드.
//  ?stay 로 열어 ver2 가 스스로 페이지를 옮기지 않게 하고, 잠금해제 신호(postMessage 'limen:unlock')를 받으면
//  ver2 화면이 검게 덮인 뒤(전진 3.6초) 이 레이어를 걷어 INDEX 를 드러낸다.
//  실제 로딩 연결: ver2 를 ?stay&wait 로 열고 LIMEN_LOADING.setProgress(0~1) · LIMEN_LOADING.done() 을 부르면 그 진행을 따른다.
//  ?noload = 로딩 건너뛰기 (개발용)
(() => {
  const params = new URLSearchParams(location.search);
  const root = document.getElementById('ld');
  if (!root) return;
  if (params.has('noload')) { root.remove(); return; }

  const SRC = '../loading/ver2/index.html?stay';
  const DIVE_MS = 3900;   // ver2: 잠금해제 0.2초 뒤부터 3.6초 전진, 끝날 즈음 화면이 검게 덮인다

  // 스크롤 잠금: Lenis(main.js)보다 먼저 휠 · 터치 · 키를 막는다
  document.documentElement.classList.add('ld-lock');
  const block = (e) => {
    if (e.type === 'keydown' && !['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault(); e.stopImmediatePropagation();
  };
  const evs = ['wheel', 'touchmove', 'keydown'];
  evs.forEach((t) => window.addEventListener(t, block, { capture: true, passive: false }));

  const frame = root.querySelector('iframe');
  frame.src = SRC;
  const ver2 = () => frame.contentWindow && frame.contentWindow.LIMEN;

  let out = false;
  function enter() {
    if (out) return; out = true;
    window.scrollTo(0, 0);
    root.classList.add('is-out');
    setTimeout(() => {
      evs.forEach((t) => window.removeEventListener(t, block, { capture: true }));
      document.documentElement.classList.remove('ld-lock');
      root.remove();
      window.dispatchEvent(new CustomEvent('limen:enter'));
    }, 1300);
  }
  window.addEventListener('message', (e) => {
    if (e.source !== frame.contentWindow || !e.data) return;
    if (e.data.type === 'limen:unlock') setTimeout(enter, DIVE_MS);
  });

  window.LIMEN_LOADING = {
    setProgress: (p) => ver2() && ver2().setProgress(p),
    done: () => ver2() && ver2().done(),
    enter,
  };
})();
