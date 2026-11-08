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
})();

/* LAB, phone: only three SD mountain sites on the first layer (still always Little Black or Blossom) */
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

/* LAB, computer: every day stays open (no second step); a click on the day's header does not close it */
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
