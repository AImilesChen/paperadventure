"""Render exact C08 Player materials; withhold private slips and solved labels."""
from pathlib import Path
import pypdfium2 as pdfium
from pypdf import PdfReader
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'output/pdf/museum-classroom-player-1.0-A4.pdf'

def main():
    pdf = pdfium.PdfDocument(str(SOURCE))
    assert len(pdf) == 11
    try:
        for name, page in [('record',2),('gallery',4),('parts',6),('label',9),('display',10),('audit',11)]:
            crop = (0,156,0,0) if name == 'label' else (0,0,0,0)
            # Page 9's final sentence names the verified ID. Stop below the final
            # blank writing box, above that sentence. The page excerpt is labelled.
            image = pdf[page-1].render(scale=110/72, crop=crop).to_pil().convert('RGB')
            path = ROOT / 'public/assets' / f'museum-classroom-preview-{name}.jpg'
            image.save(path,quality=86)
            print(path.name,image.size)
    finally:
        pdf.close()
    # Guard the source used for the writing-area crop.
    assert 'Read your label aloud. Check it against the two M-27 notes' in PdfReader(SOURCE).pages[8].extract_text()

if __name__ == '__main__':
    main()
