"""Render current H01 sources into temporary PDFs; extract spoiler-safe previews."""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import generate_celebration_home_v04 as game
import pdfplumber,pypdfium2 as pdfium
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,PageBreak
TEMP=ROOT/'tmp/celebration-detail'

def render():
 for name in ['generate_celebration_home_v04.py','generate_celebration_home_v02.py','generate_celebration_samples.py']:
  published=TEMP/'remote/scripts'/name
  if published.exists():
   clean=lambda p:p.read_text(encoding='utf-8-sig').replace('\r\n','\n').strip()
   assert clean(published)==clean(ROOT/'scripts'/name),'Published source differs: '+name
 TEMP.mkdir(parents=True,exist_ok=True)
 for role,builder in [('player',game.player),('guide',game.guide)]:
  pages=builder(A4[0]-88);flow=[]
  for i,content in enumerate(pages):
   if i:flow.append(PageBreak())
   flow.extend(content)
  doc=SimpleDocTemplate(str(TEMP/f'{role}-source.pdf'),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=60,bottomMargin=55,title=f'Celebration Home {role} v0.4')
  doc.role=role;doc.paper='A4';doc.build(flow,onFirstPage=game.footer,onLaterPages=game.footer)
  with pdfplumber.open(TEMP/f'{role}-source.pdf') as pdf:
   assert len(pdf.pages)==(10 if role=='player' else 12)
   for n in ([2,3,5,7,8,10] if role=='player' else [4]):
    print('PAGE',role,n)
    for line in pdf.pages[n-1].extract_text_lines():
     print(line['text'],tuple(round(line[k],1) for k in ['x0','top','x1','bottom']))
  pdf=pdfium.PdfDocument(str(TEMP/f'{role}-source.pdf'))
  for n in ([2,3,5,7,8,10] if role=='player' else [4]):
   pdf[n-1].render(scale=1.2).to_pil().save(TEMP/f'{role}-{n}.png')

EXCERPTS={
 'handout-before':('guide',4,(49,151,210,359),'Letter sheet before cutting'),
 'handout-cut':('guide',4,(223,151,384,359),'Retained board and three separate clue cards'),
 'handout-share':('guide',4,(397,151,558,359),'Three clue holders and one shared board'),
 'map':('player',5,(49,289,558,489),'Blank six-place delivery map'),
 'route-to':('player',5,(391,629,477,645),'One route strip’s TO detail'),
 'route-from':('player',5,(223,615,326,631),'Another strip’s matching FROM detail'),
 'practice':('player',7,(49,544,548,609),'Separate CAT and STAR lookup practice'),
 'key-i':('player',8,(49,149,558,215),'Key I title and column headers only'),
 'key-ii':('player',8,(49,348,558,415),'Key II title and column headers only'),
 'record':('player',3,(49,148,558,449),'Blank five-checkpoint team evidence record'),
 'finish':('player',10,(49,132,558,641),'Blank delivery report and optional teamwork keepsake'),
}

def extract():
 meta={}
 for name,(role,page,box,caption) in EXCERPTS.items():
  path=TEMP/f'{role}-source.pdf'
  with pdfplumber.open(path) as pdf:
   text=pdf.pages[page-1].crop(box).extract_text() or ''
   if name in ['handout-before','handout-cut','handout-share','practice','key-i','key-ii','record','finish']:
    assert all(word not in text for word in ['RED FLAG','TABLE','Parcel A','FOX']), (name,text)
   if name in ['route-to','route-from']:assert 'Strip' not in text and 'SUN' not in text and 'FLAG' not in text
  document=pdfium.PdfDocument(str(path));source=document[page-1]
  scale=(240 if name.startswith('route-') else 170)/72
  image=source.render(scale=scale).to_pil()
  crop=image.crop(tuple(round(x*scale) for x in box)).convert('RGB')
  target=ROOT/f'public/assets/celebration-home-detail-{name}.jpg';crop.save(target,quality=88,optimize=True)
  meta[name]={'role':role,'page':page,'caption':caption,'excerpt':True,'width':crop.width,'height':crop.height}
 (ROOT/'src/celebrationHomePreviewAssets.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
 print('Extracted eleven bounded source previews; no correct route, key rows, parcel answer or finale letter.')

if __name__=='__main__':
 if '--extract-only' not in sys.argv:render()
 extract()
