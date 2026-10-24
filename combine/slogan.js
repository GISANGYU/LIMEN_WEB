// 02 SLOGAN — 공식 슬로건 “흐름 속에서, 나의 선택을 마주하다.” (LIMEN_현재기준 · 02 웹표현기준 5장)
//   ① 슬로건 두 줄이 가운데에서 글자별로 켜진다
//   ② 갈라지지 않고, 그 자리에서 블러되며 위로 스르륵 떠올라 사라진다 (COMBINE 요청)
//   ③ 고정이 풀리면 약 30vh 뒤 SCENES 카드가 아래에서 올라온다 (단어 짝 목록은 영상 위로 내려와 거슬려서 뺐다)
// 핵심 질문을 함께 쓸지는 팀 결정 전이라 공식 슬로건만.
import { $, clamp, smooth as ss } from './_shared/js/core.js';

export function initSlogan() {
  const section = $('#slogan');
  const halves = [$('#sgL'), $('#sgR')], lbl = $('.sg-lbl', section);

  // 글자별 span (켜짐용)
  const chars = halves.flatMap((el) => {
    const t = el.textContent; el.textContent = '';
    return [...t].map((c) => { const s = document.createElement('span'); s.textContent = c; el.appendChild(s); return s; });
  });

  let lastLit = -1;
  function update(p) {
    const W = innerWidth, H = innerHeight;

    // ① 글자 켜짐
    const lit = Math.round(ss(0.02, 0.32, p) * chars.length);
    if (lit !== lastLit) { chars.forEach((c, i) => c.classList.toggle('on', i < lit)); lastLit = lit; }
    lbl.style.opacity = (1 - ss(0.34, 0.44, p)).toFixed(3);

    // ② 가운데 두 줄 → 블러되며 위로 떠올라 사라짐. p .8 에 다 사라지고, SCENES 가 40vh 당겨 올라와 있어 p 1 쯤(= 30vh 뒤) 카드가 보인다
    const S0 = clamp(W * 0.046, 34, 88);
    const k = ss(0.42, 0.8, p);
    halves.forEach((el, i) => {
      const y = H / 2 + (i ? 1 : -1) * S0 * 0.62 - k * H * 0.2;
      el.style.fontSize = S0.toFixed(1) + 'px';
      el.style.transform = `translate(${(W / 2).toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      el.style.opacity = (1 - k).toFixed(3);
      el.style.filter = k > 0.001 ? `blur(${(k * 14).toFixed(2)}px)` : '';
    });
  }
  function sleep() {}
  return { section, update, sleep };
}
