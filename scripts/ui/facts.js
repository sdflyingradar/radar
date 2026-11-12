/* Tile facts with meaning in colour.
   Lift icon: blue with climbs of 2 m/s+, or at great XC height, or 1.5 m/s+ at XC height; green XC height with 1 m/s+;
   yellow local height with 0.5 m/s+; orange anything less.
   Launch dial: the launch's direction window as a grey arc on the rim with a light grey wedge, and the wind as an
   arrow from outside the dial into its centre: green more than 20 deg inside the window, yellow its outer 20 deg,
   orange up to 20 deg outside (cross), red further out (from behind).
   Aloft icon: the detailed chart's speed colours; over the back or offshore from 5 mph one step worse, at least orange. */
(function () {
  const DIR16 = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const deg = (v) => { const m = String(v || "").match(/\b(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)\b/); return m ? DIR16.indexOf(m[1]) * 22.5 : null; };
  /* degrees outside the window; inside it, minus how deep in from the nearest edge (same as the score) */
  const offBy = (d, [a, b]) => {
    const inside = a <= b ? d >= a && d <= b : d >= a || d <= b;
    const dist = (x, y) => { const k = Math.abs(x - y) % 360; return k > 180 ? 360 - k : k; };
    const edge = Math.min(dist(d, a), dist(d, b));
    return inside ? (b - a >= 359 ? -90 : -edge) : edge;
  };
  const RIM = 20;                                     // the outer 20 deg of the window: yellow, a small nick
  const offCol = (o) => (o == null ? "#9aa3ad" : o <= -RIM ? "#2f9e57" : o <= 0 ? "#e2bf12" : o <= 20 ? "#ef8a17" : "#d64545");
  const liftIc = (col, tip) => `<svg class="lic" viewBox="0 0 14 14" aria-hidden="true"><title>${tip}</title><g fill="${col}"><path d="M3.5 1 L6.6 5.4 H4.6 V13 H2.4 V5.4 H0.4 Z"/><path d="M10.5 1 L13.6 5.4 H11.6 V13 H9.4 V5.4 H7.4 Z"/></g></svg>`;
  const pt = (r, a) => [10 + r * Math.sin(a * Math.PI / 180), 10 - r * Math.cos(a * Math.PI / 180)];
  const arc = (r, a, b) => { const span = ((b - a) + 360) % 360, [x0, y0] = pt(r, a), [x1, y1] = pt(r, b); return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`; };
  const dial = (wins, d) => {
    const o = d == null ? null : Math.min(...wins.map((w) => offBy(d, w)));
    const col = offCol(o);
    const full = wins.some(([a, b]) => b - a >= 359);
    const wedges = full ? '<circle cx="10" cy="10" r="7" fill="#e9ecf0"/>' : wins.map(([a, b]) => `<path d="M10 10 L${pt(7, a).map((v) => v.toFixed(2)).join(" ")} ${arc(7, a, b).replace(/^M[^A]*/, "")} Z" fill="#e9ecf0"/>`).join("");
    const arcs = full ? '<circle cx="10" cy="10" r="7.6" fill="none" stroke="#9aa3ad" stroke-width="2.2"/>' : wins.map(([a, b]) => `<path d="${arc(7.6, a, b)}" fill="none" stroke="#9aa3ad" stroke-width="2.2" stroke-linecap="round"/>`).join("");
    /* arrow: from outside the dial (where the wind comes from) to the centre */
    const arrow = d == null ? "" : `<g transform="rotate(${d} 10 10)"><line x1="10" y1="0.6" x2="10" y2="7.4" stroke="${col}" stroke-width="2" stroke-linecap="round"/><path d="M10 10.6 L7.3 6.2 L12.7 6.2 Z" fill="${col}"/></g>`;
    const tip = o == null ? "launch window" : o <= -RIM ? "wind into the launch window" : o <= 0 ? "wind at the edge of the launch window" : o <= 20 ? `crosswind, ${Math.round(o)}° outside the launch window` : `wind from behind the launch (${Math.round(o)}° off)`;
    return `<svg class="ldial" viewBox="0 0 20 20" aria-hidden="true"><title>${tip}</title><circle cx="10" cy="10" r="7.6" fill="#fff" stroke="#d5dbe2" stroke-width="1"/>${wedges}${arcs}${arrow}</svg>`;
  };
  window.factsIcons = { dial, liftIc };            // the how-it-works page draws its examples with these
  window.siteFactsHook = function (html, c, s, { LIFT, LAUNCH_IC, ALOFT_IC }) {
    if (!s) return html;
    const f = (k) => (c.factors || []).find((x) => x.k === k);
    const h = f("Height") || f("Thermal height"), w = f("Wind 1 pm");
    const top = h ? +String(h.v).replace(/[^\d]/g, "") : null;
    const cl = c.wstar != null ? Math.max(0, (c.core || 1.4) * c.wstar - (c.sink || 1.1)) : null;
    let out = html;
    if (top && c.style !== "ridge") {
      const lf = s.launch_ft || 0, ok = s.ok_ft || lf + 1500, xc = s.xc_top_ft || lf + 2500, great = xc + (s.xc_span_ft || 1000);
      const c = cl == null ? 1 : cl;
      /* blue: climbs of 2 m/s+, or great XC height, or 1.5 m/s+ at XC height · green: XC height with 1 m/s+
         · yellow: local height with 0.5 m/s+ · orange: anything less */
      const k = c >= 2 || top >= great || (c >= 1.5 && top >= xc) ? 3 : top >= xc && c >= 1 ? 2 : top >= ok && c >= 0.5 ? 1 : 0;
      const col = ["#ef8a17", "#e2bf12", "#2f9e57", "#2b7fd8"][k];
      const tip = ["below local height or weak", "local height", "cross-country height", "great: strong or very high"][k] + (cl != null ? `, climbs about ${cl.toFixed(1)} m/s` : "");
      out = out.replace(LIFT, liftIc(col, tip));
    }
    if (s.dirs && s.dirs.length && w && w.v !== "–")
      out = out.replace(new RegExp(LAUNCH_IC.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '(<span class="wa"[^>]*>)<svg[^>]*>.*?</svg>'), (m, sp) => dial(s.dirs, deg(w.v)) + sp);
    const a = f("Wind aloft");
    if (ALOFT_IC && a && a.v !== "–") {
      /* the detailed chart's speed colours (green ≤9.5, yellow ≤15.5, orange ≤19, red above), from
         the window's average speed, one step up when the strongest is 2+ steps above it; over the back or offshore
         (a capped day step) from 5 mph: one step worse, at least orange */
      const m = String(a.v).match(/(\d+)(?:\s*g\s*(\d+))?/);
      const SP = [[4, 0], [9.5, 1], [15.5, 2], [19, 3], [22.5, 4], [1e9, 5]];
      const band = (v) => SP.findIndex(([lim]) => v <= lim);
      let b = m ? Math.max(1, band(+m[1])) : 1;
      if (m && m[2] && band(+m[2]) - b >= 2) b += 1;
      if (a.q != null && a.q <= 0.2 && m && +m[1] >= 5) b = Math.min(5, Math.max(b + 1, 3));   // over the back / offshore: one step worse, at least orange (light air: no change)
      const col = ["#2f9e57", "#2f9e57", "#d4a90c", "#ef8a17", "#d64545", "#d64545"][b];
      out = out.replace(ALOFT_IC, ALOFT_IC.replace('class="wic"', `class="wic" style="color:${col}"`));
    }
    return out;
  };
})();
