// Santa Ana / föhn view under the sounding: a small map with LAX and Barstow-Daggett and their sea-level pressure,
// and the LAX-DAG gradient over the coming days, one line per model (bias-corrected), the observed line in black,
// reference lines at -2 (weak), -4 (Santa Ana) and -6 mb (strong). Data: data/gradient.json (written by the forecast).
const FOEHN_COL = { HRRR: '#d1495b', RRFS: '#e08a2c', GFS: '#3a7bd5', ECMWF: '#2a9d6f', ICON: '#8a5cc2' };

function foehnMapSVG(G) {
  // a clean flat map of the LA basin and the Mojave: coast and islands, the mountain wall with soft relief, the desert,
  // freeways, towns, the two airports with their pressure, and the offshore push between them
  // Esri World Topo underneath (scripts/ui/basemap.js), in Web Mercator so it lines up
  const W = 760, H = 380, lo0 = -119.45, lo1 = -116.05;
  const F = basemapFrame(lo0, lo1, 34.33, W, H), X = F.X, Y = F.Y, f = v => v.toFixed(1);
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
      <linearGradient id="fpushon" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="${col}" stop-opacity=".25"/><stop offset="1" stop-color="${col}" stop-opacity=".95"/></linearGradient>
      <marker id="fah" viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth="26" markerHeight="26" orient="auto"><path d="M0 1 L10 5 L0 9 z" fill="${col}"/></marker></defs>
    <g clip-path="url(#fmc)"><rect width="${W}" height="${H}" fill="${LAND}"/>${basemapTiles(F, W, H)}<rect width="${W}" height="${H}" fill="#fff" opacity=".12"/>`];
  // the push: a broad soft arrow, offshore from the desert over the mountains to the coast, onshore the other way
  // (at 0 it points onshore, the usual sea breeze); wider with a bigger difference
  if (g != null) {
    const w = Math.min(16, 4 + Math.abs(g) * 2);
    let x1 = X(dagLo) - 40, y1 = Y(dagLa) + 26, x2 = X(laxLo) + 22, y2 = Y(laxLa) - 44;
    const cx = (x1 + x2) / 2 + 40, cy = (y1 + y2) / 2 - 20;
    if (g >= 0) [x1, y1, x2, y2] = [x2, y2, x1, y1];
    o.push(`<path d="M${f(x1)} ${f(y1)} Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}" fill="none" stroke="url(#${g < 0 ? 'fpush' : 'fpushon'})" stroke-width="${f(w)}" stroke-linecap="round" marker-end="url(#fah)"/>`);
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
  o.push(basemapAttr(H));
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
