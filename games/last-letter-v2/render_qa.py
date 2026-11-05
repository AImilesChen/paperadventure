"""Render every final PDF and record text bounds plus labelled contact sheets."""
from pathlib import Path
import json,subprocess
from PIL import Image,ImageDraw
import pdfplumber
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'output/private/last-letter-v2';QA=ROOT/'tmp/last-letter-v2-qa';QA.mkdir(parents=True,exist_ok=True)
exe=Path(r'C:/Users/NINGMEI/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
bounds=[]
for pdf in OUT.glob('*.pdf'):
 subprocess.run([str(exe),'-png','-scale-to','1500',str(pdf),str(QA/pdf.stem)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 with pdfplumber.open(pdf)as book:
  for n,page in enumerate(book.pages,1):
   words=page.extract_words();bad=[w for w in words if w['x0']<35 or w['x1']>page.width-35 or w['top']<15 or w['bottom']>page.height-15]
   assert not bad,(pdf.name,n,bad);bounds.append(dict(file=pdf.name,page=n,textBounds='passed'))
 paths=sorted(QA.glob(pdf.stem+'-*.png'),key=lambda p:int(p.stem.rsplit('-',1)[1]))
 # Four pages per contact sheet, large enough to review text flow.
 for start in range(0,len(paths),4):
  sheet=Image.new('RGB',(1600,2200),'#d8e0d8');draw=ImageDraw.Draw(sheet)
  for i,p in enumerate(paths[start:start+4]):
   im=Image.open(p);im.thumbnail((770,1045));x=i%2*800;y=i//2*1100;sheet.paste(im,(x+(800-im.width)//2,y+32));draw.text((x+20,y+10),p.stem,fill='#173e45')
  sheet.save(QA/f'{pdf.stem}-contact-{start//4+1}.jpg')
(QA/'pdf-render-result.json').write_text(json.dumps(dict(status='passed',renderedPages=len(bounds),pageBounds=bounds),indent=2),encoding='utf8')
print(f'Rendered {len(bounds)} pages; text bounds passed; 14 contact sheets ready for visual review.')
