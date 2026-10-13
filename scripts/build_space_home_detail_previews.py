"""Extract bounded H03 preview assets without rebuilding released game files."""
from pathlib import Path
import sys,json,importlib.util
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pdfplumber,pypdfium2 as pdfium
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,PageBreak
TEMP=ROOT/'tmp/space-detail'
# Use the fetched publication helper when the local checkout has unrelated edits.
published_retail=TEMP/'remote/scripts/generate_retail_packs.py'
if published_retail.exists():
 spec=importlib.util.spec_from_file_location('space_detail_retail',published_retail)
 retail=importlib.util.module_from_spec(spec);spec.loader.exec_module(retail)
else:
 import generate_retail_packs as retail
import space_home_control_room as game

def render():
 for name in ['space_home_control_room.py','generate_celebration_samples.py']:
  published=TEMP/'remote/scripts'/name
  if published.exists():
   clean=lambda p:p.read_text(encoding='utf-8-sig').replace('\r\n','\n').strip()
   assert clean(published)==clean(ROOT/'scripts'/name),name
 TEMP.mkdir(parents=True,exist_ok=True)
 source={'id':'space','setting':'home','title':'The Lost Space Signal','cover':'public/assets/space.png'}
 pages=game.player(source,A4[0]-88);flow=[]
 for i,content in enumerate(pages):
  if i:flow.append(PageBreak())
  flow.extend(content)
 doc=SimpleDocTemplate(str(TEMP/'player-source.pdf'),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=60,bottomMargin=55,title=source['title'])
 doc.game_id='space';doc.setting='home';doc.role='player';doc.paper='A4';doc.build(flow,onFirstPage=retail.footer,onLaterPages=retail.footer)
 with pdfplumber.open(TEMP/'player-source.pdf') as pdf:
  assert len(pdf.pages)==14
  for n in [3,5,7,11,13]:
   print('PAGE',n)
   for line in pdf.pages[n-1].extract_text_lines():print(line['text'],tuple(round(line[k],1) for k in ['x0','top','x1','bottom']))
 pdf=pdfium.PdfDocument(str(TEMP/'player-source.pdf'))
 for n in [3,5,7,11,13]:pdf[n-1].render(scale=1.3).to_pil().save(TEMP/f'page-{n}.png')

EXCERPTS={
 'receiver-board':(5,(49,203,558,419),'Blank three-slot receiver board'),
 'wave-out':(5,(237,548,300,564),'Anonymous OUT level detail'),
 'wave-in':(5,(411,528,462,544),'Anonymous matching IN level detail'),
 'power-board':(7,(49,187,558,562),'Unfilled five-device power board'),
 'cells':(7,(179,588,427,716),'Six loose paper power cells'),
 'cell':(7,(180,589,255,648),'One reusable paper cell'),
 'slot':(7,(466,242,550,304),'Anonymous empty cell slot'),
 'decoder':(11,(49,183,558,447),'Message icons and fixed key with blank answers'),
 'message-icon':(11,(52,220,148,318),'One received icon detail'),
 'key-icon':(11,(254,379,351,445),'Matching icon in the fixed key'),
 'record':(3,(49,201,558,626),'Blank five-mission control-room record'),
 'transmission':(13,(49,201,558,548),'Blank outgoing form and unfilled pulse slots'),
}

def extract():
 meta={};document=pdfium.PdfDocument(str(TEMP/'player-source.pdf'))
 for name,(page,box,caption) in EXCERPTS.items():
  with pdfplumber.open(TEMP/'player-source.pdf') as pdf:
   text=pdf.pages[page-1].crop(box).extract_text() or ''
   for answer in ['MID','BAND LETTER','WAVE K','WAVE R','WAVE T','CODE 1','CODE 2','CODE 3','SEND 3','PIP RESPONSE','TRIANGLE']:
    assert answer not in text,(name,answer,text)
  scale=(240 if name in ['cell','slot','wave-out','wave-in','message-icon','key-icon'] else 150)/72
  whole=document[page-1].render(scale=scale).to_pil();crop=whole.crop(tuple(round(x*scale) for x in box)).convert('RGB')
  crop.save(ROOT/f'public/assets/space-home-detail-{name}.jpg',quality=88,optimize=True)
  meta[name]={'page':page,'caption':caption,'excerpt':True,'width':crop.width,'height':crop.height}
 (ROOT/'src/spaceHomePreviewAssets.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
 print('Extracted twelve bounded Player previews; answer text checks passed.')

if __name__=='__main__':
 if '--extract-only' not in sys.argv:render()
 extract()
