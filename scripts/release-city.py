# Archived migration. Never replay against the maintained modular application.
raise SystemExit('Retired migration: use Git history to inspect the original operation. No files changed.')
"""One-time, idempotent v9-preview -> v9.1 release migration. Preserves V8 and layouts."""
from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
if (root / 'city-app.mjs').exists():
    print('Release source already generated; no changes.')
    raise SystemExit(0)
source = (root / 'city.html').read_text()
css = re.search(r'<style>([\s\S]*?)</style>', source).group(1)
app = re.search(r'<script type="module">([\s\S]*?)</script>', source).group(1)
def edit(old, new):
    global app
    assert old in app, f'Missing source anchor: {old[:100]}'
    app = app.replace(old, new)
def html(old, new):
    global source
    assert old in source, f'Missing HTML anchor: {old[:100]}'
    source = source.replace(old, new)

# Preserve the original editor verbatim; the new root is the actual application.
(root / 'classic.html').write_text((root / 'index.html').read_text())
html('./index.html?classic=1', './classic.html')
html('index.html?classic=1', 'classic.html')
html('<title>Warehouse City · 설계하고, 움직이고, 걸어보세요</title>', '<title>Warehouse City · 창고 설계 · 운영 · 내부 체험</title>')
html('<small>DESIGN · SIMULATE · EXPLORE</small>', '<small>DESIGN · SIMULATE · EXPLORE / 9.1</small>')
html('<button id="isoBtn">3D</button>', '<button id="isoBtn">3D</button><button id="runBtn" class="primary" hidden>▶ 재생</button><button id="focusBtn" title="사이드바 접기" aria-label="넓게 보기">⛶</button>')
html('<button id="importBtn" class="wide">JSON 도면 불러오기</button>', '<button id="importBtn" class="wide">JSON 도면 불러오기</button><button id="backupBtn" class="wide">JSON 도면 내보내기</button>')
html('<h3>작업자 상태</h3>', '<h3>운영 조건</h3><label class="field">작업자 보행 속도 (m/s)<input id="workerSpeed" type="number" min=".2" max="3" step=".1" value="1.3"></label><label class="field">목적지 작업 시간 (초)<input id="workerDwell" type="number" min="0" max="60" step="1" value="2"></label><button id="applySim" class="wide">조건 적용 · 처음부터</button><h3>작업자 상태</h3>')
html('<div class="hint">설계 모드에서 작업자와 <b>이동 목적지</b>를 배치하세요. 작업자가 목적지를 순서대로 방문합니다.</div>', '<div class="hint">작업자와 <b>이동 목적지</b>를 배치하고 ▶ 재생을 누르세요. 목적지 번호 순서대로 이동합니다. 재생 중 <b>내부 체험</b>으로 바꾸면 움직이는 작업자를 직접 볼 수 있습니다.</div>')
html('<label class="field">회전 (도)', '<label class="field">색상<input id="objectColor" type="color"></label><div id="rackConfig" class="cols" hidden><label class="field">랙 칸 수<input id="rackBays" type="number" min="1" max="20"></label><label class="field">랙 단 수<input id="rackLevels" type="number" min="1" max="20"></label></div><label class="field">회전 (도)')
html('<label class="field">저장된 도면', '<p class="small">토큰 발급: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens. 저장할 저장소만 선택하고 Contents: Read and write를 허용하세요.</p><label class="field">저장된 도면')
html('<button id="undoBtn" title="Ctrl+Z">', '<button id="undoBtn" title="Ctrl+Z" aria-label="실행 취소">')
html('<button id="redoBtn" title="Ctrl+Y">', '<button id="redoBtn" title="Ctrl+Y" aria-label="다시 실행">')

# Validate malformed configs without destroying compatible legacy object fields.
core = (root / 'city-core.mjs').read_text()
core = core.replace('const config=copy(o.config || def.config || {});', "const config=copy(o.config && typeof o.config==='object' && !Array.isArray(o.config) ? o.config : def.config || {});")
core = core.replace('const w=layout.warehouse;\n  if(x<radius', 'const w=layout.warehouse;\n  if(!Number.isFinite(x)||!Number.isFinite(y))return true;\n  if(x<radius')
(root / 'city-core.mjs').write_text(core)

edit("const keys=new Set(),groups=new Map(),simGroups=new Map();", "const keys=new Set(),groups=new Map(),simGroups=new Map();\nconst shellRoot=new THREE.Group(),labelRoot=new THREE.Group();")
edit('scene.add(objectsRoot,groundRoot,agentRoot,pathRoot);', 'scene.add(objectsRoot,groundRoot,agentRoot,pathRoot,shellRoot,labelRoot);')
edit("function rebuild(){\n", "function rebuild(){\n buildShell();\n")
edit("function persist(){clearTimeout(dirtyTimer);dirtyTimer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify(layout));$('saveState').textContent='이 브라우저에 자동 저장됨 · GitHub 커밋은 별도';}catch(e){$('saveState').textContent='브라우저 저장 실패 — JSON으로 내보내세요';toast('브라우저 저장 공간 / 권한을 확인하세요.');}},250);}", "function flushSave(){clearTimeout(dirtyTimer);try{localStorage.setItem(KEY,JSON.stringify(layout));$('saveState').textContent='이 브라우저에 자동 저장됨 · GitHub 커밋은 별도';}catch{$('saveState').textContent='브라우저 저장 실패 — JSON으로 내보내세요';toast('브라우저 저장 공간 / 권한을 확인하세요.');}}\nfunction persist(){clearTimeout(dirtyTimer);dirtyTimer=setTimeout(flushSave,250);}\nwindow.addEventListener('pagehide',()=>{if(dirtyTimer)flushSave();});")
edit("layout=demo();loadWarning=", "try{const original=localStorage.getItem(KEY);if(original)localStorage.setItem(KEY+'-recovery-'+Date.now(),original);}catch{}layout=demo();loadWarning=")
edit("const w=layout.warehouse;$('warehouseW')", "const w=layout.warehouse;$('workerSpeed').value=layout.simulation.speed;$('workerDwell').value=layout.simulation.dwell;$('warehouseW')")
edit("$('ol').checked=o.locked;", "$('ol').checked=o.locked;$('objectColor').value=o.color;$('rackConfig').hidden=!['rack','boxrack','shelf'].includes(o.type);$('rackBays').value=o.config?.bays||4;$('rackLevels').value=o.config?.levels||4;")
edit("next.locked=$('ol').checked;", "next.locked=$('ol').checked;next.color=$('objectColor').value;if(!$('rackConfig').hidden){const bays=Number($('rackBays').value),levels=Number($('rackLevels').value);if(![bays,levels].every(v=>Number.isInteger(v)&&v>=1&&v<=20)){toast('랙 칸 수와 단 수는 1~20의 정수로 입력하세요.');return;}next.config={...next.config,bays,levels};}")
edit("function hit(){for", "function hit(){let fallback=null;for")
edit("if(o&&o.type!=='aisle'&&o.type!=='safety')return o;}return null;}", "if(o&&o.type!=='aisle'&&o.type!=='safety')return o;if(o)fallback=o;}return fallback;}")
edit("$('exportBtn').onclick=exportJSON;", "$('exportBtn').onclick=exportJSON;$('backupBtn').onclick=exportJSON;")
edit("mode=next;playing=false;document.body.className=mode;", "const keepPlaying=playing;mode=next;playing=mode!=='edit'&&keepPlaying;document.body.className=mode;$('left').classList.remove('open');$('right').classList.remove('open');$('runBtn').hidden=mode==='edit';shellRoot.visible=mode==='walk';labelRoot.visible=mode!=='walk';")
edit("agentRoot.visible=mode==='sim';", "agentRoot.visible=mode!=='edit';")
edit("groups.get(o.id).visible=mode!=='sim';", "groups.get(o.id).visible=mode==='edit';")
edit("if(mode==='sim'){setupSimulation();$('playBtn').textContent='시뮬레이션 시작';}", "if(mode!=='edit')setupSimulation();syncPlayLabels();")
edit("$('playBtn').onclick=()=>{setupSimulation();if(!sim.agents.length||!sim.targets.length){toast('작업자와 이동 목적지를 먼저 배치하세요.');return;}playing=!playing;$('playBtn').textContent=playing?'일시 정지':'계속 재생';};", "function syncPlayLabels(){$('playBtn').textContent=playing?'일시 정지':'시뮬레이션 시작';$('runBtn').textContent=playing?'Ⅱ 정지':'▶ 재생';}\nfunction togglePlay(){setupSimulation();if(!sim.agents.length||!sim.targets.length){toast('설계 모드에서 작업자와 이동 목적지를 먼저 배치하세요.');return;}playing=!playing;syncPlayLabels();}\n$('playBtn').onclick=togglePlay;$('runBtn').onclick=togglePlay;")
edit("$('resetSim').onclick=()=>{rebuild();setupSimulation();$('playBtn').textContent='시뮬레이션 시작';};", "$('resetSim').onclick=()=>{rebuild();setupSimulation();syncPlayLabels();};")
edit("if(mode==='sim'&&sim){", "if(mode!=='edit'&&sim){")
edit("if(mode==='sim'&&sim)for", "if(mode!=='edit'&&sim)for")
edit("o.type==='worker'&&mode==='sim'", "o.type==='worker'&&mode!=='edit'")
edit("if(mode==='walk')walkTick(dt);", "if(mode==='walk'){if(document.querySelector('dialog[open]'))keys.clear();walkTick(dt);}")
edit("$('githubBtn').onclick=()=>$('githubDialog').showModal();", "$('githubBtn').onclick=()=>{keys.clear();if(document.pointerLockElement)document.exitPointerLock();$('githubDialog').showModal();};")
edit("['ghSave','ghLoad','ghList','ghClose']", "['ghSave','ghLoad','ghList','ghClose','ghOwner','ghRepo','ghBranch','ghPath','ghToken','ghFiles','ghConsent']")
edit("const body={message:`layout: ${layout.projectName}`,branch:s.branch,content:utf8base64(JSON.stringify(layout,null,2))};", "const serialized=JSON.stringify(layout,null,2);if(new TextEncoder().encode(serialized).length>950000)throw Error('GitHub 직접 저장은 도면 950KB까지 지원합니다. JSON으로 내보내 보관하세요.');const body={message:`layout: ${layout.projectName}`,branch:s.branch,content:utf8base64(serialized)};")
edit("$('ghStatus').textContent=`커밋 완료: ${result.commit.sha.slice(0,7)} · ${s.path}`;", "$('ghStatus').textContent=`커밋 완료: ${result.commit.sha.slice(0,7)} · ${s.path}`;$('saveState').textContent=`GitHub 저장 완료 · ${result.commit.sha.slice(0,7)}`;try{localStorage.setItem('warehouse-city-github',JSON.stringify({owner:s.owner,repo:s.repo,branch:s.branch,path:s.path}));}catch{}")
edit("$('leftToggle').onclick=()=>$('left').classList.toggle('open');$('rightToggle').onclick=()=>$('right').classList.toggle('open');", "$('leftToggle').onclick=()=>{$('right').classList.remove('open');$('left').classList.toggle('open');};$('rightToggle').onclick=()=>{$('left').classList.remove('open');$('right').classList.toggle('open');};")
edit("version:9,getLayout", "version:'9.1.0',getPlaying:()=>playing,getView:()=>({yaw,pitch,x:camera.position.x,y:camera.position.y,z:camera.position.z}),screenPoint:(x,y,z=0)=>{const p=new THREE.Vector3(x,z,y).project(camera),r=canvas.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};},getLayout")

extra = r'''
function makeLabel(text,x,y,z){
 const c=document.createElement('canvas');c.width=512;c.height=96;
 const ctx=c.getContext('2d');ctx.fillStyle='#143448e6';ctx.fillRect(0,0,512,96);
 ctx.fillStyle='#ffffff';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text.slice(0,25),256,48,484);
 const texture=new THREE.CanvasTexture(c),material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false});
 const sprite=new THREE.Sprite(material);sprite.position.set(x,y,z);sprite.scale.set(4.8,.9,1);labelRoot.add(sprite);
}
function buildShell(){
 shellRoot.clear();labelRoot.traverse(o=>{if(o.material){o.material.map?.dispose();o.material.dispose();}});labelRoot.clear();
 const w=layout.warehouse;
 for(const z of [-.1,w.depth+.1])box(shellRoot,w.width+.4,w.height,.18,w.width/2,w.height/2,z,'#d4e0e4');
 for(const x of [-.1,w.width+.1])box(shellRoot,.18,w.height,w.depth,x,w.height/2,w.depth/2,'#d4e0e4');
 box(shellRoot,w.width+.4,.16,w.depth+.4,w.width/2,w.height+.2,w.depth/2,'#dce7e8');
 for(let x=2;x<w.width;x+=6){box(shellRoot,.14,.22,w.depth,x,w.height-.2,w.depth/2,'#5e7e8c');box(shellRoot,1.6,.05,.28,x,w.height-.36,w.depth/2,'#ffffff');}
 shellRoot.visible=mode==='walk';labelRoot.visible=mode!=='walk';
 layout.objects.filter(o=>['rack','dock','office','waypoint'].includes(o.type)).slice(0,60).forEach(o=>makeLabel(o.name,o.x,o.z+o.height+.8,o.y));
}
$('focusBtn').onclick=()=>{document.body.classList.toggle('immersive');$('focusBtn').setAttribute('aria-pressed',String(document.body.classList.contains('immersive')));};
$('applySim').onclick=()=>{const speed=Number($('workerSpeed').value),dwell=Number($('workerDwell').value);if(!Number.isFinite(speed)||speed<.2||speed>3||!Number.isFinite(dwell)||dwell<0||dwell>60){toast('속도 0.2~3m/s, 작업 시간 0~60초로 입력하세요.');return;}layout.simulation={speed,dwell};history.push(layout);persist();rebuild();setupSimulation();syncPlayLabels();toast('운영 조건 적용 완료');};
try{const s=JSON.parse(localStorage.getItem('warehouse-city-github'));if(s)for(const [id,key]of Object.entries({ghOwner:'owner',ghRepo:'repo',ghBranch:'branch',ghPath:'path'}))if(typeof s[key]==='string')$(id).value=s[key];}catch{}
'''
edit('rebuild();iso();catalogue();requestAnimationFrame(animate);', extra+'\nrebuild();iso();catalogue();requestAnimationFrame(animate);')
css += '''
/* Release layout: the scene remains usable on a phone, and mode controls stay reachable. */
[hidden]{display:none!important}#runBtn{min-width:76px}.immersive main,.immersive.walk main{grid-template-columns:minmax(0,1fr)}.immersive aside{display:none!important}.immersive #stage{grid-column:1/-1}#objectColor{width:100%;height:38px}#ghStatus{white-space:pre-line;overflow-wrap:anywhere;min-height:20px}.walk .stats{pointer-events:none}.toolrow{align-items:center}.stagebar{flex-wrap:wrap}.stagebar .toolrow{margin-left:auto}button{min-height:36px}.catalogOnly .asset.active{box-shadow:0 0 0 2px #36b9b440}.walk #scene{cursor:grab}.walk #scene:active{cursor:grabbing}#minimap{margin-top:8px}
@media(max-width:850px){header{padding:8px 10px}.brand b{font-size:12px}.brand small{display:none}.project{min-width:58px}.project input{font-size:12px}.project small{display:none}.actions button{padding:8px;font-size:12px}.modes button{min-height:38px}.stagebar .pill{padding:7px 10px}.stagebar .toolrow{gap:4px}.stagebar button{padding:7px 9px}#sceneDetail{display:none}#undoBtn,#redoBtn{min-width:34px}#leftToggle{min-width:48px}.touchpad{left:14px;bottom:104px}#bottomhint{max-width:94%;width:auto;border-radius:10px;bottom:77px}.stat strong{font-size:15px}.stat em{display:none}.modalfoot{position:sticky;bottom:-25px;padding:12px 0;background:white}aside.open{padding-bottom:80px}#toast{bottom:18px}.immersive #mobileTools{display:none}}
'''
source = re.sub(r'<style>[\s\S]*?</style>', '<link rel="stylesheet" href="./city.css">', source, count=1)
source = re.sub(r'<script type="module">[\s\S]*?</script>', '<script type="module" src="./city-app.mjs"></script>', source, count=1)
source = source.replace('</head>', '<script>if(new URLSearchParams(location.search).get("classic")==="1")location.replace("./classic.html");</script></head>')
(root / 'index.html').write_text(source)
(root / 'city.html').write_text('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Warehouse City</title><script>location.replace("./index.html"+location.search+location.hash)</script><p><a href="./index.html">Warehouse City 열기</a></p></html>\n')
(root / 'city.css').write_text(css+'\n')
(root / 'city-app.mjs').write_text(app+'\n')
print('Release source generated. V8, original browser key, and layouts/ preserved.')
