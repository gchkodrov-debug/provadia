// SOLNIK — living-entity.js (CARTOON BODY, cartoon-01, 2026-11-25)
// The founder's cartoon re-founding: the same brain, voice, sovereignty pill,
// anchors, locomotion decisions and expression triggers as completion-01 —
// cartoon-02 adds the ENVIRONMENT-INTERACTION layer (partner challenge,
// 2026-11-25): depth planes + occlusion, portal emerge/enter, and page-synced
// object interaction, on the Living Universe anchor contract (engine/universes.js:
// kinds perch/portal/instrument/object; verbs emerge/operate/inspect/read/open).
// but the body is a hand-drawn 2D cartoon (solnik-toon.js, SVG rig, zero image
// assets) with REAL locomotion: he walks, runs, climbs and drops between
// perches instead of gliding. The 3D body remains deployed as
// living-entity-3d.js for instant rollback.
// Judging standard (founder, 2026-11-25): REAL AS POSSIBLE — where realism trades
// against convenience, realism wins; no faked capabilities, no consciousness claims.
// Page-body half of the Living Entity Engine (Gemini #109). Hand-drawn SVG
// cartoon overlay (solnik-toon.js); his brain lives at
// wss://brain.provadiacoin.com/v1/solnik.
// Constitutional fences: guidance/conversation only; summon/mute/dismiss/disable
// are the visitor's, always within reach.
let Toon = null;
try { ({ Toon } = await import('./solnik-toon.js')); } catch (e) { Toon = null; } // a rig that fails to LOAD degrades to the portrait too — never a dead page (blind verifier D5)

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
    #solnik-stage{position:fixed;left:0;top:0;pointer-events:none;will-change:transform}#solnik-stage svg{display:block;width:100%;height:100%}
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
  const say = (t) => { // conversation sentences QUEUE: the brain sends a reply's sentences in a burst, and instant overwrite flashed middle sentences for ~90 ms — unreadable (verifier re-probe, 2026-11-25). Each sentence now gets its reading time.
    say._q.push(t); say._pump();
  };
  say._q = []; say._busy = false;
  say._dwell = (t) => Math.min(5200, Math.max(1500, 1100 + t.length * 45)); // reading time per sentence, roughly his speaking pace
  say._pump = () => {
    if (say._busy || !say._q.length) return;
    say._busy = true;
    const t = say._q.shift();
    caption.textContent = t; caption.classList.add('on');
    clearTimeout(say._t);
    say._t = setTimeout(() => { say._busy = false; if (say._q.length) say._pump(); else caption.classList.remove('on'); }, say._dwell(t));
  };
  say.now = (t) => { // state notices (napping, capped, listening…) show at once, dropping any queued sentences
    say._q.length = 0; say._busy = false; clearTimeout(say._t);
    caption.textContent = t; caption.classList.add('on');
    say._t = setTimeout(() => caption.classList.remove('on'), Math.max(3200, t.length * 95));
  };
  say.flush = () => { say._q.length = 0; }; // barge-in / dismiss: pending sentences never surface after the moment has passed

  // ---------- cartoon stage (SVG rig; no WebGL, no model files) ----------
  let VW = innerWidth, VH = innerHeight;
  function fit() { VW = innerWidth; VH = innerHeight; }
  const mobile = Math.min(VW, VH) < 620 || (navigator.hardwareConcurrency || 8) <= 4;
  const S = mobile ? 118 : 148; // his on-page width in px (the 3D body's scale, kept so caption/perch math is unchanged)
  const SW = S, SH = Math.round(S * 260 / 220); // stage box: viewBox 220x260
  const stage = document.createElement('div');
  stage.id = 'solnik-stage'; stage.setAttribute('aria-hidden', 'true');
  document.body.appendChild(stage); // body-level SIBLING of the root: the sovereignty layer must never sink, but HE must be able to pass BEHIND the world's foreground — two planes, two elements
  stage.style.width = SW + 'px'; stage.style.height = SH + 'px';
  stage.style.zIndex = '2147482999';
  let toon;
  try { if (!Toon) throw new Error('cartoon rig unavailable'); toon = new Toon(stage); } catch (e) { return posterMode(root, say, greetingVariant); } // a body that cannot be drawn degrades to the portrait, never to a dead pill

  // ---------- gesture system (the cartoon's clips) ----------
  // playClip keeps the completion-01 call contract; names map to cartoon
  // gestures: greet/wave, point, listen (head tilt), perch (grip/settle).
  let clipNameNow = 'idle';
  let gesture = { name: 'none', until: 0 };
  let gripUntil = 0;
  function gripArms() { gripUntil = performance.now() + 2400; }
  function playClip(name, fade = 0.25, loop = false) {
    clipNameNow = name;
    const now = performance.now();
    if (name === 'greet') gesture = { name: 'greet', until: now + 2900 };
    else if (name === 'point') gesture = { name: 'point', until: now + 900 };
    else if (name === 'listen') gesture = { name: 'listen', until: now + 1600 };
    else if (name === 'perch') gesture = { name: 'grip', until: now + 1100 };
    else if (name === 'operate') gesture = { name: 'operate', until: now + 1500 };
    else if (name === 'touch') gesture = { name: 'touch', until: now + 900 };
    else if (name === 'inspect') gesture = { name: 'inspect', until: now + 1600 };
    else if (name === 'idle') gesture = { name: 'none', until: 0 };
    return null;
  }

  // ---------- materialise burst (rig-drawn gold sparks) ----------
  let burstT = -1;
  function fireBurst(cx, cy) { if (reduced) return; burstT = 0; }
  function stepBurst(dt) { if (burstT < 0) return; burstT += dt / 0.9; if (burstT > 1) burstT = -1; }

  // ---------- anchors (the DOM Anchor Graph, specimen slice) ----------
  function anchors(all) {
    const out = {};
    document.querySelectorAll('[data-solnik-anchor]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 30) return;
      if (!all && (r.bottom < -80 || r.top > VH + 80)) return;
      const fx = parseFloat(el.dataset.solnikX || '0.5');
      out[el.dataset.solnikAnchor] = { x: r.left + r.width * fx, topY: VH - r.top, el,
        kind: el.dataset.solnikKind || 'perch', verb: el.dataset.solnikVerb || null,
        label: el.dataset.solnikLabel || '', target: el.dataset.solnikTarget || null,
        depth: el.dataset.solnikDepth || null };
    });
    return out;
  }
  function nearestAnchor() {
    const a = anchors(); let best = null, bd = 1e12;
    for (const k in a) { const d = Math.abs(a[k].topY - VH * 0.45) + Math.abs(a[k].x - VW / 2) * 0.4; if (d < bd) { bd = d; best = { id: k, ...a[k] }; } }
    return best;
  }

  // ---------- placement + travel (ROUTE WALKER: real locomotion) ----------
  // He no longer glides on an arc. A route is built from legs: walk/run along
  // his level, then climb (up) or drop (down) to the target level. perchAt
  // keeps the completion-01 contract: returns the route duration in seconds.
  const pos = { x: Math.max(84, VW * 0.09), y: VH * 0.86 }; // starts at the lower-left margin — dead centre is where doors put their main buttons (blind verifier P-D1)
  let travel = null, perchId = null, visibleWanted = true, asleep = false;
  let swingIn = null; // the swing-in entrance: {t0, dur, px, py, L, th0, ang, cableVb, start}
  let bobY = 0, bobEnv = 0; // speech bob (px) + its voice-envelope driver
  let locoPhase = 0, landUntil = 0, facing = 1, facingT = 1;
  let perchKind = 'perch', perchDepth = null, lastVerb = null;
  // ---------- depth planes + occlusion ----------
  // front: above the page (z 2147482999, under the sovereignty root). behind:
  // z 3 — page elements marked data-solnik-occluder sit at z 6 and cover him,
  // so walking behind machinery is REAL occlusion, not a fade. He is behind
  // while perched on a depth="behind" anchor, or while his body crosses an
  // occluder's box during travel.
  let plane = 'front', occCache = [], occCacheAt = 0, planeCheckAt = 0;
  document.querySelectorAll('[data-solnik-occluder]').forEach(el => { const cs = getComputedStyle(el); if (cs.position === 'static') el.style.position = 'relative'; if (cs.zIndex === 'auto') el.style.zIndex = '6'; });
  function setPlane(p) { if (p === plane) return; plane = p; stage.style.zIndex = p === 'behind' ? '3' : '2147482999'; stage.style.filter = p === 'behind' ? 'brightness(.87) saturate(.94)' : ''; stage.dataset.plane = p; }
  function stepPlane(now) {
    if (now - planeCheckAt < 120) return; planeCheckAt = now;
    if (now - occCacheAt > 250) { occCacheAt = now; occCache = [...document.querySelectorAll('[data-solnik-occluder]')].map(el => { const r = el.getBoundingClientRect(); return { l: r.left - 4, r: r.right + 4, t: r.top - 4, b: r.bottom + 4 }; }); }
    let behind = perchDepth === 'behind' && !travel;
    if (!behind) { const feetTop = VH - pos.y; for (const o of occCache) { if (pos.x > o.l && pos.x < o.r && feetTop > o.t && feetTop - SH < o.b) { behind = true; break; } } }
    setPlane(behind ? 'behind' : 'front');
  }
  // ---------- arrival interaction (approach + operate/touch/inspect, page-synced) ----------
  const VERB_CLIP = { operate: 'operate', touch: 'touch', open: 'touch', inspect: 'inspect', read: 'inspect', point: 'point', emerge: 'greet' };
  let arriveTok = 0;
  function arriveInteract(id) {
    const pid = id || perchId; // the anchor THIS arrival belongs to — never the global at fire time: back-to-back interact() calls overwrote perchId before the deferred call ran and misannounced arrivals (live-wired-doors probe, 2026-11-25)
    const a = anchors(true)[pid]; if (!a) return;
    document.dispatchEvent(new CustomEvent('solnik:arrive', { detail: { anchorId: pid, kind: a.kind } }));
    if (!a.verb) return;
    lastVerb = a.verb;
    engagedUntil = performance.now() + 6000; // he stays with the thing he is operating while the interaction plays out
    const tgt = a.target ? document.querySelector(a.target) : null;
    if (tgt) { const r = tgt.getBoundingClientRect(); facingT = (r.left + r.width / 2) >= pos.x ? 1 : -1; } // he turns to face the instrument itself
    const tok = ++arriveTok;
    setTimeout(() => { if (tok !== arriveTok || !visibleWanted || travel || perchId !== pid) return; // he has moved on — a gesture for a place he left must not play or be announced
      if (performance.now() > guideBusyUntil) playClip(VERB_CLIP[a.verb] || 'point'); // a brain guide plays its own arrival gesture; the event below fires either way
      document.dispatchEvent(new CustomEvent('solnik:interact', { detail: { anchorId: pid, verb: a.verb, label: a.label || '', target: a.target || null } }));
    }, 480);
  }
  let portalAnim = null, portalAfterTravel = null, portalResolve = null, throughPortal = false, enteredVia = 'drop';
  let engagedUntil = 0; // while he works an instrument/object, voluntary locomotion must not drag him off it
  function place() { stage.style.transform = 'translate(' + Math.round(pos.x - SW / 2) + 'px,' + Math.round(VH - pos.y - SH + 7) + 'px)'; }
  function makeLeg(type, x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    let dur;
    if (type === 'run') dur = clamp(dist / 620, 0.3, 2.6);
    else if (type === 'walk') dur = clamp(dist / 300, 0.28, 3.2);
    else if (type === 'climb') dur = clamp(dist / 175, 0.45, 2.6);
    else dur = clamp(dist / 950, 0.22, 0.75); // drop: gravity, not a motor
    return { type, x0, y0, x1, y1, dur, t: 0 };
  }
  function perchAt(a, instant) {
    perchId = a.id; perchKind = a.kind || 'perch'; perchDepth = a.depth || null;
    const dest = { x: a.x, y: a.topY };
    if (instant || reduced) { pos.x = dest.x; pos.y = dest.y; place(); fireBurst(dest.x, dest.y + 30); return 0; }
    const dx = dest.x - pos.x, dy = dest.y - pos.y, dist = Math.hypot(dx, dy);
    if (dist < 30) return 0;
    const legs = [];
    const vert = Math.abs(dy) > 110, horiz = Math.abs(dx) > 70;
    if (vert && horiz) legs.push(makeLeg(dist > 430 ? 'run' : 'walk', pos.x, pos.y, dest.x, pos.y));
    else if (horiz) legs.push(makeLeg(dist > 430 ? 'run' : 'walk', pos.x, pos.y, dest.x, dest.y));
    if (vert) legs.push(makeLeg(dy > 0 ? 'climb' : 'drop', horiz ? dest.x : pos.x, horiz ? pos.y : pos.y, dest.x, dest.y));
    if (!legs.length) legs.push(makeLeg('walk', pos.x, pos.y, dest.x, dest.y));
    travel = { legs, i: 0, face: dx !== 0 ? Math.sign(dx) : facingT };
    return legs.reduce((s, l) => s + l.dur, 0);
  }
  function stepTravel(dt) {
    if (!travel) return;
    const leg = travel.legs[travel.i];
    leg.t += dt;
    const k = Math.min(1, leg.t / leg.dur);
    let e = k;
    if (leg.type === 'drop') e = k * k; // falls accelerate
    else if (leg.type === 'climb') e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    pos.x = lerp(leg.x0, leg.x1, e);
    pos.y = lerp(leg.y0, leg.y1, e);
    locoPhase += dt * (leg.type === 'walk' ? 10.5 : leg.type === 'run' ? 15 : leg.type === 'climb' ? 5.4 : 0);
    if (k >= 1) {
      travel.i++;
      if (travel.i >= travel.legs.length) {
        const lastType = leg.type;
        travel = null;
        if (lastType === 'drop') landUntil = performance.now() + 230;
        playClip('perch', 0.15); setTimeout(() => { if (clipNameNow === 'perch') playClip('idle', 0.4, true); }, 1150); gripArms(); // ends the perch settle only — an interaction gesture started on arrival outranks it
        arriveInteract();
        if (portalAfterTravel) { const f = portalAfterTravel; portalAfterTravel = null; setTimeout(f, 350); }
      }
    }
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
  function locoFree(now) { return !reduced && visibleWanted && !asleep && !travel && now > guideBusyUntil && now > engagedUntil && !document.hidden; }
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
  function stepBody(dt, now) { // facing (travel direction, else the visitor's side) + speech bob from the ACTUAL voice envelope (last frame's analyser snapshot — a metronome reads as a machine; the envelope moves when the voice moves)
    if (travel) facingT = travel.face;
    else if (hasPointer && mouse.seen && !asleep && Math.abs(mouse.x - pos.x) > 90) facingT = mouse.x > pos.x ? 1 : -1;
    facing = lerp(facing, facingT, Math.min(1, dt * 5));
    const envT = (speaking && analyser && !travel) ? clamp(band(85, 320) * 5.0, 0, 1) : 0;
    bobEnv = lerp(bobEnv, envT, Math.min(1, dt * 9));
    bobY = bobEnv > 0.03 ? Math.sin(now * 0.007) * 2.0 * bobEnv : 0;
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
  const exprDyn = { mE: 0, brow: 0 };                        // chuckle mouth pulses, read by stepVisemes
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
    exprDyn.brow = dBrow; // the cartoon rig reads exprCur + exprDyn.brow in the frame assembly (no bones to write)
  }

  // ---------- face state (gaze + blink + heart, composed for the rig) ----------
  const faceState = { pupilX: 0, pupilY: 0, eyeScale: 1, crystal: 0.85, headRoll: 0, headPitchPx: 0, headYawPx: 0 };
  function stepGrip() {} // grip is a gesture in the cartoon body — the frame assembly reads gripUntil

  // ---------- gaze + blink + heart ----------
  const mouse = { x: VW / 2, y: VH / 2, seen: false };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true; lastPointerMoveAt = performance.now(); lastInteractAt = lastPointerMoveAt; }, { passive: true });
  let blinkAt = 1800, blinking = 0;
  function stepFace(dt, now) {
    // gaze: pupils lead, head follows a little; expression head offsets compose
    // on top (single state write — gaze and expression never fight)
    let gx = 0, gy = 0;
    if (mouse.seen && !asleep) { gx = clamp((mouse.x - pos.x) * 0.006, -4.5, 4.5); gy = clamp((mouse.y - (VH - pos.y)) * 0.005, -3.5, 4); }
    faceState.pupilX = gx + exprHead.yaw * 7;
    faceState.pupilY = gy + exprHead.pitch * 24;
    faceState.headYawPx = clamp(mouse.seen && !asleep ? (mouse.x - pos.x) * 0.008 : 0, -5, 5) + exprHead.yaw * 8;
    faceState.headPitchPx = exprHead.pitch * 26;
    faceState.headRoll = exprHead.roll * 57 + (gesture.name === 'listen' ? 7 : 0) + (speaking ? Math.sin(now * 0.006) * 1.3 : 0);
    if (now > blinkAt) { blinking = 130; blinkAt = now + 2300 + Math.random() * 2800; }
    let bs = 1;
    if (blinking > 0) { bs = Math.max(0.06, Math.abs(blinking - 65) / 65); blinking -= dt * 1000; }
    faceState.eyeScale = (asleep ? 0.1 : bs) * exprEye;
    faceState.crystal = (asleep ? 0.5 : speaking ? 1.35 : listening ? 1.1 : 0.85) + (exprName === 'pride' ? 0.45 : 0) + Math.sin(now * (speaking ? 0.02 : 0.004)) * 0.1;
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
    say.flush(); // queued captions from the interrupted reply never surface
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
  // ---------- mouth: band-driven viseme shapes for the cartoon mouth ----------
  let mouthState = { name: 'smile', open: 0.22 };
  let mouthOpenSm = 0.22, mouthNameSm = 'smile', candName = 'smile', candCount = 0;
  function resetVisemes() { mouthNameSm = 'smile'; mouthOpenSm = 0.22; candName = 'smile'; candCount = 0; }
  function stepVisemes() {
    let name = null, open = 0, voiceActive = false;
    if (speaking && analyser) {
      analyser.getByteFrequencyData(freqData); // one snapshot per frame for all band reads
      const lo = band(85, 320), mid = band(320, 1250), hi = band(2000, 6400), amp = band(85, 6400);
      if (amp > 0.03) {
        voiceActive = true;
        const w = { aa: lo * 2.4, O: Math.max(0, lo * 1.5 - mid * 0.7), E: Math.max(0, mid * 1.9 - lo * 0.5), I: mid * 1.2 * (hi + 0.4), SS: Math.max(0, hi * 2.2 - 0.25), FF: Math.max(0, hi * 1.4 - 0.3) };
        let bw = -1; name = 'aa'; for (const k in w) if (w[k] > bw) { bw = w[k]; name = k; }
        open = clamp(amp * 2.4, 0.3, 1);
      }
    }
    if (!voiceActive) { // expression mouth base: live speech wins while audio plays; the held face returns as speech decays (no popping — openness is eased)
      if (exprMouth.PP > 0.15) { name = 'PP'; open = 0.3; }
      else if (exprDyn.mE > 0.12) { name = 'grin'; open = 0.55 + exprDyn.mE * 0.5; }
      else if (exprMouth.E > 0.28) { name = 'smile'; open = 0.4 + exprMouth.E * 0.35; }
      else if (exprMouth.E > 0.08 || exprMouth.I > 0.08) { name = 'smile'; open = 0.3; }
      else if (exprName === 'neutral') { name = 'smile'; open = 0.2; } // his resting face is the portrait's gentle smile
      else { name = 'sil'; open = 0.22; }
    }
    if (name === candName) candCount++; else { candName = name; candCount = 0; }
    if (candCount >= 2 || !voiceActive) mouthNameSm = candName; // 2-frame hysteresis against shape flicker
    mouthOpenSm = lerp(mouthOpenSm, open, voiceActive ? 0.55 : 0.2);
    mouthState = { name: mouthNameSm, open: mouthOpenSm };
  }

  // ---------- brain link ----------
  let ws = null, wsTries = 0, greeted = false;
  function guide(anchorId, scroll = true) {
    const a = anchors(true)[anchorId]; // fresh read (never the 550 ms locomotion cache): a stale rect here would perch him at a pre-scroll position
    if (!a) return;
    guideBusyUntil = performance.now() + 8000; // locomotion yields while the brain is driving (scroll + 650 ms settle + travel ≤1.9 s + point ≈2 s, with margin for long smooth scrolls)
    if (scroll) a.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { if (!visibleWanted) return; const b = anchors(true)[anchorId]; if (b) { const dur = perchAt({ id: anchorId, ...b }, false) || 0; const arrive = dur ? dur * 1000 + 60 : 950; setTimeout(() => { if (visibleWanted) { gestureTok++; const ga = anchors(true)[anchorId]; playClip((ga && ga.verb && VERB_CLIP[ga.verb]) || 'point', 0.15); } }, arrive); setTimeout(() => { if (!visibleWanted) return; playClip('idle', 0.4, true); if (!travel && perchId === anchorId) { const c = anchors(true)[anchorId]; if (c) { pos.x = c.x; pos.y = c.topY; place(); } } }, arrive + 1950); } }, reduced ? 60 : 650); // Dismiss mid-guide cancels the perch (sovereignty); the final fresh re-pin corrects any rect read mid-smooth-scroll once everything has settled
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
      if (m.type === 'sleep') { asleep = true; pendingMood = null; setExpr('sleepy', 0, 3); say.now('Zzz… tap Summon when you need me.'); } // a mood queued before sleep must not leak into the next waking answer
      if (m.type === 'awake') { asleep = false; exprPrio = 0; setExpr('neutral'); }
      if (m.type === 'voice_capped') say.now('My voice is resting for today — but I can still chat in writing.');
      if (m.type === 'stt_unavailable') say.now("I heard you — but turning voice into words isn't ready on my side yet. You can type to me, and I'll speak back.");
      if (m.type === 'interrupted') stopSpeaking(false);
    };
    ws.onclose = () => { if (wsTries < 2) { wsTries++; setTimeout(connectBrain, 2500 * wsTries); } else say.now('My brain is napping — the captain has the note. You can still look around; I will be back.'); };
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
    else say.now('One moment — my brain is still waking up.');
  }

  // ---------- voice input: Silero VAD (lazy) + SpeechRecognition where present ----------
  let vad = null, sr = null, speakOn = false;
  async function toggleSpeak(btn) {
    if (speakOn) { speakOn = false; btn.setAttribute('aria-pressed', 'false'); if (vad) vad.pause(); if (sr) { try { sr.stop(); } catch (e) {} } listening = false; return; }
    ensureAudio();
    speakOn = true; btn.setAttribute('aria-pressed', 'true'); listening = true;
    say.now('Listening… talk to me. If I am speaking, just start — I will stop and listen.');
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
    } catch (e) { say.now('My ears could not open here — the microphone or its models were blocked. You can type to me instead.'); }
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
  $('#sk-dismiss', root).onclick = () => { visibleWanted = false; travel = null; followMode = 'idle'; gestureTok++; stage.style.display = 'none'; caption.classList.remove('on'); stopSpeaking(true); if (portalResolve) { portalResolve(false); portalResolve = null; } portalAnim = null; portalAfterTravel = null; }; // a dismissed boy does not slip through portals behind the visitor's back
  $('#sk-summon', root).onclick = () => {
    ensureAudio();
    if (!ws || ws.readyState > 1) { wsTries = 0; connectBrain(); } // Summon also revives a dead brain link
    if (asleep && ws && ws.readyState === 1) { ws.send(JSON.stringify({ type: 'wake' })); asleep = false; }
    visibleWanted = true; stage.style.display = '';
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
    cancelAnimationFrame(raf); root.remove(); stage.remove();
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
  function stepSwing(now) {
    if (!swingIn) return;
    const k = Math.min(1, (now - swingIn.t0) / swingIn.dur);
    const ang = swingIn.th0 * Math.cos(k * Math.PI * 0.72);
    swingIn.ang = ang;
    pos.x = swingIn.px + swingIn.L * Math.sin(ang);
    pos.y = swingIn.py - swingIn.L * Math.cos(ang);
    facingT = 1;
    if (k >= 1) { const st = swingIn.start; swingIn = null; perchAt({ id: st.id, x: st.x, topY: st.topY }, false); if (travel && travel.legs.length === 2) travel.legs.reverse(); } // let go: drop the last stretch first, then walk in on the ground
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    stepSwing(now); stepTravel(dt); stepBody(dt, now); stepLoco(now); stepExpr(dt, now); stepGrip(); stepBurst(dt); stepFace(dt, now); stepVisemes(); stepCaption(); stepPlane(now);
    let portalK = -1;
    if (portalAnim) { portalK = Math.min(1, (now - portalAnim.t0) / portalAnim.dur); if (portalK >= 1) { const doneMode = portalAnim.mode; portalAnim = null; if (doneMode === 'enter') { stage.style.display = 'none'; throughPortal = true; if (portalResolve) { portalResolve(true); portalResolve = null; } } } }
    if (gesture.name !== 'none' && now > gesture.until) gesture = { name: 'none', until: 0 };
    const gName = gesture.name !== 'none' ? gesture.name : (exprName === 'chuckle' ? 'chuckleBody' : (now < gripUntil && !travel ? 'grip' : 'none'));
    const legType = travel ? travel.legs[travel.i].type : null;
    if (visibleWanted) toon.render({
      t: now / 1000, facing,
      loco: { mode: portalAnim ? portalAnim.mode : (swingIn ? 'swing' : (asleep ? 'sleep' : (legType || (now < landUntil ? 'land' : 'idle')))), phase: locoPhase, landT: Math.max(0, landUntil - now) / 1000, k: portalK < 0 ? 1 : portalK },
      swing: swingIn ? { ang: swingIn.ang, cableVb: swingIn.cableVb } : null,
      gesture: { name: gName, el: now - exprT0 },
      head: { roll: faceState.headRoll, pitchPx: faceState.headPitchPx, yawPx: faceState.headYawPx },
      face: { browL: (exprCur.browL + exprDyn.brow) * 130, browR: (exprCur.browR + exprDyn.brow) * 130, browAngL: exprName === 'serious' ? 9 : 0, browAngR: exprName === 'serious' ? 9 : 0, eyeOpen: faceState.eyeScale, pupilX: faceState.pupilX, pupilY: faceState.pupilY, mouth: mouthState.name, mouthOpen: mouthState.open },
      crystal: faceState.crystal, bobPx: bobY, zzz: asleep ? 1 : 0, burstT, portal: portalAnim ? Math.sin(Math.max(0, portalK) * Math.PI) * 0.95 : 0,
      airPx: legType === 'drop' ? Math.max(0, pos.y - travel.legs[travel.i].y1) : 0,
    });
    if (visibleWanted) place();
  }
  addEventListener('resize', () => { anchorsCache = null; fit(); const a = anchors()[perchId]; if (a) { pos.x = a.x; pos.y = a.topY; place(); } }); // anchorsCache=null: pre-resize rects must never steer a follow hop (critic B7)
  addEventListener('load', () => { anchorsCache = null; }); // late layout (the Mint gallery's inline images) must not leave the anchor graph pointing at pre-load rects — found by the live-wired-doors probe, 2026-11-25
  setTimeout(() => { anchorsCache = null; }, 3500); // one settling pass for lazy content that lands after load
  document.addEventListener('scroll', () => { if (!travel && perchId) { const a = anchors()[perchId]; if (a) { pos.x = a.x; pos.y = a.topY; place(); } } }, { passive: true });

  // ---------- entrance (drop-in: he falls to his first perch and lands) ----------
  const allAnchors = anchors(true);
  const portalAnchor = Object.keys(allAnchors).map(k => ({ id: k, ...allAnchors[k] })).find(a => a.kind === 'portal');
  const start = portalAnchor || nearestAnchor() || { id: 'town-margin', x: Math.max(84, VW * 0.09), topY: VH * 0.86 }; // no anchor in the window: the lower-left margin, never dead centre — the entry door's coin-open button lives at centre and he must not stand on it (P-D1)
  perchId = start.id; perchKind = start.kind || 'perch'; pos.x = start.x;
  if (portalAnchor && !reduced) { enteredVia = 'portal'; pos.y = start.topY; place(); portalAnim = { mode: 'emerge', t0: performance.now(), dur: 1150 }; fireBurst(start.x, start.topY + 30); }
  else if (reduced) { pos.y = start.topY; place(); }
  else { // swing-in entrance (the founder's clip list names swing/drop-in): he swings in on a ribbon cable, lets go, and drops the last stretch to his perch
    const L = Math.min(300, VH * 0.44);
    swingIn = { t0: performance.now(), dur: 1400, px: start.x, py: start.topY + L, L, th0: -0.62, ang: -0.62, cableVb: L * 220 / S, start: { id: start.id, x: start.x, topY: start.topY } };
    pos.x = swingIn.px + L * Math.sin(-0.62); pos.y = swingIn.py - L * Math.cos(-0.62); place();
    engagedUntil = performance.now() + 2600; // the entrance is his — no follow hop may cut the swing short
  }
  fireBurst(start.x, start.topY + 40);
  gripArms();
  connectBrain();
  if (reduced) { // static specimen of the same state: one composed frame, no loop
    toon.render({ t: 0.4, facing: 1, loco: { mode: 'idle', phase: 0, landT: 0 }, gesture: { name: 'none', el: 0 }, head: { roll: 0, pitchPx: 0, yawPx: 0 }, face: { browL: 2, browR: 2, browAngL: 0, browAngR: 0, eyeOpen: 1, pupilX: 0, pupilY: 0, mouth: 'smile', mouthOpen: 0.25 }, crystal: 0.85, bobPx: 0, zzz: 0, burstT: -1, airPx: 0 });
    say.now('Solnik is here (calm mode — reduced motion is on). Use the Type button to talk to me.');
  } else {
    raf = requestAnimationFrame(frame);
  }
  window.__solnik = { version: 'cartoon-02', anchors, state: () => ({ perchId, perchKind, plane, lastVerb, throughPortal, enteredVia, speaking, asleep, visibleWanted, travelling: !!travel, locoMode: portalAnim ? portalAnim.mode : (swingIn ? 'swing' : (travel ? travel.legs[travel.i].type : (asleep ? 'sleep' : 'idle'))), facing, lastLifeAt, followMode, expr: exprName, gesture: gesture.name }),
    interact: (anchorId) => { const a = anchors(true)[anchorId]; if (!a) return false; perchAt({ id: anchorId, ...a }, false); if (!travel) setTimeout(() => arriveInteract(anchorId), 60); return true; },
    enterPortal: (anchorId) => new Promise((res) => { const a = anchors(true)[anchorId]; if (!a) { res(false); return; } if (reduced) { perchAt({ id: anchorId, ...a }, true); stage.style.display = 'none'; throughPortal = true; res(true); return; } portalResolve = res; const begin = () => { portalAnim = { mode: 'enter', t0: performance.now(), dur: 900 }; }; if (perchId === anchorId && !travel) begin(); else { perchAt({ id: anchorId, ...a }, false); if (!travel) begin(); else portalAfterTravel = begin; } }), // perchAt starts no route within 30 px — begin at once or the promise hangs (critic #9)
    emerge: (anchorId) => { const a = anchors(true)[anchorId]; if (!a) return false; throughPortal = false; stage.style.display = ''; visibleWanted = true; perchId = anchorId; perchKind = a.kind || 'perch'; perchDepth = a.depth || null; pos.x = a.x; pos.y = a.topY; place(); portalAnim = reduced ? null : { mode: 'emerge', t0: performance.now(), dur: 1150 }; fireBurst(a.x, a.topY + 30); return true; } };
}

function renderReenable(note) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;right:14px;bottom:14px;z-index:2147483000;background:rgba(20,16,10,.92);border:1px solid #C9A227;border-radius:999px;padding:7px 13px;font:13px Georgia,serif;color:#E9DDC6';
  d.innerHTML = (note ? note + ' ' : 'Solnik is off. ') + '<a href="#" style="color:#C9A227">Re-enable Solnik</a>';
  d.querySelector('a').onclick = (e) => { e.preventDefault(); try { localStorage.removeItem('solnik_disabled'); } catch (err) {} location.reload(); };
  document.body.appendChild(d);
}

function posterMode(root, say, greetingVariant) { // no drawable body: the adopted portrait + working text chat + full sovereignty pill
  if (!window.__solnik) window.__solnik = { version: 'cartoon-02-poster', anchors: () => ({}), state: () => ({ poster: true }), interact: () => false, enterPortal: () => Promise.resolve(false), emerge: () => false }; // the API object exists in every mode; in portrait mode the travel answers are honestly 'no'
  if (root.dataset.posterWired) return;
  root.dataset.posterWired = '1';
  const p = document.createElement('div');
  p.id = 'solnik-poster';
  p.innerHTML = '<img src="' + new URL('.', import.meta.url).pathname + 'assets/solnik-character-v1.jpg" alt="Solnik, the brass service sprite of Provadia"><p><strong style="color:#C9A227">Solnik</strong> — the town\'s service sprite. This device can\'t show him moving, but he is still here: use Type below to talk to him.</p>';
  root.appendChild(p);
  const caption = $('#solnik-caption', root); // the main loop never runs here, so park the caption top-right
  if (caption) { caption.style.left = 'auto'; caption.style.right = '14px'; caption.style.top = '14px'; }
  say.now('This is Solnik, in portrait form — my cartoon body could not be drawn on this device, so you get my portrait instead.');
  // The pill and Type box were built with the root but the living-body path wires them — wire them here too,
  // or Summon/Mute/Dismiss/Disable and the promised text chat are dead buttons in this mode.
  let pws = null, dismissed = false;
  const connect = () => {
    try { pws = new WebSocket(BRAIN); } catch (e) { return; }
    pws.onopen = () => pws.send(JSON.stringify({ type: 'hello', visitorId: store.visitor(), variant: greetingVariant }));
    pws.onmessage = (ev) => {
      if (dismissed || ev.data instanceof ArrayBuffer) return; // portrait mode is text-only: voice frames are dropped
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'sentence' && m.text) say(m.text);
      if (m.type === 'voice_capped') say.now('My voice is resting for today — but I can still chat in writing.');
    };
    pws.onclose = () => { pws = null; };
  };
  connect();
  const q = (s) => root.querySelector(s);
  q('#sk-type').onclick = () => { q('#solnik-talk').classList.toggle('on'); q('#solnik-input').focus(); };
  const doSend = () => { const i = q('#solnik-input'); const t = i.value.trim(); if (!t) return; i.value = ''; if (!pws || pws.readyState !== 1) { connect(); say.now('One moment — my brain is still waking up. Try again in a second.'); return; } pws.send(JSON.stringify({ type: 'say', text: t })); };
  q('#solnik-send').onclick = doSend;
  q('#solnik-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') doSend(); });
  q('#sk-speak').onclick = () => say.now('Voice needs my living body — but you can type to me, and I will answer in writing.');
  q('#sk-mute').onclick = (e) => { store.muted = !store.muted; e.currentTarget.setAttribute('aria-pressed', String(store.muted)); };
  q('#sk-dismiss').onclick = () => { dismissed = true; say.flush(); if (pws && pws.readyState === 1) pws.send(JSON.stringify({ type: 'interrupt' })); p.style.display = 'none'; caption.classList.remove('on'); };
  q('#sk-summon').onclick = () => { dismissed = false; p.style.display = ''; if (!pws) connect(); };
  q('#sk-disable').onclick = () => { lsSet('solnik_disabled', '1'); if (pws) { try { pws.close(); } catch (e) {} } root.remove(); renderReenable('Solnik is off. He stays off until you call him back.'); };
}
