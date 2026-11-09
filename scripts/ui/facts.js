/* Tile facts with meaning in colour.
   Lift icon: by how good the height is for the site: blue at XC height (with climbs of 1 m/s+), green good local,
   orange modest, yellow low; weak climbs (under 0.7 m/s) never better than orange.
   Launch dial: the launch's direction window as a bold green arc on the rim with a light wedge, and the wind as an
   arrow from outside the dial into its centre: green inside the window, yellow up to 20 deg off, orange 20-45 deg
   off (cross), red more than 45 deg off (over the back side).
   Aloft icon: green fine, yellow so-so, orange poor, red blows over the back or too strong. */
(function () {
  const DIR16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const deg = (v) => { const m = String(v || "").match(/\b(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)\b/); return m ? DIR16.indexOf(m[1]) * 22.5 : null; };
  const offBy = (d, [a, b]) => {                      // degrees outside the window (0 = inside)
    const inside = a <= b ? d >= a && d <= b : d >= a || d <= b;
    if (inside) return 0;
    const dist = (x, y) => { const k = Math.abs(x - y) % 360; return k > 180 ? 360 - k : k; };
    return Math.min(dist(d, a), dist(d, b));
  };
  const offCol = (o) => (o == null ? "#9aa3ad" : o === 0 ? "#2f9e57" : o <= 20 ? "#e2bf12" : o <= 45 ? "#ef8a17" : "#d64545");
  const liftIc = (col, tip) => `<svg class="lic" viewBox="0 0 14 14" aria-hidden="true"><title>${tip}</title><g fill="${col}"><path d="M3.5 1 L6.6 5.4 H4.6 V13 H2.4 V5.4 H0.4 Z"/><path d="M10.5 1 L13.6 5.4 H11.6 V13 H9.4 V5.4 H7.4 Z"/></g></svg>`;
  const pt = (r, a) => [10 + r * Math.sin(a * Math.PI / 180), 10 - r * Math.cos(a * Math.PI / 180)];
  const arc = (r, a, b) => { const span = ((b - a) + 360) % 360, [x0, y0] = pt(r, a), [x1, y1] = pt(r, b); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const dial = (wins, d) => {
    const o = d == null ? null : Math.min(...wins.map((w) => offBy(d, w)));
    const col = offCol(o);
    const full = wins.some(([a, b]) => b - a >= 359);
    const wedges = full ? '<circle cx="10" cy="10" r="7" fill="#dff1e4"/>' : wins.map(([a, b]) => `<path d="M10 10 L${pt(7, a).map((v) => v.toFixed(2)).join(" ")} ${arc(7, a, b).replace(/^M[^A]*/, "")} Z" fill="#dff1e4"/>`).join("");
    const arcs = full ? '<circle cx="10" cy="10" r="7.6" fill="none" stroke="#2f9e57" stroke-width="2.2"/>' : wins.map(([a, b]) => `<path d="${arc(7.6, a, b)}" fill="none" stroke="#2f9e57" stroke-width="2.2" stroke-linecap="round"/>`).join("");
    /* arrow: from outside the dial (where the wind comes from) to the centre */
    const arrow = d == null ? "" : `<g transform="rotate(${d} 10 10)"><line x1="10" y1="0.6" x2="10" y2="7.4" stroke="${col}" stroke-width="2" stroke-linecap="round"/><path d="M10 10.6 L7.3 6.2 L12.7 6.2 Z" fill="${col}"/></g>`;
    const tip = o == null ? "launch window" : o === 0 ? "wind into the launch window" : o <= 20 ? `wind ${Math.round(o)}° off the launch window` : o <= 45 ? `crosswind, ${Math.round(o)}° off the launch window` : `wind from behind the launch (${Math.round(o)}° off)`;
    return `<svg class="ldial" viewBox="0 0 20 20" aria-hidden="true"><title>${tip}</title><circle cx="10" cy="10" r="7.6" fill="#fff" stroke="#d5dbe2" stroke-width="1"/>${wedges}${arcs}${arrow}</svg>`;
  };
  window.siteFactsHook = function (html, c, s, { LIFT, LAUNCH_IC, ALOFT_IC }) {
    if (!s) return html;
    const f = (k) => (c.factors || []).find((x) => x.k === k);
    const h = f("Height") || f("Thermal height"), w = f("Wind 1 pm");
    const top = h ? +String(h.v).replace(/[^\d]/g, "") : null;
    const cl = c.wstar != null ? Math.max(0, (c.core || 1.4) * c.wstar - (c.sink || 1.1)) : null;
    let out = html;
    if (top && c.style !== "ridge") {
      const lf = s.launch_ft || 0, xc = s.xc_top_ft || lf + 2500;
      let k = top >= xc ? 3 : top >= lf + 1500 ? 2 : top >= lf + 700 ? 1 : 0;
      if (cl != null && cl < 1 && k === 3) k = 2;
      if (cl != null && cl < 0.7) k = Math.min(k, 1);
      const col = ["#e2bf12", "#ef8a17", "#2f9e57", "#2b7fd8"][k];
      const tip = ["low", "modest height", "good local height", "cross-country height"][k] + (cl != null ? `, climbs about ${cl.toFixed(1)} m/s` : "");
      out = out.replace(LIFT, liftIc(col, tip));
    }
    if (s.dirs && s.dirs.length && w && w.v !== "–")
      out = out.replace(new RegExp(LAUNCH_IC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '(<span class="wa"[^>]*>)<svg[^>]*>.*?</svg>'), (m, sp) => dial(s.dirs, deg(w.v)) + sp);
    const a = f("Wind aloft");
    if (ALOFT_IC && a && a.v !== "–" && a.q != null) {
      const col = a.q >= 0.8 ? "#2f9e57" : a.q >= 0.5 ? "#d4a90c" : a.q >= 0.3 ? "#ef8a17" : "#d64545";
      out = out.replace(ALOFT_IC, ALOFT_IC.replace('class="wic"', `class="wic" style="color:${col}"`));
    }
    return out;
  };
})();
