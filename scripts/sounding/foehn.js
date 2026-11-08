// Santa Ana / föhn view under the sounding: a small map with LAX and Barstow-Daggett and their sea-level pressure,
// and the LAX-DAG gradient over the coming days, one line per model (bias-corrected), the observed line in black,
// reference lines at -2 (weak), -4 (Santa Ana) and -6 mb (strong). Data: data/gradient.json (written by the forecast).
const FOEHN_COL = { HRRR: '#d1495b', RRFS: '#e08a2c', GFS: '#3a7bd5', ECMWF: '#2a9d6f', ICON: '#8a5cc2' };

function foehnMapSVG(G, small) {
  const W = small ? 300 : 600, H = small ? 420 : 300, lo0 = small ? -118.75 : -119.4, lo1 = small ? -116.45 : -116.0, la0 = small ? 33.55 : 33.3, la1 = small ? 35.15 : 35.25;
  const X = lo => (lo - lo0) / (lo1 - lo0) * W, Y = la => (la1 - la) / (la1 - la0) * H, f = v => v.toFixed(1);
  const P = ([la, lo]) => `${f(X(lo))},${f(Y(la))}`;
  const [laxLa, laxLo] = G.points.LAX, [dagLa, dagLo] = G.points.DAG;
  const slp = G.slp || {}, g = slp.LAX != null && slp.DAG != null ? slp.LAX - slp.DAG : null;
  const col = g == null ? '#6b7280' : g <= -4 ? '#c23434' : g <= -2 ? '#c58a12' : '#2f8f4a';
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" role="img" aria-label="LAX and Barstow-Daggett pressure">`,
    `<defs><clipPath id="fmc"><rect width="${W}" height="${H}" rx="10"/></clipPath><marker id="fah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${col}"/></marker></defs><g clip-path="url(#fmc)">`,
    `<rect width="${W}" height="${H}" fill="#f5f4f0"/>`,
    // desert east of the mountains, a soft tint
    `<polygon points="${[[35.3, -118.6], [34.55, -118.1], [34.35, -117.3], [34.15, -116.6], [33.9, -116.0], [35.3, -116.0]].map(P).join(' ')}" fill="#f1e9d8"/>`];
  // the coast from Santa Barbara past LA to San Clemente
  const COAST_LA = [[34.42, -119.6], [34.41, -119.45], [34.40, -119.30], [34.28, -119.27], [34.15, -119.20], [34.05, -118.95], [34.03, -118.75],
    [34.03, -118.55], [34.00, -118.48], [33.90, -118.42], [33.80, -118.40], [33.74, -118.40], [33.71, -118.29], [33.75, -118.20], [33.74, -118.10],
    [33.60, -117.90], [33.47, -117.70], [33.39, -117.59], [33.25, -117.42]];
  o.push(`<polygon points="${COAST_LA.map(P).join(' ')} ${P([33.0, -117.3])} ${P([33.0, -119.8])} ${P([34.6, -119.8])}" fill="#cfe2ee" stroke="#b7cfdd" stroke-width="1.2"/>`);
  if (!small) o.push(`<text x="${f(X(-118.95))}" y="${f(Y(33.62))}" font-size="10" fill="#7a99ad" letter-spacing="2">PACIFIC</text>`);
  // the mountain wall between the two (San Gabriel / San Bernardino), as a quiet ridge line
  o.push(`<polyline points="${[[34.42, -118.7], [34.33, -118.1], [34.30, -117.75], [34.24, -117.3], [34.18, -116.85]].map(P).join(' ')}" fill="none" stroke="#8c8270" stroke-width="5" stroke-linecap="round" opacity=".45"/>`);
  if (!small) o.push(`<text x="${f(X(-117.95))}" y="${f(Y(34.40) - 9)}" font-size="10" font-style="italic" fill="#6b6457" text-anchor="middle" letter-spacing="1.5">MOUNTAINS</text>`);
  // offshore push: an arrow from the desert high toward the coast when the gradient is negative
  if (g != null && g < 0) {
    const w = Math.min(7, 2 + Math.abs(g) * 0.8);
    const k = small ? 1.6 : 1;
    o.push(`<line x1="${f(X(dagLo) - 30 * k)}" y1="${f(Y(dagLa) + 30 * k)}" x2="${f(X(laxLo) + 30 * k)}" y2="${f(Y(laxLa) - 30 * k)}" stroke="${col}" stroke-width="${f(w * (small ? 1.6 : 1))}" stroke-linecap="round" opacity=".75" marker-end="url(#fah)"/>`);
  }
  const fs = small ? 1.9 : 1;
  const stn = (n, la, lo, p, anchor, below) => {
    const x = X(lo), y = Y(la), tx = small ? x : anchor === 'end' ? x - 12 : x + 12, ty = small ? (below ? y + 34 : y - 46) : y - 4;
    o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${7 * (small ? 1.6 : 1)}" fill="#26303a" stroke="#fff" stroke-width="2"/>`);
    o.push(`<text x="${f(tx)}" y="${f(ty)}" text-anchor="${small ? 'middle' : anchor}" font-size="${15 * fs}" font-weight="800" fill="#1f2328" paint-order="stroke" stroke="#f5f4f0" stroke-width="4">${n}</text>`);
    o.push(`<text x="${f(tx)}" y="${f(ty + 18 * fs)}" text-anchor="${small ? 'middle' : anchor}" font-size="${13 * fs}" fill="#374151" paint-order="stroke" stroke="#f5f4f0" stroke-width="4">${p != null ? p.toFixed(1) : '–'}${small ? '' : ' mb'}</text>`);
  };
  stn(small ? 'LAX' : 'LAX', laxLa, laxLo, slp.LAX, 'start', true);
  stn(small ? 'DAG' : 'Daggett', dagLa, dagLo, slp.DAG, 'end', false);
  // the reading, top left
  if (small) {
    o.push(`<text x="${W / 2}" y="${H / 2 + 14}" text-anchor="middle" font-size="44" font-weight="800" fill="${col}" paint-order="stroke" stroke="#f5f4f0" stroke-width="6">${g != null ? (g > 0 ? '+' : '') + g.toFixed(1) : '–'}</text>`);
    o.push(`<text x="${W / 2}" y="${H / 2 + 40}" text-anchor="middle" font-size="22" font-weight="600" fill="${col}" paint-order="stroke" stroke="#f5f4f0" stroke-width="5">mb</text>`);
    o.push('</g></svg>');
    return o.join('');
  }
  o.push(`<g><rect x="12" y="12" width="210" height="52" rx="10" fill="#fff" stroke="#e4e7ec"/>`,
    `<text x="24" y="33" font-size="11" fill="#6b7280">LAX − Daggett${slp.at ? ' · ' + new Date(slp.at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }).toLowerCase() : ''}</text>`,
    `<text x="24" y="55" font-size="20" font-weight="800" fill="${col}">${g != null ? (g > 0 ? '+' : '') + g.toFixed(1) + ' mb' : 'no reading'}</text>`,
    `<text x="212" y="55" font-size="11" text-anchor="end" fill="${col}">${g == null ? '' : g <= -6 ? 'strong offshore' : g <= -4 ? 'Santa Ana' : g <= -2 ? 'weak offshore' : g < 0 ? 'light offshore' : 'onshore'}</text></g>`);
  o.push('</g></svg>');
  return o.join('');
}

function foehnChartSVG(G) {
  const W = 600, H = 300, L = 40, R = 14, T = 16, B = 34;
  const now = Date.now(), t0 = now - 2 * 864e5, t1 = now + 7 * 864e5;
  const toT = k => Date.parse(k + ':00:00Z');
  const series = Object.entries(G.models || {}).map(([m, v]) => [m, Object.entries(v.hourly || {}).map(([k, y]) => [toT(k), y]).filter(([t]) => t >= now - 3 * 36e5 && t <= t1).sort((a, b) => a[0] - b[0])]);
  const obs = Object.entries(G.obs || {}).map(([k, y]) => [toT(k), y]).filter(([t]) => t >= t0).sort((a, b) => a[0] - b[0]);
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
  for (let t = day.getTime(); t <= t1; t += 864e5) {
    if (t >= t0) o.push(`<line x1="${f(X(t))}" x2="${f(X(t))}" y1="${T}" y2="${H - B}" stroke="#e4e7ec"/>`);
    const mid = t + 432e5;
    if (mid > t0 && mid < t1) o.push(`<text x="${f(X(mid))}" y="${H - B + 16}" text-anchor="middle" font-size="11" font-weight="600" fill="#475467">${new Date(mid).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short' })}</text>`);
  }
  o.push(`<line x1="${f(X(now))}" x2="${f(X(now))}" y1="${T}" y2="${H - B}" stroke="#26303a" stroke-dasharray="2 3"/><text x="${f(X(now) + 3)}" y="${T + 9}" font-size="9.5" fill="#26303a">now</text>`);
  const line = (pts, c, w, dash) => pts.length > 1 && o.push(`<polyline points="${pts.map(([t, v]) => `${f(X(t))},${f(Y(v))}`).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`);
  for (const [m, s] of series) line(s, FOEHN_COL[m] || '#6b7280', 1.8);
  line(obs, '#111827', 2.6);
  o.push('</svg>');
  const legend = `<div class="fleg"><span><i style="background:#111827"></i>observed</span>${series.map(([m]) => `<span><i style="background:${FOEHN_COL[m] || '#6b7280'}"></i>${m === 'ECMWF' ? 'EC' : m}</span>`).join('')}</div>`;
  return o.join('') + legend;
}

if (typeof module !== 'undefined') module.exports = { foehnMapSVG, foehnChartSVG };
