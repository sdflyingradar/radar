#!/usr/bin/env python3
"""Redraw the site charts in how.html ("Where the radar measures") from sites.json."""
import html, json, math, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
S = {s["id"]: s for s in json.loads((ROOT / "sites.json").read_text())["sites"]}
BIG = ["lb", "blossom", "elsinore", "lagunahorse"]
SMALL = ["torrey", "otay", "whalesv", "soboba", "marshall"]
EXP = ["santabarbara", "owens"]   # experimental: areas for a flying trip


def xy(lat, lon, lat0, lon0):
    return ((lon - lon0) * 111.0 * math.cos(math.radians(lat0)), (lat - lat0) * 111.0)


def arcs(a, b):
    """Split a compass sector a->b (clockwise) into (start, end) pieces."""
    return [(a % 360, a % 360 + (b - a) % 360)] if (b - a) % 360 else [(0, 360)]


def sectors(s, l):
    """(start, end, cls) wedges for one launch, in the score's colours (the same as the launch dial on the tiles):
    green = more than 20 deg inside the launch window, yellow = its outer 20 deg, orange = up to 20 deg outside
    (crosswind). Beyond that it is red (from behind), not drawn."""
    w = l.get("dir") or s.get("dir")
    if not w or (w[1] - w[0]) % 360 == 0:
        return []
    a, span = w[0], (w[1] - w[0]) % 360
    rim = min(20, span / 2)
    out = [(a - 20, a, "cross"), (a, a + rim, "rim"), (a + rim, a + span - rim, "good"),
           (a + span - rim, a + span, "rim"), (a + span, a + span + 20, "cross")]
    return [o for o in out if o[1] - o[0] > 0.5]


def wedge(X, Y, r, a0, a1, cls):
    pt = lambda a: (X + r * math.sin(math.radians(a)), Y - r * math.cos(math.radians(a)))
    (x0, y0), (x1, y1) = pt(a0), pt(a1)
    big = 1 if a1 - a0 > 180 else 0
    return (f'<path d="M{X:.1f} {Y:.1f} L{x0:.1f} {y0:.1f} A{r:.1f} {r:.1f} 0 {big} 1 {x1:.1f} {y1:.1f} Z" '
            f'class="sec {cls}"/>')


SHORT = {"Hemet / toward Soboba": "Hemet", "Monument Peak (Mt Laguna)": "Monument Pk", "El Cajon Mountain peak": "El Cajon Mtn",
         "between Laguna and Horse": "middle", "Black Eagle (Inyos)": "Black Eagle", "Mazourka (Inyos)": "Mazourka",
         "Montecito crest": "Montecito", "La Cumbre Peak": "La Cumbre", "Ojai (Chief's Peak)": "Ojai", "Santiago Peak": "Santiago Pk", "Stonewall Peak": "Stonewall"}


def short_label(n):
    """Small maps, readable labels: '10 km N' (the rings say the distance) -> 'N'; long names shortened."""
    m = re.match(r"^\d+ km ([NSEW]{1,3})( of the middle)?$", n)
    return m.group(1) if m else SHORT.get(n, n)


def chart(sid, big, wide=False):
    s = S[sid]
    launches = s.get("launches") or [{"name": s["short"], "lat": s["lat"], "lon": s["lon"]}]
    hp = s.get("height_points") or []
    lat0 = sum(l["lat"] for l in launches) / len(launches)
    lon0 = sum(l["lon"] for l in launches) / len(launches)
    pts = [(xy(p["lat"], p["lon"], lat0, lon0), p["name"]) for p in hp]
    below = {p["name"] for p in hp if p.get("label") == "below"}
    L = [(xy(l["lat"], l["lon"], lat0, lon0), l["name"]) for l in launches]
    ext = max([12] + [max(abs(a), abs(b)) for (a, b), _ in pts + L]) + 4
    W = 640 if wide else 520 if big else 300
    Hh = 300 if wide else W                          # landscape: an area spread east-west (Santa Barbara / Ojai)
    pad = 34
    if wide:
        ex = max([12] + [abs(a) for (a, b), _ in pts + L]) + 6
        ey = max([6] + [abs(b) for (a, b), _ in pts + L]) + 6
        R = min((W / 2 - pad - 40) / ex, (Hh / 2 - pad) / ey)
    else:
        R = (W / 2 - pad) / ext
    P = lambda x, y: (W / 2 + x * R, Hh / 2 - y * R)
    o = [f'<svg viewBox="0 0 {W} {Hh}" role="img" aria-label="Measuring points for {html.escape(s["name"])}">']
    step = 10 if ext < 40 else 25
    # label sizes in viewBox units (match the page CSS: .big / .small .pl .ll .km)
    FS = {"pl": 29, "ll": 31, "km": 24} if big else {"pl": 18, "ll": 19, "km": 15}
    boxes = []                                       # [x0, y0, x1, y1] already taken: wedges, dots, labels
    def tbox(x, y, txt, cls, anchor):
        w = len(txt) * FS[cls] * 0.56
        x0 = x if anchor == "start" else x - w if anchor == "end" else x - w / 2
        return [x0 - 2, y - FS[cls] * 0.8, x0 + w + 2, y + FS[cls] * 0.25]
    def free(bx):
        if bx[0] < 2 or bx[2] > W - 2 or bx[1] < 2 or bx[3] > Hh - 2:
            return False
        return not any(bx[0] < c[2] and bx[2] > c[0] and bx[1] < c[3] and bx[3] > c[1] for c in boxes)
    def place(cands, txt, cls):
        """the first candidate (x, y, anchor) that hits nothing; the first one if all do"""
        for x, y, an in cands:
            bx = tbox(x, y, txt, cls, an)
            if free(bx):
                boxes.append(bx)
                return x, y, an
        x, y, an = cands[0]
        boxes.append(tbox(x, y, txt, cls, an))
        return x, y, an
    rings = []
    for r in range(step, int(ext) + 1, step):
        if r * R > Hh / 2 - 4:                       # landscape: only the rings that fit
            continue
        rings.append(r)
        o.append(f'<circle cx="{W/2}" cy="{Hh/2}" r="{r*R:.1f}" class="ring"/>')
    o.append(f'<line x1="{W/2}" y1="{pad/2}" x2="{W/2}" y2="{Hh-pad/2}" class="axis"/><line x1="{pad/2}" y1="{Hh/2}" '
             f'x2="{W-pad/2}" y2="{Hh/2}" class="axis"/><text x="{W/2}" y="{pad/2-4}" class="north">N</text>')
    boxes.append([W / 2 - 12, 0, W / 2 + 12, pad / 2])
    wr = 34 if sid in EXP else (62 if big else 44)     # trip areas span tens of km: smaller wedges
    for l, ((x, y), _) in zip(launches, L):
        X, Y = P(x, y)
        o += [wedge(X, Y, wr, a0, a1, c) for a0, a1, c in sectors(s, l)]
        boxes.append([X - wr - 6, Y - wr - 6, X + wr + 6, Y + wr + 6])   # the launch window (and a margin): never write over it
    dot = 9 if big else 7
    for (x, y), n in pts:
        X, Y = P(x, y)
        o.append(f'<circle cx="{X:.1f}" cy="{Y:.1f}" r="{dot}" class="pt"/>')
        boxes.append([X - dot, Y - dot, X + dot, Y + dot])
    # launch names: below the window, else left / right / above it
    for (x, y), n in L:
        X, Y = P(x, y)
        t = short_label(n)
        g = FS["ll"]
        cands = [(X, Y + wr + g, "middle"), (X - wr - 6, Y + g * 0.35, "end"), (X + wr + 6, Y + g * 0.35, "start"),
                 (X, Y - wr - 6, "middle"), (X - wr - 6, Y + wr, "end"), (X + wr + 6, Y + wr, "start"),
                 (X - wr - 6, Y - wr + g, "end"), (X + wr + 6, Y - wr + g, "start"), (X, Y + wr + 2 * g, "middle"),
                 (X - wr - 6, Y + wr + g, "end"), (X + wr + 6, Y + wr + g, "start")]
        x1, y1, an = place(cands, t, "ll")
        o.append(f'<text x="{x1:.1f}" y="{y1:.1f}" text-anchor="{an}" class="ll">{html.escape(t)}</text>')
    # height points: right, left, above, below the dot
    for (x, y), n in pts:
        X, Y = P(x, y)
        if n.endswith("launch") or any(math.hypot(x - a, y - b) < 1.5 for (a, b), _ in L):
            continue                                  # a point at (or right by) a launch: the launch name says it
        t = short_label(n)
        g = FS["pl"]
        d = dot + 4
        cands = [(X + d, Y + g * 0.35, "start"), (X - d, Y + g * 0.35, "end"), (X, Y - d - 2, "middle"), (X, Y + d + g * 0.8, "middle"),
                 (X + d, Y - d, "start"), (X - d, Y - d, "end"), (X + d, Y + d + g * 0.6, "start"), (X - d, Y + d + g * 0.6, "end")]
        cands += [(cx + (cx - X) * 0.8, cy + (cy - Y) * 0.8, an) for cx, cy, an in cands]     # a bit further out
        x1, y1, an = place(cands, t, "pl")
        o.append(f'<text x="{x1:.1f}" y="{y1:.1f}" text-anchor="{an}" class="pl">{html.escape(t)}</text>')
    # distance on each ring: lower left first, else the other diagonals
    for r in rings:
        rr = r * R * 0.707
        cands = [(W / 2 - rr - 3, Hh / 2 + rr + FS["km"], "end"), (W / 2 + rr + 3, Hh / 2 + rr + FS["km"], "start"),
                 (W / 2 - rr - 3, Hh / 2 - rr - 3, "end"), (W / 2 + rr + 3, Hh / 2 - rr - 3, "start")]
        x1, y1, an = place(cands, f"{r} km", "km")
        o.append(f'<text x="{x1:.1f}" y="{y1:.1f}" text-anchor="{an}" class="km">{r} km</text>')
    o.append("</svg>")
    note = f"{len(hp)} height points · wind from the launch" if hp else "wind and height from the launch point only"
    return (f'<figure class="site {"big" if big else "small"}{" wide" if wide else ""}"><figcaption><b>{html.escape(s["name"])}</b>'
            f'<span>{note}</span></figcaption>{"".join(o)}</figure>')


def main():
    p = ROOT / "how.html"
    page = p.read_text()
    big = "".join(chart(x, True) for x in BIG if x in S)
    small = "".join(chart(x, False) for x in SMALL if x in S)
    # trip areas with the others: Owens next to Marshall, Santa Barbara / Ojai as a wide (landscape) card
    small += "".join(chart(x, False) for x in EXP if x in S and x != "santabarbara")
    if "santabarbara" in S:
        small += chart("santabarbara", False, wide=True)
    page = re.sub(r'<div class="grid big">.*?</div>\n<h2>', lambda m: f'<div class="grid big">{big}</div>\n<h2>', page, flags=re.S)
    page = re.sub(r'<h2 class="exp">.*?<div class="grid big exp">.*?</div>\n', '', page, flags=re.S)   # no separate section
    page = re.sub(r'<div class="grid small">.*?</div>\n\s*(<h2>|</main>)',
                  lambda m: f'<div class="grid small">{small}</div>\n{m.group(1)}', page, flags=re.S)
    p.write_text(page)
    print("how.html redrawn")


if __name__ == "__main__":
    main()
