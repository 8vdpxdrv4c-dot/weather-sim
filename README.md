# 天气模拟器 · 写实版
Serve this folder with any static server, e.g. `python3 -m http.server 8000`, and open http://localhost:8000/ in Chrome. (Opening via file:// will not work because of ES modules and fetch.)
Buttons: 晴/阴/雨/雪/雾/风. Sound starts on the first click. Drag to orbit, scroll to zoom. "画质" switches between high quality (with GTAO ambient occlusion) and a faster mode. If the frame rate stays low, the page switches to the faster mode by itself.
tools/ holds the Blender scripts used to build the models and the Playwright screenshot script.
