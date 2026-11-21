"""Spoiler-safe language-specific previews; no target title, witnesses or model ending."""
from pathlib import Path
import json,hashlib
import pypdfium2 as pdfium
import pdfplumber
R=Path(__file__).resolve().parents[1];items=[]
for locale,version in [('en','1.1'),('zh','1.0-zh.1')]:
 source=R/f'output/pdf/library-classroom-{locale}-{version}/library-classroom-player-{locale}-A4.pdf';doc=pdfium.PdfDocument(str(source))
 with pdfplumber.open(source) as textpdf:
  # Bounds are chosen from actual laid-out material, not a hidden full solution.
  writing=next(g for g in json.loads((R/'tmp/pdfs/library/geometry.json').read_text(encoding='utf8')) if g['paper']=='A4' and g['role']=='player' and g['page']==12 and g['kind']=='writing' and ('OUR OWN' in g['label'] if locale=='en' else '本组续写' in g['label']))
  top=doc[11].get_height()-(writing['y']+writing['height'])-22;bottom=doc[11].get_height()-writing['y']+3
  specs=[('shelf',4,(0,doc[3].get_height()-(next(g for g in json.loads((R/'tmp/pdfs/library/geometry.json').read_text(encoding='utf8')) if g['paper']=='A4' and g['role']=='player' and g['page']==4 and g['kind']=='stamp')['y']-5))),('order',6,None),('plan',9,None),('writing',12,(top,bottom)),('progress',3,None)]
  for key,page,bounds in specs:
   p=doc[page-1];height=p.get_height();crop=(0,height-bounds[1],0,bounds[0]) if bounds else (0,0,0,0)
   text=textpdf.pages[page-1].crop((0,bounds[0],p.get_width(),bounds[1])).extract_text() if bounds else textpdf.pages[page-1].extract_text()
   for secret in ['The Lantern Path','灯笼小路','L-24','B-D-C-A','Kit kept','小凯把图书馆'] :assert secret not in text,(locale,key,secret)
   target=R/f'public/assets/library-{locale}-{key}.jpg';p.render(scale=1.5,crop=crop).to_pil().convert('RGB').save(target,quality=87)
   items.append({'locale':locale,'page':page,'bounds':bounds,'path':target.relative_to(R).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()})
  if locale=='en':
   import shutil
   for old,new in {'shelf':'shelf','order':'order','crew':'progress','opening':'progress','route':'progress','writing':'writing','reading':'progress','review':'writing'}.items():shutil.copyfile(R/f'public/assets/library-en-{new}.jpg',R/f'public/assets/library-classroom-preview-{old}.jpg')
(R/'content/library-edition-previews.json').write_text(json.dumps({'items':items,'legacyAliases':'Replaced eight old English previews with safe revised crops; no old opening title remains.'},indent=2),encoding='utf8')
print('Generated10 language previews and replaced8 legacy aliases; private title, sources and solution withheld.')
