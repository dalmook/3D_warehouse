import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,object,History,overlap,Simulation} from '../city-core.mjs';
import {stackLayout,cloneGroup,cloneReferences,attachSupport,equipmentDistance,measurementAnchor,resolveAnchor,localToPlan,storageSlots,planArea,dimensions} from '../city-domain.mjs';
import {capacity} from '../city-design.mjs';
import {Logistics} from '../city-logistics.mjs';
import {exportDXF} from '../city-output.mjs';
const input={palletWidth:1.2,palletDepth:1,palletHeight:.14,boxWidth:.4,boxDepth:.3,boxHeight:.25,maxHeight:1.8,count:48};
test('48 boxes produce 9 per layer, 6 layers, actual pallet-inclusive height',()=>{for(const h of [.14,.16]){const p=stackLayout({...input,palletHeight:h});assert.equal(p.perLayer,9);assert.equal(p.maxCount,54);assert.equal(p.actual,48);assert.equal(p.layers,6);assert.equal(p.totalHeight,h+1.5);assert.equal(p.remaining,0);for(const b of p.boxes)for(const c of p.boxes)if(b!==c)assert.equal(overlap(b,c),false);}});
test('load weight, gap and forbidden rotation are enforced',()=>{assert.equal(stackLayout({...input,boxWeight:10,maxLoad:100}).actual,10);assert.equal(stackLayout({...input,rotate:false}).perLayer,9);assert.equal(stackLayout({...input,count:70}).remaining,16);assert.throws(()=>stackLayout({...input,boxHeight:0}));});
test('30 bays, custom fields, legacy type, support and height survive normalization/history',()=>{const l=normalize({projectId:'project',routes:[{id:'route',destinationIds:['p']}],objects:[object('rack',10,10,{config:{bays:30,levels:7}}),{id:'legacy',type:'person',x:2,y:3,elevation:1.2,width:.55,depth:.45,height:1.72,supportId:'s'}]});assert.equal(l.objects[0].config.bays,30);assert.equal(l.objects[1].type,'worker');assert.equal(l.objects[1].legacyType,'person');assert.equal(l.objects[1].z,1.2);assert.deepEqual(normalize(l),l);const h=new History(l);h.push({...l,projectName:'changed'});assert.deepEqual(h.undo(),l);});
test('ten pallet groups clone once and support IDs rotate around common pivot',()=>{const objects=[];for(let i=0;i<10;i++){const p=object('pallet',3+i*2,3,{load:stackLayout(input)});objects.push(p,object('box',p.x,p.y,{z:2,supportId:p.id}));}const result=cloneGroup(objects,objects.map(o=>o.id),{x:0,y:4,rotation:90});assert.equal(result.length,20);assert.equal(new Set(result.map(o=>o.id)).size,20);assert.equal(result.filter(o=>o.type==='pallet').reduce((n,o)=>n+o.load.boxes.length,0),480);for(const o of result.filter(o=>o.supportId))assert.ok(result.find(p=>p.id===o.supportId));assert.equal(new Set(result.flatMap(o=>o.load?.boxes.map(b=>b.id)||[])).size,480);});
test('rackless floor storage completes with only a worker, no forced packing bench',()=>{const l=normalize({warehouse:{width:20,depth:20,height:8},operations:{inbound:'in',outbound:'out'},objects:[object('dock',3,2,{id:'in'}),object('dock',16,2,{id:'out'}),object('floorStorageZone',10,10,{config:{slots:4}}),object('worker',3,6)]});const sim=new Logistics(l,{units:4});assert.equal(sim.error,'');for(let i=0;i<16000;i++)sim.tick();assert.equal(sim.arrivals,4);assert.equal(sim.conservation().valid,true);assert.equal(sim.reservations.size,0);});
test('worker explicit route order and per-point wait survive once mode',()=>{const w=object('worker',2,2,{routeId:'r'}),l=normalize({objects:[w],routes:[{id:'r',kind:'once',destinationIds:['b','a']}],routePoints:[{id:'a',x:4,y:4,dwell:1},{id:'b',x:3,y:3,dwell:3}]});const s=new Simulation(l);assert.deepEqual(s.agents[0].targets.map(p=>p.id),['b','a']);for(let i=0;i<400;i++)s.tick(.05);assert.equal(s.agents[0].status,'완료');assert.equal(s.arrivals,2);});
test('DXF is real entities with blocks dimensions and mm geometry',()=>{const l=normalize({warehouse:{width:36,depth:24,height:9},objects:[object('rack',12,8,{rotation:45})]}),d=exportDXF(l);for(const type of ['INSERT','BLOCK','DIMENSION','DIMSTYLE','LWPOLYLINE'])assert.ok(d.includes(type));assert.ok(d.includes('36000'));assert.ok(d.includes('-24000'));assert.equal(dimensions(l.objects[0]).width,8);});
test('copy reconnects independent route identifiers and rotates destinations',()=>{
 const worker=object('worker',5,5,{routeId:'r'}),source=[worker],l={routes:[{id:'r',kind:'loop',destinationIds:['p']}],routePoints:[{id:'p',x:6,y:5,dwell:3}]},added=cloneGroup(source,[worker.id],{x:3,rotation:90}),refs=cloneReferences(l,source,added);
 assert.notEqual(added[0].routeId,'r');assert.equal(added[0].routeId,refs.routes[0].id);assert.equal(refs.routePoints[0].x,8);assert.equal(refs.routePoints[0].y,4);assert.equal(refs.routePoints[0].dwell,3);
});
test('manual support centres box, preserves hierarchy, capacity does not double count',()=>{
 const pallet=object('pallet',6,6,{height:.14}),box=object('box',2,2,{width:.4,depth:.3,height:.25}),l=normalize({objects:[pallet,box]});attachSupport(l,box.id,pallet.id);const b=l.objects[1];assert.equal(b.supportId,pallet.id);assert.equal(b.z,.14);assert.equal(b.x,6);assert.equal(capacity(l.objects).boxPositions,54);assert.equal(capacity(l.objects).actualBoxes,1);
});
test('rotated design clearance and invalid repeated counts are checked',()=>{
 const a=object('pallet',3,3,{width:2,depth:2}),b=object('pallet',7,3,{width:2,depth:2});assert.equal(equipmentDistance(a,b),2);assert.equal(equipmentDistance(a,{...a,rotation:45}),0);assert.throws(()=>planArea(normalize({objects:[]}),[a],{x:2,y:2,rows:1.5,columns:2}));
});
test('measurement anchors follow rotated objects and clone internal references',()=>{
 const a=object('pallet',3,3),b=object('pallet',7,3),l=normalize({objects:[a,b]});const A=measurementAnchor(l,{x:2.4,y:2.5}),B=measurementAnchor(l,{x:6.4,y:2.5});l.measurements=[{id:'m',a:A,b:B}];assert.equal(A.objectId,a.id);l.objects[0].x=4;assert.equal(resolveAnchor(l,A).x,3.4);const added=cloneGroup(l.objects,[a.id,b.id],{y:5}),refs=cloneReferences(l,l.objects,added);assert.equal(refs.measurements.length,1);assert.equal(refs.measurements[0].a.objectId,added[0].id);
});
test('area planner protects aisles and door working clearance before apply',()=>{
 const l=normalize({objects:[object('aisle',5,5,{width:3,depth:8})]}),p=planArea(l,[object('pallet',0,0)],{x:4,y:4,rows:1,columns:1});assert.match(p.errors[0].error,/통로/);
 assert.throws(()=>planArea(l,[object('pallet',0,0),object('box',0,0)],{x:2,y:2,rows:20,columns:20}),/한도/);
 const filled=planArea(normalize({objects:[]}),[object('pallet',0,0)],{x:2,y:2,rows:1,columns:1,fill:true,regionWidth:4,regionDepth:4});assert.equal(filled.added.length,6);assert.equal(filled.errors.length,0);
});
