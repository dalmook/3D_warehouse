import {stackLayout} from './city-domain.mjs';
import {copy,object,placementError,MAX_OBJECTS,footprint} from './city-core.mjs';
export function capacity(objects){
 let palletPositions=0,boxPositions=0,actualBoxes=0;
 for(const o of objects){const c=o.config||{},b=c.bays||4,l=c.levels||4,excluded=new Set((c.excludedBays||[]).filter(i=>Number.isInteger(i)&&i>=0&&i<b)).size;
  if(o.type==='rack')palletPositions+=(b-excluded)*(l+(c.floorStorage?1:0))*(c.palletsPerLevel||2)*(c.doubleSided?2:1);
  if(o.type==='boxrack')boxPositions+=(b-excluded)*l*(c.boxesPerCell||3);
  if(['pallet','plastic-pallet'].includes(o.type)&&c.floorStorage)palletPositions++;
  if(o.type==='floorStorageZone')palletPositions+=Math.max(1,o.config?.slots||1);
  if(['pallet','plastic-pallet','stack'].includes(o.type)){const v=o.load||{palletWidth:o.width,palletDepth:o.depth,palletHeight:o.height,boxWidth:Number(c.boxWidth)||.4,boxDepth:Number(c.boxDepth)||.3,boxHeight:Number(c.boxHeight)||.25,maxHeight:Number(c.maxStackHeight)||1.8};boxPositions+=stackLayout({...v,count:0}).maxCount;}
  if(o.type==='box'){actualBoxes++;let root=o,seen=new Set();while(root.supportId&&!seen.has(root.id)){seen.add(root.id);const parent=objects.find(p=>p.id===root.supportId);if(!parent)break;root=parent;}if(!['pallet','plastic-pallet','stack'].includes(root.type))boxPositions++;}
  actualBoxes+=o.load?.boxes?.length||o.stack?.count||0;
 }return {palletPositions,boxPositions,actualBoxes};
}
export function planRacks(layout,{x=5,y=5,rows=1,columns=1,width=8,depth=1.2,height=6,bays=4,levels=4,aisle=3,gap=1,wall=.2,doubleSided=false}={}){
 const values=[x,y,rows,columns,width,depth,height,bays,levels,aisle,gap,wall];
 if(!values.every(Number.isFinite)||![rows,columns,bays,levels].every(n=>Number.isInteger(n)&&n>=1&&n<=20)||width<.5||depth<.3||height<1||aisle<.5||gap<0||wall<0)throw Error('규격과 개수를 확인하세요. 행/열/베이/단수는 1~20입니다.');
 const count=rows*columns*(doubleSided?2:1);if(layout.objects.length+count>MAX_OBJECTS)throw Error('설비 수 예산을 초과합니다.');
 if(count*(bays+1)*levels>12000)throw Error('한 번에 생성할 랙 복잡도를 초과합니다. 구역을 나누세요.');
 const next=copy(layout),added=[],errors=[];
 for(let r=0;r<rows;r++)for(let c=0;c<columns;c++)for(let side=0;side<(doubleSided?2:1);side++){
  const o=object('rack',x+c*(width+gap),y+r*((doubleSided?2:1)*depth+(doubleSided?.2:0)+aisle)+side*(depth+.2),{width,depth,height,config:{bays,levels,palletsPerLevel:2},name:`랙 ${r+1}-${c+1}${doubleSided?'-'+(side+1):''}`});
  let error=placementError(o,next);if(!error&&footprint(o).some(p=>p.x<wall||p.y<wall||p.x>layout.warehouse.width-wall||p.y>layout.warehouse.depth-wall))error='벽 이격 부족';
  if(error)errors.push({id:o.id,x:o.x,y:o.y,error});added.push(o);next.objects.push(o);
 }return {added,errors,next,capacity:capacity(added)};
}
export function calibrateBackground(points,metres,pixelWidth,pixelHeight){
 if(points.length!==2||!Number.isFinite(metres)||metres<=0)throw Error('기준 두 점과 실제 거리를 입력하세요.');
 const distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);if(distance<3)throw Error('기준점이 너무 가깝습니다.');
 const scale=metres/distance;return {width:pixelWidth*scale,depth:pixelHeight*scale,metresPerPixel:scale,points:copy(points),metres};
}
export function validateBackground(b){
 if(!b)return undefined;
 if(typeof b.data!=='string'||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(b.data)||b.data.length>900000)throw Error('배경은 675KB 이하 PNG/JPEG를 JSON에 포함해야 합니다.');
 if(![b.width,b.depth,b.x,b.y].every(Number.isFinite)||b.width<=0||b.depth<=0||b.width>1000||b.depth>1000)throw Error('배경 축척을 확인하세요.');
 return {...copy(b),opacity:Math.max(.05,Math.min(1,Number(b.opacity)||.4)),locked:b.locked!==false};
}
