// Little "where does this chart come from" strip: MCAS Miramar, the balloon, and a timeline of
// launch -> flight -> data posted -> chart updated, with the cycle the chart shows highlighted.
// timelineSVG({ now: Date, shown: Date (nominal 00Z/12Z of the sounding shown), fetched: Date|null })

const TL_TZ = 'America/Los_Angeles';
// chart update times (UTC hours/minutes), matching .github/workflows/sounding.yml
const TL_UPDATES = [[13, 47], [14, 47], [15, 47], [16, 47], [1, 47], [2, 47]];
const TL_LAUNCH_BEFORE_H = 1.0;   // balloons go up about an hour before the nominal 00Z/12Z time
const TL_FLIGHT_H = 1.75;         // ~100 min until the balloon bursts near 100,000 ft
const TL_POSTED_H = 1.25;         // data usually public ~75 min after nominal time

function tlFmt(d, opts) { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: TL_TZ }, opts)).format(d); }
function tlHour(d) { return tlFmt(d, { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(' ', ' ').toLowerCase(); }
function tlDay(d) { return tlFmt(d, { weekday: 'short' }); }

function timelineSVG({ now = new Date(), shown = null, fetched = null, site = 'nkx' } = {}) {
  const VBG = site === 'vbg', VEF = site === 'vef';
  const H = 3600e3;
  const W = 800, Hh = 160;
  const t0 = new Date(now.getTime() - 15 * H), t1 = new Date(now.getTime() + 9 * H);
  const x0 = 162, x1 = 782, yAxis = 84;
  const X = t => x0 + (t - t0) / (t1 - t0) * (x1 - x0);
  const f = v => v.toFixed(1);
  const INK = '#111827', MUTED = '#6b7280', EDGE = '#e5e7eb', ACC = '#e07b00', BLUE = '#2563eb';
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hh}" font-family="Inter, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" fill="${MUTED}">`);
  o.push(`<rect width="${W}" height="${Hh}" rx="12" fill="#fff"/>`);

  // ---- little scene: two happy Marines letting the balloon go at a generic airfield ----
  const flying = (() => {
    for (let k = -1; k <= 1; k++) {
      const c = Math.round(now / (12 * H)) * 12 * H + k * 12 * H;
      const a = c - TL_LAUNCH_BEFORE_H * H;
      if (now >= a && now <= a + TL_FLIGHT_H * H) return true;
    }
    return false;
  })();
  // an original cartoon pilot (olive flight suit, white helmet with the visor up), arm raised with the balloon string
  const pilot = (x, y) => `<g transform="translate(${x} ${y})">
      <ellipse cx="0" cy="22.5" rx="9" ry="1.6" fill="#000" opacity=".12"/>
      <path d="M-3.4 12 L-4.4 21.5 M3.4 12 L4.4 21.5" stroke="#4d5a3a" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M-6.4 21.6 h4.4 M2 21.6 h4.4" stroke="#1f2937" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M-6.5 -2 Q-7.5 6 -5.5 13 H5.5 Q7.5 6 6.5 -2 Q0 -5 -6.5 -2 Z" fill="#5f6f48"/>
      <path d="M-5.6 4.2 h11.2" stroke="#4d5a3a" stroke-width="1.1"/>
      <rect x="1.4" y="-0.6" width="3.2" height="2.4" rx=".5" fill="#c26a24"/>
      <path d="M-6 -0.5 Q-9.5 4 -8.5 9" fill="none" stroke="#5f6f48" stroke-width="3.4" stroke-linecap="round"/>
      <circle cx="-8.4" cy="9.6" r="1.7" fill="#e3b48c"/>
      <path d="M6 -0.5 Q10.5 -6 11 -13.5" fill="none" stroke="#5f6f48" stroke-width="3.4" stroke-linecap="round"/>
      <circle cx="11" cy="-14.6" r="1.8" fill="#e3b48c"/>
      <rect x="-2.2" y="-6.6" width="4.4" height="3" fill="#d8a77f"/>
      <ellipse cx="0" cy="-11" rx="5.6" ry="6" fill="#e3b48c"/>
      <path d="M-6.6 -11.6 Q-6.6 -19.8 0 -19.8 Q6.6 -19.8 6.6 -11.6 L5.4 -11.6 Q5 -16.4 0 -16.6 Q-5 -16.4 -5.4 -11.6 Z" fill="#f4f6f8" stroke="#cfd6de" stroke-width=".6"/>
      <path d="M-5.2 -16 Q0 -18.6 5.2 -16 L4.8 -14.6 Q0 -16.8 -4.8 -14.6 Z" fill="#334155"/>
      <path d="M-5.6 -12.2 H5.6" stroke="#c9a227" stroke-width=".5"/>
      <path d="M-5.2 -12.2 H-0.7 Q-0.5 -9.4 -2.3 -8.9 Q-4.8 -8.7 -5.2 -10.6 Z" fill="#1f2937" stroke="#c9a227" stroke-width=".45"/>
      <path d="M5.2 -12.2 H0.7 Q0.5 -9.4 2.3 -8.9 Q4.8 -8.7 5.2 -10.6 Z" fill="#1f2937" stroke="#c9a227" stroke-width=".45"/>
      <path d="M-4.3 -11.6 L-3 -11.6 M3.2 -11.6 L4.4 -11.6" stroke="#9fb3c8" stroke-width=".5" stroke-linecap="round"/>
      <path d="M-2.4 -7.9 Q0 -5.9 2.4 -7.9" fill="none" stroke="#1f2937" stroke-width=".9" stroke-linecap="round"/>
      <circle cx="-3.8" cy="-8.6" r="1" fill="#f1a39a" opacity=".6"/><circle cx="3.8" cy="-8.6" r="1" fill="#f1a39a" opacity=".6"/>
    </g>`;
  // an original squadron patch: a round badge with the radar's three chevrons
  const badge = (x, y, r) => `<g transform="translate(${x} ${y})">
      <circle r="${r}" fill="#1e293b" stroke="#e2e8f0" stroke-width="1"/>
      <g transform="scale(${r / 10})">
        <path d="M-7 -3.5 h2.6 l3 3.5 -3 3.5 h-2.6 l3 -3.5 z" fill="#c26a24"/>
        <path d="M-1.6 -3.5 h2.6 l3 3.5 -3 3.5 h-2.6 l3 -3.5 z" fill="#a07a5e"/>
        <path d="M3.8 -3.5 h2.6 l3 3.5 -3 3.5 h-2.6 l3 -3.5 z" fill="#d9c3ae"/>
      </g>
    </g>`;
  o.push(`<style>
    @keyframes tlbob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
    @keyframes tlrise { 0% { transform: translateY(10px); opacity: 0 } 12% { opacity: 1 } 85% { opacity: 1 } 100% { transform: translateY(-60px); opacity: 0 } }
    .tl-bob { animation: tlbob 3.5s ease-in-out infinite; }
    .tl-rise { animation: tlrise 6s linear infinite; }
    @media (prefers-reduced-motion: reduce) { .tl-bob, .tl-rise { animation: none } }
  </style>`);
  // F-35 side profile, nose left, ~64 units long: grey body, darker canopy, twin canted fins, landing gear
  const jet = (x, y, sc, gear) => `<g transform="translate(${x} ${y}) scale(${sc})">
      <path d="M46 2.6 L51.5 -9 L57 -9 L57.5 2.8 Z" fill="#7d8896"/>
      <path d="M49.5 2.6 L53.6 -6.4 L56.2 -6.4 L56.4 2.6 Z" fill="#6b7684"/>
      <path d="M0 7.4 Q6 3.6 16 3 L22 1.4 Q28 -1.2 34 1.6 L44 2.8 L57 3 L63 4.4 L64 7.4 L63 8.6 L57 9.4 L8 10.2 Q2.5 9.8 0 7.4 Z" fill="#8f9aa8"/>
      <path d="M8 9.6 L57 8.8 L63 8.2 L64 7.4 L63 8.6 L57 9.4 L8 10.2 Z" fill="#6f7a88"/>
      <path d="M14.6 3.2 Q21 -1.4 28.6 1.7 L23.6 3.5 Z" fill="#3b4656"/>
      <path d="M17.5 2.2 Q21 0.2 25 1" fill="none" stroke="#9fb3c8" stroke-width=".7" opacity=".8"/>
      <path d="M26 7 L46 12.6 L52.5 12.6 L48 7.2 Z" fill="#7d8896"/>
      <path d="M52 6.4 L61.5 10.6 L64.5 10 L58.6 5.8 Z" fill="#7d8896"/>
      <path d="M30 4.6 L36 4.4 L35.4 6.6 L30.4 6.8 Z" fill="#6f7a88"/>
      <rect x="63" y="4.6" width="3.2" height="3.4" rx=".8" fill="#5b6573"/>
      <path d="M6 7.2 h4" stroke="#c26a24" stroke-width=".8"/>
      ${gear ? `<path d="M12 10 v4.4 M40 10 v4.6 M47 10 v4.6" stroke="#475569" stroke-width="1.1"/>
      <circle cx="12" cy="15" r="1.7" fill="#1f2937"/><circle cx="40" cy="15.2" r="2" fill="#1f2937"/><circle cx="47" cy="15.2" r="2" fill="#1f2937"/>` : ''}
    </g>`;
  // an original cartoon astronaut (white suit, round helmet with a gold visor), arm raised with the balloon string
  const astronaut = (x, y) => `<g transform="translate(${x} ${y})">
      <ellipse cx="0" cy="22.5" rx="9.5" ry="1.6" fill="#000" opacity=".12"/>
      <path d="M-3.6 12 L-4.6 21 M3.6 12 L4.6 21" stroke="#e8edf3" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M-7 21.4 h5 M2 21.4 h5" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
      <rect x="-9.6" y="-3" width="4" height="13" rx="1.6" fill="#cbd5e1"/>
      <path d="M-7 -2.4 Q-8 6 -6 13.4 H6 Q8 6 7 -2.4 Q0 -5.4 -7 -2.4 Z" fill="#f4f6f8" stroke="#cbd5e1" stroke-width=".7"/>
      <rect x="-3.6" y="1" width="7.2" height="4.6" rx="1" fill="#dbe3ec" stroke="#b6c2cf" stroke-width=".5"/>
      <circle cx="-1.6" cy="3.3" r=".8" fill="#ef4444"/><circle cx="1.6" cy="3.3" r=".8" fill="#2563eb"/>
      <path d="M-6.4 -1 Q-9.6 4 -8.6 9" fill="none" stroke="#f4f6f8" stroke-width="3.8" stroke-linecap="round"/>
      <circle cx="-8.5" cy="9.8" r="2" fill="#94a3b8"/>
      <path d="M6.4 -1 Q10.8 -6.4 11.2 -13.6" fill="none" stroke="#f4f6f8" stroke-width="3.8" stroke-linecap="round"/>
      <circle cx="11.2" cy="-14.8" r="2" fill="#94a3b8"/>
      <circle cx="0" cy="-11" r="8" fill="#f4f6f8" stroke="#cbd5e1" stroke-width=".8"/>
      <path d="M-5.8 -12.4 Q-5.8 -17 0 -17 Q5.8 -17 5.8 -12.4 Q5.8 -7 0 -7 Q-5.8 -7 -5.8 -12.4 Z" fill="#c9a227"/>
      <path d="M-4.4 -14.2 Q-2.5 -16 0 -15.6" fill="none" stroke="#fde68a" stroke-width="1.2" stroke-linecap="round" opacity=".9"/>
      <path d="M-2.2 -9.4 Q0 -8 2.2 -9.4" fill="none" stroke="#7a5a10" stroke-width=".8" stroke-linecap="round" opacity=".7"/>
    </g>`;
  // a generic rocket on its pad (no markings), with a launch tower
  const rocket = (x, y) => `<g transform="translate(${x} ${y})">
      <rect x="12" y="-70" width="4" height="70" fill="#9aa5b2"/>
      <path d="M12 -64 h-5 M12 -48 h-5 M12 -32 h-5 M12 -16 h-5" stroke="#9aa5b2" stroke-width="1.2"/>
      <path d="M14 -70 l0 -5" stroke="#9aa5b2"/><circle cx="14" cy="-76" r="1.4" fill="#ef4444"/>
      <path d="M0 -78 Q-6 -70 -6 -58 V-10 H6 V-58 Q6 -70 0 -78 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width=".8"/>
      <rect x="-6" y="-44" width="12" height="4" fill="#e07b00"/>
      <circle cx="0" cy="-58" r="2.4" fill="#bfdbfe" stroke="#94a3b8" stroke-width=".6"/>
      <path d="M-6 -22 L-11 -6 L-6 -10 Z M6 -22 L11 -6 L6 -10 Z" fill="#64748b"/>
      <path d="M-4 -10 h8 l-1.4 4 h-5.2 z" fill="#475569"/>
      <rect x="-14" y="-4" width="34" height="4" rx="1" fill="#8a96a5"/>
    </g>`;
  // an original cartoon Vegas showman (white jumpsuit with gold studs and a high collar, black pompadour, gold shades)
  const showman = (x, y) => `<g transform="translate(${x} ${y})">
      <ellipse cx="0" cy="22.5" rx="9.5" ry="1.6" fill="#000" opacity=".12"/>
      <path d="M-3.4 12 L-5.4 21 M3.4 12 L5.4 21" stroke="#fbfbf8" stroke-width="4.2" stroke-linecap="round"/>
      <path d="M-8 21.2 l1.6 -1.8 h3 M3.4 21.2 l1.6 -1.8 h3" stroke="#fbfbf8" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M-7.6 21.6 h4.6 M3 21.6 h4.6" stroke="#1f2937" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M-6.6 -2 Q-7.6 6 -5.6 13 H5.6 Q7.6 6 6.6 -2 Q0 -5 -6.6 -2 Z" fill="#fbfbf8" stroke="#e5e7eb" stroke-width=".6"/>
      <path d="M-1.6 -3.2 L0 3 L1.6 -3.2" fill="#e3b48c"/>
      <rect x="-5.8" y="8.6" width="11.6" height="2.4" rx="1" fill="#d4a017"/>
      <circle cx="-4" cy="1" r=".7" fill="#d4a017"/><circle cx="4" cy="1" r=".7" fill="#d4a017"/><circle cx="-4.6" cy="5" r=".7" fill="#d4a017"/><circle cx="4.6" cy="5" r=".7" fill="#d4a017"/>
      <path d="M-6.2 -1 Q-10 4 -9 9" fill="none" stroke="#fbfbf8" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M-10.6 7 l1.6 3 1.6 -3" fill="#fbfbf8" stroke="#e5e7eb" stroke-width=".4"/>
      <circle cx="-9" cy="9.8" r="1.7" fill="#e3b48c"/>
      <path d="M6.2 -1 Q10.6 -6.4 11 -13.6" fill="none" stroke="#fbfbf8" stroke-width="3.6" stroke-linecap="round"/>
      <circle cx="11" cy="-14.7" r="1.8" fill="#e3b48c"/>
      <path d="M-5.6 -3 L-7.4 -9 L-3 -5 Z M5.6 -3 L7.4 -9 L3 -5 Z" fill="#fbfbf8" stroke="#e5e7eb" stroke-width=".5"/>
      <rect x="-2.1" y="-6.6" width="4.2" height="3" fill="#d8a77f"/>
      <ellipse cx="0" cy="-11" rx="5.4" ry="6" fill="#e3b48c"/>
      <path d="M-5.8 -10.4 Q-7 -19.6 0.6 -20.4 Q7.4 -20.4 6.2 -14.2 Q4.6 -17.2 -0.4 -16.8 Q-4.2 -16.2 -4.8 -10.4 Z" fill="#111827"/>
      <path d="M-5.6 -9.6 V-12.6 M5.4 -9.6 V-12.6" stroke="#111827" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M-5 -12 H-0.6 Q-0.4 -9.4 -2.3 -9 Q-4.6 -8.8 -5 -10.6 Z" fill="#c9a227" stroke="#8a6d10" stroke-width=".4"/>
      <path d="M5 -12 H0.6 Q0.4 -9.4 2.3 -9 Q4.6 -8.8 5 -10.6 Z" fill="#c9a227" stroke="#8a6d10" stroke-width=".4"/>
      <path d="M-2.4 -7.6 Q0.6 -5.6 2.6 -7.2" fill="none" stroke="#1f2937" stroke-width=".9" stroke-linecap="round"/>
    </g>`;
  // generic casino towers and a bulb-lit sign (no names)
  const casinos = () => {
    const bulbs = [];
    for (let i = 0; i < 9; i++) bulbs.push(`<circle cx="${84 + i * 5}" cy="66" r=".9" fill="#fde68a"/><circle cx="${84 + i * 5}" cy="82" r=".9" fill="#fde68a"/>`);
    return `<rect x="66" y="34" width="20" height="88" fill="#d9c7a8"/><path d="M66 34 l10 -10 10 10 z" fill="#c9a227"/>
      <path d="M70 44 h12 M70 52 h12 M70 60 h12 M70 68 h12 M70 76 h12 M70 84 h12 M70 92 h12 M70 100 h12" stroke="#b49a6c" stroke-width="1.4" stroke-dasharray="2 1.6"/>
      <rect x="104" y="44" width="26" height="78" fill="#e8b7c8"/><rect x="104" y="40" width="26" height="5" fill="#d48aa6"/>
      <path d="M108 52 h18 M108 60 h18 M108 68 h18 M108 76 h18 M108 84 h18 M108 92 h18 M108 100 h18" stroke="#c9879f" stroke-width="1.4" stroke-dasharray="2 1.6"/>
      <rect x="88" y="90" width="16" height="32" fill="#b9c9d8"/>
      <rect x="80" y="62" width="48" height="24" rx="3" fill="#7c2d12" stroke="#c9a227" stroke-width="1.2"/>
      ${bulbs.join('')}
      <text x="104" y="77.6" text-anchor="middle" font-size="9" font-weight="800" fill="#fde68a" letter-spacing=".8">CASINO</text>
      <rect x="102" y="86" width="4" height="36" fill="#7c2d12"/>
      <path d="M128 122 V96" stroke="#8b6b3a" stroke-width="2"/><path d="M128 96 q-8 -2 -12 4 M128 96 q8 -2 12 4 M128 96 q-5 -6 -11 -5 M128 96 q5 -6 11 -5" stroke="#3f8f4f" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  };
  o.push(`<g transform="translate(10 4)">
    <defs>
      <clipPath id="scn"><rect x="0" y="4" width="136" height="148" rx="10"/></clipPath>
      <linearGradient id="tlsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe3f7"/><stop offset="1" stop-color="#f3f7fb"/></linearGradient>
      <linearGradient id="tlhang" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8d0da"/><stop offset="1" stop-color="#a9b4c1"/></linearGradient>
    </defs>
    <g clip-path="url(#scn)">
      <rect x="0" y="4" width="136" height="148" fill="url(#tlsky)"/>
      <circle cx="120" cy="24" r="7" fill="#fde68a"/><circle cx="120" cy="24" r="11" fill="#fde68a" opacity=".25"/>
      <path d="M86 30 q4 -5 9 -2 q3 -4 8 -1 q5 0 4 4 h-21 z" fill="#fff" opacity=".9"/>
${VEF ? `      <path d="M0 102 Q24 92 50 100 Q80 90 110 98 Q124 94 136 98 V122 H0 Z" fill="#e4c9a4"/>
      ${casinos()}
      <rect x="0" y="122" width="136" height="30" fill="#a3acb7"/>
      <rect x="0" y="122" width="136" height="2" fill="#8f99a5"/>
      <path d="M4 142h12M26 142h12M48 142h12M70 142h12M92 142h12M114 142h12" stroke="#f8fafc" stroke-width="1.6"/>
      <g transform="translate(-14 -4)"><g class="${flying ? 'tl-rise' : 'tl-bob'}">
        <path d="M52.5 70 Q51 87 53 108" fill="none" stroke="#64748b" stroke-width="0.8"/>
        <ellipse cx="52.5" cy="56" rx="10.5" ry="13" fill="#fff" stroke="#cbd5e1"/>
        <ellipse cx="48.5" cy="51" rx="3" ry="4" fill="#f1f5f9"/>
        <rect x="50" y="68.5" width="5" height="3.4" rx="1" fill="${ACC}"/>
      </g></g>
      ${showman(28, 120)}` : VBG ? `      <path d="M0 100 H136 V122 H0 Z" fill="#7fb3d9"/>
      <path d="M0 103 q8 -2 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t8 0" fill="none" stroke="#e8f2fa" stroke-width=".8" opacity=".8"/>
      <path d="M36 122 Q46 98 70 100 Q98 92 136 98 V122 Z" fill="#c9b98f"/>
      <path d="M52 122 Q70 106 96 108 Q118 104 136 108 V122 Z" fill="#b5a57a"/>
      ${rocket(112, 122)}
      <rect x="0" y="122" width="136" height="30" fill="#a3acb7"/>
      <rect x="0" y="122" width="136" height="2" fill="#8f99a5"/>
      <path d="M4 142h12M26 142h12M48 142h12M70 142h12M92 142h12M114 142h12" stroke="#f8fafc" stroke-width="1.6"/>
      <g transform="translate(0 -4)"><g class="${flying ? 'tl-rise' : 'tl-bob'}">
        <path d="M52.5 70 Q51 87 53 108" fill="none" stroke="#64748b" stroke-width="0.8"/>
        <ellipse cx="52.5" cy="56" rx="10.5" ry="13" fill="#fff" stroke="#cbd5e1"/>
        <ellipse cx="48.5" cy="51" rx="3" ry="4" fill="#f1f5f9"/>
        <rect x="50" y="68.5" width="5" height="3.4" rx="1" fill="${ACC}"/>
      </g></g>
      ${astronaut(42, 120)}` : `      <path d="M0 108 Q20 96 40 104 Q62 94 84 104 Q108 96 136 104 V120 H0 Z" fill="#c9d4bd"/>
      <path d="M0 112 Q30 104 60 110 T136 108 V122 H0 Z" fill="#b5c2a6"/>
      <path d="M2 122 V96 Q30 72 58 96 V122 Z" fill="url(#tlhang)"/>
      <path d="M2 96 Q30 72 58 96" fill="none" stroke="#8d99a8" stroke-width="1.2"/>
      <path d="M10 92 Q30 78 50 92" fill="none" stroke="#b8c2ce" stroke-width=".8"/>
      <rect x="12" y="104" width="36" height="18" fill="#5b6675"/>
      <path d="M21 104 v18 M30 104 v18 M39 104 v18" stroke="#4b5563" stroke-width=".8"/>
      ${badge(30, 92, 6.5)}
      <rect x="118" y="80" width="5" height="42" fill="#b4bec9"/><rect x="112" y="72" width="17" height="9" rx="2" fill="#8a96a5"/>
      <rect x="114" y="74.5" width="13" height="4" rx="1" fill="#bfdbfe"/>
      <path d="M127 72 v-7" stroke="#8a96a5"/><path d="M127 65 l6 1.8 -6 1.8 z" fill="#ef4444"/>
      <rect x="0" y="122" width="136" height="30" fill="#a3acb7"/>
      <rect x="0" y="122" width="136" height="2" fill="#8f99a5"/>
      <path d="M4 142h12M26 142h12M48 142h12M70 142h12M92 142h12M114 142h12" stroke="#f8fafc" stroke-width="1.6"/>
      <ellipse cx="96" cy="129" rx="26" ry="1.8" fill="#000" opacity=".12"/>
      ${jet(64, 111.5, 0.9, true)}
      <g transform="translate(20 -4)"><g class="${flying ? 'tl-rise' : 'tl-bob'}">
        <path d="M52.5 70 Q51 87 53 108" fill="none" stroke="#64748b" stroke-width="0.8"/>
        <ellipse cx="52.5" cy="56" rx="10.5" ry="13" fill="#fff" stroke="#cbd5e1"/>
        <ellipse cx="48.5" cy="51" rx="3" ry="4" fill="#f1f5f9"/>
        <rect x="50" y="68.5" width="5" height="3.4" rx="1" fill="${ACC}"/>
      </g></g>
      ${pilot(62, 120)}`}
    </g>
    <text x="68" y="18" text-anchor="middle" font-size="9.5" font-weight="700" fill="${INK}">${VBG ? 'Vandenberg SFB' : VEF ? 'Las Vegas' : 'MCAS Miramar'}</text>
  </g>`);

  // ---- timeline ----
  o.push(`<text x="${x0}" y="22" font-size="12" font-weight="700" fill="${INK}">${VBG ? 'VBG' : VEF ? 'VEF' : 'NKX'} balloon timeline <tspan font-weight="500" fill="${MUTED}">(Pacific time)</tspan></text>`);
  o.push(`<path d="M${x0} ${yAxis}H${x1}" stroke="${EDGE}" stroke-width="2" stroke-linecap="round"/>`);
  // hour ticks every 3 h on local clock
  const startH = new Date(Math.ceil(t0 / H) * H);
  for (let t = startH.getTime(); t <= t1; t += H) {
    const d = new Date(t), hr = +tlFmt(d, { hour: 'numeric', hour12: false }) % 24;
    if (hr % 3) continue;
    const x = X(t);
    o.push(`<path d="M${f(x)} ${yAxis - 3}v6" stroke="#cbd5e1"/>`);
    o.push(`<text x="${f(x)}" y="${yAxis + 24}" text-anchor="middle" font-size="10">${hr === 0 ? tlDay(d) : tlHour(d)}</text>`);
  }
  // cycles
  const firstC = Math.floor((t0.getTime() - 3 * H) / (12 * H)) * 12 * H;
  for (let c = firstC; c <= t1.getTime() + 3 * H; c += 12 * H) {
    const a = c - TL_LAUNCH_BEFORE_H * H, b = a + TL_FLIGHT_H * H, p = c + TL_POSTED_H * H;
    const isShown = shown && Math.abs(shown.getTime() - c) < H;
    const col = isShown ? ACC : '#94a3b8';
    const xa = Math.max(X(a), x0), xb = Math.min(X(b), x1);
    if (xb > x0 && xa < x1) {
      o.push(`<rect x="${f(xa)}" y="${yAxis - 5}" width="${f(Math.max(3, xb - xa))}" height="10" rx="5" fill="${col}" fill-opacity="${isShown ? 0.9 : 0.45}"/>`);
      // little balloon above the launch
      if (X(a) >= x0 - 2 && X(a) <= x1 - 78) {
        o.push(`<g transform="translate(${f(X(a) + 4)} ${yAxis - 30})"><ellipse cx="0" cy="0" rx="5.5" ry="6.5" fill="#fff" stroke="${col}" stroke-width="1.4"/><path d="M0 6.5 Q-1 12 0 17" fill="none" stroke="${col}"/></g>`);
        o.push(`<text x="${f(X(a) + 13)}" y="${yAxis - 30}" font-size="10" fill="${isShown ? INK : MUTED}" font-weight="${isShown ? 650 : 400}">launch ${tlHour(new Date(a))}</text>`);
        o.push(`<text x="${f(X(a) + 13)}" y="${yAxis - 18}" font-size="9.5">${tlDay(new Date(a))} · ${String(new Date(c).getUTCHours()).padStart(2, '0')}Z</text>`);
      }
    }
    if (X(p) > x0 && X(p) < x1) o.push(`<circle cx="${f(X(p))}" cy="${yAxis}" r="3.5" fill="#fff" stroke="${col}" stroke-width="1.6"><title>data posted ~${tlHour(new Date(p))}</title></circle>`);
    if (isShown) {
      const xm = Math.min(Math.max((xa + xb) / 2, x0 + 40), x1 - 40);
      o.push(`<rect x="${f(xm - 38)}" y="${yAxis + 31}" width="76" height="17" rx="8.5" fill="${ACC}"/>`);
      o.push(`<text x="${f(xm)}" y="${yAxis + 43}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">this chart</text>`);
    }
  }
  // chart updates
  let next = null;
  for (let d = -1; d <= 1; d++) for (const [hh, mm] of TL_UPDATES) {
    const base = new Date(now); base.setUTCHours(hh, mm, 0, 0);
    const t = base.getTime() + d * 24 * H;
    if (t > now.getTime() && (!next || t < next)) next = t;
    if (t < t0.getTime() || t > t1.getTime()) continue;
    o.push(`<path d="M${f(X(t))} ${yAxis + 7}l-3.5 6h7z" fill="${BLUE}" opacity="${t <= now.getTime() ? 0.45 : 0.9}"><title>chart update ${tlHour(new Date(t))}</title></path>`);
  }
  // now
  const xn = X(now.getTime());
  o.push(`<path d="M${f(xn)} 36V${yAxis + 8}" stroke="${INK}" stroke-width="1.4" stroke-dasharray="2 3"/>`);
  o.push(`<rect x="${f(xn - 16)}" y="28" width="32" height="15" rx="7.5" fill="${INK}"/><text x="${f(xn)}" y="38.5" text-anchor="middle" font-size="9.5" font-weight="700" fill="#fff">now</text>`);

  // footer line: what the chart shows + next update
  const parts = [];
  if (shown) {
    const a = new Date(shown.getTime() - TL_LAUNCH_BEFORE_H * H);
    parts.push(`<tspan fill="${ACC}" font-weight="700">Showing</tspan> <tspan fill="${INK}">${tlDay(a)} ${tlHour(a)} launch (${String(shown.getUTCHours()).padStart(2, '0')}Z)</tspan>`);
  }
  if (next) {
    const mins = Math.round((next - now.getTime()) / 60000);
    parts.push(`<tspan fill="${BLUE}" font-weight="700">Next update</tspan> <tspan fill="${INK}">${tlHour(new Date(next))}</tspan> (in ${mins >= 60 ? Math.floor(mins / 60) + ' h ' : ''}${mins % 60} min)`);
  }
  o.push(`<text x="${x0}" y="${Hh - 9}" font-size="11">${parts.join('<tspan fill="#cbd5e1" dx="10">·</tspan><tspan dx="10"></tspan>')}</text>`);
  // mini legend
  o.push(`<g transform="translate(${x1 - 214} 18)" font-size="9.5">
    <rect x="0" y="-6" width="14" height="7" rx="3.5" fill="#94a3b8" fill-opacity="0.6"/><text x="18" y="0">flight</text>
    <circle cx="58" cy="-2.5" r="3.2" fill="#fff" stroke="#94a3b8" stroke-width="1.5"/><text x="65" y="0">data out</text>
    <path d="M120 -6l-3.5 6h7z" fill="${BLUE}"/><text x="127" y="0">chart update</text>
  </g>`);
  o.push('</svg>');
  return o.join('\n');
}

if (typeof module !== 'undefined') module.exports = { timelineSVG };
