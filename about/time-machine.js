/* PROVADIA — /about/ THE TIME MACHINE (T4-C builder seat)
   Enhancement only: lights the monolith stratum + leader tip as each epoch
   card crosses the viewport centre, and wires the epoch scrubber.
   With JS off, reduced motion, or no IntersectionObserver, every card and
   stratum simply stands fully visible — nothing is gated on this script. */
(function () {
  "use strict";
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cards = Array.prototype.slice.call(document.querySelectorAll(".epoch-card[data-epoch]"));
  var strata = {};
  document.querySelectorAll("[data-stratum]").forEach(function (el) { strata[el.getAttribute("data-stratum")] = el; });
  /* The card <-> stratum mapping is declared in the markup itself: each
     epoch card carries data-lights="..." naming the strata that ignite at
     its scroll moment (chronology runs base -> crown). No hidden table. */
  var btns = Array.prototype.slice.call(document.querySelectorAll(".scrub-btn[data-scrub]"));

  function activate(epoch) {
    var active = null;
    cards.forEach(function (c) {
      var on = c.getAttribute("data-epoch") === epoch;
      c.classList.toggle("is-active", on);
      if (on) active = c;
    });
    Object.keys(strata).forEach(function (k) { strata[k].classList.remove("is-lit"); });
    if (active) {
      (active.getAttribute("data-lights") || "").split(/\s+/).forEach(function (k) {
        if (k && strata[k]) strata[k].classList.add("is-lit");
      });
    }
    btns.forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-scrub") === epoch ? "true" : "false"); });
  }

  btns.forEach(function (b) {
    b.addEventListener("click", function () {
      var target = document.getElementById("epoch-" + b.getAttribute("data-scrub"));
      if (!target) return;
      activate(b.getAttribute("data-scrub"));
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
  });

  if (reduced || !("IntersectionObserver" in window) || !cards.length) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) activate(e.target.getAttribute("data-epoch")); });
  }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
  cards.forEach(function (c) { io.observe(c); });
})();
