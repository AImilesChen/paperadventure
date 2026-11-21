"""H03 English repair: separate movable parts and whole boards, fixed-mm geometry."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from generate_chinese_free_games import Sheet
from space_home_edition_content import E
INK=colors.HexColor('#163b56');LINE=colors.HexColor('#adc5d4');PALE=colors.HexColor('#f2f8fc');CUT=colors.HexColor('#a63e28')

class SpaceSheet(Sheet):
 def __init__(self,c,size,locale,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.locale=locale;self.zh=locale=='zh';self.role=role;self.number=number;self.setting='space-home';self.prefix='PASPACEZH' if self.zh else 'PASPACE';self.paper='A4' if size[1]>800 else 'Letter'
  c.setFillColor(colors.HexColor('#e5f4fa'));c.rect(0,self.h-33,self.w,33,fill=1,stroke=0)
  self.label(self.t('PAPER ADVENTURE / SPACE HOME H03','PAPER ADVENTURE／太空世界／家庭版 H03'),44,self.h-21,8.3,True)
  c.setStrokeColor(LINE);c.line(44,37,self.w-44,37)
  name=self.t('Player Pack' if role=='player' else 'Host Guide','玩家材料' if role=='player' else '成人主持指南')
  self.label(name+' / '+E['versions'][locale]+' / '+self.paper,44,25,8)
  self.label(self.t(f'Page {number} of {total}',f'第{number}页／共{total}页'),self.w-44,25,8,align='right')
 def t(self,en,zh):return zh if self.zh else en
 def check(self,*args):
  from generate_chinese_free_games import AUDIT
  super().check(*args);AUDIT[-1]['locale']=self.locale
 def measure(self,value,width,size=11.2,leading=16.8,bold=False):
  import re
  if not self.zh:
   value=str(value).translate({0x2018:39,0x2019:39,0x2013:45,0x2014:45})
   value=re.sub(r'([a-z])(?=\d)',r'\1 ',value);value=re.sub(r'(\d)(?=[a-z])',r'\1 ',value)
  p=Paragraph(str(value),ParagraphStyle('dino',fontName=self.prefix+('-Bold' if bold else ''),fontSize=size,leading=leading,textColor=INK,wordWrap='CJK' if self.zh else 'LTR',splitLongWords=True))
  return p,p.wrap(width,10000)[1]
 def para(self,value,x=None,top=None,width=None,size=11.4,bold=False,leading=None,maxheight=None):
  x=self.x if x is None else x;top=self.y if top is None else top;width=self.width if width is None else width
  p,h=self.measure(value,width,size,leading or size*1.43,bold)
  if maxheight is not None:assert h<=maxheight+.02,(self.locale,self.role,self.number,'text overflow',str(value)[:60],h,maxheight)
  self.check(x,top-h,width,h,str(value));p.drawOn(self.c,x,top-h);return h
 def box(self,title,body):
  bh=self.measure(body,self.width-24)[1];height=bh+43;y=self.y-height;assert y>=48,(self.locale,self.role,self.number,'box overflow',title,y)
  frame(self,self.x,y,self.width,height);self.para(title,self.x+12,self.y-10,self.width-24,11.8,True);self.para(body,self.x+12,self.y-31,self.width-24,11.2,leading=16.8,maxheight=bh+.02);self.y=y-12
 def table(self,heads,rows,options):
  widths=[self.width*r for r in options.get('ratios',[1/len(heads)]*len(heads))];size=8.7 if len(heads)==6 else 10.2;lead=12 if len(heads)==6 else 14.8;pad=6 if len(heads)==6 else 8
  for j,row in enumerate([heads]+rows):
   h=max(options.get('row_height',35),*[self.measure(str(v),w-pad*2,size,lead)[1]+pad*2 for v,w in zip(row,widths)])
   assert self.y-h>=49,(self.locale,self.role,self.number,'table overflow')
   x=self.x
   for v,w in zip(row,widths):
    self.c.setFillColor(PALE if j==0 else colors.white);self.c.setStrokeColor(LINE);self.c.rect(x,self.y-h,w,h,fill=1,stroke=1);self.para(str(v),x+pad,self.y-pad,w-pad*2,size,j==0,leading=lead,maxheight=h-pad*2+.02);x+=w
   self.y-=h
  self.y-=15
 def geometry(self,kind,x,y,w,h,**extra):super().geometry(kind,x,y,w,h,locale=self.locale,**extra)
 def special(self,name,_=None):
  if self.zh:
   from space_home_zh_layout import render as chinese
   chinese(self,name)
  else:render(self,name)

def frame(s,x,y,w,h,cut=False,kind='frame',**kw):
 c=s.c;c.saveState();c.setStrokeColor(CUT if cut else LINE);c.setFillColor(colors.white);c.setLineWidth(.8)
 if cut:c.setDash(4,3)
 c.rect(x,y,w,h,fill=1,stroke=1);c.restoreState();s.geometry('cut' if cut else kind,x,y,w,h,**kw)

def image(s,small=False):
 raw=Image.open(Path(__file__).resolve().parents[1]/'public/assets/space.png').convert('RGB');raw.thumbnail((900,675));buf=BytesIO();raw.save(buf,format='JPEG',quality=86)
 w,h=(220,165) if small else (270,202.5)
 s.c.drawImage(ImageReader(BytesIO(buf.getvalue())),(s.w-w)/2,s.y-h,w,h);s.y-=h+16

def glyph(s,name,cx,cy,r=17):
 from math import cos,sin,pi
 c=s.c;c.saveState();c.setStrokeColor(INK);c.setLineWidth(1.5)
 if name=='SUN':
  c.circle(cx,cy,r*.45,stroke=1,fill=0)
  for j in range(8):
   a=j*pi/4;c.line(cx+r*.65*cos(a),cy+r*.65*sin(a),cx+r*cos(a),cy+r*sin(a))
 elif name=='MOON':
  c.arc(cx-r*.6,cy-r*.7,cx+r*.6,cy+r*.7,65,250);c.arc(cx-r*.1,cy-r*.7,cx+r*.9,cy+r*.7,95,190)
 elif name=='STAR':
  p=c.beginPath()
  for j in range(10):
   a=pi/2+j*pi/5;rr=r if j%2==0 else r*.4;q=(cx+rr*cos(a),cy+rr*sin(a));p.moveTo(*q) if j==0 else p.lineTo(*q)
  p.close();c.drawPath(p)
 elif name=='PATH':
  p=c.beginPath();p.moveTo(cx-r,cy-r*.7);p.curveTo(cx+r*.6,cy-r*.6,cx-r*.6,cy+r*.6,cx+r,cy+r*.7);c.drawPath(p)
  for x,y in [(cx-r,cy-r*.7),(cx+r,cy+r*.7)]:c.circle(x,y,1.8,fill=1,stroke=0)
 else:c.ellipse(cx-r,cy-r*.45,cx+r,cy+r*.45,fill=0,stroke=1);c.circle(cx,cy,r*.22,stroke=1,fill=0)
 c.restoreState()

def centred_grid(s,number,cols,w,h,gapx=14,gapy=14):
 x=(s.w-(cols*w+(cols-1)*gapx))/2;top=s.y
 for i in range(number):yield i,x+(i%cols)*(w+gapx),top-(i//cols+1)*h-(i//cols)*gapy

def columns(s,x,y,w,height,labels):
 cw=w/5
 for i,label in enumerate(labels):
  cx=x+(i+.5)*cw
  glyph(s,label,cx,y+height*.56)
  s.label(label,cx,y+9,10,True,align='center')
  s.geometry('icon',x+i*cw,y,cw,height,name=label,column=i+1)
 return cw

def render(s,name):
 c=s.c
 if name in ['cover','cover-small']:image(s,name=='cover-small')
 elif name=='jobs':
  data=[('C / COMMANDER','Read the current scene. Invite each source clue, point to the required action and let every player contribute.'),('E / ENGINEER','Place wave strips, cells and code strips. With a partner, exchange placing and checking during the same mission.'),('M / COMMUNICATOR','Record each discovery once, repeat all shared facts and complete the final evidence checks. A partner may write or read back.'),('V / VERIFIER','Check joins, sources, slot totals and character lookups. Show the adult the originals; the adult independently accepts the result.')]
  w=(s.width-14)/2;h=153
  for i,x,y in centred_grid(s,4,2,w,h):
   frame(s,x,y,w,h,cut=True,optionalRoleCut=True);s.para(data[i][0],x+12,y+h-12,w-24,11,True,maxheight=35);s.para(data[i][1],x+12,y+h-49,w-24,10.8,leading=15.3,maxheight=h-62)
  s.y-=2*h+14+18
 elif name=='wave-example':
  top=s.y;w=140;h=38;x=(s.w-2*w-16)/2;y=top-h
  frame(s,x,y,w,h);frame(s,x+w+16,y,w,h)
  s.label('Example OUT: LOW',x+10,y+14,10.1);s.label('Example IN: LOW',x+w+26,y+14,10.1)
  s.y=y-8;s.text('Neutral example: these levels agree. Your real strips must also satisfy both ends.',size=9.6)
 elif name=='receiver':
  w,h=[v*mm for v in E['waveSlotMm']];gap=5*mm;x=(s.w-3*w-2*gap)/2;top=s.y-28
  s.label('START: HIGH',x,s.y-4,11,True);s.label('END: HIGH',x+3*w+2*gap,s.y-4,11,True,align='right')
  for i in range(3):
   xx=x+i*(w+gap);y=top-h;frame(s,xx,y,w,h,kind='wave-slot',slot=i+1);s.label(f'SLOT {i+1}',xx+10,y+h-20,11,True)
   if i<2:s.label('>',xx+w+4,y+h/2,14,True)
  s.y=top-h-22;s.text('Place one upright strip per slot. Read its OUT, then compare it with the next IN.',size=10.5)
 elif name=='waves':
  w,h=[v*mm for v in E['waveMm']];gap=8*mm
  for i,x,y in centred_grid(s,3,3,w,h,gap,0):
   a=E['waves'][i];frame(s,x,y,w,h,cut=True,waveId=a['id']);s.geometry('wave',x,y,w,h,**a)
   s.label('WAVE '+a['id']+' / TOP',x+9,y+h-20,11,True)
   for j,line in enumerate(['IN: '+a['in'],'OUT: '+a['out'],'BAND LETTER: '+a['letter']]):s.label(line,x+9,y+h-46-j*20,11,j<2)
   for j in range(a['marks']):
    yy=y+17+j*9;p=c.beginPath();p.moveTo(x+18,yy);p.curveTo(x+38,yy+8,x+45,yy-8,x+61,yy);p.curveTo(x+77,yy+8,x+88,yy-8,x+w-18,yy);c.setStrokeColor(INK);c.drawPath(p)
  s.y-=h+22
 elif name=='power':
  w=174*mm;rh=29*mm;sw,sh=[v*mm for v in E['cellSlotMm']];x=(s.w-w)/2;top=s.y
  for i,a in enumerate(E['devices']):
   y=top-(i+1)*rh;frame(s,x,y,w,rh,kind='device',deviceId=a['id'],cost=a['cost'])
   s.para(a['name']+f" / {a['cost']} "+('CELL' if a['cost']==1 else 'CELLS'),x+8,y+rh-10,66*mm,10.4,True,maxheight=30)
   s.para(a['purpose'],x+8,y+rh-40,62*mm,9.5,maxheight=35)
   for j in range(a['cost']):frame(s,x+74*mm+j*(sw+2*mm),y+2.5*mm,sw,sh,kind='cell-slot',deviceId=a['id'],slot=j+1)
  s.y=top-5*rh-20;s.text('Only fully filled devices work. Count six occupied slots in total; all other slots stay empty.',size=10.5)
 elif name=='cells':
  w,h=[v*mm for v in E['cellMm']]
  for i,x,y in centred_grid(s,6,3,w,h,15*mm,12*mm):
   frame(s,x,y,w,h,cut=True,cellId=i+1);s.geometry('cell',x,y,w,h,cellId=i+1);s.label(f'CELL {i+1}',x+w/2,y+h-20,11,True,align='center');s.label('1 UNIT',x+w/2,y+12,10.5,align='center')
  s.y-=2*h+12*mm+20
 elif name=='calibration':
  w=170*mm;cw=w/3;x=(s.w-w)/2;top=s.y
  fields=[('BAND',['LOW','MID','HIGH']),('PHASE',['1','2','3']),('BADGE',['CIRCLE','TRIANGLE','STAR'])]
  for col,(title,values) in enumerate(fields):
   xx=x+col*cw;s.label(title,xx+6,top-14,11,True)
   for row,v in enumerate(values):
    yy=top-35-(row+1)*66;frame(s,xx+3,yy,cw-9,58,kind='control-option',field=title,value=v);s.label(v,xx+12,yy+22,10,True)
  s.y=top-35-3*66-20;s.text('Circle one option per column only after sharing all three source clues.',size=10.5)
 elif name=='clues':
  data=[('C / BAND','Use the BAND LETTERS in your arranged wave order.'),('E / PHASE','Count the wave marks on ONE strip, not the sum on all three.'),('V / BADGE','Match the antenna drawing below with a BADGE option.')]
  w=52*mm;h=64*mm
  for i,x,y in centred_grid(s,3,3,w,h,8*mm,0):
   frame(s,x,y,w,h,cut=True,clue=i+1);s.para(data[i][0],x+10,y+h-12,w-20,11,True,maxheight=25);s.para(data[i][1],x+10,y+h-43,w-20,10.6,maxheight=70)
   if i==2:
    cx=x+w/2;cy=y+30;p=c.beginPath();p.moveTo(cx,cy-12);p.lineTo(cx-18,cy+19);p.lineTo(cx+18,cy+19);p.close();c.setStrokeColor(INK);c.setLineWidth(1.7);c.drawPath(p)
  s.y-=h+20
 elif name=='lookup-example':
  s.box('Neutral lookup example','Example key: square = X, circle = Y, triangle = Z. A received circle takes Y even when the circle is in a different position. These are NOT the game icons or answers.')
 elif name=='decoder':
  w=170*mm;x=(s.w-w)/2;cw=w/5;h=105;top=s.y
  s.label('RECEIVED ICONS / follow THIS order',x,top-4,11,True);y=top-h-26
  for i,name in enumerate(E['messageSymbols']):
   xx=x+i*cw;frame(s,xx+2,y,cw-4,h,kind='received-slot',index=i+1,symbol=name);glyph(s,name,xx+cw/2,y+h*.56);s.label(name,xx+cw/2,y+9,10,True,align='center');s.label(f'{i+1}: ____',xx+cw/2,y-19,10,align='center')
  keytop=y-61;s.label('FIXED KEY / align chosen strip BELOW this row',x,keytop,10.5,True);ky=keytop-h-22
  for i,name in enumerate(E['keySymbols']):
   xx=x+i*cw;frame(s,xx+2,ky,cw-4,h,kind='key-slot',column=i+1,symbol=name);glyph(s,name,xx+cw/2,ky+h*.56);s.label(name,xx+cw/2,ky+9,10,True,align='center');s.label(str(i+1),xx+cw/2,ky+h+6,9,align='center')
  codeh=E['codeMm'][1]*mm;guidey=ky-codeh-13;frame(s,x,guidey,w,codeh,kind='code-alignment-slot');s.label('LEFT EDGE / chosen strip, TOP up',x+7,guidey+codeh-17,9,True)
  for i in range(6):
   xx=x+i*cw;c.setStrokeColor(LINE);c.line(xx,ky,xx,guidey+codeh);c.line(xx,guidey+codeh,xx,guidey+codeh-5)
  s.geometry('key-columns',x,ky,w,h,centres=[x+(i+.5)*cw for i in range(5)])
  s.y=guidey-24;s.text('Read each received icon through its matching key column. Then read the five written characters as one instruction.',size=10.5)
 elif name=='codes':
  w,h=[v*mm for v in E['codeMm']];x=(s.w-w)/2;top=s.y;gap=23;cw=w/5
  for j,(code,values) in enumerate(E['codeRows']):
   y=top-(j+1)*h-j*gap;frame(s,x,y,w,h,cut=True,code=code);s.geometry('code',x,y,w,h,code=code,values=values,centres=[x+(i+.5)*cw for i in range(5)])
   s.label(f'CODE {code} / TOP / LEFT EDGE',x+7,y+h-17,9,True)
   for i,v in enumerate(values):
    s.label(v,x+(i+.5)*cw,y+15,16,True,align='center');s.label(str(i+1),x+(i+.5)*cw,y+h-31,7.5,align='center')
   for i in range(6):
    xx=x+i*cw;c.setStrokeColor(LINE);c.line(xx,y+h,xx,y+h-5)
  s.y=top-3*h-2*gap-20
 elif name=='transmission':
  s.table(['Show the ORIGINAL','Check together, then tick'],[
   ['Circled settings + record rows 1/3','Each setting has a source clue.  [  ]'],
   ['Completed received message + code strip','Every lookup matches that key column.  [  ]'],
   ['Actual SEND power board','Correct jobs, full costs, exactly six cells.  [  ]'],
   ['Pulse markers below','Count comes from the decoded request.  [  ]']],{'ratios':[.48,.52],'row_height':54})
  s.text('PULSE SLOTS / fill from slot 1; unused cards stay outside.',size=10.5,bold=True)
  w,h=[v*mm for v in E['pulseSlotMm']];gap=6*mm;x=(s.w-5*w-4*gap)/2;y=s.y-h
  for i in range(5):frame(s,x+i*(w+gap),y,w,h,kind='pulse-slot',slot=i+1);s.label(str(i+1),x+i*(w+gap)+7,y+h-15,9,True)
  s.y=y-22;s.text('Adult: accept only after the actual board, all original evidence and the pulse count agree. Recheck corrected work; then read your private response.',size=10.5)
 elif name=='pulses':
  w,h=[v*mm for v in E['pulseMm']]
  for i,x,y in centred_grid(s,5,5,w,h,8*mm,0):
   frame(s,x,y,w,h,cut=True,pulse=i+1);s.geometry('pulse',x,y,w,h,pulse=i+1);s.label(f'PULSE {i+1}',x+w/2,y+h-17,9.5,True,align='center');s.label('1 SIGNAL',x+w/2,y+10,8.7,align='center')
  s.y-=h+20
 elif name=='keepsake':
  h=310;frame(s,s.x,s.y-h,s.width,h);s.label('DRAW OR TELL A MEMORY',s.x+12,s.y-23,11,True);s.y-=h+20
 else:raise ValueError(name)
