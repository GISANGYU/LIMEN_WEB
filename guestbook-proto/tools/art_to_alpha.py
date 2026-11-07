"""검은 바탕에 그린 '빛나는' 그림 → 투명 배경 RGBA (이미지 생성 결과 정리용)

빛 그림은 검은 바탕 위에 '더해진' 빛이라고 보고, 밝기를 알파로 뽑는다.
  alpha = 가장 밝은 채널, 색 = rgb / alpha (프리멀티 풀기)
번짐(글로우)까지 같이 뽑히므로, 몸통만 남기려면 --cut 으로 약한 번짐을 잘라 낸다.

사용: python -I tools/art_to_alpha.py 입력.png 출력.png [--cut 0.18] [--black 12]
  --black : 이 값(0~255) 이하 밝기는 완전 투명 (바탕 노이즈 제거)
  --cut   : 알파가 이 값(0~1) 이하인 번짐을 깎아 몸 윤곽만 남김 (0 이면 번짐 유지)
"""
import sys
import numpy as np
from PIL import Image

def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print(__doc__); sys.exit(1)
    src, dst = args[0], args[1]
    cut = float(args[args.index('--cut') + 1]) if '--cut' in args else 0.18
    black = float(args[args.index('--black') + 1]) if '--black' in args else 12
    rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    a = rgb.max(axis=2)
    a = np.clip((a - black) / (255 - black), 0, 1)
    if cut > 0:
        a = np.clip((a - cut) / (1 - cut), 0, 1)
    col = np.where(a[..., None] > 1e-3, np.clip(rgb / np.maximum(rgb.max(axis=2, keepdims=True), 1) * 255, 0, 255), 0)
    out = np.dstack([col, a * 255]).astype(np.uint8)
    im = Image.fromarray(out, 'RGBA')
    bb = im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    (im.crop(bb) if bb else im).save(dst)
    print('saved', dst, im.size, '→', bb)

if __name__ == '__main__':
    main()
