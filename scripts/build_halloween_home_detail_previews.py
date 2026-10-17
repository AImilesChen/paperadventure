"""Extract bounded H05 Player previews without rebuilding released packs."""
from pathlib import Path
import sys, json, importlib.util
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pdfplumber,pypdfium2 as pdfium
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,PageBreak
TEMP=ROOT/'tmp/halloween-detail'
published=TEMP/'remote/scripts/generate_retail_packs.py'
if published.exists():
    spec=importlib.util.spec_from_file_location('halloween_detail_retail',published)
    retail=importlib.util.module_from_spec(spec);spec.loader.exec_module(retail)
else:
    import generate_retail_packs as retail
import halloween_paper_theatre as game

def render():
    for name in ['halloween_paper_theatre.py','generate_celebration_samples.py']:
        source=TEMP/'remote/scripts'/name
        if source.exists():
            clean=lambda p:p.read_text(encoding='utf-8-sig').replace('\r\n','\n').strip()
            assert clean(source)==clean(ROOT/'scripts'/name),name
    TEMP.mkdir(parents=True,exist_ok=True)
    source={'id':'halloween','setting':'home','title':'The Missing Pumpkin Light','cover':'public/assets/halloween-friendly-v0.1.jpg'}
    pages=game.player(source,A4[0]-88);flow=[]
    for i,content in enumerate(pages):
        if i:flow.append(PageBreak())
        flow.extend(content)
    doc=SimpleDocTemplate(str(TEMP/'player-source.pdf'),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=60,bottomMargin=55,title=source['title'])
    doc.game_id='halloween';doc.setting='home';doc.role='player';doc.paper='A4'
    doc.build(flow,onFirstPage=retail.footer,onLaterPages=retail.footer)
    coords={}
    with pdfplumber.open(TEMP/'player-source.pdf') as pdf:
        assert len(pdf.pages)==15
        for n in [3,5,7,10,12,13]:
            coords[n]=[{'text':line['text'],'box':[round(line[k],1) for k in ['x0','top','x1','bottom']]} for line in pdf.pages[n-1].extract_text_lines()]
    (TEMP/'source-coordinates.json').write_text(json.dumps(coords,indent=2)+'\n',encoding='utf-8')
    document=pdfium.PdfDocument(str(TEMP/'player-source.pdf'))
    for n in coords:document[n-1].render(scale=1.3).to_pil().save(TEMP/f'page-{n}.png')
    print('Rendered only an isolated temporary 15-page Player PDF; source coordinates and diagnostic PNGs saved.')

EXCERPTS={
    'viewer':(5,(56,604,250,672),'Cut-out paper viewer frame'),
    'tear-reference':(5,(265,585,455,658),'Separate printed three-tear comparison example'),
    'tear-detail':(5,(273,606,319,622),'Three-tear marks from the separate reference example'),
    'fold-detail':(7,(153,240,200,289),'Centre FOLD label and line without an actor shape'),
    'stage':(10,(53,225,554,621),'Empty four-place rehearsal mat'),
    'facade':(12,(50,209,558,637),'Closed four-window paper theatre'),
    'window':(12,(62,239,292,406),'One closed window and its attached fold edge'),
    'registration':(12,(53,237,63,248),'Corner alignment cross on the window sheet'),
    'record':(3,(49,201,558,592),'Blank theatre record for five missions'),
}

def extract():
    meta={};document=pdfium.PdfDocument(str(TEMP/'player-source.pdf'))
    for name,(page,box,caption) in EXCERPTS.items():
        assert page<15, 'The final scene must remain private'
        with pdfplumber.open(TEMP/'player-source.pdf') as pdf:
            text=pdf.pages[page-1].crop(box).extract_text() or ''
            for answer in ['BAT','OWL','STAR','NIGHT SKY','OLD TREE','WARM PORCH','FINAL SPARK','The PUMPKIN stands','The light returns']:
                assert answer.lower() not in text.lower(),(name,answer,text)
        scale=(240 if name in ['tear-detail','viewer','fold-detail','window','cue-title','registration'] else 150)/72
        whole=document[page-1].render(scale=scale).to_pil()
        crop=whole.crop(tuple(round(x*scale) for x in box)).convert('RGB')
        crop.save(ROOT/f'public/assets/halloween-home-detail-{name}.jpg',quality=88,optimize=True)
        meta[name]={'page':page,'caption':caption,'excerpt':True,'width':crop.width,'height':crop.height}
    (ROOT/'src/halloweenHomePreviewAssets.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
    print(f'Extracted {len(meta)} bounded Player previews; answer text checks passed.')

if __name__=='__main__':
    if '--extract-only' not in sys.argv:render()
    if '--inspect' not in sys.argv:extract()


