/** Shared bounded pallet-packing calculation, also used by the preserved precision editor. */
export function calculateStackLayout(input={}){
  const palletWidth=Number(input.palletWidth??1.2),palletDepth=Number(input.palletDepth??1),palletHeight=Number(input.palletHeight??.14),boxWidth=Number(input.boxWidth??.4),boxDepth=Number(input.boxDepth??.3),boxHeight=Number(input.boxHeight??.25),maxHeight=Number(input.maxHeight??input.maxStackHeight??1.8),requestedCount=Math.floor(Number(input.requestedCount??input.count??input.boxCount??48));
  const invalid={valid:false,perLayer:0,layers:0,maxLayers:0,count:0,total:0,capacity:0,positions:[],requestedCount:0,utilization:0,totalHeight:palletHeight};
  if(![palletWidth,palletDepth,boxWidth,boxDepth,boxHeight,maxHeight].every(n=>Number.isFinite(n)&&n>.001&&n<=300)||!Number.isFinite(palletHeight)||palletHeight<0||!Number.isFinite(requestedCount)||requestedCount<1)return invalid;
  let columns=Math.floor((palletWidth+1e-8)/boxWidth),rows=Math.floor((palletDepth+1e-8)/boxDepth),rotated=false;
  const rcolumns=Math.floor((palletWidth+1e-8)/boxDepth),rrows=Math.floor((palletDepth+1e-8)/boxWidth);
  if(rcolumns*rrows>columns*rows){columns=rcolumns;rows=rrows;rotated=true;}
  const perLayer=columns*rows,maxLayers=Math.max(0,Math.floor((maxHeight-palletHeight+1e-8)/boxHeight)),capacity=perLayer*maxLayers,count=Math.min(capacity,requestedCount,1000),layers=Math.ceil(count/Math.max(1,perLayer));
  if(!count)return invalid;
  const positions=[],dx=rotated?boxDepth:boxWidth,dy=rotated?boxWidth:boxDepth;
  for(let i=0;i<count;i++){const layer=Math.floor(i/perLayer),column=i%columns,row=Math.floor(i/columns)%rows;positions.push({x:(column-(columns-1)/2)*dx,y:palletHeight+(layer+.5)*boxHeight,z:(row-(rows-1)/2)*dy,rotation:rotated?Math.PI/2:0});}
  return {valid:true,palletWidth,palletDepth,palletHeight,boxWidth,boxDepth,boxHeight,maxHeight,requestedCount,count,total:count,capacity,perLayer,columns,rows,layers,maxLayers,rotated,positions,utilization:count/requestedCount,totalHeight:palletHeight+layers*boxHeight};
}
