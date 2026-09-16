import assert from 'node:assert/strict';
const base=process.env.BASE_URL,sha=process.env.GITHUB_SHA;
if(!base||!sha)throw Error('Expected Pages URL and commit SHA');
let release;
for(let i=0;i<15;i++){try{const r=await fetch(new URL('release.json?build='+sha,base));if(r.ok){release=await r.json();if(release.commit===sha)break;}}catch{}await new Promise(resolve=>setTimeout(resolve,4000));}
assert.equal(release?.commit,sha,'Published release must match the deployed commit');
console.log('PUBLISHED BUILD VERIFIED',sha);
