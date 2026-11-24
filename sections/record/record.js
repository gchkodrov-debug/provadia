// PROVADIA — RECORD & MARKET layer (browser module)
// Three jobs, all receipted:
//  1. PRICE FACE — live figures from Dexscreener only; renders ONLY fields
//     the response actually carries. No placeholder numbers, ever.
//  2. VERIFIER — fetches daybook.json, recomputes every hash with
//     crypto.subtle in the visitor's own browser, renders the verdict.
//  3. ANCHOR DISPLAY — shows today's root + the exact Solana Memo payload.
//     No tx hash or signature is ever shown unless one exists. None does yet.
//  4. THE THREE VAULTS — Vault I is this contract itself (its tithe book:
//     the community tenth); Vault II is the gold book of bars; Vault III
//     the honors, read off the Day-Book. Their ledgers ride in the book
//     and are verified with it (section 4, below).
// No audio. No projections. No promises.

const CA = "9UE6NStA9pRZ5xagrK1FNy3vybmQVL2VaKB7BNpvpump";
const DEX_URL =
  "https://api.dexscreener.com/latest/dex/pairs/solana/2fvtfwcco71j8xepws7yrez3569u2gxu4fyhe2h8oxdy";
const DEX_TOKEN_URL = `https://api.dexscreener.com/latest/dex/tokens/${CA}`;
const PAIR_ADDRESS = "2fvtfwcco71j8xepws7yrez3569u2gxu4fyhe2h8oxdy";
const REFRESH_MS = 60_000;

const $ = (sel, root = document) => root.querySelector(sel);
const clock = (d = new Date()) =>
  d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- 1 · PRICE FACE ---------------- */

const priceState = { lastGood: null, lastGoodAt: null };

function fmtUsd(v, digits = 2) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
function fmtPrice(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  // Small prices need their real precision, not a rounded zero.
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 10 });
}
function fmtNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString("en-US");
}

// Build figure rows ONLY from fields present in the response.
function rowsFromPair(pair) {
  if (!pair) return [];
  const rows = [];
  const price = fmtPrice(pair.priceUsd);
  if (price) rows.push(["Price", price]);
  const mc = fmtUsd(pair.marketCap ?? pair.fdv);
  if (mc) rows.push(["Market cap", mc]);
  const liq = pair.liquidity ? fmtUsd(pair.liquidity.usd) : null;
  if (liq) rows.push(["Liquidity", liq]);
  const vol = pair.volume ? fmtUsd(pair.volume.h24) : null;
  if (vol) rows.push(["Volume · 24h", vol]);
  if (pair.txns && pair.txns.h24) {
    const buys = fmtNum(pair.txns.h24.buys);
    const sells = fmtNum(pair.txns.h24.sells);
    if (buys !== null && sells !== null) rows.push(["Trades · 24h", `${buys} buys · ${sells} sells`]);
  }
  return rows;
}

function renderPrice(rows, sourceLabel) {
  const grid = $("[data-price-grid]");
  const src = $("[data-price-source]");
  if (!grid) return;
  grid.innerHTML = "";
  if (!rows.length) {
    const p = document.createElement("p");
    p.className = "rec-note";
    p.textContent = "reaching for its source…";
    grid.appendChild(p);
  } else {
    for (const [k, v] of rows) {
      const row = document.createElement("div");
      row.className = "rec-row";
      const ks = document.createElement("span"); ks.className = "rec-k"; ks.textContent = k;
      const vs = document.createElement("span"); vs.className = "rec-v"; vs.textContent = v;
      row.append(ks, vs);
      grid.appendChild(row);
    }
  }
  if (src) src.textContent = sourceLabel;
}

async function fetchPrice() {
  try {
    const res = await fetch(DEX_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let pair = data.pair || (Array.isArray(data.pairs) ? data.pairs[0] : null);
    if (!pair) {
      // Fallback (coordinator, 2026-11-20): the pair endpoint currently
      // reports no pair for this coin. Ask the token endpoint instead and
      // take the recorded pair if it is listed, else the deepest-liquidity
      // pair the source reports. Still source data only — never invented.
      const tRes = await fetch(DEX_TOKEN_URL, { cache: "no-store" });
      if (tRes.ok) {
        const tData = await tRes.json();
        const pairs = Array.isArray(tData.pairs) ? tData.pairs : [];
        pair =
          pairs.find((p) => p.pairAddress === PAIR_ADDRESS) ||
          pairs
            .slice()
            .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0] ||
          null;
      }
    }
    const rows = rowsFromPair(pair);
    if (!rows.length) throw new Error("empty pair");
    priceState.lastGood = rows;
    priceState.lastGoodAt = new Date();
    renderPrice(rows, `Source: Dexscreener · fetched ${clock(priceState.lastGoodAt)}`);
  } catch {
    if (priceState.lastGood) {
      renderPrice(priceState.lastGood, `Source: Dexscreener · last receipted ${clock(priceState.lastGoodAt)}`);
    } else {
      renderPrice([], "Source: Dexscreener · reaching for its source…");
    }
  }
}

function startPriceFace() {
  if (!$("[data-price-grid]")) return;
  renderPrice([], "Source: Dexscreener · reaching for its source…");
  fetchPrice();
  setInterval(fetchPrice, REFRESH_MS);
}

/* ---------------- 2 · VERIFIER + 3 · ANCHOR ---------------- */

async function verifyDaybook() {
  const verdictEl = $("[data-verify-verdict]");
  const listEl = $("[data-daybook-list]");
  const rootEl = $("[data-anchor-root]");
  const payloadEl = $("[data-anchor-payload]");
  if (!verdictEl) return;
  verdictEl.textContent = "Recomputing every entry in your browser…";
  verdictEl.dataset.state = "working";
  try {
    const [bookRes, rootRes] = await Promise.all([
      fetch("daybook.json", { cache: "no-store" }),
      fetch("root.json", { cache: "no-store" }),
    ]);
    if (!bookRes.ok) throw new Error("daybook fetch failed");
    const book = await bookRes.json();
    const entries = Array.isArray(book) ? book : book.entries;
    const rootDoc = rootRes.ok ? await rootRes.json() : null;

    let prev = "0".repeat(64);
    let ok = Array.isArray(entries) && entries.length > 0;
    let anchorRoot = null;
    let entryNo = 0;
    // Every checked entry is kept: the Chrono-Astrolabe Ledger renders all
    // of its views (strata, chain strip, plain table, astrolabe) from this
    // one pass, so no hash is ever recomputed twice or rendered from text
    // hardcoded anywhere — the book's JSON is the only source.
    const checked = [];
    const ledgerMode = !!$("[data-ledger-astrolabe]");
    if (listEl) listEl.innerHTML = "";
    for (const e of entries) {
      const recomputed = await sha256Hex(`${e.prev}|${e.date}|${e.title}|${e.text}`);
      const entryOk = e.prev === prev && recomputed === e.hash;
      if (!entryOk) ok = false;
      prev = e.hash;
      entryNo += 1;
      if (book && book.vaults && entryNo === book.vaults.anchorEntries) {
        anchorRoot = await sha256Hex(prev);
      }
      checked.push({ e, entryOk });
      // Defensive fallback: on a face without the ledger containers, the
      // old single list renders exactly as it always has.
      if (listEl && !ledgerMode) {
        const li = document.createElement("li");
        li.className = "rec-entry";
        const head = document.createElement("div");
        head.className = "rec-entry-head";
        const t = document.createElement("span");
        t.className = "rec-entry-title";
        t.textContent = `#${e.n} · ${e.title}`;
        const d = document.createElement("span");
        d.className = "rec-entry-date";
        d.textContent = e.date;
        head.append(t, d);
        const body = document.createElement("p");
        body.className = "rec-entry-text";
        body.textContent = e.text;
        const hash = document.createElement("code");
        hash.className = "rec-hash";
        hash.textContent = `hash ${e.hash} ${entryOk ? "✓ recomputed match" : "✗ MISMATCH"}`;
        li.append(head, body, hash);
        listEl.appendChild(li);
      }
    }
    const computedRoot = await sha256Hex(prev);

    // The vault ledgers (Vault I's tithe book, Vault II's gold book) are
    // verified and rendered with the book — a broken vault breaks the record.
    if (book && !Array.isArray(book) && book.vaults) {
      const vaultsOk = await verifyVaults(book, checked, anchorRoot);
      if (!vaultsOk) ok = false;
    }

    // Root check: SHA-256 of the last entry's hash must equal root.json.
    let rootOk = false;
    let root = "";
    let rootDate = "2026-11-20";
    if (ok && rootDoc && rootDoc.root) {
      root = rootDoc.root;
      rootDate = rootDoc.date || rootDate;
      rootOk = computedRoot === rootDoc.root;
    }

    if (ok && rootOk) {
      verdictEl.textContent = "CHAIN INTACT — every entry recomputed and matched in your browser";
      verdictEl.dataset.state = "ok";
    } else if (ok && !rootDoc) {
      verdictEl.textContent = "CHAIN INTACT — every entry recomputed and matched in your browser (root file not loaded)";
      verdictEl.dataset.state = "ok";
    } else {
      verdictEl.textContent = "CHAIN BROKEN — an entry did not recompute. Do not trust this copy of the record.";
      verdictEl.dataset.state = "fail";
    }

    // The ledger views and the Hash Explorer read the book from this one
    // verified pass — nothing is fetched or recomputed a second time.
    const verdictOk = (ok && rootOk) || (ok && !rootDoc);
    bookState = { loaded: true, ok, verdictOk, checked, book, computedRoot, rootDoc };
    if (ledgerMode) renderLedger(checked, book, verdictOk);

    if (rootEl && root) rootEl.textContent = root;
    if (payloadEl && root) {
      payloadEl.textContent = `PROVADIA DAYBOOK ROOT · ${rootDate} · ${root}`;
    }
  } catch {
    bookState = { loaded: false, ok: false, verdictOk: false, checked: [], book: null, computedRoot: null, rootDoc: null };
    verdictEl.textContent = "The record could not be loaded, so nothing was verified. No verdict is shown rather than a false one.";
    verdictEl.dataset.state = "fail";
  }
}

/* ---------------- 2b · THE CHRONO-ASTROLABE LEDGER ----------------
   The Day-Book card's second face: the same verified entries, laid out
   in the book's four strata around the astrolabe, in a plain table, and
   behind a hash explorer. Everything here renders from the single
   checked pass verifyDaybook() already made — no second fetch, no
   hardcoded entry text, no invented fact. An entry's stratum is a
   standing classification of the book (below); an entry not named in
   the map stands in the Receipts, the book's whole chain. */

// The verified book, kept for the Hash Explorer. null until the first
// verification pass settles; { loaded: false } when the book failed.
let bookState = null;

const STRATA_OF = { 1: "founding", 2: "founding", 3: "rulings", 4: "founding", 5: "founding", 6: "rulings" };
const STRATUM_NAMES = {
  founding: "The Founding Acts",
  rulings: "The Rulings & Amendments",
  receipts: "The Receipts & The Day-Book",
  crystallized: "Crystallized Agora Decisions",
};
// Ring radii in the astrolabe's 260-unit viewBox, outer in reading order.
const STRATUM_RINGS = { founding: 40, rulings: 62, receipts: 84, crystallized: 106 };

function stratumOf(e) {
  return STRATA_OF[e.n] || "receipts";
}

// One proof row: a small-caps label and its value, both plain text.
function proofRow(label, value) {
  const row = document.createElement("div");
  row.className = "rec-proof-row";
  const k = document.createElement("span");
  k.className = "rec-k";
  k.textContent = label;
  const v = document.createElement("span");
  v.className = "rec-v";
  v.textContent = value;
  row.append(k, v);
  return row;
}

// The full entry node, in the same DOM shape the Day-Book list has
// always used, plus its anchor id and its proof panel. The panel shows
// only what the entry and the recomputation themselves carry — there
// are no receipt crops for Day-Book entries, so no such button exists.
function ledgerEntryNode(e, entryOk, total) {
  const li = document.createElement("li");
  li.className = "rec-entry";
  li.id = `entry-${e.n}`;
  const head = document.createElement("div");
  head.className = "rec-entry-head";
  const t = document.createElement("span");
  t.className = "rec-entry-title";
  t.textContent = `#${e.n} · ${e.title}`;
  const d = document.createElement("span");
  d.className = "rec-entry-date";
  d.textContent = e.date;
  head.append(t, d);
  const body = document.createElement("p");
  body.className = "rec-entry-text";
  body.textContent = e.text;
  const hash = document.createElement("code");
  hash.className = "rec-hash";
  hash.textContent = `hash ${e.hash} ${entryOk ? "✓ recomputed match" : "✗ MISMATCH"}`;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "rec-proof-btn";
  btn.dataset.proofFor = String(e.n);
  btn.setAttribute("aria-expanded", "false");
  btn.textContent = "Inspect proof";
  const panel = document.createElement("div");
  panel.className = "rec-proof";
  panel.dataset.proofPanel = String(e.n);
  panel.hidden = true;
  panel.append(
    proofRow("Entry", `#${e.n} of ${total}`),
    proofRow("Date as recorded", e.date),
    proofRow("Stratum", STRATUM_NAMES[stratumOf(e)]),
    proofRow("SHA-256", e.hash),
    proofRow("Previous hash", e.prev),
    proofRow("Recomputed in your browser", entryOk ? "match" : "MISMATCH")
  );
  li.append(head, body, hash, btn, panel);
  return li;
}

// One compact chain-strip row: the whole book in chain order.
function chainStripItem(e, entryOk) {
  const li = document.createElement("li");
  li.className = "chain-item";
  const label = document.createElement("span");
  label.textContent = `#${e.n} · ${e.date} · ${e.title}`;
  const hash = document.createElement("code");
  hash.className = "rec-hash chain-hash";
  hash.textContent = `${e.hash.slice(0, 12)}… ${entryOk ? "✓" : "✗"}`;
  li.append(label, hash);
  return li;
}

// One plain-table row: number, date, record, full hash, chain mark.
function ledgerTableRow(e, entryOk) {
  const tr = document.createElement("tr");
  const n = document.createElement("td");
  n.textContent = String(e.n);
  const date = document.createElement("td");
  date.textContent = e.date;
  const rec = document.createElement("td");
  const strong = document.createElement("strong");
  strong.textContent = e.title;
  rec.append(strong, document.createTextNode(` — ${e.text}`));
  const hashCell = document.createElement("td");
  const hash = document.createElement("code");
  hash.className = "rec-hash";
  hash.textContent = e.hash;
  hashCell.appendChild(hash);
  const chain = document.createElement("td");
  chain.textContent = entryOk ? "✓ recomputed" : "✗ MISMATCH";
  tr.append(n, date, rec, hashCell, chain);
  return tr;
}

// One astrolabe node: a circle on a ring, evenly spaced from the top.
function astrolabeNode(cx, cy, r, angleDeg, bright) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", (cx + r * Math.cos(a)).toFixed(1));
  c.setAttribute("cy", (cy + r * Math.sin(a)).toFixed(1));
  c.setAttribute("r", "4");
  // Antique gold for the strata; bright gold is reserved to the
  // receipts ring — the one ring that carries every entry.
  c.setAttribute("fill", bright ? "#E4C65B" : "#C9A227");
  return c;
}

function renderLedger(checked, book, chainOk) {
  const total = checked.length;

  // Strata lists — founding, rulings, crystallized (the receipts
  // stratum carries the chain strip instead: the whole book, in order).
  for (const name of ["founding", "rulings", "crystallized"]) {
    const list = $(`[data-strata-list="${name}"]`);
    if (!list) continue;
    list.innerHTML = "";
    for (const { e, entryOk } of checked) {
      if (stratumOf(e) === name) list.appendChild(ledgerEntryNode(e, entryOk, total));
    }
  }
  const emptyNote = $("[data-crystallized-empty]");
  const crysList = $("[data-strata-list=\"crystallized\"]");
  if (emptyNote && crysList && crysList.children.length) emptyNote.hidden = true;

  // Chain strip — every entry, in chain order, under stratum 03.
  const strip = $("[data-chain-strip]");
  if (strip) {
    strip.innerHTML = "";
    for (const { e, entryOk } of checked) strip.appendChild(chainStripItem(e, entryOk));
  }

  // Receipt counters — counted from the book's own vault ledgers, the
  // same figures the Three Vaults below verify. Nothing else is claimed.
  const receiptsEl = $("[data-strata-receipts]");
  if (receiptsEl) {
    if (book && !Array.isArray(book) && book.vaults) {
      const goldCount = Array.isArray(book.vaults.gold?.entries) ? book.vaults.gold.entries.length : 0;
      const titheCount = Array.isArray(book.vaults.tithe?.entries) ? book.vaults.tithe.entries.length : 0;
      receiptsEl.textContent = `Golden Wall brick receipts: ${goldCount} · Tithe-book entries: ${titheCount} · Batch conversion receipts: none stand in the book.`;
    } else {
      receiptsEl.textContent = "The receipt counters ride in the book's vault ledgers, below.";
    }
  }

  // Plain Ledger Table — the same entries, unadorned.
  const tbody = $("[data-ledger-table-body]");
  if (tbody) {
    tbody.innerHTML = "";
    for (const { e, entryOk } of checked) tbody.appendChild(ledgerTableRow(e, entryOk));
  }

  // Astrolabe nodes — one per entry on its stratum's ring, and one per
  // entry again on the receipts ring, which carries the whole book.
  const nodes = $("[data-astrolabe-nodes]");
  if (nodes) {
    nodes.innerHTML = "";
    const onRing = { founding: [], rulings: [], receipts: [], crystallized: [] };
    for (const item of checked) {
      onRing.receipts.push(item);
      const s = stratumOf(item.e);
      if (s !== "receipts") onRing[s].push(item);
    }
    for (const name of Object.keys(onRing)) {
      const ring = onRing[name];
      ring.forEach((item, i) => {
        nodes.appendChild(astrolabeNode(130, 130, STRATUM_RINGS[name], (360 * i) / ring.length, name === "receipts"));
      });
    }
  }
  const caption = $("[data-astrolabe-caption]");
  if (caption) {
    caption.textContent = chainOk
      ? `${total} entries across the four strata — every hash recomputed in your browser below.`
      : "The chain did not recompute — see the verdict above.";
  }
}

// The Hash Explorer: a pasted hash is answered from the verified pass
// only — an entry's seal, the book's root, a chain link, or an honest
// "does not stand in this book".
function lookupHash(raw) {
  const resultEl = $("[data-hash-result]");
  if (!resultEl) return;
  if (!bookState || !bookState.loaded) {
    resultEl.textContent = "The book could not be loaded, so there is nothing to look up.";
    return;
  }
  const q = (raw || "").trim().toLowerCase();
  if (!q) {
    resultEl.textContent = "Enter a hash to look it up.";
    return;
  }
  const warn = bookState.ok ? "" : "CHAIN BROKEN — an entry did not recompute. ";
  const hit = bookState.checked.find(({ e }) => e.hash === q);
  if (hit) {
    const { e } = hit;
    resultEl.textContent = `${warn}That hash seals entry #${e.n} — “${e.title}” (${e.date}), stratum ${STRATUM_NAMES[stratumOf(e)]}.`;
    // Open the entry's proof panel and bring the entry into view.
    const panel = $(`[data-proof-panel="${e.n}"]`);
    const btn = $(`[data-proof-for="${e.n}"]`);
    if (panel) panel.hidden = false;
    if (btn) btn.setAttribute("aria-expanded", "true");
    const node = document.getElementById(`entry-${e.n}`);
    if (node) node.scrollIntoView({ block: "center" });
    return;
  }
  if (q === bookState.computedRoot || (bookState.rootDoc && q === bookState.rootDoc.root)) {
    resultEl.textContent = `${warn}That is the book's current root — the fingerprint of all ${bookState.checked.length} entries. It stands at the Daily Anchor, below.`;
    return;
  }
  const link = bookState.checked.find(({ e }) => e.prev === q);
  if (link && q !== "0".repeat(64)) {
    resultEl.textContent = `${warn}That hash is a link in the chain: entry #${link.e.n} builds on it.`;
    return;
  }
  resultEl.textContent = `${warn}That hash does not stand in this book.`;
}

// The ledger's own controls: the view toggle, the proof toggles and the
// Hash Explorer form. Wired once at boot; harmless on a face without
// the ledger (every lookup guards on its element existing).
function initLedgerTools() {
  // Guard against double-binding: boot can only wire these controls
  // once — a second call returns early instead of stacking listeners.
  const station = $("#station-record");
  if (station) {
    if (station.dataset.ledgerToolsBound) return;
    station.dataset.ledgerToolsBound = "1";
  }
  const astro = $("[data-ledger-astrolabe]");
  const plain = $("[data-ledger-plain]");
  const viewBtns = [...document.querySelectorAll("[data-ledger-view]")];
  if (astro && plain && viewBtns.length) {
    const setView = (view) => {
      astro.hidden = view !== "astrolabe";
      plain.hidden = view !== "plain";
      viewBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ledgerView === view)));
    };
    viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.ledgerView)));
    // Stillness by default: a reduced-motion visitor opens on the table.
    setView(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "plain" : "astrolabe");
  }

  if (station) {
    station.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-proof-for]");
      if (!btn) return;
      const panel = $(`[data-proof-panel="${btn.dataset.proofFor}"]`);
      if (!panel) return;
      panel.hidden = !panel.hidden;
      btn.setAttribute("aria-expanded", String(!panel.hidden));
    });
  }

  const form = $("[data-hash-explorer]");
  if (form) {
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const input = $("[data-hash-input]", form);
      lookupHash(input ? input.value : "");
    });
  }
}

/* ---------------- boot ---------------- */

function boot() {
  startPriceFace();
  verifyDaybook();
  initLedgerTools();
}
// Works both as a static <script> and when injected after DOMContentLoaded
// (the proof page mounts the fragments first, then loads this module).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

export { CA, DEX_URL };

/* ---------------- 4 · THE THREE VAULTS ----------------
   The vault ledgers ride inside daybook.json as book.vaults, chained to
   the Day-Book itself: every vault chain opens at the Day-Book root of
   the day the vaults were opened (book.vaults.anchor — the root over the
   first book.vaults.anchorEntries entries), and each entry hashes exactly
   like a Day-Book entry: SHA-256 of prev + "|" + the entry's fields.
     Vault I · THE SMART CONTRACT — this record layer itself. Its tithe
       book (the Umbrella's community tenth): date | house | dir | amount
       | receipt, amounts in SOL.
     Vault II · THE GOLD VAULT — the Wall's book of bars:
       date | serial | grams | dealer | vault | receipt.
     Vault III · THE HONORS VAULT — no ledger, no balance: an honor is a
       Day-Book entry, covered by the Day-Book chain itself; its face
       reads the honors off the book. */

const VAULT_FIELDS = {
  tithe: ["house", "dir", "amount", "receipt"],
  gold: ["serial", "grams", "dealer", "vault", "receipt"],
};

function fmtAmount(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function vaultEntryLi(head, date, text, hash, ok) {
  const li = document.createElement("li");
  li.className = "rec-entry";
  const headEl = document.createElement("div");
  headEl.className = "rec-entry-head";
  const t = document.createElement("span");
  t.className = "rec-entry-title";
  t.textContent = head;
  const d = document.createElement("span");
  d.className = "rec-entry-date";
  d.textContent = date;
  headEl.append(t, d);
  const body = document.createElement("p");
  body.className = "rec-entry-text";
  body.textContent = text;
  const h = document.createElement("code");
  h.className = "rec-hash";
  h.textContent = `hash ${hash} ${ok ? "✓ recomputed match" : "✗ MISMATCH"}`;
  li.append(headEl, body, h);
  return li;
}

async function verifyVaultChain(ledger, fields, anchor) {
  let prev = anchor;
  let ok = true;
  const list = Array.isArray(ledger?.entries) ? ledger.entries : [];
  const checked = [];
  for (const e of list) {
    const recomputed = await sha256Hex(
      [e.prev, e.date, ...fields.map((f) => e[f])].join("|")
    );
    const entryOk = e.prev === prev && recomputed === e.hash;
    if (!entryOk) ok = false;
    prev = e.hash;
    checked.push({ e, entryOk });
  }
  return { ok, checked };
}

function renderTithe(checked) {
  const set = (key, val) => {
    const el = document.querySelector(`[data-tithe="${key}"]`);
    if (el) el.textContent = val;
  };
  let totalIn = 0;
  let totalOut = 0;
  const houses = new Set();
  for (const { e } of checked) {
    const amt = Number(e.amount) || 0;
    if (e.dir === "in") {
      totalIn += amt;
      houses.add(e.house);
    } else if (e.dir === "out") {
      totalOut += amt;
    }
  }
  set("balance", fmtAmount(totalIn - totalOut));
  set("houses", String(houses.size));
  set("in", fmtAmount(totalIn));
  set("out", fmtAmount(totalOut));
  const listEl = document.querySelector('[data-tithe="list"]');
  if (listEl) {
    listEl.innerHTML = "";
    checked.forEach(({ e, entryOk }, i) => {
      const head = `#${i + 1} · ${e.house}`;
      const text = `${e.dir === "in" ? "Received" : "Spent"} · ${fmtAmount(e.amount)} SOL · receipt ${e.receipt}`;
      listEl.appendChild(vaultEntryLi(head, e.date, text, e.hash, entryOk));
    });
  }
}

function renderGold(checked) {
  const set = (key, val) => {
    const el = document.querySelector(`[data-vault-gold="${key}"]`);
    if (el) el.textContent = val;
  };
  const grams = checked.reduce((s, { e }) => s + (Number(e.grams) || 0), 0);
  set("bars", String(checked.length));
  set("grams", `${fmtAmount(grams)} grams`);
  const listEl = document.querySelector('[data-vault-gold="list"]');
  if (listEl) {
    listEl.innerHTML = "";
    checked.forEach(({ e, entryOk }, i) => {
      const head = `Bar ${i + 1} · serial ${e.serial}`;
      const text = `${fmtAmount(e.grams)} g · dealer ${e.dealer} · stored at ${e.vault} · receipt ${e.receipt}`;
      listEl.appendChild(vaultEntryLi(head, e.date, text, e.hash, entryOk));
    });
  }
  const emptyEl = document.querySelector('[data-vault-gold="empty"]');
  if (emptyEl && checked.length) emptyEl.style.display = "none";
}

// Honors are read off the Day-Book — and off the same verified pass as
// everything else on this page: each honor renders with the entryOk that
// verifyDaybook() actually computed for its entry, never an assumed one.
function renderHonors(checkedDaybook) {
  const honors = (checkedDaybook || []).filter(({ e }) => /honou?r/i.test(e.title || ""));
  const listEl = document.querySelector('[data-vault-honors="list"]');
  if (listEl) {
    listEl.innerHTML = "";
    for (const { e, entryOk } of honors) {
      listEl.appendChild(
        vaultEntryLi(`#${e.n} · ${e.title}`, e.date, e.text, e.hash, entryOk)
      );
    }
  }
  const emptyEl = document.querySelector('[data-vault-honors="empty"]');
  if (emptyEl && honors.length) emptyEl.style.display = "none";
}

// Verifies the vault ledgers against the anchor recomputed from the book
// itself, renders all three faces either way (a broken ledger shows its
// entries with ✗ marks under a BROKEN vault verdict — never a silent
// pass), and returns whether every vault check passed.
async function verifyVaults(book, checkedDaybook, anchorRoot) {
  const verdictEl = document.querySelector("[data-vault-verdict]");
  const vaults = book.vaults;
  let ok = true;
  if (!anchorRoot || vaults.anchor !== anchorRoot) ok = false;

  const tithe = await verifyVaultChain(vaults.tithe, VAULT_FIELDS.tithe, vaults.anchor);
  if (!tithe.ok) ok = false;
  renderTithe(tithe.checked);

  const gold = await verifyVaultChain(vaults.gold, VAULT_FIELDS.gold, vaults.anchor);
  if (!gold.ok) ok = false;
  renderGold(gold.checked);

  renderHonors(checkedDaybook);

  if (verdictEl) {
    if (ok) {
      verdictEl.textContent =
        "VAULT LEDGERS INTACT — the tithe book and the gold book recomputed and matched in your browser, chained to the Day-Book";
      verdictEl.dataset.state = "ok";
    } else {
      verdictEl.textContent =
        "VAULT LEDGER BROKEN — a vault entry did not recompute. Do not trust this copy of the record.";
      verdictEl.dataset.state = "fail";
    }
  }
  return ok;
}
