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
