"""Code-native Home v2 layouts. Answer fields are solid; only handouts are dashed."""
from reportlab.lib import colors
from free_game_icons import draw_icon
from home_zh_v2 import EDITION

INK=colors.HexColor('#31536b');LINE=colors.HexColor('#aacdde');PALE=colors.HexColor('#f5fbfd')

def render(s,kind,g):
    c=s.c
    if kind=='home2-letters':
        top=s.y;cw=(s.width-12)/2;h=164
        s.cards([(f'候选信 {a}','') for a,*_ in g['letters']],2,h,cut=False)
        for i,(ident,animal,frame,dots,start) in enumerate(g['letters']):
            rowtop=top-(i//2)*(h+12);cx=s.x+(i%2)*(cw+12)+cw/2;cy=rowtop-50
            c.setStrokeColor(INK);c.setLineWidth(1)
            if frame=='圆形':c.circle(cx,cy,28,stroke=1,fill=0)
            else:c.rect(cx-28,cy-28,56,56,stroke=1,fill=0)
            if animal=='狐狸':
                path=c.beginPath();path.moveTo(cx-17,cy+2)
                for dx,dy in [(-14,18),(-5,10),(5,10),(14,18),(17,2),(0,-15)]:path.lineTo(cx+dx,cy+dy)
                path.close();c.drawPath(path,stroke=1,fill=0)
            else:
                c.circle(cx,cy,17,stroke=1,fill=0);c.circle(cx-7,cy+3,5,stroke=1,fill=0);c.circle(cx+7,cy+3,5,stroke=1,fill=0)
            c.circle(cx-6,cy+1,1.6,stroke=1,fill=0);c.circle(cx+6,cy+1,1.6,stroke=1,fill=0)
            c.setFillColor(INK)
            for d in range(dots):c.circle(cx-(dots-1)*7+d*14,rowtop-88,2.5,fill=1,stroke=0)
            s.para(f'动物：{animal}　印章外框：{frame}<br/>下方实心圆点：{dots}个<br/>路线起点：{start}',cx-cw/2+12,rowtop-103,cw-24,10.2)
            s.geometry('home-letter-stamp',cx-28,cy-28,56,56,identifier=ident,frame=frame,dots=dots)
    elif kind=='home2-route-example':
        top=s.y;h=45;w=(s.width-22)/2
        for i,value in enumerate(['示例卡甲：邮局 → 公园','示例卡乙：公园 → 商店']):
            x=s.x+i*(w+22);c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(x,top-h,w,h,4,fill=1,stroke=1)
            s.label(value,x+w/2,top-24,10.5,align='center')
        s.y=top-h-8;s.text('示例不是本关路线：“到公园”接“从公园”，相同端点才相接。',size=10)
    elif kind=='home2-map':
        h=185;bottom=s.y-h;c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(s.x,bottom,s.width,h,5,fill=1,stroke=1)
        for name,(fx,fy) in EDITION['mapNodes'].items():
            x=s.x+s.width*fx;y=bottom+h*fy;r=19
            c.setStrokeColor(LINE);c.setFillColor(colors.white);c.circle(x,y,r,fill=1,stroke=1)
            s.label(name,x,y-4,10,align='center');s.geometry('home-map-node',x-r,y-r,2*r,2*r,name=name)
        s.y=bottom-14
    elif kind=='home2-labels':
        top=s.y;s.cards([(f'标签 {a}',f'旗色：{colour}<br/>数字：{number}<br/>密码标记：{mark}') for a,colour,stars,number,mark in g['labels']],2,114,cut=False)
        cw=(s.width-12)/2
        for i,(_,colour,stars,_,_) in enumerate(g['labels']):
            x=s.x+(i%2)*(cw+12);y=top-(i//2+1)*114-(i//2)*12
            for j in range(stars):
                c.saveState();c.translate(x+cw-28-j*22,y+37);c.scale(.19,.19);c.setStrokeColor(INK);draw_icon(c,'STAR',0,0);c.restoreState()
            s.label(f'{stars}颗星星',x+cw-15,y+14,9,align='right')
    elif kind=='home2-lookup-example':
        top=s.y;rowh=24;w=min(300,s.width);left=s.x;cw=w/3
        rows=[['示例标记','星星','花朵'],['猫咪','好','来'],['兔子','新','友']]
        for j,row in enumerate(rows):
            for i,value in enumerate(row):
                x=left+i*cw;y=top-(j+1)*rowh
                c.setFillColor(PALE if j==0 or i==0 else colors.white);c.setStrokeColor(LINE);c.rect(x,y,cw,rowh,fill=1,stroke=1)
                s.label(value,x+cw/2,y+8,10,j==0 or i==0,'center')
        s.y=top-len(rows)*rowh-7
        s.text('无关示例：找“猫咪”行，再找“星星”列，交叉格读“好”。实际任务请使用第8页的标记和第10页的表。',size=10)
    elif kind=='home2-message-cells':
        top=s.y;gap=10;cw=(s.width-4*gap)/5;h=80
        for i,name in enumerate(g['symbols']):
            x=s.x+i*(cw+gap);y=top-h;c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(x,y,cw,h,4,fill=1,stroke=1)
            s.label(f'{i+1}／{name}',x+cw/2,top-18,10.2,True,'center')
            side=34;xx=x+(cw-side)/2;yy=y+9;c.setFillColor(colors.white);c.rect(xx,yy,side,side,fill=1,stroke=1)
            s.geometry('home-answer-cell',xx,yy,side,side,index=i+1)
        s.y=top-h-15
    elif kind=='home2-parcels':
        s.cards([(f'包裹 {ident}／全队共用',f'旗色：{colour}<br/>标签数字：{number}<br/>地点：{place}') for ident,colour,number,place in g['parcels']],2,108,cut=False)
    elif kind=='home2-keepsake':
        top=s.y;h=270;c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(s.x,top-h,s.width,h,5,fill=1,stroke=1)
        s.label('画一个共同的送货小队徽章',s.w/2,top-24,12,True,'center');c.setFillColor(colors.white);c.circle(s.w/2,top-144,90,fill=1,stroke=1)
        s.label('可以画、指或口述；不比较画得像不像。',s.w/2,top-h+19,10,align='center');s.y=top-h-15
    else:raise ValueError(kind)
