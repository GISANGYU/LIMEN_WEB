# 10_guestbook_proto — LIMEN 방명록 캐릭터 프로토타입 (2026-11-08)

상태: **테스트 중 / 별도 제안**. 현재 기준 웹 5페이지에 들어 있지 않음. 나중에 LIMEN_WEB 하위 폴더에 올리고 QR로만 들어오게 할 예정이며, 홈페이지에는 링크를 걸지 않음.
이번 판의 범위는 캐릭터 랜덤 생성, 걷기, 말풍선. 방명록 화면 디자인과 DB 저장은 디자인 프로토타입이 나온 뒤에 진행.

## 무드 (11-08 v2, LIMEN 웹에 맞춤)
- 배경은 LIMEN 웹 색을 따름: 남색 밤 들판(#0b1240 → #182467 → #070b26)에 라벤더 #b5a6ff · 민트 #6ff0d8 빛, Heebo·Pretendard, 유리 패널, 로고 `assets/limen-logo.svg`.
- 반딧불이는 처음엔 제각각 깜빡이다가 점점 박자가 맞아 감(약한 동조).
- 캐릭터 발밑에 빛 웅덩이가 있고, 전체에 라벤더 multiply를 입혀 픽셀 캐릭터가 밤 화면에 녹아들게 함.
- 새 글은 빛 한 점이 위에서 내려와 터지고, 그 자리에서 캐릭터가 깨어남.
- '머물다 간 한 마디' 같은 문구는 가안. '흔적' 표현은 웹 기준 금지어라 쓰지 않음.
- v1 잔디판은 LIMEN_WEB 커밋 f6ab6bc 에 남아 있음.

## C 빛 정령 (11-08 v3, 기본 스타일)
- 레퍼런스 `캡스톤\방명록\캐릭터.jpg` 의 무드만 따른 오리지널 20종. 지금은 코드로 그린 기준판(`tools/make_glow_chars.py`)이고, 이미지 생성판으로 바꾸는 작업은 Codex에게 넘김.
- 인수인계 문서: `캡스톤\방명록\CODEX_인수인계_빛정령캐릭터.md` (규격·파이프라인·검사·배포가 다 들어 있음)
- 검사: `tools/check_sheets.py`(시트 규격) · `tools/web_check.py`(웹 동작)

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
