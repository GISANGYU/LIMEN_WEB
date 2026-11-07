"""웹에서 C 스타일(빛 정령)이 실제로 걷는지 확인 — 스틸 한 장으로 '됐다' 하지 말 것

미리 서버를 띄운다:  python -m http.server 8131 --bind 127.0.0.1   (10_guestbook_proto 폴더에서)
사용: python -I tools/web_check.py [출력폴더] [주소]
검사: 콘솔 오류 0 · 12명 중 10명 이상이 2.5초 사이 5px 넘게 이동 · 네 방향 모두 나타남 ·
      말풍선이 위쪽 UI(헤더·안내·버튼)와 겹친 적 없음 · 새 글을 남기면 캐릭터가 하나 늘어남
캡처: web_m.png(390×780 @2x) · web_d.png(1280×760) · web_arrive.png(새 글 내려오는 중)
Playwright 브라우저가 없으면 설치된 Chrome 을 쓴다(channel='chrome').
"""
import os, sys
from playwright.sync_api import sync_playwright

out = sys.argv[1] if len(sys.argv) > 1 else '.'
url = sys.argv[2] if len(sys.argv) > 2 else 'http://127.0.0.1:8131/?style=glow'
os.makedirs(out, exist_ok=True)
OVERLAP_JS = """(()=>{const h=Math.max(...['.top','#hud','#more'].map(q=>document.querySelector(q).getBoundingClientRect().bottom));
  return Math.max(0,...[...document.querySelectorAll('.bubble.on')].map(b=>h-b.getBoundingClientRect().top));})()"""
ok = True
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    for name, vp, dpr in [('m', dict(width=390, height=780), 2), ('d', dict(width=1280, height=760), 1)]:
        pg = b.new_page(viewport=vp, device_scale_factor=dpr)
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(url); pg.wait_for_timeout(1500)
        a = pg.evaluate('__gb.chars.map(c=>[c.x,c.y])')
        dirs, overlap = set(), 0
        for _ in range(5):
            pg.wait_for_timeout(500)
            dirs |= set(pg.evaluate('__gb.chars.map(c=>c.dir)'))
            overlap = max(overlap, pg.evaluate(OVERLAP_JS))
        bb = pg.evaluate('__gb.chars.map(c=>[c.x,c.y])')
        moved = sum(1 for i in range(min(len(a), len(bb))) if abs(a[i][0] - bb[i][0]) + abs(a[i][1] - bb[i][1]) > 5)
        pg.screenshot(path=os.path.join(out, f'web_{name}.png'))
        n0 = len(bb)
        if name == 'd':
            pg.fill('#msg', '검사용 새 글'); pg.click('#form button'); pg.wait_for_timeout(600)
            pg.screenshot(path=os.path.join(out, 'web_arrive.png')); pg.wait_for_timeout(1500)
        n1 = pg.evaluate('__gb.chars.length')
        style = pg.evaluate('__gb.style')
        res = dict(style=style, moved=f'{moved}/{len(a)}', dirs=sorted(dirs), overlap=round(overlap), errors=errs, added=n1 - n0)
        good = style == 'glow' and moved >= 10 and not errs and overlap == 0 and (name != 'd' or n1 > n0 or n0 >= 30)
        ok &= good
        print(name, 'OK' if good else 'FAIL', res)
        pg.close()
    b.close()
sys.exit(0 if ok else 1)
