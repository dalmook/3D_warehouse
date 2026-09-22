import {CATALOG, copy, normalize} from './city-core.mjs';
import {analyzeLayout, scheduleCSV} from './city-insights.mjs';
import {download} from './city-output.mjs';

const $ = id => document.getElementById(id);
const number = (v, digits=0) => Number(v).toLocaleString('ko-KR', {maximumFractionDigits:digits});
const el = (tag, cls, text) => {const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const button = (id,text,fn,cls='') => {const b=el('button',cls,text);b.id=id;b.type='button';if(fn)b.addEventListener('click',fn);return b;};
const safeName = text => String(text||'warehouse').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').slice(0,80);

/** Progressive workbench: retains the original controls and all project formats. */
export function installWorkbench(api) {
 if($('wbReview'))return;
 const safe = fn => async(...args)=>{try{await fn(...args);}catch(e){api.toast(e.message||String(e));}};
 let insights, refreshTimer;
 const click = id => {const target=$(id);if(!target||target.disabled){api.toast('현재 모드에서는 사용할 수 없습니다.');return;}target.click();};
 const show = d => {if($('githubDialog')?.open&&$('ghSave')?.disabled){api.toast('GitHub 요청이 끝난 뒤 다른 기능을 여세요.');return false;}for(const other of document.querySelectorAll('dialog[open]'))if(other!==d)other.close();d.showModal();};
 const dialog = (id,title,desc) => {
  const d=el('dialog','wb-dialog');d.id=id;d.setAttribute('aria-labelledby',id+'Title');
  const head=el('div','wb-dialog-head'),h=el('h2','',title);h.id=id+'Title';
  const close=button(id+'Close','닫기',()=>d.close(),'wb-close');close.setAttribute('aria-label',title+' 닫기');
  head.append(h,close);d.append(head,el('p','',desc));document.body.append(d);return d;
 };
 const goPanel = name => {api.setMode('edit');document.querySelectorAll('[data-panel]').forEach(b=>{const active=b.dataset.panel===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});for(const id of ['Catalog','Automate','Project'])$('wb'+id+'Panel').hidden=id.toLowerCase()!==name;$('left').classList.add('open');if(innerWidth<=850)$('right').classList.remove('open');$('left').scrollTop=0;};
 const tabs = (names,attribute,handler) => {
  const nav=el('div','wb-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label',attribute==='panel'?'설계 도구 분류':'창고 정보');
  for(const [value,label] of names){const b=button('wbTab'+value,label,()=>handler(value));b.dataset[attribute]=value;b.setAttribute('role','tab');b.setAttribute('aria-controls',attribute==='panel'?'wb'+value[0].toUpperCase()+value.slice(1)+'Panel':'wb'+value[0].toUpperCase()+value.slice(1));nav.append(b);}
  nav.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const all=[...nav.children],i=all.indexOf(document.activeElement);const n=e.key==='Home'?0:e.key==='End'?all.length-1:(i+(e.key==='ArrowRight'?1:-1)+all.length)%all.length;all[n].click();all[n].focus();});return nav;
 };
 // Three short, task-oriented library panels replace one long wall of controls.
 const library=document.querySelector('.catalogOnly'),oldSections=[...library.querySelectorAll(':scope > .section')];
 const catalog=el('section');catalog.id='wbCatalogPanel';catalog.setAttribute('role','tabpanel');
 catalog.append($('search'),$('category').closest('label'),$('catalog'));
 const noResults=el('p','wb-empty','검색 결과가 없습니다. 다른 설비 이름으로 검색하세요.');noResults.id='wbCatalogEmpty';noResults.hidden=true;catalog.append(noResults);
 const automate=el('section');automate.id='wbAutomatePanel';automate.setAttribute('role','tabpanel');
 automate.append(el('h3','','반복 작업을 한 번에'),el('p','','미리보기에서 수량과 간격을 확인하고 배치하세요.'));
 const row=$('rowBtn');if(row)automate.append(row);
 for(const [id,label,target] of [['wbArea','팔레트 · 박스 구역 채우기','areaOpen'],['wbStack','팔레트 박스 적재 계산','stackOpen']])if($(target))automate.append(button(id,label,()=>click(target),'wide'));
 if(oldSections[0])automate.append(oldSections[0]);
 const project=el('section');project.id='wbProjectPanel';project.setAttribute('role','tabpanel');
 const start=oldSections[1];if(start){start.querySelector('h2').textContent='시작 · 가져오기';project.append(start);}
 library.append(tabs([['catalog','설비'],['automate','자동 배치'],['project','프로젝트']],'panel',goPanel),catalog,automate,project);
 new MutationObserver(()=>{noResults.hidden=$('catalog').children.length>0;}).observe($('catalog'),{childList:true});
 $('modeTitle').textContent='공간을 설계하세요';$('modeDesc').textContent='설비 선택 후 바닥 클릭 · R 회전 · Esc 해제';
 goPanel('catalog');$('left').classList.remove('open');
 const actions=document.querySelector('.actions');
 actions.prepend(button('wbProject','프로젝트',()=>goPanel('project')));
 $('exportBtn').textContent='JSON';if($('sharedSave'))$('sharedSave').textContent='공용 저장';
 if($('githubBtn'))$('githubBtn').textContent='GitHub 저장';
 document.querySelector('.brand small').textContent='WAREHOUSE PLANNING / 10.0';
 document.querySelector('.brand .logo').textContent='W';
 // Contextual inspector and a searchable inventory of actual placed objects.
 const settings=$('editSettings'),sections=[...settings.querySelectorAll(':scope > .section')];
 const overview=el('section');overview.id='wbOverview';overview.setAttribute('role','tabpanel');
 const metrics=el('div');metrics.id='wbMetrics';overview.append(metrics);
 const dimensions=el('details','wb-details');dimensions.append(el('summary','','창고 규격'));if(sections[0])dimensions.append(sections[0]);overview.append(dimensions);
 const treeHead=el('div','wb-tree-head');treeHead.append(el('h3','','배치한 설비'));const treeCount=el('span','wb-count');treeCount.id='wbTreeCount';treeHead.append(treeCount);overview.append(treeHead);
 const treeSearch=el('input');treeSearch.id='wbObjectSearch';treeSearch.type='search';treeSearch.placeholder='이름으로 설비 찾기';treeSearch.setAttribute('aria-label','배치 설비 검색');overview.append(treeSearch);
 const tree=el('div');tree.id='wbObjectTree';tree.setAttribute('aria-label','배치 설비 목록');overview.append(tree);
 const selection=el('section');selection.id='wbSelection';selection.setAttribute('role','tabpanel');if(sections[1])selection.append(sections[1]);
 const inspectorPanel=name=>{for(const [key,p]of [['overview',overview],['selection',selection]])p.hidden=key!==name;document.querySelectorAll('[data-inspector]').forEach(b=>{const active=b.dataset.inspector===name;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});};
 settings.prepend(tabs([['overview','창고 현황'],['selection','설비 속성']],'inspector',inspectorPanel),overview,selection);inspectorPanel('overview');
 document.querySelector('#right > .label').textContent='WORKSPACE';document.querySelector('#right > h2').textContent='창고 현황';
 const focusObject=id=>{api.setMode('edit');api.cancelTool();api.setIds?.([]);api.select(id);api.focus?.(id);inspectorPanel('selection');$('right').classList.add('open');if(innerWidth<=850)$('left').classList.remove('open');$('right').scrollTop=0;};
 function renderTree(){const q=treeSearch.value.trim().toLowerCase(),list=api.get().objects.filter(o=>[o.name,CATALOG[o.type]?.name,o.type].join(' ').toLowerCase().includes(q));treeCount.textContent=number(api.get().objects.length)+'개';tree.replaceChildren();for(const o of list){const b=button('', '',()=>focusObject(o.id),'wb-object-row');b.dataset.objectId=o.id;b.setAttribute('aria-label',o.name+' 선택');const dot=el('span','wb-dot');dot.style.backgroundColor=o.color;const label=el('span','',o.name),small=el('small','',o.locked?'잠김':CATALOG[o.type]?.name||o.type);b.append(dot,label,small);b.classList.toggle('active',api.selected()===o.id);tree.append(b);}if(!list.length)tree.append(el('p','wb-empty',q?'일치하는 설비가 없습니다.':'왼쪽 설비 메뉴에서 배치를 시작하세요.'));}
 treeSearch.addEventListener('input',renderTree);
 // Always available review and schedule; thresholds are user design assumptions.
 const review=dialog('wbReviewDialog','배치 검토','위치를 선택하면 해당 설비로 이동합니다. 기하학적 배치 점검이며 안전 적합성 판정은 아닙니다.');
 const aisle=el('label','field','표시된 통로의 검토 폭 (m)'),threshold=el('input');threshold.id='wbAisleThreshold';threshold.type='number';threshold.min='.1';threshold.max='20';threshold.step='.1';threshold.value='1.2';aisle.append(threshold);review.append(aisle);
 const reviewSummary=el('p','wb-review-summary'),issues=el('div','wb-issues');review.append(reviewSummary,issues);
 threshold.addEventListener('change',()=>{const v=Number(threshold.value);if(!Number.isFinite(v)||v<.1||v>20){threshold.value='1.2';api.toast('검토 폭은 0.1~20m로 입력하세요.');}refresh();});
 function renderReview(){reviewSummary.textContent=`경계·겹침 ${insights.summary.errorCount}건 · 통로 검토 ${insights.summary.warningCount}건`;issues.replaceChildren();for(const issue of insights.issues){const b=button('','',()=>{review.close();focusObject(issue.objectIds[0]);},'wb-issue');b.dataset.severity=issue.severity;const h=el('strong','',issue.title),p=el('span','',issue.message),a=el('small','',issue.action);b.append(h,p,a);issues.append(b);}if(!insights.issues.length)issues.append(el('div','wb-success','현재 설정에서 경계·겹침·표시 통로 문제가 발견되지 않았습니다.'));}
 const schedule=dialog('wbScheduleDialog','설비 수량표','동일 규격과 설정끼리 집계합니다. 보관 가능 위치와 실제 배치된 박스 수량을 구분합니다.');
 const scheduleActions=el('div','toolrow');scheduleActions.append(button('wbCSV','수량표 CSV 다운로드',()=>download(scheduleCSV(api.get()),safeName(api.get().projectName)+'_설비수량표.csv','text/csv;charset=utf-8'),'primary'));schedule.append(scheduleActions);
 const tableWrap=el('div','wb-table-wrap');tableWrap.tabIndex=0;tableWrap.setAttribute('aria-label','설비 수량표 가로 스크롤');const table=el('table','wb-table');tableWrap.append(table);schedule.append(tableWrap);
 function renderSchedule(){table.replaceChildren();const head=el('thead'),hr=el('tr');for(const s of ['설비 / 규격 (m)','수량','PLT 위치','BOX 위치','실제 BOX'])hr.append(el('th','',s));head.append(hr);const body=el('tbody');for(const row of insights.schedule){const tr=el('tr'),label=el('td');label.append(el('strong','',row.label),el('small','',[row.width,row.depth,row.height].map(v=>number(v,2)).join(' × ')));tr.append(label);for(const key of ['quantity','palletPositions','boxPositions','actualBoxes'])tr.append(el('td','',number(row[key])));body.append(tr);}table.append(head,body);}
 let toolbar=$('practicalToolbar');if(!toolbar){toolbar=el('div');toolbar.id='practicalToolbar';document.querySelector('header').after(toolbar);}
 const theme=$('themeSelect');
 const addTool=b=>theme?toolbar.insertBefore(b,theme):toolbar.append(b);
 addTool(button('wbReview','배치 검토',()=>{refresh();show(review);}));
 addTool(button('wbSchedule','수량표',()=>{refresh();renderSchedule();show(schedule);}));
 // Locally saved named alternatives: restore is undoable and never silently overwrites.
 const scenario=dialog('wbScenarioDialog','설계안 비교','현재 브라우저에 최대 5개 안을 보관합니다. 중요 도면은 JSON 또는 GitHub에도 저장하세요.');
 const scenarioName=el('input');scenarioName.id='wbScenarioName';scenarioName.maxLength=60;scenarioName.placeholder='예: 현재안 · 랙 증설안';scenarioName.setAttribute('aria-label','설계안 이름');
 const scenarioList=el('div');scenarioList.id='wbScenarioList';let storedScenarios=[];
 const scenarioKey='warehouse-city-workbench-scenarios-v1';let scenarioLoadError=false,scenarioBaseline=null;
 function readScenarios(){try{scenarioBaseline=localStorage.getItem(scenarioKey);const raw=JSON.parse(scenarioBaseline||'[]');if(!Array.isArray(raw)||raw.length>5)throw Error('invalid');storedScenarios=raw.map(s=>({...s,layout:normalize(s.layout)}));scenarioLoadError=false;}catch{scenarioLoadError=true;}}
 readScenarios();
 const saveScenarios=next=>{if(localStorage.getItem(scenarioKey)!==scenarioBaseline)throw Error('다른 탭에서 설계안이 변경되었습니다. 이 창을 닫고 설계안 비교를 다시 열어주세요.');const serialized=JSON.stringify(next);localStorage.setItem(scenarioKey,serialized);scenarioBaseline=serialized;storedScenarios=next;};
 const scenarioSave=button('wbSaveScenario','현재 설계안 보관',safe(()=>{if(scenarioLoadError)throw Error('이 브라우저의 설계안 기록을 읽지 못했습니다. 원본을 보존하기 위해 새 기록 저장을 중지했습니다. 현재 도면을 JSON으로 저장하세요.');if(storedScenarios.length>=5)throw Error('최대 5개 안입니다. 불필요한 보관안을 먼저 삭제하세요.');const name=scenarioName.value.trim()||api.get().projectName;saveScenarios([...storedScenarios,{id:crypto.randomUUID(),name,date:new Date().toISOString(),layout:copy(api.get())}]);scenarioName.value='';renderScenarios();api.toast('이 브라우저에 설계안을 보관했습니다.');}),'primary');
 scenario.append(scenarioName,scenarioSave,scenarioList);
 function renderScenarios(){scenarioList.replaceChildren();const current=analyzeLayout(api.get());const t=el('table','wb-table'),head=el('tr');for(const s of ['설계안','PLT 위치','설비','점유율',''])head.append(el('th','',s));const thead=el('thead');thead.append(head);t.append(thead);const body=el('tbody');const rows=[{name:'현재 작업',layout:api.get()},...storedScenarios];for(const s of rows){const a=s.id?analyzeLayout(s.layout):current,tr=el('tr');tr.append(el('td','',s.name),el('td','',number(a.capacity.palletPositions)),el('td','',number(a.equipmentCount)),el('td','',number(a.floor.occupancyPercent,1)+'%'));const actions=el('td');if(s.id){actions.append(button('','열기',safe(()=>{if(!confirm('현재 작업을 이 설계안으로 바꿀까요? 실행 취소로 돌아올 수 있습니다.'))return;api.replace(copy(s.layout));scenario.close();api.toast(s.name+' 열기 완료 · 실행 취소로 복원 가능');})),button('','삭제',safe(()=>{if(confirm('보관안 “'+s.name+'”을 삭제할까요? 현재 작업은 유지됩니다.')){saveScenarios(storedScenarios.filter(v=>v.id!==s.id));renderScenarios();}})));}tr.append(actions);body.append(tr);}t.append(body);const wrap=el('div','wb-table-wrap');wrap.append(t);scenarioList.append(wrap);if(!storedScenarios.length)scenarioList.append(el('p','wb-empty','변경 전 도면을 보관한 후 증설안을 만들어 비교해 보세요.'));}
 const scenarioButton=button('wbScenarios','설계안 비교',()=>{readScenarios();renderScenarios();show(scenario);});project.prepend(scenarioButton);
 // Shortcuts and a searchable action palette, usable without remembering menus.
 const help=dialog('wbHelpDialog','빠른 사용 가이드','창고 규격 → 설비 배치 → 배치 검토 → 출력·저장 순서로 완성하세요.');
 const steps=[['1. 창고 크기','창고 현황 → 창고 규격에서 가로·세로·높이를 m 단위로 입력하세요.'],['2. 설비 배치','설비를 고르고 바닥을 클릭하세요. 선택한 설비는 드래그하거나 오른쪽 속성에서 정확한 값을 입력합니다.'],['3. 반복 배치','자동 배치에서 랙·팔레트·박스를 미리보기 후 한 번에 추가하세요.'],['4. 검토와 공유','배치 검토에서 오류 위치를 찾고, 수량표 CSV와 도면을 내려받으세요. GitHub 저장은 별도로 실행합니다.']];
 for(const [title,desc]of steps){const s=el('section','wb-help-step');s.append(el('h3','',title),el('p','',desc));help.append(s);}
 const keys=el('table','wb-table');for(const [key,action]of [['Ctrl / ⌘ + K','기능 검색'],['Ctrl / ⌘ + Z','실행 취소'],['Ctrl / ⌘ + Shift + Z','다시 실행'],['Ctrl / ⌘ + C · V','그룹 복사 · 붙여넣기'],['R','90° 회전'],['Delete','선택 설비 삭제'],['Esc','배치 취소 / 선택 해제']]){if(api.fallback&&key.includes('C · V'))continue;const tr=el('tr');tr.append(el('td','',key),el('td','',action));keys.append(tr);}help.append(keys);
 if(api.fallback)help.append(el('p','warn','현재 환경은 2D 호환 모드입니다. 3D·운영 시뮬레이션·내부 체험 및 일부 자동화는 WebGL 지원 환경에서 이용하세요.'));
 const command=dialog('wbCommandDialog','무엇을 할까요?','기능 이름을 검색하세요. ↑ ↓로 이동하고 Enter로 실행할 수 있습니다.');
 const commandSearch=el('input');commandSearch.id='wbCommandSearch';commandSearch.type='search';commandSearch.placeholder='예: 랙, 수량표, 도면, 저장';commandSearch.setAttribute('aria-label','기능 검색');const commands=el('div');commands.id='wbCommandResults';command.append(commandSearch,commands);
 const entries=[['설비 검색','배치 라이브러리',()=>{goPanel('catalog');$('search').focus();}],['랙 자동 배치','여러 행과 통로 설정',()=>{goPanel('automate');click('rowBtn');},'rowBtn'],['팔레트 · 박스 구역 채우기','반복 배치',()=>click('areaOpen'),'areaOpen'],['박스 자동 적재','팔레트 적재 계산',()=>click('stackOpen'),'stackOpen'],['배치 검토','경계 · 겹침 · 통로',()=>click('wbReview')],['설비 수량표 CSV','업무용 수량 집계',()=>click('wbSchedule')],['설계안 비교','변경 전후 도면 보관',()=>click('wbScenarios')],['창고 규격 변경','가로 · 세로 · 높이',()=>{api.setMode('edit');api.select(null);inspectorPanel('overview');dimensions.open=true;$('right').classList.add('open');$('warehouseW').focus();}],['전체 보기','카메라 위치 초기화',()=>{api.setMode('edit');api.fallback?api.top():api.iso();}],['2D 평면','위에서 배치 확인',()=>{api.setMode('edit');api.top();}],['JSON 도면 불러오기','저장된 파일 열기',()=>click('importBtn'),'importBtn'],['JSON 도면 내보내기','현재 도면 백업',()=>click('exportBtn'),'exportBtn'],['PDF · CAD 도면 출력','DXF · SVG · PNG',()=>click('downloadDrawing'),'downloadDrawing'],['GitHub 저장','다른 기기에서 도면 열기',()=>click('githubBtn'),'githubBtn'],['사용 가이드','기본 조작과 단축키',()=>show(help)]];
 let commandIndex=0;
 function renderCommands(){const q=commandSearch.value.trim().toLowerCase();commands.replaceChildren();for(const [label,desc,fn,required]of entries){if(required&&(!$(required)||$(required).disabled))continue;if(![label,desc].join(' ').toLowerCase().includes(q))continue;const b=button('','',safe(()=>{command.close();fn();}),'wb-command-item');b.append(el('strong','',label),el('small','',desc));commands.append(b);}commandIndex=0;if(!commands.children.length)commands.append(el('p','wb-empty','찾는 기능이 없습니다. 다른 단어로 검색하세요.'));updateCommandFocus();}
 function updateCommandFocus(){[...commands.querySelectorAll('button')].forEach((b,i)=>{b.classList.toggle('active',i===commandIndex);b.tabIndex=i===commandIndex?0:-1;});}
 commandSearch.addEventListener('input',renderCommands);command.addEventListener('keydown',e=>{const all=[...commands.querySelectorAll('button')];if(!all.length)return;if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();commandIndex=(commandIndex+(e.key==='ArrowDown'?1:-1)+all.length)%all.length;updateCommandFocus();all[commandIndex].scrollIntoView({block:'nearest'});}if(e.key==='Enter'&&e.target===commandSearch){e.preventDefault();all[commandIndex].click();}});
 const openCommands=()=>{renderCommands();if(show(command)!==false)commandSearch.focus();};
 addTool(button('wbCommands','기능 검색  Ctrl K',openCommands));addTool(button('wbHelp','사용법',()=>show(help)));
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();command.open?command.close():openCommands();}if(e.key==='?'&&!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&!document.querySelector('dialog[open]'))show(help);});
 // A compact welcome hint is optional and never blocks the canvas.
 const quick=el('div');quick.id='wbQuickStart';quick.append(el('small','','START YOUR WORKSPACE'),el('strong','','첫 도면, 여기서 시작하세요'),el('p','','창고 크기를 정하고 설비를 배치하세요. 언제든 실행 취소할 수 있습니다.'));
 const quickActions=el('div','toolrow');quickActions.append(button('wbStart','사용법 보기',()=>show(help),'primary'),button('wbDismissStart','알겠어요',()=>{quick.remove();try{localStorage.setItem('warehouse-city-workbench-seen','1');}catch{}}));quick.append(quickActions);
 try{if(!localStorage.getItem('warehouse-city-workbench-seen'))$('stage').append(quick);}catch{}
 // Selection tools stay close to the work surface.
 const selectionBar=el('div');selectionBar.id='wbSelectionBar';const selectionName=el('strong');selectionBar.append(selectionName);
 for(const [id,label,target]of [['wbRotate','회전','rotateBtn'],['wbDuplicate','복제','duplicateBtn'],['wbDelete','삭제','deleteBtn']])selectionBar.append(button(id,label,()=>click(target)));
 $('stage').append(selectionBar);
 function onSelection(activate=true){const o=api.get().objects.find(o=>o.id===api.selected());selectionBar.hidden=!o||api.mode()!=='edit';selectionName.textContent=o?.name||'';for(const b of selectionBar.querySelectorAll('button'))b.disabled=!!o?.locked;if(activate)inspectorPanel(o?'selection':'overview');renderTree();}
 function metric(label,value,unit,title){const item=el('div','wb-kpi');if(title)item.title=title;item.append(el('small','',label),el('strong','',number(value,1)),el('span','',unit));return item;}
 function refresh(){insights=analyzeLayout(api.get(),{minAisleWidth:Number(threshold.value)||1.2});metrics.replaceChildren();const cap=insights.capacity;metrics.append(metric('팔레트 보관',''+cap.palletPositions,'위치','랙 베이 × 단수 × 단당 팔레트 + 지정한 바닥 보관 위치'),metric('박스 보관',cap.boxPositions,'위치','설정 규격으로 계산한 보관 가능 위치이며 실제 재고와 다릅니다.'),metric('실제 박스',cap.actualBoxes,'개','도면에 배치·적재한 박스 개수입니다. 실제 WMS 재고와 연결되지 않습니다.'),metric('바닥 점유',insights.floor.occupancyPercent,'%','바닥에 닿는 설비의 회전 외곽을 합집합으로 계산합니다.'));
  const meter=el('div','wb-progress');meter.title=insights.floor.note;const bar=el('span');bar.style.width=Math.min(100,insights.floor.occupancyPercent)+'%';meter.append(bar);metrics.append(meter,el('p','wb-metric-note',`미점유 ${number(insights.floor.availableArea,1)} / 전체 ${number(insights.floor.warehouseArea,1)}㎡ · 통로·작업 여유 별도 검토`));
  const count=insights.issues.length;$('wbReview').textContent='배치 검토'+(count?' · '+count:'');$('wbReview').dataset.status=count?'attention':'clear';renderReview();renderTree();if(schedule.open)renderSchedule();
 }
 document.addEventListener('city-change',()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{refresh();onSelection(false);},80);});
 document.addEventListener('city-selection',()=>onSelection());
 new MutationObserver(()=>{selectionBar.hidden=api.mode()!=='edit'||!api.selected();quick.hidden=api.mode()!=='edit';}).observe(document.body,{attributes:true,attributeFilter:['class']});
 const save=$('saveState');save.setAttribute('role','status');save.setAttribute('aria-live','polite');
 new MutationObserver(()=>{save.dataset.saved=save.textContent.includes('자동 저장됨')?'true':'false';}).observe(save,{childList:true,characterData:true,subtree:true});
 $('projectName').addEventListener('change',()=>{if(scenario.open)renderScenarios();});
 refresh();onSelection();
 document.documentElement.dataset.workbench='ready';
}
