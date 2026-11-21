"""Chinese labels and puzzle artwork; physical pieces match the English repair."""
from reportlab.lib.units import mm
from space_home_edition_content import E

def render(s,name):
 from space_home_edition_layout import frame,image,glyph,centred_grid,LINE,INK
 c=s.c
 if name in ['cover','cover-small']:image(s,name=='cover-small')
 elif name=='jobs':
  data=[('指挥员','读当前故事与步骤，邀请队友分享每条来源线索，指出现在要做的事，让每人都有参与。'),('工程师','摆放信号纸条、能源和译码条。有搭档时，在同一关内交换摆放与检查。'),('通讯员','每个发现只记一次，复述大家共享的信息，完成最后的依据核验。有搭档时交换记录与复述。'),('核验员','检查连接、信息来源、格子总数与逐字符查找。向成人展示原件，由成人独立核准。')]
  w=(s.width-14)/2;h=153
  for i,x,y in centred_grid(s,4,2,w,h):
   frame(s,x,y,w,h,cut=True,optionalRoleCut=True);s.para(data[i][0],x+12,y+h-12,w-24,12,True,maxheight=35);s.para(data[i][1],x+12,y+h-49,w-24,11.2,leading=16.5,maxheight=h-62)
  s.y-=2*h+14+18
 elif name=='wave-example':
  w=140;h=38;x=(s.w-2*w-16)/2;y=s.y-h
  frame(s,x,y,w,h);frame(s,x+w+16,y,w,h)
  s.label('示例输出：低档',x+10,y+14,11);s.label('示例输入：低档',x+w+26,y+14,11)
  s.y=y-8;s.text('方法示例：这两个档位相同，可以相接。正式纸条还要同时满足底板起点与终点。',size=10.5)
 elif name=='receiver':
  w,h=[v*mm for v in E['waveSlotMm']];gap=5*mm;x=(s.w-3*w-2*gap)/2;top=s.y-28
  s.label('起点：高档',x,s.y-4,11,True);s.label('终点：高档',x+3*w+2*gap,s.y-4,11,True,align='right')
  for i in range(3):
   xx=x+i*(w+gap);y=top-h;frame(s,xx,y,w,h,kind='wave-slot',slot=i+1);s.label(f'第{i+1}格',xx+10,y+h-20,11,True)
   if i<2:s.label('>',xx+w+4,y+h/2,14,True)
  s.y=top-h-22;s.text('每格放一条正向纸条。先读输出，再与下一条的输入比较。',size=11)
 elif name=='waves':
  w,h=[v*mm for v in E['waveMm']];levels={'HIGH':'高档','MID':'中档','LOW':'低档'}
  for i,x,y in centred_grid(s,3,3,w,h,8*mm,0):
   a=E['waves'][i];frame(s,x,y,w,h,cut=True,waveId=a['id']);s.geometry('wave',x,y,w,h,**a)
   s.label('纸条 '+a['id']+'／上方',x+9,y+h-20,11,True)
   for j,line in enumerate(['输入：'+levels[a['in']],'输出：'+levels[a['out']],'频段字：'+a['zh']]):s.label(line,x+9,y+h-46-j*20,11,j<2)
   for j in range(a['marks']):
    yy=y+17+j*9;p=c.beginPath();p.moveTo(x+18,yy);p.curveTo(x+38,yy+8,x+45,yy-8,x+61,yy);p.curveTo(x+77,yy+8,x+88,yy-8,x+w-18,yy);c.setStrokeColor(INK);c.drawPath(p)
  s.y-=h+22
 elif name=='power':
  w=174*mm;rh=29*mm;sw,sh=[v*mm for v in E['cellSlotMm']];x=(s.w-w)/2;top=s.y
  for i,a in enumerate(E['devices']):
   y=top-(i+1)*rh;frame(s,x,y,w,rh,kind='device',deviceId=a['id'],cost=a['cost'])
   s.para(a['zhName']+f"／需要{a['cost']}块",x+8,y+rh-10,66*mm,11.5,True,maxheight=30)
   s.para(a['zhPurpose'],x+8,y+rh-40,62*mm,10.7,maxheight=35)
   for j in range(a['cost']):frame(s,x+74*mm+j*(sw+2*mm),y+2.5*mm,sw,sh,kind='cell-slot',deviceId=a['id'],slot=j+1)
  s.y=top-5*rh-20;s.text('设备填满才工作。合计只能有六个已填能源格，其余格子留空。',size=11)
 elif name=='cells':
  w,h=[v*mm for v in E['cellMm']]
  for i,x,y in centred_grid(s,6,3,w,h,15*mm,12*mm):
   frame(s,x,y,w,h,cut=True,cellId=i+1);s.geometry('cell',x,y,w,h,cellId=i+1);s.label(f'能源 {i+1}',x+w/2,y+h-20,11.5,True,align='center');s.label('1份',x+w/2,y+12,11,align='center')
  s.y-=2*h+12*mm+20
 elif name=='calibration':
  w=170*mm;cw=w/3;x=(s.w-w)/2;top=s.y
  fields=[('频段',['低频段','中频段','高频段']),('设置编号',['1','2','3']),('天线标记',['圆形','三角形','星形'])]
  for col,(title,values) in enumerate(fields):
   xx=x+col*cw;s.label(title,xx+6,top-14,11.5,True)
   for row,v in enumerate(values):
    yy=top-35-(row+1)*66;frame(s,xx+3,yy,cw-9,58,kind='control-option',field=title,value=v);s.label(v,xx+12,yy+22,11.5,True)
  s.y=top-35-3*66-20;s.text('分享完三张来源线索后，每列只圈一个选项。',size=11)
 elif name=='clues':
  data=[('指挥员／频段','看排好的信号纸条，按顺序读它们的“频段字”。'),('工程师／设置编号','数一条纸条上的波纹。只数一条，不把三条相加。'),('核验员／天线标记','比较下方的天线图形与设置板上的图形名称。')]
  w=52*mm;h=64*mm
  for i,x,y in centred_grid(s,3,3,w,h,8*mm,0):
   frame(s,x,y,w,h,cut=True,clue=i+1);s.para(data[i][0],x+10,y+h-12,w-20,11.1,True,maxheight=34);s.para(data[i][1],x+10,y+h-53,w-20,11,leading=16.3,maxheight=76)
   if i==2:
    cx=x+w/2;cy=y+30;p=c.beginPath();p.moveTo(cx,cy-12);p.lineTo(cx-18,cy+19);p.lineTo(cx+18,cy+19);p.close();c.setStrokeColor(INK);c.setLineWidth(1.7);c.drawPath(p)
  s.y-=h+20
 elif name=='lookup-example':
  s.box('无关示例／只演示查找方法','示例对照：正方形＝木，圆形＝水，三角形＝火。收到圆形，就找对照表中的圆形，再取“水”；位置不同也一样。这些不是正式游戏的图标或答案。')
 elif name=='decoder':
  labels=E['symbolLabelsZh'];w=170*mm;x=(s.w-w)/2;cw=w/5;h=105;top=s.y
  s.label('收到的图标／按这一行的顺序填写',x,top-4,11.5,True);y=top-h-26
  for i,ident in enumerate(E['messageSymbols']):
   xx=x+i*cw;frame(s,xx+2,y,cw-4,h,kind='received-slot',index=i+1,symbol=ident);glyph(s,ident,xx+cw/2,y+h*.56);s.label(labels[ident],xx+cw/2,y+9,10.8,True,align='center');s.label(f'{i+1}: ____',xx+cw/2,y-19,11,align='center')
  keytop=y-61;s.label('固定对照表／所选译码条放在这行下方',x,keytop,11,True);ky=keytop-h-22
  for i,ident in enumerate(E['keySymbols']):
   xx=x+i*cw;frame(s,xx+2,ky,cw-4,h,kind='key-slot',column=i+1,symbol=ident);glyph(s,ident,xx+cw/2,ky+h*.56);s.label(labels[ident],xx+cw/2,ky+9,10.8,True,align='center');s.label(str(i+1),xx+cw/2,ky+h+6,9,align='center')
  codeh=E['codeMm'][1]*mm;guidey=ky-codeh-13;frame(s,x,guidey,w,codeh,kind='code-alignment-slot');s.label('左边对齐／所选译码条正向放置',x+7,guidey+codeh-17,10.5,True)
  for i in range(6):
   xx=x+i*cw;c.setStrokeColor(LINE);c.line(xx,ky,xx,guidey+codeh);c.line(xx,guidey+codeh,xx,guidey+codeh-5)
  s.geometry('key-columns',x,ky,w,h,centres=[x+(i+.5)*cw for i in range(5)])
  s.y=guidey-24;s.text('逐个找相同的对照图标，再读取其下方字符。最后按收到的顺序，把五格连成请求。',size=11)
 elif name=='codes':
  w,h=[v*mm for v in E['codeMm']];x=(s.w-w)/2;top=s.y;gap=23;cw=w/5
  for j,(code,values) in enumerate(E['codeRowsZh']):
   y=top-(j+1)*h-j*gap;frame(s,x,y,w,h,cut=True,code=code);s.geometry('code',x,y,w,h,code=code,values=values,centres=[x+(i+.5)*cw for i in range(5)])
   s.label(f'译码条 {code}／上方／左边缘',x+7,y+h-17,10.5,True)
   for i,v in enumerate(values):s.label(v,x+(i+.5)*cw,y+15,16,True,align='center');s.label(str(i+1),x+(i+.5)*cw,y+h-31,7.5,align='center')
   for i in range(6):
    xx=x+i*cw;c.setStrokeColor(LINE);c.line(xx,y+h,xx,y+h-5)
  s.y=top-3*h-2*gap-20
 elif name=='transmission':
  s.table(['展示原件','一起核对，再打勾'],[
    ['圈好的设置板＋记录第1、3行','每个设置都有来源线索。［　］'],['译好的消息＋所选译码条','每次查找都对应正确的列。［　］'],
    ['实际摆好的发送设备底板','设备用途正确、格子填满，总共六块。［　］'],['下方摆放的信号卡','数量来自实际译出的请求。［　］']],{'ratios':[.48,.52],'row_height':54})
  s.text('信号格／从第1格开始摆，未用卡留在格外。',size=11,bold=True)
  w,h=[v*mm for v in E['pulseSlotMm']];gap=6*mm;x=(s.w-5*w-4*gap)/2;y=s.y-h
  for i in range(5):frame(s,x+i*(w+gap),y,w,h,kind='pulse-slot',slot=i+1);s.label(str(i+1),x+i*(w+gap)+7,y+h-15,9,True)
  s.y=y-22;s.text('成人：实际设备状态、全部原始依据和信号数量一致后才核准。修正后要复查，然后读私用回应。',size=11)
 elif name=='pulses':
  w,h=[v*mm for v in E['pulseMm']]
  for i,x,y in centred_grid(s,5,5,w,h,8*mm,0):
   frame(s,x,y,w,h,cut=True,pulse=i+1);s.geometry('pulse',x,y,w,h,pulse=i+1);s.label(f'信号 {i+1}',x+w/2,y+h-17,10.3,True,align='center');s.label('1次',x+w/2,y+10,10,align='center')
  s.y-=h+20
 elif name=='keepsake':
  h=310;frame(s,s.x,s.y-h,s.width,h);s.label('画一画，或讲一段回忆',s.x+12,s.y-23,12,True);s.y-=h+20
 else:raise ValueError(name)
