import {ASSETS,STAGES,clone,uid,clamp,makeAsset,validateProject,createTemplate,placementIssue,Simulation,isFree} from './studio-core.js';
import {WarehouseView} from './studio-view.js';
import {GitHubStore,validTarget,validFile} from './studio-github.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const LOCAL_KEY='warehouse-play-project-v10',LEGACY_KEY='warehouse-studio-project-v1';
let project,view,sim,mode='edit',selected=null,pendingType=null,pendingRotation=0,stationEdit=null,drag=null;
let category='all',history=[],historyIndex=-1,revision=0,readonly=false,localOK=true,savedSnapshot=null,savedFile=null,store=new GitHubStore(),repoPrivate=null,ghBusy=false;
let draftUntouched=false;
let toastTimer,saveTimer,lastTime=0,lastHUD=0,bootMessage='';
const enc=()=>JSON.stringify(project);
function text(id,value){$(id).textContent=value;}
function toast(message,error=false){clearTimeout(toastTimer);text('#toast',message);$('#toast').className=error?'error':'';$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,error?6500:3600);}
function event(id,handler,type='click'){$(id).addEventListener(type,async e=>{try{await handler(e);}catch(err){toast(err.message||'작업을 마치지 못했습니다.',true);}});}
function elem(tag,className,value){const el=document.createElement(tag);if(className)el.className=className;if(value!==undefined)el.textContent=value;return el;}
function updateSaveStatus(){const cloud=savedSnapshot&&savedSnapshot===enc();text('#save-status',readonly?'공유 도면 · 보기 전용':cloud?'GitHub 저장 확인됨':localOK?'이 브라우저에 임시 저장 · GitHub 미저장':'임시 저장 실패 · JSON 백업 필요');}
function saveDraft(){if(readonly||draftUntouched)return;try{localStorage.setItem(LOCAL_KEY,enc());localOK=true;}catch{localOK=false;toast('브라우저 저장 공간이 부족하거나 차단되었습니다. JSON으로 내려받아 보관하세요.',true);}updateSaveStatus();}
function queueSave(){if(readonly)return;clearTimeout(saveTimer);saveTimer=setTimeout(saveDraft,220);updateSaveStatus();}
function persistSimulation(){revision++;queueSave();}
function closePanels(){$$('.left-panel,.right-panel').forEach(p=>p.classList.remove('open'));}
function openDialog(id){if(document.pointerLockElement)document.exitPointerLock();view?.clearKeys();$('.file-menu').open=false;$(id).showModal();}
function canEdit(){if(readonly){toast('공유 도면입니다. 내 사본 편집하기를 눌러 주세요.');return false;}if(mode!=='edit'){toast('배치하기 모드에서 설비를 수정하세요.');return false;}return true;}
function cancelPlacement(){pendingType=null;stationEdit=null;view?.ghost(null);view&&(view.controls.enabled=!view.walking);$$('.asset-item,.station-btn').forEach(b=>b.classList.remove('active'));hint();}
function hint(){text('#stage-hint',pendingType?`${ASSETS[pendingType].label} · 놓을 바닥을 클릭하세요. R 회전 / Esc 취소`:stationEdit!==null?`${STAGES[stationEdit]} 지점으로 사용할 빈 통로를 클릭하세요. Esc 취소`:mode==='walk'?'WASD / 방향키 이동 · 화면 드래그 / 마우스 고정 시점 · Q/E 회전 · Shift 빠르게 · Esc 나가기':mode==='sim'?'재생하면 작업자가 설비를 피해 이동합니다. 오른쪽에서 작업 지점을 바꿔 보세요.':'마우스 오른쪽: 회전 · 휠: 확대 · 바닥 드래그: 화면 이동');}
function refresh({fit=false}={}){view.setProject(project,{fit});sim=new Simulation(project);view.setAgents(sim);view.select(selected);syncUI();}
function commit({rebuild=true}={}){draftUntouched=false;revision++;history.splice(historyIndex+1);history.push(enc());if(history.length>60)history.shift();historyIndex=history.length-1;if(rebuild)refresh();else syncUI();queueSave();}
function replaceProject(raw,{record=true,fit=true,remote=false}={}){
  const valid=validateProject(raw);cancelPlacement();if(view.walking)view.exitWalk();mode='edit';document.body.dataset.mode=mode;project=valid;selected=null;
  if(!remote){store.forgetLoaded();savedFile=null;savedSnapshot=null;$('#share-field').hidden=true;}
  if(record)commit();else {history=[enc()];historyIndex=0;refresh();}if(fit)view.fit();setMode('edit');
}
function undo(direction){if(!canEdit())return;const next=historyIndex+direction;if(next<0||next>=history.length)return;cancelPlacement();historyIndex=next;project=validateProject(JSON.parse(history[next]));selected=null;revision++;refresh();queueSave();}
function setMode(next){
  cancelPlacement();closePanels();if(mode==='walk'&&next!=='walk')view.exitWalk();
  if(next==='walk'&&!view.walking){view.enterWalk();}
  mode=next;document.body.dataset.mode=next;if(next==='edit')sim.running=false;
  $$('.mode-tabs button').forEach(b=>{const active=b.dataset.mode===next;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  const badge=$('#mode-badge');badge.replaceChildren(elem('i'),document.createTextNode(next==='edit'?' 배치 모드':' 동선 시뮬레이션'));
  text('#map-caption',next==='walk'?'나의 위치':'창고 전체');view.resize();syncInspector();hint();updateHUD();
}
function syncUI(){text('#project-title','');$('#project-title').value=project.projectName;$('#project-title').readOnly=readonly;
  const {width:w,depth:d,height:h}=project.warehouse,racks=project.objects.filter(o=>o.type==='rack'||o.type==='boxrack');
  text('#warehouse-size',`${w} × ${d} m`);text('#warehouse-height',`높이 ${h} m`);text('#stat-area',(w*d).toLocaleString('ko-KR',{maximumFractionDigits:1}));text('#stat-objects',project.objects.length);text('#stat-racks',racks.length);text('#stat-locations',project.objects.filter(o=>o.type==='rack').reduce((n,o)=>n+(o.config?.bays||1)*(o.config?.levels||1)*(o.config?.palletsPerLevel||1),0).toLocaleString('ko-KR'));
  $('#undo-btn').disabled=historyIndex<=0||readonly;$('#redo-btn').disabled=historyIndex>=history.length-1||readonly;$('#workers-input').value=project.simulation.workers;text('#workers-label',`${project.simulation.workers}명`);$('#speed-select').value=sim.speed;
  $('#read-only-banner').hidden=!readonly;document.body.classList.toggle('read-only',readonly);text('#footer-info',`${w} × ${d} × ${h} m · ${project.objects.length}개 설비 · ${readonly?'보기 전용':'로컬 자동 저장 / GitHub 명시적 저장'}`);
  syncStations();syncInspector();updateHUD();updateSaveStatus();
}
function syncStations(){const list=$('#station-list');list.replaceChildren();project.simulation.stations.forEach((s,i)=>{const b=elem('button','station-btn'),copy=elem('span','',s.label);b.dataset.station=String(i);copy.append(elem('small','',`X ${s.x.toFixed(1)} · Y ${s.y.toFixed(1)} m`));b.append(elem('span','number',i+1),copy);b.disabled=readonly;b.onclick=()=>{if(readonly)return;stationEdit=i;pendingType=null;sim.running=false;view.controls.enabled=false;$$('.station-btn').forEach(x=>x.classList.toggle('active',x===b));closePanels();hint();};list.append(b);});}
function selectedObject(){return project.objects.find(o=>o.id===selected);}
function syncInspector(){const o=selectedObject(),showSelection=mode==='edit'&&!!o&&!readonly;$('#overview-panel').hidden=mode!=='edit'||showSelection;$('#selection-panel').hidden=!showSelection;$('#simulation-panel').hidden=mode==='edit';text('#inspector-eyebrow',mode==='edit'?(showSelection?'SELECTED OBJECT':'SPACE OVERVIEW'):'LIVE SIMULATION');text('#inspector-heading',mode==='edit'?(showSelection?'설비 상세 설정':'나의 창고 한눈에'):'작업 흐름 설정');
  if(showSelection){for(const key of ['name','x','y','z','width','depth','height','rotation','color'])$(`#object-${key}`).value=o[key]??0;text('#object-type',`${ASSETS[o.type].english} · ${o.locked?'잠김':'선택됨'}`);$('#object-locked').checked=o.locked;$('#text-field').hidden=!['textlabel','sign','warning'].includes(o.type);$('#object-text').value=o.config?.text||'';$('#rotate-btn').disabled=o.locked;$('#delete-btn').disabled=o.locked;}
}
function select(id){selected=id;view.select(id);syncInspector();}
function assetCategory(type){if(['rack','boxrack','shelf','pallet','box','stack'].includes(type))return 'storage';if(['forklift','conveyor','worktable','tapingmachine','volumechecker','ers','heavyscale','barcodescanner','printer','officeprinter','computer','handtruck'].includes(type))return 'process';if(['office','breakroom','lockerroom','partition','door','cleanbooth','safety','chair'].includes(type))return 'space';return 'safety';}
function renderPalette(){const search=$('#asset-search').value.trim().toLowerCase(),list=$('#asset-list');list.replaceChildren();let count=0;
  for(const [type,a] of Object.entries(ASSETS)){if(category!=='all'&&assetCategory(type)!==category)continue;if(search&&!`${a.label} ${a.english}`.toLowerCase().includes(search))continue;count++;const b=elem('button','asset-item');b.dataset.asset=type;b.setAttribute('aria-label',`${a.label} 배치`);b.append(elem('span','asset-glyph',a.icon),elem('strong','',a.label),elem('small','',`${a.width} × ${a.depth} m`));b.onclick=()=>{if(!canEdit())return;pendingType=type;pendingRotation=0;stationEdit=null;select(null);$$('.asset-item').forEach(x=>x.classList.toggle('active',x===b));view.controls.enabled=false;closePanels();hint();toast(`${a.label}: 바닥을 클릭해 배치하세요.`);};list.append(b);}
  text('#asset-count',`${count}종`);
}
function snapPoint(p){const s=Number($('#snap-select').value);return {x:Math.round(p.x/s)*s,y:Math.round(p.y/s)*s};}
function moveTree(newRoot){
  const old=selectedObject(),candidate=clone(project),affected=new Set([old.id]);let grew=true;while(grew){grew=false;for(const o of candidate.objects)if(affected.has(o.supportId)&&!affected.has(o.id)){affected.add(o.id);grew=true;}}
  if(affected.size>1&&(newRoot.rotation!==old.rotation||newRoot.width!==old.width||newRoot.depth!==old.depth||newRoot.height!==old.height))throw new Error('적재된 설비의 회전·규격 변경은 정밀 편집기를 이용하세요.');
  for(let i=0;i<candidate.objects.length;i++){const o=candidate.objects[i];if(o.id===old.id)candidate.objects[i]=newRoot;else if(affected.has(o.id)){if(o.locked)throw new Error('위에 놓인 잠금 설비가 있습니다.');o.x+=newRoot.x-old.x;o.y+=newRoot.y-old.y;o.z+=(newRoot.z||0)-(old.z||0);}}
  const clean=validateProject(candidate);for(const o of clean.objects.filter(x=>affected.has(x.id))){const issue=placementIssue({...clean,objects:clean.objects.filter(x=>!affected.has(x.id))},o);if(issue)throw new Error(issue);}project=clean;commit();
}
function rotate(){if(pendingType){pendingRotation=(pendingRotation+90)%360;toast(`${pendingRotation}° 회전 · 바닥에 놓으세요.`);return;}if(!canEdit())return;const o=selectedObject();if(!o)return;if(o.locked)throw new Error('잠긴 설비입니다.');moveTree({...clone(o),rotation:(o.rotation+90)%360});}
function duplicate(){if(!canEdit())return;const o=selectedObject();if(!o)return;const copy={...clone(o),id:uid(),name:`${o.name} 사본`,locked:false};delete copy.supportId;let found=false;for(let radius=1;radius<40&&!found;radius++)for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,-1]]){copy.x=clamp(o.x+dx*radius*.5,0,project.warehouse.width);copy.y=clamp(o.y+dy*radius*.5,0,project.warehouse.depth);if(!placementIssue(project,copy)){found=true;break;}}if(!found)throw new Error('복제할 빈 공간이 없습니다.');project.objects.push(copy);selected=copy.id;commit();}
function removeSelected(){if(!canEdit())return;const o=selectedObject();if(!o)return;if(o.locked)throw new Error('잠긴 설비입니다.');if(project.objects.some(x=>x.supportId===o.id))throw new Error('위에 적재된 박스가 있습니다. 정밀 편집기에서 적재를 해제하세요.');project.objects=project.objects.filter(x=>x.id!==o.id);selected=null;commit();}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function exportJSON(){download(new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),`${project.projectName.replace(/[\\/:*?"<>|]/g,'-')}.json`);$('.file-menu').open=false;}
function updateHUD(){if(!sim)return;text('#play-btn',sim.running?'Ⅱ':'▶');$('#play-btn').setAttribute('aria-label',sim.running?'시뮬레이션 일시정지':'시뮬레이션 시작');text('#sim-state',sim.running?`${sim.agents.length}명의 작업자가 움직이고 있어요`:sim.elapsed?'시뮬레이션 일시정지':'작업 흐름을 확인해 보세요');const sec=Math.floor(sim.elapsed);text('#elapsed',`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`);text('#cycles',sim.completed);text('#distance',Math.round(sim.distance).toLocaleString('ko-KR'));text('#blocked',sim.blocked);const missing=project.simulation.workers-sim.agents.length;$('#sim-warning').hidden=!sim.blocked&&!missing;text('#sim-warning',sim.blocked?`${sim.blocked}명의 작업자가 경로를 찾지 못했습니다. 작업 지점과 통로를 확인하세요.`:missing?`${missing}명은 시작할 빈 공간이 부족합니다. 입고 구역을 넓혀 주세요.`:'');view.drawMap(sim);}
function bindCanvas(){const canvas=$('#scene-canvas');canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{if(view.walking||e.button!==0)return;
    if(stationEdit!==null){e.stopImmediatePropagation();const p=view.ground(e);if(!p)return;const q=snapPoint(p);if(!isFree(project,q.x,q.y,.4)){toast('설비 안이 아닌 빈 통로를 선택하세요.',true);return;}const i=stationEdit;project.simulation.stations[i]={...project.simulation.stations[i],...q};cancelPlacement();commit();setMode('sim');toast(`${STAGES[i]} 작업 지점을 바꿨습니다.`);return;}
    if(mode!=='edit'||readonly)return;
    if(pendingType){e.stopImmediatePropagation();const p=view.ground(e);if(!p)return;const q=snapPoint(p),o=makeAsset(pendingType,q.x,q.y,{rotation:pendingRotation});const issue=placementIssue(project,o);if(issue){toast(issue,true);return;}if(project.objects.length>=1000){toast('최대 1,000개까지 배치할 수 있습니다.',true);return;}project.objects.push(o);selected=o.id;cancelPlacement();commit();return;}
    const hit=view.pick(e);select(hit);const o=selectedObject();if(o&&!o.locked){e.stopImmediatePropagation();view.controls.enabled=false;canvas.setPointerCapture(e.pointerId);drag={original:clone(o),start:view.ground(e),sx:e.clientX,sy:e.clientY,candidate:null};}
  },true);
  canvas.addEventListener('pointermove',e=>{if(view.walking)return;const p=view.ground(e);if(!p)return;
    if(pendingType){const q=snapPoint(p),o=makeAsset(pendingType,q.x,q.y,{rotation:pendingRotation});view.ghost(o,!placementIssue(project,o));return;}
    if(drag&&drag.start&&Math.hypot(e.clientX-drag.sx,e.clientY-drag.sy)>4){const q=snapPoint({x:drag.original.x+p.x-drag.start.x,y:drag.original.y+p.y-drag.start.y});const o={...drag.original,...q};drag.candidate=o;const valid=!placementIssue(project,o);view.ghost(o,valid);}
  });
  const end=e=>{if(!drag)return;const data=drag;drag=null;view.controls.enabled=true;view.ghost(null);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);if(data.candidate){try{moveTree(data.candidate);}catch(err){toast(err.message,true);view.updatePosition(data.original);}}};
  canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',e=>{if(drag){drag.candidate=null;end(e);}});
}
async function ensureStore(){const target=validTarget({owner:$('#gh-owner').value.trim(),repo:$('#gh-repo').value.trim(),branch:$('#gh-branch').value.trim()});const token=$('#gh-token').value.trim();$('#gh-token').value='';
  if(token||JSON.stringify(store.target)!==JSON.stringify(target)){store.disconnect();store=new GitHubStore(target,token);repoPrivate=null;savedSnapshot=null;savedFile=null;$('#share-field').hidden=true;}return store;
}
function ghStatus(message,error=false){text('#gh-status',message);$('#gh-status').className=error?'notice error-text':'notice';}
async function busyGH(task){if(ghBusy)return;ghBusy=true;$$('#github-dialog button:not([data-close-dialog])').forEach(b=>b.disabled=true);try{await task();}catch(e){ghStatus(e.message,true);}finally{ghBusy=false;$$('#github-dialog button:not([data-close-dialog])').forEach(b=>b.disabled=false);}}
async function connectGH(){await busyGH(async()=>{ghStatus('저장소와 파일 목록을 확인하고 있습니다.');await ensureStore();const info=await store.info();repoPrivate=info.private;const files=await store.list(),select=$('#gh-files');select.replaceChildren(new Option(files.length?'불러올 도면을 선택하세요':'저장된 도면이 없습니다.',''));files.forEach(f=>select.add(new Option(f.name,f.name)));ghStatus(`${store.connected?'관리자 인증 연결':'공개 읽기 연결'} · ${repoPrivate?'비공개':'공개'} 저장소 · ${files.length}개 도면`);});}
function displayShare(){if(!savedFile)return;$('#share-field').hidden=false;$('#share-url').value=store.shareURL(savedFile);}
async function saveGH(){await busyGH(async()=>{
  if(readonly)throw new Error('보기 전용 도면입니다. 내 사본 편집하기를 먼저 눌러 주세요.');
  await ensureStore();if(!store.connected)throw new Error('관리자 토큰을 입력하고 연결해 주세요.');
  if(!$('#gh-public-ack').checked)throw new Error('도면 공개·민감 정보 안내를 확인해 주세요.');
  if(repoPrivate===null){const info=await store.info();repoPrivate=info.private;}
  const file=validFile($('#gh-filename').value),payload=validateProject(clone(project)),snapshot=JSON.stringify(payload);ghStatus('GitHub에 저장 중입니다. 탭을 닫지 마세요.');
  const result=await store.save(file,payload);savedFile=result.file;savedSnapshot=snapshot;displayShare();saveDraft();updateSaveStatus();ghStatus(`저장 완료 · projects/${result.file} · ${result.sha.slice(0,7)}${enc()!==snapshot?' · 저장 도중 수정한 내용은 다시 저장하세요.':''}`);toast('GitHub 저장이 확인되었습니다.');
});}
async function loadGH(){await busyGH(async()=>{const file=$('#gh-files').value;if(!file)throw new Error('불러올 도면을 선택하세요.');if(!confirm('선택한 도면으로 변경할까요? 현재 도면은 실행 취소로 되돌릴 수 있습니다.'))return;const startRevision=revision;ghStatus('도면을 불러오고 있습니다.');const result=await store.load(file),next=validateProject(result.project);if(revision!==startRevision)throw new Error('불러오는 동안 도면이 수정되어 자동 교체하지 않았습니다. 다시 시도하세요.');readonly=false;replaceProject(next,{remote:true});savedFile=result.file;savedSnapshot=enc();$('#gh-filename').value=result.file;displayShare();saveDraft();ghStatus(`불러오기 완료 · ${file}`);$('#github-dialog').close();});}
function bind(){
  $$('.mode-tabs button').forEach(b=>b.addEventListener('click',()=>{try{setMode(b.dataset.mode);}catch(e){toast(e.message,true);}}));
  event('#undo-btn',()=>undo(-1));event('#redo-btn',()=>undo(1));event('#rotate-btn',rotate);event('#duplicate-btn',duplicate);event('#delete-btn',removeSelected);
  event('#asset-search',renderPalette,'input');$$('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;$$('[data-category]').forEach(x=>x.classList.toggle('active',x===b));renderPalette();});
  event('#apply-object-btn',()=>{if(!canEdit())return;const o=selectedObject();if(!o)return;const next=clone(o);for(const key of ['x','y','z','width','depth','height','rotation'])next[key]=$(`#object-${key}`).value;next.name=$('#object-name').value;next.color=$('#object-color').value;next.config.text=$('#object-text').value;next.locked=$('#object-locked').checked;const checked=validateProject({...project,objects:project.objects.map(x=>x.id===o.id?next:x)}).objects.find(x=>x.id===o.id);
    if(o.locked){if(next.locked)throw new Error('잠금을 해제한 뒤 설비를 수정하세요.');project.objects=project.objects.map(x=>x.id===o.id?{...x,locked:false}:x);commit();toast('설비 잠금을 해제했습니다.');return;}moveTree(checked);toast('변경한 위치와 규격을 적용했습니다.');});
  event('#project-title',()=>{if(readonly)return;project.projectName=$('#project-title').value.trim()||'나의 창고';commit();},'change');
  event('#iso-btn',()=>{view.fit();$('#iso-btn').classList.add('active');$('#top-btn').classList.remove('active');});event('#top-btn',()=>{view.top();$('#top-btn').classList.add('active');$('#iso-btn').classList.remove('active');});event('#fit-btn',()=>view.fit());event('#grid-btn',()=>view.grid.visible=!view.grid.visible);
  event('#wizard-btn',()=>{if(canEdit())openDialog('#wizard-dialog');});const presets={small:{width:24,depth:20,height:6,rows:2,columns:2,aisle:2.5},standard:{width:36,depth:28,height:9,rows:3,columns:2,aisle:3},large:{width:80,depth:50,height:13,rows:6,columns:5,aisle:3.5}};
  $$('[data-preset]').forEach(b=>b.onclick=()=>{for(const [key,value] of Object.entries(presets[b.dataset.preset]))$(`#wizard-${key}`).value=value;$$('[data-preset]').forEach(x=>x.classList.toggle('active',x===b));});
  event('#build-btn',()=>{try{const inputs=Object.fromEntries(['width','depth','height','rows','columns','aisle'].map(k=>[k,$(`#wizard-${k}`).value]));const p=createTemplate(inputs);replaceProject(p);$('#wizard-dialog').close();closePanels();toast('랙과 작업 구역을 자동으로 배치했습니다.');}catch(e){text('#wizard-error',e.message);}});
  event('#export-btn',exportJSON);event('#import-btn',()=>{if(!canEdit())return;$('#import-file').click();$('.file-menu').open=false;});event('#import-file',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>4*1024*1024)throw new Error('JSON은 4MB 이하로 불러오세요.');const p=validateProject(JSON.parse(await file.text()));if(confirm('파일 도면으로 변경할까요? 실행 취소로 되돌릴 수 있습니다.')){replaceProject(p);toast('도면을 불러왔습니다.');}},'change');
  event('#sample-btn',async()=>{if(!canEdit())return;const r=await fetch('./layouts/standard-distribution-center.json');if(!r.ok)throw new Error('기준 도면을 불러오지 못했습니다.');const p=validateProject(await r.json());if(confirm('기존 기준 도면으로 변경할까요?'))replaceProject(p);$('.file-menu').open=false;});
  event('#blank-btn',()=>{if(!canEdit()||!confirm('설비 없는 빈 도면으로 바꿀까요? 실행 취소로 되돌릴 수 있습니다.'))return;replaceProject({...createTemplate(),projectName:'빈 창고',objects:[]});$('.file-menu').open=false;});
  event('#screenshot-btn',()=>{$('.file-menu').open=false;view.renderer.render(view.scene,view.camera);$('#scene-canvas').toBlob(b=>{if(b)download(b,'warehouse-view.png');});});event('#help-btn',()=>openDialog('#help-dialog'));
  event('#play-btn',()=>{if(mode==='edit')setMode('sim');sim.running=!sim.running;updateHUD();});event('#reset-sim-btn',()=>{sim.reset();view.setAgents(sim);updateHUD();});event('#speed-select',()=>{sim.speed=Number($('#speed-select').value);project.simulation.speed=sim.speed;if(!readonly)persistSimulation();},'change');
  event('#workers-input',()=>{const n=Number($('#workers-input').value);text('#workers-label',`${n}명`);},'input');event('#workers-input',()=>{project.simulation.workers=Number($('#workers-input').value);sim=new Simulation(project);view.setAgents(sim);if(!readonly)persistSimulation();updateHUD();},'change');
  event('#routes-check',()=>{view.showRoutes=$('#routes-check').checked;view.routeLayer.visible=view.showRoutes;},'change');event('#exit-walk-btn',()=>setMode('sim'));event('#lock-btn',()=>view.lock());
  $$('[data-move]').forEach(b=>{const dir=b.dataset.move,field=['forward','back'].includes(dir)?'forward':'right',value=['back','left'].includes(dir)?-1:1;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);view.touch[field]=value;});const release=()=>view.touch[field]=0;b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);});
  event('#palette-toggle',()=>{$('#right-panel').classList.remove('open');$('#left-panel').classList.toggle('open');});event('#inspector-toggle',()=>{$('#left-panel').classList.remove('open');$('#right-panel').classList.toggle('open');});$$('[data-close-panel]').forEach(b=>b.onclick=closePanels);$$('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
  event('#github-btn',()=>openDialog('#github-dialog'));event('#share-btn',()=>{openDialog('#github-dialog');if(savedFile){displayShare();$('#share-field').scrollIntoView({block:'center'});}else ghStatus('GitHub에 저장한 도면만 작업자용 링크로 공유할 수 있습니다. 먼저 저장하거나 목록에서 불러오세요.');});
  event('#gh-connect',connectGH);event('#gh-save',saveGH);event('#gh-load',loadGH);event('#gh-disconnect',()=>{store.disconnect();$('#gh-token').value='';ghStatus('연결을 해제했습니다. 토큰을 메모리에서 지웠습니다.');});
  event('#copy-share-btn',async()=>{try{await navigator.clipboard.writeText($('#share-url').value);toast('작업자용 링크를 복사했습니다.');}catch{$('#share-url').select();toast('링크를 선택했습니다. 복사해 주세요.');}});
  event('#edit-copy-btn',()=>{readonly=false;store.forgetLoaded();$('#gh-filename').value='warehouse-copy';savedSnapshot=null;savedFile=null;project.projectName+=' · 사본';history=[enc()];historyIndex=0;const url=new URL(location.href);url.search='';window.history.replaceState(null,'',url);setMode('edit');syncUI();queueSave();toast('내 브라우저의 사본으로 편집합니다. 원본 GitHub 파일은 변경하지 않습니다.');});
  window.addEventListener('keydown',e=>{if($('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;try{if(e.code==='Escape'){if(mode==='walk')setMode('sim');else cancelPlacement();closePanels();}else if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();undo(e.shiftKey?1:-1);}else if((e.ctrlKey||e.metaKey)&&e.code==='KeyY'){e.preventDefault();undo(1);}else if((e.ctrlKey||e.metaKey)&&e.code==='KeyS'){e.preventDefault();openDialog('#github-dialog');}else if(mode==='edit'&&e.code==='KeyR')rotate();else if(mode==='edit'&&(e.code==='Delete'||e.code==='Backspace')){e.preventDefault();removeSelected();}}catch(err){toast(err.message,true);}});
  document.addEventListener('click',e=>{if(!e.target.closest('.file-menu'))$('.file-menu').open=false;});window.addEventListener('pagehide',()=>{clearTimeout(saveTimer);saveDraft();store.disconnect();});bindCanvas();
}
async function loadShared(params){const file=validFile(params.get('project')),target=validTarget(Object.fromEntries(['owner','repo','branch'].map(k=>[k,params.get(k)||({owner:'dalmook',repo:'3D_warehouse',branch:'main'})[k]])));store=new GitHubStore(target);Object.entries(target).forEach(([k,v])=>$(`#gh-${k}`).value=v);
  let result;
  try{result=await store.load(file);}catch(err){
    // Own published examples also work during GitHub public API rate limits.
    if(target.owner!=='dalmook'||target.repo!=='3D_warehouse'||target.branch!=='main')throw err;
    const r=await fetch(`./projects/${encodeURIComponent(file)}`,{cache:'no-store'});if(!r.ok)throw err;result={project:await r.json(),file};
  }
  project=validateProject(result.project);readonly=true;history=[enc()];historyIndex=0;refresh({fit:true});savedFile=file;savedSnapshot=enc();$('#gh-filename').value=file;displayShare();setMode(params.get('mode')==='walk'?'walk':'sim');updateSaveStatus();
}
async function start(){try{
  project=createTemplate();const params=new URLSearchParams(location.search);
  if(!params.has('project')){try{const draft=localStorage.getItem(LOCAL_KEY),legacy=localStorage.getItem(LEGACY_KEY);if(draft)project=validateProject(JSON.parse(draft));else if(legacy){project=validateProject(JSON.parse(legacy));bootMessage='기존 도면을 새 편집기에 불러왔습니다. 기존 저장본은 그대로 남겨 두었습니다.';}}catch{draftUntouched=true;bootMessage='저장된 도면을 열지 못해 예제를 표시합니다. 기존 저장본은 삭제하지 않았습니다.';}}
  view=new WarehouseView($('#scene-canvas'),$('#minimap'));history=[enc()];historyIndex=0;refresh({fit:true});renderPalette();bind();
  if(params.has('project')){try{await loadShared(params);}catch(e){readonly=true;document.body.classList.add('read-only');$('#read-only-banner').hidden=false;toast(`공유 도면을 불러오지 못했습니다. 예제를 표시합니다. ${e.message}`,true);bootMessage='공유 도면 불러오기 실패 · 현재 화면은 예제입니다.';text('#footer-info',bootMessage);}}
  $('#loading').hidden=true;document.body.dataset.ready='true';if(bootMessage)toast(bootMessage,true);
  if(params.get('test')==='1')Object.defineProperty(window,'__warehouseTest',{value:Object.freeze({project:()=>clone(project),sim:()=>({elapsed:sim.elapsed,completed:sim.completed,distance:sim.distance,running:sim.running,blocked:sim.blocked,agents:sim.agents.map(({x,y,stage,blocked})=>({x,y,stage,blocked}))}),player:()=>view.player?{...view.player,yaw:view.yaw}:null,screen:(x,y,z=0)=>view.screenPoint(x,y,z),loaded:()=>view.meshes.size,move:(x,y)=>{if(!view.walking)throw new Error('walk required');view.player={x,y};view.applyWalkCamera();},advance:seconds=>{for(let t=0;t<seconds;t+=.05)sim.tick(.05);updateHUD();},gl:()=>view.renderer.getContext().getParameter(view.renderer.getContext().VERSION)})});
  const frame=now=>{const dt=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now;const active=!document.hidden&&!$('dialog[open]');if(active)sim.tick(dt);view.tick(active?dt:0,sim);if(now-lastHUD>120){updateHUD();lastHUD=now;}requestAnimationFrame(frame);};requestAnimationFrame(frame);
}catch(e){$('#loading').hidden=true;$('#fatal').hidden=false;text('#fatal-message',`${e.message}. WebGL을 지원하는 최신 Chrome 또는 Edge에서 하드웨어 가속을 확인해 주세요.`);console.error('Warehouse initialization failed:',e);}}
start();
