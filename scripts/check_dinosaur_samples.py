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
        assert "bordered cards" in (pages[5].extract_text() or ""), (path, "missing final paper candidates")

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
