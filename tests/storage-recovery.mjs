import {reveal} from './workbench-navigation.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
try{
 const p=await browser.newPage();p.on('dialog',d=>d.accept());await p.goto('http://127.0.0.1:4173');await p.waitForFunction(()=>window.__warehouseCity);
 const original=JSON.stringify(await p.evaluate(()=>window.__warehouseCity.getLayout()));
 await p.evaluate(s=>{localStorage.clear();localStorage.setItem('warehouse-city-v9',s);},original);await p.reload();await p.waitForFunction(()=>window.__warehouseCity);
 assert.equal(await p.evaluate(()=>localStorage.getItem('warehouse-city-v9-before-renewal')),original);
 await p.evaluate(()=>localStorage.setItem('warehouse-city-v9','{broken'));await p.reload();await p.waitForFunction(()=>window.__warehouseCity);
 await (await reveal(p,'blankBtn')).click();await p.waitForTimeout(500);assert.equal(await p.evaluate(()=>localStorage.getItem('warehouse-city-v9')),'{broken');
 assert.match(await p.locator('#saveState').innerText(),/원본 보호/);console.log('RECOVERY PASS exact backup; malformed original never silently overwritten');
}finally{await browser.close();}
