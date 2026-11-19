"""Visitor numbers for the admin view: pull GoatCounter's totals into data/stats.json (counts only, nothing personal).
Needs a read-only GoatCounter API key in the repo secret GOATCOUNTER_TOKEN."""
import datetime as dt
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.error
import urllib.request

SITE = "https://sdflyingradar.goatcounter.com/api/v0"
OUT = pathlib.Path(__file__).resolve().parents[2] / "data" / "stats.json"


def api(path, **q):
    url = f"{SITE}{path}?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {os.environ['GOATCOUNTER_TOKEN'].strip()}",
                                               "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"{e.code}: {e.read()[:200].decode('utf-8', 'replace')}") from None


def rng(days):
    end = dt.datetime.now(dt.timezone.utc)
    start = (end - dt.timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
    return {"start": start.strftime("%Y-%m-%dT%H:%M:%SZ"), "end": end.strftime("%Y-%m-%dT%H:%M:%SZ")}


def names(page, days=30, limit=8):
    try:
        j = api(f"/stats/{page}", limit=limit, **rng(days))
        SIZE = {"phone": "Phone", "largephone": "Large phone", "tablet": "Tablet", "desktop": "Computer",
                "desktophd": "Large computer screen", "unknown": "Unknown"}
        rows = []
        for s in j.get("stats", []):
            n = s.get("name") or (SIZE.get(s.get("id"), s.get("id")) if page == "sizes" else None) or "(direct)"
            if s.get("count", 0):
                rows.append({"name": n, "count": s.get("count", 0)})
        return rows
    except Exception as e:  # noqa: BLE001
        print(page, "failed:", e)
        return []


def main():
    if not os.environ.get("GOATCOUNTER_TOKEN"):
        print("no GOATCOUNTER_TOKEN: skipped")
        return 0
    out = {"generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")}
    for key, days in (("week", 6), ("month", 29)):
        try:
            t = api("/stats/total", **rng(days))
            out[key] = {"visits": t.get("total", 0), "events": t.get("total_events", 0)}
            if key == "month":
                daily = [{"day": s.get("day"), "n": s.get("daily", 0)} for s in t.get("stats", [])]
                while len(daily) > 7 and not daily[0]["n"]:      # from the first counted day (at least a week)
                    daily.pop(0)
                out["daily"] = daily
                if daily:
                    out["today"] = {"visits": daily[-1]["n"]}
        except Exception as e:  # noqa: BLE001
            print("total", key, "failed:", e)
    try:
        hits = api("/stats/hits", limit=30, **rng(29)).get("hits", [])
        out["pages"] = [{"path": h.get("path"), "title": h.get("title") or "", "count": h.get("count", 0),
                         "event": bool(h.get("event"))} for h in hits]
    except Exception as e:  # noqa: BLE001
        print("hits failed:", e)
    out["refs"] = names("toprefs")
    out["sizes"] = names("sizes")
    out["systems"] = names("systems")
    out["locations"] = names("locations")
    if not any(k in out for k in ("today", "week", "month")):
        print("no numbers came back (check the GoatCounter key): stats.json left as it was")
        return 1
    OUT.write_text(json.dumps(out, indent=1))
    print("wrote", OUT, {k: out.get(k) for k in ("today", "week", "month")})
    return 0


if __name__ == "__main__":
    sys.exit(main())
