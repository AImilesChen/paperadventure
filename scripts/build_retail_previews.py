import json
from pathlib import Path
import pypdfium2 as pdfium
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'output/previews';out.mkdir(parents=True,exist_ok=True)
m=json.loads((ROOT/'output/pdf/retail-packs-1.0-manifest.json').read_text())
for f in m['items']:
 if f['role']!='player' or f['paper']!='A4' or f['world']=='celebration':continue
 for n in [1,2]:
  source_page=({1:8,2:10}[n] if f['world']=='dinosaur' and f['setting']=='home' else {1:5,2:11}[n] if f['world']=='space' and f['setting']=='home' else {1:6,2:16}[n] if f['world']=='forest' and f['setting']=='home' else {1:7,2:12}[n] if f['world']=='halloween' and f['setting']=='home' else {1:7,2:11}[n] if f['world']=='christmas' and f['setting']=='home' else n)
  target=out/f"{f['world']}-{f['setting']}-v1.0-p{n}.jpg"
  pdf=pdfium.PdfDocument(str(ROOT/f['path']))
  try:
   assert 1<=source_page<=len(pdf),f
   image=pdf[source_page-1].render(scale=110/72).to_pil().convert('RGB')
   image.save(target,format='JPEG',quality=84)
  finally:pdf.close()
  assert target.stat().st_size>10000
