"""Print-safe bilingual museum props. No Windows font or English-v1.0 dependency."""
import math
from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from generate_chinese_free_games import Sheet,INK,LINE,PALE
from museum_edition_content import E

class MuseumSheet(Sheet):
 def __init__(self,c,size,locale,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.locale=locale;self.zh=locale=='zh';self.setting='museum-classroom';self.role=role;self.number=number;self.prefix='PAMUS';self.paper='A4' if size[1]>800 else 'Letter'
  c.setFillColor(colors.HexColor('#e5f4fa'));c.rect(0,self.h-33,self.w,33,stroke=0,fill=1)
  self.label(self.t('PAPER ADVENTURE / MUSEUM / CLASSROOM C08','PAPER ADVENTURE／奇珍博物馆／课堂版 C08'),44,self.h-21,8.5,True)
  c.setStrokeColor(LINE);c.line(44,37,self.w-44,37)
  role_name=self.t('Player Pack' if role=='player' else 'Teacher Guide','玩家材料' if role=='player' else '教师指南')
  self.label(role_name+' / '+E['versions'][locale]+' / '+self.paper,44,25,8)
  self.label(self.t(f'Page {number} of {total}',f'第{number}页／共{total}页'),self.w-44,25,8,align='right')
 def t(self,en,zh):return zh if self.zh else en
 def para(self,value,x=None,top=None,width=None,size=11.4,bold=False,leading=None,maxheight=None):
  x=self.x if x is None else x;top=self.y if top is None else top;width=self.width if width is None else width
  p=Paragraph(str(value),ParagraphStyle('museum',fontName=self.prefix+('-Bold' if bold else ''),fontSize=size,leading=leading or size*1.45,textColor=INK,wordWrap='CJK' if self.zh else 'LTR',splitLongWords=True))
  _,h=p.wrap(width,10000)
  if maxheight is not None:assert h<=maxheight+.01,(self.locale,self.number,'box overflow',value[:50],h,maxheight)
  self.check(x,top-h,width,h,str(value));p.drawOn(self.c,x,top-h);return h
 def special(self,name,_=None):render(self,name)
 def table(self,heads,rows,options):
  # Team abbreviations must remain legible in six narrow columns.
  if len(heads)!=6:return super().table(heads,rows,options)
  cw=self.width/6;top=self.y;data=[heads]+rows;rh=options.get('row_height',29)
  for j,row in enumerate(data):
   heights=[self._height(str(v),cw-12,8.8)+12 for v in row];h=max(rh,*heights)
   for i,v in enumerate(row):
    x=self.x+i*cw;rect(self,x,self.y-h,cw,h,fill=j==0)
    self.para(str(v),x+6,self.y-6,cw-12,8.8,j==0,leading=12.3,maxheight=h-12)
   self.y-=h
  self.y-=15;assert self.y>=49,(self.locale,self.number,'team table overflow')
 def _height(self,value,width,size):
  p=Paragraph(value,ParagraphStyle('measure',fontName=self.prefix,fontSize=size,leading=12.3,wordWrap='CJK' if self.zh else 'LTR'));return p.wrap(width,10000)[1]

def rect(s,x,y,w,h,cut=False,fill=True):
 c=s.c;c.setStrokeColor(LINE);c.setFillColor(PALE if fill else colors.white);c.setLineWidth(.8)
 if cut:c.setDash(3,2)
 c.roundRect(x,y,w,h,4,fill=1,stroke=1);c.setDash()

def star(c,x,y,r=8):
 p=c.beginPath()
 for i in range(10):
  a=math.pi/2+i*math.pi/5;v=r if i%2==0 else r*.43;px=x+v*math.cos(a);py=y+v*math.sin(a)
  if i==0:p.moveTo(px,py)
  else:p.lineTo(px,py)
 p.close();c.drawPath(p,stroke=1,fill=0)

def marks(s,x,y,arcs,stars):
 c=s.c;c.saveState();c.setStrokeColor(INK);c.setLineWidth(1.6)
 for i in range(arcs):
  a=x+(i-(arcs-1)/2)*28;p=c.beginPath();p.moveTo(a-10,y+5);p.curveTo(a-7,y+18,a+7,y+18,a+10,y+5);c.drawPath(p)
 for i in range(stars):star(c,x+(i-(stars-1)/2)*25,y-13)
 c.restoreState()

def part(s,kind,x,y,scale=1):
 c=s.c;c.saveState();c.translate(x,y);c.scale(scale,scale);c.setStrokeColor(INK);c.setFillColor(INK);c.setLineWidth(1.7)
 if kind=='crescent':
  p=c.beginPath();p.moveTo(-24,-13);p.curveTo(-7,17,11,17,26,-14);p.curveTo(18,21,-16,27,-24,-13);c.drawPath(p)
 elif kind=='triangle':
  p=c.beginPath();p.moveTo(0,23);p.lineTo(-26,-18);p.lineTo(26,-18);p.close();c.drawPath(p)
 elif kind in ['single','double']:
  c.circle(0,0,22,stroke=1,fill=0)
  if kind=='double':c.circle(0,0,14,stroke=1,fill=0)
 else:
  c.roundRect(-31,-15,62,30,5,stroke=1,fill=0)
  for dx in [-18,0,18]:
   if kind=='dots':c.circle(dx,0,3,stroke=1,fill=1)
   else:c.line(dx,-10,dx,10)
 c.restoreState()

NAMES={'crescent':('Crescent top','月牙顶部'),'triangle':('Triangle top','三角顶部'),'single':('Single-ring dial','单环刻度盘'),'double':('Double-ring dial','双环刻度盘'),'stripes':('Striped base','条纹底座'),'dots':('Three-dot base','三圆点底座')}
def render(s,name):
 c=s.c
 if name=='cover':
  im=Image.open(Path(__file__).resolve().parents[1]/'public/assets/museum-classroom-v0.1.webp').convert('RGB');im.thumbnail((840,480));b=BytesIO();im.save(b,format='JPEG',quality=92,optimize=True);b.seek(0)
  c.drawImage(ImageReader(b),(s.w-280)/2,s.y-160,280,160,preserveAspectRatio=True,anchor='c');s.y-=175
 elif name=='accession':
  top=s.y;rect(s,s.x,top-69,s.width,69);s.label(s.t('INTAKE TAG','入馆标签'),s.x+12,top-20,11,True);marks(s,s.x+s.width*.66,top-35,*E['targetMarks']);s.geometry('museum-tag',s.x,top-69,s.width,69,marks=E['targetMarks']);s.y-=81
  for identifier,arcs,stars in E['ledger']:
   top=s.y;rect(s,s.x,top-61,s.width,61);s.label(identifier,s.x+12,top-24,12,True);marks(s,s.x+s.width*.66,top-28,arcs,stars)
   s.label(s.t(f'{arcs} arc(s) / {stars} star(s)',f'{arcs}条弧线／{stars}颗星'),s.x+12,top-45,9)
   s.geometry('museum-ledger-row',s.x,top-61,s.width,61,identifier=identifier,arcs=arcs,stars=stars);s.y-=69
 elif name=='gallery':
  w,h=E['caseSlotPt'];gap=12;left=(s.w-(3*w+2*gap))/2;top=s.y
  for i,label in enumerate([s.t('ENTRANCE','入口'),s.t('MIDDLE','中间'),s.t('WINDOW','窗边')]):
   x=left+i*(w+gap);rect(s,x,top-h,w,h);s.label(label,x+w/2,top-24,11,True,'center');s.label(s.t('Place / write case','摆牌或写展柜号'),x+w/2,top-h+18,9,align='center');s.geometry('museum-case-slot',x,top-h,w,h)
  s.y=top-h-16
 elif name=='case-cards':
  w,h=E['caseCardPt'];gap=20;left=(s.w-(3*w+2*gap))/2;top=s.y
  for i,num in enumerate(E['caseCards']):
   x=left+i*(w+gap);rect(s,x,top-h,w,h,True);s.label(s.t(f'CASE {num}',f'{num}号展柜'),x+w/2,top-h/2,19,True,'center');s.geometry('museum-case-card',x,top-h,w,h,number=num)
  s.y=top-h-20
 elif name=='assembly':
  w,h=E['partSlotPt'];gap=8;left=s.x+22;top=s.y
  for i,label in enumerate([s.t('TOP','顶部'),s.t('DIAL / MIDDLE','刻度盘／中部'),s.t('BASE','底座')]):
   y=top-(i+1)*h-i*gap;rect(s,left,y,w,h);s.label(label,left+w/2,y+h-17,9.4,True,'center');s.geometry('museum-part-slot',left,y,w,h,position=i)
  s.para(s.t('Flat paper assembly\n<br/><br/>TOP<br/>↓<br/>DIAL<br/>↓<br/>BASE<br/><br/>Keep every chosen feature linked to its own original slip. Low-cut crews write or draw in the same slots.','平面纸质拼装<br/><br/>顶部<br/>↓<br/>刻度盘<br/>↓<br/>底座<br/><br/>每项特征都指回原卡。少裁剪在同样位置写或画。'),left+w+25,top-12,s.width-w-65,11.2,maxheight=3*h+2*gap-24)
  s.y=top-3*h-2*gap-13
 elif name=='parts':
  w,h=E['partCardPt'];gapx=35;gapy=16;left=(s.w-(2*w+gapx))/2;top=s.y
  for i,kind in enumerate(E['parts']):
   x=left+i%2*(w+gapx);y=top-(i//2+1)*h-i//2*gapy;rect(s,x,y,w,h,True)
   s.label(s.t(*NAMES[kind]),x+w/2,y+h-18,9.5,True,'center');part(s,kind,x+w/2,y+33,.8);s.geometry('museum-part-card',x,y,w,h,feature=kind)
  s.y=top-3*h-2*gapy-17
 elif name=='answer-parts':
  top=s.y;w=(s.width-20)/3;h=85
  for i,kind in enumerate(E['chosenParts']):
   x=s.x+i*(w+10);rect(s,x,top-h,w,h);s.label(s.t(*NAMES[kind]),x+w/2,top-18,9.3,True,'center');part(s,kind,x+w/2,top-53,.65)
  s.y=top-h-14
 elif name=='label':
  for en,zh,h in [('OBJECT NAME','藏品名称',68),('VISIBLE FEATURE','可见特征',88),('IN THIS STORY','故事里的用途',115)]:
   top=s.y;rect(s,s.x,top-h,s.width,h,fill=False);s.label(s.t(en,zh),s.x+12,top-20,11,True)
   for offset in range(42,h-6,24):c.setStrokeColor(LINE);c.line(s.x+12,top-offset,s.x+s.width-12,top-offset)
   s.y=top-h-14
 elif name=='exhibit':
  top=s.y;w=(s.width-12)/2;h=76
  for i,label in enumerate([s.t('ACCESSION ID','藏品编号'),s.t('CASE NUMBER','展柜号')]):
   x=s.x+i*(w+12);rect(s,x,top-h,w,h,fill=False);s.label(label,x+12,top-22,11,True);c.setStrokeColor(LINE);c.line(x+12,top-56,x+w-12,top-56)
  s.y=top-h-18
  s.box(s.t('Arrange on the table / not a full-size mounting frame','桌面摆放示意／不是整页粘贴框'),s.t('Exhibit labels (this page) ＋ completed page7 board and its parts/drawing ＋ authored page11 label. Keep original sources next to the display. Nothing must be glued down.','本页展台铭牌＋已完成第7页拼装板与部件或图画＋第11页自写标签。原证据放在旁边供核查，不需要粘贴。'))
 else:raise ValueError(name)
