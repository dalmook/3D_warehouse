import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalize,object} from '../city-core.mjs';
import {reveal,dismissWelcome} from './workbench-navigation.mjs';

const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
const dir=process.env.QA_DIR?`${process.env.QA_DIR}/workbench`:'qa-evidence/workbench';
await fs.mkdir(dir,{recursive:true});
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,args:process.env.BROWSER_CHANNEL?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors=[],results=[];
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'ko-KR'});
let page=await context.newPage();
const observe=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('dialog',dialog=>dialog.accept());};
observe(page);
const state=()=>page.evaluate(()=>window.__warehouseCity.getLayout());
const ready=async p=>{await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await dismissWelcome(p);};
const check=async(name,fn)=>{
 try{await fn();results.push({name,passed:true});console.log('WORKBENCH PASS',name);}
 catch(error){results.push({name,passed:false,error:error.message});await page.screenshot({path:`${dir}/failure.png`}).catch(()=>{});throw error;}
};
const fixture=normalize({projectName:'실무 워크벤치 검증',warehouse:{width:36,depth:24,height:9},objects:[
 object('rack',8,6,{id:'rack-a',name:'현장 랙 A'}),
 object('box',18,10,{id:'box-a',name:'출고 박스'}),
 object('aisle',8,6,{id:'aisle-a',name:'검토 통로',width:1,depth:8}),
]});

try{
 await check('new workbench loads with actual renderer and keyboard-operable task tabs',async()=>{
  await page.goto(base);await ready(page);
  assert.equal(await page.evaluate(()=>window.__warehouseCity.version),'10.0.0');
  assert.equal(await page.evaluate(()=>window.__warehouseCity.renderer),'webgl');
  const catalog=page.locator('[data-panel="catalog"]');await catalog.click();await catalog.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-panel="automate"]').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#rowBtn').isVisible(),true);
  assert.equal(await page.locator('#catalog').isVisible(),false);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-panel="project"]').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#blankBtn').isVisible(),true);
  await page.keyboard.press('Home');
  assert.equal(await catalog.getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#catalog').isVisible(),true);
 });

 await check('catalog filters show a useful empty state and restore equipment',async()=>{
  await (await reveal(page,'search')).fill('절대없는설비검색어');
  await page.locator('#wbCatalogEmpty').waitFor({state:'visible'});
  assert.equal(await page.locator('#catalog .asset').count(),0);
  await page.locator('#search').fill('팔레트 랙');
  assert.equal(await page.locator('#catalog .asset').count(),1);
  await page.locator('#search').fill('');
  assert.ok(await page.locator('#catalog .asset').count()>10);
 });

 await check('import updates real capacity, inventory and floor occupancy metrics',async()=>{
  await page.locator('#importFile').setInputFiles({name:'workbench.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await page.waitForFunction(name=>window.__warehouseCity.getLayout().projectName===name,fixture.projectName);
  await reveal(page,'wbMetrics');
  await page.waitForFunction(()=>document.querySelector('#wbTreeCount').textContent==='3개');
  const metric=label=>page.locator('#wbMetrics .wb-kpi').filter({hasText:label}).locator('strong');
  assert.equal(await metric('팔레트 보관').innerText(),'32');
  assert.equal(await metric('실제 박스').innerText(),'1');
  assert.equal(await metric('바닥 점유').innerText(),'1.1');
  assert.equal(await page.locator('#wbReview').getAttribute('data-status'),'attention');
 });

 await check('searchable object tree selects and focuses the actual object; edits survive inspector rebuild',async()=>{
  await (await reveal(page,'wbObjectSearch')).fill('현장 랙');
  assert.equal(await page.locator('#wbObjectTree .wb-object-row').count(),1);
  const before=await page.evaluate(()=>window.__warehouseCity.getView());
  await page.locator('[data-object-id="rack-a"]').click();
  assert.equal(await page.locator('[data-inspector="selection"]').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#objectName').inputValue(),'현장 랙 A');
  assert.equal(await page.locator('#wbSelectionBar').isVisible(),true);
  assert.notDeepEqual(await page.evaluate(()=>window.__warehouseCity.getView()),before);
  await page.locator('#objectName').fill('현장 랙 A · 수정');await page.locator('#applyObject').click();
  await page.waitForFunction(()=>document.querySelector('#objectName').value==='현장 랙 A · 수정');
  assert.equal(await page.locator('#inspector').isVisible(),true);
  assert.equal((await state()).objects.find(o=>o.id==='rack-a').name,'현장 랙 A · 수정');
 });

 await check('command palette opens nested warehouse dimensions by keyboard',async()=>{
  await page.locator('#scene').focus();await page.keyboard.press('Control+k');
  await page.locator('#wbCommandSearch').fill('창고 규격');
  assert.equal(await page.locator('#wbCommandResults button').count(),1);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#wbCommandDialog').isVisible(),false);
  assert.equal(await page.locator('#warehouseW').isVisible(),true);
  assert.equal(await page.locator('#warehouseW').inputValue(),'36');
  assert.equal(await page.locator('.wb-details').getAttribute('open'),'');
 });

 await check('review findings navigate to their real equipment without changing the design',async()=>{
  const before=await state();await page.locator('#wbReview').click();
  assert.ok(await page.locator('#wbReviewDialog .wb-issue').count()>=2);
  assert.match(await page.locator('#wbReviewDialog').innerText(),/통로/);
  await page.locator('#wbReviewDialog .wb-issue').first().click();
  assert.equal(await page.locator('#wbReviewDialog').isVisible(),false);
  assert.equal(await page.locator('#wbSelection').isVisible(),true);
  assert.ok(before.objects.map(o=>o.name).includes(await page.locator('#objectName').inputValue()));
  assert.deepEqual(await state(),before);
 });

 await check('command palette exports a real Korean CSV equipment schedule',async()=>{
  await page.locator('#scene').focus();await page.keyboard.press('Control+k');
  await page.locator('#wbCommandSearch').fill('수량표');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  assert.equal(await page.locator('#wbScheduleDialog').isVisible(),true);
  assert.equal(await page.locator('#wbScheduleDialog tbody tr').count(),3);
  const downloading=page.waitForEvent('download');await page.locator('#wbCSV').click();
  const download=await downloading;assert.match(download.suggestedFilename(),/_설비수량표\.csv$/);
  const file=`${dir}/equipment-schedule.csv`;await download.saveAs(file);
  const bytes=await fs.readFile(file),text=bytes.toString('utf8');
  assert.deepEqual([...bytes.subarray(0,3)],[0xef,0xbb,0xbf]);
  assert.match(text,/설비 종류/);assert.match(text,/팔레트 보관 위치/);assert.match(text,/현장 랙 A · 수정/);assert.match(text,/출고 박스/);
  await page.screenshot({path:`${dir}/desktop-schedule.png`});
  await page.locator('#wbScheduleDialogClose').click();
 });

 await check('named scenario save, restore, undo, redo and reload preserve the full drawing',async()=>{
  const saved=await state();await (await reveal(page,'wbScenarios')).click();
  await page.locator('#wbScenarioName').fill('변경 전 보관안');await page.locator('#wbSaveScenario').click();
  assert.equal(await page.locator('#wbScenarioList tbody tr').count(),2);
  await page.locator('#wbScenarioDialogClose').click();
  await (await reveal(page,'blankBtn')).click();assert.equal((await state()).objects.length,0);
  await (await reveal(page,'wbScenarios')).click();
  await page.locator('#wbScenarioList tbody tr').filter({hasText:'변경 전 보관안'}).getByRole('button',{name:'열기',exact:true}).click();
  assert.deepEqual(await state(),saved);
  await page.locator('#undoBtn').click();assert.equal((await state()).objects.length,0);
  await page.locator('#redoBtn').click();assert.deepEqual(await state(),saved);
  await page.reload();await ready(page);assert.deepEqual(await state(),saved);
  await (await reveal(page,'wbScenarios')).click();assert.equal(await page.locator('#wbScenarioList tbody tr').count(),2);
  await page.screenshot({path:`${dir}/desktop-scenarios.png`});await page.locator('#wbScenarioDialogClose').click();
 });

 await check('busy GitHub request keeps its dialog and token when Ctrl+K is pressed',async()=>{
  const pattern='https://api.github.com/repos/**',token='workbench-qa-ephemeral-token';
  let releaseLookup,puts=0,authorization;
  const lookupGate=new Promise(resolve=>{releaseLookup=resolve;});
  const handler=async route=>{
   const request=route.request(),headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type,accept,x-github-api-version','access-control-allow-methods':'GET,PUT,OPTIONS'};
   const reply=(status,body)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(request.method()==='OPTIONS')return reply(200,{});
   if(request.method()==='GET'){await lookupGate;return reply(404,{message:'Not Found'});}
   if(request.method()==='PUT'){puts++;authorization=request.headers().authorization;return reply(201,{content:{sha:'qa-content-sha'},commit:{sha:'abcd1234'.padEnd(40,'0')}});}
   return reply(405,{message:'Unexpected request method'});
  };
  await page.route(pattern,handler);
  try{
   await page.locator('#githubBtn').click();await page.locator('#ghOwner').fill('example');await page.locator('#ghRepo').fill('workbench-qa');
   await page.locator('#ghBranch').fill('main');await page.locator('#ghPath').fill('layouts/workbench-qa.json');
   await page.locator('#ghToken').fill(token);await page.locator('#ghConsent').check();
   const lookup=page.waitForRequest(request=>request.url().startsWith('https://api.github.com/repos/')&&request.method()==='GET');
   await page.locator('#ghSave').click();await lookup;
   assert.equal(await page.locator('#ghSave').isDisabled(),true);
   await page.keyboard.press('Control+k');
   assert.equal(await page.locator('#githubDialog').isVisible(),true);
   assert.equal(await page.locator('#wbCommandDialog').isVisible(),false);
   assert.equal(await page.locator('#ghToken').inputValue(),token);
   assert.equal(await page.locator('#ghConsent').isChecked(),true);
   assert.match(await page.locator('#toast').textContent(),/GitHub 요청이 끝난 뒤/);
   releaseLookup();await page.waitForFunction(()=>!document.getElementById('ghSave').disabled);
   assert.match(await page.locator('#ghStatus').textContent(),/커밋 완료/);
   assert.equal(puts,1);assert.equal(authorization,'Bearer '+token);
   assert.equal(await page.evaluate(value=>JSON.stringify({...localStorage,...sessionStorage}).includes(value),token),false);
   await page.locator('#ghClose').click();assert.equal(await page.locator('#ghToken').inputValue(),'');
  }finally{
   releaseLookup();await page.waitForFunction(()=>!document.getElementById('ghSave').disabled).catch(()=>{});
   await page.unroute(pattern,handler);
  }
 });

 await check('stale scenario dialog refuses another tab overwrite and refreshes on reopen',async()=>{
  const key='warehouse-city-workbench-scenarios-v1';
  await (await reveal(page,'wbScenarios')).click();
  const initial=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)||'[]'),key),drawing=await state();
  const second=await context.newPage();
  try{
   // A same-origin document gives the second tab its own storage view without another renderer.
   await second.goto(new URL('city-core.mjs',base).href);
   const changed=[...initial,{id:'second-tab-scenario',name:'다른 탭에서 보관한 안',date:'2026-09-22T00:00:00.000Z',layout:drawing}];
   const serialized=JSON.stringify(changed);
   await second.evaluate(({key,serialized})=>localStorage.setItem(key,serialized),{key,serialized});
   await page.bringToFront();
   await page.locator('#wbScenarioName').fill('충돌한 이전 탭 저장');await page.locator('#wbSaveScenario').click();
   assert.match(await page.locator('#toast').textContent(),/다른 탭에서 설계안이 변경/);
   assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),serialized);
   assert.equal(await page.locator('#wbScenarioList tbody tr').count(),initial.length+1);
   await page.locator('#wbScenarioDialogClose').click();await (await reveal(page,'wbScenarios')).click();
   assert.equal(await page.locator('#wbScenarioList tbody tr').count(),changed.length+1);
   assert.equal(await page.locator('#wbScenarioList tbody tr').filter({hasText:'다른 탭에서 보관한 안'}).count(),1);
   await page.locator('#wbScenarioName').fill('새 기록 확인 후 보관');await page.locator('#wbSaveScenario').click();
   const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   assert.equal(stored.length,changed.length+1);
   assert.deepEqual(stored.slice(0,changed.length),changed);
   assert.equal(stored.at(-1).name,'새 기록 확인 후 보관');
   assert.deepEqual(await state(),drawing);
   await page.locator('#wbScenarioDialogClose').click();
  }finally{await second.close();}
 });

 await check('blueprint theme survives an actual design rebuild',async()=>{
  await page.locator('#themeSelect').selectOption('blueprint');
  await (await reveal(page,'wbObjectSearch')).fill('현장 랙');await page.locator('[data-object-id="rack-a"]').click();
  await page.locator('#objectName').fill('청사진 랙');await page.locator('#applyObject').click();
  assert.equal(await page.locator('html').getAttribute('data-theme'),'blueprint');
  assert.equal((await state()).objects.find(o=>o.id==='rack-a').name,'청사진 랙');
  await page.screenshot({path:`${dir}/desktop-blueprint.png`});
 });

 await context.close();
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,locale:'ko-KR'});
 page=await mobile.newPage();observe(page);
 await check('mobile workflow keeps document and dialogs inside the viewport',async()=>{
  await page.goto(base);await ready(page);
  const fits=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.body.scrollWidth<=innerWidth);
  assert.equal(await fits(),true);
  const framing=await page.evaluate(()=>{const {warehouse:w}=window.__warehouseCity.getLayout(),r=document.getElementById('scene').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,corners:[[0,0],[w.width,0],[0,w.depth],[w.width,w.depth]].map(([x,y])=>window.__warehouseCity.screenPoint(x,y))};});
  assert.ok(framing.corners.every(p=>p.x>=framing.left&&p.x<=framing.right&&p.y>=framing.top&&p.y<=framing.bottom),'Initial mobile view must include all four warehouse corners');
  await page.screenshot({path:`${dir}/mobile-workspace.png`});
  await (await reveal(page,'search')).fill('팔레트');
  assert.equal(await page.locator('#left').isVisible(),true);
  assert.ok(await page.locator('#catalog .asset').count()>=2);
  assert.equal(await fits(),true);await page.screenshot({path:`${dir}/mobile-library.png`});
  await page.locator('[data-close="left"]').click();
  await page.locator('#wbCommands').click();await page.locator('#wbCommandSearch').fill('수량표');
  await page.locator('#wbCommandResults button').click();
  assert.equal(await page.locator('#wbScheduleDialog').isVisible(),true);
  const box=await page.locator('#wbScheduleDialog').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=390);
  assert.equal(await fits(),true);await page.screenshot({path:`${dir}/mobile-schedule.png`});
  await page.locator('#wbScheduleDialogClose').click();
  await (await reveal(page,'wbScenarios')).click();
  await page.locator('#wbScenarioName').fill('모바일 안');await page.locator('#wbSaveScenario').click();
  assert.equal(await page.locator('#wbScenarioList tbody tr').count(),2);
  assert.equal(await fits(),true);await page.screenshot({path:`${dir}/mobile-scenario.png`});
  await page.locator('#wbScenarioDialogClose').click();await mobile.close();
 });
 await check('workbench workflows produce no unhandled browser exceptions',async()=>assert.deepEqual(errors,[]));
}finally{
 await fs.writeFile(`${dir}/results.json`,JSON.stringify({passed:results.every(r=>r.passed)&&errors.length===0,total:results.length,results,errors},null,2));
 await browser.close();
}
