/* PROVADIA — THE PULSE · 3D Observatory (pulse-coin-world-v1, Slices 2–3).
   The Heart (the official coin, anchored face textures — never redrawn),
   the Heartbeat (a curved ribbon of 60 instanced candles fed by the same
   verified OHLCV the functional chart draws), real-swap particle waves
   (fired only by verified new pool signatures, scaled by real SOL size),
   and the Genesis Constellation: 470 specimen nodes on three tilted rings,
   SPECIMEN · 0 / 470 MINTED until mainnet deploys.
   Honest states arrive as "pulse:state" events from the data engine:
   QUIET spawns zero particles; DELAYED halts the emitter and dims the
   ribbon to 35%. Renders only while the observatory pane is open. */
(function () {
  "use strict";

  var GOLD = 0xC9A227, BRIGHT = 0xE4C65B, BROWN = 0x30251B, BONE = 0xE9DDC6, VOID = 0x141210;
  var WICK = 0x6B4A12, DIMNODE = 0x171208;
  var state = "BOOT";
  var built = false, running = false, failed = false;
  var renderer, scene, camera, raf = 0, clock = null;
  var coinGroup, worldGroup, candleMesh, wickLines, nodeMesh, points, pointsGeo;
  var nodePos = [];              // constellation local positions (serial-1 -> Vector3)
  var nodeBaseColor = [];
  var selected = -1;
  var camAnim = null;
  var candlesCur = [], candlesTgt = [];
  var PMAX = 300;
  var pPos, pVel, pLife, pMaxLife, pAlive = 0;
  var fpsAcc = 0, fpsN = 0, fpsBadSince = 0, dprCut = false;
  var HOME_POS = null, HOME_LOOK = null;

  function stage() { return document.querySelector("[data-observatory-stage]"); }
  function reducedMotion() {
    return (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ||
      document.documentElement.getAttribute("data-calm") === "true";
  }

  function makeDotTexture(THREE) {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  function build() {
    if (built) return;
    built = true;
    var host = stage();
    if (!host) { failed = true; return; }
    var THREE = window.THREE;
    if (!THREE) { fallback(host, "The 3D observatory could not start — the chart carries the same live data."); return; }

    var W = host.clientWidth || 800, H = host.clientHeight || 440;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (e) { fallback(host, "WebGL is unavailable here — the chart carries the same live data."); return; }
    var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H);
    renderer.setClearColor(VOID, 1);
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(VOID, 0.028);
    camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 1.7, 8.6);
    camera.lookAt(0, 0.1, 0);
    HOME_POS = camera.position.clone();
    HOME_LOOK = new THREE.Vector3(0, 0.1, 0);

    scene.add(new THREE.AmbientLight(0xffe9b0, 0.55));
    var key = new THREE.DirectionalLight(0xE4C65B, 1.1);
    key.position.set(4, 6, 6);
    scene.add(key);
    var rim = new THREE.DirectionalLight(0xC9A227, 0.5);
    rim.position.set(-6, 2, -4);
    scene.add(rim);

    /* ---- THE HEART: the official coin, anchored textures ---- */
    coinGroup = new THREE.Group();
    var loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    var frontTex = loader.load("../design/assets/coin-front.webp");
    var backTex = loader.load("../design/assets/coin-reverse.webp");
    if (frontTex) { frontTex.anisotropy = 4; }
    if (backTex) { backTex.anisotropy = 4; backTex.center = new THREE.Vector2(0.5, 0.5); backTex.rotation = Math.PI; }
    var sideMat = new THREE.MeshStandardMaterial({ color: 0x8a6a1d, metalness: 0.85, roughness: 0.35 });
    var frontMat = new THREE.MeshStandardMaterial({ map: frontTex, metalness: 0.55, roughness: 0.42 });
    var backMat = new THREE.MeshStandardMaterial({ map: backTex, metalness: 0.55, roughness: 0.42 });
    var coinGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.16, 64);
    var coin = new THREE.Mesh(coinGeo, [sideMat, frontMat, backMat]);
    coin.rotation.x = Math.PI / 2;
    coinGroup.add(coin);
    coinGroup.position.set(0, 0.55, 0);
    scene.add(coinGroup);

    /* ---- THE WORLD: tilted astrolabe rings + constellation + particles ---- */
    worldGroup = new THREE.Group();
    worldGroup.rotation.x = -0.32; // the 18° inclination
    worldGroup.position.y = 0.35;
    scene.add(worldGroup);

    var RADII = [1.63, 2.15, 2.68];
    var COUNTS = [100, 170, 200];
    RADII.forEach(function (r, i) {
      var pts = [];
      for (var s = 0; s <= 128; s++) {
        var a = (s / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      var ringGeo = new THREE.BufferGeometry().setFromPoints(pts);
      var ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({
        color: GOLD, transparent: true, opacity: i === 1 ? 0.3 : 0.18
      }));
      worldGroup.add(ring);
    });

    /* ---- THE GENESIS CONSTELLATION: 470 specimen nodes, one InstancedMesh ---- */
    var nodeGeo = new THREE.OctahedronGeometry(0.045);
    var nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    nodeMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, 470);
    var m = new THREE.Matrix4();
    var col = new THREE.Color(BROWN);
    var serial = 0;
    RADII.forEach(function (r, ri) {
      for (var i = 0; i < COUNTS[ri]; i++) {
        var a = (i / COUNTS[ri]) * Math.PI * 2 + ri * 0.35;
        var p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
        nodePos.push(p);
        nodeBaseColor.push(col.clone());
        m.makeTranslation(p.x, p.y, p.z);
        nodeMesh.setMatrixAt(serial, m);
        nodeMesh.setColorAt(serial, col);
        serial++;
      }
    });
    nodeMesh.instanceMatrix.needsUpdate = true;
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
    worldGroup.add(nodeMesh);

    /* ---- THE HEARTBEAT: 60 instanced candles on a back arc + wick batch ---- */
    var candleGeo = new THREE.BoxGeometry(1, 1, 1);
    var candleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, fog: false });
    candleMesh = new THREE.InstancedMesh(candleGeo, candleMat, 60);
    scene.add(candleMesh);
    var wickPos = new Float32Array(60 * 2 * 3);
    var wickGeo = new THREE.BufferGeometry();
    wickGeo.setAttribute("position", new THREE.BufferAttribute(wickPos, 3));
    wickLines = new THREE.LineSegments(wickGeo, new THREE.LineBasicMaterial({
      color: WICK, transparent: true, opacity: 0.9, fog: false
    }));
    scene.add(wickLines);
    for (var ci = 0; ci < 60; ci++) { candlesCur.push({ h: 0, mid: 0, lo: 0, hi: 0, up: 1 }); candlesTgt.push({ h: 0, mid: 0, lo: 0, hi: 0, up: 1, empty: true }); }
    paintCandles(1);

    /* ---- Swap particles: pooled GPU points, zero per-frame allocation ---- */
    pPos = new Float32Array(PMAX * 3);
    pVel = new Float32Array(PMAX * 3);
    pLife = new Float32Array(PMAX);
    pMaxLife = new Float32Array(PMAX);
    var pCol = new Float32Array(PMAX * 3);
    for (var pi = 0; pi < PMAX; pi++) { pPos[pi * 3 + 1] = -999; }
    pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pointsGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));
    var pMat = new THREE.PointsMaterial({
      size: 0.09, map: makeDotTexture(THREE), vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      color: BRIGHT, fog: false
    });
    points = new THREE.Points(pointsGeo, pMat);
    points.frustumCulled = false;
    worldGroup.add(points);

    /* ---- interaction: tap a star (28px snap) ---- */
    renderer.domElement.addEventListener("pointerdown", function (ev) { pick(ev); });

    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (!renderer || !host.clientWidth) return;
        camera.aspect = host.clientWidth / host.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight);
      }).observe(host);
    }
    clock = new THREE.Clock();
    applyState();
  }

  function fallback(host, msg) {
    failed = true;
    var img = document.createElement("img");
    img.src = "../design/assets/coin-front.webp";
    img.alt = "The front of the PROVADIA coin: a Fortress P built of salt bricks, ringed with beads.";
    img.className = "pulse-obs-fallback-img";
    host.appendChild(img);
    var note = document.createElement("p");
    note.className = "pulse-obs-note";
    note.textContent = msg;
    host.appendChild(note);
  }

  /* ---------------- candles ---------------- */
  function candleXform(i, c) {
    var ang = Math.PI * (0.78 + (i / 59) * 1.44); // back arc, behind the heart
    var R = 3.45;
    return { x: Math.cos(ang) * R, z: Math.sin(ang) * R - 0.4, base: -1.5 };
  }
  function paintCandles(alpha) {
    if (!candleMesh) return;
    var THREE = window.THREE;
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), v = new THREE.Vector3();
    var up = new THREE.Color(GOLD), down = new THREE.Color(BROWN);
    var wp = wickLines.geometry.getAttribute("position");
    for (var i = 0; i < 60; i++) {
      var c = candlesCur[i], xf = candleXform(i, c);
      if (c.h <= 0.001 && candlesTgt[i].empty) { // unlit slot: collapse it out of sight
        s.set(0.001, 0.001, 0.001);
        v.set(xf.x, -100, xf.z);
        m.compose(v, q, s);
        candleMesh.setMatrixAt(i, m);
        wp.setXYZ(i * 2, xf.x, -100, xf.z);
        wp.setXYZ(i * 2 + 1, xf.x, -100, xf.z);
        continue;
      }
      s.set(0.1, Math.max(c.h, 0.02), 0.1);
      v.set(xf.x, xf.base + c.mid + c.h / 2, xf.z);
      m.compose(v, q, s);
      candleMesh.setMatrixAt(i, m);
      candleMesh.setColorAt(i, c.up ? up : down);
      wp.setXYZ(i * 2, xf.x, xf.base + c.mid + c.lo, xf.z);
      wp.setXYZ(i * 2 + 1, xf.x, xf.base + c.mid + c.hi, xf.z);
    }
    candleMesh.instanceMatrix.needsUpdate = true;
    if (candleMesh.instanceColor) candleMesh.instanceColor.needsUpdate = true;
    wp.needsUpdate = true;
    candleMesh.material.opacity = state === "DELAYED" ? 0.35 : 1;
    wickLines.material.opacity = state === "DELAYED" ? 0.3 : 0.9;
  }
  function setCandles(rows) {
    if (!rows || !rows.length) return;
    var last = rows.slice(-60);
    var min = Infinity, max = -Infinity;
    last.forEach(function (r) { if (r.low < min) min = r.low; if (r.high > max) max = r.high; });
    var span = (max - min) || 1;
    var norm = function (x) { return ((x - min) / span) * 1.7; };
    var offset = Math.floor((60 - last.length) / 2); // centre the real candles on the arc
    for (var i = 0; i < 60; i++) {
      var ci = i - offset;
      if (ci < 0 || ci >= last.length) { // no verified candle for this slot — it stays dark, never invented
        candlesTgt[i] = { h: 0, mid: 0, lo: 0, hi: 0, up: 1, empty: true };
        continue;
      }
      var r = last[ci];
      candlesTgt[i] = {
        mid: Math.min(norm(r.open), norm(r.close)),
        h: Math.max(Math.abs(norm(r.close) - norm(r.open)), 0.05),
        lo: 0, hi: 0,
        up: r.close >= r.open ? 1 : 0,
        empty: false
      };
      candlesTgt[i].lo = norm(r.low) - candlesTgt[i].mid;
      candlesTgt[i].hi = norm(r.high) - candlesTgt[i].mid;
    }
  }

  /* ---------------- particles ---------------- */
  function spawnWave(sol) {
    if (state !== "LIVE" || !points) return; // QUIET and DELAYED never fire particles
    var energy = Math.min(1, 0.25 + (sol || 0.05) * 0.9); // 0.05 SOL delicate · 1.0+ SOL surge
    var n = Math.round(26 + energy * 74);
    var colAttr = pointsGeo.getAttribute("color");
    var bright = new window.THREE.Color(BRIGHT);
    for (var k = 0; k < n; k++) {
      var idx = -1;
      for (var j = 0; j < PMAX; j++) { if (pLife[j] <= 0) { idx = j; break; } }
      if (idx < 0) return;
      var a = Math.random() * Math.PI * 2;
      var R = 2.15;
      pPos[idx * 3] = Math.cos(a) * R;
      pPos[idx * 3 + 1] = 0;
      pPos[idx * 3 + 2] = Math.sin(a) * R;
      var sp = 0.35 + Math.random() * 0.75 * (0.5 + energy);
      pVel[idx * 3] = -Math.sin(a) * sp;         // tangential drift
      pVel[idx * 3 + 1] = 0.12 + Math.random() * 0.3;
      pVel[idx * 3 + 2] = Math.cos(a) * sp;
      pMaxLife[idx] = 1.4 + Math.random() * 1.1;
      pLife[idx] = pMaxLife[idx];
      colAttr.setXYZ(idx, bright.r, bright.g, bright.b);
    }
    colAttr.needsUpdate = true;
  }
  function stepParticles(dt) {
    var colAttr = pointsGeo.getAttribute("color");
    var any = false;
    for (var j = 0; j < PMAX; j++) {
      if (pLife[j] <= 0) continue;
      any = true;
      pLife[j] -= dt;
      if (pLife[j] <= 0) { pPos[j * 3 + 1] = -999; colAttr.setXYZ(j, 0, 0, 0); continue; }
      pPos[j * 3] += pVel[j * 3] * dt;
      pPos[j * 3 + 1] += pVel[j * 3 + 1] * dt;
      pPos[j * 3 + 2] += pVel[j * 3 + 2] * dt;
      var f = pLife[j] / pMaxLife[j];
      colAttr.setXYZ(j, f, f * 0.85, f * 0.35);
    }
    if (any) {
      pointsGeo.getAttribute("position").needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  }

  /* ---------------- selection & inspection flight ---------------- */
  function select(serial) {
    if (!nodeMesh) return;
    var THREE = window.THREE;
    if (selected >= 0) { // restore
      nodeMesh.setColorAt(selected, nodeBaseColor[selected]);
      var m0 = new THREE.Matrix4().makeTranslation(nodePos[selected].x, nodePos[selected].y, nodePos[selected].z);
      nodeMesh.setMatrixAt(selected, m0);
    }
    selected = serial - 1;
    if (selected < 0 || selected >= 470) { selected = -1; return; }
    var gold = new THREE.Color(GOLD), dim = new THREE.Color(DIMNODE);
    for (var i = 0; i < 470; i++) nodeMesh.setColorAt(i, i === selected ? gold : dim);
    var p = nodePos[selected];
    var m = new THREE.Matrix4().makeScale(2.4, 2.4, 2.4).setPosition(p.x, p.y, p.z);
    nodeMesh.setMatrixAt(selected, m);
    nodeMesh.instanceMatrix.needsUpdate = true;
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
    // 650ms camera flight toward the star
    var world = p.clone();
    worldGroup.localToWorld(world);
    var dir = world.clone().sub(new THREE.Vector3(0, 0.35, 0)).normalize();
    var toPos = world.clone().add(dir.multiplyScalar(2.6)).add(new THREE.Vector3(0, 0.7, 0));
    camAnim = {
      t: 0, dur: 0.65,
      fromPos: camera.position.clone(), toPos: toPos,
      fromLook: HOME_LOOK.clone(), toLook: world
    };
  }
  function deselect() {
    if (!nodeMesh || selected < 0) return;
    var THREE = window.THREE;
    for (var i = 0; i < 470; i++) nodeMesh.setColorAt(i, nodeBaseColor[i]);
    var m = new THREE.Matrix4().makeTranslation(nodePos[selected].x, nodePos[selected].y, nodePos[selected].z);
    nodeMesh.setMatrixAt(selected, m);
    selected = -1;
    nodeMesh.instanceMatrix.needsUpdate = true;
    if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;
    camAnim = { t: 0, dur: 0.65, fromPos: camera.position.clone(), toPos: HOME_POS.clone(), fromLook: new THREE.Vector3(), toLook: HOME_LOOK.clone() };
  }
  function pick(ev) {
    if (!renderer || !nodeMesh) return;
    var THREE = window.THREE;
    var rect = renderer.domElement.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    var mouse = new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
    var ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, camera);
    var hits = ray.intersectObject(nodeMesh);
    var idx = -1;
    if (hits.length && hits[0].instanceId !== undefined) idx = hits[0].instanceId;
    if (idx < 0) { // 28px touch snap: nearest projected node
      var best = 28, v = new THREE.Vector3();
      for (var i = 0; i < 470; i++) {
        v.copy(nodePos[i]);
        worldGroup.localToWorld(v);
        v.project(camera);
        var px = (v.x * 0.5 + 0.5) * rect.width, py = (-v.y * 0.5 + 0.5) * rect.height;
        var d = Math.hypot(px - x, py - y);
        if (d < best) { best = d; idx = i; }
      }
    }
    if (idx >= 0) {
      var input = document.querySelector("[data-inspect-input]");
      if (input) input.value = idx + 1;
      try { window.dispatchEvent(new CustomEvent("pulse:inspect", { detail: { serial: idx + 1 } })); } catch (e) {}
      select(idx + 1);
    }
  }

  /* ---------------- states ---------------- */
  function applyState() {
    if (!built || failed) return;
    paintCandles(1);
    if (state === "DELAYED") { // emitter halts completely
      for (var j = 0; j < PMAX; j++) { pLife[j] = Math.min(pLife[j], 0.25); }
    }
  }

  /* ---------------- loop ---------------- */
  function loop() {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    var dt = Math.min(clock.getDelta(), 0.05);
    var t = clock.elapsedTime;
    // the heart turns — stately in QUIET, alive in LIVE
    var speed = state === "LIVE" ? 0.35 : state === "QUIET" ? 0.1 : 0.18;
    coinGroup.rotation.y += dt * speed;
    coinGroup.position.y = 0.55 + Math.sin(t * 0.7) * 0.05;
    worldGroup.rotation.y += dt * 0.03;
    // candle morph (~450ms settle)
    var k = 1 - Math.exp(-dt / 0.15), done = true;
    for (var i = 0; i < 60; i++) {
      var c = candlesCur[i], g = candlesTgt[i];
      ["h", "mid", "lo", "hi"].forEach(function (f) {
        if (Math.abs(c[f] - g[f]) > 0.001) { c[f] += (g[f] - c[f]) * k; done = false; }
        else c[f] = g[f];
      });
      c.up = g.up;
    }
    if (!done || state === "DELAYED") paintCandles(1);
    stepParticles(dt);
    if (camAnim) {
      camAnim.t += dt;
      var f = Math.min(1, camAnim.t / camAnim.dur);
      var e = 1 - Math.pow(1 - f, 3);
      camera.position.lerpVectors(camAnim.fromPos, camAnim.toPos, e);
      var look = camAnim.fromLook.clone().lerp(camAnim.toLook, e);
      camera.lookAt(look);
      if (f >= 1) camAnim = null;
    }
    // fps watchdog: step down rather than stutter
    fpsAcc += dt; fpsN++;
    if (fpsAcc >= 2) {
      var fps = fpsN / fpsAcc;
      if (fps < 35) {
        if (!fpsBadSince) fpsBadSince = t;
        if (t - fpsBadSince > 4) {
          if (!dprCut) { dprCut = true; renderer.setPixelRatio(1); fpsBadSince = 0; }
          else { stopLoop(); showPerfNote(); return; }
        }
      } else fpsBadSince = 0;
      fpsAcc = 0; fpsN = 0;
    }
    renderer.render(scene, camera);
  }
  function showPerfNote() {
    var note = document.querySelector("[data-obs-note]");
    if (note) {
      note.hidden = false;
      note.textContent = "The 3D observatory paused itself to protect this device — the Functional Chart above carries the same live data.";
    }
  }
  function startLoop() {
    if (running || failed || !renderer) return;
    if (reducedMotion()) { // one honest still frame, no motion
      build();
      renderer.render(scene, camera);
      return;
    }
    running = true;
    clock.start();
    loop();
  }
  function stopLoop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  /* ---------------- public API + events ---------------- */
  window.Pulse3D = {
    open: function () { build(); if (!failed) startLoop(); },
    close: function () { stopLoop(); },
    select: select,
    deselect: deselect
  };
  window.addEventListener("pulse:state", function (ev) {
    state = ev.detail.state;
    applyState();
  });
  window.addEventListener("pulse:candles", function (ev) { setCandles(ev.detail.rows); });
  window.addEventListener("pulse:swap", function (ev) { spawnWave(ev.detail.sol); });
  window.addEventListener("pulse:inspect", function (ev) {
    if (built && !failed) select(ev.detail.serial);
  });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") stopLoop();
    else if (built && !failed && !document.querySelector("[data-pane='observatory']").hidden) startLoop();
  });
})();
