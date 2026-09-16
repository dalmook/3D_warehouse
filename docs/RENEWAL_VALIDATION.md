# Warehouse City renewal: 검수 중인 구현

확인일 2026-09-17. **전체 완료 또는 공개 배포 완료가 아니다.** 초안 PR #5의 작은 시연 구역과 기반 기능을 검증한 기록이다. 사용자 실제 도면은 포함하지 않았다.

## 실제 구현

- Blender 4.5.9 LTS를 실행하여 `scripts/build-assets.py`로 11개 GLB와 편집 가능한 `.blend`를 제작했다. rack-frame / rack-beam / pallet / plastic-pallet / box / forklift / handpallet / conveyor / worktable / dock / worker. 박스랙은 프레임·보 부품을 조립한다.
- 목재·골판지·에폭시 이미지 텍스처는 `scripts/make-textures.py`로 재생성한다. 독자 제작 CC0 자산이며 경쟁사 모델을 재배포하지 않았다. 출처·축·단위·규격·클립은 `assets/manifest.json`에 기록했다.
- Three.js 0.185.0 및 로컬 GLTFLoader/SkeletonUtils/RoomEnvironment. 클래식 엔진은 변경하지 않았다. PBR, ACES, 실내 조명, 그림자 품질 프리셋, 정적 부품 인스턴싱, 스켈레톤 별도 복제와 Idle/Walk/Carry/PickPlace 전환.
- 실제 자산 썸네일, 직교 평면도, 랙 행/열/양면 배치 미리보기와 원자적 충돌 거부, 다중 선택 정렬 도구, 두 점 배경 축척 및 JSON 내 이미지 보관.
- 목적지 순환 모드와 별도로 고정 간격 0.05초 물류 모델. 화물 독점 소유·예약, 입고→적치→피킹→포장→출하, 이동/대기 지표와 이벤트, 운반체에 화물 부착. 같은 시드의 수량·이벤트 재현.
- 모바일 이동/시점 동시 터치, 미니맵 위치 선택, 눈높이/FOV, 모드 전환 중 운영 상태 유지. 관찰자는 물류 자원 예약을 점유하지 않는다. 탭 비활성화 중 시뮬레이션은 정지한다.
- GitHub SHA 충돌 보호와 메모리 토큰을 유지하고 로컬 백업/원격 차이 요약을 추가했다. JSON 내 이미지도 GitHub 파일의 공개 범위에 포함되며 명시적 저장 동의가 필요하다.

## 데이터 보존

기존 schemaVersion 9와 x/y 평면·z 높이를 유지한다. 배경은 선택적 확장 필드다. 기존 두 저장 키를 삭제하지 않는다. 최초 갱신 전 원문을 `warehouse-city-v9-before-renewal`에 복사하며, 원본을 해석하거나 백업할 수 없으면 자동 저장을 중단한다. 현재 도면은 JSON 내보내기로 회수할 수 있다. 특수 설비의 원래 type/추가 속성은 보존하며 상세 렌더링 미지원 안내를 표시한다. 이는 클래식 설비 전체의 새 3D 모델 제작 완료를 뜻하지 않는다.

## 검사 결과

| 검사 | 로컬 결과 / 범위 |
|---|---|
| Node 단위 검사 | 30 통과. 기존 23 + 새 좌표/방향 통로/용량/배경/GLB/물류 보존·재현 검사 |
| 기존 Playwright | 22 통과. 실제 Edge GPU 표준, Chromium SwiftShader 저사양 각각 확인. 후자는 사용자 GPU 성능 측정이 아님 |
| 새 Playwright | 5 통과. 실제 GLB·독립 뼈대, 축척 복구, 충돌 시 전체 거부, 상태 보존, 동시 터치 |
| 원본 복구 | 정상 원문 백업과 손상된 원본 자동 덮어쓰기 방지 통과 |
| 대규모 편집 | 600 랙 최대 베이·단수 도면 렌더·내보내기·재생성 4 검사 통과 |
| 클래식 | 38 기존 자산 빌더 및 팔레트 적재 계산 통과 |
| 로컬 자산 응답 | 11 GLB HTTP 200, glTF magic/version 및 디스크 SHA-256 일치 |
| 실제 GitHub 브라우저 저장 | c190e42 원격 CI 35157871187 통과. 임시 브랜치에서 create/SHA update/load/토큰 비저장 검증, 정리 후 refs 빈 배열 확인. 공개 Pages 원점 검증은 아님 |
| 공개 Pages | 확인 시 저장소 private=true, has_pages=false. 지정 URL은 not-found. 공개 배포·저장 재검증 미완료 |

자동화된 동작 검사는 미술 품질 승인과 별개다. 최초 초안 CI의 소프트웨어 렌더링 타임아웃과 Pages 설정 404는 실제 실패였다. 기기별 컨텍스트 해제와 거리별 랙 LOD를 적용한 c190e42에서 단위·브라우저·대규모 편집·클래식·실제 저장 CI가 통과했다([실행 35157871187](https://github.com/dalmook/3D_warehouse/actions/runs/35157871187)). Pages 미설정 상태로 deploy/published는 skipped이며 배포 성공이 아니다. 후속 증거 문서 커밋과 테스트한 실행 코드 커밋을 구분한다.

## 측정

Windows 10, AMD Radeon RX 6700 XT / ANGLE D3D11, Edge 153 headless, 1920×1080, DPR 1, 표준. 합성 시연 장면 16개 객체·랙 2개. 180 프레임 표본의 대표 실행: 중앙 56.8fps / 17.6ms, 하위 1% 54.6fps / p99 18.3ms. draw calls 338, 삼각형 462,096. 짧은 표본으로 모든 환경의 60fps를 보장하지 않는다.

빈 컨텍스트·캐시 차단·로컬 HTTP에서 사용 가능까지 870ms, 초기 전송 약 2.91MB (압축하지 않은 로컬 서버). 인터넷/Pages 로딩 시간이 아니다. 갱신된 원시 측정은 `docs/evidence/performance.json`, `cold-load.json`에 있다. GPU 메모리 미측정, 실제 모바일 FPS 미측정. 데스크톱에서의 모바일 뷰포트 검사는 실제 모바일 하드웨어 성능이 아니다.

반복 장면/모드 재생성 후 AnimationMixer 수는 안정적이었다. 모든 GPU 리소스와 리스너의 장시간 누수 검증까지 완료한 것은 아니다.

## 화면과 영상

`docs/evidence/`의 PNG는 모두 실제 로컬 웹앱 캡처다. 비교용 before/after는 원래 합성 도면, 1440×900, 내부 위치 (17,22), 눈높이 1.65m, FOV 48°, yaw/pitch 0의 동일 조건이다. 공개 사이트 캡처가 아니다. 별도 소형 시연 화면은 조감/평면/랙/도크/작업자/지게차/모바일을 포함한다. Blender 렌더를 앱 화면으로 사용하지 않았다. 운영·보행 WebM은 `docs/evidence/operation-walk.webm`과 로컬 `qa-evidence/final/video/`에 보관한다.

## 출시 전 남은 작업

1. 캐릭터의 의상 연결·실루엣과 운반/피킹 자세, 발 접지, 지게차 고단 적치 동작을 개선해야 한다. 현재 근접 화면은 요청한 세미리얼리스틱 최종 기준으로 승인하지 않았다.
2. 모든 카탈로그 세부 자산, AO, 장면별 조명 균형, 가까운 랙 LOD 전환 및 최종 시각 검수 필요. 현재 천장·외벽 표현과 실제 충돌 경계의 정밀한 일치도 추가 검수 대상이다.
3. 컨베이어는 구조 모델만 있다. 작업 큐의 컨베이어 공정 연결은 미구현. 회전된 설비의 접근점, 다수 장비 회전 궤적·적재 외곽, 혼잡/교착 복구, 랙 제외 베이와 물류 슬롯 매핑은 보강 필요.
4. A/B Web Worker와 같은 시드 집합 통계는 구현했지만 동일 도면 A/B의 브라우저 Worker 실행은 확인했다(두 경우 모두 5개 시드에서 6개 출하). 작업자 수/통로 폭을 바꾼 UI 종단 검사는 미완료. 실측 보정 없는 가정 기반 결과이며 예측/최적화로 사용하면 안 된다.
5. 카탈로그 드래그 배치, 모든 다중 편집/치수 UX, 600 랙+40 작업자+장비 동시 운영, 실제 모바일 기기, 장시간 메모리 검수 미완료. 600 랙 편집 검사와 40 작업자 단위 검사만으로 결합 부하를 주장하지 않는다.
6. 초기 모든 핵심 GLB를 읽으며 세분화된 지연 로딩은 미구현. 모델 압축/외부 디코더는 사용하지 않는다.
7. PR 보호 규칙을 확인하고 검수 완료 후 main 반영, Pages 활성화 권한/설정 해결, 공개 하위 경로의 HTML/모듈/GLB/텍스처/CSP/저장 전체 재검증 필요. 저장소 공개 전환은 임의로 하지 않는다.

## 재현

`npm ci`, `npm test`. 로컬 정적 서버 4173을 실행한 후 PowerShell에서 `$env:BROWSER_CHANNEL='msedge'; node tests/browser.mjs`, `node tests/renewal-browser.mjs`, `node tests/storage-recovery.mjs`, `node tests/stress.mjs`, `node tests/classic.mjs`, `node tests/cold-load.mjs`.

Blender: `blender --background --python scripts/build-assets.py`. 텍스처 재생성: Pillow가 설치된 Python으로 `scripts/make-textures.py`. 바이너리/개발 의존성은 저장소에 넣지 않는다. 과거 소스 덮어쓰기 스크립트는 실행을 차단했으며 CI는 소스를 수정·커밋하지 않는다.
