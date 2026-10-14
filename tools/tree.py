import bpy,sys,bmesh,random
argv=sys.argv[sys.argv.index('--')+1:]; src,dst,keep,scl=argv[0],argv[1],float(argv[2]),float(argv[3])
random.seed(1)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o=[o for o in bpy.context.scene.objects if o.type=='MESH'][0]
leafidx=[i for i,m in enumerate(o.data.materials) if 'leaves' in m.name]
bm=bmesh.new(); bm.from_mesh(o.data); bm.faces.ensure_lookup_table()
seen=set(); kill=[]; nonleaf=[]
for f in bm.faces:
    if f.material_index not in leafidx: nonleaf.append(f); continue
    if f.index in seen: continue
    isl=[f]; seen.add(f.index); st=[f]
    while st:
        x=st.pop()
        for e in x.edges:
            for g in e.link_faces:
                if g.index not in seen: seen.add(g.index); isl.append(g); st.append(g)
    if random.random()>keep: kill+=isl
    else:
        vs=list({v for g in isl for v in g.verts}); c=vs[0].co*0
        for v in vs: c=c+v.co
        c=c/len(vs)
        for v in vs: v.co=c+(v.co-c)*scl
print('islands kill faces',len(kill),'nonleaf',len(nonleaf))
bmesh.ops.delete(bm,geom=kill,context='FACES')
# decimate branches/trunk separately: collapse not available in bmesh; use modifier later with vertex group
bm.to_mesh(o.data); bm.free()
bpy.context.view_layer.objects.active=o; o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='DESELECT')
for i in leafidx:
    o.active_material_index=i; bpy.ops.object.material_slot_select()
bpy.ops.mesh.select_all(action='INVERT'); bpy.ops.mesh.separate(type='SELECTED'); bpy.ops.object.mode_set(mode='OBJECT')
for ob in bpy.context.scene.objects:
    if ob.type=='MESH' and ob!=o:
        n=len(ob.data.polygons); m=ob.modifiers.new('d','DECIMATE'); m.ratio=min(1,25000/n)
        bpy.context.view_layer.objects.active=ob; bpy.ops.object.modifier_apply(modifier='d')
print('POLYS',[(ob.name,len(ob.data.polygons)) for ob in bpy.context.scene.objects if ob.type=='MESH'])
for im in bpy.data.images:
    if im.size[0]>1024: im.scale(1024,int(1024*im.size[1]/im.size[0]))
bpy.ops.export_scene.gltf(filepath=dst,export_format='GLB',export_image_format='JPEG',export_jpeg_quality=85)
