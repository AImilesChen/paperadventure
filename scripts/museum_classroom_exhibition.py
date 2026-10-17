"""Authoritative C08 Museum Classroom printable game (A4 and US Letter).

The fictional Wind Listener is assembled and exhibited by pupils. This module
updates only C08 PDFs, ZIPs and the four C08 retail-manifest entries.
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
OUT = ROOT / 'output' / 'pdf'
ART = ROOT / 'public' / 'assets' / 'museum-classroom-v0.1.webp'
NAVY = colors.HexColor('#173A55')
INK = colors.HexColor('#304F60')
ACCENT = colors.HexColor('#9C4D24')
PALE = colors.HexColor('#F5FAFB')
STRIP = colors.HexColor('#E1F1F5')
LINE = colors.HexColor('#9DBFCA')
CASE_TAG_INSET = 9  # Clearance on both sides of each gallery-plan slot.

pdfmetrics.registerFont(TTFont('MuseumArial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('MuseumBold', r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('MuseumGeorgia', r'C:\Windows\Fonts\georgia.ttf'))


class Page:
    def __init__(self, c: Canvas, size, role: str, number: int, total: int):
        self.c, self.w, self.h = c, *size
        self.left, self.right = 45, self.w - 45
        self.width = self.right - self.left
        self.y = self.h - 62
        self.number = number
        c.setFillColor(STRIP)
        c.rect(0, self.h - 34, self.w, 34, stroke=0, fill=1)
        c.setFillColor(NAVY)
        c.setFont('MuseumBold', 8.5)
        c.drawString(self.left, self.h - 21, 'PAPER ADVENTURE  /  MUSEUM  /  CLASSROOM')
        c.setStrokeColor(LINE)
        c.line(self.left, 38, self.right, 38)
        c.setFont('MuseumArial', 8.5)
        c.drawString(self.left, 25, f'{role.upper()}  /  Edition 1.0  /  {"A4" if size == A4 else "US Letter"}')
        c.drawRightString(self.right, 25, f'Page {number} of {total}')

    def text(self, value: str, size=12.2, leading=None, *, bold=False,
             color=INK, after=9, x=None, width=None):
        p = Paragraph(value, ParagraphStyle('body', fontName='MuseumBold' if bold else 'MuseumArial',
                      fontSize=size, leading=leading or size * 1.34, textColor=color))
        _, h = p.wrap(width or self.width, 2000)
        self.y -= h
        if self.y < 49:
            raise ValueError(f'page {self.number} overflow: {value[:65]}')
        p.drawOn(self.c, x if x is not None else self.left, self.y)
        self.y -= after

    def title(self, kicker: str, title: str, deck=''):
        self.text(kicker.upper(), 9, 12, bold=True, color=ACCENT, after=8)
        self.text(title, 24, 29, color=NAVY, after=9)
        if deck:
            self.text(deck, 12.5, 17, after=13)

    def heading(self, title: str):
        self.text(title, 15, 20, bold=True, color=NAVY, after=7)

    def panel(self, title: str, body: str, height=82, size=11.7):
        p = Paragraph(body, ParagraphStyle('panel', fontName='MuseumArial', fontSize=size,
                      leading=size * 1.34, textColor=INK))
        _, h = p.wrap(self.width - 24, 2000)
        height = max(height, h + 43)
        top = self.y
        y = top - height
        if y < 49:
            raise ValueError(f'page {self.number} panel overflow: {title}')
        c = self.c
        c.setFillColor(PALE)
        c.setStrokeColor(LINE)
        c.roundRect(self.left, y, self.width, height, 7, stroke=1, fill=1)
        c.setFillColor(NAVY)
        c.setFont('MuseumBold', 11.5)
        c.drawString(self.left + 12, top - 20, title)
        p.drawOn(c, self.left + 12, top - 29 - h)
        self.y = y - 12

    def field(self, label: str, height=37):
        c = self.c
        c.setFillColor(NAVY)
        c.setFont('MuseumBold', 10.5)
        c.drawString(self.left, self.y - 3, label)
        c.setStrokeColor(LINE)
        c.line(self.left + 153, self.y - 6, self.right, self.y - 6)
        self.y -= height
        if self.y < 49:
            raise ValueError(f'page {self.number} field overflow: {label}')

    def finish(self):
        self.c.showPage()


def card(p: Page, x, y, w, h, label, body, *, font=12.2, cut=True):
    c = p.c
    c.setStrokeColor(NAVY)
    c.setFillColor(colors.white)
    c.setLineWidth(1)
    if cut:
        c.setDash(5, 3)
    c.roundRect(x, y, w, h, 7, stroke=1, fill=1)
    c.setDash()
    c.setFillColor(ACCENT)
    c.setFont('MuseumBold', 10)
    c.drawString(x + 11, y + h - 19, label)
    para = Paragraph(body, ParagraphStyle('card', fontName='MuseumArial', fontSize=font,
                     leading=font * 1.35, textColor=NAVY))
    _, ph = para.wrap(w - 22, h - 33)
    if ph > h - 39:
        raise ValueError(f'card text overflow: {label}')
    para.drawOn(c, x + 11, y + h - 30 - ph)


def draw_part(c: Canvas, kind: str, x: float, y: float, scale: float = 1):
    """Monochrome outlines, so a photocopy carries the actual distinguishing feature."""
    c.saveState()
    c.translate(x,y)
    c.scale(scale,scale)
    x=y=0
    c.setStrokeColor(NAVY)
    c.setLineWidth(2.2)
    if kind == 'crescent':
        path = c.beginPath(); path.moveTo(x-24,y-13); path.curveTo(x-7,y+17,x+11,y+17,x+26,y-14)
        path.curveTo(x+18,y+21,x-16,y+27,x-24,y-13); c.drawPath(path,stroke=1,fill=0)
    elif kind == 'triangle':
        path=c.beginPath();path.moveTo(x,y+25);path.lineTo(x-27,y-20);path.lineTo(x+27,y-20);path.close();c.drawPath(path,stroke=1,fill=0)
    elif kind == 'double':
        c.circle(x,y,24,stroke=1,fill=0);c.circle(x,y,16,stroke=1,fill=0)
    elif kind == 'single':
        c.circle(x,y,24,stroke=1,fill=0)
    elif kind == 'dots':
        c.roundRect(x-31,y-17,62,35,7,stroke=1,fill=0)
        for dx in (-18,0,18):c.circle(x+dx,y,3,stroke=1,fill=0)
    elif kind == 'stripes':
        c.roundRect(x-31,y-17,62,35,7,stroke=1,fill=0)
        for dx in (-17,0,17):c.line(x+dx,y-12,x+dx,y+12)
    c.restoreState()


def player(c: Canvas, size):
    # P1: a useful story and immediate setup, with the cover image used once.
    p=Page(c,size,'Player Pack',1,11)
    p.title('Five missions / make a museum exhibition','The Mixed-Up Exhibition',
            'An imaginary object has lost its place. Your curatorial crew will rebuild the display from paper evidence.')
    image_w=min(325,p.width*.69); image_h=image_w*.57
    c.drawImage(str(ART),(p.w-image_w)/2,p.y-image_h,image_w,image_h,preserveAspectRatio=True,anchor='c')
    p.y-=image_h+15
    p.panel('The opening scene','The Museum of Curious Objects opens soon. A gust has mixed an accession tag, case signs and archive notes. One display is still unfinished. Your team can verify the object, put it in the right case, restore its parts and explain it to visitors.',93,11.8)
    p.heading('Start in three steps')
    for line in ('1. Sit with your crew; take the four jobs on page 2.',
                 '2. Your teacher reads each new scene and releases only that mission.',
                 '3. Move the printed pieces, share evidence and keep your result.'):
        p.text(line,12.2,16.5,after=5)
    p.panel('On your table','This Player Pack, a pencil, an eraser and the adult-cut paper pieces are enough. The museum and Wind Listener are invented; no real museum knowledge, glue, costume or purchased prop is needed.',90,11.5)
    p.text('<b>Your five actions:</b> verify the tag  /  arrange the case  /  assemble the object  /  write the label  /  invite a visitor check.',11.6,16,after=0)
    p.text('Your finished work is a flat paper exhibit: case sign, assembled object, your own label and a visitor check.',11.3,15,after=0)
    p.finish()

    # P2: clearly defined jobs plus a record used at every stage.
    p=Page(c,size,'Player Pack',2,11)
    p.title('Give every pupil a part','Your curator crew','Job cards may be cut or simply pointed to. Pass jobs after missions 1-4.')
    jobs=[('REGISTRAR','Read the accession ID on each source. Show which record belongs to the display. Ask the next person to check.'),
          ('MATERIALS CURATOR','Move case tags and paper object parts. Invite others to test the layout before it is fixed.'),
          ('RECORDER','Write or draw the agreed results and visitor label. Ask the crew what to record.'),
          ('EVIDENCE CHECKER','Check every claim against a printed mark, source or slip. Lead the visitor audit in mission 5.')]
    gap=10; cw=(p.width-gap)/2; top=p.y; ch=132
    for i,(head,body) in enumerate(jobs):
        x=p.left+(i%2)*(cw+gap); y=top-(i//2+1)*ch-(i//2)*gap
        card(p,x,y,cw,ch,'CURATOR JOB / CUT OPTIONAL',f'<b>{head}</b><br/>{body}',font=11.2)
    p.y=top-2*ch-gap-19
    p.heading('Keep this evidence record in the centre')
    for label in ('1. Accession ID','2. Display case','3. Top / dial / base','4. Visitor label','5. Visitor checked'):
        p.field(label,31)
    p.panel('Sharing rule','With three or more pupils: one reads, another moves or records, and a third checks. With two: combine Registrar + Recorder and Materials Curator + Evidence Checker. One reads or moves while the other checks; swap jobs after each mission.',91,11.4)
    p.finish()

    # P3: the only shortlist comparison. One uniquely matching ledger entry.
    p=Page(c,size,'Player Pack',3,11)
    p.title('Mission 1 / verify the accession','Which record belongs here?',
            'The intake tag is smudged, but its marks are clear. The ledger records three possible IDs.')
    p.panel('Do this together','1. Registrar reads the intake marks aloud. 2. Everyone inspects all three ledger rows. 3. Cross out a row when either mark disagrees. 4. Evidence Checker explains the surviving ID. Recorder writes the ID and both matching marks on page 2.',114,12)
    p.heading('Intake tag  /  found on the display table')
    p.panel('Visible marks','Two curved arcs above one five-point star. The paper tag has no other symbol.',71,12.2)
    p.heading('Accession ledger')
    for label,body in [('M-27','Two curved arcs + one star'),('M-72','One curved arc + two stars'),('M-20','Two curved arcs + no star')]:
        p.panel(label,body,55,12.3)
    p.field('Our ID',35);p.field('The two matching marks',38)
    p.text('Show both matching marks to your teacher before mission 2.',11.3,15,after=0)
    p.finish()

    # P4: physical spatial placement; three cut tags, not a route-choice card.
    p=Page(c,size,'Player Pack',4,11)
    p.title('Mission 2 / arrange the gallery','Where is the right case?',
            'The case signs blew off the gallery plan. Put them back before you search for the object.')
    p.panel('Read all three placement notes','Case 2 is nearest the entrance. Case 7 is between the other two cases. The M-27 object was moved to the case beside the window.',86,12)
    p.text('1. Use the three pre-cut case tags, or point to them on this page. 2. Centre each tag in a plan space. 3. Say why each belongs there. 4. Write the window-side case number on page 2.',12,16.5)
    p.heading('Gallery plan  /  place one tag in each space')
    top=p.y;gap=9;cw=(p.width-2*gap)/3;h=138
    for i,label in enumerate(('ENTRANCE','MIDDLE','WINDOW')):
        x=p.left+i*(cw+gap);y=top-h
        card(p,x,y,cw,h,label,'Place case tag here',font=11.5,cut=False)
    p.y=top-h-20
    p.heading('Adult-cut case tags  /  three pieces')
    top=p.y;h=92
    for i,num in enumerate(('CASE 4','CASE 2','CASE 7')):
        card(p,p.left+i*(cw+gap)+CASE_TAG_INSET,top-h,
             cw-2*CASE_TAG_INSET,h,'GALLERY SIGN',f'<b>{num}</b>',font=16)
    p.y=top-h-21
    p.field('M-27 belongs in case',37)
    p.panel('Keep for mission 3','Leave the case tags on the plan, or copy their order onto your record. Ask the teacher for the object assembly pages.',70,11.5)
    p.finish()

    # P5: intentionally neutral board. The private clues are only on P7.
    p=Page(c,size,'Player Pack',5,11)
    p.title('Mission 3 / conserve the object','Build the Wind Listener',
            'The archive calls this a fictional paper object. Its three parts were put into the wrong tray.')
    p.panel('Do this together','1. Adult gives page 6 parts and deals the three page 7 slips to separate clue holders; with two pupils the adult holds slip 3. 2. Each holder reads their own clue aloud in turn. 3. Materials Curator places one TOP, one DIAL and one BASE part on the board (or writes its name). 4. Checker asks who supplied each fact. 5. Recorder writes the three features on page 2.',131,11.8)
    p.heading('Assembly board  /  use the cut parts from page 6')
    top=p.y; gap=8;h=220;cw=(p.width-2*gap)/3
    for i,label in enumerate(('TOP','DIAL','BASE')):
        x=p.left+i*(cw+gap);y=top-h
        card(p,x,y,cw,h,label,'Place one matching paper part here.',font=11.3,cut=False)
    p.y=top-h-18
    p.panel('Check before writing','Your crew must use all three holders. If one slip is missing, ask the teacher to reprint and deal that slip. There is no guessing from the story illustration.',68,11.5)
    p.finish()

    # P6: six actual picture-and-word component props.
    p=Page(c,size,'Player Pack',6,11)
    p.title('Mission 3 / adult-cut props','Six possible object parts',
            'Cut each bordered rectangle. Keep the feature word attached to its drawing. Three will be used.')
    parts=[('TOP A','Crescent top','crescent'),('TOP B','Triangle top','triangle'),
           ('DIAL A','Double-ring dial','double'),('DIAL B','Single-ring dial','single'),
           ('BASE A','Three-dot base','dots'),('BASE B','Striped base','stripes')]
    gap=10;cell=(p.width-2*gap)/3;cw=cell-14;top=p.y;h=202
    for i,(label,body,kind) in enumerate(parts):
        x=p.left+(i%3)*(cell+gap)+7;y=top-(i//3+1)*h-(i//3)*gap
        card(p,x,y,cw,h,label,f'<b>{body}</b>',font=12.1)
        draw_part(c,kind,x+cw/2,y+74,1.5)
    p.y=top-2*h-gap-17
    p.text('Adult: count six part cards. Page 7 contains three separate evidence slips. Do not hand out that entire page as one clue sheet.',11.5,15.5,after=0)
    p.finish()

    # P7: three private facts. The task sheet and prop drawings never reveal them.
    p=Page(c,size,'Player Pack',7,11)
    p.title('Mission 3 / adult-cut and deal privately','Three conservation slips',
            'Adult: cut three slips. Give one to each of three pupils; with two pupils, hold slip 3 yourself. Do not show the whole page to the crew.')
    slips=[('SLIP 1  /  TOP','The surviving archive sketch shows a curved crescent above the dial. Tell the crew what you saw.'),
           ('SLIP 2  /  DIAL','The inspection note counts TWO rings around the centre. Tell the crew what you counted.'),
           ('SLIP 3  /  BASE','The base rubbing shows THREE separate dots in a row. Tell the crew what you felt.')]
    top=p.y;h=135;gap=14
    for i,(label,body) in enumerate(slips):
        y=top-(i+1)*h-i*gap
        card(p,p.left,y,p.width,h,label,body,font=13)
        c.setFillColor(NAVY);c.setFont('MuseumBold',10)
        c.drawString(p.left+13,y+43,'Sketch or underline the feature you will report:')
        c.setStrokeColor(LINE);c.line(p.left+13,y+26,p.right-13,y+26)
    p.y=top-3*h-2*gap-16
    p.panel('If your team has two pupils','The adult holds slip 3 out of view. After pupils 1 and 2 read their clues aloud, the adult reads the third clue aloud to both pupils. Then the two pupils choose the parts together. With three or more pupils, deal one slip to each of three holders.',98,11.4)
    p.finish()

    # P8: source evaluation rather than label-card selection.
    p=Page(c,size,'Player Pack',8,11)
    p.title('Mission 4 / read the archive','Find facts for your label',
            'Only notes carrying your verified accession ID belong to this exhibit.')
    p.panel('Do this together','1. Registrar points to your ID on page 2. 2. Read all three source panels below. 3. Mark the two notes with that ID; put the other aside. 4. Say one fact from each accepted note. 5. Use page 9 to write your own label. Do not copy the unrelated object.',111,11.8)
    p.panel('ARCHIVE NOTE A  /  M-27','Name: Wind Listener. In this invented museum story, it is a paper display model.',82,12)
    p.panel('ARCHIVE NOTE B  /  M-72','Name: Moon Drawer. Its paper model holds pretend moon sketches. This is a different object.',83,12)
    p.panel('ARCHIVE NOTE C  /  M-27','Purpose in the story: visitors imagine a breeze passing the top, circling the dial and reaching the marked base. It makes no sound and needs no power.',106,12)
    p.field('Sources we trust',35)
    p.panel('Pass to the Recorder','Use the name from one trusted note and the purpose from the other. The label can be written, dictated or drawn. It should describe this fictional object, not claim a real historic artifact.',91,11.5)
    p.finish()

    # P9: full-sized writable label, no prewritten final answer.
    p=Page(c,size,'Player Pack',9,11)
    p.title('Mission 4 / create, do not choose','Write a visitor label',
            'Use the two matching archive notes and your assembled paper object.')
    p.panel('Before writing','A visitor should learn the object name, notice at least one real feature on your model, and understand its purpose in this imaginary story. Do not invent a date, culture or real-world power.',93,11.8)
    for head,prompt in [('OBJECT NAME','Which note with your verified ID gives the object name?'),
                        ('WHAT YOU CAN SEE','Name or draw one or more features on your model.'),
                        ('IN OUR STORY','What do visitors imagine this paper model does?')]:
        p.heading(head)
        p.text(prompt,11.5,15,after=5)
        height=75 if head!='IN OUR STORY' else 95
        y=p.y-height
        c.setStrokeColor(LINE);c.setFillColor(colors.white)
        c.roundRect(p.left,y,p.width,height,6,stroke=1,fill=1)
        for line_y in range(int(y+23),int(y+height-10),25):c.line(p.left+12,line_y,p.right-12,line_y)
        p.y=y-16
    p.text('Read your label aloud. Check it against the two M-27 notes and your model.',11.3,15,after=0)
    p.finish()

    # P10: actual exhibit mat, meant to receive existing parts and authored label.
    p=Page(c,size,'Player Pack',10,11)
    p.title('Mission 5 / open the exhibit','Mount your paper display',
            'Keep the whole sheet flat. You can place the cut pieces on it; no glue or standing model is needed.')
    p.panel('Arrange in this order','1. Copy your verified accession ID and window-side case number from page 2 into the frames below. 2. Place the three selected parts, top to base, inside the large frame (or write their names). 3. Put your page-9 label beside this mat. 4. Invite a different crew or your teacher to inspect it using page 11.',116,11.9)
    top=p.y;gap=10;frame_w=(p.width-gap)/2;frame_h=76
    card(p,p.left,top-frame_h,frame_w,frame_h,'ACCESSION ID',
         'Copy the ID proved by both intake marks.',font=11.5,cut=False)
    card(p,p.left+frame_w+gap,top-frame_h,frame_w,frame_h,'CASE NUMBER',
         'Copy the window-side case number.',font=11.5,cut=False)
    c.setStrokeColor(LINE)
    c.line(p.left+13,top-frame_h+15,p.left+frame_w-13,top-frame_h+15)
    c.line(p.left+frame_w+gap+13,top-frame_h+15,p.right-13,top-frame_h+15)
    p.y=top-frame_h-13
    p.heading('THE PAPER OBJECT / PLACE THREE CUT CARDS')
    top=p.y;gap=8;cw=(p.width-2*gap)/3;h=220
    for i,label in enumerate(('TOP','DIAL','BASE')):
        card(p,p.left+i*(cw+gap),top-h,cw,h,label,'Selected part here',font=11.2,cut=False)
    p.y=top-h-13
    p.panel('VISITOR LABEL','Place page 9 beside this mat. Check that its words match this display.',72,11.5)
    p.text('A visitor checks the tag, case, parts and authored label against printed evidence.',11.4,15,after=0)
    p.finish()

    # P11: explicit visitor audit and ending, including lone-group path.
    p=Page(c,size,'Player Pack',11,11)
    p.title('Mission 5 / visitor audit','Can a visitor trust your exhibit?',
            'Another crew checks your paper display. If there is one crew, your teacher takes the visitor role.')
    checks=[('The ID','Does the display use the ID proved by the two intake marks?'),
            ('The case','Is the object in the window-side case from the gallery plan?'),
            ('The parts','Can each chosen part be traced to a different conservation slip?'),
            ('The label','Does it use the matching sources and describe a feature actually displayed?')]
    for title,body in checks:
        p.panel(f'[  ]  {title}',body,76,11.7)
    p.heading('Ask one evidence question')
    p.text('Visitor: “Which printed clue supports one part of your display?” Crew: point to the source, tag, plan or slip and explain. If a check fails, move or rewrite that piece and ask for a second check.',12,16.4)
    p.field('Visitor checked / initials optional',37)
    p.panel('Your exhibition is open','Read your visitor label aloud. Each person shows one thing they contributed: a tag, part, source, sentence or check. You may keep the paper display. No score or extra purchase is part of the game.',91,11.7)
    p.finish()


SCENES=[
    ('Mission 1  /  accession','The intake desk finds a damp tag. “The number has faded,” says the registrar, “but the marks survived. We must check the ledger before we touch the exhibit.”'),
    ('Mission 2  /  gallery','The museum doors rattle again. Three case signs land on the floor. “The right case is by the window,” says the guard, “but we must put every sign back before visitors arrive.”'),
    ('Mission 3  /  conservation','At the conservation table, six paper pieces lie in a tray. Three colleagues each have a different observation. “Listen to every report,” says the conservator. “One sketch alone cannot restore the model.”'),
    ('Mission 4  /  archive','The model is whole, but visitors still need its story. A folder contains notes for two objects. “Check the accession ID first,” says the archivist, “then write a label in your own words.”'),
    ('Mission 5  /  opening','A visitor reaches the unfinished display. “Can you show me where every claim came from?” they ask. The team must mount its work and invite a careful check before the exhibition opens.')]

MISSION_GUIDE=[
    ('Give player page 3. Keep pages 4-11 out of view.',
     'Registrar reads the two arcs and one star. Materials Curator points across the three ledger rows. Recorder writes the surviving ID and both marks. Checker rejects M-72 (wrong arc and star counts) and M-20 (no star).',
     'M-27. Evidence: two arcs AND one star. Accept spoken or pointed evidence; do not accept M-27 without at least one printed mark being explained.',
     ['Compare the number of arcs first.','Now compare the star count in the two remaining rows.','M-27 has both required marks.'],
     'Write M-27 on the record; release page 4.'),
    ('Give player page 4 and three case tags (or have the crew point without cutting).',
     'Materials Curator puts Case 2 by the entrance. Another pupil places Case 7 in the middle. The remaining Case 4 goes beside the window. Registrar checks M-27 is the object moved to that position. Recorder writes Case 4.',
     'Left to right: Case 2, Case 7, Case 4. The window-side result is Case 4. Ask for the “nearest entrance”, “between” and “window” evidence.',
     ['Place the sign nearest the entrance.','Which sign must be between the other two?','Case 4 is the remaining window-side sign.'],
     'Keep the case order visible or copy it; release pages 5-7.'),
    ('Give page 5 and six cut parts from page 6. Cut page 7 into THREE slips and deal them separately. Never show the whole page as a clue sheet.',
     'Different holders sketch or underline their clue, then read top, dial and base evidence one at a time. With two pupils, the adult holds slip 3 until the two pupils share, then reads that clue aloud to both. Materials Curator places one part in each slot. Checker asks each holder to point to the matching drawing and words. Recorder lists the three features.',
     'Crescent top + double-ring dial + three-dot base. The rejected triangle, single ring and striped base remain aside. Require three independently shared slips.',
     ['Ask all three holders to read once.','Compare each statement to the matching pair of drawings.','Choose crescent, double rings and three dots.'],
     'Preserve the assembled model and list its features; release pages 8-9.'),
    ('Give pages 8-9; keep the model and the verified ID visible.',
     'Registrar compares every archive ID to M-27. Crew excludes M-72. Recorder uses Note A for name and Note C for fictional purpose, adds a visible model feature, then writes or dictates the visitor label. Checker reads it aloud.',
     'Accept an original label that names the Wind Listener, describes at least one selected visible feature, and says visitors imagine a breeze passing through/around the paper model. Do not require exact wording. Reject the Moon Drawer or invented real history.',
     ['Which two sources show M-27?','Use one for the name and one for what visitors imagine.','A good label says Wind Listener, a visible part, and an imagined breeze.'],
     'Keep the authored page-9 label; release pages 10-11.'),
    ('Give pages 10-11. Invite a second group as visitors; with one group, the teacher is the visitor.',
     'Crew copies M-27 and Case 4 into separate frames, puts the three chosen parts in order on the exhibit mat, and places the written label beside it. Visitor checks four evidence links and asks one question. If a check fails, the team repairs just that part and asks for another check.',
     'All four page-11 checks pass: M-27, Case 4, crescent/double-ring/three-dot model, supported original label. One crew member answers the visitor by pointing to a printed source. Flat paper placement counts; no glue or stand is needed.',
     ['Check one box at a time against the record.','Ask where the model feature and label fact came from.','Correct any mismatched piece, then repeat the audit.'],
     'Read the ending on guide page 10 and close with each pupil showing a contribution.')]

COACHING=[
    'Ask “Which mark rules out this row?” A pupil may point instead of explaining in a full sentence. If they compare only the arcs, ask them to test the star as an independent second condition.',
    'Ask pupils to name the entrance and window before laying signs. If they place Case 7 at an end, have someone reread “between” and physically move the middle sign.',
    'Do not let the Materials Curator choose from the artwork alone. Each private holder must share a distinct observation before the Checker accepts a top, dial or base.',
    'Ask “Which printed note supports that sentence?” If pupils copy Note B, have the Registrar compare its M-72 ID with the recorded M-27, then rewrite only the unsupported sentence.',
    'The visitor checks evidence, not drawing quality. If one box fails, let the crew repair that sign, part or sentence and repeat just the failed check; a second crew need not wait for the whole class.']


def guide(c: Canvas, size):
    p=Page(c,size,'Teacher Guide',1,10)
    p.title('Teacher quick start','Run the exhibition','Five distinct paper actions: verify, arrange, assemble, author and audit.')
    p.panel('The one-minute setup','Print one 11-page Player Pack per crew of 2-6 pupils. Keep one 10-page Teacher Guide yourself. For 35 pupils, use seven crews of five. Cut and sort the marked props before class. Give only the current mission pages.',107,12)
    p.heading('Before pupils arrive')
    for line in ('1. Print at Actual size, one page per sheet; choose matching A4 or US Letter files.',
                 '2. Cut three case tags (page 4), six part cards (page 6) and three private slips (page 7): 12 required pieces per crew.',
                 '3. Put player pages into five mission piles as listed on guide page 2.',
                 '4. Set out a pencil and eraser per crew. Keep scissors with the adult.'):
        p.text(line,12,16.4,after=7)
    p.panel('What this is','A fictional museum curation story for ages 6-12. It makes no claims about a real culture or artifact. Each crew handles its own printout. No glue, screen, specialist supply, prize or real-world excursion is required.',92,11.7)
    p.text('Read the scene on each mission guide page BEFORE giving that mission. Keep answers and later pages out of pupils’ sight.',11.8,16,after=0)
    p.panel('One repeatable teaching rhythm','For each mission: read the scene, give only the listed pages, let pupils act in their jobs, ask for a printed reason, then release the next pile. Give hint 1 only after a genuine attempt; pupils may revise without penalty.',86,11.4)
    p.finish()

    p=Page(c,size,'Teacher Guide',2,10)
    p.title('Prepare exact pieces','Print, cut and stage','This inventory covers every required game prop and every page handout.')
    for title,body in [
        ('START / PLAYER 1-2','Cover/story and four optional job cards with shared evidence record. Give before the opening scene.'),
        ('PILE 1 / PLAYER 3','Intake tag, three ledger entries and result lines. Leave this task page whole.'),
        ('PILE 2 / PLAYER 4','Gallery plan plus THREE cut signs: Case 4, Case 2 and Case 7.'),
        ('PILE 3 / PLAYER 5-7','Neutral assembly board; SIX cut part cards; THREE separately cut and dealt evidence slips.'),
        ('PILE 4 / PLAYER 8-9','Three whole-page archive notes and a blank visitor label; no answer card.'),
        ('PILE 5 / PLAYER 10-11','Flat exhibit mat, four-check visitor audit and ending.')]:
        p.panel(title,body,69,11.4)
    p.text('Full-cut count: 3 case tags + 6 part cards + 3 slips = 12 required loose pieces per crew. The four job cards are optional cuts. Keep a complete set per crew; reprint any lost labelled page.',11.8,16.2,after=8)
    p.finish()

    p=Page(c,size,'Teacher Guide',3,10)
    p.title('Set the classroom','Roles, groups and opening','Everyone should have a visible action, including pupils who prefer to point or dictate.')
    p.panel('For 2-6 pupils per crew','2: Registrar + Recorder / Materials Curator + Evidence Checker; swap bundles. 3: one pupil holds two jobs and rotates. 4: one job each. 5: pair Registrar or Materials Curator. 6: pair both of those jobs. In pairs, one reads or moves and the other checks; swap after every mission.',122,11.7)
    p.panel('For a full class','Make independent crews of 2-6; 35 pupils can be seven crews of five. Print the entire 11-page Player Pack for EACH crew. The adult can read one scene to the room, then visit crews for checks. Crews do not need to finish together.',103,11.7)
    p.heading('Read this opening aloud')
    p.panel('Opening scene','“The Museum of Curious Objects opens soon. A gust has scattered one invented exhibit’s tag, case signs and archive notes. Your crew will put them back. Read one clue at a time, ask each person to share, and show the printed reason for your decision. If you get stuck, I will give one small hint.”',111,11.7)
    p.heading('Set the table')
    p.text('Put pages 1-2 and pencils in the active area. Keep later piles and this guide with the adult. Use one corner as evidence parking for solved pages and one for unused parts. Rotate job cards after missions 1-4.',11.8,16.4,after=0)
    p.finish()

    for idx,((head,story),(handout,actions,answer,hints,handoff)) in enumerate(zip(SCENES,MISSION_GUIDE),1):
        p=Page(c,size,'Teacher Guide',idx+3,10)
        p.title(f'Mission {idx} / adult only',head,handout)
        p.panel('Read this scene aloud',story,100,11.9)
        p.heading('Lead the actual actions')
        p.text(actions,12,16.6,after=14)
        p.panel('Accept when the crew shows this',answer,111 if idx in (3,4,5) else 94,11.6)
        p.heading('Hints / stop after each')
        for n,hint in enumerate(hints,1):
            p.text(f'<b>{n}.</b> {hint}',11.8,16.2,after=7)
        if idx != 3:
            p.panel('If the first attempt is wrong',COACHING[idx-1],83,11.3)
        p.panel('Handover',handoff,67,11.3)
        if idx==3:
            p.text('Two-pupil crew: keep slip 3 out of view until pupils share slips 1 and 2. Then read its clue aloud to both pupils. Let the pupils select the base; do not show them the answer atlas.',11.3,15.5,after=0)
        p.finish()

    # Guide page 9: diagrammatic answer atlas.
    p=Page(c,size,'Teacher Guide',9,10)
    p.title('Adult reference only','Answer atlas','Check physical placement, not artistic quality or exact pupil wording.')
    p.panel('1 / ACCESSION','M-27 matches BOTH surviving marks: two curved arcs and one star. M-72 and M-20 each fail a mark.',74,11.6)
    p.panel('2 / CASE PLAN','From entrance to window: Case 2  →  Case 7  →  Case 4. Case 7 is between the other two; M-27 is in Case 4 by the window.',85,11.6)
    p.heading('3 / The object assembled')
    top=p.y;gap=11;cw=(p.width-2*gap)/3;h=155
    for i,(label,feature,kind) in enumerate((('TOP','CRESCENT','crescent'),('DIAL','DOUBLE RING','double'),('BASE','THREE DOTS','dots'))):
        x=p.left+i*(cw+gap);y=top-h
        card(p,x,y,cw,h,label,f'<b>{feature}</b>',font=11.4,cut=False)
        draw_part(c,kind,x+cw/2,y+48)
    p.y=top-h-19
    p.panel('4 / Label acceptance','Use archive A and C (both M-27); discard B (M-72). Accept Wind Listener, at least one visible selected feature and a fictional purpose involving visitors imagining a breeze. Drawn or dictated words count.',96,11.6)
    p.panel('5 / Display acceptance','M-27 and Case 4 are written in separate frames; all three selected parts lie on the flat mat and the authored label is beside it. A visitor checks four evidence links and hears an answer to one question. A failed check leads to repair and a recheck.',95,11.6)
    p.finish()

    p=Page(c,size,'Teacher Guide',10,10)
    p.title('Help and closing','Recover, end and reset','A crew can finish without guessing or acquiring extra materials.')
    p.heading('When someone is stuck')
    p.text('Give the numbered hints from that mission page one at a time. Let the crew retry after each. If necessary, provide the outgoing result and continue; no child is eliminated. If a piece is missing, reprint its labelled Player page. If a previous answer was wrong, correct that record line and resume the current mission.',11.8,16.2)
    p.heading('Reading and motor support')
    p.text('Read short lines aloud. Pupils may point, place, dictate or draw; the adult may record their words. For low-cut play, leave pages 4 and 6 whole and write selected case/part names into the board spaces. Still cut and deal all three page-7 slips separately. A pupil who cannot cut still decides placements. Ask confident readers why an unused source or part fails.',11.8,16.2)
    p.heading('If the period ends')
    p.text('Store each crew’s page-2 record with every task page and piece already issued to that crew. Keep unopened mission piles separate and label each crew’s bundle. Resume at the next unchecked mission; issue its pages only then. Keep the Teacher Guide with the adult.',11.8,16.2)
    p.panel('Read the ending aloud after the visitor audit','“The Museum of Curious Objects opens. Your crew found the right record, rebuilt the case plan, listened to three conservators, wrote a label and let a visitor challenge it. The Wind Listener can now be understood because every part of the exhibit has evidence.”',111,11.8)
    p.panel('Close and reset','Invite each pupil to show one contribution. Keep the flat exhibit or recycle the paper. For replay, gather and count all 12 required pieces, erase reusable marks and choose new jobs. The solution is fixed; do not promise a new mystery.',84,11.4)
    p.finish()


def build_paper(paper, size):
    entries=[]; files=[]
    for role,make,expected in (('player',player,11),('guide',guide,10)):
        path=OUT/f'museum-classroom-{role}-1.0-{paper}.pdf'
        c=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1)
        c.setTitle(f'The Mixed-Up Exhibition / {role.title()} / {paper}')
        c.setAuthor('Paper Adventure Workshop')
        make(c,size);c.save()
        count=len(PdfReader(str(path)).pages)
        assert count==expected,(path,count)
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        entries.append(dict(world='museum',setting='classroom',paper=paper,role=role,
                            path=path.relative_to(ROOT).as_posix(),pages=count,
                            bytes=path.stat().st_size,sha256=sha,
                            r2Key=f'retail/museum/classroom/1.0/{paper}/{role}-{sha[:16]}.pdf'))
        files.append(path)
    with zipfile.ZipFile(OUT/f'museum-classroom-{paper}-complete-1.0.zip','w',zipfile.ZIP_DEFLATED) as z:
        for path in files:z.write(path,path.name)
    return entries


def build():
    OUT.mkdir(parents=True,exist_ok=True)
    entries=[]
    for paper,size in (('A4',A4),('Letter',letter)):
        entries.extend(build_paper(paper,size))
    manifest_path=OUT/'retail-packs-1.0-manifest.json'
    data=json.loads(manifest_path.read_text(encoding='utf-8'))
    data['items']=[x for x in data['items'] if (x['world'],x['setting'])!=('museum','classroom')]+entries
    manifest_path.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print('Museum Classroom rebuilt:',[(x['paper'],x['role'],x['pages']) for x in entries])


if __name__=='__main__':build()
