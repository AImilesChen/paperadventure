from pathlib import Path
import json,hashlib
import pypdfium2 as pdfium
R=Path(__file__).resolve().parents[1];items=[]
for locale,version in [('en','1.1'),('zh','1.0-zh.1')]:
 source=R/f'output/pdf/museum-classroom-{locale}-{version}/museum-classroom-player-{locale}-A4.pdf';doc=pdfium.PdfDocument(str(source))
 for key,page in [('progress',3),('gallery',5),('parts',8),('label',11),('display',12)]:
  target=R/f'public/assets/museum-{locale}-{key}.jpg';doc[page-1].render(scale=1.5).to_pil().convert('RGB').save(target,quality=87)
  items.append({'locale':locale,'version':version,'page':page,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'path':target.relative_to(R).as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
(R/'content/museum-edition-previews.json').write_text(json.dumps({'items':items},indent=2),encoding='utf-8')
print('Built 10 blank/candidate previews; no accession solution, archive or private slip pages published.')
