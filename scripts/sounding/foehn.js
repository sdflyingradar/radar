// Santa Ana / föhn view under the sounding: a small map with LAX and Barstow-Daggett and their sea-level pressure,
// and the LAX-DAG gradient over the coming days, one line per model (bias-corrected), the observed line in black,
// reference lines at -2 (weak), -4 (Santa Ana) and -6 mb (strong). Data: data/gradient.json (written by the forecast).
const FOEHN_COL = { HRRR: '#d1495b', RRFS: '#e08a2c', GFS: '#3a7bd5', ECMWF: '#2a9d6f', ICON: '#8a5cc2' };

function foehnMapSVG(G) {
  // a clean flat map of the LA basin and the Mojave: coast and islands, the mountain wall with soft relief, the desert,
  // freeways, towns, the two airports with their pressure, and the offshore push between them
  const W = 760, H = 380, lo0 = -119.25, lo1 = -116.35, la0 = 33.45, la1 = 35.2;
  const X = lo => (lo - lo0) / (lo1 - lo0) * W, Y = la => (la1 - la) / (la1 - la0) * H, f = v => v.toFixed(1);
  const P = ([la, lo]) => `${f(X(lo))},${f(Y(la))}`;
  const [laxLa, laxLo] = G.points.LAX, [dagLa, dagLo] = G.points.DAG;
  const slp = G.slp || {}, g = slp.LAX != null && slp.DAG != null ? slp.LAX - slp.DAG : null;
  const col = g == null ? '#6b7280' : g <= -4 ? '#c23434' : g <= -2 ? '#c58a12' : '#2f8f4a';
  const LAND = '#f6f4ee', DESERT = '#efe4cf', WATER = '#cddff0', SHORE = '#a9c3d8', INK = '#1f2328', MUTED = '#6b7280';
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" role="img" aria-label="LAX and Barstow-Daggett pressure">`,
    `<defs><clipPath id="fmc"><rect width="${W}" height="${H}" rx="12"/></clipPath>
      <filter id="fblur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="fsh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="#000" flood-opacity=".18"/></filter>
      <linearGradient id="fpush" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".25"/><stop offset="1" stop-color="${col}" stop-opacity=".95"/></linearGradient>
      <marker id="fah" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="26" markerHeight="26" orient="auto"><path d="M0 1 L10 5 L0 9 z" fill="${col}"/></marker></defs>
    <g clip-path="url(#fmc)"><rect width="${W}" height="${H}" fill="${LAND}"/>`];
  // the Mojave: everything north and east of the mountain wall
  o.push(`<path d="M${P([35.3, -118.95])} L${P([34.85, -118.75])} L${P([34.55, -118.35])} L${P([34.45, -117.90])} L${P([34.35, -117.55])} L${P([34.30, -117.10])} L${P([34.12, -116.80])} L${P([34.0, -116.5])} L${P([33.9, -116.2])} L${P([35.3, -116.2])} Z" fill="${DESERT}"/>`);
  // soft relief along the ranges (San Gabriel, San Bernardino, Santa Monica, Tehachapi, Santa Ana, Santa Susana)
  const RANGES = [[[34.42, -118.55], [34.36, -118.20], [34.32, -117.90], [34.30, -117.65]], [[34.25, -117.40], [34.22, -117.10], [34.15, -116.85], [34.10, -116.60]],
    [[34.10, -118.95], [34.10, -118.70], [34.12, -118.45]], [[34.95, -118.80], [35.05, -118.55], [35.15, -118.40]], [[33.85, -117.68], [33.70, -117.55], [33.55, -117.45]],
    [[34.33, -118.75], [34.38, -118.55]], [[34.55, -119.10], [34.50, -118.85]]];
  o.push(`<g fill="#b9ab8e" opacity=".55" filter="url(#fblur)">`);
  for (const sp of RANGES) for (let i = 0; i < sp.length - 1; i++) for (let t = 0; t <= 1; t += 0.2) {
    const la = sp[i][0] + (sp[i + 1][0] - sp[i][0]) * t, lo = sp[i][1] + (sp[i + 1][1] - sp[i][1]) * t;
    o.push(`<circle cx="${f(X(lo))}" cy="${f(Y(la))}" r="15"/>`);
  }
  o.push(`</g>`);
  // ridge crests: fine two-tone peaks along the main wall
  for (const sp of RANGES.slice(0, 2)) for (let i = 0; i < sp.length - 1; i++) for (let t = 0; t < 1; t += 0.34) {
    const la = sp[i][0] + (sp[i + 1][0] - sp[i][0]) * t, lo = sp[i][1] + (sp[i + 1][1] - sp[i][1]) * t, x = X(lo), y = Y(la), h = 9, w = 7.5;
    o.push(`<path d="M${f(x - w)} ${f(y + 4)} L${f(x)} ${f(y + 4 - h)} L${f(x)} ${f(y + 4)} Z" fill="#9a8c74"/><path d="M${f(x)} ${f(y + 4 - h)} L${f(x + w)} ${f(y + 4)} L${f(x)} ${f(y + 4)} Z" fill="#6f6250"/>`);
  }
  // ocean, coast and the near islands
  const COAST = [[34.47, -119.30], [34.40, -119.25], [34.28, -119.27], [34.20, -119.23], [34.15, -119.20], [34.10, -119.10], [34.05, -118.95], [34.03, -118.80],
    [34.03, -118.65], [34.03, -118.55], [34.00, -118.48], [33.95, -118.45], [33.90, -118.42], [33.85, -118.40], [33.80, -118.40], [33.77, -118.42],
    [33.74, -118.40], [33.71, -118.33], [33.71, -118.29], [33.75, -118.22], [33.75, -118.15], [33.74, -118.10], [33.69, -118.02], [33.63, -117.93],
    [33.60, -117.88], [33.55, -117.80], [33.50, -117.74], [33.46, -117.70], [33.40, -117.60]];
  o.push(`<polygon points="${COAST.map(P).join(' ')} ${P([33.2, -117.5])} ${P([33.2, -119.5])} ${P([34.6, -119.5])}" fill="${WATER}"/>`);
  o.push(`<polyline points="${COAST.map(P).join(' ')}" fill="none" stroke="${SHORE}" stroke-width="1.2" stroke-linejoin="round"/>`);
  o.push(`<path d="M${P([33.48, -118.60])} Q${P([33.47, -118.45])} ${P([33.38, -118.30])} Q${P([33.36, -118.45])} ${P([33.48, -118.60])} Z" fill="${LAND}" stroke="${SHORE}"/>`);   // Catalina
  o.push(`<text x="${f(X(-118.95))}" y="${f(Y(33.75))}" font-size="11" fill="#7a99ad" letter-spacing="3">PACIFIC</text>`);
  // freeways: white casing + warm line
  const ROADS = [[[34.07, -117.60], [34.06, -117.40], [34.05, -117.20], [34.00, -116.95], [33.93, -116.75]], [[34.05, -118.24], [34.07, -117.85], [34.07, -117.60]],
    [[33.90, -117.55], [34.10, -117.45], [34.30, -117.45], [34.54, -117.29], [34.70, -117.15], [34.90, -117.02], [35.05, -116.70]],
    [[34.05, -118.24], [34.30, -118.47], [34.45, -118.62], [34.80, -118.86]], [[34.30, -118.47], [34.58, -118.12], [34.70, -118.14], [35.05, -118.17]],
    [[34.90, -117.02], [34.86, -116.75], [34.83, -116.45]], [[34.05, -118.24], [33.90, -118.10], [33.70, -117.85], [33.50, -117.65]], [[34.05, -118.50], [34.05, -118.24]]];
  for (const r of ROADS) {
    const d = r.map(P).join(' ');
    o.push(`<polyline points="${d}" fill="none" stroke="#fff" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/><polyline points="${d}" fill="none" stroke="#e2b36a" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`);
  }
  // range names and towns
  const RN = [['SAN GABRIEL MTNS', 34.40, -117.95, -8], ['SAN BERNARDINO MTNS', 34.30, -116.95, -6], ['MOJAVE DESERT', 34.95, -117.55, 0]];
  for (const [n, la, lo, r] of RN) o.push(`<text x="${f(X(lo))}" y="${f(Y(la))}" transform="rotate(${r} ${f(X(lo))} ${f(Y(la))})" text-anchor="middle" font-size="10" font-style="italic" font-weight="600" letter-spacing="2" fill="#7a6c55" paint-order="stroke" stroke="${LAND}" stroke-width="2.5">${n}</text>`);
  const TOWNS = [['Los Angeles', 34.08, -118.30, 2], ['Palmdale', 34.58, -118.12, 0], ['Lancaster', 34.70, -118.14, 0], ['Victorville', 34.54, -117.29, 0],
    ['Barstow', 34.90, -117.02, 0], ['San Bernardino', 34.11, -117.29, 0], ['Riverside', 33.95, -117.40, 0], ['Santa Clarita', 34.39, -118.54, 0], ['Oxnard', 34.20, -119.18, 0]];
  for (const [n, la, lo, big] of TOWNS) {
    const x = X(lo), y = Y(la);
    const left = big === 2;
    o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${big ? 3.4 : 2.4}" fill="#4b5563" stroke="#fff" stroke-width="1.2"/><text x="${f(left ? x - 6 : x + 6)}" y="${f(y + 4)}" text-anchor="${left ? 'end' : 'start'}" font-size="${big ? 12 : 10.5}" font-weight="${big ? 600 : 500}" fill="#374151" paint-order="stroke" stroke="${LAND}" stroke-width="3">${n}</text>`);
  }
  // the offshore push: a broad soft arrow from the desert over the mountains to the coast
  if (g != null && g < 0) {
    const w = Math.min(16, 4 + Math.abs(g) * 2);
    const x1 = X(dagLo) - 40, y1 = Y(dagLa) + 26, x2 = X(laxLo) + 22, y2 = Y(laxLa) - 44, cx = (x1 + x2) / 2 + 40, cy = (y1 + y2) / 2 - 20;
    o.push(`<path d="M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}" fill="none" stroke="url(#fpush)" stroke-width="${f(w)}" stroke-linecap="round" marker-end="url(#fah)"/>`);
  }
  // the two airports: dark pin with a white pressure badge
  const stn = (n, la, lo, p, left) => {
    const x = X(lo), y = Y(la), bw = 112, bx = left ? x - bw - 12 : x + 12;
    o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="6.5" fill="${INK}" stroke="#fff" stroke-width="2.2" filter="url(#fsh)"/>`);
    o.push(`<g filter="url(#fsh)"><rect x="${f(bx)}" y="${f(y - 20)}" width="${bw}" height="40" rx="9" fill="#fff"/></g>`);
    o.push(`<text x="${f(bx + 11)}" y="${f(y - 4)}" font-size="12.5" font-weight="800" fill="${INK}">${n}</text>`);
    o.push(`<text x="${f(bx + 11)}" y="${f(y + 13)}" font-size="12" fill="#374151" font-variant-numeric="tabular-nums">${p != null ? p.toFixed(1) + ' mb' : '–'}</text>`);
  };
  stn('LAX', laxLa, laxLo, slp.LAX, false);
  stn('Daggett', dagLa, dagLo, slp.DAG, true);
  // the reading, a card top left
  o.push(`<g filter="url(#fsh)"><rect x="14" y="14" width="196" height="62" rx="11" fill="#fff"/></g>`,
    `<text x="27" y="35" font-size="11" fill="${MUTED}">LAX − Daggett${slp.at ? ' · ' + new Date(slp.at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }).toLowerCase() : ''}</text>`,
    `<text x="27" y="63" font-size="24" font-weight="800" fill="${col}" font-variant-numeric="tabular-nums">${g != null ? (g > 0 ? '+' : '') + g.toFixed(1) : '–'}<tspan font-size="13" font-weight="600"> mb</tspan></text>`,
    `<text x="198" y="63" font-size="11.5" font-weight="600" text-anchor="end" fill="${col}">${g == null ? '' : g <= -6 ? 'strong' : g <= -4 ? 'Santa Ana' : g <= -2 ? 'weak offshore' : g < 0 ? 'light offshore' : 'onshore'}</text>`);
  // scale + north
  const mi = 25 * 1609 / (111200 * Math.cos(34.3 * Math.PI / 180)) / (lo1 - lo0) * W;
  o.push(`<g transform="translate(${f(W - 20 - mi)} ${H - 18})"><rect width="${f(mi)}" height="4" rx="2" fill="#9ca3af"/><text y="-6" font-size="10" fill="${MUTED}">0</text><text x="${f(mi)}" y="-6" font-size="10" text-anchor="end" fill="${MUTED}">25 mi</text></g>`);
  o.push(`<g transform="translate(${W - 26} 30)" filter="url(#fsh)"><circle r="12" fill="#fff"/><path d="M0 -8 L4 4 L0 2 L-4 4 Z" fill="${INK}"/></g>`);
  o.push('</g><rect x=".5" y=".5" width="' + (W - 1) + '" height="' + (H - 1) + '" rx="12" fill="none" stroke="#e5e7eb"/></svg>');
  return o.join('');
}

const clk = (t) => new Date(t).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', hour: 'numeric', minute: '2-digit' }).replace(/ AM| PM/, (m) => m.toLowerCase().trim()).replace(/(\d) (am|pm)/, '$1$2');
function foehnChartSVG(G, win) {
  const W = 760, H = 320, L = 40, R = 14, T = 16, B = 34;
  // win: {t0, t1} to look back at earlier days (observed only); default: the last 2 days and the next 7
  const now = Date.now(), t0 = win ? win.t0 : now - 2 * 864e5, t1 = win ? win.t1 : now + 7 * 864e5;
  const toT = k => Date.parse(k + ':00:00Z');
  const series = win ? [] : Object.entries(G.models || {}).map(([m, v]) => [m, Object.entries(v.hourly || {}).map(([k, y]) => [toT(k), y]).filter(([t]) => t >= now - 3 * 36e5 && t <= t1).sort((a, b) => a[0] - b[0])]);
  const obs = Object.entries(G.obs || {}).map(([k, y]) => [toT(k), y]).filter(([t]) => t >= t0 && t <= t1).sort((a, b) => a[0] - b[0]);
  const ys = [...obs.map(p => p[1]), ...series.flatMap(([, s]) => s.map(p => p[1])), -6.5, 2];
  const y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
  const X = t => L + (t - t0) / (t1 - t0) * (W - L - R), Y = v => T + (y1 - v) / (y1 - y0) * (H - T - B), f = v => v.toFixed(1);
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" role="img" aria-label="LAX-DAG gradient forecast">`,
    `<rect width="${W}" height="${H}" rx="10" fill="#fff"/>`];
  // Santa Ana zones: shaded below the reference lines
  const zone = (a, b, c) => o.push(`<rect x="${L}" y="${f(Y(a))}" width="${W - L - R}" height="${f(Math.max(0, Y(b) - Y(a)))}" fill="${c}"/>`);
  zone(-2, -4, 'rgba(233,184,44,.12)'); zone(-4, -6, 'rgba(214,69,69,.10)'); zone(-6, y0, 'rgba(214,69,69,.18)');
  for (let v = y0; v <= y1; v++) o.push(`<line x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}" stroke="#eef0f3"/><text x="${L - 6}" y="${f(Y(v) + 3.5)}" text-anchor="end" font-size="10" fill="#98a2b3">${v}</text>`);
  for (const [v, n, c] of [[-2, 'weak', '#b07a12'], [-4, 'Santa Ana', '#c23434'], [-6, 'strong', '#9b1c1c']]) {
    if (v < y0) continue;
    o.push(`<line x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}" stroke="${c}" stroke-width="1.2" stroke-dasharray="5 4"/>`);
    o.push(`<text x="${W - R - 4}" y="${f(Y(v) - 4)}" text-anchor="end" font-size="10" font-weight="700" fill="${c}">${n} ${v} mb</text>`);
  }
  o.push(`<line x1="${L}" x2="${W - R}" y1="${f(Y(0))}" y2="${f(Y(0))}" stroke="#98a2b3"/>`);
  // days: midnight lines and weekday labels (Pacific)
  const day = new Date(t0); day.setUTCHours(8, 0, 0, 0);
  const long = t1 - t0 > 12 * 864e5;            // a month on one chart: a label every 5 days, faint lines
  for (let t = day.getTime(), i = 0; t <= t1; t += 864e5, i++) {
    const dom = +new Date(t + 432e5).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', day: 'numeric' });
    if (t >= t0) o.push(`<line x1="${f(X(t))}" x2="${f(X(t))}" y1="${T}" y2="${H - B}" stroke="#e4e7ec"${long && dom % 5 !== 1 ? ' opacity=".45"' : ''}/>`);
    const mid = t + 432e5;
    if (long && (dom % 5 !== 1 || dom === 31)) continue;
    if (mid > t0 && mid < t1) o.push(`<text x="${f(X(mid))}" y="${H - B + 16}" text-anchor="middle" font-size="11" font-weight="600" fill="#475467">${new Date(mid).toLocaleDateString('en-US', win ? { timeZone: 'America/Los_Angeles', month: 'numeric', day: 'numeric' } : { timeZone: 'America/Los_Angeles', weekday: 'short' })}</text>`);
  }
  if (now >= t0 && now <= t1) o.push(`<line x1="${f(X(now))}" x2="${f(X(now))}" y1="${T}" y2="${H - B}" stroke="#26303a" stroke-dasharray="2 3"/><text x="${f(X(now) + 3)}" y="${T + 9}" font-size="9.5" fill="#26303a">now ${clk(now)}</text>`);
  const line = (pts, c, w, dash) => pts.length > 1 && o.push(`<polyline points="${pts.map(([t, v]) => `${f(X(t))},${f(Y(v))}`).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
  for (const [m, s] of series) line(s, FOEHN_COL[m] || '#6b7280', 1.8);
  // observed: break the line where hours are missing (more than 3 h); thinner on a month
  let seg = [];
  for (const p of obs) { if (seg.length && p[0] - seg[seg.length - 1][0] > 3 * 36e5) { line(seg, '#111827', long ? 1.4 : 2.6); seg = []; } seg.push(p); }
  line(seg, '#111827', long ? 1.4 : 2.6);
  o.push('</svg>');
  const legend = `<div class="fleg"><span><i style="background:#111827"></i>observed</span>${series.map(([m]) => `<span><i style="background:${FOEHN_COL[m] || '#6b7280'}"></i>${m}</span>`).join('')}${G.generated && !win ? `<span class="fupd">updated ${clk(Date.parse(G.generated.replace(/([+-]\d\d:\d\d|Z)?$/, (z) => z || 'Z')))}</span>` : ''}</div>`;
  return o.join('') + legend;
}

if (typeof module !== 'undefined') module.exports = { foehnMapSVG, foehnChartSVG };

/* The San Diego day score (best of Little Black, Blossom, Elsinore; data/dayscore.json) as a quiet strip under the
   LAX-DAG chart, on the same time axis: one point a day at noon, the line coloured by the score (no-go red to great
   blue), past days as the radar said them on the day (solid), coming days as forecast (dashed, open dots). */
function dayScoreSVG(S, win) {
  const W = 760, H = 74, L = 40, R = 14, T = 8, B = 18;
  const now = Date.now(), t0 = win ? win.t0 : now - 2 * 864e5, t1 = win ? win.t1 : now + 7 * 864e5;
  const X = (t) => L + (t - t0) / (t1 - t0) * (W - L - R), Y = (v) => T + (5 - v) / 4 * (H - T - B), f = (v) => v.toFixed(1);
  const COL = ['#d8402f', '#ee8a1c', '#f1c72b', '#3aa457', '#2f7fcf'], col = (v) => COL[Math.max(1, Math.min(5, Math.round(v))) - 1];
  const noon = (d) => Date.parse(d + 'T20:00:00Z');                       // local noon (PST)
  const pts = Object.entries(S || {}).map(([d, x]) => [noon(d), x.s, !!x.obs]).filter(([t]) => t >= t0 - 864e5 && t <= t1 + 864e5).sort((a, b) => a[0] - b[0]);
  const o = [`<svg viewBox="0 0 ${W} ${H}" class="dscore" role="img" aria-label="San Diego day score"><defs><clipPath id="dsc"><rect x="${L}" y="0" width="${W - L - R}" height="${H}"/></clipPath></defs>`];
  for (const v of [1, 3, 5]) o.push(`<line x1="${L}" x2="${W - R}" y1="${f(Y(v))}" y2="${f(Y(v))}" stroke="#eef0f3"/><text x="${L - 6}" y="${f(Y(v) + 3)}" text-anchor="end" font-size="9" fill="#98a2b3">${v}</text>`);
  o.push(`<text x="${L + 4}" y="${H - 4}" font-size="9.5" font-weight="600" fill="#98a2b3">SD day score</text>`);
  o.push('<g clip-path="url(#dsc)">');
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    if (b[0] - a[0] > 1.6 * 864e5) continue;
    o.push(`<line x1="${f(X(a[0]))}" y1="${f(Y(a[1]))}" x2="${f(X(b[0]))}" y2="${f(Y(b[1]))}" stroke="${col((a[1] + b[1]) / 2)}" stroke-width="2" stroke-linecap="round"${b[2] ? '' : ' stroke-dasharray="3 3"'}/>`);
  }
  const long = t1 - t0 > 12 * 864e5;
  for (const [t, v, ob] of pts) o.push(`<circle cx="${f(X(t))}" cy="${f(Y(v))}" r="${long ? 2 : 3}" fill="${ob ? col(v) : '#fff'}" stroke="${col(v)}" stroke-width="1.3"><title>${new Date(t).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric' })}: ${v.toFixed(1)}${ob ? '' : ' (forecast)'}</title></circle>`);
  o.push('</g>');
  if (now >= t0 && now <= t1) o.push(`<line x1="${f(X(now))}" x2="${f(X(now))}" y1="${T}" y2="${H - B}" stroke="#26303a" stroke-dasharray="2 3" opacity=".6"/>`);
  o.push('</svg>');
  return o.join('');
}
if (typeof module !== 'undefined') module.exports = Object.assign(module.exports || {}, { dayScoreSVG });
