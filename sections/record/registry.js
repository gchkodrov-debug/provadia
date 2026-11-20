// PROVADIA — THE REGISTRY OF HOUSES (browser module)
// The family's book: a chained ledger alongside the Day-Book, kept with
// the same discipline — every entry hashes as SHA-256 of
// prev|date|title|text, and the book's root is the SHA-256 of the last
// entry's hash (of the genesis prev, while the book is empty). This
// module recomputes the chain in the visitor's own browser and renders
// only what the book carries:
//   [data-registry-verdict]  — the chain verdict (Page 2's Verifier face)
//   [data-reg-count="born|standing|dormant|fallen|struck|suspended"]
//                            — the Registry's Face counts (Page 5)
//   [data-registry-roll]     — the roll of houses (Page 5)
//   [data-bricklayer-count]  — the receipted Bricklayer count (Page 4's
//                              gate state, Page 2's registry face)
// Nothing is invented: an empty book renders honest zeros.

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const $all = (sel) => [...document.querySelectorAll(sel)];

async function boot() {
  const verdictEls = $all("[data-registry-verdict]");
  const countEls = $all("[data-reg-count]");
  const rollEls = $all("[data-registry-roll]");
  const brickEls = $all("[data-bricklayer-count]");
  if (!verdictEls.length && !countEls.length && !rollEls.length && !brickEls.length) return;

  let book;
  try {
    const res = await fetch("../registry.json", { cache: "no-store" });
    if (!res.ok) throw new Error("registry fetch failed");
    book = await res.json();
  } catch {
    for (const el of verdictEls) {
      el.textContent = "The registry could not be loaded, so nothing was verified. No verdict is shown rather than a false one.";
      el.dataset.state = "fail";
    }
    return;
  }

  const entries = Array.isArray(book.entries) ? book.entries : [];
  const houses = Array.isArray(book.houses) ? book.houses : [];

  // recompute the chain, Day-Book discipline
  let prev = "0".repeat(64);
  let ok = true;
  for (const e of entries) {
    const recomputed = await sha256Hex(`${e.prev}|${e.date}|${e.title}|${e.text}`);
    if (e.prev !== prev || recomputed !== e.hash) ok = false;
    prev = e.hash;
  }
  const computedRoot = await sha256Hex(prev);
  if (computedRoot !== book.root) ok = false;

  for (const el of verdictEls) {
    if (ok) {
      el.textContent = `REGISTRY INTACT — the family book recomputed and matched in your browser · ${houses.length} ${houses.length === 1 ? "house" : "houses"} born`;
      el.dataset.state = "ok";
    } else {
      el.textContent = "REGISTRY BROKEN — an entry did not recompute. Do not trust this copy of the record.";
      el.dataset.state = "fail";
    }
  }

  const tally = { born: houses.length, standing: 0, dormant: 0, fallen: 0, struck: 0, suspended: 0 };
  for (const h of houses) {
    const s = String(h.standing || "").toLowerCase();
    if (s in tally && s !== "born") tally[s] += 1;
  }
  for (const el of countEls) {
    const key = el.dataset.regCount;
    if (key in tally) el.textContent = String(tally[key]);
  }

  for (const el of brickEls) {
    el.textContent = String(Number.isFinite(book.bricklayers) ? book.bricklayers : 0);
  }

  for (const roll of rollEls) {
    roll.innerHTML = "";
    houses.forEach((h, i) => {
      const li = document.createElement("li");
      li.className = "rec-entry";
      const head = document.createElement("div");
      head.className = "rec-entry-head";
      const t = document.createElement("span");
      t.className = "rec-entry-title";
      t.textContent = `№ ${h.number ?? i + 1} · ${h.name ?? ""}`;
      const d = document.createElement("span");
      d.className = "rec-entry-date";
      d.textContent = h.born ?? "";
      head.append(t, d);
      const body = document.createElement("p");
      body.className = "rec-entry-text";
      body.textContent = `Standing: ${(h.standing || "standing").toUpperCase()} · A house of the Town of PROVADIA — recorded at birth, built by the town, vouched for by no one.`;
      li.append(head, body);
      roll.appendChild(li);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
