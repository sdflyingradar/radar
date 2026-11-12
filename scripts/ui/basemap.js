// Esri World Topo Map as the base of our SVG maps (balloon path, LAX-DAG pressure map).
// The maps draw in Web Mercator so the tiles line up; the tiles go in as <image> elements under our own marks.
// Attribution is required: basemapAttr() puts it in the bottom left corner.
const BM_URL = (z, y, x) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`;
const bmMerc = (la) => Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360));
const bmUnmerc = (m) => (2 * Math.atan(Math.exp(m)) - Math.PI / 2) * 180 / Math.PI;

// A Mercator frame W x H around the given longitudes, centred on latitude cla: { lo0, lo1, la0, la1, X, Y }
function basemapFrame(lo0, lo1, cla, W, H) {
  const span = (lo1 - lo0) * Math.PI / 180 * H / W, mc = bmMerc(cla);
  const la0 = bmUnmerc(mc - span / 2), la1 = bmUnmerc(mc + span / 2), m1 = bmMerc(la1);
  const X = (lo) => (lo - lo0) / (lo1 - lo0) * W, Y = (la) => (m1 - bmMerc(la)) / span * H;
  return { lo0, lo1, la0, la1, X, Y };
}

// <image> tiles covering the frame (sharp on a retina screen, a modest number of tiles)
function basemapTiles(F, W, H) {
  const z = Math.max(3, Math.min(14, Math.ceil(Math.log2(W * 1.6 / ((F.lo1 - F.lo0) / 360 * 256)))));
  const n = 2 ** z, tx = (lo) => Math.floor((lo + 180) / 360 * n), ty = (la) => Math.floor((1 - bmMerc(la) / Math.PI) / 2 * n);
  const lon = (x) => x / n * 360 - 180, lat = (y) => bmUnmerc(Math.PI * (1 - 2 * y / n)), f = (v) => v.toFixed(1);
  const o = [];
  for (let x = tx(F.lo0); x <= tx(F.lo1); x++) for (let y = ty(F.la1); y <= ty(F.la0); y++) {
    const x0 = F.X(lon(x)), x1 = F.X(lon(x + 1)), y0 = F.Y(lat(y)), y1 = F.Y(lat(y + 1));
    o.push(`<image href="${BM_URL(z, y, x)}" x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0 + 0.6)}" height="${f(y1 - y0 + 0.6)}" preserveAspectRatio="none"/>`);
  }
  return o.join('');
}

function basemapAttr(H) {
  return `<text x="8" y="${H - 7}" font-size="8.5" fill="#4b5563" paint-order="stroke" stroke="#fff" stroke-width="2.5" opacity=".9">Tiles © Esri — Esri, HERE, Garmin, USGS, NOAA</text>`;
}

if (typeof module !== 'undefined') module.exports = { basemapFrame, basemapTiles, basemapAttr };
