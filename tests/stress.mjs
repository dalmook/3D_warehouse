/** Regression: imports which previously built >200,000 separate meshes. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {normalize,object} from '../city-core.mjs';
const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
await fs.mkdir('qa-evidence',{recursive:true});
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],results=[];
p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
const fixture=normalize({projectName:'QA 600 racks',warehouse:{width:200,depth:200,height:12},objects:Array.from({length:600},(_,i)=>object('rack',4+(i%30)*6.5,5+Math.floor(i/30)*9,{width:5,depth:1.2,height:6,config:{bays:20,levels:20,palletsPerLevel:2}}))});
async function load(layout){await p.locator('#importFile').setInputFiles({name:'qa-stress.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(layout))});await p.waitForFunction(n=>window.__warehouseCity.getLayout().projectName===n,layout.projectName,{timeout:30000});}
async function check(name,fn){await fn();results.push({name,passed:true});console.log('STRESS PASS',name);}
try{
 await p.goto(base);await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');
 await check('600 racks render at 20 bays x 20 levels without changing saved data',async()=>{
  await load(fixture);const report=await p.evaluate(()=>window.__warehouseCity.getRenderStats());
  assert.equal(report.compact,true);assert.equal(report.meshes,600);assert.equal(report.instances,4800);
  assert.deepEqual(await p.evaluate(()=>window.__warehouseCity.getLayout()),fixture);
  assert.match(await p.locator('#review').textContent(),/간소화/);
 });
 await check('dense layout continues rendering and JSON export remains responsive',async()=>{
  const frame=await p.evaluate(()=>window.__warehouseCity.getRenderStats().frame);
  await p.waitForFunction(f=>window.__warehouseCity.getRenderStats().frame>f+2,frame,{timeout:15000});
  const event=p.waitForEvent('download');await p.locator('#exportBtn').click();const dl=await event;await dl.saveAs('qa-evidence/stress-roundtrip.json');
  assert.deepEqual(JSON.parse(await fs.readFile('qa-evidence/stress-roundtrip.json','utf8')),fixture);
  await p.screenshot({path:'qa-evidence/large-layout.png'});
 });
 await check('repeated rebuilds dispose instances and restore full-detail rendering',async()=>{
  for(let i=0;i<2;i++){await p.locator('#blankBtn').click();assert.equal(await p.evaluate(()=>window.__warehouseCity.getRenderStats().instances),0);await load(fixture);}
  await p.locator('#demoBtn').click();assert.equal(await p.evaluate(()=>window.__warehouseCity.getRenderStats().compact),false);
  await p.locator('#topBtn').click();await p.waitForTimeout(500);
  const xy=await p.evaluate(()=>window.__warehouseCity.screenPoint(8,5,6));await p.mouse.click(xy.x,xy.y);
  assert.equal(await p.locator('#inspector').isVisible(),true);
  await p.locator('#duplicateBtn').click();await p.mouse.move(xy.x+30,xy.y+20);await p.keyboard.press('Escape');
  await p.locator('[data-mode="sim"]').click();await p.locator('#runBtn').click();await p.waitForFunction(()=>window.__warehouseCity.getSimulation()?.distance>.2);
 });
 await check('no browser exceptions after dense import, selection and simulation',async()=>assert.deepEqual(errors,[]));
}finally{
 await fs.writeFile('qa-evidence/stress-results.json',JSON.stringify({passed:results.length===4&&errors.length===0,results,errors},null,2));await browser.close();
}
