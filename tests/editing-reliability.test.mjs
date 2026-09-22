import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {copy,demo,normalize,object} from '../city-core.mjs';
import {cloneGroup,stackLayout} from '../city-domain.mjs';
import {readSavedLayout} from '../city-storage.mjs';
import {appendLayoutObjects,pasteLayout} from '../city-editing.mjs';

const key='warehouse-city-v9';
test('migration backup quota failure still opens the valid working drawing',()=>{
 const saved=JSON.stringify({...demo(),projectName:'입출고 실제 도면'}),writes=[];
 const result=readSavedLayout({key,normalize,fallback:demo,getStorage:()=>({getItem:k=>k===key?saved:null,setItem:(k)=>{writes.push(k);throw Error('QuotaExceededError');}})});
 assert.equal(result.layout.projectName,'입출고 실제 도면');
 assert.equal(result.autosaveBlocked,false);
 assert.match(result.loadWarning,/백업/);
 assert.ok(writes.every(k=>k!==key));
});

test('invalid saved drawing is protected and recovered without overwriting the working key',()=>{
 const saved='{"objects":broken',values=new Map([[key,saved]]);
 const result=readSavedLayout({key,normalize,fallback:demo,getStorage:()=>({getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)})});
 assert.equal(result.autosaveBlocked,true);
 assert.equal(values.get(key),saved);
 assert.equal([...values].filter(([k,v])=>k.startsWith(key+'-recovery-')&&v===saved).length,1);
});

test('adding a 41st worker rejects atomically and the 40-worker drawing remains reloadable',()=>{
 const layout=normalize({objects:Array.from({length:40},(_,i)=>object('worker',i%10+1,Math.floor(i/10)+1))}),before=copy(layout);
 assert.throws(()=>appendLayoutObjects(layout,[object('worker',15,15)]),/40/);
 assert.deepEqual(layout,before);
 assert.equal(normalize(layout).objects.length,40);
});

test('adding a 601st rack rejects before changing layout or persistence data',()=>{
 const layout=normalize({warehouse:{width:200,depth:200,height:9},objects:Array.from({length:600},(_,i)=>object('rack',(i%30)*5+3,Math.floor(i/30)*5+3,{width:2,depth:1}))}),before=JSON.stringify(layout);
 assert.throws(()=>appendLayoutObjects(layout,[object('rack',180,180)]),/600/);
 assert.equal(JSON.stringify(layout),before);
});

function palletLayout(){
 const load=stackLayout({palletWidth:1.2,palletDepth:1,palletHeight:.16,boxWidth:.4,boxDepth:.3,boxHeight:.25,maxHeight:1.8,count:2});
 return normalize({objects:[object('pallet',5,5,{load})]});
}

test('box unload rejection leaves contained inventory unchanged',()=>{
 const layout=palletLayout(),parent=layout.objects[0],unload={parent:parent.id,box:parent.load.boxes[0].id},before=copy(layout);
 assert.throws(()=>pasteLayout(layout,[object('box',-5,-5)],{unload}),/경계/);
 assert.deepEqual(layout,before);
 assert.throws(()=>pasteLayout(layout,[object('box',12,12)],{unload:{...unload,box:'no-longer-exists'}}),/변경/);
 assert.deepEqual(layout,before);
});

test('actual paste keyboard handler preserves stock transfer through R then Enter',()=>{
 // Run the production event handler and preview lifecycle with rendering mocked.
 // This exercises the clearGhost/previewPaste sequence that previously lost unload state.
 const original=palletLayout();let layout=copy(original),keyHandler;
 const parent=layout.objects[0],box=parent.load.boxes[0],added=object('box',12,12,{width:box.width,depth:box.depth,height:box.height});
 const source=fs.readFileSync(new URL('../city-practical.mjs',import.meta.url),'utf8').split('\n');
 const lines=['function clearGhost','function previewPaste','function finishPaste',"window.addEventListener('keydown',safe"].map(prefix=>source.find(line=>line.trimStart().startsWith(prefix)));
 assert.ok(lines.every(Boolean));
 const context=vm.createContext({
  pending:[added],pendingUnload:{parent:parent.id,box:box.id},ghosts:[],clipboard:[added],clipboardSource:[copy(added)],clipboardLayout:null,lastPoint:{x:12,y:12},selectionMode:false,areaPick:false,areaStart:null,
  cloneGroup,pasteLayout,releaseInstance:()=>{},disposeGhost:()=>{},ghostMaterials:()=>{},safe:fn=>fn,
  tools:{close:()=>{}},document:{querySelector:()=>null},window:{addEventListener:(_,fn)=>{keyHandler=fn;}},
  api:{mode:()=>'edit',get:()=>layout,commit:n=>{layout=n;},setIds:()=>{},cancelTool:()=>{},model:()=>({}),scene:{add:()=>{},remove:()=>{}},controls:{enabled:true}},
 });
 vm.runInContext(lines.join('\n'),context);
 const press=key=>keyHandler({key,target:{tagName:'CANVAS'},preventDefault(){},stopImmediatePropagation(){}});
 press('r');
 assert.equal(context.pendingUnload.box,box.id);
 press('Enter');
 assert.equal(layout.objects[0].load.actual,1);
 assert.equal(layout.objects.filter(o=>o.type==='box').length,1);
 assert.equal(layout.objects[1].rotation,90);
 assert.equal(layout.objects[0].load.boxes.length+layout.objects.filter(o=>o.type==='box').length,2);
 assert.equal(original.objects[0].load.boxes.length,2);
 assert.equal(context.pending,null);
});

test('successful addition returns independently editable nested loads',()=>{
 const layout=palletLayout(),next=appendLayoutObjects(layout,[object('box',12,12)]);
 next.objects[0].load.boxes.pop();
 assert.equal(layout.objects[0].load.boxes.length,2);
});
