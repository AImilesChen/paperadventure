"""Validate the internal Dinosaur PDF drafts and make A4 contact sheets for QA."""

from pathlib import Path
import hashlib
import json
import shutil
import subprocess

from PIL import Image, ImageOps
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "content" / "dinosaur-pdf-manifest.v0.1.json").read_text(encoding="utf-8"))
assert manifest["themeWorldId"] == "dinosaur" and manifest["published"] is False
assert len(manifest["items"]) == 8

for item in manifest["items"]:
    path = ROOT / item["file"]
    assert path.exists(), path
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"], path
    pages = PdfReader(path).pages
    assert len(pages) == item["pages"], (path, len(pages), item["pages"])
    assert item["status"] == "draft" and item["public"] is False
    for index, page in enumerate(pages, 1):
        text = page.extract_text() or ""
        assert len(text.strip()) > 180, (path, index, "blank/too little text")
        assert "NOT PLAY-TESTED" in text, (path, index, "draft warning missing")
        assert f"Page {index}" in text, (path, index, "page number missing")
    if item["role"] == "player":
        all_text = "\n".join(page.extract_text() or "" for page in pages)
        for stage in range(1, 6):
            assert f"CHECKPOINT {stage:02d} / 05" in all_text, (path, stage)
        if item["setting"] == "classroom":
            batch_page = pages[1].extract_text() or ""
            for label, mark in zip("ABCD", ("R1", "R2", "R3", "R4")):
                assert f"BATCH {label}  /  STORY DOSSIER" in batch_page, (path, label)
                assert f"MARK  {mark}" in batch_page, (path, mark)
            assert "SEAL  LEAF" in batch_page and "SEAL  STAR" in batch_page
            assert "DOTS  1" in batch_page and "DOTS  2" in batch_page
            note_page = pages[2].extract_text() or ""
            assert "use only your mark" in note_page.lower()
            for mark in ("R1", "R2", "R3", "R4"):
                assert mark in note_page, (path, "missing batch note", mark)
            assert "three toe marks, a ROUND heel" not in note_page, (path, "answer leaks outside selected note")
        footprint_page = pages[1 if item["setting"] == "home" else 2].extract_text() or ""
        for label in "ABCD":
            assert f"PRINT {label}" in footprint_page, (path, "missing footprint card", label)
        assert "Right notch: ONE" in footprint_page and "Right notch: NONE" in footprint_page
        if item["setting"] == "home":
            trail_page = pages[2].extract_text() or ""
            assert "MILO'S PAPER TRAIL" in trail_page
            assert "STRIP 1" in trail_page and "STRIP 3" in trail_page
        choice_page = pages[3].extract_text() or ""
        for label in "ABCD":
            assert f"{'PACK' if item['setting'] == 'home' else 'ZONE'} {label}  /  PAPER RECORD" in choice_page, (path, "missing third-checkpoint choice card", label)
        if item["setting"] == "home":
            assert "SIGN  PINE" in choice_page and "SIGN  ROCK" in choice_page
            assert "STRAPS  1" in choice_page and "STRAPS  2" in choice_page
            assert "TAG  TRIANGLE" in choice_page and "TAG  CIRCLE" in choice_page
            assert "CODE  4" in choice_page
        else:
            assert "REGION  RIDGE" in choice_page and "REGION  WOODS" in choice_page
            assert "MARKER  CIRCLE" in choice_page and "MARKER  TRIANGLE" in choice_page
            assert "FLAGS  1" in choice_page and "FLAGS  2" in choice_page
        assert "bordered cards" in (pages[5].extract_text() or ""), (path, "missing final paper candidates")
        assert "MILO'S PAPER WELCOME" not in all_text and "RESEARCH STATION NOTE" not in all_text
    else:
        answer_page = pages[1].extract_text() or ""
        assert ("MILO'S PAPER WELCOME" if item["setting"] == "home"
                else "RESEARCH STATION NOTE") in answer_page

qa_dir = ROOT / "tmp" / "pdfs" / "dinosaur-qa"
qa_dir.mkdir(parents=True, exist_ok=True)
poppler = shutil.which("pdftoppm")
assert poppler, "pdftoppm is required to render current PDF pages for visual QA"
for paper in ["A4", "Letter"]:
    for code, role in [("H02", "player"), ("H02", "host"), ("C02", "player"), ("C02", "teacher")]:
        prefix = f"dinosaur-{code}-{role}-v0.1-{paper}"
        pdf_path = ROOT / "output" / "pdf" / f"{prefix}.pdf"
        subprocess.run([poppler, "-r", "96", "-png", str(pdf_path), str(qa_dir / prefix)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        pngs = sorted(qa_dir.glob(f"{prefix}-*.png"))
        assert len(pngs) == (6 if role == "player" else 3), (prefix, len(pngs))
        thumbs = []
        for path in pngs:
            with Image.open(path) as original:
                copy = original.convert("RGB")
            copy.thumbnail((580, 800))
            thumbs.append(ImageOps.expand(copy, border=2, fill="#bed9e4"))
        columns = 2 if role == "player" else 3
        rows = (len(thumbs) + columns - 1) // columns
        cell_w = max(im.width for im in thumbs) + 12
        cell_h = max(im.height for im in thumbs) + 12
        sheet = Image.new("RGB", (cell_w * columns, cell_h * rows), "#eef8fc")
        for i, thumb in enumerate(thumbs):
            sheet.paste(thumb, ((i % columns) * cell_w + 6, (i // columns) * cell_h + 6))
        sheet.save(qa_dir / f"{prefix}-contact.jpg", quality=88)

print("Validated 8 Dinosaur draft PDFs, page counts, hashes, draft labels, checkpoints and A4/Letter contact sheets")
