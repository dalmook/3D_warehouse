import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalize,copy} from '../city-core.mjs';
import {Logistics,qualityDemo} from '../city-logistics.mjs';
import {toWorld,toLayout} from '../city-coordinates.mjs';
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
