/* PROVADIA — THE PULSE · data engine + functional chart + dock + specimen inspector.
   pulse-coin-world-v1, Slices 1–3 (shell + data). Feeds: GeckoTerminal pool API
   (summary + OHLCV) and Solana JSON-RPC reads (pool signatures, wallet token
   accounts) — the same reads the spec assigns to the house RPC endpoint.
   Zero signing methods are ever requested: connect() is the read-only
   address reveal handled by the page's own wallet button; this file only
   observes it and reads balances. */
(function () {
  "use strict";

  var POOL = "2fvtfwCco71J8XePws7yREZ3569U2GxU4FYHE2H8oxDY";
  var MINT = "9UE6NStA9pRZ5xagrK1FNy3vybmQVL2VaKB7BNpvpump";
  var GT_POOL = "https://api.geckoterminal.com/api/v2/networks/solana/pools/" + POOL;
  var RPC = "https://api.mainnet-beta.solana.com";
  var CACHE_KEY = "provadia_pulse_cache_v1";
  var TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
  var TOKEN2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

  var TF = {
    "15M": { path: "minute", agg: 15 },
    "1H": { path: "hour", agg: 1 },
    "4H": { path: "hour", agg: 4 },
    "1D": { path: "day", agg: 1 }
  };
  var currentTF = "1H";

  var data = {
    pool: null,            // raw GeckoTerminal pool attributes
    ohlcvByTf: {},         // tf -> [{time,open,high,low,close,volume}]
    latestSig: null,
    latestSwapAt: 0,       // unix seconds of newest pool signature
    fetchedAt: 0,          // ms epoch of last fully successful cycle
    errors: 0              // consecutive failed cycles
  };
  var displayedState = "BOOT";   // BOOT | LIVE | QUIET | DELAYED
  var backoffMs = 15000;
  var timer = null;
  var inFlight = false;          // single-flight: cycles never overlap
  var ohlcvErrors = 0;           // consecutive candle-leg failures (chart's own staleness)
  var chart = null, series = null, chartTf = null;

  /* ---------------- formatting (house style, matches the page) ---------------- */
  function fmtMoney(v) {
    var n = Number(v);
    if (!isFinite(n)) return "—";
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  var SUBS = "₀₁₂₃₄₅₆₇₈₉";
  function subNum(n) { return String(n).split("").map(function (d) { return SUBS[+d]; }).join(""); }
  function fmtSmall(v, prefix, suffix) {
    var n = Number(v);
    if (!isFinite(n) || n <= 0) return "—";
    if (n >= 0.01) return prefix + n.toFixed(4) + suffix;
    if (n >= 1) return prefix + n.toLocaleString("en-US", { maximumFractionDigits: 4 }) + suffix;
    var s = n.toFixed(20), m = s.match(/^0\.0*/), zeros = m[0].length - 2;
    var digits = s.slice(m[0].length).slice(0, 4);
    return prefix + "0.0" + subNum(zeros) + digits + suffix;
  }
  function fmtPrice(v) { return fmtSmall(v, "$", ""); }
  function fmtSol(v) { return fmtSmall(v, "", " SOL"); }
  function fmtChange(v) {
    var n = Number(v);
    if (!isFinite(n)) return "—";
    var arrow = n > 0 ? "▲ " : (n < 0 ? "▼ " : "");
    return arrow + (n > 0 ? "+" : "") + n.toFixed(2) + "%";
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  }
  function hhmmUtc(ms) {
    var d = new Date(ms);
    function p(x) { return (x < 10 ? "0" : "") + x; }
    return p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + " UTC";
  }
  function $(sel) { return document.querySelector(sel); }
  function setText(sel, text) { var el = $(sel); if (el) el.textContent = text; }

  /* ---------------- cache ---------------- */
  function saveCache() {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        pool: data.pool,
        ohlcvByTf: data.ohlcvByTf,
        latestSig: data.latestSig,
        latestBlockTimeUtc: data.latestSwapAt,
        fetchedAtUtc: data.fetchedAt
      }));
    } catch (e) { /* private mode — the page simply fetches fresh */ }
  }
  function loadCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      var c = JSON.parse(raw);
      if (!c || !c.pool) return false;
      data.pool = c.pool;
      data.ohlcvByTf = c.ohlcvByTf || {};
      data.latestSig = c.latestSig || null;
      data.latestSwapAt = c.latestBlockTimeUtc || 0;
      data.fetchedAt = c.fetchedAtUtc || 0;
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- rendering: numbers tiles + telemetry ---------------- */
  function renderNumbers() {
    var a = data.pool;
    if (!a) return;
    function setStat(name, text) {
      var el = document.querySelector('[data-stat="' + name + '"]');
      if (el) el.textContent = text;
    }
    setStat("price", fmtPrice(a.base_token_price_usd));
    setStat("change", fmtChange(a.price_change_percentage && a.price_change_percentage.h24));
    setStat("fdv", fmtMoney(a.fdv_usd));
    setStat("liquidity", fmtMoney(a.reserve_in_usd));
    setStat("volume", fmtMoney(a.volume_usd && a.volume_usd.h24));
    setStat("created", fmtDate(a.pool_created_at));
    setText('[data-pulse="price-usd"]', fmtPrice(a.base_token_price_usd));
    setText('[data-pulse="price-sol"]', fmtSol(a.base_token_price_native_currency));
    setText('[data-pulse="volume"]', fmtMoney(a.volume_usd && a.volume_usd.h24));
    setText('[data-pulse="liquidity"]', fmtMoney(a.reserve_in_usd));
    var t = $("[data-stats-time]");
    if (t && data.fetchedAt) {
      var d = new Date(data.fetchedAt);
      t.textContent = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) + " · " +
        d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      t.setAttribute("datetime", d.toISOString());
    }
    var st = $("[data-stats-status]");
    if (st && data.fetchedAt && st.childNodes[0]) st.childNodes[0].textContent = "Last updated ";
  }
  function failNumbers() {
    if (data.pool) return; // verified figures stand; never blank them on a hiccup
    ["price", "change", "fdv", "liquidity", "volume", "created"].forEach(function (k) {
      var el = document.querySelector('[data-stat="' + k + '"]');
      if (el) el.textContent = "—";
    });
    var st = $("[data-stats-status]");
    if (st) st.textContent = "Temporarily unavailable — the source could not be reached; nothing here is guessed.";
  }

  /* ---------------- the honest state machine ---------------- */
  function swapsIn15() {
    var a = data.pool, t = a && a.transactions && a.transactions.m15;
    if (!t) return 0;
    return (Number(t.buys) || 0) + (Number(t.sells) || 0);
  }
  function computeState() {
    if (!data.fetchedAt) return data.errors >= 2 ? "DELAYED" : "BOOT";
    var age = Date.now() - data.fetchedAt;
    if (age >= 120000 || data.errors >= 2) return "DELAYED";
    var recentSwap = data.latestSwapAt && (Date.now() - data.latestSwapAt * 1000) <= 900000;
    if (age < 60000) {
      return (recentSwap || swapsIn15() > 0) ? "LIVE" : "QUIET";
    }
    // 60–119s: the prior LIVE/QUIET badge holds while the retry runs;
    // at boot (no prior badge) the same swap test decides, truthfully.
    return (displayedState === "LIVE" || displayedState === "QUIET") ? displayedState
      : ((recentSwap || swapsIn15() > 0) ? "LIVE" : "QUIET");
  }
  function lastSwapLabel() {
    if (!data.latestSwapAt) return swapsIn15() > 0 ? "within the past 15 minutes" : "—";
    var mins = Math.max(0, Math.round((Date.now() - data.latestSwapAt * 1000) / 60000));
    if (mins < 1) return "under a minute ago";
    if (mins === 1) return "1m ago";
    if (mins < 60) return mins + "m ago";
    var h = Math.floor(mins / 60);
    return h + "h " + (mins % 60) + "m ago";
  }
  function updatedLabel() {
    if (!data.fetchedAt) return "—";
    var s = Math.max(0, Math.round((Date.now() - data.fetchedAt) / 1000));
    return s + "s ago";
  }
  function renderPill() {
    var next = computeState();
    var changed = next !== displayedState;
    displayedState = next;
    var pill = $("[data-pulse-pill]");
    if (!pill) return;
    pill.setAttribute("data-state", next);
    var badge = "", line = "";
    if (next === "LIVE") {
      badge = "● LIVE · POOL VERIFIED";
      line = "Feeds active · Last swap " + lastSwapLabel() + " · Updated " + updatedLabel();
    } else if (next === "QUIET") {
      badge = "◐ QUIET MARKET · FEEDS CONNECTED";
      line = "No swaps in the past 15 minutes — showing last verified pool state · Updated " + updatedLabel();
    } else if (next === "DELAYED") {
      badge = "○ DATA DELAYED · RECONNECTING";
      line = data.fetchedAt
        ? "Live feed interrupted — showing last verified snapshot from " + hhmmUtc(data.fetchedAt) + " · Retrying automatically"
        : "Live feed interrupted — no verified snapshot yet · Retrying automatically";
    } else {
      badge = "○ READING THE POOL · FIRST CONTACT";
      line = "Reading the pool's public record…";
    }
    setText("[data-pill-badge]", badge);
    setText("[data-pill-line]", line);
    var chartStale = next === "DELAYED" || ohlcvErrors >= 2;
    var chartBox = $("[data-chart-box]");
    if (chartBox) chartBox.classList.toggle("is-snapshot", chartStale);
    var snap = $("[data-snapshot-tag]");
    if (snap) snap.hidden = !(chartStale && data.fetchedAt > 0); // a tag only makes sense over a real snapshot
    if (changed) {
      try { window.dispatchEvent(new CustomEvent("pulse:state", { detail: { state: next } })); } catch (e) {}
    }
  }

  /* ---------------- the functional chart (Lightweight Charts) ---------------- */
  function candleRows(tf) { return data.ohlcvByTf[tf] || []; }
  function buildSrTable(rows) {
    var host = $("[data-sr-table]");
    if (!host) return;
    var last = rows.slice(-12).reverse();
    var html = '<table class="sr-only"><caption>Latest PROVADIA / SOL pool candles, ' + currentTF +
      ' timeframe, from the pool\u2019s public record. Times in UTC.</caption>' +
      "<thead><tr><th>Time (UTC)</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume (USD)</th></tr></thead><tbody>";
    last.forEach(function (c) {
      var d = new Date(c.time * 1000);
      html += "<tr><td>" + d.toISOString().replace("T", " ").slice(0, 16) + "</td><td>" + c.open +
        "</td><td>" + c.high + "</td><td>" + c.low + "</td><td>" + c.close + "</td><td>" + c.volume + "</td></tr>";
    });
    html += "</tbody></table>";
    host.innerHTML = html;
  }
  function renderReadout(c) {
    var el = $("[data-chart-readout]");
    if (!el) return;
    if (!c) { el.textContent = "Crosshair readout — move across the candles."; return; }
    var pct = c.open ? ((c.close - c.open) / c.open) * 100 : 0;
    el.textContent = "O " + fmtPrice(c.open) + " · H " + fmtPrice(c.high) + " · L " + fmtPrice(c.low) +
      " · C " + fmtPrice(c.close) + " · " + (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%";
  }
  function initChart() {
    var box = $("[data-chart-box]");
    if (!box || !window.LightweightCharts || chart) return;
    chart = window.LightweightCharts.createChart(box, {
      width: box.clientWidth, height: box.clientHeight,
      attributionLogo: false, // sovereign instrument — the library is credited in the build record (Apache-2.0)
      layout: {
        background: { type: "solid", color: "#141210" },
        textColor: "#E9DDC6",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 11
      },
      grid: {
        vertLines: { color: "rgba(201,162,39,0.08)" },
        horzLines: { color: "rgba(201,162,39,0.08)" }
      },
      rightPriceScale: { borderColor: "rgba(201,162,39,0.35)" },
      timeScale: { borderColor: "rgba(201,162,39,0.35)", timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: "rgba(228,198,91,0.5)", labelBackgroundColor: "#30251B" },
        horzLine: { color: "rgba(228,198,91,0.5)", labelBackgroundColor: "#30251B" }
      }
    });
    series = chart.addCandlestickSeries({
      upColor: "#C9A227", downColor: "#30251B",
      borderUpColor: "#C9A227", borderDownColor: "#6B4A12", borderVisible: true,
      wickUpColor: "#C9A227", wickDownColor: "#6B4A12",
      priceFormat: { type: "price", precision: 10, minMove: 0.0000000001 }
    });
    chart.subscribeCrosshairMove(function (param) {
      if (!param || !param.time || !series) { renderReadout(null); return; }
      var d = param.seriesData.get(series);
      renderReadout(d || null);
    });
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (chart && box.clientWidth > 0) chart.applyOptions({ width: box.clientWidth, height: box.clientHeight });
      }).observe(box);
    }
    paintChart();
  }
  function paintChart() {
    var rows = candleRows(currentTF);
    buildSrTable(rows);
    if (!series) return;
    series.setData(rows.map(function (c) {
      return { time: c.time, open: c.open, high: c.high, low: c.low, close: c.close };
    }));
    chartTf = currentTF;
    if (chart && rows.length) chart.timeScale().fitContent();
    if (rows.length) renderReadout(rows[rows.length - 1]);
    try { window.dispatchEvent(new CustomEvent("pulse:candles", { detail: { tf: currentTF, rows: rows } })); } catch (e) {}
  }

  /* ---------------- fetching ---------------- */
  function getJson(url) {
    return fetch(url, { headers: { "Accept": "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    });
  }
  function rpc(method, params) {
    return fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: method, params: params })
    }).then(function (r) {
      if (!r.ok) throw new Error("rpc http " + r.status);
      return r.json();
    }).then(function (j) {
      if (j.error) throw new Error("rpc error");
      return j.result;
    });
  }
  function fetchOhlcv(tf) {
    var spec = TF[tf];
    var url = GT_POOL + "/ohlcv/" + spec.path + "?aggregate=" + spec.agg + "&limit=60";
    return getJson(url).then(function (j) {
      var list = j && j.data && j.data.attributes && j.data.attributes.ohlcv_list;
      if (!list) throw new Error("no ohlcv");
      var rows = list.map(function (r) {
        return { time: r[0], open: r[1], high: r[2], low: r[3], close: r[4], volume: r[5] };
      }).sort(function (a, b) { return a.time - b.time; });
      // de-duplicate timestamps (Lightweight Charts rejects duplicates)
      data.ohlcvByTf[tf] = rows.filter(function (c, i) { return i === 0 || c.time !== rows[i - 1].time; });
    });
  }
  function fetchSwapSize(sig) {
    return rpc("getTransaction", [sig, { maxSupportedTransactionVersion: 0, encoding: "jsonParsed" }])
      .then(function (tx) {
        if (!tx || !tx.meta || !tx.transaction) return 0;
        var keys = tx.transaction.message.accountKeys || [];
        var idx = -1;
        keys.forEach(function (k, i) { if ((k.pubkey || k) === POOL) idx = i; });
        if (idx < 0) return 0;
        var delta = Math.abs((tx.meta.postBalances[idx] || 0) - (tx.meta.preBalances[idx] || 0));
        return delta / 1e9;
      }).catch(function () { return 0; });
  }
  function fetchCycle() {
    if (inFlight) return Promise.resolve(false);
    inFlight = true;
    var poolP = getJson(GT_POOL).then(function (j) {
      var a = j && j.data && j.data.attributes;
      if (!a) throw new Error("no pool");
      data.pool = a;
    });
    var sigP = rpc("getSignaturesForAddress", [POOL, { limit: 10 }]).then(function (sigs) {
      if (!sigs || !sigs.length) return;
      var newest = sigs[0];
      var prevSig = data.latestSig;
      data.latestSig = newest.signature;
      if (newest.blockTime) data.latestSwapAt = newest.blockTime;
      if (prevSig && prevSig !== newest.signature && newest.blockTime) {
        fetchSwapSize(newest.signature).then(function (sol) {
          try {
            window.dispatchEvent(new CustomEvent("pulse:swap", {
              detail: { signature: newest.signature, blockTime: newest.blockTime, sol: sol }
            }));
          } catch (e) {}
        });
      }
    }).catch(function () { /* signatures are corroboration; the pool read governs */ });
    var ohlcvP = fetchOhlcv(currentTF).then(function () { ohlcvErrors = 0; }, function () {
      ohlcvErrors += 1; // the chart leg keeps its own staleness count — it dims itself, honestly
    });
    return Promise.all([poolP, sigP, ohlcvP]).then(function () {
      inFlight = false;
      data.fetchedAt = Date.now();
      data.errors = 0;
      backoffMs = 15000;
      saveCache();
      renderNumbers();
      paintChart();
      renderPill();
      return true;
    }).catch(function () {
      inFlight = false;
      data.errors += 1;
      // spec §2B sequence: the wait after error n is 15s, 30s, 60s, 120s (max).
      backoffMs = Math.min(15000 * Math.pow(2, data.errors - 1), 120000);
      failNumbers();
      renderPill();
      return false;
    });
  }
  function scheduleNext() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (document.visibilityState === "visible") {
        fetchCycle().then(scheduleNext);
      } else {
        scheduleNext(); // stay on cadence; the visibility handler refreshes on return
      }
    }, backoffMs);
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      clearTimeout(timer);
      fetchCycle().then(scheduleNext);
    }
  });

  /* ---------------- mode toggle ---------------- */
  function setMode(mode) {
    var chartBtn = $("[data-mode-btn='chart']"), obsBtn = $("[data-mode-btn='observatory']");
    var chartPane = $("[data-pane='chart']"), obsPane = $("[data-pane='observatory']");
    if (chartBtn) chartBtn.setAttribute("aria-pressed", mode === "chart" ? "true" : "false");
    if (obsBtn) obsBtn.setAttribute("aria-pressed", mode === "observatory" ? "true" : "false");
    if (chartPane) chartPane.hidden = mode !== "chart";
    if (obsPane) obsPane.hidden = mode !== "observatory";
    if (mode === "chart") initChart();
    if (mode === "observatory" && window.Pulse3D && window.Pulse3D.open) window.Pulse3D.open();
    if (mode === "chart" && window.Pulse3D && window.Pulse3D.close) window.Pulse3D.close();
    try { window.dispatchEvent(new CustomEvent("pulse:mode", { detail: { mode: mode } })); } catch (e) {}
  }

  /* ---------------- specimen inspector ---------------- */
  function inspectSerial(n) {
    var out = $("[data-inspect-out]");
    if (!n || n < 1 || n > 470) {
      if (out) out.textContent = "Enter a number from 1 to 470 to inspect a specimen slot.";
      return;
    }
    var padded = ("000" + n).slice(-4);
    if (out) {
      out.textContent = "GENESIS #" + padded + " / 470 · UNMINTED SPECIMEN — lights permanently only when its real " +
        "Metaplex Core NFT is minted on-chain; carries zero gold redemption, yield, or extra voting rights.";
    }
    try { window.dispatchEvent(new CustomEvent("pulse:inspect", { detail: { serial: n } })); } catch (e) {}
  }

  /* ---------------- wallet: observe + read-only balance ---------------- */
  function getProvider() {
    if (window.phantom && window.phantom.solana && window.phantom.solana.isPhantom) return window.phantom.solana;
    if (window.solana && window.solana.isPhantom) return window.solana;
    if (window.solflare && window.solflare.isSolflare) return window.solflare;
    if (window.solana) return window.solana;
    return null;
  }
  function shortKey(k) { return k.slice(0, 4) + "…" + k.slice(-4); }
  function fetchBalance(owner) {
    function one(program) {
      return rpc("getTokenAccountsByOwner", [owner, { programId: program, mint: MINT }, { encoding: "jsonParsed" }])
        .then(function (res) {
          var sum = 0;
          (res.value || []).forEach(function (acc) {
            var amt = acc.account.data.parsed.info.tokenAmount;
            sum += Number(amt.uiAmount || 0);
          });
          return sum;
        }).catch(function () { return 0; });
    }
    return Promise.all([one(TOKEN_PROGRAM), one(TOKEN2022_PROGRAM)]).then(function (parts) {
      return parts[0] + parts[1];
    });
  }
  function renderDock(key, balance) {
    var btn = $("[data-dock-connect]"), note = $("[data-dock-note]");
    if (!btn) return;
    if (key) {
      btn.textContent = "Connected · " + shortKey(key);
      if (note) {
        note.textContent = balance === null
          ? "Wallet " + shortKey(key) + " · reading your PROVADIA balance…"
          : "Wallet " + shortKey(key) + " · PROVADIA balance: " +
            balance.toLocaleString("en-US", { maximumFractionDigits: 2 }) +
            " · Genesis collectibles held: 0 / 470 (mainnet sealed)";
      }
    } else {
      btn.textContent = "Connect Wallet";
      if (note) note.textContent = "Read-only — this page never asks you to sign anything.";
    }
  }
  function bindWallet() {
    var arrivalBtn = $("[data-wallet-connect]");
    var dockBtn = $("[data-dock-connect]");
    if (dockBtn && arrivalBtn) {
      dockBtn.addEventListener("click", function () { arrivalBtn.click(); });
    }
    var p = getProvider();
    if (!p || !p.on) return;
    function onKey(pk) {
      var key = pk ? pk.toString() : (p.publicKey ? p.publicKey.toString() : null);
      if (!key) { renderDock(null, null); return; }
      renderDock(key, null);
      fetchBalance(key).then(function (bal) { renderDock(key, bal); });
    }
    p.on("connect", onKey);
    p.on("accountChanged", onKey);
    p.on("disconnect", function () { renderDock(null, null); });
    if (p.publicKey) onKey(p.publicKey);
  }

  /* ---------------- entrance film slot (pulse-entrance-v1 lands here) ---------------- */
  window.PulseEntrance = {
    /* The captain's Flow film mounts into [data-entrance-slot] when it lands;
       the slot stays hidden and the observatory works without it. */
    mount: function (node) {
      var slot = $("[data-entrance-slot]");
      if (!slot || !node) return false;
      slot.appendChild(node);
      slot.hidden = false;
      return true;
    }
  };

  /* ---------------- probe handle (read-only) ---------------- */
  window.__PULSE__ = {
    version: "pulse-s123-1",
    get state() { return displayedState; },
    get fetchedAt() { return data.fetchedAt; },
    get latestSwapAt() { return data.latestSwapAt; },
    get tf() { return currentTF; }
  };

  /* ---------------- boot ---------------- */
  function boot() {
    if (loadCache()) {
      renderNumbers();
      if (candleRows(currentTF).length) { initChart(); }
      renderPill();
    }
    var chartBtn = $("[data-mode-btn='chart']"), obsBtn = $("[data-mode-btn='observatory']");
    if (chartBtn) chartBtn.addEventListener("click", function () { setMode("chart"); });
    if (obsBtn) obsBtn.addEventListener("click", function () { setMode("observatory"); });
    document.querySelectorAll("[data-tf-btn]").forEach(function (b) {
      b.addEventListener("click", function () {
        var tf = b.getAttribute("data-tf-btn");
        if (!TF[tf] || tf === currentTF) return;
        currentTF = tf;
        document.querySelectorAll("[data-tf-btn]").forEach(function (x) {
          x.setAttribute("aria-pressed", x === b ? "true" : "false");
        });
        if (candleRows(tf).length) { paintChart(); renderPill(); }
        fetchOhlcv(tf).then(function () { ohlcvErrors = 0; paintChart(); saveCache(); renderPill(); })
          .catch(function () { ohlcvErrors += 1; renderPill(); });
      });
    });
    var form = $("[data-inspect-form]");
    if (form) {
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var input = $("[data-inspect-input]");
        inspectSerial(parseInt(input && input.value, 10));
      });
    }
    document.querySelectorAll("[data-inspect-chip]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var n = parseInt(chip.getAttribute("data-inspect-chip"), 10);
        var input = $("[data-inspect-input]");
        if (input) input.value = n;
        inspectSerial(n);
      });
    });
    initChart();
    bindWallet();
    renderPill();
    setInterval(renderPill, 1000); // the UPDATED Xs AGO counter + state aging
    fetchCycle().then(scheduleNext);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
