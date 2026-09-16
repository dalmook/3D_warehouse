import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize,demo,blocked,Simulation,Navigation,object,placementError} from '../city-core.mjs';
test('malformed config values do not crash legacy imports',()=>{for(const config of ['bad',3,[],null]){const d=normalize({objects:[{type:'rack',config}]});assert.equal(d.objects[0].config.bays,4);}});
test('invalid walking coordinates are always blocked',()=>{const d=demo();assert.equal(blocked(NaN,3,d),true);assert.equal(blocked(3,Infinity,d),true);});
test('40 simulated workers remain finite and inside warehouse bounds',()=>{const d=normalize({warehouse:{width:36,depth:24,height:9},objects:[object('waypoint',10,10),object('waypoint',28,18),...Array.from({length:40},(_,i)=>object('worker',2+i%10*2,2+Math.floor(i/10)*2))]});const sim=new Simulation(d);for(let i=0;i<500;i++)sim.tick(.05);assert.equal(sim.agents.length,40);assert.ok(sim.arrivals>0);for(const a of sim.agents){assert.ok(Number.isFinite(a.x));assert.ok(!blocked(a.x,a.y,d));}});
test('template destinations are reachable and layout is valid',()=>{const d=demo(),nav=new Navigation(d);assert.equal(d.objects.filter(o=>placementError(o,d)).length,0);for(const w of d.objects.filter(o=>o.type==='worker'))for(const t of d.objects.filter(o=>o.type==='waypoint'))assert.ok(nav.path(w,t).length>1);});
