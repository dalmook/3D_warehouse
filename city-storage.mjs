/** Read the working copy independently of optional migration backups. */
export function readSavedLayout({getStorage,key,normalize,fallback}){
 let storage,saved;
 try{storage=getStorage();saved=storage.getItem(key);}catch(e){return {layout:fallback(),autosaveBlocked:true,loadWarning:'브라우저 저장소에 접근할 수 없습니다. JSON으로 내보내 보관하세요. '+e.message};}
 if(!saved)return {layout:fallback(),autosaveBlocked:false,loadWarning:''};
 let layout;
 try{layout=normalize(JSON.parse(saved));}catch(e){
  try{storage.setItem(key+'-recovery-'+Date.now(),saved);}catch{}
  return {layout:fallback(),autosaveBlocked:true,loadWarning:'저장 도면을 읽지 못했습니다. 기존 데이터는 보존했습니다. '+e.message};
 }
 let loadWarning='';
 for(const suffix of ['-before-practical','-before-renewal']){
  try{if(!storage.getItem(key+suffix))storage.setItem(key+suffix,saved);}catch{loadWarning='작업 도면을 불러왔지만 이전 버전 백업을 만들 공간이 부족합니다. JSON 백업을 다운로드하세요.';}
 }
 return {layout,autosaveBlocked:false,loadWarning};
}

/** Stateless Contents API transport. Tokens are read per request and never persisted. */
export async function githubRequest(url,{token='',...options}={}){
 const parsed=new URL(url);if(parsed.origin!=='https://api.github.com')throw Error('GitHub API 주소를 확인하세요.');
 const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...options.headers};if(token)headers.Authorization=`Bearer ${token}`;
 const response=await fetch(url,{...options,headers,signal:AbortSignal.timeout(20000),credentials:'omit',cache:'no-store'});
 if(response.status===404&&options.allow404)return null;
 if(!response.ok){if([409,422].includes(response.status))throw Error('저장 충돌입니다. 로컬 JSON을 백업하고 최신 버전과 비교하세요.');if([401,403].includes(response.status))throw Error('토큰, 저장소 권한 또는 GitHub API 호출 한도를 확인하세요.');throw Error(`GitHub 오류 ${response.status}. 저장소 / 브랜치 / 경로를 확인하세요.`);}
 return response.json();
}
export function compareLayouts(local,remote){
 const a=new Map(local.objects.map(o=>[o.id,o])),b=new Map(remote.objects.map(o=>[o.id,o]));
 return {localOnly:[...a.keys()].filter(id=>!b.has(id)),remoteOnly:[...b.keys()].filter(id=>!a.has(id)),changed:[...a.keys()].filter(id=>b.has(id)&&JSON.stringify(a.get(id))!==JSON.stringify(b.get(id))),projectChanged:local.projectName!==remote.projectName,warehouseChanged:JSON.stringify(local.warehouse)!==JSON.stringify(remote.warehouse)};
}
