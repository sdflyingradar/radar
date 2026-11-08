"""Build lab.html: a sandbox copy of index.html with layout experiments for the opened day.
Run after changing index.html:  python3 scripts/lab/make_lab.py
The lab is not linked from anywhere and asks search engines not to index it."""
import pathlib
root = pathlib.Path(__file__).resolve().parents[2]
s = (root / "index.html").read_text()
lab_css = (root / "scripts/lab/lab.css").read_text()
lab_js = (root / "scripts/lab/lab.js").read_text()

OLD_DETAIL = '    <div class="dsec"><span class="dh">What made the score</span>\n      <div class="factors">${rows}</div>\n      ${steps ? `<div class="steps">${steps}</div>` : ""}</div>\n    <div class="dsec"><span class="dh">Good to know · not in the score</span><div class="factors">${extraBars}</div>${info ? `<div class="gks">${info}</div>` : ""}</div>`;'
NEW_DETAIL = '    ${window.scoreLedger ? window.scoreLedger(c, qv) : ""}\n    ${agreeF ? `<div class="dsec lg-agree"><div class="factors">${barRow("Models agree", agreeF.q, agreeF.v, agreeF.sub)}</div></div>` : ""}`;'

def sub(a, b):
    global s
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)

sub("<title>SD Flying Radar</title>", '<title>SD Flying Radar · lab</title>\n<meta name="robots" content="noindex,nofollow">')
sub("</style>\n</head>", lab_css + "\n</style>\n</head>")
# open a site: in the grid layouts the detail goes after the last tile of the clicked tile's row, full width
sub("    b.after(det);                                   // open right under the site",
    "    labPlace(b, det);                               // lab: list = right under the site, grid = after its row")
# the third level: the score ledger (lab.js) instead of the bars, and only the model-agreement bar below it, no heading
sub(OLD_DETAIL, NEW_DETAIL)
sub("</body>", "<script>\n" + lab_js + "\n</script>\n</body>")
(root / "lab.html").write_text(s)
print("lab.html written")
