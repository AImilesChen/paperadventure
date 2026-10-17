"""Extract existing C09 Player materials without private notes or solved endings."""
from pathlib import Path
import pypdfium2 as pdfium
import pdfplumber
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'output/pdf/library-classroom-player-1.0-A4.pdf'
# Excerpt bounds are PDF points measured from the top of the existing A4 page.
# Writing previews deliberately omit the surrounding solution-bearing prompts.
PREVIEWS=[('shelf',3,(0,254)),('order',5,None),('crew',2,None),
          ('opening',4,(44,319)),('route',10,(280,378)),
          ('writing',10,(440,612)),('reading',11,(44,305)),
          ('review',11,(455,576))]

def main():
    pdf=pdfium.PdfDocument(str(SOURCE))
    assert len(pdf)==11
    with pdfplumber.open(SOURCE) as text_pdf:
        for name,page,bounds in PREVIEWS:
            p=pdf[page-1]
            height=p.get_height()
            crop=(0,height-bounds[1],0,bounds[0]) if bounds else (0,0,0,0)
            image=p.render(scale=110/72,crop=crop).to_pil().convert('RGB')
            if bounds:
                text=text_pdf.pages[page-1].crop((0,bounds[0],p.get_width(),bounds[1])).extract_text()
                assert text and 'Now write three or four sentences' not in text
                assert 'VISITOR’S SUMMARY' not in text and 'GARDEN TABLE' not in text
                assert 'L-24' not in text
                if name=='writing':assert 'OUR RESTORED MIDDLE' in text
                if name=='review':assert 'Our corrected visitor sentence' in text
            target=ROOT/'public/assets'/f'library-classroom-preview-{name}.jpg'
            image.save(target,quality=86)
            print(target.name,image.size)
    pdf.close()

if __name__=='__main__':
    main()
