import {reveal,dismissWelcome} from './workbench-navigation.mjs';
/** Live Contents API round trip, restricted to synthetic data on a temporary branch. */
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const token=process.env.QA_GITHUB_TOKEN,repo=process.env.GITHUB_REPOSITORY,sha=process.env.GITHUB_SHA;
if(!token||repo!=='dalmook/3D_warehouse'||!sha)throw Error('Live QA requires the explicitly authorized repository and an ephemeral Actions token.');
const api='https://api.github.com/repos/'+repo;
const branch=`qa-layout-roundtrip-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT||1}`;
const report={created:false,updated:false,loaded:false,credentialsStored:false,temporaryBranchDeleted:false};
let created=false,browser;
async function request(path,method='GET',body){const r=await fetch(api+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error(`Live GitHub ${method} ${path.split('?')[0]} failed: ${r.status}`);return r.status===204?null:r.json();}
try{
 await request('/git/refs','POST',{ref:'refs/heads/'+branch,sha});created=true;
 browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await browser.newPage({viewport:{width:1440,height:1000}});p.on('dialog',d=>d.accept());
 await p.goto(process.env.BASE_URL||'http://127.0.0.1:4173/');await p.waitForFunction(()=>document.documentElement.dataset.ready==='true');await dismissWelcome(p);
 await p.locator('#projectName').fill('QA 합성 도면 · 생성');await p.locator('#projectName').blur();
 async function open(){await p.locator('#githubBtn').click();await p.locator('#ghOwner').fill('dalmook');await p.locator('#ghRepo').fill('3D_warehouse');await p.locator('#ghBranch').fill(branch);await p.locator('#ghPath').fill('layouts/qa-roundtrip.json');await p.locator('#ghToken').fill(token);await p.locator('#ghConsent').check();}
 async function save(){await p.locator('#ghSave').click();await p.waitForFunction(()=>document.getElementById('ghStatus').textContent.includes('커밋 완료:'),null,{timeout:30000});}
 await open();await save();const first=await request('/contents/layouts/qa-roundtrip.json?ref='+branch);assert.equal(JSON.parse(Buffer.from(first.content,'base64').toString()).projectName,'QA 합성 도면 · 생성');report.created=true;
 await p.locator('#ghClose').click();await p.locator('#projectName').fill('QA 합성 도면 · 수정');await p.locator('#projectName').blur();await open();await save();const second=await request('/contents/layouts/qa-roundtrip.json?ref='+branch);assert.notEqual(first.sha,second.sha);report.updated=true;
 await p.locator('#ghClose').click();await (await reveal(p,'blankBtn')).click();await open();await p.locator('#ghLoad').click();await p.waitForFunction(()=>document.getElementById('ghStatus').textContent.includes('불러왔습니다'));
 assert.deepEqual(await p.evaluate(()=>window.__warehouseCity.getLayout()),JSON.parse(Buffer.from(second.content,'base64').toString()));report.loaded=true;
 report.credentialsStored=await p.evaluate(t=>JSON.stringify({...localStorage,...sessionStorage}).includes(t),token);assert.equal(report.credentialsStored,false);await p.locator('#ghClose').click();assert.equal(await p.locator('#ghToken').inputValue(),'');
 console.log('LIVE PASS: browser create, SHA update, reload and token hygiene');
}finally{
 if(browser)await browser.close();
 if(created){await request('/git/refs/heads/'+branch,'DELETE');report.temporaryBranchDeleted=true;}
 await fs.mkdir('qa-evidence',{recursive:true});await fs.writeFile('qa-evidence/live-github-results.json',JSON.stringify(report,null,2));
}
