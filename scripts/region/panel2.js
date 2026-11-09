// Detailed region thermal chart (lab): the day hour by hour, from the ground up.
//   top strip   how good each hour is for flying (grey = not worth it ... dark green = big cross-country)
//   clouds      high / mid / low layers in oktas (darker = more), weather symbol per hour
//   main chart  thermal strength (m/s) as orange cells per 500 ft, cumulus as grey columns from base to top,
//               inversions as pink bands, wind arrows at every 1,000 ft: the fill is the mean wind over the region,
//               the rim the strongest wind in the region at that height (a strong rim = somewhere it blows hard)
//   statistics  strongest climb and highest top of the day, with their times
// panel2SVG(data, dayIndex) -> SVG string; same data as panelSVG (data/region/regions.json, one region).

const P2_LIFT = [[0, '#fff3e6'], [0.5, '#fde2c4'], [1, '#fbc996'], [1.5, '#f8ab66'], [2, '#f48b3a'], [2.5, '#e96d1e'], [3, '#cf5512'], [3.5, '#a9420d'], [4, '#7f310b'], [4.5, '#5a2309']];
// wind, mph (from the usual pilot scale in km/h: 0-6 calm, 7-14 fine, 15-24 noticeable, 25-30 strong, 31-36 stop, over 36 no-go)
const P2_WIND = [[0, '#ffffff'], [4, '#3fc25a'], [9.5, '#f5d90a'], [15.5, '#f08a1c'], [19, '#e0262a'], [22.5, '#151515']];
const P2_RATE = (s) => s == null ? '#e5e7eb' : s < 1.6 ? '#6f757d' : s < 2.5 ? '#b9bec5' : s < 3.5 ? '#f3dd1c' : s < 4.5 ? '#35b04f' : '#16773a';
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
function p2icon(kind, x, y) {
  const sun = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f6b51e"/><g stroke="#f6b51e" stroke-width="1.6" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => { const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180); return `<line x1="${(cx + c * (r + 2.5)).toFixed(1)}" y1="${(cy + s * (r + 2.5)).toFixed(1)}" x2="${(cx + c * (r + 5)).toFixed(1)}" y2="${(cy + s * (r + 5)).toFixed(1)}"/>`; }).join('')}</g>`;
  const cloud = (cx, cy, col) => `<path d="M${cx - 10} ${cy + 5} h20 a5 5 0 0 0 0 -10 a7 7 0 0 0 -13 -2 a5 5 0 0 0 -7 12 z" fill="${col}" stroke="#9aa3ad" stroke-width=".8"/>`;
  const g = (inner) => `<g transform="translate(${x.toFixed(1)} ${y})">${inner}</g>`;
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

function panel2SVG(data, di = 0) {
  const day = data.days[di];
  const hrs = Object.keys(day.hours).map(Number).sort((a, b) => a - b).filter(h => !data.compact || (h >= 8 && h <= 19));
  const H = (h) => day.hours[h] || {};
  const INK = '#1f2328', MUTED = '#6b7280', GRID = '#e6e8eb', GRID2 = '#c9ced4';
  const fs = data.compact ? 1.3 : 1;                 // bigger text when the chart is shown small (radar site card)
  const W = 1000, L = 70, R = 14, cw = (W - L - R) / hrs.length;
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
  const yS = data.compact ? 40 : 66, yC = yS + 22, ch = 15, yI = yC + 3 * ch + 8, yG = yI + 34;
  const gh = (zmax - zmin) * pxft;
  const Y = (z) => yG + gh - (z - zmin) * pxft;
  const Hh = yG + gh + (data.compact ? 44 : 70);
  const f = (v) => v.toFixed(1);
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}" font-family="Inter, Roboto, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="13" fill="${INK}">`);
  o.push(`<rect width="${W}" height="${Hh}" fill="#fff"/>`);
  const gen = data.generated ? new Date(data.generated.replace('Z', ':00Z').replace(/:00:00Z$/, ':00Z')) : null;
  const run = gen && !isNaN(gen) ? gen.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' }).toLowerCase() : '';
  const models = [...new Set(hrs.flatMap(h => H(h).models || []))].join(' + ');
  if (data.compact) {
    o.push(`<text x="${L}" y="20" font-size="17"><tspan font-weight="700">${data.region}</tspan><tspan fill="${MUTED}"> · thermals and wind by height</tspan></text>`);
    o.push(`<text x="${W - R}" y="20" text-anchor="end" font-size="14" fill="${MUTED}">${models}${run ? ' · ' + run : ''}</text>`);
  } else {
    const d = new Date(day.date + 'T12:00:00');
    o.push(`<text x="${L}" y="28" font-size="22" font-weight="700">${data.title || data.region}</text>`);
    o.push(`<text x="${L}" y="50" font-size="14" fill="${MUTED}">${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · ${models}${run ? ' · run ' + run : ''}</text>`);
  }
  // hour labels over the strip
  hrs.forEach((h, k) => o.push(`<text x="${f(CX(k))}" y="${yS - 5}" text-anchor="middle" font-size="${11.5 * fs}" fill="${MUTED}">${h > 12 ? h - 12 : h}${h === 12 ? 'p' : h < 12 ? 'a' : 'p'}</text>`));
  // top strip: how good each hour is
  hrs.forEach((h, k) => o.push(`<rect x="${f(X(k) + 0.6)}" y="${yS}" width="${f(cw - 1.2)}" height="13" fill="${P2_RATE(H(h).score)}"/>`));
  // cloud layers: high, mid, low
  o.push(`<rect x="${L}" y="${yC}" width="${W - L - R}" height="${3 * ch}" fill="#eaf2fb"/>`);
  ['H', 'M', 'L'].forEach((lab, r) => {
    o.push(`<text x="${L - 8}" y="${yC + r * ch + 11}" text-anchor="end" font-size="10.5" fill="${MUTED}">${lab}</text>`);
    hrs.forEach((h, k) => {
      const n = (H(h).okta || [0, 0, 0])[2 - r];
      if (n > 0) o.push(`<rect x="${f(X(k) - 0.5)}" y="${yC + r * ch + 3}" width="${f(cw + 1)}" height="${ch - 6}" rx="4" fill="${P2_OKTA(n)}"/>`);
    });
  });
  o.push(`<text transform="translate(16 ${yC + 1.5 * ch}) rotate(-90)" text-anchor="middle" font-size="10.5" fill="${MUTED}">clouds</text>`);
  // weather symbols
  hrs.forEach((h, k) => o.push(p2icon(p2weather(H(h)), CX(k), yI + 13)));
  // main chart frame and height grid
  for (let z = Math.ceil(zmin / 1000) * 1000; z <= zmax; z += 1000) {
    o.push(`<line x1="${L}" x2="${W - R}" y1="${f(Y(z))}" y2="${f(Y(z))}" stroke="${z % 5000 ? GRID : GRID2}"/>`);
    o.push(`<text x="${L - 8}" y="${f(Y(z) + 4)}" text-anchor="end" font-size="${11.5 * fs}" fill="${MUTED}">${z.toLocaleString()}</text>`);
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
  // lift legend (m/s)
  const lx = L + 6, ly = yG + 6;
  o.push(`<rect x="${lx}" y="${ly}" width="34" height="${P2_LIFT.length * 13 + 18}" rx="6" fill="#fff" stroke="#9aa3ad" opacity=".95"/>`);
  o.push(`<text x="${lx + 17}" y="${ly + 12}" text-anchor="middle" font-size="9.5" fill="${MUTED}">m/s</text>`);
  [...P2_LIFT].reverse().forEach(([v, c], r) => {
    o.push(`<rect x="${lx + 4}" y="${ly + 16 + r * 13}" width="26" height="13" fill="${c}"/>`);
    o.push(`<text x="${lx + 17}" y="${ly + 26 + r * 13}" text-anchor="middle" font-size="9" fill="${v >= 2.5 ? '#fff' : INK}">${v}</text>`);
  });
  o.push(`<text transform="translate(18 ${f(yG + gh / 2)}) rotate(-90)" text-anchor="middle" font-size="11" fill="${MUTED}">height (ft)</text>`);
  // statistics
  let best = null, hi = null;
  hrs.forEach((h) => {
    const c = Math.max(0, ...Object.values(H(h).grid || {}).filter(v => typeof v === 'number'));
    if (!best || c > best[0]) best = [c, h];
    if (H(h).top_max_ft && (!hi || H(h).top_max_ft > hi[0])) hi = [H(h).top_max_ft, h];
  });
  const hh = (h) => `${h > 12 ? h - 12 : h} ${h >= 12 ? 'pm' : 'am'}`;
  const sy = yG + gh + 22;
  const stat = [best && best[0] > 0 ? `strongest climb ${best[0].toFixed(1)} m/s at ${hh(best[1])}` : 'no usable climbs', hi ? `highest top ${hi[0].toLocaleString()} ft at ${hh(hi[1])}` : ''].filter(Boolean).join('   ·   ');
  o.push(`<text x="${L}" y="${sy + (fs - 1) * 8}" font-size="${12.5 * fs}" fill="${MUTED}">${stat}</text>`);
  if (!data.compact) {
    const key = [['#6f757d', 'not worth it'], ['#b9bec5', 'glide / soar'], ['#f3dd1c', 'local thermals'], ['#35b04f', 'cross-country'], ['#16773a', 'big XC']];
    let x = L;
    for (const [c, t] of key) { o.push(`<rect x="${x}" y="${sy + 14}" width="18" height="10" fill="${c}"/><text x="${x + 24}" y="${sy + 23}" font-size="11.5" fill="${MUTED}">${t}</text>`); x += 34 + t.length * 6.4; }
    o.push(`<rect x="${x + 8}" y="${sy + 14}" width="18" height="10" fill="#e58ac2" opacity=".5"/><text x="${x + 32}" y="${sy + 23}" font-size="11.5" fill="${MUTED}">inversion</text>`);
    o.push(`<rect x="${x + 112}" y="${sy + 12}" width="12" height="14" rx="5" fill="#cdd2d8"/><text x="${x + 130}" y="${sy + 23}" font-size="11.5" fill="${MUTED}">cumulus</text>`);
  }
  o.push('</svg>');
  return o.join('');
}
if (typeof module !== 'undefined') module.exports = { panel2SVG };
