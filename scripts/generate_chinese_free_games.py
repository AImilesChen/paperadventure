"""Generate both Chinese free games without modifying any English artifact.

Run from the repository root with reportlab and pypdf installed.
All text comes from the local content source; no remote service is called.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import zipfile
from pathlib import Path
from html import escape
from reportlab.pdfgen.canvas import Canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from pypdf import PdfReader
from home_zh_v2 import home_player, home_guide, EDITION as HOME_EDITION
from home_zh_layout import render as render_home
from classroom_zh_v2 import classroom_player, classroom_guide, EDITION
from classroom_zh_layout import render as render_classroom
from free_game_icons import draw_icon, edge_mark

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output/pdf/zh-free-games'
NAVY=colors.HexColor('#123653');INK=colors.HexColor('#31536b')
PALE=colors.HexColor('#f5fbfd');LINE=colors.HexColor('#aacdde');CORAL=colors.HexColor('#b83525')
VERSION='1.0-zh.1'
AUDIT=[]
GEOMETRY=[]

def register_fonts():
 for name,file in [('PAHZH','PAHomeSans-Regular.ttf'),('PAHZH-Bold','PAHomeSans-Bold.ttf'),('PACLZH','PAClassroomSans-Regular.ttf'),('PACLZH-Bold','PAClassroomSans-Bold.ttf')]:
  path=ROOT/'assets/fonts'/file
  if not path.exists(): raise RuntimeError(f'Missing bundled font: {path}')
  pdfmetrics.registerFont(TTFont(name,str(path)))
 for prefix in ['PAHZH','PACLZH']:
  pdfmetrics.registerFontFamily(prefix,normal=prefix,bold=prefix+'-Bold',italic=prefix,boldItalic=prefix+'-Bold')

class Sheet:
 def __init__(self,c,size,setting,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.setting,self.role,self.number=setting,role,number
  self.prefix='PACLZH' if setting=='classroom' else 'PAHZH'
  self.version=EDITION['version'] if setting=='classroom' else HOME_EDITION['version']
  self.paper='A4' if size==A4 else 'Letter'
  c.setFillColor(colors.HexColor('#e5f4fa'));c.rect(0,self.h-33,self.w,33,fill=1,stroke=0)
  self.label('PAPER ADVENTURE／庆典／'+('家庭版' if setting=='home' else '课堂版'),44,self.h-21,9,bold=True)
  c.setStrokeColor(LINE);c.setLineWidth(.6);c.line(44,37,self.w-44,37)
  name='玩家材料' if role=='player' else ('主持指南' if setting=='home' else '教师指南')
  self.label(f'{name}／简体中文 {self.version}／'+('A4' if size==A4 else 'US Letter'),44,25,8)
  self.label(f'第{number}页／共{total}页',self.w-44,25,8,align='right')

 def label(self,value,x,y,size=11,bold=False,align='left'):
  font=self.prefix+'-Bold' if bold else self.prefix;value=str(value)
  w=pdfmetrics.stringWidth(value,font,size)
  left=x if align=='left' else x-w if align=='right' else x-w/2
  self.check(left,y-size*.25,w,size*1.3,value)
  self.c.setFont(font,size);self.c.setFillColor(INK)
  getattr(self.c,{'left':'drawString','right':'drawRightString','center':'drawCentredString'}[align])(x,y,value)

 def check(self,x,y,w,h,text):
  assert x>=25 and x+w<=self.w-25 and y>=15 and y+h<=self.h-5,(self.number,'outside page',text[:35],(x,y,w,h))
  AUDIT.append(dict(setting=self.setting,role=self.role,paper=self.paper,page=self.number,x=round(x,2),y=round(y,2),width=round(w,2),height=round(h,2),text=text))

 def geometry(self,kind,x,y,w,h,**extra):
  GEOMETRY.append(dict(setting=self.setting,role=self.role,paper=self.paper,page=self.number,kind=kind,x=x,y=y,width=w,height=h,**extra))

 def para(self,value,x=None,top=None,width=None,size=11.4,bold=False,leading=None,maxheight=None):
  x=self.x if x is None else x;top=self.y if top is None else top;width=self.width if width is None else width
  style=ParagraphStyle('zh',fontName=self.prefix+'-Bold' if bold else self.prefix,fontSize=size,leading=leading or size*1.5,textColor=INK,wordWrap='CJK',splitLongWords=True)
  p=Paragraph(value,style);_,h=p.wrap(width,10000)
  if maxheight is not None: assert h<=maxheight,(self.number,'text overflows box',value[:45],h,maxheight)
  self.check(x,top-h,width,h,value)
  p.drawOn(self.c,x,top-h)
  return h

 def text(self,value,**kw):
  h=self.para(value,**kw);self.y-=h+12
  assert self.y>=49,(self.number,'content beyond print margin',value[:40],self.y)

 def box(self,title,body):
  style=ParagraphStyle('measure',fontName=self.prefix,fontSize=11.2,leading=16.8,wordWrap='CJK')
  _,bh=Paragraph(body,style).wrap(self.width-24,10000)
  h=bh+43; y=self.y-h
  assert y>=48,(self.number,'box outside printable area',title,y)
  self.c.setFillColor(PALE);self.c.setStrokeColor(LINE);self.c.setLineWidth(.7)
  self.c.roundRect(self.x,y,self.width,h,6,fill=1,stroke=1)
  self.para(title,self.x+12,self.y-10,self.width-24,11.8,True)
  self.para(body,self.x+12,self.y-31,self.width-24,11.2,leading=16.8,maxheight=bh+.01)
  self.y=y-12

 def cards(self,items,cols=2,height=95,marks=None,cut=True):
  gap=12;cw=(self.width-gap*(cols-1))/cols;rows=math.ceil(len(items)/cols);top=self.y
  assert top-rows*height-(rows-1)*gap>=49,(self.number,'cards too tall')
  for i,(head,body) in enumerate(items):
   x=self.x+(i%cols)*(cw+gap);y=top-(i//cols+1)*height-(i//cols)*gap
   self.c.setFillColor(PALE);self.c.setStrokeColor(LINE)
   if cut:self.c.setDash(3,2)
   self.c.roundRect(x,y,cw,height,4,fill=1,stroke=1);self.c.setDash()
   h=self.para(head,x+12,y+height-12,cw-24,10.2,True)
   self.para(body,x+12,y+height-18-h,cw-24,11.2,maxheight=height-31-h)
   if marks:
    for edge,shape in marks[i].items():
     inset=EDITION['physical']['markInsetPt']
     mx=x+cw/2 if edge in ('top','bottom') else x+(cw-inset if edge=='right' else inset)
     my=y+height/2 if edge in ('left','right') else y+(height-inset if edge=='top' else inset)
     edge_mark(self.c,shape,mx,my)
     radius={'circle':8,'square':8,'triangle':9,'diamond':10}[shape]
     self.geometry('invitation-mark',mx-radius,my-radius,2*radius,2*radius,card=[x,y,cw,height],shape=shape)
  self.y=top-rows*height-(rows-1)*gap-15

 def table(self,heads,rows,options):
  widths=[self.width*r for r in options.get('ratios',[1/len(heads)]*len(heads))];rh=options.get('row_height',35);data=[heads]+rows;top=self.y
  heights=[]
  for row in data:
   mh=0
   for value,cw in zip(row,widths):
    st=ParagraphStyle('measure',fontName=self.prefix,fontSize=10.5,leading=15.8,wordWrap='CJK')
    mh=max(mh,Paragraph(str(value),st).wrap(cw-18,10000)[1]+16)
   heights.append(max(rh,mh))
  assert top-sum(heights)>=48,(self.number,'table too tall',top-sum(heights))
  y=top
  for j,(row,h) in enumerate(zip(data,heights)):
   for i,(value,cw) in enumerate(zip(row,widths)):
    x=self.x+sum(widths[:i]);self.c.setFillColor(colors.HexColor('#e5f4fa') if j==0 else colors.white);self.c.setStrokeColor(LINE)
    self.c.rect(x,y-h,cw,h,stroke=1,fill=1)
    self.para(str(value),x+9,y-8,cw-18,10.5,j==0,leading=15.8,maxheight=h-16)
   y-=h
  if options.get('cut'):
   self.c.setStrokeColor(CORAL);self.c.setDash(4,2);self.c.rect(self.x,top-sum(heights),self.width,sum(heights),stroke=1,fill=0);self.c.setDash()
  self.y=y-17

 def lines(self,labels):
  for label in labels:
   self.text(label,size=11,bold=True);self.c.setStrokeColor(LINE);self.c.line(self.x,self.y-5,self.x+self.width,self.y-5);self.y-=22
  assert self.y>=49,(self.number,'lines outside print area')

 def special(self,kind,g):
  c=self.c
  if self.setting=='classroom' and kind!='class-cover':
   render_classroom(self,kind,g);return
  if self.setting=='home':
   render_home(self,kind,g);return
  if kind=='class-cover':
   path=ROOT/'public/assets/celebration-classroom-v0.1.jpg';w=min(300,self.width*.7);h=w*.64
   c.drawImage(str(path),(self.w-w)/2,self.y-h,w,h,preserveAspectRatio=True,anchor='c');self.y-=h+17
  else: raise ValueError(kind)

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--setting',choices=['all','home','classroom'],default='all');args=parser.parse_args()
 register_fonts();OUT.mkdir(parents=True,exist_ok=True)
 contract=json.loads((ROOT/'content/free-games/zh-game-contract.json').read_text(encoding='utf-8'))
 selected=['home','classroom'] if args.setting=='all' else [args.setting]
 prior=json.loads((OUT/'manifest.json').read_text(encoding='utf-8')) if (OUT/'manifest.json').exists() else {'items':[],'zips':[]}
 items=[i for i in prior['items'] if i['setting'] not in selected];zips=[i for i in prior['zips'] if i['setting'] not in selected]
 builders={'home':{'player':home_player,'guide':home_guide},'classroom':{'player':classroom_player,'guide':classroom_guide}}
 for setting in selected:
  version=contract[setting]['version'];setting_out=OUT/f'{setting}-{version}'
  setting_out.mkdir(parents=True,exist_ok=True)
  for paper,size in [('A4',A4),('Letter',letter)]:
   pair=[]
   for role,builder in builders[setting].items():
    pages=builder(contract[setting]);assert len(pages)==contract[setting]['pages'][role]
    path=setting_out/f'celebration-{setting}-{role}-zh-{paper}.pdf'
    c=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1)
    c.setTitle(contract[setting]['title']+'／'+('玩家材料' if role=='player' else '成人指南')+'／简体中文')
    c.setAuthor('Paper Adventure Workshop');c.setSubject(f'Chinese free game; {version}; {setting}/{role}/{paper}')
    for number,page in enumerate(pages,1):
     sheet=Sheet(c,size,setting,role,number,len(pages));sheet.text(page['title'],size=23,bold=True,leading=31)
     if page['intro']:sheet.text(page['intro'],size=10.5)
     for block in page['blocks']:
      kind,*values=block
      if kind=='text':sheet.text(*values)
      elif kind=='box':sheet.box(*values)
      elif kind=='cards':sheet.cards(*values[:3],**values[3])
      elif kind=='table':sheet.table(*values)
      elif kind=='lines':sheet.lines(*values)
      elif kind=='special':sheet.special(values[0],contract[setting])
     c.showPage()
    c.save();data=path.read_bytes();reader=PdfReader(path);assert len(reader.pages)==len(pages)
    digest=hashlib.sha256(data).hexdigest()
    items.append(dict(setting=setting,paper=paper,role=role,locale='zh',version=version,pages=len(pages),path=path.relative_to(ROOT).as_posix(),sha256=digest,bytes=len(data),r2Key=f'free-localized/celebration/zh/{setting}/{version}/{paper}/{role}-{digest[:16]}.pdf'))
    pair.append(path)
   zp=setting_out/f'celebration-{setting}-complete-zh-{paper}.zip'
   with zipfile.ZipFile(zp,'w',zipfile.ZIP_DEFLATED) as z:
    for path in pair:
     info=zipfile.ZipInfo(path.name,date_time=(2026,11,20,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,path.read_bytes())
   zips.append(dict(setting=setting,paper=paper,version=version,path=zp.relative_to(ROOT).as_posix(),sha256=hashlib.sha256(zp.read_bytes()).hexdigest()))
 manifest=dict(locale='zh',version='collection.4',packVersions={setting:contract[setting]['version'] for setting in ['home','classroom']},sourceEnglishVersion='1.0',status='local_review',physicalPrintTested=False,childPlayTested=False,items=items,zips=zips)
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 for setting in selected:
  edition={**manifest,'version':contract[setting]['version'],'items':[i for i in items if i['setting']==setting],'zips':[i for i in zips if i['setting']==setting]}
  (OUT/f"{setting}-{contract[setting]['version']}"/'manifest.json').write_text(json.dumps(edition,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 audit=ROOT/'tmp/pdfs/zh-free-games';audit.mkdir(parents=True,exist_ok=True)
 (audit/'layout-boxes.json').write_text(json.dumps(AUDIT,ensure_ascii=False),encoding='utf-8')
 (audit/'physical-geometry.json').write_text(json.dumps(GEOMETRY,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps(dict(regenerated=selected,files=len(items),zips=len(zips),pages=sum(x['pages'] for x in items),manifest=str(OUT/'manifest.json')),ensure_ascii=False))

if __name__=='__main__':main()
