"""Render the published H02 Player source in isolation for spoiler-safe excerpts."""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import generate_retail_packs as retail
import dinosaur_home_experience as dino
import pdfplumber,pypdfium2 as pdfium
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,PageBreak
TEMP=ROOT/'tmp/dinosaur-detail'

def render():
    published=TEMP/'remote/scripts/dinosaur_home_experience.py'
    if published.exists():
        clean=lambda p:p.read_text(encoding='utf-8-sig').replace('\r\n','\n').strip()
        assert clean(published)==clean(ROOT/'scripts/dinosaur_home_experience.py')
    TEMP.mkdir(parents=True,exist_ok=True)
    game={'id':'dinosaur','setting':'home','title':"The Little Dinosaur's Way Home",'cover':'public/assets/dinosaur.png'}
    pages=dino.player(game,A4[0]-88)
    doc=SimpleDocTemplate(str(TEMP/'player-source.pdf'),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=60,bottomMargin=55,title=game['title'])
    doc.game_id='dinosaur';doc.setting='home';doc.role='player';doc.paper='A4'
    flow=[]
    for i,page in enumerate(pages):
        if i:flow.append(PageBreak())
        flow+=page
    doc.build(flow,onFirstPage=retail.footer,onLaterPages=retail.footer)
    with pdfplumber.open(TEMP/'player-source.pdf') as pdf:
        assert len(pdf.pages)==15
        for n in [7,8,10,12,15]:
            p=pdf.pages[n-1]
            print('PAGE',n)
            for line in p.extract_text_lines():
                print(line['text'],tuple(round(line[k],1) for k in ['x0','top','x1','bottom']))
    doc=pdfium.PdfDocument(str(TEMP/'player-source.pdf'))
    for n in [8,10,12,15]:
        doc[n-1].render(scale=1.4).to_pil().save(TEMP/f'page-{n}.png')

def extract():
    items=[
        ('map',7,(49,182,558,682),'Blank six-slot expedition map'),
        ('backpack',10,(49,201,558,324),'Empty two-slot paper backpack'),
        ('choices',10,(184,368.5,423,520),'Four unselected paper supplies'),
        ('bridge',8,(200,183.4,330,392),'One printed bridge tile'),
        ('block',12,(59,585,125,652),'Printed BLOCK marker'),
        ('milo',12,(137,585,188,652),'Printed MILO marker'),
        ('join-right',8,(155,487,186,537),'Right-edge path detail'),
        ('join-left',8,(200,275,234,325),'Left-edge path detail'),
        ('record',3,None,'Blank five-mission expedition record'),
        ('keepsake',15,(50,319,558,694),'Blank expedition drawing area'),
    ]
    rendered=pdfium.PdfDocument(str(TEMP/'player-source.pdf'));manifest={}
    with pdfplumber.open(TEMP/'player-source.pdf') as pdf:
        for name,number,box,caption in items:
            page=rendered[number-1];w,h=page.get_size()
            crop=(box[0],h-box[3],w-box[2],box[1]) if box else (0,0,0,0)
            text=(pdf.pages[number-1].crop(box) if box else pdf.pages[number-1]).extract_text() or ''
            assert not any(word in text for word in ['SUN','FORD','TUNNEL','We used']), (name,text)
            raster=page.render(scale=(220 if name not in ['map','record','keepsake'] else 130)/72,crop=crop).to_pil().convert('RGB')
            raster.save(ROOT/'public/assets'/f'dinosaur-home-detail-{name}.jpg',quality=88)
            manifest[name]={'page':number,'caption':caption,'width':raster.width,'height':raster.height,'excerpt':bool(box)}
            print(name,raster.size)
    rendered.close()
    (ROOT/'src/dinosaurPreviewAssets.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__':
    if '--extract-only' not in sys.argv:render()
    extract()
