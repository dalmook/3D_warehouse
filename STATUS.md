# Warehouse City renewal — 진행 중 / 출시 미승인

2026-09-17. Not ready to publish. No production changes made.

Base main: ab3857a34f631ba855da23a3fbf515e1526b5440, confirmed via connected GitHub API. Initial workspace empty. Git CLI anonymous access returned 404/authentication failure. Retrieved exact source via authorized connector; all blob hashes, tree and signed commit hash verified; local repository is shallow at this commit. Branch: feat/warehouse-renewal-20260917.

Baseline: 23 unit tests pass. Actual Edge screenshots and layout in qa-evidence/before. Public URL currently shows a not-found page; local exact-main baseline is explicitly distinguished. Blender 4.5.9 LTS downloaded from official distribution to D:/Codex/tools (not committed).

Resume: `npm ci`; run a local static HTTP server on port 4173; `npm test`; `node tests/browser.mjs`. Blender: `D:/Codex/tools/blender-4.5.9/blender-4.5.9-windows-x64/blender.exe --background --python scripts/build-assets.py`.

## 현재 완료 지점 (2026-09-17 갱신)

실제 Blender 4.5.9 LTS 실행, 11개 GLB 및 .blend, 로컬 Three185 애드온, 독립 리깅/클립, 재질/조명, 모듈 랙, 썸네일/직교 평면/배경 축척/랙 배치/다중 편집 도구, 작업 기반 물류/수량 보존, 보행/모바일 터치, 저장 원본 보호를 구현했다.

단위 30, 기존 브라우저 22, 새 브라우저 5, 대규모 편집 4, 클래식 빌더 38, 복구 원문 보호 검사 및 실제 GLB 응답/해시 검사를 로컬에서 통과했다. `docs/RENEWAL_VALIDATION.md`에 환경·성능·검사별 한계를 기록했다. 모든 요구가 검증된 것은 아니다.

실제 앱 화면은 `docs/evidence/`, 원시 증거와 WebM은 `qa-evidence/`에 있다. 동일 원래 도면/카메라 비교를 별도로 남겼다. 생성 이미지나 Blender 렌더가 아니다. 사용자 실제 도면을 테스트 자료로 쓰지 않았다.

초안 PR: https://github.com/dalmook/3D_warehouse/pull/5 . 첫 원격 구현 커밋 `b63baa62b59e0f42f9414c96ce546d1c4f8e9629`. 후속 커밋과 CI는 PR 현재 head를 확인한다. 최초 원격 CI는 단위 검사 성공, 브라우저 소프트웨어 렌더링 타임아웃과 Pages 설정 404로 실패했다. 후속 결과와 구분한다.

저장소 API는 private=true / has_pages=false, 공개 주소는 not-found였다. 임의 공개 전환·요금제 변경·권한 확대를 하지 않았다. main 교체, Pages 배포 및 실제 공개 저장 흐름은 미완료다.

## 우선 재개 작업

1. 작업자 근접 품질/발 접지/운반·고단 적치, 조명과 AO, 카탈로그 전체 시각 검수. 현재 미술 품질 게이트는 미승인.
2. 회전 설비 접근점·적재 외곽·혼잡 교통·교착 복구·제외 베이 슬롯 계산, 컨베이어 작업 연동. A/B UI 종단 검증.
3. 모든 편집 도구/치수/드래그 UX, 600 랙+40명+장비 결합 부하, 실제 모바일 FPS, 장시간 리소스 검증.
4. 새 PR head의 CI와 임시 브랜치 실제 저장 검증 결과 확인. 권한·Pages 설정 문제 해결 후 최종 품질 승인, 보호 규칙에 따른 main 반영과 공개 URL 전체 재검증.

## 추가 재현 명령

로컬 서버 4173을 실행한 후 PowerShell에서 `$env:BROWSER_CHANNEL='msedge'`를 설정한다. `node tests/renewal-browser.mjs`, `node tests/storage-recovery.mjs`, `node tests/stress.mjs`, `node tests/classic.mjs`, `node tests/cold-load.mjs`. 먼저 `git status --short` 및 `git log -3 --oneline`으로 로컬/원격 상태를 확인한다.

저장소 쓰기는 연결된 GitHub 도구를 사용했다. Git CLI에 자격 증명을 넣거나 토큰을 저장하지 않았다. 이 문서는 백그라운드 개발이 계속된다는 뜻이 아니다. 자동 개발/감시 예약을 생성하지 않았다.
