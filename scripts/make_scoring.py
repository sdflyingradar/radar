"""The scoring sheet (scoring.html): how each site is scored, in plain words, read straight from sites.json and the
scoring constants, so it never drifts from what the radar does. Run after changing sites.json or a rule:
    python3 scripts/make_scoring.py
"""
import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_forecast as bf  # noqa: E402

S = json.loads((ROOT / "sites.json").read_text())["sites"]
KT = 1.15078
PTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
e = html.escape


def comp(d):
    return PTS[round((d % 360) / 22.5) % 16]


def rng(a):
    a0, a1 = a[0], a[1]
    if (a0 % 360) == (a1 % 360) or a1 - a0 >= 360:
        return "any direction"
    return f"{comp(a0)} to {comp(a1)} ({a0}–{a1}°)"


def ft(v):
    return f"{v:,.0f} ft"


def hours(w):
    h = lambda x: f"{x - 12 if x > 12 else x} {'pm' if x >= 12 else 'am'}"
    return f"{h(w[0])} – {h(w[1] + 1)}"


STYLE = {
    "ridge": "Ridge site. Scored on the launch wind hour by hour through the day (soarable, too light, too strong, "
             "from the wrong side). A day with real thermals on top can go to 4–5 (“Thermal day”).",
    "window": "Thermal site. The score starts from the height of usable lift (over its height points) in the best "
              "3 hours, then steps for wind, gusts, climb, rain and cloud.",
    "thermal": "Thermal site. The score starts from the height of usable lift (over its height points) in the best "
               "3 hours, then steps for wind, gusts, climb, rain and cloud.",
    "convergence": "Convergence site. XC needs a convergence line in the window; without one it is a site-flying "
                   "day at best (or Marginal).",
    "switch": "Switch site. Launch in the light pre-switch air, then the west wind (the switch) builds the "
              "convergence inland; the height over the range after the switch decides.",
}


def site_rows(s):
    rows = []
    add = lambda k, v: rows.append((k, v))
    add("How it's scored", STYLE.get(s.get("style") or s.get("kind"), ""))
    # launches
    ls = s.get("launches") or [dict(name=s.get("short", s["name"]), lat=s.get("lat"), lon=s.get("lon"),
                                     launch_ft=s.get("launch_ft"), lz_ft=s.get("lz_ft"), dir=s.get("dir"))]
    lines = []
    for l in ls:
        bits = [f"<b>{e(l['name'])}</b>"]
        if l.get("launch_ft") is not None:
            bits.append(f"launch {ft(l['launch_ft'])}")
        if l.get("lz_ft") is not None:
            bits.append(f"LZ {ft(l['lz_ft'])}")
        if l.get("dir"):
            bits.append(f"faces {rng(l['dir'])}")
        extra = []
        if l.get("glass_off"):
            extra.append("glass-off launch")
        if l.get("thermal_site_max"):
            extra.append(f"without convergence a site-flying day, {l['thermal_site_max']:g} at most")
        if l.get("aloft_bad"):
            extra.append(f"bad aloft from {rng(l['aloft_bad'])}")
        if extra:
            bits.append("; ".join(extra))
        lines.append(" · ".join(bits))
    if len(ls) > 1:
        lines.append("<span class='m'>The best launch counts; launches within half a point of it are named on the tile.</span>")
    add("Launches" if len(ls) > 1 else "Launch", "<br>".join(lines))
    # window
    if s.get("kind") == "ridge" or s.get("style") == "switch":
        add("Hours", f"{hours(s['window'])} (its own window)")
    else:
        add("Hours", f"the best 3 hours, starting 10 am – 1 pm (usually {hours(s.get('window') or [11, 13])}); "
                     "launch wind and gusts from the best launch hour once it's lifty")
    # launch wind
    w = []
    if s.get("wind_mph"):
        w.append(f"good {s['wind_mph'][0]}–{s['wind_mph'][1]} mph")
    if s.get("min_mph"):
        w.append(f"under {s['min_mph']} mph too light")
    lm, lg = s.get("light_mph", bf.LIGHT_MPH), s.get("light_gust_mph", bf.LIGHT_GUST_MPH)
    if s.get("kind") != "ridge":
        w.append(f"{lm}g{lg} or lighter: any direction is fine")
    ot = s.get("otb_thermal")
    if ot:
        w.append(f"up to {ot['mph']} mph from behind counts as thermal wind when climbs reach {ot['wstar']} m/s")
    w.append(f"gusts hurt from {s.get('gust_mph', 15)} mph")
    w.append(f"over the back from {s.get('otb_mph', 5)} mph")
    for c in s.get("cross") or []:
        w.append(f"{e(c[2])} ({c[0]}–{c[1]}°)")
    if s.get("launch_wind") == "surface":
        w.append("launch wind read at 10 m (surface), not in free air")
    add("Launch wind", " · ".join(w))
    # aloft
    a = []
    if s.get("aloft_max_kt"):
        a.append(f"too strong over {round(s['aloft_max_kt'] * KT)} mph")
    if s.get("aloft_bad"):
        a.append(f"bad from {rng(s['aloft_bad'])}" + (f" at {round(s['aloft_bad_min_kt'] * KT)} mph or more" if s.get("aloft_bad_min_kt") else ""))
    o = s.get("offshore_nogo")
    if o:
        a.append(f"offshore from {rng(o['from'])} below {ft(o['top_ft'])}: 3+ mph −1, 4+ mph or LAX–DAG −4 mb: 2 at most, "
                 f"{o['mph']}+ mph no-go")
    if s.get("nw_nick"):
        a.append(f"NW to N at the top of lift −{s['nw_nick']}")
    xb = s.get("xc_bad_aloft")
    if xb:
        a.append(f"{e(xb.get('tag', 'drift'))}: from {rng(xb['from'])} at {round(xb.get('min_kt', 0) * KT)}+ mph, {e(xb.get('why', ''))}")
    if s.get("aloft_block"):
        a.append(f"strong thermals (climbs {s['aloft_block']['wstar']} m/s+) hold off wind aloft up to {round(s['aloft_block']['kt'] * KT)} mph")
    v = s.get("venturi")
    if v:
        a.append(f"venturi: wind from {rng(v['from'])} sped up ×{v['factor']} on launch")
    if a:
        add("Wind aloft", " · ".join(a))
    # height scale
    if s.get("kind") != "ridge":
        L = s.get("launch_ft") or (ls[0].get("launch_ft") if ls else 0)
        ok = s.get("ok_ft") or L + 1500
        xc = s.get("xc_top_ft") or ok + 1000
        gr = xc + (s.get("xc_span_ft") or 1000)
        add("Height scale (usable top, MSL)",
            f"launch {ft(L)} = 1.5 · <b>{ft(ok)} = 3</b> Site fly · <b>{ft(xc)} = 4</b> XC · <b>{ft(gr)} = 5</b> Great XC"
            f" · XC needs climbs of {bf.XC_MIN_CLIMB:g} m/s or more")
    else:
        add("Height", f"thermal day from about {ft(s.get('xc_top_ft', 1200))} at the cliffs")
    hp = s.get("height_points") or []
    if hp:
        add("Height points", " · ".join(f"{e(p['name'])}" + (f" ({ft(p['elev_ft'])} summit)" if p.get("elev_ft") else "") for p in hp))
    sp = []
    if s.get("glass_off") or any(l.get("glass_off") for l in ls):
        sp.append(f"glass-off pill after a climb of {s.get('glass_climb', 2.0):g} m/s+ at noon–3 pm, with a smooth evening breeze straight in")
    if s.get("season_months"):
        sp.append("season: " + ", ".join(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] for m in s["season_months"]) + "; outside it 2 at most")
    if s.get("calm"):
        c = s["calm"]
        sp.append(f"needs calm: top of lift over {c['top_mph'][0]} mph or launch over {c['launch_mph']} mph: 2 at most; over {c['top_mph'][1]} mph no-go")
    if s.get("inland"):
        sp.append(f"the switch's height is checked at {e(s['inland'])} in the 3 hours after it")
    if s.get("rain") == "true":
        sp.append("a mere chance of showers doesn't count (only a likely-wet day)")
    for b in s.get("blocked") or []:
        sp.append(f"XC toward {rng([b['from'], b['to']])} blocked: {e(b['why'])}")
    if sp:
        add("Special", " · ".join(sp))
    return rows


GENERAL = """
<ul>
<li><b>Start:</b> the height of usable lift (the part of the thermal where a glider climbs) on the site's scale,
times how good the conditions are (launch wind, climb). Ridge sites start from the ridge wind.</li>
<li><b>Steps off</b> (when they hold through most of the window): rain (showers −1 at most, real rain −2) · high cloud by
the sun lost (−0.3 to −1) · gusts on launch over 10/12/15 mph −0.5/−1/−1.5 · crosswind −1, edge of the launch window −0.3,
from behind −2 · wind at top of lift over 15/20 mph −0.5/−1 · over the back aloft −1.5 · offshore 3+ mph or LAX–DAG −3 mb −1.</li>
<li><b>Hard limits</b> (a day really is out): offshore 6+ mph no-go · offshore 4+ mph or −4 mb 2 at most · gusts over
18 mph or top of lift over 25 mph too windy · strong wind (10+, gusts 15+) 2.5 at most · rain the whole window no-go ·
a 5 needs a breeze into launch (else 4) · Torrey under 10 mph most of the day 3 at most.</li>
<li><b>Models:</b> HRRR and RRFS for the next 2 days, then ECMWF, GFS and ICON; the score is their weighted blend.</li>
<li><b>Day colour:</b> the average of the two best San Diego mountain sites and Elsinore.</li>
</ul>"""


def main():
    cards = []
    for s in S:
        rows = "".join(f"<tr><th>{e(k)}</th><td>{v}</td></tr>" for k, v in site_rows(s))
        tag = {"main": "home site", "coast": "coast", "watch": "trip (shown when great)", "other": ""}.get(s.get("tier"), "")
        if s.get("experimental"):
            tag = "trip area"
        cards.append(f'<section class="site" id="{e(s["id"])}"><h2>{e(s["name"])}'
                     f'{f" <small>{e(tag)}</small>" if tag else ""}</h2><table>{rows}</table></section>')
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<title>Scoring Sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
:root {{ --paper:#f6f3ee; --ink:#2b1d14; --muted:#7a6a5d; --line:#d9cfc4; --card:#fffdf9; --body:"Work Sans","Helvetica Neue",Arial,sans-serif; color-scheme: light; }}
body {{ background:var(--paper); color:var(--ink); font-family:var(--body); margin:0; }}
main {{ max-width:880px; margin:0 auto; padding:24px max(16px, env(safe-area-inset-left, 0px)) 48px; }}
h1 {{ font-size:clamp(1.6rem,4vw,2.2rem); font-weight:800; letter-spacing:-.02em; margin:0 0 4px; }}
.lead {{ color:var(--muted); margin:0 0 18px; }} a {{ color:#2b6cb0; }}
.gen {{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:6px 18px; margin-bottom:22px; font-size:.92rem; line-height:1.5; }}
.gen ul {{ padding-left:1.1em; }} .gen li {{ margin:6px 0; }}
nav {{ display:flex; flex-wrap:wrap; gap:6px; margin:0 0 18px; }}
nav a {{ text-decoration:none; background:var(--card); border:1px solid var(--line); border-radius:999px; padding:3px 10px; font-size:.84rem; color:var(--ink); }}
.site {{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:14px 18px 10px; margin:0 0 16px; }}
.site h2 {{ margin:0 0 8px; font-size:1.15rem; }} .site h2 small {{ font-weight:500; color:var(--muted); font-size:.8rem; margin-left:6px; }}
table {{ border-collapse:collapse; width:100%; font-size:.9rem; line-height:1.45; }}
th {{ text-align:left; vertical-align:top; color:var(--muted); font-weight:600; width:150px; padding:6px 12px 6px 0; border-top:1px solid #eee7df; }}
td {{ padding:6px 0; border-top:1px solid #eee7df; }} tr:first-child th, tr:first-child td {{ border-top:0; }}
.m {{ color:var(--muted); font-size:.85rem; }}
@media (max-width:560px) {{ th {{ display:block; width:auto; padding-bottom:0; border-top:1px solid #eee7df; }} td {{ display:block; border-top:0; padding-top:2px; }} }}
</style></head><body><main>
<h1>Scoring sheet</h1>
<p class="lead">How the radar scores each site, read straight from its settings. <a href="how.html">What this is</a> explains the ideas; this is the detail.</p>
<div class="gen"><p><b>Every site</b></p>{GENERAL}</div>
<nav>{"".join(f'<a href="#{e(s["id"])}">{e(s.get("short", s["name"]))}</a>' for s in S)}</nav>
{"".join(cards)}
</main></body></html>
"""
    (ROOT / "scoring.html").write_text(page)
    print("scoring.html written")


if __name__ == "__main__":
    main()
