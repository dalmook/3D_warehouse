// Saved x/y floor plane + z elevation -> Three.js X/Z floor plane + Y elevation.
// Blender -Y front exports to glTF +Z. No mutation of stored coordinates.
export const toWorld=o=>({x:o.x,y:o.z||0,z:o.y});
export const toLayout=p=>({x:p.x,y:p.z,z:p.y});
export const rotationRadians=degrees=>degrees*Math.PI/180;
