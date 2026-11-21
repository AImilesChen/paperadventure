"""New immutable English repair and Chinese edition; never overwrites legacy v1.0."""
from pathlib import Path
import hashlib,json,zipfile
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4,letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from library_edition_content import E,content
from library_edition_layout import LibrarySheet
from generate_chinese_free_games import AUDIT,GEOMETRY
R=Path(__file__).resolve().parents[1]
def main():
 for style in ['Regular','Bold']:pdfmetrics.registerFont(TTFont('PALIB'+('-Bold' if style=='Bold' else ''),str(R/f'assets/fonts/PALibrarySans-{style}.ttf')))
 pdfmetrics.registerFontFamily('PALIB',normal='PALIB',bold='PALIB-Bold',italic='PALIB',boldItalic='PALIB-Bold')
 summary=[]
 for locale in ['en','zh']:
  version=E['versions'][locale];out=R/f'output/pdf/library-classroom-{locale}-{version}';out.mkdir(parents=True,exist_ok=True);items=[];zips=[]
  for paper,size in [('A4',A4),('Letter',letter)]:
   pair=[]
   for role,pages in zip(['player','guide'],content(locale)):
    assert len(pages)==E['pages'][role]
    path=out/f'library-classroom-{role}-{locale}-{paper}.pdf';c=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1);c.setTitle(E['titles'][locale]+' / '+role+' / '+paper);c.setAuthor('Paper Adventure Workshop')
    for i,p in enumerate(pages,1):
     s=LibrarySheet(c,size,locale,role,i,len(pages));s.text(p['title'],size=22,bold=True,leading=29)
     if p['intro']:s.text(p['intro'],size=10.3)
     for kind,*v in p['blocks']:
      if kind=='text':s.text(*v)
      elif kind=='box':s.box(*v)
      elif kind=='table':s.table(*v)
      elif kind=='cards':s.cards(*v[:3],**v[3])
      elif kind=='lines':s.lines(*v)
      elif kind=='special':s.special(v[0])
     c.showPage()
    c.save();raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest();pair.append(path)
    items.append(dict(world='library',setting='classroom',locale=locale,version=version,paper=paper,role=role,pages=len(pages),path=path.relative_to(R).as_posix(),sha256=sha,bytes=len(raw),r2Key=f'ready-localized/library/classroom/{locale}/{version}/{paper}/{role}-{sha[:16]}.pdf'))
   z=out/f'library-classroom-complete-{locale}-{paper}.zip'
   with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as archive:
    for f in pair:
     info=zipfile.ZipInfo(f.name,date_time=(2026,11,21,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(info,f.read_bytes())
   zips.append(dict(paper=paper,path=z.relative_to(R).as_posix(),sha256=hashlib.sha256(z.read_bytes()).hexdigest()))
  manifest=dict(world='library',setting='classroom',locale=locale,version=version,sourceEnglishVersion='v1.0',pairedEnglishEdition='1.1',status='local_review',items=items,zips=zips)
  (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8');summary.append({'locale':locale,'version':version,'pdfs':len(items),'pages':sum(x['pages'] for x in items)})
 qa=R/'tmp/pdfs/library';qa.mkdir(parents=True,exist_ok=True)
 (qa/'layout-boxes.json').write_text(json.dumps(AUDIT,ensure_ascii=False),encoding='utf-8');(qa/'geometry.json').write_text(json.dumps(GEOMETRY,ensure_ascii=False),encoding='utf-8')
 print(json.dumps(summary))
if __name__=='__main__':main()
