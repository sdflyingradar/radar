/* Admin: the visitor numbers (data/stats.json, pulled from GoatCounter by the stats workflow) in a compact sheet:
   key figures, visits per day, how long people stay and how far they go into the radar. */
(function () {
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const RADAR = ["/radar", "/radar/", "/radar/index.html"];
  const PAGES = { "/radar/how.html": "Read “What this is”", "/radar/sounding.html": "Opened the sounding", "/radar/lax-dag.html": "Opened the pressure map", "/radar/regions.html": "Opened the SkyGram page" };
  const DEEP = [["do-site", "Opened a site"], ["do-skygram", "Used the SkyGram"], ["do-day", "Looked at another day"], ["do-trips", "Opened trips"]];
  const STAY = [["stay-15s", "15 s+"], ["stay-30s", "30 s+"], ["stay-1m", "1 min+"], ["stay-3m", "over 3 min"]];
  const WD = "SMTWTFS";

  function timeline(daily, app) {
    if (!daily || !daily.length) return "";
    const n = daily.length, W = 340, H = 64, top = 12, bw = W / n, mx = Math.max(1, ...daily.map((d) => d.n));
    const lab = n <= 14, f = (v) => v.toFixed(1);
    const bars = daily.map((d, i) => {
      const x = i * bw + bw * 0.14, w = bw * 0.72, h = d.n / mx * H, a = Math.min(d.n, app[d.day] || 0) / mx * H;
      const wd = new Date(d.day + "T12:00").getDay(), last = i === n - 1;
      return `<g><title>${esc(d.day)}: ${d.n} visits${app[d.day] ? `, ${app[d.day]} from the home screen` : ""}</title>
        <rect x="${f(x)}" y="${f(top + H - Math.max(h, d.n ? 2 : 1))}" width="${f(w)}" height="${f(Math.max(h, d.n ? 2 : 1))}" rx="3" fill="${d.n ? (last ? "#2b7fd8" : "#9cc3ee") : "#eef0f3"}"/>
        ${a ? `<rect x="${f(x)}" y="${f(top + H - a)}" width="${f(w)}" height="${f(a)}" rx="3" fill="#174f8f"/>` : ""}
        ${lab && d.n ? `<text x="${f(x + w / 2)}" y="${f(top + H - h - 3)}" text-anchor="middle" class="stv">${d.n}</text>` : ""}
        ${lab || wd === 1 ? `<text x="${f(x + w / 2)}" y="${top + H + 12}" text-anchor="middle" class="sta${last ? " now" : ""}">${lab ? WD[wd] : esc(d.day.slice(5).replace("-", "/"))}</text>` : ""}</g>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${top + H + 16}" class="stb">${bars}</svg>
      <div class="stl"><span><i style="background:#9cc3ee"></i>visits</span><span><i style="background:#174f8f"></i>from the home screen</span></div>`;
  }

  /* a row with a thin bar: label, share of radar visitors, count */
  const meter = (label, c, base) => {
    const p = base ? Math.min(100, Math.round(c / base * 100)) : 0;
    return `<div class="stm"><span>${esc(label)}</span><span class="stmb"><i style="width:${p}%"></i></span><b>${base ? p + "%" : c}</b></div>`;
  };
  const chips = (title, rows) => rows && rows.length ? `<div class="stc"><span>${title}</span>${rows.map((r) => `<em>${esc(r.name)} <b>${r.count}</b></em>`).join("")}</div>` : "";

  async function open(ev) {
    ev.preventDefault();
    let S = null;
    try { S = await (await fetch(`data/stats.json?t=${Date.now()}`, { cache: "no-store" })).json(); } catch (e) {}
    let d = document.getElementById("statsDlg");
    if (!d) { d = document.createElement("dialog"); d.id = "statsDlg"; document.body.appendChild(d); d.addEventListener("click", (e) => { if (e.target === d) d.close(); }); }
    const full = `<a href="https://sdflyingradar.goatcounter.com" target="_blank" rel="noopener">GoatCounter ›</a>`;
    const close = `<button class="stx" aria-label="Close" autofocus>✕</button>`;
    if (!S) d.innerHTML = `<div class="stw"><div class="sth"><h3>Visits</h3>${close}</div><p>No numbers yet: the stats update runs every 3 hours.</p>${full}</div>`;
    else {
      const P = S.pages || [], by = (path) => P.filter((p) => p.path === path).reduce((a, p) => a + p.count, 0);
      const app = (P.find((p) => p.path === "app-open") || {}).days || {};
      const radar = RADAR.reduce((a, p) => a + by(p), 0);
      const stays = STAY.filter(([p]) => by(p)), deep = [...DEEP.map(([p, l]) => [l, by(p)]), ...Object.entries(PAGES).map(([p, l]) => [l, by(p)])].filter((r) => r[1]).sort((a, b) => b[1] - a[1]);
      const k = (o) => (o ? o.visits : "–"), upd = (S.generated || "").slice(11, 16);
      const updLocal = S.generated ? new Date(S.generated.replace("Z", ":00Z")).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : upd;
      const installs = by("install"), opens = by("app-open");
      d.innerHTML = `<div class="stw">
        <div class="sth"><h3>Visits</h3><small>updated ${esc(updLocal)}</small>${close}</div>
        <div class="stk"><div><b>${k(S.today)}</b>today</div><div><b>${k(S.week)}</b>7 days</div><div><b>${k(S.month)}</b>30 days</div>${installs || opens ? `<div><b>${installs}</b>installs</div>` : ""}</div>
        ${timeline(S.daily, app)}
        <h4>How long they stay <small>of ${radar} radar visitors</small></h4>
        ${stays.length ? STAY.map(([p, l]) => meter(l, by(p), radar)).join("") : `<p class="stn">Counting since Nov 19: shows up with the next update.</p>`}
        <h4>How far they go</h4>
        ${deep.length ? deep.map(([l, c]) => meter(l, c, radar)).join("") : `<p class="stn">Counting since Nov 19: shows up with the next update.</p>`}
        ${chips("From", (S.refs || []).filter((r) => !/sdflyingradar/.test(r.name)).slice(0, 5))}${chips("Screens", S.sizes || [])}${chips("Where", (S.locations || []).slice(0, 5))}
        <p class="stf">Last 30 days. A visit: a person opening a page, once in 8 hours; % of radar visitors. ${full}</p></div>`;
    }
    d.querySelector(".stx").onclick = () => d.close();
    d.showModal();
  }
  document.addEventListener("click", (e) => { const a = e.target.closest("#statsLink"); if (a) open(e); });
  const css = document.createElement("style");
  css.textContent = `#statsDlg{border:none;border-radius:16px;padding:0;max-width:min(400px,94vw);width:100%;max-height:88vh;box-shadow:0 12px 40px rgba(16,24,40,.22)}
  #statsDlg::backdrop{background:rgba(16,24,40,.35);backdrop-filter:blur(2px)}
  .stw{padding:14px 16px 12px;font:inherit;font-size:.86rem;color:#1f2328}
  .sth{display:flex;align-items:baseline;gap:8px;margin-bottom:10px} .sth h3{margin:0;font-size:1.05rem;font-family:inherit} .sth small{color:#98a2b3;flex:1}
  .stx{border:0;background:#f2f4f7;border-radius:50%;width:28px;height:28px;font-size:.85rem;cursor:pointer;color:#475467;align-self:center} .stx:focus{outline:none}
  .stk{display:flex;gap:6px;margin-bottom:8px} .stk div{flex:1;background:#f6f8fb;border-radius:10px;padding:6px 4px;text-align:center;color:#667085;font-size:.72rem;line-height:1.15}
  .stk b{display:block;font-size:1.25rem;color:#1f2328;font-variant-numeric:tabular-nums}
  .stb{width:100%;height:auto;display:block} .stv{font-size:9px;fill:#475467;font-variant-numeric:tabular-nums} .sta{font-size:9px;fill:#98a2b3} .sta.now{fill:#2b7fd8;font-weight:600}
  .stl{display:flex;gap:12px;font-size:.7rem;color:#98a2b3;margin:2px 0 4px} .stl i{display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:4px;vertical-align:0}
  .stw h4{margin:12px 0 4px;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#667085} .stw h4 small{text-transform:none;letter-spacing:0;color:#98a2b3;font-weight:400}
  .stm{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr) 2.6em;gap:8px;align-items:center;padding:2px 0}
  .stmb{height:6px;background:#eef0f3;border-radius:3px;overflow:hidden} .stmb i{display:block;height:100%;background:#2b7fd8;border-radius:3px}
  .stm b{text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#344054}
  .stn{color:#98a2b3;margin:2px 0;font-size:.8rem}
  .stc{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:8px} .stc span{font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:#667085;margin-right:2px}
  .stc em{font-style:normal;background:#f6f8fb;border-radius:999px;padding:2px 8px;font-size:.78rem;color:#344054} .stc em b{font-weight:600}
  .stf{color:#98a2b3;font-size:.72rem;margin:12px 0 0} .stw a{color:#2b7fd8;text-decoration:none} .stw a:focus{outline:none}`;
  document.head.appendChild(css);
})();
