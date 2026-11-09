/* LAB bar */
(function () {
  const bar = document.createElement("div");
  bar.id = "labbar";
  bar.innerHTML = "<b>LAB</b><span>coloured lift · launch dial</span>";
  document.body.appendChild(bar);
})();

/* LAB: tile facts with meaning in colour: the lift icon coloured by climb strength (yellow weak ... blue strong);
   the launch wind as a little dial: the launch's direction window as a wedge, the wind arrow in it, green when the
   wind is inside the window, red when it is not */
(function () {
  const DIR16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const deg = (v) => { const m = String(v || "").match(/\b(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)\b/); return m ? DIR16.indexOf(m[1]) * 22.5 : null; };
  const inWin = (d, [a, b]) => (a <= b ? d >= a && d <= b : d >= a || d <= b);
  const climbCol = (cl) => (cl >= 2 ? "#2b7fd8" : cl >= 1.5 ? "#2f9e57" : cl >= 1 ? "#ef8a17" : "#e2bf12");
  const liftIc = (col) => `<svg class="lic" viewBox="0 0 14 14" aria-hidden="true"><g fill="${col}"><path d="M3.5 1 L6.6 5.4 H4.6 V13 H2.4 V5.4 H0.4 Z"/><path d="M10.5 1 L13.6 5.4 H11.6 V13 H9.4 V5.4 H7.4 Z"/></g></svg>`;
  const pt = (r, a) => [8 + r * Math.sin(a * Math.PI / 180), 8 - r * Math.cos(a * Math.PI / 180)];
  const dial = (wins, d) => {
    const ok = d == null ? null : wins.some((w) => inWin(d, w));
    const col = ok == null ? "#9aa3ad" : ok ? "#2f9e57" : "#d64545";
    const wedges = wins.map(([a, b]) => {
      if (b - a >= 359) return `<circle cx="8" cy="8" r="7" fill="#cfe9d6"/>`;
      const span = ((b - a) + 360) % 360, [x0, y0] = pt(7, a), [x1, y1] = pt(7, b);
      return `<path d="M8 8 L${x0.toFixed(2)} ${y0.toFixed(2)} A7 7 0 ${span > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="#cfe9d6"/>`;
    }).join("");
    const arrow = d == null ? "" : `<path d="M8 2.6 L10.6 9.6 L8 8.2 L5.4 9.6 Z" fill="${col}" transform="rotate(${(d + 180) % 360} 8 8)"/>`;
    return `<svg class="ldial" viewBox="0 0 16 16" aria-hidden="true"><title>launch: wind ${ok == null ? "" : ok ? "into the launch window" : "outside the launch window"}</title><circle cx="8" cy="8" r="7.3" fill="#fff" stroke="${col}" stroke-width="1.3"/>${wedges}${arrow}</svg>`;
  };
  window.siteFactsHook = function (html, c, s, { LIFT, LAUNCH_IC }) {
    if (!s) return html;
    const meta = s;
    const f = (k) => (c.factors || []).find((x) => x.k === k);
    const w = f("Wind 1 pm");
    const cl = c.wstar != null && c.style !== "ridge" ? Math.max(0, (c.core || 1.4) * c.wstar - (c.sink || 1.1)) : null;
    let out = html;
    if (cl != null) out = out.replace(LIFT, liftIc(climbCol(cl)).replace('aria-hidden="true">', `aria-hidden="true"><title>climbs about ${cl.toFixed(1)} m/s</title>`));
    /* the dial carries the direction, so the launch line drops its own little arrow */
    if (meta.dirs && meta.dirs.length && w && w.v !== "–") out = out.replace(new RegExp(LAUNCH_IC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '(<span class="wa"[^>]*>)<svg[^>]*>.*?</svg>'), (m, sp) => dial(meta.dirs, deg(w.v)) + sp);
    return out;
  };
})();
