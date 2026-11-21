from reportlab.lib import colors
NAVY=colors.HexColor("#153A56");SEA=colors.HexColor("#087E91")
LIGHT=colors.HexColor('#DFF3F8')

def mark(c, name, x, y):
    c.saveState()
    c.setStrokeColor(NAVY)
    c.setLineWidth(2)
    if name == "circle":
        c.circle(x, y, 7, fill=0, stroke=1)
    elif name == "square":
        c.rect(x - 7, y - 7, 14, 14, fill=0, stroke=1)
    elif name == "triangle":
        p = c.beginPath(); p.moveTo(x, y + 9); p.lineTo(x - 8, y - 7); p.lineTo(x + 8, y - 7); p.close()
        c.drawPath(p, fill=0, stroke=1)
    else:
        p = c.beginPath(); p.moveTo(x, y + 9); p.lineTo(x - 9, y); p.lineTo(x, y - 9); p.lineTo(x + 9, y); p.close()
        c.drawPath(p, fill=0, stroke=1)
    c.restoreState()


def sea_icon(c, kind, x, y, scale=1):
    c.saveState()
    c.translate(x, y)
    c.scale(scale, scale)
    c.setStrokeColor(SEA)
    c.setFillColor(LIGHT)
    c.setLineWidth(2)
    if kind == "kelp":
        for off in (-19, 0, 19):
            c.line(off, -18, off + 4, 20)
            for dy in (-7, 5, 16):
                c.ellipse(off - 11, dy - 5, off + 2, dy + 3, fill=0, stroke=1)
    elif kind == "light":
        c.rect(-12, -20, 24, 36, fill=0, stroke=1)
        c.line(-18, 16, 18, 16); c.line(-8, 26, 8, 26)
        c.line(-8, 26, -18, 16); c.line(8, 26, 18, 16)
    elif kind == "channel":
        for off in (-15, 0, 15):
            p=c.beginPath(); p.moveTo(-28, off); p.curveTo(-10, off+10, 5, off-10, 28, off)
            c.drawPath(p, fill=0, stroke=1)
    elif kind == "reef":
        c.arc(-29, -14, 29, 10, 0, 180)
        for off in (-18, 0, 18):
            c.line(off, -8, off, 20); c.line(off, 6, off-7, 14); c.line(off, 9, off+7, 17)
    elif kind == "fish":
        c.ellipse(-11,-7,10,7,fill=0,stroke=1)
        p=c.beginPath();p.moveTo(10,0);p.lineTo(21,10);p.lineTo(21,-10);p.close();c.drawPath(p,fill=0,stroke=1)
    elif kind == "buoy":
        c.circle(0,-8,12,fill=0,stroke=1);c.line(0,4,0,24);c.line(-9,9,9,9)
        c.line(-8,-6,8,-6)
    c.restoreState()


