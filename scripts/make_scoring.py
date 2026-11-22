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


TYPE = {"ridge": "Ridge", "window": "Thermal", "thermal": "Thermal", "convergence": "Convergence", "switch": "Switch (west wind)"}


def short_rng(a):
    a0, a1 = a[0], a[1]
    if (a0 % 360) == (a1 % 360) or a1 - a0 >= 360:
        return "any"
    return f"{comp(a0)}–{comp(a1)}"


def cells(s):
    """{row: html} for one site (one column of the sheet)."""
    c = {}
    ls = s.get("launches") or [dict(name=s.get("short", s["name"]), launch_ft=s.get("launch_ft"), lz_ft=s.get("lz_ft"),
                                     dir=s.get("dir"), glass_off=s.get("glass_off"))]
    br = "<br>".join
    many = len(ls) > 1
    ls = [dict(l, name=SHORT.get(l.get("name"), l.get("name"))) for l in ls]
    c["Type"] = TYPE.get(s.get("style") or s.get("kind"), "")
    c["Launch"] = br(f"{e(l['name']) + ' ' if many else ''}{ft(l['launch_ft'])}" for l in ls if l.get("launch_ft") is not None)
    c["Faces"] = br(f"{e(l['name']) + ' ' if many else ''}{short_rng(l['dir'])}" for l in ls if l.get("dir"))
    c["LZ"] = br(f"{e(l['name']) + ' ' if many else ''}{ft(l['lz_ft'])}" for l in ls if l.get("lz_ft") is not None)
    if s.get("kind") == "ridge" or s.get("style") == "switch":
        c["Hours"] = hours(s["window"])
    else:
        c["Hours"] = "best 3 h, 10 am – glass-off"
    c["Good"] = f"{s['wind_mph'][0]}–{s['wind_mph'][1]} mph" if s.get("wind_mph") else ""
    if s.get("min_mph"):
        c["Good"] += f"<br>under {s['min_mph']}: too light"
    c["Any direction up to"] = "" if s.get("kind") == "ridge" else f"{s.get('light_mph', bf.LIGHT_MPH)}g{s.get('light_gust_mph', bf.LIGHT_GUST_MPH)}"
    ot = s.get("otb_thermal")
    if ot:
        c["Any direction up to"] += f"<br>{ot['mph']} from behind at {ot['wstar']} m/s"
    c["Gusts hurt from"] = f"{s.get('gust_mph', 15)} mph"
    c["Over the back from"] = f"{s.get('otb_mph', 5)} mph"
    c["Cross"] = br(f"{short_rng([x[0], x[1]])}" for x in s.get("cross") or [])
    if s.get("launch_wind") == "surface":
        c["Over the back from"] += "<br><span class='m'>wind at 10 m</span>"
    c["Too strong over"] = f"{round(s['aloft_max_kt'] * KT)} mph" if s.get("aloft_max_kt") else ""
    bad = []
    if s.get("aloft_bad"):
        bad.append(short_rng(s["aloft_bad"]) + (f" ≥{round(s['aloft_bad_min_kt'] * KT)}" if s.get("aloft_bad_min_kt") else ""))
    for l in ls:
        if l.get("aloft_bad"):
            bad.append(f"{e(l['name'])} {short_rng(l['aloft_bad'])}")
    c["Bad from"] = br(bad)
    o = s.get("offshore_nogo")
    c["Offshore"] = f"{short_rng(o['from'])} below {o['top_ft']:,}<br>3+ −1 · 4+ max 2 · {o['mph']}+ no-go" if o else ""
    extra = []
    if s.get("nw_nick"):
        extra.append(f"NW–N −{s['nw_nick']}")
    xb = s.get("xc_bad_aloft")
    if xb:
        extra.append(f"{e(xb.get('tag', 'drift'))}: {short_rng(xb['from'])}")
    if s.get("aloft_block"):
        extra.append(f"thermals beat ≤{round(s['aloft_block']['kt'] * KT)} mph at {s['aloft_block']['wstar']} m/s")
    if s.get("venturi"):
        extra.append(f"venturi {short_rng(s['venturi']['from'])} ×{s['venturi']['factor']}")
    c["Other aloft"] = br(extra)
    if s.get("kind") != "ridge":
        L = s.get("launch_ft") or (ls[0].get("launch_ft") or 0)
        ok = s.get("ok_ft") or L + 1500
        xc = s.get("xc_top_ft") or ok + 1000
        c["3 Site fly"], c["4 XC"], c["5 Great XC"] = ft(ok), ft(xc), ft(xc + (s.get("xc_span_ft") or 1000))
    else:
        c["3 Site fly"], c["4 XC"], c["5 Great XC"] = "10+ mph 3 h", f"thermals ~{s.get('xc_top_ft', 1200):,}", ""
    hp = s.get("height_points") or []
    c["Height points"] = br(e(SHORT.get(p["name"], p["name"])) + (f" <span class='m'>{p['elev_ft']:,}</span>" if p.get("elev_ft") else "") for p in hp)
    g = [e(l["name"]) for l in ls if l.get("glass_off")] or ([e(s.get("short", s["name"]))] if s.get("glass_off") else [])
    c["Glass-off"] = (", ".join(g) + f"<br><span class='m'>after {s.get('glass_climb', 2.0):g} m/s</span>") if g else ""
    sp = []
    for l in ls:
        if l.get("thermal_site_max"):
            sp.append(f"{e(l['name'])}: no convergence = site fly, max {l['thermal_site_max']:g}")
    if s.get("season_months"):
        sp.append("season " + ",".join(str(m) for m in s["season_months"]) + "; else max 2")
    if s.get("calm"):
        sp.append(f"calm: top >{s['calm']['top_mph'][0]} or launch >{s['calm']['launch_mph']} max 2")
    if s.get("inland"):
        sp.append(f"switch checked at {e(s['inland'])}")
    if s.get("rain") == "true":
        sp.append("showers don't count")
    if s.get("kind") == "ridge":
        sp.append("under 10 mph most of the day: max 3")
    c["Special"] = br(sp)
    c["XC blocked"] = br(f"{short_rng([b['from'], b['to']])} {e(b['why'])}" for b in s.get("blocked") or [])
    return c


SHORT = {"Monument Peak (Mt Laguna)": "Monument Pk", "El Cajon Mountain peak": "El Cajon Mtn", "between Laguna and Horse": "middle",
         "Ojai (Chief's Peak)": "Chief's Peak", "Hemet / toward Soboba": "Hemet"}
GROUPS = [("Site", ["Type", "Launch", "Faces", "LZ", "Hours"]),
          ("Launch wind", ["Good", "Any direction up to", "Gusts hurt from", "Over the back from", "Cross"]),
          ("Wind aloft", ["Too strong over", "Bad from", "Offshore", "Other aloft"]),
          ("Height of usable lift (MSL)", ["3 Site fly", "4 XC", "5 Great XC", "Height points"]),
          ("Special", ["Glass-off", "Special", "XC blocked"])]
RULES = [("Start", "height of usable lift on the site's scale × how good launch wind and climb are (ridge: ridge wind)"),
         ("Hours", "best 3 hours between 10 am and glass-off (height and climbs pick them)"),
         ("Rain", "30% of runs wet −0.5 · 45% −1 · 60% −1.5 · showers −1 at most · real rain −2 at most · all window: no-go"),
         ("Cloud", "mid/high cloud over half the sky: sun lost 20% −0.3 · 30% −0.5 · 45% −0.7 · 60%+ −1"),
         ("Gusts", "through most of the window: over 10 −0.5 · 12 −1 · 15 −1.5 · 18 too windy · 10+ gusting 15+: max 2.5"),
         ("Launch direction", "outer 20° of the window −0.3 · up to 20° outside (cross) −1 · further (behind): max 2"),
         ("Top of lift wind", "over 15 mph −0.5 · 20 −1 · 25 too windy · over the back aloft: max 2"),
         ("Offshore", "3+ mph or LAX–DAG −3 mb −1 · 4+ or −4 mb max 2 · 6+ no-go"),
         ("Climb", "weak climbs scale the score down (0 m/s ×0.35 · 1 ×0.7 · 2+ ×1); XC needs 1 m/s"),
         ("A 5", "needs the site's great height, a breeze into launch and a clean day (else max 4)"),
         ("Models", "HRRR + RRFS the next 2 days, then ECMWF, GFS, ICON; weighted blend"),
         ("Day colour", "average of the two best San Diego mountain sites and Elsinore")]


def main():
    cs = [cells(x) for x in S]
    head = "".join(f'<th class="sh">{e(x.get("short", x["name"]))}</th>' for x in S)
    body = []
    for g, rows in GROUPS:
        body.append(f'<tr class="grp"><th colspan="{len(S) + 1}">{e(g)}</th></tr>')
        for r in rows:
            if not any(c.get(r) for c in cs):
                continue
            body.append(f'<tr><th>{e(r)}</th>' + "".join(f"<td>{c.get(r) or '<span class=\'m\'>–</span>'}</td>" for c in cs) + "</tr>")
    rules = "".join(f"<tr><th>{e(a)}</th><td>{e(b)}</td></tr>" for a, b in RULES)
    page = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<title>Scoring Sheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>
:root {{ --paper:#f6f3ee; --ink:#2b1d14; --muted:#7a6a5d; --line:#e4dbd1; --card:#fffdf9; --body:"Work Sans","Helvetica Neue",Arial,sans-serif; color-scheme: light; }}
body {{ background:var(--paper); color:var(--ink); font-family:var(--body); margin:0; }}
main {{ padding:20px max(16px, env(safe-area-inset-left, 0px)) 40px; }}
h1 {{ font-size:1.6rem; font-weight:800; margin:0 0 2px; }} h2 {{ font-size:.8rem; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin:22px 0 8px; }}
.lead {{ color:var(--muted); margin:0 0 6px; font-size:.9rem; }}
.wrap {{ overflow-x:auto; border:1px solid var(--line); border-radius:12px; background:var(--card); }}
table {{ border-collapse:collapse; font-size:.82rem; line-height:1.35; }}
th, td {{ padding:6px 10px; border-bottom:1px solid var(--line); vertical-align:top; text-align:left; }}
td {{ min-width:118px; }}
tbody th {{ position:sticky; left:0; background:var(--card); color:var(--muted); font-weight:600; white-space:nowrap; z-index:1; }}
thead th {{ position:sticky; top:0; background:#f1ebe3; font-weight:700; z-index:2; }} thead th:first-child {{ left:0; z-index:3; }}
tr.grp th {{ background:#f1ebe3; color:var(--ink); font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; }}
.rules {{ max-width:900px; }} .rules td {{ min-width:0; }}
.m {{ color:var(--muted); }}
</style></head><body><main>
<h1>Scoring sheet</h1>
<p class="lead">Admin only. Generated from sites.json and the scoring rules (scripts/make_scoring.py). Wind in mph, heights in ft MSL.</p>
<h2>Every site</h2>
<div class="wrap rules"><table><tbody>{rules}</tbody></table></div>
<h2>Site by site</h2>
<div class="wrap"><table><thead><tr><th></th>{head}</tr></thead><tbody>{"".join(body)}</tbody></table></div>
</main></body></html>
"""
    (ROOT / "scoring.html").write_text(page)
    print("scoring.html written")


if __name__ == "__main__":
    main()
