// SOLNIK — living-entity.js (SPECIMEN 01, preview-only)
// Page-body half of the Living Entity Engine (Gemini #109). Three.js transparent
// overlay + rigged GLB; his brain lives at wss://brain.provadiacoin.com/v1/solnik.
// Constitutional fences: guidance/conversation only; summon/mute/dismiss/disable
// are the visitor's, always within reach. Loads ONLY behind ?solnik=preview.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BASE = new URL('.', import.meta.url).pathname; // /solnik/
const BRAIN = 'wss://brain.provadiacoin.com/v1/solnik';
const $ = (s, r) => (r || document).querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const store = {
  get disabled() { return localStorage.getItem('solnik_disabled') === '1'; },
  get muted() { return localStorage.getItem('solnik_muted') === '1'; },
  set muted(v) { localStorage.setItem('solnik_muted', v ? '1' : '0'); },
  visitor() { let v = localStorage.getItem('solnik_visitor'); if (!v) { v = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('solnik_visitor', v); } return v; },
};

export async function initSolnik() {
  if (store.disabled) return renderReenable();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.createElement('div');
  root.id = 'solnik-root';
  root.innerHTML = `
  <style>
    #solnik-root{position:fixed;inset:0;z-index:2147483000;pointer-events:none;font-family:Georgia,serif}
    #solnik-canvas{position:absolute;inset:0;width:100%;height:100%}
    #solnik-caption{position:absolute;max-width:290px;background:rgba(20,16,10,.92);color:#E9DDC6;border:1px solid #C9A227;
      border-radius:12px;padding:9px 12px;font-size:14.5px;line-height:1.45;opacity:0;transition:opacity .25s;pointer-events:none;box-shadow:0 6px 24px rgba(0,0,0,.45)}
    #solnik-caption.on{opacity:1}
    #solnik-pill{position:absolute;right:14px;bottom:14px;pointer-events:auto;display:flex;gap:6px;align-items:center;
      background:rgba(20,16,10,.92);border:1px solid #C9A227;border-radius:999px;padding:6px 8px;box-shadow:0 6px 24px rgba(0,0,0,.45)}
    #solnik-pill button{background:#30251B;color:#E9DDC6;border:1px solid #6b5626;border-radius:999px;padding:6px 11px;font:13px Georgia,serif;cursor:pointer}
    #solnik-pill button:hover{background:#453219}#solnik-pill button[aria-pressed="true"]{background:#C9A227;color:#141210}
    #solnik-pill .who{color:#C9A227;font-size:12.5px;padding:0 4px;letter-spacing:.04em}
    #solnik-talk{position:absolute;right:14px;bottom:64px;pointer-events:auto;display:none;background:rgba(20,16,10,.95);
      border:1px solid #C9A227;border-radius:12px;padding:8px;box-shadow:0 6px 24px rgba(0,0,0,.45)}
    #solnik-talk.on{display:flex;gap:6px}
    #solnik-talk input{background:#141210;color:#E9DDC6;border:1px solid #6b5626;border-radius:8px;padding:7px 9px;font:14px Georgia,serif;width:210px}
    #solnik-talk button{background:#C9A227;color:#141210;border:0;border-radius:8px;padding:7px 12px;font:13px Georgia,serif;cursor:pointer}
    #solnik-poster{position:absolute;right:14px;bottom:64px;width:190px;border:1px solid #C9A227;border-radius:12px;overflow:hidden;background:#141210;color:#E9DDC6}
    #solnik-poster img{width:100%;display:block}#solnik-poster p{margin:0;padding:8px 10px;font-size:12.5px;line-height:1.4}
    @media (max-width:560px){
      #solnik-pill{flex-wrap:wrap;justify-content:flex-end;max-width:calc(100vw - 16px);border-radius:16px;right:8px;bottom:8px}
      #solnik-pill .who{display:none}
      #solnik-pill button{padding:5px 9px;font-size:12.5px}
      #solnik-caption{max-width:225px;font-size:13.5px}
      #solnik-talk{right:8px;bottom:104px}
    }
  </style>
  <canvas id="solnik-canvas" aria-hidden="true"></canvas>
  <div id="solnik-caption" role="status" aria-live="polite"></div>
  <div id="solnik-talk"><input id="solnik-input" type="text" maxlength="300" placeholder="Type to Solnik…" aria-label="Type to Solnik"><button id="solnik-send">Send</button></div>
  <div id="solnik-pill" role="group" aria-label="Solnik controls">
    <span class="who">SOLNIK</span>
    <button id="sk-summon">Summon</button><button id="sk-speak" aria-pressed="false">Speak</button>
    <button id="sk-type">Type</button><button id="sk-mute" aria-pressed="${store.muted}">Mute</button>
    <button id="sk-dismiss">Dismiss</button><button id="sk-disable">Disable</button>
  </div>`;
  document.body.appendChild(root);
  const caption = $('#solnik-caption', root);
  const say = (t) => { caption.textContent = t; caption.classList.add('on'); clearTimeout(say._t); say._t = setTimeout(() => caption.classList.remove('on'), Math.max(3200, t.length * 95)); };

  // ---------- renderer / scene (pixel-space: 1 unit = 1 CSS px at z=0) ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: $('#solnik-canvas', root), alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return posterMode(root, say); }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.06;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 6000);
  const key = new THREE.DirectionalLight(0xffe2ae, 2.4); key.position.set(300, 500, 700); scene.add(key);
  scene.add(new THREE.AmbientLight(0x57431f, 0.9));
  let VW = innerWidth, VH = innerHeight;
  function fit() {
    VW = innerWidth; VH = innerHeight;
    renderer.setSize(VW, VH, false);
    camera.aspect = VW / VH;
    const dist = (VH / 2) / Math.tan(THREE.MathUtils.degToRad(17.5));
    camera.position.set(VW / 2, VH / 2, dist); camera.lookAt(VW / 2, VH / 2, 0);
    camera.updateProjectionMatrix();
  }
  fit();

  // ---------- load the body ----------
  const mobile = Math.min(VW, VH) < 620 || (navigator.hardwareConcurrency || 8) <= 4;
  const gltf = await new GLTFLoader().loadAsync(BASE + 'assets/' + (mobile ? 'solnik-v1-mobile.glb' : 'solnik-v1.glb'));
  const model = gltf.scene;
  const byName = {};
  model.traverse(o => { byName[o.name.replace(/[^a-z0-9]/gi, '').toLowerCase()] = o; });
  const bone = (n) => byName[n.toLowerCase()];
  const mouth = byName['mouth'];
  const visemeIdx = {}; if (mouth) for (const k in mouth.morphTargetDictionary) visemeIdx[k] = mouth.morphTargetDictionary[k];
  const crystal = byName['heartcrystal'];
  const eyeL = byName['eyel'], eyeR = byName['eyer'];
  const headB = bone('head'), rootB = bone('root');
  const S = mobile ? 118 : 148; // model scale: ~1.42 units tall -> ~170-210 px
  model.scale.setScalar(S);
  const group = new THREE.Group(); group.add(model); scene.add(group);
  const mixer = new THREE.AnimationMixer(model);
  const clips = {}; gltf.animations.forEach(a => clips[a.name] = a);
  function playClip(name, fade = 0.25, loop = false) {
    const c = clips[name]; if (!c) return null;
    const act = mixer.clipAction(c);
    act.reset(); act.enabled = true; act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    act.clampWhenFinished = !loop; act.fadeIn(fade); act.play();
    if (current && current !== act) current.fadeOut(fade);
    current = act; return act;
  }
  let current = null;
  playClip('idle', 0, true);

  // ---------- particles (materialize / teleport bursts) ----------
  const P = 90, pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(P * 3); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const points = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xE4C65B, size: 3.2, transparent: true, opacity: 0, depthWrite: false }));
  points.frustumCulled = false; scene.add(points);
  let burst = null;
  function fireBurst(cx, cy) {
    if (reduced) return;
    const seeds = [];
    for (let i = 0; i < P; i++) { const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 90; seeds.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.7, vx: -Math.cos(a) * r * 1.6, vy: -Math.sin(a) * r * 1.1, life: Math.random() * 0.35 }); }
    burst = { seeds, t: 0 };
    points.material.opacity = 0.95;
  }
  function stepBurst(dt) {
    if (!burst) return;
    burst.t += dt; const t = burst.t;
    burst.seeds.forEach((s, i) => { const k = Math.max(0, 1 - (t - s.life) * 1.5); pPos[i * 3] = s.x + s.vx * t * k; pPos[i * 3 + 1] = s.y + s.vy * t * k; pPos[i * 3 + 2] = 30; });
    pGeo.attributes.position.needsUpdate = true;
    points.material.opacity = Math.max(0, 0.95 - t * 1.1);
    if (t > 1.1) { burst = null; points.material.opacity = 0; }
  }

  // ---------- anchors (the DOM Anchor Graph, specimen slice) ----------
  function anchors(all) {
    const out = {};
    document.querySelectorAll('[data-solnik-anchor]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 30) return;
      if (!all && (r.bottom < -80 || r.top > VH + 80)) return;
      const fx = parseFloat(el.dataset.solnikX || '0.5');
      out[el.dataset.solnikAnchor] = { x: r.left + r.width * fx, topY: VH - r.top, el };
    });
    return out;
  }
  function nearestAnchor() {
    const a = anchors(); let best = null, bd = 1e12;
    for (const k in a) { const d = Math.abs(a[k].topY - VH * 0.45) + Math.abs(a[k].x - VW / 2) * 0.4; if (d < bd) { bd = d; best = { id: k, ...a[k] }; } }
    return best;
  }

  // ---------- placement + travel ----------
  const SEAT = 0.44; // local Y of his pelvis (what rests on an edge)
  const pos = { x: VW / 2, y: VH * 0.4 };
  let travel = null, perchId = null, visibleWanted = true, asleep = false;
  function place() { group.position.set(pos.x, pos.y - SEAT * S, 8); }
  function perchAt(a, instant) {
    perchId = a.id;
    const dest = { x: a.x, y: a.topY };
    if (instant || reduced) { pos.x = dest.x; pos.y = dest.y; place(); fireBurst(dest.x, dest.y + 30); return; }
    const dx = dest.x - pos.x, dy = dest.y - pos.y, distPx = Math.hypot(dx, dy);
    // long vertical hops step through intermediate anchors (his graph edges)
    travel = { x0: pos.x, y0: pos.y, x1: dest.x, y1: dest.y, apex: Math.max(pos.y, dest.y) + 120 + distPx * 0.12, t: 0, dur: clamp(distPx / 620, 0.65, 1.9) };
  }
  function stepTravel(dt) {
    if (!travel) return;
    travel.t += dt / travel.dur;
    const t = Math.min(1, travel.t), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    pos.x = lerp(travel.x0, travel.x1, e);
    const base = lerp(travel.y0, travel.y1, e);
    pos.y = base + Math.sin(e * Math.PI) * (travel.apex - Math.max(travel.y0, travel.y1)) * 0.55;
    group.rotation.z = clamp((travel.x1 - travel.x0) * -0.00022 * Math.sin(e * Math.PI), -0.14, 0.14);
    if (t >= 1) { travel = null; group.rotation.z = 0; playClip('perch', 0.15); setTimeout(() => playClip('idle', 0.4, true), 1150); gripArms(); }
    place();
  }

  // ---------- arm IK: grip the edge he sits on ----------
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  function aim(b, eff, tgt) {
    b.getWorldPosition(_v);
    const d1 = eff.clone().sub(_v).normalize(), d2 = tgt.clone().sub(_v).normalize();
    if (d1.lengthSq() < 0.5 || d2.lengthSq() < 0.5) return;
    _q.setFromUnitVectors(d1, d2);
    b.parent.getWorldQuaternion(_q2).invert();
    const wq = b.getWorldQuaternion(new THREE.Quaternion());
    b.quaternion.copy(_q2.multiply(_q.multiply(wq)));
    b.updateWorldMatrix(true, true);
  }
  function ik(side, tx, ty) {
    const up = bone('upperarm' + side), fo = bone('forearm' + side), hd = bone('hand' + side);
    if (!up || !fo || !hd) return;
    const tgt = new THREE.Vector3(tx, ty, 26);
    for (let i = 0; i < 3; i++) {
      aim(fo, hd.getWorldPosition(_v2.set(0, 0, 0)).clone(), tgt);
      aim(up, hd.getWorldPosition(new THREE.Vector3()), tgt);
    }
  }
  let gripUntil = 0;
  function gripArms() { gripUntil = performance.now() + 2400; }
  function stepGrip() {
    if (performance.now() > gripUntil || travel) return;
    ik('l', pos.x - S * 0.42, pos.y - 2); ik('r', pos.x + S * 0.42, pos.y - 2);
  }

  // ---------- gaze + blink + heart ----------
  const mouse = { x: VW / 2, y: VH / 2, seen: false };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true; }, { passive: true });
  let blinkAt = 1800, blinking = 0;
  function stepFace(dt, now) {
    if (headB && mouse.seen && !asleep) {
      const yaw = clamp((mouse.x - pos.x) * 0.0009, -0.5, 0.5);
      const pitch = clamp((mouse.y - (VH - pos.y)) * 0.0007, -0.3, 0.35);
      headB.quaternion.multiply(_q.setFromEuler(new THREE.Euler(pitch, yaw, 0)));
    }
    if (now > blinkAt) { blinking = 130; blinkAt = now + 2300 + Math.random() * 2800; }
    if (blinking > 0 || asleep) {
      const s = asleep ? 0.22 : Math.max(0.08, Math.abs(blinking - 65) / 65);
      if (eyeL) eyeL.scale.y = s; if (eyeR) eyeR.scale.y = s;
      blinking -= dt * 1000;
    } else { if (eyeL) eyeL.scale.y = 1; if (eyeR) eyeR.scale.y = 1; }
    if (crystal) {
      const base = asleep ? 0.6 : speaking ? 2.7 : listening ? 2.2 : 1.7;
      crystal.material.emissiveIntensity = base + Math.sin(now * (speaking ? 0.02 : 0.004)) * 0.35;
    }
  }

  // ---------- audio: playback queue + band-driven visemes ----------
  let actx = null, analyser = null, masterGain = null, speaking = false, listening = false;
  const audioQ = []; let playing = false, curSource = null;
  function ensureAudio() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    actx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = actx.createAnalyser(); analyser.fftSize = 512;
    masterGain = actx.createGain(); masterGain.gain.value = store.muted ? 0 : 1;
    analyser.connect(masterGain); masterGain.connect(actx.destination);
  }
  addEventListener('pointerdown', () => { ensureAudio(); pumpAudio(); }, { passive: true });
  async function pumpAudio() {
    if (playing || !actx || !audioQ.length) return;
    playing = true; speaking = true;
    const item = audioQ.shift();
    try {
      const buf = await actx.decodeAudioData(item.slice(0));
      if (!speaking) { playing = false; return; }
      const src = actx.createBufferSource(); src.buffer = buf; src.connect(analyser);
      curSource = src;
      src.onended = () => { curSource = null; playing = false; speaking = audioQ.length > 0; pumpAudio(); };
      src.start();
    } catch (e) { playing = false; speaking = audioQ.length > 0; pumpAudio(); }
  }
  function stopSpeaking(remote = true) {
    audioQ.length = 0;
    if (curSource) { try { curSource.onended = null; curSource.stop(); } catch (e) {} curSource = null; }
    playing = false; speaking = false;
    if (remote && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'interrupt' }));
    resetVisemes();
  }
  const freqData = new Uint8Array(256);
  function band(lo, hi) { // Hz -> mean energy via analyser bins
    if (!analyser) return 0;
    analyser.getByteFrequencyData(freqData);
    const nyq = actx.sampleRate / 2, a = Math.floor(lo / nyq * 256), b = Math.min(255, Math.ceil(hi / nyq * 256));
    let s = 0; for (let i = a; i <= b; i++) s += freqData[i];
    return s / Math.max(1, b - a + 1) / 255;
  }
  function resetVisemes() { if (mouth) for (const k in visemeIdx) mouth.morphTargetInfluences[visemeIdx[k]] = 0; }
  let visSmooth = {};
  function stepVisemes() {
    if (!mouth) return;
    const target = { viseme_sil: 1 };
    if (speaking && analyser) {
      const lo = band(85, 320), mid = band(320, 1250), hi = band(2000, 6400), amp = band(85, 6400);
      if (amp > 0.03) {
        target.viseme_sil = 0;
        target.viseme_aa = clamp(lo * 2.4, 0, 1);
        target.viseme_O = clamp(lo * 1.5 - mid * 0.7, 0, 0.9);
        target.viseme_E = clamp(mid * 1.9 - lo * 0.5, 0, 1);
        target.viseme_I = clamp(mid * 1.2 * (hi + 0.4), 0, 0.8);
        target.viseme_SS = clamp(hi * 2.2 - 0.25, 0, 0.9);
        target.viseme_FF = clamp(hi * 1.4 - 0.3, 0, 0.6);
      }
    }
    for (const k in visemeIdx) {
      const t = target[k] || 0, cur = visSmooth[k] || 0;
      visSmooth[k] = lerp(cur, t, t > cur ? 0.5 : 0.28);
      mouth.morphTargetInfluences[visemeIdx[k]] = visSmooth[k];
    }
  }

  // ---------- brain link ----------
  let ws = null, wsTries = 0, greeted = false;
  function guide(anchorId, scroll = true) {
    const a = anchors(true)[anchorId];
    if (!a) return;
    if (scroll) a.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { const b = anchors(true)[anchorId]; if (b) { perchAt({ id: anchorId, ...b }, false); setTimeout(() => playClip('point', 0.15), 950); setTimeout(() => playClip('idle', 0.4, true), 2900); } }, reduced ? 60 : 650);
  }
  function connectBrain() {
    try { ws = new WebSocket(BRAIN); } catch (e) { return; }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => { wsTries = 0; ws.send(JSON.stringify({ type: 'hello', visitorId: store.visitor() })); };
    ws.onmessage = (ev) => {
      if (ev.data instanceof ArrayBuffer) { audioQ.push(ev.data); pumpAudio(); return; }
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'sentence') {
        if (m.text) say(m.text);
        if (m.intent === 'greet' && !greeted) { greeted = true; playClip('greet', 0.2); setTimeout(() => playClip('idle', 0.5, true), 3100); }
        if (m.anchor) guide(m.anchor, m.intent === 'guide');
        if (m.intent === 'refuse_fence') playClip('listen', 0.2);
      }
      if (m.type === 'sleep') { asleep = true; say('Zzz… tap Summon when you need me.'); }
      if (m.type === 'awake') asleep = false;
      if (m.type === 'voice_capped') say('My voice is resting for today — but I can still chat in writing.');
      if (m.type === 'stt_unavailable') say("I heard you — but turning voice into words isn't ready on my side yet. You can type to me, and I'll speak back.");
      if (m.type === 'interrupted') stopSpeaking(false);
    };
    ws.onclose = () => { if (wsTries < 2) { wsTries++; setTimeout(connectBrain, 2500 * wsTries); } else say('My brain is napping — the captain has the note. You can still look around; I will be back.'); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  function sendSay(text) {
    ensureAudio();
    if (asleep && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'wake' }));
    asleep = false;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'say', text }));
    else say('One moment — my brain is still waking up.');
  }

  // ---------- voice input: Silero VAD (lazy) + SpeechRecognition where present ----------
  let vad = null, sr = null, speakOn = false;
  async function toggleSpeak(btn) {
    if (speakOn) { speakOn = false; btn.setAttribute('aria-pressed', 'false'); if (vad) vad.pause(); if (sr) { try { sr.stop(); } catch (e) {} } listening = false; return; }
    ensureAudio();
    speakOn = true; btn.setAttribute('aria-pressed', 'true'); listening = true;
    say('Listening… talk to me. If I am speaking, just start — I will stop and listen.');
    try {
      if (!vad) { const bridge = await import('./vad-bridge.js'); vad = await bridge.startVAD(BASE + 'vad/', {
        onSpeechStart: () => { if (speaking) stopSpeaking(true); listening = true; },
        onSpeechEnd: (audio) => { if (!sr) sendPcm(audio); },
      }); window.__solnikVad = 'on'; }
      else vad.resume();
      window.__solnikVad = 'on';
    } catch (e) { say('My ears could not open here — the microphone or its models were blocked. You can type to me instead.'); }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR && !sr) {
      sr = new SR(); sr.lang = 'en-US'; sr.interimResults = false; sr.continuous = true;
      sr.onresult = (ev) => { const t = ev.results[ev.results.length - 1][0].transcript.trim(); if (t) { listening = false; sendSay(t); listening = true; } };
      sr.onend = () => { if (speakOn) { try { sr.start(); } catch (e) {} } };
      sr.onerror = () => {};
    }
    if (sr) { try { sr.start(); } catch (e) {} }
  }
  function sendPcm(f32) { // 16kHz float32 from the VAD -> brain STT (base64 PCM16)
    if (!ws || ws.readyState !== 1) return;
    const pcm = new Int16Array(f32.length);
    for (let i = 0; i < f32.length; i++) pcm[i] = clamp(f32[i], -1, 1) * 32767;
    let bin = ''; const bytes = new Uint8Array(pcm.buffer);
    for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    ws.send(JSON.stringify({ type: 'stt_pcm', audio: btoa(bin), sampleRate: 16000 }));
  }

  // ---------- controls (constitutional: always within reach) ----------
  const pill = $('#solnik-pill', root);
  $('#sk-mute', root).onclick = (e) => { const b = e.currentTarget; store.muted = !store.muted; b.setAttribute('aria-pressed', String(store.muted)); if (masterGain) masterGain.gain.value = store.muted ? 0 : 1; if (store.muted) stopSpeaking(true); };
  $('#sk-dismiss', root).onclick = () => { visibleWanted = false; group.visible = false; caption.classList.remove('on'); stopSpeaking(true); };
  $('#sk-summon', root).onclick = () => {
    ensureAudio();
    if (asleep && ws && ws.readyState === 1) { ws.send(JSON.stringify({ type: 'wake' })); asleep = false; }
    visibleWanted = true; group.visible = true;
    const a = nearestAnchor(); if (a) perchAt(a, false);
    if (!greeted && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'hello', visitorId: store.visitor() }));
  };
  $('#sk-disable', root).onclick = () => {
    localStorage.setItem('solnik_disabled', '1');
    stopSpeaking(false);
    if (ws) { try { ws.close(); } catch (e) {} }
    cancelAnimationFrame(raf); root.remove();
    renderReenable('Solnik is off. He stays off until you call him back.');
  };
  $('#sk-type', root).onclick = () => { $('#solnik-talk', root).classList.toggle('on'); $('#solnik-input', root).focus(); };
  $('#solnik-send', root).onclick = () => { const i = $('#solnik-input', root); const t = i.value.trim(); if (t) { i.value = ''; sendSay(t); } };
  $('#solnik-input', root).addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#solnik-send', root).click(); });
  $('#sk-speak', root).onclick = (e) => toggleSpeak(e.currentTarget);

  // ---------- caption placement (floats beside him) ----------
  function stepCaption() {
    const x = clamp(pos.x + S * 0.62, 8, VW - 306), y = clamp(VH - pos.y - S * 1.28, 8, VH - 120);
    caption.style.left = x + 'px'; caption.style.top = y + 'px';
  }

  // ---------- main loop ----------
  let raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    mixer.update(dt);
    stepTravel(dt); stepGrip(); stepBurst(dt); stepFace(dt, now); stepVisemes(); stepCaption();
    renderer.render(scene, camera);
  }
  addEventListener('resize', () => { fit(); const a = anchors()[perchId]; if (a) { pos.x = a.x; pos.y = a.topY; place(); } });
  document.addEventListener('scroll', () => { if (!travel && perchId) { const a = anchors()[perchId]; if (a) { pos.x = a.x; pos.y = a.topY; place(); } } }, { passive: true });

  // ---------- entrance ----------
  const start = nearestAnchor() || { id: 'mint-entrance', x: VW / 2, topY: VH * 0.55 };
  pos.x = start.x; pos.y = start.topY; place();
  fireBurst(start.x, start.topY + 40);
  playClip('perch', 0.1); setTimeout(() => playClip('idle', 0.4, true), 1150);
  gripArms();
  connectBrain();
  if (reduced) { // static specimen of the same state: render a few frames, no loop
    mixer.update(0.4); renderer.render(scene, camera);
    setTimeout(() => renderer.render(scene, camera), 700);
    say('Solnik is here (calm mode — reduced motion is on). Use the Type button to talk to me.');
  } else {
    raf = requestAnimationFrame(frame);
  }
  window.__solnik = { version: 'specimen-01', anchors, state: () => ({ perchId, speaking, asleep, visibleWanted }) };
}

function renderReenable(note) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483000;background:rgba(20,16,10,.92);border:1px solid #C9A227;border-radius:999px;padding:7px 13px;font:13px Georgia,serif;color:#E9DDC6';
  d.innerHTML = (note ? note + ' ' : 'Solnik is off. ') + '<a href="#" style="color:#C9A227">Re-enable Solnik</a>';
  d.querySelector('a').onclick = (e) => { e.preventDefault(); localStorage.removeItem('solnik_disabled'); location.reload(); };
  document.body.appendChild(d);
}

function posterMode(root, say) { // no WebGL: the adopted portrait + working text chat doorway
  const p = document.createElement('div');
  p.id = 'solnik-poster';
  p.innerHTML = '<img src="' + new URL('.', import.meta.url).pathname + 'assets/solnik-character-v1.jpg" alt="Solnik, the brass service sprite of Provadia"><p><strong style="color:#C9A227">Solnik</strong> — the town\'s service sprite. This device can\'t show him in 3D, but he is still here: use Type below to talk to him.</p>';
  root.appendChild(p);
  say('This is Solnik, in portrait form — my 3D body needs WebGL, which this device has off.');
}
