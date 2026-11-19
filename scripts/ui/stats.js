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
})();
