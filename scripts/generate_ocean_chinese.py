"""Generate isolated Chinese paid C07 PDFs; never writes English/private live files."""
from pathlib import Path
import hashlib,json,zipfile
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib.pagesizes import A4,letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader
from ocean_zh_content import EDITION,player,guide
from ocean_zh_layout import OceanSheet
from generate_chinese_free_games import AUDIT,GEOMETRY
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/ocean-classroom-zh-1.0-zh.2'
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 for weight in ['Regular','Bold']:pdfmetrics.registerFont(TTFont('PAOCZH'+('-Bold' if weight=='Bold' else ''),str(ROOT/f'assets/fonts/PAOceanSans-{weight}.ttf')))
 pdfmetrics.registerFontFamily('PAOCZH',normal='PAOCZH',bold='PAOCZH-Bold',italic='PAOCZH',boldItalic='PAOCZH-Bold')
 items=[];zips=[]
 for paper,size in [('A4',A4),('Letter',letter)]:
  files=[]
  for role,builder in [('player',player),('guide',guide)]:
   pages=builder();assert len(pages)==EDITION['pages'][role]
   path=OUT/f'ocean-classroom-{role}-zh-{paper}.pdf';c=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1)
   c.setTitle(EDITION['title']+'／'+('玩家材料' if role=='player' else '教师指南')+'／'+paper);c.setAuthor('Paper Adventure Workshop')
   for i,p in enumerate(pages,1):
    s=OceanSheet(c,size,role,i,len(pages));s.text(p['title'],size=23,bold=True,leading=31)
    if p['intro']:s.text(p['intro'],size=10.5)
    for kind,*v in p['blocks']:
     if kind=='text':s.text(*v)
     elif kind=='box':s.box(*v)
     elif kind=='cards':s.cards(*v[:3],**v[3])
     elif kind=='table':s.table(*v)
     elif kind=='lines':s.lines(*v)
     elif kind=='special':s.special(v[0])
    c.showPage()
   c.save();raw=path.read_bytes();sha=hashlib.sha256(raw).hexdigest();assert len(PdfReader(path).pages)==len(pages)
   items.append(dict(world='ocean',setting='classroom',locale='zh',version=EDITION['version'],paper=paper,role=role,pages=len(pages),path=path.relative_to(ROOT).as_posix(),bytes=len(raw),sha256=sha,r2Key=f'ready-localized/ocean/classroom/zh/{EDITION["version"]}/{paper}/{role}-{sha[:16]}.pdf'));files.append(path)
  z=OUT/f'ocean-classroom-complete-zh-{paper}.zip'
  with zipfile.ZipFile(z,'w',zipfile.ZIP_DEFLATED) as archive:
   for p in files:
    info=zipfile.ZipInfo(p.name,date_time=(2026,11,21,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(info,p.read_bytes())
  zips.append(dict(paper=paper,path=z.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(z.read_bytes()).hexdigest()))
 manifest=dict(world='ocean',setting='classroom',locale='zh',version=EDITION['version'],sourceEnglishVersion='1.0',status='local_review',items=items,zips=zips,physicalPrintTested=False,childPlayTested=False)
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 qa=ROOT/'tmp/pdfs/ocean-zh';qa.mkdir(parents=True,exist_ok=True)
 (qa/'layout-boxes.json').write_text(json.dumps(AUDIT,ensure_ascii=False),encoding='utf-8');(qa/'geometry.json').write_text(json.dumps(GEOMETRY,ensure_ascii=False),encoding='utf-8')
 print(json.dumps({'pdfs':4,'pages':sum(x['pages'] for x in items),'zips':2,'output':str(OUT)}))
if __name__=='__main__':main()
