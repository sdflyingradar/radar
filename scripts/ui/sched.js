/* A tiny timeline of the day's update runs at the bottom of the radar: forecast, therm charts (the region run) and the
   balloon, each in its own thin lane. Filled dots: when an update actually landed today (data/runs/*.json, written by
   each run). Open dots: the runs still to come. A faint dot: a scheduled time that brought nothing (late or skipped;
   the watchdog starts it within ~20 min). Underneath, per lane: the last update and the next one. */
(function () {
  const RUNS = {
    forecast: { label: "Forecast", col: "#26303a", log: "forecast", utc: ["13:30", "15:30", "16:30", "18:30", "20:30", "22:30", "00:30", "02:30", "06:30", "10:30"] },
    maps: { label: "Therm", col: "#2b7fd8", log: "region", utc: ["13:34", "15:34", "16:34", "20:34", "23:34", "02:34", "06:34", "10:34"] },
    balloon: { label: "Balloon", col: "#e07a0c", log: "balloon", utc: ["13:47", "14:47", "15:47", "16:47", "01:47", "02:47"] },
  };
  const TZ = "America/Los_Angeles";
  const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
  const localMin = (d) => { const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d); return +p.find((x) => x.type === "hour").value * 60 + +p.find((x) => x.type === "minute").value; };
  const fmt = (m) => { const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, "0"); return `${h % 12 || 12}:${mm} ${h < 12 ? "am" : "pm"}`; };
  const runsLocal = (utc) => utc.map((t) => { const [h, m] = t.split(":").map(Number); const d = new Date(); d.setUTCHours(h, m, 0, 0); return localMin(d); }).sort((a, b) => a - b);
  const done = {};                                   // lane -> [Date] of updates that landed
  async function load() {
    await Promise.all(Object.values(RUNS).map(async (r) => {
      try { const j = await (await fetch(`data/runs/${r.log}.json?t=${Date.now()}`, { cache: "no-store" })).json(); done[r.log] = j.map((t) => new Date(t.replace("Z", ":00Z"))); }
      catch (e) { done[r.log] = []; }
    }));
    draw();
  }
  function draw() {
    const el = document.getElementById("sched");
    if (!el) return;
    const nowD = new Date(), now = localMin(nowD), today = dayKey(nowD);
    const W = Math.max(300, Math.min(640, el.clientWidth || 600)), L = 52, R = 10, X = (m) => L + (m / 1440) * (W - L - R);
    const o = [`<svg viewBox="0 0 ${W} 58" role="img" aria-label="Update runs through the day">`];
    for (let h = 0; h <= 24; h += 3) {
      o.push(`<line x1="${X(h * 60)}" x2="${X(h * 60)}" y1="4" y2="40" stroke="#e4e7ec" stroke-width="1"/>`);
      if (h % 6 === 0) o.push(`<text x="${X(h * 60)}" y="52" text-anchor="middle" font-size="9.5" fill="#98a2b3">${h === 0 || h === 24 ? "12a" : h === 12 ? "12p" : h < 12 ? h + "a" : h - 12 + "p"}</text>`);
    }
    const rows = [];
    Object.values(RUNS).forEach((r, i) => {
      const y = 10 + i * 13, ts = runsLocal(r.utc);
      const all = done[r.log] || [], got = all.filter((d) => dayKey(d) === today).map(localMin);
      o.push(`<text x="${L - 6}" y="${y + 3.4}" text-anchor="end" font-size="9.5" font-weight="600" fill="#667085">${r.label}</text>`);
      o.push(`<line x1="${X(0)}" x2="${X(1440)}" y1="${y}" y2="${y}" stroke="#eef0f3" stroke-width="3" stroke-linecap="round"/>`);
      ts.forEach((m) => {
        if (m > now) { o.push(`<circle cx="${X(m).toFixed(1)}" cy="${y}" r="3.3" fill="#fff" stroke="${r.col}" stroke-width="1.3"><title>${r.label}: planned ${fmt(m)}</title></circle>`); return; }
        // a past slot with nothing landing from 10 min before to 2 h after it: faint (late or skipped)
        if (!got.some((g) => g >= m - 10 && g <= m + 120)) o.push(`<circle cx="${X(m).toFixed(1)}" cy="${y}" r="3" fill="#fff" stroke="#c9ced6" stroke-width="1" stroke-dasharray="1.6 1.4"><title>${r.label}: ${fmt(m)} brought nothing (late or skipped)</title></circle>`);
      });
      got.forEach((m) => o.push(`<circle cx="${X(m).toFixed(1)}" cy="${y}" r="3.4" fill="${r.col}"><title>${r.label}: updated ${fmt(m)}</title></circle>`));
      const last = all.length ? all[all.length - 1] : null;
      const n = ts.find((m) => m > now) ?? ts[0];
      const lastTxt = last ? (dayKey(last) === today ? fmt(localMin(last)) : "yesterday " + fmt(localMin(last))) : "–";
      rows.push(`<span><b style="color:${r.col}">${r.label}</b> ${lastTxt} <i>· next ${fmt(n)}</i></span>`);
    });
    o.push(`<line x1="${X(now).toFixed(1)}" x2="${X(now).toFixed(1)}" y1="1" y2="42" stroke="#d64545" stroke-width="1.5"/><circle cx="${X(now).toFixed(1)}" cy="2" r="2.2" fill="#d64545"/>`);
    o.push("</svg>");
    el.innerHTML = `<div class="sch-h">Updates today</div>` + o.join("") + `<div class="sch-rows">${rows.join("")}</div>`;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
  setInterval(draw, 60000);
  setInterval(load, 5 * 60000);
})();
