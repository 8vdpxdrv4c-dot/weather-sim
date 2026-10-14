# 天气小课堂 · 3D 天气模拟 v2
Open `index.html` via any static server (or GitHub Pages). All files local; three.js r186 (0.186.1) vendored in `lib/` (ES modules + importmap).
Buttons: 晴 阴 雨 雪 雾 风 — smooth ~2 s transitions with crossfaded ambient audio (audio starts after the first click, browser autoplay rule).
- Rain: 14k instanced camera-facing streak quads (GPU-animated, wind slant) + 2.5k GPU splash point sprites on the terrain.
- Snow: 10k GPU point sprites, soft round flakes with low-frequency turbulence; ground/grass/tree snow tint.
- Wind: 70 instanced ribbons; vertex shader builds curved paths (some with loops), fragment shader draws a moving tapered gradient streak (BotW-style); grass/tree sway increases.
- Scene: shader gradient sky + sun glow (no noise), canvas-texture sprite clouds drifting slowly, 94k instanced shader grass blades with distance fade, 3.2k instanced flowers, procedural trees, 5 procedural chibi children, butterflies, soft blob shadows (no shadow maps, no post-processing).
