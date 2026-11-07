# 10_guestbook_proto — LIMEN 방명록 캐릭터 프로토타입 (2026-11-08)

상태: **테스트 중 / 별도 제안**. 현재 기준 웹 5페이지에 들어 있지 않음. 나중에 LIMEN_WEB 하위 폴더에 올리고 QR로만 들어오게 할 예정이며, 홈페이지에는 링크를 걸지 않음.
이번 판의 범위는 캐릭터 랜덤 생성, 걷기, 말풍선. 방명록 화면 디자인과 DB 저장은 디자인 프로토타입이 나온 뒤에 진행.

## 실행
fetch와 캔버스 픽셀 읽기를 쓰기 때문에 파일을 더블클릭해서 열면 안 되고, 서버로 띄워야 함.
```
python -m http.server 8131 --bind 127.0.0.1
→ http://127.0.0.1:8131/?style=ninja   (A)
→ http://127.0.0.1:8131/?style=lpc     (B)
```

## 구조
- 방명록 글 1개 = 캐릭터 1명. 글 id를 시드로 쓰기 때문에 같은 글은 항상 같은 캐릭터가 됨 (`main.js` `rng()`).
- A Ninja Adventure: `assets/ninja/<이름>_walk.png` (64×64, 열=아래·위·왼·오, 행=걷기 4프레임). 84종 중 하나를 고름.
- B LPC: 몸 → 신발 → 하의 → 상의 → 머리(눈 포함) → 헤어 순서로 겹치고, `assets/lpc/pal/*.json` 팔레트로 색을 바꿈. 시트는 576×256이고 행=위·왼·아래·오, 0번 칸=서 있기, 1~8번 칸=걷기. 조합은 약 38억 가지.
- 글은 지금 localStorage에만 저장됨. 실제 판에서는 Supabase 같은 DB와 욕설 필터·도배 제한·관리자 삭제가 필요함.

## 라이선스
- Ninja Adventure (pixel-boy, AAA): **CC0**. https://pixel-boy.itch.io/ninja-adventure-asset-pack
  (원본 itch.io 팩 대신 GitHub 사본 cianamagtipon/iscs-jrpg 에서 Walk.png·Faceset.png를 받음. ManGreen은 Faceset이 없음.)
- LPC (Universal LPC Spritesheet Character Generator): **CC-BY-SA 3.0 / GPL 3.0 / OGA-BY 3.0**. 공개할 때 작가 표기가 필수.
  파일별 작가 목록: `assets/lpc/CREDITS.csv`. LPC를 고르면 공개 페이지에 크레딧 링크를 넣어야 함.
