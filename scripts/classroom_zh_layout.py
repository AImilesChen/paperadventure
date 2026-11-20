"""Physical classroom props. Units are shared by A4 and Letter, never scaled."""
from reportlab.lib import colors
from reportlab.lib.units import mm
from free_game_icons import draw_icon

LINE=colors.HexColor('#aacdde');PALE=colors.HexColor('#f5fbfd');INK=colors.HexColor('#31536b');CORAL=colors.HexColor('#b83525')

def render(s,kind,g):
    c=s.c;physical=g['physical']
    if kind=='class-match-example':
        top=s.y;w=155;h=65;gap=18;x=s.w/2-w-gap/2
        for i,name in enumerate(['示例甲','示例乙']):
            xx=x+i*(w+gap);y=top-h
            c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(xx,y,w,h,4,fill=1,stroke=1)
            s.label(name,xx+w/2,top-22,11,True,'center')
            sx=xx+w-16 if i==0 else xx+16
            c.saveState();c.translate(sx,y+24);c.scale(.3,.3);draw_icon(c,'STAR',0,0);c.restoreState()
        s.y=top-h-15
    elif kind=='class-invitation':
        s.cards([(f'1／邀请函碎片 {p["id"]}',p['text']) for p in g['invitation']],2,150,marks=[p['edges'] for p in g['invitation']])
    elif kind=='class-invitation-answer':
        top=s.y;h=32;w=140;x=s.w/2-w
        for i,(name,label) in enumerate([('A','欢迎句'),('B','集合端'),('C','地图线索'),('D','徽章线索')]):
            xx=x+(i%2)*w;y=top-(i//2+1)*h
            c.setFillColor(PALE);c.setStrokeColor(LINE);c.rect(xx,y,w,h,fill=1,stroke=1)
            s.label(name+'／'+label,xx+w/2,y+11,11,True,'center')
        s.y=top-h*2-12
    elif kind=='class-mat':
        h=170;y=s.y-h;w=physical['slotWidthMm']*mm;hh=physical['slotHeightMm']*mm;gap=3*mm
        left=s.x+(s.width-(3*w+2*gap))/2
        c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(s.x,y,s.width,h,5,fill=1,stroke=1)
        s.label('橡树端',s.x+14,y+h-22,11,True);s.label('大门端',s.x+s.width-14,y+h-22,11,True,'right')
        for i in range(3):
            x=left+i*(w+gap);c.setDash(3,3);c.rect(x,y+25,w,hh,stroke=1,fill=0);c.setDash()
            s.label(f'位置{i+1}',x+w/2,y+11,10,align='center')
            s.geometry('table-slot',x,y+25,w,hh)
        s.y=y-16
    elif kind=='class-supplies':
        top=s.y;w=physical['supplyWidthMm']*mm;h=physical['supplyHeightMm']*mm;gap=12*mm
        left=s.x+(s.width-(3*w+2*gap))/2
        for i,(name,icon) in enumerate(zip(g['supplies'],['PENCIL','MAP','BADGE'])):
            x=left+i*(w+gap);y=top-h
            c.setFillColor(PALE);c.setStrokeColor(LINE);c.setDash(3,2);c.roundRect(x,y,w,h,4,fill=1,stroke=1);c.setDash()
            s.label('2／道具卡／'+name,x+w/2,top-19,10.2,True,'center')
            c.saveState();c.translate(x+w/2,y+31);c.scale(.7,.7);draw_icon(c,icon,0,0);c.restoreState()
            s.geometry('supply-card',x,y,w,h)
        s.y=top-h-18
    elif kind=='class-calibration':
        x=s.x;y=s.y-22;w=50*mm
        c.setStrokeColor(INK);c.setLineWidth(.8);c.line(x,y,x+w,y);c.line(x,y-5,x,y+5);c.line(x+w,y-5,x+w,y+5)
        s.label('50毫米参考线',x+w/2,y+11,10,align='center');s.geometry('calibration',x,y,w,0);s.y=y-22
    elif kind=='class-blueprint':
        cx=s.w/2;cy=s.y-144;c.setStrokeColor(LINE);c.circle(cx,cy,135,fill=0,stroke=1)
        for name,dx,dy in [('上方',0,97),('左侧',-94,0),('中央',0,0),('右侧',94,0),('下方',0,-97)]:
            c.setFillColor(PALE);c.rect(cx+dx-39,cy+dy-24,78,48,fill=1,stroke=1)
            s.label(name,cx+dx,cy+dy+4,11,align='center');c.line(cx+dx-25,cy+dy-12,cx+dx+25,cy+dy-12)
        s.y=cy-157
    elif kind=='class-tokens':
        top=s.y;cw=s.width/3;h=112;token=physical['symbolSizePt']
        for i,(icon,name) in enumerate(g['tokens']):
            x=s.x+(i%3)*cw;y=top-(i//3+1)*h
            c.setFillColor(PALE);c.setStrokeColor(LINE);c.roundRect(x+3,y+3,cw-6,h-6,4,fill=1,stroke=1)
            s.label(name,x+cw/2,y+h-20,10.5,True,'center')
            sx=x+cw/2-token/2;sy=y+13;c.setFillColor(colors.white);c.rect(sx,sy,token,token,fill=1,stroke=0)
            c.setDash(3,2);c.rect(sx,sy,token,token,fill=0,stroke=1);c.setDash()
            c.saveState();c.translate(x+cw/2,sy+31);c.scale(.58,.58);draw_icon(c,icon,0,0);c.restoreState()
            s.label(name,x+cw/2,sy+4,7.5,True,'center');s.geometry('symbol-square',sx,sy,token,token)
        s.y=top-3*h-15
    elif kind=='class-badge':
        bh=350;bw=s.width-34;x=s.x+17;y=s.y-bh;cy=y+bh-150;r=physical['badgeRadiusPt']
        assert y>=49,('badge outside printable area',y)
        c.setStrokeColor(INK);c.setDash(4,3);c.roundRect(x,y,bw,bh,6,stroke=1,fill=0);c.setDash()
        s.label('冒险俱乐部',s.w/2,y+bh-28,17,True,'center');c.setStrokeColor(LINE);c.circle(s.w/2,cy,r,stroke=1,fill=0)
        for lab,dx,dy in [('上方',0,68),('左侧',-68,0),('中央',0,0),('右侧',68,0),('下方',0,-68)]:s.label(lab,s.w/2+dx,cy+dy+3,9,align='center')
        s.label('本组符号：________________',s.w/2,y+53,11,True,'center')
        s.label('我们互相帮助，一起探索',s.w/2,y+22,11,align='center')
        s.geometry('badge-circle',s.w/2-r,cy-r,2*r,2*r);s.y=y-15
    elif kind=='class-review-table':
        s.table(['检查项目','初查符合','需调整','具体要改什么','修正后复查'],[
          ['中央图案有原卡支持','[　]','[　]','____________','[　]'],
          ['上方图案及数量有原卡支持','[　]','[　]','____________','[　]'],
          ['下方图案有原卡支持','[　]','[　]','____________','[　]'],
          ['左右两侧均有原卡支持','[　]','[　]','____________','[　]']],
          {'row_height':57,'ratios':[.33,.12,.12,.25,.18]})
    elif kind=='class-reflection':
        h=125;y=s.y-h;c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(s.x,y,s.width,h,5,fill=1,stroke=1);s.y=y-14
    else:raise ValueError('Unknown classroom component: '+kind)
