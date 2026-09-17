import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,args:process.env.BROWSER_CHANNEL?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1440,height:900}});p.on('dialog',d=>d.accept());
try{
 await p.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await p.locator('#blankBtn').click();await p.locator('#search').fill('안내');
 const cycle=async()=>{await p.locator('#catalog .asset').first().click();const point=await p.evaluate(()=>window.__warehouseCity.screenPoint(8,8));await p.mouse.move(point.x,point.y);await p.waitForTimeout(160);await p.keyboard.press('Escape');await p.waitForTimeout(160);};
 await cycle();const before=await p.evaluate(()=>window.__warehouseCity.getRenderStats());for(let i=0;i<12;i++)await cycle();const after=await p.evaluate(()=>window.__warehouseCity.getRenderStats());assert.ok(after.geometries<=before.geometries+1,JSON.stringify({before,after}));assert.ok(after.textures<=before.textures+1,JSON.stringify({before,after}));console.log('GHOST PASS repeated legacy sign preview/cancel releases geometry and textures');
}finally{await browser.close();}
