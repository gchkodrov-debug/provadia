// PROVADIA — the room pages' living backdrop.
// One living object holds the stage on every room page, per the founder's
// reference standard (the Secret Side): the town's own coin — the market-
// published face in front, the Fortress P on the reverse — turning slowly
// in one warm light (45° upper-left) over a dark field of drifting salt.
// It renders no numbers and makes no claims; it is the room's air.
// Boot contract: reports module start + first frame to __townBoot; on any
// engine failure it engages the still town (locked), exactly as Page 1.
import * as THREE from './lib/three.module.min.js';

// Assets resolve against this module's own home (the town root), never
// against the room page that loaded it.
const BASE = new URL('./', import.meta.url);
const asset = (p) => new URL(p, BASE).href;

if (window.__townBoot) window.__townBoot.moduleStarted();

try {
  const stage = document.getElementById('stage');
  if (!stage) throw new Error('no stage');

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141210);
  scene.fog = new THREE.FogExp2(0x141210, 0.028);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0.6, 12.5);
  camera.lookAt(0, 0.2, 0);

  // one warm light, 45° upper-left — the town's single light, every page
  const key = new THREE.DirectionalLight(0xffe9b8, 2.6);
  key.position.set(-7, 8, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xc9a227, 60, 60);
  rim.position.set(6, -3, -6);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x40331a, 1.1));

  // ---- the coin ----
  const coin = new THREE.Group();
  const R = 3.1, H = 0.36;
  const goldSide = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.92, roughness: 0.34 });
  const facePlain = new THREE.MeshStandardMaterial({ color: 0x8a6a1c, metalness: 0.9, roughness: 0.4 });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, H, 96, 1, false),
    [goldSide, facePlain, facePlain]
  );
  body.rotation.x = Math.PI / 2;
  coin.add(body);

  const loader = new THREE.TextureLoader();
  const mkFace = (tex, z, flip) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.995, 96),
      new THREE.MeshStandardMaterial({ map: tex, metalness: 0.55, roughness: 0.42 })
    );
    m.position.z = z;
    if (flip) m.rotation.y = Math.PI;
    coin.add(m);
  };
  loader.load(asset('marks/front-published.webp'), (t) => mkFace(t, H / 2 + 0.006, false));

  // reverse: the Fortress P struck on dark bronze, drawn from the town's
  // own mark — the letter that never leaves.
  const backCanvas = document.createElement('canvas');
  backCanvas.width = backCanvas.height = 1024;
  const bx = backCanvas.getContext('2d');
  const grad = bx.createRadialGradient(512, 512, 60, 512, 512, 512);
  grad.addColorStop(0, '#4a3608');
  grad.addColorStop(0.75, '#2c1f05');
  grad.addColorStop(1, '#191104');
  bx.fillStyle = grad;
  bx.fillRect(0, 0, 1024, 1024);
  bx.strokeStyle = 'rgba(201,162,39,.85)';
  bx.lineWidth = 10;
  bx.beginPath(); bx.arc(512, 512, 478, 0, Math.PI * 2); bx.stroke();
  bx.lineWidth = 3;
  bx.beginPath(); bx.arc(512, 512, 448, 0, Math.PI * 2); bx.stroke();
  const pImg = new Image();
  pImg.onload = () => {
    bx.save();
    bx.globalAlpha = 0.92;
    const w = 560, h = 560 * (pImg.height / pImg.width || 1);
    bx.drawImage(pImg, 512 - w / 2, 512 - h / 2, w, h);
    bx.restore();
    const t = new THREE.CanvasTexture(backCanvas);
    mkFace(t, -H / 2 - 0.006, true);
  };
  pImg.src = asset('marks/fortress-p.png');

  coin.position.set(0, 0.35, 0);
  scene.add(coin);

  // ---- drifting salt ----
  const N = 420;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 46;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 26;
    pos[i * 3 + 2] = -4 - Math.random() * 22;
  }
  const saltGeo = new THREE.BufferGeometry();
  saltGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const salt = new THREE.Points(saltGeo, new THREE.PointsMaterial({
    color: 0xf4efe6, size: 0.055, transparent: true, opacity: 0.5, depthWrite: false
  }));
  scene.add(salt);

  // a low golden glow the coin turns above
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 256;
  const gx = glowCanvas.getContext('2d');
  const gg = gx.createRadialGradient(128, 128, 8, 128, 128, 128);
  gg.addColorStop(0, 'rgba(201,162,39,.5)');
  gg.addColorStop(1, 'rgba(201,162,39,0)');
  gx.fillStyle = gg;
  gx.fillRect(0, 0, 256, 256);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 15),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(glowCanvas), transparent: true, depthWrite: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -3.4;
  scene.add(glow);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clockT = new THREE.Clock();
  let booted = false;
  function tick() {
    requestAnimationFrame(tick);
    const t = clockT.elapsedTime;
    coin.rotation.y = t * 0.22;
    coin.rotation.x = Math.sin(t * 0.3) * 0.14;
    coin.position.y = 0.35 + Math.sin(t * 0.8) * 0.16;
    salt.rotation.y = t * 0.008;
    renderer.render(scene, camera);
    if (!booted) {
      booted = true;
      if (window.__townBoot) window.__townBoot.markBooted();
    }
  }
  tick();
} catch (err) {
  if (window.console) console.error(err);
  if (window.__townBoot) window.__townBoot.engageFallback('engine', true);
}
