"""Structural QA for the Celebration content drafts; does not replace play-testing."""

from pathlib import Path
import hashlib
import json
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "output" / "pdf"


def main():
    files = sorted(FOLDER.glob("celebration-*.pdf"))
    assert len(files) == 8, f"Expected 8 paper/role variants, found {len(files)}"
    manifest = json.loads((ROOT / "content" / "celebration-pdf-manifest.v0.1.json").read_text(encoding="utf-8"))
    assert manifest["publishedFreeSample"] is False
    assert len(manifest["items"]) == 8
    by_name = {Path(item["file"]).name: item for item in manifest["items"]}
    for path in files:
        assert path.name in by_name
        assert by_name[path.name]["public"] is False
        assert by_name[path.name]["sha256"] == hashlib.sha256(path.read_bytes()).hexdigest(), path.name
        player = "-player-" in path.name
        expected = 6 if player else 3
        with pdfplumber.open(path) as pdf:
            assert len(pdf.pages) == expected, (path.name, len(pdf.pages))
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            assert "NOT PLAY-TESTED" in text, path.name
            assert "Page 1" in text and f"Page {expected}" in text, path.name
            assert "\ufffd" not in text, path.name
            if player:
                for number in range(1, 6):
                    assert f"CHECKPOINT {number:02d} / 05" in text, (path.name, number)
                assert "YOUR ROUTE / PLACE OR NUMBER THREE STRIPS" in text, (path.name, "missing route assembly board")
                assert "Answer key and checks" not in text and "ANSWER KEY" not in text
                if "C01" in path.name:
                    assert "OUR ADVENTURE CLUB BADGE" in text, (path.name, "missing paper badge template")
                    first = pdf.pages[1].extract_text() or ""
                    assert all(f"INVITATION {letter}" in first for letter in "ABC"), (path.name, "missing illustrated invitation cards")
                    assert "COMPASS / 2 STARS" in first and "ROUTE START / GATE" in first
                    third = pdf.pages[3].extract_text() or ""
                    assert all(f"EQUIPMENT {letter}" in third for letter in "ABCD"), (path.name, "missing equipment cards")
                    assert third.count("BADGE CODE /") == 4, (path.name, "each equipment card needs its own code")
                    assert "COLOUR / RED" in third and "COLOUR / BLUE" in third
                    assert "1 DOT" in third and "2 DOTS" in third and "TRIANGLE" in third and "CIRCLE" in third
                    fourth = pdf.pages[4].extract_text() or ""
                    assert "Code from our chosen card:" in fourth and "2 - 4 - 1 - 3" not in fourth, (path.name, "correct code leaked after equipment choice")
                if "H01" in path.name:
                    assert "Parcel A" in text and "Parcel D" in text and "bordered parcel cards" in text, (path.name, "missing parcel cards")
                    assert "FENN'S PAPER LETTER" not in text, (path.name, "adult finale revealed in player pack")
                    first = pdf.pages[1].extract_text() or ""
                    assert all(f"LETTER {letter}" in first for letter in "ABC"), (path.name, "missing illustrated letter cards")
                    assert "FOX / 2 EARS / 3 DOTS" in first and "ROUTE START / SUN" in first
                    assert first.count("SEAL DOTS") == 3, (path.name, "stamp dots not distinguished from animal eyes")
                    third = pdf.pages[3].extract_text() or ""
                    assert all(f"LABEL {letter}" in third for letter in "ABCD"), (path.name, "missing delivery label cards")
                    assert third.count("CODE MARK /") == 4
                    assert all(f"CODE MARK / {mark}" in third for mark in ("FOX", "BELL", "KITE", "LEAF"))
                    assert "FLAG / RED" in third and "FLAG / BLUE" in third
                    assert "1 STAR" in third and "2 STARS" in third
                    assert "NUMBER 4" in third and "NUMBER 5" in third
                    fourth = pdf.pages[4].extract_text() or ""
                    assert all(row in fourth for row in (
                        "FOX T A B L E", "BELL S H E L F", "KITE C H A I R", "LEAF F L O O R",
                    )), (path.name, "dictionary rows do not match label code marks")
                    assert "Find the dictionary row with your label's CODE MARK" in fourth
            else:
                assert "Publication status: NOT PLAY-TESTED" in text, path.name
                if "H01" in path.name:
                    assert "FENN'S PAPER LETTER" in text and "That is the real treasure!" in text, (path.name, "missing printable finale")
            for page in pdf.pages:
                assert len(page.chars) > 150, (path.name, page.page_number, "possibly blank")
                for char in page.chars:
                    assert -1 <= char["x0"] <= char["x1"] <= page.width + 1, (path.name, page.page_number, "horizontal overflow")
                    assert -1 <= char["top"] <= char["bottom"] <= page.height + 1, (path.name, page.page_number, "vertical overflow")
        print(f"OK {path.name} ({expected} pages)")


if __name__ == "__main__":
    main()
