// 2 SLOGAN → SCENES — 문구가 들어오고, 같은 스티키 구간에서 60% 영상이 아래에서 올라와
// 화면을 채운 뒤 약 30vh 머문다. 영상은 처음부터 뮤트 · 루프 · 자동재생 (스크롤은 크기만 바꾼다).
import { $, $$, ss, clamp, ensurePlay } from './util.js';

// 컷표 — 영상 시각(초) → 장면 이름. 예고편 가안(media/scenes.mp4) 기준. 영상팀 컷이 오면 같이 고친다
const CUTS = [
  [0.0, 'ANT', '개미'],
  [3.45, 'FIREFLY', '반딧불이'],
  [7.8, 'HUMAN', '사람 · 군중'],
];

export function initSlogan() {
  const section = $('#slogan'), copy = $('#sloganCopy'), title = $('#sloganTitle'), body = $('#sloganBody');
  const label = $('.label', copy), lines = $$('span', body);
  const reel = $('#reel'), video = $('#reelVideo'), ui = $('.reel-ui', reel), tc = $('#reelTc'), name = $('#reelName');
  ensurePlay(video);

  // 제목을 글자 단위 span 으로
  const chars = [...title.textContent].map((c) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; return s; });
  title.textContent = ''; chars.forEach((s) => title.appendChild(s));

  let cutIdx = -1;
  function updateReelText() {
    const t = video.currentTime || 0;
    const f = Math.floor((t % 1) * 30);
    tc.textContent = `00:${String(Math.floor(t)).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
    let i = 0; CUTS.forEach((c, k) => { if (t >= c[0]) i = k; });
    if (i !== cutIdx) {
      cutIdx = i;
      name.innerHTML = `<small>${CUTS[i][1]}</small>${CUTS[i][2]}`;
      gsap.fromTo(name, { opacity: 0, filter: 'blur(10px)', y: 12 }, { opacity: 1, filter: 'blur(0px)', y: 0, duration: 0.7, ease: 'power2.out' });
    }
  }

  function update(p) {
    // 문구: 라벨 → 제목 글자 → 본문 줄
    label.style.opacity = ss(0.0, 0.05, p).toFixed(3);
    const n = chars.length;
    chars.forEach((s, i) => {
      const a = 0.03 + (i / n) * 0.12, k = ss(a, a + 0.05, p);
      s.style.opacity = k.toFixed(3);
      s.style.filter = `blur(${((1 - k) * 14).toFixed(1)}px)`;
      s.style.transform = `translateY(${((1 - k) * 0.25).toFixed(3)}em)`;
    });
    lines.forEach((s, i) => {
      const k = ss(0.16 + i * 0.04, 0.21 + i * 0.04, p);
      s.style.opacity = (k * 0.9 + 0.1 * k).toFixed(3);
      s.style.filter = `blur(${((1 - k) * 8).toFixed(1)}px)`;
    });
    // 문구가 위로 물러난다
    const out = ss(0.3, 0.5, p);
    copy.style.transform = `translateY(calc(-50% - ${(out * 22).toFixed(2)}vh)) scale(${(1 - out * 0.08).toFixed(3)})`;
    copy.style.opacity = (1 - ss(0.36, 0.56, p)).toFixed(3);
    copy.style.filter = `blur(${(ss(0.36, 0.56, p) * 10).toFixed(1)}px)`;

    // 영상: 아래에서 올라옴(60%) → 커짐(100%) → 머묾
    const rise = ss(0.28, 0.46, p), grow = ss(0.46, 0.89, p);   // 0.89~1 = 섹션 380vh 중 약 31vh 머묾
    const sc = 0.6 + grow * 0.4, y = (1 - rise) * 82;
    const rad = (1 - grow) * 22;
    reel.style.transform = `translate(-50%, -50%) translateY(${y.toFixed(2)}vh) scale(${sc.toFixed(4)})`;
    reel.style.borderRadius = `${(rad / sc).toFixed(1)}px`;
    reel.style.visibility = p > 0.2 ? 'visible' : 'hidden';
    ui.style.opacity = ss(0.82, 0.9, p).toFixed(3);
    if (p > 0.2 && p < 1) updateReelText();
    if (video.paused && p > 0.2 && p < 1) video.play().catch(() => {});
  }
  return { section, update };
}
