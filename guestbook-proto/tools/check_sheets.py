"""빛 정령 시트 규격 검사 — 통과 못 하면 완료 보고 금지

사용: python -I tools/check_sheets.py [assets/glow 경로]
검사:
  1. index.json 20종 · id 중복 없음 · 폴더/walk.png 존재
  2. walk.png = 768×512 RGBA
  3. 칸 테두리 2px 알파 최대값 ≤ 10  (번짐이 칸 밖으로 잘리지 않음)
  4. 다리 있는 캐릭터: 정면·옆 각 칸의 발끝(알파>128 최하단 y)이 114~123
  5. 걷기 4프레임이 서로 다름(정지 그림 아님), 정면≠뒷모습, 왼쪽 = 오른쪽 좌우반전
  6. 캐릭터 크기: 몸+다리(알파>128) 높이 28~90px, 폭 20~76px
"""
import json, os, sys
import numpy as np
from PIL import Image

F, COLS, ROWS = 128, 6, 4
root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'glow')
idx = json.load(open(os.path.join(root, 'index.json'), encoding='utf-8'))
fails = []
def bad(cid, msg): fails.append(f'{cid}: {msg}')

if len(idx) != 20: bad('index', f'{len(idx)}종 (20종이어야 함)')
if len({c["id"] for c in idx}) != len(idx): bad('index', 'id 중복')

print(f'{"id":14} {"발끝(정면)":>10} {"몸 높이":>7} {"몸 폭":>6} {"테두리α":>7}')
for c in idx:
    p = os.path.join(root, c['id'], 'walk.png')
    if not os.path.exists(p): bad(c['id'], 'walk.png 없음'); continue
    im = Image.open(p)
    if im.size != (F * COLS, F * ROWS) or im.mode != 'RGBA':
        bad(c['id'], f'크기/모드 {im.size} {im.mode}'); continue
    A = np.asarray(im)[..., 3].astype(np.int32)
    cell = lambda r, k: A[r * F:(r + 1) * F, k * F:(k + 1) * F]
    border = max(int(np.r_[cell(r, k)[:2].ravel(), cell(r, k)[-2:].ravel(), cell(r, k)[:, :2].ravel(), cell(r, k)[:, -2:].ravel()].max())
                 for r in range(ROWS) for k in range(COLS))
    if border > 10: bad(c['id'], f'번짐이 칸 밖으로 잘림 (테두리 α {border})')
    feet = []
    for r in (0, 1):
        for k in range(COLS):
            ys = np.where(cell(r, k).max(axis=1) > 128)[0]
            feet.append(ys.max() if len(ys) else -1)
    body = cell(0, 0) > 128
    ys, xs = np.where(body)
    bh, bw = (ys.max() - ys.min() + 1, xs.max() - xs.min() + 1) if len(ys) else (0, 0)
    legless = min(feet) < 110  # 떠다니는 캐릭터는 발끝 검사 제외
    if not legless and not all(114 <= f <= 123 for f in feet): bad(c['id'], f'발끝 범위 밖 {feet}')
    if not (28 <= bh <= 90 and 20 <= bw <= 76): bad(c['id'], f'몸 크기 {bw}×{bh}')
    walk = [cell(0, k) for k in range(2, 6)]
    if all(np.abs(walk[0] - w).sum() == 0 for w in walk[1:]): bad(c['id'], '걷기 프레임이 모두 같음')
    if np.abs(cell(0, 0) - cell(3, 0)).sum() == 0: bad(c['id'], '정면 = 뒷모습 (얼굴 없는 뒷모습 필요)')
    if np.abs(cell(1, 2)[:, ::-1] - cell(2, 2)).max() > 2: bad(c['id'], '오른쪽이 왼쪽 반전과 다름')
    print(f'{c["id"]:14} {("떠다님" if legless else str(feet[0])):>10} {bh:>7} {bw:>6} {border:>7}')

print()
if fails:
    print('불통과', len(fails)); [print(' -', f) for f in fails]; sys.exit(1)
print('통과: 20종 모두 규격에 맞음')
