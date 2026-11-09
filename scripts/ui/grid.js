/* Opened day in the grid: where a site's third level goes (after the last tile of its row, full width; under the
   site in the list layout), the pills-to-tiles morph, the score steps and the full-screen thermal panel. */
(function () {
  /* the close tab: closes the open site (as tapping its tile again) */
  document.addEventListener("click", (e) => {
    const x = e.target.closest(".det > .detx"); if (!x) return;
    e.stopPropagation();
    const day = x.closest("details.day"), row = day && day.querySelector('.srow[aria-expanded="true"]');
    if (row) row.click(); else x.closest(".det").hidden = true;
  }, true);
  window.labPlace = (b, det) => {
    const y0 = b.getBoundingClientRect().top;
    const wasShown = !det.hidden;
    det.hidden = true;                       // measure the rows without the old detail in the way
    if (document.documentElement.dataset.lay === "list") { b.after(det); }
    else {
      let last = b, n = b.nextElementSibling;
      while (n && n.classList.contains("srow") && Math.abs(n.offsetTop - b.offsetTop) < 4) { last = n; n = n.nextElementSibling; }
      last.after(det);
      const L = b.parentElement.getBoundingClientRect(), r = b.getBoundingClientRect();
      det.style.setProperty("--ax", `${Math.round(r.left - L.left + Math.min(r.width / 2, 48))}px`);
    }
    /* a close tab on the detail's upper rim, in the site's colour, right under its tile (chevron up) */
    if (!det.querySelector(":scope > .detx")) {
      const x = document.createElement("button");
      x.type = "button"; x.className = "detx"; x.setAttribute("aria-label", "Close");
      x.innerHTML = '<svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 6.2 6 2 10.5 6.2" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      det.prepend(x);
    }
    det.style.setProperty("--rc", getComputedStyle(b).getPropertyValue("--rc"));
    det.classList.remove("lab-in"); void det.offsetWidth; det.classList.add("lab-in");
    /* keep the tapped tile where the finger is when another detail above it closes */
    requestAnimationFrame(() => {
      const dy = b.getBoundingClientRect().top - y0;
      if (wasShown && Math.abs(dy) > 2) window.scrollBy({ top: dy, behavior: "instant" });
    });
  };
})();
/* opening a day in grid/tiles: each first-layer pill flies into its tile, the other tiles fade in after */
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
/* long names break after a slash, not mid-word (Laguna/Horse/Fuzz) */
(function () {
  const fix = () => document.querySelectorAll(".list .srow .nm").forEach((n) => {
    if (n.textContent.includes("/") && !n.textContent.includes("/​")) n.textContent = n.textContent.replace(/\//g, "/​");
  });
  const days = document.getElementById("days");
  if (days) new MutationObserver(fix).observe(days, { childList: true });
  fix();
})();
/* "How the score was made" — tight steps: the start (height, or the models' number), one line of what's fine,
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
    .replace(/^crosswind, up to 20° outside the launch window/, "crosswind").replace(/^wind from behind, 20°\+ outside the launch window/, "from behind").replace(/^wind at the edge of the launch window/, "edge of window")
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
      weakclimb: ["Climb", "", "under 1 m/s · height max 3.4"], glass: ["Glass-off", "", "holds it up"],
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
    const DIRS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    if (bp) for (const [k, v, who] of bp.steps) {
      let [n, val, why] = STEP[k] || [k, "", ""];
      /* a step only some models give: name them, with their own wind aloft (the blended wind would hide it) */
      if (who && who.length) {
        val = who.map(([m, w]) => `${m}${(k === "offshore" || k === "aloft") && w ? ` ${DIRS[Math.round(w[0] / 22.5) % 16]} ${w[1]}` : ""}`).join(", ");
        why = `${why ? why + " · " : ""}${who.length === 1 ? "one model" : "some models"}`;
      }
      out.push(row(v < 0 ? "lg-bad" : "lg-plus", v < 0 ? "−" : "+", n, val, why, pts(v)));
    }
    else if (!bp && w && w.q < 0.4) out.push(row("lg-soft", "−", c.style === "ridge" ? "Wind" : "Launch wind", "", "light or cross (already in the start)", ""));
    for (const [t, v] of adj) out.push(row("lg-bad", "−", nameOf(t), "", short(t), pts(v)));
    out.push(row("lg-total", "=", "Score", "", "", `<b>${r1(c.rating)}</b>`));
    return `<div class="dsec lg"><span class="dh">How the score was made</span><div class="lg-list">${out.join("")}</div>${track(c.rating, qv(c.rating))}</div>`;
  };
})();
/* tap the thermal panel to see it full screen, turned to landscape on a phone held upright; × closes.
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
    /* big side buttons: a tall strip left and right of the chart with an arrow and the day it goes to */
    const btn = (b, k) => b ? `<button type="button" class="thf-nav thf-${k ? "next" : "prev"}" data-k="${k}"${b.disabled ? " disabled" : ""} aria-label="${k ? "Next" : "Previous"} day"><i>${k ? "›" : "‹"}</i><span>${b.textContent.replace(/[‹›]/g, "").trim()}</span></button>` : "<span></span>";
    ov = document.createElement("div");
    ov.id = "thfull";
    ov.innerHTML = `<div class="thf-in"><div class="thf-hd"><div class="thf-t"><b>${dn} <span>${dt}</span></b><small>${region}</small></div><button type="button" class="thf-x" aria-label="Close"><svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M2.5 2.5 L11.5 11.5 M11.5 2.5 L2.5 11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div><div class="thf-body">${btn(nb[0], 0)}<div class="thf-svg"></div>${btn(nb[1], 1)}</div></div>`;
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

/* The weather overview as a small tile next to Sounding and LAX-DAG: just the main thing now (Santa Ana,
   ridge, front, ...); a tap opens a bubble with the full overview. Back, × or a tap outside closes it. */
(function () {
  const story = document.getElementById("story");
  if (!story) return;
  const ICON = '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13.5" fill="#e7f0fa"/><circle cx="11" cy="11" r="4.6" fill="#f6c343"/><g stroke="#f6c343" stroke-width="1.4" stroke-linecap="round"><path d="M11 3.6v1.8M11 16.6v1.8M3.6 11h1.8M16.6 11h1.8M5.8 5.8l1.2 1.2M15 15l1.2 1.2M5.8 16.2 7 15M15 7l1.2-1.2"/></g><path d="M10.5 21.5h10.2a3.6 3.6 0 0 0 .3-7.2 4.8 4.8 0 0 0-9.2 1.5 2.9 2.9 0 0 0-1.3 5.7z" fill="#fff" stroke="#b6c4d3" stroke-width=".8"/></svg>';
  let tile = null, ov = null;
  /* the main thing now: the overview's pattern flag ("Offshore / Santa Ana" -> "Santa Ana"), else the first word of its line */
  const mainNow = () => {
    const f = (story.querySelector(".flags .tag") || {}).textContent || "";
    if (f.trim()) return f.split("/").pop().trim();
    const line = ((story.querySelector(".ov") || {}).textContent || "").split("·")[0].replace(/\b(now|today|through \w+)\b/gi, "").trim();
    return line ? line[0].toUpperCase() + line.slice(1) : "overview";
  };
  const build = () => {
    const row = document.getElementById("assets");
    if (!row || !story.querySelector("summary")) return;
    if (!tile || !row.contains(tile)) {
      tile = document.createElement("button"); tile.type = "button"; tile.className = "asset wx"; tile.onclick = open;
      row.prepend(tile);
    }
    const m = mainNow();
    const html = `${ICON}<span><b>Weather</b><small class="${/santa|offshore|front|rain|storm|wind/i.test(m) ? "sa" : ""}">${m}</small></span>`;
    if (tile.dataset.k !== m) { tile.dataset.k = m; tile.innerHTML = html; }   // only when it changed (no observer loop)
  };
  const close = (fromBack) => {
    if (!ov) return;
    ov.remove(); ov = null; document.documentElement.style.overflow = "";
    if (!fromBack && history.state && history.state.wx) history.back();
  };
  window.addEventListener("popstate", () => { if (ov) close(true); });
  function open() {
    const list = story.querySelector(".wlist"), link = story.querySelector(".wlink");
    ov = document.createElement("div");
    ov.id = "wxpop";
    ov.innerHTML = `<div class="wxp-card" role="dialog" aria-label="Weather overview"><div class="wxp-hd">${ICON}<b>Weather overview</b><button type="button" class="wxp-x" aria-label="Close"><svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M2.5 2.5 L11.5 11.5 M11.5 2.5 L2.5 11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
      <div class="wxp-line">${(story.querySelector(".ov") || {}).textContent || ""}</div>${list ? list.outerHTML : ""}${link ? link.outerHTML : ""}</div>`;
    document.body.appendChild(ov);
    const r = tile.getBoundingClientRect();
    if (r.bottom > 0 && r.bottom < innerHeight * 0.5) {
      ov.style.paddingTop = `${Math.round(r.bottom + 12)}px`;
      const card = ov.querySelector(".wxp-card"), cr = card.getBoundingClientRect();
      card.style.setProperty("--nx", `${Math.max(16, Math.round(r.left + 22 - cr.left))}px`);
    } else ov.classList.add("nonotch");
    document.documentElement.style.overflow = "hidden";
    history.pushState({ wx: 1 }, "");
    ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest(".wxp-x")) close(); });
  }
  document.addEventListener("keydown", (e) => { if (ov && e.key === "Escape") close(); });
  new MutationObserver(build).observe(document.querySelector(".wrap") || document.body, { childList: true, subtree: true });
  build();
})();

/* Sounding and LAX–DAG open as a popup over the radar in the same style as the weather popup: a white card
   hanging from its button with a notch, the page inside (loaded with ?embed, no header) at its full height, the
   overlay scrolls. Back, the X, Escape or a tap outside close it. Miramar / Edwards switch inside the popup. */
(function () {
  let ov = null, timer = null;
  const X = '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M2.5 2.5 L11.5 11.5 M11.5 2.5 L2.5 11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const close = (fromBack) => {
    if (!ov) return;
    clearInterval(timer); ov.remove(); ov = null; document.documentElement.style.overflow = "";
    if (!fromBack && history.state && history.state.pg) history.back();
  };
  window.addEventListener("popstate", () => { if (ov) close(true); });
  document.addEventListener("keydown", (e) => { if (ov && e.key === "Escape") close(); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('#assets a.asset[href="sounding.html"], #assets a.asset[href="lax-dag.html"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    const href = a.getAttribute("href"), title = (a.querySelector("b") || {}).textContent || "", ic = a.querySelector("svg");
    ov = document.createElement("div");
    ov.id = "wxpop";
    ov.className = "pgp";
    ov.innerHTML = `<div class="wxp-card" role="dialog" aria-label="${title}"><div class="wxp-hd">${ic ? ic.outerHTML : ""}<b>${title}</b>`
      + `<button type="button" class="wxp-x" aria-label="Close">${X}</button></div>`
      + `<iframe src="${href}?embed=1&t=${Date.now()}" title="${title}" scrolling="no"></iframe></div>`;
    document.body.appendChild(ov);
    const r = a.getBoundingClientRect();
    if (r.bottom > 0 && r.bottom < innerHeight * 0.5) {
      ov.style.paddingTop = `${Math.round(r.bottom + 12)}px`;
      const card = ov.querySelector(".wxp-card"), cr = card.getBoundingClientRect();
      card.style.setProperty("--nx", `${Math.max(16, Math.round(r.left + r.width / 2 - cr.left))}px`);
    } else ov.classList.add("nonotch");
    /* the page inside at its full height, so the popup scrolls like the weather one */
    const fr = ov.querySelector("iframe");
    const fit = () => { try { const h = fr.contentDocument.documentElement.scrollHeight; if (h && Math.abs(h - fr.offsetHeight) > 2) fr.style.height = `${h}px`; } catch (err) {} };
    fr.addEventListener("load", fit);
    timer = setInterval(fit, 400);
    document.documentElement.style.overflow = "hidden";
    history.pushState({ pg: 1 }, "");
    ov.addEventListener("click", (ev) => { if (ev.target === ov || ev.target.closest(".wxp-x")) close(); });
  });
})();
