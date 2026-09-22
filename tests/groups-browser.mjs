import {reveal,dismissWelcome} from './workbench-navigation.mjs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {normalize,object} from '../city-core.mjs';
import {stackLayout} from '../city-domain.mjs';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,args:process.env.BROWSER_CHANNEL?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
try{
 await p.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await dismissWelcome(p);
 const objects=[];for(let i=0;i<10;i++){const pallet=object('pallet',3+i*2,4,{height:.14,load:stackLayout({palletWidth:1.2,palletDepth:1,palletHeight:.14,boxWidth:.4,boxDepth:.3,boxHeight:.25,maxHeight:1.8,count:48})});objects.push(pallet,object('box',pallet.x,pallet.y,{z:1.64,supportId:pallet.id}));}
 const l=normalize({projectName:'합성 묶음',warehouse:{width:60,depth:60,height:9},objects});await p.locator('#importFile').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(l))});await p.locator('#topBtn').click();await (await reveal(p,'multiAll')).click();await p.locator('#scene').focus();await p.keyboard.press('Control+c');await p.keyboard.press('Control+v');await p.keyboard.press('r');const point=await p.evaluate(()=>window.__warehouseCity.screenPoint(30,30));await p.mouse.move(point.x,point.y);await p.keyboard.press('Enter');
 const copied=await p.evaluate(()=>window.__warehouseCity.getLayout());assert.equal(copied.objects.length,40);assert.equal(copied.objects.reduce((n,o)=>n+(o.load?.boxes.length||0),0),960);assert.equal(new Set(copied.objects.map(o=>o.id)).size,40);const added=copied.objects.filter(o=>!l.objects.some(a=>a.id===o.id));for(const o of added){assert.equal(o.rotation,90);if(o.supportId)assert.ok(added.some(a=>a.id===o.supportId));}assert.equal(new Set(copied.objects.flatMap(o=>o.load?.boxes.map(b=>b.id)||[])).size,960);
 await p.locator('#undoBtn').click();assert.equal(await p.evaluate(()=>window.__warehouseCity.getLayout().objects.length),20);await p.locator('#redoBtn').click();assert.equal(await p.evaluate(()=>window.__warehouseCity.getLayout().objects.length),40);assert.deepEqual(errors,[]);console.log('GROUP PASS ten loaded pallets and support boxes / rotate / atomic undo redo');
}finally{await browser.close();}
