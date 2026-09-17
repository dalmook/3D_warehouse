import * as THREE from 'three';
import {ASSET_DEFINITIONS,rebuildObjectVisual,disposeObject3D} from './objects.js';
/** Only previously missing equipment uses the original detailed builders. GLBs keep priority. */
export function legacyModel(o){if(!ASSET_DEFINITIONS[o.type])return null;const g=new THREE.Group();g.userData.data=o;rebuildObjectVisual(g);g.userData.legacyOwned=true;return g;}
export function disposeLegacy(root){for(const g of root.children)if(g.userData.legacyOwned){g.traverse(m=>{if(m.userData.originalMaterial)m.material=m.userData.originalMaterial;});disposeObject3D(g);}}
