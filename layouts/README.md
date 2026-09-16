# 기준 도면 등록 방법

이 폴더의 JSON 파일은 Warehouse Studio 상단 **기준 도면** 메뉴에 표시됩니다.

## 새 도면 추가

1. Warehouse Studio에서 기준으로 사용할 배치를 엽니다.
2. **기준 도면 → 현재 도면 JSON 저장**을 누릅니다.
3. 내려받은 JSON 파일을 이 `layouts/` 폴더에 넣습니다.
4. `index.json`의 `layouts` 배열에 아래 형식으로 항목을 추가합니다.
5. GitHub에 커밋하고 Pages 배포가 끝난 뒤 **목록 새로고침**을 누릅니다.

```json
{
  "id": "hwasung-center-a",
  "name": "화성 물류센터 A동",
  "file": "hwasung-center-a.json",
  "description": "A동 현재 운영 레이아웃",
  "location": "화성",
  "category": "운영 기준",
  "updatedAt": "2026-07-15",
  "warehouse": {
    "width": 45,
    "depth": 47,
    "height": 10
  },
  "tags": ["완제품", "팔레트랙", "출하"]
}
```

`file`에는 이 폴더를 기준으로 한 JSON 파일명만 입력합니다. 외부 주소나 상위 폴더의 파일은 보안을 위해 불러오지 않습니다.

## 알아둘 점

- GitHub Pages는 정적 사이트라서 실행 중인 웹페이지가 저장소에 직접 파일을 쓸 수 없습니다.
- 새 도면은 JSON으로 내려받은 뒤 `layouts/`에 직접 업로드해야 합니다.
- 저장소에 바로 쓰는 버튼을 만들려면 GitHub OAuth 또는 GitHub App으로 로그인하고, 쓰기 권한 토큰을 프런트엔드에 노출하지 않는 별도 인증 서버가 필요합니다. PAT를 HTML·JavaScript에 넣지 마세요.
- 기준 도면을 불러와 수정해도 저장소의 원본 JSON은 변경되지 않습니다.
- 공개 Pages에 올린 도면은 주소를 아는 사용자가 내려받을 수 있으므로 보안 도면은 사내 접근 제한 환경에 배포하세요.
