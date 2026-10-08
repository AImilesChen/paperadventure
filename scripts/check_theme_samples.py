"""Check eight unpublished theme PDFs and render every page for visual QA."""

from pathlib import Path
import hashlib
import json
import subprocess
import sys

from PIL import Image, ImageOps
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4, letter


ROOT = Path(__file__).resolve().parents[1]
THEME = sys.argv[1] if len(sys.argv) == 2 else "space"
assert THEME in {"space", "forest", "halloween", "christmas"}
MANIFEST = ROOT / "content" / f"{THEME}-pdf-manifest.v0.1.json"
QA = ROOT / "tmp" / "pdfs" / f"{THEME}-qa"
POPPLER = Path(r"C:\Users\NINGMEI\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
assert manifest["themeWorldId"] == THEME and manifest["published"] is False
assert len(manifest["items"]) == 8
assert {(i["setting"], i["role"], i["paper"]) for i in manifest["items"]} == {
    (setting, role, paper)
    for setting, role in (("home", "player"), ("home", "host"),
                          ("classroom", "player"), ("classroom", "teacher"))
    for paper in ("A4", "Letter")
}
QA.mkdir(parents=True, exist_ok=True)

for item in manifest["items"]:
    path = ROOT / item["file"]
    assert path.exists()
    assert path.stat().st_size == item["bytes"]
    assert hashlib.sha256(path.read_bytes()).hexdigest() == item["sha256"]
    assert item["status"] == "draft" and item["public"] is False
    pages = PdfReader(path).pages
    assert len(pages) == item["pages"] == (6 if item["role"] == "player" else 3)
    expected_size = A4 if item["paper"] == "A4" else letter
    all_text = []
    for number, page in enumerate(pages, 1):
        actual = (float(page.mediabox.width), float(page.mediabox.height))
        assert all(abs(a - b) < 1 for a, b in zip(actual, expected_size)), (path, actual)
        content = page.extract_text() or ""
        assert len(content.strip()) > 180, (path, number, "sparse or blank")
        assert "NOT PLAY-TESTED" in content and f"Page {number}" in content
        all_text.append(content)
    joined = "\n".join(all_text)
    if item["role"] == "player":
        for number in range(1, 6):
            assert f"CHECKPOINT {number:02d} / 05" in joined
        assert "bordered cards" in all_text[5], (path, "missing final paper candidates")
        final_terms = {
            "christmas-H06": "FOX-OWL-RABBIT",
            "christmas-C06": "STAR-BELL-BOOK",
            "forest-C04": "TREEHOUSE ROW",
        }
        for key, term in final_terms.items():
            if path.name.startswith(key):
                assert term in all_text[5], (path, "final candidate text split or missing", term)
        assert "ANSWER KEY" not in joined and "HINTS AND SKIPS" not in joined
    else:
        assert "ANSWER KEY" in joined and "HINTS AND SKIPS" in joined
        assert "Release gate" in joined

    prefix = QA / path.stem
    subprocess.run([str(POPPLER), "-f", "1", "-l", str(len(pages)),
                    "-r", "96", "-jpeg", "-jpegopt", "quality=82", str(path), str(prefix)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    images = sorted((image for image in QA.glob(path.stem + "-*.jpg")
                     if image.stem.rsplit("-", 1)[-1].isdigit()),
                    key=lambda image: int(image.stem.rsplit("-", 1)[-1]))
    assert len(images) == len(pages), (path, images)
    thumbs = []
    for image_path in images:
        with Image.open(image_path) as original:
            copy = original.convert("RGB")
        copy.thumbnail((440, 620))
        thumbs.append(ImageOps.expand(copy, border=2, fill="#bed9e4"))
    columns = 2 if item["role"] == "player" else 3
    rows = (len(thumbs) + columns - 1) // columns
    cell_w = max(image.width for image in thumbs) + 12
    cell_h = max(image.height for image in thumbs) + 12
    sheet = Image.new("RGB", (cell_w * columns, cell_h * rows), "#eef8fc")
    for index, thumb in enumerate(thumbs):
        sheet.paste(thumb, ((index % columns) * cell_w + 6, (index // columns) * cell_h + 6))
    sheet.save(QA / (path.stem + "-contact.jpg"), quality=88)

print(f"Validated 8 {THEME} draft PDFs: roles, sizes, hashes, draft flags, five checkpoints, guide sections and renders")
