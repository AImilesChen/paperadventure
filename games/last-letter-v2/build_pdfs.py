"""Render the same authored evidence as A4 and Letter player/host books."""
import json,hashlib
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4,letter
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
ROOT=Path(__file__).resolve().parents[2];D=json.loads(Path(__file__).with_name('game.json').read_text());OUT=ROOT/'output/private/last-letter-v2';QA=ROOT/'tmp/last-letter-v2-qa';QA.mkdir(parents=True,exist_ok=True)
INK=HexColor('#23464d');PALE=HexColor('#edf1e7');GOLD=HexColor('#b58952')
measurements=[]
class Book:
 def __init__(self,paper,role):
  self.paper=paper;self.role=role;self.w,self.h=A4 if paper=='A4'else letter;self.width=self.w-76
  self.c=canvas.Canvas(str(OUT/f'{paper}-{role}.pdf'),pagesize=(self.w,self.h),invariant=1);self.c.setTitle(D['title']+' / '+role);self.c.setAuthor('Paper Adventure');self.bottom=48
 def paragraph(self,text,size,bold=False,width=None):
  return Paragraph(escape(str(text)).replace('\n','<br/>'),ParagraphStyle('body',fontName='Helvetica-Bold'if bold else'Helvetica',fontSize=size,leading=size*1.35,textColor=INK,spaceAfter=0))
 def layout(self,b,scale=1):
  typ=b['type'];w=self.width
  if typ=='scene':return b.get('height',140)*scale,[]
  if typ=='lines':return len(b['labels'])*35*scale,[]
  if typ in ['p','box']:
   size=(10.9 if self.role=='players'else 11.1)*scale;parts=[]
   if typ=='box':
    title=b['title']+(' / USE ONLY IF '+b['tool'].upper()+' CHOSEN'if b.get('tool')else'');parts.append((self.paragraph(title,10.4*scale,True),w-20));parts.append((self.paragraph(b['text'],size),w-20))
   else:parts.append((self.paragraph(b['text'],size),w))
   heights=[v.wrap(width,10000)[1]for v,width in parts];return sum(heights)+(19 if typ=='box'else 10)*scale,list(zip(parts,heights))
  if typ=='table':
   cols=len(b['head']);widths=[w/cols]*cols;rows=[];height=0
   for idx,row in enumerate([b['head']]+b['rows']):
    cells=[self.paragraph(text,(9.2 if cols>=4 else 10)*scale,idx==0)for text in row];hs=[p.wrap(cw-12,10000)[1]for p,cw in zip(cells,widths)];rh=max(hs)+11*scale;rows.append((cells,hs,rh));height+=rh
   return height+13*scale,(widths,rows)
  raise ValueError(typ)
 def draw(self,b,y,scale):
  c=self.c;h,parts=self.layout(b,scale);w=self.width
  if b['type']=='scene':
   img=OUT/'art'/f"{b['kind']}.png";assert img.exists(),f'Render art first: {img}';ih=min(h-8,w*.4);c.drawImage(str(img),38+(w-ih*2.5)/2,y-ih,width=ih*2.5,height=ih,mask='auto')
  elif b['type']=='lines':
   for label in b['labels']:
    p=self.paragraph(label,9.3*scale,True);ph=p.wrap(w,1000)[1];p.drawOn(c,38,y-ph);c.setStrokeColor(HexColor('#b6c8bd'));c.line(38,y-30*scale,self.w-38,y-30*scale);y-=35*scale
  elif b['type']in ['p','box']:
   isbox=b['type']=='box';x=48 if isbox else 38
   if isbox:c.setFillColor(PALE);c.rect(38,y-h+4,w,h-4,fill=1,stroke=0);y-=7*scale
   for ((p,pw),ph)in parts:p.drawOn(c,x,y-ph);y-=ph+4*scale
  elif b['type']=='table':
   widths,rows=parts
   for idx,(cells,hs,rh)in enumerate(rows):
    if idx==0:c.setFillColor(PALE);c.rect(38,y-rh,w,rh,fill=1,stroke=0)
    x=38
    for p,cw,ph in zip(cells,widths,hs):p.drawOn(c,x+6,y-5*scale-ph);x+=cw
    c.setStrokeColor(HexColor('#c6d1c6'));c.setLineWidth(.4);c.line(38,y-rh,self.w-38,y-rh);y-=rh
 def page(self,pg,total):
  c=self.c;n=pg['n'];c.setFillColor(INK);c.setFont('Helvetica-Bold',8);c.drawString(38,self.h-28,'PAPER ADVENTURE / THE LAST LETTER');c.setStrokeColor(GOLD);c.setLineWidth(2);c.line(38,self.h-39,self.w-38,self.h-39)
  c.setFont('Helvetica',8);c.drawString(38,24,'Household edition 2 / (c) 2026 Paper Adventure');c.drawRightString(self.w-38,24,f'{self.paper} / {self.role.upper()} / {n} OF {total}')
  c.setFont('Helvetica-Bold',8);c.drawString(38,self.h-57,pg['code']);title=self.paragraph(pg['title'],22,True);th=title.wrap(self.width,1000)[1];title.drawOn(c,38,self.h-70-th);y=self.h-85-th;available=y-self.bottom
  # Same font sizes across paper formats; only slight page-specific scaling if needed.
  scale=1
  while sum(self.layout(b,scale)[0]for b in pg['blocks'])>available and scale>.9:scale-=.01
  height=sum(self.layout(b,scale)[0]for b in pg['blocks']);assert height<=available,(self.paper,self.role,n,height,available)
  for b in pg['blocks']:h=self.layout(b,scale)[0];self.draw(b,y,scale);y-=h
  measurements.append(dict(paper=self.paper,role=self.role,page=n,bottom=round(y,2),scale=round(scale,2)))
  c.showPage()
 def finish(self):self.c.save()

files=[]
for paper in ['A4','Letter']:
 for role in ['players','guide']:
  book=Book(paper,role)
  for pg in D[role]:book.page(pg,len(D[role]))
  book.finish();path=OUT/f'{paper}-{role}.pdf';files.append(dict(path=path.name,paper=paper,role=role,pages=len(D[role]),bytes=path.stat().st_size,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
manifest=dict(id=D['id'],version=D['version'],title=D['title'],pagesPerFormat={'players':20,'guide':8},fixedRunSheets=[9,10],presetRouteSheets=14,presetRouteToolSheets=13,allChoiceSheets=20,files=files)
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf8');(QA/'pdf-layout.json').write_text(json.dumps(measurements,indent=2),encoding='utf8');print('Built four PDFs / 56 pages from shared evidence content.')
