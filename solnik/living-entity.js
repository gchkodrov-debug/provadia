// SOLNIK — living-entity.js (SPECIMEN 01, preview-only)
// v2 (completion-01): Surfer locomotion layer + composed facial-expression library.
// Judging standard (founder, 2026-11-25): REAL AS POSSIBLE — where realism trades
// against convenience, realism wins; no faked capabilities, no consciousness claims.
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
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }; // blocked storage must never kill the engine
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const store = {
  get disabled() { return lsGet('solnik_disabled') === '1'; },
  get muted() { return lsGet('solnik_muted') === '1'; },
  set muted(v) { lsSet('solnik_muted', v ? '1' : '0'); },
  visitor() { let v = lsGet('solnik_visitor'); if (!v) { v = 'v' + Math.random().toString(36).slice(2) + Date.now().toString(36); lsSet('solnik_visitor', v); } return v; },
};

export async function initSolnik(opts = {}) {
  const greetingVariant = opts.greeting === 'family' ? 'family' : 'visitor';
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
    #solnik-pill button{background:#30251B;color:#E9DDC6;border:1px solid #6b5626;border-radius:999px;padding:6px 11px;min-height:44px;font:13px Georgia,serif;cursor:pointer}
    #solnik-pill button:hover{background:#453219}#solnik-pill button[aria-pressed="true"]{background:#C9A227;color:#141210}
    #solnik-pill .who{color:#C9A227;font-size:12.5px;padding:0 4px;letter-spacing:.04em}
    #solnik-talk{position:absolute;right:14px;bottom:64px;pointer-events:auto;display:none;background:rgba(20,16,10,.95);
      border:1px solid #C9A227;border-radius:12px;padding:8px;box-shadow:0 6px 24px rgba(0,0,0,.45)}
    #solnik-talk.on{display:flex;gap:6px}
    #solnik-talk input{background:#141210;color:#E9DDC6;border:1px solid #6b5626;border-radius:8px;padding:7px 9px;font:14px Georgia,serif;width:210px}
    #solnik-talk button{background:#C9A227;color:#141210;border:0;border-radius:8px;padding:7px 12px;min-height:44px;font:13px Georgia,serif;cursor:pointer}
    #solnik-poster{position:absolute;right:14px;bottom:64px;width:190px;border:1px solid #C9A227;border-radius:12px;overflow:hidden;background:#141210;color:#E9DDC6}
    #solnik-poster img{width:100%;display:block}#solnik-poster p{margin:0;padding:8px 10px;font-size:12.5px;line-height:1.4}
    @media (max-width:560px){
      #solnik-pill{flex-wrap:wrap;justify-content:flex-end;max-width:calc(100vw - 16px);border-radius:16px;right:8px;bottom:8px}
      #solnik-pill .who{display:none}
      #solnik-pill button{padding:5px 9px;font-size:12.5px;min-height:40px}
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
  } catch (e) { return posterMode(root, say, greetingVariant); }
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
  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync(BASE + 'assets/' + (mobile ? 'solnik-v1-mobile.glb' : 'solnik-v1.glb'));
  } catch (e) { return posterMode(root, say, greetingVariant); } // a failed body load degrades to the portrait, never to a dead pill
  const model = gltf.scene;
  const byName = {};
  model.traverse(o => { byName[o.name.replace(/[^a-z0-9]/gi, '').toLowerCase()] = o; });
  const bone = (n) => byName[n.toLowerCase()];
  const mouth = byName['mouth'];
  const visemeIdx = {}; if (mouth) for (const k in mouth.morphTargetDictionary) visemeIdx[k] = mouth.morphTargetDictionary[k];
  const crystal = byName['heartcrystal'];
  const eyeL = byName['eyel'], eyeR = byName['eyer'];
  const headB = bone('head'), rootB = bone('root');
  const browL = byName['browl'], browR = byName['browr']; // Brow.L / Brow.R — expression levers (offsets from their authored positions)
  const browBaseL = browL ? browL.position.clone() : null, browBaseR = browR ? browR.position.clone() : null;
  const S = mobile ? 118 : 148; // model scale: ~1.42 units tall -> ~170-210 px
  model.scale.setScalar(S);
  const group = new THREE.Group(); group.add(model); scene.add(group);
  const mixer = new THREE.AnimationMixer(model);
  const clips = {}; gltf.animations.forEach(a => clips[a.name] = a);
  function playClip(name, fade = 0.25, loop = false) {
    const c = clips[name]; if (!c) return null;
    const act = mixer.clipAction(c);
    act.reset(); act.enabled = true; act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    act.clampWhenFinished = !loop; act.fadeIn(fade); act.play(); clipNameNow = name;
    if (current && current !== act) current.fadeOut(fade);
    current = act; return act;
  }
  let current = null, clipNameNow = 'idle';
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
  let bobY = 0, bobEnv = 0; // speech bob (px) + its voice-envelope driver, composed here so every place() caller (travel, scroll re-pin, resize) keeps it
  function place() { group.position.set(pos.x, pos.y + bobY - SEAT * S, 8); }
  function perchAt(a, instant) {
    perchId = a.id;
    const dest = { x: a.x, y: a.topY };
    if (instant || reduced) { pos.x = dest.x; pos.y = dest.y; place(); fireBurst(dest.x, dest.y + 30); return 0; }
    const dx = dest.x - pos.x, dy = dest.y - pos.y, distPx = Math.hypot(dx, dy);
    // long vertical hops step through intermediate anchors (his graph edges)
    travel = { x0: pos.x, y0: pos.y, x1: dest.x, y1: dest.y, apex: Math.max(pos.y, dest.y) + 120 + distPx * 0.12, t: 0, dur: clamp(distPx / 620, 0.65, 1.9) };
    return travel.dur;
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


  // ---------- LOCOMOTION LAYER (v2, completion-01) ----------
  // He follows the visitor's reading, relocates instead of stranding, and shows
  // small idle life — always yielding to travel, sleep, Dismiss and the brain's
  // own 'guide' manoeuvres. Driven only from the frame loop, so reduced motion
  // (no loop runs) and Disable (loop cancelled, root removed) stop it by
  // construction. REAL AS POSSIBLE: every beat below is a real relocation or a
  // real clip on the real body — nothing is simulated or faked.
  const hasPointer = matchMedia('(pointer: fine)').matches;
  let lastInteractAt = performance.now(), lastPointerMoveAt = 0, lastBrainAt = 0;
  let lastLifeAt = 0, lastMoveAt = performance.now(), nextLifeGap = 10000 + Math.random() * 8000;
  let followMode = 'idle', guideBusyUntil = 0, gestureTok = 0;
  let scrolling = false, lastScrollAt = 0, lastFollowCheckAt = performance.now(), wasTravelling = false; // follow-check clock starts at load, so the entrance perch is not instantly re-hopped by the first periodic check
  let dwellSince = 0, dwellArmX = null, dwellCoolUntil = 0, virtualFlip = false;
  let anchorsCache = null, anchorsCacheAt = 0;
  function anchorsCached() { const n = performance.now(); if (!anchorsCache || n - anchorsCacheAt > 550) { anchorsCache = anchors(); anchorsCacheAt = n; } return anchorsCache; } // anchors() is DOM-heavy: at most ~2 calls/sec, cached between checks
  addEventListener('scroll', () => { scrolling = true; lastScrollAt = performance.now(); lastInteractAt = lastScrollAt; }, { passive: true });
  function locoFree(now) { return !reduced && visibleWanted && !asleep && !travel && now > guideBusyUntil && !document.hidden; }
  function locoGo(a, mode, now) { perchAt(a, false); followMode = mode; lastMoveAt = now; lastLifeAt = now; }
  function bestVisibleAnchor() { // the visible anchor nearest the viewport's vertical centre band
    const a = anchorsCached(); let best = null, bs = 1e12;
    for (const k in a) { const p = a[k]; if (p.topY < 30 || p.topY > VH - 20) continue; const s = Math.abs(p.topY - VH * 0.52); if (s < bs) { bs = s; best = { id: k, ...p }; } }
    return best;
  }
  function tryFollow(now, mode) {
    const b = bestVisibleAnchor();
    if (b && b.id !== perchId && Math.hypot(b.x - pos.x, b.topY - pos.y) > 120) { locoGo(b, mode, now); return true; }
    if (!b) { // no visible anchor: a safe virtual perch beats stranding — but only when actually stranded or long-parked
      const stranded = pos.y < -50 || pos.y > VH + 50 || pos.x < -50 || pos.x > VW + 50;
      if (stranded || now - lastMoveAt > 22000) {
        virtualFlip = !virtualFlip;
        const m = Math.max(64, S * 0.55);
        const v = virtualFlip ? { id: 'virtual-left', x: m, topY: VH * 0.34 } : { id: 'virtual-right', x: VW - m, topY: VH * 0.74 }; // lower-left / upper-right: clear of the bottom-right pill zone; 0.74 (not 0.8) keeps his head off the top edge at 568 px-tall viewports
        if (Math.hypot(v.x - pos.x, v.topY - pos.y) > 120) { locoGo(v, 'virtual', now); return true; }
      }
    }
    return false;
  }
  function stepLoco(now) {
    if (wasTravelling && !travel) lastMoveAt = now;
    wasTravelling = !!travel;
    if (!locoFree(now)) return;
    if (scrolling) { if (now - lastScrollAt > 620) { scrolling = false; tryFollow(now, 'scroll'); } return; } // never start a travel mid-scroll; he follows after the pause (the re-pin keeps him glued meanwhile)
    if (now - lastFollowCheckAt > 4000) { lastFollowCheckAt = now; if (!speaking && !listening) tryFollow(now, 'scroll'); } // stranded-recovery yields while he is talking or listening; the scroll-quiet follow above stays live
    // follow-the-visitor (pointer devices): a pointer dwelling far away for seconds earns a hop to its side
    if (hasPointer && mouse.seen && !speaking && now > dwellCoolUntil && Math.abs(mouse.x - pos.x) > VW * 0.55) {
      if (!dwellSince) { dwellSince = now; dwellArmX = mouse.x; }
      else if (Math.abs(mouse.x - dwellArmX) > 80) { dwellSince = now; dwellArmX = mouse.x; } // pointer moved on: the dwell restarts — he follows attention, not a parked cursor
      else if (now - dwellSince > 3200 && now - lastLifeAt > 9000) {
        const a = anchorsCached(); let best = null, bd = 1e12;
        for (const k in a) { if (k === perchId || a[k].topY < 30 || a[k].topY > VH - 20) continue; const d = Math.abs(a[k].x - mouse.x); if (d < bd) { bd = d; best = { id: k, ...a[k] }; } }
        if (best && Math.hypot(best.x - pos.x, best.topY - pos.y) > 120) locoGo(best, 'pointer', now);
        dwellSince = 0; dwellCoolUntil = now + 15000; // long cooldown after a pointer hop: two anchors near the pointer can never ping-pong him (critic B8)
      }
    } else dwellSince = 0;
    // idle life: one small beat after a long quiet — a neighbour hop or a 'listen' head-tilt — never chained
    if (!speaking && !listening && now - lastInteractAt > nextLifeGap && now - lastLifeAt > nextLifeGap) {
      lastLifeAt = now; nextLifeGap = 10000 + Math.random() * 8000;
      const a = anchorsCached(); let hop = null, bd = VH * 0.45;
      for (const k in a) { if (k === perchId || a[k].topY < 30 || a[k].topY > VH - 20) continue; const d = Math.hypot(a[k].x - pos.x, a[k].topY - pos.y); if (d < bd) { bd = d; hop = { id: k, ...a[k] }; } }
      if (hop && Math.random() < 0.6) { locoGo(hop, 'life', now); return; }
      if (clipNameNow === 'idle') { playClip('listen', 0.3); const tok = ++gestureTok; setTimeout(() => { if (tok === gestureTok && visibleWanted && clipNameNow === 'listen') playClip('idle', 0.5, true); }, 1600); }
    }
  }
  function stepBody(dt, now) { // group yaw (travel direction, else pointer side) + speech sway/bob — eased here; travel lean (rotation.z) stays stepTravel's while travelling
    let yawT = 0;
    if (travel) yawT = clamp((travel.x1 - travel.x0) * 0.0016, -0.45, 0.45);
    else if (hasPointer && mouse.seen && !asleep) yawT = clamp((mouse.x - pos.x) * 0.0004, -0.3, 0.3);
    group.rotation.y = lerp(group.rotation.y, yawT, Math.min(1, dt * 3.2));
    // speech bob driven by his ACTUAL voice envelope (last frame's analyser snapshot), not a clock:
    // a metronomic sine reads as a machine; an envelope makes the body move when the voice moves (critic B14)
    const envT = (speaking && analyser && !travel) ? clamp(band(85, 320) * 5.0, 0, 1) : 0;
    bobEnv = lerp(bobEnv, envT, Math.min(1, dt * 9));
    const bobT = bobEnv > 0.03 ? Math.sin(now * 0.011) * 2.2 * bobEnv : 0;
    if (bobT !== bobY) { bobY = bobT; if (!travel) place(); }
    if (!travel) group.rotation.z = speaking ? Math.sin(now * 0.006) * 0.02 : lerp(group.rotation.z, 0, Math.min(1, dt * 5));
  }

  // ---------- FACIAL EXPRESSION LIBRARY (v2, completion-01) ----------
  // Composed, because the body carries no smile morphs — only the 15 speech
  // visemes on the Mouth mesh. Levers: Brow.L/Brow.R node offsets (small
  // translations; pivots unverified, so no brow rotations), eye openness
  // (composed with blink in stepFace), head offsets (consumed by stepFace's
  // single head-quaternion write, so expression never fights gaze), and a held
  // mouth base blend (consumed by stepVisemes; live speech visemes override it
  // while audio plays and it returns as speech decays — no popping, all eased).
  // Head pitch sign follows stepFace's gaze convention: +pitch = face down.
  const EXPRS = {
    neutral:  { browL: 0.012,  browR: 0.012,  eye: 1.0,  pitch: 0,      yaw: 0,    roll: 0,     E: 0.06, I: 0.03, PP: 0 },
    welcome:  { browL: 0.055,  browR: 0.055,  eye: 0.85, pitch: 0.01,   yaw: 0,    roll: 0.06,  E: 0.35, I: 0.3,  PP: 0 },
    grin:     { browL: 0.03,   browR: 0.03,   eye: 0.88, pitch: 0.005,  yaw: 0,    roll: 0.02,  E: 0.45, I: 0.22, PP: 0 },
    chuckle:  { browL: 0.06,   browR: 0.06,   eye: 0.8,  pitch: 0.01,   yaw: 0,    roll: 0.03,  E: 0.4,  I: 0.3,  PP: 0 },
    curious:  { browL: 0.065,  browR: 0.015,  eye: 1.05, pitch: 0,      yaw: 0,    roll: 0.1,   E: 0.05, I: 0.05, PP: 0 },
    teaching: { browL: 0.02,   browR: 0.02,   eye: 0.97, pitch: 0.01,   yaw: 0,    roll: 0,     E: 0.18, I: 0.1,  PP: 0 },
    serious:  { browL: -0.038, browR: -0.038, eye: 0.95, pitch: 0.045,  yaw: 0,    roll: 0,     E: 0,    I: 0,    PP: 0.12 },
    pride:    { browL: 0.045,  browR: 0.045,  eye: 0.9,  pitch: -0.055, yaw: 0,    roll: 0,     E: 0.42, I: 0.25, PP: 0 },
    refusal:  { browL: 0.05,   browR: 0.05,   eye: 0.92, pitch: 0.02,   yaw: 0,    roll: 0,     E: 0,    I: 0,    PP: 0.3 },
    thinking: { browL: 0.06,   browR: 0.02,   eye: 0.94, pitch: -0.02,  yaw: 0.3,  roll: 0.07,  E: 0,    I: 0,    PP: 0.22 },
    sleepy:   { browL: -0.01,  browR: -0.01,  eye: 0.4,  pitch: 0.09,   yaw: 0,    roll: 0.04,  E: 0,    I: 0,    PP: 0 },
  };
  let exprName = 'neutral', exprPrio = 0, exprT0 = 0, exprUntil = Infinity, exprChain = null, pendingMood = null, nodAt = 0;
  const exprCur = { browL: 0, browR: 0, eye: 1, pitch: 0, yaw: 0, roll: 0, E: 0, I: 0, PP: 0 };
  const exprHead = { pitch: 0, yaw: 0, roll: 0 };   // read by stepFace
  const exprMouth = { E: 0, I: 0, PP: 0 };          // read by stepVisemes
  const exprDyn = { mE: 0 };                        // chuckle mouth pulses, read by stepVisemes
  let exprEye = 1, nextFlickerAt = 6000, flickerT0 = -1, flickerKind = 'brow';
  function setExpr(name, holdMs, prio) {
    if (reduced || !visibleWanted || !EXPRS[name]) return; // calm specimen and Dismiss are sovereign: no faces
    const now = performance.now();
    prio = prio || 1;
    if (prio < exprPrio && now < exprUntil) return;
    if (name !== 'welcome') exprChain = null; // the chained chuckle belongs to welcome only — a later face must never inherit it (e.g. chuckle firing after a refusal expires)
    exprName = name; exprPrio = prio; exprT0 = now; exprUntil = holdMs ? now + holdMs : Infinity;
  }
  const EXPR_KEYS = ['browL', 'browR', 'eye', 'pitch', 'yaw', 'roll', 'E', 'I', 'PP']; // hoisted: stepExpr runs every frame and must not allocate
  function stepExpr(dt, now) {
    if (!visibleWanted) return; // frozen while dismissed (invisible anyway); Summon force-sets welcome on return, so no expiry is owed
    if (now > exprUntil) { const next = exprChain; exprChain = null; exprPrio = 0; if (next) setExpr(next, 1600, 2); else setExpr(asleep ? 'sleepy' : 'neutral'); }
    const d = EXPRS[exprName] || EXPRS.neutral, k = Math.min(1, dt * 5.5);
    for (const key of EXPR_KEYS) exprCur[key] = lerp(exprCur[key], d[key], k);
    let dPitch = 0, dYaw = 0, dBrow = 0, eyeF = 1; exprDyn.mE = 0;
    const nodT = (now - nodAt) / 650; if (nodAt && nodT >= 0 && nodT < 1) dPitch += Math.sin(nodT * Math.PI) * 0.07; // teaching nod pulse at sentence starts
    const el = now - exprT0;
    if (exprName === 'refusal' && el < 1500) dYaw += Math.sin(el * 0.0084) * 0.075 * (1 - el / 1500); // two gentle head-shake oscillations, decaying (0.0084 rad/ms reaches 4π at 1500 ms = exactly two cycles; the builder's 0.021 ran ~5 cycles — a theatrical rattle, not a gentle no)
    if (exprName === 'chuckle' && el < 1500) { const p = Math.abs(Math.sin(el * Math.PI / 700)); exprDyn.mE = p * 0.3; dPitch += p * 0.028; } // two-beat chuckle: two E/I pulses + two tiny head bobs
    if ((exprName === 'neutral' || exprName === 'grin') && !asleep) { // idle micro-expression flickers — he never looks frozen
      if (now > nextFlickerAt) { flickerT0 = now; flickerKind = Math.random() < 0.6 ? 'brow' : 'squint'; nextFlickerAt = now + 4500 + Math.random() * 5000; }
      const ft = (now - flickerT0) / 550; if (flickerT0 > 0 && ft >= 0 && ft < 1) { const s = Math.sin(ft * Math.PI); if (flickerKind === 'brow') dBrow += s * 0.03; else eyeF = 1 - s * 0.1; }
    }
    exprHead.pitch = exprCur.pitch + dPitch; exprHead.yaw = exprCur.yaw + dYaw; exprHead.roll = exprCur.roll;
    exprEye = exprCur.eye * eyeF;
    exprMouth.E = exprCur.E; exprMouth.I = exprCur.I; exprMouth.PP = exprCur.PP;
    if (browL && browBaseL) browL.position.y = browBaseL.y + exprCur.browL + dBrow;
    if (browR && browBaseR) browR.position.y = browBaseR.y + exprCur.browR + dBrow;
  }

  // ---------- arm IK: grip the edge he sits on ----------
  const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  const _exprEuler = new THREE.Euler();
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
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true; lastPointerMoveAt = performance.now(); lastInteractAt = lastPointerMoveAt; }, { passive: true });
  let blinkAt = 1800, blinking = 0;
  function stepFace(dt, now) {
    if (headB) { // gaze (pointer devices) + expression head offsets, composed onto the clip pose in a single write — they never fight
      const yaw = (mouse.seen && !asleep) ? clamp((mouse.x - pos.x) * 0.0009, -0.5, 0.5) : 0;
      const pitch = (mouse.seen && !asleep) ? clamp((mouse.y - (VH - pos.y)) * 0.0007, -0.3, 0.35) : 0;
      // composed totals stay inside neck-plausible limits (gaze alone never reaches these clamps, so proven gaze behaviour is unchanged; only gaze+expression extremes are trimmed)
      headB.quaternion.copy(baseHeadQ).multiply(_q.setFromEuler(_exprEuler.set(clamp(pitch + exprHead.pitch, -0.38, 0.45), clamp(yaw + exprHead.yaw, -0.7, 0.7), exprHead.roll)));
    }
    if (now > blinkAt) { blinking = 130; blinkAt = now + 2300 + Math.random() * 2800; }
    if (blinking > 0 || asleep) {
      const s = asleep ? 0.22 : Math.max(0.08, Math.abs(blinking - 65) / 65) * exprEye;
      if (eyeL) eyeL.scale.y = s; if (eyeR) eyeR.scale.y = s;
      blinking -= dt * 1000;
    } else { if (eyeL) eyeL.scale.y = exprEye; if (eyeR) eyeR.scale.y = exprEye; }
    if (crystal) {
      const base = (asleep ? 0.6 : speaking ? 2.7 : listening ? 2.2 : 1.7) + (exprName === 'pride' ? 0.55 : 0);
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
  addEventListener('pointerdown', () => { ensureAudio(); pumpAudio(); lastInteractAt = performance.now(); }, { passive: true });
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
  function band(lo, hi) { // Hz -> mean energy via analyser bins (freqData is refreshed once per frame in stepVisemes)
    if (!analyser) return 0;
    const nyq = actx.sampleRate / 2, a = Math.floor(lo / nyq * 256), b = Math.min(255, Math.ceil(hi / nyq * 256));
    let s = 0; for (let i = a; i <= b; i++) s += freqData[i];
    return s / Math.max(1, b - a + 1) / 255;
  }
  function resetVisemes() { if (mouth) for (const k in visemeIdx) mouth.morphTargetInfluences[visemeIdx[k]] = 0; }
  let visSmooth = {};
  function stepVisemes() {
    if (!mouth) return;
    const target = { viseme_sil: 1 };
    let voiceActive = false;
    if (speaking && analyser) {
      analyser.getByteFrequencyData(freqData); // one snapshot per frame for all five band reads
      const lo = band(85, 320), mid = band(320, 1250), hi = band(2000, 6400), amp = band(85, 6400);
      if (amp > 0.03) {
        voiceActive = true;
        target.viseme_sil = 0;
        target.viseme_aa = clamp(lo * 2.4, 0, 1);
        target.viseme_O = clamp(lo * 1.5 - mid * 0.7, 0, 0.9);
        target.viseme_E = clamp(mid * 1.9 - lo * 0.5, 0, 1);
        target.viseme_I = clamp(mid * 1.2 * (hi + 0.4), 0, 0.8);
        target.viseme_SS = clamp(hi * 2.2 - 0.25, 0, 0.9);
        target.viseme_FF = clamp(hi * 1.4 - 0.3, 0, 0.6);
      }
    }
    if (!voiceActive) { // expression mouth base: live speech visemes win while audio plays; the held expression returns as speech decays
      const breathe = 0.85 + 0.15 * Math.sin(performance.now() * 0.0011) * Math.sin(performance.now() * 0.00037 + 1.7); // two incommensurate sines: the held smile breathes ±15% instead of freezing mid-word (critic B30)
      const mE = clamp((exprMouth.E + exprDyn.mE) * breathe, 0, 1), mI = clamp(exprMouth.I * breathe, 0, 1), mPP = clamp(exprMouth.PP, 0, 1);
      if (mE > 0.01) { target.viseme_E = mE; target.viseme_sil = Math.min(target.viseme_sil, 1 - mE * 0.8); }
      if (mI > 0.01) target.viseme_I = mI;
      if (mPP > 0.01) target.viseme_PP = mPP;
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
    const a = anchors(true)[anchorId]; // fresh read (never the 550 ms locomotion cache): a stale rect here would perch him at a pre-scroll position
    if (!a) return;
    guideBusyUntil = performance.now() + 8000; // locomotion yields while the brain is driving (scroll + 650 ms settle + travel ≤1.9 s + point ≈2 s, with margin for long smooth scrolls)
    if (scroll) a.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { if (!visibleWanted) return; const b = anchors(true)[anchorId]; if (b) { const dur = perchAt({ id: anchorId, ...b }, false) || 0; const arrive = dur ? dur * 1000 + 60 : 950; setTimeout(() => { if (visibleWanted) { gestureTok++; playClip('point', 0.15); } }, arrive); setTimeout(() => { if (!visibleWanted) return; playClip('idle', 0.4, true); if (!travel && perchId === anchorId) { const c = anchors(true)[anchorId]; if (c) { pos.x = c.x; pos.y = c.topY; place(); } } }, arrive + 1950); } }, reduced ? 60 : 650); // Dismiss mid-guide cancels the perch (sovereignty); the final fresh re-pin corrects any rect read mid-smooth-scroll once everything has settled
  }
  function connectBrain() {
    try { ws = new WebSocket(BRAIN); } catch (e) { return; }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => { wsTries = 0; ws.send(JSON.stringify({ type: 'hello', visitorId: store.visitor(), variant: greetingVariant })); };
    ws.onmessage = (ev) => {
      if (!visibleWanted) return; // Dismiss is sovereign: no voice, no captions, no travel until Summon
      if (ev.data instanceof ArrayBuffer) { audioQ.push(ev.data); pumpAudio(); return; }
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'sentence') {
        lastBrainAt = performance.now(); lastInteractAt = lastBrainAt;
        if (m.text) say(m.text);
        if (exprName === 'thinking') { exprPrio = 0; setExpr(pendingMood === 'serious' ? 'serious' : pendingMood === 'question' ? 'curious' : 'grin', 2800); pendingMood = null; } // the waiting face resolves into the answer's face
        if (m.intent === 'greet' && !greeted) { greeted = true; playClip('greet', 0.2); setTimeout(() => { if (visibleWanted) playClip('idle', 0.5, true); }, 3100); setExpr('welcome', 3000); if (greetingVariant === 'family') exprChain = 'chuckle'; }
        else if (m.intent === 'guide') { nodAt = performance.now(); if (m.anchor) setExpr('pride', 3200); else setExpr('teaching', 3200); }
        else if (m.intent !== 'refuse_fence' && exprName !== 'thinking') nodAt = performance.now();
        if (m.anchor) guide(m.anchor, m.intent === 'guide');
        if (m.intent === 'refuse_fence') { playClip('listen', 0.2); setExpr('refusal', 2800, 3); }
        else if (!reduced && !travel && !m.anchor && performance.now() > guideBusyUntil && clipNameNow !== 'greet' && clipNameNow !== 'point' && Math.random() < 0.4) { // speech punctuation: a short point on some sentences, then back to idle (never on anchor sentences — guide() points on arrival, at the thing itself; never while a guide manoeuvre is in its window — critic B11)
          const tok = ++gestureTok; playClip('point', 0.15);
          setTimeout(() => { if (tok === gestureTok && visibleWanted && clipNameNow === 'point') playClip('idle', 0.4, true); }, 900);
        }
      }
      if (m.type === 'sleep') { asleep = true; pendingMood = null; setExpr('sleepy', 0, 3); say('Zzz… tap Summon when you need me.'); } // a mood queued before sleep must not leak into the next waking answer
      if (m.type === 'awake') { asleep = false; exprPrio = 0; setExpr('neutral'); }
      if (m.type === 'voice_capped') say('My voice is resting for today — but I can still chat in writing.');
      if (m.type === 'stt_unavailable') say("I heard you — but turning voice into words isn't ready on my side yet. You can type to me, and I'll speak back.");
      if (m.type === 'interrupted') stopSpeaking(false);
    };
    ws.onclose = () => { if (wsTries < 2) { wsTries++; setTimeout(connectBrain, 2500 * wsTries); } else say('My brain is napping — the captain has the note. You can still look around; I will be back.'); };
    ws.onerror = () => { try { ws.close(); } catch (e) {} };
  }
  function sendSay(text, utt) {
    ensureAudio();
    lastInteractAt = performance.now();
    if (asleep) exprPrio = 0; // he is waking to answer; the sleepy face must not outrank the reply
    const sentText = String(text || '');
    if (/(ha\s*ha|lol|😄|😂|🤣)/i.test(sentText)) setExpr('chuckle', 1700, 2); // a reaction face only — no fake laugh behaviour beyond the face
    else if (sentText.trim().endsWith('?')) { pendingMood = sentText.length > 160 ? 'serious' : 'question'; setExpr('thinking', 9000, 2); }
    else { pendingMood = null; setExpr('thinking', 9000, 2); } // the waiting gap wears the thinking face until his first sentence lands — with a 9 s bound, so a brain that never answers cannot leave the lip-press face on forever (it relaxes to neutral instead)
    if (asleep && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'wake' }));
    asleep = false;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'say', text, utt: utt || null }));
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
        onSpeechStart: () => { if (speaking) stopSpeaking(true); listening = true; window.__speechStartAt = Date.now(); window.__utt = 'u' + Date.now().toString(36); },
        onSpeechEnd: (audio) => { // brain STT is the reliable path: use it whenever SR produced nothing for this utterance
          const srSilent = !window.__srResultAt || (window.__speechStartAt && window.__srResultAt < window.__speechStartAt);
          if (!sr) sendPcm(audio); else if (srSilent) setTimeout(() => { if (!window.__srResultAt || window.__srResultAt < window.__speechStartAt) sendPcm(audio); }, 1600);
        },
      }); window.__solnikVad = 'on'; }
      else vad.resume();
      window.__solnikVad = 'on';
    } catch (e) { say('My ears could not open here — the microphone or its models were blocked. You can type to me instead.'); }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR && !sr) {
      sr = new SR(); sr.lang = 'en-US'; sr.interimResults = false; sr.continuous = true;
      sr.onresult = (ev) => { const t = ev.results[ev.results.length - 1][0].transcript.trim(); if (t) { window.__srResultAt = Date.now(); listening = false; sendSay(t, window.__utt); listening = true; } };
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
    ws.send(JSON.stringify({ type: 'stt_pcm', audio: btoa(bin), sampleRate: 16000, utt: window.__utt || null }));
  }

  // ---------- controls (constitutional: always within reach) ----------
  const pill = $('#solnik-pill', root);
  $('#sk-mute', root).onclick = (e) => { const b = e.currentTarget; store.muted = !store.muted; b.setAttribute('aria-pressed', String(store.muted)); if (masterGain) masterGain.gain.value = store.muted ? 0 : 1; if (store.muted) stopSpeaking(true); };
  $('#sk-dismiss', root).onclick = () => { visibleWanted = false; travel = null; followMode = 'idle'; gestureTok++; group.visible = false; caption.classList.remove('on'); stopSpeaking(true); };
  $('#sk-summon', root).onclick = () => {
    ensureAudio();
    if (!ws || ws.readyState > 1) { wsTries = 0; connectBrain(); } // Summon also revives a dead brain link
    if (asleep && ws && ws.readyState === 1) { ws.send(JSON.stringify({ type: 'wake' })); asleep = false; }
    visibleWanted = true; group.visible = true;
    exprPrio = 0; setExpr('welcome', 2600);
    const a = nearestAnchor(); if (a) perchAt(a, false);
    if (!greeted && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'hello', visitorId: store.visitor(), variant: greetingVariant }));
  };
  $('#sk-disable', root).onclick = () => {
    lsSet('solnik_disabled', '1');
    speakOn = false; listening = false; // Disable kills the microphone too — sovereignty is total
    if (vad) { try { vad.pause(); } catch (e) {} }
    if (sr) { try { sr.stop(); } catch (e) {} sr = null; }
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
  const baseHeadQ = new THREE.Quaternion();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    mixer.update(dt);
    if (headB) baseHeadQ.copy(headB.quaternion); // the clip's pose this frame; gaze composes onto it, never onto last frame's gaze
    stepTravel(dt); stepBody(dt, now); stepLoco(now); stepExpr(dt, now); stepGrip(); stepBurst(dt); stepFace(dt, now); stepVisemes(); stepCaption();
    renderer.render(scene, camera);
  }
  addEventListener('resize', () => { anchorsCache = null; fit(); const a = anchors()[perchId]; if (a) { pos.x = a.x; pos.y = a.topY; place(); } }); // anchorsCache=null: pre-resize rects must never steer a follow hop (critic B7)
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
  window.__solnik = { version: 'completion-01', anchors, state: () => ({ perchId, speaking, asleep, visibleWanted, travelling: !!travel, lastLifeAt, followMode, expr: exprName }) };
}

function renderReenable(note) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483000;background:rgba(20,16,10,.92);border:1px solid #C9A227;border-radius:999px;padding:7px 13px;font:13px Georgia,serif;color:#E9DDC6';
  d.innerHTML = (note ? note + ' ' : 'Solnik is off. ') + '<a href="#" style="color:#C9A227">Re-enable Solnik</a>';
  d.querySelector('a').onclick = (e) => { e.preventDefault(); try { localStorage.removeItem('solnik_disabled'); } catch (err) {} location.reload(); };
  document.body.appendChild(d);
}

function posterMode(root, say, greetingVariant) { // no WebGL / no body: the adopted portrait + working text chat + full sovereignty pill
  if (root.dataset.posterWired) return;
  root.dataset.posterWired = '1';
  const p = document.createElement('div');
  p.id = 'solnik-poster';
  p.innerHTML = '<img src="' + new URL('.', import.meta.url).pathname + 'assets/solnik-character-v1.jpg" alt="Solnik, the brass service sprite of Provadia"><p><strong style="color:#C9A227">Solnik</strong> — the town\'s service sprite. This device can\'t show him in 3D, but he is still here: use Type below to talk to him.</p>';
  root.appendChild(p);
  const caption = $('#solnik-caption', root); // the main loop never runs here, so park the caption top-right
  if (caption) { caption.style.left = 'auto'; caption.style.right = '14px'; caption.style.top = '14px'; }
  say('This is Solnik, in portrait form — my 3D body needs WebGL, which this device has off.');
  // The pill and Type box were built with the root but the 3D path wires them — wire them here too,
  // or Summon/Mute/Dismiss/Disable and the promised text chat are dead buttons in this mode.
  let pws = null, dismissed = false;
  const connect = () => {
    try { pws = new WebSocket(BRAIN); } catch (e) { return; }
    pws.onopen = () => pws.send(JSON.stringify({ type: 'hello', visitorId: store.visitor(), variant: greetingVariant }));
    pws.onmessage = (ev) => {
      if (dismissed || ev.data instanceof ArrayBuffer) return; // portrait mode is text-only: voice frames are dropped
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'sentence' && m.text) say(m.text);
      if (m.type === 'voice_capped') say('My voice is resting for today — but I can still chat in writing.');
    };
    pws.onclose = () => { pws = null; };
  };
  connect();
  const q = (s) => root.querySelector(s);
  q('#sk-type').onclick = () => { q('#solnik-talk').classList.toggle('on'); q('#solnik-input').focus(); };
  const doSend = () => { const i = q('#solnik-input'); const t = i.value.trim(); if (!t) return; i.value = ''; if (!pws || pws.readyState !== 1) { connect(); say('One moment — my brain is still waking up. Try again in a second.'); return; } pws.send(JSON.stringify({ type: 'say', text: t })); };
  q('#solnik-send').onclick = doSend;
  q('#solnik-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
  q('#sk-speak').onclick = () => say('Voice needs my 3D body — but you can type to me, and I will answer in writing.');
  q('#sk-mute').onclick = (e) => { store.muted = !store.muted; e.currentTarget.setAttribute('aria-pressed', String(store.muted)); };
  q('#sk-dismiss').onclick = () => { dismissed = true; if (pws && pws.readyState === 1) pws.send(JSON.stringify({ type: 'interrupt' })); p.style.display = 'none'; caption.classList.remove('on'); };
  q('#sk-summon').onclick = () => { dismissed = false; p.style.display = ''; if (!pws) connect(); };
  q('#sk-disable').onclick = () => { lsSet('solnik_disabled', '1'); if (pws) { try { pws.close(); } catch (e) {} } root.remove(); renderReenable('Solnik is off. He stays off until you call him back.'); };
}
