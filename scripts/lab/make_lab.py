"""Build lab.html: a sandbox copy of index.html with the List / Grid switcher (and room for new experiments).
Run after changing index.html:  python3 scripts/lab/make_lab.py
The lab is not linked from anywhere and asks search engines not to index it."""
import pathlib
root = pathlib.Path(__file__).resolve().parents[2]
s = (root / "index.html").read_text()
lab_css = (root / "scripts/lab/lab.css").read_text()
lab_js = (root / "scripts/lab/lab.js").read_text()

def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

sub("<title>SD Flying Radar</title>", '<title>SD Flying Radar · lab</title>\n<meta name="robots" content="noindex,nofollow">')
sub("</head>", "<style>\n" + lab_css + "\n</style>\n</head>")
sub("</body>", '<script src="scripts/region/panel2.js?v=202611082045"></script>\n<script>\n' + lab_js + "\n</script>\n</body>")
(root / "lab.html").write_text(s)
print("lab.html written")
