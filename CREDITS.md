# Credits & Licenses

## 3D models
| File | Source | License | Processing |
|---|---|---|---|
| assets/models/tree_a.glb | Poly Haven "Island Tree 02" (https://polyhaven.com/a/island_tree_02) | CC0 | Blender 4.2 (tools/tree.py): kept ~22% of leaf clusters (scaled up 1.6×), decimated trunk/branches to 25k faces, textures ≤1024px |
| assets/models/tree_b.glb | Poly Haven "Tree Small 02" (https://polyhaven.com/a/tree_small_02) | CC0 | same, 11% of leaf clusters, scaled up 1.9× |
| assets/models/shrub.glb | Poly Haven "Shrub 02" (https://polyhaven.com/a/shrub_02) | CC0 | Blender decimate to ~8k faces (tools/opt.py) |
| assets/models/terrain.glb | Original; procedural in Blender (tools/terrain.py) | CC0 (this project) | |
| assets/models/girl.glb | **User-provided** anime-style girl (.blend + .fbx + texture atlas supplied by the user; original author/license not stated — user's responsibility). Built from the .blend | Blender (tools/girl.py): texture relinked to the supplied PNG atlas, materials rebuilt (atlas → Principled; "Borde" → dark inverted-hull outline), Armature modifiers added so the meshes are skinned to the 16-bone rig, camera/curve removed, exported GLB. No animation clips existed, so she is animated in code by rotating her bones |
| assets/models/kid_a.glb | **User-provided** GLB (Mixamo-rigged boy, untextured; author/license not stated — user's responsibility) | Used as supplied; clothing colors painted at runtime as vertex colors; posed procedurally via its Mixamo bones |
| assets/models/kid_b.glb | **User-provided** GLB (Mixamo-rigged cartoon boy with beanie, textured; author/license not stated — user's responsibility) | Used as supplied; posed procedurally via its Mixamo bones |
| assets/models/kids.glb | Original (now only the umbrellas are used); children and umbrellas modeled procedurally in Blender Python (tools/kids.py) | CC0 (this project) | |

## Textures / HDRI
| File | Source | License |
|---|---|---|
| assets/hdr/sky_1k.hdr | Poly Haven "Kloofendal 48d Partly Cloudy (Pure Sky)" https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky | CC0 |
| assets/tex/aerial_grass_rock_* | Poly Haven "Aerial Grass Rock" https://polyhaven.com/a/aerial_grass_rock | CC0 |

## Audio (Freesound.org, all CC0; trimmed to 60 s loops with ffmpeg)
| File | Freesound sound | Author |
|---|---|---|
| sunny.mp3 | #414907 "Summer afternoon Meadow ATM birds and crickets" https://freesound.org/s/414907/ | DanGasior |
| overcast.mp3 | #459981 "Strong Wind" (played quietly) https://freesound.org/s/459981/ | florianreichelt |
| rain.mp3 | #475215 "Nature - Rain storm roadside ambience" https://freesound.org/s/475215/ | jodybruchon |
| thunder.mp3 | #169534 "high thunder suburb 08" https://freesound.org/s/169534/ | klankbeeld |
| wind.mp3 | #757474 "Strong Wind in Trees with Suburban Atmosphere" https://freesound.org/s/757474/ | Garuda1982 |
| snow.mp3 | #861757 "Wind - Low Frequency, Warm and Strong" https://freesound.org/s/861757/ | bassimat |
| kids.mp3 | #539581 "park with children playing" https://freesound.org/s/539581/ | Federico_Casazza |
Fog ambience = sunny.mp3 through a WebAudio low-pass filter.

## Code
three.js r169 (MIT) – assets/lib (three.module.js + examples/jsm addons).
