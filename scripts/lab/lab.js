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
/* LAB: "How the score was made" — tight steps: the start (height, or the models' number), one line of what's fine,
   then each step that moved the number with its points, then the score. */
(function () {
  const CAT = [[/rain/i, "Rain"], [/sun|cloud/i, "Cloud"], [/gust/i, "Gusts"], [/launch|calm/i, "Launch wind"],
    [/offshore|LAX-DAG/i, "Offshore"], [/top of lift|aloft|over the back|NW|drift/i, "Wind aloft"], [/below .* ft/i, "Height"],
    [/blown out/i, "Wind"], [/season/i, "Season"], [/clean day/i, "Clean day"]];
  const nameOf = (t) => (CAT.find(([re]) => re.test(t)) || [, "Other"])[1];
  /* the rule's label, cut to its point: "offshore 4+ mph aloft: 2 at most" -> "4+ mph · max 2" */
  const short = (t) => String(t)
    .replace(/^offshore LAX-DAG (-?[\d.]+) mb.*/, (m, g) => `LAX–DAG ${g.replace("-", "−")} mb`)
    .replace(/^offshore (\d\+) mph below ([\d,]+) ft/, "$1 mph below $2 ft").replace(/^offshore (\d\+) mph aloft/, "$1 mph")
    .replace(/^wind 20–45° off launch/, "20–45° off").replace(/^wind more than 45° off launch/, "45°+ off")
    .replace(/^gusts over (\d+) mph/, "over $1 mph").replace(/^wind at top of lift over (\d+) mph/, "top of lift $1+ mph")
    .replace(/^little sun \(mid\/high cloud\)/, "less sun").replace(/^chance of rain.*/, "showers").replace(/^rain much of the window/, "much of the window")
    .replace(/^off season/, "off season").replace(/^a 5 needs a clean day/, "a 5 needs a clean day").replace(/^NW to N aloft/, "NW–N")
    .replace(/: no-go$/, " · no-go").replace(/: (\d) at most$/, " · max $1").replace(/: too windy$/, " · too windy");
  const track = (v, col) => `<span class="lg-tr"><i style="width:${((Math.max(1, Math.min(5, v)) - 1) / 4 * 100).toFixed(1)}%;background:${col}"></i></span>`;
  const r1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const pts = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}`;
  window.scoreLedger = (c, qv) => {
    const f = (k) => (c.factors || []).find((x) => x.k === k);
    const h = f("Height") || f("Thermal height"), w = f("Wind 1 pm"), a = f("Wind aloft");
    const cl = c.wstar != null && c.style !== "ridge" ? Math.max(0, (c.core || 1.4) * c.wstar - (c.sink || 1.1)) : null;
    const bp = c.base_parts, adj = c.adj || [];
    const base = c.base != null ? c.base : c.rating;
    const row = (cls, ic, name, val, why, p) => `<div class="lg-row ${cls}"><span class="lg-ic">${ic}</span><span class="lg-t"><b>${name}</b>${val ? ` <span class="lg-v">${val}</span>` : ""}${why ? ` <span class="lg-w">${why}</span>` : ""}</span><span class="lg-p">${p}</span></div>`;
    const W = { otb: "over the back", windy: "blown out", strong: "strong", light: "light", cross: "cross", gusty: "gusty" };
    const lwhy = (c.why || []).filter((x) => W[x]).map((x) => W[x]).join(", ");
    const STEP = {
      launch: ["Launch wind", w && w.v !== "–" ? w.v : "", lwhy],
      climb: ["Climb", cl != null ? `${cl.toFixed(1)} m/s` : "", "weak"],
      lowlift: ["Lift over launch", "", "thin"],
      offshore: ["Offshore", a && a.v !== "–" ? a.v : "", "in the flying layer"],
      aloft: ["Wind aloft", a && a.v !== "–" ? a.v : "", "strong"],
      gust: ["Gusts", "", "18+ mph"], storm: ["Storms", "", "overdevelopment"],
      xccap: ["No XC", "", "height counts as 3.4"], glass: ["Glass-off", "", "holds it up"],
      models: ["Model blend", "", ""], other: ["Other", "", ""],
    };
    /* what's fine: the inputs no step or rule touched, in one line */
    const touched = new Set([...(bp ? bp.steps.map(([k]) => STEP[k] && STEP[k][0]) : []), ...adj.map(([t]) => nameOf(t))]);
    const fine = [];
    if (cl != null && !touched.has("Climb")) fine.push(`climb ${cl.toFixed(1)} m/s`);
    if (w && w.v !== "–" && !touched.has("Launch wind") && !touched.has("Gusts") && (bp || w.q >= 0.4)) fine.push(`launch ${w.v}`);
    if (a && a.v !== "–" && !touched.has("Wind aloft") && !touched.has("Offshore") && a.q >= 0.4) fine.push(`aloft ${a.v}`);
    if (c.rain_p != null && c.rain_p < 0.3 && !touched.has("Rain")) fine.push(c.rain_p < 0.05 ? "dry" : `${Math.round(c.rain_p * 100)}% rain`);
    if (c.cloud && !touched.has("Cloud")) fine.push(c.cloud.okta ? `cloud ${c.cloud.okta}/8` : "sunny");
    const out = [];
    if (bp) out.push(row("lg-base", "", "Height", h ? h.v : "", "", `<b>${r1(bp.lv)}</b>`));
    else {
      const mods = Object.entries(c.models || {}).map(([m, v]) => `${m} ${r1(v).replace(".0", "")}`).join(" · ");
      out.push(row("lg-base", "", c.style === "ridge" ? "Ridge lift" : "Models", c.style === "ridge" && w ? w.v : "", c.style === "ridge" ? "" : mods, `<b>${r1(base)}</b>`));
    }
    if (fine.length) out.push(row("lg-good", "✓", "", fine.join(" · "), "", ""));
    if (bp) for (const [k, v] of bp.steps) { const [n, val, why] = STEP[k] || [k, "", ""]; out.push(row(v < 0 ? "lg-bad" : "lg-plus", v < 0 ? "−" : "+", n, val, why, pts(v))); }
    else if (!bp && w && w.q < 0.4) out.push(row("lg-soft", "−", c.style === "ridge" ? "Wind" : "Launch wind", "", "light or cross (already in the start)", ""));
    for (const [t, v] of adj) out.push(row("lg-bad", "−", nameOf(t), "", short(t), pts(v)));
    out.push(row("lg-total", "=", "Score", "", "", `<b>${r1(c.rating)}</b>`));
    return `<div class="dsec lg"><span class="dh">How the score was made</span><div class="lg-list">${out.join("")}</div>${track(c.rating, qv(c.rating))}</div>`;
  };
})();
/* LAB: tap the thermal panel to see it full screen, turned to landscape on a phone held upright; × closes.
   A big headline (day, date, region) and ‹ › buttons step to the day before / after, staying full screen. */
(function () {
  let ov = null;
  const close = (fromBack) => {
    if (!ov) return;
    ov.remove(); ov = null; document.documentElement.style.overflow = "";
    if (!fromBack && history.state && history.state.thf) history.back();   // drop the entry the popup added
  };
  window.addEventListener("popstate", () => { if (ov) close(true); });
  const open = (therm, swap) => {
    const svg = therm.querySelector("svg"); if (!svg) return;
    if (ov) { ov.remove(); ov = null; }
    if (!swap) history.pushState({ thf: 1 }, "");   // the phone's back button closes the popup
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
        if (again) open(again, true); else close();
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
