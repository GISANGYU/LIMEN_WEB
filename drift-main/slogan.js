// 02 SLOGAN — 공식 슬로건 “흐름 속에서, 나의 선택을 마주하다.” (LIMEN_현재기준 · 02 웹표현기준 5장)
// 참고 영상: claude-웹개발/슬로건텍스트다음 분위기전환으로 나올 텍스트 추가 인터렉션.mp4
//   ① 슬로건 두 줄이 가운데에서 글자별로 켜진다
//   ② 두 줄이 갈라져 화면 양끝(가운데 높이)에 작게 고정되고, 그 사이로 단어 짝 목록이 아래에서 위로 흐른다
//      — 가운데 줄에 가까울수록 두 단어 사이가 벌어지는 렌즈 (06_index_v03 shift.js 와 같은 식)
//   ③ 목록이 다 지나가면 양끝 슬로건이 블러되며 위로 떠올라 사라진다 (바로 다음 SCENES 영상과 겹치지 않게 장면 영상은 뺐다)
// 단어 짝 = 피그마 단어 목록(content.js WORDS). 핵심 질문을 함께 쓸지는 팀 결정 전이라 공식 슬로건만.
import { $, $$, clamp, lerp, smooth as ss } from './_shared/js/core.js';
import { WORDS } from './_shared/js/content.js';

export function initSlogan() {
  const section = $('#slogan'), list = $('#sgPairs');
  const halves = [$('#sgL'), $('#sgR')], bar = $('#sgBar'), lbl = $('.sg-lbl', section);

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
  function update(p) {
    const W = innerWidth, H = innerHeight, pad = Math.max(16, W * 0.0387);

    // ① 글자 켜짐
    const lit = Math.round(ss(0.02, 0.14, p) * chars.length);
    if (lit !== lastLit) { chars.forEach((c, i) => c.classList.toggle('on', i < lit)); lastLit = lit; }
    lbl.style.opacity = (1 - ss(0.14, 0.2, p)).toFixed(3);

    // ② · ③ 슬로건 위치 · 크기: 가운데 두 줄 → 양끝 작게 → (목록이 끝나면) 블러되며 위로 떠오르고 사라짐
    const S0 = clamp(W * 0.046, 34, 88), S1 = 15;
    const k1 = ss(0.16, 0.28, p), k3 = ss(0.82, 0.96, p);
    const size = lerp(S0, S1, k1);
    // 좁은 화면: 양끝 가운데 높이에 두면 목록과 겹치므로 위(왼쪽) · 아래(오른쪽)로 나눈다
    const narrow = W < 720;
    halves.forEach((el, i) => {
      const dir = i ? 1 : -1;
      const yA = H / 2 + dir * S0 * 0.62;
      const yB = narrow ? (i ? H * 0.86 : H * 0.17) : H / 2;
      const x = lerp(W / 2, i ? W - pad : pad, k1);
      const al = lerp(0.5, i, k1);
      const y = lerp(yA, yB, k1) - k3 * H * 0.16;
      el.style.fontSize = size.toFixed(1) + 'px';
      el.style.fontWeight = k1 > 0.5 ? '500' : '200';
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${(-al * 100).toFixed(1)}%, -50%)`;
      el.style.opacity = (1 - k3).toFixed(3);
      el.style.filter = k3 > 0.001 ? `blur(${(k3 * 10).toFixed(2)}px)` : '';
    });

    // ② 단어 짝 목록: 아래에서 들어와 위로 흐른다 + 가운데 렌즈
    const lh = list.offsetHeight, q = ss(0.22, 0.82, p);
    const ly = lerp(H, -lh + H * 0.3, q) - k3 * H * 0.3;   // 끝 구간에서는 슬로건과 함께 위로 빠지며 사라진다
    list.style.transform = `translate3d(0, ${ly.toFixed(1)}px, 0)`;
    list.style.opacity = (1 - k3).toFixed(3);
    for (const li of rows) {
      const r = li.getBoundingClientRect();
      if (r.bottom < -40 || r.top > H + 40) continue;
      const d = Math.abs((r.top + r.height / 2) - H / 2) / H;
      let s = clamp(1 - d / 0.3); s = s * s * (3 - 2 * s);
      li.style.setProperty('--gap', `${(pad * 0.8 + s * W * 0.17).toFixed(1)}px`);
      li.style.setProperty('--a', (0.22 + 0.78 * s).toFixed(3));
    }

    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  }
  function sleep() {}
  return { section, update, sleep };
}
