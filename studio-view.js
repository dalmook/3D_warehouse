import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {rebuildObjectVisual,disposeObject3D} from './objects.js';
import {Navigation,moveCircle,clamp,corners} from './studio-core.js';
const COLORS=['#edb646','#4384ce','#42a89a','#9b7dcc'];
function box(parent,w,h,d,x,y,z,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.78}));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function clear(group){while(group.children.length){const c=group.children[0];group.remove(c);disposeObject3D(c);}}
function label(text,color='#29465a',width=3){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='rgba(255,255,255,.94)';ctx.beginPath();ctx.roundRect(2,2,508,92,20);ctx.fill();ctx.fillStyle=color;ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,49,480);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:true}));s.scale.set(width,width*96/512,1);return s;}
export class WarehouseView {
  constructor(canvas,map){
    this.canvas=canvas;this.map=map;this.meshes=new Map();this.actors=[];this.routes=new Map();this.keys=new Set();this.touch={forward:0,right:0};this.walking=false;this.showRoutes=true;this.yaw=0;this.pitch=0;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#e4ebf0');
    this.camera=new THREE.PerspectiveCamera(43,1,.05,1400);this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.maxPolarAngle=Math.PI/2-.03;this.controls.minDistance=3;this.controls.maxDistance=650;this.controls.mouseButtons.LEFT=THREE.MOUSE.PAN;this.controls.mouseButtons.RIGHT=THREE.MOUSE.ROTATE;
    this.scene.add(new THREE.HemisphereLight('#f1f8ff','#8b9eae',2.6));this.light=new THREE.DirectionalLight('#fff9e8',3.0);this.light.position.set(20,36,16);this.light.castShadow=true;this.light.shadow.mapSize.set(2048,2048);this.light.shadow.bias=-.0002;this.scene.add(this.light);const fill=new THREE.DirectionalLight('#cbdfff',1);fill.position.set(-20,15,-20);this.scene.add(fill);
    this.floor=new THREE.Group();this.objectLayer=new THREE.Group();this.actorLayer=new THREE.Group();this.markerLayer=new THREE.Group();this.routeLayer=new THREE.Group();this.scene.add(this.floor,this.objectLayer,this.actorLayer,this.markerLayer,this.routeLayer);
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    new ResizeObserver(()=>this.resize()).observe(canvas.parentElement);this.resize();
    window.addEventListener('keydown',e=>{if(this.walking&&!document.querySelector('dialog[open]')&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)){this.keys.add(e.code);if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();}});
    window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clearKeys());document.addEventListener('visibilitychange',()=>this.clearKeys());document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas)this.clearKeys();});
    document.addEventListener('mousemove',e=>{if(this.walking&&document.pointerLockElement===canvas)this.look(e.movementX,e.movementY);});
    let drag=null;
    canvas.addEventListener('pointerdown',e=>{if(!this.walking)return;if(e.pointerType==='touch'||document.pointerLockElement!==canvas){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
    canvas.addEventListener('pointermove',e=>{if(this.walking&&drag&&drag.id===e.pointerId&&document.pointerLockElement!==canvas){this.look(e.clientX-drag.x,e.clientY-drag.y);drag.x=e.clientX;drag.y=e.clientY;}});
    const end=()=>{drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
  }
  clearKeys(){this.keys.clear();this.touch={forward:0,right:0};}
  resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.renderer.setSize(Math.max(1,r.width),Math.max(1,r.height),false);this.camera.aspect=r.width/Math.max(1,r.height);this.camera.updateProjectionMatrix();}
  setProject(p,{fit=false}={}){
    if(this.walking)this.exitWalk();this.project=p;clear(this.floor);clear(this.objectLayer);clear(this.markerLayer);this.meshes.clear();this.select(null);this.ghost(null);
    const {width:w,depth:d,height:h}=p.warehouse;
    const base=box(this.floor,w+.8,.4,d+.8,0,-.23,0,'#a4b3c0');base.castShadow=false;const concrete=box(this.floor,w,.04,d,0,-.01,0,'#d8e0e4');concrete.castShadow=false;
    const grid=new THREE.GridHelper(Math.max(w,d),Math.round(Math.max(w,d)), '#abbcc7','#c6d1d9');grid.position.y=.025;grid.material.transparent=true;grid.material.opacity=.38;this.floor.add(grid);this.grid=grid;
    this.walkWalls=[];
    for(const s of [-1,1]){
      const front=box(this.floor,w,h,.16,0,h/2,s*d/2,'#e5edf0');const side=box(this.floor,.16,h,d,s*w/2,h/2,0,'#dae5eb');
      front.visible=s===-1;side.visible=s===-1;this.walkWalls.push({mesh:front,overview:s===-1},{mesh:side,overview:s===-1});
      box(this.floor,w,.05,.12,0,.045,s*(d/2-.3),'#d0a647');box(this.floor,.12,.05,d,s*(w/2-.3),.045,0,'#d0a647');
    }
    // Subtle façade columns help communicate warehouse height without external models.
    for(let x=-w/2;x<=w/2;x+=6)box(this.floor,.18,h,.26,x,h/2,-d/2+.05,'#a8b9c5');
    const title=label(`${p.projectName}  /  ${w} × ${d} m`,'#315069',Math.min(9,w*.4));title.position.set(0,.35,d/2+1.4);this.floor.add(title);
    for(const o of p.objects){const root=new THREE.Group();root.userData.objectId=o.id;root.userData.data=o;rebuildObjectVisual(root);this.objectLayer.add(root);this.meshes.set(o.id,root);this.position(root,o);}
    const extent=Math.max(w,d)*.65;Object.assign(this.light.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:600});this.light.position.set(w*.5,Math.max(36,w*.8),d*.6);this.light.shadow.camera.updateProjectionMatrix();
    this.setMarkers(p.simulation.stations);this.routeLayer.visible=this.showRoutes;this.navigation=null;
    if(fit)this.fit();
  }
  position(root,o){root.position.set(o.x-this.project.warehouse.width/2,o.z||0,o.y-this.project.warehouse.depth/2);root.rotation.y=(o.rotation||0)*Math.PI/180;root.updateMatrixWorld(true);this.selection?.update();}
  updatePosition(o){const root=this.meshes.get(o.id);if(root)this.position(root,o);}
  setMarkers(stations){clear(this.markerLayer);const {width:w,depth:d}=this.project.warehouse;stations.forEach((s,i)=>{const g=new THREE.Group();g.position.set(s.x-w/2,.05,s.y-d/2);const ring=new THREE.Mesh(new THREE.RingGeometry(.52,.68,40),new THREE.MeshBasicMaterial({color:COLORS[i],side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;g.add(ring);const l=label(`${i+1}  ${s.label}`,COLORS[i],2.8);l.position.y=1;g.add(l);this.markerLayer.add(g);});}
  fit(){if(this.walking)return;const {width:w,depth:d}=this.project.warehouse;const s=Math.max(w,d)*Math.max(1,1/this.camera.aspect);this.camera.up.set(0,1,0);this.camera.fov=43;this.camera.position.set(s*.72,s*.70,s*.91);this.controls.target.set(0,0,0);this.camera.updateProjectionMatrix();this.controls.update();}
  top(){if(this.walking)return;const s=Math.max(this.project.warehouse.width,this.project.warehouse.depth)*Math.max(1,1/this.camera.aspect);this.camera.position.set(0,s*1.45,.001);this.camera.up.set(0,0,-1);this.controls.target.set(0,0,0);this.controls.update();}
  select(id){if(this.selection){this.scene.remove(this.selection);this.selection.dispose();this.selection=null;}if(id&&this.meshes.has(id)){this.selection=new THREE.BoxHelper(this.meshes.get(id),'#ed9b31');this.scene.add(this.selection);}}
  ghost(o,valid=true){if(this.preview){this.scene.remove(this.preview);disposeObject3D(this.preview);this.preview=null;}if(!o)return;const g=new THREE.Group();const m=new THREE.Mesh(new THREE.BoxGeometry(o.width,o.height,o.depth),new THREE.MeshStandardMaterial({color:valid?'#18ac91':'#ed5963',transparent:true,opacity:.33,depthWrite:false}));m.position.y=o.height/2;g.add(m);this.scene.add(g);this.preview=g;this.position(g,o);}
  ray(event){const r=this.canvas.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);}
  ground(event){this.ray(event);const hit=this.raycaster.ray.intersectPlane(this.plane,new THREE.Vector3());return hit?{x:hit.x+this.project.warehouse.width/2,y:hit.z+this.project.warehouse.depth/2}:null;}
  pick(event){this.ray(event);for(const hit of this.raycaster.intersectObjects(this.objectLayer.children,true)){let o=hit.object;while(o&&!o.userData.objectId)o=o.parent;if(o)return o.userData.objectId;}return null;}
  screenPoint(x,y,z=0){const v=new THREE.Vector3(x-this.project.warehouse.width/2,z,y-this.project.warehouse.depth/2).project(this.camera),r=this.canvas.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};}
  worker(index){const root=new THREE.Group(),legs=[],arms=[];const c=['#407ba8','#e7a44b','#6a9a94'][index%3];box(root,.40,.55,.28,0,1.05,0,c);box(root,.42,.30,.29,0,1.12,0,'#edc34b');box(root,.06,.48,.305,-.12,1.05,0,'#fff4bb');box(root,.06,.48,.305,.12,1.05,0,'#fff4bb');
    const head=new THREE.Mesh(new THREE.SphereGeometry(.15,12,8),new THREE.MeshStandardMaterial({color:'#e4b48a'}));head.position.y=1.5;root.add(head);const helmet=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#f2c044'}));helmet.position.y=1.59;root.add(helmet);
    for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.115,.75,0);box(leg,.145,.62,.18,0,-.3,0,'#364b61');box(leg,.17,.12,.29,0,-.66,.025,'#253648');root.add(leg);legs.push(leg);const arm=new THREE.Group();arm.position.set(side*.28,1.29,0);box(arm,.135,.48,.16,0,-.22,0,c);root.add(arm);arms.push(arm);}
    const cargo=box(root,.43,.32,.35,0,.99,.36,'#c1945a');cargo.visible=false;const badge=label(`작업자 ${index+1}`,'#3d6479',1.8);badge.position.y=2.05;root.add(badge);return {root,legs,arms,cargo,badge};
  }
  setAgents(sim){clear(this.actorLayer);clear(this.routeLayer);this.routes.clear();this.actors=sim.agents.map(a=>{const model=this.worker(a.id);this.actorLayer.add(model.root);return model;});this.updateActors(sim);}
  updateActors(sim){const {width:w,depth:d}=this.project.warehouse;sim.agents.forEach((a,i)=>{const m=this.actors[i];if(!m)return;m.root.position.set(a.x-w/2,0,a.y-d/2);m.root.rotation.y=a.heading;const phase=a.moving?Math.sin(a.distance*9)*.45:0;m.legs[0].rotation.x=phase;m.legs[1].rotation.x=-phase;m.arms[0].rotation.x=-phase;m.arms[1].rotation.x=phase;m.cargo.visible=a.stage===2||a.stage===3;m.badge.material.color.set(a.blocked?'#f17067':'#ffffff');
      if(i<8&&this.routes.get(a.id)?.path!==a.path){const prev=this.routes.get(a.id);if(prev?.mesh){this.routeLayer.remove(prev.mesh);disposeObject3D(prev.mesh);}let mesh=null;if(a.path?.length){const points=a.path.map(p=>new THREE.Vector3(p.x-w/2,.075,p.y-d/2));mesh=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:COLORS[a.stage],transparent:true,opacity:.55}));this.routeLayer.add(mesh);}this.routes.set(a.id,{path:a.path,mesh});}
    });}
  enterWalk(){if(this.walking)return;this.navigation=new Navigation(this.project,.3);const preferred=this.project.simulation.stations[0],n=this.navigation.nearest(preferred);if(n<0)throw new Error('걸어갈 빈 공간이 없습니다. 통로를 확보해 주세요.');
    this.saved={position:this.camera.position.clone(),target:this.controls.target.clone(),up:this.camera.up.clone(),fov:this.camera.fov};this.controls.enabled=false;this.walking=true;this.player=this.navigation.point(n);this.yaw=0;this.pitch=0;this.camera.up.set(0,1,0);this.camera.fov=74;this.camera.rotation.order='YXZ';this.camera.updateProjectionMatrix();this.walkWalls.forEach(w=>w.mesh.visible=true);this.select(null);this.ghost(null);this.applyWalkCamera();
  }
  exitWalk(){if(!this.walking)return;this.walking=false;this.clearKeys();if(document.pointerLockElement===this.canvas)document.exitPointerLock();this.controls.enabled=true;this.camera.position.copy(this.saved.position);this.camera.up.copy(this.saved.up);this.camera.fov=this.saved.fov;this.controls.target.copy(this.saved.target);this.camera.updateProjectionMatrix();this.controls.update();this.walkWalls.forEach(w=>w.mesh.visible=w.overview);}
  async lock(){if(!this.walking)return;try{await this.canvas.requestPointerLock?.();}catch{/* Drag-look and touch remain available. */}}
  look(dx,dy){this.yaw-=dx*.003;this.pitch=clamp(this.pitch-dy*.0025,-1.2,1.2);}
  applyWalkCamera(){const {width:w,depth:d}=this.project.warehouse;this.camera.position.set(this.player.x-w/2,1.65,this.player.y-d/2);this.camera.rotation.set(this.pitch,this.yaw,0,'YXZ');}
  tick(dt,sim){if(this.walking){let forward=Number(this.keys.has('KeyW')||this.keys.has('ArrowUp'))-Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))+this.touch.forward,right=Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))+this.touch.right;const n=Math.hypot(forward,right);if(n>1){forward/=n;right/=n;}if(this.keys.has('KeyQ'))this.yaw+=dt*1.3;if(this.keys.has('KeyE'))this.yaw-=dt*1.3;const s=(this.keys.has('ShiftLeft')?3.2:1.65)*Math.min(dt,.08);this.player=moveCircle(this.project,this.player,(right*Math.cos(this.yaw)-forward*Math.sin(this.yaw))*s,(-right*Math.sin(this.yaw)-forward*Math.cos(this.yaw))*s,.3);this.applyWalkCamera();}else this.controls.update();this.updateActors(sim);this.renderer.render(this.scene,this.camera);}
  drawMap(sim){const ctx=this.map.getContext('2d'),W=this.map.width,H=this.map.height,{width:w,depth:d}=this.project.warehouse,pad=12,s=Math.min((W-pad*2)/w,(H-pad*2)/d),ox=(W-w*s)/2,oy=(H-d*s)/2;ctx.clearRect(0,0,W,H);ctx.fillStyle='#f3f7fa';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#a8bbc8';ctx.strokeRect(ox,oy,w*s,d*s);for(const o of this.project.objects){ctx.fillStyle=o.type==='safety'?`${o.color}33`:o.color;const c=corners(o);ctx.beginPath();c.forEach((p,i)=>i?ctx.lineTo(ox+p.x*s,oy+p.y*s):ctx.moveTo(ox+p.x*s,oy+p.y*s));ctx.closePath();ctx.fill();}for(const a of sim.agents){ctx.fillStyle=a.blocked?'#e15656':'#277fc0';ctx.beginPath();ctx.arc(ox+a.x*s,oy+a.y*s,2.5,0,Math.PI*2);ctx.fill();}if(this.walking){ctx.save();ctx.translate(ox+this.player.x*s,oy+this.player.y*s);ctx.rotate(-this.yaw);ctx.fillStyle='#e87635';ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,5);ctx.lineTo(0,2);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.restore();}}
}
