"""Re-score archived days with today's rules.

Every archived (midday) run keeps its raw inputs in data/archive/raw/<date>.json.gz: the models' hourly data for
the sites, the NWS discussion, the LAX-DAG gradient and the clouds. This replays them through the current
scoring (with the clock set back to that run) and compares with what the radar said on the day.

  python3 scripts/rescore.py                 # every archived day with raw inputs
  python3 scripts/rescore.py 2026-11-09      # one day
  python3 scripts/rescore.py --all-sites     # list every site, not only the ones that moved
"""
import argparse
import gzip
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_forecast as bf  # noqa: E402


def rescore(raw):
    """The archived run's inputs through today's rules; returns that day's site results."""
    bf._NOW = datetime.fromisoformat(raw["at"])
    bf.GRAD.clear()
    bf.GRAD.update(raw.get("grad") or {})
    parents = json.loads((ROOT / "sites.json").read_text())["sites"]
    now_sites = {s["id"]: s for s in bf.expand_sites(parents)}
    keep = [k for k, sid in enumerate(raw["sites"]) if sid in now_sites]          # sites since removed drop out
    sites = [now_sites[raw["sites"][k]] for k in keep]

    def pick(models):
        out = {}
        for name, (mid, data, info) in (models or {}).items():
            out[name] = (mid, [data[k] for k in keep] if data else data, info)
        return out
    det, ens = pick(raw["det"]), pick(raw["ens"])
    log = []
    result = bf.build(sites, det, ens, raw.get("nws"), log, sources=[], parents=parents, cdata=raw.get("cdata"))
    if raw.get("cdata") is not None:
        try:
            bf.add_clouds(result, parents, raw["cdata"])
        except Exception as e:  # noqa: BLE001
            log.append(f"clouds: {e}")
    bf._NOW = None
    return (result.get("days") or [{}])[0]


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("dates", nargs="*")
    ap.add_argument("--all-sites", action="store_true")
    args = ap.parse_args(argv)
    folder = ROOT / "data" / "archive" / "raw"
    files = sorted(folder.glob("*.json.gz"))
    if args.dates:
        files = [f for f in files if f.name[:10] in args.dates]
    if not files:
        print("No archived raw inputs yet (they are kept from the midday run on).")
        return
    moved = 0
    for f in files:
        date = f.name[:10]
        with gzip.open(f, "rt") as fh:
            raw = json.load(fh)
        new = rescore(raw)
        old = json.loads((ROOT / "data" / "archive" / f"{date}.json").read_text())["day"] if (ROOT / "data" / "archive" / f"{date}.json").exists() else {}
        print(f"\n{date}  (run {raw['at']})")
        for sid, c in (new.get("sites") or {}).items():
            o = (old.get("sites") or {}).get(sid) or {}
            r0, r1 = o.get("rating"), c.get("rating")
            changed = r0 is None or abs(r0 - r1) >= 0.25 or o.get("label") != c.get("label")
            if changed:
                moved += 1
            if changed or args.all_sites:
                was = f"{r0:.1f} {o.get('label', '')}" if r0 is not None else "–"
                print(f"  {sid:14s} {was:22s} -> {r1:.1f} {c.get('label', '')}{'   *' if changed else ''}")
    print(f"\n{moved} site-day(s) moved")


if __name__ == "__main__":
    main()
