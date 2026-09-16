import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.BASE_URL||'http://127.0.0.1:4173/';
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));
let report;
try{
 await p.goto(new URL('classic.html',base).href);await p.waitForTimeout(1500);
 report=await p.evaluate(async()=>{
  const THREE=await import('three');
  const {ASSET_DEFINITIONS,rebuildObjectVisual,disposeObject3D,calculateStackLayout}=await import('./objects.js');
  const stack=calculateStackLayout({palletWidth:1.2,palletDepth:1,maxHeight:1.8,boxWidth:.4,boxDepth:.3,boxHeight:.25,count:27});
  const assets=[];
  for(const [type,definition] of Object.entries(ASSET_DEFINITIONS)){
   const g=new THREE.Group();g.userData.data={...structuredClone(definition),type,name:definition.label,...(type==='stack'?{stack}:{})};
   rebuildObjectVisual(g);g.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(g);
   assets.push({type,children:g.children.length,finite:[...bounds.min,...bounds.max].every(Number.isFinite)});
   disposeObject3D(g);
  }
  return {assets,stack,bootErrors:window.__warehouseBootErrors};
 });
 assert.equal(report.assets.length,38);assert.ok(report.assets.every(a=>a.children>0&&a.finite));
 assert.equal(report.stack.perLayer,9);assert.equal(report.stack.layers,3);assert.equal(report.stack.count,27);assert.ok(Math.abs(report.stack.totalHeight-.89)<1e-8);
 assert.deepEqual(report.bootErrors,[]);assert.deepEqual(errors,[]);
 await p.screenshot({path:'qa-evidence/classic-editor.png'});
 report.passed=true;console.log('CLASSIC PASS: 38 original asset builders and pallet stacking calculation');
}finally{await fs.mkdir('qa-evidence',{recursive:true});await fs.writeFile('qa-evidence/classic-results.json',JSON.stringify({report,errors},null,2));await browser.close();}
