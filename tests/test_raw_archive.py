import gzip
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_forecast as bf  # noqa: E402
import rescore  # noqa: E402


class RawArchive(unittest.TestCase):
    def test_trim_keeps_only_the_days(self):
        d = {"hourly": {"time": ["2026-11-07T10:00", "2026-11-08T10:00", "2026-11-12T10:00"], "t": [1, 2, 3], "x": "keep"}}
        out = bf.trim_hourly([d], {"2026-11-07", "2026-11-08"})
        self.assertEqual(out[0]["hourly"]["t"], [1, 2])
        self.assertEqual(out[0]["hourly"]["x"], "keep")

    def test_archive_and_rescore_round_trip(self):
        parents = json.loads((ROOT / "sites.json").read_text())["sites"]
        sites = bf.expand_sites(parents)
        det = {"HRRR": ("sample", bf.sample_response(sites, bf.DET_LEVELS, horizon_h=48, seed=1), None),
               "ECMWF": ("sample", bf.sample_response(sites, bf.DET_LEVELS, seed=4), None)}
        ens = {"GFS ens": ("sample", bf.sample_response(sites, bf.ENS_LEVELS, members=4, seed=6), None)}
        raw = json.loads(json.dumps({"at": bf.now_iso(), "sites": [s["id"] for s in sites], "det": det, "ens": ens,
                                     "nws": bf.sample_nws(), "grad": {}, "cdata": None}))
        today = bf.utcnow().astimezone(bf._tz()).date().isoformat()
        with tempfile.TemporaryDirectory() as t:
            p = bf.archive_raw(raw, today, Path(t))
            with gzip.open(p, "rt") as fh:
                back = json.load(fh)
        day = rescore.rescore(back)
        self.assertEqual(day.get("date"), today)
        self.assertTrue(day.get("sites"))
        self.assertIsNone(bf._NOW)


if __name__ == "__main__":
    unittest.main()
