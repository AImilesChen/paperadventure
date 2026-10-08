"""Validate private, adult-selected C05/C06 wording editions against neutral keys."""

from hashlib import sha256
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageOps
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4, letter


ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / "tmp" / "pdfs" / "classroom-variants-qa"
POPPLER = Path(r"C:\Users\NINGMEI\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe")
QA.mkdir(parents=True, exist_ok=True)


def answer_section(text):
    assert "Five connected checkpoints" in text and "Final story hand-off" in text
    return text.split("Five connected checkpoints", 1)[1].split("Final story hand-off", 1)[0].strip()


checked = 0
for theme, variant, code, title, ending in (
    ("halloween", "halloween", "C05", "The Pumpkin Festival Crew", "PUMPKIN CREW REPLY"),
    ("christmas", "christmas", "C06", "The Christmas Gift Sorting Station", "CHRISTMAS CREW REPLY"),
):
    manifest = json.loads((ROOT / "content" / f"{theme}-classroom-{variant}-pdf-manifest.v0.1.json").read_text(encoding="utf-8"))
    neutral = json.loads((ROOT / "content" / f"{theme}-pdf-manifest.v0.1.json").read_text(encoding="utf-8"))
    assert manifest["themeWorldId"] == theme and manifest["sourceScenarioId"] == code
    assert manifest["variantId"] == variant and manifest["published"] is False
    assert len(manifest["items"]) == 4
    assert {(item["role"], item["paper"]) for item in manifest["items"]} == {
        (role, paper) for role in ("player", "teacher") for paper in ("A4", "Letter")
    }
    for item in manifest["items"]:
        path = ROOT / item["file"]
        assert path.exists() and path.resolve().is_relative_to((ROOT / "output" / "pdf" / "variants").resolve())
        assert item["setting"] == "classroom" and item["variant"] == variant
        assert item["status"] == "draft" and item["public"] is False
        assert path.stat().st_size == item["bytes"]
        assert sha256(path.read_bytes()).hexdigest() == item["sha256"]
        pages = PdfReader(path).pages
        assert len(pages) == item["pages"] == (6 if item["role"] == "player" else 3)
        expected_size = A4 if item["paper"] == "A4" else letter
        content = []
        for number, page in enumerate(pages, 1):
            assert all(abs(float(actual) - expected) < 1 for actual, expected in zip(
                (page.mediabox.width, page.mediabox.height), expected_size))
            text = page.extract_text() or ""
            assert len(text.strip()) > 180 and "NOT PLAY-TESTED" in text and f"Page {number}" in text
            content.append(text)
        assert title in content[0]
        neutral_item = next(old for old in neutral["items"] if old["setting"] == "classroom"
                            and old["role"] == item["role"] and old["paper"] == item["paper"])
        neutral_pages = PdfReader(ROOT / neutral_item["file"]).pages
        if item["role"] == "player":
            joined = "\n".join(content)
            assert ending not in joined and "ANSWER KEY" not in joined
            for number in range(1, 6):
                assert f"CHECKPOINT {number:02d} / 05" in joined
            assert ("CREW / START  B / GATE" if theme == "halloween" else "BATCH  T2") in content[1]
            if theme == "halloween":
                assert "PUMPKIN CREW MAP / TWO USEFUL STRIPS" in content[2]
                assert "AUTUMN CREW MAP / TWO USEFUL STRIPS" not in content[2]
                for place in ("GATE", "PAPER ARCH", "ORANGE BOOTH", "SHED", "BLANK"):
                    assert f"MAP / {place}" in content[2], (path, "missing map node", place)
                for candidate in "ABCD":
                    assert f"DECOR {candidate}  /  PAPER CHOICE" in content[3], (path, candidate)
                assert "BANNER  CIRCLE" in content[3] and "STARS  3" in content[3]
                assert "BOOTH  ORANGE" in content[3] and "MARK  LEAF" in content[3]
            else:
                for candidate in "ABCD":
                    assert f"LOAD {candidate}  /  PAPER ORDER" in content[3], (path, candidate)
            assert "bordered cards" in content[5]
        else:
            assert ending in content[1]
            assert answer_section(content[1]) == answer_section(neutral_pages[1].extract_text() or "")
            assert "HINTS AND SKIPS" in content[2] and "Release gate" in content[2]
        prefix = QA / path.stem
        subprocess.run([str(POPPLER), "-f", "1", "-l", str(len(pages)), "-r", "96",
                        "-jpeg", "-jpegopt", "quality=82", str(path), str(prefix)],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        images = [QA / f"{path.stem}-{number}.jpg" for number in range(1, len(pages) + 1)]
        assert all(image.exists() for image in images)
        thumbs = []
        for image_path in images:
            with Image.open(image_path) as original:
                copy = original.convert("RGB")
            copy.thumbnail((440, 620))
            thumbs.append(ImageOps.expand(copy, border=2, fill="#bed9e4"))
        cols = 2 if item["role"] == "player" else 3
        rows = (len(thumbs) + cols - 1) // cols
        width = max(thumb.width for thumb in thumbs) + 12
        height = max(thumb.height for thumb in thumbs) + 12
        contact = Image.new("RGB", (cols * width, rows * height), "#eef8fc")
        for index, thumb in enumerate(thumbs):
            contact.paste(thumb, ((index % cols) * width + 6, (index // cols) * height + 6))
        contact.save(QA / f"{path.stem}-contact.jpg", quality=88)
        checked += 1

print(f"Validated {checked} private classroom wording PDFs: content keys, access flags, hashes, paper sizes, roles and fresh page renders")
