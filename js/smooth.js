// 부드러운 스크롤 (이즈인아웃) — 휠 입력을 목표 위치로 모으고, 화면은 임계 감쇠 스프링으로 따라간다.
//  · 한 칸 굴리면: 천천히 출발 → 가속 → 미끄러지듯 감속해 멈춤 (스프링 자체가 이즈인아웃 곡선)
//  · 연달아 굴리면: 속도가 0 으로 끊기지 않고 이어짐 (매번 처음부터 다시 출발하는 트윈과 다름)
//  · 링크 이동(scrollTo duration): easeInOutCubic 트윈
//  · position:sticky 를 깨지 않도록 transform 이 아닌 실제 window 스크롤을 움직인다
//  · Lenis 와 같은 이름의 API(scroll · raf · scrollTo · stop · start)라 기존 코드가 그대로 씀
const easeInOutCubic = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class Smooth {
  constructor({ stiffness = 5.2, wheelMultiplier = 1.1 } = {}) {
    this.w = stiffness;            // 스프링 고유 진동수(1/s) — 작을수록 더 길게 미끄러짐 (한 칸 ≈ 0.9초에 안착)
    this.mult = wheelMultiplier;
    this.pos = this.target = scrollY; this.vel = 0;
    this.tween = null; this.stopped = false; this.last = 0; this.ownY = -1;
    addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    addEventListener('scroll', () => this.onScroll(), { passive: true });
    document.documentElement.style.scrollBehavior = 'auto';
  }
  get scroll() { return this.pos; }
  get max() { return Math.max(0, document.documentElement.scrollHeight - innerHeight); }
  onWheel(e) {
    if (this.stopped || e.ctrlKey) return;                 // 멈춘 동안(프로필 층)은 그 층이 직접 스크롤
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
    if (this.tween) { this.tween = null; this.target = this.pos; }
    this.target = Math.min(this.max, Math.max(0, this.target + e.deltaY * unit * this.mult));
  }
  onScroll() {
    // 키보드 · 스크롤바 · 터치처럼 바깥에서 움직인 경우 → 그 자리로 맞춤
    if (Math.abs(scrollY - this.ownY) > 1.5) { this.pos = this.target = scrollY; this.vel = 0; this.tween = null; }
  }
  scrollTo(to, { duration = 1.4, easing = easeInOutCubic, immediate = false } = {}) {
    let y = to;
    if (typeof to === 'string') to = document.querySelector(to);
    if (to instanceof Element) y = to.getBoundingClientRect().top + scrollY;
    y = Math.min(this.max, Math.max(0, y));
    if (immediate) { this.pos = this.target = y; this.vel = 0; this.tween = null; this.apply(); return; }
    this.tween = { from: this.pos, to: y, t0: performance.now(), dur: duration * 1000, easing };
    this.target = y;
  }
  stop() { this.stopped = true; document.documentElement.classList.add('lenis-stopped'); this.target = this.pos; this.vel = 0; }
  start() { this.stopped = false; document.documentElement.classList.remove('lenis-stopped'); }
  apply() { this.ownY = Math.round(this.pos); window.scrollTo(0, this.pos); }
  raf(now) {
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 1 / 60); this.last = now;
    if (this.tween) {
      const k = Math.min(1, (now - this.tween.t0) / this.tween.dur);
      this.pos = this.tween.from + (this.tween.to - this.tween.from) * this.tween.easing(k);
      if (k >= 1) { this.tween = null; this.vel = 0; }
      this.apply(); return;
    }
    const d = this.target - this.pos;
    if (Math.abs(d) < 0.3 && Math.abs(this.vel) < 2) { if (this.vel) { this.pos = this.target; this.vel = 0; this.apply(); } return; }
    // 임계 감쇠 스프링: a = w²·d − 2w·v (반 단계씩 두 번 적분해 프레임이 흔들려도 안정)
    for (let i = 0; i < 2; i++) {
      const h = dt / 2, acc = this.w * this.w * (this.target - this.pos) - 2 * this.w * this.vel;
      this.vel += acc * h; this.pos += this.vel * h;
    }
    this.apply();
  }
}
