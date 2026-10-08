"""Confirm each private player draft has three independent Checkpoint 3 clue cards."""

from pathlib import Path

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_ROOT = ROOT / "output" / "pdf"
THEMES = ("celebration", "dinosaur", "space", "forest", "halloween", "christmas")


def main():
    checked = 0
    for theme in THEMES:
        for pdf_path in sorted(PDF_ROOT.glob(f"{theme}-*-player-v0.1-*.pdf")):
            with pdfplumber.open(pdf_path) as pdf:
                assert len(pdf.pages) == 6, pdf_path.name
                text = pdf.pages[3].extract_text() or ""
                assert "CHECKPOINT 03 / 05" in text, pdf_path.name
                assert text.count("ROLE CLUE") == 3, (pdf_path.name, text.count("ROLE CLUE"))
                checked += 1
    assert checked == 24, f"Expected 24 player drafts, got {checked}"
    print(f"Validated three role clue cards on Checkpoint 3 in {checked} player PDFs")


if __name__ == "__main__":
    main()
