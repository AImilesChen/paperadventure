"""Chinese physical props; original fictional IDs and seal drawing are retained."""
from pathlib import Path
from io import BytesIO
from PIL import Image
from reportlab.lib.utils import ImageReader
from space_home_edition_layout import SpaceSheet,frame,INK,LINE
from forest_post_office import draw_acorn,ResidentFoldCards

class ForestZhSheet(SpaceSheet):
 def __init__(self,c,size,role,number,total):
  self.c=c;self.w,self.h=size;self.x=44;self.width=self.w-88;self.y=self.h-61
  self.locale='zh';self.zh=True;self.role=role;self.number=number;self.setting='forest-home';self.prefix='PAFORESTZH';self.paper='A4' if size[1]>800 else 'Letter'
  self.label('PAPER ADVENTURE／森林世界／家庭版 H04',44,self.h-24,8.3,True)
  c.setStrokeColor(LINE);c.line(44,37,self.w-44,37)
  self.label(('玩家材料' if role=='player' else '成人主持指南')+'／简体中文 1.0-zh.1／'+self.paper,44,25,8)
  self.label(f'第{number}页／共{total}页',self.w-44,25,8,align='right')
 def special(self,name):render(self,name)

def grid(s,n,h,gap=10,cols=2,gapy=None):
 w=(s.width-(cols-1)*gap)/cols
 gy=gap if gapy is None else gapy
 for i in range(n):yield i,s.x+(i%cols)*(w+gap),s.y-(i//cols+1)*h-(i//cols)*gy,w,h

def render(s,name):
 c=s.c
 if name=='cover':
  p=Path(__file__).resolve().parents[1]/'public/assets/forest.png';im=Image.open(p).convert('RGB');im.thumbnail((900,675));b=BytesIO();im.save(b,format='JPEG',quality=86);w=270;h=185;c.drawImage(ImageReader(BytesIO(b.getvalue())),(s.w-w)/2,s.y-h,w,h);s.y-=h+15
 elif name=='jobs':
  data=[('分拣员','读规则，分拣邮件，解释哪些邮件必须留下。'),('标签修复员','整理标签依据，写或口述结果，保管原始表格。'),('投递员','搬邮件、装邮袋、逐户提问，把包裹交给确认的住户。'),('核验员','核对实际操作，指出依据，向成人展示并请其验收。')]
  for i,x,y,w,h in grid(s,4,166):
   frame(s,x,y,w,h,cut=True,prop='job',id=i);s.para(data[i][0],x+12,y+h-15,w-24,12,True,maxheight=25);s.para(data[i][1],x+12,y+h-55,w-24,11.2,maxheight=90)
  s.y-=352
 elif name=='progress':
  labels=[('1／分拣','可投递：____　待修复：____　暂缓：____<br/>包裹编号：____'),('2／标签','展示第10页修复标签。成人核准：____'),('3／邮袋','展示第12页原交接单。成人核准：____'),('4／住户','展示第14页访谈与补好的标签。核准：____'),('5／签收','展示第17页签名、盖章的签收板。核准：____')]
  for i,(a,b) in enumerate(labels):
   y=s.y-(i+1)*75;frame(s,s.x,y,s.width,75,kind='progress');s.para(a,s.x+10,y+58,95,11,True,maxheight=48);s.para(b,s.x+112,y+59,s.width-124,11,maxheight=56)
  s.y-=390
 elif name=='sort':
  for i,t in enumerate(['可投递／封口完整，地址清楚','待修复／封口完整，地址模糊','暂缓处理／封口破损，交成人后续处理']):
   y=s.y-(i+1)*99;frame(s,s.x,y,s.width,99,kind='tray');s.para(t,s.x+12,y+85,s.width-24,11.3,True,maxheight=34)
  s.y-=313
 elif name=='mail':
  data=[('A／信','蓝树 3号／上午','地址清楚／封口完整／普通件'),('B／P17包裹','地址被雨水弄模糊／上午','图案封口完整／优先件'),('C／信','池塘 6号／上午','地址清楚／封口破损／普通件'),('D／信','池塘 7号／下午','地址清楚／封口完整／普通件'),('E／包裹','苔藓巷 3号／上午','地址模糊／封口破损／普通件'),('F／信','苔藓巷 ?号／下午','地址模糊／封口完整／普通件')]
  for i,x,y,w,h in grid(s,6,150,18,gapy=8):
   frame(s,x,y,w,h,cut=True,prop='mail',id='ABCDEF'[i]);s.para(data[i][0],x+11,y+h-12,w-22,11.5,True,maxheight=20);s.para(data[i][1],x+11,y+h-39,w-22,10.6,maxheight=20);s.para(data[i][2],x+11,y+h-62,w-22,10.1,maxheight=22)
   ix=x+w-80;iy=y+16;c.setStrokeColor(INK);c.setLineWidth(1.3)
   if i in [1,4]:
    c.rect(ix,iy,66,44,stroke=1,fill=0);c.line(ix,iy+44,ix+33,iy+53);c.line(ix+66,iy+44,ix+33,iy+53)
   else:
    c.rect(ix,iy,66,42,stroke=1,fill=0);c.line(ix,iy+42,ix+33,iy+20);c.line(ix+66,iy+42,ix+33,iy+20)
   if i==1:draw_acorn(c,ix+33,iy+24,.85)
   elif i in [2,4]:
    p=c.beginPath();p.moveTo(ix+44,iy+51)
    for a,b in [(48,42),(44,35),(52,29),(47,20),(54,13)]:p.lineTo(ix+a,iy+b)
    c.drawPath(p)
   else:c.circle(ix+33,iy+23,8,stroke=1,fill=0)
   for j in range(3):c.line(x+15,y+20+j*11,x+49-j*5,y+20+j*11)
   if i in [1,4,5]:
    for j in range(3):c.line(x+22+j*9,y+17+j*11,x+28+j*9,y+24+j*11)
  s.y-=482
 elif name=='clues':
  data=[('P17／片区线索','与邮件A在同一片区。','找到已分拣的A，读它的地址。'),('P17／门牌线索','门牌比邮件A大1。','找到A上的数字，再加1。'),('P17／标记线索','照B上的图案封口填写。','指认或描述图案；印出的文字没有给出名称。'),('P18／片区线索','苔藓巷','包裹编号不同，把这张线索放到一旁。')]
  for i,x,y,w,h in grid(s,4,168):
   frame(s,x,y,w,h,cut=True,prop='clue',id=i);s.para(data[i][0],x+11,y+h-13,w-22,11.6,True,maxheight=24);s.para(data[i][1],x+11,y+h-51,w-22,11.2,maxheight=40);s.para(data[i][2],x+11,y+h-101,w-22,10.6,maxheight=50)
  s.y-=363
 elif name=='label':
  h=300;y=s.y-h;frame(s,s.x,y,s.width,h,cut=True,prop='replacement-label');s.para('P17／修复后的投递标签',s.x+17,s.y-16,s.width-34,13,True,maxheight=24)
  for i,t in enumerate(['片区','门牌','封口标记','收件人']):
   yy=s.y-77-i*54;s.label(t,s.x+18,yy,11.5,True);c.setStrokeColor(LINE);c.line(s.x+125,yy-3,s.x+s.width-20,yy-3)
  s.label('第二关核准后，由成人只剪外框。',s.x+18,y+22,10.3);s.y=y-18
 elif name=='bag':
  w=(s.width-8)/2;h=184
  for i,t in enumerate(['第1格／优先件','第2格／普通件']):
   x=s.x+i*(w+8);y=s.y-h;frame(s,x,y,w,h,kind='bag-slot',slot=i+1);s.para(t,x+10,s.y-13,w-20,11.6,True,maxheight=25);s.para('每格放一件剪好的邮件。',x+10,s.y-43,w-20,10.4,maxheight=25)
  s.y-=h+14
 elif name=='notes':
  for i,t in enumerate(['猫头鹰家','狐狸家','河狸家']):
   y=s.y-(i+1)*80;frame(s,s.x,y,s.width,80,kind='interview-note',household=t);s.para(t+'：种类____　编号____　封口____',s.x+12,y+64,s.width-24,11.2,maxheight=28)
  s.y-=255
 elif name=='actors':
  data=[('猫头鹰家','OWL HOUSE','包裹','P17','橡果'),('狐狸家','FOX DEN','信','L06','月亮'),('河狸家','BEAVER HUT','包裹','P18','松树')]
  for i,x,y,w,h in grid(s,3,195,12):
   a,en,typ,ident,mark=data[i];frame(s,x,y,w,h,cut=True,prop='resident',household=a)
   s.label(a,x+11,y+h-21,12,True);s.label('正面／给投递员看',x+11,y+h-42,10.6);s.label('蓝树院落／4号',x+11,y+h-61,10.6);s.label('下半张沿中线向后折。',x+11,y+h/2+10,10)
   c.saveState();c.setStrokeColor(INK);c.setDash(2,2);c.line(x+7,y+h/2,x+w-7,y+h/2);c.restoreState();c.setStrokeColor(INK);ResidentFoldCards._draw_house(c,x+w-52,y+h/2+18,en)
   for j,t in enumerate(['私密／扮演者朗读','种类：'+typ,'编号：'+ident,'封口标记：'+mark]):s.label(t,x+11,y+h/2-18-j*20,10.6,j==0)
  x=s.x+(s.width+12)/2+((s.width-12)/2-132)/2;y=s.y-2*195-12+34;frame(s,x,y,132,58,cut=True,prop='stamp');s.label('已送达',x+66,y+32,13,True,align='center');s.label('纸质章／剪一个',x+66,y+13,10,align='center');s.y-=424
 elif name=='delivery':
  titles=['把原P17包裹与标签放在本板旁','签收住户（虚构）：________________','住户签名／画虚构记号：________________','把“已送达”纸章放在这里']
  for i,t in enumerate(titles):
   y=s.y-(i+1)*80;frame(s,s.x,y,s.width,80,kind='delivery-row',row=i+1);s.para(t,s.x+12,y+65,s.width-24,11.2,maxheight=32)
  s.y-=335
 else:raise ValueError(name)
 assert s.y>=49,('forest special overflow',s.number,name,s.y)
