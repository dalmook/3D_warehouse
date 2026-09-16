# Archived migration. Never replay against the maintained modular application.
raise SystemExit('Retired migration: use Git history to inspect the original operation. No files changed.')
"""Apply the reviewed rendering change to the exact 9.1 source, once.
Only repository source files are touched. No credentials, layouts or local storage.
"""
from pathlib import Path
from hashlib import sha1

def replace_once(s, old, new):
    assert s.count(old)==1, 'Source changed; refusing ambiguous replacement: '+old[:60]
    return s.replace(old,new,1)

p=Path('city-app.mjs');s=p.read_text()
if 'rackRenderPlan' not in s:
    raw=p.read_bytes()
    assert sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()=='a23c49c9402800a9f36059764890efeca4f61cc9', 'Unexpected application source'
    s=replace_once(s,"import * as THREE from 'three';", "import * as THREE from 'three';\nimport {rackRenderPlan,rackParts} from './city-render.mjs';\nlet rackPlan={compact:false,estimatedParts:0,racks:0};")
    start=s.index("  const bays=clamp(o.config?.bays||4,1,20),levels=clamp(o.config?.levels||4,1,20);")
    end=s.index(" }else if(o.type==='pallet')",start)
    s=s[:start]+'''  const parts=rackParts(o,rackPlan.compact);
  const mesh=new THREE.InstancedMesh(cube,mat('#ffffff'),parts.length);
  const transform=new THREE.Object3D(),tint=new THREE.Color();
  parts.forEach((p,i)=>{
    transform.position.set(p.x,p.y,p.z);transform.scale.set(Math.max(p.w,.01),Math.max(p.h,.01),Math.max(p.d,.01));transform.updateMatrix();
    mesh.setMatrixAt(i,transform.matrix);mesh.setColorAt(i,tint.set(p.color));
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
  mesh.computeBoundingBox();mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
'''+s[end:]
    s=replace_once(s,"function rebuild(){\n buildShell();", "function rebuild(){\n rackPlan=rackRenderPlan(layout.objects);\n objectsRoot.traverse(m=>{if(m.isInstancedMesh)m.dispose();});\n buildShell();")
    s=replace_once(s,"syncFields();minimap();stats();\n}","syncFields();if(rackPlan.compact)$('review').textContent+='\\n대용량 도면: 랙 내부 표시만 간소화합니다. 실제 베이·단수·용량·저장 데이터는 유지됩니다.';minimap();stats();\n}")
    s=replace_once(s,"ghost.traverse(m=>{if(m.material)m.material.dispose();});", "ghost.traverse(m=>{if(m.isInstancedMesh)m.dispose();if(m.material)m.material.dispose();});")
    s=replace_once(s,"m.material.opacity=.48;", "m.material.opacity=.48;if(m.isInstancedMesh){for(let i=0;i<m.count;i++)m.setColorAt(i,new THREE.Color('#ffffff'));m.instanceColor.needsUpdate=true;}")
    s=replace_once(s,"version:'9.1.0',", "version:'9.1.1',getRenderStats:()=>{let meshes=0,instances=0;objectsRoot.traverse(m=>{if(m.isMesh)meshes++;if(m.isInstancedMesh)instances+=m.count;});return {...rackPlan,meshes,instances,frame:renderer.info.render.frame,calls:renderer.info.render.calls};},")
    p.write_text(s)
    p=Path('tests/browser.mjs');p.write_text(replace_once(p.read_text(),"),'9.1.0');", "),'9.1.1');"))
    p=Path('tests/deployed.mjs');p.write_text(replace_once(p.read_text(),"'city-app.mjs','city-core.mjs'","'city-app.mjs','city-render.mjs','city-core.mjs'"))
    p=Path('index.html');p.write_text(replace_once(p.read_text(),'/ 9.1</small>','/ 9.1.1</small>'))
    print('Applied Warehouse City 9.1.1 rack instancing and non-destructive visual budget.')
else:
    print('Rendering hardening already applied; source left unchanged.')
