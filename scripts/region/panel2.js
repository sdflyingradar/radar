// Detailed region thermal chart (our own design): the day hour by hour, from the ground up.
//   top strip   each hour in the radar's verdict colours (no-go red ... great XC blue)
//   clouds      high / mid / low layers in oktas (darker = more), weather symbol per hour
//   main chart  thermal strength (m/s) as orange cells per 500 ft, cumulus as grey columns from base to top,
//               inversions as pink bands, wind arrows at every 1,000 ft: the fill is the mean wind over the region,
//               the rim the strongest wind in the region at that height (a strong rim = somewhere it blows hard)
//   statistics  strongest climb and highest top of the day, with their times
// panel2SVG(data, dayIndex) -> SVG string; same data as panelSVG (data/region/regions.json, one region).

const P2_LIFT = [[0, '#ffeedd'], [0.5, '#fdd0a2'], [1, '#fbb068'], [1.5, '#f89039'], [2, '#f1721b'], [2.5, '#e05a0c'], [3, '#c44608'], [3.5, '#a03606'], [4, '#782805'], [4.5, '#521b04']];
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
  return `<path d="M0 -9 L6.5 8 L0 4.2 L-6.5 8 Z" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((w[0] + 180) % 360).toFixed(0)}) scale(${k.toFixed(2)})" fill="${fill}" stroke="${rim === '#ffffff' ? '#9aa3ad' : rim}" stroke-width="${(2.1 / k).toFixed(2)}" stroke-linejoin="round"/>`;
}

// colour keys under a chart, both in whole-number steps: wind (bottom left) and climb (bottom right)
function chartKeys(o, { L, Rx, y, fs = 1, wind, lift, INK = '#1f2328', MUTED = '#6b7280' }) {
  const f = (v) => v.toFixed(1), bh = 12 * fs, bw = 29 * fs, ty = y + bh - 2.6 * fs;
  o.push(`<text x="${L}" y="${f(ty)}" font-size="${10.5 * fs}" fill="${MUTED}">wind mph</text>`);
  let x = L + 54 * fs;
  wind.forEach(([v, c]) => { o.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" rx="2" fill="${c}"/><text x="${f(x + bw / 2)}" y="${f(ty)}" text-anchor="middle" font-size="${9 * fs}" fill="${c === '#111111' ? '#fff' : INK}">${Math.round(v)}</text>`); x += bw + 1; });
  // climb: one box per whole m/s (the chart itself still shades in half steps)
  const lk = lift.filter(([v]) => v % 1 === 0), gx = Rx - lk.length * (bw + 1) + 1;
  lk.forEach(([v, c], i) => { const kx = gx + i * (bw + 1); o.push(`<rect x="${f(kx)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" rx="2" fill="${c}"/><text x="${f(kx + bw / 2)}" y="${f(ty)}" text-anchor="middle" font-size="${9 * fs}" fill="${v >= 2.5 ? '#fff' : INK}">${v}</text>`); });
  o.push(`<text x="${f(gx - 6)}" y="${f(ty)}" text-anchor="end" font-size="${10.5 * fs}" fill="${MUTED}">climb m/s</text>`);
}

function panel2SVG(data, di = 0) {
  const day = data.days[di];
  const hrs = Object.keys(day.hours).map(Number).sort((a, b) => a - b).filter(h => !data.compact || (h >= 8 && h <= 19));
  const H = (h) => day.hours[h] || {};
  const INK = '#1f2328', MUTED = '#6b7280', GRID = '#e6e8eb', GRID2 = '#c9ced4';
  const fs = data.compact ? 1.3 : 1;                 // bigger text when the chart is shown small (radar site card)
  const W = 1000, L = data.compact ? 96 : 78, R = 14, cw = (W - L - R) / hrs.length;
  const X = (k) => L + k * cw, CX = (k) => L + (k + 0.5) * cw;
  // heights: from just below the ground to well above the highest lift, cloud and marks
  // the ground: the lowest of the region's mean ground and its lowest thermal cell (valleys lift too)
  const lowCell = Math.min(...hrs.flatMap(h => Object.keys(H(h).grid || {}).map(Number)), 1e9);
  const ground = Math.min(...hrs.map(h => H(h).ground_ft ?? (data.floor_ft ?? 0)), lowCell);
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
  // cloud layers: high, mid, low
  o.push(`<rect x="${L}" y="${yC}" width="${W - L - R}" height="${3 * ch}" fill="#eaf2fb"/>`);
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
  hrs.forEach((h, k) => o.push(`<line x1="${f(X(k))}" x2="${f(X(k))}" y1="${yG}" y2="${f(yG + gh)}" stroke="${GRID}"/>`));
  // ground
  o.push(`<rect x="${L}" y="${f(Y(ground))}" width="${W - L - R}" height="${f(yG + gh - Y(ground))}" fill="#efe6d6"/>`);
  // thermal cells (500 ft) and cumulus columns
  const bw = cw * 0.72;
  hrs.forEach((h, k) => {
    const g = H(h).grid || {}, x0 = CX(k) - bw / 2;
    for (const [zk, v] of Object.entries(g)) {
      const z = +zk;
      if (z + 500 <= zmin || z >= zmax) continue;
      if (v === 'c') continue;
      o.push(`<rect x="${f(x0)}" y="${f(Y(z + 500))}" width="${f(bw)}" height="${f(500 * pxft - 0.6)}" fill="${p2pick(P2_LIFT, v)}"/>`);
    }
    const hb = H(h);
    if (hb.base_ft && (hb.cu || 0) >= 0.15) {
      const top = Math.max(hb.base_ft + 600, hb.cu_top_ft || hb.base_ft + 1000), cw2 = bw * (0.35 + 0.65 * Math.min(1, hb.cu));
      const shade = hb.cu >= 0.7 ? '#b4bbc3' : hb.cu >= 0.4 ? '#cdd2d8' : '#e3e6ea';
      o.push(`<rect x="${f(CX(k) - cw2 / 2)}" y="${f(Y(Math.min(top, zmax)))}" width="${f(cw2)}" height="${f(Math.max(4, (Math.min(top, zmax) - hb.base_ft) * pxft))}" rx="${f(Math.min(10, cw2 / 2))}" fill="${shade}" opacity=".92"/>`);
    }
  });
  // inversions (pink)
  hrs.forEach((h, k) => {
    for (const [a, b] of H(h).inv || []) {
      if (b <= zmin || a >= zmax) continue;
      const lo = Math.max(a, zmin), hi = Math.min(b, zmax), hgt = Math.max(5, (hi - lo) * pxft);
      o.push(`<rect x="${f(X(k) + 0.5)}" y="${f(Y(hi))}" width="${f(cw - 1)}" height="${f(hgt)}" fill="#e58ac2" opacity=".42"/>`);
    }
  });
  // site heights
  for (const m of marks) {
    if (m.ft < zmin || m.ft > zmax) continue;
    o.push(`<line x1="${L}" x2="${W - R}" y1="${f(Y(m.ft))}" y2="${f(Y(m.ft))}" stroke="#a16207" stroke-dasharray="5 4" stroke-width="1" opacity=".7"/>`);
    o.push(`<text x="${W - R - 4}" y="${f(Y(m.ft) - 4)}" text-anchor="end" font-size="11" fill="#a16207" paint-order="stroke" stroke="#fff" stroke-width="3">${m.name} ${m.ft.toLocaleString()}'</text>`);
  }
  // flying window
  if (data.win && data.win.length === 2) {
    const k0 = hrs.indexOf(data.win[0]), k1 = hrs.indexOf(data.win[1]);
    if (k0 >= 0 && k1 >= 0) o.push(`<rect x="${f(X(k0))}" y="${yG}" width="${f(X(k1 + 1) - X(k0))}" height="${f(gh)}" fill="none" stroke="#c2410c" stroke-width="1.2" stroke-dasharray="3 3"/>`);
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
    const gmin = Math.min(...gw.map(g => g[0]), wl.length ? wl[0][0] : 1e9);
    const first = Math.ceil((gmin + 300) / 1000) * 1000;
    if (gw.length && first - gw[0][0] > 600) o.push(p2arrow(CX(k), Math.min(Y(gw[0][0]) - asz * 0.4, yG + gh - asz * 0.7), gwind(gw[0]), asz));
    for (let z = first; z <= zmax - 300; z += 1000) {
      const near = gw.filter(g => Math.abs(g[0] - z) <= 500).sort((a, b) => Math.abs(a[0] - z) - Math.abs(b[0] - z))[0];
      const w = near ? gwind(near) : p2windAt(wl, z);
      if (w) o.push(p2arrow(CX(k), Y(z), w, asz));
    }
  });
  o.push(`<text transform="translate(${f(14 * fs)} ${f(yG + gh / 2)}) rotate(-90)" text-anchor="middle" font-size="${13 * fs}" font-weight="700">Altitude (ft)</text>`);
  // time axis under the chart (hours at the column edges), then the climb legend at the bottom right
  o.push(`<line x1="${L}" x2="${W - R}" y1="${f(yB)}" y2="${f(yB)}" stroke="${GRID2}"/>`);
  hrs.forEach((h, k) => { if (!data.compact || k % 2 === 0) o.push(`<text x="${f(X(k))}" y="${f(yB + 18 * fs)}" text-anchor="middle" font-size="${13 * fs}">${h > 12 ? h - 12 : h}:00</text>`); });
  o.push(`<text x="${f((L + W - R) / 2)}" y="${f(yB + 36 * fs)}" text-anchor="middle" font-size="${13 * fs}" font-weight="700">Time (PT)</text>`);
  chartKeys(o, { L, Rx: W - R, y: yB + 27 * fs, fs, wind: P2_WIND.map(([v, c]) => [v, v ? c : '#eef1f4']), lift: P2_LIFT, INK, MUTED });
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

// ---- the legend: a "Legend" button under the chart opens a small window that explains the chart ----
const P2_LEGEND_BTN = '<div class="p2lgw"><button type="button" class="p2leg">Legend</button></div>';
function panel2LegendHTML() {
  const sw = (c, extra = '') => `<i style="background:${c};${extra}"></i>`;
  const arrow = (fill, rim) => `<svg viewBox="-9 -10 18 20" width="16" height="18"><path d="M0 -9 L6.5 8 L0 4.2 L-6.5 8 Z" fill="${fill}" stroke="${rim}" stroke-width="2" stroke-linejoin="round"/></svg>`;
  const row = (a, t) => `<div class="p2r"><span class="p2s">${a}</span><span>${t}</span></div>`;
  return `<div class="p2card" role="dialog" aria-label="Chart legend"><div class="p2hd"><b>How to read this chart</b><button type="button" class="p2x" aria-label="Close"><svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M2.5 2.5 L11.5 11.5 M11.5 2.5 L2.5 11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
    <h4>Top strip · the radar's verdict for each hour</h4>
    ${P2_VERDICT.map(([, c, t]) => row(sw(c), t)).join('')}
    <h4>Sky</h4>
    ${row(sw('#d6dbe1', 'border-radius:6px') + sw('#8a929c', 'border-radius:6px'), 'cloud layers, high (H), middle (M) and low (L); darker grey = more of the sky covered')}
    ${row('☀️', 'a symbol for each hour: sunny (a moon after sunset), some clouds, overcast, rain or thunderstorms')}
    <h4>Thermals</h4>
    <div class="p2r p2col"><span class="p2s">${P2_LIFT.map(([v, c]) => `<i style="background:${c};width:26px;color:${v >= 2 ? '#fff' : '#26303a'};font:600 9px/12px system-ui;text-align:center;font-style:normal">${v}</i>`).join('')}</span><span>climb rate in m/s, in 500 ft steps from the ground to the top of the lift: the darker, the stronger</span></div>
    ${row(sw('#cdd2d8', 'border-radius:8px;width:14px;height:20px'), 'grey bar: cumulus clouds from their base to their top; a wider, darker bar means more of them')}
    ${row(sw('#e58ac2', 'opacity:.55'), 'pink: a warm, stable layer (inversion) that stops or weakens the thermals')}
    ${row(sw('#efe6d6'), 'the ground; dashed lines mark the launches, the dotted frame the site\'s best hours')}
    <h4>Wind</h4>
    ${row(arrow('#3fc25a', '#3fc25a'), 'one arrow per 1,000 ft, pointing downwind; the lowest ones show the wind at the landing fields and in the valleys')}
    ${[['#fff', '#9aa3ad', 'light, under 4 mph'], ['#3fc25a', '#3fc25a', 'pleasant, 4–9 mph'], ['#f5d90a', '#f5d90a', 'breezy, 10–15 mph'], ['#f08a1c', '#f08a1c', 'strong, 16–18 mph'],
      ['#e0262a', '#e0262a', 'too strong for most pilots, 19–22 mph'], ['#111111', '#111111', 'not flyable, 23 mph and up']].map(([f, r, t]) => row(arrow(f, r), t)).join('')}
    ${row(arrow('#fff', '#3fc25a') + arrow('#3fc25a', '#f08a1c'), 'the inside of an arrow is the typical wind across the region, its outline the windiest spot in it')}
    <h4>Under the chart</h4>
    <p>The best climb and the highest lift of the day, and when they happen.</p></div>`;
}
(function () {
  if (typeof document === 'undefined') return;
  let ov = null;
  const close = (fromBack) => {
    if (!ov) return;
    ov.remove(); ov = null; document.documentElement.style.overflow = '';
    if (!fromBack && history.state && history.state.p2) history.back();
  };
  window.addEventListener('popstate', () => { if (ov) close(true); });
  document.addEventListener('keydown', (e) => { if (ov && e.key === 'Escape') close(); });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.p2leg')) return;
    e.stopPropagation(); e.preventDefault();
    ov = document.createElement('div');
    ov.id = 'p2pop';
    ov.innerHTML = panel2LegendHTML();
    document.body.appendChild(ov);
    document.documentElement.style.overflow = 'hidden';
    history.pushState({ p2: 1 }, '');
    ov.addEventListener('click', (ev) => { if (ev.target === ov || ev.target.closest('.p2x')) close(); });
  }, true);
  const css = document.createElement('style');
  css.textContent = `.p2lgw{display:flex;justify-content:center;margin:4px 0 0}
.p2leg{font:600 .72rem/1 system-ui,sans-serif;color:#667085;background:#f7f8fa;border:1px solid #e4e7ec;border-radius:999px;padding:5px 14px;cursor:pointer}
.p2leg:hover{color:#26303a;border-color:#98a2b3}
#p2pop{position:fixed;inset:0;z-index:120;background:rgba(15,23,42,.4);display:flex;align-items:flex-start;justify-content:center;padding:max(40px,6vh) 12px 12px;overflow-y:auto}
#p2pop .p2card{background:#fff;border-radius:16px;max-width:520px;width:100%;padding:14px 18px 18px;box-shadow:0 20px 50px -12px rgba(0,0,0,.35);font:14px/1.4 system-ui,sans-serif;color:#26303a;margin-bottom:24px}
#p2pop .p2hd{display:flex;align-items:center;gap:10px;margin-bottom:4px}#p2pop .p2hd b{flex:1;font-size:1.05rem}
#p2pop .p2x{width:34px;height:34px;border-radius:50%;border:1px solid #d5dbe2;background:#fff;color:#26303a;display:inline-flex;align-items:center;justify-content:center;padding:0;line-height:1;box-shadow:0 2px 8px -3px rgba(0,0,0,.25);font:600 22px/1 system-ui,sans-serif;cursor:pointer}
#p2pop h4{margin:14px 0 6px;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:#98a2b3}
#p2pop .p2r{display:flex;align-items:center;gap:10px;padding:3px 0;font-size:.86rem}
#p2pop .p2s{display:inline-flex;gap:3px;align-items:center;flex:none;min-width:30px}
#p2pop .p2s i{display:inline-block;width:20px;height:12px;border-radius:3px}
#p2pop p{margin:0;font-size:.86rem}
#p2pop .p2col{flex-direction:column;align-items:flex-start;gap:5px}#p2pop .p2col .p2s{gap:1px;flex-wrap:wrap}`;
  document.head.appendChild(css);
})();
if (typeof module !== 'undefined') module.exports.panel2LegendHTML = panel2LegendHTML;
