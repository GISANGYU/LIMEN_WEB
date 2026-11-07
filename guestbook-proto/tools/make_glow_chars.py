"""빛 정령 캐릭터 20종 걷기 스프라이트 시트 생성기 (기준판, 2026-11-08)

레퍼런스(캡스톤/방명록/캐릭터.jpg)의 '무드'만 따른다: 몸 전체가 은은히 빛나는 말랑한 덩어리,
파랑→라벤더 그라데이션, 에어브러시 번짐, 하얀 점 눈, 가는 막대 다리.
레퍼런스의 다섯 캐릭터 모양을 그대로 따라 그리지 않는다 — 모양은 여기서 새로 정의한다.

출력 규격 (웹이 읽는 형식, 바꾸면 main.js GLOW 도 같이 바꿀 것)
  assets/glow/<id>/walk.png   768×512 = 6열 × 4행, 한 칸 128×128, 투명 배경
    열 0~1  : 서 있기(숨쉬기 2프레임)
    열 2~5  : 걷기 4프레임
    행 0 아래(정면) · 1 왼쪽 · 2 오른쪽 · 3 위(뒷모습)
    발끝 기준선 y = 120 (칸 안), 가로 중심 x = 64
  assets/glow/index.json      [{id, name, top}]  top = 머리 꼭대기 y(말풍선 위치용)
  assets/glow/_preview.png    20종 정면 모아 보기
  assets/glow/_walk.gif       20종 정면 걷기 미리보기

실행: python -I tools/make_glow_chars.py   (10_guestbook_proto 폴더에서)
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.environ.get('GLOW_OUT') or os.path.join(ROOT, 'assets', 'glow')
SS = 3                      # 슈퍼샘플 배율
F = 128                     # 한 칸 크기
FOOT = 120                  # 발끝 y
COLS, ROWS = 6, 4

# ---------- 색 ----------
def hexrgb(h):
    h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32)

PALETTES = {  # (위, 가운데, 아래)
    'sky':      ('#4f9dff', '#b9a8ff', '#5aa8ff'),
    'ice':      ('#86cfff', '#cdbcff', '#8fd8ff'),
    'mint':     ('#6ff0d8', '#93b8ff', '#5aa8ff'),
    'lilac':    ('#b5a6ff', '#efc2ff', '#9aa5ff'),
    'deep':     ('#3f74ff', '#86b4ff', '#b8a8ff'),
    'dawn':     ('#9fb4ff', '#ffc9ec', '#b5a6ff'),
}

# ---------- 캐릭터 정의 (모양 · 크기 · 색 · 표정) ----------
# legs: 다리 유무 · arms: 팔 뭉치 · eyes: dot/almond/sleepy/big/wink · mouth: none/smile/line/o
CHARS = [
    dict(id='01_drop',     name='물방울',   shape='drop',     w=40, h=50, pal='sky',   eyes='almond', mouth='none',  arms=True),
    dict(id='02_bean',     name='콩깍지',   shape='apple',    w=46, h=50, pal='ice',   eyes='dot',    mouth='o'),
    dict(id='03_peanut',   name='땅콩',     shape='peanut',   w=36, h=58, pal='lilac', eyes='big',    mouth='smile', knot=True),
    dict(id='04_pear',     name='배',       shape='pear',     w=48, h=58, pal='deep',  eyes='dot',    mouth='line'),
    dict(id='05_orb',      name='빛구슬',   shape='ball',     w=44, h=44, pal='ice',   eyes='dot',    mouth='none',  legs=False),
    dict(id='06_onion',    name='양파',     shape='onion',    w=44, h=50, pal='mint',  eyes='sleepy', mouth='smile'),
    dict(id='07_bell',     name='종',       shape='bell',     w=46, h=50, pal='dawn',  eyes='dot',    mouth='o'),
    dict(id='08_egg',      name='달걀',     shape='egg',      w=38, h=54, pal='sky',   eyes='big',    mouth='none'),
    dict(id='09_mochi',    name='찹쌀떡',   shape='mochi',    w=56, h=38, pal='lilac', eyes='sleepy', mouth='line'),
    dict(id='10_cloud',    name='구름',     shape='cloud',    w=58, h=42, pal='ice',   eyes='dot',    mouth='smile'),
    dict(id='11_sprout',   name='새싹',     shape='sprout',   w=42, h=44, pal='mint',  eyes='big',    mouth='smile', leaf=True),
    dict(id='12_flame',    name='불꽃',     shape='flame',    w=42, h=56, pal='deep',  eyes='almond', mouth='none',  arms=True),
    dict(id='13_pill',     name='알약',     shape='pill',     w=30, h=58, pal='dawn',  eyes='dot',    mouth='line'),
    dict(id='14_onigiri',  name='주먹밥',   shape='onigiri',  w=50, h=46, pal='sky',   eyes='dot',    mouth='o'),
    dict(id='15_mushroom', name='버섯',     shape='mushroom', w=56, h=52, pal='lilac', eyes='dot',    mouth='smile'),
    dict(id='16_cat',      name='고양이귀', shape='cat',      w=44, h=46, pal='ice',   eyes='almond', mouth='none'),
    dict(id='17_ghost',    name='유령',     shape='ghost',    w=44, h=52, pal='dawn',  eyes='big',    mouth='o',     legs=False),
    dict(id='18_jelly',    name='해파리',   shape='jelly',    w=52, h=40, pal='mint',  eyes='sleepy', mouth='none',  antenna=3),
    dict(id='19_star',     name='별사탕',   shape='star',     w=50, h=48, pal='deep',  eyes='dot',    mouth='smile'),
    dict(id='20_lantern',  name='등불',     shape='lantern',  w=40, h=52, pal='sky',   eyes='wink',   mouth='smile', knot=True),
]

# ---------- 그리기 도우미 (칸 좌표 → 슈퍼샘플 좌표) ----------
def S(v): return v * SS

def ell(d, cx, cy, rx, ry, fill=255):
    d.ellipse([S(cx - rx), S(cy - ry), S(cx + rx), S(cy + ry)], fill=fill)

def poly(d, pts, fill=255):
    d.polygon([(S(x), S(y)) for x, y in pts], fill=fill)

def rrect(d, x0, y0, x1, y1, r, fill=255):
    d.rounded_rectangle([S(x0), S(y0), S(x1), S(y1)], radius=S(r), fill=fill)

def body_mask(c, cx, bottom, sx=1.0, sy=1.0):
    """몸 모양 마스크. bottom = 몸 아랫단 y. sx·sy = 숨쉬기/옆모습 눌림."""
    m = Image.new('L', (S(F), S(F)), 0)
    d = ImageDraw.Draw(m)
    w, h = c['w'] * sx, c['h'] * sy
    top = bottom - h
    sh = c['shape']
    if sh == 'drop':
        r = w / 2; ell(d, cx, bottom - r, r, r)
        poly(d, [(cx, top), (cx - r * 0.93, bottom - r * 1.25), (cx + r * 0.93, bottom - r * 1.25)])
        ell(d, cx, bottom - r * 1.15, r * 0.93, r * 0.6)
    elif sh == 'apple':
        ell(d, cx, bottom - h * 0.42, w / 2, h * 0.42)
        ell(d, cx - w * 0.2, top + h * 0.3, w * 0.3, h * 0.3); ell(d, cx + w * 0.2, top + h * 0.3, w * 0.3, h * 0.3)
    elif sh == 'peanut':
        ell(d, cx, bottom - h * 0.27, w / 2, h * 0.27)
        ell(d, cx, top + h * 0.3, w * 0.43, h * 0.3)
        ell(d, cx, top + h * 0.55, w * 0.36, h * 0.12)
    elif sh == 'pear':
        ell(d, cx, bottom - h * 0.3, w / 2, h * 0.3)
        ell(d, cx, top + h * 0.25, w * 0.3, h * 0.25)
        poly(d, [(cx - w * 0.3, top + h * 0.3), (cx + w * 0.3, top + h * 0.3), (cx + w * 0.48, bottom - h * 0.32), (cx - w * 0.48, bottom - h * 0.32)])
    elif sh == 'ball':
        ell(d, cx, bottom - h / 2, w / 2, h / 2)
    elif sh == 'onion':
        ell(d, cx, bottom - h * 0.4, w / 2, h * 0.4)
        poly(d, [(cx + w * 0.06, top), (cx - w * 0.22, top + h * 0.32), (cx + w * 0.22, top + h * 0.32)])
    elif sh == 'bell':
        ell(d, cx, top + h * 0.35, w * 0.36, h * 0.35)
        poly(d, [(cx - w * 0.36, top + h * 0.35), (cx + w * 0.36, top + h * 0.35), (cx + w * 0.5, bottom - h * 0.06), (cx - w * 0.5, bottom - h * 0.06)])
        ell(d, cx, bottom - h * 0.08, w * 0.5, h * 0.08)
    elif sh == 'egg':
        ell(d, cx, bottom - h * 0.36, w / 2, h * 0.36)
        ell(d, cx, top + h * 0.4, w * 0.4, h * 0.4)
    elif sh == 'mochi':
        rrect(d, cx - w / 2, top, cx + w / 2, bottom, h * 0.48)
    elif sh == 'cloud':
        ell(d, cx, bottom - h * 0.3, w / 2, h * 0.3)
        ell(d, cx - w * 0.22, top + h * 0.42, w * 0.24, h * 0.3); ell(d, cx + w * 0.2, top + h * 0.38, w * 0.27, h * 0.34)
        ell(d, cx, top + h * 0.3, w * 0.22, h * 0.3)
    elif sh == 'sprout':
        ell(d, cx, bottom - h / 2, w / 2, h / 2)
    elif sh == 'flame':
        r = w / 2; ell(d, cx, bottom - r, r, r)
        poly(d, [(cx + w * 0.04, top), (cx - r * 0.9, bottom - r * 1.2), (cx + r * 0.9, bottom - r * 1.2)])
        poly(d, [(cx - w * 0.36, top + h * 0.22), (cx - r * 0.95, bottom - r * 0.9), (cx - r * 0.2, bottom - r * 1.4)])
        poly(d, [(cx + w * 0.38, top + h * 0.3), (cx + r * 0.95, bottom - r * 0.9), (cx + r * 0.2, bottom - r * 1.4)])
    elif sh == 'pill':
        rrect(d, cx - w / 2, top, cx + w / 2, bottom, w / 2)
    elif sh == 'onigiri':
        r = w * 0.2
        for px, py in [(cx, top + r), (cx - w / 2 + r, bottom - r), (cx + w / 2 - r, bottom - r)]:
            ell(d, px, py, r, r)
        poly(d, [(cx, top), (cx - w / 2, bottom - r), (cx - w / 2 + r, bottom), (cx + w / 2 - r, bottom), (cx + w / 2, bottom - r)])
        ell(d, cx, bottom - h * 0.36, w * 0.4, h * 0.34)
    elif sh == 'mushroom':
        rrect(d, cx - w * 0.3, top + h * 0.4, cx + w * 0.3, bottom, w * 0.22)
        d.pieslice([S(cx - w / 2), S(top), S(cx + w / 2), S(top + h * 0.95)], 180, 360, fill=255)
        ell(d, cx, top + h * 0.47, w / 2, h * 0.08)
    elif sh == 'cat':
        ell(d, cx, bottom - h * 0.42, w / 2, h * 0.42)
        poly(d, [(cx - w * 0.42, top), (cx - w * 0.46, top + h * 0.42), (cx - w * 0.08, top + h * 0.25)])
        poly(d, [(cx + w * 0.42, top), (cx + w * 0.46, top + h * 0.42), (cx + w * 0.08, top + h * 0.25)])
    elif sh == 'ghost':  # 둥근 머리 + 한쪽으로 휘며 가늘어지는 꼬리 (떠다님)
        ell(d, cx, top + w * 0.46, w / 2, w * 0.46)
        poly(d, [(cx - w / 2, top + w * 0.5), (cx + w / 2, top + w * 0.5), (cx + w * 0.3, bottom - h * 0.12), (cx + w * 0.42, bottom)])
        ell(d, cx + w * 0.02, top + w * 0.72, w * 0.44, h * 0.22)
    elif sh == 'jelly':
        d.pieslice([S(cx - w / 2), S(top), S(cx + w / 2), S(top + h * 2)], 180, 360, fill=255)
        rrect(d, cx - w / 2, top + h * 0.7, cx + w / 2, bottom, h * 0.25)
    elif sh == 'star':
        rr = min(w, h) * 0.2
        ccy = bottom - h * 0.48
        for k in range(5):
            a = -math.pi / 2 + k * 2 * math.pi / 5
            ell(d, cx + math.cos(a) * w * 0.3, ccy + math.sin(a) * h * 0.32, rr, rr)
        ell(d, cx, ccy, w * 0.34, h * 0.34)
    elif sh == 'lantern':
        ell(d, cx, bottom - h * 0.44, w / 2, h * 0.44)
        rrect(d, cx - w * 0.22, top + h * 0.02, cx + w * 0.22, top + h * 0.16, 2)
    return m

def mask_bbox_top(m):
    a = np.asarray(m); ys = np.where(a.max(axis=1) > 40)[0]
    return ys.min() / SS if len(ys) else 0

# ---------- 이미지 생성 그림 끼우기 ----------
# assets/glow_art/<id>/front.png · side.png(왼쪽을 봄) · back.png 가 있으면 코드 몸통 대신 그 그림을 쓴다.
# 그림 규칙: 투명 배경 RGBA, 몸통만(다리 없음 — 다리는 코드가 그린다), 번짐(글로우)은 넣지 않음(코드가 넣는다).
# 얼굴은 그림에 넣어도 되고(기본), 코드 얼굴을 쓰려면 meta.json 에 {"face_in_art": false}.
# 검은 바탕 그림은 tools/art_to_alpha.py 로 먼저 투명 배경으로 바꾼다.
ART = os.environ.get('GLOW_ART') or os.path.join(ROOT, 'assets', 'glow_art')
_art_cache = {}

def load_art(cid, view):
    name = {'front': 'front', 'left': 'side', 'back': 'back'}[view]
    key = (cid, name)
    if key not in _art_cache:
        pth = os.path.join(ART, cid, name + '.png')
        im = Image.open(pth).convert('RGBA') if os.path.exists(pth) else None
        if im is not None:
            bb = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
            im = im.crop(bb) if bb else im
        _art_cache[key] = im
    return _art_cache[key]

def art_meta(cid):
    pth = os.path.join(ART, cid, 'meta.json')
    return json.load(open(pth, encoding='utf-8')) if os.path.exists(pth) else {}

def blink_art(art, cid, view):
    """지정한 눈 영역만 몸 색으로 메우고 감긴 눈을 그린다. 원본 파일은 보존한다."""
    name = 'side' if view == 'left' else view
    boxes = art_meta(cid).get('blink_eyes', {}).get(name, [])
    if not boxes or view == 'back':
        return art
    pixels = np.array(art).astype(np.float32)
    height, width = pixels.shape[:2]
    strokes = []
    for box in boxes:
        x0, y0, x1, y1 = [round(v * size) for v, size in zip(box, (width, height, width, height))]
        x0, x1 = max(0, x0), min(width, x1)
        y0, y1 = max(1, y0), min(height - 1, y1)
        if x1 <= x0 or y1 <= y0:
            continue
        # 눈 위아래의 같은 x 위치를 보간해 몸 그라데이션과 알파를 유지한다.
        upper = pixels[max(0, y0 - 5):y0, x0:x1].mean(axis=0)
        lower = pixels[y1:min(height, y1 + 5), x0:x1].mean(axis=0)
        blend = np.linspace(0, 1, y1 - y0)[:, None, None]
        pixels[y0:y1, x0:x1] = upper[None] * (1 - blend) + lower[None] * blend
        strokes.append((x0, y0, x1, y1))
    result = Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8), 'RGBA')
    draw = ImageDraw.Draw(result)
    for x0, y0, x1, y1 in strokes:
        cy = (y0 + y1) / 2
        inset = (x1 - x0) * 0.18
        draw.line([(x0 + inset, cy), (x1 - inset, cy)], fill=(250, 252, 255, 250),
                  width=max(2, round((y1 - y0) * 0.14)))
    return result

def place_art(art, c, cx, bottom, sx, sy):
    """그림을 몸 크기(c['h'])에 맞춰 아랫단 정렬로 놓는다. 반환: (마스크 L, 그림 층 RGBA, 꼭대기 y)"""
    base_w = art.width * c['h'] / art.height        # 비율 유지한 기본 폭
    th, tw = c['h'] * sy, min(base_w * sx, F * 0.6)  # 숨쉬기·걸음 눌림 적용, 번짐이 칸 밖으로 안 나가게 폭 제한
    im = art.resize((max(1, round(S(tw))), max(1, round(S(th)))), Image.LANCZOS)
    layer = Image.new('RGBA', (S(F), S(F)), (0, 0, 0, 0))
    layer.alpha_composite(im, (round(S(cx) - im.width / 2), round(S(bottom) - im.height)))
    return layer.getchannel('A'), layer, bottom - th

# ---------- 프레임 하나 ----------
def render_frame(c, view, col, rng_noise):
    """view: front/left/back. col: 0~5"""
    legs = c.get('legs', True)
    idle = col < 2
    k = col - 2
    # 몸 위치·눌림
    if legs:
        leg_len = 16 if c['h'] < 46 else 14
        bob = (0, -1)[col] if idle else (-2, 0, -2, 0)[k]
        bottom = FOOT - leg_len + bob
    else:
        bob = (0, -2)[col] if idle else (-6, -3, 0, -3)[k]
        bottom = FOOT - 10 + bob
    sy = (1.0, 1.035)[col] if idle else (1.0, 0.97, 1.0, 0.97)[k]
    sx = (1.0, 0.985)[col] if idle else (1.0, 1.03, 1.0, 1.03)[k]
    if view == 'left':
        sx *= 0.88
    cx = 64

    art = load_art(c['id'], view)
    art_layer = None
    if art is not None:
        if col == 1:
            art = blink_art(art, c['id'], view)
        m, art_layer, top = place_art(art, c, cx, bottom, sx, sy)
    else:
        m = body_mask(c, cx, bottom, sx, sy)
        top = mask_bbox_top(m)
    w, h = c['w'] * sx, c['h'] * sy

    canvas = Image.new('RGBA', (S(F), S(F)), (0, 0, 0, 0))
    pal = [hexrgb(x) for x in PALETTES[c['pal']]]
    glowc = tuple(int(v) for v in (pal[1] * 0.6 + pal[0] * 0.4))

    # 1) 번짐(글로우): 몸을 크게 흐린 것 + 에어브러시 알갱이
    g = m.filter(ImageFilter.GaussianBlur(S(11)))
    ga = np.asarray(g).astype(np.float32) / 255.0
    ga = np.clip(ga * 0.85, 0, 1) * (0.55 + 0.9 * rng_noise)
    glow = np.zeros((S(F), S(F), 4), np.float32)
    glow[..., :3] = glowc; glow[..., 3] = np.clip(ga, 0, 1) * 255 * 0.8
    canvas = Image.alpha_composite(canvas, Image.fromarray(glow.astype(np.uint8), 'RGBA'))

    d = ImageDraw.Draw(canvas)
    legc = tuple(int(v) for v in np.minimum(255, pal[2] * 0.55 + 255 * 0.45)) + (255,)

    # 2) 다리
    if legs:
        hip_y = bottom - 3
        if view in ('front', 'back'):
            off = max(5, w * 0.16)
            lift = ((0, 0), (0, 0))[col] if idle else ((-5, 0), (0, 0), (0, -5), (0, 0))[k]
            for side, lf in zip((-1, 1), lift):
                fx = cx + side * off
                fy = FOOT + lf
                d.line([(S(fx), S(hip_y)), (S(fx + side * 0.5), S(fy - 1))], fill=legc, width=round(S(2.6)))
                ell(d, fx + side * 1.6, fy - 0.8, 3.0, 1.6, fill=legc)
        else:  # 옆모습: 다리가 앞뒤로 흔들린다 (왼쪽을 본다 → 앞 = -x)
            sw = (0, 0) if idle else ((-6, 6), (0, 0), (6, -6), (0, 0))[k]
            lifts = (0, 0) if idle else ((0, -3), (-2, 0), (-3, 0), (0, -2))[k]
            for i, (s_, lf) in enumerate(zip(sw, lifts)):
                hx = cx + (i * 2 - 1) * 2
                fx, fy = hx + s_, FOOT + lf
                d.line([(S(hx), S(hip_y)), (S(fx), S(fy - 1))], fill=legc, width=round(S(2.6)))
                ell(d, fx - 1.6, fy - 0.8, 3.0, 1.6, fill=legc)

    # 3) 몸: 그림이 있으면 그림, 없으면 세로 3색 그라데이션 + 위쪽 안쪽 밝은 빛 + 가장자리 부드럽게
    if art_layer is not None:
        canvas = Image.alpha_composite(canvas, art_layer)
        return finish_frame(c, canvas, view, col, idle, k, cx, top, bottom, w, pal, from_art=True)
    soft = m.filter(ImageFilter.GaussianBlur(S(1.6)))
    ys = np.linspace(0, 1, S(F))[:, None]
    t = np.clip((np.arange(S(F))[:, None] / SS - top) / max(1, (bottom - top)), 0, 1)
    t = np.repeat(t, S(F), axis=1)
    col_img = np.where(t[..., None] < 0.5,
                       pal[0] + (pal[1] - pal[0]) * (t[..., None] / 0.5),
                       pal[1] + (pal[2] - pal[1]) * ((t[..., None] - 0.5) / 0.5))
    yy, xx = np.mgrid[0:S(F), 0:S(F)] / SS
    hl_cx = cx + (-w * 0.12 if view == 'left' else 0)
    hl = np.exp(-(((xx - hl_cx) / (w * 0.42)) ** 2 + ((yy - (top + (bottom - top) * 0.38)) / ((bottom - top) * 0.42)) ** 2))
    col_img = col_img + (255 - col_img) * (hl[..., None] * 0.14)
    a = np.asarray(soft).astype(np.float32) / 255.0
    # 가장자리로 갈수록 살짝 투명 → 에어브러시 느낌
    inner = np.asarray(m.filter(ImageFilter.GaussianBlur(S(5)))).astype(np.float32) / 255.0
    a = a * (0.72 + 0.28 * inner) * (0.93 + 0.07 * rng_noise)
    body = np.zeros((S(F), S(F), 4), np.float32)
    body[..., :3] = np.clip(col_img, 0, 255); body[..., 3] = np.clip(a, 0, 1) * 255
    canvas = Image.alpha_composite(canvas, Image.fromarray(body.astype(np.uint8), 'RGBA'))

    return finish_frame(c, canvas, view, col, idle, k, cx, top, bottom, w, pal, from_art=False)

def finish_frame(c, canvas, view, col, idle, k, cx, top, bottom, w, pal, from_art):
    d = ImageDraw.Draw(canvas)
    if from_art:  # 덧붙이는 그림에 들어 있다고 본다
        if art_meta(c['id']).get('face_in_art', True) or view == 'back':
            return canvas.resize((F, F), Image.LANCZOS), top
    # 3-1) 덧붙이 (꼭지 구슬 · 새싹 잎 · 해파리 더듬이 · 팔)
    light = tuple(int(v) for v in np.minimum(255, pal[0] * 0.5 + 255 * 0.5)) + (235,)
    if c.get('knot') and not from_art:
        ell(d, cx, top - 4.5, 3.2, 3.2, fill=light)
        d.line([(S(cx), S(top - 2)), (S(cx), S(top + 1))], fill=light, width=round(S(1.4)))
    if c.get('leaf') and not from_art:
        mint = (140, 245, 220, 240)
        d.line([(S(cx), S(top + 1)), (S(cx), S(top - 6))], fill=mint, width=round(S(1.6)))
        ell(d, cx - 4.5, top - 7.5, 4.5, 2.4, fill=mint); ell(d, cx + 4.5, top - 8.5, 4.5, 2.4, fill=mint)
    if c.get('antenna') and not from_art:
        for i in range(c['antenna']):
            ax = cx + (i - (c['antenna'] - 1) / 2) * w * 0.28
            d.line([(S(ax), S(top + 3)), (S(ax), S(top - 6))], fill=light, width=round(S(1.3)))
            ell(d, ax, top - 7, 2.2, 2.2, fill=light)
    if c.get('arms') and view != 'back' and not from_art:
        swing = 0 if idle else (1.5, 0, -1.5, 0)[k]
        ay = bottom - (bottom - top) * 0.32
        armc = tuple(int(v) for v in pal[1] * 0.7 + pal[2] * 0.3) + (225,)
        sides = (-1, 1) if view == 'front' else (1,)
        for side in sides:
            ell(d, cx + side * (w * 0.5 + 1.5), ay + swing * side, 2.6, 4.2, fill=armc)

    # 4) 얼굴 (뒷모습은 없음)
    if view != 'back':
        ey = top + (bottom - top) * (0.5 if c['shape'] not in ('drop', 'flame', 'onion', 'mushroom', 'jelly') else 0.6)
        if c['shape'] in ('mushroom',): ey = top + (bottom - top) * 0.66
        gap = max(5.5, w * 0.17)
        if view == 'left':
            ex = [cx - w * 0.2 - gap * 0.55, cx - w * 0.2 + gap * 0.45]
            sc = [1.0, 0.75]
        else:
            ex = [cx - gap, cx + gap]; sc = [1.0, 1.0]
        white = (250, 252, 255, 250)
        blink = (col == 1)  # 숨쉬기 두 번째 프레임에서 눈 깜빡
        for x, s_ in zip(ex, sc):
            st = c['eyes']
            if blink or st == 'sleepy' or (st == 'wink' and x == ex[-1] and view == 'front'):
                d.line([(S(x - 2.6 * s_), S(ey)), (S(x + 2.6 * s_), S(ey))], fill=white, width=round(S(1.3)))
            elif st == 'dot':
                ell(d, x, ey, 2.2 * s_, 2.4, fill=white)
            elif st == 'big':
                ell(d, x, ey, 3.0 * s_, 3.4, fill=white)
            elif st == 'almond':
                tilt = 1.2 if x > cx else -1.2
                if view == 'left': tilt = -1.2
                poly(d, [(x - 3.4 * s_, ey + tilt), (x, ey - 1.8), (x + 3.4 * s_, ey - tilt), (x, ey + 1.8)], fill=white)
            elif st == 'wink':
                ell(d, x, ey, 2.4 * s_, 2.6, fill=white)
        mx = (ex[0] + ex[1]) / 2 + (-1 if view == 'left' else 0)
        my = ey + 6.5
        mo = c['mouth']
        if mo == 'smile':
            d.arc([S(mx - 2.6), S(my - 2.6), S(mx + 2.6), S(my + 1.2)], 20, 160, fill=white, width=round(S(1.1)))
        elif mo == 'line':
            d.line([(S(mx - 4.5), S(my + 1)), (S(mx + 4.5), S(my + 1))], fill=white, width=round(S(1.2)))
        elif mo == 'o':
            ell(d, mx, my, 1.4, 1.6, fill=white)

    # 5) 눈 둘레 은은한 빛 한 겹 더
    out = canvas.resize((F, F), Image.LANCZOS)
    return out, top

def make_char(c, seed):
    rs = np.random.default_rng(seed)
    noise = rs.random((S(F), S(F))).astype(np.float32)
    noise = np.asarray(Image.fromarray((noise * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))).astype(np.float32) / 255
    sheet = Image.new('RGBA', (F * COLS, F * ROWS), (0, 0, 0, 0))
    tops = []
    for row, view in enumerate(('front', 'left', 'right', 'back')):
        for col in range(COLS):
            if view == 'right':
                fr = sheet.crop((col * F, 1 * F, col * F + F, 2 * F)).transpose(Image.FLIP_LEFT_RIGHT)
            else:
                fr, top = render_frame(c, view, col, noise)
                if view == 'front' and col == 0: tops.append(top)
            sheet.paste(fr, (col * F, row * F))
    return sheet, tops[0]

def main():
    os.makedirs(OUT, exist_ok=True)
    index = []
    fronts, gifs = [], [[] for _ in range(4)]
    for i, c in enumerate(CHARS):
        sheet, top = make_char(c, 1000 + i)
        d = os.path.join(OUT, c['id']); os.makedirs(d, exist_ok=True)
        sheet.save(os.path.join(d, 'walk.png'), optimize=True)
        index.append(dict(id=c['id'], name=c['name'], top=round(top, 1)))
        fronts.append(sheet.crop((0, 0, F, F)))
        for k in range(4):
            gifs[k].append(sheet.crop(((2 + k) * F, 0, (3 + k) * F, F)))
        print('ok', c['id'], 'top', round(top, 1))
    json.dump(index, open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    # 미리보기: 남색 바탕 5×4
    bg = (12, 16, 48, 255)
    pv = Image.new('RGBA', (F * 5, F * 4), bg)
    for i, fr in enumerate(fronts):
        pv.alpha_composite(fr, ((i % 5) * F, (i // 5) * F))
    pv.convert('RGB').save(os.path.join(OUT, '_preview.png'))
    frames = []
    for k in range(4):
        im = Image.new('RGBA', (F * 5, F * 4), bg)
        for i, fr in enumerate(gifs[k]):
            im.alpha_composite(fr, ((i % 5) * F, (i // 5) * F))
        frames.append(im.convert('RGB'))
    # 어두운 바탕이 팔레트를 독점하지 않게 실제 캐릭터 색으로 공통 팔레트를 만든다.
    samples = []
    for frame in frames:
        rgb = np.asarray(frame)
        samples.append(rgb[np.max(np.abs(rgb.astype(int) - np.array(bg[:3])), axis=2) > 8])
    colors = np.concatenate(samples + [np.array([bg[:3]], dtype=np.uint8)])
    palette = Image.fromarray(colors.reshape(-1, 1, 3), 'RGB').quantize(colors=256)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG) for frame in frames]
    indexed[0].save(os.path.join(OUT, '_walk.gif'), save_all=True, append_images=indexed[1:], duration=110, loop=0)

if __name__ == '__main__':
    main()
