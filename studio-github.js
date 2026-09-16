/** GitHub is the ONLY remote data service. Credentials never leave this in-memory instance. */
export function validTarget({owner='dalmook',repo='3D_warehouse',branch='main'}={}){
  if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(owner)||! /^[a-zA-Z0-9_.-]{1,100}$/.test(repo)||repo==='.'||repo==='..')throw new Error('GitHub 소유자와 저장소 이름을 확인하세요.');
  if(!/^[a-zA-Z0-9_./-]{1,100}$/.test(branch)||branch.includes('..')||branch.startsWith('/')||branch.endsWith('/'))throw new Error('브랜치 이름을 확인하세요.');
  return {owner,repo,branch};
}
export function validFile(input){const file=String(input||'').normalize('NFC').replace(/\.json$/i,'');if(!/^[\p{L}\p{N}_-]{1,64}$/u.test(file))throw new Error('파일명은 한글·영문·숫자·밑줄·하이픈 1~64자로 입력하세요.');return `${file}.json`;}
export function encodeUTF8(text){const bytes=new TextEncoder().encode(text);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
export function decodeUTF8(base64){const data=atob(base64.replace(/\s/g,''));return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(data,c=>c.charCodeAt(0)));}
export class GitHubError extends Error {constructor(message,status){super(message);this.status=status;}}
export class GitHubStore {
  #token='';#fetch;#shas=new Map();#busy=false;
  constructor(target={},token='',fetcher=globalThis.fetch){this.target=validTarget(target);this.#token=String(token).trim();this.#fetch=fetcher.bind(globalThis);}
  get connected(){return !!this.#token;}
  forgetLoaded(){this.#shas.clear();}
  disconnect(){this.#token='';this.#shas.clear();}
  get base(){return `https://api.github.com/repos/${this.target.owner}/${this.target.repo}`;}
  fileURL(file){return `${this.base}/contents/projects/${encodeURIComponent(validFile(file))}`;}
  async request(url,{method='GET',body,allow404=false}={}){
    const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    if(this.#token)headers.Authorization=`Bearer ${this.#token}`;
    if(body)headers['Content-Type']='application/json';
    let res;try{res=await this.#fetch(url,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});}catch{throw new GitHubError('GitHub에 연결하지 못했습니다. 네트워크를 확인하세요. 도면은 유지됩니다.',0);}
    if(res.status===404&&allow404)return null;
    if(!res.ok){const m={401:'GitHub 인증이 만료되었거나 토큰이 올바르지 않습니다.',403:'저장소 권한 또는 API 호출 한도를 확인하세요. Contents 읽기·쓰기 권한이 필요합니다.',404:'파일·브랜치·저장소를 찾지 못했거나 접근 권한이 없습니다.',409:'다른 곳에서 파일이 변경되었습니다. 덮어쓰지 않았습니다. 다시 불러오거나 다른 이름으로 저장하세요.',422:'같은 이름의 파일이 생겼거나 저장 요청이 충돌했습니다. 다른 이름으로 저장하거나 최신 파일을 불러오세요.',429:'GitHub 호출 한도에 도달했습니다. 잠시 후 다시 시도하세요.'};throw new GitHubError(m[res.status]||`GitHub 오류 (${res.status}). 도면은 유지됩니다.`,res.status);}
    return res.json();
  }
  async info(){return this.request(this.base);}
  async list(){const data=await this.request(`${this.base}/contents/projects?ref=${encodeURIComponent(this.target.branch)}`,{allow404:true});if(data===null)return [];if(!Array.isArray(data))throw new GitHubError('projects 경로가 폴더가 아닙니다.',400);return data.filter(f=>f.type==='file'&&/\.json$/i.test(f.name));}
  async load(name){const file=validFile(name),r=await this.request(`${this.fileURL(file)}?ref=${encodeURIComponent(this.target.branch)}`);if(r.encoding!=='base64'||r.size>4*1024*1024)throw new GitHubError('지원 범위(4MB 이하 JSON)를 초과한 도면입니다.',400);let p;try{p=JSON.parse(decodeUTF8(r.content));}catch{throw new GitHubError('저장된 JSON을 해석할 수 없습니다.',400);}this.#shas.set(file,r.sha);return {project:p,file,sha:r.sha};}
  async save(name,project){
    if(!this.connected)throw new GitHubError('저장하려면 관리자용 GitHub 토큰을 연결하세요.',401);
    if(this.#busy)throw new GitHubError('저장이 진행 중입니다. 중복 요청은 보내지 않았습니다.',409);
    const file=validFile(name),text=JSON.stringify(project,null,2);if(new TextEncoder().encode(text).length>4*1024*1024)throw new GitHubError('도면은 4MB 이하로 저장하세요.',400);
    this.#busy=true;
    try{
      let sha=this.#shas.get(file);
      if(!sha){const existing=await this.request(`${this.fileURL(file)}?ref=${encodeURIComponent(this.target.branch)}`,{allow404:true});if(existing)throw new GitHubError('기존 파일입니다. 먼저 목록에서 불러온 뒤 수정하거나, 다른 이름으로 저장하세요. 기존 파일은 덮어쓰지 않았습니다.',409);}
      const result=await this.request(this.fileURL(file),{method:'PUT',body:{message:`layout: save ${file}`,content:encodeUTF8(text),branch:this.target.branch,...(sha?{sha}:{})}});
      if(!result?.content?.sha)throw new GitHubError('GitHub 저장 확인 응답이 없습니다. 파일 목록을 확인하세요.',500);
      this.#shas.set(file,result.content.sha);return {file,sha:result.content.sha,url:result.content.html_url,commit:result.commit?.sha};
    }finally{this.#busy=false;}
  }
  shareURL(file,base=globalThis.location?.href||'https://dalmook.github.io/3D_warehouse/'){
    const url=new URL(base);url.search='';url.hash='';url.searchParams.set('project',validFile(file));for(const [k,v] of Object.entries(this.target))url.searchParams.set(k,v);url.searchParams.set('mode','walk');return url.href;
  }
}
