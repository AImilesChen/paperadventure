"""Build English repair 1.1 without overwriting any original retail files."""
from pathlib import Path
import json,hashlib,zipfile
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4,letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from space_home_edition_content import E,content
from space_home_edition_layout import SpaceSheet
from generate_chinese_free_games import AUDIT,GEOMETRY
R=Path(__file__).resolve().parents[1]

def main():
    for style in ['Regular','Bold']:pdfmetrics.registerFont(TTFont('PASPACE'+('-Bold' if style=='Bold' else ''),str(R/f'assets/fonts/PAFreeGameSans-{style}.ttf')))
    pdfmetrics.registerFontFamily('PASPACE',normal='PASPACE',bold='PASPACE-Bold',italic='PASPACE',boldItalic='PASPACE-Bold')
    for style in ['Regular','Bold']:pdfmetrics.registerFont(TTFont('PASPACEZH'+('-Bold' if style=='Bold' else ''),str(R/f'assets/fonts/PASpaceSans-{style}.ttf')))
    pdfmetrics.registerFontFamily('PASPACEZH',normal='PASPACEZH',bold='PASPACEZH-Bold',italic='PASPACEZH',boldItalic='PASPACEZH-Bold')
    AUDIT.clear();GEOMETRY.clear();summaries=[]
    for locale in ['en','zh']:
        generate(locale,summaries)
    qa=R/'tmp/pdfs/space-home';qa.mkdir(parents=True,exist_ok=True)
    (qa/'layout-boxes.json').write_text(json.dumps(AUDIT,ensure_ascii=False),encoding='utf-8');(qa/'geometry.json').write_text(json.dumps(GEOMETRY,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(summaries))

def generate(locale,summaries):
    version=E['versions'][locale];out=R/f'output/pdf/space-home-{locale}-{version}';out.mkdir(parents=True,exist_ok=True);items=[];zips=[]
    for paper,size in [('A4',A4),('Letter',letter)]:
        pair=[]
        for role,pages in zip(['player','guide'],content(locale)):
            path=out/f'space-home-{role}-{locale}-{paper}.pdf';c=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1);c.setTitle(E['titles'][locale]+' / '+role+' / '+paper);c.setAuthor('Paper Adventure Workshop')
            for i,p in enumerate(pages,1):
                s=SpaceSheet(c,size,locale,role,i,len(pages));s.text(p['title'],size=22,bold=True,leading=29)
                if p['intro']:s.text(p['intro'],size=10.3)
                for kind,*v in p['blocks']:
                    if kind=='text':s.text(*v)
                    elif kind=='box':s.box(*v)
                    elif kind=='table':s.table(*v)
                    elif kind=='lines':s.lines(*v)
                    elif kind=='special':s.special(v[0])
                    else:raise ValueError(kind)
                c.showPage()
            c.save();raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest();pair.append(path)
            items.append(dict(world='space',setting='home',locale=locale,version=version,paper=paper,role=role,pages=len(pages),path=path.relative_to(R).as_posix(),sha256=sha,bytes=len(raw),r2Key=f'ready-localized/space/home/{locale}/{version}/{paper}/{role}-{sha[:16]}.pdf'))
        z=out/f'space-home-complete-{locale}-{paper}.zip'
        with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as archive:
            for f in pair:
                info=zipfile.ZipInfo(f.name,date_time=(2026,11,21,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(info,f.read_bytes())
        zips.append(dict(paper=paper,path=z.relative_to(R).as_posix(),sha256=hashlib.sha256(z.read_bytes()).hexdigest()))
    manifest=dict(world='space',setting='home',locale=locale,version=version,sourceEnglishVersion='v1.0',status='local_review_not_published',items=items,zips=zips)
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    summaries.append(dict(locale=locale,pdfs=4,pages=74,status='local_review_not_published'))

if __name__=='__main__':main()
