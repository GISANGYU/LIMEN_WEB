// LIMEN AWAKE (관람 후) — INDEX(js/index.js)와 파일을 나눠 서로 건드리지 않는다.
// 11-19 2차 지시 반영: 인터랙션은 '제목 구간'에만.
//  · [data-in]            제목·제목 설명만 화면에 들어오면 블러 14px→0, translateY −30px→0 (lines: 줄마다, chars: 글자마다)
//                         라벨(RETRACE / … 등), 장면 사진·설명, 의미 5줄, 디자인 시스템 판, 포스터 아카이브는 고정
//  · [data-scramble]      서체 판의 큰 AaBb · 가나다만 글자가 오류처럼 섞이다 0.7초에 걸쳐 제자리
//  · 04 키워드             왼쪽 큰 단어만 블러 등장, 오른쪽 뜻·설명은 --blur:0px (위치·투명도만)
//  · 02 다섯 장면          odysseeclinic 식 포커싱 — 마우스가 간 장면(사진·이름·설명)만 선명, 나머지는 흐림·투명 (예전 상징 구간에서 옮김)
//  · 10 포스터 아카이브     cosmos.so/e/1494863811 구조 — 스크롤 트랙 + sticky 화면, 스크롤만큼 카메라가 z축으로 전진(포스터 6장이 깊이로 놓임),
//                         흰 SVG 선이 공간 속을 구불구불 다가옴, 하단 상자 = 리모컨 + 지금 포스터 썸네일
//  · 05 색                 그라데이션 위에서 마우스 오른쪽 위에 그 자리 색 동그라미 + HEX (돋보기)
//  · 03 의미               사진·글 모두 고정 · 길어진 만큼 04~푸터를 --shift 로 내림
//  · 12 남겨 주세요        평소 천천히 왼쪽→오른쪽 자동 회전 + 끌어서 돌리기, 가운데 카드에 초점(양옆은 살짝 흐림)
//  · ?overlay              피그마 전체 캡처를 반투명으로 겹침 (O · [ ] · D) — 최종 상태로 고정, &live 면 움직임 유지
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const root = document.documentElement;
const qs = new URLSearchParams(location.search);
const OVERLAY = qs.has('overlay');
const STILL = qs.has('still') || (OVERLAY && !qs.has('live'));
root.classList.add(STILL ? 'is-still' : 'is-live');
const U = () => innerWidth / 1920;

// ───────── scroll
const lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1, autoRaf: false });
window.__app = { lenis };
$$('[data-goto]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault(); closeProfile();
  const id = a.dataset.goto;
  if (id === 'top') lenis.scrollTo(0, { duration: 1.4, easing: easeInOut });
  else {
    const el = document.getElementById(id);
    const tgt = el && el.getClientRects().length ? el : el?.firstElementChild;   // 구간은 display:contents 라 첫 요소로
    if (tgt) lenis.scrollTo(tgt, { duration: 1.8, easing: easeInOut, offset: -Math.round(140 * U()) });
  }
}));

// ───────── 03 다섯 개의 질문 — 피그마 줄 + 원본 AWAKE(GitHub_배포/LIMEN_WEB/awake/water) 의 장면·의미 설명
//  사진·글 모두 고정. 11-20 순서: 04 = 연결 통로(PASSAGE) — 곤충의 규칙적·군집적 삶을 다음 장면의 사람에게 빗대어 잇는 장면(사용자 설명),
//  사진 = 영상팀 원본 awake_source/3WALLS_4320x912_24fps_V30.mp4 4.5초(이미지 조각 200여 개가 파노라마로 깔린 순간) · 05 = CROWD · ENDING 없음.
const MEANING = [
  ['01 / FIREFLY', '작은 신호를 마주하다', '처음 마주한 작은 신호.<br>무엇이 나의 시선을 이끌었는지 떠올려봅니다.', 'scene-firefly.jpg', 'obj-b', 512,
    ['검은 공간에 서로 다른 박자로 깜빡이는 반딧불이들이 나타납니다. 처음엔 제각각이던 불빛이 조금씩 옆의 주기에 맞춰지고, 끝내 하나의 리듬이 됩니다. 마지막까지 남은 불빛은 다음 장면에서 나방이 따라갈 신호가 됩니다.'],
    ['반딧불이의 동조는 개인의 행동과 판단이 주변의 신호를 반복해서 접하며 점차 닮아갈 수 있다는 현상을 빗댄 것입니다. 처음엔 내 취향대로 고르려 했는데, 다른 사람들의 평가를 여러 번 보면서 마음이 바뀌는 일처럼요.']],
  ['02 / MOTH', '이끌림의 방향을 따라가다', '끌림을 따라 움직였던 순간.<br>그 방향은 어디에서 시작되었을까요?', 'scene-moth.jpg', '', 516,
    ['반딧불이 장면에서 남은 불빛을 따라 나방이 날아갑니다. 나방은 빛을 따라 동굴 안으로 들어가고, 관객의 시선도 함께 다음 공간으로 옮겨 갑니다.'],
    ['반딧불이가 여러 개체가 집단의 리듬에 맞춰 가는 모습이라면, 나방은 한 존재가 특정한 빛을 따라 움직이는 모습입니다. 이 빛은 현실의 추천, 평가, 유행처럼 선택에 작용하는 특정한 정보를 뜻합니다.']],
  ['03 / SPIDER', '연결된 관계를 인식하다', '나와 타인 사이에 이어진 관계.<br>서로의 움직임이 남긴 영향을 바라봅니다.', 'scene-spider.jpg', '', 520,
    ['나방이 들어선 곳은 어두운 크리스탈 동굴입니다. 바닥은 돌과 암반이고, 화면 위아래는 이미 레터박스로 좁아져 있습니다. 그 안에서 크리스탈 거미가 천천히 모습을 드러내다가, 관객을 향해 갑자기 다가옵니다.'],
    ['이 장면의 목적은 공포가 아닙니다. 우리가 모든 행동을 충분히 생각한 뒤에 결정하는 것은 아니라는 사실을, 직접 반응해 보며 겪게 하려는 것입니다.']],
  ['04 / PASSAGE', '곤충의 삶을 우리의 삶에 잇다', '규칙을 따라 무리 지어 움직이던 곤충의 삶.<br>우리의 삶은 그것과 얼마나 다를까요?', 'scene-passage.jpg', '', 0,
    ['거미가 사라진 동굴이 작아지며 수많은 이미지 조각으로 이어집니다. 줄지어 움직이고 무리를 이루어 살아가는 생명의 장면들이 파노라마처럼 끝없이 펼쳐지고, 그 끝에서 사람의 모습이 나타납니다.'],
    ['앞서 만난 곤충들의 규칙적이고 군집적인 삶을 다음 장면의 사람들에게 빗대어 잇는 장면입니다.',
     '정해진 규칙을 따르고 무리 속에서 함께 움직이는 모습은 우리 인간의 삶과 크게 다르지 않습니다. 이 장면은 곤충의 세계와 사람의 세계가 같은 구조로 이어져 있음을 보여 줍니다.']],
  ['05 / CROWD', '서로의 흐름을 마주하다', '혼자가 아닌 흐름 속의 나.<br>함께 움직이는 동안 나의 기준은 어떻게 달라졌나요?', 'scene-crowd.jpg', '', 0,
    ['회상이 끝나면 사람의 형상이 나타납니다. 한 사람이 먼저 등장하고, 타인이 점점 늘어납니다. 관객이 움직이는 방향에 맞춰 화면 속 사람들도 같은 쪽으로 움직입니다.'],
    ['처음 반딧불이 장면이 “내 선택이 남의 선택과 닮아갈 수 있다”는 쪽이었다면, 사람·타인 장면은 사람의 형상이 내 이동 방향에 반응하는 모습으로 나의 행동과 주변의 흐름이 이어져 있음을 보여 줍니다.']],
];
const mnHost = $('#meaning');
mnHost.insertAdjacentHTML('beforeend', `<div class="ab mn-list" id="mnList" style="--x:120;--y:2970;--w:1680">${MEANING.map(([t, m, d, img, cls, id, scene, mean]) => `
  <article class="mn-item">
    <figure class="mn-photo"${id ? ` data-fig="2839:${id}"` : ''}><img class="${cls}" src="assets/awake/${img}" alt="" loading="lazy" /></figure>
    <div class="mn-text">
      <p class="mn-t"${id ? ` data-fig="2839:${id + 1}"` : ''}>${t}</p>
      <p class="mn-m"${id ? ` data-fig="2839:${id + 2}"` : ''}>${m}</p>
      <p class="mn-d"${id ? ` data-fig="2839:${id + 3}"` : ''}>${d}</p>
      <div class="mn-more">
        <p class="mn-k">SCENE · 장면</p>${scene.map((x) => `<p class="mn-p">${x}</p>`).join('')}
        <p class="mn-k">MEANING · 의미</p>${mean.map((x) => `<p class="mn-p">${x}</p>`).join('')}
      </div>
    </div>
  </article>`).join('')}</div>`);
// 03 이 피그마(마지막 사진 아래끝 y 4800)보다 길어진 만큼 04~푸터를 내림
const aw = $('.aw'), mnList = $('#mnList');
const paWrap = $('#paWrap'), paTrack = $('#paTrack');
const PA_N = 6, PA_SEG = .95;              // 포스터 하나당 0.95 화면 스크롤
function layoutShift() {
  const u = U(), vh = innerHeight;
  const bottom = mnList.offsetTop + mnList.offsetHeight;
  const shift = Math.max(0, bottom - 4800 * u);
  aw.style.setProperty('--shift', `${shift.toFixed(1)}px`);
  // 포스터 트랙: 한 화면(붙어 있는 화면) + 포스터 사이 5구간 + 앞뒤 머묾
  paTrack.style.height = `${(vh * (1 + (PA_N - 1) * PA_SEG + .5)).toFixed(0)}px`;
  const shift2 = Math.max(0, paWrap.offsetHeight - 1621 * u);   // 피그마 포스터 구간 1621 보다 길어진 만큼
  aw.style.setProperty('--shift2', `${shift2.toFixed(1)}px`);
  window.__app.shift = shift; window.__app.shift2 = shift2;
  lenis.resize?.();
}
layoutShift();
addEventListener('load', layoutShift);
document.fonts?.ready.then(layoutShift);

// ───────── 12 질문 카드 — 피그마 5장(중심·각도) 그대로, 화면 밖 자리는 같은 곡선으로 이어 붙임
const PI = [
  ['01 / REFLECTION', 'FLOW', '흐름이 바뀐<br>순간은?', false],
  ['02 / REFLECTION', 'AWARENESS', '무엇이 나의<br>선택을 이끌었나요?', true],
  ['03 / REFLECTION', 'CHOICE', '다시 선택한다면,<br>어떤 방향인가요?', false],
  ['04 / REFLECTION', 'FEELING', '가장 오래 남은<br>장면은?', false],
  ['05 / REFLECTION', 'AFTER', '일상으로 가져갈<br>질문은?', false],
];
// 자리 k = −5…5 의 카드 중심 (피그마 코드의 회전 상자 중심, k=−2…2) · 각도 = 11°×k
const SLOT = { '-5': [-980, 17220], '-4': [-640, 16820], '-3': [-280, 16480], '-2': [147.8, 16212.79], '-1': [537.81, 16046.66], 0: [960, 16004], 1: [1365.76, 16113.44], 2: [1741.72, 16343.9], 3: [2200, 16680], 4: [2520, 17060], 5: [2840, 17480] };
const SLOT_BG = ['#614a70', '#45364f', '#30283b'];
// 가운데 3장(−1·0·1칸)은 또렷하게, 그 바깥부터 흐림: 두 칸 옆 2.4px·밝기 88%, 더 바깥은 최대 3.2px·82%
const FOCUS_SLOTS = 1, BLUR_PER_SLOT = 2.4, BLUR_MAX = 3.2, DIM_PER_SLOT = .12, DIM_MIN = .82;
const STAGE_TOP = 15700;
const stage = $('#piStage');
const piCards = [];
for (let j = 0; j < 10; j++) {
  const [no, kw, q, sm] = PI[j % 5];
  const el = document.createElement('article');
  el.className = 'pi-card';
  el.innerHTML = `<p class="pi-no">${no}</p><p class="pi-kw${sm ? ' sm' : ''}">${kw}</p><p class="pi-q">${q}</p><p class="pi-sig">LIMEN / YOUR THOUGHT</p>`;
  if (j >= 5) el.setAttribute('aria-hidden', 'true');
  stage.appendChild(el);
  piCards.push({ el, base: j - 2 });
}
stage.tabIndex = 0;

// ───────── 등장: 줄/글자 나누기 (제목 구간에만 data-in 이 붙어 있음)
$$('[data-in="lines"]').forEach((el) => {
  el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map((l, i) => `<span class="ln" style="--i:${i}">${l.trim() || '&nbsp;'}</span>`).join('');
});
$$('[data-in="chars"]').forEach((el) => {
  el.innerHTML = [...el.textContent].map((c, i) => `<span class="chr" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
});

// ───────── 글자 섞임 — 서체 판의 큰 AaBb · 가나다만
const SETS = { upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', lower: 'abcdefghijklmnopqrstuvwxyz' };
const rnd = (s) => s[(Math.random() * s.length) | 0];
const randHangul = () => String.fromCharCode(0xac00 + ((Math.random() * 11172) | 0));
function glyphFor(c) {
  if (/[가-힣]/.test(c)) return randHangul();
  if (/[A-Z]/.test(c)) return rnd(SETS.upper);
  if (/[a-z]/.test(c)) return rnd(SETS.lower);
  return c;
}
const scrambles = $$('[data-scramble]').map((el) => {
  const text = el.textContent;
  el.textContent = '';
  const spans = [...text].map((c) => {
    const s = document.createElement('span'); s.className = 'sc'; s.textContent = c; s.dataset.c = c; el.appendChild(s); return s;
  });
  return { el, spans, raf: 0 };
});
// 0.7초: 글자가 왼쪽부터 차례로 나타나며 다른 글자 1~2개만 잠깐 보이고(각 110ms) 원래 글자로 — 과하지 않게
const SCRAMBLE_MS = 700, SWAP_MS = 110;
function runScramble(sc) {
  cancelAnimationFrame(sc.raf);
  sc.el.classList.add('is-run');
  const n = sc.spans.length, t0 = performance.now();
  const plan = sc.spans.map((sp, i) => {
    const swaps = Math.random() < .5 ? 1 : 2;
    const start = n > 1 ? i * (SCRAMBLE_MS - 2 * SWAP_MS - 20) / (n - 1) : 0;
    const glyphs = Array.from({ length: swaps }, () => glyphFor(sp.dataset.c));
    return { start, glyphs };
  });
  const loop = (now) => {
    const t = now - t0; let busy = false;
    sc.spans.forEach((sp, i) => {
      const { start, glyphs } = plan[i], c = sp.dataset.c;
      if (t < start) { sp.style.visibility = 'hidden'; busy = true; return; }
      sp.style.visibility = '';
      const k = Math.floor((t - start) / SWAP_MS);
      if (k < glyphs.length) { if (sp.textContent !== glyphs[k]) sp.textContent = glyphs[k]; sp.classList.add('is-glitch'); busy = true; }
      else if (sp.textContent !== c) { sp.textContent = c; sp.classList.remove('is-glitch'); }
    });
    if (busy) sc.raf = requestAnimationFrame(loop);
  };
  sc.raf = requestAnimationFrame(loop);
}

// ───────── 보일 때 등장 (아래로 빠질 때만 되돌려 다시 볼 수 있게 — INDEX 와 같은 규칙)
if (STILL) {
  $$('[data-in]').forEach((el) => el.classList.add('is-in'));
  scrambles.forEach((s) => s.el.classList.add('is-run'));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const el = e.target;
      if (e.isIntersecting) {
        el.classList.add('is-in');
        if (el._sc && !el._scDone) { el._scDone = true; runScramble(el._sc); }
      } else if (e.boundingClientRect.top > 0) {
        el.classList.remove('is-in');
        if (el._sc) { el._scDone = false; el.classList.remove('is-run'); }
      }
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('[data-in]').forEach((el) => io.observe(el));
  scrambles.forEach((s) => { s.el._sc = s; io.observe(s.el); });
}

// ───────── 05 색 — 누르면 HEX 복사 (피그마 안내 문구 그대로)
$$('.sw').forEach((b) => b.addEventListener('click', async () => {
  const hex = b.dataset.hex, label = $('span', b);
  try { await navigator.clipboard.writeText(hex); label.textContent = 'COPIED ✓'; }
  catch { label.textContent = hex; }
  b.classList.add('is-copied');
  clearTimeout(b._t); b._t = setTimeout(() => { label.textContent = 'COPY HEX'; b.classList.remove('is-copied'); }, 1400);
}));

// ───────── 05 그라데이션 돋보기 — CSS 그라데이션과 같은 색 멈춤점으로 그 자리 색을 계산
const GRAD = [[0, '#101118'], [.02, '#101118'], [.26, '#171b74'], [.52, '#5552b5'], [.80, '#a6a1f4'], [1, '#ebe8fe']].map(([p, h]) => [p, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))]);
function gradAt(x) {
  x = clamp(x);
  let k = 0; while (k < GRAD.length - 2 && x > GRAD[k + 1][0]) k++;
  const [p0, c0] = GRAD[k], [p1, c1] = GRAD[k + 1];
  const f = p1 > p0 ? clamp((x - p0) / (p1 - p0)) : 0;
  return '#' + c0.map((v, i) => Math.round(lerp(v, c1[i], f)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
const lens = document.createElement('div'); lens.className = 'lens'; lens.setAttribute('aria-hidden', 'true'); lens.innerHTML = '<i></i><b></b>';
document.body.appendChild(lens);
const gradBar = $('.grad-bar');
let lensPos = null, lensTo = null;
gradBar.addEventListener('pointermove', (e) => {
  const r = gradBar.getBoundingClientRect();
  const hex = gradAt((e.clientX - r.left) / r.width);
  lens.style.setProperty('--lc', hex); $('b', lens).textContent = hex;
  lensTo = [e.clientX + 18, e.clientY - 18 - 64];          // 마우스 오른쪽 위
  if (!lensPos) lensPos = [...lensTo];
  lens.classList.add('is-on');
});
gradBar.addEventListener('pointerleave', () => { lens.classList.remove('is-on'); lensPos = null; });
addEventListener('wheel', () => lens.classList.remove('is-on'), { passive: true });

// ───────── 02 당신이 지나온 다섯 장면 — 포커싱 (사진·이름·설명을 같은 번호 data-rt 로 묶음)
const rtHost = $('[data-rt-host]'), rtEls = $$('[data-rt]');
const rtFocus = (i) => { rtHost.classList.add('rt-focus'); rtEls.forEach((el) => el.classList.toggle('is-focus', el.dataset.rt === i)); };
const rtOff = () => { rtHost.classList.remove('rt-focus'); rtEls.forEach((el) => el.classList.remove('is-focus')); };
if (!STILL) {
  rtEls.forEach((el) => {
    el.addEventListener('pointerenter', () => rtFocus(el.dataset.rt));
    el.addEventListener('pointerleave', (e) => { if (!e.relatedTarget?.closest?.('[data-rt]')) rtOff(); });
  });
  $$('.rt-card[data-rt]').forEach((el) => { el.tabIndex = 0; el.addEventListener('focus', () => rtFocus(el.dataset.rt)); el.addEventListener('blur', rtOff); });
}

// ───────── 10 포스터 아카이브 — 스크롤만큼 카메라가 z축으로 전진 (cosmos.so/e/1494863811 구조)
//  포스터 i 는 깊이 z = i·D 에 좌우로 엇갈려 놓이고, 카메라는 스크롤 진행에 맞춰 z 를 따라 전진한다.
//  원근: 화면 배율 s = F / (F + 남은 거리). 가까워지면 커지고, 지나가면 옆으로 크게 빠져나가며 사라진다.
//  카메라 x·y 는 지금 포스터 쪽으로 따라가 지금 포스터가 가운데 온다. 포스터 근처에서는 진행이 느려져 잠깐 머문다.
const POSTERS = [
  ['01 / MAIN POSTER', 'BETWEEN REALITY<br>AND DREAM', 136.495 / 200, '#a6a1f4'],
  ['02 / FLOW', 'F L O W', .70758, '#c9c3ff'],
  ['03 / AWARENESS', 'AWARENESS', .70758, '#8f8be8'],
  ['04 / CHOICE', 'CHOICE', .70758, '#b8b4ff'],
  ['05 / SERIES POSTER', 'LIGHT RHYTHM<br>ORIENTATION RESPONSE', .70758, '#7d78e0'],
  ['06 / INTERSPACE', 'IS THE PATH TRULY<br>MY OWN CHOICE?', 143.978 / 200, '#6a5cf0'],
];
const PA_D = 1900, PA_F = 950;                                   // 포스터 사이 깊이 · 초점 거리 (무대 높이 750 기준 단위)
const PA_X = [0, 560, -520, 500, -560, 0], PA_Y = [0, -50, 40, -40, 50, 0];
const paStage = $('#paStage'), paItems = $$('.pa-item'), paSlots = $$('.pa-slot');
const paName = $('#paName'), paCopy = $('#paCopy'), paCoord = $('#paCoord'), paNow = $('#paNow'), paBar = $('#paBar');
const paPaths = $$('#paPath path'), paTints = $$('.pa-tint img');
let paCam = 0, paShown = -1, paTintK = 0;
const easeIO = (f) => (f < .5 ? 4 * f * f * f : 1 - Math.pow(-2 * f + 2, 3) / 2);
function paTarget() {                       // 스크롤 → 카메라 진행(0…N-1), 포스터마다 잠깐 머묾
  if (STILL) return 0;
  const vh = innerHeight, r = paTrack.getBoundingClientRect();
  const span = Math.max(1, r.height - vh);
  const q = clamp(-r.top / span);
  const sv = q * ((PA_N - 1) * PA_SEG + .5);                                  // 붙은 뒤 스크롤한 거리(화면 단위)
  const t = clamp((sv - .25) / ((PA_N - 1) * PA_SEG)) * (PA_N - 1);             // 앞뒤 0.25 화면은 머묾
  const k = Math.floor(t), f = t - k;
  return Math.min(PA_N - 1, k + easeIO(f));
}
function paLerpArr(arr, c) { const k = Math.floor(c), f = c - k; return lerp(arr[clamp(k, 0, PA_N - 1)], arr[clamp(k + 1, 0, PA_N - 1)], easeIO(clamp(f))); }
function paRender() {
  const W = paStage.clientWidth, H = paStage.clientHeight;
  if (!W || !H) return;
  const unit = H / 750, cx = W / 2, cy = H * .47;
  const camZ = paCam * PA_D, camX = paLerpArr(PA_X, paCam), camY = paLerpArr(PA_Y, paCam);
  const baseH = H * .74;
  const proj = (x, y, z) => { const dz = z - camZ, sc = PA_F / (PA_F + dz); return [cx + (x - camX) * unit * sc, cy + (y - camY) * unit * sc, sc, dz]; };
  paItems.forEach((el, i) => {
    const [X, Y, sc, dz] = proj(PA_X[i], PA_Y[i], i * PA_D);
    if (dz < -PA_F * .72 || dz > PA_D * 3.2) { el.style.opacity = '0'; el.style.visibility = 'hidden'; return; }
    const h = baseH, w = h * POSTERS[i][2];
    const fadeNear = clamp(1 - (-dz - PA_F * .25) / (PA_F * .45));       // 지나가며 사라짐
    const fadeFar = clamp(1 - (dz - PA_D * 1.6) / (PA_D * 1.4));         // 멀리서 나타남
    el.style.visibility = '';
    el.style.width = `${w.toFixed(1)}px`; el.style.height = `${h.toFixed(1)}px`;
    el.style.transform = `translate3d(${(X - w / 2).toFixed(1)}px, ${(Y - h / 2).toFixed(1)}px, 0) scale(${sc.toFixed(4)})`;
    el.style.opacity = (fadeNear * fadeFar).toFixed(3);
    el.style.filter = dz > PA_D * .6 ? `blur(${Math.min(4, (dz - PA_D * .6) / PA_D * 2.4).toFixed(2)}px)` : '';
    el.style.zIndex = String(Math.round(10000 - dz));
  });
  // 흰 선: 공간 속 3D 곡선을 같은 원근으로 그림 — 카메라가 전진하면 구불구불 다가옴
  const segs = [[], [], []];
  for (let z = camZ - PA_F * .7; z < camZ + PA_D * 3.4; z += 40) {
    const x = 640 * Math.sin(z / 1500 + .6) + 230 * Math.sin(z / 560 + 1.7);
    const y = 230 + 140 * Math.sin(z / 980 + 1.1) + 60 * Math.cos(z / 430);
    const [X, Y, , dz] = proj(x, y, z);
    const g = dz < PA_D * .8 ? 0 : dz < PA_D * 1.9 ? 1 : 2;
    segs[g].push(`${X.toFixed(1)},${Y.toFixed(1)}`);
    if (g > 0 && segs[g].length === 1 && segs[g - 1].length) segs[g].unshift(segs[g - 1][segs[g - 1].length - 1]);   // 이음매 끊기지 않게
  }
  paPaths.forEach((pth, k) => { const pts = segs[2 - k]; pth.setAttribute('d', pts.length > 1 ? 'M' + pts.join('L') : ''); });
  // 지금 포스터 정보
  const k = Math.round(paCam);
  if (k !== paShown) {
    paShown = k;
    const [title, copy, , dot] = POSTERS[k];
    paName.classList.add('is-swap'); paCopy.classList.add('is-swap');
    clearTimeout(paRender._t);
    paRender._t = setTimeout(() => { $('span', paName).textContent = title; paCopy.innerHTML = copy; paName.style.setProperty('--dot', dot); paName.classList.remove('is-swap'); paCopy.classList.remove('is-swap'); }, 260);
    paNow.textContent = String(k + 1).padStart(2, '0');
    paSlots.forEach((b, i) => b.classList.toggle('is-on', i === k));
    paTintK = 1 - paTintK; paTints[paTintK].src = `assets/awake/poster-0${k + 1}.jpg`;
    paTints.forEach((im, i) => im.classList.toggle('is-on', i === paTintK));
  }
  paCoord.innerHTML = `X&nbsp;&nbsp;${(camX / 100).toFixed(2)}<br>Y&nbsp;&nbsp;${(-camY / 100).toFixed(2)}<br>Z&nbsp;&nbsp;${String(Math.round(camZ)).padStart(4, '0')}`;
  paBar.style.transform = `scaleX(${(paCam / (PA_N - 1)).toFixed(4)})`;
}
// 리모컨: 썸네일을 누르면 그 포스터 자리까지 스크롤
function paScrollTo(i) {
  const vh = innerHeight, top = paTrack.getBoundingClientRect().top + lenis.scroll;
  const q = (.25 + i * PA_SEG) / ((PA_N - 1) * PA_SEG + .5);
  lenis.scrollTo(top + q * (paTrack.offsetHeight - vh), { duration: 1.6, easing: easeInOut });
}
window.__app.paScrollTo = paScrollTo;
paSlots.forEach((b) => b.addEventListener('click', () => paScrollTo(+b.dataset.i)));
addEventListener('keydown', (e) => {
  const r = paTrack.getBoundingClientRect(); if (r.top > 0 || r.bottom < innerHeight) return;    // 붙어 있는 동안만
  if (e.key === 'ArrowRight') paScrollTo(Math.min(PA_N - 1, Math.round(paCam) + 1));
  if (e.key === 'ArrowLeft') paScrollTo(Math.max(0, Math.round(paCam) - 1));
});
paRender();

// ───────── 12 카드 원 궤도
function slotPos(s) {
  s = clamp(s, -5, 5);
  const k = Math.min(4, Math.floor(s)), t = s - k;
  const P = (n) => SLOT[clamp(n, -5, 5)];
  const p0 = P(k - 1), p1 = P(k), p2 = P(k + 1), p3 = P(k + 2);
  const cr = (a, b, c, d) => .5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
}
const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const BGS = SLOT_BG.map(hex2);
function slotBg(a) {
  a = Math.abs(a); const k = Math.min(1, Math.floor(a)), t = clamp(a - k);
  const c0 = BGS[Math.min(k, 2)], c1 = BGS[Math.min(k + 1, 2)];
  return `rgb(${c0.map((v, i) => Math.round(lerp(v, c1[i], t))).join(',')})`;
}
const wrap = (s) => ((((s + 5) % 10) + 10) % 10) - 5;
let piOff = 0, piTarget = 0, piDrag = null, piVel = 0;
// 평소에는 천천히 왼쪽 → 오른쪽으로 돈다(초당 0.18칸 ≈ 5.6초에 한 칸). 끌거나 누르면 멈췄다가, 자리 잡고 1.2초 뒤 다시 돈다
const AUTO_SLOTS_PER_SEC = .18, AUTO_RESUME_MS = 1200;
let piAuto = !STILL, piResumeAt = 0;
function renderCards() {
  const u = U();
  for (const c of piCards) {
    const s = wrap(c.base + piOff), a = Math.abs(s);
    const [x, y] = slotPos(s);
    c.el.style.transform = `translate3d(${((x - 175) * u).toFixed(2)}px, ${((y - 215 - STAGE_TOP) * u).toFixed(2)}px, 0) rotate(${(11 * s).toFixed(3)}deg)`;
    c.el.style.setProperty('--cbg', slotBg(s));
    const out = Math.max(0, a - FOCUS_SLOTS);
    c.el.style.setProperty('--cblur', `${Math.min(BLUR_MAX, out * BLUR_PER_SLOT).toFixed(2)}px`);
    c.el.style.setProperty('--cdim', Math.max(DIM_MIN, 1 - out * DIM_PER_SLOT).toFixed(3));
    c.el.style.zIndex = String(100 - Math.round(a * 10));
    c.s = s;
  }
}
renderCards();
if (!STILL) {
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    piDrag = { x: e.clientX, off: piOff, t: performance.now(), lx: e.clientX, moved: 0, card: e.target.closest('.pi-card') };
    stage.setPointerCapture(e.pointerId); stage.classList.add('is-drag'); piVel = 0; piAuto = false;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!piDrag) return;
    const now = performance.now(), u = U();
    piOff = piDrag.off + (e.clientX - piDrag.x) / (400 * u);
    const dt = Math.max(1, now - piDrag.t);
    piVel = lerp(piVel, (e.clientX - piDrag.lx) / (400 * u) / dt * 16, .4);
    piDrag.moved = Math.max(piDrag.moved, Math.abs(e.clientX - piDrag.x));
    piDrag.t = now; piDrag.lx = e.clientX; piTarget = piOff;
  });
  const end = () => {
    if (!piDrag) return;
    if (piDrag.moved < 5 && piDrag.card) {          // 그냥 누른 카드는 가운데로
      const c = piCards.find((k) => k.el === piDrag.card); if (c) piTarget = Math.round(piOff - c.s);
    } else piTarget = Math.round(piOff + piVel * 9);
    piDrag = null; stage.classList.remove('is-drag'); piResumeAt = Infinity;
  };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { piAuto = false; piResumeAt = Infinity; piTarget = Math.round(piTarget) + 1; e.preventDefault(); }
    if (e.key === 'ArrowLeft') { piAuto = false; piResumeAt = Infinity; piTarget = Math.round(piTarget) - 1; e.preventDefault(); }
  });
}

// ───────── 푸터 필름 (INDEX 와 같은 영상·색)
const ftVideo = $('#ftFilm video');
new IntersectionObserver(([e]) => {
  if (e.isIntersecting && !STILL) { if (!ftVideo.getAttribute('src')) ftVideo.src = ftVideo.dataset.src; ftVideo.play().catch(() => {}); }
  else ftVideo.pause();
}).observe($('#ftFilm'));

// ───────── 프로필 층 (INDEX 와 같은 내용)
const TEAM = [
  ['유기상', 'YU GI SANG', '개발'], ['김현기', 'KIM HYUN GI', '영상'], ['배정훈', 'BAE JUNG HUN', '영상'],
  ['심혜민', 'SHIM HAE MIN', '영상'], ['김노은', 'KIM NO HEUN', 'UI · UX'], ['조가연', 'CHO GA YEON', 'UI · UX'], ['이채연', 'LEE CHAE YEON', '기획'],
];
$('#pfGrid').innerHTML = TEAM.map(([ko, en, role], i) => `
  <li class="pf-card" style="--i:${i}">
    <div class="pf-ph"><img src="assets/figma-1102/portrait-${i}.png" alt="${ko}" loading="lazy" /><b>${String(i + 1).padStart(2, '0')}</b></div>
    <p class="pf-name">${ko}</p><p class="pf-en">${en}</p><p class="pf-role">${role}</p>
  </li>`).join('');
const profile = $('#profile'), burger = $('#burger');
function openProfile() {
  root.classList.add('is-profile'); profile.removeAttribute('inert'); profile.setAttribute('aria-hidden', 'false');
  burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', '팀 프로필 닫기'); lenis.stop();
}
function closeProfile() {
  if (!root.classList.contains('is-profile')) return;
  root.classList.remove('is-profile'); profile.setAttribute('inert', ''); profile.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', '팀 프로필 열기'); lenis.start();
}
burger.addEventListener('click', () => (root.classList.contains('is-profile') ? closeProfile() : openProfile()));
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeProfile(); });

// ───────── 피그마 겹쳐 보기
if (OVERLAY) {
  const ov = document.createElement('div'); ov.className = 'fig-ov'; $('#top').appendChild(ov);
  const ov2 = document.createElement('div'); ov2.className = 'fig-ov is-after'; $('#top').appendChild(ov2);
  const hud = document.createElement('div'); hud.className = 'fig-hud'; document.body.appendChild(hud);
  let op = parseFloat(qs.get('op') || '.5');
  const show = () => { ov2.hidden = ov.hidden; ov2.classList.toggle('is-diff', ov.classList.contains('is-diff')); ov.style.opacity = ov2.style.opacity = ov.classList.contains('is-diff') ? '' : op; hud.textContent = `FIGMA OVERLAY ${ov.hidden ? 'OFF' : 'ON'} · ${Math.round(op * 100)}%${ov.classList.contains('is-diff') ? ' · DIFF' : ''}  (O · [ ] · D)`; };
  if (qs.has('diff')) ov.classList.add('is-diff');
  addEventListener('keydown', (e) => {
    if (e.key === 'o' || e.key === 'O') ov.hidden = !ov.hidden;
    if (e.key === '[') op = clamp(op - .1, .05, 1);
    if (e.key === ']') op = clamp(op + .1, .05, 1);
    if (e.key === 'd' || e.key === 'D') ov.classList.toggle('is-diff');
    show();
  });
  show();
}

// ───────── 프레임 루프
const introImg = $('.intro-photo img');
let lastNow = 0;
function update(now) {
  const dt = lastNow ? Math.min(.05, (now - lastNow) / 1000) : 0; lastNow = now;
  const vh = innerHeight, u = U(), sc = lenis.scroll;
  root.classList.toggle('is-scrolled', sc > vh * .6);
  if (STILL) return;
  // 인트로: 백합이 천천히 가라앉고 조금 늦게 따라옴
  if (sc < 1200 * u) introImg.style.transform = `translate3d(0, ${(sc * .28).toFixed(1)}px, 0) scale(${(1.06 - clamp(sc / (1080 * u)) * .04).toFixed(4)})`;
  // 05 — 돋보기는 마우스를 살짝 늦게 따라감
  if (lensPos && lensTo) {
    lensPos[0] = lerp(lensPos[0], lensTo[0], .35); lensPos[1] = lerp(lensPos[1], lensTo[1], .35);
    lens.style.setProperty('--lx', `${lensPos[0].toFixed(1)}px`); lens.style.setProperty('--ly', `${lensPos[1].toFixed(1)}px`);
  }
  // 10 — 포스터 카메라 (보이는 동안만)
  { const r = paTrack.getBoundingClientRect(); if (r.bottom > -100 && r.top < vh + 100) { paCam = lerp(paCam, paTarget(), .14); paRender(); } }
  // 12 — 카드 회전: 자동(천천히) ↔ 끌기 ↔ 자리 잡기
  if (!piDrag) {
    if (piAuto) { piOff += AUTO_SLOTS_PER_SEC * dt; piTarget = piOff; }
    else if (Math.abs(piTarget - piOff) > .002) piOff = lerp(piOff, piTarget, .085);
    else {
      piOff = piTarget;
      if (piResumeAt === Infinity) piResumeAt = now + AUTO_RESUME_MS;
      else if (piResumeAt && now >= piResumeAt) { piAuto = true; piResumeAt = 0; }
    }
    if (piOff > 10) { piOff -= 10; piTarget -= 10; }       // 카드 10장 주기라 같은 자리
    if (piOff < -10) { piOff += 10; piTarget += 10; }
  }
  renderCards();
}
addEventListener('resize', () => { layoutShift(); renderCards(); }, { passive: true });
function frame(now) {
  requestAnimationFrame(frame);
  lenis.raf(now);
  if (document.hidden) return;
  update(now);
}
requestAnimationFrame(frame);
