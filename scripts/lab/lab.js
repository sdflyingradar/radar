/* LAB bar: the thermal chart (classic / the new detailed one); a link to the regions page with the same chart */
(function () {
  const CH = [["classic", "Classic"], ["new", "Detailed"]];
  let ch = (() => { try { return localStorage.getItem("labChart"); } catch (e) { return null; } })() || "new";
  const orig = window.panelSVG;
  const apply = () => {
    if (typeof panel2SVG === "function" && orig) window.panelSVG = ch === "new" ? panel2SVG : orig;
    document.querySelectorAll("#labbar button[data-ch]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ch === ch)));
    const a = document.querySelector("#labbar a"); if (a) a.href = `regions.html${ch === "new" ? "?chart=new" : ""}`;
  };
  const bar = document.createElement("div");
  bar.id = "labbar";
  bar.innerHTML = "<b>LAB</b><span>chart</span>" + CH.map(([k, n]) => `<button type="button" data-ch="${k}">${n}</button>`).join("") + '<a href="regions.html?chart=new">maps ›</a>';
  document.body.appendChild(bar);
  bar.onclick = (e) => {
    const b = e.target.closest("button[data-ch]"); if (!b) return;
    ch = b.dataset.ch;
    try { localStorage.setItem("labChart", ch); } catch (err) {}
    apply();
    /* redraw an open thermal panel with the chosen chart */
    document.querySelectorAll('.srow[aria-expanded="true"]').forEach((x) => { x.click(); x.click(); });
  };
  apply();
})();
