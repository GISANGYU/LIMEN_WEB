"""헤드리스 크롬으로 구간별 캡처.
python -I tools/shoot.py "51:10,51:18,51:26" [이름접두어]
  각 항목 = 시작시각:기다릴초. 같은 시작시각이 이어지면 페이지를 다시 열지 않고 이어서 찍는다.
서버: LIMEN_WEB_CLONES 루트에서 python -m http.server 8765 --bind 127.0.0.1
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

plan = [tuple(float(v) for v in x.split(":")) for x in sys.argv[1].split(",")]
prefix = sys.argv[2] if len(sys.argv) > 2 else "shot"
OUT = Path(__file__).resolve().parent.parent / "_shots"
OUT.mkdir(exist_ok=True)
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    pg.on("console", lambda m: errors.append(m.type + ": " + m.text[:200]) if m.type in ("error", "warning", "info") else None)
    cur, waited = None, 0
    for start, wait in plan:
        if start != cur:
            pg.goto(f"http://127.0.0.1:8765/ref/ants_awake_ver3/?auto&debug&t={start}", wait_until="load")
            cur, waited = start, 0
        pg.wait_for_timeout(int((wait - waited) * 1000))
        waited = wait
        t = pg.evaluate("window.__ants ? window.__ants.t : -1")
        f = OUT / f"{prefix}_{start:g}_{wait:g}.png"
        pg.screenshot(path=str(f))
        print(f.name, "t=%.2f" % t)
    b.close()
for e in errors:
    print(e)
