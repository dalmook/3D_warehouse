import {copy,Navigation,blocked,segmentFree} from './city-core.mjs';
export const STEP=.05;
const moving=new Set(['worker','forklift']);
export function qualityDemo(){
 return {schemaVersion:9,app:'Warehouse City',projectName:'스튜디오 01 · 입고에서 출하까지',warehouse:{width:20,depth:18,height:7},simulation:{speed:1.3,dwell:2},objects:[
  {id:'rack-a',type:'rack',name:'A · 팔레트 보관',x:6,y:6,width:7.8,depth:1.2,height:5.4,config:{bays:3,levels:3,palletsPerLevel:2}},
  {id:'rack-b',type:'rack',name:'B · 팔레트 보관',x:6,y:11,width:7.8,depth:1.2,height:5.4,config:{bays:3,levels:3,palletsPerLevel:2}},
  {id:'inbound',type:'dock',name:'입고 도크',x:15,y:1.5,width:3,depth:2.5,height:3.4},
  {id:'outbound',type:'dock',name:'출하 도크',x:15,y:16.5,width:3,depth:2.5,height:3.4,rotation:180},
  {id:'bench',type:'worktable',name:'검수 · 포장',x:17.5,y:9,width:2,depth:1,height:.9},
  {id:'worker-1',type:'worker',name:'피킹 담당',x:18,y:12},
  {id:'worker-2',type:'worker',name:'출하 담당',x:18,y:14},
  {id:'fork-1',type:'forklift',name:'입고 지게차',x:15,y:5},
  {id:'pallet-1',type:'pallet',x:18,y:4},
  {id:'box-1',type:'box',x:18,y:4,z:.16},
  {id:'green-lane',type:'aisle',name:'보행 통로',x:11.5,y:9,width:1.1,depth:16},
  {id:'safety-1',type:'safety',name:'입고 대기',x:15,y:4,width:3,depth:2},
  {id:'point-1',type:'waypoint',name:'입고',x:15,y:4},
  {id:'point-2',type:'waypoint',name:'랙 접근',x:6,y:8.5},
  {id:'point-3',type:'waypoint',name:'포장',x:16,y:9},
  {id:'point-4',type:'waypoint',name:'출하',x:15,y:14}
 ]};
}
export class Logistics {
 constructor(layout,{seed=42,units=6}={}){
  this.layout=copy(layout);this.time=0;this.steps=0;this.distance=0;this.arrivals=0;this.seed=seed>>>0;this.events=[];this.reservations=new Map();this.error='';this.units=[];
  this.navLayout={...this.layout,objects:this.layout.objects.filter(o=>!moving.has(o.type))};
  const docks=layout.objects.filter(o=>o.type==='dock'),racks=layout.objects.filter(o=>o.type==='rack'),table=layout.objects.find(o=>o.type==='worktable');
  this.agents=layout.objects.filter(o=>moving.has(o.type)).slice(0,48).map((o,i)=>({...copy(o),radius:o.type==='forklift'?Math.hypot(o.width,o.depth)/2+.1:.32,heading:0,status:'대기',phase:'idle',distance:0,busy:0,waiting:0,path:[],step:1,cargo:null,index:i}));
  this.targets=[];
  if(docks.length<2||!racks.length||!table||!this.agents.some(a=>a.type==='forklift')||!this.agents.some(a=>a.type==='worker')){this.error='입고/출하 도크 2개, 팔레트랙, 작업대, 지게차, 작업자가 필요합니다.';return;}
  this.navs=new Map(this.agents.map(a=>[a.id,new Navigation(this.navLayout,.5,a.radius)]));
  const access=(o,radius)=>{
   const candidates=[{x:o.x,y:o.y+o.depth/2+radius+.3},{x:o.x,y:o.y-o.depth/2-radius-.3},{x:o.x+o.width/2+radius+.3,y:o.y},{x:o.x-o.width/2-radius-.3,y:o.y}];
   return candidates.find(p=>!blocked(p.x,p.y,this.navLayout,radius));
  };
  const fr=Math.max(...this.agents.filter(a=>a.type==='forklift').map(a=>a.radius));
  this.inbound=access(docks[0],fr);this.outbound=access(docks[1],.4);this.table=access(table,.4);
  this.slots=racks.flatMap(r=>Array.from({length:(r.config?.bays||4)*(r.config?.levels||4)*(r.config?.palletsPerLevel||2)},(_,i)=>({id:r.id+':'+i,point:access(r,fr),rack:r.id,index:i,unit:null})));
  if(!this.inbound||!this.outbound||!this.table||!this.slots.some(s=>s.point)){this.error='설비 앞 작업 공간이 막혔습니다. 통로 폭과 벽 이격을 확인하세요.';return;}
  this.slots=this.slots.filter(s=>s.point);this.targets=[this.inbound,this.table,this.outbound,...this.slots.map(s=>s.point)];
  for(let i=0;i<Math.min(units,this.slots.length);i++){const slot=this.slots[i];slot.unit='unit-'+i;this.units.push({id:slot.unit,state:'inbound',owner:null,slot:slot.id,point:{...this.inbound},received:0,shipped:null});this.log('received',slot.unit);}
  this.received=this.units.length;
 }
 random(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296;}
 log(type,unit,agent=null){this.events.push({time:this.time,type,unit,agent});}
 assign(a){
  const states=a.type==='forklift'?['inbound']:['stored','packed'];
  const unit=this.units.find(u=>states.includes(u.state)&&!u.owner);if(!unit)return;
  const stage=unit.state==='inbound'?'putaway':unit.state==='stored'?'pick':'ship';
  const slot=this.slots.find(s=>s.id===unit.slot);
  const destination=stage==='putaway'?slot.point:stage==='pick'?this.table:this.outbound;
  const key=stage==='putaway'?slot.id:stage==='pick'?'packing':'outbound';
  if(this.reservations.has(key))return;
  const path=this.navs.get(a.id).path(a,unit.point);
  const onward=this.navs.get(a.id).path(unit.point,destination);
  if(!path.length||!onward.length){a.status='경로 없음 · '+stage;a.waiting+=STEP;return;}
  unit.owner=a.id;this.reservations.set(key,a.id);a.job={unit:unit.id,stage,destination,key};a.path=path;a.step=1;a.phase='approach';a.status='이동';a.stall=0;this.log('assigned',unit.id,a.id);
 }
 tick(){
  if(this.error)return;
  this.time=++this.steps*STEP;
  for(const a of this.agents){
   if(a.phase==='idle'){this.assign(a);continue;}
   a.busy+=STEP;
   const u=this.units.find(u=>u.id===a.job?.unit);
   if(a.phase==='load'||a.phase==='unload'){
    a.timer-=STEP;if(a.timer>0)continue;
    if(a.phase==='load'){
     a.cargo=u.id;u.state='transport';a.phase='transport';a.status='운반';a.path=this.navs.get(a.id).path(a,a.job.destination);a.step=1;this.log('loaded',u.id,a.id);
     if(!a.path.length){a.status='경로 없음 · 운반';a.phase='blocked';}
    }else{
     u.point={...a.job.destination};u.state={putaway:'stored',pick:'packed',ship:'shipped'}[a.job.stage];
     if(u.state==='shipped'){u.shipped=this.time;this.arrivals++;this.slots.find(s=>s.id===u.slot).unit=null;}
     u.owner=null;a.cargo=null;this.reservations.delete(a.job.key);this.log(u.state,u.id,a.id);
     const home=this.layout.objects.find(o=>o.id===a.id);a.job={destination:{x:home.x,y:home.y}};a.path=this.navs.get(a.id).path(a,a.job.destination);a.step=1;a.phase='park';a.status='복귀';
    }continue;
   }
   if(a.phase==='blocked')continue;
   const p=a.path[a.step];
   if(!p){if(a.phase==='park'){a.phase='idle';a.job=null;a.status='대기';continue;}a.phase=a.phase==='approach'?'load':'unload';a.timer=1.5+this.random()*.5;a.status=a.phase==='load'?'적재':'하역 / 포장';continue;}
   const dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),speed=a.type==='forklift'?.9:this.layout.simulation.speed,move=Math.min(d,speed*STEP),next={x:a.x+dx/(d||1)*move,y:a.y+dy/(d||1)*move};
   // Stable priority; reserve the swept disc for this tick. Never teleport or overlap.
   const conflict=this.agents.find(b=>b!==a&&Math.hypot(b.x-next.x,b.y-next.y)<a.radius+b.radius+.08);
   if(conflict){
    a.waiting+=STEP;a.stall+=STEP;a.status=a.stall>20?'교착 · '+conflict.name:'양보 · '+conflict.name;
    if(Math.round(a.stall/STEP)%20===0){
     const obstacles=this.agents.filter(b=>b!==a).map(b=>({id:'traffic-'+b.id,type:'partition',x:b.x,y:b.y,z:0,width:b.radius*2+.12,depth:b.radius*2+.12,height:2,rotation:0}));
     const nav=new Navigation({...this.navLayout,objects:[...this.navLayout.objects,...obstacles]},.25,a.radius);
     const destination=a.phase==='approach'?u.point:a.job.destination,path=nav.path(a,destination);
     if(path.length){a.path=path;a.step=1;a.status='재탐색';}
    }continue;
   }
   if(!segmentFree(a,next,this.navLayout,a.radius)){a.phase='blocked';a.status='경로 없음 · 통로 차단';continue;}
   a.x=next.x;a.y=next.y;a.distance+=move;this.distance+=move;a.heading=Math.atan2(dx,dy);a.stall=0;a.status=a.cargo?'운반':'이동';if(d<=move+.00001)a.step++;
   if(a.cargo)u.point={x:a.x,y:a.y};
  }
 }
 conservation(){const counts={inbound:0,stored:0,transport:0,packed:0,shipped:0};this.units.forEach(u=>counts[u.state]++);return {received:this.received||0,...counts,valid:Object.values(counts).reduce((a,b)=>a+b,0)===(this.received||0)&&new Set(this.units.map(u=>u.id)).size===this.units.length};}
 metrics(){return {time:this.time,shipped:this.arrivals,distance:this.distance,waiting:this.agents.reduce((n,a)=>n+a.waiting,0),utilization:this.time?this.agents.reduce((n,a)=>n+a.busy,0)/Math.max(1,this.agents.length)/this.time:0,conservation:this.conservation(),events:this.events.length,error:this.error};}
}
