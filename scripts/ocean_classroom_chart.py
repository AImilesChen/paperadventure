"""Build the C07 paper-chart expedition in A4 and US Letter.

This is the authoritative Ocean Classroom PDF source. It updates only C07
files and the four C07 manifest entries; it does not publish a release.
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
ART = ROOT / "public" / "assets" / "ocean-classroom-v0.1.webp"
NAVY = colors.HexColor("#153A56")
INK = colors.HexColor("#31566A")
SEA = colors.HexColor("#087E91")
LIGHT = colors.HexColor("#DFF3F8")
PALE = colors.HexColor("#F3FAFC")
LINE = colors.HexColor("#A5CBD7")
CORAL = colors.HexColor("#B73927")
WHITE = colors.white

pdfmetrics.registerFont(TTFont("OceanArial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("OceanArialBold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("OceanGeorgia", r"C:\Windows\Fonts\georgia.ttf"))


class Sheet:
    def __init__(self, canvas: Canvas, size, role: str, number: int, total: int):
        self.c, self.w, self.h = canvas, *size
        self.left = 46
        self.right = self.w - 46
        self.width = self.right - self.left
        self.number = number
        canvas.setFillColor(LIGHT)
        canvas.rect(0, self.h - 34, self.w, 34, fill=1, stroke=0)
        canvas.setFont("OceanArialBold", 8.5)
        canvas.setFillColor(NAVY)
        canvas.drawString(self.left, self.h - 21, "PAPER ADVENTURE  /  OCEAN  /  CLASSROOM")
        canvas.setStrokeColor(LINE)
        canvas.line(self.left, 38, self.right, 38)
        canvas.setFont("OceanArial", 8.5)
        canvas.setFillColor(INK)
        canvas.drawString(self.left, 25, f"{role.upper()}  /  Edition 1.0  /  {'A4' if size == A4 else 'US Letter'}")
        canvas.drawRightString(self.right, 25, f"Page {number} of {total}")
        self.y = self.h - 62

    def text(self, value: str, size=12.6, leading=None, color=INK,
             bold=False, after=9, width=None, x=None):
        leading = leading or size * 1.36
        style = ParagraphStyle("ocean", fontName="OceanArialBold" if bold else "OceanArial",
                               fontSize=size, leading=leading, textColor=color)
        para = Paragraph(value, style)
        aw, ah = para.wrap(width or self.width, 1200)
        self.y -= ah
        if self.y < 52:
            raise ValueError(f"Page {self.number} text overflow: {value[:70]}")
        para.drawOn(self.c, self.left if x is None else x, self.y)
        self.y -= after
        return ah

    def title(self, kicker: str, title: str, deck: str = ""):
        self.text(kicker.upper(), 9, 12, CORAL, True, after=8)
        self.text(title, 25, 29, NAVY, False, after=10)
        if deck:
            self.text(deck, 13, 18, INK, after=13)

    def panel(self, head: str, body: str, height=78, font=11.5, leading=15.8):
        y = self.y - height
        if y < 50:
            raise ValueError(f"Page {self.number} panel overflow: {head}")
        c = self.c
        c.setFillColor(PALE)
        c.setStrokeColor(LINE)
        c.roundRect(self.left, y, self.width, height, 8, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("OceanArialBold", 11.5)
        c.drawString(self.left + 13, y + height - 21, head)
        p = Paragraph(body, ParagraphStyle("panel", fontName="OceanArial",
                   fontSize=font, leading=leading, textColor=INK))
        _, ph = p.wrap(self.width - 26, height - 35)
        if ph > height - 35:
            raise ValueError(f"Page {self.number} panel text overflow: {head}")
        p.drawOn(c, self.left + 13, y + height - 29 - ph)
        self.y = y - 12

    def heading(self, label: str):
        self.text(label, 15.2, 20, NAVY, True, after=7)

    def field(self, label: str, after=10):
        self.c.setFont("OceanArialBold", 10.8)
        self.c.setFillColor(NAVY)
        self.c.drawString(self.left, self.y - 3, label)
        self.c.setStrokeColor(LINE)
        self.c.line(self.left + 150, self.y - 5, self.right, self.y - 5)
        self.y -= 28 + after
        if self.y < 50:
            raise ValueError(f"Page {self.number} field overflow: {label}")

    def finish(self):
        self.c.showPage()


def card(c: Canvas, x, y, w, h, label, body, *, dashed=True, font=12.5, label_font=9):
    c.setStrokeColor(INK)
    c.setFillColor(WHITE)
    c.setLineWidth(1.2)
    if dashed:
        c.setDash(5, 3)
    c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
    c.setDash()
    c.setFillColor(SEA)
    c.setFont("OceanArialBold", label_font)
    c.drawString(x + 12, y + h - 19, label)
    p = Paragraph(body, ParagraphStyle("card", fontName="OceanArial",
                  fontSize=font, leading=font * 1.36, textColor=NAVY))
    _, ph = p.wrap(w - 24, h - 42)
    if ph > h - 45:
        raise ValueError(f"Card overflow: {label}")
    p.drawOn(c, x + 12, y + h - 33 - ph)


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


def player(c: Canvas, size):
    # 1 / Story and an actionable quick start; the cover artwork is used once.
    s = Sheet(c, size, "Player Pack", 1, 9)
    s.title("A five-mission classroom paper game", "The Coral Chart Expedition",
            "Rebuild a fictional survey chart, share crew observations and write the captain's report.")
    image_w = min(340, s.width * .72)
    image_h = image_w * .62
    c.drawImage(str(ART), (s.w - image_w) / 2, s.y - image_h, image_w, image_h,
                preserveAspectRatio=True, anchor="c")
    s.y -= image_h + 17
    s.panel("Your story", "A gust scatters the research ship's chart just before its final paper survey. Your crew must put the map together, discover where to survey, compare the crew's observations and send a report the next crew can trust.", 88, 11.9, 16.2)
    s.heading("Begin in three steps")
    for line in ("1. Sit with your crew and choose the jobs on page 2.",
                 "2. Your teacher reads each new scene and gives only that mission's pages.",
                 "3. Move paper, share what you notice, and show evidence before continuing."):
        s.text(line, 12.6, 17, after=5)
    s.text("Make a chart  /  Find the square  /  Share sightings  /  Correct the log  /  Send a report",
           11.3, 15.5, SEA, True, after=10)
    s.panel("What you need", "A printed pack, pencil, eraser, table and adult-cut pieces. No device, glue, real ocean object, specialist knowledge or personal names are needed.", 73, 11.8, 16)
    s.text("<b>At every mission:</b> Hear the story, use only current pieces, show evidence for your result, then keep it for the next mission.",11.8,16,after=0)
    s.finish()

    # 2 / Jobs and a record that persists across all five missions.
    s = Sheet(c, size, "Player Pack", 2, 9)
    s.title("Before mission 1", "Your research crew", "Hold a real job, then pass it on after each mission.")
    jobs = [
        ("CHART MAKER", "Fit the four map quarters and mark the chart. Invite another person to test a seam before you settle it."),
        ("SURVEY OBSERVER", "Place the paper frame. Invite each observation holder to read their own slip; listen before marking."),
        ("LOG KEEPER", "Write or draw the crew's results, corrections and final report. Ask others before writing a choice."),
        ("EVIDENCE CHECKER", "Point from each claim back to its printed clue, map mark or observation. Ask the adult for the next mission."),
    ]
    gap=12; cw=(s.width-gap)/2; ch=142; top=s.y
    for i,(head,body) in enumerate(jobs):
        x=s.left+(i%2)*(cw+gap); y=top-(i//2+1)*ch-(i//2)*gap
        card(c,x,y,cw,ch,"JOB  /  CUT OPTIONAL",f"<b>{head}</b><br/>{body}",font=11.8,label_font=10)
    s.y=top-2*ch-gap-22
    s.heading("Keep this record in the middle")
    for line in ("1. Chart rebuilt", "2. Survey square", "3. Three plotted sights", "4. Copied log checked", "5. Captain's report checked"):
        s.field(line,after=0)
    s.panel("Every person contributes", "For a small crew, one person may hold two jobs. For a large crew, two people share Chart Maker or Survey Observer: one moves or reads, the other checks. Pass jobs after missions 1-4.", 95, 11.8, 16)
    s.finish()

    # 3 / Four separate quarters. Matching seams and a north arrow give one layout.
    s = Sheet(c, size, "Player Pack", 3, 9)
    s.title("Mission 1  /  adult-cut props", "Four chart quarters",
            "Your teacher cuts these four rectangles and gives you page 4. Keep all edge marks attached.")
    s.panel("Look for the seams", "Keep the words upright. The NORTH arrow belongs at the top-left. Where two quarters touch, their edge shapes must match. The outside edges do not need a partner.", 76)
    gap=12; cw=(s.width-gap)/2; ch=158; top=s.y
    tiles=[
        ("CORAL REEF", "reef", {"top":"square","left":"diamond"}),
        ("LIGHTHOUSE", "light", {"left":"circle","bottom":"square"}),
        ("CHANNEL", "channel", {"top":"triangle","right":"diamond"}),
        ("KELP BAY", "kelp", {"right":"circle","bottom":"triangle"}),
    ]
    for i,(label,icon,edges) in enumerate(tiles):
        x=s.left+(i%2)*(cw+gap); y=top-(i//2+1)*ch-(i//2)*gap
        card(c,x,y,cw,ch,"MAP PIECE  /  CUT",f"<b>{label}</b>",font=14)
        sea_icon(c,icon,x+cw/2,y+55,1)
        if label=="KELP BAY":
            c.setFont("OceanArialBold",9);c.setFillColor(SEA);c.drawString(x+14,y+20,"NORTH  ^")
        for edge,shape in edges.items():
            mx=x+cw/2 if edge in ("top","bottom") else (x+cw-12 if edge=="right" else x+12)
            my=y+ch/2 if edge in ("left","right") else (y+ch-12 if edge=="top" else y+12)
            mark(c,shape,mx,my)
    s.y=top-2*ch-gap-20
    s.text("Do not write on these pieces yet. The full chart and the first story scene are on page 4.",11.8,16)
    s.finish()

    # 4 / Whole chart board and first story.
    s = Sheet(c, size, "Player Pack", 4, 9)
    s.title("Mission 1  /  keep whole", "Repair the ship's chart",
            "The gust has scattered four map quarters. The next crew cannot survey until the picture fits again.")
    s.panel("Do this together", "1. Spread the four quarters face up.  2. Put NORTH at the top-left; keep every word upright.  3. Match the four seam shapes where pieces meet.  4. Lay the pieces in this board. Checker traces all four joined seams. Do not choose the survey square yet.", 100, 12, 16.3)
    top=s.y; board_h=322; gap=4; cw=(s.width-gap)/2; ch=(board_h-gap)/2
    c.setFont("OceanArialBold",11);c.setFillColor(NAVY)
    c.drawString(s.left+cw/2-4,top+1,"A");c.drawString(s.left+cw+gap+cw/2-4,top+1,"B")
    c.drawString(s.left-17,top-ch/2,"1");c.drawString(s.left-17,top-ch-gap-ch/2,"2")
    for row in range(2):
        for col in range(2):
            x=s.left+col*(cw+gap);y=top-(row+1)*ch-row*gap-16
            c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(x,y,cw,ch,8,fill=1,stroke=1)
            c.setFont("OceanArial",10);c.setFillColor(SEA)
            c.drawCentredString(x+cw/2,y+ch/2,"Place chart quarter here")
    s.y=top-board_h-42
    s.heading("Show your result before mission 2")
    s.field("All four seams checked",after=1)
    s.text("Point to the NORTH arrow and all four matched seams. Keep the map on the table; the captain's notes arrive next.",12,16.3)
    s.finish()

    # 5 / Survey frame and intersecting reference marks.
    s = Sheet(c, size, "Player Pack", 5, 9)
    s.title("Mission 2  /  survey frame", "Find the survey square",
            "The captain kept two position notes. They point to the same square on the chart you rebuilt.")
    s.panel("Captain's two notes", "The survey square is one square <b>SOUTH of LIGHTHOUSE</b> and one square <b>EAST of CHANNEL</b>. Use both notes. Only one square can satisfy them together.", 83, 12.0, 16.5)
    s.text("1. Point to LIGHTHOUSE and move one square south.  2. Point to CHANNEL and move one square east.  3. Set the paper frame over the square both paths reach.  4. Write its grid name here, then copy it to page 2.",12.5,17.5)
    s.heading("Adult-cut survey frame")
    # The outer rectangle is exactly one slot on the page-4 chart in either size.
    fw=(s.width-4)/2;fh=(322-4)/2;fx=s.left+(s.width-fw)/2;fy=s.y-fh-4
    c.setStrokeColor(NAVY);c.setFillColor(PALE);c.setDash(5,3)
    c.roundRect(fx,fy,fw,fh,7,fill=1,stroke=1)
    c.setDash()
    c.setFillColor(NAVY);c.setFont("OceanArialBold",12)
    c.drawCentredString(fx+fw/2,fy+fh-20,"SURVEY FRAME  /  NORTH  ^")
    inner_x=fx+27;inner_y=fy+20;inner_w=fw-54;inner_h=fh-51
    c.setFillColor(WHITE);c.setDash(4,3);c.rect(inner_x,inner_y,inner_w,inner_h,fill=1,stroke=1);c.setDash()
    c.setFont("OceanArial",11);c.setFillColor(SEA)
    c.drawCentredString(fx+fw/2,fy+fh/2,"ADULT CUT THIS WINDOW")
    s.y=fy-22
    s.panel("Place, point, then record", "An adult cuts the outside and opening. Without a cut opening, point to the square on page 4 and pencil a frame around it. The answer stays the same.", 78, 11.1, 15.2)
    s.text("Check both paths: LIGHTHOUSE -> one row down; CHANNEL -> one column right. If they disagree, revisit the map seams before you continue.",11.5,16)
    s.field("Our survey square",after=0)
    s.finish()

    # 6 / Private slips must be handed to different pupils, never as an intact page.
    s = Sheet(c, size, "Player Pack", 6, 9)
    s.title("Mission 3  /  adult-cut private slips", "Three crew observations",
            "Adult: cut the three large rectangles. Deal them separately with page 7; never hand this whole page to a crew.")
    clues=[
        ("OBSERVER A", "I counted <b>THREE FISH MARKS</b> in the survey square. I did not record which side they were on."),
        ("OBSERVER B", "The <b>FAN-SHAPED CORAL MARK</b> is in the CENTRE. The fish marks were to its LEFT."),
        ("OBSERVER C", "The <b>STRIPED BUOY</b> was to the RIGHT of the fan. It has stripes and the word BUOY identifies it."),
    ]
    ch=147;top=s.y
    for i,(head,body) in enumerate(clues):
        y=top-(i+1)*ch-i*13
        card(c,s.left,y,s.width,ch,"PRIVATE CLUE  /  CUT AND DEAL",f"<b>{head}</b><br/>{body}",font=14)
        sea_icon(c,("fish","reef","buoy")[i],s.right-67,y+56,.7)
    s.y=top-3*ch-26-17
    s.text("Holders read or describe one slip at a time. Keep all three slips for the log check and final report.",11.8,16)
    s.finish()

    # 7 / Player-facing instructions do not reveal any of the three observations.
    s = Sheet(c, size, "Player Pack", 7, 9)
    s.title("Mission 3  /  keep whole", "Plot what the crew saw",
            "The ship's three observers each remember a different part. Listen to all three before marking the chart.")
    s.panel("Do this together", "1. Put the frame on your survey square.  2. Each clue holder reads or describes only their own slip.  3. Ask where each mark belongs and how many to draw.  4. Plot every mark on the board below.  5. Checker points to the separate slip that supports each mark.", 93, 11.5, 15.7)
    s.text("Our framed square: ____________________",12.4,17,NAVY,True,after=10)
    top=s.y; bh=285;cell=(s.width-12)/3
    for i in range(3):
        x=s.left+i*(cell+6);y=top-bh
        c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(x,y,cell,bh,8,fill=1,stroke=1)
        c.setFillColor(NAVY);c.setFont("OceanArialBold",12)
        c.drawCentredString(x+cell/2,y+bh-23,("LEFT","CENTRE","RIGHT")[i])
        c.setFont("OceanArial",10);c.setFillColor(SEA)
        c.drawCentredString(x+cell/2,y+18,"Draw or write here")
    s.y=top-bh-20
    s.heading("Check before the next scene")
    s.text("Have you used every separate observation? Count repeated marks aloud. Keep your drawing and slips on the table.",12.0,16.5)
    s.field("What did each person contribute?",after=0)
    s.finish()

    # 8 / Genuine correction task based on the earlier drawing and private slips.
    s = Sheet(c, size, "Player Pack", 8, 9)
    s.title("Mission 4  /  keep whole", "Repair the copied log",
            "A spray-blurred copy reached the bridge. Some details may be wrong. Use the original sightings to check each line.")
    s.panel("Do this together", "1. Keep the chart and three slips beside this page.  2. Read every copied entry.  3. Mark RIGHT or REPAIR for each one.  4. If you repair an entry, cross out only the wrong words and write a corrected line.  5. Point to the printed source for every decision.", 101, 12, 16.3)
    entries=[
        ("A", "The survey square is B2."),
        ("B", "Two fish marks are LEFT of the fan."),
        ("C", "The striped buoy is LEFT of the fan."),
    ]
    for tag,line in entries:
        s.panel(f"COPIED ENTRY {tag}",
                f"{line}<br/><b>Mark one: [  ] RIGHT   [  ] REPAIR</b><br/>Corrected line, if needed:<br/>____________________________________________<br/>Printed source: ______________________________________",
                125,11.8,16.1)
    s.text("Keep the original wording visible. Your report will explain the changes you found and how you checked them.",12,16.3)
    s.finish()

    # 9 / No candidate report: students author a concrete deliverable.
    s = Sheet(c, size, "Player Pack", 9, 9)
    s.title("Mission 5  /  keep whole", "Write the captain's report",
            "The chart is ready. The captain needs a report that another crew can check without guessing.")
    s.panel("Use your real evidence", "1. Copy the framed square.  2. Sketch the marks in their positions.  3. Explain the log changes you made and name each printed source.  4. Checker compares the report with the original paper before showing the adult.", 99, 12, 16.3)
    s.field("Survey square",after=0)
    s.heading("Our plotted survey")
    top=s.y; bh=205;cell=(s.width-12)/3
    for i in range(3):
        x=s.left+i*(cell+6);y=top-bh
        c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(x,y,cell,bh,8,fill=1,stroke=1)
        c.setFont("OceanArialBold",11);c.setFillColor(NAVY)
        c.drawCentredString(x+cell/2,y+bh-21,("LEFT","CENTRE","RIGHT")[i])
    s.y=top-bh-18
    s.field("Log change 1 / entry + correction",after=0)
    s.field("Printed source 1",after=0)
    s.field("Log change 2 / entry + correction",after=0)
    s.field("Printed source 2",after=0)
    s.text("Checker: [  ] square   [  ] three sights   [  ] log checked   [  ] sources shown",11.5,16,NAVY,True,after=11)
    s.text("Crew symbol (no names): __________   Adult check: __________",11.6,16)
    s.finish()


MISSIONS = [
    ("Repair the chart", "Player pages 3-4; four cut chart quarters and the whole board.",
     "The research ship's survey is nearly done when a gust scatters the chart into four quarters. The captain's destination notes will make sense only after the map is whole. Put the map back together before we open those notes.",
     "Give page 4 and the four already-cut pieces from page 3. Chart Maker places NORTH in the upper-left and matches the four seam pairs; Observer tests each joined mark; Log Keeper ticks the chart-built record; Checker confirms no word is upside down and every seam matches. Do not name the survey target yet.",
     "Top row: KELP BAY at A1, LIGHTHOUSE at B1. Bottom row: CHANNEL at A2, CORAL REEF at B2. The four joined edges are circle, triangle, square and diamond. Check the completed chart only; keep the survey target for mission 2.",
     ("Where does NORTH belong?", "Find each pair of identical marks where quarters touch.", "Kelp Bay is upper left, Lighthouse upper right, Channel lower left, Reef lower right.")),
    ("Find the survey square", "Player page 5 and the assembled chart; adult-cut survey frame.",
     "The captain saved two notes before the spray reached the deck. One begins at the lighthouse and the other at the channel. They lead to the same square. Let us frame it so every crew member knows where to look.",
     "Give page 5 and its frame. Observer points one square south of LIGHTHOUSE. Chart Maker points one square east of CHANNEL. Both indicate the same tile. Place the frame there with NORTH at the top; Log Keeper writes its grid name and Checker proves both paths reach it.",
     "Both clues meet at B2, the CORAL REEF. This is the survey target. Do not accept B1 or A2 alone. Keep the frame on B2 while starting the observations.",
     ("Start at each named place, not the ship picture.", "South means down one chart row; east means right one chart column.", "Both movements reach B2. Frame that square.")),
    ("Plot the three observations", "Player page 7 plus three separately dealt slips from page 6.",
     "The survey square is framed, but no single shipmate saw the whole scene. Each of three observers saved a different detail. Share them one at a time and draw a record the next crew could understand.",
     "Never give the intact page 6 to pupils. Deal the three cut slips to three holders; with two pupils give one holder two slips. Each holder reads or describes one at a time. Chart Maker or Observer draws on page 7, Log Keeper notes contributions, and Checker asks to see the separate source for each mark.",
     "At B2: FAN in the CENTRE; exactly THREE FISH on the LEFT; STRIPED BUOY on the RIGHT. Observer A gives the count, B gives the centre and fish side, C gives the buoy side. A written word or simple shape is fine; keep all slips and drawing for mission 4.",
     ("Have all three separate slips been heard?", "Which slip gives the count, which gives the fish side, and which gives the buoy side?", "Three fish left; fan centre; striped buoy right.")),
    ("Repair the copied log", "Player page 8, assembled chart, page 7 drawing, all three slips.",
      "A spray-blurred copy reached the bridge. Some details may be wrong. Check every line against the original papers and leave any repairs visible so the next crew can trust it.",
      "Give page 8. Observer reads each entry; Maker points to the chart or drawing. Checker says RIGHT or REPAIR and names its source: chart plus captain's notes for A, private slips for B/C. Keeper marks the decision, crosses out only wrong words and writes the repaired line without erasing the old one.",
      "A RIGHT: both captain's notes and the framed chart say B2. B REPAIR: THREE fish LEFT (not two), supported by slips A and B. C REPAIR: striped buoy RIGHT (not left), supported by slip C. The plotted drawing supports but cannot replace the original slips.",
     ("Which entry matches the framed square?", "Compare the fish count and then the buoy's side with separate slips.", "Keep A; repair B to THREE fish and C to buoy RIGHT.")),
    ("Write the captain's report", "Player page 9 plus chart, plotted survey and corrected log.",
      "The repaired chart is useful only if the next crew can read what happened. Make one clear report. The captain will look for the square, the crew's sightings and any explained repairs before the ship's survey closes.",
     "Give page 9. Log Keeper fills its fields from the crew's earlier papers; Chart Maker sketches positions; Observer verifies the slips; Checker ticks each check after pointing to proof. A second group may peer-check without the guide; a lone group shows the adult.",
     "Report says B2; left THREE FISH, centre FAN, right STRIPED BUOY; corrected fish count is THREE and buoy side is RIGHT, with sources. A valid report is written by the crew, not selected from candidates. Repair any mismatches and read the ending.",
     ("Use your real chart and observation slips, not memory.", "Check the square, three pictured positions, and both changed log words.", "B2; three fish left; fan centre; striped buoy right; two corrections explained.")),
]

COMMON_SNAGS = [
    "If pieces appear to fit by subject alone, return to the four paired edge shapes. The NORTH quarter anchors the upper-left; do not rotate printed words. Let pupils move a piece themselves.",
    "If a crew follows only one position note, ask two different pupils to trace the lighthouse and channel movements. Both fingers must meet before the frame is placed.",
    "If a pupil copies a neighbour's drawing without sharing a slip, pause and invite each holder to explain their own observation. The private slips are the sources, not a race to copy symbols.",
    "If pupils erase the incorrect log text, ask them to keep the old wording readable with one strike-through and write the repair below. This makes their reasoning visible.",
    "If the report contains the right marks but no evidence, send the Checker back to the three original slips and corrected log. Accept a spoken source that the adult records for an early writer.",
]


def teacher(c: Canvas, size):
    # 1 / Exact preparation and handout order.
    s=Sheet(c,size,"Teacher Guide",1,9)
    s.title("Teacher guide  /  start here", "Run the coral chart expedition",
            "A complete, adult-guided paper investigation for classroom crews.")
    s.panel("Print exactly", "Print Player Pack pages 1-9 once per crew, single-sided at 100% / Actual Size, in one paper size. Read this nine-page Teacher Guide on screen or print one copy. Never hand the guide or uncut observation page 6 to pupils.",86)
    s.heading("Set up in this order")
    for t in ("1. Make groups of 2-6. For 35 pupils, use seven groups of five: 63 Player sheets total.",
              "2. Pre-cut four chart quarters (p3), one survey frame with its window removed (p5), and three private observation slips (p6) for each crew. Adult scissors only.",
              "3. Make five numbered piles: M1 p4 + four quarters; M2 p5 + frame; M3 p7 + three separate slips; M4 p8; M5 p9. Give p1-2 at the start.",
              "4. Keep p6 intact only until you cut the three slips. Keep later piles and all answer pages out of sight; let each crew retain its chart, slips and record."):
        s.text(t,11.7,16.1,after=8)
    s.panel("Bring only", "A clear table, pencils, an eraser and adult-handled scissors. No glue, pins, film, device, real water, specialist knowledge or pupil names are needed.",79)
    s.heading("A finishable story, not a race")
    s.text("Read each scene on guide pages 3-7 aloud. Invite any pupil to read the Player instructions, or read them aloud yourself. Release only the current pile. Check the result and one supporting fact before handing over the next pile. A crew can correct its work without losing a turn.",11.8,16.3)
    s.panel("One-page launch check", "[  ] Nine Player pages and eight loose pieces per crew (56 for seven).<br/>[  ] Keep three private slips apart and five mission piles hidden.<br/>[  ] Time one small-group trial before full-class use.",92,11.3,15.4)
    s.finish()

    # 2 / Inventory, low-cut and groups.
    s=Sheet(c,size,"Teacher Guide",2,9)
    s.title("Before pupils arrive", "Cut, sort and assign jobs",
            "Use one full set per group. Keep answer pages and later props with the adult.")
    inventory=[("START","p1 cover; p2 four optional job cards and running record"),
               ("M1","p3 four chart quarters; p4 whole map board"),
               ("M2","p5 whole instructions and one cut survey frame"),
               ("M3","p6 three private slips; p7 whole plotting board"),
               ("M4","p8 whole copied log and correction space"),
               ("M5","p9 whole captain's report")]
    for label,parts in inventory:
        s.panel(label,parts,55,10.8,14.5)
    s.text("<b>Low-cut option:</b> Keep the job cards on page 2. If the frame's inner opening cannot be cut, pupils point to the square selected by both notes and draw a pencil frame. Four map quarters and three private slips still need separating; do not show all three slips on one intact sheet.",11.3,15.5,after=10)
    s.heading("2-6 pupils: assign every action")
    s.text("<b>2:</b> Maker+Observer; Keeper+Checker. <b>3:</b> Maker; Observer; Keeper+Checker. <b>4:</b> one job each. <b>5:</b> pair the Makers, one each on other jobs. <b>6:</b> pair Makers and Observers. In a pair, one moves/reads and the other verifies; switch within the next mission. Rotate job cards after missions 1-4.",11.5,16)
    s.text("For a class, run identical but independent groups. A quick group can explain its evidence or check its own report; it does not take another group's answer sheet. The adult is outside the player count.",11.5,16)
    s.finish()

    # 3-7 / One scene per page with exact guidance, answer and hints.
    for idx,(head,materials,story,actions,answer,hints) in enumerate(MISSIONS,1):
        s=Sheet(c,size,"Teacher Guide",idx+2,9)
        s.title(f"Mission {idx}  /  adult only",head,materials)
        s.panel("Read this story aloud",story,99,12,16.5)
        s.heading("Give and guide")
        s.text(actions,12.2,17,after=14)
        s.heading("Check before the next pile")
        s.panel("Expected result and evidence",answer,112 if idx in (3,4,5) else 98,11.8,16.2)
        s.heading("Three hints - pause after each")
        for n,hint in enumerate(hints,1):
            s.text(f"<b>Hint {n}:</b> {hint}",11.8,16.3,after=7)
        s.panel("Watch for this common snag",COMMON_SNAGS[idx-1],78,11.0,14.7)
        if idx<5:
            next_text=("Keep the assembled chart; give mission 2's captain notes and frame.",
                       "Keep the frame on B2; deal three private slips and give page 7.",
                       "Keep the slips and marked drawing; give the copied log on page 8.",
                       "Keep the repaired log; give page 9 and ask the crew to author its report.")[idx-1]
        else:
            next_text="Ask for proof from two different pupils, read the ending on page 9, and let the crew keep its chart and report."
        s.text(f"<b>When ready:</b> {next_text}",11.5,16,after=0)
        s.finish()

    # 8 / Diagrammatic answer atlas; not a pupil sheet.
    s=Sheet(c,size,"Teacher Guide",8,9)
    s.title("Adult reference only", "Answer atlas", "Use this to check physical placement. Keep it away from pupils.")
    s.heading("1. The repaired chart")
    top=s.y; h=205;gap=8;w=(s.width-gap)/2
    positions=[("A1","KELP BAY","kelp"),("B1","LIGHTHOUSE","light"),
               ("A2","CHANNEL","channel"),("B2","CORAL REEF","reef")]
    for i,(coord,label,kind) in enumerate(positions):
        x=s.left+(i%2)*(w+gap);y=top-(i//2+1)*h/2-(i//2)*gap
        c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(x,y,w,h/2,6,fill=1,stroke=1)
        c.setFont("OceanArialBold",11);c.setFillColor(NAVY);c.drawString(x+10,y+h/2-20,f"{coord}  {label}")
        sea_icon(c,kind,x+w/2,y+35,.65)
    s.y=top-h-22
    s.heading("2. The framed B2 survey")
    s.text("One square south of LIGHTHOUSE (B1) and one square east of CHANNEL (A2) both reach B2. The frame is placed over the CORAL REEF survey target.",11.8,16)
    bh=105;top=s.y;cell=(s.width-12)/3
    for i,(label,kind,detail) in enumerate((("LEFT","fish","3 FISH"),("CENTRE","reef","FAN"),("RIGHT","buoy","STRIPED BUOY"))):
        x=s.left+i*(cell+6);y=top-bh
        c.setStrokeColor(LINE);c.setFillColor(PALE);c.roundRect(x,y,cell,bh,6,fill=1,stroke=1)
        c.setFont("OceanArialBold",10);c.setFillColor(NAVY);c.drawCentredString(x+cell/2,y+bh-18,label)
        sea_icon(c,kind,x+cell/2,y+48,.65)
        c.drawCentredString(x+cell/2,y+11,detail)
    s.y=top-bh-18
    s.heading("3. Correct the copied log")
    s.text("Entry A is already correct. In B, change TWO to THREE. In C, change LEFT to RIGHT. The source is a separate observation slip and the matching plotted mark.",11.8,16)
    s.heading("4. Approve the report")
    s.text("Check B2, three fish left, fan centre, striped buoy right, both corrected words and their cited sources. Accept words or simple drawings. Do not grade illustration quality.",11.8,16)
    s.finish()

    # 9 / Recovery, ending and reset.
    s=Sheet(c,size,"Teacher Guide",9,9)
    s.title("Teacher support", "Help, close and reset", "Keep every crew moving without revealing the later answer pages.")
    s.heading("If a crew gets stuck")
    s.text("Read one hint at a time on its mission guide page. Allow a new attempt after each. After hint 3, supply that mission's outgoing result and continue so the story can finish. If a piece is lost, reprint only its labelled Player page; do not invent a replacement clue.",11.8,16.2)
    s.heading("If the group reads or writes slowly")
    s.text("Read short sentences aloud; let pupils point, dictate, draw a symbol or write a single word. The adult may write dictated words. Keep the same evidence and answer. For confident pupils, ask which original source supports every correction, not an extra unrelated puzzle.",11.8,16.2)
    s.heading("If class time ends")
    s.text("Store each crew's four map quarters, frame, three slips, marked pages and page-2 record together. Resume from the next unchecked mission. A second class needs a fresh Player Pack for each crew; the adult guide may be reused.",11.8,16.2)
    s.panel("Read the ending aloud after a checked report", "The captain studies your chart. The lost survey square is back, the three observations have places, and the copied log now tells the truth. Because every change has evidence, the next paper crew can trust your report. Each of you helped the expedition reach the end.",111,12,16.6)
    s.heading("Close with one contribution each")
    s.text("Invite each pupil to show one piece they placed, clue they shared, correction they checked or report mark they made. A gesture counts. Let the crew keep its report. No score, race, reward or additional purchase is required.",11.8,16.2)
    s.panel("Reset safely", "Sort reusable pieces into five piles and erase marks before replay. This puzzle has one fixed solution; vary jobs, not the answer. Keep pupil names and photos out of the papers.",79,11.3,15.3)
    s.finish()


def build_paper(paper, size):
    items=[]; files=[]
    for role,make in (("player",player),("guide",teacher)):
        path=OUT/f"ocean-classroom-{role}-1.0-{paper}.pdf"
        c=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1)
        c.setTitle(f"The Coral Chart Expedition / {role.title()} / {paper}")
        c.setAuthor("Paper Adventure Workshop")
        make(c,size);c.save()
        count=len(PdfReader(str(path)).pages)
        assert count==9,(path,count)
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        items.append(dict(world="ocean",setting="classroom",paper=paper,role=role,
                          path=path.relative_to(ROOT).as_posix(),pages=count,
                          bytes=path.stat().st_size,sha256=sha,
                          r2Key=f"retail/ocean/classroom/1.0/{paper}/{role}-{sha[:16]}.pdf"))
        files.append(path)
    with zipfile.ZipFile(OUT/f"ocean-classroom-{paper}-complete-1.0.zip","w",zipfile.ZIP_DEFLATED) as z:
        for path in files:z.write(path,path.name)
    return items


def build():
    OUT.mkdir(parents=True,exist_ok=True)
    items=[]
    for paper,size in (("A4",A4),("Letter",letter)):
        items.extend(build_paper(paper,size))
    path=OUT/"retail-packs-1.0-manifest.json"
    data=json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"version":"1.0","items":[]}
    data["items"]=[x for x in data["items"] if (x["world"],x["setting"])!=("ocean","classroom")]+items
    path.write_text(json.dumps(data,indent=2)+"\n",encoding="utf-8")
    print("Ocean Classroom rebuilt:",[(x["paper"],x["role"],x["pages"]) for x in items])


if __name__=="__main__":build()

