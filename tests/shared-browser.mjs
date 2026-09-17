import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||undefined,args:process.env.BROWSER_CHANNEL?[]:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await browser.newPage({viewport:{width:1440,height:900}});let mode='missing',prepared,file;
await p.route('https://api.github.com/repos/example/approved/**',async route=>{
 if(mode==='private')return route.fulfill({status:404,json:{message:'Not Found'}});
 if(route.request().url().includes('/layouts?'))return route.fulfill({json:mode==='missing'?[]:[{name:file}]});
 const body=mode==='changed'?{...prepared,projectName:'different'}:prepared;
 return route.fulfill({json:{content:Buffer.from(JSON.stringify(body)).toString('base64')}});
});
try{
 await p.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await p.locator('#sharedSave').click();await p.locator('#sharedDialog summary').click();await p.locator('#sharedOwner').fill('example');await p.locator('#sharedRepo').fill('approved');await p.locator('#sharedApproved').check();await p.locator('#sharedConfigure').click();
 const event=p.waitForEvent('download');await p.locator('#sharedPrepare').click();const d=await event;file=d.suggestedFilename();const stream=await d.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);prepared=JSON.parse(Buffer.concat(chunks));
 await p.locator('#sharedCheck').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('아직 업로드'));assert.match(await p.locator('#sharedStatus').innerText(),/미저장/);
 mode='private';await p.locator('#sharedCheck').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('조회할 수 없습니다'));
 mode='changed';await p.locator('#sharedCheck').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('다릅니다'));
 mode='saved';await p.locator('#sharedCheck').click();await p.waitForFunction(()=>document.querySelector('#sharedStatus').textContent.includes('파일 확인 완료'));assert.equal(await p.evaluate(()=>window.__warehouseCity.getLayout().revisionId),prepared.revisionId);
 const second=p.waitForEvent('download');await p.locator('#sharedPrepare').click();const s=await(await second).createReadStream(),buf=[];for await(const part of s)buf.push(part);assert.equal(JSON.parse(Buffer.concat(buf)).baseRevision,prepared.revisionId);
 console.log('SHARED MOCK PASS missing/private/mismatch/verified revision chain. Employee account upload not tested.');
}finally{await browser.close();}
