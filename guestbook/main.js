(async () => {
  const $ = (id) => document.getElementById(id);
  const grid = $('grid'), days = $('days'), viewer = $('viewer');
  const entries = await fetch('entries.json').then((r) => r.json());
  const dayLabel = (d) => `${+d.slice(5, 7)}.${+d.slice(8)}`;

  let shown = entries;
  let cur = 0;

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((list) => list.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }), { rootMargin: '0px 0px -40px' })
    : null;

  function render() {
    grid.textContent = '';
    shown.forEach((e, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'card';
      b.setAttribute('aria-label', `${e.name}, ${dayLabel(e.date)} ${e.time}`);
      const img = document.createElement('img');
      img.src = `thumbs/${e.id}.jpg`;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      const cap = document.createElement('div');
      cap.className = 'cap';
      const n = document.createElement('b'); n.textContent = e.name;
      const t = document.createElement('span'); t.textContent = `${dayLabel(e.date)} ${e.time}`;
      cap.append(n, t);
      b.append(img, cap);
      b.addEventListener('click', () => open(i));
      grid.append(b);
      io ? io.observe(b) : b.classList.add('in');
    });
    $('count').textContent = `${shown.length} / ${entries.length}`;
  }

  // 날짜 필터
  const dates = [...new Set(entries.map((e) => e.date))];
  [['all', '전체'], ...dates.map((d) => [d, dayLabel(d)])].forEach(([key, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', key === 'all');
    b.addEventListener('click', () => {
      days.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      shown = key === 'all' ? entries : entries.filter((e) => e.date === key);
      render();
    });
    days.append(b);
  });

  // 크게 보기
  function show(i) {
    cur = (i + shown.length) % shown.length;
    const e = shown[cur];
    $('vImg').src = `photos/${e.id}.jpg`;
    $('vImg').alt = `${e.name}님의 방명록 사진`;
    $('vName').textContent = e.name;
    $('vMeta').textContent = `${dayLabel(e.date)} ${e.time}`;
    const nx = shown[(cur + 1) % shown.length];
    new Image().src = `photos/${nx.id}.jpg`;
  }
  function open(i) { show(i); viewer.showModal(); }
  $('prev').onclick = () => show(cur - 1);
  $('next').onclick = () => show(cur + 1);
  $('close').onclick = () => viewer.close();
  viewer.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });
  document.addEventListener('keydown', (e) => {
    if (!viewer.open) return;
    if (e.key === 'ArrowLeft') show(cur - 1);
    if (e.key === 'ArrowRight') show(cur + 1);
  });
  let sx = null;
  viewer.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  viewer.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    sx = null;
  });

  render();
})();
