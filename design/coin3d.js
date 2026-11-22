/* PROVADIA — the Coin in real WebGL (New-Tech Wave, 2026-11-22).
   A procedural Three.js coin (img2threejs manner) carrying the two ANCHORED
   artworks as its faces — the same front and reverse images, circle-cropped
   for the caps, never redrawn. Progressive: the CSS coin stands until the
   WebGL coin has loaded both faces and rendered its first frame; only then
   does it take the stage. The flip button and pointer lean keep their exact
   existing behaviour — this script reads the state they set on .coin3d
   (.pinned / .show-back) and matches it. Any failure leaves the page as built. */
(function () {
  'use strict';
  var stage = document.querySelector('.coin-stage');
  var tilt = document.querySelector('[data-coin-tilt]');
  var cssCoin = document.querySelector('[data-coin3d]');
  if (!stage || !tilt || !cssCoin || !window.THREE) return;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stillMode() {
    var d = document.documentElement;
    return reduced || d.getAttribute('data-calm') === 'true' || d.getAttribute('data-still') === 'true';
  }
  try {
    var wrap = document.createElement('div');
    wrap.className = 'nw-coinwrap';
    wrap.setAttribute('aria-hidden', 'true');
    tilt.insertBefore(wrap, cssCoin);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    wrap.appendChild(renderer.domElement);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0.15, 6.4);

    /* warm environment for the metal — the house light, upper left */
    try {
      var pmrem = new THREE.PMREMGenerator(renderer);
      var env = new THREE.Scene();
      env.background = new THREE.Color(0x0a0806);
      var mk = function (color, i, w, h, x, y, z) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(i) }));
        m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
      };
      mk(0xfff2cf, 9, 6, 6, -5, 7, 3);
      mk(0xC9A227, 4, 8, 3, 6, 1, -2);
      mk(0xffffff, 2.5, 10, 2, 0, 2, 8);
      scene.environment = pmrem.fromScene(env, 0.05).texture;
      pmrem.dispose();
    } catch (e) { /* lights below still carry it */ }
    var key = new THREE.DirectionalLight(0xfff0c8, 2.4); key.position.set(-4, 6, 5); scene.add(key);
    var rim = new THREE.PointLight(0xC9A227, 40, 40); rim.position.set(5, -3, -4); scene.add(rim);
    scene.add(new THREE.AmbientLight(0x2a2012, 1.2));

    var gold = new THREE.MeshStandardMaterial({ color: 0xC9A227, metalness: 1.0, roughness: 0.3 });
    var coin = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.24, 96), gold);
    body.rotation.x = Math.PI / 2;
    var rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.075, 18, 120),
      new THREE.MeshStandardMaterial({ color: 0xE8C766, metalness: 1.0, roughness: 0.22 }));
    coin.add(body, rimRing);
    /* reeded edge: fine boxes around the rim */
    var reedGeo = new THREE.BoxGeometry(0.035, 0.26, 0.07);
    for (var i = 0; i < 72; i++) {
      var a = (i / 72) * Math.PI * 2;
      var reed = new THREE.Mesh(reedGeo, gold);
      reed.position.set(Math.cos(a) * 1.52, Math.sin(a) * 1.52, 0);
      reed.rotation.z = a;
      coin.add(reed);
    }
    scene.add(coin);

    var manager = new THREE.LoadingManager();
    var loader = new THREE.TextureLoader(manager);
    var facesReady = false;
    function face(url, back) {
      loader.load(url, function (tex) {
        if (tex.colorSpace !== undefined && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        var disc = new THREE.Mesh(new THREE.CircleGeometry(1.44, 96),
          new THREE.MeshStandardMaterial({ map: tex, transparent: true, metalness: 0.5, roughness: 0.36 }));
        disc.position.z = back ? -0.125 : 0.125;
        if (back) disc.rotation.y = Math.PI;
        coin.add(disc);
      });
    }
    face('/design/assets/coin-face-front-3d.webp', false);
    face('/design/assets/coin-face-reverse-3d.webp', true);
    manager.onLoad = function () { facesReady = true; ignite(); };
    manager.onError = function () { wrap.remove(); };

    function resize() {
      var w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    var angle = 0, running = false, raf = null, last = 0;
    function tick(now) {
      if (!running) { raf = null; return; }
      var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
      if (cssCoin.classList.contains('pinned')) {
        var target = cssCoin.classList.contains('show-back') ? Math.PI : 0;
        var cur = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        var goal = target + Math.round((cur - target) / (Math.PI * 2)) * Math.PI * 2;
        angle += (goal - angle) * Math.min(1, dt * 5.5);
      } else {
        angle += dt * 0.42;
      }
      coin.rotation.y = angle;
      coin.position.y = Math.sin(now * 0.0009) * 0.05;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    var ignited = false;
    function ignite() {
      if (ignited || !facesReady) return;
      ignited = true;
      resize();
      renderer.render(scene, camera);       /* first frame proves the stage */
      stage.classList.add('nw-webgl-on');
      if (stillMode()) return;              /* one still frame is the calm law */
      running = true; raf = requestAnimationFrame(tick);
    }
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (e) {
          if (!ignited) return;
          if (e.isIntersecting && !stillMode() && !running) { running = true; raf = requestAnimationFrame(tick); }
          else if (!e.isIntersecting) running = false;
        });
      }).observe(wrap);
    }
  } catch (e) {
    /* the anchored CSS coin stands, exactly as built */
  }
})();
