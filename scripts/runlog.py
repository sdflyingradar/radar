"""Note when an update run finished: data/runs/<kind>.json keeps the UTC times of the last 3 days.
The timeline at the bottom of the radar shows these next to the scheduled times."""
import json, sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

kind = sys.argv[1]
p = Path(__file__).resolve().parent.parent / "data" / "runs" / f"{kind}.json"
p.parent.mkdir(parents=True, exist_ok=True)
now = datetime.now(timezone.utc)
try:
    times = json.loads(p.read_text())
except Exception:
    times = []
keep = (now - timedelta(days=3)).strftime("%Y-%m-%dT%H:%MZ")
times = [t for t in times if t >= keep] + [now.strftime("%Y-%m-%dT%H:%MZ")]
p.write_text(json.dumps(times) + "\n")
