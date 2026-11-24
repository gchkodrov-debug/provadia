/* PROVADIA — Chamber of Trust behaviour (privacy + terms pages).
   Tiny, dependency-free, and failure-safe: every step is guarded so
   that if anything here fails, the page stays fully readable.
   The dimmed scroll staging in trust.css applies ONLY under the
   `js` class this file adds to <html> — no JS, no dimming. */
(function () {
  'use strict';
  try {
    document.documentElement.classList.add('js');
  } catch (e) {
    return; /* Without the class nothing is staged; page is complete. */
  }

  /* Light each vow as it scrolls into view; unobserve once lit. */
  try {
    var vows = document.querySelectorAll('.trust-vow');
    if (!vows.length) return;
    if (!('IntersectionObserver' in window)) {
      /* No observer support: light everything at once. */
      for (var i = 0; i < vows.length; i++) vows[i].classList.add('is-lit');
    } else {
      var io = new IntersectionObserver(function (entries) {
        for (var j = 0; j < entries.length; j++) {
          if (entries[j].isIntersecting) {
            entries[j].target.classList.add('is-lit');
            io.unobserve(entries[j].target);
          }
        }
      }, { threshold: 0.35 });
      for (var k = 0; k < vows.length; k++) io.observe(vows[k]);
    }
  } catch (e) {
    /* Staging failed: restore full visibility for every vow.
       Indexed loops only — this fallback must not itself depend on
       NodeList.forEach, whose absence may be what just failed. */
    try {
      var all = document.querySelectorAll('.trust-vow');
      for (var m = 0; m < all.length; m++) all[m].classList.add('is-lit');
    } catch (ignored) { /* CSS default (no .js dimming path) still reads fine. */ }
  }

  /* Print / save-as-PDF button in the full-text head. */
  try {
    var btn = document.querySelector('[data-print]');
    if (btn) {
      btn.addEventListener('click', function () { window.print(); });
    }
  } catch (e) { /* Button stays hidden without JS (trust.css); the text remains. */ }
})();
