"""Build the private Celebration Classroom paper-badge game in A4 and Letter.

This is the authoritative C01 source. It deliberately does not change release flags.
"""
from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
ART = ROOT / "public" / "assets" / "celebration-classroom-v0.1.jpg"
NAVY = colors.HexColor("#123653")
INK = colors.HexColor("#31536B")
BLUE = colors.HexColor("#E5F4FA")
PALE = colors.HexColor("#F5FBFD")
LINE = colors.HexColor("#AACDDE")
CORAL = colors.HexColor("#C93525")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("PAArial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("PAArialBold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("PAGeorgia", r"C:\Windows\Fonts\georgia.ttf"))


class Sheet:
    def __init__(self, canvas: Canvas, size, role: str, number: int, total: int):
        self.c, self.w, self.h = canvas, *size
        self.number = number
        self.left = 48
        self.right = self.w - 48
        self.width = self.right - self.left
        self.c.setFillColor(BLUE)
        self.c.rect(0, self.h - 33, self.w, 33, fill=1, stroke=0)
        self.c.setFont("PAArialBold", 8)
        self.c.setFillColor(NAVY)
        self.c.drawString(self.left, self.h - 20, "PAPER ADVENTURE  /  CELEBRATION  /  CLASSROOM")
        self.c.setStrokeColor(LINE)
        self.c.line(self.left, 37, self.right, 37)
        self.c.setFont("PAArial", 8)
        self.c.setFillColor(INK)
        self.c.drawString(self.left, 25, f"{role.upper()}  /  Edition 1.0  /  {'A4' if size == A4 else 'US Letter'}")
        self.c.drawRightString(self.right, 25, f"Page {number} of {total}")
        self.y = self.h - 62

    def text(self, value: str, size=13, leading=None, color=INK, bold=False, width=None, indent=0, after=10):
        leading = leading or size * 1.39
        style = ParagraphStyle("x", fontName="PAArialBold" if bold else "PAArial",
                               fontSize=size, leading=leading, textColor=color)
        p = Paragraph(value, style)
        aw, ah = p.wrap(width or self.width - indent, 1000)
        self.y -= ah
        if self.y < 56:
            raise ValueError(f"Page text overflow: {value[:45]}")
        p.drawOn(self.c, self.left + indent, self.y)
        self.y -= after
        return ah

    def title(self, kicker: str, title: str, deck: str = ""):
        self.text(kicker.upper(), 9, 12, CORAL, True, after=8)
        self.text(title, 25, 29, NAVY, False, after=10)
        if deck:
            self.text(deck, 13, 18, INK, after=15)

    def panel(self, title: str, body: str, height=76, x=None, y=None, width=None,
              font_size=11.2, leading=15.5):
        x = self.left if x is None else x
        width = self.width if width is None else width
        if y is None:
            y = self.y - height
            self.y = y - 12
        if y < 50:
            raise ValueError(f"Panel below printable area on page {self.number}: {title} at y={y:.1f}")
        self.c.setFillColor(PALE)
        self.c.setStrokeColor(LINE)
        self.c.roundRect(x, y, width, height, 9, fill=1, stroke=1)
        self.c.setFillColor(NAVY)
        self.c.setFont("PAArialBold", 11)
        self.c.drawString(x + 13, y + height - 20, title)
        style = ParagraphStyle("panel", fontName="PAArial", fontSize=font_size,
                               leading=leading, textColor=INK)
        p = Paragraph(body, style)
        _, ph = p.wrap(width - 26, height - 31)
        if ph > height - 29:
            raise ValueError(f"Panel overflow: {title}")
        p.drawOn(self.c, x + 13, y + height - 29 - ph)

    def rule(self, label: str, y=None):
        y = self.y if y is None else y
        self.c.setFont("PAArialBold", 11)
        self.c.setFillColor(NAVY)
        self.c.drawString(self.left, y, label)
        self.c.setStrokeColor(LINE)
        self.c.line(self.left, y - 20, self.right, y - 20)
        if y == self.y:
            self.y -= 36

    def finish(self):
        self.c.showPage()


def cut_card(s: Sheet, x, y, w, h, head, body, tag="CUT AROUND BORDER"):
    if y < 50:
        raise ValueError(f"Cut card below printable area: {head}")
    c = s.c
    c.setDash(4, 3)
    c.setStrokeColor(INK)
    c.setFillColor(WHITE)
    c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
    c.setDash()
    c.setFont("PAArialBold", 8)
    c.setFillColor(CORAL)
    c.drawString(x + 10, y + h - 15, tag)
    c.setFillColor(NAVY)
    c.setFont("PAArialBold", 13)
    c.drawString(x + 10, y + h - 36, head)
    style = ParagraphStyle("card", fontName="PAArial", fontSize=11.8, leading=16, textColor=INK)
    p = Paragraph(body, style)
    _, ph = p.wrap(w - 20, h - 49)
    if ph > h - 53:
        raise ValueError(f"Card overflow: {head}")
    p.drawOn(c, x + 10, y + h - 42 - ph)


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


def lines(s: Sheet, labels):
    for label in labels:
        s.rule(label)


def player(c: Canvas, size):
    w, h = size
    # 1: opening. The story art appears exactly once in the entire pack.
    s = Sheet(c, size, "Player Pack", 1, 9)
    s.title("A complete classroom paper game", "The Adventure Club's First Badge",
            "Put a welcome table back together, make a team badge and welcome another crew.")
    image_w = min(330, s.width * .70)
    image_h = image_w * .64
    c.drawImage(str(ART), (w-image_w)/2, s.y-image_h, image_w, image_h,
                preserveAspectRatio=True, anchor="c")
    s.y -= image_h + 18
    s.panel("Your mission", "A gust scattered the Club invitation before the first welcome ceremony. Your crew will rebuild it, set up the table, share badge clues, make one paper badge and check another crew's work.", 88)
    s.text("How to play", 16, 21, NAVY, True, after=5)
    s.text("Work together. Your teacher gives only the pages for the current mission. Point to evidence before moving on. It is fine to ask for a hint.", 12.5, 17.5)
    s.text("You need: this printed pack, a pencil and a clear table. An adult handles scissors. No glue, pin, phone, gift or personal information is needed.", 11.8, 16)
    s.text("Your five discoveries",16,21,NAVY,True,after=7)
    for number,label in [(1,"Rebuild the message"),(2,"Set the welcome table"),(3,"Share the badge clues"),(4,"Make the paper badge"),(5,"Welcome another crew")]:
        s.text(f"<b>{number}.</b>  {label}",12,16,after=3)
    s.finish()

    # 2: jobs and record.
    s = Sheet(c, size, "Player Pack", 2, 9)
    s.title("Before mission 1", "Your team jobs", "Give each person a way to help. Swap jobs after each mission.")
    gap = 12; cw = (s.width-gap)/2; ch = 125
    cards = [
        ("STORY READER", "Read the player mission title and steps. Listen to the adult's story, then invite ideas."),
        ("PROP MOVER", "Move the paper pieces. Ask before changing the group's choice."),
        ("TEAM RECORDER", "Write or draw the result. You may ask an adult to write your words."),
        ("EVIDENCE CHECKER", "Point to the printed clue that supports your group's result."),
    ]
    top = s.y
    for i, (head, body) in enumerate(cards):
        x = s.left+(i%2)*(cw+gap)
        y = top-(i//2+1)*ch-(i//2)*gap
        cut_card(s, x, y, cw, ch, head, body, "JOB CARD  /  CUT OR POINT")
    s.y = top-2*ch-gap-26
    s.text("Keep this team record in the middle", 16, 21, NAVY, True, after=8)
    for label in ["1. Invitation says", "2. Table order, oak to gate", "3. Badge blueprint", "4. Badge made and checked", "5. Another crew said"]:
        s.rule(label)
    s.panel("For a small team", "Two or three players may hold more than one job. With five or six, two people can share Reading or Moving; each must speak or move once before jobs rotate.", 72)
    s.finish()

    # 3: invitation parts. A complete message appears only after assembling all four pieces.
    s = Sheet(c, size, "Player Pack", 3, 9)
    s.title("Mission 1  /  The scattered message", "Rebuild the invitation",
            "The Club's first invitation was blown into four pieces. Match the marks on cut edges to restore it.")
    s.panel("Do this together", "1. Put all four pieces face up.  2. Match identical edge marks where pieces touch.  3. Read the joined message aloud, beginning with the greeting.  4. Record the meeting side and two table clues on page 2.", 87)
    top=s.y; ch=153
    parts=[
        ("FRAGMENT C", "Put the MAP nearest the OAK mark.",{"top":"triangle","right":"diamond"}),
        ("FRAGMENT A", "Welcome, Adventure Club!",{"right":"circle","bottom":"triangle"}),
        ("FRAGMENT D", "The BADGE goes between the MAP and PENCIL.",{"top":"square","left":"diamond"}),
        ("FRAGMENT B", "Meet at the OAK side of the welcome table.",{"left":"circle","bottom":"square"}),
    ]
    for i,(head,body,marks) in enumerate(parts):
        x=s.left+(i%2)*(cw+gap); y=top-(i//2+1)*ch-(i//2)*gap
        cut_card(s,x,y,cw,ch,head,body,"INVITATION PIECE  /  CUT")
        for edge,shape in marks.items():
            mx=x+cw/2 if edge in ("top","bottom") else x+(cw-6 if edge=="right" else 6)
            my=y+ch/2 if edge in ("left","right") else y+(ch-6 if edge=="top" else 6)
            edge_mark(c,shape,mx,my)
    s.y=top-2*ch-gap-25
    s.text("What does your invitation tell you to do at the table?", 13, 18, NAVY, True)
    lines(s,["Meeting side", "First placement clue", "Second placement clue"])
    s.finish()

    # 4: physical ordering, not a route/selection table.
    s=Sheet(c,size,"Player Pack",4,9)
    s.title("Mission 2  /  The welcome table", "Put the supplies in place",
            "Owl has set out three objects, but cannot remember their places. Use your invitation's two clues.")
    s.panel("Do this together", "1. Point to the OAK and GATE ends.  2. Move the three tiles onto the mat, or point to them in low-cut mode.  3. Check both invitation clues.  4. Record the order from OAK to GATE.", 77)
    mat_y=s.y-218
    c.setFillColor(PALE); c.setStrokeColor(LINE)
    c.roundRect(s.left,mat_y,s.width,210,11,fill=1,stroke=1)
    c.setFillColor(NAVY); c.setFont("PAArialBold",12)
    c.drawString(s.left+15,mat_y+179,"OAK END")
    c.drawRightString(s.right-15,mat_y+179,"GATE END")
    slot_gap=11; slot_w=(s.width-50-2*slot_gap)/3
    for i in range(3):
        x=s.left+25+i*(slot_w+slot_gap)
        c.setDash(3,3); c.roundRect(x,mat_y+35,slot_w,110,8,fill=0,stroke=1); c.setDash()
        c.setFont("PAArial",10);c.drawCentredString(x+slot_w/2,mat_y+12,f"SPACE {i+1}")
    s.y=mat_y-22
    tile_y=s.y-112
    for i, (head,body) in enumerate([("PENCIL","A paper pencil tile"),("MAP","A paper map tile"),("BADGE","The blank badge tile")]):
        x=s.left+i*(s.width/3)
        cut_card(s,x+3,tile_y,s.width/3-8,112,head,body,"SUPPLY TILE  /  CUT")
        draw_icon(c,head,x+s.width/6,tile_y+34)
    s.y=tile_y-22
    lines(s,["Order from oak end to gate end"])
    s.panel("Next", "The item in the middle is the Club's unfinished badge. To complete it, each role must bring a different clue.", 63)
    s.finish()

    # 5: information gap. Neither task text nor the later player pages restate the four solutions.
    s=Sheet(c,size,"Player Pack",5,9)
    s.title("Mission 3  /  Four club keepers", "Share the hidden clues",
            "The badge maker cannot see every instruction. Give one clue to each job; read or show it in turn.")
    s.panel("Do this together", "1. Each person reads or points to their own card.  2. The Recorder writes the clue on page 6.  3. The Checker asks where every detail came from.  4. Keep all four cards through Mission 5's peer-check.", 78)
    clues=[
        ("STORY READER", "The badge CENTRE holds a COMPASS."),
        ("PROP MOVER", "Exactly TWO STARS go above the centre."),
        ("TEAM RECORDER", "A BOOK belongs below the centre."),
        ("EVIDENCE CHECKER", "HELPING HANDS sit on BOTH sides of the centre."),
    ]
    top=s.y; ch=159
    for i,(head,body) in enumerate(clues):
        x=s.left+(i%2)*(cw+gap);y=top-(i//2+1)*ch-(i//2)*gap
        cut_card(s,x,y,cw,ch,head,body,"PRIVATE CLUE  /  CUT")
    s.y=top-2*ch-gap-25
    s.text("Two or three players: hold extra cards, but invite every player to explain at least one clue.",11.8,16)
    s.panel("Next", "The blank blueprint on page 6 belongs to your team. Draw or write each clue there before taking the symbol pieces.", 64)
    s.finish()

    # 6: blueprint, intentionally answer-free.
    s=Sheet(c,size,"Player Pack",6,9)
    s.title("Mission 3  /  Team blueprint", "Plan the badge together",
            "Put the clue cards around this blank shape. Write or draw each detail in its place.")
    s.panel("Check before moving on", "Can a different teammate point to the clue for the centre, the top, the bottom and both sides? If not, talk again before opening the symbol pieces.", 64)
    cx=w/2; cy=s.y-180
    c.setStrokeColor(NAVY);c.setLineWidth(1.7)
    c.circle(cx,cy,142,stroke=1,fill=0)
    for name,dx,dy in [("TOP",0,107),("LEFT",-103,0),("CENTRE",0,0),("RIGHT",103,0),("BOTTOM",0,-107)]:
        x=cx+dx;y=cy+dy
        c.setFillColor(PALE);c.setStrokeColor(LINE)
        c.roundRect(x-48,y-27,96,54,7,fill=1,stroke=1)
        c.setFillColor(INK);c.setFont("PAArialBold",10)
        c.drawCentredString(x,y+6,name)
        c.setStrokeColor(LINE);c.line(x-34,y-11,x+34,y-11)
    s.y=cy-164
    lines(s,["Our evidence for the centre", "Our evidence for the top", "Our evidence for both sides", "Our evidence for the bottom"])
    s.finish()

    # 7: cuttable icon bank with decoys; no placement printed.
    s=Sheet(c,size,"Player Pack",7,9)
    s.title("Mission 4  /  The badge workshop", "Choose your symbol pieces",
            "Your blueprint tells you which pieces to use. Some printed pieces do not belong on your badge.")
    s.panel("Do this together", "1. Use the nine symbols below: move cut squares or point in low-cut mode.  2. Choose pieces supported by the four clues.  3. Try them inside the badge circle on page 8.  4. Show a clue for every piece.", 78)
    icons=[("MOON","CRESCENT"),("STAR 1","FIVE POINTS"),("BOOK","OPEN BOOK"),
           ("HANDS LEFT","HELPING HAND"),("KEY","OLD KEY"),("COMPASS","FOUR POINTS"),
           ("FLAG","SMALL FLAG"),("HANDS RIGHT","HELPING HAND"),("STAR 2","FIVE POINTS")]
    iw=(s.width-20)/3; ih=120; top=s.y
    for i,(head,desc) in enumerate(icons):
        x=s.left+(i%3)*iw; y=top-(i//3+1)*ih
        c.setFillColor(PALE);c.setStrokeColor(LINE)
        c.roundRect(x+4,y+4,iw-8,ih-8,7,fill=1,stroke=1)
        c.setFillColor(NAVY);c.setFont("PAArialBold",11)
        c.drawString(x+13,y+ih-22,head)
        c.setFont("PAArial",9.5);c.drawString(x+13,y+ih-39,desc)
        # A 52 pt cut square, including its name, fits the six-piece badge layout.
        token=52; sx=x+iw/2-token/2; sy=y+16
        c.setFillColor(WHITE);c.rect(sx,sy,token,token,fill=1,stroke=0)
        c.setDash(3,2);c.setStrokeColor(INK);c.rect(sx,sy,token,token,fill=0,stroke=1);c.setDash()
        c.saveState();c.translate(x+iw/2,sy+31);c.scale(.58,.58);draw_icon(c,head,0,0);c.restoreState()
        cut_name=head.replace("HANDS LEFT","LEFT HAND").replace("HANDS RIGHT","RIGHT HAND")
        c.setFillColor(NAVY);c.setFont("PAArialBold",7.5)
        assert pdfmetrics.stringWidth(cut_name,"PAArialBold",7.5)<token-4,head
        c.drawCentredString(x+iw/2,sy+4,cut_name)
    s.y=top-3*ih-25
    s.panel("Cut the small squares only", "Each cut square keeps its name. Try six pieces in the badge circle; leave three spare pieces to one side. Then draw or write your final design on the display badge. No glue is needed.", 76)
    s.finish()

    # 8: physical end product with no pre-filled solution.
    s=Sheet(c,size,"Player Pack",8,9)
    s.title("Mission 4  /  Make it real", "Make your team display badge",
            "Use the pieces on page 7 as a temporary model. Then draw or write your final design here.")
    s.text("Adult: cut the outer dotted line. The group may leave the card flat or fold on the centre line to stand it on a table. No pin or glue is needed.",11.5,16)
    x=s.left+20; bw=s.width-40; bh=500; y=s.y-bh-2
    c.setDash(5,4);c.setStrokeColor(INK);c.roundRect(x,y,bw,bh,8,stroke=1,fill=0);c.setDash()
    fold=y+bh/2
    c.setDash(2,3);c.setStrokeColor(CORAL);c.line(x,fold,x+bw,fold);c.setDash()
    c.setFillColor(CORAL);c.setFont("PAArialBold",9);c.drawString(x+8,fold+6,"FOLD LINE")
    c.setFillColor(NAVY);c.setFont("PAGeorgia",17)
    c.drawCentredString(w/2,y+bh-24,"ADVENTURE CLUB")
    centre_y=y+bh-134
    c.setStrokeColor(LINE);c.circle(w/2,centre_y,100,stroke=1,fill=0)
    for label,dx,dy in [("TOP / 2",0,63),("LEFT",-70,0),("CENTRE",0,0),("RIGHT",70,0),("BOTTOM",0,-68)]:
        c.setFillColor(INK);c.setFont("PAArial",10)
        c.drawCentredString(w/2+dx,centre_y+dy+3,label)
    c.setFont("PAArialBold",11);c.setFillColor(NAVY)
    c.setFillColor(PALE);c.rect(x+8,y+13,bw-16,bh/2-27,fill=1,stroke=0)
    c.setFillColor(NAVY);c.setFont("PAArialBold",13)
    c.drawCentredString(w/2,y+bh/2-40,"WE HELP EACH OTHER EXPLORE")
    c.setFont("PAArial",11);c.setFillColor(INK)
    c.drawCentredString(w/2,y+bh/2-66,"Our crew checked every symbol against a clue card.")
    c.drawCentredString(w/2,y+bh/2-88,"This side supports the badge when folded as a table tent.")
    c.setFont("PAArialBold",10)
    c.drawCentredString(w/2,fold-119,"CREW SYMBOL (NO NAMES): ____________________")
    s.finish()

    # 9: a meaningful peer-check rather than a final multiple-choice answer.
    s=Sheet(c,size,"Player Pack",9,9)
    s.title("Mission 5  /  Welcome another crew", "Check and celebrate",
            "Pass badges and all four clue cards to the next group in a circle. With one group, ask your teacher to review.")
    s.panel("How to review", "1. Keep the four clue cards with the badge you receive.  2. For each line below, point to a clue and its matching mark.  3. If something differs, return it for a friendly repair.  4. Tell the makers one thing their team did well.", 94)
    checks=["The centre matches its clue card.","The top matches its clue card, including the number.",
            "The bottom matches its clue card.","Both sides match their clue card."]
    for i,check in enumerate(checks,1):
        s.panel(f"CHECK {i}",f"[   ]  {check}",64)
    s.text("One helpful thing we told the makers:",13,18,NAVY,True)
    s.rule("Our message")
    s.panel("Club welcome", "When the adult says the Club is open, hold up your completed display badge. Each player may finish this sentence: 'I helped our crew by ...' The team may keep it.", 82)
    s.finish()


STAGES=[
    ("1  /  Rebuild the invitation", "Player page 3; four invitation pieces.",
     "The Club gate is ready, but a gust scattered the first invitation across the floor. Owl saved four paper fragments. Put their matching edges together so the crew knows where the welcome table belongs and what to do there.",
     "1. Give all four pieces. Reader finds the greeting; Mover joins matching cut-edge marks without turning the words upside down.<br/>2. Each pupil reads or points to one joined line. Checker asks what each placement line means.<br/>3. Recorder writes OAK side, MAP near OAK, and BADGE between MAP and PENCIL on page 2.",
     "Accept only when the team can show the two placement sentences. Release page 4.",
     ["Which part begins the welcome message?", "Match the circle, triangle, square and diamond marks.", "The OAK side is the meeting side; MAP is nearest OAK; BADGE is between MAP and PENCIL."]),
    ("2  /  Set the welcome table", "Player page 4; three supply tiles.",
     "Owl found a map, a pencil and a blank badge. They must be placed before the visitors arrive, but Owl has forgotten the order. The message you repaired is the only set of placement instructions.",
     "1. Show OAK on the left and GATE on the right; do not place a tile for the crew.<br/>2. Mover tries all three tiles on the mat, or points to them in low-cut mode, while Reader rereads the joined invitation.<br/>3. Checker tests both printed placement clues, then Recorder writes the order from OAK to GATE: MAP, BADGE, PENCIL.",
     "The middle tile is BADGE. Release pages 5-6; do not tell the children the badge symbols.",
     ["Which object must be nearest the OAK?", "What must sit between MAP and PENCIL?", "From OAK to GATE: MAP, BADGE, PENCIL."]),
    ("3  /  Share the badge clues", "Player pages 5-6; four private clue cards.",
     "The welcome table is set, but the badge still has no design. Four Club keepers each remember a different part. No one keeper knows enough to finish it, so the crew must listen to all four before drawing a blueprint.",
     "1. Deal four cards separately by job. With two or three pupils, give extra cards but invite every pupil to contribute.<br/>2. One at a time, each holder reads or points to their own fact. Recorder writes it on page 6; Mover may point to the relevant position.<br/>3. Checker asks the holder to show the card again before approving all five positions.",
     "Blueprint: COMPASS centre; two STARS top; BOOK bottom; HELPING HANDS on both sides. Release pages 7-8.",
     ["Has each clue-card holder spoken?", "Check top, centre, bottom and both sides separately.", "Read the four cards in order; draw each feature on the blank blueprint."]),
    ("4  /  Make the badge", "Player pages 7-8; nine symbol tiles and badge sheet.",
     "The badge workshop opens. Some paper symbols are part of the Club design and others stay spare on the table. Try the pieces on the blank badge, compare them with your blueprint, then make the final marks.",
     "1. Adult gives nine labelled symbol squares, or whole p7 in low-cut mode, and the blank display badge. Mover tries a proposed set inside its circle, or points to symbols, while others compare p6.<br/>2. Checker asks for the clue behind each piece. Choose COMPASS, two STARS, BOOK and both HANDS; MOON, KEY and FLAG stay spare.<br/>3. Children draw or write their design. Adult cuts the badge's outer border; leave flat or fold the centre line. Keep all four clue cards for Mission 5.",
     "Every mark has a supporting clue; no spare symbol is used. Release page 9. Do not fix errors silently; prompt the crew to revisit its own evidence.",
     ["Show me the card behind the first symbol you chose.", "How many STAR pieces belong above the centre?", "Use COMPASS, two STARS, BOOK and the two HANDS pieces in their clue-card positions."]),
    ("5  /  Welcome and peer-check", "Player page 9 and the completed badge.",
     "The Club doors are open. A visiting crew does not judge whose drawing is prettiest; it checks whether every badge mark has a real clue behind it. Make any friendly repairs, then welcome one another into the Adventure Club.",
     "1. Pass each badge with its four clue cards clockwise to the next crew, even with an odd number of crews. If there is only one crew, be its visiting reviewer.<br/>2. Each crew checks one received badge: point to a clue and the matching mark for each of the four checks on page 9.<br/>3. Return badges to their makers. Describe any mismatch; makers repair their own work. Ask for one helpful comment and invite each player to name one contribution.",
     "A completed badge and all four checked features finish the game. Read the closing script below. No score, ranking or final candidate card.",
     ["Which clue card supports the mark you are checking?", "Compare its position and number with the badge.", "Check COMPASS centre, two STARS top, BOOK bottom, HANDS both sides."]),
]

HANDOVERS = [
    "The joined invitation points to the welcome table. Give page 4, its mat and three paper supply tiles.",
    "The table is ready, but the middle badge is blank. Give pages 5-6 and deal one private clue to each job.",
    "Your crew has a blueprint. Open the workshop: give pages 7-8 and the labelled paper symbols.",
    "The display badge is made. Keep all four clue cards with it; give page 9 for another crew's check.",
    "All four features have supporting clues. Return the display badge, read the welcome and let every pupil name a contribution.",
]


def teacher(c: Canvas,size):
    # 1 quick-start, including exact materials.
    s=Sheet(c,size,"Teacher Guide",1,9)
    s.title("Teacher guide  /  start here", "Run the first badge game",
            "A five-mission paper adventure for small classroom crews, guided by an adult.")
    s.panel("Print exactly", "Print pages 1-9 of the Player Pack once per group, single-sided at 100%, in one paper size. Keep this 9-page Teacher Guide on screen or print one copy for yourself. Never hand answer pages to pupils.",85)
    s.text("For each group",16,21,NAVY,True)
    s.text("2-6 pupils, one clear table, one Player Pack, a pencil and an adult to manage release. For 35 pupils, use seven five-person groups: print seven Player Packs (63 sheets). Full-cut mode needs 20 pre-cut pieces per group (140 for seven groups); job cards and the finished badge may be cut later.",12,17)
    s.text("Adult preparation",16,21,NAVY,True)
    for t in ["1. Check that all nine player pages and nine guide pages are present.",
              "2. Full-cut mode: pre-cut four invitation pieces (p3), three supply tiles (p4), four clue cards (p5) and nine labelled symbol squares (p7). Adult scissors only.",
              "3. Sort each group's pages into five piles: p3; p4; p5-6; p7-8; p9. Give p1-2 at the start. Keep later piles hidden.",
              "4. Read the answer and three hints for each mission before class. Page 8 is a desk display badge; leave it flat or fold it to stand. It is not worn."]:
        s.text(t,11.8,16,after=9)
    s.panel("No hidden supplies", "The printable provides every story prop and the final display badge. Bring only ordinary pencils and adult scissors. No glue, pin, costume, prize, phone or student personal details are needed.",79)
    s.finish()

    # 2 physical inventory and release chart.
    s=Sheet(c,size,"Teacher Guide",2,9)
    s.title("Preparation", "Cut, sort and hand out", "Keep the next mission out of sight until the previous result is checked.")
    inventory=[
        ("START", "p1 story; p2 jobs and record", "Give whole; cutting jobs is optional."),
        ("MISSION 1", "p3 four invitation pieces", "Pre-cut; give all four."),
        ("MISSION 2", "p4 mat and three supply tiles", "Pre-cut tiles; keep mat whole."),
        ("MISSION 3", "p5 role clues; p6 blueprint", "Pre-cut; deal clues separately."),
        ("MISSION 4", "p7 symbol squares; p8 badge", "Cut inner squares; badge border later."),
        ("MISSION 5", "p9 peer-check and welcome", "Keep page whole."),
    ]
    for label,parts,action in inventory:
        s.panel(label,parts+"<br/><b>Action:</b> "+action,64,
                font_size=10.8,leading=14.7)
    s.text("Low-cut mode: eight pre-cut pieces per crew",13,18,NAVY,True)
    s.text("Cut only p3's four invitation pieces and p5's four private clue cards. Keep p4 and p7 whole: pupils point instead of moving tiles. Deal the four clue cards separately; never expose the full clue sheet. Pupils still draw on p8.",11.8,16)
    s.finish()

    # 3 group assignment and opening script.
    s=Sheet(c,size,"Teacher Guide",3,9)
    s.title("Before play", "Give everyone a job", "The four jobs are Reader, Mover, Recorder and Checker. Rotate after missions 1-4.")
    assignments=[
        ("2 pupils", "A: Reader + Recorder. B: Mover + Checker. Swap bundles next mission."),
        ("3 pupils", "Reader; Mover; Recorder + Checker. Pass the combined job clockwise."),
        ("4 pupils", "One job each. Pass cards clockwise."),
        ("5 pupils", "Two Readers share player-page steps and each speak; others take one job. Swap pair and jobs."),
        ("6 pupils", "Two Readers and two Movers share real turns; Recorder and Checker are separate. Rotate."),
    ]
    for a,b in assignments:
        s.panel(a,b,65)
    s.text("Read aloud to begin",15,20,NAVY,True)
    s.panel("Opening script", "The Adventure Club's first welcome ceremony starts soon. A gust of wind scattered our invitation, and the badge table is not ready. Your crew has every paper tool it needs. Listen to each other, show where your ideas came from, and we will welcome all crews at the end.",106)
    s.text("The adult reads each story scene. The Reader reads the player page's title and numbered steps. For Mission 5, pass badges and clue cards clockwise, even if there is an odd number of groups; each group checks one received badge.",11.8,16)
    s.finish()

    # 4-8, one stage per guide page, with story, steps, expected result, and 3-tier hints.
    for idx,(title,materials,story,actions,accept,hints) in enumerate(STAGES,1):
        s=Sheet(c,size,"Teacher Guide",idx+3,9)
        s.title(f"Mission {idx}  /  adult only",title,materials)
        s.panel("Read this story aloud",story,91,font_size=12,leading=16.5)
        s.text("Give and guide",15,20,NAVY,True)
        s.text(actions,13,18)
        s.text("Check before the next page",15,20,NAVY,True)
        s.panel("Expected result",accept,110 if idx in (3,4,5) else 91,
                font_size=12,leading=16.5)
        s.text("Three hints - pause after each one",15,20,NAVY,True)
        for n,hint in enumerate(hints,1):
            s.text(f"<b>Hint {n}:</b> {hint}",12.2,17,after=7)
        if idx == 4:
            s.text("<b>Next:</b> Keep all four clue cards with the badge; give page 9 for peer-check.",
                   12.2,17,after=0)
        else:
            s.panel("When ready, say and hand over",HANDOVERS[idx-1],78,
                    font_size=12,leading=16.5)
        s.finish()

    # 9 answer index, accessibility, reset and testing status.
    s=Sheet(c,size,"Teacher Guide",9,9)
    s.title("Teacher reference", "Answers, support and reset", "Keep this page with the adult guide.")
    answers=[
        "1. Joined invitation: meet at OAK; MAP nearest OAK; BADGE between MAP and PENCIL.",
        "2. OAK to GATE order: MAP - BADGE - PENCIL.",
        "3. Badge blueprint: COMPASS centre; exactly two STARS top; BOOK bottom; HELPING HANDS left and right.",
        "4. Use COMPASS, two STAR pieces, BOOK and two HANDS pieces. MOON, KEY and FLAG are spare.",
        "5. Review all four badge features against the separate clue cards, allow repairs and read the welcome.",
    ]
    for answer in answers:
        s.text(answer,11.2,15.7,after=8)
    s.text("Support without changing the answer",14,19,NAVY,True)
    s.text("For early readers, read one sentence at a time and accept pointing or spoken evidence; an adult can write their words. Confident readers can explain why spare symbol pieces do not belong. Never make one group wait for another group's clue.",11.5,16)
    s.text("If a piece goes missing",14,19,NAVY,True)
    s.text("Use the uncut page or reprint only that page. After hint 3, give the mission's outgoing result and continue. The adult can review a lone team's badge instead of requiring another crew.",11.5,16)
    s.text("After class",14,19,NAVY,True)
    s.text("Return reusable pieces to numbered piles. Reprint a fresh Player Pack for the next group. The badge may be kept or recycled according to classroom practice; do not photograph or collect personal details.",11.5,16)
    s.text("Closing line to read aloud",14,19,NAVY,True)
    s.text("Welcome to the Adventure Club. You rebuilt the invitation, set the table, listened to every keeper and made a badge together. Every crew member helped.",11.5,16)
    s.panel("If a crew needs more time", "Pause after Mission 3 with each group's pages and loose pieces together. Resume with the symbol workshop in Mission 4. Check the page-2 record and clue cards before the crew continues.",92)
    s.finish()


def build_paper(paper,size):
    items=[]
    files=[]
    for role,make in (("player",player),("guide",teacher)):
        path=OUT/f"celebration-classroom-{role}-1.0-{paper}.pdf"
        c=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1)
        c.setTitle(f"The Adventure Club's First Badge / {role.title()} / {paper}")
        c.setAuthor("Paper Adventure Workshop")
        make(c,size)
        c.save()
        count=len(PdfReader(str(path)).pages)
        assert count==9,(path,count)
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        items.append(dict(world="celebration",setting="classroom",paper=paper,role=role,
                          path=path.relative_to(ROOT).as_posix(),pages=count,bytes=path.stat().st_size,
                          sha256=sha,r2Key=f"retail/celebration/classroom/1.0/{paper}/{role}-{sha[:16]}.pdf"))
        files.append(path)
    with zipfile.ZipFile(OUT/f"celebration-classroom-{paper}-complete-1.0.zip","w",zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path,path.name)
    return items


def build():
    OUT.mkdir(parents=True,exist_ok=True)
    items=[]
    for paper,size in (("A4",A4),("Letter",letter)):
        items.extend(build_paper(paper,size))
    manifest=OUT/"retail-packs-1.0-manifest.json"
    data=(json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists()
          else {"version":"1.0","items":[]})
    data["items"]=[x for x in data["items"] if (x["world"],x["setting"])!=("celebration","classroom")]+items
    manifest.write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
    print("Celebration Classroom rebuilt:",[(x["paper"],x["role"],x["pages"]) for x in items])


if __name__=="__main__":
    build()

