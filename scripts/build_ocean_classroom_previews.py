"""Render the two public preview images for the Ocean Classroom edition."""
from pathlib import Path

import pypdfium2 as pdfium


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "output/pdf/ocean-classroom-player-1.0-A4.pdf"
OUT = ROOT / "output/previews"


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(str(SOURCE))
    try:
        assert len(pdf) == 9
        for preview, page in ((1, 3), (2, 7)):
            target = OUT / f"ocean-classroom-v1.0-p{preview}.jpg"
            image = pdf[page - 1].render(scale=110 / 72).to_pil().convert("RGB")
            image.save(target, format="JPEG", quality=84)
            assert target.stat().st_size > 10000, target
            print(target.relative_to(ROOT))
    finally:
        pdf.close()


if __name__ == "__main__":
    main()

