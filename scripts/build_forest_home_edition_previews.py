"""Bounded excerpts of final PDFs; no selected recipient/address/actor answers."""
from pathlib import Path
import json,hashlib
import pdfplumber,pypdfium2 as pdfium
R=Path(__file__).resolve().parents[1];geo=json.loads((R/'tmp/pdfs/forest-home-zh/geometry.json').read_text(encoding='utf-8'));meta={}
EN={'sorting-desk':(6,(49,132,551,590)),'seal-detail':(7,(61,423,280,436)),'torn-seal':(7,(211,436,285,493)),'hold-rule':(6,(57,486,255,502)),'mailbag':(12,(49,258,551,456)),'slot-priority':(12,(60,276,191,294)),'slot-ordinary':(12,(318,276,445,294)),'interview-notes':(14,(49,385,551,630)),'owl-front':(15,(61,227,240,243)),'fox-front':(15,(318,227,500,243)),'beaver-front':(15,(61,432,240,449)),'label':(10,(49,255,551,563)),'record':(3,(49,178,551,660)),'delivery':(17,(49,130,551,690)),'stamp':(15,(362,542,502,600))}
names={'sorting-desk':('Unfilled sorting desk','空白邮件分拣台'),'seal-detail':('Anonymous torn-seal condition','匿名封口破损说明'),'torn-seal':('Anonymous envelope with torn seal','匿名信封破损封口图'),'hold-rule':('Torn-seal handling rule','破损封口处理规则'),'mailbag':('Empty two-slot mailbag','两个空白邮袋格'),'slot-priority':('Priority slot heading','优先件格标题'),'slot-ordinary':('Ordinary slot heading','普通件格标题'),'interview-notes':('Blank interview notes','空白三户访谈记录'),'owl-front':('Owl House front title','猫头鹰家卡正面名称'),'fox-front':('Fox Den front title','狐狸家卡正面名称'),'beaver-front':('Beaver Hut front title','河狸家卡正面名称'),'label':('Blank repaired label','空白修复标签'),'record':('Blank progress record','空白进度记录'),'delivery':('Blank delivery and signature board','空白投递签收板'),'stamp':('Paper delivered stamp','纸质已送达章')}
def area(v):return (v['x'],841.8897637795-v['y']-v['height'],v['x']+v['width'],841.8897637795-v['y'])
def merged(rows):
 b=[area(x) for x in rows];return (min(v[0] for v in b)-1,min(v[1] for v in b)-1,max(v[2] for v in b)+1,max(v[3] for v in b)+1)
G=[x for x in geo if x['role']=='player' and x['paper']=='A4']
Z={}
for name,kind in [('sorting-desk','tray'),('mailbag','bag-slot'),('record','progress'),('delivery','delivery-row'),('interview-notes','interview-note')]:
 rows=[x for x in G if x['kind']==kind];Z[name]=(rows[0]['page'],merged(rows))
for name,prop in [('label','replacement-label'),('stamp','stamp')]:
 v=next(x for x in G if x.get('prop')==prop);Z[name]=(v['page'],merged([v]))
slots=[x for x in G if x['kind']=='bag-slot']
for name,v in zip(['slot-priority','slot-ordinary'],slots):
 x,t,r,b=area(v);Z[name]=(v['page'],(x+9,t+10,r-9,t+35))
v=[x for x in G if x['kind']=='tray'][2];x,t,r,b=area(v);Z['hold-rule']=(v['page'],(x+11,t+10,r-10,t+34))
v=next(x for x in G if x.get('prop')=='mail' and x.get('id')=='C');x,t,r,b=area(v)
Z['seal-detail']=(7,(x+10,t+60,r-9,t+81));Z['torn-seal']=(7,(r-82,b-73,r-12,b-14))
for name,v in zip(['owl-front','fox-front','beaver-front'],[x for x in G if x.get('prop')=='resident']):
 x,t,r,b=area(v);Z[name]=(15,(x+10,t+8,r-10,t+28))
for locale,version,regions in [('en','1.1',EN),('zh','1.0-zh.1',Z)]:
 manifest=json.loads((R/f'output/pdf/forest-home-{locale}-{version}/manifest.json').read_text(encoding='utf-8'));f=next(x for x in manifest['items'] if x['paper']=='A4' and x['role']=='player');source=R/f['path'];doc=pdfium.PdfDocument(str(source));rows={}
 with pdfplumber.open(source) as pdf:
  for name,(number,bbox) in regions.items():
   excerpt=pdf.pages[number-1].crop(bbox).extract_text() or ''
   for secret in ['BLUE TREE','ACORN','Type: parcel','Type: letter','ID: P17','ID: P18','ID: L06','blue tree courtyard','蓝树','橡果','编号：P17','编号：P18','编号：L06','种类：包裹','种类：信','封口标记：月亮','封口标记：松树']:
    assert secret.lower() not in excerpt.lower(),(locale,name,secret,excerpt)
   scale=2.5;image=doc[number-1].render(scale=scale).to_pil();crop=image.crop(tuple(round(v*scale) for v in bbox)).convert('RGB');p=R/f'public/assets/forest-home-{locale}-{name}.jpg';crop.save(p,quality=88,optimize=True)
   rows[name]=dict(page=number,path=p.relative_to(R).as_posix(),caption=names[name][0 if locale=='en' else 1],width=crop.width,height=crop.height,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),sourceSha256=f['sha256'],crop=list(bbox))
 doc.close();meta[locale]=rows
for p in [R/'content/forest-home-edition-previews.json',R/'src/forestHomeEditionPreviewAssets.json']:p.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
print('Extracted30 verified, bounded bilingual source previews; no selected address, seal or actor answer exposed.')
