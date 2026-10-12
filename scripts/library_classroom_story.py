"""C09 Storybook Library: a story-repair game, not a candidate-card quiz.

Only the Library Classroom PDF slots and two ZIPs are changed by build().
The public product identity and existing order entitlements are preserved.
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
ART = ROOT / 'public' / 'assets' / 'library-classroom-v0.1.webp'
NAVY = colors.HexColor('#243650')
INK = colors.HexColor('#354759')
PURPLE = colors.HexColor('#75518D')
PALE = colors.HexColor('#F8F5FA')
STRIP = colors.HexColor('#E7F1F7')
LINE = colors.HexColor('#B9ACCB')

pdfmetrics.registerFont(TTFont('LibraryArial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('LibraryBold', r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('LibraryGeorgia', r'C:\Windows\Fonts\georgia.ttf'))


class Page:
    def __init__(self, canvas: Canvas, size, role: str, number: int, total: int):
        self.c, self.w, self.h = canvas, *size
        self.left, self.right = 44, self.w - 44
        self.width = self.right - self.left
        self.y = self.h - 61
        self.number = number
        canvas.setFillColor(STRIP)
        canvas.rect(0, self.h - 35, self.w, 35, fill=1, stroke=0)
        canvas.setFillColor(NAVY)
        canvas.setFont('LibraryBold', 8.5)
        canvas.drawString(self.left, self.h - 22, 'PAPER ADVENTURE  /  LIBRARY  /  CLASSROOM')
        canvas.setStrokeColor(LINE)
        canvas.line(self.left, 38, self.right, 38)
        canvas.setFont('LibraryArial', 8.5)
        canvas.drawString(self.left, 25, f'{role.upper()}  /  Edition 1.0  /  {"A4" if size == A4 else "US Letter"}')
        canvas.drawRightString(self.right, 25, f'Page {number} of {total}')

    def text(self, value: str, size=12.2, leading=None, *, bold=False,
             color=INK, after=8, x=None, width=None):
        style = ParagraphStyle('body', fontName='LibraryBold' if bold else 'LibraryArial',
                               fontSize=size, leading=leading or size * 1.35,
                               textColor=color)
        para = Paragraph(value, style)
        _, height = para.wrap(width or self.width, 2000)
        self.y -= height
        if self.y < 49:
            raise ValueError(f'page {self.number} overflow: {value[:65]}')
        para.drawOn(self.c, x if x is not None else self.left, self.y)
        self.y -= after

    def title(self, kicker: str, title: str, deck=''):
        self.text(kicker.upper(), 9.5, 12.5, bold=True, color=PURPLE, after=7)
        self.text(title, 23, 29, color=NAVY, after=7)
        if deck:
            self.text(deck, 12.7, 17.3, after=12)

    def heading(self, value: str):
        self.text(value, 15, 20, bold=True, color=NAVY, after=7)

    def panel(self, title: str, body: str, height=78, size=11.8):
        para = Paragraph(body, ParagraphStyle('panel', fontName='LibraryArial',
                           fontSize=size, leading=size * 1.34, textColor=INK))
        _, ph = para.wrap(self.width - 24, 2000)
        height = max(height, ph + 43)
        top = self.y
        bottom = top - height
        if bottom < 49:
            raise ValueError(f'page {self.number} panel overflow: {title}')
        c = self.c
        c.setFillColor(PALE)
        c.setStrokeColor(LINE)
        c.roundRect(self.left, bottom, self.width, height, 7, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont('LibraryBold', 11.3)
        c.drawString(self.left + 12, top - 20, title)
        para.drawOn(c, self.left + 12, top - 29 - ph)
        self.y = bottom - 11

    def rule(self, label: str, height=34):
        self.c.setFillColor(NAVY)
        self.c.setFont('LibraryBold', 10.5)
        self.c.drawString(self.left, self.y - 2, label)
        self.c.setStrokeColor(LINE)
        self.c.line(self.left + 163, self.y - 5, self.right, self.y - 5)
        self.y -= height
        if self.y < 49:
            raise ValueError(f'page {self.number} field overflow: {label}')

    def writing(self, title: str, height: int, lines: int):
        self.heading(title)
        top = self.y
        bottom = top - height
        if bottom < 49:
            raise ValueError(f'page {self.number} writing overflow: {title}')
        c = self.c
        c.setStrokeColor(LINE)
        c.setFillColor(colors.white)
        c.roundRect(self.left, bottom, self.width, height, 6, fill=1, stroke=1)
        gap = (height - 28) / max(1, lines)
        for i in range(lines):
            yy = top - 23 - i * gap
            c.line(self.left + 13, yy, self.right - 13, yy)
        self.y = bottom - 13

    def finish(self):
        self.c.showPage()


def mini_card(p: Page, x, y, width, height, label, body, *, cut=False, size=12.2):
    c = p.c
    c.setStrokeColor(PURPLE)
    c.setFillColor(colors.white)
    if cut:
        c.setDash(5, 3)
    c.roundRect(x, y, width, height, 7, fill=1, stroke=1)
    c.setDash()
    c.setFillColor(PURPLE)
    c.setFont('LibraryBold', 10)
    c.drawString(x + 12, y + height - 20, label)
    para = Paragraph(body, ParagraphStyle('card', fontName='LibraryArial',
                     fontSize=size, leading=size * 1.34, textColor=NAVY))
    _, ph = para.wrap(width - 24, height - 36)
    if ph > height - 41:
        raise ValueError(f'card overflow: {label}')
    para.drawOn(c, x + 12, y + height - 31 - ph)


def stamp(c: Canvas, x: float, y: float, *, star=False, dots=2):
    """Ink-only shape mark; the adjoining text remains its accessible label."""
    c.setFillColor(PURPLE)
    if star:
        path = c.beginPath()
        points = [(0, 9), (3, 3), (10, 2), (5, -2), (7, -9),
                  (0, -5), (-7, -9), (-5, -2), (-10, 2), (-3, 3)]
        path.moveTo(x + points[0][0], y + points[0][1])
        for dx, dy in points[1:]:
            path.lineTo(x + dx, y + dy)
        path.close()
        c.drawPath(path, fill=1, stroke=0)
    else:
        c.circle(x, y, 10, fill=1, stroke=0)
        c.setFillColor(PALE)
        c.circle(x + 5, y + 3, 8, fill=1, stroke=0)
    c.setFillColor(PURPLE)
    for i in range(dots):
        c.circle(x + (i - (dots - 1) / 2) * 11, y - 20, 2.5, fill=1, stroke=0)


def original_map(p: Page):
    """Printable in-story map: children copy this route on the final leaf."""
    p.heading('THE BORROWED MAP / keep this original page')
    c = p.c
    top = p.y
    height = 92
    bottom = top - height
    if bottom < 49:
        raise ValueError('opening map overflow')
    c.setFillColor(PALE)
    c.setStrokeColor(LINE)
    c.roundRect(p.left, bottom, p.width, height, 7, fill=1, stroke=1)
    names = ('GARDEN TABLE', 'GARDEN GATE', 'RIVER BRIDGE', "KIT'S HOME")
    gap = 7
    width = (p.width - 28 - 3 * gap) / 4
    for i, name in enumerate(names):
        x = p.left + 14 + i * (width + gap)
        c.setFillColor(colors.white)
        c.setStrokeColor(PURPLE)
        c.roundRect(x, bottom + 24, width, 39, 5, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont('LibraryBold', 9.7)
        c.drawCentredString(x + width / 2, bottom + 39, name)
        if i < 3:
            c.setFillColor(PURPLE)
            c.setFont('LibraryBold', 11)
            c.drawCentredString(x + width + gap / 2, bottom + 38, '›')
    c.setFillColor(INK)
    c.setFont('LibraryArial', 9.8)
    c.drawString(p.left + 14, bottom + 9, 'This is the borrowed story map. Keep this page for a later mission; do not cut it.')
    p.y = bottom - 11


def route_copy(p: Page):
    p.heading("KIT'S ROUTE COPY / write the four map stops in order")
    c = p.c
    top = p.y
    height = 66
    bottom = top - height
    if bottom < 49:
        raise ValueError('route copy overflow')
    gap = 9
    width = (p.width - 3 * gap) / 4
    for i in range(4):
        x = p.left + i * (width + gap)
        c.setFillColor(colors.white)
        c.setStrokeColor(PURPLE)
        c.roundRect(x, bottom, width, height, 6, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont('LibraryBold', 10.3)
        c.drawString(x + 10, top - 17, f'STOP {i + 1}')
        c.setStrokeColor(LINE)
        c.line(x + 10, bottom + 19, x + width - 10, bottom + 19)
    p.y = bottom - 11


SCENES = {
    'A': ('THE GARDEN TABLE', 'The bridge was behind them. The garden keeper opened the gate and offered them a seat. Rowan set down the borrowed map as the lantern grew dim. Kit looked back: the path home had disappeared into the evening shadows.'),
    'B': ('A BORROWED MAP', 'Rowan borrowed a map from the Storybook Library and folded it with care. Kit was waiting near the bridge. Rowan promised to bring the map so they could find the garden before dusk. They set off with the library behind them.'),
    'C': ('THE FAR BANK', 'After they crossed, Rowan and Kit stepped off the far end of the bridge. The lantern had helped them see each plank. Ahead stood the garden gate. Kit glanced back at the turns in the path; they were harder to remember than expected.'),
    'D': ('THE DARK BRIDGE', 'Before they crossed, the bridge grew dark. Rowan lit a lantern. Kit held the map while Rowan checked the first plank. A gust made the light flicker, so they stopped, looked together and then took the crossing one step at a time.'),
}

READ_ALOUD = [
    'A return slip lies on the library desk, but the title has rubbed away. The stamp is still clear. Find the book before the last reader leaves.',
    'You found The Lantern Path. Four leaves have slipped out of its middle. The final page cannot be restored until you know what happened first.',
    'The story reaches a garden table and stops. Rowan, Kit and the garden keeper each left a different note. Listen to all three before suggesting what happened.',
    'A damaged final leaf turns up beneath the table. Its first and last lines survived, but the action between them is gone. Use your evidence to restore it.',
    'The book has a final leaf again. Read it to a visitor. The visitor has written one wrong fact about the map; use your paper evidence to repair that summary.',
]


def player(c: Canvas, size):
    p = Page(c, size, 'Player Pack', 1, 11)
    p.title('Five missions / repair a storybook', 'The Missing Final Chapter',
            'Find a borrowed book, restore its mixed-up story leaves and write the page that brings everyone home.')
    image_w = min(320, p.width * .68)
    image_h = image_w * .57
    c.drawImage(str(ART), (p.w-image_w)/2, p.y-image_h,
                image_w, image_h, preserveAspectRatio=True, anchor='c')
    p.y -= image_h + 14
    p.panel('Your story begins', 'The Storybook Library has a book with a missing final leaf. Its other pages are out of order. Work as a reading crew: find the book, read what happened, listen to three witnesses, then restore the ending.', 95, 12)
    p.heading('Start in three steps')
    for line in ('1. Sit with your crew and choose the four jobs on page 2.',
                 '2. Your teacher reads a new scene and gives only that mission’s pages.',
                 '3. Read, move or point to paper pages; record one result before continuing.'):
        p.text(line, 12.2, 16.4, after=5)
    p.panel('All you need', 'Your printed pages, a pencil and an eraser are enough. An adult cuts three private witness slips. You may leave the other cards whole. No glue, device, costume, purchased prize or real library trip is needed.', 83, 11.5)
    p.text('<b>Your five actions:</b> find the book / order its leaves / share witness notes / write the missing page / read the complete story.', 11.5, 15.6, after=0)
    p.finish()

    p = Page(c, size, 'Player Pack', 2, 11)
    p.title('Keep through all five missions', 'Your reading crew',
            'These four jobs may be cut apart or pointed to. Rotate jobs after missions 1–4.')
    jobs = [
        ('READER', 'Read one short passage at a time. Ask each teammate what they noticed.'),
        ('PAGE MOVER', 'Move or point to book pages. Ask someone to explain the order before fixing it.'),
        ('EVIDENCE FINDER', 'Find the printed detail that supports a choice. Invite a different reader to check.'),
        ('STORY MAKER', 'Write or draw agreed results. In mission 4, take everyone’s words for the last page.'),
    ]
    gap = 9; width = (p.width-gap)/2; top = p.y; height = 118
    for i,(name,body) in enumerate(jobs):
        mini_card(p, p.left+(i%2)*(width+gap), top-(i//2+1)*height-(i//2)*gap,
                  width,height,'OPTIONAL JOB CARD',f'<b>{name}</b><br/>{body}',cut=True,size=11.6)
    p.y = top-2*height-gap-17
    p.heading('Keep one result from each mission')
    for label in ('1. Book shelf / title','2. Story leaf order','3. What the witnesses imply',
                  '4. Our repaired last page','5. Visitor correction checked'):
        p.rule(label,34)
    p.panel('Sharing rule','With two pupils, combine Reader + Story Maker and Page Mover + Evidence Finder, then swap. With three, one person has two jobs. With five or six, pair up for reading or moving; each partner must say or show something.',90,11.5)
    p.finish()

    p = Page(c, size, 'Player Pack', 3, 11)
    p.title('Mission 1 / search the shelves','Find the returned book',
            'The title has rubbed off its return slip. Match BOTH surviving stamp details to one spine below.')
    top = p.y
    p.panel('RETURN SLIP / KEEP WHOLE','Title missing. <b>CRESCENT</b> above <b>TWO DOTS</b>. Ignore colour.',85,13.3)
    stamp(c, p.right - 39, top - 32, dots=2)
    p.heading('Storybook shelf / point or mark one spine')
    for label,body,star,dots in [
        ('L-42 / The Moonlit Atlas','Crescent above ONE dot',False,1),
        ('S-24 / The Paper Clock','Star above TWO dots',True,2),
        ('L-24 / The Lantern Path','Crescent above TWO dots',False,2),
        ('L-21 / The Garden Gate','Crescent above THREE dots',False,3),
    ]:
        top = p.y
        p.panel(label,body,60,12.3)
        stamp(c, p.right - 38, top - 25, star=star, dots=dots)
    p.text('1. Reader reads the slip.<br/>2. Page Mover points to each spine.<br/>3. Evidence Finder rejects spines that fail either mark.<br/>4. Story Maker records the shelf code and both matching features.',11.9,16.1)
    p.rule('Our shelf code',35)
    p.rule('The two matching details',38)
    p.text('Show both stamp details to your teacher. Then ask for the opening leaf. Keep page 2 in the centre.',11.4,15.3,after=0)
    p.finish()

    p = Page(c, size, 'Player Pack', 4, 11)
    p.title('The book your crew recovered','The Lantern Path',
            'This is the opening leaf. Read it before arranging the four loose middle leaves.')
    p.panel('OPENING LEAF','An old bridge linked the Storybook Library to a walled garden. The garden keeper had invited Kit and Rowan to a story hour before the lanterns went out. Kit set off first, while Rowan stopped at the library for directions. The librarian handed Rowan a folded map. “I will find you,” Rowan promised, stepping onto the evening path.',170,14)
    p.heading('What do we know so far?')
    p.text('Kit left first. Rowan borrowed a map and set out to find Kit. Keep this page: the original story map below will be needed in a later mission.',12.5,17)
    p.writing('One question we hope the story answers',70,2)
    p.panel('Next scene','Your teacher now gives the four loose leaves. Look for words about what happened before, during and after the bridge crossing. Do not look at the damaged final leaf yet.',90,11.8)
    original_map(p)
    p.finish()

    p = Page(c, size, 'Player Pack', 5, 11)
    p.title('Mission 2 / read for cause and order','Put the story back in sequence',
            'The four leaves are marked A–D for handling. Those letters are not their story order.')
    p.panel('Do this together','1. Read all four leaves on pages 6–7 aloud.<br/>2. Write their letters in the four spaces below. If an adult cut the leaves, arrange them on the table BESIDE this sheet; they will not fit inside the spaces.<br/>3. Find two printed phrases that prove your order.<br/>4. Copy the letter order to page 2. Keep every leaf for the final reading.',135,11.8)
    top = p.y; gap = 9; width = (p.width-gap)/2; height = 79
    for i,label in enumerate(('FIRST','SECOND','THIRD','FOURTH')):
        mini_card(p,p.left+(i%2)*(width+gap),top-(i//2+1)*height-(i//2)*gap,
                  width,height,label,'Write the leaf letter here: ______',size=11.9)
    p.y=top-2*height-gap-17
    p.rule('Our letter order',39)
    p.writing('Two printed phrases that prove this order',89,2)
    p.text('Tell your teacher which leaf is last before the missing page. Do not guess the garden-table action yet.',11.5,15.5,after=0)
    p.finish()

    # The leaves are deliberately printed out of narrative order. Cutting is optional.
    for number,keys in ((6,('C','A')),(7,('D','B'))):
        p = Page(c,size,'Player Pack',number,11)
        p.title('Mission 2 / optional adult-cut leaves',f'Two loose story leaves / {number-5} of 2',
                'Default: keep these sheets whole and write letter order on page 5. Optional: an adult cuts the borders so pupils can arrange the leaves on the table.')
        top=p.y; height=197; gap=16
        for i,key in enumerate(keys):
            scene_title,scene_text=SCENES[key]
            y=top-(i+1)*height-i*gap
            mini_card(p,p.left,y,p.width,height,
                      f'LEAF {key}  /  {scene_title}',scene_text,cut=True,size=13.5)
            c.setFillColor(PURPLE)
            c.setFont('LibraryBold', 10.2)
            c.drawString(p.left+13,y+37,'A phrase that helps place this leaf:')
            c.setStrokeColor(LINE)
            c.line(p.left+205,y+35,p.right-14,y+35)
        p.y=top-2*height-gap-17
        p.panel('Story evidence','Read the words on these leaves; the cover illustration is not a clue. Keep all four leaves after ordering them, because your crew will read them again at the end.',75,11.6)
        p.finish()

    p = Page(c,size,'Player Pack',8,11)
    p.title('Mission 3 / listen to three witnesses','What could happen next?',
            'The story stops at the garden table. Three people saw different parts of the problem.')
    p.panel('Adult handout','Your teacher cuts page 9 into THREE separate notes and gives them to three pupils. With two pupils, the teacher holds note 3 and reads it after notes 1 and 2 are shared. Keep the whole sheet out of view.',99,11.8)
    p.panel('Do this together','1. Three note holders each read one fact aloud; do not show the note.<br/>2. Other crew members each repeat or point to a different fact. In a crew of five or six, give these listeners the Evidence Finder and Story Maker jobs.<br/>3. Ask: what can Kit take home while Rowan still returns the original?<br/>4. Agree on one plan using all three notes, then write it below.',143,11.8)
    for label in ('Kit needs','Rowan must','The garden table has'):
        p.rule(label,45)
    p.writing('Our plan / use all three notes',111,3)
    p.text('Each pupil should say, point to or record one contribution. Show your teacher which note supports each part of the plan.',11.6,15.6,after=0)
    p.finish()

    p = Page(c,size,'Player Pack',9,11)
    p.title('Mission 3 / adult-cut and deal separately','Three witness notes',
            'Cut only the THREE bordered notes. Give them to different pupils; keep the whole sheet out of the crew’s view.')
    notes=[
        ('NOTE 1 / ROWAN','I borrowed the only map from the Storybook Library. It must go back tomorrow. I cannot give away the original.'),
        ('NOTE 2 / KIT','I need a way to find the path home after the garden grows dark. If Rowan takes the only map, I will not know the turns.'),
        ('NOTE 3 / GARDEN KEEPER','There is blank paper and a pencil on the garden table. They are ready for anyone who needs them.'),
    ]
    top=p.y; height=133; gap=15
    for i,(label,body) in enumerate(notes):
        mini_card(p,p.left,top-(i+1)*height-i*gap,p.width,height,label,
                  body+'<br/><br/>Tell the crew this fact in your own words.',cut=True,size=13)
    p.y=top-3*height-2*gap-15
    p.panel('Two-pupil crew','The adult keeps Note 3 out of view. After both pupils share their own notes, the adult reads Note 3 aloud to both. The pupils still make the plan together.',87,11.7)
    p.finish()

    p = Page(c,size,'Player Pack',10,11)
    p.title('Mission 4 / restore the damaged leaf','Write the missing final chapter',
            'The first and last lines survived. Make Kit’s paper route copy, then write the action between the lines.')
    p.panel('SURVIVING FIRST LINE','“At the garden table, Rowan unfolded the borrowed map.”',65,13.1)
    p.text('Use the map on page 4. Write its FOUR stops below for Kit; short labels such as table, gate, bridge and home are fine. Rowan keeps the borrowed original for the library.',12.2,16.6)
    route_copy(p)
    p.text('Now write three or four sentences: what the keeper offers, how Kit receives the copy, and when Rowan returns the original. Use your own words; a partner or adult may write your dictated sentences.',12.0,16.2)
    p.writing('OUR RESTORED MIDDLE / write or dictate',133,4)
    p.panel('SURVIVING LAST LINE','“Kit smiled when the path home became clear.”',65,13.1)
    p.text('Check: the copied route reaches Kit’s home; the original goes back to the library. Point to the map and witness notes that support your ending.',11.5,15.5,after=0)
    p.finish()

    p = Page(c,size,'Player Pack',11,11)
    p.title('Mission 5 / a library reading circle','Read the complete story',
            'Read the opening, four middle leaves and your final page; then correct a visitor’s mistaken summary.')
    p.panel('Read with or without cutting','1. Read opening page 4.<br/>2. Read the four leaves in the LETTER ORDER written on page 5. If pages 6–7 remain whole, turn between those pages and point to each leaf; do not try to line them up. If an adult cut them, line the four pieces up on the table.<br/>3. Read your final page 10. Every pupil reads, points or explains one part.',132,11.7)
    p.heading('The visitor got one fact wrong')
    p.panel('VISITOR’S SUMMARY','“Kit kept the library’s only original map. Rowan had nothing to return.”',73,12.4)
    p.text('Point to the witness note and the route copy that prove the mistake. Tell the visitor what really happened, then write a corrected sentence.',11.8,15.8)
    p.writing('Our corrected visitor sentence',80,2)
    p.panel('One more evidence check','Which leaf proves the bridge comes before the garden table? Point to the printed words, then ask the visitor to read your repaired final page.',75,11.8)
    p.rule('Write REPAIRED when checked',35)
    p.text('Each crew member shares one contribution. Keep the completed paper story; replay has the same evidence and answer.',11.5,15.5,after=0)
    p.finish()


GUIDE_DATA=[
    ('Give player page 3 only; keep opening and later pages behind the teacher.',
     'Read both return-slip marks, then compare each marked spine. Ask a pupil to rule out at least one spine for each wrong mark. Record the surviving shelf code.',
     'L-24: CRESCENT above TWO DOTS. L-42 has one dot, S-24 has a star, and L-21 has three dots.',
     ('Compare the shape first.','Which spines still have exactly two dots?','L-24 matches both marks.'),
     'Give page 4 and then pages 5–7 for mission 2.'),
    ('Give pages 5–7. Default: keep the leaves on whole sheets; optional: adult-cut four leaves.',
     'Read all four scenes. Pupils WRITE one letter in each page-5 slot; full-size leaves do not fit in those slots. If cut, move the four leaves on the TABLE beside the board. Ask for two printed phrases before recording the order. Keep page 4’s story map available but do not suggest copying it yet.',
     'B → D → C → A. Borrowed map precedes the dark bridge; the crossing precedes reaching the garden table.',
     ('Find the leaf where the map is borrowed.','Look for “Before they crossed” and “After they crossed”.','B, D, C, A is the story order.'),
     'Keep all four leaves for mission 5; give pages 8–9.'),
    ('Give page 8. Cut page 9 into three slips and deal one to each of three pupils; with two pupils, keep slip 3 until both share.',
     'Three holders read one fact each. In a crew of four to six, remaining pupils restate, check or record one fact each. Kit needs a way home, Rowan must return the only library map, and the keeper has paper and pencil. Agree on an action using all three.',
     'Copy the route onto the keeper’s blank paper; give Kit that copy; return the original library map. Require all three facts, not just “give Kit the map”.',
     ('Ask what Kit needs.','What must Rowan do with the original, and what is on the table?','A paper copy lets Kit have a route while the original goes back.'),
     'Keep the three notes visible. Give page 10 only after the crew makes its plan.'),
    ('Give page 10, page 4’s original map and the three already-shared notes. Keep page 11 for the final reading.',
     'First pupils copy the FOUR printed stops from page 4 into the blank route strip on page 10: Garden Table, Garden Gate, River Bridge, Kit’s Home. Short labels (table, gate, bridge, home) fit the boxes. Then they write or dictate the missing story action. Check that Kit gets the copy and Rowan returns the original the next morning.',
     'Accept short labels or varied wording if the route strip has four stops in order, Kit receives that copy, the borrowed original returns to the library, and the new action follows the earlier pages. Use the answer atlas as a model, not required prose.',
     ('Point to the four stops on page 4.','Which paper becomes Kit’s copy while the original stays with Rowan?','Transfer the route in order; Kit takes the copy and Rowan returns the original next morning.'),
     'Ask the crew to read its page aloud. Then give page 11 and invite a visitor.'),
    ('Give page 11. Another crew may visit; if there is one crew, the teacher visits.',
     'Read page 4, then the four leaves by the recorded letter order, then page 10. Without cutting, turn between whole pages 6–7; with adult-cut leaves, line them up on the table. The visitor reads the wrong summary on page 11. Pupils show Note 1 and the route copy, then write one corrected sentence. Ask which leaf puts the bridge before the garden.',
     'The story reads B-D-C-A. A valid correction says Kit kept a COPY and Rowan returned the ORIGINAL; evidence includes Note 1 and page 10’s route strip. The dark bridge/far bank leaves precede the garden table. Everyone contributes; artistic polish is not graded.',
     ('Follow the written B-D-C-A order while turning pages.','Which note says the original must return? Point to the route copy.','Cross out “original”; write that Kit kept a copy and Rowan returned the map.'),
     'Read the closing on guide page 10 and let the crew mark “REPAIRED”.'),
]


def guide(c: Canvas,size):
    p=Page(c,size,'Teacher Guide',1,10)
    p.title('Teacher quick start','Run the story repair desk',
            'Five different actions: search, sequence, combine testimony, write and read aloud.')
    p.panel('One-minute setup','Print one 11-page Player Pack per crew of 2–6 pupils. Keep one 10-page Teacher Guide for yourself. For 35 pupils, make five crews of six and one of five. Sort the pages into the five handout piles listed on page 2.',102,12)
    p.heading('Before pupils arrive')
    for line in ('1. Print single-sided at Actual size in A4 or US Letter; use one size for the whole crew.',
                 '2. Cut the THREE private witness notes on Player page 9. Default: keep story leaves whole. Cut them only for the optional tabletop arrangement.',
                 '3. Place pages 1–2 and pencils on each table. Hold pages 3–11 and this answer guide.',
                 '4. Read each mission scene before releasing only that mission’s pages.'):
        p.text(line,11.9,16.2,after=7)
    p.panel('Supplies','Required: ordinary paper, a printer, pencil and eraser for each crew, and a table. Adult-handled scissors are needed for the three private slips; cutting story leaves and job cards is optional. No glue, stapler, screen, real book, prize or trip is required.',90,11.7)
    p.panel('Keep the mystery intact','The title of the inner book is on Player page 4. The final action is not stated on pages 1–7. Never hand out Player page 9 as one uncut sheet or show the answer atlas to pupils.',89,11.6)
    p.panel('The same rhythm for every mission','1. Read the scene on the matching Guide page.<br/>2. Give only the named Player pages.<br/>3. Let pupils read, move, speak or write before checking.<br/>4. Ask for printed evidence; give one hint at a time if needed.<br/>5. Record the result, rotate jobs and release the next pile.',130,11.6)
    p.finish()

    p=Page(c,size,'Teacher Guide',2,10)
    p.title('Exact print inventory','Print, cut and stage','All named game props are inside the Player Pack.')
    for label,body in [
        ('START / PLAYER 1–2','Cover, quick start, four optional job cards and one continuing record.'),
        ('PILE 1 / PLAYER 3','Return slip and four-spine shelf chart; leave the sheet whole.'),
        ('PILE 2 / PLAYER 4–7','Opening leaf with original route map, letter-only sequence board and four story leaves. Default: keep leaves whole; optional: adult-cut them for the table.'),
        ('PILE 3 / PLAYER 8–9','Evidence board plus THREE separately cut witness notes. Deal one note per pupil; keep the sheet hidden.'),
        ('PILE 4 / PLAYER 10','Damaged final leaf with four-stop route-copy strip, surviving lines and ruled writing space.'),
        ('PILE 5 / PLAYER 11','No-cut reading order, mistaken visitor summary, correction space and completion line.')]:
        p.panel(label,body,66,11.3)
    p.text('Required loose pieces: three private witness notes per crew. Optional: four role cards and four large story leaves. With six crews, print 66 Player pages and cut 18 required private slips. Keep one complete set per crew.',11.5,15.3,after=0)
    p.finish()

    p=Page(c,size,'Teacher Guide',3,10)
    p.title('Before the first handout','Roles, groups and opening','Everyone needs an action; a spoken, pointed or dictated answer counts.')
    p.panel('Groups of 2–6','2: Reader + Story Maker / Page Mover + Evidence Finder; swap bundles. 3: combine Evidence Finder + Story Maker and rotate. 4: one job each. 5: pair the Reader job. 6: pair Reader and Page Mover. In mission 3, three pupils hold private notes; every other pupil must restate, check or record a different fact. Swap active jobs after each mission.',132,11.7)
    p.panel('Whole class','For 35 pupils use five crews of six and one crew of five. Each has the entire 11-page Player Pack. Read a scene to the room, let crews act independently, then check results by visiting tables. A waiting crew may rehearse its current page, not inspect later piles.',110,11.7)
    p.heading('Read this opening aloud')
    p.panel('Opening scene','“The Storybook Library has a book with a missing last leaf. Its other leaves have come loose. Your crew will find the book, read every page, listen to three people and write a final page that fits. There is no race. Show which printed words support your decisions; if you get stuck, ask for a small hint.”',122,11.7)
    p.text('Place Player pages 1–2 and pencils on each table. Keep later pages in separate numbered piles with the adult. Rotate roles after each of the first four missions.',11.7,15.8,after=0)
    p.finish()

    for idx,(instructions,actions,answer,hints,handover) in enumerate(GUIDE_DATA,1):
        p=Page(c,size,'Teacher Guide',idx+3,10)
        p.title(f'Mission {idx} / adult only',
                ('Find the book','Order the loose leaves','Hear three witnesses',
                 'Restore the final leaf','Host the reading circle')[idx-1],instructions)
        p.panel('Read this scene aloud',READ_ALOUD[idx-1],91,12)
        p.heading('Lead the actions')
        p.text(actions,12,16.3,after=12)
        p.panel('Accept when the crew shows this',answer,101 if idx in (3,4,5) else 89,11.7)
        p.heading('Hints / stop after each')
        for n,hint in enumerate(hints,1):
            p.text(f'<b>{n}.</b> {hint}',11.8,16.1,after=6)
        if idx==3:
            p.panel('Two pupils','Hold note 3 out of sight. After both pupils share their own notes, read note 3 aloud to both. Let them form the plan; do not say the answer first.',83,11.5)
        else:
            p.panel('If the crew hesitates','Ask for the printed phrase or note that supports the attempt. Read a sentence aloud if needed. Let pupils move, point, dictate or revise; do not reject a thoughtful answer for spelling or drawing quality.',81,11.4)
        p.panel('Handover',handover,67,11.3)
        p.finish()

    p=Page(c,size,'Teacher Guide',9,10)
    p.title('Adult reference only','Answers and a model ending','The model shows valid evidence; pupils may use different words.')
    for label,body in [
        ('1 / SHELF','L-24 matches CRESCENT + TWO DOTS. Other spines each fail one mark.'),
        ('2 / FOUR LEAVES','B → D → C → A: borrowed map, dark bridge and lantern, far bank, garden table.'),
        ('3 / THREE NOTES','Kit needs a route, Rowan must return the only borrowed map, and the keeper has paper and pencil. Copy the route for Kit; return the original.'),
        ('4 / LAST LEAF','Route strip: Garden Table → Garden Gate → River Bridge → Kit’s Home. Model: “The keeper gave Rowan paper and a pencil. Rowan copied the path for Kit. In the morning Rowan returned the original map to the library.” Accept other wording with the same facts.'),
        ('5 / READING CIRCLE','Correct the visitor: Kit kept a route COPY; Rowan returned the library ORIGINAL. Use Note 1 and the route strip as evidence. Read whole leaves by recorded letters if they were not cut.')]:
        p.panel(label,body,81 if label.startswith(('3','4')) else 70,11.4)
    p.panel('When an answer nearly fits','If a crew puts a large leaf inside a page-5 box, ask them to write its letter instead. If their route misses a stop, trace page 4 from garden table to Kit’s home. If the final story gives away the original map, reread Rowan’s private note. In the visitor check, fix the false fact rather than changing a valid storytelling style.',118,11.5)
    p.finish()

    p=Page(c,size,'Teacher Guide',10,10)
    p.title('Finish and continue','Help, closing and reset','The adult can guide a crew without inventing missing rules or materials.')
    p.heading('Reading and writing support')
    p.text('Read one sentence at a time for early readers. A child may point to a leaf, dictate a sentence, or draw a route while another writes the agreed words. Older readers can explain why another leaf order fails or add a smooth transition. Require the same three witness facts from every crew.',11.8,16.1)
    p.heading('If a crew is stuck or a piece is missing')
    p.text('Give that mission’s numbered hints one at a time. Let the crew retry. If necessary, supply the outgoing result and continue; nobody is eliminated. Reprint a missing labelled Player page rather than inventing a clue. In the default no-cut mode, write letters on page 5 and turn between whole pages 6–7 at the finale. Page-9 witness notes still must be cut and dealt separately.',11.8,16.1)
    p.heading('If the period ends')
    p.text('Store each crew’s page-2 record with the story leaves and task pages already issued. Label its bundle. Keep unopened mission piles and this guide with the adult. Resume at the next unchecked mission.',11.8,16.1)
    p.panel('Read the closing after the visitor correction','“Your crew found the book, rebuilt its path, listened to three people and restored a last page that belongs in this story. The Storybook Library can read The Lantern Path from beginning to end again.”',103,11.7)
    p.panel('Reset','Let every pupil name or show one contribution. Keep the completed story or recycle it. For another play, erase the record, sort the same pages and change jobs. The mystery has the same evidence; do not promise a new answer.',78,11.5)
    p.finish()


def build_paper(paper,size):
    entries=[];files=[]
    for role,make,expected in (('player',player,11),('guide',guide,10)):
        path=OUT/f'library-classroom-{role}-1.0-{paper}.pdf'
        canvas=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1)
        canvas.setTitle(f'The Missing Final Chapter / {role.title()} / {paper}')
        canvas.setAuthor('Paper Adventure Workshop')
        make(canvas,size);canvas.save()
        count=len(PdfReader(path).pages)
        assert count==expected,(path,count)
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        entries.append(dict(world='library',setting='classroom',paper=paper,role=role,
                            path=path.relative_to(ROOT).as_posix(),pages=count,
                            bytes=path.stat().st_size,sha256=sha,
                            r2Key=f'retail/library/classroom/1.0/{paper}/{role}-{sha[:16]}.pdf'))
        files.append(path)
    with zipfile.ZipFile(OUT/f'library-classroom-{paper}-complete-1.0.zip','w',zipfile.ZIP_DEFLATED) as bundle:
        for path in files:
            bundle.write(path,path.name)
    return entries


def build():
    OUT.mkdir(parents=True,exist_ok=True)
    entries=[]
    for paper,size in (('A4',A4),('Letter',letter)):
        entries.extend(build_paper(paper,size))
    path=OUT/'retail-packs-1.0-manifest.json'
    data=json.loads(path.read_text(encoding='utf-8'))
    data['items']=[item for item in data['items']
                   if (item['world'],item['setting'])!=('library','classroom')]+entries
    path.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print('Library Classroom rebuilt:',[(e['paper'],e['role'],e['pages']) for e in entries])


if __name__=='__main__':
    build()
