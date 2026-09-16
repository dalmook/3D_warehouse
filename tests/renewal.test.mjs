import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalize,copy} from '../city-core.mjs';
import {Logistics,qualityDemo} from '../city-logistics.mjs';
import {toWorld,toLayout} from '../city-coordinates.mjs';
import {segmentFree,object,blocked} from '../city-core.mjs';
import {capacity,planRacks,calibrateBackground} from '../city-design.mjs';
test('directional aisles use directed navigation and dock openings remain passable',()=>{
 const lane=object('aisle',10,10,{width:8,depth:4,config:{oneWay:'+x'}}),l=normalize({warehouse:{width:20,depth:20,height:8},objects:[lane]});
 assert.equal(segmentFree({x:8,y:10},{x:12,y:10},l),true);assert.equal(segmentFree({x:12,y:10},{x:8,y:10},l),false);
 l.objects=[object('dock',10,10)];assert.equal(blocked(10,10,l),false);assert.equal(blocked(11.5,10,l),true);
});
test('capacity and paired row generation match physical rack entries',()=>{const l=normalize({warehouse:{width:40,depth:30,height:8},objects:[]}),p=planRacks(l,{x:8,y:5,rows:2,columns:2,doubleSided:true});assert.equal(p.errors.length,0);assert.equal(p.added.length,8);assert.equal(capacity(p.added).palletPositions,256);assert.equal(l.objects.length,0);});
test('two-point background calibration survives normalization',()=>{const scale=calibrateBackground([{x:10,y:10},{x:110,y:10}],10,400,300),b={...scale,data:'data:image/png;base64,AAAA',x:20,y:15,opacity:.5,locked:true};const l=normalize({objects:[],background:b});assert.deepEqual(normalize(copy(l)),l);assert.equal(l.background.width,40);});
test('coordinate mapping round trips elevation without flipping stored floor plane',()=>{const p={x:3,y:7,z:2};assert.deepEqual(toLayout(toWorld(p)),p);});
test('original GLBs include PBR surfaces, skin, and four exported actions',()=>{
 const manifest=JSON.parse(fs.readFileSync('assets/manifest.json'));
 for(const a of manifest.assets){const b=fs.readFileSync(a.path);assert.equal(b.toString('ascii',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.ok(j.materials.every(m=>m.pbrMetallicRoughness));if(a.id==='worker'){assert.equal(j.skins.length,1);assert.deepEqual(j.animations.map(a=>a.name).sort(),['Carry','Idle','PickPlace','Walk']);}}
});
test('logistics receives, stores, picks, packs and ships every unique unit reproducibly',()=>{
 const layout=normalize(qualityDemo()),original=copy(layout),a=new Logistics(layout),b=new Logistics(layout);
 for(let i=0;i<16000;i++){a.tick();b.tick();assert.ok(a.conservation().valid);const owned=a.units.filter(u=>u.owner);assert.equal(new Set(owned.map(u=>u.id)).size,owned.length);}
 assert.equal(a.arrivals,6);assert.deepEqual(a.events,b.events);assert.deepEqual(layout,original);
 for(const type of ['received','stored','packed','shipped'])assert.equal(a.events.filter(e=>e.type===type).length,6);
 assert.equal(a.reservations.size,0);
});
test('infeasible operations report missing resources, never synthesize throughput',()=>{const s=new Logistics(normalize({objects:[]}));for(let i=0;i<200;i++)s.tick();assert.ok(s.error);assert.equal(s.arrivals,0);});
