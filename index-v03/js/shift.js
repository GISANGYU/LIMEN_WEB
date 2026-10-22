// 분위기 전환 — 피그마 단어쌍 목록 + FLOW · AWARENESS · CHOICE 카드.
// 1) 참고 영상(슬로건텍스트다음 분위기전환…mp4): 화면 가운데에 가까운 줄일수록 좌우로 벌어지는 렌즈, 양끝 라벨은 화면에 고정.
// 2) greymac.com: 좁은 둥근 영상 카드가 아래에서 올라와 → 넓어지고 → 화면을 꽉 채워 머문다.
// 3) 카드가 화면을 덮을수록 라벨이 자라 피그마 카드 위 자리(FLOW 왼쪽 · AWARENESS 오른쪽 위 · CHOICE 오른쪽 아래)로 간다.
import { $, $$, clamp, ss, lerp, ensurePlay } from './util.js';

const CUTS = [[0.0, '개미'], [3.45, '반딧불이'], [7.8, '사람 · 군중']];   // 예고편 가안 컷표 (영상팀 컷이 오면 교체)
// 피그마 목록 색: 위 하늘색 → 가운데 라벤더 → 아래 연한 크림
const STOPS = [[127, 180, 255], [184, 160, 255], [242, 226, 196]];
const colAt = (t) => { const s = t < 0.5 ? 0 : 1, k = t < 0.5 ? t * 2 : (t - 0.5) * 2; return `rgb(${STOPS[s].map((v, i) => Math.round(lerp(v, STOPS[s + 1][i], k))).join(',')})`; };

export function initShift() {
  const section = $('#shift'), stage = $('#cardStage'), card = $('#card'), video = $('#reelVideo');
  const cap = $('#cardCap'), ui = $('#cardUi'), tc = $('#reelTc'), nameEl = $('#reelName');
  const rows = $$('#pairs li');
  const labs = [$('#slF'), $('#slA'), $('#slC')];
  ensurePlay(video);
  rows.forEach((li, i) => { li.style.color = colAt(i / (rows.length - 1)); });

  let cut = -1;
  function update() {
    const W = innerWidth, H = innerHeight, u = W / 1920;
    // 1) 렌즈
    for (const li of rows) {
      const r = li.getBoundingClientRect();
      if (r.bottom < -50 || r.top > H + 50) continue;
      const d = Math.abs((r.top + r.height / 2) - H / 2) / H;
      let s = clamp(1 - d / 0.32); s = s * s * (3 - 2 * s);
      li.style.setProperty('--gap', `${(u * 30 + s * W * 0.16).toFixed(1)}px`);
    }
    // 2) 카드
    const sr = stage.getBoundingClientRect();
    const q = clamp(-sr.top / (sr.height - H));
    const a = ss(0.0, 0.3, q), b = ss(0.3, 0.68, q);
    const w0 = W * 0.58, h0 = w0 * 1066 / 1920;
    const w = lerp(w0, W, b), h = lerp(h0, H, b);
    const top = lerp(lerp(H + 30, H * 0.5, a), 0, b);
    card.style.width = `${w.toFixed(1)}px`; card.style.height = `${h.toFixed(1)}px`;
    card.style.transform = `translate(${((W - w) / 2).toFixed(1)}px, ${top.toFixed(1)}px)`;
    card.style.borderRadius = `${(u * 40 * (1 - b * 0.6)).toFixed(1)}px`;
    cap.style.opacity = ss(0.7, 0.82, q).toFixed(3);
    ui.style.opacity = ss(0.72, 0.84, q).toFixed(3);
    if (q > 0 && q < 1) {
      if (video.paused) video.play().catch(() => {});
      const t = video.currentTime || 0;
      tc.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 30)).padStart(2, '0')}`;
      let i = 0; CUTS.forEach((c, k) => { if (t >= c[0]) i = k; });
      if (i !== cut) { cut = i; nameEl.textContent = CUTS[i][1]; }
    }
    // 3) 라벨: 목록 구간에선 작게 가운데 줄에, 카드가 덮을수록 자라 카드 위 자리로
    const listIn = ss(H * 0.9, H * 0.4, section.getBoundingClientRect().top);
    const k = ss(0.22, 0.7, q);
    const size = lerp(14, u * 92, k);
    const P = [   // [시작 x 비율, 시작 정렬(0 왼 · .5 가운데 · 1 오른), 끝 x px, 끝 y 비율, 끝 정렬]
      [0.022, 0, u * 100, 0.5, 0],
      [0.5, 0.5, W - u * 100, 0.2, 1],
      [0.978, 1, W - u * 100, 0.8, 1],
    ];
    labs.forEach((el, i) => {
      const [sx, sa, ex, ey, ea] = P[i];
      const x = lerp(W * sx, ex, k), y = lerp(H * 0.5, H * ey, k), al = lerp(sa, ea, k);
      el.style.fontSize = `${size.toFixed(1)}px`;
      el.style.transform = `translate(${x.toFixed(1)}px, ${(y - H / 2).toFixed(1)}px) translate(${(-al * 100).toFixed(1)}%, -50%)`;
      el.style.left = '0px';
      el.style.opacity = listIn.toFixed(3);
    });
  }
  return { section, update };
}
