/** Rendering-only budget. Never changes saved rack capacity or collision geometry. */
export const RACK_PART_BUDGET = 12000;
export const isRack = o => ['rack','boxrack','shelf'].includes(o.type);
const count = v => Math.max(1, Math.min(20, Math.round(Number(v) || 4)));
export function rackRenderPlan(objects) {
  const racks = objects.filter(isRack);
  const estimatedParts = racks.reduce((total,o) => {
    const b=count(o.config?.bays), l=count(o.config?.levels);
    return total + 2*(b+1) + l + b*l;
  }, 0);
  return {compact:estimatedParts>RACK_PART_BUDGET, estimatedParts, racks:racks.length};
}
export function rackParts(o, compact=false) {
  const w=o.width,d=o.depth,h=o.height,c=o.color,parts=[];
  const add=(w,h,d,x,y,z,color)=>parts.push({w,h,d,x,y,z,color});
  const bays=compact?1:count(o.config?.bays), levels=compact?Math.min(4,count(o.config?.levels)):count(o.config?.levels);
  for(let i=0;i<=bays;i++)for(const z of [-d/2,d/2])add(.075,h,.075,-w/2+w*i/bays,h/2,z,c);
  for(let j=1;j<=levels;j++){
    add(w,.08,d,0,j*h/levels,0,'#ddad62');
    if(!compact)for(let i=0;i<bays;i++){
      if((i+j)%4===0)continue;
      add(w/bays*.7,h/levels*.46,d*.7,-w/2+w*(i+.5)/bays,j*h/levels-h/levels*.24-.05,0,'#bc946d');
    }
  }
  return parts;
}
