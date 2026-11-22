/* Canonical shell v1: local presentation only. Classic script, file:// safe.
 * PLACEHOLDER: captain validates /runtime + /data; this file owns neither.
 * No network, private transcript store, account, audio, analytics or fake replies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var taxonomy = ['record.changed', 'keeper.state', 'time.tick', 'visitor.local'];
  var states = ['WARM', 'TELLING', 'GUARD', 'AWAY'];
  var media = window.matchMedia('(prefers-reduced-motion: reduce)');
  var calm = false, keeper = 'WARM', lastEvent = null;
  var base = new URL('../', document.currentScript.src);
  var listeners = [], expiries = new WeakMap();
  try { calm = localStorage.getItem('provadia.calm') === 'true'; } catch (_) { /* Storage may be unavailable under file://. */ }
  function still() { return calm || media.matches; }
  function broadcast(name, detail) {
    lastEvent = name;
    listeners.slice().forEach(function (fn) { try { fn(name, detail || {}); } catch (error) { console.error('PROVADIA presentation listener', error); } });
    window.dispatchEvent(new CustomEvent('provadia:pulse', {detail:{name:name, payload:detail || {}}}));
  }
  function preference() {
    root.dataset.calm = String(calm); root.dataset.still = String(still());
    document.querySelectorAll('[data-calm-toggle]').forEach(function (node) {
      node.setAttribute('aria-pressed', String(calm));
      node.querySelector('[data-calm-label]').textContent = calm ? 'On' : 'Off';
      node.setAttribute('aria-label', 'Calm ' + (calm ? 'on' : 'off') + (media.matches ? '; system reduced motion is also on' : ''));
    });
    broadcast('visitor.local', {kind:'motion-preference', still:still()});
  }
  function setCalm(value) {
    if (typeof value !== 'boolean') return false;
    calm = value;
    try { localStorage.setItem('provadia.calm', String(calm)); } catch (_) {}
    preference(); return true;
  }
  function setKeeperState(state) {
    if (states.indexOf(state) < 0) return false;
    keeper = state;
    document.querySelectorAll('[data-keeper]').forEach(function (node) {
      states.forEach(function (s) { node.classList.remove(s); }); node.classList.add(state);
      // PLACEHOLDER: a real service state must carry provenance on the host;
      // mood styling never changes factual text, timestamps or service health.
    });
    broadcast('keeper.state', {state:state}); return true;
  }
  function acceptWitness(detail) {
    // One structural gate, before ANY witness or broadcast. This does not
    // authenticate a source: the captain still validates/projects real facts.
    // Copy only own data fields; arrays, accessors and caller acceptance flags
    // cannot stand in for a record. Freeze the snapshot before subscribers run.
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return null;
    var fields = {};
    for (var key of ['source', 'asof', 'slots']) {
      var field = Object.getOwnPropertyDescriptor(detail, key);
      if (!field || !Object.prototype.hasOwnProperty.call(field, 'value')) return null;
      fields[key] = field.value;
    }
    if (typeof fields.source !== 'string' || !fields.source.trim() ||
        typeof fields.asof !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(fields.asof) ||
        !Number.isFinite(Date.parse(fields.asof))) return null;
    // Date.parse normalizes impossible calendar dates in some engines.
    var year = +fields.asof.slice(0, 4), month = +fields.asof.slice(5, 7), day = +fields.asof.slice(8, 10);
    var days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || +fields.asof.slice(11, 13) > 23) return null;
    if (!Array.isArray(fields.slots) || !fields.slots.length) return null;
    var slots = [];
    for (var i = 0; i < fields.slots.length; i++) {
      var slot = Object.getOwnPropertyDescriptor(fields.slots, String(i));
      if (!slot || typeof slot.value !== 'string' || !/^[a-z][a-z0-9-]*$/.test(slot.value)) return null;
      slots.push(slot.value);
    }
    return Object.freeze({source:fields.source, asof:fields.asof, slots:Object.freeze(slots)});
  }
  function witness(detail) {
    // Explicit opt-in targets only. No automatic mutation of numbers or claims.
    // PLACEHOLDER: captain calls AFTER projecting the validated record into DOM.
    document.querySelectorAll('[data-live]').forEach(function (node) {
      if (detail.slots.indexOf(node.dataset.live) < 0) return;
      node.dataset.source = detail.source; node.dataset.asof = detail.asof;
      node.classList.remove('witnessed'); void node.offsetWidth;
      node.dataset.witness = still() ? 'held' : 'motion'; node.classList.add('witnessed');
      clearTimeout(expiries.get(node));
      expiries.set(node, setTimeout(function () { node.classList.remove('witnessed'); delete node.dataset.witness; }, 1900));
    });
  }
  window.PROVADIA = Object.freeze({
    pulse: function (name, detail) {
      name = name === 'record_updated' ? 'record.changed' : name;
      if (taxonomy.indexOf(name) < 0) return false;
      if (name === 'keeper.state') return detail && setKeeperState(detail.state) || false;
      if (name === 'record.changed') {
        detail = acceptWitness(detail);
        if (!detail) return false;
        witness(detail);
      }
      // time.tick cannot imply a receipt, trigger a celebration, or change a fact.
      broadcast(name, detail); return true;
    },
    setKeeperState: setKeeperState,
    setCalm: setCalm,
    isStill: still,
    subscribe: function (fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
    },
    getStatus: function () { return {version:'shell-v1',keeper:keeper,calm:calm,reducedMotion:media.matches,still:still(),lastEvent:lastEvent,renderer:root.dataset.renderState || 'poster'}; }
  });
  // Root-relative links are canonical on HTTP. Only file:// gets a folder map;
  // serialized header/footer markup stays byte-identical across nested pages.
  document.querySelectorAll('[data-town-path]').forEach(function (node) {
    var path = node.dataset.townPath;
    if (location.protocol === 'file:') node.href = new URL(path === '/' ? 'index.html' : path.slice(1) + 'index.html', base).href;
    if (document.body.dataset.page === path) node.setAttribute('aria-current', 'page');
  });
  document.querySelectorAll('[data-calm-toggle]').forEach(function (node) { node.addEventListener('click', function () { setCalm(!calm); }); });
  if (media.addEventListener) media.addEventListener('change', preference); else media.addListener(preference);
  window.addEventListener('storage', function (e) { if (e.key === 'provadia.calm') { calm = e.newValue === 'true'; preference(); } });
  preference();
  // Specimen mood controls change presentation only, clearly labeled in preview.
  document.querySelectorAll('[data-specimen-mood]').forEach(function (node) { node.addEventListener('click', function () { setKeeperState(node.dataset.specimenMood); }); });
  // Poster-first optional architecture: no dynamic imports and no dependency on
  // this renderer for content. Record tier never loads an ambient renderer.
  var host = document.querySelector('[data-scene="threshold"]');
  if (!host || document.body.dataset.motionTier === '3' || still()) return;
  function load(src, next) {
    var script = document.createElement('script'); script.src = new URL(src, base).href;
    script.onload = next; script.onerror = function () { root.dataset.renderState = 'asset-unavailable'; };
    document.head.appendChild(script); // zero retries; fallback already visible.
  }
  var loaded = false;
  function ignite() {
    if (loaded || still()) return; loaded = true;
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      load('design/vendor/three.min.js', function () { load('design/threshold-scene.js', function () {}); });
    }); });
  }
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) { ignite(); observer.disconnect(); } }); observer.observe(host);
  } else ignite();
  window.PROVADIA.subscribe(function (name) { if (name === 'visitor.local' && !still()) ignite(); });
}());
