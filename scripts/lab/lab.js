/* LAB: layout switcher for the opened day (list = today's page, grid = 2-3 columns, tiles = compact like the first layer) */
(function () {
  const LAYS = [["list", "List"], ["grid", "Grid"], ["tiles", "Tiles"]];
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
