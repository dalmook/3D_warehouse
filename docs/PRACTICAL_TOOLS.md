# 실무 도구 통합 및 검증 — 2026-09-17

## 사용 위치

상단 도면 다운로드: DXF/PDF/SVG/PNG/JSON. DXF는 모델 공간 mm 1:1이며 출력 축척으로 실측 좌표를 줄이지 않는다. PDF는 A3/A4 가로, 작성자/승인자/개정 입력. 36×24m는 1:200에서 A3에 맞는다. 선택 축척이 안 맞으면 축소를 숨겨 적용하지 않고 안내한다. PDF는 한글 보존을 위한 고해상도 래스터 보고서이며 편집 가능한 텍스트 PDF가 아니다.

상단 테마: Light/Dark/Blueprint. 치수: 숨김/선택/전체/측정, 단위·소수·크기·밀도. 두 설비를 선택하면 치수 정보에 회전 외곽 사이 최소 이격이 표시된다.

도구: 복사/붙여넣기/사각선택, 스냅·격자·전체잠금·목록, 박스 자동 적재, 구역 자동 배치. 선택 팔레트의 박스 쌓기는 실제 두께를 사용한다. 미리보기와 적용은 같은 좌표 계산이며 정방향/90도 단일 방향 후보만 비교한다. 바닥 반복 배치와 다른 기능이다. 포함 박스는 목록에서 제거하거나 빈 바닥을 클릭해 꺼낸다.

운영 상단 동선 설정: 작업자 → 시작 위치/목적지 클릭 → 이름·대기·순서/반복 방식 → 적용 → 재생. 설정 시작 시 일시정지하며 적용할 때만 실행 계획이 재설정된다. 작업 기반 운영은 같은 창에서 입고/출고와 선택적 포장 설비 ID를 지정한다. 바닥 보관 구역 또는 바닥 반복 배치의 보관 위치 체크를 사용하면 랙 없이 운영한다. 가정 기반 모의 결과이며 현장 예측으로 보증하지 않는다.

## 데이터 마이그레이션

최신 main d4aae103에서 분기했다. warehouse-city-v9 원본은 첫 실행 시 warehouse-city-v9-before-practical에 추가 백업한다. 구형 warehouse-studio-project-v1은 삭제하거나 덮어쓰지 않는다. 확장 필드는 schemaVersion 9에서 보존한다. person→worker, handtruck→handpallet이며 legacyType·ID·규격·elevation/supportId·잠금·config를 유지한다. 기존 stack은 동일 단일 방향 좌표로 load.boxes를 생성하고 원본 stack도 유지한다. 미래 스키마/지원 수 초과/불일치 적재는 원본 보호 및 오류 안내한다. 30베이를 20으로 축소하지 않는다. 근접 렌더 세부 표현 40베이/30단 한도는 저장값과 용량에 영향을 주지 않으며 화면에 알린다.

## 공동 저장 초기 설정

2026-09-17 GitHub API에서 코드 저장소와 Pages가 공개임을 확인했다. 기밀 도면의 저장소를 별도로 승인·설정할 수 있다. 공용 저장 → 관리자 초기 설정에서 owner/repo/branch를 한 번 입력하고 공개 범위를 확인한다. 일반 직원은 도면명/개정명으로 JSON을 준비한 뒤 GitHub 업로드 링크에서 파일을 직접 선택하고 커밋한다. GitHub 로그인과 쓰기 권한이 필요하다. 앱의 저장 결과 확인은 공개 Contents API로 파일 본문까지 비교한다. 비공개는 GitHub 다운로드 후 앱 JSON 불러오기 대체 경로를 쓴다.

서로 다른 개정 파일명으로 덮어쓰기를 피한다. projectId/revisionId/baseRevision으로 계보를 보존한다. 병렬 개정 자동 병합은 지원하지 않으며 GitHub에서 baseRevision과 내용을 비교한다. PAT 고급 저장은 SHA 충돌 보호·메모리 토큰을 유지한다. 앱내 OAuth는 승인된 연결이 없으므로 구현했다고 주장하지 않는다. 직원 계정 초대/권한 변경/비공개 전환은 수행하지 않았다.

## 실제 검증과 제한

로컬 Windows 10, Edge153, RX6700XT, 1440×900·1920×1080·390×844. Node 도메인42, 기존 브라우저22, 카탈로그43종 생성/편집/새로고침, 실무 출력/적재/테마/복사 흐름, 동선/랙0 운영 흐름, 공유저장 모의 실패/확인/개정 연결, 스트레스4, 리뉴얼5 통과. 카탈로그 검사에서 null instanceColor 갱신 오류를 수정한 뒤 다시 통과했다.

1920×1080 DPR1 표준, 16설비·2랙: median57.14fps, 1%low54.35fps, frame17.5ms/p99 18.4ms, 338drawcalls, 462096triangles. GPU메모리 미측정. transferBytes=0은 캐시/계측 한계이며 0바이트 전송이라고 보고하지 않는다. 모바일은 에뮬레이션 기능 검사이며 실제 단말 성능 수치가 아니다.

DXF: ezdxf1.4.3 독립 파서 감사0오류/0수정, 외곽36000×24000mm, 45도 회전8m랙 블록 로컬길이8000mm, 실제 DIMENSION/DIMSTYLE. ezdxf SVG backend로 재출력. AutoCAD/LibreCAD 직접 호환 검사는 미실행. PDF는 Poppler로 실제 페이지 렌더, 한글/팔레트48개/1640mm/평면·측면 확인. SVG/PNG는 같은 설계 도메인에서 생성한다.

일반 직원 계정의 GitHub 웹 업로드는 미검증이다. 모의 API 검사를 실계정 검증으로 대체하지 않는다. 미구현 세부 기능은 FEATURE_PARITY.md의 부분 항목에 명시했다. 전체 요구 완료로 간주하지 않는다. 공개 배포 검증 결과는 STATUS.md에서 확인한다.

## 재현

npm test
BROWSER_CHANNEL=msedge node tests/practical-browser.mjs
BROWSER_CHANNEL=msedge node tests/parity-browser.mjs
BROWSER_CHANNEL=msedge node tests/operations-browser.mjs
BROWSER_CHANNEL=msedge node tests/shared-browser.mjs
python tests/cad-audit.py

로컬 정적 서버: python -m http.server 4173. CI SwiftShader는 ?quality=low를 명시하고 실제 GPU 표준 성능과 분리한다.

공식 참고: https://github.com/dxfjs/writer ; Autodesk DXF DIMENSION https://help.autodesk.com/cloudhelp/2023/ENU/AutoCAD-DXF/files/GUID-239A1BDD-7459-4BB9-8DD7-08EC79BF1EB0.htm ; GitHub 웹 업로드 https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository . 확인일 2026-09-17. 문서 조사와 실제 브라우저 검사를 구분했다.

추가 검증: 10팔레트+포함480박스+수동10박스를 실제 UI에서 복사·90도 회전·붙여넣어 총960박스와 supportId를 확인하고 한 번의 Undo/Redo로 복구했다. 측정은 설비 모서리 앵커 또는 바닥 점으로 저장하며 JSON/출력/복제 내부 참조에 반영한다. 영역 드래그/영역 채우기와 출입문·도크 앞 작업공간 검사 추가. DXF Standard STYLE은 malgun.ttf를 참조한다. 글꼴 파일을 재배포하지 않으며 다른 OS CAD에서는 사용 가능한 한글 글꼴로 스타일을 지정해야 할 수 있다.

첫 PR 커밋 c9b2fb3: GitHub Actions 35167504396 전체 성공. 소프트웨어 low 브라우저22·스트레스4·클래식38·실무/동선/공용저장 모의 흐름과 실제 GitHub API 생성·SHA수정·재열기·토큰검사 성공, 임시 브랜치 정리. 이것은 일반 직원 웹 업로드 실계정 검증과 별개다.

포함 박스는 한 개 추가/제거와 직접 3D 클릭→목록 선택을 지원한다. 위 박스가 있는 하단 박스의 제거/반출은 차단하여 상하 순서를 보존한다. 멀티 정렬/이동도 받침 계층을 함께 이동한다.

최종 출력 보완: A4에서 43종 수량표를 여러 페이지로 나눠 잘림을 방지하고 Poppler로 마지막 수량 행을 확인했다. 동일 팔레트 적재 상세는 개소 수와 함께 묶으며 JPEG 페이지를 순차 생성하여 전체 캔버스를 동시에 유지하지 않는다. 서로 다른 적재 상세 80종 초과는 원본을 보존하고 분할 출력을 안내한다. PR의 오래된 커밋 CI는 새 커밋이 올라오면 취소하고 최신 커밋 전체 검사를 실행한다. main 배포 검사는 취소하지 않는다.
