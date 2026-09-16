"""Original warehouse assets. Blender 4.5 LTS, metres, Z up, front -Y.
Run: blender --background --python scripts/build-assets.py
glTF exporter maps (X,Y,Z) to (X,Z,-Y). Web runtime explicitly rotates front to +Z.
"""
import bpy, math, pathlib, json
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/models'; SRC=ROOT/'assets/source'
OUT.mkdir(parents=True,exist_ok=True);SRC.mkdir(parents=True,exist_ok=True)
def material(name,color,rough=.5,metal=0):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Metallic'].default_value=metal
 return m
blue=material('Powder_coated_blue',(.025,.16,.34),.35,.65)
orange=material('Safety_orange',(.95,.22,.035),.4,.5)
steel=material('Galvanized_steel',(.4,.46,.5),.32,.85)
rubber=material('Rubber',(.024,.028,.033),.9)
wood=material('Pallet_wood',(.48,.29,.12),.8)
card=material('Corrugated_cardboard',(.6,.39,.19),.85)
tape=material('Packing_tape',(.7,.53,.3),.3)
white=material('Label',(.88,.9,.89),.65)
navy=material('Workwear',(.035,.065,.12),.88)
vest=material('Hi_vis_vest',(.95,.37,.035),.75)
skin=material('Skin',(.48,.29,.19),.78)
yellow=material('Equipment_yellow',(.95,.57,.035),.52,.2)
plastic=material('Moulded_plastic',(.08,.16,.2),.48)
for m,name in [(wood,'wood'),(card,'cardboard')]:
 nodes=m.node_tree.nodes;links=m.node_tree.links;bs=nodes.get('Principled BSDF')
 for suffix,target in [('albedo','Base Color'),('roughness','Roughness'),('normal','Normal')]:
  image=bpy.data.images.load(str(ROOT/'assets/textures'/(name+'-'+suffix+'.png')));image.pack()
  tex=nodes.new('ShaderNodeTexImage');tex.image=image
  if suffix!='albedo':image.colorspace_settings.name='Non-Color'
  if suffix=='normal':
   nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.25;links.new(tex.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs[target])
  else:links.new(tex.outputs['Color'],bs.inputs[target])
def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def cube(name,dim,loc,mat,bevel=.015):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dim
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 if bevel:
  mod=o.modifiers.new('Manufactured edge radius','BEVEL');mod.width=min(bevel,min(dim)*.2);mod.segments=2
  bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 for p in o.data.polygons:p.use_smooth=True
 mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def cyl(name,r,depth,loc,mat,axis='Z',vertices=20):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name
 if axis=='X':o.rotation_euler.y=math.pi/2
 if axis=='Y':o.rotation_euler.x=math.pi/2
 o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
def ellipsoid(name,dim,loc,mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=loc);o=bpy.context.object;o.name=name;o.scale=tuple(v/2 for v in dim);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
def limb(name,width,depth,length,loc,mat):
 bpy.ops.mesh.primitive_cone_add(vertices=16,radius1=width*.44,radius2=width*.5,depth=length,location=loc)
 o=bpy.context.object;o.name=name;o.scale.y=depth/width;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 bevel=o.modifiers.new('Cloth_edge','BEVEL');bevel.width=.018;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
 for p in o.data.polygons:p.use_smooth=True
 return o
def bar(name,a,b,width,mat):
 a,b=Vector(a),Vector(b);o=cube(name,(width,width,(b-a).length),(a+b)/2,mat,.008);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o
records=[]
def save(name,dimensions,clips=None):
 bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
 for o in bpy.context.scene.objects:o['asset']=name
 bpy.ops.wm.save_as_mainfile(filepath=str(SRC/(name+'.blend')),compress=True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'.glb')),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_yup=True,export_apply=False)
 records.append(dict(id=name,path='assets/models/'+name+'.glb',source='assets/source/'+name+'.blend',author='Warehouse City project / Codex',license='CC0-1.0',origin='Original Blender construction; no third-party models',modifications='Initial original authored asset',dimensions=dimensions,units='m',pivot='floor centre',blenderUp='+Z',blenderFront='-Y',gltfUp='+Y',gltfFront='+Z',clips=clips or []))
reset()
for y in [-.5,.5]:
 cube('Folded_upright',(.09,.075,6),(0,y,3),blue,.005)
 cube('Baseplate',(.19,.16,.015),(0,y,.0075),steel,.002)
 for x in [-.065,.065]:cyl('Anchor_bolt',.013,.018,(x,y,.025),steel,vertices=6)
 for i in range(40):cube('Upright_punch',(.014,.002,.027),(0,y-.039,.15+i*.145),rubber,.002)
for j in range(6):
 for z in [j+.12,j+.88]:bar('Cross_tie',(0,-.5,z),(0,.5,z),.035,steel)
 bar('Diagonal',(0,-.5,j+.12),(0,.5,j+.88),.035,steel)
save('rack-frame',[.19,1.16,6])
reset();cube('Box_section_beam',(1,.075,.12),(0,0,.06),orange,.008)
for x in [-.48,.48]:cube('Beam_connector',(.04,.11,.2),(x,0,.1),orange,.005)
save('rack-beam',[1,.11,.2])
def pallet(plastic_mode=False):
 m=plastic if plastic_mode else wood
 for y in [-.46,-.23,0,.23,.46]:cube('Deck_board',(1.2,.17,.025),(0,y,.1475),m,.004)
 for x in [-.49,0,.49]:
  cube('Runner',(.18,1,.025),(x,0,.0125),m,.004)
  for y in [-.39,0,.39]:cube('Support_block',(.16,.18,.11),(x,y,.08),m,.008)
 if not plastic_mode:
  for x in [-.5,0,.5]:
   for y in [-.46,-.23,0,.23,.46]:cyl('Nail',.005,.001,(x,y,.1605),steel,vertices=6)
reset();pallet();save('pallet',[1.2,1,.16])
reset();pallet(True);save('plastic-pallet',[1.2,1,.16])
reset();cube('Carton',(.6,.4,.4),(0,0,.2),card,.008);cube('Top_seam',(.006,.4,.001),(0,0,.401),rubber,0);cube('Tape',(.06,.402,.002),(0,0,.403),tape,.001);cube('Shipping_label',(.19,.002,.1),(.12,-.201,.24),white,.001)
for i in range(17):cube('Barcode',(.002+(i%3)*.001,.001,.045),(.045+i*.008,-.203,.24),rubber,0)
save('box',[.6,.4,.405])
reset()
cube('Counterweight',(1.08,.65,.65),(0,.64,.65),yellow,.11)
cube('Chassis',(1.1,1.55,.26),(0,.02,.32),yellow,.08)
cube('Footwell',(.82,.7,.08),(0,0,.49),rubber)
cube('Seat_cushion',(.48,.42,.12),(0,.18,.92),rubber,.04)
cube('Seat_back',(.48,.1,.5),(0,.38,1.16),rubber,.04)
for x in [-.48,.48]:
 for y in [-.55,.6]:
  bar('Overhead_guard',(x,y,.65),(x,y,2.1),.045,steel)
 for y in [-.48,.55]:
  wheel=cyl('Wheel',.25,.16,(x,y,.25),rubber,'X',28)
  cyl('Wheel_hub',.115,.17,(x,y,.25),steel,'X')
cube('Guard_roof',(1.06,1.25,.055),(0,.03,2.14),steel)
for x in [-.4,.4]:
 cube('Mast_rail',(.09,.12,2.1),(x,-.78,1.12),steel)
 cyl('Lift_cylinder',.045,1.3,(x,-.65,.92),steel)
cube('Mast_bridge',(.9,.12,.09),(0,-.78,2.1),steel)
bpy.ops.object.empty_add(location=(0,-.88,.12));fork=bpy.context.object;fork.name='ForkCarriage'
for x in [-.3,.3]:
 o=cube('Fork_blade',(.12,.93,.045),(x,-1.19,.12),steel,.009);o.parent=fork;o.matrix_parent_inverse=fork.matrix_world.inverted()
 o=cube('Fork_back',(.12,.07,.65),(x,-.77,.43),steel);o.parent=fork;o.matrix_parent_inverse=fork.matrix_world.inverted()
bar('Steering_column',(0,-.22,.65),(0,-.38,1.2),.05,steel);cyl('Steering_wheel',.16,.025,(0,-.38,1.22),rubber)
for x in [-.39,.39]:cube('Headlight',(.15,.04,.1),(x,-.65,.77),white)
save('forklift',[1.2,2.4,2.2])
reset()
for x in [-.25,.25]:
 cube('Fork',(.16,1.1,.09),(x,-.23,.16),yellow)
 cyl('Load_roller',.065,.13,(x,-.68,.07),rubber,'X')
cube('Hydraulic_base',(.7,.24,.18),(0,.38,.21),yellow)
cyl('Steer_wheel',.12,.22,(0,.42,.12),rubber,'X');bar('Handle_stem',(0,.4,.3),(0,.6,1.1),.035,steel);bar('Handle_grip',(-.2,.6,1.1),(.2,.6,1.1),.045,rubber)
save('handpallet',[.8,1.6,1.15])
reset()
for y in [-.43,.43]:cube('Side_rail',(3,.065,.13),(0,y,.83),blue)
for i in range(25):cyl('Steel_roller',.042,.8,(-1.44+i*.12,0,.88),steel,'Y',16)
for x in [-1.3,0,1.3]:
 for y in [-.35,.35]:
  cube('Leg',(.055,.055,.78),(x,y,.39),steel);cube('Foot',(.14,.14,.025),(x,y,.0125),rubber)
cube('Motor',(.35,.2,.18),(.9,.52,.68),steel,.04)
save('conveyor',[3,1.15,.93])
reset();cube('Bench_top',(2,1,.07),(0,0,.865),wood,.025)
for x in [-.87,.87]:
 for y in [-.38,.38]:cube('Leg',(.065,.065,.83),(x,y,.415),blue)
cube('Lower_shelf',(1.8,.85,.04),(0,0,.24),steel)
cube('Drawer',(.65,.65,.16),(.5,0,.72),steel);cube('Drawer_handle',(.22,.05,.025),(.5,-.345,.72),rubber)
save('worktable',[2,1,.9])
reset()
for x in [-1.42,1.42]:cube('Dock_seal',(.16,.28,3.4),(x,0,1.7),rubber)
cube('Header',(3,.28,.22),(0,0,3.29),rubber)
for z in [2.8,2.96,3.12]:cube('Raised_door_section',(2.7,.08,.14),(0,.02,z),steel)
cube('Dock_leveller',(2.6,2.2,.09),(0,-.9,.045),steel)
for x in [-1.3,1.3]:
 cube('Safety_edge',(.05,2.2,.003),(x,-.9,.092),yellow,0)
 cyl('Bollard',.085,.95,(x,-1.9,.475),yellow)
# Centre the complete leveller/seal assembly inside the saved placement footprint.
for o in bpy.context.scene.objects:o.location.y+=.9
save('dock',[3,2.5,3.4])
# Rig: each anatomical mesh has rigid weights to an articulated bone. No shared skeletons.
reset();parts=[]
def part(o,b):parts.append((o,b));return o
part(ellipsoid('Torso',(.43,.26,.57),(0,0,1.2),navy),'Spine')
part(ellipsoid('Vest',(.45,.28,.43),(0,-.005,1.26),vest),'Spine')
for z in [1.15,1.34]:part(cube('Reflective_band',(.34,.025,.033),(0,-.121,z),white,.003),'Spine')
part(ellipsoid('Pelvis',(.33,.24,.21),(0,0,.89),navy),'Hips')
part(cyl('Neck',.057,.09,(0,0,1.49),skin),'Head')
part(ellipsoid('Head',(.19,.2,.24),(0,-.006,1.61),skin),'Head')
part(ellipsoid('Hardhat',(.245,.26,.135),(0,0,1.733),yellow),'Head')
part(ellipsoid('Helmet_brim',(.27,.29,.025),(0,-.017,1.70),yellow),'Head')
part(ellipsoid('Nose',(.033,.039,.044),(0,-.104,1.608),skin),'Head')
part(ellipsoid('Lower_jaw',(.125,.139,.082),(0,-.011,1.536),skin),'Head')
for x in [-.092,.092]:part(ellipsoid('Ear',(.025,.039,.061),(x,-.003,1.601),skin),'Head')
for x in [-.04,.04]:
 part(ellipsoid('Eye',(.025,.007,.009),(x,-.101,1.631),white),'Head')
 part(ellipsoid('Iris',(.008,.006,.008),(x,-.105,1.631),rubber),'Head')
 part(cube('Brow',(.028,.006,.005),(x,-.103,1.647),navy,.001),'Head')
part(ellipsoid('Mouth',(.044,.003,.006),(0,-.101,1.563),material('Lips',(.3,.13,.1))),'Head')
part(cube('Vest_zip',(.018,.01,.36),(0,-.151,1.28),rubber,.002),'Spine')
for x in [-.12,.12]:part(cube('Vest_pocket',(.11,.012,.10),(x,-.143,1.19),vest,.01),'Spine')
for side,s in [('L',-1),('R',1)]:
 x=s*.105
 part(limb('Thigh',.18,.19,.42,(x,0,.665),navy),'Thigh'+side)
 part(ellipsoid('Knee',(.145,.155,.14),(x,0,.46),navy),'Shin'+side)
 part(limb('Shin',.135,.145,.4,(x,.008,.285),navy),'Shin'+side)
 part(ellipsoid('Boot',(.17,.3,.13),(x,-.063,.065),rubber),'Shin'+side)
 part(limb('Upper_arm',.135,.14,.31,(s*.28,0,1.22),navy),'Arm'+side)
 part(ellipsoid('Elbow',(.125,.13,.12),(s*.30,0,1.08),navy),'Forearm'+side)
 part(limb('Forearm',.115,.12,.29,(s*.3,-.012,.95),navy),'Forearm'+side)
 part(ellipsoid('Glove',(.105,.1,.13),(s*.30,-.015,.775),rubber),'Forearm'+side)
armdata=bpy.data.armatures.new('WorkerSkeleton');arm=bpy.data.objects.new('WorkerRig',armdata);bpy.context.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=armdata.edit_bones[parent]
bone('Hips',(0,0,.84),(0,0,1))
bone('Spine',(0,0,1),(0,0,1.45),'Hips');bone('Head',(0,0,1.45),(0,0,1.76),'Spine')
for side,s in [('L',-1),('R',1)]:
 bone('Thigh'+side,(s*.105,0,.85),(s*.105,0,.46),'Hips');bone('Shin'+side,(s*.105,0,.46),(s*.105,0,.07),'Thigh'+side)
 bone('Arm'+side,(s*.24,0,1.39),(s*.30,0,1.08),'Spine');bone('Forearm'+side,(s*.30,0,1.08),(s*.30,0,.79),'Arm'+side)
bpy.ops.object.mode_set(mode='OBJECT')
for o,b in parts:
 vg=o.vertex_groups.new(name=b);vg.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Skin','ARMATURE');mod.object=arm;o.parent=arm
bpy.ops.object.select_all(action='DESELECT')
for o,b in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0][0];bpy.ops.object.join();bpy.context.object.name='WorkerSkinnedMesh'
arm.animation_data_create()
for name in ['Idle','Walk','Carry','PickPlace']:
 act=bpy.data.actions.new(name);arm.animation_data.action=act
 for f in range(0,33,4):
  t=f/32*2*math.pi
  for p in arm.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0)
  if name in ['Walk','Carry']:
   for side,phase in [('L',0),('R',math.pi)]:
    swing=math.sin(t+phase)
    arm.pose.bones['Thigh'+side].rotation_euler.x=swing*.43
    arm.pose.bones['Shin'+side].rotation_euler.x=-max(0,-swing)*.62
    arm.pose.bones['Arm'+side].rotation_euler.x=-swing*.32 if name=='Walk' else -.4
    arm.pose.bones['Forearm'+side].rotation_euler.x=-.15 if name=='Walk' else -1.05
   arm.pose.bones['Hips'].location.y=abs(math.cos(t))*.015
  elif name=='PickPlace':
   bend=(1-math.cos(t))*.5
   arm.pose.bones['Spine'].rotation_euler.x= bend*.35
   for side in ['L','R']:
    arm.pose.bones['Arm'+side].rotation_euler.x=-bend*.9;arm.pose.bones['Forearm'+side].rotation_euler.x=-bend*.5
  else:arm.pose.bones['Spine'].rotation_euler.z=math.sin(t)*.012
  for p in arm.pose.bones:p.keyframe_insert('rotation_euler',frame=f);p.keyframe_insert('location',frame=f)
 act.use_fake_user=True
arm.animation_data.action=None;bpy.context.scene.render.fps=30;bpy.context.scene.frame_end=32
save('worker',[.6,.6,1.8],['Idle','Walk','Carry','PickPlace'])
(ROOT/'assets/manifest.json').write_text(json.dumps({'generator':'scripts/build-assets.py','blender':bpy.app.version_string,'assets':records,'textures':[{'path':str(p.relative_to(ROOT)).replace('\\','/'),'author':'Warehouse City project / Codex','license':'CC0-1.0','source':'scripts/make-textures.py','modifications':'Deterministic generated tile; seed 42','colorSpace':'sRGB' if 'albedo' in p.name else 'linear'} for p in sorted((ROOT/'assets/textures').glob('*.png'))]},indent=2))
print('ASSETS_COMPLETE',len(records))
