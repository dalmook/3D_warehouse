import {calculateStackLayout} from './studio-stack.js';
/** Pure project, navigation and simulation logic. Units: metres; x/y ground, z elevation. */
import { ASSET_DEFINITIONS as ASSETS } from './studio-catalog.js';
export { ASSETS };
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = () => globalThis.crypto?.randomUUID?.() || `o-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export const STAGES=['입고','보관·피킹','검수·포장','출고'];
const NON_SOLID = new Set(['safety','textlabel','sign','warning','person','cctv','door']);
export function solid(o){return !NON_SOLID.has(o.type) && (o.z||0)<1.9 && (o.z||0)+o.height>.05;}
function number(v,min,max,label){const n=Number(v);if(v===null||v===''||typeof v==='boolean'||!Number.isFinite(n)||n<min||n>max)throw new Error(`${label}: ${min}~${max} 범위의 숫자를 입력하세요.`);return n;}
function cleanConfig(c){
  const result={};if(!c||typeof c!=='object'||Array.isArray(c))return result;
  const allowed=['bays','levels','palletsPerLevel','boxesPerCell','boxWidth','boxDepth','boxHeight','maxStackHeight','palletWidth','palletDepth','maxHeight','boxCount','count','text','tone'];
  for(const k of allowed){if(c[k]===undefined)continue;
    if(k==='text'||k==='tone')result[k]=String(c[k]).slice(0,k==='text'?80:30);
    else {const max=['bays','levels','palletsPerLevel','boxesPerCell'].includes(k)?30:['boxCount','count'].includes(k)?1000:300;
      result[k]=number(c[k],.01,max,k);if(['bays','levels','palletsPerLevel','boxesPerCell'].includes(k))result[k]=Math.floor(result[k]);}
  }return result;
}
export function makeAsset(type,x,y,extra={}){
  if(!Object.hasOwn(ASSETS,type))throw new Error('알 수 없는 설비입니다.');
  const a=ASSETS[type];return {id:uid(),type,name:a.label,width:a.width,depth:a.depth,height:a.height,color:a.color,config:clone(a.config||{}),x,y,z:a.elevation||0,rotation:0,locked:false,...extra};
}
export function validateProject(raw){
  if(!raw||typeof raw!=='object'||!raw.warehouse||!Array.isArray(raw.objects))throw new Error('창고 JSON 형식이 아닙니다. 현재 도면은 유지됩니다.');
  if(raw.schemaVersion!==undefined&&(!Number.isInteger(raw.schemaVersion)||raw.schemaVersion<1||raw.schemaVersion>10))throw new Error('지원하지 않는 도면 버전입니다.');
  if(raw.objects.length>1000)throw new Error('한 도면은 최대 1,000개 설비를 지원합니다.');
  const w=raw.warehouse,warehouse={width:number(w.width,5,300,'창고 가로'),depth:number(w.depth,5,300,'창고 세로'),height:number(w.height,2,50,'창고 높이')};
  const ids=new Set();
  const objects=raw.objects.map((o,i)=>{
    if(!o||!Object.hasOwn(ASSETS,o.type))throw new Error(`${i+1}번째 설비 종류를 확인하세요.`);
    const def=ASSETS[o.type],id=String(o.id||`legacy-${i+1}`).slice(0,100);if(ids.has(id))throw new Error('설비 ID가 중복됩니다.');ids.add(id);
    const obj={id,type:o.type,name:String(o.name||def.label).slice(0,80),
      x:number(o.x,0,warehouse.width,'설비 X'),y:number(o.y,0,warehouse.depth,'설비 Y'),z:number(o.z??def.elevation??0,0,50,'설비 높이 위치'),
      width:number(o.width??def.width,.02,300,'설비 가로'),depth:number(o.depth??def.depth,.02,300,'설비 세로'),height:number(o.height??def.height,.01,50,'설비 높이'),
      rotation:number(o.rotation??0,-36000,36000,'회전')%360,color:/^#[0-9a-f]{6}$/i.test(o.color)?o.color:def.color,locked:!!o.locked,config:cleanConfig({...def.config,...o.config})};
    if(o.type==='stack'&&o.stack){const packed=calculateStackLayout({...o.stack,palletWidth:obj.width,palletDepth:obj.depth,maxHeight:o.stack.maxHeight||obj.height});if(!packed.valid)throw new Error('박스 적재 규격을 확인하세요.');obj.stack=packed;}
    if(o.supportId)obj.supportId=String(o.supportId).slice(0,100);
    return obj;
  });
  const source=raw.simulation||{},count=number(source.workers??6,1,30,'작업자 수'),speed=number(source.speed??1,.5,4,'재생 배속');
  let stations=source.stations;
  if(stations!==undefined&&(!Array.isArray(stations)||stations.length!==4))throw new Error('작업 지점은 입고·보관·포장·출고 4개여야 합니다.');
  if(stations)stations=stations.map((p,i)=>({label:STAGES[i],x:number(p.x,0,warehouse.width,'작업 지점 X'),y:number(p.y,0,warehouse.depth,'작업 지점 Y')}));
  return {schemaVersion:10,app:'Warehouse Play Studio',projectName:String(raw.projectName||'나의 창고').slice(0,80),warehouse,objects,simulation:{workers:Math.floor(count),speed,stations:stations||inferStations({warehouse,objects})}};
}
export function inferStations(p){
  const {width:w,depth:d}=p.warehouse;
  const rack=p.objects.find(o=>o.type==='rack'||o.type==='boxrack');
  const table=p.objects.find(o=>o.type==='worktable');
  return [{x:3,y:d-3},{x:rack?.x??w/3,y:rack?clamp(rack.y+rack.depth/2+1,1,d-1):d/3},{x:table?.x??w-5,y:table?clamp(table.y+table.depth/2+1,1,d-1):d-6},{x:w-3,y:d-3}].map((s,i)=>({...s,label:STAGES[i]}));
}
export function createTemplate({width=36,depth=28,height=9,rows=3,columns=2,aisle=3}={}){
  width=number(width,18,300,'가로');depth=number(depth,18,300,'세로');height=number(height,3,50,'높이');rows=Math.floor(number(rows,1,12,'랙 행'));columns=Math.floor(number(columns,1,8,'랙 열'));aisle=number(aisle,1,8,'통로');
  const rd=1.2,rw=Math.min(8,(width-6-(columns-1)*aisle)/columns);
  if(rw<2||rows*rd+(rows-1)*aisle>depth-11)throw new Error('랙이 창고에 들어가지 않습니다. 행·열을 줄이거나 창고 크기를 늘려 주세요.');
  const objects=[],add=(t,x,y,v={})=>{const o=makeAsset(t,x,y,v);objects.push(o);return o;};
  const total=columns*rw+(columns-1)*aisle,start=(width-total)/2+rw/2;
  for(let r=0;r<rows;r++)for(let c=0;c<columns;c++)add('rack',start+c*(rw+aisle),3+rd/2+r*(rd+aisle),{name:`${String.fromCharCode(65+c)}-${r+1} 보관 랙`,width:rw,depth:rd,height:Math.min(height-1,6.4),color:c%2?'#6b9eaa':'#5084bc',config:{bays:Math.max(1,Math.floor(rw/2)),levels:4,palletsPerLevel:2}});
  add('safety',4,depth-3,{name:'입고 구역',width:6,depth:4,color:'#e8ac45'});
  add('safety',width-4,depth-3,{name:'출고 구역',width:6,depth:4,color:'#5794d5'});
  add('safety',width/2,depth-6,{name:'검수·포장 구역',width:7,depth:4,color:'#55a394'});
  add('dock',3,depth-1.5,{name:'입고 도크',rotation:180,height:3.4,depth:1.4});
  add('dock',width-3,depth-1.5,{name:'출고 도크',rotation:180,height:3.4,depth:1.4});
  add('worktable',width/2-1.5,depth-6,{name:'검수·포장 작업대'});
  add('worktable',width/2+1.5,depth-6,{name:'라벨 작업대'});
  add('conveyor',width/2,depth-9,{width:5,height:.8,name:'출고 컨베이어'});
  add('pallet',4,depth-5.5);add('forklift',width-3,depth-7,{rotation:90});
  const stations=[{x:5.5,y:depth-3.5},{x:start,y:3+rd+aisle/2},{x:width/2,y:depth-4.4},{x:width-5.5,y:depth-3.5}].map((p,i)=>({...p,label:STAGES[i]}));
  return validateProject({schemaVersion:10,projectName:'나의 물류센터',warehouse:{width,depth,height},objects,simulation:{workers:6,speed:1,stations}});
}
export function corners(o,pad=0){const a=(o.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([i,j])=>{const x=i*(o.width/2+pad),y=j*(o.depth/2+pad);return {x:o.x+x*c+y*s,y:o.y-x*s+y*c};});}
export function overlaps(a,b){
  if((a.z||0)+a.height<=(b.z||0)+.015||(b.z||0)+b.height<=(a.z||0)+.015)return false;
  const ca=corners(a),cb=corners(b);
  for(const poly of [ca,cb])for(let i=0;i<2;i++){
    const dx=poly[i+1].x-poly[i].x,dy=poly[i+1].y-poly[i].y,axis={x:-dy,y:dx};
    const pa=ca.map(p=>p.x*axis.x+p.y*axis.y),pb=cb.map(p=>p.x*axis.x+p.y*axis.y);
    if(Math.max(...pa)<=Math.min(...pb)+.005||Math.max(...pb)<=Math.min(...pa)+.005)return false;
  }return true;
}
export function placementIssue(p,o,exclude=o.id){
  if(corners(o).some(c=>c.x<0||c.y<0||c.x>p.warehouse.width||c.y>p.warehouse.depth))return '창고 경계를 벗어납니다.';
  if((o.z||0)+o.height>p.warehouse.height+.01)return '창고 높이를 초과합니다.';
  if(solid(o)){const hit=p.objects.find(b=>b.id!==exclude&&solid(b)&&overlaps(o,b));if(hit)return `${hit.name}과 겹칩니다.`;}
  return '';
}
export function hitsCircle(o,x,y,r){const a=(o.rotation||0)*Math.PI/180,dx=x-o.x,dy=y-o.y,lx=dx*Math.cos(a)-dy*Math.sin(a),ly=dx*Math.sin(a)+dy*Math.cos(a);return Math.hypot(Math.max(Math.abs(lx)-o.width/2,0),Math.max(Math.abs(ly)-o.depth/2,0))<r-.00001;}
export function isFree(project,x,y,r=.3){const w=project.warehouse;return x>=r&&y>=r&&x<=w.width-r&&y<=w.depth-r&&!project.objects.some(o=>solid(o)&&hitsCircle(o,x,y,r));}
export function moveCircle(p,position,dx,dy,r=.3){
  let {x,y}=position;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.12));
  for(let i=0;i<steps;i++){if(isFree(p,x+dx/steps,y,r))x+=dx/steps;if(isFree(p,x,y+dy/steps,r))y+=dy/steps;}
  return {x,y};
}
class Heap {constructor(){this.items=[];}push(v){const a=this.items;a.push(v);let i=a.length-1;while(i){let p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.items,first=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return first;}}
export class Navigation {
  constructor(p,r=.32){this.project=p;this.radius=r;this.step=Math.max(.5,Math.max(p.warehouse.width,p.warehouse.depth)/200);this.cols=Math.ceil(p.warehouse.width/this.step);this.rows=Math.ceil(p.warehouse.depth/this.step);this.cells=new Uint8Array(this.cols*this.rows);for(let n=0;n<this.cells.length;n++){const a=this.point(n);this.cells[n]=isFree(p,a.x,a.y,r+.035)?1:0;}}
  point(n){return {x:(n%this.cols+.5)*this.step,y:(Math.floor(n/this.cols)+.5)*this.step};}
  nearest(p,max=Infinity){let best=-1,dist=max;for(let n=0;n<this.cells.length;n++){if(!this.cells[n])continue;const q=this.point(n),d=Math.hypot(q.x-p.x,q.y-p.y);if(d<dist){dist=d;best=n;}}return best;}
  index(p){return clamp(Math.floor(p.y/this.step),0,this.rows-1)*this.cols+clamp(Math.floor(p.x/this.step),0,this.cols-1);}
  segment(a,b){const d=Math.hypot(a.x-b.x,a.y-b.y),steps=Math.ceil(d/.15);for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(!isFree(this.project,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,this.radius))return false;}return true;}
  path(start,goal){
    const s=this.nearest(start,1.5),g=this.nearest(goal,1.25);if(s<0||g<0||!this.segment(start,this.point(s)))return null;
    if(s===g)return [this.point(s)];const size=this.cells.length,cost=new Float64Array(size).fill(Infinity),prev=new Int32Array(size).fill(-1),closed=new Uint8Array(size),heap=new Heap();
    const h=n=>Math.abs(n%this.cols-g%this.cols)+Math.abs(Math.floor(n/this.cols)-Math.floor(g/this.cols));cost[s]=0;heap.push({n:s,f:h(s)});
    while(heap.items.length){const {n}=heap.pop();if(closed[n])continue;if(n===g){const path=[];for(let c=g;c!==-1;c=prev[c])path.push(this.point(c));return path.reverse();}closed[n]=1;
      const x=n%this.cols,y=Math.floor(n/this.cols);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=this.cols||yy>=this.rows)continue;const m=yy*this.cols+xx;
        if(!this.cells[m]||closed[m]||cost[m]<=cost[n]+1||!this.segment(this.point(n),this.point(m)))continue;cost[m]=cost[n]+1;prev[m]=n;heap.push({n:m,f:cost[m]+h(m)});
      }
    }return null;
  }
}
export class Simulation {
  constructor(project){this.project=project;this.nav=new Navigation(project);this.running=false;this.speed=project.simulation.speed;this.reset();}
  reset(){this.running=false;this.elapsed=0;this.completed=0;this.distance=0;this.agents=[];const occupied=new Set();
    for(let i=0;i<this.project.simulation.workers;i++){
      const base=this.project.simulation.stations[0],guess={x:base.x+(i%5)*.75,y:base.y-Math.floor(i/5)*.85};let n=this.nav.nearest(guess,5);
      if(occupied.has(n)){n=this.nav.nearest({x:base.x-(i%5)*.85,y:base.y-1-Math.floor(i/5)},7);}if(n<0||occupied.has(n))continue;occupied.add(n);
      this.agents.push({id:i,...this.nav.point(n),stage:1,path:null,step:0,wait:i*.65,blocked:false,distance:0,heading:0,moving:false,cycles:0});
    }
  }
  tick(realDt){if(!this.running)return;const total=clamp(realDt,0,.2)*this.speed;const parts=Math.max(1,Math.ceil(total/.08));for(let k=0;k<parts;k++)this.advance(total/parts);}
  advance(dt){this.elapsed+=dt;
    for(const a of this.agents){a.moving=false;if(a.wait>0){a.wait-=dt;continue;}if(a.blocked)continue;
      if(!a.path){a.path=this.nav.path(a,this.project.simulation.stations[a.stage]);a.step=0;if(!a.path){a.blocked=true;continue;}}
      let remaining=1.15*dt;
      while(remaining>0&&a.step<a.path.length){const target=a.path[a.step],dx=target.x-a.x,dy=target.y-a.y,d=Math.hypot(dx,dy);if(d<.015){a.step++;continue;}
        const travel=Math.min(remaining,d),nx=a.x+dx/d*travel,ny=a.y+dy/d*travel;
        // Coarse pedestrian model: no production throughput or physical crowd-dynamics claims.
        a.x=nx;a.y=ny;a.heading=Math.atan2(dx,dy);a.distance+=travel;this.distance+=travel;a.moving=true;remaining-=travel;if(travel>=d-.001)a.step++;
      }
      if(a.step>=a.path.length){if(a.stage===3){this.completed++;a.cycles++;}a.stage=(a.stage+1)%4;a.path=null;a.wait=a.stage===0?1.8:1.0;}
    }
  }
  get blocked(){return this.agents.filter(a=>a.blocked).length;}
}
