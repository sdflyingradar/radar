"""Keep 3 months of balloon files: delete dated soundings and tracks (…_YYYYMMDD_HHZ…) older than 90 days under
data/sounding. The latest files and the station list are never touched."""
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

KEEP_DAYS = 90
ROOT = Path(__file__).resolve().parents[2] / "data" / "sounding"


def prune(root=ROOT, keep_days=KEEP_DAYS, now=None):
    cut = (now or datetime.now(timezone.utc)) - timedelta(days=keep_days)
    gone = 0
    for f in root.rglob("*"):
        m = re.search(r"_(\d{8})_\d\dZ", f.name)
        if f.is_file() and m and datetime.strptime(m.group(1), "%Y%m%d").replace(tzinfo=timezone.utc) < cut:
            f.unlink()
            gone += 1
    print(f"balloon files older than {keep_days} days removed: {gone}")
    return gone


if __name__ == "__main__":
    prune(keep_days=int(sys.argv[1]) if len(sys.argv) > 1 else KEEP_DAYS)
