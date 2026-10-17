"""Extract bounded H04 Player previews without rebuilding released packs."""
from pathlib import Path
import sys, json, importlib.util
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import pdfplumber,pypdfium2 as pdfium
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate,PageBreak
TEMP=ROOT/'tmp/forest-detail'
published=TEMP/'remote/scripts/generate_retail_packs.py'
if published.exists():
    spec=importlib.util.spec_from_file_location('forest_detail_retail',published)
    retail=importlib.util.module_from_spec(spec);spec.loader.exec_module(retail)
else:
    import generate_retail_packs as retail
import forest_post_office as game

def render():
    for name in ['forest_post_office.py','generate_celebration_samples.py']:
        source=TEMP/'remote/scripts'/name
        if source.exists():
            clean=lambda p:p.read_text(encoding='utf-8-sig').replace('\r\n','\n').strip()
            assert clean(source)==clean(ROOT/'scripts'/name),name
    TEMP.mkdir(parents=True,exist_ok=True)
    source={'id':'forest','setting':'home','title':'The Forest Post Office Mystery','cover':'public/assets/forest.png'}
    pages=game.player(source,A4[0]-88);flow=[]
    for i,content in enumerate(pages):
        if i:flow.append(PageBreak())
        flow.extend(content)
    doc=SimpleDocTemplate(str(TEMP/'player-source.pdf'),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=60,bottomMargin=55,title=source['title'])
    doc.game_id='forest';doc.setting='home';doc.role='player';doc.paper='A4'
    doc.build(flow,onFirstPage=retail.footer,onLaterPages=retail.footer)
    coords={}
    with pdfplumber.open(TEMP/'player-source.pdf') as pdf:
        assert len(pdf.pages)==16
        for n in [3,5,6,9,11,12,13,15]:
            coords[n]=[{'text':line['text'],'box':[round(line[k],1) for k in ['x0','top','x1','bottom']]} for line in pdf.pages[n-1].extract_text_lines()]
    (TEMP/'source-coordinates.json').write_text(json.dumps(coords,indent=2)+'\n',encoding='utf-8')
    document=pdfium.PdfDocument(str(TEMP/'player-source.pdf'))
    for n in coords:document[n-1].render(scale=1.3).to_pil().save(TEMP/f'page-{n}.png')
    print('Rendered only an isolated temporary 16-page Player PDF; source coordinates and diagnostic PNGs saved.')

EXCERPTS={
    'sorting-desk':(5,(43,133,558,592),'Unfilled sorting desk and ordered checking rules'),
    'seal-detail':(6,(59,429,282,443),'Anonymous readable-address and torn-seal description'),
    'torn-seal':(6,(209,443,282,498),'Anonymous envelope drawing with a torn seal'),
    'hold-rule':(5,(57,494,254,511),'HOLD rule on the sorting desk'),
    'mailbag':(11,(49,263,558,461),'Empty two-slot morning mailbag'),
    'slot-priority':(11,(59,283,182,301),'First mailbag slot marked PRIORITY'),
    'slot-ordinary':(11,(318,283,437,301),'Second mailbag slot marked ORDINARY'),
    'interview-notes':(12,(43,548,552,646),'Blank notes for all three neighbour interviews'),
    'owl-front':(13,(59,214,246,252),'Owl House card front title'),
    'fox-front':(13,(318,214,508,252),'Fox Den card front title'),
    'beaver-front':(13,(59,419,246,457),'Beaver Hut card front title'),
    'label':(9,(49,251,558,563),'Blank replacement parcel label'),
    'record':(3,(43,179,552,653),'Blank five-station postal work record'),
    'delivery':(15,(43,135,552,649),'Blank delivery check and signature board'),
    'stamp':(13,(366,526,501,593),'Paper DELIVERED stamp'),
}

def extract():
    meta={};document=pdfium.PdfDocument(str(TEMP/'player-source.pdf'))
    for name,(page,box,caption) in EXCERPTS.items():
        with pdfplumber.open(TEMP/'player-source.pdf') as pdf:
            text=pdf.pages[page-1].crop(box).extract_text() or ''
            for answer in ['BLUE TREE','POND','MOSS LANE','ACORN','Type: parcel','Type: letter','ID: P17','ID: P18','ID: L06','Nori reaches Owl']:
                assert answer.lower() not in text.lower(),(name,answer,text)
        scale=(240 if name in ['seal-detail','torn-seal','hold-rule','slot-priority','slot-ordinary','owl-front','fox-front','beaver-front','stamp'] else 150)/72
        whole=document[page-1].render(scale=scale).to_pil()
        crop=whole.crop(tuple(round(x*scale) for x in box)).convert('RGB')
        crop.save(ROOT/f'public/assets/forest-home-detail-{name}.jpg',quality=88,optimize=True)
        meta[name]={'page':page,'caption':caption,'excerpt':True,'width':crop.width,'height':crop.height}
    (ROOT/'src/forestHomePreviewAssets.json').write_text(json.dumps(meta,indent=2)+'\n',encoding='utf-8')
    print(f'Extracted {len(meta)} bounded Player previews; answer text checks passed.')

if __name__=='__main__':
    if '--extract-only' not in sys.argv:render()
    if '--inspect' not in sys.argv:extract()
