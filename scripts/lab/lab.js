/* LAB: layout switcher for the opened day (list = today's page, grid = 2-3 columns, tiles = compact like the first layer) */
(function () {
  const LAYS = [["list", "List"], ["grid", "Grid"]];
  const q = (location.search.match(/[?&]lay=(\w+)/) || [])[1];
  let lay = q || (() => { try { return localStorage.getItem("labLay"); } catch (e) { return null; } })() || "grid";
  if (!LAYS.some(([k]) => k === lay)) lay = "grid";
  const apply = () => {
    document.documentElement.dataset.lay = lay;
    document.querySelectorAll("#labbar button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lay === lay)));
  };
  const bar = document.createElement("div");
  bar.id = "labbar";
  bar.innerHTML = "<b>LAB</b>" + LAYS.map(([k, n]) => `<button type="button" data-lay="${k}">${n}</button>`).join("");
  document.body.appendChild(bar);
  bar.onclick = (e) => {
    const b = e.target.closest("button"); if (!b) return;
    lay = b.dataset.lay;
    try { localStorage.setItem("labLay", lay); } catch (err) {}
    /* close any open site so the detail re-places itself in the new layout */
    document.querySelectorAll('.srow[aria-expanded="true"]').forEach((x) => x.setAttribute("aria-expanded", "false"));
    document.querySelectorAll(".det").forEach((d) => { d.hidden = true; });
    apply();
  };
  apply();
  /* where the third level goes: under the site (list) or after the last tile of its row, full width (grid, tiles) */
  window.labPlace = (b, det) => {
    const y0 = b.getBoundingClientRect().top;
    const wasShown = !det.hidden;
    det.hidden = true;                       // measure the rows without the old detail in the way
    if (lay === "list") { b.after(det); }
    else {
      let last = b, n = b.nextElementSibling;
      while (n && n.classList.contains("srow") && Math.abs(n.offsetTop - b.offsetTop) < 4) { last = n; n = n.nextElementSibling; }
      last.after(det);
      const L = b.parentElement.getBoundingClientRect(), r = b.getBoundingClientRect();
      det.style.setProperty("--ax", `${Math.round(r.left - L.left + Math.min(r.width / 2, 48))}px`);
    }
    det.classList.remove("lab-in"); void det.offsetWidth; det.classList.add("lab-in");
    /* keep the tapped tile where the finger is when another detail above it closes */
    requestAnimationFrame(() => {
      const dy = b.getBoundingClientRect().top - y0;
      if (wasShown && Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: "instant" });
    });
  };
})();
/* LAB: opening a day in grid/tiles: each first-layer pill flies into its tile, the other tiles fade in after */
(function () {
  const lay = () => document.documentElement.dataset.lay;
  const calm = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.addEventListener("click", (e) => {
    const sm = e.target.closest("details.day[data-date] > summary.hd"); if (!sm) return;
    const day = sm.parentElement;
    if (day.open || lay() === "list") { day._from = null; return; }
    day._from = [...sm.querySelectorAll(".sum .sc")].map((p) => ({ name: (p.querySelector("b") || p).textContent.trim(), r: p.getBoundingClientRect() }));
  }, true);
  document.addEventListener("toggle", (e) => {
    const day = e.target; if (!day.matches || !day.matches("details.day[data-date]") || !day.open || lay() === "list" || calm()) return;
    const from = day._from || []; day._from = null;
    requestAnimationFrame(() => {
      const tiles = [...day.querySelectorAll(".list .srow")];
      let k = 0;
      for (const t of tiles) {
        const nm = (t.querySelector(".nm") || {}).textContent;
        const f = from.find((x) => x.name === (nm || "").replace(/\u200b/g, "").trim());
        const r = t.getBoundingClientRect();
        if (r.bottom < -50 || r.top > innerHeight + 50) continue;      // off screen: no show
        if (f) {
          const dx = f.r.left - r.left, dy = f.r.top - r.top, sx = f.r.width / r.width, sy = f.r.height / r.height;
          t.animate([{ transformOrigin: "0 0", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: .9 },
                     { transformOrigin: "0 0", transform: "none", opacity: 1 }], { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" });
          t.querySelectorAll(".nmrow ~ *, .lab, .dscore").forEach((x) => x.animate([{ opacity: 0 }, { opacity: 0, offset: .55 }, { opacity: 1 }], { duration: 420 }));
        } else {
          t.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300, delay: 180 + 35 * k++, easing: "ease-out", fill: "backwards" });
        }
      }
      day.querySelectorAll(".list .sgrp").forEach((g) => g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 150, fill: "backwards" }));
    });
  }, true);
})();
/* LAB: long names break after a slash, not mid-word (Laguna/Horse/Fuzz) */
(function () {
  const fix = () => document.querySelectorAll(".list .srow .nm").forEach((n) => {
    if (n.textContent.includes("/") && !n.textContent.includes("/​")) n.textContent = n.textContent.replace(/\//g, "/​");
  });
  const days = document.getElementById("days");
  if (days) new MutationObserver(fix).observe(days, { childList: true });
  fix();
})();
/* LAB: "How the score was made" — a ledger: the models' number, what's good (✓), what's bad (✗, with the points it
   took), then the score. A thin 1–5 track on the number rows shows the score falling step by step. */
(function () {
  const CAT = [[/rain/i, "rain"], [/sun|cloud/i, "sun"], [/gust/i, "launch"], [/launch|calm/i, "launch"],
    [/top of lift|aloft|offshore|over the back|NW|drift|LAX-DAG/i, "aloft"], [/below .* ft/i, "height"], [/blown out/i, "launch"],
    [/season/i, "season"], [/clean day/i, "clean"]];
  const catOf = (t) => (CAT.find(([re]) => re.test(t)) || [, "other"])[1];
  const NAME = { height: "Height", climb: "Climb", launch: "Launch wind", aloft: "Wind aloft", rain: "Rain", sun: "Sun", season: "Season", clean: "Clean day", other: "Other" };
  const tidy = (t) => String(t).replace("little sun (mid/high cloud)", "less sun").replace(/^chance of rain.*/, "showers likely").replace(/^offshore /, "offshore ").replace(/: no-go$/, " → no-go").replace(/: (\d) at most$/, " → $1 at most");
  const track = (from, to, col) => {
    const x = (v) => ((Math.max(1, Math.min(5, v)) - 1) / 4 * 100).toFixed(1);
    const lo = Math.min(from, to), hi = Math.max(from, to);
    return `<span class="lg-tr"><i class="lg-keep" style="width:${x(lo)}%;background:${col}"></i>${hi > lo ? `<i class="lg-lost" style="left:${x(lo)}%;width:${(x(hi) - x(lo)).toFixed(1)}%"></i>` : ""}</span>`;
  };
  const r1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  window.scoreLedger = (c, qv) => {
    const f = (k) => (c.factors || []).find((x) => x.k === k);
    const adj = c.adj || [];
    const hit = new Set(adj.map(([t]) => catOf(t)));
    const params = [];
    const h = f("Height") || f("Thermal height");
    if (h && h.v !== "–") params.push({ cat: "height", v: h.v, q: h.q, why: h.q < 0.5 ? "low, part of the models' number" : "" });
    const sink = c.sink || 1.1, core = c.core || 1.4;
    if (c.wstar != null && c.style !== "ridge") {
      const cl = Math.max(0, core * c.wstar - sink);
      params.push({ cat: "climb", v: `${cl.toFixed(1)} m/s`, q: Math.min(1, cl / 2), why: cl < 1 ? "weak, part of the models' number" : "" });
    }
    const w = f("Wind 1 pm");
    if (w && w.v !== "–") params.push({ cat: "launch", v: w.v + " mph", q: w.q, why: w.q < 0.4 && c.style !== "ridge" ? "part of the models' number" : (c.style === "ridge" && w.q < 0.4 ? "light or cross for soaring, part of the models' number" : "") });
    const a = f("Wind aloft");
    if (a && a.v !== "–") params.push({ cat: "aloft", v: a.v, q: a.q, why: "" });
    if (c.rain_p != null) params.push({ cat: "rain", v: c.rain_p < 0.05 ? "dry" : `${Math.round(c.rain_p * 100)}% chance`, q: 1 - c.rain_p, why: "" });
    if (c.cloud) params.push({ cat: "sun", v: c.cloud.okta ? `mid/high cloud ${c.cloud.okta}/8` : "clear", q: 1 - (c.cloud.sun_loss || 0), why: "" });
    const base = c.base != null ? c.base : c.rating;
    const mods = Object.entries(c.models || {}).map(([m, v]) => `${m} ${r1(v).replace(".0", "")}`).join(" · ");
    const row = (cls, ic, name, val, why, pts, tr) => `<div class="lg-row ${cls}"><span class="lg-ic">${ic}</span><span class="lg-k">${name}</span><span class="lg-v">${val}${why ? `<small>${why}</small>` : ""}</span><span class="lg-p">${pts}</span>${tr || ""}</div>`;
    let run = base;
    const out = [];
    const bp = c.base_parts;
    const W = { otb: "over the back", windy: "blown out", strong: "too strong", light: "too light", cross: "cross", gusty: "gusty" };
    const why = (c.why || []).filter((x) => W[x]).map((x) => W[x]).join(", ");
    const BASE = {
      launch: ["Launch wind", w ? w.v + " mph" : "", why ? `${why} in the flying window` : "in the flying window"],
      climb: ["Climb", params.find((p) => p.cat === "climb")?.v || "", "weak climbs"],
      lowlift: ["Lift over launch", "", "thin lift above launch"],
      offshore: ["Wind aloft", a ? a.v : "", "offshore in the flying layer"],
      aloft: ["Wind aloft", a ? a.v : "", "strong or wrong flow aloft"],
      gust: ["Gusts", "", "over 18 mph"],
      storm: ["Storms", "", "overdevelopment risk"],
      xccap: ["XC", "not on", "height is XC-worthy, but wind or climb rule out XC: the height counts as a 3.4"],
      other: ["Other", "", ""],
      glass: ["Glass-off", "", "an evening glass-off holds it up"],
      models: ["Models", mods, "the models' blend"],
    };
    const stepCat = { launch: "launch", climb: "climb", lowlift: "height", offshore: "aloft", aloft: "aloft" };
    const baseHit = new Set(bp ? bp.steps.filter(([, v]) => v < 0).map(([k]) => stepCat[k]).filter(Boolean) : []);
    const isGood = (p) => !hit.has(p.cat) && !baseHit.has(p.cat) && (bp ? true : !p.why && p.q >= 0.4);
    if (bp) {
      /* start from the height: where the top of lift sits on the 1-5 scale, then each step the models' number took */
      run = bp.lv;
      const hp = params.find((p) => p.cat === "height");
      out.push(row("lg-base", "", "Height", hp ? hp.v : "", "top of lift on the 1–5 scale", `<b>${r1(bp.lv)}</b>`, track(bp.lv, bp.lv, qv(bp.lv))));
      for (const p of params.filter((p) => p.cat !== "height" && isGood(p))) out.push(row("lg-good", "✓", NAME[p.cat], p.v, "", ""));
      for (const [k, v] of bp.steps) {
        const [nm, val, rs] = BASE[k] || [k, "", ""];
        const before = run; run = Math.max(1, Math.min(5, run + v));
        out.push(row(v < 0 ? "lg-bad" : "lg-plus", v < 0 ? "✗" : "+", nm, val, rs, `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`, track(Math.min(run, before), Math.max(run, before), "#c9ced6")));
      }
      run = base;
    } else {
      out.push(row("lg-base", "", "Models", mods ? `<span class="lg-mods">${mods}</span>` : "", c.style === "ridge" ? "ridge lift from the wind" : "lift height and climb on the day", `<b>${r1(base)}</b>`, track(base, base, qv(base))));
      for (const p of params.filter(isGood)) out.push(row("lg-good", "✓", NAME[p.cat], p.v, "", ""));
      for (const p of params.filter((p) => !hit.has(p.cat) && !isGood(p))) out.push(row("lg-soft", "✗", NAME[p.cat], p.v, p.why || "", "<em>in base</em>"));
    }
    for (const [t, v] of adj) {
      const cat = catOf(t), p = params.find((x) => x.cat === cat);
      const before = run; run = Math.max(1, run + v);
      out.push(row("lg-bad", "✗", NAME[cat], p ? p.v : "", tidy(t), `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`, track(run, before, "#c9ced6")));
    }
    out.push(row("lg-total", "=", "Score", "", "", `<b>${r1(c.rating)}</b>`, track(c.rating, c.rating, qv(c.rating))));
    return `<div class="dsec lg"><span class="dh">How the score was made</span><div class="lg-list">${out.join("")}</div></div>`;
  };
})();
/* LAB: tap the thermal panel to see it full screen, turned to landscape on a phone held upright; × closes.
   A big headline (day, date, region) and ‹ › buttons step to the day before / after, staying full screen. */
(function () {
  let ov = null;
  const close = () => { if (ov) { ov.remove(); ov = null; document.documentElement.style.overflow = ""; } };
  const open = (therm) => {
    const svg = therm.querySelector("svg"); if (!svg) return;
    close();
    const day = therm.closest("details.day");
    const dn = day ? (day.querySelector("summary .when .dn") || {}).textContent || "" : "";
    const dt = day ? (day.querySelector("summary .when small:not(.rel)") || {}).textContent || "" : "";
    const tnd = (therm.querySelector(".tnd") || {}).textContent || "";
    const region = tnd.split("·").slice(1).join("·").trim();
    const nb = [...therm.querySelectorAll(".tnb")];
    const btn = (b, k) => b ? `<button type="button" class="thf-nav" data-k="${k}"${b.disabled ? " disabled" : ""}>${b.textContent.trim()}</button>` : "<span></span>";
    ov = document.createElement("div");
    ov.id = "thfull";
    ov.innerHTML = `<div class="thf-in"><div class="thf-hd">${btn(nb[0], 0)}<div class="thf-t"><b>${dn} <span>${dt}</span></b><small>${region}</small></div>${btn(nb[1], 1)}<button type="button" class="thf-x" aria-label="Close">×</button></div><div class="thf-svg"></div></div>`;
    const c = svg.cloneNode(true);
    c.removeAttribute("width"); c.removeAttribute("height");
    c.setAttribute("preserveAspectRatio", "xMidYMid meet");
    ov.querySelector(".thf-svg").appendChild(c);
    document.body.appendChild(ov);
    document.documentElement.style.overflow = "hidden";
    ov.addEventListener("click", (e) => {
      if (e.target.closest(".thf-x") || e.target === ov) { close(); return; }
      const n = e.target.closest(".thf-nav");
      if (n && !n.disabled) {
        const src = nb[+n.dataset.k], sid = src.dataset.sid, k = src.dataset.jump;
        src.click();                                  // the page moves to that day with the same site open
        const again = document.querySelector(`#det-${k} .therm`);
        if (again) open(again); else close();
      }
    });
  };
  document.addEventListener("click", (e) => {
    const therm = e.target.closest(".det .therm");
    if (!therm || !e.target.closest("svg") || e.target.closest(".tnb")) return;
    e.stopPropagation();
    open(therm);
  }, true);
  document.addEventListener("keydown", (e) => {
    if (!ov) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { const b = ov.querySelector(`.thf-nav[data-k="${e.key === "ArrowLeft" ? 0 : 1}"]`); if (b) b.click(); }
  });
})();
