import {dismissWelcome} from './workbench-navigation.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {normalize,object} from '../city-core.mjs';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,args:process.env.BROWSER_CHANNEL?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
const state=()=>p.evaluate(()=>window.__warehouseCity.getLayout());
try{
 await p.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await dismissWelcome(p);
 const l=normalize({projectName:'합성 바닥 보관 운영',warehouse:{width:20,depth:20,height:7},objects:[object('dock',3,2,{id:'in'}),object('dock',14,2,{id:'out',rotation:180}),object('worker',3,6,{id:'person'})]});
 await p.locator('#importFile').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(l))});
 await p.locator('#toolsButton').click();await p.locator('#areaOpen').click();for(const [key,value]of Object.entries({Rows:1,Columns:1,Count:1,X:8,Y:8}))await p.locator('#area'+key).fill(String(value));
 await p.locator('#areaPreview').click();assert.match(await p.locator('#areaResult').innerText(),/불가 0곳/);await p.locator('#areaApply').click();assert.equal((await state()).objects.filter(o=>o.type==='rack').length,0);assert.equal((await state()).objects.find(o=>o.type==='pallet').config.floorStorage,true);
 await p.locator('[data-mode="sim"]').click();await p.locator('#routeOpen').click();await p.locator('#routeAdd').click();const q=await p.evaluate(()=>window.__warehouseCity.screenPoint(5,6));await p.mouse.click(q.x,q.y);await p.locator('[aria-label="목적지 이름"]').fill('검수 대기');await p.locator('[aria-label="대기시간"]').fill('3');await p.locator('#routeKind').selectOption('once');await p.locator('#routeApply').click();
 const saved=await state();assert.equal(saved.routes[0].kind,'once');assert.equal(saved.routePoints[0].dwell,3);await p.locator('#runBtn').click();await p.waitForFunction(()=>window.__warehouseCity.getSimulation()?.arrivals===1);await p.locator('#runBtn').click();
 await p.locator('#routeOpen').click();await p.locator('#role-inbound').selectOption('in');await p.locator('#role-outbound').selectOption('out');await p.locator('#roleApply').click();await p.reload();await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await dismissWelcome(p);assert.equal((await state()).routePoints[0].name,'검수 대기');
 await p.locator('[data-mode="sim"]').click();await p.locator('#operationKind').selectOption('tasks');await p.locator('#simSpeed').selectOption('4');await p.locator('#runBtn').click();await p.waitForFunction(()=>window.__warehouseCity.getLogistics()?.shipped===1,{},{timeout:90000});
 const report=await p.evaluate(()=>window.__warehouseCity.getLogistics());assert.ok(report.conservation.valid);assert.ok(report.events.some(e=>e.type==='stored'));assert.ok(report.events.some(e=>e.type==='packed'));await p.locator('[data-mode="walk"]').click();assert.equal(await p.evaluate(()=>window.__warehouseCity.getLogistics().shipped),1);assert.deepEqual(errors,[]);console.log('OPERATIONS PASS route UI/save/reload and rackless area/inbound/store/pick/ship');
}finally{await browser.close();}
