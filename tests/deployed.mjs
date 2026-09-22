import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base=process.env.BASE_URL,sha=process.env.GITHUB_SHA;
if(!base||!sha)throw Error('Expected Pages URL and source commit');
const files=['index.html','city.css','city-workbench.css','classic.html','objects.js','boot.js',...(await fs.readdir('.')).filter(f=>/^city-.*\.mjs$/.test(f))];
for(const dir of ['assets/models','assets/textures'])for(const file of await fs.readdir(dir))files.push(`${dir}/${file}`);
files.push('assets/manifest.json','vendor/dxf.mjs');
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected=Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await fs.readFile(f))])));
let report={passed:false,commit:sha,url:base,files:[]};
for(let attempt=0;attempt<36;attempt++){
 report.files=await Promise.all(files.map(async file=>{
  try{const u=new URL(file,base);u.searchParams.set('verify',sha+'-'+attempt);const r=await fetch(u,{cache:'no-store',signal:AbortSignal.timeout(15000)});const actual=r.ok?hash(Buffer.from(await r.arrayBuffer())):null;return {file,expected:expected[file],actual,status:r.status,matched:actual===expected[file]};}
  catch(e){return {file,expected:expected[file],matched:false,error:e.name};}
 }));
 report.passed=report.files.every(f=>f.matched);if(report.passed)break;
 console.log('Waiting for Pages source hashes',attempt+1);await new Promise(r=>setTimeout(r,5000));
}
await fs.mkdir('qa-evidence',{recursive:true});await fs.writeFile('qa-evidence/deployed-build.json',JSON.stringify(report,null,2));
assert.ok(report.passed,'Every published application file must match the checked-out commit');
console.log('PUBLISHED SOURCE VERIFIED',sha);
