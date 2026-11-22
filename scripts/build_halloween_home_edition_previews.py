"""Bounded final PDF excerpts. Never expose posters, actors, clues or private art."""
from pathlib import Path
import json,hashlib
import pypdfium2 as pdfium,pdfplumber
from PIL import Image,ImageDraw
R=Path(__file__).resolve().parents[1];meta={};contacts=[]
names={'viewer':('Cut-out paper viewer','纸观察框'),'tear-reference':('Separate three-tear reference','独立三道缺口参照'),'tear-detail':('Reference edge only','参照缺口局部'),'fold-detail':('Template fold line only','模板折叠线局部'),'stage':('Unfilled rehearsal stage','空白排练舞台'),'facade':('Closed hinged facade','关好的翻窗纸'),'window':('One closed paper window','一扇关好的纸窗'),'registration':('Corner registration cross','四角对位十字'),'record':('Acceptance-only progress record','只记录成人核准的进度表')}
for locale,version in [('en','1.1'),('zh','1.0-zh.1')]:
 q=R/f'tmp/pdfs/halloween-home-{locale}';g=json.loads((q/'geometry.json').read_text());g={x['kind']:x for x in g if x['paper']=='A4' and x['role']=='player'}
 manifest=json.loads((R/f'output/pdf/halloween-home-{locale}-{version}/manifest.json').read_text());f=next(x for x in manifest['items'] if x['paper']=='A4' and x['role']=='player');source=R/f['path'];d=pdfium.PdfDocument(str(source));pdf=pdfplumber.open(source)
 def box(kind,left,bottom,right,top):
  s=g[kind];return s['page'],(s['x']+left,pdf.pages[s['page']-1].height-s['y']-top,s['x']+right,pdf.pages[s['page']-1].height-s['y']-bottom)
 regions={'viewer':box('search',6,1,200,85),'tear-reference':box('search',215,14,501,86),'tear-detail':box('search',222,52,257,68),'fold-detail':box('puppets',100,403,155,436),'stage':box('stage',0,0,507,465),'facade':box('facade',0,0,507,465),'window':box('facade',20,254,251,421),'registration':box('facade',2,424,14,436),'record':box('record',0,-4,507,424)}
 rows={};thumbs=[]
 for name,(number,bbox) in regions.items():
  excerpt=pdf.pages[number-1].crop(bbox).extract_text() or ''
  safe=excerpt.replace("PIP'S PUMPKIN THEATRE",'').replace('皮普的南瓜纸剧场','')
  assert not any(x in safe for x in ['BAT','OWL','PUMPKIN','STAR','猫头鹰','蝙蝠','南瓜','星星']), (locale,name,excerpt)
  im=d[number-1].render(scale=2.5).to_pil().crop(tuple(round(v*2.5) for v in bbox)).convert('RGB');p=R/f'public/assets/halloween-home-{locale}-{name}.jpg';im.save(p,quality=88,optimize=True)
  rows[name]=dict(page=number,path=p.relative_to(R).as_posix(),caption=names[name][locale=='zh'],width=im.width,height=im.height,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),sourceSha256=f['sha256'],crop=list(bbox))
  im.thumbnail((300,360));thumbs.append((name,im))
 contact=Image.new('RGB',(960,1200),'#dce3e8');draw=ImageDraw.Draw(contact)
 for i,(name,im) in enumerate(thumbs):
  x=i%3*320;y=i//3*400;contact.paste(im,(x,y+25));draw.text((x+5,y+5),locale+'/'+name,fill='black')
 p=q/'previews-contact.jpg';contact.save(p,quality=90);contacts.append(str(p));pdf.close();d.close();meta[locale]=rows
for p in [R/'content/halloween-home-edition-previews.json',R/'src/halloweenHomeEditionPreviewAssets.json']:p.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print('18 bounded source previews extracted; no actor identity, position clue, solved stage or private art exposed.')
