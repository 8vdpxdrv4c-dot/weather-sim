import bpy,sys
argv=sys.argv[sys.argv.index('--')+1:]; src,dst,target=argv[0],argv[1],int(argv[2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
tot=sum(len(o.data.polygons) for o in meshes); print('POLYS',src,tot)
r=min(1.0,target/max(tot,1))
for o in meshes:
    if r<1:
        m=o.modifiers.new('d','DECIMATE'); m.ratio=r; m.use_collapse_triangulate=True
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier='d')
print('AFTER',sum(len(o.data.polygons) for o in meshes))
# downscale images to 512
for im in bpy.data.images:
    if im.size[0]>512: im.scale(512,int(512*im.size[1]/im.size[0]))
bpy.ops.export_scene.gltf(filepath=dst,export_format='GLB',export_image_format='JPEG',export_jpeg_quality=85,export_draco_mesh_compression_enable=False)
