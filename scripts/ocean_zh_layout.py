"""Vector-only props, solid response areas, separately dashed cut pages."""
from reportlab.lib import colors
from generate_chinese_free_games import Sheet,INK,LINE,PALE
from ocean_zh_content import EDITION
from ocean_zh_icons import sea_icon,mark

class OceanSheet(Sheet):
 def __init__(self,c,size,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.setting='ocean-classroom';self.role=role;self.number=number;self.prefix='PAOCZH';self.version=EDITION['version'];self.paper='A4' if size[1]>800 else 'Letter'
  c.setFillColor(colors.HexColor('#e5f4fa'));c.rect(0,self.h-33,self.w,33,fill=1,stroke=0)
  self.label('PAPER ADVENTURE／海洋研究船／课堂版 C07',44,self.h-21,9,True)
  c.setStrokeColor(LINE);c.line(44,37,self.w-44,37)
  self.label(('玩家材料' if role=='player' else '教师指南')+f'／简体中文 {self.version}／'+self.paper,44,25,8)
  self.label(f'第{number}页／共{total}页',self.w-44,25,8,align='right')
 def special(self,name,_=None):render(self,name)

def rect(s,x,y,w,h,cut=False):
 c=s.c;c.setStrokeColor(LINE);c.setFillColor(PALE);c.setLineWidth(.8)
 if cut:c.setDash(3,2)
 c.roundRect(x,y,w,h,4,fill=1,stroke=1);c.setDash()

def plot(s,answer=False):
 h=86 if answer else 185;top=s.y;cw=(s.width-12)/3
 for i,name in enumerate(['左侧','中间','右侧']):
  x=s.x+i*(cw+6);y=top-h;rect(s,x,y,cw,h);s.label(name,x+cw/2,top-20,11,True,'center')
  if answer:
   if i==0:
    for j in range(3):sea_icon(s.c,'fish',x+cw/2+(j-1)*36,y+36,.45)
    s.label('3个鱼标记',x+cw/2,y+10,9,align='center')
   else:
    sea_icon(s.c,'reef' if i==1 else 'buoy',x+cw/2,y+36,.55)
    s.label('扇形珊瑚' if i==1 else '条纹浮标',x+cw/2,y+10,9,align='center')
  else:s.label('可以画或写',x+cw/2,y+14,9,align='center')
  s.geometry('ocean-plot-zone',x,y,cw,h,position=name,answer=answer)
 s.y=top-h-15

def render(s,name):
 c=s.c;sw,sh=EDITION['slots']['widthPt'],EDITION['slots']['heightPt'];gap=8
 if name=='cover':
  from pathlib import Path
  from io import BytesIO
  from PIL import Image
  from reportlab.lib.utils import ImageReader
  w=280;h=160
  # Embed a print-resolution JPEG instead of inflating the full-resolution WebP.
  # The original artwork remains unchanged; 216 dpi at the printed cover size.
  im=Image.open(Path(__file__).resolve().parents[1]/'public/assets/ocean-classroom-v0.1.webp').convert('RGB');im.thumbnail((840,480))
  encoded=BytesIO();im.save(encoded,format='JPEG',quality=92,optimize=True);encoded.seek(0)
  c.drawImage(ImageReader(encoded),(s.w-w)/2,s.y-h,w,h,preserveAspectRatio=True,anchor='c');s.y-=h+14
 elif name=='tiles':
  tw,th=sw-12,sh-12;left=s.x+(s.width-2*tw-12)/2;top=s.y
  for i,(label,icon,edges) in enumerate(EDITION['tiles']):
   x=left+i%2*(tw+12);y=top-(i//2+1)*th-i//2*12;rect(s,x,y,tw,th,True)
   s.label(label,x+12,y+th-25,13,True);sea_icon(c,icon,x+tw/2,y+th/2,.85)
   if label=='海藻湾':s.label('北 ↑',x+12,y+14,10,True)
   for edge,shape in edges.items():
    inset=EDITION['markInsetPt'];mx=x+tw/2 if edge in ['top','bottom'] else x+(inset if edge=='left' else tw-inset);my=y+th/2 if edge in ['left','right'] else y+(inset if edge=='bottom' else th-inset)
    mark(c,shape,mx,my);s.geometry('ocean-edge-mark',mx-9,my-9,18,18,tile=[x,y,tw,th],shape=shape)
   s.geometry('ocean-tile',x,y,tw,th,label=label,edges=edges)
  s.y=top-2*th-12-16
 elif name=='board':
  left=s.x+(s.width-2*sw-gap)/2;top=s.y-19
  for col in range(2):s.label('AB'[col],left+col*(sw+gap)+sw/2,top+7,11,True,'center')
  for row in range(2):
   s.label(str(row+1),left-14,top-row*(sh+gap)-sh/2,11,True,'center')
   for col in range(2):
    x=left+col*(sw+gap);y=top-(row+1)*sh-row*gap;rect(s,x,y,sw,sh);s.label('放海图碎片',x+sw/2,y+sh/2,10,align='center');s.geometry('ocean-slot',x,y,sw,sh)
  s.y=top-2*sh-gap-15
 elif name=='frame':
  x=s.x+(s.width-sw)/2;y=s.y-sh;rect(s,x,y,sw,sh,True);s.label('调查框／北 ↑',x+sw/2,y+sh-21,12,True,'center')
  c.setDash(3,2);c.setFillColor(colors.white);c.rect(x+12,y+12,sw-24,sh-44,stroke=1,fill=1);c.setDash();s.label('成人沿内框挖空',x+sw/2,y+sh/2,11,align='center')
  s.geometry('ocean-frame',x,y,sw,sh,window=[x+12,y+12,sw-24,sh-44]);s.y=y-18
 elif name in ['plot','answer-plot']:plot(s,name=='answer-plot')
 elif name=='answer-map':
  s.table(['','A列','B列'],[['第1行','海藻湾','灯塔'],['第2行','航道','珊瑚礁']],{'row_height':30,'ratios':[.2,.4,.4]})
 elif name=='log':
  for tag,statement in [('A','调查格是B2。'),('B','扇形珊瑚的左侧有2个鱼标记。'),('C','条纹浮标在扇形珊瑚的左侧。')]:
   h=128;top=s.y;y=top-h;rect(s,s.x,y,s.width,h)
   s.label(f'抄写记录 {tag}',s.x+12,top-20,11,True);s.para(statement,s.x+12,top-32,s.width-24,11.4)
   s.label('[ ] 核对无误　[ ] 需要修正',s.x+12,top-66,10.5)
   s.label('修正后的说法（如需）：',s.x+12,top-85,10)
   c.setStrokeColor(LINE);c.line(s.x+140,top-89,s.x+s.width-12,top-89)
   s.label('原始来源：',s.x+12,top-111,10);c.line(s.x+75,top-114,s.x+s.width-12,top-114)
   s.geometry('ocean-log-entry',s.x,y,s.width,h,identifier=tag);s.y=y-10
 elif name=='report':
  for i in range(1,3):
   s.box(f'日志修正{i}／只摘要，不重抄整页','原抄写记录编号：________　改了什么：________________<br/>依据的原始材料：________________________________')
 else:raise ValueError(name)
