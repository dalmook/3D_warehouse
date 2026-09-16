import {Logistics,STEP} from './city-logistics.mjs';
export function experiment(layout,seeds=[11,22,33,44,55],duration=600){
 return seeds.map(seed=>{const s=new Logistics(layout,{seed});for(let i=0;i<duration/STEP;i++)s.tick();return {seed,...s.metrics()};});
}
export function summary(runs){const values=runs.map(r=>r.shipped),mean=values.reduce((a,b)=>a+b,0)/values.length;return {mean,min:Math.min(...values),max:Math.max(...values),std:Math.sqrt(values.reduce((n,v)=>n+(v-mean)**2,0)/values.length),runs};}
