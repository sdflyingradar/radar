/* phone: only three SD mountain sites on the first layer (still always Little Black or Blossom) */
(function () {
  const phone = () => window.matchMedia("(max-width: 640px)").matches;
  const HOME = /^(Little Black|Blossom)$/;
  const trim = () => {
    document.querySelectorAll("details.day[data-date] > summary .sum").forEach((sum) => {
      const kids = [...sum.children];
      const g2 = kids.findIndex((k, i) => i > 0 && k.classList.contains("sgrp"));
      const mtn = kids.slice(1, g2 < 0 ? kids.length : g2).filter((k) => k.classList.contains("sc"));
      mtn.forEach((p) => { p.hidden = false; });
      if (!phone() || mtn.length <= 3) return;
      const name = (p) => ((p.querySelector("b") || p).textContent || "").trim();
      const keep = mtn.slice(0, 3);
      if (!keep.some((p) => HOME.test(name(p)))) {
        const home = mtn.find((p) => HOME.test(name(p)));
        if (home) keep[2] = home;
      }
      mtn.forEach((p) => { if (!keep.includes(p)) p.hidden = true; });
    });
  };
  const days = document.getElementById("days");
  if (days) new MutationObserver(trim).observe(days, { childList: true });
  window.addEventListener("resize", trim);
  trim();
})();

/* computer: every day stays open (no second step); a click on the day's header does not close it */
(function () {
  const wide = () => window.matchMedia("(min-width: 900px)").matches;
  const openAll = () => { if (wide()) document.querySelectorAll("details.day[data-date]:not([open])").forEach((d) => { d.open = true; }); };
  document.addEventListener("click", (e) => {
    if (wide() && e.target.closest("details.day[data-date] > summary")) e.preventDefault();
  }, true);
  const days = document.getElementById("days");
  if (days) new MutationObserver(openAll).observe(days, { childList: true });
  window.addEventListener("resize", openAll);
  openAll();
})();

/* computer: the COAST label on the line in front of Torrey's tile */
(function () {
  const add = () => document.querySelectorAll('.list .srow[data-site="torrey"]').forEach((t) => {
    if (!t.querySelector(":scope > .coastlbl")) { const s = document.createElement("span"); s.className = "coastlbl"; s.textContent = "COAST"; t.appendChild(s); }
  });
  const days = document.getElementById("days");
  if (days) new MutationObserver(add).observe(days, { childList: true });
  add();
})();

/* computer: shorter words on the tiles so name and verdict fit one line (Laguna/Horse, XC) */
(function () {
  const wide = () => window.matchMedia("(min-width: 900px)").matches;
  const fix = () => {
    if (!wide()) return;
    document.querySelectorAll('.list .srow[data-site="lagunahorse"] .nm').forEach((n) => { if (/Fuzz/.test(n.textContent)) n.textContent = n.textContent.replace(/\/​?Fuzz/, ""); });
    document.querySelectorAll(".list .srow .nmw .lab").forEach((l) => { if (l.textContent.trim() === "Cross-country") l.textContent = "XC"; });
  };
  const days = document.getElementById("days");
  if (days) new MutationObserver(fix).observe(days, { childList: true });
  fix();
})();

/* the tiny model line on one row: "HRRR · RRFS · 12:00 pm" */
(function () {
  const fix = () => document.querySelectorAll("details.day[data-date] > summary .band .mods").forEach((m) => {
    if (m.querySelector("br")) m.innerHTML = m.innerHTML.replace(/<br\s*\/?>/g, " · ");
  });
  const days = document.getElementById("days");
  if (days) new MutationObserver(fix).observe(days, { childList: true });
  fix();
})();
