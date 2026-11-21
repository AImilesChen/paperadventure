from pathlib import Path
import json,hashlib,shutil
import pypdfium2 as pdfium
import pdfplumber
r=Path.cwd();geo=json.loads((r/'tmp/pdfs/workshop/geometry.json').read_text(encoding='utf-8'));result={}
for locale,version in [('en','1.1'),('zh','1.0-zh.1')]:
 source=r/f'output/pdf/workshop-classroom-{locale}-{version}/workshop-classroom-player-{locale}-A4.pdf';doc=pdfium.PdfDocument(str(source));items={}
 with pdfplumber.open(source) as pdf:
  for key,pn in [('pieces',8),('trial-record',14)]:
   raw=pdf.pages[pn-1].extract_text() or '';plain=''.join(raw.split()).lower()
   assert all(s not in plain for s in ['twostars','两颗星','r,m,q','r、m、q','ais56','a太宽'])
   im=doc[pn-1].render(scale=1.5).to_pil().convert('RGB');target=r/f'public/assets/workshop-{locale}-{key}.jpg';im.save(target,quality=87)
   items[key]={'page':pn,'width':im.width,'height':im.height,'path':target.relative_to(r).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
   if locale=='en':shutil.copyfile(target,r/f'public/assets/workshop-classroom-preview-{key}.jpg')
  track=next(g for g in geo if g['locale']==locale and g['paper']=='A4' and g['role']=='player' and g['kind']=='track');fit=next(g for g in geo if g['locale']==locale and g['paper']=='A4' and g['role']=='player' and g['kind']=='fit-card')
  x,y,w,h=[track[k] for k in ['x','y','width','height']];rail=15*72/25.4
  bounds={'left-rail':(x,y,x+rail,y+h),'lane':(x+rail,y,x+w-rail,y+h),'right-rail':(x+w-rail,y,x+w,y+h),'calibration':(fit['x'],fit['y'],fit['x']+fit['width'],fit['y']+fit['height'])}
  for key,(a,b,c,d) in bounds.items():
   page=doc[7];im=page.render(scale=3,crop=(a,b,page.get_width()-c,page.get_height()-d)).to_pil();target=r/f'public/assets/workshop-{locale}-{key}.png';im.save(target)
   items[key]={'page':8,'width':im.width,'height':im.height,'path':target.relative_to(r).as_posix(),'boundsPdf':[a,b,c,d],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
   if locale=='en':shutil.copyfile(target,r/f'public/assets/workshop-relay-{key}.png')
 result[locale]=items
for p in ['content/workshop-edition-previews.json','src/workshopEditionPreviewAssets.json']:(r/p).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('4 exact safe PDF page previews +8 neutral model crops +6 English aliases generated.')
