import * as THREE from 'three';
import {fitAsset,rackAsset,releaseInstance} from './city-assets.mjs';
const thumbnails=new Map();let renderer;
export function thumbnail(type,definition){
 if(thumbnails.has(type))return thumbnails.get(type);
 const model=['rack','boxrack','shelf'].includes(type)?rackAsset({...definition,type,config:{bays:2,levels:3,palletsPerLevel:1}}):fitAsset(type,definition);
 if(!model)return null;
 renderer??=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setSize(160,110);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x8899aa,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,8,5);scene.add(light,model);
 const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),r=Math.max(size.x,size.y,size.z);
 const camera=new THREE.PerspectiveCamera(38,160/110,.01,200);camera.position.copy(center).add(new THREE.Vector3(r*1.3,r*.9,r*1.5));camera.lookAt(center);renderer.render(scene,camera);
 const url=renderer.domElement.toDataURL();thumbnails.set(type,url);releaseInstance(model);return url;
}
