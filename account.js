/* PROVADIA — MY PROVADIA (/account/): the honest probe.
   This page simulates nothing. Its single live act is to ask the town's
   own host whether the members service answers from this origin — and to
   say plainly what it found. Tonight the members service stands on the
   host while its door is fitted to this page (the cross-origin fitting is
   a separate crew's work), so the probe reports the sealed state and the
   instruments keep their true faces. When the service answers a member
   session from here, this probe is where the sanctuary will open. */
(function () {
  'use strict';
  var el = document.querySelector('[data-acct-probe]');
  if (!el) return;
  var done = false;
  function say(text) { if (!done) { done = true; el.textContent = text; } }
  var timer = setTimeout(function () {
    say('Live check: the members service did not answer from this page — the sanctuary door stands sealed, exactly as this page states.');
  }, 6000);
  fetch('https://api.provadiacoin.com/health', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (h) {
      clearTimeout(timer);
      if (h && h.status === 'live') {
        say('Live check: the town\'s host answers (service: ' + (h.service || 'standing') +
            '). The members service stands behind it; its door to this page is still being fitted, so no session opens here tonight.');
      } else {
        say('Live check: the town\'s host answered without a live line — the sanctuary door stands sealed, exactly as this page states.');
      }
    })
    .catch(function () {
      clearTimeout(timer);
      say('Live check: the members service did not answer from this page — the sanctuary door stands sealed, exactly as this page states.');
    });
})();
