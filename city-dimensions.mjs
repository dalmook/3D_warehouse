import * as THREE from 'three';
import {drawingDimensions} from './city-output.mjs';
import {footprint} from './city-core.mjs';
const NS='http://www.w3.org/2000/svg';
export function dimensionLines(layout,ids,{all=false,limit=30,hidden=false,unit='m',dec=2,size=12},camera,width,height){
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;overflow:hidden';
 const project=(p,z=0)=>{const v=new THREE.Vector3(p.x,z,p.y).project(camera);return {x:(v.x+1)*width/2,y:(1-v.y)*height/2,visible:v.z>=-1&&v.z<=1};};
 const path=(points,color='var(--accent)',dash=false)=>{if(points.some(p=>!p.visible))return;const el=document.createElementNS(NS,'polyline');el.setAttribute('points',points.map(p=>p.x+','+p.y).join(' '));el.setAttribute('fill','none');el.setAttribute('stroke',color);el.setAttribute('stroke-width','1.4');if(dash)el.setAttribute('stroke-dasharray','4 3');svg.append(el);};
 const allowed=new Set(layout.objects.filter(o=>all||ids.includes(o.id)).slice(0,limit).flatMap(o=>[o.id+'-w',o.id+'-d']));
 for(const d of drawingDimensions(layout).filter(d=>!hidden&&(d.measured||d.id.startsWith('warehouse')||allowed.has(d.id)))){const length=Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y);if(!length)continue;const nx=-(d.b.y-d.a.y)/length*d.offset,ny=(d.b.x-d.a.x)/length*d.offset,a={x:d.a.x+nx,y:d.a.y+ny},b={x:d.b.x+nx,y:d.b.y+ny};path([project(d.a),project(a),project(b),project(d.b)]);const mid=project({x:(a.x+b.x)/2,y:(a.y+b.y)/2});if(mid.visible){const t=document.createElementNS(NS,'text');t.setAttribute('x',mid.x);t.setAttribute('y',mid.y-5);t.setAttribute('text-anchor','middle');t.setAttribute('fill','var(--text)');t.setAttribute('font-size',Math.min(24,Math.max(9,size)));t.textContent=(length*(unit==='mm'?1000:1)).toFixed(dec)+unit;svg.append(t);}for(const [p,q]of [[a,b],[b,a]]){const A=project(p),B=project(q),ang=Math.atan2(B.y-A.y,B.x-A.x);path([{x:A.x+7*Math.cos(ang-.5),y:A.y+7*Math.sin(ang-.5),visible:A.visible},A,{x:A.x+7*Math.cos(ang+.5),y:A.y+7*Math.sin(ang+.5),visible:A.visible}]);}}
 const selected=layout.objects.filter(o=>ids.includes(o.id));for(const o of selected){const p=footprint(o);path([...p,p[0]].map(p=>project(p,.04)),'#f0bd45');path([project(p[0]),project(p[0],o.z+(o.load?.totalHeight||o.height))],'#f0bd45');}
 if(selected.length>1){const pts=selected.flatMap(footprint),x=Math.min(...pts.map(p=>p.x)),y=Math.min(...pts.map(p=>p.y)),X=Math.max(...pts.map(p=>p.x)),Y=Math.max(...pts.map(p=>p.y));path([{x,y},{x:X,y},{x:X,y:Y},{x,y:Y},{x,y}].map(p=>project(p,.05)),'#f0bd45',true);}
 return svg;
}
export function clearance(o,warehouse){const f=footprint(o);return {left:Math.min(...f.map(p=>p.x)),right:warehouse.width-Math.max(...f.map(p=>p.x)),top:Math.min(...f.map(p=>p.y)),bottom:warehouse.depth-Math.max(...f.map(p=>p.y))};}
