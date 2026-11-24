/* PROVADIA — THE GOLDEN WALL (golden-wall-obelisk-v1, Slice 1).
   The monument's machinery: the scroll journey (arrival → four Covenant
   strata at the spec's frame locks 038 · 082 · 126 · 162 of 200 →
   reassembly → the covenant ledger), the live counter + countdown, and
   the 47-slot registry — all read from the signed wall ledger
   (data/golden-wall.json), whose schema carries grams and bricks only.
   The ledger's seal is RECOMPUTED before anything renders from it
   (see verifyLedger below): a figure that cannot be reconciled
   renders NOTHING — the monument fails closed to its honest face.
   And the check is SHOWN, not silent (the Glass Machinery Law): a
   Seal row in the Covenant Ledger lets the visitor watch the
   recompute, the reference, and the verdict resolve on the face.
   Paths resolve against this script's own home (the town root), so the
   whole monument lifts to its own route (/wall/) with zero rebuild.
   Still-town parity: no JS, reduced motion, or a failed ledger fetch
   leaves the static monument standing with its honest 0 / 47 face. */
(function () {
  'use strict';
  var BASE = new URL('./', document.currentScript.src);
  var root = document.querySelector('[data-wall-root]');
  if (!root) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var grid = root.querySelector('[data-wall-grid]');
  var note = root.querySelector('[data-wall-note]');
  var detent = root.querySelector('[data-wall-detent]');

  /* ---------- the obelisk's own sockets: 4 x 11 + 3 crown = 47 ---------- */
  function fillSockets(ledger) {
    var bySlot = {};
    (ledger.bricks || []).forEach(function (b) { bySlot[b.slot] = b; });
    root.querySelectorAll('[data-wall-sockets]').forEach(function (box) {
      box.innerHTML = '';
      for (var n = 1; n <= 44; n++) {
        var s = document.createElement('div');
        s.className = 'wall-socket' + (bySlot[n] ? ' lit' : '');
        box.appendChild(s);
      }
      var crown = document.createElement('div');
      crown.className = 'wall-crown';
      for (var c = 45; c <= 47; c++) {
        var cs = document.createElement('div');
        cs.className = 'wall-socket' + (bySlot[c] ? ' lit' : '');
        crown.appendChild(cs);
      }
      box.parentNode.appendChild(crown);
    });
  }

  /* ---------- the registry: 47 slots, lit only from the ledger ---------- */
  function renderRegistry(ledger) {
    if (!grid) return;
    var bySlot = {};
    (ledger.bricks || []).forEach(function (b) { bySlot[b.slot] = b; });
    grid.innerHTML = '';
    for (var n = 1; n <= 47; n++) {
      (function (n) {
        var b = bySlot[n];
        var tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'wall-tile' + (b ? ' lit' : '');
        var label = document.createElement('span');
        label.className = 'wall-tile-n';
        label.textContent = 'SLOT ' + (n < 10 ? '0' + n : n);
        var state = document.createElement('span');
        state.className = 'wall-tile-s';
        state.textContent = b ? ('BRICK · ' + b.grams + 'g') : 'UNLAID (0g)';
        tile.appendChild(label); tile.appendChild(state);
        tile.setAttribute('aria-label', b
          ? 'Brick ' + n + ' — laid, ' + b.grams + ' grams, serial ' + b.serial
          : 'Slot ' + n + ' — unlaid');
        tile.addEventListener('click', function () {
          if (!note) return;
          if (b) {
            note.textContent = 'Brick #' + (n < 10 ? '0' + n : n) + ' · ' + b.grams +
              'g fine gold (999.9) · Bar serial: ' + b.serial + ' · Vault receipt: ' +
              b.vaultReceipt + (b.dedication ? ' · Laid in honor of: ' + b.dedication : '');
          } else {
            note.textContent = 'Slot ' + (n < 10 ? '0' + n : n) +
              ' — unlaid. It lights only when a real 1g bar is purchased, vaulted, and receipted.';
          }
        });
        grid.appendChild(tile);
      })(n);
    }
  }

  function renderCounter(ledger) {
    var laid = ledger.bricksLaid, target = ledger.bricksTarget, grams = ledger.gramsTotal;
    root.querySelectorAll('[data-wall-counter]').forEach(function (el) {
      el.textContent = grams + ' GRAMS · ' + laid + ' OF ' + target + ' BRICKS LAID';
    });
    root.querySelectorAll('[data-wall-title-count]').forEach(function (el) {
      el.textContent = laid + ' of ' + target + ' Bricks';
    });
    root.querySelectorAll('[data-wall-short-count]').forEach(function (el) {
      el.textContent = laid + ' / ' + target;
    });
    root.querySelectorAll('[data-wall-ledger-line]').forEach(function (el) {
      el.textContent = grams + 'g gold · ' + laid + ' of ' + target + ' bricks (counted in grams and bricks only)';
    });
    if (detent) {
      if (laid > 0) {
        detent.textContent = 'INSPECT VAULT RECEIPT · BRICK #01';
        detent.removeAttribute('aria-disabled');
        detent.removeAttribute('tabindex');
        detent.style.cursor = 'pointer';
        var first = (ledger.bricks || []).filter(function (b) { return b.slot === 1; })[0];
        detent.addEventListener('click', function () {
          var reg = root.querySelector('.wall-registry');
          if (reg) reg.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (note && first) {
            note.textContent = 'Brick #01 · ' + first.grams + 'g fine gold (999.9) · Bar serial: ' +
              first.serial + ' · Vault receipt: ' + first.vaultReceipt +
              (first.dedication ? ' · Laid in honor of: ' + first.dedication : '');
          }
        });
      } else {
        detent.textContent = 'RECEIPT LOCKED — AWAITING BRICK #1';
      }
    }
  }

  /* ---------- the countdown to the first birthday ---------- */
  var deadline = null, cdEls = [];
  function tickCountdown() {
    if (!deadline) return;
    var ms = deadline - Date.now();
    var text;
    if (ms <= 0) { text = 'The first birthday has come — the Wall stands complete in the record.'; }
    else {
      var d = Math.floor(ms / 86400000), h = Math.floor(ms / 3600000) % 24,
          m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
      text = d + ' days · ' + h + 'h ' + m + 'm ' + s + 's to the first birthday (2027-11-18)';
    }
    cdEls.forEach(function (el) { el.textContent = text; });
  }

  /* ---------- the ledger's seal: recompute before anything renders ----
     Definition (BUILD_RECORD_WALL_DIGEST_CHECK_2026-11-23.md): the
     digest is SHA-256 over the canonical JSON — keys sorted at every
     depth, compact separators, no trailing newline — of every field
     of the ledger EXCEPT the signature block itself.
     A digest that travels with its data proves consistency, not
     authenticity — so the recomputed digest is NOT compared against
     the file's own claim. It is compared against EXPECTED_DIGEST:
     the reference value pinned HERE, in this script, committed to
     the site's git repository as a separate file the ledger cannot
     rewrite, and anchored in the Day-Book's hash chain (entry #7,
     "The Wall takes its seal", 2026-11-23), which every visitor's
     browser recomputes on /record/. Data + digest rewritten together
     in the ledger file still fail against the pin. (The fully
     off-server reference — the Day-Book's Memo anchor — lands with
     the founder's pennies-wallet step; see the build record.)
     UPDATE PROTOCOL: the ledger's facts may only change when ALL
     FOUR coupled artifacts land in one deploy — (1) the ledger with
     its new signature.digest, (2) the new EXPECTED_DIGEST pinned
     here, (3) a new Day-Book entry whose text states the new digest,
     and (4) root.json updated to the new entry's root with the new
     entry count. Any partial combination fails closed or breaks
     loudly, never silently wrong. Pin ↔ Day-Book-anchor consistency
     is verified by a human on /record/ (whose own chain every
     browser recomputes), not by code — this script never fetches
     the Day-Book. A ledger that changes silently renders nothing.
     On a match the monument renders exactly as it always has. On a
     mismatch, a missing or malformed seal, a stale ledger, or no
     crypto available to check with, NOTHING is rendered from the
     file: the monument fails closed to its founded face — 0 grams ·
     0 of 47 · receipt dark — and the note says the seal did not hold. */
  var EXPECTED_DIGEST = '86011a778d4dd33ca9b031e8329a1c223e2ee244d11b98a86d2cb5c4f01d99c8';
  function canonicalJson(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function (k) {
      return JSON.stringify(k) + ':' + canonicalJson(v[k]);
    }).join(',') + '}';
  }
  function sha256Hex(str) {
    if (!window.crypto || !crypto.subtle || !crypto.subtle.digest) return Promise.resolve(null);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    }, function () { return null; });
  }
  function verifyLedger(ledger) {
    var fail = { sealed: false, hex: null };
    if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) return Promise.resolve(fail);
    var sig = ledger.signature;
    if (!sig || sig.algorithm !== 'SHA-256' || typeof sig.digest !== 'string' ||
        !/^[0-9a-f]{64}$/i.test(sig.digest)) return Promise.resolve(fail);
    /* null-prototype body: a "__proto__" field in the ledger must enter
       the preimage as an own property, never hit the prototype setter —
       the seal covers every field except signature, literally */
    var body = Object.create(null);
    Object.keys(ledger).forEach(function (k) { if (k !== 'signature') body[k] = ledger[k]; });
    return sha256Hex(canonicalJson(body)).then(function (hex) {
      /* both the recomputed digest AND the file's stated digest must
         equal the pinned reference — the file cannot vouch for itself */
      return { sealed: hex !== null && hex === EXPECTED_DIGEST &&
        sig.digest.toLowerCase() === EXPECTED_DIGEST, hex: hex };
    });
  }

  /* ---------- the seal, shown: the Glass Machinery ----------
     The check is not a silent swap. A Seal row rides in every
     Covenant Ledger block on the face, in the ledger's own grammar
     (a named part, then its reading), and the visitor watches it
     work: the recompute resolves first, the reference is named
     beside it, and the verdict lands in plain words at the moment
     the check completes — only then do the figures render. On any
     failure the verdict says so on the face and the numbers stay
     dark. Reduced motion: the completed readout stands at once. */
  var sealRows = [];
  function shortDigest(hex) { return hex ? hex.slice(0, 16) + '\u2026' : '\u2014'; }
  function buildSealRows() {
    root.querySelectorAll('.wall-ledger').forEach(function (ledgerEl) {
      var row = document.createElement('div');
      row.className = 'wall-fact wall-seal';
      row.setAttribute('data-wall-seal', '');
      var label = document.createElement('b');
      label.textContent = 'The Seal';
      var face = document.createElement('span');
      var recompute = document.createElement('span');
      recompute.setAttribute('data-wall-seal-recompute', '');
      recompute.textContent = 'RECOMPUTING THE SEAL \u2014 SHA-256 OVER THE LEDGER\u2019S FIELDS\u2026';
      var reference = document.createElement('span');
      reference.setAttribute('data-wall-seal-reference', '');
      var verdict = document.createElement('span');
      verdict.setAttribute('data-wall-seal-verdict', '');
      verdict.style.color = '#C9A227';
      verdict.style.fontWeight = '600';
      face.appendChild(recompute);
      face.appendChild(document.createElement('br'));
      face.appendChild(reference);
      face.appendChild(document.createElement('br'));
      face.appendChild(verdict);
      row.appendChild(label);
      row.appendChild(face);
      var counterFact = null;
      ledgerEl.querySelectorAll('.wall-fact').forEach(function (f) {
        if (!counterFact && f.querySelector('[data-wall-ledger-line]')) counterFact = f;
      });
      if (counterFact && counterFact.nextSibling) ledgerEl.insertBefore(row, counterFact.nextSibling);
      else ledgerEl.appendChild(row);
      sealRows.push({ recompute: recompute, reference: reference, verdict: verdict });
    });
  }
  function sealStage(fn) { setTimeout(fn, reduced ? 0 : 600); }
  function showSealVerdict(sealed, hex) {
    sealRows.forEach(function (r) {
      r.recompute.textContent = 'RECOMPUTED \u00B7 ' + shortDigest(hex);
      r.reference.textContent = 'REFERENCE \u00B7 ' + shortDigest(EXPECTED_DIGEST) +
        ' \u2014 PINNED IN THIS SCRIPT \u00B7 ANCHORED IN THE DAY-BOOK, ENTRY #7';
      r.verdict.textContent = sealed
        ? '\u2713 SEAL HOLDS \u2014 THE FIGURES HERE ARE RENDERED FROM THE RECONCILED LEDGER'
        : '\u2717 SEAL DOES NOT HOLD \u2014 NO FIGURE IS RENDERED FROM AN UNRECONCILED LEDGER';
    });
  }
  function showSealUnreachable() {
    sealRows.forEach(function (r) {
      r.recompute.textContent = 'THE LEDGER COULD NOT BE READ FROM HERE';
      r.reference.textContent = 'REFERENCE \u00B7 ' + shortDigest(EXPECTED_DIGEST) +
        ' \u2014 PINNED IN THIS SCRIPT \u00B7 ANCHORED IN THE DAY-BOOK, ENTRY #7';
      r.verdict.textContent = '\u2717 SEAL DOES NOT HOLD \u2014 NO FIGURE IS RENDERED FROM AN UNRECONCILED LEDGER';
    });
  }
  buildSealRows();
  function failClosedLedger() {
    var zeroBook = { bricksLaid: 0, bricksTarget: 47, gramsTotal: 0, bricks: [] };
    renderCounter(zeroBook);
    renderRegistry(zeroBook);
    fillSockets(zeroBook);
    if (note) note.textContent = 'The wall ledger\u2019s seal did not verify from here \u2014 ' +
      'no figure on this page is rendered from an unreconciled ledger. The Wall stands at ' +
      'its receipted face: 0 grams \u00B7 0 of 47 bricks, receipt locked.';
  }

  /* ---------- load the signed ledger ---------- */
  fetch(new URL('data/golden-wall.json', BASE).href, { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('ledger ' + r.status); return r.json(); })
    .then(function (ledger) {
      return verifyLedger(ledger).then(function (result) {
        /* the verdict lands visibly first; the figures follow it */
        sealStage(function () {
          showSealVerdict(result.sealed, result.hex);
          if (!result.sealed) { failClosedLedger(); return; }
          renderCounter(ledger);
          renderRegistry(ledger);
          fillSockets(ledger);
          deadline = Date.parse(ledger.birthdayDeadlineUtc);
          cdEls = Array.prototype.slice.call(root.querySelectorAll('[data-wall-countdown]'));
          tickCountdown();
          setInterval(tickCountdown, 1000);
        });
      });
    })
    .catch(function () {
      /* the ledger could not be read: the static face already says 0 / 47,
         which is tonight's truth; the registry still renders its 47 unlit
         slots from the empty book, and the Seal row says why. */
      showSealUnreachable();
      renderRegistry({ bricks: [] });
      fillSockets({ bricks: [] });
      if (note) note.textContent = 'The wall ledger could not be reached from here — the counter on this page stands at its receipted face: 0 grams · 0 of 47 bricks.';
    });

  /* ---------- the scroll journey ---------- */
  var journey = root.querySelector('[data-wall-journey]');
  var stage = root.querySelector('[data-wall-stage]');
  if (!journey || !stage || reduced) return;
  var strata = Array.prototype.slice.call(stage.querySelectorAll('[data-wall-stratum]'));
  var bullets = Array.prototype.slice.call(stage.querySelectorAll('[data-wall-bullet]'));
  var arrival = stage.querySelector('[data-wall-arrival]');
  var closing = stage.querySelector('[data-wall-closing]');
  var plumb = stage.querySelector('[data-wall-plumb]');
  var obelisk = stage.querySelector('[data-wall-obelisk]');
  /* the spec's locks, as scroll progress: frame / 200 */
  var LOCKS = [38 / 200, 82 / 200, 126 / 200, 162 / 200];
  var SPREAD = [46, 24, -24, -46]; /* vh offsets when fully separated */
  var ticking = false;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(x) { x = clamp01(x); return x * x * (3 - 2 * x); }

  function render() {
    ticking = false;
    var rect = journey.getBoundingClientRect();
    var total = journey.offsetHeight - window.innerHeight;
    var p = total > 0 ? clamp01(-rect.top / total) : 0;
    var frame = p * 200;

    /* separation: opens 0.08 → 0.28, holds, reassembles 0.88 → 0.98 */
    var sep = smooth((p - 0.08) / 0.20) * (1 - smooth((p - 0.88) / 0.10));
    strata.forEach(function (el, i) {
      el.style.transform = 'translateY(' + (SPREAD[i] * sep) + 'vh)';
    });
    if (plumb) plumb.style.opacity = String(sep * 0.9);
    if (obelisk) obelisk.style.top = (30 - sep * 10 + smooth((p - 0.88) / 0.10) * 4) + '%';

    /* arrival copy: present at rest, gone by frame ~18 */
    if (arrival) arrival.style.opacity = String(1 - smooth((frame - 6) / 12));

    /* bullets: each locks at its frame, holds, yields to the next */
    bullets.forEach(function (el, i) {
      var lock = LOCKS[i] * 200;
      var inP = smooth((frame - (lock - 14)) / 14);
      var outP = i < 3 ? smooth((frame - (LOCKS[i + 1] * 200 - 16)) / 12) : smooth((frame - 172) / 10);
      el.style.opacity = String(inP * (1 - outP));
    });

    /* closing ledger: rises over the last frames above the solid scrim */
    if (closing) {
      var cIn = smooth((frame - 178) / 16);
      closing.style.opacity = String(cIn);
      closing.classList.toggle('on', cIn > 0.6);
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  render();
})();
