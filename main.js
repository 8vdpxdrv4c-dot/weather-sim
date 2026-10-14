import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';

// ---------- basics ----------
const params = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.domElement.style.filter = 'saturate(1.12)';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xcfe6f2, 0.01);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1200);
camera.position.set(0, 1.25, 7.0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.95, 0);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 4; controls.maxDistance = 13;
controls.minPolarAngle = 1.15; controls.maxPolarAngle = 1.56;
controls.minAzimuthAngle = -0.7; controls.maxAzimuthAngle = 0.7;
controls.update();

const SUN_DIR = new THREE.Vector3(0.58, 0.27, -0.77).normalize();
// light comes from the sun's azimuth, a bit higher than the visible disc so kid shadows stay compact and readable
const LIGHT_DIR = new THREE.Vector3(0.58, 0.62, -0.77).normalize();

// shared terrain height (identical in GLSL)
function hgt(x, z) {
  let h = 0.5 * Math.sin(x * 0.09 + 1.0) * Math.sin(z * 0.08) + 0.35 * Math.sin(x * 0.17 - z * 0.11) + 0.25 * Math.sin(x * 0.05 + z * 0.04 + 2.0);
  const d = Math.hypot(x, z);
  const t = Math.min(Math.max((d - 3) / 11, 0), 1); const s = t * t * (3 - 2 * t);
  h *= 0.25 + 0.75 * s;
  h += Math.max(0, -z - 20) * 0.06;
  return h;
}
const GLSL_H = `
float hgt(vec2 p){
  float h = 0.5*sin(p.x*0.09+1.0)*sin(p.y*0.08) + 0.35*sin(p.x*0.17 - p.y*0.11) + 0.25*sin(p.x*0.05+p.y*0.04+2.0);
  float d = length(p);
  h *= mix(0.25,1.0,smoothstep(3.0,14.0,d));
  h += max(0.0,-p.y-20.0)*0.06;
  return h;
}`;
const GLSL_FOG = `
uniform vec3 uFogColor; uniform float uFogDensity;
vec3 applyFog(vec3 c, float d){ float f = 1.0 - exp(-uFogDensity*uFogDensity*d*d); return mix(c, uFogColor, clamp(f,0.0,1.0)); }`;
const scaleU = { value: 500 };
const fogUniforms = { uFogColor: { value: new THREE.Color() }, uFogDensity: { value: 0.01 } };

// seeded random for deterministic layout
let seed = 12345; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rr = (a, b) => a + (b - a) * rnd();

// ---------- weather presets ----------
const C = (h) => new THREE.Color(h);
const PRESETS = {
  sunny:    { skyTop: C(0x3f93e6), skyHor: C(0xc4e6f7), glow: 1.0, sun: 2.6, sunCol: C(0xfff0d0), hemi: 1.5, fogCol: C(0xd3e9f2), fogD: 0.011, cloudCol: C(0xffffff), cloud: 1, grey: 0, rain: 0, snow: 0, wind: 0.12, lines: 0, cover: 0, fly: 1, cloudSpd: 0.6, exp: 1.0 },
  overcast: { skyTop: C(0x8f9cab), skyHor: C(0xd0d6dc), glow: 0.0, sun: 0.35, sunCol: C(0xe6ecf2), hemi: 1.45, fogCol: C(0xc7cdd3), fogD: 0.017, cloudCol: C(0xc9cfd6), cloud: 1, grey: 1, rain: 0, snow: 0, wind: 0.28, lines: 0, cover: 0, fly: 0.35, cloudSpd: 0.9, exp: 1.0 },
  rain:     { skyTop: C(0x6d7a88), skyHor: C(0xaab4be), glow: 0.0, sun: 0.2, sunCol: C(0xdde4ec), hemi: 1.3, fogCol: C(0xa9b3bd), fogD: 0.032, cloudCol: C(0x9aa3ad), cloud: 1, grey: 1, rain: 1, snow: 0, wind: 0.35, lines: 0, cover: 0, fly: 0, cloudSpd: 1.2, exp: 1.0 },
  snow:     { skyTop: C(0xa7b6c6), skyHor: C(0xe4e9ee), glow: 0.0, sun: 0.5, sunCol: C(0xf0f4ff), hemi: 1.6, fogCol: C(0xdde3ea), fogD: 0.03, cloudCol: C(0xe2e6ec), cloud: 1, grey: 1, rain: 0, snow: 1, wind: 0.2, lines: 0, cover: 1, fly: 0, cloudSpd: 0.6, exp: 1.0 },
  fog:      { skyTop: C(0xd8dfe4), skyHor: C(0xe6eaed), glow: 0.12, sun: 0.7, sunCol: C(0xfff6e8), hemi: 1.55, fogCol: C(0xe0e5e8), fogD: 0.17, cloudCol: C(0xffffff), cloud: 0.15, grey: 0.3, rain: 0, snow: 0, wind: 0.05, lines: 0, cover: 0, fly: 0.25, cloudSpd: 0.3, exp: 1.0 },
  wind:     { skyTop: C(0x4a97e2), skyHor: C(0xc8e6f5), glow: 0.85, sun: 2.4, sunCol: C(0xfff0d6), hemi: 1.5, fogCol: C(0xd3e9f2), fogD: 0.012, cloudCol: C(0xffffff), cloud: 1, grey: 0.15, rain: 0, snow: 0, wind: 1.0, lines: 1, cover: 0, fly: 0, cloudSpd: 6.0, exp: 1.0 },
};
const cur = {}; for (const k in PRESETS.sunny) cur[k] = PRESETS.sunny[k] instanceof THREE.Color ? PRESETS.sunny[k].clone() : PRESETS.sunny[k];
let target = PRESETS.sunny, currentName = 'sunny';

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xd6ecff, 0x9cbf55, 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2.6); sun.position.set(-1.5, 0, 2).addScaledVector(LIGHT_DIR, 30); sun.target.position.set(-1.5, 0, 2); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 10, far: 50 }); sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
// visible sun disc (sprite, no post-processing)
const sunTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,250,1)'); gr.addColorStop(0.1, 'rgba(255,253,240,1)'); gr.addColorStop(0.15, 'rgba(255,244,200,0.8)'); gr.addColorStop(0.4, 'rgba(255,225,150,0.22)'); gr.addColorStop(1, 'rgba(255,220,140,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, fog: false, depthWrite: false, transparent: true, toneMapped: false }));
sunSprite.position.copy(SUN_DIR).multiplyScalar(500); sunSprite.scale.setScalar(230); sunSprite.renderOrder = -6; scene.add(sunSprite);
const fill = new THREE.DirectionalLight(0xfff4e6, 1.3); fill.position.set(-2, 4, 8); scene.add(fill);

// ---------- sky ----------
const skyU = { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uGlow: { value: 1 }, uSunDir: { value: SUN_DIR } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
  fragmentShader: `uniform vec3 uTop,uHor; uniform float uGlow; uniform vec3 uSunDir; varying vec3 vDir;
  void main(){ vec3 d = normalize(vDir); float t = clamp(d.y,0.0,1.0);
    vec3 c = mix(uHor, uTop, pow(t,0.55));
    float s = max(dot(d,uSunDir),0.0);
    c += uGlow * (vec3(1.0,0.93,0.72)*pow(s,6.0)*0.35 + vec3(1.0,0.97,0.85)*pow(s,40.0)*0.6 + vec3(1.0)*smoothstep(0.9993,0.9997,s)*1.2);
    gl_FragColor = vec4(c,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`
}));
sky.renderOrder = -10; scene.add(sky);

// ---------- canvas textures ----------
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function cloudTex(variant) {
  return canvasTex(512, 256, (g, w, h) => {
    let s = variant * 977 + 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const puffs = [];
    const n = 9 + variant * 2;
    for (let i = 0; i < n; i++) { const x = 90 + r() * 330; const rad = 40 + r() * 55 * (1 - Math.abs(x - 256) / 300); puffs.push([x, 175 - rad * (0.55 + r() * 0.5), rad]); }
    // base shade layer then highlight layer
    for (const pass of [0, 1]) for (const [x, y, rad] of puffs) {
      const gr = g.createRadialGradient(x, y - (pass ? rad * 0.25 : 0), 0, x, y, rad);
      if (pass === 0) { gr.addColorStop(0, 'rgba(225,232,242,1)'); gr.addColorStop(0.7, 'rgba(225,232,242,0.9)'); gr.addColorStop(1, 'rgba(225,232,242,0)'); }
      else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
    }
    // soft flat-ish bottom fade
    g.globalCompositeOperation = 'destination-out';
    const fade = g.createLinearGradient(0, 160, 0, 215); fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fade; g.fillRect(0, 160, w, 96);
  });
}
const cloudTexs = [0, 1, 2, 3].map(cloudTex);
const clouds = [];
function addCloud(x, y, z, sc, grey) {
  const m = new THREE.SpriteMaterial({ map: cloudTexs[clouds.length % 4], transparent: true, depthWrite: false, fog: false, opacity: grey ? 0 : 1 });
  const s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.set(sc, sc * 0.5, 1); s.renderOrder = -5;
  s.userData = { grey, base: x }; scene.add(s); clouds.push(s);
}
for (let i = 0; i < 12; i++) { const a = -1.4 + i * 0.24 + rr(-0.06, 0.06); addCloud(Math.sin(a) * 380, rr(45, 120), -Math.cos(a) * 380, rr(140, 230), false); }
for (let i = 0; i < 22; i++) { const a = -1.6 + i * 0.15; addCloud(Math.sin(a) * 340, rr(40, 150), -Math.cos(a) * 340, rr(180, 280), true); }

// ---------- ground ----------
const groundGeo = new THREE.PlaneGeometry(500, 500, 220, 220); groundGeo.rotateX(-Math.PI / 2);
{
  const p = groundGeo.attributes.position, col = []; const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); p.setY(i, hgt(x, z));
    const v = 0.5 + 0.5 * Math.sin(x * 0.23 + Math.sin(z * 0.17) * 2) * Math.cos(z * 0.19);
    c.setHex(0x86c832).lerp(C(0xb2de46), v * 0.6); col.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); groundGeo.computeVertexNormals();
}
const snowCover = { value: 0 };
const groundMat = new THREE.MeshLambertMaterial({ vertexColors: true });
groundMat.onBeforeCompile = (s) => { s.uniforms.uSnow = snowCover; s.fragmentShader = 'uniform float uSnow;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92,0.94,0.97), uSnow*0.85);'); };
{ const gm = new THREE.Mesh(groundGeo, groundMat); gm.receiveShadow = true; scene.add(gm); }
const snowLayerU = { value: 0 };
const snowLayer = (() => {
  const g = new THREE.PlaneGeometry(90, 70, 260, 200); g.rotateX(-Math.PI / 2); g.translate(0, 0, -25);
  const p = g.attributes.position, lay = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i);
    const bump = 0.07 * Math.sin(x * 1.3 + Math.sin(z * 0.9) * 1.5) * Math.sin(z * 1.1 + x * 0.3) + 0.04 * Math.sin(x * 3.1 + z * 2.3) + 0.05 * Math.sin(x * 0.45 - z * 0.6);
    lay[i] = 0.26 + bump * 0.8; p.setY(i, hgt(x, z) + lay[i]); }
  g.computeVertexNormals(); g.setAttribute('aLayer', new THREE.BufferAttribute(lay, 1));
  const m = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xc8ced8, emissiveIntensity: 0.42 });
  m.onBeforeCompile = (sh) => { sh.uniforms.uCov = snowLayerU; sh.uniforms.uKids = kidPosU; sh.vertexShader = 'attribute float aLayer; uniform float uCov; uniform vec2 uKids[5];\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n float kd = 99.0; for(int i=0;i<5;i++) kd = min(kd, distance(transformed.xz, uKids[i]));\n float keep = uCov * mix(0.15, 1.0, smoothstep(0.25, 0.8, kd));\n transformed.y -= aLayer * (1.0 - keep) + 0.03*(1.0-uCov);'); };
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.visible = false; scene.add(mesh); return mesh; })();

// ---------- grass (instanced shader blades) ----------
const kidHU = { value: [1, 1, 1, 1, 1] }, shadowU = { value: 1 };
const windU = { value: 0.1 }, timeU = { value: 0 }, kidPosU = { value: [0,1,2,3,4].map(() => new THREE.Vector2(99, 99)) }, buryU = { value: 0 };
const lightU = { uAmb: { value: 1 }, uSunI: { value: 1 }, uSunCol: { value: new THREE.Color() } };
{
  const bw = 0.075, ys = [0, 0.35, 0.7], ws = [1, 0.75, 0.42];
  const pos = []; ys.forEach((y, i) => { pos.push(-bw / 2 * ws[i], y, 0, bw / 2 * ws[i], y, 0); }); pos.push(0, 1, 0);
  const idx = [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6];
  const g = new THREE.InstancedBufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const off = [], vr = [];
  const add = (n, x0, x1, z0, z1, h0, h1) => { for (let i = 0; i < n; i++) { off.push(rr(x0, x1), rr(z0, z1), rr(0, Math.PI), rr(h0, h1)); vr.push(rnd()); } };
  add(34000, -9, 9, -3, 6.2, 0.14, 0.3);
  add(60000, -38, 38, -32, 6.2, 0.2, 0.42);
  g.setAttribute('aOff', new THREE.InstancedBufferAttribute(new Float32Array(off), 4));
  g.setAttribute('aVar', new THREE.InstancedBufferAttribute(new Float32Array(vr), 1));
  g.instanceCount = vr.length;
  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: timeU, uWind: windU, uSnow: snowCover, uKids: kidPosU, uKidH: kidHU, uShadow: shadowU, uSunXZ: { value: new THREE.Vector2(-LIGHT_DIR.x, -LIGHT_DIR.z).normalize() }, uTanE: { value: LIGHT_DIR.y / Math.hypot(LIGHT_DIR.x, LIGHT_DIR.z) }, uBury: buryU, uBase: { value: C(0x4f9a1c) }, uTip: { value: C(0xb6e04e) }, ...lightU, ...fogUniforms },
    vertexShader: `attribute vec4 aOff; attribute float aVar; uniform float uTime,uWind,uBury,uKidH[5],uShadow,uTanE; uniform vec2 uKids[5],uSunXZ; varying float vSh; varying float vT,vVar,vDist; ${GLSL_H}
    void main(){ vec2 b = aOff.xy; float gy = hgt(b); vec3 root = vec3(b.x,gy,b.y);
      float d = distance(root, cameraPosition); float fade = 1.0 - smoothstep(24.0,36.0,d);
      float s = sin(aOff.z), c = cos(aOff.z); float hs = aOff.w*fade*(0.85+0.3*aVar);
      float kd = 99.0; float sh = 0.0; vec2 perp = vec2(-uSunXZ.y, uSunXZ.x);
      for(int i=0;i<5;i++){ vec2 dd = b - uKids[i]; kd = min(kd, length(dd));
        float L = uKidH[i] / uTanE; float al = dot(dd, uSunXZ), pp = abs(dot(dd, perp));
        float wdt = 0.36 + 0.1*step(1.6, uKidH[i]) * smoothstep(0.6, 1.0, al / L) * 2.0;
        sh = max(sh, smoothstep(-0.1, 0.25, al) * (1.0 - smoothstep(L*0.8, L*1.05, al)) * (1.0 - smoothstep(wdt*0.6, wdt, pp))); }
      vSh = sh * uShadow;
      hs *= (1.0 - 0.55*sh*uShadow) * mix(0.3, 1.0, smoothstep(0.35, 0.9, kd)) * (1.0 - 0.9*uBury);
      vec3 lp = vec3(position.x*c, position.y*hs, position.x*s);
      float t = position.y; float bend = t*t*hs;
      float gust = 0.5+0.5*sin(uTime*1.3 - b.x*0.35 + b.y*0.12);
      float sway = 0.12 + uWind*(0.35+0.55*gust);
      float wob = sin(uTime*1.1 + aVar*6.283)*(0.05 + 0.08*uWind);
      lp.x += (sway + wob)*bend; lp.z += wob*0.5*bend; lp.y -= sway*sway*0.25*bend;
      vec4 mv = viewMatrix*vec4(root+lp,1.0); vDist = -mv.z; vT = t; vVar = aVar; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uBase,uTip,uSunCol; uniform float uAmb,uSunI,uSnow; varying float vT,vVar,vDist,vSh; ${GLSL_FOG}
    void main(){ vec3 c = mix(uBase,uTip,smoothstep(0.0,1.0,vT)) * (0.82+0.36*vVar);
      c *= uAmb*0.42 + uSunCol*uSunI*0.26*(0.6+0.4*vT);
      c = mix(c, vec3(0.93,0.95,0.98)*(uAmb*0.7+uSunI*0.1), uSnow*smoothstep(0.35,1.0,vT)*0.85);
      c = mix(c, min(c, vec3(0.85))*vec3(0.26,0.36,0.32), vSh);
      gl_FragColor = vec4(applyFog(c,vDist),1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; scene.add(m);
}

// ---------- flowers ----------
window.__flowers = [];
{
  const shape = new THREE.Shape(); const N = 80;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; const r = 0.55 + 0.45 * Math.pow(Math.abs(Math.cos(a * 2.5)), 0.7); const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
  const petalGeo = new THREE.ShapeGeometry(shape); const centerGeo = new THREE.CircleGeometry(0.28, 16); centerGeo.translate(0, 0, 0.02);
  const stemGeo = new THREE.CylinderGeometry(0.008, 0.01, 1, 4); stemGeo.translate(0, -0.5, 0);
  const pal = [0xff8fb8, 0xff7a2e, 0xffd23a, 0xffffff, 0xffffff, 0x7c9cff, 0xc79bff, 0xff5a5a, 0xffe066].map(C);
  const flowers = [];
  for (let i = 0; i < 3200; i++) { const x = rr(-30, 30), z = rr(-28, 5.5); flowers.push([x, z, rr(0.035, 0.07), rr(0.2, 0.38)]); }
  for (let i = 0; i < 26; i++) { const x = rr(-3.4, 3.4), z = rr(3.4, 5.2); if (Math.abs(x) < 0.5) continue; flowers.push([x, z, rr(0.09, 0.17), rr(0.3, 0.5)]); }
  const n = flowers.length;
  const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, n); scene.add(m); window.__flowers.push(m); return m; };
  const flowerMeshes = [];
  const petals = mk(petalGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }));
  const centers = mk(centerGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }));
  const stems = mk(stemGeo, new THREE.MeshLambertMaterial({ color: 0x5e9e2a }));
  const o = new THREE.Object3D(), col = new THREE.Color();
  flowers.forEach(([x, z, s, h], i) => {
    const y = hgt(x, z) + h;
    o.position.set(x, y, z); o.rotation.set(-Math.PI / 2 + rr(0.5, 1.0), rr(-0.4, 0.4), rnd() * 6.28, 'YXZ'); o.rotation.order = 'YXZ';
    o.rotation.set(-Math.PI / 2 + rr(0.55, 1.0), rr(-0.4, 0.4), 0); o.scale.setScalar(s); o.updateMatrix();
    petals.setMatrixAt(i, o.matrix); centers.setMatrixAt(i, o.matrix);
    const pc = pal[Math.floor(rnd() * pal.length)]; petals.setColorAt(i, pc);
    centers.setColorAt(i, pc.getHex() === 0xffffff || pc.getHex() === 0x7c9cff ? C(0xffc21a) : col.copy(pc).lerp(C(0xffd84a), 0.6));
    o.rotation.set(0, 0, 0); o.scale.set(1, h, 1); o.updateMatrix(); stems.setMatrixAt(i, o.matrix);
  });
}

// ---------- blob shadow ----------
const blobTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(30,60,10,0.55)'); gr.addColorStop(0.6, 'rgba(30,60,10,0.25)'); gr.addColorStop(1, 'rgba(30,60,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
function blob(x, z, r, sx = 1) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2 * sx, r * 2), blobMat); m.rotation.x = -Math.PI / 2; m.position.set(x, hgt(x, z) + 0.03, z); scene.add(m); return m; }

// ---------- trees ----------
const swayers = [];
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a36 });
const leafMats = [0x7cc63a, 0x93d24a, 0x6ab832, 0xa8dc58, 0x86cc40].map(h => new THREE.MeshLambertMaterial({ color: h }));
const leafBase = leafMats.map(m => m.color.clone());
const leafSnowU = { value: 0 };
leafMats.forEach(m => { m.onBeforeCompile = (sh) => { sh.uniforms.uLS = leafSnowU;
  sh.vertexShader = 'varying vec3 vWN;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWN = normalize(mat3(modelMatrix) * objectNormal);');
  sh.fragmentShader = 'varying vec3 vWN; uniform float uLS;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97,0.98,1.0), uLS * smoothstep(0.15, 0.55, vWN.y));'); }; });
const blobGeo = new THREE.IcosahedronGeometry(1, 3);
function makeTree(x, z, s, detail = true) {
  const g = new THREE.Group(); g.position.set(x, hgt(x, z) - 0.05, z); g.scale.setScalar(s);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 3.2, 10), trunkMat); trunk.position.y = 1.6; g.add(trunk);
  if (detail) for (const [a, l] of [[0.7, 1.3], [-0.6, 1.1]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.11, l, 7), trunkMat); b.position.set(Math.sin(a) * 0.4, 2.5, 0); b.rotation.z = -a; g.add(b); }
  const crown = new THREE.Group(); crown.position.y = 3.1; g.add(crown);
  const n = detail ? 16 : 7;
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, r = rr(0.3, 1.6), y = rr(-0.3, 1.5) * (1 - r / 2.6);
    const m = new THREE.Mesh(blobGeo, leafMats[Math.floor(rnd() * leafMats.length)]);
    m.position.set(Math.cos(a) * r, y + 0.4, Math.sin(a) * r * 0.85); m.scale.setScalar(rr(0.8, 1.25) * (1.25 - r * 0.2)); crown.add(m);
  }
  crown.userData.ph = rnd() * 6; swayers.push(crown); scene.add(g);
  if (detail) blob(x, z, 2.4 * s);
  return g;
}
makeTree(-7.2, 0.5, 1.25); makeTree(-10.5, -5, 1.1); makeTree(9.5, -3, 1.0); makeTree(13, -9, 1.1);
for (let i = 0; i < 46; i++) { const x = -70 + i * 3.1 + rr(-1, 1); if (Math.abs(x) < 6 && rnd() < 0.5) continue; makeTree(x, rr(-38, -46), rr(0.75, 1.3), false); }
for (let i = 0; i < 20; i++) { makeTree(rr(-60, 60), rr(-52, -62), rr(1.0, 1.5), false); }

// ---------- kids ----------
const SKIN = 0xffd9c2, HAIR = 0x6b3e20, JEANS = 0x6e9ad6, DENIM = 0x5a86c8;
const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
const mats = {}; const M = (c) => (mats[c] ||= lam(c));
const sph = (r, c, ws = 24, hs = 16) => new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), M(c));
const cap = (r, l, c) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), M(c));
const dressTex = canvasTex(128, 128, (g) => { g.fillStyle = '#f7a6c4'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff3f7';
  for (let i = 0; i < 18; i++) { const x = (i * 37) % 128, y = (i * 53) % 128; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283; g.beginPath(); g.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.2, 0, 7); g.fill(); } } });
dressTex.wrapS = dressTex.wrapT = THREE.RepeatWrapping; dressTex.repeat.set(3, 2);
const dressMat = new THREE.MeshLambertMaterial({ map: dressTex });

function makeKid(o) {
  const k = new THREE.Group();
  const body = new THREE.Group(); k.add(body);
  const legCol = o.dress ? SKIN : (o.legs || JEANS);
  const legs = [];
  for (const sx of [-1, 1]) {
    const nBefore = body.children.length;
    const leg = cap(0.068, 0.2, legCol); leg.position.set(sx * 0.08, 0.2, 0); body.add(leg);
    if (o.dress) { const sock = cap(0.07, 0.04, 0xffffff); sock.position.set(sx * 0.08, 0.1, 0); body.add(sock); }
    const shoe = sph(0.09, o.shoes); shoe.scale.set(0.9, 0.6, 1.35); shoe.position.set(sx * 0.085, 0.045, 0.035); body.add(shoe);
    const sole = sph(0.09, 0xffffff); sole.scale.set(0.92, 0.25, 1.37); sole.position.set(sx * 0.085, 0.02, 0.035); body.add(sole);
    const piv = new THREE.Group(); piv.position.set(sx * 0.08, 0.32, 0);
    for (const c of body.children.slice(nBefore)) { c.position.x -= sx * 0.08; c.position.y -= 0.32; piv.add(c); }
    body.add(piv); legs.push(piv);
  }
  const torso = new THREE.Group(); torso.position.y = 0.36; body.add(torso);
  const tors = cap(0.165, 0.16, o.shirt); tors.scale.set(1, 1, 0.82); tors.position.y = 0.17; torso.add(tors);
  if (o.dress) {
    tors.material = dressMat;
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.15 + 0.15 * Math.pow(1 - t, 1.3) + 0.012 * Math.sin(t * 30), 0.28 * t)); }
    const skirt = new THREE.Mesh(new THREE.LatheGeometry(pts.reverse().map(p => p).reverse(), 32), dressMat); skirt.position.y = -0.14; torso.add(skirt);
  }
  if (o.overalls) {
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.05), M(DENIM)); bib.position.set(0, 0.2, 0.125); torso.add(bib);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.012), M(0x4d78b8)); pocket.position.set(0, 0.2, 0.152); torso.add(pocket);
    const hip = cap(0.168, 0.06, DENIM); hip.scale.set(1.0, 1, 0.84); hip.position.y = 0.06; torso.add(hip);
    for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.02), M(DENIM)); st.position.set(sx * 0.085, 0.31, 0.12); st.rotation.x = -0.25; torso.add(st);
      const btn = sph(0.014, 0xffd23a, 8, 6); btn.position.set(sx * 0.07, 0.27, 0.155); torso.add(btn); }
  } else if (!o.dress) { const hip = cap(0.168, 0.04, o.legs || JEANS); hip.scale.set(1, 1, 0.84); hip.position.y = 0.04; torso.add(hip); }
  if (o.collar) { const col = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.025, 8, 20), M(o.collar)); col.rotation.x = Math.PI / 2 - 0.25; col.position.set(0, 0.36, 0.02); torso.add(col); }
  // backpack
  const bp = cap(0.13, 0.1, o.pack); bp.scale.set(1.25, 1, 0.55); bp.position.set(0, 0.2, -0.17); torso.add(bp);
  const flap = cap(0.1, 0.03, o.packFlap || 0xffffff); flap.scale.set(1.2, 1, 0.4); flap.position.set(0, 0.17, -0.225); torso.add(flap);
  for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 16, Math.PI), M(o.pack)); st.rotation.y = Math.PI / 2; st.position.set(sx * 0.11, 0.2, -0.02); st.scale.set(1, 1.15, 1); torso.add(st); }
  // arms
  const arms = [];
  for (const sx of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(sx * 0.17, 0.31, 0); torso.add(piv);
    const sleeve = cap(0.055, 0.17, o.sleeve || o.shirt); sleeve.position.y = -0.12; piv.add(sleeve);
    if (o.dress) sleeve.material = dressMat;
    const hand = sph(0.052, SKIN, 16, 12); hand.position.y = -0.25; piv.add(hand);
    piv.rotation.z = sx * (o.raise ? 2.3 : 0.35); piv.rotation.x = o.raise ? -0.25 : 0;
    piv.userData = { base: piv.rotation.z, baseX: piv.rotation.x, sx }; arms.push(piv);
  }
  // head
  const head = new THREE.Group(); head.position.y = 0.95; body.add(head);
  const skull = sph(0.27, SKIN, 40, 28); skull.scale.set(1.02, 0.95, 0.95); head.add(skull);
  const onHead = (lat, lon, r = 0.27) => new THREE.Vector3(Math.sin(lon) * Math.cos(lat) * r * 1.02, Math.sin(lat) * r * 0.95, Math.cos(lon) * Math.cos(lat) * r * 0.95);
  for (const sx of [-1, 1]) {
    const eye = sph(0.036, 0x2a1a12, 16, 12); eye.position.copy(onHead(-0.08, sx * 0.36, 0.262)); eye.scale.set(0.9, 1.15, 0.5); eye.lookAt(eye.position.clone().multiplyScalar(2)); head.add(eye);
    const hl = sph(0.012, 0xffffff, 8, 6); hl.position.copy(onHead(-0.04, sx * 0.36 + 0.035, 0.275)); head.add(hl);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), new THREE.MeshBasicMaterial({ color: 0xff8fa0, transparent: true, opacity: 0.45, depthWrite: false }));
    bl.position.copy(onHead(-0.25, sx * 0.58, 0.272)); bl.lookAt(bl.position.clone().multiplyScalar(2)); bl.scale.y = 0.75; head.add(bl);
    const ear = sph(0.055, SKIN, 12, 10); ear.position.set(sx * 0.27, -0.02, 0); ear.scale.set(0.5, 1, 0.8); head.add(ear);
  }
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20, Math.PI, Math.PI), M(0xc9384a)); mouth.position.copy(onHead(-0.3, 0, 0.27)); mouth.lookAt(mouth.position.clone().multiplyScalar(2)); mouth.position.multiplyScalar(1.005); head.add(mouth);
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16, Math.PI, Math.PI), M(0xff8a8a)); tongue.position.copy(mouth.position).multiplyScalar(1.004); tongue.quaternion.copy(mouth.quaternion); tongue.translateY(-0.02); head.add(tongue);
  // hair
  const hair = sph(0.292, o.hair || HAIR, 40, 28); hair.position.set(0, 0.05, -0.045); hair.scale.set(1.02, 0.97, 1); head.add(hair);
  for (let i = -2; i <= 2; i++) { const b = sph(0.085, o.hair || HAIR, 16, 12); b.position.copy(onHead(0.74 - Math.abs(i) * 0.04, i * 0.3, 0.255)); b.scale.set(1.2, 0.6, 0.7); b.lookAt(b.position.clone().multiplyScalar(2)); head.add(b); }
  if (o.boy) { const tuft = sph(0.06, HAIR, 12, 10); tuft.position.set(0.02, 0.33, 0.02); tuft.scale.set(0.6, 1, 0.6); tuft.rotation.z = -0.4; head.add(tuft); }
  if (o.bob) { const back = sph(0.27, HAIR, 32, 20); back.position.set(0, -0.08, -0.08); back.scale.set(1.1, 0.9, 0.95); head.add(back); }
  if (o.braids) for (const sx of [-1, 1]) for (let j = 0; j < 4; j++) { const b = sph(0.055 - j * 0.004, HAIR, 12, 10); b.position.set(sx * (0.25 + j * 0.01), -0.12 - j * 0.085, -0.08); head.add(b); if (j === 0) { const bow = sph(0.03, 0xff7aa8, 10, 8); bow.position.set(sx * 0.27, -0.06, -0.06); head.add(bow); } }
  if (o.pigtails) for (const sx of [-1, 1]) { const p = sph(0.085, HAIR, 16, 12); p.position.set(sx * 0.3, 0.08, -0.06); p.scale.set(0.8, 1.2, 0.8); p.rotation.z = sx * -0.5; head.add(p); const bow = sph(0.032, 0xff7aa8, 10, 8); bow.position.set(sx * 0.26, 0.16, -0.03); head.add(bow); }
  k.traverse(m => { if (m.isMesh && !m.material.transparent) m.castShadow = true; });
  k.userData = { torso, head, arms, legs, body, ph: rnd() * 6 };
  return k;
}
const kidDefs = [
  { x: -1.15, z: 2.3, ry: 0.25, shirt: 0xffd84a, collar: 0xffe78a, shoes: 0xff7a3a, pack: 0xa77be0, packFlap: 0xc49cf2, braids: true, raise: false, wave: 0 }, // yellow polo (braids in image front-left)
  { x: 0.15, z: 2.6, ry: 0.0, shirt: 0xa9cff0, sleeve: 0xa9cff0, overalls: true, legs: DENIM, shoes: 0x7a8aa0, pack: 0xf3a63a, boy: true, raise: true },
  { x: 1.45, z: 2.2, ry: -0.3, shirt: 0xf7a6c4, dress: true, shoes: 0xff9fbf, pack: 0x7dcfa8, pigtails: true, bob: true, raise: false, wave: 1 },
  { x: -0.75, z: -0.3, ry: 0.15, shirt: 0xffa040, shoes: 0x4a6fb0, pack: 0x5b8fd8, boy: true, raise: true },
  { x: 1.0, z: -0.6, ry: -0.15, shirt: 0xffd23a, shoes: 0xff9fbf, pack: 0xff8a5a, braids: true, raise: true },
];
const kids = kidDefs.map(d => { const k = makeKid(d); k.position.set(d.x, hgt(d.x, d.z) - 0.01, d.z); k.rotation.y = d.ry; k.scale.setScalar(1.18); scene.add(k);
  Object.assign(k.userData, { blob: blob(d.x, d.z + 0.05, 0.38, 1.1), home: new THREE.Vector2(d.x, d.z), homeRy: d.ry, heading: d.ry, act: 'idle', timer: 2 + Math.random() * 4, w: { walk: 0, sit: 0, look: 0 }, goal: null, walkPh: 0 });
  return k; });
const UMB_COLS = [0xff6b8a, 0xffc93a, 0x5aa9ff, 0x7ad46a, 0xb98aff];
kids.forEach((kd, i) => {
  const g = new THREE.Group(); const col = UMB_COLS[i % 5];
  const can = new THREE.Group(); can.position.y = 0.62; g.add(can);
  const hex = '#' + new THREE.Color(col).getHexString(), light = '#' + new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.55).getHexString();
  const tex = canvasTex(128, 8, (c, w) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? light : hex; c.fillRect(k * 16, 0, 16, 8); } });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  dome.scale.y = 0.62; dome.position.y = -0.1; can.add(dome);
  const tip = sph(0.03, 0xffffff, 8, 6); tip.position.y = 0.22; can.add(tip);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.66, 6), M(0x8a6a50)); shaft.position.y = 0.31; g.add(shaft);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 12, Math.PI), M(0x8a6a50)); handle.rotation.z = Math.PI; handle.position.set(0.04, 0, 0); g.add(handle);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; }); g.visible = false; kd.add(g); kd.userData.umb = { g, can };
});
const ACTS = ['idle', 'walk', 'walk', 'walk', 'walk', 'sit', 'lie', 'lie', 'look', 'look'];
function pickGoal(kd) { const u = kd.userData;
  for (let tries = 0; tries < 12; tries++) { const a = Math.random() * 6.283, r = 0.6 + Math.random() * 1.4; const g = new THREE.Vector2(THREE.MathUtils.clamp(u.home.x + Math.cos(a) * r, -2.6, 2.6), THREE.MathUtils.clamp(u.home.y + Math.sin(a) * r, -2.8, 2.9));
    if (kids.every(o => o === kd || (Math.hypot(o.position.x - g.x, o.position.z - g.y) > 0.75 && (!o.userData.goal || o.userData.goal.distanceTo(g) > 0.75)))) return g; }
  return null; }
function setAct(kd, act) { const u = kd.userData; u.act = act; u.timer = act === 'lie' ? 12 + Math.random() * 6 : 6 + Math.random() * 6; u.goal = act === 'walk' ? pickGoal(kd) : null; if (act === 'walk' && !u.goal) u.act = 'idle'; }
window.kidAct = (i, a) => setAct(kids[i], a);
const angLerp = (a, b, m) => { let d = ((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return a + Math.max(-m, Math.min(m, d)); };

// ---------- butterflies ----------
const wingTex = (a, b) => canvasTex(64, 64, (g) => { g.fillStyle = a; g.beginPath(); g.ellipse(32, 22, 26, 20, -0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(26, 46, 16, 14, 0.4, 0, 7); g.fill(); g.fillStyle = b; g.beginPath(); g.ellipse(36, 20, 12, 9, -0.3, 0, 7); g.fill(); g.strokeStyle = '#3a2a1a'; g.lineWidth = 3; g.beginPath(); g.ellipse(32, 22, 26, 20, -0.3, 0, 7); g.stroke(); });
const wingTexs = [wingTex('#ffb52e', '#fff1a0'), wingTex('#ffd54a', '#ffffff'), wingTex('#8ec8ff', '#e6f4ff'), wingTex('#ff9ac8', '#fff')];
const flies = [];
for (let i = 0; i < 7; i++) {
  const f = new THREE.Group(); const mat = new THREE.MeshBasicMaterial({ map: wingTexs[i % 4], transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.05 });
  const wg = new THREE.PlaneGeometry(0.14, 0.14); wg.translate(0.07, 0, 0);
  const L = new THREE.Mesh(wg, mat), R = new THREE.Mesh(wg, mat); R.scale.x = -1; f.add(L, R);
  const bodyM = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.07, 4, 6), M(0x3a2a1a)); bodyM.rotation.x = Math.PI / 2; f.add(bodyM);
  f.userData = { L, R, cx: rr(-4, 4), cy: rr(1.3, 2.6), cz: rr(-2, 2.5), ax: rr(1.2, 2.5), az: rr(0.6, 1.5), sp: rr(0.15, 0.3), ph: rnd() * 6 };
  scene.add(f); flies.push(f);
}

// ---------- rain (GPU streaks + splashes) ----------
const rainU = { uKids: kidPosU, uUmb: { value: 0 }, uTime: timeU, uOpacity: { value: 0 }, uSlant: { value: new THREE.Vector2(0.12, 0.02) }, ...fogUniforms };
{
  const N = 14000; const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3)); g.setIndex([0, 1, 2, 1, 3, 2]);
  const a = new Float32Array(N * 4); for (let i = 0; i < N; i++) { a.set([rr(-16, 16), rr(-18, 7), rnd(), rr(0.8, 1.2)], i * 4); }
  g.setAttribute('aDrop', new THREE.InstancedBufferAttribute(a, 4)); g.instanceCount = N;
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: rainU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aDrop; uniform float uTime; uniform vec2 uSlant; uniform vec2 uKids[5]; uniform float uUmb; varying vec2 vUv; varying float vDist,vNear; ${GLSL_H}
    void main(){ float H = 14.0; float fall = mod(aDrop.z*H + uTime*13.0*aDrop.w, H);
      vec2 xz = aDrop.xy + uSlant*fall; float y = hgt(xz) + H - fall;
      vec3 head = vec3(xz.x,y,xz.y); vec3 dir = normalize(vec3(uSlant.x,-1.0,uSlant.y));
      vec3 side = normalize(cross(dir, normalize(cameraPosition-head)));
      vec3 p = head - dir*0.55*aDrop.w*position.y + side*position.x*0.016;
      vec4 mv = viewMatrix*vec4(p,1.0); vDist = -mv.z; vNear = smoothstep(0.6,2.0,vDist);
      float kd = 99.0; for(int i=0;i<5;i++) kd = min(kd, distance(xz, uKids[i]));
      if (kd < 0.68 && y < hgt(xz) + 1.85) vNear *= 1.0 - uUmb; vUv = position.xy; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uOpacity; varying vec2 vUv; varying float vDist,vNear; ${GLSL_FOG}
    void main(){ float a = (1.0-abs(vUv.x)) * pow(1.0-vUv.y,0.7) * vNear * uOpacity * 0.6;
      vec3 c = applyFog(vec3(0.93,0.96,1.0), vDist*0.35);
      gl_FragColor = vec4(c,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
  m.frustumCulled = false; scene.add(m);

}


// ---------- snow (GPU points) ----------
const snowU = { uTime: timeU, uOpacity: { value: 0 }, uWind: windU, uScale: scaleU, ...fogUniforms };
{
  const N = 10000; const g = new THREE.BufferGeometry(); const p = new Float32Array(N * 3), a = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { p.set([rr(-20, 20), rnd(), rr(-22, 7)], i * 3); a.set([rnd(), rr(0.6, 1.4)], i * 2); }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aR', new THREE.BufferAttribute(a, 2));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: snowU, transparent: true, depthWrite: false,
    vertexShader: `attribute vec2 aR; uniform float uTime, uScale, uWind; varying float vA, vDist; ${GLSL_H}
    void main(){ float H = 12.0; float t = uTime;
      float fall = mod(position.y*H + t*0.75*(0.7+0.3*aR.y), H);
      vec2 xz = position.xz + vec2(sin(t*0.45 + aR.x*40.0)*0.7 + sin(t*0.9+aR.x*13.0)*0.25, cos(t*0.38 + aR.x*27.0)*0.6);
      xz.x += uWind*fall*0.5;
      vec3 wp = vec3(xz.x, hgt(xz) + H - fall, xz.y);
      vec4 mv = viewMatrix*vec4(wp,1.0); vDist = -mv.z;
      float px = 0.07*aR.y*uScale/max(vDist,0.1);
      vA = clamp(px/2.0,0.0,1.0) * smoothstep(0.5,1.5,vDist) * smoothstep(0.0,0.6,H-fall) * smoothstep(0.0,0.3,fall);
      gl_PointSize = max(px,2.0); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uOpacity; varying float vA, vDist; ${GLSL_FOG}
    void main(){ float d = length(gl_PointCoord*2.0-1.0); float a = pow(1.0-smoothstep(0.0,1.0,d),1.5);
      gl_FragColor = vec4(applyFog(vec3(1.0),vDist*0.4), a*vA*uOpacity);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
  pts.frustumCulled = false; scene.add(pts);
}

// ---------- wind lines (shader ribbons, BotW style) ----------
const windLineU = { uTime: timeU, uOpacity: { value: 0 }, ...fogUniforms };
{
  const SEG = 120, N = 22; const g = new THREE.InstancedBufferGeometry();
  const pos = [], idx = [];
  for (let i = 0; i <= SEG; i++) { pos.push(i / SEG, -1, 0, i / SEG, 1, 0); if (i < SEG) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const a = new Float32Array(N * 4), b = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { a.set([rr(-24, -12), rr(0.3, 2.6), rr(-12, 4.0), rr(22, 30)], i * 4); b.set([rnd(), rr(0.22, 0.4), rnd(), rnd() < 0.45 ? 1 : 0], i * 4); }
  g.setAttribute('aA', new THREE.InstancedBufferAttribute(a, 4)); g.setAttribute('aB', new THREE.InstancedBufferAttribute(b, 4)); g.instanceCount = N;
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: windLineU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute vec4 aA, aB; uniform float uTime; varying float vS, vV, vDist, vOn; ${GLSL_H}
    vec3 path(float u){ float L = aA.w; vec3 p = vec3(aA.x + u*L, 0.0, aA.z);
      p.y = aA.y + sin(u*5.0 + aB.x*20.0)*0.35 + sin(u*11.0+aB.z*9.0)*0.12;
      p.z += sin(u*3.5 + aB.z*13.0)*0.9;
      float u0 = 0.35 + aB.z*0.3; float lw = 0.07;
      if (aB.w > 0.5 && u > u0 && u < u0+lw) { float ang = (u-u0)/lw*6.2832; float r = 0.45;
        p.x += -sin(ang)*r; p.y += (1.0-cos(ang))*r; }
      p.y += hgt(p.xz); return p; }
    void main(){ float u = position.x; float cyc = uTime*aB.y*0.55 + aB.x; float k = floor(cyc); float c = fract(cyc);
      float head = c*1.5 - 0.1; float len = 0.22;
      float s = (u - (head-len))/len; vS = s; vOn = step(0.0,s)*step(s,1.0);
      vec3 p = path(u); vec3 tng = normalize(path(u+0.01)-p);
      vec3 side = normalize(cross(tng, normalize(cameraPosition-p)));
      float w = 0.045*smoothstep(0.0,0.5,s)*smoothstep(1.0,0.85,s);
      p += vec3(0.0, sin(k*3.7)*0.6, cos(k*5.1)*1.2) + side*position.y*w;
      vec4 mv = viewMatrix*vec4(p,1.0); vDist = -mv.z; vV = position.y; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uOpacity; varying float vS, vV, vDist, vOn; ${GLSL_FOG}
    void main(){ if(vOn<0.5) discard; float a = smoothstep(0.0,0.7,vS)*smoothstep(1.0,0.9,vS) * (1.0-vV*vV);
      a *= smoothstep(1.0,3.0,vDist);
      gl_FragColor = vec4(applyFog(vec3(1.0),vDist*0.5), a*uOpacity*0.9);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }` }));
  m.frustumCulled = false; scene.add(m);
}

// ---------- audio ----------
const AUD = {}; for (const n of ['sunny', 'kids', 'overcast', 'rain', 'snow', 'wind']) { const a = new Audio(`./audio/${n}.mp3`); a.loop = true; a.volume = 0; a.preload = 'auto'; AUD[n] = a; }
const MIX = { sunny: { sunny: 0.5, kids: 0.18 }, overcast: { overcast: 0.35, sunny: 0.08 }, rain: { rain: 0.8 }, snow: { snow: 0.35 }, fog: { overcast: 0.15, sunny: 0.12 }, wind: { wind: 0.7, sunny: 0.1 } };
let audioOn = false;
function startAudio() { if (audioOn) return; audioOn = true; for (const a of Object.values(AUD)) a.play().catch(() => {}); }
addEventListener('pointerdown', startAudio, { once: false });

// ---------- UI ----------
const btns = [...document.querySelectorAll('#ui button')];
function setWeather(name, instant = false) {
  if (!PRESETS[name]) return; target = PRESETS[name]; currentName = name;
  btns.forEach(b => b.classList.toggle('on', b.dataset.w === name));
  if (instant) for (const k in target) target[k] instanceof THREE.Color ? cur[k].copy(target[k]) : (cur[k] = target[k]);
}
btns.forEach(b => b.addEventListener('click', () => { startAudio(); setWeather(b.dataset.w); }));
window.setWeather = setWeather;
setWeather(params.get('w') || 'sunny', true);

// ---------- loop ----------
function onResize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  scaleU.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))); }
addEventListener('resize', onResize);
let simTime = 0, cloudOff = 0, accum = 0;
function update(dt) {
  simTime += dt; timeU.value = simTime;
  const k = 1 - Math.exp(-dt * 1.4);
  for (const key in target) { const v = target[key]; if (v instanceof THREE.Color) cur[key].lerp(v, k); else cur[key] += (v - cur[key]) * k; }
  skyU.uTop.value.copy(cur.skyTop); skyU.uHor.value.copy(cur.skyHor); skyU.uGlow.value = cur.glow;
  sun.intensity = cur.sun; fill.intensity = 0.35 + cur.sun * 0.38; sun.color.copy(cur.sunCol); hemi.intensity = cur.hemi;
  scene.fog.color.copy(cur.fogCol); scene.fog.density = cur.fogD;
  fogUniforms.uFogColor.value.copy(cur.fogCol); fogUniforms.uFogDensity.value = cur.fogD;
  lightU.uAmb.value = cur.hemi; lightU.uSunI.value = cur.sun; lightU.uSunCol.value.copy(cur.sunCol);
  windU.value = cur.wind; snowCover.value = cur.cover;
  accum += ((target.cover || 0) - accum) * (1 - Math.exp(-dt * (target.cover ? 0.45 : 0.9)));
  snowLayerU.value = accum; snowLayer.visible = accum > 0.005; for (const f of window.__flowers) f.position.y = -0.32 * accum; buryU.value = accum; leafSnowU.value = accum;
  kids.forEach((kd, i) => { kidPosU.value[i].set(kd.position.x, kd.position.z); const w = kd.userData.w;
    kidHU.value[i] = (1.45 - 0.55 * (w.sit || 0) - 0.55 * (w.lie || 0)) * 1.0 + 0.45 * THREE.MathUtils.smoothstep(cur.rain, 0.05, 0.6) * (1 - (w.lie || 0)); });
  const shStr = THREE.MathUtils.clamp((cur.sun - 0.4) / 2.0, 0, 1) * (1 - THREE.MathUtils.clamp(cur.fogD / 0.06, 0, 1) * 0.8);
  shadowU.value = shStr; sun.shadow.intensity = shStr; blobMat.opacity = 1 - 0.45 * shStr;
  sunSprite.material.opacity = THREE.MathUtils.clamp(cur.glow, 0, 1);
  rainU.uOpacity.value = cur.rain; rainU.uUmb.value = THREE.MathUtils.smoothstep(cur.rain, 0.3, 0.9); snowU.uOpacity.value = cur.snow; windLineU.uOpacity.value = cur.lines;
  leafMats.forEach((m, i) => m.color.copy(leafBase[i]).lerp(C(0xe6eef0), accum * 0.2));
  cloudOff += dt * cur.cloudSpd;
  for (const c of clouds) { const span = 900; let x = c.userData.base + cloudOff; x = ((x + span / 2) % span + span) % span - span / 2; c.position.x = x;
    c.material.color.copy(cur.cloudCol); c.material.opacity = (c.userData.grey ? cur.grey : 1) * cur.cloud; }
  for (const s of swayers) { const ph = s.userData.ph; s.rotation.z = Math.sin(simTime * 0.7 + ph) * 0.015 - cur.wind * (0.07 + 0.045 * Math.sin(simTime * 1.1 + ph) + 0.015 * Math.sin(simTime * 1.9 + ph * 2)); s.rotation.x = Math.sin(simTime * 0.53 + ph) * 0.01 * (1 + cur.wind * 3.5); }
  for (const kd of kids) { const u = kd.userData, t = simTime + u.ph, w = u.w;
    u.timer -= dt; if (u.timer <= 0 || (u.act === 'walk' && !u.goal)) setAct(kd, ACTS[Math.floor(Math.random() * ACTS.length)]);
    const ease = 1 - Math.exp(-dt * 1.5);
    w.lie ??= 0;
    const tw = { walk: u.act === 'walk' ? 1 : 0, look: u.act === 'look' ? 1 : 0,
      sit: (u.act === 'sit' || u.act === 'lie' || w.lie > 0.08) ? 1 : 0, lie: (u.act === 'lie' && w.sit > 0.92) ? 1 : 0 };
    if (u.act === 'walk' && (w.sit > 0.05)) tw.walk = 0;
    for (const key in tw) w[key] += (tw[key] - w[key]) * (key === 'lie' ? 1 - Math.exp(-dt * 0.9) : ease);
    // walking (only once fully standing)
    let moving = 0;
    if (u.act === 'walk' && u.goal && w.sit < 0.05) {
      const dx = u.goal.x - kd.position.x, dz = u.goal.y - kd.position.z, dist = Math.hypot(dx, dz);
      if (dist < 0.06) { u.goal = null; u.act = 'idle'; u.timer = 3 + Math.random() * 4; }
      else { let want = Math.atan2(dx, dz);
        for (const o of kids) if (o !== kd) { const ox = kd.position.x - o.position.x, oz = kd.position.z - o.position.z, od = Math.hypot(ox, oz); if (od < 0.7) want = angLerp(want, Math.atan2(ox, oz), 0.6 * (0.7 - od) / 0.7 * 3); }
        u.heading = angLerp(u.heading, want, dt * 1.4);
        const facing = Math.max(0, Math.cos(want - u.heading)); const sp = 0.28 * w.walk * facing; moving = sp;
        kd.position.x += Math.sin(u.heading) * sp * dt; kd.position.z += Math.cos(u.heading) * sp * dt; }
    } else u.heading = angLerp(u.heading, u.homeRy, dt * 0.8);
    kd.rotation.y = u.heading; kd.position.y = hgt(kd.position.x, kd.position.z) - 0.01;
    u.blob.position.set(kd.position.x, hgt(kd.position.x, kd.position.z) + 0.03, kd.position.z + 0.05);
    u.walkPh += dt * moving * 22; const wc = Math.sin(u.walkPh), ww = Math.min(1, moving / 0.2);
    const ws = w.sit, wl = w.look;
    const wlie = w.lie, ang = 1.42 * wlie;
    u.legs.forEach((l, i) => { l.rotation.x = (i ? 1 : -1) * wc * 0.45 * ww - 1.45 * ws - 0.12 * wlie; l.rotation.z = (i ? 1 : -1) * 0.12 * ws; });
    u.body.position.y = -0.255 * ws - 0.07 * wlie + Math.abs(Math.cos(u.walkPh)) * 0.012 * ww;
    u.torso.scale.y = 1 + Math.sin(t * 1.6) * 0.012; u.torso.rotation.x = -0.12 * wl - 0.05 * ws * (1 - wlie) - ang;
    u.head.rotation.x = -0.42 * wl - ang * 0.9; u.head.rotation.z = Math.sin(t * 0.6) * 0.04 * (1 - wl); const hb = 0.59 + Math.sin(t * 1.6) * 0.004; u.head.position.set(0, 0.36 + hb * Math.cos(ang), -hb * Math.sin(ang));
    const down = Math.min(1, Math.max(ww, ws, w.walk));
    u.arms.forEach((a, i) => { const sx = a.userData.sx; const zr = a.userData.base * (1 - down) + sx * 0.3 * down;
      a.rotation.z = zr + sx * Math.sin(t * 1.2 + i * 1.3) * 0.1 * (1 - down);
      a.rotation.x = (a.userData.baseX || 0) * (1 - down) + (i ? -1 : 1) * wc * 0.4 * ww - 0.5 * ws; }); }
  const umbOn = THREE.MathUtils.smoothstep(cur.rain, 0.05, 0.6);
  for (const kd of kids) { const u = kd.userData, U = u.umb, wl2 = u.w.lie || 0;
    U.g.visible = umbOn > 0.01; if (!U.g.visible) continue;
    const open = THREE.MathUtils.smoothstep(umbOn, 0.35, 1.0);
    U.g.scale.setScalar(Math.min(1, umbOn * 1.6)); U.can.scale.set(0.15 + 0.85 * open, 1 + 1.6 * (1 - open), 0.15 + 0.85 * open);
    const by = u.body.position.y;
    U.g.position.set(THREE.MathUtils.lerp(0.27, 0.62, wl2), THREE.MathUtils.lerp(0.88 + by, 0.18, wl2), THREE.MathUtils.lerp(0, 0.15, wl2));
    U.g.rotation.set(0, 0, -1.25 * wl2);
    const a = u.arms[1], k = umbOn * (1 - wl2); a.rotation.z += (2.75 - a.rotation.z) * k; a.rotation.x *= 1 - k; }
  for (const f of flies) { const u = f.userData, t = simTime * u.sp + u.ph;
    const vis = cur.fly; f.visible = vis > 0.02; f.scale.setScalar(Math.max(vis, 0.001));
    const x = u.cx + Math.sin(t) * u.ax, z = u.cz + Math.sin(t * 1.7) * u.az, y = u.cy + Math.sin(t * 2.3) * 0.25;
    const nx = u.cx + Math.sin(t + 0.05) * u.ax, nz = u.cz + Math.sin((t + 0.05) * 1.7) * u.az;
    f.position.set(x, y, z); f.rotation.y = Math.atan2(nx - x, nz - z);
    const flap = Math.sin(simTime * 9 + u.ph * 3) * 0.9; u.L.rotation.z = flap; u.R.rotation.z = -flap; f.rotation.z = 0; }
  if (audioOn) { const mix = MIX[currentName]; for (const n in AUD) { const tv = mix[n] || 0; const a = AUD[n]; a.volume = Math.min(1, Math.max(0, a.volume + (tv - a.volume) * Math.min(1, dt * 1.2))); } }
}
let last = performance.now();
function frame() { const now = performance.now(); const dt = Math.min((now - last) / 1000, 0.05); last = now; controls.update(); update(dt); renderer.render(scene, camera); }
onResize();
window.simulate = (sec, step = 1 / 30) => { for (let t = 0; t < sec; t += step) update(step); renderer.render(scene, camera); };
window.renderOnce = () => renderer.render(scene, camera);
if (params.has('shot')) { renderer.render(scene, camera); window.__ready = true; }
else { renderer.setAnimationLoop(frame); window.__ready = true; }

