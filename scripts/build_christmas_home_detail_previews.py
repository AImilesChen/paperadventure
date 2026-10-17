"""Extract H06 materials from an isolated render of the published Player source."""
from pathlib import Path
import sys, json, importlib.util
ROOT = Path(__file__).resolve().parents[1]
TEMP = ROOT / 'tmp/christmas-detail'
sys.path.insert(0, str(ROOT / 'scripts'))
import pdfplumber, pypdfium2 as pdfium
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, PageBreak
import christmas_home_workshop as game

def render():
    for name in ['christmas_home_workshop.py', 'generate_celebration_samples.py']:
        published = TEMP / 'remote/scripts' / name
        if published.exists():
            clean = lambda p: p.read_text(encoding='utf-8-sig').replace('\r\n', '\n').strip()
            assert clean(published) == clean(ROOT / 'scripts' / name), name
    published = TEMP / 'remote/scripts/generate_retail_packs.py'
    if published.exists():
        spec = importlib.util.spec_from_file_location('christmas_detail_retail', published)
        retail = importlib.util.module_from_spec(spec); spec.loader.exec_module(retail)
    else:
        import generate_retail_packs as retail
    TEMP.mkdir(parents=True, exist_ok=True)
    source = {'id':'christmas', 'setting':'home', 'title':'The Christmas Delivery Office', 'cover':'public/assets/christmas.png'}
    pages = game.player(source, A4[0] - 88); flow = []
    for i, content in enumerate(pages):
        if i: flow.append(PageBreak())
        flow.extend(content)
    doc = SimpleDocTemplate(str(TEMP / 'player-source.pdf'), pagesize=A4, leftMargin=44, rightMargin=44, topMargin=60, bottomMargin=55, title=source['title'])
    doc.game_id='christmas'; doc.setting='home'; doc.role='player'; doc.paper='A4'
    doc.build(flow, onFirstPage=retail.footer, onLaterPages=retail.footer)
    coords = {}
    with pdfplumber.open(TEMP / 'player-source.pdf') as pdf:
        assert len(pdf.pages) == 14
        for n in [3,5,7,9,11,13]:
            coords[n] = [{'text':line['text'], 'box':[round(line[k],1) for k in ['x0','top','x1','bottom']]} for line in pdf.pages[n-1].extract_text_lines()]
    (TEMP / 'source-coordinates.json').write_text(json.dumps(coords, indent=2)+'\n', encoding='utf-8')
    document = pdfium.PdfDocument(str(TEMP / 'player-source.pdf'))
    for n in coords: document[n-1].render(scale=1.3).to_pil().save(TEMP / f'page-{n}.png')
    print('Rendered only one isolated 14-page Player PDF. Released PDFs and ZIPs were not changed.')

EXCERPTS = {
    'press': (5,(123,212,485,494),'Foldable star press paper stand'),
    'gifts': (7,(68,205,534,528),'Three undecorated foldable gift blanks'),
    'gift-blank': (7,(69,206,216,527),'One flat gift blank with BACK above FRONT'),
    'gift-front': (7,(69,366,216,527),'Blank FRONT below the fold line'),
    'fold-guide': (7,(69,539,538,674),'Printed fold and tent orientation guide'),
    'fold-shape': (7,(411,591,535,674),'Printed side view of the gift with FRONT and BACK'),
    'who-title': (9,(54,214,220,231),'WHO clue card heading without its clue'),
    'ribbon-title': (9,(307,214,456,231),'RIBBON clue card heading without its clue'),
    'seal-title': (9,(54,326,218,343),'SEAL clue card heading without its clue'),
    'practice': (9,(465,630,535,667),'Separate printed practice gift, not a game answer'),
    'frame': (11,(143,222,465,469),'Quality check frame without the answer table'),
    'village': (13,(54,207,553,611),'Winter village display with all gift spaces empty'),
}

def extract():
    document = pdfium.PdfDocument(str(TEMP / 'player-source.pdf')); meta = {}
    with pdfplumber.open(TEMP / 'player-source.pdf') as pdf:
        for name, (page, box, caption) in EXCERPTS.items():
            assert page < 14, 'Keep the final reply inside the game'
            text = pdf.pages[page-1].crop(box).extract_text() or ''
            for answer in ['Gift A is for OWL','gift C is for RABBIT','FOX needs HORIZONTAL','OWL is NOT DIAGONAL','Gift C has LOWER CENTRE','Gift B has UPPER RIGHT','A: star lamp','B: scarf','C: bell','A REPLY FROM THE WINTER VILLAGE']:
                assert answer.lower() not in text.lower(), (name, answer)
            scale = (240 if name in ['gift-blank','gift-front','practice','frame','fold-guide','fold-shape'] else 150) / 72
            whole = document[page-1].render(scale=scale).to_pil()
            crop = whole.crop(tuple(round(x*scale) for x in box)).convert('RGB')
            crop.save(ROOT / f'public/assets/christmas-home-detail-{name}.jpg', quality=88, optimize=True)
            meta[name] = {'page':page,'caption':caption,'excerpt':True,'width':crop.width,'height':crop.height}
    (ROOT / 'src/christmasHomePreviewAssets.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
    print(f'Extracted {len(meta)} bounded previews; answer text checks passed.')

if __name__ == '__main__':
    if '--extract-only' not in sys.argv: render()
    if '--inspect' not in sys.argv: extract()
