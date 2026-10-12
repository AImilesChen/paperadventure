"""Focused C11 page, answer boundary, geometry and bundle checks."""
import hashlib
import json
import zipfile
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib.units import mm

from audit_pdf_layout import audit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
manifest = json.loads((OUT / "retail-packs-1.0-manifest.json").read_text())
items = [f for f in manifest["items"]
         if (f["world"], f["setting"]) == ("workshop", "classroom")]
assert len(items) == 4
assert {(f["paper"], f["role"]) for f in items} == {
    ("A4", "player"), ("A4", "guide"), ("Letter", "player"), ("Letter", "guide")}
assert abs((15*mm + 48*mm + 15*mm) - 78*mm) < 0.001
assert 40*mm < 48*mm < 56*mm

for item in items:
    path = ROOT / item["path"]
    data = path.read_bytes()
    assert len(data) == item["bytes"]
    assert hashlib.sha256(data).hexdigest() == item["sha256"]
    pages = PdfReader(path).pages
    assert len(pages) == item["pages"] == (12 if item["role"] == "player" else 10)
    report = audit(path)
    assert not report["failures"] and not report["warnings"], (path, report)
    words = [" ".join((page.extract_text() or "").split()) for page in pages]
    all_text = " ".join(words)
    if item["role"] == "player":
        assert "Ages 6-12" in words[0]
        assert all(name in words[1] for name in (
            "SCENE READER", "BUILDER", "TESTER", "RECORDER", "CHECKER", "PRESENTER"))
        assert "after EACH mission" in words[1]
        assert all(f"PIECE {name}" in words[4] for name in ("X", "Y", "Z"))
        assert all(name in words[4] for name in ("CIRCLE", "TRIANGLE", "PLAIN"))
        assert "48 mm clear lane" in words[6]
        assert all(name in words[7] for name in ("NOTE 1", "NOTE 2", "NOTE 3"))
        assert all(name in words[9] for name in ("SAMPLE A", "SAMPLE B", "SAMPLE C"))
        assert "TEST ONLY" in words[9] and "Do not rotate, flip or bend" in words[9]
        assert "DISPLAY EDGE" in words[8] and "OUR MESSAGE" in words[8]
        assert "sample cards are TEST ONLY" in words[10]
        assert "Fault and repair plan" in words[10]
        assert "Faulty sample (write a letter)" in words[10]
        assert "Faulty sample (circle): A / B" not in words[10]
        assert "A newly made card could fix this by" in words[10]
        assert "Only your own OUR MESSAGE" in words[11]
        assert "sample fault and a possible repair" in words[11]
        assert "Checker must be someone other than the Recorder" in words[11]
        assert "3: A = Reader + Presenter; B = Builder + Recorder; C = Tester + Checker" in words[1]
        assert all(f"CHECK {number}" in words[11] for number in range(1, 6))
        assert "X-Y-Z" not in all_text and "A is 56" not in all_text
        assert len(pages[0].images) == 1
        assert all(not page.images for page in pages[1:])
    else:
        assert "ages 6-12" in words[0]
        assert "12 large loose pieces per crew" in words[1]
        assert "After EACH mission" in words[2]
        assert "Whole-class gate" in words[2]
        assert "provisional planning windows" in words[0]
        assert all("Read this scene aloud" in words[i] for i in range(3, 8))
        assert all("Jobs now:" in words[i] for i in range(3, 8))
        assert all("Hints / stop after each" in words[i] for i in range(3, 8))
        assert all("Handover" in words[i] for i in range(3, 8))
        assert all(v in words[8] for v in ("X-Y-Z", "40 mm", "48 mm", "56 mm"))
        assert "Samples are TEST ONLY" in words[8]
        assert "Read the closing" in words[9]
        assert all(not page.images for page in pages)

for paper in ("A4", "Letter"):
    with zipfile.ZipFile(OUT / f"workshop-classroom-{paper}-complete-1.0.zip") as bundle:
        assert bundle.testzip() is None and len(bundle.namelist()) == 2
        for item in items:
            if item["paper"] == paper:
                assert hashlib.sha256(bundle.read(Path(item["path"]).name)).hexdigest() == item["sha256"]

for role in ("player", "guide"):
    a4 = PdfReader(OUT / f"workshop-classroom-{role}-1.0-A4.pdf").pages
    letter = PdfReader(OUT / f"workshop-classroom-{role}-1.0-Letter.pdf").pages
    for first, second in zip(a4, letter, strict=True):
        normalise = lambda page: " ".join((page.extract_text() or "")
                                          .replace("US Letter", "PAPER").replace("A4", "PAPER").split())
        assert normalise(first) == normalise(second), f"{role} content differs by paper size"

print("Workshop Classroom C11: 4 PDFs, 2 ZIPs, five missions and paper geometry passed.")

