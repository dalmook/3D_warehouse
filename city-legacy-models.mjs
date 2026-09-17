import * as THREE from 'three';
import {ASSET_DEFINITIONS,rebuildObjectVisual,disposeObject3D} from './objects.js';
/** Only previously missing equipment uses the original detailed builders. GLBs keep priority. */
export function legacyModel(o){if(!ASSET_DEFINITIONS[o.type])return null;const g=new THREE.Group();g.userData.data=o;rebuildObjectVisual(g);g.userData.legacyOwned=true;return g;}
export function disposeLegacy(root){for(const g of root.children)if(g.userData.legacyOwned){g.traverse(m=>{if(m.userData.originalMaterial)m.material=m.userData.originalMaterial;});disposeObject3D(g);}}
/** Ghosts own cloned materials. Legacy builders additionally own their geometry/textures. */
export function ghostMaterials(g,opacity){
 const old=new Set();g.traverse(m=>{if(!m.material)return;old.add(m.material);m.material=m.material.clone();m.material.transparent=true;m.material.opacity=opacity;});
 if(g.userData.legacyOwned)for(const material of old)material.dispose();
}
export function disposeGhost(g){if(g.userData.legacyOwned)disposeLegacy({children:[g]});else g.traverse(m=>m.material?.dispose());}
