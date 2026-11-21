"""H02 vector parts, fixed millimetres and explicit alignment across cutting gaps."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.lib.utils import ImageReader
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from generate_chinese_free_games import Sheet
from dinosaur_home_edition_content import E
INK=colors.HexColor('#243d40');LINE=colors.HexColor('#a4bdb8');PALE=colors.HexColor('#f3f8f4');CUT=colors.HexColor('#a63e28')

class DinosaurSheet(Sheet):
 def __init__(self,c,size,locale,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.locale=locale;self.zh=locale=='zh';self.role=role;self.number=number;self.setting='dinosaur-home';self.prefix='PADINO';self.paper='A4' if size[1]>800 else 'Letter'
  c.setFillColor(colors.HexColor('#e8f1e9'));c.rect(0,self.h-33,self.w,33,fill=1,stroke=0)
  self.label(self.t('PAPER ADVENTURE / DINOSAUR HOME H02','PAPER ADVENTURE／恐龙世界／家庭版 H02'),44,self.h-21,8.3,True)
  c.setStrokeColor(LINE);c.line(44,37,self.w-44,37)
  name=self.t('Player Pack' if role=='player' else 'Host Guide','玩家材料' if role=='player' else '成人主持指南')
  self.label(name+' / '+E['versions'][locale]+' / '+self.paper,44,25,8)
  self.label(self.t(f'Page {number} of {total}',f'第{number}页／共{total}页'),self.w-44,25,8,align='right')
 def t(self,en,zh):return zh if self.zh else en
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
 def special(self,name,_=None):render(self,name)

def frame(s,x,y,w,h,cut=False,kind='frame',**kw):
 c=s.c;c.saveState();c.setStrokeColor(CUT if cut else LINE);c.setFillColor(colors.white);c.setLineWidth(.8)
 if cut:c.setDash(4,3)
 c.rect(x,y,w,h,fill=1,stroke=1);c.restoreState();s.geometry('cut' if cut else kind,x,y,w,h,**kw)

def topmark(s,x,y,size=7):
 c=s.c;c.saveState();c.setStrokeColor(INK);c.setLineWidth(1);c.line(x,y-6,x,y+3);c.line(x,y+3,x-3,y-1);c.line(x,y+3,x+3,y-1);c.restoreState()
 s.label(s.t('TOP','卡顶'),x+7,y-3,size,True)

def road(s,points,kind='road',**kw):
 c=s.c;c.saveState();c.setStrokeColor(INK);c.setLineWidth(2.7);p=c.beginPath();p.moveTo(*points[0])
 for q in points[1:]:p.lineTo(*q)
 c.drawPath(p);c.restoreState();xs=[q[0] for q in points];ys=[q[1] for q in points];s.geometry(kind,min(xs),min(ys),max(xs)-min(xs),max(ys)-min(ys),points=points,**kw)

def guide(s,p,q):
 c=s.c;c.saveState();c.setStrokeColor(colors.HexColor('#738481'));c.setDash(1.5,2);c.setLineWidth(.7);c.line(*p,*q);c.restoreState();s.geometry('gap-guide',min(p[0],q[0]),min(p[1],q[1]),abs(p[0]-q[0]),abs(p[1]-q[1]),points=[p,q])

def tile(s,x,y,item,cut=True):
 w,h=[v*mm for v in E['tileMm']];c=s.c;frame(s,x,y,w,h,cut=cut,tileId=item['id']);s.geometry('tile',x,y,w,h,tileId=item['id'],ports=item['ports'])
 s.para(item[s.locale],x+7,y+h-7,w-14,10.2,True,maxheight=28);topmark(s,x+9,y+h-36)
 details={
 'hollow':s.t('Quiet clearing. No path exits.','安静的空地，没有道路出口。'),
 'bridge':s.t('A bridge under rain clouds.','雨云下的一座木桥。'),
 'ford':s.t('A crossing with wet stones.','有湿石的过水浅滩。'),
 'fern':s.t('A fork with three paths.','三条小路相接的岔路。'),
 'sun':s.t('Starting place. Milo waits here.','起点，米洛在这里等待。'),
 'tunnel':s.t('Dark passage. Camp is to the east.','黑暗通道，营地在右侧。')}
 s.para(details[item['id']],x+7,y+h-53,78,9.2,leading=12,maxheight=49)
 cx=x+w/2;cy=y+E['horizontalPortMm']*mm;vx=x+E['verticalPortMm']*mm
 endpoints={'W':(x,cy),'E':(x+w,cy),'N':(vx,y+h),'S':(vx,y)}
 for port in item['ports']:
  end=endpoints[port];points=[(cx,cy),end] if port in ['W','E'] else [(cx,cy),(vx,cy+(10 if port=='N' else -10)),end]
  road(s,points,tileId=item['id'],port=port);s.geometry('tile-port',end[0],end[1],0,0,tileId=item['id'],direction=port)
 c.setFillColor(colors.white);c.setStrokeColor(INK);c.circle(cx,cy,18,fill=1,stroke=1)
 s.label(item[s.locale],cx,cy-3,7.4,True,align='center');s.label(s.t('EXITS: ','出口：')+str(len(item['ports'])),x+7,y+10,8.2,True)

def board(s):
 sw,sh=[v*mm for v in E['slotMm']];tw,th=[v*mm for v in E['tileMm']];cw,ch=[v*mm for v in E['campMm']];gap=E['campGapMm']*mm
 total=sw*3+gap+cw;x=(s.w-total)/2;y=s.y-32-2*sh;assert y>=75
 s.label(s.t('NORTH / TOP ↑','北／卡顶方向 ↑'),x,s.y-5,10,True)
 for col in range(3):s.label('ABC'[col],x+(col+.5)*sw,y+2*sh+10,10,True,align='center')
 for row in range(2):
  sy=y+(1-row)*sh;s.label(str(row+1),x-12,sy+sh/2,10,True)
  for col in range(3):
   sx=x+col*sw;c=s.c;c.saveState();c.setStrokeColor(LINE);c.setDash(4,3);c.rect(sx,sy,sw,sh,stroke=1,fill=0);c.restoreState();s.geometry('slot',sx,sy,sw,sh,slot='ABC'[col]+str(row+1))
   # Corner ticks tell users where to centre the smaller printed card.
   inset=(sw-tw)/2;bottom=(sh-th)/2
   for xx in [sx+inset,sx+inset+tw]:
    for yy in [sy+bottom,sy+bottom+th]:
     c.setStrokeColor(LINE);c.line(xx-2,yy,xx+2,yy);c.line(xx,yy-2,xx,yy+2)
 for row in range(2):
  sy=y+(1-row)*sh;py=sy+(sh-th)/2+E['horizontalPortMm']*mm
  for col in range(2):guide(s,(x+col*sw+(sw+tw)/2,py),(x+(col+1)*sw+(sw-tw)/2,py))
 for col in range(3):
  px=x+col*sw+(sw-tw)/2+E['verticalPortMm']*mm;guide(s,(px,y+(sh+th)/2),(px,y+sh+(sh-th)/2))
 campx=x+sw*3+gap;frame(s,campx,y,cw,ch,kind='camp');s.para(s.t('CAMP','营地'),campx+5,y+ch-8,cw-10,11,True,maxheight=30)
 py=y+(sh-th)/2+E['horizontalPortMm']*mm;road(s,[(x+2*sw+(sw+tw)/2,py),(campx,py)],kind='camp-connector')
 s.label(s.t('FINAL','终点'),campx+cw/2,y+14,8,True,align='center')
 s.y=y-18;s.text(s.t('A1 is top-left. Card TOP marks point up. The camp area is outside the six tiles; enter it only in mission 5.','A1在左上。卡顶标记朝上。营地在六张地形之外，只有第5关才进入。'),size=10.5)

def supply_icon(s,kind,cx,cy):
 c=s.c;c.saveState();c.setStrokeColor(INK);c.setLineWidth(1.2)
 if kind=='boots':
  p=c.beginPath();p.moveTo(cx-7,cy+7);p.lineTo(cx+1,cy+7);p.lineTo(cx+1,cy-2);p.lineTo(cx+8,cy-2);p.lineTo(cx+8,cy-7);p.lineTo(cx-7,cy-7);p.close();c.drawPath(p)
 elif kind=='lantern':c.roundRect(cx-6,cy-7,12,14,2,stroke=1);c.arc(cx-4,cy+4,cx+4,cy+13,0,180)
 elif kind=='rope':c.circle(cx,cy,8,stroke=1);c.circle(cx,cy,4,stroke=1)
 else:c.rect(cx-7,cy-5,14,10,stroke=1);c.line(cx-3,cy+1,cx+3,cy+1)
 c.restoreState()

def render(s,name):
 c=s.c;T=s.t;R=Path(__file__).resolve().parents[1]
 if name in ['cover','finale']:
  path=R/('public/assets/dinosaur.png' if name=='cover' else 'public/assets/dinosaur-home-camp-v1.jpg');im=Image.open(path).convert('RGB');im.thumbnail((900,675));buf=BytesIO();im.save(buf,format='JPEG',quality=86);buf.seek(0);w=225;h=w*.75;c.drawImage(ImageReader(buf),(s.w-w)/2,s.y-h,w,h);s.geometry('image',(s.w-w)/2,s.y-h,w,h);s.y-=h+17
 elif name=='jobs':
  roles=[(T('R / READER','读／朗读员'),T('Read the current task or ask for adult reading help. Invite a partner to point to the clue.','朗读当前任务，或请成人协助；邀请伙伴指出线索。')),(T('M / MAPMAKER','图／地图员'),T('Compare prints, place terrain and move MILO along checked connections.','比较脚印、摆地形，沿已核连接移动米洛。')),(T('S / SUPPLY KEEPER','补／补给员'),T('Compare tools, pack two and park each actually used token beside its obstacle label.','比较工具、装两件，把实际已用卡放在所标障碍旁。')),(T('C / CHECKER & RECORDER','核记／核查记录员'),T('Ask for original evidence; record the agreed result once. Adult checks independently.','要求原件依据，商定结果只记一次，成人另行核准。'))]
  gap=12;w=(s.width-gap)/2;h=113;top=s.y
  for i,(head,body) in enumerate(roles):
   x=s.x+(i%2)*(w+gap);y=top-(i//2+1)*h-(i//2)*gap;frame(s,x,y,w,h,cut=True,optionalRoleCut=True);s.para(head,x+10,y+h-10,w-20,10.3,True,maxheight=28);s.para(body,x+10,y+h-38,w-20,11,leading=16,maxheight=h-48)
  s.y=top-2*h-gap-15
 elif name=='tracks':
  gap=12;w=(s.width-gap)/2;h=155;top=s.y
  for i,t in enumerate(E['tracks']):
   x=s.x+(i%2)*(w+gap);y=top-(i//2+1)*h-(i//2)*gap;frame(s,x,y,w,h);s.label(f"{t['id']} / {t[s.locale]}",x+12,y+h-23,13,True)
   cx=x+w/2;cy=y+76;c.setStrokeColor(INK);c.setLineWidth(1.2)
   for toe in range(t['toes']):c.circle(cx+(toe-(t['toes']-1)/2)*20,cy+30,6,stroke=1)
   if t['heel']=='round':c.ellipse(cx-28,cy-19,cx+28,cy+13,stroke=1)
   else:
    p=c.beginPath();p.moveTo(cx-28,cy+13);p.lineTo(cx,cy-20);p.lineTo(cx+28,cy+13);p.close();c.drawPath(p)
   if t['notch']:
    c.saveState();c.setFillColor(colors.white);c.rect(cx+19,cy-9,12,16,fill=1,stroke=0);c.setStrokeColor(INK);c.line(cx+27,cy+7,cx+18,cy-1);c.line(cx+18,cy-1,cx+27,cy-9);c.restoreState()
   feature=T(f"{t['toes']} toes / "+('round heel' if t['heel']=='round' else 'pointed heel'),f"{t['toes']}个脚趾／"+('圆脚跟' if t['heel']=='round' else '尖脚跟'))
   s.para(feature+'<br/>'+T('Right notch' if t['notch'] else 'No notch','右侧有缺口' if t['notch'] else '没有缺口'),x+10,y+35,w-20,9.4,leading=12,maxheight=28)
   s.geometry('print',x,y,w,h,printId=t['id'],toes=t['toes'],heel=t['heel'],notch=t['notch'],label=t[s.locale])
  s.y=top-3*h-2*gap-14
 elif name=='join-demo':
  w=36*mm;h=29*mm;gap=4*mm;x=(s.w-2*w-gap)/2;top=s.y
  for row in range(2):
   y=top-30-(row+1)*(h+45);s.label(T('Two exits / CONNECTED' if row==0 else 'One closed edge / NO ROAD','两边有出口／可相连' if row==0 else '一边无出口／不能走'),s.x,y+h+14,10.8,True)
   frame(s,x,y,w,h);frame(s,x+w+gap,y,w,h);guide(s,(x+w,y+h/2),(x+w+gap,y+h/2));road(s,[(x+w/2,y+h/2),(x+w,y+h/2)],kind='demo-road')
   if row==0:road(s,[(x+w+gap,y+h/2),(x+w+gap+w/2,y+h/2)],kind='demo-road')
   s.label(T('Example','示例'),x+8,y+h-17,9);s.label(T('Example','示例'),x+w+gap+8,y+h-17,9)
  s.y=y-20
 elif name=='board':board(s)
 elif name=='tiles':
  tw,th=[v*mm for v in E['tileMm']];gap=9*mm;total=3*tw+2*gap;x0=(s.w-total)/2;top=s.y
  for i,item in enumerate(E['tiles']):tile(s,x0+(i%3)*(tw+gap),top-(i//3+1)*th-(i//3)*gap,item)
  s.y=top-2*th-gap-20
 elif name=='supplies':
  w,h=[v*mm for v in E['supplyMm']];gap=12*mm;x0=(s.w-2*w-gap)/2;top=s.y-10
  effects={
   'boots':T('Dry feet on wet stones.','帮助脚踩湿石。'),
   'lantern':T('See through a dark passage.','照亮黑暗通道。'),
   'rope':T('Helps at an OPEN bridge only.','只帮助通过开放的木桥。'),
   'snack':T('Food at a rest stop; not an obstacle tool.','休息时的点心，不解决路上障碍。')}
  for i,item in enumerate(E['supplies']):
   x=x0+(i%2)*(w+gap);y=top-(i//2+1)*h-(i//2)*gap;frame(s,x,y,w,h,cut=True,supplyId=item['id']);s.geometry('supply',x,y,w,h,supplyId=item['id']);s.para(item[s.locale],x+7,y+h-7,w-30,9.7,True,maxheight=22);supply_icon(s,item['id'],x+w-15,y+h-16);s.para(effects[item['id']],x+7,y+h-32,w-14,9.2,leading=12,maxheight=h-38)
  s.y=top-2*h-gap-20
 elif name in ['backpack','storm']:
  if name=='storm':
   s.box(T('STORM /read now','暴雨／现在读'),T('The BRIDGE is CLOSED. No supply reopens it. Place BLOCK there; keep terrain fixed and test another branch.','木桥封闭，任何补给都不能重新打开。把封路标记放木桥，地形不动，检验另一分支。'))
  w,h=[v*mm for v in E['backpackSlotMm' if name=='backpack' else 'parkingSlotMm']];gap=8*mm;xx=(s.w-2*w-gap)/2;yy=s.y-h-33
  for i in range(2):
   x=xx+i*(w+gap);s.label(T(f'SLOT {i+1}' if name=='backpack' else f'{i+1} / tile: __________',f'第{i+1}格' if name=='backpack' else f'{i+1}／地形：________'),x,yy+h+12,10,True);frame(s,x,yy,w,h,kind='backpack-slot' if name=='backpack' else 'used-slot')
  s.y=yy-24
  s.text(T('Keep these slots empty until supplies are actually used on the journey.','工具在旅程中实际使用后才放入这些格子；使用前保持空白。') if name=='storm' else T('The slots stay empty until players choose their two supplies.','玩家选定两件补给前，背包格子保持空白。'),size=10.4)
 elif name=='markers':
  w,h=[v*mm for v in E['markerMm']];gap=25*mm;x=(s.w-2*w-gap)/2;yy=s.y-h-20
  for i,key in enumerate(['block','milo']):
   xx=x+i*(w+gap);frame(s,xx,yy,w,h,cut=True,marker=key);s.geometry('marker',xx,yy,w,h,marker=key);s.para(T('BLOCK' if key=='block' else 'MILO','封路标记' if key=='block' else '米洛'),xx+3,yy+h-5,w-6,8,True,maxheight=22);s.label('X' if key=='block' else T('M','米洛'),xx+w/2,yy+15,18 if key=='block' else 12,True,align='center')
  s.y=yy-20
 elif name=='keepsake':
  h=310;frame(s,s.x,s.y-h,s.width,h);s.label(T('DRAW OR TELL A MEMORY','画或说一个回忆'),s.x+12,s.y-24,11,True);s.y-=h+20
 else:raise ValueError(name)
