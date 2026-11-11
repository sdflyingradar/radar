// Detailed region thermal chart (our own design): the day hour by hour, from the ground up.
//   top strip   each hour in the radar's verdict colours (no-go red ... great XC blue)
//   clouds      high / mid / low layers in oktas (darker = more), weather symbol per hour
//   main chart  thermal strength (m/s) as orange cells per 500 ft, cumulus as grey columns from base to top,
//               inversions as pink bands, wind arrows at every 1,000 ft: the fill is the mean wind over the region,
//               the rim the strongest wind in the region at that height (a strong rim = somewhere it blows hard)
//   statistics  strongest climb and highest top of the day, with their times
// panel2SVG(data, dayIndex) -> SVG string; same data as panelSVG (data/region/regions.json, one region).

const P2_LIFT = [[0, '#ffeedd'], [0.5, '#fdd0a2'], [1, '#fbb068'], [1.5, '#f89039'], [2, '#f2683f'], [2.5, '#dc4658'], [3, '#b52f72'], [3.5, '#7a2081'], [4, '#3f1468']];   // lift m/s: the familiar orange up to 1.5, then sunrise (coral, raspberry, magenta, purple) to 4
// wind, mph (from the usual pilot scale in km/h: 0-6 calm, 7-14 fine, 15-24 noticeable, 25-30 strong, 31-36 stop, over 36 no-go)
const P2_WIND = [[0, '#ffffff'], [4, '#3fc25a'], [9.5, '#f5d90a'], [15.5, '#f08a1c'], [19, '#e0262a'], [22.5, '#111111']];   // over 36 km/h: black (only in this chart; tiles and classic stop at red)
// the radar's own verdicts and colours: 1 no-go (red), 2 marginal (orange), 3 site fly (yellow), 4 XC (green), 5 great XC (blue)
const P2_VERDICT = [[1, '#d8402f', 'No-go'], [2, '#ee8a1c', 'Marginal'], [3, '#f1c72b', 'Site fly'], [4, '#3aa457', 'XC'], [5, '#2f7fcf', 'Great XC']];
const P2_RATE = (s) => s == null ? '#e5e7eb' : P2_VERDICT[Math.max(0, Math.min(4, Math.round(s) - 1))][1];
const p2pick = (scale, v) => { let c = scale[0][1]; for (const [k, col] of scale) if (v >= k - 1e-9) c = col; return c; };
const P2_OKTA = (n) => ['#eef4fb', '#e3e7ec', '#d6dbe1', '#c6ccd3', '#b4bbc3', '#9fa7b0', '#8a929c', '#747c86', '#5f6670'][Math.max(0, Math.min(8, n | 0))];

function p2weather(h) {
  // sun / few clouds / cloudy / showers / thunder, from cloud cover, rain and instability
  const ok = h.okta || [0, 0, 0], tot = Math.max(...ok);
  if ((h.rain_mm || 0) >= 0.3 && (h.cape || 0) >= 800) return 'storm';
  if ((h.rain_mm || 0) >= 0.2) return 'rain';
  if (tot >= 7) return 'cloud';
  if (tot >= 3 || (h.cu || 0) >= 0.4) return 'part';
  return 'sun';
}
// local sunrise and sunset (decimal hours, Pacific time) for a date and place (NOAA approximation)
function p2sun(date, lat, lon) {
  const d = new Date(date + 'T12:00:00Z'), n = Math.round((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5);
  const g = 2 * Math.PI / 365 * (n - 1), r = Math.PI / 180;
  const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const ch = Math.cos(90.833 * r) / (Math.cos(lat * r) * Math.cos(decl)) - Math.tan(lat * r) * Math.tan(decl);
  const ha = Math.acos(Math.max(-1, Math.min(1, ch))) / r;
  let off = -8;
  try { const t = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hourCycle: 'h23' }).format(d); off = +t - 12; } catch (e) {}
  return [(720 - 4 * (lon + ha) - eot) / 60 + off, (720 - 4 * (lon - ha) - eot) / 60 + off];
}
function p2icon(kind, x, y, night) {
  const sun = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f6b51e"/><g stroke="#f6b51e" stroke-width="1.6" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => { const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); return `<line x1="${(cx + c * (r + 2.5)).toFixed(1)}" y1="${(cy + s * (r + 2.5)).toFixed(1)}" x2="${(cx + c * (r + 5)).toFixed(1)}" y2="${(cy + s * (r + 5)).toFixed(1)}"/>`; }).join('')}</g>`;
  const cloud = (cx, cy, col) => `<path d="M${cx - 10} ${cy + 5} h20 a5 5 0 0 0 0 -10 a7 7 0 0 0 -13 -2 a5 5 0 0 0 -7 12 z" fill="${col}" stroke="#9aa3ad" stroke-width=".8"/>`;
  const g = (inner) => `<g transform="translate(${x.toFixed(1)} ${y})">${inner}</g>`;
  const moon = (cx, cy, r) => `<path d="M${cx + r * 0.35} ${cy - r} a${r} ${r} 0 1 0 ${r * 0.65} ${r * 1.55} a${r * 0.8} ${r * 0.8} 0 0 1 ${-r * 0.65} ${-r * 1.55} z" fill="#f3f5f9"/>`;
  if (night && kind === 'sun') return g(moon(0, 0, 7));
  if (night && kind === 'part') return g(moon(-4, -4, 6) + cloud(3, 3, '#fff'));
  if (kind === 'sun') return g(sun(0, 0, 6));
  if (kind === 'part') return g(sun(-4, -4, 5) + cloud(3, 3, '#fff'));
  if (kind === 'cloud') return g(cloud(0, 1, '#d5dae0'));
  if (kind === 'rain') return g(cloud(0, -1, '#c3c9d0') + `<g fill="#3b82f6"><path d="M-5 7 l-1.5 4 a1.6 1.6 0 1 0 3 0z"/><path d="M2 7 l-1.5 4 a1.6 1.6 0 1 0 3 0z"/></g>`);
  return g(cloud(0, -1, '#9aa3ad') + `<path d="M0 6 l-4 6 h3 l-2 5 6-7 h-3 l2-4z" fill="#f6b51e"/>`);
}

// wind at height z (ft) from the profile [[z, dir, mph, max], ...], interpolated (direction as a vector)
function p2windAt(wl, z) {
  if (!wl || !wl.length) return null;
  const as = (x) => [x[1], x[2], x[3] ?? x[2]];                   // [dir, mean, strongest]
  if (z < wl[0][0]) return z > wl[0][0] - 2500 ? as(wl[0]) : null;     // just below the lowest level: its wind
  let a = wl[0], b = wl[wl.length - 1];
  if (z >= b[0]) return z - b[0] < 2500 ? as(b) : null;
  for (let k = 0; k < wl.length - 1; k++) if (z >= wl[k][0] && z <= wl[k + 1][0]) { a = wl[k]; b = wl[k + 1]; break; }
  const t = b[0] === a[0] ? 0 : (z - a[0]) / (b[0] - a[0]);
  const rad = (d) => d * Math.PI / 180;
  const u = (1 - t) * Math.sin(rad(a[1])) * a[2] + t * Math.sin(rad(b[1])) * b[2], v = (1 - t) * Math.cos(rad(a[1])) * a[2] + t * Math.cos(rad(b[1])) * b[2];
  return [(Math.atan2(u, v) * 180 / Math.PI + 360) % 360, (1 - t) * a[2] + t * b[2], (1 - t) * (a[3] ?? a[2]) + t * (b[3] ?? b[2])];
}
// a dart pointing downwind; fill = mean wind, rim = strongest wind in the region
function p2arrow(x, y, w, s) {
  const fill = p2pick(P2_WIND, w[1]), rim = p2pick(P2_WIND, Math.max(w[1], w[2]));
  const k = s / 10;
  const tr = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((w[0] + 180) % 360).toFixed(0)}) scale(${k.toFixed(2)})`;
  return `<path d="M0 -9 L6.5 8 L0 4.2 L-6.5 8 Z" transform="${tr}" fill="none" stroke="#fff" stroke-width="${(4.2 / k).toFixed(2)}" stroke-linejoin="round" opacity=".55"/>`   // a light halo
    + `<path d="M0 -9 L6.5 8 L0 4.2 L-6.5 8 Z" transform="${tr}" fill="${fill}" stroke="${rim === '#ffffff' ? '#9aa3ad' : rim}" stroke-width="${(2.1 / k).toFixed(2)}" stroke-linejoin="round"/>`;
}

// colour keys under a chart, both in whole-number steps: wind (bottom left) and climb (bottom right)
function chartKeys(o, { L, Rx, y, fs = 1, wind, lift, slim = false, INK = '#1f2328', MUTED = '#6b7280' }) {
  const f = (v) => v.toFixed(1), bh = 12 * fs, bw = 29 * fs, ty = y + bh - 2.6 * fs;
  o.push(`<text x="${L}" y="${f(ty)}" font-size="${10.5 * fs}" fill="${MUTED}">wind mph</text>`);
  let x = L + 54 * fs;
  wind.forEach(([v, c]) => { o.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" rx="2" fill="${c}"/><text x="${f(x + bw / 2)}" y="${f(ty)}" text-anchor="middle" font-size="${9 * fs}" fill="${c === '#111111' || c === '#3a3f45' ? '#fff' : INK}">${Math.round(v)}</text>`); x += bw + 1; });
  // climb: one box per whole m/s (the chart itself still shades in half steps)
  const lk = lift.filter(([v]) => v % 1 === 0), gx = Rx - lk.length * (bw + 1) + 1;
  if (slim) {
    // SkyGram: the column laid on its side, slim at 0-1 m/s, a little wider at 1.5, full from 2, the colours blending along it
    const len = lk.length * (bw + 1) - 1, X0 = gx, XV = (v) => X0 + bw / 2 + v * (bw + 1), cy = y + bh / 2, kh = bh * 1.15;
    const ss = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
    const hw = (v) => kh / 2 * (v <= 1 ? 0.5 : v <= 1.5 ? 0.5 + 0.3 * ss((v - 1) / 0.5) : 0.8 + 0.2 * ss((v - 1.5) / 0.5));
    const vs = [], v0 = (X0 - XV(0)) / (bw + 1), v1 = (X0 + len - XV(0)) / (bw + 1);
    for (let v = v0; v < v1; v += 0.05) vs.push(v); vs.push(v1);
    const top = vs.map((v) => `${f(XV(v))} ${f(cy - hw(v))}`), bot = vs.slice().reverse().map((v) => `${f(XV(v))} ${f(cy + hw(v))}`);
    const id = `lk${Math.random().toString(36).slice(2, 8)}`;
    const stops = lift.map(([v, c]) => `<stop offset="${((XV(v) - X0) / len).toFixed(3)}" stop-color="${c}"/>`).join('');
    // same 3D look as the columns: a soft drop shadow and a cylinder light, here from the top
    const d = `M${top.join(' L')} L${bot.join(' L')} Z`;
    o.push(`<defs><linearGradient id="${id}" x1="0" x2="1">${stops}</linearGradient>`
      + `<linearGradient id="${id}c" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".32" stop-color="#fff" stop-opacity=".06"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>`
      + `<filter id="${id}s" x="-5%" y="-40%" width="110%" height="200%"><feDropShadow dx="0.8" dy="1.4" stdDeviation="1.1" flood-color="#5b2a12" flood-opacity=".28"/></filter></defs>`
      + `<path d="${d}" fill="url(#${id})" filter="url(#${id}s)"/><path d="${d}" fill="url(#${id}c)"/>`);
    lk.forEach(([v]) => o.push(`<text x="${f(XV(v))}" y="${f(ty)}" text-anchor="middle" font-size="${9 * fs}" fill="${v >= 2.5 ? '#fff' : INK}">${v}</text>`));
  } else lk.forEach(([v, c], i) => { const kx = gx + i * (bw + 1); o.push(`<rect x="${f(kx)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" rx="2" fill="${c}"/><text x="${f(kx + bw / 2)}" y="${f(ty)}" text-anchor="middle" font-size="${9 * fs}" fill="${v >= 2.5 ? '#fff' : INK}">${v}</text>`); });
  o.push(`<text x="${f(gx - 6)}" y="${f(ty)}" text-anchor="end" font-size="${10.5 * fs}" fill="${MUTED}">climb m/s</text>`);
}

function panel2SVG(data, di = 0) {
  const day = data.days[di];
  const hrs = Object.keys(day.hours).map(Number).sort((a, b) => a - b).filter(h => !data.compact || (h >= 8 && h <= 19));
  const H = (h) => day.hours[h] || {};
  const INK = '#1f2328', MUTED = '#6b7280', GRID = '#f0f2f5', GRID2 = '#dde1e6';
  const fs = data.compact ? 1.3 : 1;                 // bigger text when the chart is shown small (radar site card)
  const W = 1000, L = data.compact ? 96 : 78, R = 14, cw = (W - L - R) / hrs.length;
  const X = (k) => L + k * cw, CX = (k) => L + (k + 0.5) * cw;
  // heights: from just below the ground to well above the highest lift, cloud and marks
  // the ground: the lowest of the region's mean ground and its lowest thermal cell (valleys lift too)
  const lowCell = Math.min(...hrs.flatMap(h => Object.keys(H(h).grid || {}).map(Number)), 1e9);
  // ... and its lowest ground-wind probe, so no arrow ever sits underground
  const lowWind = Math.min(...hrs.flatMap(h => (H(h).gw || []).map(g => g[0])), 1e9);
  const ground = Math.min(...hrs.map(h => H(h).ground_ft ?? (data.floor_ft ?? 0)), lowCell, lowWind);
  const zs = [];
  for (const h of hrs) { for (const z of Object.keys(H(h).grid || {})) zs.push(+z + 500); if (H(h).cu_top_ft) zs.push(H(h).cu_top_ft); if (H(h).top_max_ft) zs.push(H(h).top_max_ft); }
  const marks = data.marks || [];
  const zmin = Math.max(0, Math.floor((Math.min(ground, data.floor_ft ?? ground) - 500) / 500) * 500);
  const zmax = Math.min(18000, Math.max(zmin + (data.compact ? 6000 : 8000), Math.ceil(((zs.length ? Math.max(...zs) : 6000) + 2500) / 1000) * 1000, ...marks.map(m => Math.ceil((m.ft + 1500) / 1000) * 1000)));
  const pxft = data.compact ? 0.05 : 0.055;
  const yS = data.compact ? 34 : 62, yC = yS + 22, ch = data.compact ? 24 : 19, yI = yC + 3 * ch + 8, yG = yI + 34;
  const gh = (zmax - zmin) * pxft;
  const Y = (z) => yG + gh - (z - zmin) * pxft;
  const yB = yG + gh, yA = yB + 40 * fs;              // the time axis and the climb legend sit under the chart
  const Hh = yA + (data.compact ? 44 : 32);
  const f = (v) => v.toFixed(1);
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}" font-family="Inter, Roboto, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="13" fill="${INK}">`);
  o.push(`<rect width="${W}" height="${Hh}" fill="#fff"/>`);
  const gen = data.generated ? new Date(data.generated.replace('Z', ':00Z').replace(/:00:00Z$/, ':00Z')) : null;
  const run = gen && !isNaN(gen) ? gen.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).toLowerCase() : '';
  const models = [...new Set(hrs.flatMap(h => H(h).models || []))].join(' + ');
  if (data.compact) {
    o.push(`<text x="${L}" y="20" font-size="15" fill="${MUTED}">thermals and wind by height</text>`);   // day and region sit above the chart
    o.push(`<text x="${W - R}" y="20" text-anchor="end" font-size="14" fill="${MUTED}">${models}${run ? ' · ' + run : ''}</text>`);
  } else {
    const d = new Date(day.date + 'T12:00:00');
    o.push(`<text x="${L}" y="28" font-size="22" font-weight="700">${data.title || data.region}</text>`);
    o.push(`<text x="${L}" y="50" font-size="14" fill="${MUTED}">${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · ${models}${run ? ' · run ' + run : ''}</text>`);
  }
  // top strip: how good each hour is
  hrs.forEach((h, k) => o.push(`<rect x="${f(X(k) + 0.6)}" y="${yS}" width="${f(cw - 1.2)}" height="13" fill="${P2_RATE(H(h).score)}"/>`));
  o.push(`<text x="${L - 8}" y="${f(yS + 6.5 + 4 * fs)}" text-anchor="end" font-size="${12 * fs}" font-weight="700">Verdict</text>`);
  // cloud layers: high, mid, low
  // a quiet grid: one faint cell per hour and layer, so clear skies don't read as a dark empty block
  [0, 1, 2].forEach(r => hrs.forEach((h, k) => o.push(`<rect x="${f(X(k) + 0.8)}" y="${yC + r * ch + 1}" width="${f(cw - 1.6)}" height="${ch - 2}" rx="3" fill="#f6f8fa" stroke="#e8ebef" stroke-width=".8"/>`)));
  ['H', 'M', 'L'].forEach((lab, r) => {
    o.push(`<text x="${L - 8}" y="${f(yC + r * ch + ch / 2 + 4 * fs)}" text-anchor="end" font-size="${11 * fs}">${lab}</text>`);
    hrs.forEach((h, k) => {
      const n = (H(h).okta || [0, 0, 0])[2 - r];
      if (n > 0) o.push(`<rect x="${f(X(k) + 0.8)}" y="${yC + r * ch + 1}" width="${f(cw - 1.6)}" height="${ch - 2}" rx="3" fill="${P2_OKTA(n)}"/><text x="${f(CX(k))}" y="${f(yC + r * ch + ch / 2 + 4 * fs)}" text-anchor="middle" font-size="${11 * fs}" fill="${n >= 6 ? '#fff' : INK}">${n}</text>`);
    });
  });
  o.push(`<text transform="translate(${f(14 * fs)} ${yC + 1.5 * ch + 4}) rotate(-90)" text-anchor="middle" font-size="${12 * fs}" font-weight="700">Clouds</text>`);
  // weather symbols
  const pts = data.poly || [];
  const la = pts.length ? pts.reduce((a, q) => a + q[0], 0) / pts.length : 33, lo = pts.length ? pts.reduce((a, q) => a + q[1], 0) / pts.length : -117;
  const [rise, set] = p2sun(day.date, la, lo);
  hrs.forEach((h, k) => {
    const night = h > set || h < rise;
    if (night) o.push(`<rect x="${f(X(k) + 0.8)}" y="${yI}" width="${f(cw - 1.6)}" height="26" rx="4" fill="#2b3445"/>`);   // dark hours
    o.push(p2icon(p2weather(H(h)), CX(k), yI + 13, night));
  });
  // main chart frame and height grid
  for (let z = Math.ceil(zmin / 1000) * 1000; z <= zmax; z += 1000) {
    o.push(`<line x1="${L}" x2="${W - R}" y1="${f(Y(z))}" y2="${f(Y(z))}" stroke="${z % 5000 ? GRID : GRID2}"/>`);
    o.push(`<text x="${L - 8}" y="${f(Y(z) + 4.5)}" text-anchor="end" font-size="${13 * fs}">${z.toLocaleString('en-US')}</text>`);
  }
  const U = Math.random().toString(36).slice(2, 7);   // ids unique to this chart (several charts share a page)
  o.push(`<defs><filter id="sh${U}" x="-30%" y="-10%" width="160%" height="130%"><feDropShadow dx="1.4" dy="2" stdDeviation="1.6" flood-color="#5b2a12" flood-opacity=".28"/></filter>`
    + `<linearGradient id="cyl${U}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".32" stop-color="#fff" stop-opacity=".06"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>`
    + `<linearGradient id="cu${U}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`
    + `<linearGradient id="gnd${U}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e8dcc4"/><stop offset="1" stop-color="#d9c8a6"/></linearGradient></defs>`);
  // night: a faint shade over the dark hours
  hrs.forEach((h, k) => { if (h > set || h < rise) o.push(`<rect x="${f(X(k))}" y="${yG}" width="${f(cw)}" height="${f(gh)}" fill="#2b3445" opacity=".07"/>`); });
  // ground
  o.push(`<rect x="${L}" y="${f(Y(ground))}" width="${W - L - R}" height="${f(yG + gh - Y(ground))}" fill="url(#gnd${U})"/><line x1="${L}" x2="${W - R}" y1="${f(Y(ground))}" y2="${f(Y(ground))}" stroke="#c9b58e" stroke-width="1.2"/>`);
  // glass-off (site cards): a smooth teal band around the glass-off launch's height over the glass-off hours,
  // behind the columns; white streamlines for the smooth air
  let glassLbl = '';
  if (data.gwin && data.gwin.length === 2 && data.gft && data.gft > zmin && data.gft < zmax) {
    const ks = hrs.map((h, k) => [h, k]).filter(([h]) => h >= data.gwin[0] && h <= data.gwin[1]).map(([, k]) => k);
    if (ks.length) {
      const x0 = X(ks[0]) + 2, x1 = X(ks[ks.length - 1]) + cw - 2, yt = Y(Math.min(zmax, data.gft + 700)), yb = Y(Math.max(ground, zmin, data.gft - 500));
      o.push(`<rect x="${f(x0)}" y="${f(yt)}" width="${f(x1 - x0)}" height="${f(yb - yt)}" rx="${f(Math.min(14, (yb - yt) / 2))}" fill="#22a6b3" opacity=".42"/>`);
      for (const t of [0.3, 0.55, 0.8]) {
        const yy = yt + (yb - yt) * t, n = Math.max(2, Math.round((x1 - x0) / 40)), dx = (x1 - x0 - 16) / n;
        let d = `M${f(x0 + 8)} ${f(yy)}`; for (let i = 0; i < n; i++) d += ` q${f(dx / 2)} ${i % 2 ? 3 : -3} ${f(dx)} 0`;
        o.push(`<path d="${d}" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>`);
      }
      glassLbl = (`<text x="${f(x0 + 6)}" y="${f(yt - 4)}" font-size="${data.compact ? 12 : 11}" font-weight="600" fill="#178a95" paint-order="stroke" stroke="#fff" stroke-width="3">glass-off</text>`);
    }
  }
  // thermal cells (500 ft) and cumulus columns
  const bw = cw * 0.72;
  hrs.forEach((h, k) => {
    const g = H(h).grid || {}, x0 = CX(k) - bw / 2;
    // lift: one rounded column per hour, the 500 ft steps as sharp colour bands, shaded like a cylinder
    const cells = Object.entries(g).filter(([, v]) => typeof v === 'number').map(([zk, v]) => [+zk, v]).filter(([z]) => z + 500 > zmin && z < zmax).sort((a, b) => a[0] - b[0]);
    if (cells.length) {
      // each 500 ft segment as wide as its climb: full from 2 m/s, slimmer at 1.5, half at 1 and below. The segments
      // flow into one column: the outline curves from one width to the next and the colours blend a little at
      // each step; rounded top, one soft shadow, shaded like a cylinder.
      const wv = (v) => bw * (v >= 2 ? 1 : v >= 1.5 ? 0.8 : 0.5) / 2;
      const segs = cells.map(([z, v]) => ({ yb: Y(Math.max(z, zmin)), yt: Y(Math.min(z + 500, zmax)), hw: wv(v), c: p2pick(P2_LIFT, v) }));
      const cx = CX(k), yBot = segs[0].yb, yTop = segs[segs.length - 1].yt, H0 = yBot - yTop, sh = (yBot - yTop) / segs.length;
      const tz = Math.min(sh * 0.5, 12);                       // how far each width change is spread
      const edge = (sgn) => {                                  // one side, bottom to top
        let d = `L${f(cx + sgn * segs[0].hw)} ${f(yBot)}`;
        segs.forEach((sg, i) => {
          const nx = segs[i + 1];
          if (nx && nx.hw !== sg.hw) {
            d += ` L${f(cx + sgn * sg.hw)} ${f(sg.yt + tz)} C${f(cx + sgn * sg.hw)} ${f(sg.yt)} ${f(cx + sgn * nx.hw)} ${f(sg.yt)} ${f(cx + sgn * nx.hw)} ${f(sg.yt - tz)}`;
          }
        });
        return d;
      };
      const tw = segs[segs.length - 1].hw, r = Math.min(tw, 9, H0 / 2);
      const right = edge(1), left = edge(-1);
      // left side runs top to bottom: rebuild it reversed
      const pts = [];
      segs.forEach((sg, i) => { const nx = segs[i + 1]; if (nx && nx.hw !== sg.hw) pts.push(sg); });
      let back = `L${f(cx - tw)} ${f(yTop + r)}`;
      for (let i = pts.length - 1; i >= 0; i--) {
        const sg = pts[i], nx = segs[segs.indexOf(sg) + 1];
        back += ` L${f(cx - nx.hw)} ${f(sg.yt - tz)} C${f(cx - nx.hw)} ${f(sg.yt)} ${f(cx - sg.hw)} ${f(sg.yt)} ${f(cx - sg.hw)} ${f(sg.yt + tz)}`;
      }
      back += ` L${f(cx - segs[0].hw)} ${f(yBot)} Z`;
      const d = `M${f(cx)} ${f(yBot)} ${right.slice(1) ? right : ''} L${f(cx + tw)} ${f(yTop + r)} Q${f(cx + tw)} ${f(yTop)} ${f(cx + tw - r)} ${f(yTop)} H${f(cx - tw + r)} Q${f(cx - tw)} ${f(yTop)} ${f(cx - tw)} ${f(yTop + r)} ${back}`;
            // each colour solid in the middle of its segment, blending into the next
      const stops = segs.slice().reverse().map((sg) => { const a2 = (sg.yt - yTop) / H0, b2 = (sg.yb - yTop) / H0; return `<stop offset="${Math.max(0, a2 + 0.3 * (b2 - a2)).toFixed(3)}" stop-color="${sg.c}"/><stop offset="${Math.min(1, b2 - 0.3 * (b2 - a2)).toFixed(3)}" stop-color="${sg.c}"/>`; }).join('');
      const id = `lg${U}${k}`;
      o.push(`<defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1">${stops}</linearGradient></defs><path d="${d}" fill="url(#${id})" filter="url(#sh${U})"/><path d="${d}" fill="url(#cyl${U})"/>`);
    }
    const hb = H(h);
    if (hb.base_ft && (hb.cu || 0) >= 0.15) {
      const top = Math.max(hb.base_ft + 600, hb.cu_top_ft || hb.base_ft + 1000), cw2 = bw * (0.35 + 0.65 * Math.min(1, hb.cu));
      const shade = hb.cu >= 0.7 ? '#b4bbc3' : hb.cu >= 0.4 ? '#cdd2d8' : '#e3e6ea';
      o.push(`<rect x="${f(CX(k) - cw2 / 2)}" y="${f(Y(Math.min(top, zmax)))}" width="${f(cw2)}" height="${f(Math.max(4, (Math.min(top, zmax) - hb.base_ft) * pxft))}" rx="${f(Math.min(10, cw2 / 2))}" fill="${shade}" opacity=".95" filter="url(#sh${U})"/><rect x="${f(CX(k) - cw2 / 2)}" y="${f(Y(Math.min(top, zmax)))}" width="${f(cw2)}" height="${f(Math.max(4, (Math.min(top, zmax) - hb.base_ft) * pxft))}" rx="${f(Math.min(10, cw2 / 2))}" fill="url(#cu${U})"/>`);
    }
  });
  // inversions (pink)
  hrs.forEach((h, k) => {
    for (const [a, b] of H(h).inv || []) {
      if (b <= zmin || a >= zmax) continue;
      const lo = Math.max(a, zmin), hi = Math.min(b, zmax), hgt = Math.max(5, (hi - lo) * pxft);
      o.push(`<rect x="${f(X(k) + 0.5)}" y="${f(Y(hi))}" width="${f(cw - 1)}" height="${f(hgt)}" fill="#e58ac2" opacity=".2"/><line x1="${f(X(k) + 0.5)}" x2="${f(X(k) + cw - 0.5)}" y1="${f(Y(hi))}" y2="${f(Y(hi))}" stroke="#d1589f" stroke-width="1.2" opacity=".6"/>`);
    }
  });
  o.push(glassLbl);   // the glass-off label on top of the columns
  // site heights
  for (const m of marks) {
    if (m.ft < zmin || m.ft > zmax) continue;
    o.push(`<line x1="${L}" x2="${W - R}" y1="${f(Y(m.ft))}" y2="${f(Y(m.ft))}" stroke="#a16207" stroke-dasharray="5 4" stroke-width="1" opacity=".7"/>`);
    o.push(`<text x="${W - R - 4}" y="${f(Y(m.ft) - 4)}" text-anchor="end" font-size="11" fill="#a16207" paint-order="stroke" stroke="#fff" stroke-width="3">${m.name} ${m.ft.toLocaleString()}'</text>`);
  }
  // wind arrows: one arrow per height, one column of arrows per hour, never two at the same height.
  // Every 1,000 ft; where a probe's ground lies within 500 ft of that height (landing fields, valleys, slopes),
  // the arrow is that ground wind (10 m), otherwise the free-air wind. The lowest ground gets its own arrow when it
  // lies more than 600 ft below the first row.
  const asz = Math.min(13, cw * 0.36);
  hrs.forEach((h, k) => {
    const wl = H(h).wl || [], gw = (H(h).gw || []).filter(g => g[0] >= zmin);
    if (!wl.length && !gw.length) return;
    const gwind = (g) => [g[1], g[2], Math.max(g[2], g[3] ?? g[2])];
    const first = Math.ceil((Math.max(ground, zmin) + 300) / 1000) * 1000;   // from just above the chart's ground: no gap

    if (gw.length && first - gw[0][0] > 600) o.push(p2arrow(CX(k), Math.min(Y(gw[0][0]) - asz * 0.4, yG + gh - asz * 0.7), gwind(gw[0]), asz));
    for (let z = first; z <= zmax - 300; z += 1000) {
      const near = gw.filter(g => Math.abs(g[0] - z) <= 700).sort((a, b) => Math.abs(a[0] - z) - Math.abs(b[0] - z))[0];
      const w = near ? gwind(near) : p2windAt(wl, z);
      if (w) o.push(p2arrow(CX(k), Y(z), w, asz));
    }
  });
  o.push(`<text transform="translate(${f(14 * fs)} ${f(yG + gh / 2)}) rotate(-90)" text-anchor="middle" font-size="${13 * fs}" font-weight="700">Altitude (ft)</text>`);
  // time axis under the chart (hours at the column edges), then the climb legend at the bottom right
  o.push(`<line x1="${L}" x2="${W - R}" y1="${f(yB)}" y2="${f(yB)}" stroke="${GRID2}"/>`);
  hrs.forEach((h, k) => { if (!data.compact || k % 2 === 0) o.push(`<text x="${f(X(k))}" y="${f(yB + 18 * fs)}" text-anchor="middle" font-size="${13 * fs}">${h > 12 ? h - 12 : h}:00</text>`); });
  o.push(`<text x="${f((L + W - R) / 2)}" y="${f(yB + 36 * fs)}" text-anchor="middle" font-size="${13 * fs}" font-weight="700">Time (PT)</text>`);
  chartKeys(o, { L, Rx: W - R, y: yB + 27 * fs, fs, wind: P2_WIND.map(([v, c]) => [v, v ? c : '#eef1f4']), lift: P2_LIFT, slim: true, INK, MUTED });
  // statistics
  let best = null, hi = null;
  hrs.forEach((h) => {
    const c = Math.max(0, ...Object.values(H(h).grid || {}).filter(v => typeof v === 'number'));
    if (!best || c > best[0]) best = [c, h];
    if (H(h).top_max_ft && (!hi || H(h).top_max_ft > hi[0])) hi = [H(h).top_max_ft, h];
  });
  const hh = (h) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'pm' : 'am'}`;
  const sy = yA + 18;
  const stat = [best && best[0] > 0 ? `strongest climb ${best[0].toFixed(1)} m/s at ${hh(best[1])}` : 'no usable climbs', hi ? `highest top ${hi[0].toLocaleString()} ft at ${hh(hi[1])}` : ''].filter(Boolean).join('   ·   ');
  o.push(`<text x="${L}" y="${sy + (fs - 1) * 8}" font-size="${12.5 * fs}" fill="${MUTED}">${stat}</text>`);
  // inversion and cumulus keys, bottom right (under the climb key)
  { const ty = sy + (fs - 1) * 8, t = 11.5 * fs, cx = W - R - 58 * fs, ix = cx - 92 * fs;
    o.push(`<rect x="${f(ix)}" y="${f(ty - 9 * fs)}" width="${f(18 * fs)}" height="${f(10 * fs)}" fill="#e58ac2" opacity=".5"/><text x="${f(ix + 24 * fs)}" y="${f(ty)}" font-size="${f(t)}" fill="${MUTED}">inversion</text>`);
    o.push(`<rect x="${f(cx)}" y="${f(ty - 11 * fs)}" width="${f(12 * fs)}" height="${f(14 * fs)}" rx="${f(5 * fs)}" fill="#cdd2d8"/><text x="${f(cx + 18 * fs)}" y="${f(ty)}" font-size="${f(t)}" fill="${MUTED}">cumulus</text>`); }
  if (!data.compact) {
    // verdict colours sit with the strip at the top (right); inversion and cumulus stay down here
    const key = P2_VERDICT.map(([, c, t]) => [c, t]), kw = ([, t]) => 33 + [...t].reduce((a, ch) => a + ('ilft '.includes(ch) ? 3.4 : /[A-Z]/.test(ch) ? 7.6 : 6.2), 0);   // rough text width
    let vx = W - R - key.reduce((a, k) => a + kw(k), 0) + 6;
    for (const k of key) { const [c, t] = k; o.push(`<rect x="${f(vx)}" y="${yS - 15}" width="16" height="9" rx="1.5" fill="${c}"/><text x="${f(vx + 21)}" y="${yS - 6.5}" font-size="11" fill="${MUTED}">${t}</text>`); vx += kw(k); }
  }
  o.push('</svg>');
  return o.join('');
}
if (typeof module !== 'undefined') module.exports = { panel2SVG };


