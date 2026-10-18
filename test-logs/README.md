# SNOOZE / Test logs

LIMEN 제작 과정의 날짜별 테스트 로그를 보여주는 WebGL 프로토타입입니다.

- 공개 주소: https://gisangyu.github.io/LIMEN_WEB/test-logs/
- 12개 세션, 사진 148장과 영상 34개
- 무한 순환, 카드 확장 후 과정 설명과 미디어, 목록 복귀
- v7.1: 갤러리와 상세 화면의 필름 노이즈 제거
- 데이터는 2026-10-18에 SNOOZE 앱에서 확인한 기록입니다. 과거 제작 과정이며 현재 전시 구현 완료를 뜻하지 않습니다.

## 실행

이 폴더에서 `python -m http.server 8318`로 실행합니다. Node가 있으면 `npm test`로 17개 로직·미디어 검사 테스트를 실행할 수 있습니다. 빌드나 패키지 설치는 필요 없습니다.

`data/test-logs.json`에서 영어 콘텐츠와 로컬 미디어 경로를 관리합니다. `src/entry-detail.js`는 상세 화면, `src/gallery.js`와 `src/shaders.js`는 갤러리·확장 모션을 담당합니다.

원본 대용량 영상·앱 원문 메모·로그인 정보·인증 링크는 배포 파일에 포함하지 않습니다. 모든 실행 미디어는 상대 경로입니다. 상세 사진 목록은 앱 썸네일이며 대표 이미지와 웹용 영상은 별도 준비했습니다.

Three.js의 MIT 라이선스는 `vendor/LICENSE`에 있습니다.
