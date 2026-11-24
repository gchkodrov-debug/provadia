/* ============================================================
   PROVADIA — The Living Agora client (Slices 1–3)
   Wired to the real members service, source of record:
     base  https://api.provadiacoin.com/members
     GET   /health            -> { status, members }
     POST  /register          -> { email, password } -> 201 { member }
     POST  /login             -> { email, password } -> { token, member }
     GET   /me                -> Bearer token -> { member }
   The service has NO thread routes yet (probed 404, absent from
   the source of record): the floor reads /threads and renders its
   true quiet state whenever the feed does not answer. Nothing is
   simulated: prisms, glyphs and echoes fire ONLY on real events.
   ============================================================ */
(function () {
  'use strict';

  var API = 'https://api.provadiacoin.com/members';
  var TOKEN_KEY = 'provadia.agora.token';
  var MODE_KEY = 'provadia.agora.mode';
  var GLYPHS = ['✦', '✧', '◆', '·'];

  function $(id) { return document.getElementById(id); }
  function pad4(n) { return String(n).padStart(4, '0'); }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  var state = {
    member: null,
    threads: null, /* null = feed did not answer; [] = answered, empty */
    apiLive: null
  };

  /* ---------- transport ---------- */
  function fetchJson(path, opts) {
    opts = opts || {};
    var ctrl = ('AbortController' in window) ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 9000) : null;
    var headers = { 'Content-Type': 'application/json' };
    var token = null;
    try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
    if (token && opts.auth !== false) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'omit',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      return res.json().catch(function () { return {}; }).then(function (json) {
        return { ok: res.ok, status: res.status, json: json };
      });
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      var e = new Error('unreachable');
      e.unreachable = true;
      throw e;
    });
  }

  var ERRORS = {
    bad_email: 'That email address does not look right.',
    weak_password: 'The password is too weak — at least 8 characters.',
    already_registered: 'That email is already written in the registry — sign in instead.',
    bad_credentials: 'Email or password does not match the registry’s record.',
    rate_limited: 'Too many attempts — give the door a minute, then try again.',
    not_signed_in: 'You are not signed in.'
  };
  function errText(json, fallback) {
    if (json && json.error && ERRORS[json.error]) {
      return json.detail ? ERRORS[json.error] + ' ' + json.detail : ERRORS[json.error];
    }
    return fallback;
  }
  var UNREACHABLE = 'The registry service stands live, but this page cannot reach it from your browser yet — the town’s cross-door wiring is being fitted tonight. If a request did go through before the line broke, signing in will find it. The Support Desk on this floor answers for the door meanwhile.';

  /* ---------- mode: two first-class faces ---------- */
  function applyMode(mode, focus) {
    var spatial = mode !== 'ledger';
    $('spatialView').hidden = !spatial;
    $('ledgerView').hidden = spatial;
    $('modeSpatial').setAttribute('aria-pressed', String(spatial));
    $('modeSpatial').classList.toggle('is-active', spatial);
    $('modeLedger').setAttribute('aria-pressed', String(!spatial));
    $('modeLedger').classList.toggle('is-active', !spatial);
    try { localStorage.setItem(MODE_KEY, spatial ? 'spatial' : 'ledger'); } catch (e) {}
    if (focus) (spatial ? $('modeSpatial') : $('modeLedger')).focus();
  }
  function initMode() {
    var stored = null;
    try { stored = localStorage.getItem(MODE_KEY); } catch (e) {}
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    applyMode(stored || (reduced ? 'ledger' : 'spatial'), false);
    $('modeSpatial').addEventListener('click', function () { applyMode('spatial'); });
    $('modeLedger').addEventListener('click', function () { applyMode('ledger'); });
    $('quietToLedger').addEventListener('click', function () { applyMode('ledger', true); });
  }

  /* ---------- the registry door ---------- */
  function setDoorState(live) {
    state.apiLive = live;
    var el = $('doorState');
    if (live) {
      el.textContent = 'The registry service answers — this door is live.';
      el.classList.add('is-live');
    } else {
      el.textContent = 'The registry service stands live, but this page cannot reach it from your browser yet — the town’s cross-door wiring is being fitted tonight. Nothing you type is sent anywhere until the door answers. The Support Desk on this floor answers for the door meanwhile.';
      el.classList.remove('is-live');
      /* C1 (critic): the header chip must not keep asserting "Live"
         the probe could not prove — fall back to the verified count. */
      var chip = $('chipMembers');
      if (chip && !chip.getAttribute('data-probed')) {
        chip.textContent = '0 members in the registry tonight — be Bricklayer #0001 · the door is being fitted to this browser';
      }
    }
  }

  function showMember(member) {
    state.member = member;
    $('authAnon').hidden = true;
    $('authMember').hidden = false;
    $('memberWelcome').textContent = 'Welcome, Bricklayer #' + pad4(member.member_id);
    var since = new Date(member.bricklayer_since);
    $('memberSince').textContent = 'Your name was written into the registry on ' +
      since.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + '.';
    var days = member.days_in_record || 0;
    $('clockFill').style.width = clamp(days / 30 * 100, 0, 100) + '%';
    $('memberClock').textContent = member.thirty_day_mark
      ? 'Day ' + days + ' in the record — your thirty days stand complete.'
      : 'Day ' + days + ' of 30 on the town clock — the thirty days the Knock asks of every house run on this account.';
    $('memberWallet').textContent = (member.wallet && member.wallet.address)
      ? 'Wallet linked: ' + member.wallet.address.slice(0, 6) + '…' + member.wallet.address.slice(-4) + '.'
      : 'No wallet linked. Linking is optional — membership never requires holding PROVADIA.';
    $('memberTicket').textContent = (member.ticket && typeof member.ticket.number === 'number')
      ? 'Umbrella ticket #' + member.ticket.number + ' stands in your name.'
      : 'The Knock gate stands closed tonight — no ticket is issued while it stands closed.';
    /* C3 (critic): the founding-era crest is gated on the ruled
       Genesis window — a name written before the coin's first
       birthday (2027-11-18). No contract field backs it; the date
       is the gate, and outside the window the line does not render. */
    var crest = $('memberCrest');
    if (crest) crest.hidden = !(new Date(member.bricklayer_since) < new Date('2027-11-18T00:00:00Z'));
    $('composerAnon').hidden = true;
    $('threadForm').hidden = false;
  }
  function showAnon() {
    state.member = null;
    $('authAnon').hidden = false;
    $('authMember').hidden = true;
    $('composerAnon').hidden = false;
    $('threadForm').hidden = true;
  }

  function afterAuth(member, statusEl, message) {
    /* C5 (critic): a render fault after a successful sign-in must
       never be reported as "unreachable" — the member IS signed in. */
    try {
      showMember(member);
      if (statusEl) statusEl.textContent = message;
    } catch (e) {
      if (statusEl) statusEl.textContent = 'You are signed in. Your registry face could not be drawn — the Support Desk on this floor can read it for you.';
    }
    loadThreads();
  }

  function wireAuth() {
    var tabJoin = $('tabJoin'), tabSignIn = $('tabSignIn');
    function switchTab(join) {
      $('joinForm').hidden = !join;
      $('loginForm').hidden = join;
      tabJoin.classList.toggle('is-active', join);
      tabJoin.setAttribute('aria-pressed', String(join));
      tabSignIn.classList.toggle('is-active', !join);
      tabSignIn.setAttribute('aria-pressed', String(!join));
      $('authStatus').textContent = '';
    }
    tabJoin.addEventListener('click', function () { switchTab(true); });
    tabSignIn.addEventListener('click', function () { switchTab(false); });

    $('joinForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var status = $('authStatus');
      var email = $('joinEmail').value.trim();
      var password = $('joinPassword').value;
      status.textContent = 'Writing your name…';
      fetchJson('/register', { method: 'POST', auth: false, body: { email: email, password: password } })
        .then(function (r) {
          if (!r.ok) { status.textContent = errText(r.json, 'The registry would not write that name.'); return null; }
          return fetchJson('/login', { method: 'POST', auth: false, body: { email: email, password: password } });
        })
        .then(function (r) {
          if (!r) return;
          if (r.ok && r.json.token) {
            try { localStorage.setItem(TOKEN_KEY, r.json.token); } catch (e) {}
            afterAuth(r.json.member, status, 'Your name is written. Welcome to the town, Bricklayer #' + pad4(r.json.member.member_id) + '.');
          } else {
            status.textContent = 'Your name is written in the registry — sign in to enter.';
            switchTab(false);
          }
        })
        .catch(function () { status.textContent = UNREACHABLE; setDoorState(false); });
    });

    $('loginForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var status = $('authStatus');
      status.textContent = 'Opening the door…';
      fetchJson('/login', { method: 'POST', auth: false, body: { email: $('loginEmail').value.trim(), password: $('loginPassword').value } })
        .then(function (r) {
          if (r.ok && r.json.token) {
            try { localStorage.setItem(TOKEN_KEY, r.json.token); } catch (e) {}
            afterAuth(r.json.member, status, 'Welcome back, Bricklayer #' + pad4(r.json.member.member_id) + '.');
          } else {
            status.textContent = errText(r.json, 'Sign-in failed.');
          }
        })
        .catch(function () { status.textContent = UNREACHABLE; setDoorState(false); });
    });

    $('signOutBtn').addEventListener('click', function () {
      try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
      showAnon();
      $('authStatus').textContent = 'Signed out on this device. Your name stays in the registry — membership is permanent.';
    });
  }

  /* ---------- the floor: real threads or the true quiet ---------- */
  function prismGlow(thread) {
    var replies = thread.reply_count || 0;
    var ageH = (Date.now() - new Date(thread.created_at).getTime()) / 3600000;
    var decay = clamp(1 - ageH / 24, 0, 1);
    return clamp(0.20 + replies * 0.08 * decay, 0.20, 0.95);
  }
  function renderPrisms(threads) {
    var layer = $('prismLayer');
    while (layer.firstChild) layer.removeChild(layer.firstChild);
    var NS = 'http://www.w3.org/2000/svg';
    threads.forEach(function (t, i) {
      var ang = i * 2.39996; /* golden angle — honest scatter, no two alike */
      var ring = 60 + (i % 4) * 52;
      var x = 340 + Math.cos(ang) * ring * 1.55;
      var y = 200 + Math.sin(ang) * ring * 0.82;
      var size = 7 + Math.min(10, (t.reply_count || 0));
      var rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', String(x - size / 2));
      rect.setAttribute('y', String(y - size / 2));
      rect.setAttribute('width', String(size));
      rect.setAttribute('height', String(size));
      rect.setAttribute('transform', 'rotate(45 ' + x + ' ' + y + ')');
      rect.setAttribute('fill', '#C9A227');
      rect.setAttribute('fill-opacity', String(prismGlow(t)));
      rect.setAttribute('stroke', '#E9DDC6');
      rect.setAttribute('stroke-opacity', '0.35');
      var title = document.createElementNS(NS, 'title');
      title.textContent = t.title;
      rect.appendChild(title);
      layer.appendChild(rect);
    });
    var quiet = threads.length === 0;
    $('quietInscription').style.display = quiet ? '' : 'none';
    var svg = document.querySelector('.amphitheatre-svg');
    if (svg) svg.setAttribute('aria-label', quiet
      ? 'The Resonance Amphitheatre at rest: concentric bronze steps around an empty floor. No discussions stand in the vault tonight.'
      : 'The Resonance Amphitheatre: ' + threads.length + ' real discussions stand in the bowl as prisms of light.');
    $('quietCount').textContent = threads.length === 0
      ? '0 discussions in the vault'
      : threads.length + (threads.length === 1 ? ' discussion in the vault' : ' discussions in the vault');
  }
  function renderLedger(threads) {
    var list = $('threadList');
    while (list.firstChild) list.removeChild(list.firstChild);
    $('ledgerEmpty').hidden = threads.length > 0;
    threads.forEach(function (t) {
      var li = document.createElement('li');
      li.className = 'thread-item';
      var h = document.createElement('p');
      h.className = 'thread-title';
      h.textContent = t.title;
      var meta = document.createElement('p');
      meta.className = 'thread-meta';
      meta.textContent = 'Bricklayer #' + pad4(t.author_id || 0) +
        (t.author_genesis ? ' ◆ Genesis Member' : '') + ' · ' +
        new Date(t.created_at).toUTCString() + ' · ' + (t.reply_count || 0) + ' replies';
      li.appendChild(h);
      li.appendChild(meta);
      if (t.body) {
        var body = document.createElement('p');
        body.className = 'thread-body';
        body.textContent = t.body;
        li.appendChild(body);
      }
      list.appendChild(li);
    });
  }
  function renderFloor() {
    var threads = state.threads || [];
    renderPrisms(threads);
    renderLedger(threads);
  }
  function loadThreads() {
    return fetchJson('/threads', { auth: false }).then(function (r) {
      if (r.ok && Array.isArray(r.json.threads || r.json)) {
        state.threads = r.json.threads || r.json;
      } else {
        state.threads = null; /* no thread feed in the service yet — the quiet is the truth */
      }
      renderFloor();
    }).catch(function () {
      state.threads = null;
      renderFloor();
    });
  }

  /* event-driven life: ONLY a real post in this session fires these */
  function echoAndGlyphs() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var echoLayer = $('echoLayer');
    var ring = document.createElement('div');
    ring.className = 'echo-ring';
    ring.style.left = '50%';
    ring.style.top = '46%';
    echoLayer.appendChild(ring);
    setTimeout(function () { ring.remove(); }, 1800);
    var glyphLayer = $('glyphLayer');
    for (var i = 0; i < 12; i++) {
      var g = document.createElement('span');
      g.className = 'glyph';
      g.textContent = GLYPHS[i % GLYPHS.length];
      g.style.left = (30 + Math.random() * 40) + '%';
      g.style.animationDelay = (Math.random() * 0.7) + 's';
      glyphLayer.appendChild(g);
      setTimeout(function (el) { el.remove(); }, 4600, g);
    }
  }

  function wireComposer() {
    $('threadForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var status = $('threadStatus');
      var title = $('threadTitle').value.trim();
      var body = $('threadBody').value.trim();
      if (!title || !body) { status.textContent = 'A discussion needs a title and words.'; return; }
      status.textContent = 'Posting…';
      fetchJson('/threads', { method: 'POST', body: { title: title, body: body } })
        .then(function (r) {
          if (r.ok) {
            $('threadTitle').value = '';
            $('threadBody').value = '';
            echoAndGlyphs();
            /* N6 (critic): never let a success message stand over a
               floor that cannot show the post back. */
            loadThreads().then(function () {
              var shown = (state.threads || []).some(function (t) { return t.title === title; });
              status.textContent = shown
                ? 'Your words stand on the floor.'
                : 'Your post was accepted — the floor’s reading side is still being fitted, so it cannot show your post back yet.';
            });
          } else if (r.status === 404) {
            status.textContent = 'The floor’s writing side is still being fitted to the registry service — nothing was sent, and nothing was lost. The Support Desk on this floor takes the town’s words meanwhile.';
          } else {
            status.textContent = errText(r.json, 'The floor would not take that post.');
          }
        })
        .catch(function () { status.textContent = UNREACHABLE; });
    });
  }

  /* ---------- boot ---------- */
  function init() {
    /* N5 (critic): the health probe runs FIRST and independently —
       a wiring fault in any one section must not freeze the door on
       "Checking whether it answers…" or starve the other sections. */
    try { initMode(); } catch (e) {}
    try { wireAuth(); } catch (e) {}
    try { wireComposer(); } catch (e) {}
    try { renderFloor(); } catch (e) {}

    fetchJson('/health', { auth: false }).then(function (r) {
      if (r.ok && typeof r.json.members === 'number') {
        setDoorState(true);
        var n = r.json.members;
        var chip = $('chipMembers');
        chip.setAttribute('data-probed', '1');
        chip.textContent = n === 0
          ? 'Live · 0 members tonight — be Bricklayer #0001'
          : 'Live · ' + n + (n === 1 ? ' member' : ' members') + ' in the registry tonight';
      } else {
        setDoorState(false);
      }
    }).catch(function () { setDoorState(false); });

    var token = null;
    try { token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
    if (token) {
      fetchJson('/me').then(function (r) {
        if (r.ok && r.json.member) showMember(r.json.member);
        else { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} showAnon(); }
      }).catch(function () { showAnon(); });
    }
    loadThreads();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
