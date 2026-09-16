import * as THREE from 'three';
import {GLTFLoader} from './vendor/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from './vendor/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from './vendor/addons/utils/BufferGeometryUtils.js';
const names=['rack-frame','rack-beam','pallet','plastic-pallet','box','forklift','handpallet','conveyor','worktable','dock','worker'];
const cache=new Map(), merged=new Map(), mixers=new Set();
const tinted=new Map();
const loader=new GLTFLoader();
export async function loadAssets(){
 await Promise.all(names.map(async name=>{const gltf=await loader.loadAsync(new URL(`./assets/models/${name}.glb`,import.meta.url).href);gltf.scene.updateMatrixWorld(true);gltf.scene.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});cache.set(name,gltf);}));
 // Merge static primitives by material once. Geometry/material ownership stays in this cache.
 for(const name of names.filter(n=>!['worker','forklift'].includes(n))){
  const batches=new Map();cache.get(name).scene.traverse(m=>{if(!m.isMesh)return;const key=m.material.uuid;if(!batches.has(key))batches.set(key,{material:m.material,geometries:[]});batches.get(key).geometries.push(m.geometry.clone().applyMatrix4(m.matrixWorld));});
  merged.set(name,[...batches.values()].map(b=>{const geometry=mergeGeometries(b.geometries);b.geometries.forEach(g=>g.dispose());return {geometry,material:b.material};}));
 }
 return cache;
}
export const assetInfo=()=>[...cache].map(([id,g])=>({id,clips:g.animations.map(a=>a.name),skinned:(()=>{let n=0;g.scene.traverse(m=>{if(m.isSkinnedMesh)n++;});return n;})()}));
export function asset(name){
 const gltf=cache.get(name);if(!gltf)return null;
 const g=name==='worker'?cloneSkeleton(gltf.scene):gltf.scene.clone(true);
 if(name==='worker'){
  const mixer=new THREE.AnimationMixer(g),actions=new Map(gltf.animations.map(c=>[c.name,mixer.clipAction(c)]));
  g.userData.animation={mixer,actions,current:null};mixers.add(mixer);animateWorker(g,'Idle',0,1);
 }
 return g;
}
export function animateWorker(g,state,dt,speed=1){
 const a=g.userData.animation;if(!a)return;
 const next=a.actions.get(state)||a.actions.get('Idle');
 if(next&&a.current!==next){a.current?.fadeOut(.18);next.reset().fadeIn(.18).play();a.current=next;}
 if(next)next.timeScale=state==='Walk'||state==='Carry'?speed/1.3:1;
 a.mixer.update(dt);
}
export function releaseInstance(g){g.traverse(m=>{if(m.isInstancedMesh)m.dispose();if(m.isSkinnedMesh)m.skeleton.dispose();const a=m.userData.animation;if(a){a.mixer.stopAllAction();a.mixer.uncacheRoot(m);mixers.delete(a.mixer);}});}
export function cacheStats(){return {assets:cache.size,mixers:mixers.size};}
export function staticInstances(name,transforms,parent,tint){
 for(const {geometry,material} of merged.get(name)||[]){
  let surface=material;if(tint&&material.name==='Powder_coated_blue'){const key=material.uuid+tint;if(!tinted.has(key)){const copy=material.clone();copy.color.set(tint);tinted.set(key,copy);}surface=tinted.get(key);}
  const m=new THREE.InstancedMesh(geometry,surface,transforms.length);transforms.forEach((t,i)=>m.setMatrixAt(i,t));m.instanceMatrix.needsUpdate=true;m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();parent.add(m);
 }
}
const matrix=(x,y,z,sx=1,sy=1,sz=1)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(sx,sy,sz));
export function rackAsset(o){
 const g=new THREE.Group(),w=o.width,d=o.depth,h=o.height,b=o.config?.bays||4,l=o.config?.levels||4,bw=w/b;
 const frames=[],beams=[],pallets=[],boxes=[];
 for(let i=0;i<=b;i++)frames.push(matrix(-w/2+i*bw,0,0,1,h/6,d));
 for(let j=0;j<l;j++){
  const y=.16+j*(h-.3)/l;
  for(let i=0;i<b;i++){
   const x=-w/2+(i+.5)*bw;
   for(const z of [-d/2,d/2])beams.push(matrix(x,y,z,bw,1,1));
   // Display representative loads only; design capacity is calculated independently.
   if((i+j)%5===4)continue;
   const count=Math.max(1,Math.min(3,o.config?.palletsPerLevel||2));
   for(let k=0;k<count;k++){
    const px=x-bw/2+bw*(k+.5)/count,scale=Math.min((bw/count-.12)/1.2,d*.82);
    if(o.type==='rack')pallets.push(matrix(px,y+.12,0,scale,1,d*.82));
    for(let layer=0;layer<Math.min(2,Math.floor((h/l-.4)/.42));layer++)
     boxes.push(matrix(px,y+(o.type==='rack'?.28:.12)+layer*.4,0,Math.max(.3,bw/count*.72/.6),1,d*.72/.4));
   }
  }
 }
 staticInstances('rack-frame',frames,g,o.color);staticInstances('rack-beam',beams,g);staticInstances('pallet',pallets,g);staticInstances('box',boxes,g);
 return g;
}
export function fitAsset(name,o){
 const g=asset(name);if(!g)return null;
 const dimensions={pallet:[1.2,.16,1],box:[.6,.405,.4],forklift:[1.2,2.2,2.4],conveyor:[3,.93,1.15],worktable:[2,.9,1],dock:[3,3.4,2.5],worker:[.6,1.8,.6],handpallet:[.8,1.15,1.6],'plastic-pallet':[1.2,.16,1]};
 const s=dimensions[name];if(s)g.scale.set(o.width/s[0],o.height/s[1],o.depth/s[2]);return g;
}
