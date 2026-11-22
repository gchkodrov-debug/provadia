/**
 * keeper.js — the Keeper's living layered rig (crew-built body v1).
 * ------------------------------------------------------------------
 * The figure in the Chamber is the crew-built layered body: twelve
 * separated layers (the anchored Mask — never redrawn — over a robe
 * drawn in the town palette), animated here with the SAME parameter
 * names the rig spec (RIG_SPEC.md) hands to a Cubism rigger:
 * breath, gaze (ParamEyeBall), blink (glow dip), ParamMouthOpenY as
 * mouth-glow, arm pose toggles (rest / raise / point), ParamGuard.
 *
 * The stage is a MODEL SLOT: when solnik.moc3 lands at
 * design/keeper/model/, an AIRI / pixi-live2d stage takes this slot
 * and this rig retires — the state wiring below (listen / speak /
 * guard / point) already speaks the parameter language.
 *
 * The brain is unchanged: this module only WATCHES the Chamber the
 * captain's engine builds (its message thread and its guard class)
 * and moves the body accordingly. It sends nothing, asks nothing.
 */
(function () {
  'use strict';

  var stage = document.querySelector('[data-keeper-stage]');
  if (!stage) return;

  var base = stage.getAttribute('data-keeper-base') || '../design/keeper/';
  var calm = function () {
    if (window.__provadiaGuide) return window.__provadiaGuide.calm();
    var d = document.documentElement;
    return (typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
      d.getAttribute('data-calm') === 'true' || d.getAttribute('data-still') === 'true';
  };

  /* ------------------------- build the figure ------------------------- */

  function img(name, cls) {
    var i = document.createElement('img');
    i.className = 'kl ' + cls;
    i.src = base + name + '.webp';
    i.alt = '';
    i.setAttribute('aria-hidden', 'true');
    i.draggable = false;
    return i;
  }

  var figure = document.createElement('div');
  figure.className = 'keeper-figure';
  figure.setAttribute('data-state', 'idle');
  figure.setAttribute('data-pose', 'rest');
  figure.setAttribute('role', 'img');
  figure.setAttribute('aria-label',
    'Solnik, Keeper of the Wall, standing in his Chamber — the ancient Mask over his herald\'s robe');

  figure.appendChild(img('00_robe_back', 'kl-back'));

  var body = document.createElement('div');
  body.className = 'keeper-body';
  body.appendChild(img('06_torso', 'kl-torso'));
  body.appendChild(img('07_neck_shadow', 'kl-neck'));
  var staff = img('03_staff', 'kl-staff');
  body.appendChild(staff);
  body.appendChild(img('01_arm_L_rest', 'kl-arm-l-rest'));
  body.appendChild(img('02_arm_L_raise', 'kl-arm-l-raise'));
  body.appendChild(img('04_arm_R_rest', 'kl-arm-r-rest'));
  body.appendChild(img('05_arm_R_point', 'kl-arm-r-point'));
  figure.appendChild(body);

  var head = document.createElement('div');
  head.className = 'keeper-head';
  var headImg = img('08_head_mask', 'kl-head-img');
  head.appendChild(headImg);
  head.appendChild(img('09_hood_rim', 'kl-hood'));
  var eyesL = img('10_eyes_glow_L', 'kl-eyes');
  var eyesR = img('11_eyes_glow_R', 'kl-eyes');
  var mouth = img('12_mouth_glow', 'kl-mouth');
  head.appendChild(eyesL);
  head.appendChild(eyesR);
  head.appendChild(mouth);
  var eyes = [eyesL, eyesR];
  figure.appendChild(head);

  var still = stage.querySelector('.keeper-still');
  if (still) still.remove();
  stage.appendChild(figure);
  if (calm()) figure.setAttribute('data-calm', 'true');

  /* --------------------------- the parameters -------------------------- */

  var speakTimer = null;
  var speakCounter = 0;
  var greeted = false;

  function setPose(pose, holdMs) {
    figure.setAttribute('data-pose', pose);
    if (holdMs) setTimeout(function () {
      if (figure.getAttribute('data-pose') === pose) figure.setAttribute('data-pose', 'rest');
    }, holdMs);
  }

  function setState(state) { figure.setAttribute('data-state', state); }

  function speak(text) {
    var words = (text || '').trim().split(/\s+/).length || 8;
    var ms = Math.max(1400, Math.min(22000, (words / 2.6) * 1000));
    figure.classList.add('speaking');
    setState('speaking');
    if (speakTimer) clearTimeout(speakTimer);
    var token = ++speakCounter;
    speakTimer = setTimeout(function () {
      if (token === speakCounter) {
        figure.classList.remove('speaking');
        setState('idle');
      }
    }, ms);
  }

  /* Voice route (the day the seat returns audio): drive ParamMouthOpenY
     from the real signal, not the rhythm. Exposed for the seat's use. */
  var audioCtx = null;
  function attachAudio(audioEl) {
    if (audioEl.__keeperAudioAttached) return;
    audioEl.__keeperAudioAttached = true;
    try {
      if (!audioCtx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audioCtx = new AC();
      }
      var src = audioCtx.createMediaElementSource(audioEl);
      var analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser); analyser.connect(audioCtx.destination);
      var data = new Uint8Array(analyser.frequencyBinCount);
      figure.classList.add('speaking'); setState('speaking');
      (function pump() {
        if (audioEl.paused || audioEl.ended) {
          mouth.style.opacity = ''; figure.classList.remove('speaking'); setState('idle');
          return;
        }
        analyser.getByteFrequencyData(data);
        var sum = 0; for (var i = 0; i < data.length; i++) sum += data[i];
        var level = Math.min(1, (sum / data.length) / 90);
        mouth.style.opacity = (0.18 + level * 0.82).toFixed(2);
        requestAnimationFrame(pump);
      })();
    } catch (e) { /* the rhythm path remains */ }
  }
  window.__keeperSpeak = { attachAudio: attachAudio, speak: speak };
  window.__keeperPoint = function () { setPose('point', 2600); };

  /* ------------------------------ the life ------------------------------ */

  if (!calm()) {
    // Gaze — ParamAngleX/Y + ParamEyeBall: the head turns a little
    // toward the visitor's hand; the eye-light leans further.
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var lastMove = 0;
    window.addEventListener('pointermove', function (e) {
      lastMove = performance.now();
      var r = stage.getBoundingClientRect();
      if (!r.width) return;
      var nx = ((e.clientX - (r.left + r.width / 2)) / window.innerWidth) * 2;
      var ny = ((e.clientY - (r.top + r.height / 2)) / window.innerHeight) * 2;
      tx = Math.max(-1, Math.min(1, nx));
      ty = Math.max(-1, Math.min(1, ny));
      if (!raf) raf = requestAnimationFrame(applyGaze);
    }, { passive: true });
    function applyGaze() {
      raf = 0;
      if (performance.now() - lastMove > 1600) { tx = 0; ty = 0; }
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      head.style.transform =
        'translate(' + (cx * 7).toFixed(1) + 'px,' + (cy * 5).toFixed(1) + 'px) ' +
        'rotate(' + (cx * 1.1).toFixed(2) + 'deg)';
      var et = 'translate(' + (cx * 4).toFixed(1) + 'px,' + (cy * 3).toFixed(1) + 'px)';
      eyes[0].style.transform = et; eyes[1].style.transform = et;
      if (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01 ||
          performance.now() - lastMove < 1600) {
        raf = requestAnimationFrame(applyGaze);
      }
    }
    // Blink — the Mask has no lids; its blink is a dip of the eye-light.
    (function blink() {
      setTimeout(function () {
        figure.classList.add('blink');
        setTimeout(function () { figure.classList.remove('blink'); }, 130);
        blink();
      }, 2800 + Math.random() * 3400);
    })();
  }

  /* --------------------- watching the Chamber -------------------------- */
  /* The captain's engine builds the seat on its own schedule; poll for
     it, then observe: a traveller's message = listen; the Keeper's
     reply = speak (with one raised-staff greeting per visit); the
     chamber's guard class = the body's guard weather. */

  var watched = false;
  var poll = setInterval(function () {
    if (watched) { clearInterval(poll); return; }
    var thread = document.querySelector('.cap-thread');
    if (!thread) return;
    watched = true; clearInterval(poll);
    var chamber = document.querySelector('.cap-chamber');

    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList.contains('cap-msg-you')) {
            setState('listening');
          } else if (n.classList.contains('cap-msg-cap')) {
            if (!greeted) { greeted = true; setPose('raise', 1700); }
            speak(n.textContent || '');
          } else if (n.tagName === 'AUDIO') {
            attachAudio(n);
          }
          var audio = n.querySelector && n.querySelector('audio');
          if (audio) attachAudio(audio);
        });
      });
    }).observe(thread, { childList: true });

    if (chamber) {
      new MutationObserver(function () {
        figure.classList.toggle('guard', chamber.classList.contains('cap-guard'));
      }).observe(chamber, { attributes: true, attributeFilter: ['class'] });
    }
  }, 400);
  setTimeout(function () { clearInterval(poll); }, 20000);
})();
