/** Shared design geometry and quantities. All values in metres; no render bounds. */
import {copy,uid,footprint,placementError,MAX_OBJECTS,blocked,overlap} from './city-core.mjs';
export function stackLayout(v){
 const {palletWidth:w,palletDepth:d,palletHeight:h,boxWidth:bw,boxDepth:bd,boxHeight:bh,maxHeight, count,gap=0,rotate=true,layerLimit=1000,boxWeight=0,maxLoad=0}=v;
 if(![w,d,h,bw,bd,bh,maxHeight,count,gap,layerLimit,boxWeight,maxLoad].every(Number.isFinite)||Math.min(w,d,h,bw,bd,bh)<=0||gap<0||count<0||!Number.isInteger(count)||layerLimit<0||boxWeight<0||maxLoad<0)throw Error('적재 규격·수량·간격을 확인하세요.');
 const candidates=[{width:bw,depth:bd,rotation:0},...(rotate?[{width:bd,depth:bw,rotation:90}]:[])].map(c=>({...c,cols:Math.max(0,Math.floor((w+gap+1e-8)/(c.width+gap))),rows:Math.max(0,Math.floor((d+gap+1e-8)/(c.depth+gap)))}));
 candidates.sort((a,b)=>b.cols*b.rows-a.cols*a.rows);const c=candidates[0],perLayer=c.cols*c.rows,maxLayers=Math.max(0,Math.min(Math.floor(layerLimit),Math.floor((maxHeight-h+gap+1e-8)/(bh+gap))));
 const maxCount=Math.min(perLayer*maxLayers,boxWeight>0&&maxLoad>0?Math.floor(maxLoad/boxWeight):Infinity),actual=Math.min(count,maxCount);
 if(actual>20000)throw Error('미리보기는 20,000박스까지입니다. 수량을 나누세요. 원본은 변경되지 않습니다.');
 const boxes=Array.from({length:actual},(_,i)=>({id:uid(),x:-w/2+c.width/2+(i%c.cols)*(c.width+gap),y:-d/2+c.depth/2+(Math.floor(i/c.cols)%c.rows)*(c.depth+gap),z:h+Math.floor(i/perLayer)*(bh+gap),width:bw,depth:bd,height:bh,rotation:c.rotation}));
 return {...copy(v),boxes,perLayer,maxLayers,maxCount,actual,layers:perLayer?Math.ceil(actual/perLayer):0,remaining:count-actual,palletsNeeded:maxCount?Math.ceil(count/maxCount):null,totalHeight:actual?h+Math.ceil(actual/perLayer)*bh+(Math.ceil(actual/perLayer)-1)*gap:h,method:'best uniform orientation'};
}
export function localToPlan(o,p){const r=o.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return {x:o.x+p.x*c+p.y*s,y:o.y-p.x*s+p.y*c,z:(o.z||0)+(p.z||0)};}
export function dimensions(o){const f=footprint(o);return {width:o.width,depth:o.depth,height:o.load?.totalHeight||o.height,elevation:o.z||0,worldWidth:Math.max(...f.map(p=>p.x))-Math.min(...f.map(p=>p.x)),worldDepth:Math.max(...f.map(p=>p.y))-Math.min(...f.map(p=>p.y)),footprint:f};}
export function closure(objects,ids){const set=new Set(ids);let changed=true;while(changed){changed=false;for(const o of objects)if(o.supportId&&set.has(o.supportId)&&!set.has(o.id)){set.add(o.id);changed=true;}}return objects.filter(o=>set.has(o.id));}
export function cloneGroup(objects,ids,{x=0,y=0,rotation=0}={}){
 const source=closure(objects,ids),map=new Map(source.map(o=>[o.id,uid()])),groups=new Map();if(!source.length)return [];
 const cx=source.reduce((s,o)=>s+o.x,0)/source.length,cy=source.reduce((s,o)=>s+o.y,0)/source.length;
 return source.map(o=>{const n=copy(o),p=localToPlan({x:cx+x,y:cy+y,z:0,rotation},{x:o.x-cx,y:o.y-cy,z:o.z});n.id=map.get(o.id);Object.assign(n,p);n.rotation=(o.rotation+rotation)%360;if(n.supportId)n.supportId=map.get(n.supportId)||n.supportId;if(n.groupId){if(!groups.has(n.groupId))groups.set(n.groupId,uid());n.groupId=groups.get(n.groupId);}if(n.load?.boxes)for(const b of n.load.boxes)b.id=uid();return n;});
}
export function validateAdded(layout,added){if(layout.objects.length+added.length>MAX_OBJECTS)return ['설비 수 한도 초과'];const next={...layout,objects:[...layout.objects,...added]};return added.map(o=>placementError(o,next)).filter(Boolean);}
export function cloneReferences(layout,source,added){
 const routes=[],routePoints=[],measurements=[],done=new Map(),objects=new Map(source.map((o,i)=>[o.id,added[i]?.id]));
 for(let i=0;i<source.length;i++){
  const o=source[i],n=added[i];if(!n)continue;
  const route=layout.routes?.find(r=>r.id===o.routeId);if(!route)continue;
  if(done.has(route.id)){n.routeId=done.get(route.id);continue;}
  const id=uid();done.set(route.id,id);n.routeId=id;const ids=[];
  for(const pointId of route.destinationIds){const p=layout.routePoints?.find(p=>p.id===pointId);if(!p)continue;const q={...copy(p),...localToPlan({x:n.x,y:n.y,z:0,rotation:n.rotation-o.rotation},{x:p.x-o.x,y:p.y-o.y}),id:uid()};if(q.objectId)q.objectId=objects.get(q.objectId)||q.objectId;ids.push(q.id);routePoints.push(q);}
  routes.push({...copy(route),id,destinationIds:ids});
 }
 for(const m of layout.measurements||[]){if(![m.a,m.b].every(p=>p.objectId&&objects.has(p.objectId)))continue;measurements.push({...copy(m),id:uid(),a:{...m.a,objectId:objects.get(m.a.objectId)},b:{...m.b,objectId:objects.get(m.b.objectId)}});}
 return {routes,routePoints,measurements};
}
export function resolveAnchor(layout,anchor){if(!anchor.objectId)return anchor;const o=layout.objects.find(o=>o.id===anchor.objectId);return o?localToPlan(o,anchor):null;}
export function measurementAnchor(layout,p){
 let nearest=null,best=.35;
 for(const o of layout.objects){if(['aisle','safety','worker','floorStorageZone'].includes(o.type))continue;for(const q of footprint(o)){const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<best){best=d;nearest={o,q};}}}
 if(!nearest)return {...p};const {o,q}=nearest,local=localToPlan({x:0,y:0,z:0,rotation:-o.rotation},{x:q.x-o.x,y:q.y-o.y});return {...local,objectId:o.id};
}
export function transformSupported(objects,before,after){
 const children=closure(objects,[before.id]).filter(o=>o.id!==before.id),angle=after.rotation-before.rotation;
 for(const o of children){const p=localToPlan({x:after.x,y:after.y,z:after.z-before.z+(after.load?.totalHeight||after.height)-(before.load?.totalHeight||before.height),rotation:angle},{x:o.x-before.x,y:o.y-before.y,z:o.z});Object.assign(o,p);o.rotation+=angle;}
}
export function attachSupport(layout,boxId,supportId){
 const b=layout.objects.find(o=>o.id===boxId),s=layout.objects.find(o=>o.id===supportId);if(!b||!s||b.id===s.id||closure(layout.objects,[b.id]).some(o=>o.id===s.id))throw Error('잘못된 지원 관계입니다.');
 if(b.locked||b.type!=='box'||!['box','pallet','plastic-pallet','worktable'].includes(s.type))throw Error('잠금 또는 적재 대상 유형을 확인하세요.');
 const before=copy(b);b.x=s.x;b.y=s.y;b.rotation=s.rotation;const r=-s.rotation*Math.PI/180,c=Math.cos(r),sin=Math.sin(r);
 if(footprint(b).some(p=>{const x=p.x-s.x,y=p.y-s.y;return Math.abs(x*c+y*sin)>s.width/2+1e-8||Math.abs(-x*sin+y*c)>s.depth/2+1e-8;}))throw Error('박스 외곽이 받침을 벗어납니다. 먼저 X/Y를 받침 위로 옮기세요.');
 b.z=s.z+(s.load?.totalHeight||s.height);b.supportId=s.id;transformSupported(layout.objects,before,b);const error=placementError(b,layout);if(error)throw Error(error);
}
/** Minimum horizontal clearance between design polygons; rotated edges stay exact. */
export function equipmentDistance(a,b){
 const A=footprint(a),B=footprint(b),distance=(p,u,v)=>{const dx=v.x-u.x,dy=v.y-u.y,t=Math.max(0,Math.min(1,((p.x-u.x)*dx+(p.y-u.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-u.x-t*dx,p.y-u.y-t*dy);};
 // Separating axes distinguish intersecting polygons from nearby edges.
 const separated=[...A,...B].some((_,i)=>{const poly=i<4?A:B,j=i%4,u=poly[j],v=poly[(j+1)%4],nx=-(v.y-u.y),ny=v.x-u.x,aa=A.map(p=>p.x*nx+p.y*ny),bb=B.map(p=>p.x*nx+p.y*ny);return Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa);});
 if(!separated)return 0;
 return Math.min(...A.flatMap(p=>B.map((u,i)=>distance(p,u,B[(i+1)%4]))),...B.flatMap(p=>A.map((u,i)=>distance(p,u,A[(i+1)%4]))));
}
export function accessPoint(o,radius,layout){
 return [{x:0,y:o.depth/2+radius+.3},{x:0,y:-o.depth/2-radius-.3},{x:o.width/2+radius+.3,y:0},{x:-o.width/2-radius-.3,y:0}].map(p=>localToPlan(o,p)).find(p=>!blocked(p.x,p.y,layout,radius));
}
export function storageSlots(objects,layout,radius=.4){return objects.flatMap(o=>{
 if(o.type==='floorStorageZone'){const n=Math.max(1,Math.min(1000,o.config?.slots||1)),columns=Math.ceil(Math.sqrt(n));return Array.from({length:n},(_,i)=>({id:o.id+':floor:'+i,zoneId:o.id,kind:'floor',capacity:1,unit:null,point:accessPoint(o,radius,layout),visual:localToPlan(o,{x:-o.width/2+(i%columns+.5)*o.width/columns,y:-o.depth/2+(Math.floor(i/columns)+.5)*o.depth/Math.ceil(n/columns),z:.16})}));}
 if(['pallet','plastic-pallet'].includes(o.type)&&o.config?.floorStorage)return [{id:o.id+':floor:0',zoneId:o.id,kind:'floor',capacity:1,unit:null,point:accessPoint(o,radius,layout),visual:localToPlan(o,{x:0,y:0,z:o.height})}];
 if(o.type!=='rack')return [];const c=o.config||{},b=c.bays||4,l=c.levels||4,n=c.palletsPerLevel||2,slots=[];
 if(b*l*n>100000)throw Error('운영 슬롯이 너무 많습니다. 구역을 나누세요.');
 for(let side=0;side<(c.doubleSided?2:1);side++)for(let level=0;level<l+(c.floorStorage?1:0);level++)for(let bay=0;bay<b;bay++){if(c.excludedBays?.includes(bay))continue;for(let p=0;p<n;p++)slots.push({id:`${o.id}:${side}:${level}:${bay}:${p}`,rack:o.id,kind:'rack',capacity:1,unit:null,point:accessPoint(o,radius,layout),visual:localToPlan(o,{x:-o.width/2+(bay+(p+.5)/n)*o.width/b,y:0,z:.44+level*(o.height-.3)/l})});}return slots;
 });}
export function planArea(layout,source,{x,y,rows,columns,gap=.3,aisle=2,every=4,rotation=0,wall=.2,count=rows*columns,regionWidth=0,regionDepth=0,fill=false}){
 if(![x,y,rows,columns,gap,aisle,every,rotation,wall,count].every(Number.isFinite)||![rows,columns,every,count].every(Number.isSafeInteger)||count<1||wall<0||rows<1||columns<1||rows*columns>720||gap<0||aisle<0||every<1)throw Error('행·열·간격을 확인하세요. 미리보기 최대 720개입니다.');
 const preview=cloneGroup(source,source.map(o=>o.id),{rotation}),points=preview.flatMap(footprint),minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),w=Math.max(...points.map(p=>p.x))-minX,d=Math.max(...points.map(p=>p.y))-minY;
 if(fill){if(![regionWidth,regionDepth].every(v=>Number.isFinite(v)&&v>0))throw Error('영역 폭·깊이를 지정하세요.');columns=0;while(columns<721&&columns*(w+gap)+Math.floor(columns/every)*aisle+w<=regionWidth+1e-8)columns++;rows=Math.floor((regionDepth+gap)/(d+gap));count=rows*columns;if(!count)throw Error('영역에 들어가는 설비가 없습니다.');}
 const total=Math.min(count,rows*columns);if(total>720||layout.objects.length+total*source.length>MAX_OBJECTS)throw Error('설비 수 한도 초과: 적용 전 취소했습니다.');if(total*source.reduce((n,o)=>n+(o.load?.boxes?.length||0),0)>100000)throw Error('한 번에 생성할 포함 박스는 100,000개까지입니다. 구역을 나누세요.');
 const added=[],errors=[],zoneId=uid();
 for(let r=0;r<rows;r++)for(let c=0;c<columns&&r*columns+c<count;c++){
  const group=cloneGroup(preview,preview.map(o=>o.id),{x:x-minX+c*(w+gap)+Math.floor(c/every)*aisle,y:y-minY+r*(d+gap)});for(const o of group){o.repeatZoneId=zoneId;const err=placementError(o,{...layout,objects:[...layout.objects,...added,...group]})||(footprint(o).some(p=>p.x<wall||p.y<wall||p.x>layout.warehouse.width-wall||p.y>layout.warehouse.depth-wall)?'벽 이격 부족':'')||planningClearance(o,layout);if(err)errors.push({id:o.id,x:o.x,y:o.y,error:err});}added.push(...group);
 }if(added.length+layout.objects.length>MAX_OBJECTS)errors.push({error:'설비 수 한도 초과'});return {added,errors,zoneId,spec:{x,y,rows,columns,gap,aisle,every,rotation,wall,count,regionWidth,regionDepth,fill}};
}
function planningClearance(o,layout){
 const planar=p=>({...p,z:0,height:1,load:null});
 for(const zone of layout.objects){
  if((zone.type==='aisle'||zone.config?.prohibited||zone.config?.allowed?.includes('none'))&&overlap(planar(o),planar(zone)))return '통로 / 금지 구역 침범';
  if(['dock','door'].includes(zone.type)){const clearance=Number(zone.config?.workingClearance)||1.5,p=localToPlan(zone,{x:0,y:zone.depth/2+clearance/2});if(overlap(planar(o),planar({...zone,...p,depth:clearance})))return '출입문 / 도크 앞 작업 공간 부족';}
 }return '';
}
