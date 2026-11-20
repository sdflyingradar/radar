/* Visit counts (GoatCounter: no cookies, nothing personal). Not counted: the pages shown inside the radar (?embed),
   the admin view, the lab copy and local previews. Also counts when someone adds the radar to their home screen
   ("install") and opens it from there ("app-open"). */
(function () {
  const q = location.search, h = location.hostname;
  if (/[?&](embed|admin)\b/.test(q) || /lab\.html$/.test(location.pathname) || !/github\.io$/.test(h)) return;
  const s = document.createElement("script");
  s.async = true; s.src = "https://gc.zgo.at/count.js"; s.dataset.goatcounter = "https://sdflyingradar.goatcounter.com/count";
  document.head.appendChild(s);
  const ev = (path, title) => { const go = () => window.goatcounter && window.goatcounter.count ? window.goatcounter.count({ path, title, event: true }) : setTimeout(go, 1500); go(); };
  window.addEventListener("appinstalled", () => ev("install", "Added to home screen"));
  if (matchMedia("(display-mode: standalone)").matches || navigator.standalone) ev("app-open", "Opened from home screen");
  /* On the radar page only: how long people stay (time with the page on screen, counted once when it passes
     15 s, 30 s, 1 min, 3 min) and how far they go (opening a site, the SkyGram, another day, the trips).
     GoatCounter counts each of these at most once per visitor in 8 hours. */
  if (!/(\/|index\.html)$/.test(location.pathname)) return;
  const sent = new Set(), once = (p, t) => { if (!sent.has(p)) { sent.add(p); ev(p, t); } };
  let seen = 0, t0 = document.visibilityState === "visible" ? Date.now() : 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") { t0 = Date.now(); once("stay-start", "Timed visit"); } else if (t0) { seen += Date.now() - t0; t0 = 0; }
  });
  if (t0) once("stay-start", "Timed visit");   // the visits whose time is measured: the base for the stay shares
  const STAY = [[15, "stay-15s", "Stayed 15 s+"], [30, "stay-30s", "Stayed 30 s+"], [60, "stay-1m", "Stayed 1 min+"], [180, "stay-3m", "Stayed 3 min+"]];
  const tick = setInterval(() => {
    const s = (seen + (t0 ? Date.now() - t0 : 0)) / 1000;
    STAY.forEach(([n, p, t]) => { if (s >= n) once(p, t); });
    if (sent.has("stay-3m")) clearInterval(tick);
  }, 5000);
  const DO = [["[data-site], .ds", "do-site", "Opened a site"], [".therm, .dtsw, .thf-nav", "do-skygram", "Used the SkyGram"],
    [".tnb[data-jump], details.day[data-date] > summary", "do-day", "Looked at another day"], [".tripbtn", "do-trips", "Opened trips"]];
  let firstDay = true;
  document.addEventListener("click", (e) => {
    if (!e.target.closest) return;
    for (const [sel, p, t] of DO) if (e.target.closest(sel)) {
      if (p === "do-day" && e.target.closest("summary") && firstDay) { firstDay = false; continue; }   // opening the first day card is just looking
      once(p, t);
    }
  }, true);
})();
