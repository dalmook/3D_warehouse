# Warehouse City 9.1 검증 기록

## 구현

- 새 `index.html` 기본 진입, `city.html` 호환 이동, 기존 `classic.html` 보존
- `city-app.mjs` / `city.css` 분리, 설계·운영·1인칭 내부 체험 UI
- 배치/회전/속성/랙 일괄 편집/Undo/Redo/자동 저장/JSON 왕복
- 내부 체험 중 작업자 이동 유지, PC 키보드/마우스 및 모바일 터치 보행, 벽 충돌
- 백엔드 없는 GitHub Contents API 저장·SHA 수정·조회·목록·불러오기
- 토큰 비저장 및 창 닫기 시 즉시 삭제, 저장 충돌 및 인증 실패 처리
- 기존 자료 보존, 잘린 구버전 objects.js를 원본 V7 배포본과 해시 대조하여 복구

## 검증된 소스

2026-09-16 QA 실행: https://github.com/dalmook/3D_warehouse/actions/runs/35112487305

실제 검사 대상 소스 커밋: `e8c615669a3dfcfa28acf6e39750661161970642`.

- 핵심 단위 테스트: 19개 통과
- Chromium 데스크톱/모바일 에뮬레이션 브라우저 시나리오: 22개 통과
- 기존 정밀 편집기: 38종 설비 생성의 유효한 경계와 팔레트 적재 계산 검증 통과
- 실제 GitHub: 합성 도면 생성, 기존 SHA에 대한 수정, 저장한 도면 재조회/불러오기, 토큰 비저장 검증 통과. 임시 테스트 브랜치를 삭제함
- JS/ES 모듈 문법 검사 통과

다운로드 가능한 원본 결과는 해당 Actions 실행의 `warehouse-city-qa` artifact에 있습니다. `browser-results.json`, `classic-results.json`, `live-github-results.json`, 화면 PNG와 `tested-commit.txt`를 포함합니다.

## 공개 배포 검증 게이트

QA와 실제 공개 사이트 검증은 구분합니다. 병합된 main의 `Warehouse City browser QA and Pages` 실행에서 `published` 작업이 성공해야 공개 사이트 검증 완료로 판정합니다. 해당 작업은 공개된 HTML/JS/CSS 7개 파일의 SHA-256을 main 소스와 대조한 뒤 브라우저 22개 시나리오, 기존 38종 설비, 공개 사이트에서의 실제 GitHub 저장 왕복을 다시 실행합니다. 결과는 `warehouse-city-deployed-qa` artifact에 기록합니다.

현재 저장소의 기존 GitHub Pages 게시 설정을 유지합니다. `main / (root)` 방식은 GitHub의 기본 배포를 사용하며, Actions 게시 방식으로 설정된 경우에만 별도의 `deploy` 작업을 실행합니다. `deploy`가 건너뛰어졌다는 사실만으로 배포 실패를 판단하지 말고 소스 해시 검증과 `published` 결과를 확인하세요.

## 검증 범위의 한계

이 기록은 모든 실제 휴대폰·브라우저·GPU를 검사했다는 뜻이 아닙니다. 모바일은 Chromium 터치 에뮬레이션입니다. 실제 사용자 PAT 자체는 수집하지 않고, GitHub의 임시 Actions 토큰으로 동일한 브라우저 저장 코드를 검증했습니다. 산업용 동선·처리량 검증이나 안전 적합성 인증은 포함하지 않습니다.
