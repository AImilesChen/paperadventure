"""Extract spoiler-safe source pieces for the Workshop detail-page demonstration."""
from pathlib import Path
import pypdfium2 as pdfium
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/pdf/workshop-classroom-player-1.0-A4.pdf'
OUT = ROOT / 'public/assets'

def main():
    with pdfplumber.open(SOURCE) as doc:
        page = doc.pages[6]
        track = next(c for c in page.curves if abs(c['width'] - 78 * 72 / 25.4) < .1 and abs(c['height'] - 170 * 72 / 25.4) < .1)
        card = next(c for c in page.curves if abs(c['width'] - 40 * 72 / 25.4) < .1 and abs(c['height'] - 45 * 72 / 25.4) < .1)
        width, height = page.width, page.height
    pdf = pdfium.PdfDocument(str(SOURCE))
    try:
        assert len(pdf) == 12
        x0, y0, x1, y1 = (track[k] for k in ('x0', 'y0', 'x1', 'y1'))
        rail = 15 * 72 / 25.4
        pieces = {
            'left-rail': (x0, y0, x0 + rail, y1),
            'lane': (x0 + rail, y0, x1 - rail, y1),
            'right-rail': (x1 - rail, y0, x1, y1),
            'calibration': tuple(card[k] for k in ('x0', 'y0', 'x1', 'y1')),
        }
        for name, (left, bottom, right, top) in pieces.items():
            # Render the measured PDF region directly, keeping its original printed marks.
            image = pdf[6].render(scale=3, crop=(left, bottom, width - right, height - top)).to_pil()
            target = OUT / f'workshop-relay-{name}.png'
            image.save(target)
            print(target.name, image.size)
        for name, n in (('pieces', 7), ('trial-record', 11)):
            image = pdf[n - 1].render(scale=110 / 72).to_pil().convert('RGB')
            target = OUT / f'workshop-classroom-preview-{name}.jpg'
            image.save(target, quality=88)
            print(target.name, image.size)
    finally:
        pdf.close()

if __name__ == '__main__':
    main()
