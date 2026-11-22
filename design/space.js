/* PROVADIA — New-Tech Wave layer (2026-11-22).
   One shared layer for the catalogue, the listings, the Studio and the Coin:
   a starfield sky, GSAP scroll reveals + card tilt, and procedural Three.js
   object stages (img2threejs manner: the model is code, written from the
   object, not a mesh download). Defensive throughout: every enhancement is
   progressive — if a library or WebGL is missing, the page stands as built.
   Respects the shell's calm system (html[data-calm] / [data-still]) and
   prefers-reduced-motion: in those states it renders one still frame. */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function stillMode() {
    var d = document.documentElement;
    return reduced || d.getAttribute('data-calm') === 'true' || d.getAttribute('data-still') === 'true';
  }
  function hashSeed(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0) / 4294967295;
  }

  /* ============================== SKY ============================== */
  (function sky() {
    if (stillMode()) return;
    var cv = document.createElement('canvas');
    cv.className = 'nw-sky';
    cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild);
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    var W = 0, H = 0, stars = [], dust = [], raf = null;
    function resize() {
      W = cv.width = Math.floor(window.innerWidth * Math.min(window.devicePixelRatio || 1, 1.5));
      H = cv.height = Math.floor(window.innerHeight * Math.min(window.devicePixelRatio || 1, 1.5));
      var n = Math.min(170, Math.floor(W * H / 16000));
      stars = [];
      for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.3, p: Math.random() * Math.PI * 2, s: 0.4 + Math.random() * 0.8 });
      dust = [];
      for (var j = 0; j < 26; j++) dust.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.8, vy: -(0.05 + Math.random() * 0.12), vx: (Math.random() - 0.5) * 0.05, a: 0.05 + Math.random() * 0.1 });
    }
    var scrollDrift = 0;
    function frame(t) {
      if (stillMode() || document.hidden) { raf = null; return; }
      ctx.clearRect(0, 0, W, H);
      scrollDrift = (window.scrollY || 0) * 0.012;
      var i, st;
      for (i = 0; i < stars.length; i++) {
        st = stars[i];
        var tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 0.0006 * st.s + st.p));
        var y = (st.y + scrollDrift * (0.4 + st.r)) % H;
        ctx.globalAlpha = 0.5 * tw;
        ctx.fillStyle = '#FFEFC1';
        ctx.beginPath(); ctx.arc(st.x, y, st.r, 0, 6.2832); ctx.fill();
      }
      for (i = 0; i < dust.length; i++) {
        var d = dust[i];
        d.y += d.vy; d.x += d.vx;
        if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; }
        ctx.globalAlpha = d.a;
        ctx.fillStyle = '#C9A227';
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && !raf && !stillMode()) raf = requestAnimationFrame(frame);
    });
    raf = requestAnimationFrame(frame);
  })();

  /* ====================== GSAP REVEALS + TILT ====================== */
  (function reveals() {
    if (!window.gsap || stillMode()) return;
    var targets = document.querySelectorAll('[data-nw-reveal], .offer, .listing-section, .studio-section, .coin-section, .closing, .terms-band');
    if (!targets.length) return;
    if (window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.utils.toArray(targets).forEach(function (el) {
        gsap.fromTo(el, { autoAlpha: 0, y: 28 }, {
          autoAlpha: 1, y: 0, duration: 0.9, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    } else {
      gsap.fromTo(targets, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06, ease: 'power2.out' });
    }
    /* Card tilt — catalogue offers only, pointer-fine devices. */
    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      document.querySelectorAll('.offer').forEach(function (card) {
        card.classList.add('nw-tilt');
        var raf = null;
        card.addEventListener('pointermove', function (e) {
          if (stillMode()) return;
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          if (raf) cancelAnimationFrame(raf);
          raf = requestAnimationFrame(function () {
            card.style.transform = 'perspective(1100px) rotateX(' + (-py * 3.2).toFixed(2) + 'deg) rotateY(' + (px * 3.2).toFixed(2) + 'deg)';
          });
        });
        card.addEventListener('pointerleave', function () {
          if (raf) cancelAnimationFrame(raf);
          card.style.transform = '';
        });
      });
    }
  })();

  /* ============ MOTION LOOPS RESPECT THE CALM LAW ============ */
  document.querySelectorAll('.nw-loop').forEach(function (v) {
    if (stillMode()) { v.removeAttribute('autoplay'); v.pause(); v.setAttribute('controls', ''); }
  });

  /* ===================== PROCEDURAL OBJECTS ===================== */
  function buildObjects(THREE, M) {
    function group() { return new THREE.Group(); }
    function edges(mesh, color) {
      var e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 24),
        new THREE.LineBasicMaterial({ color: color || 0x6B4A12, transparent: true, opacity: 0.55 }));
      mesh.add(e); return mesh;
    }
    var B = {
      brick: function () {
        var g = group();
        var base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.15, 48), M.dark);
        base.position.y = -0.8;
        g.add(base);
        var mortar = new THREE.MeshStandardMaterial({ color: 0x2A1D05, metalness: 0.3, roughness: 0.9 });
        for (var i = 0; i < 3; i++) {
          var cy = -0.56 + i * 0.4;
          var b = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.34, 1.15), M.gold);
          b.position.y = cy;
          g.add(b);
          if (i < 2) {
            var mo = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.055, 1.19), mortar);
            mo.position.y = cy + 0.2;
            g.add(mo);
          }
          var joints = i === 1 ? [0] : [-0.38, 0.38];
          joints.forEach(function (jx) {
            var j = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.02), mortar);
            j.position.set(jx, cy, 0.585);
            g.add(j);
          });
        }
        var cap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.09, 0.95), M.paleGold);
        cap.position.y = 0.5;
        g.add(cap);
        return g;
      },
      coin: function (el) {
        var g = group();
        var cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.08, 0.17, 72), M.gold);
        cyl.rotation.x = Math.PI / 2;
        var rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.055, 16, 90), M.paleGold);
        g.add(cyl, rim);
        if (el.getAttribute('data-nw-face') === 'coin') {
          var loader = new THREE.TextureLoader();
          var mk = function (url, back) {
            loader.load(url, function (tex) {
              if (tex.colorSpace !== undefined && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
              var disc = new THREE.Mesh(new THREE.CircleGeometry(1.02, 64),
                new THREE.MeshStandardMaterial({ map: tex, transparent: true, metalness: 0.55, roughness: 0.38 }));
              disc.position.z = back ? -0.092 : 0.092;
              if (back) disc.rotation.y = Math.PI;
              g.add(disc);
            });
          };
          mk('/design/assets/coin-face-front-3d.webp', false);
          mk('/design/assets/coin-face-reverse-3d.webp', true);
        }
        return g;
      },
      crystal: function () {
        var g = group();
        var spots = [[0, 0.1, 0, 1.05], [-0.62, -0.18, 0.18, 0.66], [0.6, -0.22, -0.1, 0.74], [0.18, -0.3, 0.5, 0.5], [-0.3, -0.34, -0.45, 0.44]];
        spots.forEach(function (s, i) {
          var m = new THREE.Mesh(new THREE.OctahedronGeometry(s[3]), i === 0 ? M.crystal : M.crystalDim);
          m.position.set(s[0], s[1], s[2]);
          m.scale.y = 1.5;
          m.rotation.y = i * 1.3;
          g.add(m);
        });
        var base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.18, 7), M.dark);
        base.position.y = -0.78;
        g.add(base);
        return g;
      },
      book: function () {
        var g = group();
        var pages = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.92, 0.3), M.salt);
        pages.position.x = 0.05;
        var cover = edges(new THREE.Mesh(new THREE.BoxGeometry(1.56, 2.06, 0.2), M.bronze));
        cover.position.z = -0.09;
        var coverF = edges(new THREE.Mesh(new THREE.BoxGeometry(1.56, 2.06, 0.06), M.bronze));
        coverF.position.z = 0.16;
        var band = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.3, 0.36), M.gold);
        band.position.y = 0.45;
        g.add(pages, cover, coverF, band);
        g.rotation.z = -0.06;
        return g;
      },
      key: function () {
        var g = group();
        var bow = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.13, 18, 48), M.gold);
        bow.position.y = 0.95;
        var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.7, 20), M.gold);
        shaft.position.y = -0.15;
        var collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 14, 32), M.paleGold);
        collar.rotation.x = Math.PI / 2; collar.position.y = 0.32;
        var t1 = edges(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.16), M.gold));
        t1.position.set(0.24, -0.78, 0);
        var t2 = edges(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.16), M.gold));
        t2.position.set(0.2, -0.42, 0);
        g.add(bow, shaft, collar, t1, t2);
        return g;
      },
      scroll: function () {
        var g = group();
        var roll = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 2.35, 36), M.salt);
        roll.rotation.z = Math.PI / 2;
        g.add(roll);
        [-1.22, 1.22].forEach(function (x) {
          var knob = new THREE.Mesh(new THREE.SphereGeometry(0.43, 24, 18), M.gold);
          knob.position.x = x;
          g.add(knob);
        });
        [-0.78, 0.78].forEach(function (x) {
          var band = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.05, 12, 40), M.bronze);
          band.rotation.y = Math.PI / 2; band.position.x = x;
          g.add(band);
        });
        g.rotation.y = 0.5;
        return g;
      },
      orb: function () {
        var g = group();
        var wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.12, 1)),
          new THREE.LineBasicMaterial({ color: 0xC9A227, transparent: true, opacity: 0.8 }));
        var core = new THREE.Mesh(new THREE.SphereGeometry(0.52, 32, 24), M.glow);
        var orbit = group();
        var moon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), M.paleGold);
        moon.position.x = 1.55;
        var ringPath = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.012, 8, 90),
          new THREE.MeshBasicMaterial({ color: 0x6B4A12 }));
        ringPath.rotation.x = Math.PI / 2.4;
        orbit.add(moon, ringPath);
        orbit.rotation.x = Math.PI / 2.4;
        var orbitSpin = group(); orbitSpin.add(orbit);
        /* keep moon on the ring plane: simpler — spin whole orbit group around Y in tick via userData */
        g.add(wire, core, orbitSpin);
        g.userData.spin = orbitSpin;
        return g;
      },
      crate: function () {
        var g = group();
        var inner = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.66, 1.66), M.dark);
        g.add(inner);
        var bar = 0.14, L = 1.78;
        var geoL = new THREE.BoxGeometry(L, bar, bar), geoV = new THREE.BoxGeometry(bar, L, bar), geoD = new THREE.BoxGeometry(bar, bar, L);
        [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (s) {
          var a = new THREE.Mesh(geoL, M.bronze); a.position.set(0, s[0] * 0.89, s[1] * 0.89);
          var b = new THREE.Mesh(geoL, M.bronze); b.position.set(0, s[1] * 0.89, s[0] * 0.89); b.rotation.z = 0; b.rotation.y = Math.PI / 2; b.geometry = geoD; b.position.set(s[0] * 0.89, s[1] * 0.89, 0);
          var c = new THREE.Mesh(geoV, M.bronze); c.position.set(s[0] * 0.89, 0, s[1] * 0.89);
          g.add(a, b, c);
        });
        var seal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 32), M.gold);
        seal.rotation.x = Math.PI / 2; seal.position.z = 0.86;
        g.add(seal);
        return g;
      },
      peak: function () {
        var g = group();
        [[0, 1.75, 0.95, 0, 0], [-0.85, 1.25, 0.68, 0.15, 0.3], [0.8, 1.0, 0.55, -0.2, -0.25]].forEach(function (p) {
          var m = new THREE.Mesh(new THREE.ConeGeometry(p[2], p[1], 7), M.rock);
          m.position.set(p[0], p[1] / 2 - 0.75, p[4]);
          m.rotation.y = p[3];
          g.add(m);
        });
        var gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), M.crystal);
        gem.position.set(0, 1.78, 0); gem.scale.y = 1.5;
        g.add(gem);
        return g;
      },
      ring: function () {
        var g = group();
        var tor = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.17, 20, 72), M.gold);
        var lens = new THREE.Mesh(new THREE.CircleGeometry(0.86, 48),
          new THREE.MeshStandardMaterial({ color: 0xFFEFC1, transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.2, side: THREE.DoubleSide }));
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.7, 14), M.bronze);
        post.position.y = -1.25;
        var foot = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.12, 28), M.dark);
        foot.position.y = -1.62;
        g.add(tor, lens, post, foot);
        return g;
      },
      trio: function (el) {
        var g = group();
        var b = B.brick(); b.position.set(0, -0.42, 0.2); b.scale.setScalar(1.15);
        var o = B.orb(); o.position.set(-2.1, 0.6, -0.2); o.scale.setScalar(0.85);
        var k = B.crystal(); k.position.set(2.1, 0.1, 0.3); k.scale.setScalar(1.05);
        var key = B.key(); key.position.set(1.2, -1.0, 0.95); key.scale.setScalar(0.55); key.rotation.z = 0.5;
        g.add(b, o, k, key);
        g.userData.parts = { orb: o, crystal: k };
        return g;
      }
    };
    return B;
  }

  /* ===================== THREE.JS STAGES ===================== */
  (function stages() {
    var els = document.querySelectorAll('.nw-stage');
    if (!els.length || !window.THREE) return;
    var M = null, B = null, envTex = null;
    function materials(THREE) {
      if (M) return M;
      M = {
        gold: new THREE.MeshStandardMaterial({ color: 0xC9A227, metalness: 1.0, roughness: 0.34 }),
        paleGold: new THREE.MeshStandardMaterial({ color: 0xE8C766, metalness: 1.0, roughness: 0.24 }),
        bronze: new THREE.MeshStandardMaterial({ color: 0x8A5F16, metalness: 0.95, roughness: 0.46 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x241A0C, metalness: 0.4, roughness: 0.8 }),
        salt: new THREE.MeshStandardMaterial({ color: 0xF4EFE6, metalness: 0.05, roughness: 0.55 }),
        rock: new THREE.MeshStandardMaterial({ color: 0x4A3A24, metalness: 0.05, roughness: 0.95, flatShading: true }),
        crystal: new THREE.MeshStandardMaterial({ color: 0xFFF6D8, metalness: 0.15, roughness: 0.12, flatShading: true, transparent: true, opacity: 0.96 }),
        crystalDim: new THREE.MeshStandardMaterial({ color: 0xE9D9A8, metalness: 0.2, roughness: 0.2, flatShading: true, transparent: true, opacity: 0.9 }),
        glow: new THREE.MeshStandardMaterial({ color: 0xFFEFC1, emissive: 0xC9A227, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.1 })
      };
      return M;
    }
    function environment(THREE, renderer) {
      if (envTex) return envTex;
      try {
        var pmrem = new THREE.PMREMGenerator(renderer);
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0806);
        var mk = function (color, intensity, w, h, x, y, z) {
          var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }));
          m.position.set(x, y, z); m.lookAt(0, 0, 0); scene.add(m);
        };
        mk(0xfff2cf, 9, 6, 6, -5, 7, 3);      /* warm key, upper left — the house light */
        mk(0xC9A227, 4, 8, 3, 6, 1, -2);       /* gold bounce */
        mk(0x8fb4ff, 1.2, 8, 4, 2, -4, -6);    /* faint cool floor */
        mk(0xffffff, 2.5, 10, 2, 0, 2, 8);     /* front fill */
        envTex = pmrem.fromScene(scene, 0.05).texture;
        pmrem.dispose();
      } catch (e) { envTex = null; }
      return envTex;
    }

    els.forEach(function (el) {
      var kind = el.getAttribute('data-nw-object') || 'orb';
      var seed = hashSeed(el.getAttribute('data-nw-seed') || kind);
      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch (e) { el.classList.add('nw-stage--flat'); return; }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      el.appendChild(renderer.domElement);
      var scene = new THREE.Scene();
      var env = environment(THREE, renderer);
      if (env) scene.environment = env;
      var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0.4, kind === 'trio' ? 8.4 : 5.6);
      var key = new THREE.DirectionalLight(0xfff0c8, 2.2); key.position.set(-4, 6, 4); scene.add(key);
      var rim = new THREE.PointLight(0xC9A227, 30, 30); rim.position.set(4, -2, -4); scene.add(rim);
      scene.add(new THREE.AmbientLight(0x2a2012, 1.4));
      if (!B) B = buildObjects(THREE, materials(THREE));
      var obj = (B[kind] || B.orb)(el);
      obj.rotation.y = seed * 1.5;
      scene.add(obj);
      /* gold dust around the object */
      var pGeo = new THREE.BufferGeometry();
      var N = kind === 'trio' ? 220 : 90, pos = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) {
        var r = 2 + Math.random() * 2.6, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th); pos[i * 3 + 1] = r * Math.cos(ph) * 0.7; pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      var dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xC9A227, size: 0.035, transparent: true, opacity: 0.75 }));
      scene.add(dust);

      var running = false, raf = null, px = 0, py = 0, tx = 0, ty = 0;
      function resize() {
        var w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener('resize', resize);
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 0.35;
      });
      el.addEventListener('pointerleave', function () { tx = 0; ty = 0; });
      var t0 = Math.random() * 100;
      function tick(now) {
        if (!running) { raf = null; return; }
        var t = t0 + now * 0.001;
        px += (tx - px) * 0.05; py += (ty - py) * 0.05;
        obj.rotation.y += 0.0035 + seed * 0.0015;
        obj.position.y = Math.sin(t * 0.8) * 0.09;
        if (obj.userData.parts) {
          if (obj.userData.parts.orb) obj.userData.parts.orb.rotation.y += 0.005;
          if (obj.userData.parts.crystal) obj.userData.parts.crystal.rotation.y += 0.006;
        }
        if (obj.userData.spin) obj.userData.spin.rotation.y += 0.01;
        dust.rotation.y -= 0.0006;
        camera.position.x = px * 1.6;
        camera.position.y = 0.4 - py * 1.2;
        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      }
      function start() {
        if (raf) return;
        if (stillMode()) { renderer.render(scene, camera); return; }
        running = true; raf = requestAnimationFrame(tick);
      }
      function stop() { running = false; }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { en.isIntersecting ? start() : stop(); });
        }, { rootMargin: '80px' }).observe(el);
      } else start();
      el.classList.add('nw-stage--live');
    });
  })();
})();
