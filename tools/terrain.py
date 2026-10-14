import bpy,math,random
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_grid_add(x_subdivisions=160,y_subdivisions=160,size=200)
o=bpy.context.object; o.name='terrain'
from mathutils import noise,Vector
for v in o.data.vertices:
    x,y=v.co.x,v.co.y; d=math.hypot(x,y)
    h=noise.fractal(Vector((x*0.02,y*0.02,0)),1.0,2.0,5)*2.5
    h+= max(0,d-40)**1.3*0.022   # rolling hills at distance
    v.co.z=h*min(1,max(0,(d-12)/30))
bpy.ops.object.shade_smooth()
uv=o.data.uv_layers.active
for l in o.data.loops:
    c=o.data.vertices[l.vertex_index].co; uv.data[l.index].uv=(c.x/200+0.5,c.y/200+0.5)
bpy.ops.export_scene.gltf(filepath='/workspace/weather-real/assets/models/terrain.glb',export_format='GLB',export_yup=True)
