"""C09 vector materials and print layout, independent of Windows fonts."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from generate_chinese_free_games import Sheet
from library_edition_content import E
INK=colors.HexColor('#293b53');LINE=colors.HexColor('#b9adca');PALE=colors.HexColor('#f8f5fa');PURPLE=colors.HexColor('#75518d')

class LibrarySheet(Sheet):
 def __init__(self,c,size,locale,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.locale=locale;self.zh=locale=='zh';self.role=role;self.number=number;self.setting='library-classroom';self.prefix='PALIB';self.paper='A4' if size[1]>800 else 'Letter'
  c.setFillColor(colors.HexColor('#e8f1f6'));c.rect(0,self.h-33,self.w,33,fill=1,stroke=0)
  self.label(self.t('PAPER ADVENTURE / STORYBOOK LIBRARY / CLASSROOM C09','PAPER ADVENTURE／故事图书馆／课堂版 C09'),44,self.h-21,8.2,True)
  c.setStrokeColor(LINE);c.line(44,37,self.w-44,37)
  role_name=self.t('Player Pack' if role=='player' else 'Teacher Guide','玩家材料' if role=='player' else '教师指南')
  self.label(role_name+' / '+E['versions'][locale]+' / '+self.paper,44,25,8)
  self.label(self.t(f'Page {number} of {total}',f'第{number}页／共{total}页'),self.w-44,25,8,align='right')
 def t(self,en,zh):return zh if self.zh else en
 def measure(self,value,width,size=11.2,leading=16.8,bold=False):
  p=Paragraph(str(value),ParagraphStyle('lib',fontName=self.prefix+('-Bold' if bold else ''),fontSize=size,leading=leading,textColor=INK,wordWrap='CJK' if self.zh else 'LTR',splitLongWords=True));return p,p.wrap(width,10000)[1]
 def para(self,value,x=None,top=None,width=None,size=11.4,bold=False,leading=None,maxheight=None):
  x=self.x if x is None else x;top=self.y if top is None else top;width=self.width if width is None else width
  p,h=self.measure(value,width,size,leading or size*1.43,bold)
  if maxheight is not None:assert h<=maxheight+.02,(self.locale,self.role,self.number,'box overflow',str(value)[:50],h,maxheight)
  self.check(x,top-h,width,h,str(value));p.drawOn(self.c,x,top-h);return h
 def box(self,title,body):
  bh=self.measure(body,self.width-24)[1];h=bh+43;y=self.y-h;assert y>=48,(self.locale,self.role,self.number,'box outside',title,y)
  rect(self,self.x,y,self.width,h);self.para(title,self.x+12,self.y-10,self.width-24,11.8,True);self.para(body,self.x+12,self.y-31,self.width-24,11.2,leading=16.8,maxheight=bh+.02);self.y=y-12
 def table(self,heads,rows,options):
  widths=[self.width*r for r in options.get('ratios',[1/len(heads)]*len(heads))];size=8.8 if len(heads)==6 else 10.4;leading=12.3 if len(heads)==6 else 15.1;pad=6 if len(heads)==6 else 9
  for j,row in enumerate([heads]+rows):
   h=max(options.get('row_height',35),*[self.measure(str(v),w-pad*2,size,leading)[1]+pad*2 for v,w in zip(row,widths)])
   assert self.y-h>=49,(self.locale,self.role,self.number,'table overflow')
   x=self.x
   for v,w in zip(row,widths):
    self.c.setFillColor(colors.HexColor('#e8f1f6') if j==0 else colors.white);self.c.setStrokeColor(LINE);self.c.rect(x,self.y-h,w,h,fill=1,stroke=1);self.para(str(v),x+pad,self.y-pad,w-pad*2,size,j==0,leading=leading,maxheight=h-pad*2+.02);x+=w
   self.y-=h
  self.y-=15
 def special(self,name,_=None):render(self,name)

def rect(s,x,y,w,h,cut=False):
 s.c.setFillColor(PALE);s.c.setStrokeColor(LINE);s.c.setLineWidth(.8)
 if cut:s.c.setDash(3,2)
 s.c.roundRect(x,y,w,h,5,fill=1,stroke=1);s.c.setDash()

def stamp(s,x,y,shape,dots):
 c=s.c;c.saveState();c.setFillColor(PURPLE);c.setStrokeColor(PURPLE)
 if shape=='crescent':
  c.circle(x,y,10,fill=1,stroke=0);c.setFillColor(PALE);c.circle(x+5,y+3,8,fill=1,stroke=0)
 else:
  import math
  p=c.beginPath()
  for i in range(10):
   a=math.pi/2+i*math.pi/5;r=11 if i%2==0 else 4.5;px=x+r*math.cos(a);py=y+r*math.sin(a)
   if not i:p.moveTo(px,py)
   else:p.lineTo(px,py)
  p.close();c.drawPath(p,fill=1,stroke=0)
 c.setFillColor(PURPLE)
 for i in range(dots):c.circle(x+(i-(dots-1)/2)*11,y-20,2.6,fill=1,stroke=0)
 s.geometry('stamp',x-24,y-24,48,37,shape=shape,dots=dots);c.restoreState()

def writing(s,title,height,count):
 s.text(title,size=11.5,bold=True);y=s.y-height;assert y>=49,(s.locale,s.role,s.number,'writing overflow')
 rect(s,s.x,y,s.width,height)
 for i in range(count):
  yy=s.y-23-i*(height-35)/max(1,count-1);s.c.setStrokeColor(LINE);s.c.line(s.x+12,yy,s.x+s.width-12,yy)
 s.geometry('writing',s.x,y,s.width,height,label=title);s.y=y-15

def render(s,name):
 c=s.c;T=s.t
 if name=='cover':
  img=Image.open(Path(__file__).resolve().parents[1]/'public/assets/library-classroom-v0.1.webp').convert('RGB');buf=BytesIO();img.save(buf,format='JPEG',quality=91);buf.seek(0)
  w=265;h=w*img.height/img.width;c.drawImage(ImageReader(buf),s.x+(s.width-w)/2,s.y-h,w,h);s.y-=h+16
 elif name=='shelves':
  rows=[(T('RETURN SLIP / title missing','还书条／书名模糊'),E['stamp']['shape'],E['stamp']['dots'])]+E['shelves']
  for label,shape,dots in rows:
   h=60;rect(s,s.x,s.y-h,s.width,h);s.para(label,s.x+12,s.y-9,s.width-100,11.5,True)
   desc=T('Crescent' if shape=='crescent' else 'Star','月牙' if shape=='crescent' else '星形')+T(f' / {dots} dots',f'／{dots}个圆点')
   s.para(desc,s.x+12,s.y-32,s.width-100,10.5);stamp(s,s.x+s.width-39,s.y-20,shape,dots);s.y-=h+8
 elif name in ['original-map','route-copy','order']:
  labels=E['route'][s.locale] if name=='original-map' else [T(f'STOP {i}',f'第{i}站') if name=='route-copy' else T(f'POSITION {i}',f'位置{i}') for i in range(1,5)]
  if name=='original-map':s.text(T('ORIGINAL BORROWED MAP / route home','借来的原始地图／回家路线'),size=11.5,bold=True)
  gap=15 if name=='original-map' else 10;w=(s.width-gap*3)/4;h=72 if name=='original-map' else 85
  for i,label in enumerate(labels):
   x=s.x+i*(w+gap);y=s.y-h;rect(s,x,y,w,h);s.para(label,x+8,s.y-12,w-16,10.5,True)
   if name!='original-map':c.setStrokeColor(LINE);c.line(x+10,y+20,x+w-10,y+20)
   if name=='original-map' and i<3:s.label('→',x+w+gap/2,y+30,12,align='center')
   s.geometry(name,x,y,w,h,position=i+1)
  s.y-=h+18
 elif name=='plan-writing':writing(s,T('Our plan / explain all three sources','本组方案／说明三份来源'),88,3)
 elif name=='ending-writing':writing(s,T('OUR OWN SCENE / words, dictation or labelled drawing','本组续写／书写、口述或带短句的绘图'),175,5)
 elif name=='correction-writing':writing(s,T('Our evidence-based correction','有依据的纠正说法'),80,2)
 else:raise ValueError(name)
