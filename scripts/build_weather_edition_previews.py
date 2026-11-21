"""Exact bilingual PDF crops with no game readings or repaired value."""
from pathlib import Path
import hashlib,json,shutil
import pypdfium2 as pdfium
import pdfplumber
R=Path(__file__).resolve().parents[1];geo=json.loads((R/'tmp/pdfs/weather/geometry.json').read_text(encoding='utf-8'));result={}
for locale,version in [('en','1.1'),('zh','1.0-zh.1')]:
 source=R/f'output/pdf/weather-classroom-{locale}-{version}/weather-classroom-player-{locale}-A4.pdf';doc=pdfium.PdfDocument(str(source));items={}
 def geom(kind,page):return next(g for g in geo if g['locale']==locale and g['paper']=='A4' and g['role']=='player' and g['page']==page and g['kind']==kind)
 def box(g,pad=3):return (g['x']-pad,doc[g['page']-1].get_height()-g['y']-g['height']-pad,g['x']+g['width']+pad,doc[g['page']-1].get_height()-g['y']+pad)
 wp=box(geom('wind-practice',6));rp=box(geom('rain-practice',11));wg=geom('wind-practice',6);rg=geom('rain-practice',11)
 specs=[('record',3,None,'Blank source-ID and observation board'),('wind-base',7,None,'Compass base and direction legend'),('wind-practice',6,wp,'Separate wind E practice'),('wind-before',6,(wg['x']+30,wp[1]+45,wg['x']+wg['width']*.43,wp[3]-14),'Practice before alignment'),('wind-after',6,(wg['x']+wg['width']*.58,wp[1]+45,wg['x']+wg['width']-25,wp[3]-14),'Practice N aligned'),('cloud-board',9,None,'Cloud-count task without readings'),('rain-base',12,None,'Gauge base and solid placement area'),('rain-practice',11,rp,'Separate 2 mm rain practice'),('rain-baseline',11,(rg['x']+15,rp[1]+35,rg['x']+280,rp[3]-10),'Practice baseline alignment'),('bulletin',15,None,'Blank final bulletin'),('audit',16,None,'Original-source peer audit')]
 with pdfplumber.open(source) as pdf:
  for key,page,bounds,caption in specs:
   p=doc[page-1];w,h=p.get_width(),p.get_height();crop=(bounds[0],h-bounds[3],w-bounds[2],bounds[1]) if bounds else (0,0,0,0)
   text=pdf.pages[page-1].crop(bounds).extract_text() if bounds else pdf.pages[page-1].extract_text();plain=''.join((text or '').split())
   for secret in ['9:00W','9:00西','4,3,1','0,1,3','0、1、3','11:00/1','11:00/3']:assert secret not in plain,(locale,key,secret)
   image=p.render(scale=1.5,crop=crop).to_pil().convert('RGB');target=R/f'public/assets/weather-{locale}-{key}.jpg';image.save(target,quality=87)
   items[key]={'page':page,'width':image.width,'height':image.height,'bounds':bounds,'caption':caption,'path':target.relative_to(R).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
   if locale=='en':shutil.copyfile(target,R/f'public/assets/weather-classroom-preview-{key}.jpg')
 result[locale]=items
(R/'content/weather-edition-previews.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
(R/'src/weatherEditionPreviewAssets.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print('22 bilingual exact-PDF neutral/blank previews and 11 legacy English aliases generated.')

