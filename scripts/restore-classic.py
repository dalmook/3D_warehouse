# Archived migration. Never replay against the maintained modular application.
raise SystemExit('Retired migration: use Git history to inspect the original operation. No files changed.')
"""Restore the exact missing suffix from the owner's original V7 project archive.
The entire existing 41,472-byte prefix matches that archive byte-for-byte.
No bridge, S3, credentials or executable server files are restored.
"""
from pathlib import Path
from hashlib import sha256
import zlib
p=Path('objects.js'); packed=Path('.release/objects-tail.zlib')
expected='afdb81c8c42c7774d641bcfea95f83b0d580cf51acdd23bea077768cdd0e694a'
original=p.read_bytes()
if sha256(original).hexdigest()!=expected:
    assert sha256(original).hexdigest()=='125371e77f338e682415284b04f0d7fec3f15b677d0dde2617c0aa3a2f2c8c70', 'Unexpected source; do not overwrite'
    restored=original+zlib.decompress(packed.read_bytes())
    assert sha256(restored).hexdigest()==expected, 'Restored source integrity failure'
    p.write_bytes(restored)
if packed.exists(): packed.unlink()
p=Path('boot.js'); s=p.read_text(); s=s.replace('v9 is an optional entry.', 'the default entry is Warehouse City.').replace('./city.html','./index.html').replace(' (v9 미리보기)',' (v9.1)').replace('Warehouse City v9 미리보기 열기','Warehouse City v9.1 열기'); p.write_text(s)
p=Path('classic.html'); s=p.read_text().replace('GitHub Pages는 정적 사이트라 저장소에 직접 쓰려면 별도의 GitHub 로그인·인증 서버가 필요합니다. 토큰을 웹 코드에 넣으면 노출되므로 현재 방식이 안전합니다.','새 Warehouse City 화면에서는 별도 서버 없이 GitHub에 직접 저장할 수 있습니다. 토큰은 저장 대화상자에만 입력하며 소스 코드나 도면에 넣지 마세요.'); p.write_text(s)
p=Path('tests/live-github.mjs');s=p.read_text().replace("await p.goto('http://127.0.0.1:4173/');", "await p.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');");p.write_text(s)
print('Exact original object module restored and integrity verified.')
