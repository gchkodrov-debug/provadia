/* PROVADIA — /ecosystem/ THE CONNECTED GALAXY (T4-C builder seat)
   Enhancement only: lights the orrery ring + leader tip as each ring card
   crosses the viewport centre. Gateway cards are native <details> and work
   with no JS at all; with JS off or reduced motion everything stands visible. */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cards = Array.prototype.slice.call(document.querySelectorAll(".ring-card[data-ring]"));
  var visuals = Array.prototype.slice.call(document.querySelectorAll("[data-ring-visual]"));

  function activate(ring) {
    cards.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-ring") === ring); });
    visuals.forEach(function (v) { v.classList.toggle("is-lit", v.getAttribute("data-ring-visual") === ring); });
  }

  if (reduced || !("IntersectionObserver" in window) || !cards.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) activate(e.target.getAttribute("data-ring")); });
  }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
  cards.forEach(function (c) { io.observe(c); });
})();
