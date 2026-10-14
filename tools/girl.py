import bpy,sys
A='/home/box/agent-data/agents/4ef0e3e8-28e0-43b8-bbf2-c189e1dfe357/attachments/'
bpy.ops.wm.open_mainfile(filepath=A+'7195cde5733c1bbc432601afee76dd573fd031c17a02b9f06b37ac2967069430.blend')
img=bpy.data.images.load(A+'eb3c7f8fd24718630e0229e520a51bb415fab73b09e8662c4100030aa1be1e49.png'); img.name='girl_atlas'
for n in ['Camera','Cuerpo.002']:
    o=bpy.data.objects.get(n)
    if o: bpy.data.objects.remove(o)
arm=bpy.data.objects['Armature']
main=bpy.data.materials['1m4g3n-texura-An1we.png']; main.node_tree.nodes.clear()
nt=main.node_tree; out=nt.nodes.new('ShaderNodeOutputMaterial'); bs=nt.nodes.new('ShaderNodeBsdfPrincipled'); tx=nt.nodes.new('ShaderNodeTexImage')
tx.image=img; tx.interpolation='Closest'; nt.links.new(tx.outputs['Color'],bs.inputs['Base Color']); nt.links.new(bs.outputs[0],out.inputs[0])
bs.inputs['Roughness'].default_value=0.9; main.name='girl_skin'
b=bpy.data.materials['Borde']; b.node_tree.nodes.clear(); nt=b.node_tree; out=nt.nodes.new('ShaderNodeOutputMaterial'); bs=nt.nodes.new('ShaderNodeBsdfPrincipled')
bs.inputs['Base Color'].default_value=(0.05,0.02,0.03,1); nt.links.new(bs.outputs[0],out.inputs[0]); b.use_backface_culling=True; b.name='girl_outline'
for o in bpy.data.objects:
    if o.type=='MESH' and o.parent==arm and len(o.vertex_groups) and not any(m.type=='ARMATURE' for m in o.modifiers):
        m=o.modifiers.new('arm','ARMATURE'); m.object=arm
        bpy.context.view_layer.objects.active=o
        while o.modifiers[0].name!='arm': bpy.ops.object.modifier_move_up(modifier='arm')
    if o.type=='MESH': print('M',o.name,[m.type for m in o.modifiers],len(o.data.polygons))
bpy.ops.export_scene.gltf(filepath='/workspace/weather-real/assets/models/girl.glb',export_format='GLB',export_apply=True,export_skins=True,export_animations=False,use_visible=False)
