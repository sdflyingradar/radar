/* A tiny timeline of the day's update runs at the bottom of the radar: forecast, therm charts (the region run) and the balloon, each in
   its own thin lane, with "now" and what comes next. The times are the scheduled ones (UTC in the workflows, shown in
   local time); GitHub can start a run a little late. */
(function () {
  const RUNS = {
    forecast: { label: "Forecast", col: "#26303a", utc: ["13:17", "15:17", "17:17", "19:17", "21:17", "23:17", "02:17", "05:17"] },
    maps: { label: "Therm", col: "#2b7fd8", utc: ["13:27", "16:27", "19:27", "22:27", "02:27"] },
    balloon: { label: "Balloon", col: "#e07a0c", utc: ["13:47", "14:47", "15:47", "16:47", "01:47", "02:47"] },
  };
  const TZ = "America/Los_Angeles";
  const localMin = (d) => { const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(d); return +p.find((x) => x.type === "hour").value * 60 + +p.find((x) => x.type === "minute").value; };
  const fmt = (m) => { const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, "0"); return `${h % 12 || 12}:${mm} ${h < 12 ? "am" : "pm"}`; };
  const runsLocal = (utc) => utc.map((t) => { const [h, m] = t.split(":").map(Number); const d = new Date(); d.setUTCHours(h, m, 0, 0); return localMin(d); }).sort((a, b) => a - b);
  function draw() {
    const el = document.getElementById("sched");
    if (!el) return;
    const now = localMin(new Date());
    const W = Math.max(300, Math.min(640, el.clientWidth || 600)), L = 52, R = 10, X = (m) => L + (m / 1440) * (W - L - R);
    const o = [`<svg viewBox="0 0 ${W} 58" role="img" aria-label="Update runs through the day">`];
    for (let h = 0; h <= 24; h += 3) {
      o.push(`<line x1="${X(h * 60)}" x2="${X(h * 60)}" y1="4" y2="40" stroke="#e4e7ec" stroke-width="1"/>`);
      if (h % 6 === 0) o.push(`<text x="${X(h * 60)}" y="52" text-anchor="middle" font-size="9.5" fill="#98a2b3">${h === 0 || h === 24 ? "12a" : h === 12 ? "12p" : h < 12 ? h + "a" : h - 12 + "p"}</text>`);
    }
    const next = [];
    Object.values(RUNS).forEach((r, i) => {
      const y = 10 + i * 13, ts = runsLocal(r.utc);
      o.push(`<text x="${L - 6}" y="${y + 3.4}" text-anchor="end" font-size="9.5" font-weight="600" fill="#667085">${r.label}</text>`);
      o.push(`<line x1="${X(0)}" x2="${X(1440)}" y1="${y}" y2="${y}" stroke="#eef0f3" stroke-width="3" stroke-linecap="round"/>`);
      ts.forEach((m) => o.push(`<circle cx="${X(m).toFixed(1)}" cy="${y}" r="3.3" fill="${m <= now ? r.col : "#fff"}" stroke="${r.col}" stroke-width="1.3" opacity="${m <= now ? 0.45 : 1}"><title>${r.label} ${fmt(m)}</title></circle>`));
      const n = ts.find((m) => m > now) ?? ts[0];
      next.push(`${r.label.toLowerCase()} ${fmt(n)}`);
    });
    o.push(`<line x1="${X(now).toFixed(1)}" x2="${X(now).toFixed(1)}" y1="1" y2="42" stroke="#d64545" stroke-width="1.5"/><circle cx="${X(now).toFixed(1)}" cy="2" r="2.2" fill="#d64545"/>`);
    o.push("</svg>");
    el.innerHTML = `<div class="sch-h">Updates today <span>· next: ${next.join(" · ")}</span></div>` + o.join("");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", draw); else draw();
  setInterval(draw, 60000);
})();
