import {reveal,dismissWelcome} from './workbench-navigation.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {CATALOG,object,normalize} from '../city-core.mjs';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,args:process.env.BROWSER_CHANNEL?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],results=[];
p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
const state=()=>p.evaluate(()=>window.__warehouseCity.getLayout());
try{
 await p.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await dismissWelcome(p);

 for(const [type,def] of Object.entries(CATALOG)){
  const layout=normalize({projectName:'합성 '+type,warehouse:{width:36,depth:24,height:9},objects:[]});
  await p.locator('#importFile').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(layout))});
  await (await reveal(p,'search')).fill(def.name);await p.locator('#catalog .asset').filter({has:p.getByText(def.name,{exact:true})}).first().click();
  const pos=await p.evaluate(()=>window.__warehouseCity.screenPoint(18,12));await p.mouse.click(pos.x,pos.y);await p.keyboard.press('Escape');
  const created=(await state()).objects.find(o=>o.type===type);assert.ok(created,'catalog creates '+type);
  await p.locator('#toolsButton').click();await p.locator('#objectList').selectOption(created.id);
  await p.locator('#objectName').fill('검수 '+type);await p.locator('#ol').check();await p.locator('#applyObject').click();
  await p.reload();await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await dismissWelcome(p);
  const restored=(await state()).objects.find(o=>o.id===created.id);assert.equal(restored.name,'검수 '+type);assert.equal(restored.locked,true);
  results.push({type,created:true,edited:true,reloaded:true});console.log('PARITY PASS',type);
 }
 assert.deepEqual(errors,[]);await fs.mkdir('qa-evidence/practical',{recursive:true});await fs.writeFile('qa-evidence/practical/catalog-parity.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
