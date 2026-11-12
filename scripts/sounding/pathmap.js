// Balloon flight path on a plain map: coast, major freeways as thin lines, a few towns.
// Uses the published track (lat/lon per level) when the station's data carries it, else reconstructs it from the
// winds: the balloon rises ~5 m/s (~1,000 ft/min) and drifts with the wind at each level.
// Needs COAST / ROADS / TOWNS from scripts/region/regionmap.js when loaded (San Diego detail); adds the High Desert.

const PM_ROADS = [   // [label, [[lat, lon], ...]] beyond the San Diego map
  ['14', [[34.30, -118.47], [34.45, -118.30], [34.58, -118.12], [34.69, -118.14], [34.85, -118.16], [35.05, -118.17], [35.30, -118.00]]],
  ['58', [[35.05, -118.17], [35.02, -117.90], [35.00, -117.65], [34.94, -117.30], [34.90, -117.03]]],
  ['15', [[34.40, -117.40], [34.54, -117.29], [34.70, -117.15], [34.90, -117.02], [35.05, -116.70], [35.27, -116.07]]],
  ['395', [[34.54, -117.29], [34.80, -117.47], [35.10, -117.68], [35.45, -117.80]]],
  ['40', [[34.90, -117.02], [34.83, -116.55], [34.77, -116.00]]],
  ['5', [[33.75, -117.82], [34.00, -118.10], [34.15, -118.26], [34.40, -118.56], [34.80, -118.86]]],
  ['10', [[34.07, -117.85], [34.04, -118.25], [34.02, -118.49]]],
  // Central Coast (Vandenberg)
  ['101', [[34.27, -119.27], [34.41, -119.69], [34.44, -119.90], [34.47, -120.23], [34.62, -120.19], [34.85, -120.40], [34.95, -120.43], [35.12, -120.60], [35.28, -120.66], [35.48, -120.67], [35.63, -120.69]]],
  ['246', [[34.62, -120.19], [34.60, -120.14], [34.64, -120.46]]],
  ['1', [[34.64, -120.46], [34.75, -120.52], [34.95, -120.57], [35.12, -120.62]]],
  ['166', [[34.95, -120.43], [35.00, -120.00], [35.05, -119.45]]],
  // Las Vegas
  ['15', [[35.27, -116.07], [35.61, -115.39], [36.00, -115.17], [36.17, -115.15], [36.33, -114.92], [36.80, -114.07]]],
  ['95', [[36.17, -115.15], [36.40, -115.36], [36.65, -115.95]]],
  ['93', [[36.04, -114.98], [35.98, -114.83], [35.60, -114.40], [35.19, -114.05]]],
  ['160', [[36.05, -115.25], [36.21, -115.98]]],
  // Yuma and the Imperial Valley
  ['8', [[32.75, -116.00], [32.79, -115.56], [32.72, -114.90], [32.69, -114.62], [32.80, -114.00], [32.95, -112.72]]],
  ['95 ', [[32.69, -114.62], [33.05, -114.40], [33.61, -114.60]]],
  ['10 ', [[33.61, -114.60], [33.70, -115.50], [33.72, -116.22]]],
];
// water further afield: the Central Coast, Lake Mead, the Salton Sea, the Colorado River
const PM_COAST_CC = [[34.37, -119.48], [34.41, -119.69], [34.42, -119.85], [34.46, -120.07], [34.47, -120.23], [34.45, -120.47], [34.55, -120.62],
  [34.70, -120.62], [34.76, -120.62], [34.88, -120.64], [34.97, -120.65], [35.10, -120.63], [35.17, -120.74], [35.23, -120.88], [35.37, -120.86],
  [35.45, -120.90], [35.55, -121.10], [35.66, -121.28], [35.85, -121.45]];
const PM_ISLANDS = [[[34.07, -119.92], [34.06, -119.55], [33.98, -119.60], [34.00, -119.90]], [[34.03, -120.25], [33.95, -119.98], [33.90, -120.10], [33.95, -120.22]],
  [[34.05, -120.45], [34.02, -120.33], [33.99, -120.40]]];
const PM_LAKES = [[[36.12, -114.85], [36.08, -114.75], [36.12, -114.60], [36.15, -114.40], [36.10, -114.38], [36.05, -114.60], [36.02, -114.75], [36.05, -114.85]],
  [[33.53, -116.08], [33.40, -115.98], [33.25, -115.82], [33.12, -115.70], [33.18, -115.62], [33.33, -115.75], [33.45, -115.85], [33.52, -116.00]]];
const PM_RIVER = [[36.02, -114.74], [35.60, -114.67], [35.10, -114.63], [34.80, -114.58], [34.45, -114.37], [34.10, -114.42], [33.60, -114.53], [33.20, -114.68], [32.73, -114.62], [32.50, -114.82], [32.10, -114.95]];
const PM_TOWNS = [['Edwards AFB', 34.905, -117.884], ['Lancaster', 34.698, -118.137], ['Palmdale', 34.579, -118.117], ['Mojave', 35.053, -118.174],
  ['Boron', 35.000, -117.650], ['California City', 35.126, -117.986], ['Victorville', 34.536, -117.291], ['Barstow', 34.898, -117.023],
  ['Los Angeles', 34.052, -118.244], ['MCAS Miramar', 32.868, -117.142], ['Palm Springs', 33.830, -116.545], ['Lake Isabella', 35.62, -118.47],
  ['Lompoc', 34.64, -120.46], ['Santa Maria', 34.95, -120.44], ['San Luis Obispo', 35.28, -120.66], ['Santa Barbara', 34.42, -119.70], ['Solvang', 34.60, -120.14],
  ['Pismo Beach', 35.14, -120.64], ['Morro Bay', 35.37, -120.85], ['Point Conception', 34.45, -120.47], ['Santa Cruz Island', 34.02, -119.75],
  ['Las Vegas', 36.17, -115.14], ['Henderson', 36.04, -114.98], ['Boulder City', 35.98, -114.83], ['Pahrump', 36.21, -115.98], ['Mesquite', 36.80, -114.07],
  ['Primm', 35.61, -115.39], ['Kingman', 35.19, -114.05], ['Laughlin', 35.17, -114.57], ['Mt Charleston', 36.27, -115.69], ['Lake Mead', 36.13, -114.55],
  ['Yuma', 32.69, -114.62], ['El Centro', 32.79, -115.56], ['Mexicali', 32.62, -115.45], ['Blythe', 33.61, -114.60], ['Gila Bend', 32.95, -112.72],
  ['Brawley', 32.98, -115.53], ['Lake Havasu City', 34.48, -114.32], ['Needles', 34.85, -114.61], ['Salton Sea', 33.32, -115.84]];

const PM_LAND = '#f7f6f2', PM_SAND = '#f1e9da';
// desert east of the coastal ranges (Mojave, Coachella, Anza-Borrego, Imperial)
const PM_DESERT = [[35.4, -118.95], [34.85, -118.75], [34.55, -118.35], [34.45, -117.9], [34.35, -117.55], [34.30, -117.10], [34.12, -116.8], [33.95, -116.6],
  [33.7, -116.5], [33.45, -116.6], [33.2, -116.45], [32.95, -116.35], [32.7, -116.2], [32.3, -116.05], [32.0, -116.0], [32.0, -112.0], [37.3, -112.0], [37.3, -118.3], [35.9, -118.4]];
// mountain spines for the soft relief: LA ranges and the San Diego backcountry
const PM_RANGES = [[[34.42, -118.55], [34.36, -118.20], [34.32, -117.90], [34.30, -117.65]], [[34.25, -117.40], [34.22, -117.10], [34.15, -116.85], [34.10, -116.60]],
  [[34.10, -118.95], [34.10, -118.70], [34.12, -118.45]], [[34.95, -118.80], [35.05, -118.55], [35.15, -118.40]], [[33.85, -117.68], [33.70, -117.55], [33.55, -117.45]],
  [[33.85, -116.75], [33.70, -116.65], [33.55, -116.55]], [[33.42, -116.95], [33.33, -116.83], [33.25, -116.72]], [[33.10, -116.62], [32.95, -116.55], [32.85, -116.45], [32.70, -116.35]],
  [[32.62, -116.90], [32.58, -116.80]], [[33.55, -117.10], [33.40, -117.05]], [[32.85, -116.80], [32.80, -116.70]],
  [[34.50, -119.75], [34.52, -120.00], [34.52, -120.20], [34.50, -120.40]], [[34.75, -119.90], [34.85, -119.80], [34.95, -119.70]], [[35.15, -120.45], [35.35, -120.65], [35.60, -121.00]],
  [[34.68, -120.40], [34.72, -120.25]], [[35.95, -115.50], [36.15, -115.60], [36.30, -115.70], [36.50, -115.90]], [[36.45, -115.20], [36.75, -115.20]],
  [[35.95, -114.95], [35.80, -114.85]], [[33.35, -115.45], [33.15, -115.10], [33.00, -114.85]], [[32.55, -114.40], [32.85, -114.30]], [[33.00, -114.40], [33.25, -114.25]],
  [[32.70, -115.95], [32.95, -116.10]]];
const PM_COAST_LA = [[34.47, -119.30], [34.40, -119.25], [34.28, -119.27], [34.20, -119.23], [34.15, -119.20], [34.10, -119.10], [34.05, -118.95], [34.03, -118.80],
  [34.03, -118.65], [34.03, -118.55], [34.00, -118.48], [33.95, -118.45], [33.90, -118.42], [33.85, -118.40], [33.80, -118.40], [33.77, -118.42],
  [33.74, -118.40], [33.71, -118.33], [33.71, -118.29], [33.75, -118.22], [33.75, -118.15], [33.74, -118.10], [33.69, -118.02], [33.63, -117.93],
  [33.60, -117.88], [33.55, -117.80], [33.50, -117.74], [33.46, -117.70], [33.40, -117.60]];

// published track [{lat, lon, z_ft}] from a UWyo CSV with latitude/longitude columns
function trackFromCSV(csv) {
  const lines = String(csv || '').trim().split(/\r?\n/);
  if (lines.length < 5) return null;
  const h = lines[0].toLowerCase().split(',').map(x => x.trim());
  const ix = k => h.findIndex(x => x.startsWith(k));
  const la = ix('lat'), lo = ix('lon'), z = h.findIndex(x => /geopotential|height|hght/.test(x));
  if (la < 0 || lo < 0 || z < 0) return null;
  const out = [];
  for (const L of lines.slice(1)) {
    const f = L.split(',');
    const p = { lat: +f[la], lon: +f[lo], z_ft: +f[z] * 3.28084 };
    if (isFinite(p.lat) && isFinite(p.lon) && isFinite(p.z_ft)) out.push(p);
  }
  return out.length > 10 ? out : null;
}

// reconstructed track from the sounding's winds (levels: z in kft, dir deg from, spd kt)
function trackFromWinds(levels, lat0, lon0, rise = 5.0) {
  const lv = levels.filter(l => isFinite(l.z) && l.dir != null && l.spd != null && isFinite(l.dir) && isFinite(l.spd)).sort((a, b) => a.z - b.z);
  if (lv.length < 3) return null;
  let x = 0, y = 0;
  const out = [{ lat: lat0, lon: lon0, z_ft: lv[0].z * 1000 }];
  for (let k = 1; k < lv.length; k++) {
    const dz = (lv[k].z - lv[k - 1].z) * 304.8;
    if (dz <= 0) continue;
    const dt = dz / rise, a = lv[k - 1], b = lv[k];
    // average the wind vectors of the two levels; the wind blows from dir, so the balloon goes to dir + 180
    const u = (s, d) => -s * 0.5144 * Math.sin(d * Math.PI / 180), v = (s, d) => -s * 0.5144 * Math.cos(d * Math.PI / 180);
    x += (u(a.spd, a.dir) + u(b.spd, b.dir)) / 2 * dt;
    y += (v(a.spd, a.dir) + v(b.spd, b.dir)) / 2 * dt;
    out.push({ lat: lat0 + y / 111200, lon: lon0 + x / (111200 * Math.cos(lat0 * Math.PI / 180)), z_ft: b.z * 1000 });
  }
  return out;
}

function balloonPathSVG(track, stn, opts = {}) {
  const top = opts.top_ft || 30000;
  const tr = track.filter(p => p.z_ft <= top + 1);
  if (tr.length < 2) return '';
  // earlier flights (opts.past: [{track, label}]) drawn as quiet grey lines under today's path
  const past = (opts.past || []).map(p => ({ label: p.label, tr: (p.track || []).filter(q => q.z_ft <= top + 1) })).filter(p => p.tr.length > 1);
  const lats = tr.map(p => p.lat).concat(stn.lat, ...past.flatMap(p => p.tr.map(q => q.lat))),
    lons = tr.map(p => p.lon).concat(stn.lon, ...past.flatMap(p => p.tr.map(q => q.lon)));
  const cl = Math.cos(stn.lat * Math.PI / 180);
  let la0 = Math.min(...lats), la1 = Math.max(...lats), lo0 = Math.min(...lons), lo1 = Math.max(...lons);
  // at least ~70 x 50 km, padded, in the 3:2 frame
  const cla = (la0 + la1) / 2, clo = (lo0 + lo1) / 2;
  let hw = Math.max((lo1 - lo0) / 2 * 1.35, 0.4), hh = Math.max((la1 - la0) / 2 * 1.35, 0.27);
  if (hw * cl / hh > 1.5) hh = hw * cl / 1.5; else hw = hh * 1.5 / cl;
  lo0 = clo - hw; lo1 = clo + hw;
  const W = 600, H = 400, f = v => v.toFixed(1);
  // Esri World Topo underneath (scripts/ui/basemap.js), drawn in Web Mercator so it lines up
  const F = basemapFrame(lo0, lo1, cla, W, H), X = F.X, Y = F.Y;
  const P = ([la, lo]) => `${f(X(lo))},${f(Y(la))}`;
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" role="img" aria-label="Balloon flight path">`,
    `<defs><clipPath id="pmc"><rect width="${W}" height="${H}" rx="10"/></clipPath></defs><g clip-path="url(#pmc)">`,
    `<rect width="${W}" height="${H}" fill="${PM_LAND}"/>`, basemapTiles(F, W, H),
    `<rect width="${W}" height="${H}" fill="#fff" opacity=".18"/>`];   // a light veil so the paths carry the picture
  const ticks = [5000, 10000, 20000, 30000].filter(zt => zt <= top).map(zt => [zt, track.find(q => q.z_ft >= zt)]).filter(([, p]) => p)
    .map(([zt, p]) => [zt, X(p.lon), Y(p.lat)]).filter(([, x, y]) => Math.hypot(x - X(stn.lon), y - Y(stn.lat)) > 28);
  // earlier flights: thin grey lines, each with a tiny date/time at its far end
  for (const p of past) {
    o.push(`<polyline points="${p.tr.map(q => P([q.lat, q.lon])).join(' ')}" fill="none" stroke="#8a929d" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`);
    const e = p.tr[p.tr.length - 1], ex = X(e.lon), ey = Y(e.lat), left = ex > W - 60;
    o.push(`<circle cx="${f(ex)}" cy="${f(ey)}" r="2" fill="#9ca3af"/><text x="${f(left ? ex - 4 : ex + 4)}" y="${f(ey + 3)}" text-anchor="${left ? 'end' : 'start'}" font-size="9" fill="#6b7280" paint-order="stroke" stroke="#fff" stroke-width="2.5">${p.label}</text>`);
  }
  // path, coloured low (warm) to high (blue), with height ticks
  const col = z => z < 5000 ? '#e07b24' : z < 10000 ? '#d4a017' : z < 20000 ? '#3aa457' : '#2f7fcf';
  for (let k = 1; k < tr.length; k++) o.push(`<path d="M${P([tr[k - 1].lat, tr[k - 1].lon])}L${P([tr[k].lat, tr[k].lon])}" stroke="${col(tr[k].z_ft)}" stroke-width="3" stroke-linecap="round"/>`);
  for (const [zt, x, y] of ticks) {
    o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="4" fill="#fff" stroke="${col(zt - 1)}" stroke-width="2"/>`);
    o.push(`<text x="${f(x + 7)}" y="${f(y - 6)}" font-size="12" font-weight="700" fill="#1f2328" paint-order="stroke" stroke="#fff" stroke-width="3">${zt / 1000}k ft</text>`);
  }
  // launch
  o.push(`<circle cx="${f(X(stn.lon))}" cy="${f(Y(stn.lat))}" r="6" fill="#c26a24" stroke="#fff" stroke-width="2"/>`);
  o.push(`<text x="${f(X(stn.lon) + 9)}" y="${f(Y(stn.lat) - 8)}" font-size="12.5" font-weight="700" fill="#9a5418" paint-order="stroke" stroke="#fff" stroke-width="3">launch · ${stn.name}</text>`);
  // scale (10 mi) and north
  const mi10 = 16093 / (111200 * cl) / (lo1 - lo0) * W;
  o.push(`<path d="M${W - 20 - mi10} ${H - 16}h${f(mi10)}" stroke="#8a929d" stroke-width="1.6"/><text x="${f(W - 20 - mi10 / 2)}" y="${H - 22}" text-anchor="middle" font-size="10.5" fill="#7b8490">10 mi</text>`);
  o.push(`<text x="${W - 18}" y="22" text-anchor="middle" font-size="11" font-weight="700" fill="#7b8490">N</text><path d="M${W - 18} 26l-5 12 5-3 5 3z" fill="#8a929d"/>`);
  o.push(basemapAttr(H), '</g></svg>');
  return o.join('');
}

if (typeof module !== 'undefined') module.exports = { balloonPathSVG, trackFromWinds, trackFromCSV };
