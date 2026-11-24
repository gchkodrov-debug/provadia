// PROVADIA — THE EXCHANGE GYRO (catalogue layer, vanilla JS, no dependencies)
// The gyro owns two extra dimensions over the catalogue's own search and
// room filter: price band and price terms, parsed from each card's own
// printed [data-price] text — never from data the page does not show.
// It layers on top of catalogue.js, never against it: catalogue.js owns
// the room/search intent, and the gyro only ever ADDS its dims on top.
// The catalogue intent is recomputed from the DOM on every pass (the
// pressed [data-filter] button + the #search value, mirroring
// catalogue.js's own logic), so loosening a ring can never resurrect a
// card the catalogue's own filters still exclude.
// No ranking, no recommendation, no purchase path, no external requests.
(function () {
  'use strict';

  var BAND_LABELS = {
    all: 'All prices', free: 'Free', under100: 'Under $100',
    mid: '$100–$299', high: '$300 and up', quote: 'By quote'
  };
  var TERMS_LABELS = {
    all: 'All terms', fixed: 'Fixed or test price', range: 'Ranges & tiers',
    quote: 'By quote', free: 'Free'
  };
  // The gyro's rings, matching the SVG in the page: Services rides ring 1,
  // Sector F ring 2, Sector G ring 3; Factory and Custom Build hold the
  // centre orbit.
  var RINGS = {
    'Services': { rx: 150, ry: 54, rot: -18 },
    'Sector F': { rx: 118, ry: 44, rot: 24 },
    'Sector G': { rx: 84, ry: 32, rot: 64 }
  };
  var CENTRE_ORBIT_R = 40;

  // Parse a card's price from its printed price text alone. ALL printed
  // amounts are collected: the card's price is the interval [min, max],
  // and its terms are 'range' when more than one amount is printed OR a
  // dash-between-amounts range is present, else 'fixed'. Free and quote
  // cards keep their own band and carry no interval.
  function parsePrice(card) {
    var el = card.querySelector('[data-price]');
    var text = el ? el.textContent.toLowerCase() : '';
    if (text.indexOf('free') !== -1) return { band: 'free', terms: 'free', min: null, max: null };
    if (text.indexOf('quote') !== -1 || text.indexOf('not supplied') !== -1) {
      return { band: 'quote', terms: 'quote', min: null, max: null };
    }
    var amounts = [];
    var m;
    // Every printed amount: a $-amount, plus the tail of a range
    // ("$175–350" prints two amounts — 175 and 350 — though only the
    // first carries the $ sign).
    var re = /\$([\d,]+)(?:\s*[–—]\s*\$?([\d,]+))?/g;
    while ((m = re.exec(text)) !== null) {
      amounts.push(Number(m[1].replace(/,/g, '')));
      if (m[2]) amounts.push(Number(m[2].replace(/,/g, '')));
    }
    if (!amounts.length) return { band: 'quote', terms: 'quote', min: null, max: null };
    // A range is a dash BETWEEN amounts ("$175–350") — a dash anywhere
    // else in the line ("test price — scope confirmation") is prose.
    var isRange = /\$[\d,]+\s*[–—]\s*\$?[\d,]+/.test(text);
    return {
      band: null,
      terms: amounts.length > 1 || isRange ? 'range' : 'fixed',
      min: Math.min.apply(null, amounts),
      max: Math.max.apply(null, amounts)
    };
  }

  // Interval overlap: a priced card matches a band when its printed
  // interval [min, max] reaches into that band.
  function bandMatches(card, band) {
    if (band === 'all') return true;
    if (band === 'free' || band === 'quote') return card.dataset.gyroBand === band;
    if (card.dataset.gyroMin === undefined || card.dataset.gyroMin === '') return false;
    var min = Number(card.dataset.gyroMin);
    var max = Number(card.dataset.gyroMax);
    if (band === 'under100') return min < 100;
    if (band === 'mid') return min < 300 && max >= 100;
    if (band === 'high') return max >= 300;
    return false;
  }

  function init() {
    var cards = Array.from(document.querySelectorAll('[data-offer]'));
    if (!cards.length) return;
    // The offer total is the body's own printed count when it carries
    // one; otherwise it is counted from the cards themselves (every
    // card except the Custom Build door). Never an invented number.
    var total = document.body.dataset.catalogueCount
      ? Number(document.body.dataset.catalogueCount)
      : cards.filter(function (card) { return card.dataset.group !== 'Custom'; }).length;
    var readout = document.querySelector('[data-gyro-readout]');
    var state = { band: 'all', terms: 'all' };

    cards.forEach(function (card) {
      var p = parsePrice(card);
      if (p.band) card.dataset.gyroBand = p.band;
      else delete card.dataset.gyroBand;
      card.dataset.gyroTerms = p.terms;
      if (p.min === null) {
        delete card.dataset.gyroMin;
        delete card.dataset.gyroMax;
      } else {
        card.dataset.gyroMin = String(p.min);
        card.dataset.gyroMax = String(p.max);
      }
    });

    /* ---- gyro nodes: one dot per card on its room's ring ---- */
    var nodesG = document.querySelector('[data-gyro-nodes]');
    if (nodesG) {
      var byRing = {};
      cards.forEach(function (card) {
        var key = RINGS[card.dataset.group] ? card.dataset.group : 'centre';
        (byRing[key] = byRing[key] || []).push(card);
      });
      Object.keys(byRing).forEach(function (key) {
        var list = byRing[key];
        list.forEach(function (card, i) {
          var t = (2 * Math.PI * i) / list.length - Math.PI / 2;
          var x, y;
          if (key === 'centre') {
            x = 160 + CENTRE_ORBIT_R * Math.cos(t);
            y = 160 + CENTRE_ORBIT_R * Math.sin(t);
          } else {
            var ring = RINGS[key];
            var ex = ring.rx * Math.cos(t);
            var ey = ring.ry * Math.sin(t);
            var a = (ring.rot * Math.PI) / 180;
            x = 160 + ex * Math.cos(a) - ey * Math.sin(a);
            y = 160 + ex * Math.sin(a) + ey * Math.cos(a);
          }
          var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          c.setAttribute('cx', x.toFixed(1));
          c.setAttribute('cy', y.toFixed(1));
          c.setAttribute('r', '3.5');
          c.setAttribute('class', 'gyro-node');
          nodesG.appendChild(c);
          card._gyroNode = c;
        });
      });
    }

    /* ---- the pass: catalogue intent underneath, gyro dims on top ---- */
    function pass() {
      var visible = 0;
      // The catalogue's intent, recomputed from the DOM on every pass —
      // exactly catalogue.js's own logic: the pressed [data-filter]
      // button's group (default 'All') and the trimmed, lowercased
      // #search value against the card's text.
      var pressed = document.querySelector('[data-filter][aria-pressed="true"]');
      var group = pressed ? pressed.getAttribute('data-filter') : 'All';
      var searchEl = document.querySelector('#search');
      var q = searchEl ? searchEl.value.trim().toLowerCase() : '';
      cards.forEach(function (card) {
        var catHidden =
          !((group === 'All' || card.dataset.group === group) &&
            card.textContent.toLowerCase().includes(q));
        var dimFail =
          !bandMatches(card, state.band) ||
          (state.terms !== 'all' && card.dataset.gyroTerms !== state.terms);
        card.hidden = catHidden || dimFail;
        if (!card.hidden) visible += 1;
        if (card._gyroNode) {
          card._gyroNode.classList.toggle('gyro-node-off', card.hidden);
        }
      });
      document.querySelectorAll('[data-group-section]').forEach(function (s) {
        s.hidden = !s.querySelector('[data-offer]:not([hidden])');
      });
      var empty = document.querySelector('#empty');
      if (empty) empty.hidden = visible !== 0;
      // The catalogue's own counter always shows the true combined
      // count, in catalogue.js's own format.
      var results = document.querySelector('#results');
      if (results) results.textContent = visible + ' of ' + total + ' proposed offers';
      if (readout) {
        if (state.band === 'all' && state.terms === 'all') {
          readout.textContent = total + ' proposed offers ride the gyro.';
        } else if (visible === 0) {
          readout.textContent = 'No offer matches that turn of the gyro. Loosen a ring — widen the price or the terms.';
        } else {
          readout.textContent = visible + ' of ' + total + ' proposed offers match — ' +
            BAND_LABELS[state.band] + ' · ' + TERMS_LABELS[state.terms] + '.';
        }
      }
    }

    function wireRow(attr, key) {
      var btns = Array.from(document.querySelectorAll('[' + attr + ']'));
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          state[key] = b.getAttribute(attr);
          btns.forEach(function (x) {
            x.setAttribute('aria-pressed', String(x === b));
          });
          pass();
        });
      });
    }
    wireRow('data-gyro-band', 'band');
    wireRow('data-gyro-terms', 'terms');

    // Room chips turn the catalogue's own room filter; the gyro then
    // re-applies its dims on the fresh catalogue intent.
    document.querySelectorAll('button[data-gyro-room]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = document.querySelector('[data-filter="' + btn.dataset.gyroRoom + '"]');
        if (filter) filter.click();
        requestAnimationFrame(pass);
      });
    });

    // catalogue.js's handlers were registered first, so they run first;
    // the gyro's pass rides the next frame, on top of their result.
    function later() { requestAnimationFrame(pass); }
    var search = document.querySelector('#search');
    if (search) search.addEventListener('input', later);
    document.querySelectorAll('[data-filter]').forEach(function (b) {
      b.addEventListener('click', later);
    });
    var reset = document.querySelector('#reset');
    if (reset) reset.addEventListener('click', later);
    // An index-link jump names one specific offer: clear the gyro's
    // dims to all/all (and sync its buttons) so the gyro can never hide
    // the very card the visitor just jumped to, then pass.
    document.querySelectorAll('[data-index-link]').forEach(function (a) {
      a.addEventListener('click', function () {
        state.band = 'all';
        state.terms = 'all';
        document.querySelectorAll('[data-gyro-band]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-gyro-band') === 'all'));
        });
        document.querySelectorAll('[data-gyro-terms]').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.getAttribute('data-gyro-terms') === 'all'));
        });
        requestAnimationFrame(pass);
      });
    });

    /* ---- scroll tilt: the svg leans as the hall scrolls past ----
       The rings' slow spin lives in CSS on the inner .gyro-spin group;
       the tilt rides the svg element itself, so the two never fight.
       Both stand down for reduced motion and for the town's still face. */
    var svg = document.querySelector('.gyro-svg');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var still = !!(window.PROVADIA && window.PROVADIA.isStill && window.PROVADIA.isStill());
    if (svg && !reduce && !still) {
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var deg = Math.max(-24, Math.min(24, window.scrollY * 0.02));
          svg.style.transform = 'rotate(' + deg.toFixed(2) + 'deg)';
          ticking = false;
        });
      }, { passive: true });
    }

    pass();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
