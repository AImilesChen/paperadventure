"""C10 vector materials and print layout, independent of Windows fonts."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from generate_chinese_free_games import Sheet
from weather_edition_content import E
INK=colors.HexColor('#293b53');LINE=colors.HexColor('#a5c8cf');PALE=colors.HexColor('#f2fafb');PURPLE=colors.HexColor('#087988')

class WeatherSheet(Sheet):
 def __init__(self,c,size,locale,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.locale=locale;self.zh=locale=='zh';self.role=role;self.number=number;self.setting='weather-classroom';self.prefix='PAWEA';self.paper='A4' if size[1]>800 else 'Letter'
  c.setFillColor(colors.HexColor('#e8f1f6'));c.rect(0,self.h-33,self.w,33,fill=1,stroke=0)
  self.label(self.t('PAPER ADVENTURE / WEATHER OBSERVATORY / CLASSROOM C10','PAPER ADVENTURE／气象观测站／课堂版 C10'),44,self.h-21,8.2,True)
  c.setStrokeColor(LINE);c.line(44,37,self.w-44,37)
  role_name=self.t('Player Pack' if role=='player' else 'Teacher Guide','玩家材料' if role=='player' else '教师指南')
  self.label(role_name+' / '+E['versions'][locale]+' / '+self.paper,44,25,8)
  self.label(self.t(f'Page {number} of {total}',f'第{number}页／共{total}页'),self.w-44,25,8,align='right')
 def t(self,en,zh):return zh if self.zh else en
 def measure(self,value,width,size=11.2,leading=16.8,bold=False):
  if not self.zh:value=str(value).translate({0x2019:39,0x2018:39,0x2013:45,0x2014:45})
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

TEAL=colors.HexColor('#087988')
from math import cos,sin,radians

def rect(s,x,y,w,h):
 frame(s,x,y,w,h)

def frame(s,x,y,w,h,cut=False,fill=True):
 c=s.c;c.saveState();c.setStrokeColor(TEAL if cut else LINE);c.setFillColor(colors.white);c.setLineWidth(.9)
 if cut:c.setDash(4,3)
 c.roundRect(x,y,w,h,5,fill=int(fill),stroke=1);c.restoreState()
 s.geometry('cut' if cut else 'frame',x,y,w,h)

def tag(s,label,x,top,w,size=11.2):
 return s.para(label,x,top,w,size,True)

def pointer(s,cx,cy,r,north,p,labels=False):
 c=s.c;c.saveState();c.setStrokeColor(TEAL);c.setLineWidth(1.3);c.circle(cx,cy,r,fill=0,stroke=1)
 if labels:
  for en,zh,dx,dy in [('N','北 N',0,r+18),('E','东 E',r+27,-4),('S','南 S',0,-r-27),('W','西 W',-r-27,-4)]:s.label(s.t(en,zh),cx+dx,cy+dy,12.2,True,align='center')
 else:
  a=radians(north);nx=cx+(r+8)*cos(a);ny=cy+(r+8)*sin(a)
  c.setStrokeColor(LINE);c.setLineWidth(1);c.line(cx,cy,nx,ny);s.label('N',nx,ny-4,13,True,align='center')
 if p is not None:
  a=radians(p);tx=cx+r*.82*cos(a);ty=cy+r*.82*sin(a);c.setStrokeColor(INK);c.setFillColor(INK);c.setLineWidth(4);c.line(cx,cy,tx,ty);c.circle(tx,ty,4.5,fill=1,stroke=0)
 c.setFillColor(TEAL);c.circle(cx,cy,3.2,fill=1,stroke=0);c.restoreState()

def seal(s,x,y,bars):
 c=s.c;c.saveState();c.setFillColor(TEAL);c.circle(x,y,9,fill=1,stroke=0);c.setStrokeColor(INK);c.setLineWidth(2)
 for n in range(bars):c.line(x-13,y-17-n*10,x+13,y-17-n*10)
 c.restoreState()

def sky(s,x,y,cell,n):
 c=s.c;c.saveState()
 for i in range(4):
  xx=x+i*(cell+6);c.setFillColor(colors.HexColor('#e5ecef') if i<n else colors.white);c.setStrokeColor(INK);c.rect(xx,y,cell,cell,fill=1,stroke=1)
  if i<n:
   c.setStrokeColor(TEAL);c.setLineWidth(.8)
   for k in range(7,int(cell)-5,10):c.line(xx+k,y+5,xx+min(k+15,cell-5),y+cell-5)
 c.restoreState()

def observations(s,final=False):
 c=s.c;T=s.t;heads=[T('Source ID','原记录编号'),T('Time','时刻'),T('Wind FROM','风的来向'),T('Covered /4','云覆盖／4格'),T('Gauge /mm','雨量读数／毫米')] if not final else [T('Time','时刻'),T('Wind FROM','风的来向'),T('Covered /4','云覆盖／4格'),T('Gauge /mm','雨量读数／毫米')]
 ratios=[.14,.15,.2,.27,.24] if not final else [.19,.25,.29,.27];widths=[s.width*v for v in ratios];hh=52;rh=90 if not final else 106;total=hh+3*rh;bottom=s.y-total;assert bottom>=49
 x=s.x
 for w,label in zip(widths,heads):
  c.setFillColor(PALE);c.setStrokeColor(LINE);c.rect(x,s.y-hh,w,hh,fill=1,stroke=1);s.para(label,x+7,s.y-10,w-14,10.2,True,maxheight=hh-14);x+=w
 for n in range(3):
  y=s.y-hh-(n+1)*rh;x=s.x
  for j,w in enumerate(widths):
   frame(s,x,y,w,rh)
   cloud=j==(3 if not final else 2)
   if cloud:
    cell=min(19,(w-26)/4);sky(s,x+9,y+rh/2-1,cell,0);s.label('___/4',x+13,y+18,11)
   else:c.setStrokeColor(LINE);c.line(x+9,y+rh/2-2,x+w-9,y+rh/2-2)
   x+=w
 s.geometry('bulletin' if final else 'observation-board',s.x,bottom,s.width,total);s.y=bottom-18

def rain_strip(s,x,y,w,h,level,time,cut=True):
 c=s.c;frame(s,x,y,w,h,cut);tag(s,s.t('RAIN / ','雨量／')+time,x+9,y+h-11,w-18,11.1)
 base=y+32;c.setStrokeColor(INK);c.setLineWidth(1.3);c.line(x+12,base,x+w-12,base)
 if level:
  c.setFillColor(colors.HexColor('#dce8eb'));c.setStrokeColor(TEAL);c.rect(x+35,base,w-70,level*E['rainScalePoints'],fill=1,stroke=1);c.setLineWidth(2);c.line(x+35,base+level*E['rainScalePoints'],x+w-35,base+level*E['rainScalePoints'])
 else:s.para(s.t('No shaded level','无阴影水位'),x+15,base+43,w-30,10.4)
 s.label(s.t('BASELINE','基准线'),x+w/2,y+14,10.3,True,align='center')
 s.geometry('rain-strip',x,y,w,h,time=time,level=level,baseline=base,top=base+level*E['rainScalePoints'])

def render(s,name):
 c=s.c;T=s.t
 if name=='cover':
  im=Image.open(Path(__file__).resolve().parents[1]/'public/assets/weather-classroom-v0.1.webp').convert('RGB');b=BytesIO();im.save(b,format='JPEG',quality=91);b.seek(0);w=245;h=w*im.height/im.width
  c.drawImage(ImageReader(b),s.x+(s.width-w)/2,s.y-h,w,h);s.y-=h+16
 elif name=='observation-board':observations(s)
 elif name=='bulletin':observations(s,True)
 elif name=='seal-rule':
  h=73;y=s.y-h;frame(s,s.x,y,s.width,h);seal(s,s.x+39,y+45,2);s.para(T('OUR station: circle above TWO bars. Compare the seal and time.','本站：圆形下方两条短横线。核对印记与时刻。'),s.x+80,s.y-15,s.width-95,11.5);s.y=y-15
 elif name=='time-cards':
  w=(s.width-14)/2;h=116;top=s.y
  for i,r in enumerate(E['records']):
   row,col=divmod(i,2);x=s.x+col*(w+14);y=top-(row+1)*(h+13);frame(s,x,y,w,h,True);tag(s,T('RECORD ','记录 ')+str(r['id'])+' / '+r['time'],x+11,y+h-12,w-22,11.6);seal(s,x+34,y+58,r['bars']);s.para(T('STATION SEAL','站点印记'),x+72,y+60,w-83,11)
  s.y=top-3*(h+13)-3
 elif name=='wind-practice':
  h=194;y=s.y-h;frame(s,s.x,y,s.width,h);tag(s,T('PRACTICE ONLY / DO NOT CUT / NOT GAME DATA','独立练习／不剪／不是正式数据'),s.x+12,s.y-10,s.width-24,10.8)
  for i,(n,p) in enumerate([(E['windPractice']['north'],E['windPractice']['pointer']),(90,0)]):
   cx=s.x+s.width*(.24 if i==0 else .75);cy=y+82;pointer(s,cx,cy,48,n,p);s.label(T('BEFORE' if i==0 else 'N ALIGNED','定位前' if i==0 else 'N已对准北'),cx,s.y-44,10.6,True,align='center')
  s.label('→',s.x+s.width*.5,y+80,20,True,align='center');s.label(T('Practice result: E / east','练习结果：东 E'),s.x+s.width*.75,y+13,10.5,True,align='center');s.geometry('wind-practice',s.x,y,s.width,h);s.y=y-13
 elif name=='compass-base':
  cy=s.y-195;pointer(s,s.w/2,cy,145,90,None,True);s.geometry('compass',s.w/2-180,cy-180,360,360);s.y=cy-185
 elif name=='wind-cards':
  w=220;h=220;top=s.y;gap=17
  for i,r in enumerate(E['wind']):
   row,col=divmod(i,2);x=s.x+col*(w+gap);y=top-(row+1)*(h+gap);frame(s,x,y,w,h,True);tag(s,T('WIND / ','风向／')+r['time'],x+11,y+h-10,w-22);pointer(s,x+w/2,y+h/2-5,65,r['north'],r['pointer']);s.geometry('wind-card',x,y,w,h,time=r['time'],north=r['north'],pointer=r['pointer'])
  s.para(T('Cut THREE cards only.<br/>Keep each time label.<br/>Turn the whole square.<br/>Keep instructions on page 6.','只剪三张卡。<br/>保留各时刻标签。<br/>旋转整张方卡。<br/>第6页说明不剪。'),s.x+w+gap+10,top-h-gap-35,w-20,11.3)
  s.y=top-2*(h+gap)-4
 elif name=='sky-cards':
  h=158;top=s.y
  for i,r in enumerate(E['clouds']):
   y=top-(i+1)*(h+13);frame(s,s.x,y,s.width,h,True);tag(s,T('SKY VIEW / ','天空图／')+r['time'],s.x+12,y+h-11,s.width-24);cell=74;sky(s,s.x+(s.width-(cell*4+18))/2,y+24,cell,r['covered']);s.geometry('sky',s.x,y,s.width,h,time=r['time'],covered=r['covered'])
  s.y=top-3*(h+13)-5
 elif name=='rain-practice':
  h=195;y=s.y-h;frame(s,s.x,y,s.width,h);tag(s,T('PRACTICE ONLY / DO NOT CUT / NOT GAME DATA','独立练习／不剪／不是正式数据'),s.x+12,s.y-10,s.width-24,10.8)
  bx=s.x+45;base=y+40
  for n in range(4):
   yy=base+n*30;c.setStrokeColor(LINE);c.line(bx+26,yy,bx+110,yy);s.label(str(n)+' mm',bx+17,yy-3,10,align='right')
  x=bx+128;c.setStrokeColor(INK);c.line(x,base,x+83,base);c.setFillColor(colors.HexColor('#dce8eb'));c.setStrokeColor(TEAL);c.rect(x+12,base,60,60,fill=1,stroke=1);s.label(T('BASELINE','基准线'),x+42,base-18,10.1,True,align='center')
  s.para(T('1. Baseline at 0.<br/>2. Read shaded TOP.<br/>This independent practice reads 2 mm.','1. 基准线对0。<br/>2. 读阴影上沿。<br/>本独立练习为2毫米。'),s.x+295,s.y-54,s.width-310,11.1)
  s.geometry('rain-practice',s.x,y,s.width,h);s.y=y-15
 elif name=='rain-base':
  y=s.y-250;x=s.x+25;w=190;h=200;frame(s,x,y,w,h);base=y+32
  tag(s,T('GAUGE / mm','纸尺／毫米'),x+10,y+h-10,w-20)
  for n in range(5):
   yy=base+n*E['rainScalePoints'];c.setStrokeColor(LINE);c.line(x+46,yy,x+w-12,yy);s.label(str(n)+' mm',x+37,yy-4,11,True,align='right')
  xx=x+w+32;frame(s,xx,y,160,h);s.para(T('PLACE ONE WHOLE STRIP<br/>DO NOT CUT','整张水位条摆放区<br/>不要剪'),xx+12,y+h-13,136,10.5,True);c.setStrokeColor(TEAL);c.setLineWidth(1.5);c.line(xx+7,base,xx+153,base);s.label(T('BASELINE AT 0','基准线对零'),xx+80,y+14,10.5,True,align='center')
  s.geometry('gauge',x,y,w,h,baseline=base,step=E['rainScalePoints']);s.geometry('placement',xx,y,160,h,baseline=base);s.y=y-20
 elif name=='rain-cards':
  w=160;h=200;gap=12;left=s.x+(s.width-(3*w+2*gap))/2;y=s.y-h-20
  for i,r in enumerate(E['rain']):rain_strip(s,left+i*(w+gap),y,w,h,r['reading'],r['time'])
  s.y=y-22
 elif name=='copied-notice':
  s.table([T('Copied time','抄录时刻'),T('Copied reading /mm','抄录读数／毫米')],[[t,str(n)] for t,n in zip(E['times'],E['copiedRain'])],{'ratios':[.4,.6],'row_height':43})
 elif name=='correction':
  for label in [T('Time / copied value → checked value','时刻／原抄录值 → 核准值'),T('Original strip and gauge evidence','原始水位条与纸尺依据')]:s.lines([label])
 elif name=='audit':
  rows=[
   T('Station seal, source IDs and time order match page 5 originals.','站点印记、原编号和时间先后符合第5页原卡。'),
   T('Wind values match centres/N aligned on pages 7–8. Repeat each turn.','风向符合第7至8页中心与N定位，逐张重做旋转。'),
   T('Cloud counts match the time-labelled page-10 original sky views.','云覆盖格数符合第10页对应时刻原图。'),
   T('Rain values match every original strip aligned at gauge zero (12–13).','雨量符合第12至13页每张原条对零后的读数。'),
   T('Page-14 repair has original evidence; the summary states recorded observations.','第14页修正有原依据，总结只陈述已记录的观测。')]
  s.table([T('Check','确认'),T('Point to the source before ticking','指回原来源后再勾选')],[['[ ]',v] for v in rows],{'ratios':[.13,.87],'row_height':52})
 else:raise ValueError(name)

