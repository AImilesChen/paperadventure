"""C11 vector materials and print layout, independent of Windows fonts."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
import re
from generate_chinese_free_games import Sheet
from workshop_edition_content import E
INK=colors.HexColor('#293b53');LINE=colors.HexColor('#a5c8cf');PALE=colors.HexColor('#f2fafb');PURPLE=colors.HexColor('#b23a27')

class WorkshopSheet(Sheet):
 def __init__(self,c,size,locale,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.locale=locale;self.zh=locale=='zh';self.role=role;self.number=number;self.setting='workshop-classroom';self.prefix='PAWKS';self.paper='A4' if size[1]>800 else 'Letter'
  c.setFillColor(colors.HexColor('#e8f1f6'));c.rect(0,self.h-33,self.w,33,fill=1,stroke=0)
  self.label(self.t('PAPER ADVENTURE / INVENTORS PAPER WORKSHOP / CLASSROOM C11','PAPER ADVENTURE／小发明家纸艺工坊／课堂版 C11'),44,self.h-21,8.2,True)
  c.setStrokeColor(LINE);c.line(44,37,self.w-44,37)
  role_name=self.t('Player Pack' if role=='player' else 'Teacher Guide','玩家材料' if role=='player' else '教师指南')
  self.label(role_name+' / '+E['versions'][locale]+' / '+self.paper,44,25,8)
  self.label(self.t(f'Page {number} of {total}',f'第{number}页／共{total}页'),self.w-44,25,8,align='right')
 def t(self,en,zh):return zh if self.zh else en
 def measure(self,value,width,size=11.2,leading=16.8,bold=False):
  if not self.zh:
   value=str(value).translate({0x2019:39,0x2018:39,0x2013:45,0x2014:45})
   value=re.sub(r'([a-z])(?=\d)',r'\1 ',value)
   value=re.sub(r'(\d)(?=[a-z])',r'\1 ',value)
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
 def geometry(self,kind,x,y,w,h,**extra):
  super().geometry(kind,x,y,w,h,locale=self.locale,**extra)

from math import cos,sin,pi
from reportlab.lib.units import mm
ORANGE=colors.HexColor('#b23a27')

def frame(s,x,y,w,h,cut=False,fill=True):
 c=s.c;c.saveState();c.setStrokeColor(ORANGE if cut else LINE);c.setFillColor(colors.white);c.setLineWidth(.9)
 if cut:c.setDash(4,3)
 c.rect(x,y,w,h,fill=int(fill),stroke=1);c.restoreState();s.geometry('cut' if cut else 'frame',x,y,w,h)

def rect(s,x,y,w,h):frame(s,x,y,w,h)

def arrow(c,x,y,length=24,forward=True):
 c.saveState();c.setStrokeColor(INK);c.setFillColor(INK);c.setLineWidth(2.5);dy=length*(1 if forward else -1);c.line(x,y,x,y+dy)
 p=c.beginPath();p.moveTo(x,y+dy);p.lineTo(x-5,y+dy-7*(1 if forward else -1));p.lineTo(x+5,y+dy-7*(1 if forward else -1));p.close();c.drawPath(p,fill=1,stroke=0);c.restoreState()

def shape(c,kind,x,y,r=8):
 c.saveState();c.setStrokeColor(ORANGE);c.setFillColor(colors.white);c.setLineWidth(1.5)
 if kind=='circle':c.circle(x,y,r,fill=1,stroke=1)
 elif kind=='triangle':
  p=c.beginPath();p.moveTo(x,y+r);p.lineTo(x-r,y-r*.8);p.lineTo(x+r,y-r*.8);p.close();c.drawPath(p,fill=1,stroke=1)
 elif kind=='star':
  p=c.beginPath()
  for i in range(10):
   a=pi/2+i*pi/5;rr=r if i%2==0 else r*.42
   (p.moveTo if i==0 else p.lineTo)(x+rr*cos(a),y+rr*sin(a))
  p.close();c.drawPath(p,fill=1,stroke=1)
 c.restoreState()

def card(s,x,y,w,h,label,kind='blank',direction=None,cut=True):
 c=s.c;T=s.t;frame(s,x,y,w,h,cut=cut);s.para(label,x+5,y+h-6,w-10,9.1,True,leading=11.5,maxheight=24)
 s.para(T('FRONT EDGE','前端'),x+5,y+h-30,w-10,8.3,True,maxheight=15)
 if kind=='sample':
  shape(c,'triangle',x+w/2,y+h*.61,11)
  for dx in [-12,12]:shape(c,'star',x+w/2+dx,y+h*.38,7)
  arrow(c,x+w/2,y+18 if direction=='forward' else y+39,22,direction=='forward')
  s.label(T('TEST ONLY','仅供试验'),x+w/2,y+5,7.5,True,align='center')
 s.geometry('message-card',x,y,w,h,cardType=kind,direction=direction,label=label)

def track(s,x,y,cut=True):
 c=s.c;T=s.t;w=E['track']['widthMm']*mm;h=E['track']['lengthMm']*mm;rail=15*mm
 frame(s,x,y,w,h,cut=cut);c.saveState();c.setStrokeColor(INK);c.setLineWidth(.9);c.setDash(1,3)
 for xx in [x+rail,x+w-rail]:c.line(xx,y+2,xx,y+h-2);s.geometry('fold-line',xx,y+2,0,h-4)
 c.restoreState();s.label(T('DISPLAY','展示端'),x+w/2,y+h-22,12,True,align='center');s.label(T('START','起点'),x+w/2,y+17,12,True,align='center')
 arrow(c,x+w/2,y+h/2+5,30)
 s.label(T('48 mm lane','通道48毫米'),x+w/2,y+h/2-25,10,True,align='center')
 for xx in [x+rail/2,x+w-rail/2]:s.label('15',xx,y+h/2,10,True,align='center')
 s.geometry('track',x,y,w,h,railMm=15,laneMm=48)

def blueprint(s):
 c=s.c;T=s.t;w=78*mm;h=170*mm/3;gap=12;top=s.y-6;x=s.x+12
 for i,b in enumerate(E['blueprint']):
  y=top-(i+1)*h-i*gap;frame(s,x,y,w,h,cut=True)
  c.saveState();c.setStrokeColor(LINE);c.setLineWidth(1)
  for xx in [x+15*mm,x+63*mm]:c.line(xx,y+1,xx,y+h-1)
  c.restoreState()
  # Marks occupy actual corresponding edges, outside the centre travel lane.
  for edge in ['bottom','top']:
   if b[edge]:shape(c,b[edge],x+7.5*mm,y+(5*mm if edge=='bottom' else h-5*mm),8)
  s.label(T('ID ','编号 ')+b['id'],x+w/2,y+h/2+12,11,True,align='center')
  arrow(c,x+w/2,y+h/2-23,20)
  if b['part']=='start':s.label(T('START','起点'),x+w/2,y+11,10.5,True,align='center')
  if b['part']=='display':s.label(T('DISPLAY','展示端'),x+w/2,y+h-15,10.5,True,align='center')
  s.geometry('blueprint-fragment',x,y,w,h,part=b['part'],sourceId=b['id'],bottomMark=b['bottom'],topMark=b['top'])
 # Across-width dimensions are not mixed into the travel axis.
 dx=x+w+16;dw=s.x+s.width-dx
 s.para(T('Across the width','横向看宽度'),dx,top,dw,11.5,True)
 s.para(T('Left rail15 mm<br/>Middle lane48 mm<br/>Right rail15 mm<br/><br/>Travel follows the long direction. Keep these pieces flat as a PLAN. Do not fold them into the actual channel.','左侧栏15毫米<br/>中间通道48毫米<br/>右侧栏15毫米<br/><br/>沿长边行进。碎片拼成蓝图，保持平放；不拿它们折实际纸槽。'),dx,top-30,dw,11.2)
 s.y=top-3*h-2*gap-15

def demo(s):
 c=s.c;T=s.t;top=s.y;h=440;y=top-h;frame(s,s.x,y,s.width,h)
 # Top view uses neutral fit card only; cross-section is deliberately schematic.
 s.para(T('1 / Find the long fold lines','1／找到两条长折线'),s.x+12,top-12,s.width-24,12,True)
 xx=s.x+32;yy=top-155;ww=165;hh=110;rr=ww*15/78
 c.saveState();c.setStrokeColor(LINE);c.rect(xx,yy,ww,hh,fill=0,stroke=1);c.setDash(1,3)
 for fx in [xx+rr,xx+ww-rr]:c.line(fx,yy,fx,yy+hh)
 c.restoreState();arrow(c,xx+ww/2,yy+30,40);s.label(T('START','起点'),xx+ww/2,yy+5,9,True,align='center');s.label(T('DISPLAY','展示端'),xx+ww/2,yy+hh-14,9,True,align='center')
 s.para(T('Top view: follow the long lines. Width runs across them.','俯视：沿长线折，宽度横着看。'),s.x+235,top-63,s.width-250,11.2)
 s.para(T('2 / Raise both side rails','2／两侧向上竖起'),s.x+12,top-178,s.width-24,12,True)
 bx=s.x+40;by=top-254;bw=140;rh=32
 c.saveState();c.setStrokeColor(INK);c.setLineWidth(2);c.line(bx,by,bx+bw,by);c.line(bx,by,bx,by+rh);c.line(bx+bw,by,bx+bw,by+rh);c.restoreState()
 s.label(T('Middle stays flat','中间保持平整'),bx+bw/2,by-18,10,True,align='center');s.para(T('Cross-section: side walls stand up. A fingertip may steady a rail.','截面：侧栏竖起，可用指尖轻扶。'),s.x+235,top-220,s.width-250,11.2)
 s.para(T('3 / Push the plain fit card by hand','3／用手轻推试通卡'),s.x+12,top-291,s.width-24,12,True)
 tx=s.x+42;ty=top-423;tw=126;th=105;side=tw*15/78
 c.saveState();c.setStrokeColor(LINE);c.rect(tx,ty,tw,th,fill=0,stroke=1)
 for fx in [tx+side,tx+tw-side]:c.line(fx,ty,fx,ty+th)
 cw=tw*40/78;ch=36;c.setFillColor(colors.HexColor('#fff4dc'));c.rect(tx+(tw-cw)/2,ty+10,cw,ch,fill=1,stroke=1);c.restoreState()
 s.label(T('FRONT','前端'),tx+tw/2,ty+ch-1,8,True,align='center');arrow(c,tx+tw/2,ty+ch+18,25)
 s.para(T('Plain fit card only. Push away from you toward DISPLAY, keeping the card on the floor, face UP/front first. Do not force a catch or lift above rails.','这里只用试通卡。贴底向远处展示端推，印字正面朝上、前端先入；不强推卡住的卡，也不悬空越栏。'),s.x+235,top-327,s.width-250,11.2)
 s.geometry('fold-demo',s.x,y,s.width,h);s.y=y-16

def render(s,name):
 c=s.c;T=s.t
 if name=='cover':
  im=Image.open(Path(__file__).resolve().parents[1]/'public/assets/workshop-classroom-v0.1.webp');b=BytesIO();im.convert('RGB').save(b,format='JPEG',quality=84)
  h=166;w=238;c.drawImage(ImageReader(b),(s.w-w)/2,s.y-h,w,h,preserveAspectRatio=True,anchor='c');s.y-=h+16
 elif name=='blueprint':blueprint(s)
 elif name=='fold-demo':demo(s)
 elif name=='track':
  x=s.x+8;h=170*mm;y=s.y-h-6;track(s,x,y)
  cx=x+78*mm+20;cw=40*mm;ch=45*mm;cy=s.y-ch-6
  card(s,cx,cy,cw,ch,T('PLAIN FIT CARD','试通卡'),kind='fit');s.geometry('fit-card',cx,cy,cw,ch)
  s.para(T('Trial fit tool only; no design marks. Push with this edge leading.','只作通道试通，没有设计图案；前端先进入。'),cx,cy-15,s.x+s.width-cx,11.2)
  s.para(T('Real dimensions<br/>Track78×170 mm<br/>Rails15 / lane48 / rail15<br/>Fit card40×45 mm<br/><br/>Do not cut the dotted lines. Fold UP.','真实尺寸<br/>纸槽78×170毫米<br/>侧栏15／通道48／侧栏15<br/>试通卡40×45毫米<br/><br/>点线不剪，两侧向上折。'),cx,cy-111,s.x+s.width-cx,11.2)
  s.y=y-16
 elif name=='notes':
  top=s.y;h=124
  labels=[T('NOTE 2 / large mark','便条2／大图形'),T('NOTE 3 / small marks','便条3／小图案'),T('NOTE 1 / direction','便条1／方向')]
  words=[T('Draw ONE large triangle on the message card.','在信息卡上画一个大三角形。'),T('Draw exactly TWO stars below the large mark.','在大图形下方画恰好两颗星。'),T('Add ONE solid arrow toward DISPLAY when FRONT EDGE leads, face up.','正面朝上、前端先入时，画一支指向展示端的实心箭头。')]
  for i,(head,body,note) in enumerate(zip(labels,words,E['notes'])):
   y=top-(i+1)*h-i*14;frame(s,s.x,y,s.width,h,cut=True);s.para(head,s.x+14,y+h-14,s.width-28,12,True);s.para(body,s.x+14,y+h-47,s.width-28,13,leading=19);s.geometry('design-note',s.x,y,s.width,h,noteId=note['id'])
  s.y=top-3*h-28-16
 elif name=='own-card':
  w=40*mm;h=56*mm;x=s.x+20;y=s.y-h-7;card(s,x,y,w,h,T('OUR MESSAGE','本组信息卡'))
  s.para(T('Keep the front label and width. Add your own marks only after every note has been shared. No filled design is printed here.','保留前端标签和宽度；每张便条分享后才画本组图案。这里不印完成答案。'),x+w+28,s.y-10,s.width-w-55,11.5);s.geometry('own-card',x,y,w,h);s.y=y-20
 elif name=='samples':
  x=s.x+8;top=s.y-9
  for a in E['samples']:
   w=a['widthMm']*mm;h=a['heightMm']*mm;y=top-h;card(s,x,y,w,h,T('SAMPLE ','样卡 ')+a['id'],kind='sample',direction=a['direction']);s.geometry('trial-sample',x,y,w,h,sampleId=a['id'],direction=a['direction']);x+=w+10
  s.y=top-h-22
  s.text(T('Test every sample under the SAME orientation rules. A trial sample never becomes the crew’s final message. Instructions12 and record14 stay whole.','每张样卡按相同朝向规则试验，不能把试验样卡当本组最终作品。第12页说明和第14页记录整页保留。'),size=11.4)
 elif name=='trial-record':
  rows=[]
  for label in ['A','B','C',T('Our own card','本组自制卡')]:
   rows.append([label,T('Pass / fault / unsure','符合／不符合／不确定'),T('Fit: yes / no\nDirection: yes / no','通过：是／否\n方向：是／否').replace('\n','<br/>'),T('Observed evidence:','实际依据：')+'<br/>________________'])
  s.table([T('Card','卡片'),T('Prediction first','先记预测'),T('Actual observation','实际观察'),T('Explain','解释')],rows,{'ratios':[.17,.25,.29,.29],'row_height':93})
 elif name=='audit':
  rows=[T('Show both original blueprint joins; distinguish travel length from cross-width.','展示蓝图两处接缝，分清纵向行进和横向宽度。'),T('Repeat the OWN CARD slide under the same face/front/floor rules.','按相同正面、前端和贴底规则，重做自制卡滑行。'),T('Point to each original note and its matching mark on the own card.','逐条指出原便条及自制卡对应图案。'),T('Show actual trials, one observed sample fault and a possible NEW-card repair.','展示实际试验、一种已观察样卡问题和新做卡片的修正方案。'),T('Presenter demonstrates; every pupil contributes once. Only the own card is displayed.','展示员演示，每人贡献一次，只展示本组自制卡。')]
  s.table([T('Check','核查'),T('Original and repeated action before ticking','勾选前指出原件并重做操作')],[['[ ]',v] for v in rows],{'ratios':[.13,.87],'row_height':49})
 else:raise ValueError(name)

