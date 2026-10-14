import bpy,math,random
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(3)
def mat(name,col,rough=0.8,sheen=0.0):
    m=bpy.data.materials.new(name); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*col,1); b.inputs['Roughness'].default_value=rough
    return m
def smooth(o,lv=2):
    o.modifiers.new('s','SUBSURF').levels=lv
    bpy.context.view_layer.objects.active=o; bpy.ops.object.shade_smooth()
def capsule(name,r,length,m,parent,loc=(0,0,0),scale=(1,1,1)):
    # points down from origin (pivot at top)
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=length,location=(0,0,-length/2))
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(scale=True)
    smooth(o,1); o.data.materials.append(m); o.parent=parent; return o
def empty(name,loc,parent=None):
    e=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(e); e.location=loc; e.parent=parent; return e
OUT=[ # (shirt, lower, kind, hair, pack, skin)
 ((0.95,0.78,0.10),(0.22,0.38,0.62),'polo','short',(0.45,0.25,0.65),(0.96,0.80,0.68)),
 ((0.98,0.45,0.08),(0.20,0.34,0.58),'tee','short',(0.20,0.35,0.75),(0.95,0.78,0.65)),
 ((0.62,0.78,0.95),(0.25,0.42,0.68),'overalls','short',(0.95,0.60,0.10),(0.97,0.82,0.70)),
 ((0.97,0.80,0.15),(0.22,0.38,0.62),'sweater','braids',(0.85,0.40,0.15),(0.96,0.80,0.68)),
 ((0.98,0.62,0.72),(0.98,0.62,0.72),'dress','pigtails',(0.35,0.70,0.55),(0.97,0.83,0.72))]
for k,(shc,loc_,kind,hair,packc,skc) in enumerate(OUT):
    s=1.0
    root=empty(f'kid{k}',(k*1.5,0,0))
    sk=mat(f'skin{k}',skc,0.5); sh=mat(f'shirt{k}',shc,0.9); pa=mat(f'pants{k}',loc_,0.85)
    ha=mat(f'hair{k}',(0.20,0.11,0.05),0.55); shoe=mat(f'shoe{k}',[(0.85,0.35,0.15),(0.25,0.3,0.45),(0.9,0.4,0.3),(0.95,0.95,0.95),(0.95,0.6,0.7)][k],0.5)
    pk=mat(f'pack{k}',packc,0.7); sock=mat('sock',(0.95,0.95,0.95),0.9)
    hipH=0.52; legL=0.48
    for side,x in (('L',0.065),('R',-0.065)):
        p=empty(f'leg{side}',(x,0,hipH),root)
        if kind=='dress':
            capsule('leg',0.042,legL*0.9,sk,p); capsule('sock',0.046,0.12,sock,p,).location=(0,0,-legL+0.12)
        else: capsule('thigh',0.058,legL*0.95,pa,p)
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0.025,-legL)); o=bpy.context.object
        o.scale=(0.08,0.16,0.065); bpy.ops.object.transform_apply(scale=True); smooth(o,2)
        o.data.materials.append(shoe); o.parent=p
    torso=empty('torso',(0,0,hipH),root)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=0.13,depth=0.36,location=(0,0,0.17)); o=bpy.context.object
    o.scale=(1,0.75,1); bpy.ops.object.transform_apply(scale=True)
    smooth(o,2); o.data.materials.append(sh); o.parent=torso; o.name='body'
    if kind=='polo':
        bpy.ops.mesh.primitive_torus_add(major_radius=0.06,minor_radius=0.018,location=(0,0.0,0.355)); o=bpy.context.object; o.data.materials.append(sh); o.parent=torso
    if kind=='overalls':
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0.075,0.14)); o=bpy.context.object; o.scale=(0.16,0.03,0.2); bpy.ops.object.transform_apply(scale=True); smooth(o,1); o.data.materials.append(pa); o.parent=torso
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=0.135,depth=0.12,location=(0,0,0.02)); o=bpy.context.object; o.scale=(1,0.76,1); bpy.ops.object.transform_apply(scale=True); smooth(o,1); o.data.materials.append(pa); o.parent=torso
        for x in (0.07,-0.07):
            bpy.ops.mesh.primitive_cube_add(size=1,location=(x,0,0.3)); o=bpy.context.object; o.scale=(0.03,0.2,0.012); o.rotation_euler=(1.57,0,0); bpy.ops.object.transform_apply(scale=True,rotation=True); o.data.materials.append(pa); o.parent=torso
    if kind=='dress':
        bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=0.24,radius2=0.12,depth=0.3,location=(0,0,-0.05)); o=bpy.context.object
        smooth(o,1); o.data.materials.append(sh); o.parent=torso
    # backpack
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-0.14,0.2)); o=bpy.context.object; o.scale=(0.2,0.09,0.24); bpy.ops.object.transform_apply(scale=True)
    b=o.modifiers.new('b','BEVEL'); b.width=0.03; b.segments=3; o.data.materials.append(pk); o.parent=torso
    for x in (0.075,-0.075):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.11,minor_radius=0.012,location=(x,-0.02,0.24),rotation=(0,1.57,0)); o=bpy.context.object; o.scale=(1,1,1.2); o.data.materials.append(pk); o.parent=torso
    neck=empty('head',(0,0,0.37),torso)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.115,location=(0,0,0.14)); h=bpy.context.object
    h.scale=(0.95,0.95,1.02); bpy.ops.object.transform_apply(scale=True); smooth(h,1); h.data.materials.append(sk); h.parent=neck
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04,depth=0.08,location=(0,0,0.02)); o=bpy.context.object; o.data.materials.append(sk); o.parent=neck
    for x in (0.11,-0.11):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.025,location=(x,0,0.13)); o=bpy.context.object; o.scale=(0.6,1,1); o.data.materials.append(sk); o.parent=neck
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.124,location=(0,-0.012,0.155)); hc=bpy.context.object
    hc.scale=(0.97,0.98,1.03); bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT'); bpy.ops.object.mode_set(mode='OBJECT')
    lim=0.1 if hair=='short' else 0.03
    for v in hc.data.vertices: v.select=(v.co.z<0.16 and v.co.y>0.03) or v.co.z<lim-0.155+0.155*0+ (0.07 if hair=='short' else 0.02)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.delete(type='VERT'); bpy.ops.object.mode_set(mode='OBJECT')
    hc.modifiers.new('t','SOLIDIFY').thickness=0.012; smooth(hc,1); hc.data.materials.append(ha); hc.parent=neck
    if hair=='pigtails':
        for x in (0.13,-0.13):
            bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05,location=(x,-0.04,0.2)); o=bpy.context.object; o.scale=(1.3,0.9,0.8); smooth(o,1); o.data.materials.append(ha); o.parent=neck
    if hair=='braids':
        for x in (0.1,-0.1):
            for n_ in range(4):
                bpy.ops.mesh.primitive_uv_sphere_add(radius=0.032-n_*0.003,location=(x,-0.05,0.08-n_*0.05)); o=bpy.context.object; smooth(o,1); o.data.materials.append(ha); o.parent=neck
    em=mat(f'eye{k}',(0.03,0.02,0.02),0.15); mm=mat(f'mouth{k}',(0.55,0.12,0.12),0.5)
    for x in (0.04,-0.04):
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.014,location=(x,0.105,0.15)); o=bpy.context.object; o.data.materials.append(em); o.parent=neck
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.022,location=(0,0.108,0.085)); o=bpy.context.object; o.scale=(1.2,0.4,0.6); o.data.materials.append(mm); o.parent=neck
    sleeve=0.36 if kind in ('sweater','overalls') else 0.15
    for side,x in (('L',0.16),('R',-0.16)):
        p=empty(f'arm{side}',(x,0,0.33),torso)
        capsule('forearm',0.034,0.36,sk,p)
        capsule('sleeve',0.045,sleeve,sh,p)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.04,location=(0,0,-0.37)); o=bpy.context.object; o.data.materials.append(sk); o.parent=p
# umbrella
import bmesh
root=empty('umbrella',(0,3,0))
cols=[(0.8,0.06,0.06),(0.95,0.75,0.08),(0.06,0.3,0.8)]
steel=mat('steel',(0.35,0.35,0.37),0.3); steel.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=1
for i,c in enumerate(cols):
    m=mat(f'umb{i}',c,0.35)
    me=bpy.data.meshes.new(f'umbrella{i}'); bm=bmesh.new()
    bmesh.ops.create_uvsphere(bm,u_segments=8,v_segments=12,radius=0.6)
    bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<0.28],context='VERTS')
    for v in bm.verts:
        v.co.z=(v.co.z-0.28)*1.3
        a=math.atan2(v.co.y,v.co.x); v.co.z-= 0.03*(1-abs(math.cos(4*a)))*(1-v.co.z/0.4)  # scalloped between ribs
    for f in bm.faces: f.material_index=0
    r=bmesh.ops.create_cone(bm,cap_ends=True,segments=8,radius1=0.012,radius2=0.012,depth=1.0,matrix=__import__('mathutils').Matrix.Translation((0,0,-0.35)))
    for f in {f for v in r['verts'] for f in v.link_faces}: f.material_index=1
    bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(f'umbrella{i}',me); bpy.context.collection.objects.link(o)
    me.materials.append(m); me.materials.append(steel)
    sol=o.modifiers.new('t','SOLIDIFY'); sol.thickness=0.008
    o.location=(i*2,3,0.85); o.parent=root
    bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath='/workspace/weather-real/assets/models/kids.glb',export_format='GLB',export_apply=True)
