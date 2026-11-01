// 02 SLOGAN — 공식 슬로건 “흐름 속에서, 나의 선택을 마주하다.” (LIMEN_현재기준 · 02 웹표현기준 5장)
// 참고 영상: claude-웹개발/슬로건텍스트다음 분위기전환으로 나올 텍스트 추가 인터렉션.mp4
//   ① 슬로건 두 줄이 가운데에서 글자별로 켜진다
//   ② 갈라지지 않고, 그 자리에서 블러되며 위로 스르륵 떠올라 사라진다 (COMBINE 요청)
//   ③ 단어 짝 목록이 아래에서 위로 흘러 지나간다 — 가운데 줄에 가까울수록 두 단어가 양옆으로 물결치듯 비켜난다
//      (06_index_v03 shift.js 와 같은 렌즈). 목록이 화면 위로 다 빠져나간 뒤 약 30vh 뒤에 SCENES 카드가 올라온다
//      — 카드 위로 목록이 겹쳐 내려오지 않게 (.film margin-top -40vh 와 짝)
// 단어 짝 = 피그마 단어 목록(content.js WORDS). 핵심 질문을 함께 쓸지는 팀 결정 전이라 공식 슬로건만.
import { $, $$, clamp, lerp, smooth as ss } from './_shared/js/core.js';
import { WORDS } from './_shared/js/content.js';

export function initSlogan() {
  const section = $('#slogan'), list = $('#sgPairs');
  const halves = [$('#sgL'), $('#sgR')], lbl = $('.sg-lbl', section);

  // 글자별 span (켜짐용)
  const chars = halves.flatMap((el) => {
    const t = el.textContent; el.textContent = '';
    return [...t].map((c) => { const s = document.createElement('span'); s.textContent = c; el.appendChild(s); return s; });
  });
  // 단어 짝 13줄 + 끝 줄
  for (let i = 0; i < WORDS.length; i += 2) list.insertAdjacentHTML('beforeend', `<li><span>${WORDS[i]}</span><i></i><span>${WORDS[i + 1] || ''}</span></li>`);
  list.insertAdjacentHTML('beforeend', '<li class="foot"><span>FLOW</span><i></i><span>CHOICE</span></li>');
  const rows = $$('li', list);

  let lastLit = -1;
  // 고정 구간 300vh 기준: 글자 켜짐 0~.12 · 퇴장 .14~.27 · 단어 짝 .2~.9 (다 빠져나감) · .9~1 = 카드가 올라오기 전 30vh
  function update(p) {
    const W = innerWidth, H = innerHeight, pad = Math.max(16, W * 0.0387);

    // ① 글자 켜짐
    const lit = Math.round(ss(0.01, 0.12, p) * chars.length);
    if (lit !== lastLit) { chars.forEach((c, i) => c.classList.toggle('on', i < lit)); lastLit = lit; }
    lbl.style.opacity = (1 - ss(0.12, 0.17, p)).toFixed(3);

    // ② 가운데 두 줄 → 블러되며 위로 떠올라 사라짐
    const S0 = clamp(W * 0.046, 34, 88);
    const k = ss(0.14, 0.27, p);
    halves.forEach((el, i) => {
      const y = H / 2 + (i ? 1 : -1) * S0 * 0.62 - k * H * 0.2;
      el.style.fontSize = S0.toFixed(1) + 'px';
      el.style.transform = `translate(${(W / 2).toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      el.style.opacity = (1 - k).toFixed(3);
      el.style.filter = k > 0.001 ? `blur(${(k * 14).toFixed(2)}px)` : '';
    });

    // ③ 단어 짝: 화면 아래에서 들어와 위로 완전히 빠져나간다 + 가운데 렌즈
    const lh = list.offsetHeight, q = clamp((p - 0.2) / 0.7);
    list.style.transform = `translate3d(0, ${lerp(H, -lh, q).toFixed(1)}px, 0)`;
    for (const li of rows) {
      const r = li.getBoundingClientRect();
      if (r.bottom < -40 || r.top > H + 40) continue;
      const d = Math.abs((r.top + r.height / 2) - H / 2) / H;
      let s = clamp(1 - d / 0.3); s = s * s * (3 - 2 * s);
      li.style.setProperty('--gap', `${(pad * 0.8 + s * W * 0.17).toFixed(1)}px`);
      li.style.setProperty('--a', (0.22 + 0.78 * s).toFixed(3));
    }
  }
  function sleep() {}
  return { section, update, sleep };
}
