# 공식 공개 자료 조사

확인일: 2026-09-17 (Asia/Seoul). 경쟁사의 자산·코드·로고는 제품에 사용하지 않는다.

| 서비스 / URL | 확인 범위 | 확인 기능 | 적용 위치 및 상태 |
|---|---|---|---|
| [IntralogisticGrid](https://www.intralogisticgrid.com/) | 공개 랜딩의 기능 설명·제품 이미지 목록 직접 확인. Start Planning 클릭 시 로그인 페이지로 이동하여 편집기 조작은 못 함 | 설비 카탈로그, 끌어놓기, 2D/3D, 도면 이미지 축척, 실시간 팔레트/상자 위치 수, 1인칭 | city-thumbnails.mjs 실자산 미리보기; city-design.mjs 축척; city-app.mjs 평면/보행 모드. 정렬은 후속 구현 필요 |
| [RackCity](https://www.rackcity.ai/) | 공식 제품 설명과 화면 확인, See an example 버튼으로 공개 예제 진입 시도. 편집 기능 직접 검증은 별도 기록 전까지 미확인 | 구역 생성, 행 배치, 베이·빔 단수·통로·간격을 바꾸면 용량 갱신 | city-design.mjs planRacks와 capacity, 구역 배치 미리보기 및 원자적 적용 |
| [3D Warehouse](https://3dwarehouse.sketchup.com/) / [공식 인터페이스 안내](https://help.sketchup.com/en/3d-warehouse/introducing-3d-warehouse-interface) / [검색 안내](https://help.sketchup.com/en/3d-warehouse/searching-and-downloading-models) | 본 사이트 웹 조회 403. 공식 도움말로 검색·모델/재질 미리보기 흐름 확인. 모델 다운로드/재배포 안 함 | 검색, 분류, 모델 미리보기와 부품 선택 | 실제 GLB로 렌더한 카탈로그 썸네일, 치수 표기, Blender 부품 기반 랙 조립 |
| [Autodesk FlexSim](https://www.autodesk.com/solutions/design-manufacturing/warehouse-simulation) | 공식 설명과 제품 화면 링크 확인. FlexSim 실행·조작하지 않음 | 이산 이벤트, 물류 흐름, 작업자·차량·저장·컨베이어, 처리량/자원 지표 | city-logistics.mjs 고정 간격 작업 큐, 독점 화물 소유권, 입고→출하 이벤트, 수량 보존, 대기/이동 집계. 상용 엔진 재현이나 실측 예측으로 표현하지 않음 |

공식 페이지의 기능 주장은 독립 성능 검증이 아니다. 로그인·요금제·약관을 우회하지 않았으며 가입·결제·외부 AI에 도면 업로드를 하지 않았다. 운영 모델은 현재 원형이며 검증 범위를 넘어 최적화 기능을 주장하지 않는다.

## 기존 앱 관찰

공개 주소는 확인 시 not-found 화면. 정확한 main 소스를 로컬 Edge에서 실행해 조감도와 보행 화면, 도면 JSON을 qa-evidence/before에 보존. 기존 조감도는 큰 이름표가 설비를 가리고 랙이 판과 상자로 표현되며, 내부 시작점이 작업자와 중첩된다. 개선에서 조립 부품·PBR·작은 표찰·안전한 시작점·카메라 위치 선택을 적용했다. 변경 후 화면의 미술 검수는 아직 진행 중이다.
