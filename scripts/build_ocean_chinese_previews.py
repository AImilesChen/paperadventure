from pathlib import Path
import hashlib,json
import pypdfium2 as pdfium
R=Path(__file__).resolve().parents[1]
source=R/'output/pdf/ocean-classroom-zh-1.0-zh.2/ocean-classroom-player-zh-A4.pdf'
doc=pdfium.PdfDocument(str(source));items=[]
for name,page in [('chart',4),('plot',9)]:
 target=R/f'public/assets/ocean-zh-{name}.jpg';doc[page-1].render(scale=1.5).to_pil().convert('RGB').save(target,quality=87)
 items.append(dict(name=name,page=page,sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),path=target.relative_to(R).as_posix(),sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
(R/'content/ocean-zh-previews.json').write_text(json.dumps({'version':'1.0-zh.2','items':items},indent=2),encoding='utf-8')
print('Built two blank Chinese previews; no answer pages or private slips published.')
