import test from 'node:test';
import assert from 'node:assert/strict';
import {rackRenderPlan,rackParts,RACK_PART_BUDGET} from '../city-render.mjs';
import {normalize,object,demo} from '../city-core.mjs';
const rack=()=>object('rack',10,10,{config:{bays:20,levels:20,palletsPerLevel:2}});
test('small layouts retain full rack detail',()=>{assert.equal(rackRenderPlan(demo().objects).compact,false);assert.equal(rackParts(rack()).length,362);});
test('600 maximal racks get a bounded rendering plan without data loss',()=>{
 const layout=normalize({objects:Array.from({length:600},rack)}),before=JSON.stringify(layout),plan=rackRenderPlan(layout.objects);
 assert.equal(plan.compact,true);assert.equal(plan.racks,600);
 const parts=layout.objects.reduce((n,o)=>n+rackParts(o,plan.compact).length,0);
 assert.equal(parts,4800);assert.ok(parts<=RACK_PART_BUDGET);assert.equal(JSON.stringify(layout),before);
});
test('rack budget includes migrated shelf and boxrack types',()=>{const many=Array.from({length:600},(_,i)=>({...rack(),type:i%2?'shelf':'boxrack'}));assert.equal(rackRenderPlan(many).compact,true);});
test('visual fallback retains original dimensions and finite transforms',()=>{const o=rack();const p=rackParts(o,true);assert.ok(p.every(p=>['w','h','d','x','y','z'].every(k=>Number.isFinite(p[k]))));assert.ok(p.some(p=>p.w===o.width));assert.ok(p.some(p=>p.h===o.height));assert.equal(o.config.bays,20);});
