"""Existing printable vector symbols, shared by the independent Chinese renderer."""
from reportlab.lib import colors
NAVY=colors.HexColor("#123653")
PALE=colors.HexColor("#f5fbfd")
WHITE=colors.white

def edge_mark(c, shape, x, y):
    c.setStrokeColor(NAVY)
    c.setLineWidth(1.5)
    if shape == "circle":
        c.circle(x,y,8,stroke=1,fill=0)
    elif shape == "square":
        c.rect(x-8,y-8,16,16,stroke=1,fill=0)
    elif shape == "triangle":
        p=c.beginPath();p.moveTo(x,y+9);p.lineTo(x-9,y-8);p.lineTo(x+9,y-8);p.close()
        c.drawPath(p,stroke=1,fill=0)
    else:
        p=c.beginPath();p.moveTo(x,y+10);p.lineTo(x-10,y);p.lineTo(x,y-10);p.lineTo(x+10,y);p.close()
        c.drawPath(p,stroke=1,fill=0)

def draw_icon(c, kind, x, y):
    c.setStrokeColor(NAVY);c.setFillColor(PALE);c.setLineWidth(2)
    if kind.startswith("STAR"):
        import math
        p=c.beginPath()
        for i in range(10):
            a=math.pi/2+i*math.pi/5
            r=23 if i%2==0 else 10
            px=x+math.cos(a)*r;py=y+math.sin(a)*r
            (p.moveTo if i==0 else p.lineTo)(px,py)
        p.close();c.drawPath(p,stroke=1,fill=1)
    elif kind=="COMPASS":
        c.circle(x,y,24,stroke=1,fill=0)
        c.line(x-17,y,x+17,y);c.line(x,y-17,x,y+17)
        p=c.beginPath();p.moveTo(x,y+23);p.lineTo(x-6,y+8);p.lineTo(x+6,y+8);p.close();c.drawPath(p,stroke=1,fill=1)
    elif kind=="BOOK":
        p=c.beginPath();p.moveTo(x,y-18);p.lineTo(x-23,y-13);p.lineTo(x-23,y+17)
        p.lineTo(x,y+11);p.lineTo(x+23,y+17);p.lineTo(x+23,y-13);p.close();c.drawPath(p,stroke=1,fill=1)
        c.line(x,y-18,x,y+11)
    elif kind.startswith("HANDS"):
        direction=-1 if kind.endswith("LEFT") else 1
        c.roundRect(x-20,y-9,40,18,7,stroke=1,fill=1)
        for offset in (-10,-3,4,11): c.line(x+offset,y+8,x+offset+direction*3,y+22)
    elif kind=="MOON":
        c.circle(x,y,22,stroke=1,fill=0);c.setFillColor(WHITE);c.circle(x+10,y+7,20,stroke=0,fill=1)
    elif kind=="KEY":
        c.circle(x-10,y+8,10,stroke=1,fill=0);c.line(x-3,y,x+22,y-21)
        c.line(x+17,y-16,x+22,y-10)
    elif kind=="FLAG":
        c.line(x-18,y-23,x-18,y+25)
        p=c.beginPath();p.moveTo(x-18,y+23);p.lineTo(x+21,y+16);p.lineTo(x-18,y+5);p.close();c.drawPath(p,stroke=1,fill=1)
    elif kind=="MAP":
        c.rect(x-24,y-17,48,34,stroke=1,fill=0);c.line(x-8,y-17,x-8,y+17);c.line(x+8,y-17,x+8,y+17)
    elif kind=="BADGE":
        c.circle(x,y+2,21,stroke=1,fill=0);c.line(x-10,y-17,x-16,y-31);c.line(x+10,y-17,x+16,y-31)
    elif kind=="PENCIL":
        c.saveState();c.translate(x,y);c.rotate(45);c.rect(-5,-27,10,52,stroke=1,fill=0)
        p=c.beginPath();p.moveTo(-5,-27);p.lineTo(0,-36);p.lineTo(5,-27);p.close();c.drawPath(p,stroke=1,fill=0);c.restoreState()
