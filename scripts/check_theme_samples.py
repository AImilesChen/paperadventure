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
        second_page = all_text[2]
        if THEME == "forest":
            first_page = all_text[1]
            parcel_page = all_text[3]
            for candidate in "ABCD":
                assert f"POSTMARK {candidate}" in first_page, (path, "missing postmark card", candidate)
                assert f"PARCEL {candidate}  /  PAPER RECORD" in parcel_page, (path, "missing parcel card", candidate)
            if item["setting"] == "home":
                assert "BORDER  LEAF" in first_page and "BORDER  MOON" in first_page
                assert "STARS  2" in first_page and "BATCH  M2" in first_page
                assert first_page.count("BORDER  LEAF") == 3
                assert first_page.count("STARS  2") == 3
                assert first_page.count("DAY  TUE") == 3
                assert "LEAVES  2" in parcel_page and "OUTLINE  ROUND" in parcel_page
                assert "FRAGMENT  W4" in parcel_page and "DISTRICT  BLUE TREE" in parcel_page
            else:
                assert "BORDER  ROUND" in first_page and "BORDER  SQUARE" in first_page
                assert "DOTS  3" in first_page and "BATCH  R7" in first_page
                assert first_page.count("BORDER  ROUND") == 3
                assert first_page.count("DOTS  3") == 3
                assert first_page.count("DAY  WED") == 3
                assert "STRIPES  2" in parcel_page and "CORNERS  ROUND" in parcel_page
                assert "CODE  P3" in parcel_page and "AREA  TREEHOUSE ROW" in parcel_page
            expected = ("POST ROUTE / SORT THREE M2 STRIPS" if item["setting"] == "home"
                        else "INVESTIGATION ROUTE / SORT TWO R7 STRIPS")
            assert expected in second_page, (path, "missing postal route workspace")
            assert "STRIP 1" in second_page and "FINISH / NAMED" in second_page
            fourth_page = all_text[4]
            assert ("FICTIONAL FOREST MAP" if item["setting"] == "home"
                    else "INVESTIGATION MAP / FOUR STORY BLOCKS") in fourth_page
            for number in range(1, 5):
                assert f"BLOCK {number}  /" in fourth_page, (path, "missing map block", number)
            assert ("BLUE TREE  +  W4" if item["setting"] == "home"
                    else "TREEHOUSE ROW  +  P3") in fourth_page, (path, "missing answer location")
            assert "NORI'S PAPER POSTCARD" not in joined and "POST OFFICE REPLY" not in joined
        elif THEME == "halloween":
            first_page = all_text[1]
            choice_page = all_text[3]
            for candidate in "ABCD":
                assert f"{'LETTER' if item['setting'] == 'home' else 'INVITATION'} {candidate}" in first_page, (path, "missing invitation card", candidate)
                assert f"{'PARCEL' if item['setting'] == 'home' else 'DECOR'} {candidate}  /  PAPER CHOICE" in choice_page, (path, "missing third-checkpoint choice card", candidate)
            if item["setting"] == "home":
                assert "SEAL  FOX" in first_page and "SEAL  OWL" in first_page
                assert "STARS  2" in first_page and "MARK  MOON" in first_page
                assert "SUN / START  5 / GATE" in first_page
                assert first_page.count("SEAL  FOX") == 3
                assert first_page.count("STARS  2") == 3
                assert first_page.count("MARK  MOON") == 3
                assert "BATCH  P3" in choice_page and "STRIPES  2" in choice_page
                assert "OUTLINE  ROUND" in choice_page and "OUTLINE  SQUARE" in choice_page
                assert "HAT / ROW  2" in choice_page
            else:
                assert "ICON  PUMPKIN" in first_page and "ICON  MOON" in first_page
                assert "FLAGS  2" in first_page and "FRAME  ROUND" in first_page
                assert "CREW / START  B / GATE" in first_page
                assert first_page.count("ICON  PUMPKIN") == 3
                assert first_page.count("FLAGS  2") == 3
                assert first_page.count("FRAME  ROUND") == 3
                assert "BOOTH  ORANGE" in choice_page and "BOOTH  BLUE" in choice_page
                assert "BANNER  CIRCLE" in choice_page and "BANNER  SQUARE" in choice_page
                assert "STARS  3" in choice_page and "MARK  LEAF" in choice_page
            expected = ("PAPER FESTIVAL MAP / THREE USEFUL STRIPS" if item["setting"] == "home"
                        else "AUTUMN CREW MAP / TWO USEFUL STRIPS")
            assert expected in second_page, (path, "missing festival map workspace")
            assert "STRIP 1" in second_page and "FINISH /" in second_page
            assert "GIVE AFTER CODE 5723" not in joined and "AUTUMN CREW REPLY" not in joined
        elif THEME == "christmas":
            first_page = all_text[1]
            for candidate in "ABCD":
                assert f"LABEL {candidate}" in first_page, (path, "missing batch label card", candidate)
            if item["setting"] == "home":
                assert "FRAME  SNOWFLAKE" in first_page and "FRAME  LEAF" in first_page
                assert "DOTS  2" in first_page and "PRINT  STAR" in first_page
                assert "BATCH  B3" in first_page
                assert first_page.count("FRAME  SNOWFLAKE") == 3
                assert first_page.count("DOTS  2") == 3
                assert first_page.count("PRINT  STAR") == 3
            else:
                assert "FRAME  SQUARE" in first_page and "FRAME  CIRCLE" in first_page
                assert "LINES  2" in first_page and "WORD  SNOW" in first_page
                assert "BATCH  T2" in first_page
                assert first_page.count("FRAME  SQUARE") == 3
                assert first_page.count("LINES  2") == 3
                assert first_page.count("WORD  SNOW") == 3
            for item_label in ("GIFT A", "GIFT B", "GIFT C", "GIFT D") if item["setting"] == "home" else ("ITEM A", "ITEM B", "ITEM C", "ITEM X"):
                assert item_label in second_page, (path, "missing item card", item_label)
            assert "PAPER DESTINATIONS / MATCH ONE ITEM TO EACH PLACE" in second_page
            assert second_page.count("MATCH:") == 3, (path, "missing destination cards")
            assert "DELIVERY OFFICE REPLY" not in joined and "WINTER STATION REPLY" not in joined
        assert "bordered cards" in all_text[5], (path, "missing final paper candidates")
        final_terms = {
            "christmas-H06": "FOX-OWL-RABBIT",
            "christmas-C06": "STAR-BELL-BOOK",
            "forest-C04": "TREEHOUSE ROW",
            "halloween-H05": "FOUR PAPER SEALS / WRITE THE NUMBERS YOU FOUND",
        }
        for key, term in final_terms.items():
            if path.name.startswith(key):
                assert term in all_text[5], (path, "final candidate text split or missing", term)
        assert "ANSWER KEY" not in joined and "HINTS AND SKIPS" not in joined
    else:
        assert "ANSWER KEY" in joined and "HINTS AND SKIPS" in joined
        assert "Release gate" in joined
        if THEME in {"halloween", "christmas"} and item["setting"] == "classroom":
            assert "has not been produced" not in joined, (path, "stale variant status")
            assert "separate" in joined and "classroom draft exists" in joined, (path, "missing optional wording status")
        if THEME == "forest":
            assert ("NORI'S PAPER POSTCARD" if item["setting"] == "home"
                    else "POST OFFICE REPLY") in all_text[1]
        elif THEME == "halloween":
            assert ("PIP'S PAPER FESTIVAL" if item["setting"] == "home"
                    else "AUTUMN CREW REPLY") in all_text[1]
            assert "PIP'S PAPER REPLY" not in joined and "STAR STATION REPLY" not in joined
        elif THEME == "christmas":
            assert ("DELIVERY OFFICE REPLY" if item["setting"] == "home"
                    else "WINTER STATION REPLY") in all_text[1]
            assert "PIP'S PAPER REPLY" not in joined and "STAR STATION REPLY" not in joined

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
