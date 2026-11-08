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
/* LAB: the weather overview as one wide button (title, pattern pill, one-line summary); a tap opens a bubble with
   the full overview. The phone's back button, × or a tap outside closes it. */
(function () {
  const story = document.getElementById("story");
  if (!story) return;
  const ICON = '<svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13.5" fill="#e7f0fa"/><circle cx="11" cy="11" r="4.6" fill="#f6c343"/><g stroke="#f6c343" stroke-width="1.4" stroke-linecap="round"><path d="M11 3.6v1.8M11 16.6v1.8M3.6 11h1.8M16.6 11h1.8M5.8 5.8l1.2 1.2M15 15l1.2 1.2M5.8 16.2 7 15M15 7l1.2-1.2"/></g><path d="M10.5 21.5h10.2a3.6 3.6 0 0 0 .3-7.2 4.8 4.8 0 0 0-9.2 1.5 2.9 2.9 0 0 0-1.3 5.7z" fill="#fff" stroke="#b6c4d3" stroke-width=".8"/></svg>';
  let btn = null, ov = null;
  const build = () => {
    const sum = story.querySelector("summary"); if (!sum) return;
    const flags = [...story.querySelectorAll(".flags .tag")].map((t) => t.textContent.trim()).filter(Boolean);
    const line = (story.querySelector(".ov") || {}).textContent || "";
    if (!btn) { btn = document.createElement("button"); btn.type = "button"; btn.id = "wxbtn"; story.before(btn); btn.onclick = open; }
    btn.innerHTML = `${ICON}<span class="wx-t"><span class="wx-h"><b>Weather</b>${flags.map((f) => `<em class="${/santa|offshore|rain|storm|wind/i.test(f) ? "bad" : ""}">${f}</em>`).join("")}</span><small>${line}</small></span><i class="wx-go">›</i>`;
    btn.hidden = story.hidden;
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
    ov.innerHTML = `<div class="wxp-card" role="dialog" aria-label="Weather overview"><div class="wxp-hd">${ICON}<b>Weather overview</b><button type="button" class="wxp-x" aria-label="Close">×</button></div>
      <div class="wxp-line">${(story.querySelector(".ov") || {}).textContent || ""}</div>${list ? list.outerHTML : ""}${link ? link.outerHTML : ""}</div>`;
    document.body.appendChild(ov);
    /* the bubble hangs from the button when there is room below it, its notch pointing at the icon */
    const r = btn.getBoundingClientRect();
    if (r.bottom > 0 && r.bottom < innerHeight * 0.45) {
      ov.style.paddingTop = `${Math.round(r.bottom + 12)}px`;
      const card = ov.querySelector(".wxp-card"), cr = card.getBoundingClientRect();
      card.style.setProperty("--nx", `${Math.max(16, Math.round(r.left + 27 - cr.left))}px`);
    } else ov.classList.add("nonotch");
    document.documentElement.style.overflow = "hidden";
    history.pushState({ wx: 1 }, "");
    ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest(".wxp-x")) close(); });
  }
  document.addEventListener("keydown", (e) => { if (ov && e.key === "Escape") close(); });
  new MutationObserver(build).observe(story, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
  build();
})();
