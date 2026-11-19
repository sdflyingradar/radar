/* Admin: the visitor numbers (data/stats.json, pulled from GoatCounter by the stats workflow) in a sheet. */
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const NAMES = { "/radar": "Radar", "/radar/": "Radar", "/radar/index.html": "Radar", "/radar/how.html": "What this is", "/radar/regions.html": "SkyGram",
    "/radar/sounding.html": "Sounding", "/radar/lax-dag.html": "Pressure map", "install": "Added to home screen", "app-open": "Opened from home screen" };
  const nm = (p) => NAMES[p.path] || p.title || p.path;
  function bars(daily) {
    if (!daily || !daily.length) return "";
    const W = 320, H = 70, n = daily.length, mx = Math.max(1, ...daily.map((d) => d.n)), bw = W / n;
    return `<svg viewBox="0 0 ${W} ${H + 14}" class="stb">${daily.map((d, i) => { const h = Math.round(d.n / mx * H); return `<rect x="${(i * bw + 1).toFixed(1)}" y="${H - h}" width="${(bw - 2).toFixed(1)}" height="${h}" rx="1.5" fill="#2b7fd8"><title>${esc(d.day)}: ${d.n}</title></rect>`; }).join("")}
      <text x="0" y="${H + 12}" font-size="9" fill="#98a2b3">${esc((daily[0].day || "").slice(5))}</text><text x="${W}" y="${H + 12}" font-size="9" fill="#98a2b3" text-anchor="end">today</text><text x="0" y="9" font-size="9" fill="#98a2b3">max ${mx}/day</text></svg>`;
  }
  const list = (title, rows) => rows && rows.length ? `<h4>${title}</h4><table>${rows.map((r) => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td></tr>`).join("")}</table>` : "";
  async function open(ev) {
    ev.preventDefault();
    let S = null;
    try { S = await (await fetch(`data/stats.json?t=${Date.now()}`, { cache: "no-store" })).json(); } catch (e) {}
    let d = document.getElementById("statsDlg");
    if (!d) { d = document.createElement("dialog"); d.id = "statsDlg"; document.body.appendChild(d); d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); }
    const full = `<a href="https://sdflyingradar.goatcounter.com" target="_blank" rel="noopener">Full stats on GoatCounter ›</a>`;
    if (!S) d.innerHTML = `<div class="stw"><h3>Visitors</h3><p>No numbers yet: the stats update runs every 3 hours once the GoatCounter key is set up.</p>${full}<button class="stx" autofocus>Close</button></div>`;
    else {
      const merge = (arr) => { const m = new Map(); arr.forEach((p) => m.set(nm(p), (m.get(nm(p)) || 0) + p.count)); return [...m].map(([n, c]) => ({ n, c })).sort((a, b) => b.c - a.c); };
      const pages = merge((S.pages || []).filter((p) => !p.event)), evs = merge((S.pages || []).filter((p) => p.event));
      const k = (o) => (o ? o.visits : "–");
      d.innerHTML = `<div class="stw"><h3>Visitors</h3>
        <div class="stk"><div><b>${k(S.today)}</b><small>today</small></div><div><b>${k(S.week)}</b><small>7 days</small></div><div><b>${k(S.month)}</b><small>30 days</small></div></div>
        ${bars(S.daily)}
        ${list("Pages (30 days)", pages.slice(0, 8).map((p) => [p.n, p.c]))}
        ${list("App", evs.map((p) => [p.n, p.c]))}
        ${list("From", (S.refs || []).slice(0, 6).map((r) => [r.name, r.count]))}
        ${list("Screens", (S.sizes || []).map((r) => [r.name, r.count]))}
        ${list("Where", (S.locations || []).slice(0, 6).map((r) => [r.name, r.count]))}
        <p class="stf">Updated ${esc((S.generated || "").replace("T", " ").replace("Z", " UTC"))} · ${full}</p><button class="stx" autofocus>Close</button></div>`;
    }
    d.querySelector(".stx").onclick = () => d.close();
    d.showModal();
  }
  document.addEventListener("click", (e) => { const a = e.target.closest("#statsLink"); if (a) open(e); });
  const css = document.createElement("style");
  css.textContent = `#statsDlg{border:none;border-radius:14px;padding:0;max-width:min(420px,94vw);width:100%;box-shadow:0 10px 40px rgba(0,0,0,.25)}
  #statsDlg::backdrop{background:rgba(16,24,40,.35)} .stw{padding:16px 18px;font-size:.9rem;color:#1f2328}
  .stw{font-family:inherit} .stw h3{margin:0 0 10px;font-size:1.05rem;font-family:inherit} .stw a:focus{outline:none} .stw h4{margin:14px 0 4px;font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;color:#667085}
  .stk{display:flex;gap:8px;margin-bottom:10px} .stk div{flex:1;background:#f6f7f9;border-radius:10px;padding:8px;text-align:center}
  .stk b{display:block;font-size:1.5rem} .stk small{color:#667085} .stb{width:100%;height:auto;display:block}
  .stw table{width:100%;border-collapse:collapse} .stw td{padding:3px 0;border-bottom:1px solid #eef0f3} .stw td:last-child{text-align:right;font-variant-numeric:tabular-nums;color:#344054}
  .stf{color:#667085;font-size:.78rem;margin:12px 0 8px} .stx{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:6px 14px;font:inherit;cursor:pointer}`;
  document.head.appendChild(css);
})();
