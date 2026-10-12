"""Render public Celebration Classroom previews without clue or answer pages."""
from pathlib import Path
import pypdfium2 as pdfium
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/pdf/celebration-classroom-player-1.0-A4.pdf'
OUT = ROOT / 'public/assets'
def main():
    pdf = pdfium.PdfDocument(str(SOURCE))
    try:
        assert len(pdf) == 9
        for name, page in (('jobs', 2), ('plan', 6), ('symbols', 7), ('review', 9)):
            image = pdf[page - 1].render(scale=110/72).to_pil().convert('RGB')
            target = OUT / f'celebration-classroom-preview-{name}.jpg'
            image.save(target, quality=86)
            print(target.name, image.size)
    finally:
        pdf.close()
if __name__ == '__main__':
    main()
