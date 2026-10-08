"""Confirm independent role clues and cuttable route/matching rows in player drafts."""

from pathlib import Path
import re

import pdfplumber


ROOT = Path(__file__).resolve().parents[1]
PDF_ROOT = ROOT / "output" / "pdf"
THEMES = ("celebration", "dinosaur", "space", "forest", "halloween", "christmas")
PAPER_CARD_COUNTS = {
    "celebration": (5, 5),
    "dinosaur": (5, 5),
    "space": (5, 4),
    "forest": (5, 4),
    "halloween": (5, 4),
    "christmas": (4, 4),
}


def main():
    checked = 0
    for theme in THEMES:
        for pdf_path in sorted(PDF_ROOT.glob(f"{theme}-*-player-v0.1-*.pdf")):
            with pdfplumber.open(pdf_path) as pdf:
                assert len(pdf.pages) == 6, pdf_path.name
                text = pdf.pages[3].extract_text() or ""
                assert "CHECKPOINT 03 / 05" in text, pdf_path.name
                assert text.count("ROLE CLUE") == 3, (pdf_path.name, text.count("ROLE CLUE"))
                classroom = "-C" in pdf_path.name
                card_page = pdf.pages[4 if theme == "dinosaur" and classroom else 2]
                card_text = card_page.extract_text() or ""
                # pdfplumber reads two illustrated Christmas cards on the same line.
                if theme == "christmas":
                    card_labels = re.findall(r"\b(?:GIFT|ITEM) [A-DX]\b", card_text)
                else:
                    card_labels = re.findall(r"^Strip [A-Z0-9]+$", card_text, re.MULTILINE)
                expected = PAPER_CARD_COUNTS[theme][1 if classroom else 0]
                assert len(card_labels) == expected, (pdf_path.name, card_labels, expected)
                checked += 1
    assert checked == 24, f"Expected 24 player drafts, got {checked}"
    print(f"Validated role clue cards and independent route/matching cards in {checked} player PDFs")


if __name__ == "__main__":
    main()
