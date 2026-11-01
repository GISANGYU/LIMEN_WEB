// 와이어프레임 모드 — 실제 사이트 위에 씌워 흑백 lo-fi 로 바꾼다. 스크롤·인터랙션은 원본 그대로.
// 이미지 → 회색 X, 영상·캔버스(WebGL) → 같은 자리 회색 X 박스, 배경 이미지 → 회색 X, 색 → 흑백.
(function () {
  if (window.__wf) return;
  window.__wf = true;
  const X_SVG = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><rect width="100" height="100" fill="#E6E6E6" stroke="#C4C4C4" stroke-width="1" vector-effect="non-scaling-stroke"/><path d="M0 0L100 100M100 0L0 100" stroke="#CFCFCF" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>');
  const X_BG = 'linear-gradient(to top right, transparent calc(50% - 1px), #CFCFCF calc(50% - .5px), #CFCFCF calc(50% + .5px), transparent calc(50% + 1px)), linear-gradient(to bottom right, transparent calc(50% - 1px), #CFCFCF calc(50% - .5px), #CFCFCF calc(50% + .5px), transparent calc(50% + 1px))';
  const css = document.createElement('style');
  css.id = 'wf-css';
  css.textContent = `
    html, body { background: #FFFFFF !important; }
    *, *::before, *::after { color: #222222 !important; -webkit-text-fill-color: currentColor !important; text-shadow: none !important; box-shadow: none !important;
      filter: none !important; backdrop-filter: none !important; mix-blend-mode: normal !important; border-color: #BBBBBB !important; outline-color: #BBBBBB !important; caret-color: #222 !important; }
    ::selection { background: #DDD; }
    img { content: url("${X_SVG}") !important; object-fit: fill !important; }
    video, canvas, iframe { visibility: hidden !important; }
    svg { filter: grayscale(1) !important; }
    .gl-fallback { opacity: 1 !important; }
    img { opacity: 1 !important; visibility: visible !important; }
    .wf-ph.wf-ov { background: transparent !important; border: 0 !important; }
    .wf-ph.wf-ov b { left: 24px; top: auto; right: auto; bottom: 24px; transform: none; border-style: dashed !important; }
    .wf-ph[data-full] b { left: auto; top: auto; right: 24px; bottom: 24px; transform: none; }
    .wf-ph { position: absolute; pointer-events: none; background-color: #E6E6E6; border: 1px solid #C4C4C4 !important; background-image: ${X_BG}; }
    .wf-ph b { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: #fff; border: 1px solid #C4C4C4 !important; padding: 6px 14px; font: 500 15px/1.3 Pretendard, "Noto Sans KR", sans-serif; color: #777 !important; white-space: nowrap; }
  `;
  document.head.appendChild(css);

  // 배경 이미지·색
  const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const done = new WeakSet();
  function restyle() {
    for (const el of document.querySelectorAll('body *')) {
      if (el.classList.contains('wf-ph') || el.closest('.wf-ph') || el instanceof SVGElement) continue;
      const cs = getComputedStyle(el);
      const bi = cs.backgroundImage;
      if (bi && bi !== 'none' && !el.dataset.wfBg) {
        if (/url\(/.test(bi)) { el.dataset.wfBg = 'img'; el.style.setProperty('background-image', X_BG, 'important'); el.style.setProperty('background-color', '#E6E6E6', 'important'); el.classList.add('wf-bgph'); }
        else { el.dataset.wfBg = 'grad'; el.style.setProperty('background-image', 'none', 'important'); }
      }
      if (!done.has(el)) {
        done.add(el);
        const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (m && !el.dataset.wfBg) {
          const v = m[1].split(/[ ,/]+/).map(Number), a = v.length > 3 ? v[3] : 1;
          if (a > 0.05) {
            const L = lum(v[0], v[1], v[2]);
            el.style.setProperty('background-color', L < 0.35 ? '#F0F0F0' : L < 0.75 ? '#E8E8E8' : '#FFFFFF', 'important');
          }
        }
      }
    }
  }

  // 영상·캔버스·iframe → 같은 자리 형제 박스
  const phs = new Map();
  const KIND = { VIDEO: '영상', CANVAS: '캔버스', IFRAME: '임베드' };
  function label(el) {
    if (el.dataset.wfLabel) return el.dataset.wfLabel;
    if (el.tagName === 'CANVAS') {
      let gl = false; try { gl = !!(el.getContext && (el.__wfgl ?? (el.__wfgl = null))); } catch (e) {}
      const r = el.getBoundingClientRect();
      return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9 ? '전체 화면 캔버스 (WebGL · 그래픽)' : '캔버스 (그래픽)';
    }
    if (el.tagName === 'VIDEO') { const s = (el.currentSrc || el.getAttribute('src') || '').split('/').pop(); return (el.closest('#bgv') ? '배경 영상' : '영상') + (s ? ' · ' + decodeURIComponent(s) : ''); }
    return KIND[el.tagName] || '미디어';
  }
  function sync() {
    for (const el of document.querySelectorAll(':is(video, canvas, iframe):not([data-wf-skip])')) {
      let ph = phs.get(el);
      if (!ph) { ph = document.createElement('div'); ph.className = 'wf-ph'; ph.innerHTML = '<b></b>'; el.after(ph); phs.set(el, ph); }
      const cs = getComputedStyle(el);
      const fixed = cs.position === 'fixed';
      if (ph.parentNode !== el.parentNode || ph.previousSibling !== el) el.after(ph);
      ph.style.position = fixed ? 'fixed' : 'absolute';
      ph.style.zIndex = cs.zIndex === 'auto' ? '' : cs.zIndex;
      ph.style.opacity = cs.opacity;
      ph.style.display = cs.display === 'none' ? 'none' : '';
      if (fixed) {
        const r = el.getBoundingClientRect();
        Object.assign(ph.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', transform: '' });
      } else {
        // offsetParent 기준 위치 + 같은 transform
        Object.assign(ph.style, { left: el.offsetLeft + 'px', top: el.offsetTop + 'px', width: el.offsetWidth + 'px', height: el.offsetHeight + 'px', transform: cs.transform === 'none' ? '' : cs.transform, transformOrigin: cs.transformOrigin });
        if (el.offsetParent && ph.offsetParent !== el.offsetParent) { // 부모가 static 이라 기준이 다르면 화면 좌표로
          const r = el.getBoundingClientRect(), pr = ph.offsetParent ? ph.offsetParent.getBoundingClientRect() : { left: -scrollX, top: -scrollY };
          Object.assign(ph.style, { left: (r.left - pr.left) + 'px', top: (r.top - pr.top) + 'px', width: r.width + 'px', height: r.height + 'px', transform: '' });
        }
      }
      const ov = fixed && cs.pointerEvents === 'none' && (parseInt(cs.zIndex) || 0) > 0 && el.offsetWidth >= innerWidth * 0.9;
      ph.classList.toggle('wf-ov', ov);
      ph.firstChild.textContent = ov ? '화면 위 효과 캔버스 (스크롤 왜곡)' : label(el);
      const rr = el.getBoundingClientRect();
      if (rr.width >= innerWidth * 0.9 && rr.height >= innerHeight * 0.9) ph.dataset.full = '1'; else delete ph.dataset.full;
    }
  }
  restyle(); sync();
  let t = 0;
  (function loop(ts) { sync(); if (!t || ts - t > 400) { restyle(); t = ts; } requestAnimationFrame(loop); })();
  addEventListener('scroll', sync, { passive: true, capture: true });

  // ---------- 피그마용 직렬화 ----------
  window.__serialize = function () {
    const out = [], VW = innerWidth, VH = innerHeight;
    const rgb = (s) => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[ ,/]+/).map(Number); const a = v.length > 3 ? v[3] : 1; if (a < 0.03) return null; return { hex: '#' + v.slice(0, 3).map((n) => Math.round(n).toString(16).padStart(2, '0')).join(''), a }; };
    const r1 = (n) => Math.round(n * 10) / 10;
    const vis = (r) => r.width > 0.5 && r.height > 0.5 && r.right > 0 && r.bottom > 0 && r.left < VW && r.top < VH;
    function effOp(el) { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' && e === el) return 0; o *= +cs.opacity; if (e instanceof SVGElement && e.getAttribute('opacity') != null) o *= +e.getAttribute('opacity'); if (o < 0.02) return 0; } return o; }
    function clipped(el, r) { // overflow 숨김 조상 밖이면 true
      for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.overflow !== 'visible' || cs.clipPath !== 'none') {
          const p = e.getBoundingClientRect();
          if (r.right <= p.left || r.left >= p.right || r.bottom <= p.top || r.top >= p.bottom) return true;
        }
      }
      return false;
    }
    const X = (r, op) => {
      out.push({ t: 'line', x1: r1(r.left), y1: r1(r.top), x2: r1(r.right), y2: r1(r.bottom), c: '#cfcfcf', sw: 1, dash: null, arrow: false, op });
      out.push({ t: 'line', x1: r1(r.right), y1: r1(r.top), x2: r1(r.left), y2: r1(r.bottom), c: '#cfcfcf', sw: 1, dash: null, arrow: false, op });
    };
    function svgEl(el, op) {
      const M = el.getScreenCTM(); if (!M) return;
      const cs = getComputedStyle(el), tag = el.tagName.toLowerCase();
      const stroke = cs.stroke !== 'none' ? rgb(cs.stroke) : null, fill = cs.fill !== 'none' ? rgb(cs.fill) : null;
      const sw = r1(Math.max(0.5, (parseFloat(cs.strokeWidth) || 1) * Math.hypot(M.a, M.b)));
      const P = (x, y) => { const q = new DOMPoint(x, y).matrixTransform(M); return [r1(q.x), r1(q.y)]; };
      const r = el.getBoundingClientRect(); if (!vis(r)) return;
      if (tag === 'text' || tag === 'tspan') {
        if ([...el.children].some((c) => c.tagName.toLowerCase() === 'tspan')) return;
        const t = el.textContent.trim(); if (!t) return;
        out.push({ t: 'text', x: r1(r.left - 4), y: r1(r.top), w: r1(r.width + 8), text: t, s: r1(parseFloat(cs.fontSize) * Math.hypot(M.a, M.b)), lh: r1(r.height), c: (fill || { hex: '#222222' }).hex, wt: 400, font: 'sans', al: 'center', ls: 0, op });
        return;
      }
      if (!['path', 'line', 'polyline', 'polygon', 'rect', 'circle', 'ellipse'].includes(tag)) return;
      if (tag === 'rect' && !el.getAttribute('transform') && Math.abs(M.b) < 1e-3) { out.push({ t: 'rect', x: r1(r.left), y: r1(r.top), w: r1(r.width), h: r1(r.height), fill: fill && fill.hex, stroke: stroke && stroke.hex, sw, r: 0, dash: null, op }); return; }
      if ((tag === 'circle' || tag === 'ellipse') && Math.abs(M.b) < 1e-3) { out.push({ t: 'ell', x: r1(r.left), y: r1(r.top), w: r1(r.width), h: r1(r.height), fill: fill && fill.hex, stroke: stroke && stroke.hex, sw, dash: null, op }); return; }
      // 길이를 따라 점을 찍어 다각선으로
      let len = 0; try { len = el.getTotalLength(); } catch (e) { return; }
      if (!len) return;
      const n = Math.min(500, Math.max(2, Math.ceil(len * Math.hypot(M.a, M.b) / 4)));
      let cur = [], prev = null;
      const flush = () => { if (cur.length > 1) out.push(fill && !stroke ? { t: 'poly', pts: cur, fill: fill.hex, stroke: null, sw, op } : { t: 'pl', pts: cur, c: (stroke || fill || { hex: '#222222' }).hex, sw, op, fill: fill && stroke ? fill.hex : null }); cur = []; };
      for (let i = 0; i <= n; i++) {
        const q = el.getPointAtLength(len * i / n), p = P(q.x, q.y);
        if (prev && Math.hypot(p[0] - prev[0], p[1] - prev[1]) > Math.max(24, 3 * len * Math.hypot(M.a, M.b) / n)) flush();
        cur.push(p); prev = p;
      }
      flush();
    }
    let continue_walk = true;
    function walk(el) {
      if (el.nodeType !== 1) return;
      const tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'VIDEO' || tag === 'CANVAS' || tag === 'IFRAME') return;
      const op = effOp(el); if (op < 0.02) return;
      if (el instanceof SVGElement && tag.toLowerCase() !== 'svg') { svgEl(el, op); [...el.children].forEach(walk); return; }
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') { [...el.children].forEach(walk); return; }
      if (vis(r) && el !== document.body && tag.toLowerCase() !== 'svg' && !clipped(el, r)) {
        const bg = rgb(cs.backgroundColor);
        const bw = ['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs['border' + s + 'Width']) || 0);
        const bcol = rgb(cs.borderTopColor) || rgb(cs.borderLeftColor) || rgb(cs.borderBottomColor);
        const rad = parseFloat(cs.borderTopLeftRadius) || 0;
        const allB = bw.every((w) => w > 0 && Math.abs(w - bw[0]) < 0.01) && bcol;
        const round = rad > 0 && rad >= Math.min(r.width, r.height) / 2 - 0.5 && Math.abs(r.width - r.height) < 1;
        if (tag === 'IMG') {
          out.push({ t: 'rect', x: r1(r.left), y: r1(r.top), w: r1(r.width), h: r1(r.height), fill: '#e6e6e6', stroke: '#c4c4c4', sw: 1, r: Math.min(rad, r.height / 2), dash: null, op });
          X(r, op); return;
        }
        if (bg || allB) {
          const o = { x: r1(r.left), y: r1(r.top), w: r1(r.width), h: r1(r.height), fill: bg && bg.hex, stroke: allB ? bcol.hex : null, sw: bw[0], dash: cs.borderTopStyle === 'dashed' ? [6, 5] : cs.borderTopStyle === 'dotted' ? [2, 3] : null, op: op * (bg ? Math.max(bg.a, allB ? 1 : 0) : 1) };
          if (round) out.push({ t: 'ell', ...o }); else out.push({ t: 'rect', ...o, r: Math.min(rad, r.height / 2, r.width / 2) });
        }
        if (!allB) {
          const side = (i, x1, y1, x2, y2, c) => { if (bw[i] && rgb(c)) out.push({ t: 'line', x1: r1(x1), y1: r1(y1), x2: r1(x2), y2: r1(y2), c: rgb(c).hex, sw: bw[i], dash: null, arrow: false, op }); };
          side(0, r.left, r.top + bw[0] / 2, r.right, r.top + bw[0] / 2, cs.borderTopColor);
          side(2, r.left, r.bottom - bw[2] / 2, r.right, r.bottom - bw[2] / 2, cs.borderBottomColor);
          side(3, r.left + bw[3] / 2, r.top, r.left + bw[3] / 2, r.bottom, cs.borderLeftColor);
          side(1, r.right - bw[1] / 2, r.top, r.right - bw[1] / 2, r.bottom, cs.borderRightColor);
        }
        if ((el.classList.contains('wf-ph') && !el.classList.contains('wf-ov')) || el.classList.contains('wf-bgph')) X(r, op);
        // 글자: 직접 텍스트 노드
        const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
        const kids = [...el.children].filter((c) => !['BR', 'WBR'].includes(c.tagName));
        const inlineOnly = kids.every((c) => getComputedStyle(c).display === 'inline' && !c.querySelector('img,svg,canvas,video') && !(rgb(getComputedStyle(c).backgroundColor)));
        if (texts.length || (kids.length && inlineOnly && el.innerText.trim() && [...el.childNodes].some((n) => n.nodeType === 3 || n.nodeType === 1))) {
          const col = rgb(cs.color);
          const fs = parseFloat(cs.fontSize), lh = cs.lineHeight === 'normal' ? fs * 1.25 : parseFloat(cs.lineHeight);
          const base = { s: r1(fs), lh: r1(lh), c: col ? col.hex : '#222222', wt: +cs.fontWeight >= 650 ? 700 : +cs.fontWeight >= 550 ? 600 : +cs.fontWeight >= 450 ? 500 : +cs.fontWeight <= 320 ? 300 : 400, font: /mono/i.test(cs.fontFamily.split(',')[0]) ? 'mono' : 'sans', ls: parseFloat(cs.letterSpacing) || 0, op: op * (col ? col.a : 1) };
          const al = cs.textAlign === 'center' ? 'center' : (cs.textAlign === 'right' || cs.textAlign === 'end') ? 'right' : 'left';
          if (!kids.length || inlineOnly) {
            const pl = parseFloat(cs.paddingLeft) + bw[3], pr = parseFloat(cs.paddingRight) + bw[1], pt = parseFloat(cs.paddingTop) + bw[0];
            const txt = el.innerText.replace(/ /g, ' ').trim();
            const rg = document.createRange(); rg.selectNodeContents(el);
            const lines = [...rg.getClientRects()].reduce((a, q) => (a.some((y) => Math.abs(y - q.top) < 2) ? a : [...a, q.top]), []).length;
            const nw = !txt.includes(String.fromCharCode(10)) && lines <= 1;
            out.push({ t: 'text', x: r1(r.left + pl), y: r1(r.top + pt), w: r1(Math.max(4, r.width - pl - pr) * (nw ? 1 : 1.04) + 2), text: txt, al, nw, ...base });
            continue_walk = false;
          } else {
            for (const tn of texts) {
              const rg = document.createRange(); rg.selectNodeContents(tn);
              const rects = [...rg.getClientRects()];
              const rr = rg.getBoundingClientRect(); if (!vis(rr)) continue;
              const nw = rects.length <= 1;
              out.push({ t: 'text', x: r1(rr.left), y: r1(rr.top + (rr.height > lh * 1.5 ? 0 : (rr.height - lh) / 2)), w: r1(rr.width + 4), text: tn.textContent.replace(/\s+/g, ' ').trim(), al: 'left', nw, ...base });
            }
          }
        }
      }
      if (continue_walk === false) { continue_walk = true; return; }
      [...el.children].forEach(walk);
    }
    walk(document.body);
    return out;
  };
})();
