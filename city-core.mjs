/** Warehouse City v9: deterministic layout, collision, navigation and simulation. Units: metres. */
export const VERSION = 9;
export const MAX_OBJECTS = 600;
export const CATALOG = {
  rack: {name:'팔레트 랙', group:'보관', icon:'▦', width:8, depth:1.2, height:6, color:'#2674ae', config:{bays:4,levels:4,palletsPerLevel:2}},
  boxrack: {name:'박스랙',group:'보관',icon:'▥',width:3.6,depth:.8,height:2.4,color:'#e9a23b',config:{bays:4,levels:5,boxesPerCell:3}},
  pallet: {name:'팔레트',group:'보관',icon:'▰',width:1.2,depth:1,height:.16,color:'#bb9164'},
  box: {name:'박스',group:'보관',icon:'□',width:.6,depth:.4,height:.4,color:'#cb9c66'},
  conveyor: {name:'컨베이어',group:'작업',icon:'≋',width:6,depth:.9,height:.85,color:'#568e9c'},
  worktable: {name:'작업대',group:'작업',icon:'⌸',width:2,depth:1,height:.9,color:'#8371c5'},
  dock: {name:'입출고 도크',group:'작업',icon:'⊓',width:3,depth:2.5,height:3.4,color:'#528194'},
  forklift: {name:'지게차',group:'작업',icon:'▣',width:1.2,depth:2.4,height:2.2,color:'#eeae33'},
  worker: {name:'작업자',group:'운영',icon:'●',width:.6,depth:.6,height:1.7,color:'#20a18b'},
  waypoint: {name:'이동 목적지',group:'운영',icon:'◎',width:1,depth:1,height:.03,color:'#f4b84a'},
  aisle: {name:'보행 통로',group:'운영',icon:'↔',width:3,depth:10,height:.02,color:'#71b8a4'},
  safety: {name:'안전 구역',group:'운영',icon:'◇',width:5,depth:3,height:.025,color:'#ecc263'},
  office: {name:'사무실',group:'시설',icon:'▤',width:5,depth:4,height:2.7,color:'#6e91b7'},
  partition: {name:'파티션 / 벽',group:'시설',icon:'┃',width:4,depth:.18,height:2.5,color:'#97a4b5'},
  door: {name:'출입문',group:'시설',icon:'▯',width:1.2,depth:.15,height:2.2,color:'#397c76'},
  cleanbooth: {name:'클린부스',group:'시설',icon:'▧',width:4,depth:3,height:2.7,color:'#69b1b0'}
};
export const copy = x => JSON.parse(JSON.stringify(x));
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const num = (v,f) => v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : f;
export const uid = () => globalThis.crypto?.randomUUID?.() || `o-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function object(type,x,y,extra={}) {
  const d = Object.hasOwn(CATALOG,type) ? CATALOG[type] : CATALOG.box;
  return {...copy(d), type, id:uid(), x,y,z:0, rotation:0,locked:false,...extra};
}
export function normalize(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.objects)) throw Error('도면 JSON에 objects 배열이 필요합니다.');
  if (raw.objects.length>MAX_OBJECTS) throw Error(`도면은 최대 ${MAX_OBJECTS}개 설비를 지원합니다.`);
  if (num(raw.schemaVersion,1)>VERSION) throw Error('더 최신 버전의 도면입니다. 원본을 보존하고 앱을 업데이트하세요.');
  const w = raw.warehouse || {}, seen = new Set();
  const warehouse = {width:clamp(num(w.width,36),10,200),depth:clamp(num(w.depth,24),10,200),height:clamp(num(w.height,9),3,30)};
  const objects=raw.objects.map(o=>{
    if(!o || typeof o!=='object') throw Error('잘못된 설비 데이터입니다.');
    const type=String(o.type || 'box').slice(0,40), def=Object.hasOwn(CATALOG,type) ? CATALOG[type] : CATALOG.box;
    const id=typeof o.id==='string'&&!seen.has(o.id)?o.id:uid(); seen.add(id);
    const config=copy(o.config || def.config || {});
    for(const k of ['bays','levels','palletsPerLevel','boxesPerCell']) if(k in config) config[k]=clamp(Math.round(num(config[k],1)),1,20);
    return {...copy(o),id,type,name:String(o.name || def.name).slice(0,80),
      x:clamp(num(o.x,warehouse.width/2),0,warehouse.width),y:clamp(num(o.y,warehouse.depth/2),0,warehouse.depth),
      z:clamp(num(o.z ?? o.elevation,0),0,warehouse.height),
      width:clamp(num(o.width,def.width),.05,200),depth:clamp(num(o.depth,def.depth),.05,200),height:clamp(num(o.height,def.height),.01,30),
      rotation:((num(o.rotation,0)%360)+360)%360,color:/^#[0-9a-f]{6}$/i.test(o.color)?o.color:def.color,locked:!!o.locked,config};
  });
  return {schemaVersion:VERSION,app:'Warehouse City',projectName:String(raw.projectName || '나의 물류센터').slice(0,80),warehouse,objects,
    simulation:{speed:clamp(num(raw.simulation?.speed,1.3),.2,3),dwell:clamp(num(raw.simulation?.dwell,2),0,60)}};
}
export function demo() {
  const objects=[];
  for(let y=5;y<=17;y+=4) for(const x of [8,28]) objects.push(object('rack',x,y,{name:`${x<18?'A':'B'}-${y} 랙`}));
  objects.push(object('aisle',18,12,{width:4,depth:22}),object('safety',6,21,{name:'입고 구역'}),object('safety',30,21,{name:'출고 구역',color:'#6fa9d4'}),object('worktable',18,5),object('conveyor',28,21,{width:5}),object('dock',6,1.8));
  [[18,21],[18,12],[18,2],[33,10]].forEach(([x,y],i)=>objects.push(object('waypoint',x,y,{name:`작업 지점 ${i+1}`})));
  [0,1,2].forEach(i=>objects.push(object('worker',17+i,22,{name:`작업자 ${i+1}`})));
  return normalize({schemaVersion:9,projectName:'동선이 살아있는 물류센터',warehouse:{width:36,depth:24,height:9},objects});
}
const PASS = new Set(['aisle','safety','waypoint','worker','door','text','sign','warning']);
export const solid = o => !PASS.has(o.type) && o.height>.08;
export function footprint(o) {
  const r=o.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:o.x+x*o.width/2*c+y*o.depth/2*s,y:o.y-x*o.width/2*s+y*o.depth/2*c}));
}
export function overlap(a,b) {
  if(a.z+a.height<=b.z+.001 || b.z+b.height<=a.z+.001) return false;
  const A=footprint(a),B=footprint(b);
  for(const poly of [A,B]) for(let i=0;i<2;i++) {
    const p=poly[i],q=poly[i+1],axis={x:-(q.y-p.y),y:q.x-p.x};
    const pa=A.map(v=>v.x*axis.x+v.y*axis.y),pb=B.map(v=>v.x*axis.x+v.y*axis.y);
    if(Math.max(...pa)<=Math.min(...pb)+1e-8||Math.max(...pb)<=Math.min(...pa)+1e-8) return false;
  } return true;
}
export function placementError(o,layout) {
  if(footprint(o).some(p=>p.x<0||p.y<0||p.x>layout.warehouse.width||p.y>layout.warehouse.depth)||o.z+o.height>layout.warehouse.height+.001) return '창고 경계 / 높이를 벗어납니다.';
  if(solid(o)&&layout.objects.some(p=>p.id!==o.id&&solid(p)&&overlap(o,p))) return '다른 설비와 겹칩니다.';
  return '';
}
export function blocked(x,y,layout,radius=.3) {
  const w=layout.warehouse;
  if(x<radius||y<radius||x>w.width-radius||y>w.depth-radius) return true;
  return layout.objects.some(o=>{
    if(!solid(o)||o.z>=1.8) return false;
    const a=o.rotation*Math.PI/180,dx=x-o.x,dy=y-o.y;
    const lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);
    const ex=Math.max(Math.abs(lx)-o.width/2,0),ey=Math.max(Math.abs(ly)-o.depth/2,0);
    return ex*ex+ey*ey<=radius*radius;
  });
}
export function segmentFree(a,b,layout,radius=.3) {
  const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.12));
  for(let i=0;i<=steps;i++) if(blocked(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps,layout,radius)) return false;
  return true;
}
export class Navigation {
  constructor(layout,cell=.75) {
    this.layout=layout;this.cell=cell;this.w=Math.ceil(layout.warehouse.width/cell);this.h=Math.ceil(layout.warehouse.depth/cell);
    this.grid=new Uint8Array(this.w*this.h);
    for(let i=0;i<this.grid.length;i++){const p=this.point(i);this.grid[i]=blocked(p.x,p.y,layout)?1:0;}
    this.edges=new Map();
  }
  point(i){return {x:(i%this.w+.5)*this.cell,y:(Math.floor(i/this.w)+.5)*this.cell};}
  near(p){
    const cx=Math.floor(p.x/this.cell),cy=Math.floor(p.y/this.cell);let best=-1,dist=Infinity;
    for(let y=Math.max(0,cy-3);y<=Math.min(this.h-1,cy+3);y++)for(let x=Math.max(0,cx-3);x<=Math.min(this.w-1,cx+3);x++){
      const i=y*this.w+x,q=this.point(i),d=Math.hypot(q.x-p.x,q.y-p.y);
      if(!this.grid[i]&&d<dist&&segmentFree(p,q,this.layout)){best=i;dist=d;}
    } return best;
  }
  path(from,to){
    if(blocked(from.x,from.y,this.layout)||blocked(to.x,to.y,this.layout)) return [];
    const s=this.near(from),g=this.near(to); if(s<0||g<0)return [];
    const parent=new Int32Array(this.grid.length).fill(-1),queue=new Int32Array(this.grid.length);let head=0,tail=1;
    queue[0]=s;parent[s]=s;
    while(head<tail&&parent[g]===-1){
      const i=queue[head++],x=i%this.w,y=Math.floor(i/this.w);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy,j=ny*this.w+nx;
        if(nx<0||ny<0||nx>=this.w||ny>=this.h||this.grid[j]||parent[j]!==-1)continue;
        const key=i<j?`${i}:${j}`:`${j}:${i}`;
        if(!this.edges.has(key))this.edges.set(key,segmentFree(this.point(i),this.point(j),this.layout));
        if(!this.edges.get(key))continue;
        parent[j]=i;queue[tail++]=j;
      }
    }
    if(parent[g]===-1)return [];
    const cells=[];for(let i=g;i!==s;i=parent[i])cells.push(this.point(i));cells.push(this.point(s));cells.reverse();
    const path=[{x:from.x,y:from.y},...cells,{x:to.x,y:to.y}];
    return path.filter((p,i)=>!i||Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y)>.001);
  }
}
export class Simulation {
  constructor(layout){
    this.layout=copy(layout);this.nav=new Navigation(this.layout);this.time=0;this.arrivals=0;this.distance=0;
    this.targets=this.layout.objects.filter(o=>o.type==='waypoint');
    this.agents=this.layout.objects.filter(o=>o.type==='worker').slice(0,40).map((o,i)=>({...o,target:i%Math.max(1,this.targets.length),path:[],step:0,wait:0,status:'준비',distance:0,heading:0}));
    this.agents.forEach(a=>this.plan(a));
  }
  plan(a){
    if(!this.targets.length){a.status='목적지 없음';return;}
    if(blocked(a.x,a.y,this.layout)){a.status='시작 위치 막힘';return;}
    a.path=this.nav.path(a,this.targets[a.target]);a.step=1;a.status=a.path.length?'이동':'경로 없음';
  }
  tick(dt){
    dt=clamp(dt,0,.2);this.time+=dt;
    for(const a of this.agents){
      if(a.status==='작업 중'){a.wait-=dt;if(a.wait<=0){a.target=(a.target+1)%this.targets.length;this.plan(a);}continue;}
      if(a.status!=='이동')continue;
      let remaining=this.layout.simulation.speed*dt;
      while(remaining>0&&a.step<a.path.length){
        const p=a.path[a.step],dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),move=Math.min(d,remaining);
        if(d>.00001){a.x+=dx/d*move;a.y+=dy/d*move;a.heading=Math.atan2(dx,dy);a.distance+=move;this.distance+=move;}
        remaining-=move;if(d<=move+.00001)a.step++;else break;
      }
      if(a.step>=a.path.length){a.status='작업 중';a.wait=this.layout.simulation.dwell;this.arrivals++;}
    }
  }
}
export class History {
  constructor(initial){this.items=[copy(initial)];this.index=0;}
  push(value){this.items.splice(this.index+1);this.items.push(copy(value));if(this.items.length>60)this.items.shift();this.index=this.items.length-1;}
  undo(){if(this.index>0)this.index--;return copy(this.items[this.index]);}
  redo(){if(this.index<this.items.length-1)this.index++;return copy(this.items[this.index]);}
}
export function utf8base64(text){const bytes=new TextEncoder().encode(text);let b='';for(const n of bytes)b+=String.fromCharCode(n);return btoa(b);}
export function fromBase64(text){return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0)));}
export function repoPath(owner,repo,path){
  if(!/^[a-z\d-]+$/i.test(owner)||!/^[a-z\d_.-]+$/i.test(repo))throw Error('GitHub 소유자 / 저장소 이름을 확인하세요.');
  if(!/^layouts\/[a-z\d_\/-]+\.json$/i.test(path)||path.includes('..')||path.includes('//'))throw Error('파일 경로는 layouts/영문이름.json 형식으로 입력하세요.');
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
}
