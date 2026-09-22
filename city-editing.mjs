/** Editing transactions return a validated copy and never mutate the working layout. */
import {copy,normalize} from './city-core.mjs';
import {cloneReferences,validateAdded} from './city-domain.mjs';

export function appendLayoutObjects(layout,added){
 const next=normalize(copy({...layout,objects:[...layout.objects,...added]}));
 const additions=next.objects.slice(layout.objects.length);
 const errors=validateAdded({...next,objects:next.objects.slice(0,layout.objects.length)},additions);
 if(errors.length)throw Error(errors[0]);
 return next;
}

export function refreshContainedLoad(o){
 o.load.actual=o.load.boxes.length;
 o.load.remaining=Math.max(0,(o.load.count||0)-o.load.actual);
 o.load.layers=new Set(o.load.boxes.map(b=>b.z)).size;
 o.load.totalHeight=Math.max(o.load.palletHeight,...o.load.boxes.map(b=>b.z+b.height));
 if(o.type==='stack')o.height=o.load.totalHeight;
}

export function pasteLayout(layout,added,{sourceLayout=layout,source=[],unload=null}={}){
 const next=copy(layout),additions=copy(added);
 if(unload){
  const parent=next.objects.find(o=>o.id===unload.parent);
  if(!parent||parent.locked)throw Error('받침이 변경되었거나 잠겼습니다.');
  if(!parent.load?.boxes?.some(b=>b.id===unload.box))throw Error('꺼낼 박스가 변경되었습니다. 다시 선택하세요.');
  if(additions.length!==1||additions[0].type!=='box')throw Error('박스 이동 내용을 확인하세요.');
  parent.load.boxes=parent.load.boxes.filter(b=>b.id!==unload.box);
  refreshContainedLoad(parent);
 }
 const refs=cloneReferences(sourceLayout,source,additions);
 next.routes=[...(next.routes||[]),...refs.routes];
 next.routePoints=[...(next.routePoints||[]),...refs.routePoints];
 next.measurements=[...(next.measurements||[]),...refs.measurements];
 return appendLayoutObjects(next,additions);
}
