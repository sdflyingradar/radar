"""Keep an archive of every balloon on file and an index of it for the sounding page's path map.

Each station's launch is copied to data/sounding/archive/<STN>_<YYYYMMDD>_<HH>Z.txt (and its published track,
when there is one, to ..._track.csv). data/sounding/archive/index.json lists them newest first per station:
{"NKX": [{"t": "2026-11-07T12Z", "txt": "archive/NKX_20261107_12Z.txt", "track": "archive/NKX_20261107_12Z_track.csv"}, ...]}
Standard library only; safe to run any time (copies only what is new).
"""
import datetime as dt
import glob
import json
import os
import re
import shutil

BASE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "sounding")
ARCH = os.path.join(BASE, "archive")


def obs_time(text):
    m = re.search(r"Observations at (\d\d)Z (\d\d) (\w{3}) (\d{4})", text)
    if not m:
        return None
    return dt.datetime.strptime(f"{m.group(4)} {m.group(3)} {m.group(2)} {m.group(1)}", "%Y %b %d %H")


def main():
    os.makedirs(ARCH, exist_ok=True)
    # NKX keeps its own per-launch copies (00Z and 12Z): data/sounding/nkx_YYYYMMDD_HHZ.txt
    for p in glob.glob(os.path.join(BASE, "nkx_*Z.txt")):
        m = re.search(r"nkx_(\d{8})_(\d\d)Z\.txt$", p)
        if m:
            dst = os.path.join(ARCH, f"NKX_{m.group(1)}_{m.group(2)}Z.txt")
            if not os.path.exists(dst):
                shutil.copyfile(p, dst)
    # the other stations: the latest file and its track, named by the launch time inside
    for p in glob.glob(os.path.join(BASE, "stations", "*_latest.txt")):
        stn = os.path.basename(p).split("_")[0]
        with open(p) as f:
            t = obs_time(f.read())
        if not t:
            continue
        stem = f"{stn}_{t:%Y%m%d_%H}Z"
        if not os.path.exists(os.path.join(ARCH, stem + ".txt")):
            shutil.copyfile(p, os.path.join(ARCH, stem + ".txt"))
        trk = os.path.join(BASE, "stations", f"{stn}_track.csv")
        if os.path.exists(trk) and not os.path.exists(os.path.join(ARCH, stem + "_track.csv")):
            shutil.copyfile(trk, os.path.join(ARCH, stem + "_track.csv"))
    idx = {}
    for p in glob.glob(os.path.join(ARCH, "*Z.txt")):
        m = re.search(r"([A-Z0-9]+)_(\d{8})_(\d\d)Z\.txt$", p)
        if not m:
            continue
        stn, d, h = m.groups()
        stem = f"{stn}_{d}_{h}Z"
        idx.setdefault(stn, []).append({"t": f"{d[:4]}-{d[4:6]}-{d[6:]}T{h}Z", "txt": f"archive/{stem}.txt",
                                        "track": f"archive/{stem}_track.csv" if os.path.exists(os.path.join(ARCH, stem + "_track.csv")) else None})
    for v in idx.values():
        v.sort(key=lambda e: e["t"], reverse=True)
    with open(os.path.join(ARCH, "index.json"), "w") as f:
        json.dump(idx, f, indent=1)
    print({k: len(v) for k, v in idx.items()})
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
