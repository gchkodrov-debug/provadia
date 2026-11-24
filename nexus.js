/* PROVADIA — THE NEXUS (nexus-instrument-v1).
   The travelling instrument: one shared component riding every door at
   z-index 35. It reads ONLY the page's public share manifest
   (<script type="application/json" id="nexus-share-manifest">) — never
   session state, never private data. Sharing is always the visitor's own
   act: platform intents, the native share sheet, media download, or the
   clipboard. Zero credential custody. Only real doors open — X
   (@ProvadiaCoin) and the PROVADIA Discord are live tonight; the town's
   Telegram rides visibly SEALED and non-clickable (an outbound Telegram
   share intent remains available inside Share This World, as the honest
   matrix states). Solnik's node reads OFF WATCH until the host service
   itself reports live. Paths resolve against this script's own home. */
(function () {
  'use strict';
  var BASE = new URL('./', document.currentScript.src);
  var u = function (p) { return new URL(p, BASE).href; };

  /* ---------- the public share payload for this page ---------- */
  function readManifest() {
    var fallback = {
      title: document.title || 'PROVADIA',
      text: 'Bitcoin is energy. PROVADIA is salt — the original currency. A living digital town on the web.',
      url: 'https://provadiacoin.com/',
      media: null
    };
    try {
      var el = document.getElementById('nexus-share-manifest');
      if (!el) return fallback;
      var m = JSON.parse(el.textContent || '{}');
      var url = String(m.url || fallback.url);
      /* origin allowlist: share payloads point at the two house origins only */
      if (!/^https:\/\/(provadiacoin\.com|onejobkits\.com)(\/|$)/.test(url)) url = fallback.url;
      return {
        title: String(m.title || fallback.title),
        text: String(m.text || fallback.text),
        url: url,
        media: m.media ? String(m.media) : null
      };
    } catch (e) { return fallback; }
  }
  var payload = readManifest();
  var enc = encodeURIComponent;

  /* ---------- the honest 14-platform matrix ---------- */
  function intentLinks() {
    var t = enc(payload.text + ' ' + payload.url), tu = enc(payload.url), tt = enc(payload.title);
    return [
      { name: 'X', href: 'https://twitter.com/intent/tweet?text=' + t },
      { name: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + tu },
      { name: 'LinkedIn', href: 'https://www.linkedin.com/sharing/share-offsite/?url=' + tu },
      { name: 'Reddit', href: 'https://www.reddit.com/submit?url=' + tu + '&title=' + tt },
      { name: 'WhatsApp', href: 'https://api.whatsapp.com/send?text=' + t },
      { name: 'Telegram', href: 'https://t.me/share/url?url=' + tu + '&text=' + enc(payload.text) },
      { name: 'Messenger', href: 'https://www.facebook.com/dialog/send?link=' + tu + '&redirect_uri=' + tu },
      { name: 'Email', href: 'mailto:?subject=' + tt + '&body=' + t },
      { name: 'Pinterest', href: 'https://pinterest.com/pin/create/button/?url=' + tu + '&description=' + enc(payload.text) + (payload.media ? '&media=' + enc(payload.media) : '') }
    ];
  }
  var DOWNLOAD_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Snapchat'];

  /* ---------- build the instrument ---------- */
  var root = document.createElement('div');
  root.className = 'nexus-root';
  root.innerHTML =
    '<div class="nexus-scrim" data-nexus-scrim></div>' +
    '<button type="button" class="nexus-sphere" data-nexus-sphere aria-label="Open PROVADIA Nexus — Share &amp; Connect" aria-expanded="false"></button>' +
    '<div class="nexus-orbit" data-nexus-orbit role="dialog" aria-label="The PROVADIA Nexus — six satellites"></div>';
  document.body.appendChild(root);

  var sphere = root.querySelector('[data-nexus-sphere]');
  var orbit = root.querySelector('[data-nexus-orbit]');
  var scrim = root.querySelector('[data-nexus-scrim]');
  var open = false;

  function sat(angle, radius, tag, title, body, inner) {
    var d = document.createElement('div');
    d.className = 'nexus-sat';
    /* position by direct trigonometry: offset from the orbit centre by
       radius px at the satellite's angle (0deg = due north, clockwise) */
    var rad = (angle - 90) * Math.PI / 180;
    d.style.setProperty('--dx', Math.round(Math.cos(rad) * radius) + 'px');
    d.style.setProperty('--dy', Math.round(Math.sin(rad) * radius) + 'px');
    d.innerHTML = '<span class="nexus-leader" aria-hidden="true"></span><span class="nexus-tip" aria-hidden="true"></span>' +
      '<p class="nexus-sat-tag">' + tag + '</p><h3 class="nexus-sat-title">' + title + '</h3>' +
      '<p class="nexus-sat-body">' + body + '</p>' + inner;
    return d;
  }

  function radius() {
    /* satellites alternate between a wide ring (odd satellites) and a
       tighter ring (even) so tall cards clear their neighbours; the value
       returned here is the WIDE ring. */
    var m = Math.min(window.innerWidth, window.innerHeight);
    return m < 560 ? 128 : 262;
  }
  var RING_RATIO = 0.80;

  function buildOrbit() {
    orbit.innerHTML = '';
    var r = radius();
    var core = document.createElement('button');
    core.type = 'button';
    core.className = 'nexus-core';
    core.innerHTML = '<span>Share<br>Current<br>Object</span>';
    core.setAttribute('aria-label', 'Close the Nexus');
    core.addEventListener('click', close);
    orbit.appendChild(core);

    var r2 = Math.round(r * RING_RATIO);
    /* 01 · Share This World */
    var shareInner = '<div class="nexus-share"><div class="nexus-share-grid" data-nexus-share></div>' +
      '<p class="nexus-share-note">Instagram, TikTok, YouTube and Snapchat offer no web share intent — for those, the Nexus hands you the media and the caption to post by your own hand.</p>' +
      '<p class="nexus-copied" data-nexus-copied aria-live="polite"></p></div>';
    orbit.appendChild(sat(0, r, '01 / 06 · Share This World', 'Share This World',
      'Contextual sharing for the exact world you are viewing right now. It packages verified links and purpose-made media so you can introduce others by your own hand.', shareInner));
    var grid = orbit.querySelector('[data-nexus-share]');
    var copied = orbit.querySelector('[data-nexus-copied]');
    function say(msg) { if (copied) copied.textContent = msg; }
    intentLinks().forEach(function (p) {
      var a = document.createElement('a');
      a.href = p.href; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = p.name;
      grid.appendChild(a);
    });
    if (navigator.share) {
      var nb = document.createElement('button');
      nb.type = 'button'; nb.textContent = 'Share Sheet';
      nb.addEventListener('click', function () {
        navigator.share({ title: payload.title, text: payload.text, url: payload.url }).catch(function () {});
      });
      grid.appendChild(nb);
    }
    DOWNLOAD_PLATFORMS.forEach(function (name) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = name + ' ↓';
      b.setAttribute('aria-label', 'Download the share media and copy the caption for ' + name);
      b.addEventListener('click', function () {
        if (payload.media) {
          var a = document.createElement('a');
          a.href = payload.media; a.download = '';
          document.body.appendChild(a); a.click(); a.remove();
        }
        copyText(payload.text + ' ' + payload.url, name + ': caption & link copied' + (payload.media ? ', media downloading.' : '.'));
      });
      grid.appendChild(b);
    });
    var cp = document.createElement('button');
    cp.type = 'button'; cp.textContent = 'Copy Link';
    cp.addEventListener('click', function () { copyText(payload.url, 'Link copied.'); });
    grid.appendChild(cp);

    function copyText(text, msg) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say(msg); }, function () { say('Copy failed — the link is in the address bar.'); });
      } else { say('Copy is not available here — the link is in the address bar.'); }
    }

    /* 02 · My PROVADIA */
    orbit.appendChild(sat(60, r2, '02 / 06 · My PROVADIA', 'My PROVADIA',
      'Your personal member sanctuary holding your Bricklayer citizenship, Genesis collectible status, and saved records — civic identity kept separate from your wallet and private from public share links.',
      '<a class="nexus-go" href="' + u('account/') + '">Enter My PROVADIA</a>'));

    /* 03 · Solnik — honestly OFF WATCH until the host reports live */
    var solnik = sat(120, r, '03 / 06 · Solnik', 'Solnik, Keeper of the Wall',
      'Direct road to Solnik for guided town navigation and the Book of Wants. He remains honestly off-watch until the founder\'s key steps bring the host service live.',
      '<span class="nexus-badge" data-nexus-solnik>Off Watch</span><a class="nexus-go ghost" href="' + u('record/') + '">His Chamber</a>');
    orbit.appendChild(solnik);
    fetch('https://api.provadiacoin.com/health', { cache: 'no-store' })
      .then(function (res) { return res.json(); })
      .then(function (h) {
        var badge = solnik.querySelector('[data-nexus-solnik]');
        if (badge && h && h.status === 'live') { badge.textContent = 'Host Live · Voice Waking'; }
      })
      .catch(function () { /* unreachable host: the OFF WATCH plate stands */ });

    /* 04 · The Agora */
    orbit.appendChild(sat(180, r2, '04 / 06 · The Agora', 'The Agora',
      'The town\'s public gathering dimension where verified Bricklayers post, debate, and crystallize decisions into the Record. Open to read anytime; posting unlocks with free town membership.',
      '<a class="nexus-go" href="' + u('agora/') + '">Enter the Forum</a>'));

    /* 05 · External Communities — real doors only */
    orbit.appendChild(sat(240, r, '05 / 06 · External Communities', 'External Communities',
      'The town\'s verified external gathering places on X and Discord, with Telegram held visibly sealed until opened by the founder. Only active, verified channels ever unlock here.',
      '<a class="nexus-go" href="https://x.com/ProvadiaCoin" target="_blank" rel="noopener">X · @ProvadiaCoin</a>' +
      '<a class="nexus-go" href="https://discord.gg/GUXuaauKb" target="_blank" rel="noopener">Discord</a>' +
      '<span class="nexus-sealed" aria-disabled="true" title="The town\'s Telegram is sealed by the founder\'s ruling. It opens only on his word.">Telegram · Sealed</span>'));

    /* 06 · Support & Human Escalation — the LIVE Agora support door.
       The captain's standing correction: an unreceipted mailbox address
       is never printed; support routes to the Support Desk in the Forum. */
    orbit.appendChild(sat(300, r2, '06 / 06 · Support', 'Support &amp; Human Escalation',
      'Direct written support and human escalation for account, service, or record inquiries — through the town\'s Support Desk in the Forum, answered on a standing watch by real people, without fake automated promises.',
      '<a class="nexus-go" href="' + u('agora/') + '">The Support Desk</a>'));
  }

  function openNexus() {
    if (open) return; open = true;
    buildOrbit();
    root.classList.add('open');
    sphere.setAttribute('aria-expanded', 'true');
  }
  function close() {
    if (!open) return; open = false;
    root.classList.remove('open');
    sphere.setAttribute('aria-expanded', 'false');
  }
  sphere.addEventListener('click', function () { open ? close() : openNexus(); });
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', function () { if (open) buildOrbit(); });
})();
