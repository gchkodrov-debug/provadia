/**
 * guide.js — the town's guided tour + the Keeper's "show me" errands.
 * ------------------------------------------------------------------
 * THE TOUR: driver.js (MIT, vendored at design/vendor/) walks a visitor
 * Town → Record → Catalogue → Coin → Knock, one rehearsed leg per page.
 * Legs hand over through sessionStorage ("provadia.tour.next"): when a
 * leg ends with an onward step, the next page's leg starts itself.
 *
 * SHOW ME: the Keeper's Chamber carries three errand buttons. A click
 * stores the errand ("provadia.showme"), the Keeper points, the page
 * travels, and this script rings the destination on arrival and names
 * it in a single driver highlight. No errand ever submits, buys, sends
 * or signs anything — the guide only walks and points.
 *
 * CALM: the house calm system is honoured — html[data-calm="true"],
 * html[data-still="true"] or prefers-reduced-motion turn the tour's
 * animation off; the words remain.
 */
(function () {
  'use strict';

  var TOUR_KEY = 'provadia.tour.next';
  var SHOWME_KEY = 'provadia.showme';

  function calm() {
    var d = document.documentElement;
    var reduced = typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduced || d.getAttribute('data-calm') === 'true' ||
      d.getAttribute('data-still') === 'true';
  }

  function pageKey() {
    var p = window.location.pathname;
    if (/\/(record)\/?(index\.html)?$/.test(p)) return 'record';
    if (/\/(catalogue)\/?(index\.html)?$/.test(p)) return 'catalogue';
    if (/\/(coin)\/?(index\.html)?$/.test(p)) return 'coin';
    if (/\/(knock)\/?(index\.html)?$/.test(p)) return 'knock';
    var seg = p.replace(/\/+$/, '').split('/').pop() || '';
    if (seg === 'record' || seg === 'catalogue' || seg === 'coin' || seg === 'knock') return seg;
    return 'home';
  }

  function store(key, val) {
    try {
      if (val == null) window.sessionStorage.removeItem(key);
      else window.sessionStorage.setItem(key, val);
    } catch (e) { /* private mode: the tour simply stays on this page */ }
  }
  function read(key) {
    try { return window.sessionStorage.getItem(key); } catch (e) { return null; }
  }

  /* ------------------------------ the legs ------------------------------ */

  var LEGS = {
    home: {
      next: 'record', nextHref: 'record/', nextLabel: 'Onward — to the Record',
      steps: [
        { element: '#stage', popover: { title: 'The Town Square',
          description: 'This is Provadia — a town built around one coin and one promise: everything here is written in a public record. Walk with me a moment; I will show thee the doors that matter.',
          side: 'bottom', align: 'center' } },
        { element: 'nav.doors', popover: { title: 'The Doors of the Town',
          description: 'Every room of the town hangs on these doors — the Record, the Forum, the Knock, the Catalogue, the Coin. Nothing hides behind a menu; what the town is, it shows.',
          side: 'bottom', align: 'center' } },
        { element: '#station-wall', popover: { title: 'The Golden Wall',
          description: 'Twenty of every hundred creator-fee parts buy real gold for this Wall — brick by brick, receipted in the open. The counter reads as the record stands, and today it stands at nought of forty-seven: the Wall is honest about being empty.',
          side: 'top', align: 'center' } }
      ]
    },
    record: {
      next: 'catalogue', nextHref: '../catalogue/', nextLabel: 'Onward — to the Catalogue',
      steps: [
        { element: '#station-captain', popover: { title: "The Captain's Chamber",
          description: 'Here sits SOLNIK, Keeper of the Wall — the town\'s host. Ask him anything the record can witness; he answers from the book, and what he cannot show thee, he will not claim.',
          side: 'bottom', align: 'center' } },
        { element: '#station-record', popover: { title: 'The Day-Book',
          description: 'The town\'s public record. Every entry is chained to the one before it by its hash — and thy own browser recomputes the whole chain below, on thy own machine. Trust nothing here; verify everything.',
          side: 'top', align: 'center' } }
      ]
    },
    catalogue: {
      next: 'coin', nextHref: '../coin/', nextLabel: 'Onward — to the Coin',
      steps: [
        { element: '#browse', popover: { title: 'The Catalogue',
          description: 'The town\'s work, offered plainly: services and kits from the Studio, each with its scope written before its price. Proposed work is labelled proposed — nothing here pretends to be what it is not.',
          side: 'bottom', align: 'center' } },
        { element: '#custom-build', popover: { title: 'The Custom Build Door',
          description: 'If thy need is not on the shelf, bring thy specification here. If we can build it, thou receivest a written quote and scope before any charge; if we cannot, we say so plainly and charge nothing.',
          side: 'top', align: 'center' } }
      ]
    },
    coin: {
      next: 'knock', nextHref: '../knock/', nextLabel: 'Onward — to the Knock',
      steps: [
        { element: '#coin-chart', popover: { title: 'The Coin, Priced in the Open',
          description: 'The coin trades where the crowd trades it. This chart and these numbers are read live from the market\'s own sources — nothing drawn in by hand, nothing promised.',
          side: 'top', align: 'center' } },
        { element: '#coin-facts', popover: { title: 'The Facts, On-Chain',
          description: 'One billion coins, fixed; no mint authority, no freeze authority. The contract address stands here in the open — check it thyself, on-chain, before thou believest a word of ours.',
          side: 'top', align: 'center' } }
      ]
    },
    knock: {
      next: null, nextHref: null, nextLabel: 'The tour ends — the Chamber stays open',
      steps: [
        { element: 'section[aria-label="The Door Itself"]', popover: { title: 'The Knock',
          description: 'A founder\'s door in the town wall. The covenant is written on this page, before the gate, for anyone to read — and the gate itself is closed, and says so on its face.',
          side: 'bottom', align: 'center' } },
        { element: 'section[aria-label="The Gate State"]', popover: { title: 'Where the Tour Ends',
          description: 'That is the town, traveller — the Square, the Keeper, the Book, the work, the coin, and this door. If thou wouldst hear more, Solnik keeps his seat in the Chamber, and his tales are true, and told.',
          side: 'top', align: 'center' } }
      ]
    }
  };

  /* --------------------------- show-me targets --------------------------- */

  var SHOWME = {
    knock: { page: 'knock', element: 'section[aria-label="The Door Itself"]',
      title: 'The Knock', text: 'Here it stands, traveller — the founder\'s door, and its covenant written before it.' },
    wall: { page: 'home', element: '#station-wall',
      title: 'The Golden Wall', text: 'The Wall, as the Keeper promised — and its counter, reading as the record stands.' },
    catalogue: { page: 'catalogue', element: '#browse',
      title: 'The Catalogue', text: 'The town\'s work, all in one room — services and kits, each with its scope written plain.' }
  };

  /* ------------------------------- the tour ------------------------------ */

  function driverReady() {
    return typeof window.driver !== 'undefined' && window.driver.js &&
      typeof window.driver.js.driver === 'function';
  }

  function runLeg(key) {
    if (!driverReady()) return;
    var leg = LEGS[key];
    if (!leg) return;
    var steps = leg.steps.filter(function (s) {
      return document.querySelector(s.element);
    });
    if (!steps.length) {
      if (window.console && console.warn) console.warn('[guide] tour leg "' + key + '" found no step elements on this page.');
      return;
    }
    var isCalm = calm();
    var travelling = false;
    var doneHandler = null;
    var drv = window.driver.js.driver({
      animate: !isCalm,
      smoothScroll: !isCalm,
      overlayOpacity: 0.72,
      stagePadding: 8,
      popoverClass: 'prov-tour',
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: leg.nextLabel,
      onDestroyed: function () {
        if (doneHandler) document.removeEventListener('click', doneHandler);
        if (!travelling) store(TOUR_KEY, null);
      }
    });
    // The final step carries the onward errand.
    steps.push({ popover: { title: leg.next ? 'The Road Goes On' : 'Journey\'s End',
      description: leg.next
        ? 'This room is walked. When thou art ready, the road leads onward — the next room of the town waits.'
        : 'The whole town lies behind thee now. The Chamber door never closes; come back and ask the Keeper anything.',
      side: 'bottom', align: 'center' } });
    drv.setSteps(steps);
    drv.drive();
    // Intercept the final "done" click: travel to the next leg's page.
    doneHandler = function (e) {
      var btn = e.target && e.target.closest &&
        e.target.closest('.driver-popover-next-btn');
      if (!btn) return;
      var active = drv.getActiveIndex();
      if (active === steps.length - 1) {
        document.removeEventListener('click', doneHandler);
        if (leg.next) {
          travelling = true;
          store(TOUR_KEY, leg.next);
          drv.destroy();
          window.location.href = leg.nextHref;
        } else {
          store(TOUR_KEY, null);
          drv.destroy();
        }
      }
    };
    document.addEventListener('click', doneHandler);
  }

  function startTour() {
    store(TOUR_KEY, null);
    runLeg(pageKey());
  }

  /* ------------------------------ show me ------------------------------- */

  // Wait until the element's viewport position stops moving (smooth
  // scroll finished) — a fixed delay draws the ring where the element
  // used to be on slow devices and long pages.
  function awaitScrollSettled(node, fn) {
    if (calm()) { setTimeout(fn, 60); return; }
    var lastTop = null, still = 0, tries = 0;
    (function poll() {
      var top = node.getBoundingClientRect().top;
      if (lastTop !== null && Math.abs(top - lastTop) < 2) still++; else still = 0;
      lastTop = top;
      if (still >= 2 || ++tries > 28) { fn(); return; }
      setTimeout(poll, 90);
    })();
  }

  function ringOnArrival(target) {
    var t = SHOWME[target];
    if (!t) return;
    var tries = 0;
    (function attempt() {
      var node = document.querySelector(t.element);
      if (!node) { if (++tries < 12) setTimeout(attempt, 350); return; }
      node.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' });
      awaitScrollSettled(node, function () {
        var r = node.getBoundingClientRect();
        var ring = document.createElement('div');
        ring.className = 'prov-showme-ring';
        ring.style.left = (r.left + window.scrollX - 8) + 'px';
        ring.style.top = (r.top + window.scrollY - 8) + 'px';
        ring.style.width = (r.width + 16) + 'px';
        ring.style.height = (r.height + 16) + 'px';
        document.body.appendChild(ring);
        setTimeout(function () { ring.remove(); }, 4200);
        if (driverReady()) {
          var drv = window.driver.js.driver({
            animate: !calm(), overlayOpacity: 0.55, stagePadding: 8,
            popoverClass: 'prov-tour', showButtons: ['close'],
            onDestroyed: function () {}
          });
          drv.highlight({ element: t.element, popover: {
            title: t.title, description: t.text, side: 'bottom', align: 'center' } });
        }
      });
    })();
  }

  /* ------------------------------- wiring -------------------------------- */

  function init() {
    // Tour doors: any [data-tour-start] on the page starts this page's leg.
    document.querySelectorAll('[data-tour-start]').forEach(function (b) {
      b.addEventListener('click', startTour);
    });
    // Keeper errands: buttons the Chamber's keeper block carries.
    document.querySelectorAll('[data-showme]').forEach(function (b) {
      b.addEventListener('click', function () {
        var target = b.getAttribute('data-showme');
        var t = SHOWME[target];
        if (!t) return;
        store(SHOWME_KEY, target);
        if (window.__keeperPoint) window.__keeperPoint();
        var href = b.getAttribute('data-href');
        setTimeout(function () {
          if (t.page === pageKey()) { store(SHOWME_KEY, null); ringOnArrival(target); }
          else if (href) window.location.href = href;
        }, calm() ? 60 : 900);
      });
    });
    // Arriving on an errand?
    var errand = read(SHOWME_KEY);
    if (errand && SHOWME[errand] && SHOWME[errand].page === pageKey()) {
      store(SHOWME_KEY, null);
      ringOnArrival(errand);
      return;
    }
    // Arriving mid-tour?
    var next = read(TOUR_KEY);
    if (next && next === pageKey()) {
      store(TOUR_KEY, null);
      var waited = 0;
      (function awaitDriver() {
        if (driverReady()) { setTimeout(function () { runLeg(next); }, 500); return; }
        if (++waited > 24) return; // library failed; the doors still work
        setTimeout(awaitDriver, 250);
      })();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else init();

  // The Keeper's stage (keeper.js) and any future body read the same doors.
  window.__provadiaGuide = { startTour: startTour, calm: calm };
})();
