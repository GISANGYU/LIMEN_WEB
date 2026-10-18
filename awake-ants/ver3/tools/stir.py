"""커서를 휘저으며 캡처: python -I tools/stir.py 시작초 이름"""
import sys, math
from pathlib import Path
from playwright.sync_api import sync_playwright
start, name = float(sys.argv[1]), sys.argv[2]
OUT = Path(__file__).resolve().parent.parent / "_shots"
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True, args=["--enable-webgl", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width": 1280, "height": 720})
    pg.goto(f"http://127.0.0.1:8765/ref/ants_awake_ver3/?auto&debug&t={start}", wait_until="load")
    pg.wait_for_timeout(2500)
    for i in range(90):
        pg.mouse.move(640 + 330 * math.cos(i / 9), 400 + 150 * math.sin(i / 7)); pg.wait_for_timeout(40)
    pg.screenshot(path=str(OUT / f"{name}.png"))
    print(name, pg.evaluate("window.__ants.t"))
    b.close()
