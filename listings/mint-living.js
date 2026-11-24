/* THE LIVING MINT — Interactive Creation Chamber (Tranche T4-A).
   Vanilla JS. No dependencies, no network, no storage.
   The chamber only ever draws CONCEPT previews on a canvas and, on
   submit, opens the visitor's own email app via a mailto: link to the
   Mint's existing intake. It never mints, deploys, or charges. */
(function () {
  'use strict';

  var chamber = document.getElementById('creation-chamber');
  if (!chamber) return;
  var canvas = document.getElementById('lm-preview');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var W = canvas.width, H = canvas.height;
  var CX = W / 2, CY = H / 2, R = 250;

  var nameEl = document.getElementById('lm-name');
  var tickerEl = document.getElementById('lm-ticker');
  var purposeEl = document.getElementById('lm-purpose');
  var contactNameEl = document.getElementById('lm-contact-name');
  var contactEl = document.getElementById('lm-contact');
  var hashEl = document.getElementById('lm-hash');
  var explodeBtn = document.getElementById('lm-explode');
  var submitBtn = document.getElementById('lm-submit');
  var statusEl = document.getElementById('lm-status');

  /* Canvas descriptions for assistive tech: the whole-medallion text
     matches the aria-label shipped in the markup; the exploded text is
     swapped in while the concept is separated into its 8 stages. Both
     state plainly that this is a concept, never finished artwork. */
  var LABEL_WHOLE = 'Concept medallion preview drawn from your name, ticker, motif, finish and rim choices — a concept only, not finished artwork';
  var LABEL_EXPLODED = 'Concept medallion separated into the eight labeled stages of the Mint service, from the original idea to final delivery — a concept only, not finished artwork, and nothing here mints or deploys';

  var STAGE_LABELS = [
    '01 THE ORIGINAL IDEA',
    '02 COIN IDENTITY & ARTISTIC DESIGN',
    '03 TOKEN SPECIFICATIONS',
    '04 BLOCKCHAIN CONTRACT PREPARATION',
    '05 TECHNICAL VERIFICATION',
    '06 MINTING',
    '07 LAUNCH PREPARATION',
    '08 FINAL DELIVERY'
  ];
  var MOTIF_LABELS = {
    masonry: 'Architectural Masonry',
    botanical: 'Botanical / Natural',
    celestial: 'Celestial / Astrolabe',
    minimal: 'Minimal Emblem'
  };
  var FINISH_LABELS = {
    antique: 'Struck Antique Gold',
    bronze: 'Brushed Bronze & Obsidian',
    salt: 'Salt-Crystal Inlay',
    silvergold: 'Burnished Silver-Gold'
  };
  var EDGE_LABELS = {
    beaded: 'Beaded Bullion Rim',
    reeded: 'Reeded Edge',
    motto: 'Engraved Motto Ring'
  };
  var FINISH_STOPS = {
    antique: ['#C9A227', '#8a6d1c', '#30251B'],
    bronze: ['#6e5233', '#30251B', '#141210'],
    salt: ['#E9DDC6', '#b8a888', '#8a7a5c'],
    silvergold: ['#E4C65B', '#C9A227', '#8a6d1c']
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var separation = 0, separationTarget = 0;
  var sweepAngle = -0.6;
  var inView = true, lastHash = '';

  function radioValue(groupName) {
    var el = chamber.querySelector('input[name="' + groupName + '"]:checked');
    return el ? el.value : '';
  }

  function readState() {
    return {
      name: nameEl ? nameEl.value.trim() : '',
      ticker: tickerEl ? tickerEl.value.trim() : '',
      purpose: purposeEl ? purposeEl.value.trim() : '',
      motif: radioValue('lm-motif') || 'masonry',
      finish: radioValue('lm-finish') || 'antique',
      edge: radioValue('lm-edge') || 'beaded'
    };
  }

  function conceptHash(s) {
    var json = JSON.stringify({
      name: s.name, ticker: s.ticker, purpose: s.purpose,
      motif: s.motif, finish: s.finish, edge: s.edge
    });
    var h = 5381;
    for (var i = 0; i < json.length; i++) {
      h = ((h << 5) + h + json.charCodeAt(i)) >>> 0;
    }
    var hex = h.toString(16).toUpperCase();
    while (hex.length < 8) hex = '0' + hex;
    return hex;
  }

  /* Deterministic speckle field for the salt-crystal finish. */
  function speckle(i) {
    var x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    var y = Math.sin(i * 269.5 + 183.3) * 28001.8384;
    return [x - Math.floor(x), y - Math.floor(y)];
  }

  function faceGradient(finish) {
    var stops = FINISH_STOPS[finish] || FINISH_STOPS.antique;
    var g = ctx.createRadialGradient(CX - R * 0.35, CY - R * 0.4, R * 0.1, CX, CY, R);
    g.addColorStop(0, stops[0]);
    g.addColorStop(0.62, stops[1]);
    g.addColorStop(1, stops[2]);
    return g;
  }

  function drawRim(s) {
    ctx.save();
    ctx.strokeStyle = '#C9A227';
    ctx.fillStyle = '#C9A227';
    if (s.edge === 'beaded') {
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CX, CY, R + 14, 0, Math.PI * 2); ctx.stroke();
      var n = 48;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(CX + Math.cos(a) * (R + 14), CY + Math.sin(a) * (R + 14), 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (s.edge === 'reeded') {
      ctx.lineWidth = 3;
      var m = 72;
      for (var j = 0; j < m; j++) {
        var b = (j / m) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(b) * (R + 4), CY + Math.sin(b) * (R + 4));
        ctx.lineTo(CX + Math.cos(b) * (R + 20), CY + Math.sin(b) * (R + 20));
        ctx.stroke();
      }
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CX, CY, R + 2, 0, Math.PI * 2); ctx.stroke();
    } else { /* motto */
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CX, CY, R + 20, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(CX, CY, R + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#E9DDC6';
      ctx.font = '600 17px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var text = '· CONCEPT · PROVADIA MINT ';
      var full = text + text;
      var radius = R + 13;
      var stepA = (Math.PI * 2) / full.length;
      for (var k = 0; k < full.length; k++) {
        var ang = -Math.PI / 2 + k * stepA;
        ctx.save();
        ctx.translate(CX + Math.cos(ang) * radius, CY + Math.sin(ang) * radius);
        ctx.rotate(ang + Math.PI / 2);
        ctx.fillText(full.charAt(k), 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawMotif(s) {
    ctx.save();
    ctx.strokeStyle = 'rgba(20,18,16,.78)';
    ctx.fillStyle = 'rgba(20,18,16,.78)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    var cx = CX, cy = CY - 6;
    if (s.motif === 'masonry') {
      /* Brick courses with a central arch. */
      var bw = 52, bh = 24, rows = 5, top = cy - 62;
      for (var rI = 0; rI < rows; rI++) {
        var off = (rI % 2) * (bw / 2);
        for (var cI = -2; cI < 2; cI++) {
          ctx.strokeRect(cx + cI * bw + off - bw / 2, top + rI * bh, bw - 5, bh - 5);
        }
      }
      ctx.beginPath();
      ctx.arc(cx, top + rows * bh, 30, Math.PI, 0);
      ctx.lineTo(cx + 30, top + rows * bh + 34);
      ctx.lineTo(cx - 30, top + rows * bh + 34);
      ctx.closePath();
      ctx.stroke();
    } else if (s.motif === 'botanical') {
      /* Stem with paired leaves. */
      ctx.beginPath();
      ctx.moveTo(cx, cy + 92);
      ctx.quadraticCurveTo(cx - 8, cy, cx + 4, cy - 88);
      ctx.stroke();
      var leafAt = function (yy, dir) {
        ctx.beginPath();
        ctx.moveTo(cx + dir * 2, yy);
        ctx.quadraticCurveTo(cx + dir * 52, yy - 26, cx + dir * 62, yy + 8);
        ctx.quadraticCurveTo(cx + dir * 30, yy + 22, cx + dir * 2, yy);
        ctx.fill();
      };
      leafAt(cy + 44, -1); leafAt(cy + 44, 1);
      leafAt(cy - 6, -1); leafAt(cy - 6, 1);
      leafAt(cy - 52, -1); leafAt(cy - 52, 1);
      ctx.beginPath(); ctx.arc(cx + 4, cy - 100, 9, 0, Math.PI * 2); ctx.fill();
    } else if (s.motif === 'celestial') {
      /* Concentric astrolabe rings with a four-point star. */
      [86, 62, 38].forEach(function (rr) {
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke();
      });
      for (var t = 0; t < 12; t++) {
        var ta = (t / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ta) * 78, cy + Math.sin(ta) * 78);
        ctx.lineTo(cx + Math.cos(ta) * 86, cy + Math.sin(ta) * 86);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(cx, cy - 30);
      ctx.quadraticCurveTo(cx + 7, cy - 7, cx + 30, cy);
      ctx.quadraticCurveTo(cx + 7, cy + 7, cx, cy + 30);
      ctx.quadraticCurveTo(cx - 7, cy + 7, cx - 30, cy);
      ctx.quadraticCurveTo(cx - 7, cy - 7, cx, cy - 30);
      ctx.fill();
    } else { /* minimal — single diamond */
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 74);
      ctx.lineTo(cx + 52, cy);
      ctx.lineTo(cx, cy + 74);
      ctx.lineTo(cx - 52, cy);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawConceptBand() {
    ctx.save();
    ctx.translate(CX, CY + R * 0.62);
    ctx.rotate(-4 * Math.PI / 180);
    ctx.fillStyle = '#E4C65B';
    ctx.fillRect(-W / 2 - 30, -25, W + 60, 50);
    ctx.fillStyle = '#141210';
    ctx.font = '700 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('CONCEPT PREVIEW — NOT FINISHED ARTWORK · DOES NOT MINT OR DEPLOY', 0, 1);
    ctx.restore();
  }

  function drawWhole(s) {
    /* Face */
    ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.fillStyle = faceGradient(s.finish);
    ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#C9A227'; ctx.stroke();
    /* Inner incuse ring */
    ctx.beginPath(); ctx.arc(CX, CY, R - 16, 0, Math.PI * 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(201,162,39,.65)'; ctx.stroke();

    if (s.finish === 'salt') {
      ctx.save();
      ctx.beginPath(); ctx.arc(CX, CY, R - 4, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = 'rgba(255,252,240,.85)';
      for (var i = 0; i < 90; i++) {
        var p = speckle(i);
        var sx = CX + (p[0] - 0.5) * 2 * R * 0.92;
        var sy = CY + (p[1] - 0.5) * 2 * R * 0.92;
        var dx = sx - CX, dy = sy - CY;
        if (dx * dx + dy * dy > (R - 10) * (R - 10)) continue;
        ctx.globalAlpha = 0.25 + p[0] * 0.55;
        ctx.fillRect(sx, sy, 2.6, 2.6);
      }
      ctx.restore();
    }

    /* Rotating light sweep (skipped when static). */
    if (!reduced) {
      ctx.save();
      ctx.beginPath(); ctx.arc(CX, CY, R - 2, 0, Math.PI * 2); ctx.clip();
      var gx = CX + Math.cos(sweepAngle) * R;
      var gy = CY + Math.sin(sweepAngle) * R;
      var lg = ctx.createLinearGradient(CX - (gx - CX), CY - (gy - CY), gx, gy);
      lg.addColorStop(0, 'rgba(255,244,205,0)');
      lg.addColorStop(0.78, 'rgba(255,244,205,0)');
      lg.addColorStop(0.95, 'rgba(255,244,205,.34)');
      lg.addColorStop(1, 'rgba(255,244,205,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    drawRim(s);

    /* Coin name above the motif */
    ctx.fillStyle = s.finish === 'bronze' ? '#E9DDC6' : 'rgba(20,18,16,.85)';
    ctx.font = '500 25px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((s.name || 'Your Coin').toUpperCase().slice(0, 22), CX, CY - R * 0.66);

    drawMotif(s);

    /* Ticker across the lower centre */
    ctx.fillStyle = s.finish === 'bronze' ? '#E9DDC6' : 'rgba(20,18,16,.9)';
    ctx.font = '700 44px Inter, sans-serif';
    ctx.fillText(s.ticker || 'YOUR', CX, CY + R * 0.44);
  }

  /* Word-wrap a stage label for the narrow (phone-width) exploded view. */
  function wrapLabel(text, max) {
    var words = text.split(' '), lines = [], cur = '';
    for (var wI = 0; wI < words.length; wI++) {
      var next = cur ? cur + ' ' + words[wI] : words[wI];
      if (next.length > max && cur) { lines.push(cur); cur = words[wI]; }
      else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  function drawExploded(s, t) {
    var stops = FINISH_STOPS[s.finish] || FINISH_STOPS.antique;
    /* Narrow check: when the canvas is displayed at phone width, the wide
       layout's labels would render at ~7px and be illegible — switch to a
       compact layout with larger, wrapped labels. The wide layout's
       geometry below is exactly the original (cxE 218, rxE 168, leader
       390→404, labels at x 414). */
    var narrow = (canvas.clientWidth || W) < 560;
    var cxE = narrow ? 118 : 218, rxE = narrow ? 104 : 168, spread = 57;
    var topY = CY - 3.5 * spread, botY = CY + 3.5 * spread;
    ctx.save();
    ctx.font = '600 14.5px Inter, sans-serif';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < 8; i++) {
      var y = CY + (i - 3.5) * spread * t;
      var ry = 21 + (1 - t) * 4;
      var grd = ctx.createLinearGradient(0, y - ry, 0, y + ry);
      grd.addColorStop(0, stops[0]);
      grd.addColorStop(0.55, stops[1]);
      grd.addColorStop(1, stops[2]);
      ctx.beginPath();
      ctx.ellipse(cxE, y, rxE, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#C9A227'; ctx.stroke();
      /* Front-arc relief hint */
      ctx.beginPath();
      ctx.ellipse(cxE, y, rxE - 20, ry - 6, 0, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(233,221,198,.5)'; ctx.stroke();
      /* Stage number on the slice */
      ctx.fillStyle = '#E9DDC6';
      ctx.font = '700 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('0' + (i + 1), cxE, y + 1);
      if (t > 0.55) {
        var alpha = Math.min(1, (t - 0.55) / 0.45);
        ctx.globalAlpha = alpha;
        /* Leader line to the right-side label */
        var leadX = cxE + rxE + 4;
        ctx.strokeStyle = '#C9A227';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leadX, y);
        ctx.lineTo(leadX + 14, y);
        ctx.stroke();
        ctx.fillStyle = '#E4C65B';
        ctx.beginPath(); ctx.arc(leadX, y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#E9DDC6';
        ctx.textAlign = 'left';
        if (narrow) {
          /* Larger type, wrapped to at most two lines within the 57px
             stratum spacing, so labels stay legible at phone width. */
          ctx.font = '600 22px Inter, sans-serif';
          var lines = wrapLabel(STAGE_LABELS[i], 20);
          for (var lI = 0; lI < lines.length; lI++) {
            ctx.fillText(lines[lI], leadX + 24, y + (lI - (lines.length - 1) / 2) * 24 + 1);
          }
        } else {
          ctx.font = '600 14.5px Inter, sans-serif';
          ctx.fillText(STAGE_LABELS[i], leadX + 24, y + 1);
        }
        ctx.globalAlpha = 1;
      }
      ctx.font = '600 14.5px Inter, sans-serif';
    }
    ctx.restore();
    /* Held-whole ghost markers at the extremes while travelling */
    if (t < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.35;
      ctx.strokeStyle = '#C9A227';
      ctx.setLineDash([4, 6]);
      var ghostX = Math.max(6, cxE - rxE - 22);
      ctx.beginPath(); ctx.moveTo(ghostX, topY - 30); ctx.lineTo(ghostX, botY + 30); ctx.stroke();
      ctx.restore();
    }
  }

  function render() {
    var s = readState();
    ctx.fillStyle = '#141210';
    ctx.fillRect(0, 0, W, H);
    /* Vault backdrop ring */
    ctx.beginPath(); ctx.arc(CX, CY, R + 44, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201,162,39,.18)'; ctx.lineWidth = 1; ctx.stroke();

    if (separation > 0.001) {
      drawExploded(s, separation);
    } else {
      drawWhole(s);
    }
    drawConceptBand();

    var h = conceptHash(s);
    if (h !== lastHash) {
      lastHash = h;
      if (hashEl) hashEl.textContent = h;
    }
  }

  /* Animation loop: light sweep + explode travel. Pauses its drawing
     while the tab is hidden or the canvas is off-screen. */
  var rafId = null;
  function loop() {
    rafId = requestAnimationFrame(loop);
    if (document.hidden || !inView) return;
    sweepAngle += 0.0035;
    if (Math.abs(separationTarget - separation) > 0.001) {
      separation += (separationTarget - separation) * 0.09;
      if (Math.abs(separationTarget - separation) <= 0.001) separation = separationTarget;
    }
    render();
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { rootMargin: '80px 0px' });
    io.observe(canvas);
  }

  /* Ticker: uppercase A–Z / 0–9 only. */
  if (tickerEl) {
    tickerEl.addEventListener('input', function () {
      var clean = tickerEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (clean !== tickerEl.value) tickerEl.value = clean;
      if (reduced) render();
    });
  }

  chamber.addEventListener('input', function () { if (reduced) render(); });
  chamber.addEventListener('change', function () { if (reduced) render(); });

  if (explodeBtn) {
    explodeBtn.addEventListener('click', function () {
      var on = separationTarget < 0.5;
      separationTarget = on ? 1 : 0;
      explodeBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      canvas.setAttribute('aria-label', on ? LABEL_EXPLODED : LABEL_WHOLE);
      explodeBtn.textContent = on ? '[ REASSEMBLE CONCEPT ]' : '[ EXPLODE CONCEPT INTO 8 STAGES ]';
      if (reduced) { separation = separationTarget; render(); }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', function () {
      var contact = contactEl ? contactEl.value.trim() : '';
      if (!contact) {
        if (statusEl) statusEl.textContent = 'Please add your contact email or handle first — the Keeper needs a way to reply to your scope request.';
        if (contactEl) contactEl.focus();
        return;
      }
      var s = readState();
      var h = conceptHash(s);
      var lines = [
        'Name: ' + (contactNameEl ? contactNameEl.value.trim() : ''),
        'Contact: ' + contact,
        'Coin Name: ' + (s.name || '(not set)'),
        'Ticker: ' + (s.ticker || '(not set)'),
        'Purpose: ' + (s.purpose || '(not set)'),
        'Relief Motif: ' + (MOTIF_LABELS[s.motif] || s.motif),
        'Surface Finish: ' + (FINISH_LABELS[s.finish] || s.finish),
        'Edge & Rim: ' + (EDGE_LABELS[s.edge] || s.edge),
        'Concept reference #' + h,
        '',
        'Gate closed — scope request for founder review. No payment taken.'
      ];
      var href = 'mailto:support@provadiacoin.com'
        + '?subject=Catalogue%20scope%3A%20The%20Mint%20—%20Creation%20Chamber'
        + '&body=' + encodeURIComponent(lines.join('\n'));
      if (statusEl) {
        statusEl.textContent = 'Your email app is opening with the request addressed to the Mint\u2019s existing intake. Nothing was charged; the gate stays closed until the founder opens it. If your email app did not open, write to support@provadiacoin.com directly.';
      }
      window.location.href = href;
    });
  }

  render();
  if (!reduced) {
    rafId = requestAnimationFrame(loop);
  }
})();
