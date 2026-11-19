"""List the files to move from main to the 'archive' branch (printed one per line, paths from the repo root):
the raw model inputs of archived days (only scripts/rescore.py reads them) older than 3 days, and the balloon
files older than 10 days (the sounding page draws the last 5 flights). Nothing the website needs."""
import datetime as dt
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
today = dt.date.today()
out = []
for f in sorted((ROOT / "data/archive/raw").glob("*.json.gz")):
    m = re.match(r"(\d{4}-\d{2}-\d{2})", f.name)
    if m and (today - dt.date.fromisoformat(m[1])).days > 3:
        out.append(f)
for f in sorted((ROOT / "data/sounding/archive").glob("*")):
    m = re.search(r"_(\d{8})_\d\dZ", f.name)
    if m and (today - dt.datetime.strptime(m[1], "%Y%m%d").date()).days > 10:
        out.append(f)
print("\n".join(str(p.relative_to(ROOT)) for p in out))
