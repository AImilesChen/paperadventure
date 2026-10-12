"""C10 Weather Observatory: an instrument-and-evidence classroom paper game.

This module rebuilds only the Weather Classroom retail slots, bundles and manifest
entries. The old candidate-card quiz remains archived in earlier source data.
"""
from __future__ import annotations

import hashlib
import json
import math
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
ART = ROOT / 'public' / 'assets' / 'weather-classroom-v0.1.webp'
NAVY = colors.HexColor('#123451')
INK = colors.HexColor('#2B465B')
TEAL = colors.HexColor('#087988')
PALE = colors.HexColor('#ECF7F8')
SKY = colors.HexColor('#DDF1F8')
LINE = colors.HexColor('#9DBFCB')
GRAY = colors.HexColor('#E7EDF0')
WHITE = colors.white

pdfmetrics.registerFont(TTFont('WeatherArial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('WeatherBold', r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFont(TTFont('WeatherGeorgia', r'C:\Windows\Fonts\georgia.ttf'))

TITLE = "The Observatory's Missing Morning Bulletin"
SCENES = (
    "The morning display opens soon. The observatory's 9:00, 10:00 and 11:00 records have been mixed with notes from another station. Find OUR three records and put them in time order. The correct station has a circle above TWO short bars. The other station has only ONE bar. Leave the other station's notes aside.",
    "The three times are back in order, but the direction readings have fallen away from the wind dial. Each snapshot has its own small N mark. Turn one paper snapshot until its N matches NORTH on the large dial. Then read where the thick pointer says the wind CAME FROM. Repeat at every time before the next station opens.",
    "The wind readings are safe in the log. Now the sky-window sheets arrive from the roof. Each view has four equal panes. Some are covered by patterned clouds. Count the covered panes at each time and shade the same number on your record board. You do not need to guess a real cloud type or predict what comes next.",
    "The rain clerk has three paper level strips, but a copied notice may be wrong. Lay each strip beside the paper gauge with its BASELINE at zero. Read the top of the shaded level against the marks. Compare all three readings with the notice; circle and repair any number that does not match the original strip.",
    "The display desk is ready, but it cannot post an unchecked notice. Use your original records to fill the empty morning bulletin yourself. Ask another pupil to check each row against the time slips, wind cards, sky cards and rain strips. Correct a mismatch before the reporter reads the notice to the group.",
)


class Page:
    def __init__(self, canvas: Canvas, size, role: str, number: int, total: int):
        self.c, self.w, self.h = canvas, *size
        self.left, self.right = 44, self.w - 44
        self.width = self.right - self.left
        self.y = self.h - 61
        self.number = number
        canvas.setFillColor(SKY)
        canvas.rect(0, self.h - 35, self.w, 35, fill=1, stroke=0)
        canvas.setFillColor(NAVY)
        canvas.setFont('WeatherBold', 8.6)
        canvas.drawString(self.left, self.h - 22, 'PAPER ADVENTURE  /  WEATHER  /  CLASSROOM')
        canvas.setStrokeColor(LINE)
        canvas.line(self.left, 38, self.right, 38)
        canvas.setFont('WeatherArial', 8.5)
        canvas.drawString(self.left, 25, f'{role.upper()}  /  Edition 1.0  /  {"A4" if size == A4 else "US Letter"}')
        canvas.drawRightString(self.right, 25, f'Page {number} of {total}')

    def text(self, value: str, size=12.0, leading=None, *, bold=False, color=INK,
             after=8, x=None, width=None):
        style = ParagraphStyle('body', fontName='WeatherBold' if bold else 'WeatherArial',
                               fontSize=size, leading=leading or size * 1.34,
                               textColor=color)
        para = Paragraph(value, style)
        _, height = para.wrap(width or self.width, 2000)
        self.y -= height
        if self.y < 49:
            raise ValueError(f'page {self.number} overflow at {self.y:.1f}/{self.h:.1f}: {value[:70]}')
        para.drawOn(self.c, x if x is not None else self.left, self.y)
        self.y -= after

    def title(self, kicker: str, title: str, deck=''):
        self.text(kicker.upper(), 9.8, 13, bold=True, color=TEAL, after=7)
        self.text(title, 22.5, 28, color=NAVY, after=8)
        if deck:
            self.text(deck, 12.5, 17.2, after=12)

    def heading(self, value: str):
        self.text(value, 14.8, 19.8, bold=True, color=NAVY, after=7)

    def panel(self, title: str, body: str, height=76, size=11.6):
        para = Paragraph(body, ParagraphStyle('panel', fontName='WeatherArial',
                           fontSize=size, leading=size * 1.34, textColor=INK))
        _, ph = para.wrap(self.width - 24, 2000)
        height = max(height, ph + 43)
        bottom = self.y - height
        if bottom < 49:
            raise ValueError(f'page {self.number} panel overflow: {title} (bottom {bottom:.1f}, page {self.h:.1f})')
        c = self.c
        c.setFillColor(PALE); c.setStrokeColor(LINE)
        c.roundRect(self.left, bottom, self.width, height, 7, fill=1, stroke=1)
        c.setFillColor(NAVY); c.setFont('WeatherBold', 11.4)
        c.drawString(self.left + 12, self.y - 20, title)
        para.drawOn(c, self.left + 12, self.y - 29 - ph)
        self.y = bottom - 12

    def rule(self, label: str, height=36):
        self.c.setFillColor(NAVY); self.c.setFont('WeatherBold', 10.8)
        self.c.drawString(self.left, self.y - 1, label)
        self.c.setStrokeColor(LINE)
        self.c.line(self.left + 190, self.y - 4, self.right, self.y - 4)
        self.y -= height
        if self.y < 49:
            raise ValueError(f'page {self.number} field overflow')

    def finish(self):
        self.c.showPage()


def card(p: Page, x, y, w, h, label: str, body: str, *, cut=False, size=11.8):
    c = p.c
    c.setFillColor(WHITE); c.setStrokeColor(TEAL)
    if cut:
        c.setDash(5, 3)
    c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
    c.setDash()
    c.setFillColor(NAVY); c.setFont('WeatherBold', 11.4)
    c.drawString(x + 11, y + h - 20, label)
    para = Paragraph(body, ParagraphStyle('card', fontName='WeatherArial',
                     fontSize=size, leading=size * 1.33, textColor=INK))
    _, ph = para.wrap(w - 22, h - 32)
    if ph > h - 40:
        raise ValueError(f'card overflow: {label}')
    para.drawOn(c, x + 11, y + h - 29 - ph)


def compass(c, cx, cy, radius, *, north_angle=90, pointer_angle=None, show_labels=True):
    c.setStrokeColor(TEAL); c.setLineWidth(1.4)
    c.circle(cx, cy, radius, fill=0, stroke=1)
    if show_labels:
        c.setFillColor(NAVY); c.setFont('WeatherBold', 13)
        for label, dx, dy in [('N', 0, radius + 14), ('E', radius + 15, -4),
                              ('S', 0, -radius - 24), ('W', -radius - 18, -4)]:
            c.drawCentredString(cx + dx, cy + dy, label)
    else:
        a = math.radians(north_angle)
        nx, ny = cx + (radius + 4) * math.cos(a), cy + (radius + 4) * math.sin(a)
        c.setFillColor(NAVY); c.setFont('WeatherBold', 11)
        c.drawCentredString(nx, ny - 3, 'N')
        c.setStrokeColor(LINE); c.line(cx, cy, nx, ny)
    if pointer_angle is not None:
        a = math.radians(pointer_angle)
        tx, ty = cx + (radius - 9) * math.cos(a), cy + (radius - 9) * math.sin(a)
        c.setStrokeColor(NAVY); c.setLineWidth(5)
        c.line(cx, cy, tx, ty)
        c.setFillColor(NAVY); c.circle(tx, ty, 5, fill=1, stroke=0)
        c.setLineWidth(1)
    c.setFillColor(TEAL); c.circle(cx, cy, 3, fill=1, stroke=0)


def sky_cells(c, x, y, cell, cloudy: int):
    # Four high-contrast panes; hatching supplements fill for greyscale printing.
    for i in range(4):
        xx = x + i * (cell + 5)
        c.setStrokeColor(NAVY); c.setFillColor(GRAY if i < cloudy else WHITE)
        c.roundRect(xx, y, cell, cell, 4, fill=1, stroke=1)
        if i < cloudy:
            c.setStrokeColor(TEAL)
            for k in range(7, int(cell) - 3, 9):
                c.line(xx + k, y + 4, xx + min(k + 13, cell - 3), y + cell - 4)


def gauge(c, x, y, *, level=None, width=150, height=158):
    """Base and equal-size level strip share a 28-pt-per-mm scale."""
    c.setFillColor(WHITE); c.setStrokeColor(NAVY)
    c.roundRect(x, y, width, height, 5, fill=1, stroke=1)
    base = y + 22
    if level is None:
        c.setFont('WeatherBold', 11)
        for n in range(5):
            yy = base + n * 28
            c.setStrokeColor(LINE); c.line(x + 38, yy, x + width - 10, yy)
            c.setFillColor(NAVY); c.drawRightString(x + 30, yy - 4, f'{n} mm')
        c.setFillColor(TEAL); c.setFont('WeatherBold', 10)
        c.drawString(x + 39, y + 5, 'ALIGN BASELINE WITH 0')
    else:
        c.setFillColor(NAVY); c.setFont('WeatherBold', 11.2)
        c.drawString(x + 10, y + height - 18, 'PAPER LEVEL STRIP')
        c.setStrokeColor(NAVY); c.setLineWidth(1.4)
        c.line(x + 12, base, x + width - 12, base)
        if level:
            c.setFillColor(GRAY); c.setStrokeColor(TEAL)
            c.rect(x + 31, base, width - 62, level * 28, fill=1, stroke=1)
            for yy in range(10, level * 28, 12):
                c.line(x + 36, base + yy, x + width - 36, base + yy)
        else:
            c.setFillColor(INK); c.setFont('WeatherArial', 10.5)
            c.drawCentredString(x + width / 2, base + 12, 'NO SHADED LEVEL')
        c.setFillColor(NAVY); c.setFont('WeatherBold', 10)
        c.drawCentredString(x + width / 2, y + 6, 'BASELINE')


def data_board(p: Page, *, bulletin=False):
    c = p.c
    top = p.y
    h = 264 if bulletin else 320
    bottom = top - h
    if bottom < 49:
        raise ValueError('data board overflow')
    col = [p.left, p.left + 80, p.left + 194, p.left + 325, p.right]
    c.setFillColor(PALE); c.setStrokeColor(LINE)
    c.roundRect(p.left, bottom, p.width, h, 7, fill=1, stroke=1)
    c.setFillColor(NAVY); c.setFont('WeatherBold', 11)
    for i, name in enumerate(('TIME', 'WIND FROM', 'CLOUD PANES', 'RAIN / mm')):
        c.drawString(col[i] + 8, top - 27, name)
    c.setStrokeColor(LINE)
    for xx in col[1:-1]: c.line(xx, bottom, xx, top)
    c.line(p.left, top - 42, p.right, top - 42)
    row_h = (h - 42) / 3
    for i, hour in enumerate(('9:00', '10:00', '11:00')):
        y = top - 42 - (i + 1) * row_h
        if i < 2: c.line(p.left, y, p.right, y)
        c.setFillColor(NAVY); c.setFont('WeatherBold', 15)
        c.drawString(p.left + 11, y + row_h / 2 - 5, hour)
        for j in range(1, 4):
            c.setStrokeColor(LINE); c.line(col[j] + 9, y + 20, col[j+1] - 9, y + 20)
    p.y = bottom - 13


def steps(p: Page, lines):
    p.heading('Do this together')
    for i, line in enumerate(lines, 1):
        p.text(f'<b>{i}.</b> {line}', 12.0, 16.3, after=6)


def player(c: Canvas, size):
    p = Page(c, size, 'Player Pack', 1, 12)
    p.title('Weather Observatory / five missions', TITLE,
            'Run a paper observatory. Restore the times, use three printed tools and publish a checked morning report.')
    image_w = min(310, p.width * .65)
    image_h = image_w * .58
    c.drawImage(str(ART), (p.w - image_w)/2, p.y - image_h,
                image_w, image_h, preserveAspectRatio=True, anchor='c')
    p.y -= image_h + 14
    p.panel('Your story begins', 'The school display opens at noon. Records from 9:00, 10:00 and 11:00 are out of order, and the copied notice may contain a mistake. Work as an observatory crew: inspect the original paper evidence before you post anything.', 96, 12)
    p.heading('Start in three steps')
    for line in ('1. Get a job on page 2; your teacher keeps later missions back.',
                 '2. Keep page 3 on the table. Record each instrument reading there.',
                 '3. Ask a teammate to check your final bulletin against the paper tools.'):
        p.text(line, 12, 16.2, after=5)
    p.panel('All you need', 'Printed pages, pencils and a teacher with scissors. Every weather reading in this game is fictional and printed here. Do not use this game to make a real forecast or safety decision.', 83, 11.6)
    p.panel('Your five missions', 'SORT TIMES / TURN WIND / COUNT CLOUDS / READ RAIN / POST NOTICE.<br/>Keep each original paper tool so a teammate can check the last page.', 83, 11.9)
    p.finish()

    p = Page(c, size, 'Player Pack', 2, 12)
    p.title('Keep this page', 'Your observatory crew',
            'Choose jobs now. Swap job bundles after EACH mission so every pupil tries more than one action.')
    roles = [
        ('SCENE READER', 'Read the new scene and one step at a time. Ask every player what the paper shows.'),
        ('TOOL OPERATOR', 'Move or align the current paper instrument. Let a partner repeat the action.'),
        ('DATA READER', 'Say what the aligned instrument shows. Point to the exact mark or covered pane.'),
        ('RECORDER', 'Write or draw the group answer on page 3. Accept a younger pupil\'s spoken answer.'),
        ('CHECKER', 'Use the original paper prop to challenge an answer before the group keeps it.'),
        ('REPORTER', 'At the end, read your checked bulletin. Before that, help point to evidence.'),
    ]
    top = p.y
    cw = (p.width - 12) / 2
    ch = 96
    for i, (name, body) in enumerate(roles):
        row, col = divmod(i, 2)
        card(p, p.left + col*(cw+12), top - (row+1)*(ch+9), cw, ch, name, body)
    p.y = top - 3*(ch+9) - 8
    p.panel('Assign the jobs',
            '2: A = Scene Reader + Recorder + Reporter; B = Tool Operator + Data Reader + Checker.<br/>'
            '3: A = Scene Reader + Reporter; B = Tool Operator + Checker; C = Data Reader + Recorder.<br/>'
            '4: A = Scene Reader + Reporter; B = Tool Operator + Data Reader; C = Recorder; D = Checker.<br/>'
            '5: Pair Scene Reader + Reporter; give the other four jobs to four pupils.<br/>'
            '6: One job each. After every mission, pass the jobs to the next pupil. The final Checker must be a different pupil from the Recorder.',
            160, 11.7)
    p.finish()

    p = Page(c, size, 'Player Pack', 3, 12)
    p.title('Keep this whole page on the table', 'Our morning observation board',
            'Write only what the paper tools show. Your teacher gives one mission at a time.')
    data_board(p)
    p.panel('How to make a record', 'Wind: write the direction the pointer shows AFTER its NORTH mark is aligned. Cloud: shade or write how many of four panes are covered. Rain: align the strip baseline with zero, then write the top reading in mm.', 102, 11.8)
    p.heading('A correction is part of the work')
    p.rule('A mark we checked twice')
    p.rule('A number we corrected')
    p.text('A pupil may point or dictate while another writes. Keep every original tool nearby for the final peer check.', 11.6)
    p.finish()

    p = Page(c, size, 'Player Pack', 4, 12)
    p.title('Mission 1 / sort the records', 'Which station, which time?',
            'The correct station mark is a CIRCLE above TWO short bars. Keep only its 9:00, 10:00 and 11:00 slips.')
    p.panel('The scene', SCENES[0], 98, 11.8)
    steps(p, ('Find the circle-and-two-bars mark on three slips. Set the one-bar slips aside.',
              'Put the three matching slips left to right from earliest to latest.',
              'Point to all three times on page 3. The Recorder prepares those rows.'))
    top = p.y - 3
    cw = (p.width - 12)/2
    cards = [('11:00',2),('9:00',1),('10:00',2),('9:00',2),('11:00',1)]
    for i, (hour, bars) in enumerate(cards):
        row,col=divmod(i,2)
        x=p.left+col*(cw+12); y=top-(row+1)*105
        card(p,x,y,cw,97,f'RECORD {i+1} / {hour}', '',cut=True,size=10.5)
        c.setFillColor(TEAL);c.circle(x+29,y+48,10,fill=1,stroke=0)
        c.setStrokeColor(NAVY);c.setLineWidth(2)
        for j in range(bars):c.line(x+16,y+30-j*11,x+42,y+30-j*11)
        c.setFillColor(NAVY);c.setFont('WeatherArial',11.0)
        c.drawString(x+58,y+36,'OBSERVATORY SEAL')
    p.y=top-3*105-9
    p.text('Adult: cut only the five outer slip rectangles. Keep their time labels. No-cut option: pupils point to the five slips here.',11.2)
    p.finish()

    p = Page(c, size, 'Player Pack', 5, 12)
    p.title('Mission 2 / paper direction dial', 'Where did the wind come from?',
            'Turn each snapshot so its small N mark points to NORTH on this large dial.')
    p.panel('The scene',SCENES[1],101,11.8)
    steps(p, ('See the PRACTICE drawing on page 6, then take the three game snapshots. Use one at a time.',
              'Turn the square until its printed N mark is at the top, like this base dial.',
              'Read the thick pointer tip: N, E, S or W. Write one direction for each time on page 3.'))
    cy=p.y-137;cx=p.w/2
    compass(c,cx,cy,115,show_labels=True)
    # Leave a clear gap below the south label before the rule panel.
    p.y=cy-158
    p.panel('Important direction rule','The thick pointer says where the pretend wind CAME FROM. The small N mark is only for alignment; it is not automatically your answer. Each square has its own time label.',85,11.8)
    p.finish()

    p = Page(c, size, 'Player Pack', 6, 12)
    p.title('Mission 2 / cut three outer cards', 'Direction snapshots',
            'Adult: cut around each large card. Do not cut out the small N mark or the thick pointer.')
    p.panel('Use the page 5 base dial','Place one square over the centre of the base dial and TURN THE WHOLE SQUARE. Match its N to the base dial N before reading its pointer. Keep the square time label visible. The practice drawing below is not a game card.',88,11.7)
    card_w=min(218,(p.width-14)/2)
    top=p.y-8
    # (time, original north angle, original pointer angle). After aligning N,
    # results are West, West and North respectively.
    for i,(hour,north,pointer) in enumerate((('9:00',0,90),('10:00',270,0),('11:00',180,180))):
        row,col=divmod(i,2)
        x=p.left+col*(card_w+14);y=top-(row+1)*(card_w+10)
        card(p,x,y,card_w,card_w,f'WIND / {hour}','',cut=True,size=10)
        compass(c,x+card_w/2,y+card_w/2-3,65,north_angle=north,pointer_angle=pointer,show_labels=False)
    # The spare quadrant is a neutral worked example, not another cut piece or a game answer.
    demo_x=p.left+card_w+14; demo_y=top-2*(card_w+10)
    c.setFillColor(PALE); c.setStrokeColor(LINE)
    c.roundRect(demo_x,demo_y,card_w,card_w,7,fill=1,stroke=1)
    c.setFillColor(NAVY); c.setFont('WeatherBold',10.5)
    c.drawString(demo_x+11,demo_y+card_w-20,'PRACTICE ONLY / DO NOT CUT')
    c.setFont('WeatherArial',10.8)
    c.drawCentredString(demo_x+54,demo_y+card_w-48,'BEFORE')
    c.drawCentredString(demo_x+162,demo_y+card_w-48,'AFTER TURNING')
    compass(c,demo_x+53,demo_y+108,34,north_angle=0,pointer_angle=270,show_labels=False)
    compass(c,demo_x+161,demo_y+108,34,north_angle=90,pointer_angle=0,show_labels=False)
    c.setStrokeColor(TEAL); c.setLineWidth(2)
    c.line(demo_x+97,demo_y+108,demo_x+116,demo_y+108)
    c.line(demo_x+116,demo_y+108,demo_x+109,demo_y+112)
    c.line(demo_x+116,demo_y+108,demo_x+109,demo_y+104)
    c.setFillColor(NAVY); c.setFont('WeatherBold',10.8)
    c.drawCentredString(demo_x+card_w/2,demo_y+41,'N first; thick tip then points E.')
    c.setFont('WeatherArial',9.6)
    c.drawCentredString(demo_x+card_w/2,demo_y+25,'Example only: no game result is shown.')
    p.y=top-2*(card_w+10)-10
    p.text('Check: one pupil points to both N marks; another follows the thick pointer tip to the base letter.',11.6)
    p.finish()

    p = Page(c, size, 'Player Pack', 7, 12)
    p.title('Mission 3 / count covered panes', 'Look through the sky window',
            'Each sky card on page 8 has four equal panes. Patterned panes count as cloud-covered.')
    p.panel('The scene',SCENES[2],95,11.8)
    steps(p, ('Look at one time-labelled sky card at a time. Touch each of its four panes.',
              'Count only the patterned panes. Say the count as "covered out of four".',
              'Shade the same number of small boxes below, then copy the count to page 3.'))
    top=p.y-3
    for i,hour in enumerate(('9:00','10:00','11:00')):
        yy=top-i*83
        c.setFillColor(NAVY);c.setFont('WeatherBold',12.5)
        c.drawString(p.left,yy-14,hour+' / shade what you saw:')
        sky_cells(c,p.left+182,yy-39,42,0)
    p.y=top-3*83-4
    p.panel('Check the source','Point to the original sky card when your teammate checks the count. These are invented paper observations, not a way to identify real clouds.',76,11.5)
    p.finish()

    p = Page(c, size, 'Player Pack', 8, 12)
    p.title('Mission 3 / sky cards', 'Three four-pane views',
            'Adult: cut the three large outside rectangles. The cloud pattern, not colour alone, tells you which panes are covered.')
    top=p.y-10
    for i,(hour,clouds) in enumerate((('10:00',2),('11:00',3),('9:00',1))):
        yy=top-(i+1)*171
        card(p,p.left,yy,p.width,160,f'SKY VIEW / {hour}','',cut=True,size=11)
        sky_cells(c,p.left+124,yy+30,87,clouds)
    p.y=top-3*171-6
    p.text('The cards are deliberately out of time order. Use each printed time label to fill the correct row on pages 7 and 3.',11.5)
    p.finish()

    p = Page(c, size, 'Player Pack', 9, 12)
    p.title('Mission 4 / read the paper gauge', 'Measure the three rain strips',
            'A paper level strip belongs beside this scale; keep both BASELINE marks level with zero.')
    p.panel('The scene',SCENES[3],100,11.8)
    steps(p, ('See the practice alignment at the bottom of page 10. Then put one game strip immediately RIGHT of this scale.',
              'Move its BASELINE to the same height as 0 mm on this gauge. Do not tilt it.',
              'Read the TOP of its shaded level against the gauge. A blank strip reads 0 mm.',
              'Repeat for all times, then inspect the copied notice on page 10.'))
    y=p.y-180
    gauge(c,p.left+24,y,width=176,height=158)
    c.setStrokeColor(LINE);c.setDash(5,3)
    c.roundRect(p.left+215,y,175,158,5,fill=0,stroke=1)
    c.setDash();c.setFillColor(TEAL);c.setFont('WeatherBold',10.5)
    c.drawString(p.left+227,y+68,'LAY ONE STRIP HERE')
    c.drawString(p.left+227,y+51,'BASELINE AT 0 mm')
    p.y=y-17
    p.panel('Do not use the copied notice as your source','The original level strips are the evidence. The notice is something to CHECK and, if necessary, CORRECT. The marks are an invented paper scale, not measured outdoor rainfall.',91,11.5)
    p.finish()

    p = Page(c, size, 'Player Pack', 10, 12)
    p.title('Mission 4 / cut and compare', 'Original strips and copied notice',
            'Adult: cut three equal-size outer rectangles. Keep each time label and BASELINE inside.')
    top=p.y-8
    cw=(p.width-18)/3
    for i,(hour,level) in enumerate((('11:00',3),('9:00',0),('10:00',1))):
        x=p.left+i*(cw+9);y=top-190
        card(p,x,y,cw,181,f'RAIN / {hour}','',cut=True,size=10)
        gauge(c,x+5,y,level=level,width=cw-10,height=158)
    p.y=top-208
    p.heading('Copied notice from the display desk')
    p.panel('Check every row','9:00 / 0 mm<br/>10:00 / 1 mm<br/>11:00 / 1 mm<br/><br/>Circle any wrong number above. Write the corrected time and reading here: _______________________________',148,12)
    p.text('If the original strip and this notice disagree, trust the aligned original strip. Keep both sheets for the final checker.',11.5)
    # Use the spare lower space for an unambiguous, neutral alignment example.
    # The example reads 2 mm, which is not one of the game-strip readings.
    demo_top=p.y; demo_h=130; demo_bottom=demo_top-demo_h
    if demo_bottom < 49:
        raise ValueError('rain practice diagram overflow')
    c.setFillColor(PALE); c.setStrokeColor(LINE)
    c.roundRect(p.left,demo_bottom,p.width,demo_h,7,fill=1,stroke=1)
    c.setFillColor(NAVY); c.setFont('WeatherBold',10.8)
    c.drawString(p.left+12,demo_top-20,'PRACTICE ONLY / DO NOT CUT / NOT A GAME READING')
    base=demo_bottom+35
    c.setLineWidth(1)
    for value in range(4):
        yy=base+value*20
        c.setStrokeColor(LINE); c.line(p.left+55,yy,p.left+125,yy)
        c.setFillColor(NAVY); c.setFont('WeatherBold',10.4)
        c.drawRightString(p.left+49,yy-3,f'{value} mm')
    c.setFillColor(WHITE); c.setStrokeColor(NAVY)
    c.roundRect(p.left+146,demo_bottom+10,82,91,4,fill=1,stroke=1)
    c.setFillColor(GRAY); c.setStrokeColor(TEAL)
    c.rect(p.left+158,base,58,40,fill=1,stroke=1)
    c.setStrokeColor(NAVY); c.line(p.left+153,base,p.left+221,base)
    c.setFillColor(NAVY); c.setFont('WeatherBold',9.6)
    c.drawCentredString(p.left+187,demo_bottom+15,'BASELINE')
    para=Paragraph('1. Match the strip BASELINE to 0 mm.<br/>2. Follow the shaded top across to the scale.<br/>3. This <b>practice</b> drawing reads 2 mm.',
                   ParagraphStyle('rain-demo',fontName='WeatherArial',fontSize=10.8,leading=14.4,textColor=INK))
    _,ph=para.wrap(p.width-260,100)
    para.drawOn(c,p.left+244,demo_top-38-ph)
    p.y=demo_bottom-12
    p.finish()

    p = Page(c, size, 'Player Pack', 11, 12)
    p.title('Mission 5 / crew-authored notice', 'Write the morning bulletin',
            'This sheet starts empty. Fill it from your page 3 observation board and the original paper tools.')
    p.panel('The scene',SCENES[4],89,11.8)
    data_board(p,bulletin=True)
    p.rule('We corrected this copied detail')
    p.rule('The original paper evidence is')
    p.panel('Read only what you observed','Our three paper records show: __________________________________________<br/><br/>Do not write a prediction about later weather. Another pupil checks this bulletin on page 12 before it is posted.',96,11.5)
    p.finish()

    p = Page(c, size, 'Player Pack', 12, 12)
    p.title('Mission 5 / peer check and display', 'Can we post the bulletin?',
            'A checker uses original paper evidence, not memory or the copied notice.')
    checks=(
        'The three time rows match OUR station slips on page 4.',
        'Each wind letter matches an aligned snapshot and the base dial on pages 5-6.',
        'Each cloud count matches the four-pane sky cards on page 8.',
        'Each rain number matches the original strips against the page 9 scale.',
        'The copied mistake is repaired; the notice reports observations, not a future forecast.',
    )
    for idx,item in enumerate(checks,1):
        top=p.y
        p.panel(f'CHECK {idx} / tick after you point to the source',item,78,11.8)
        c.setFillColor(WHITE); c.setStrokeColor(TEAL)
        c.roundRect(p.right-29,top-27,14,14,2,fill=1,stroke=1)
        c.setFillColor(INK); c.setFont('WeatherArial',10.5)
        c.drawString(p.left+12,p.y+17,'Evidence page(s): __________')
    p.rule('Checker / job title or initials',28)
    p.rule('Reporter / job title or initials',28)
    p.panel('When everyone agrees','Show the checked notice to your teacher. The reporter reads one time row and names its paper source. Then each pupil points to one action they helped with. The teacher reads the closing scene.',70,11.6)
    p.finish()


GUIDE_SCENES = (
    'The morning display opens soon. Two observatories sent notes to the same desk. Our station uses a circle above TWO bars. Find its three records and put them from 9:00 to 11:00. You must check both the seal and the time.',
    'The correct times are back, but the wind dial still needs calibration. Each square has an N mark in a different place. Turn the whole square until that N reaches the top of the big compass, then read the thick pointer tip.',
    'The roof sent three sky-window cards, one for each time. The cards arrived out of order. Every sky has four panes. Count the patterned cloud panes, then draw or write the same amount on your board.',
    'The rain strips have arrived, but the display desk copied a number too quickly. Put each strip baseline at the paper gauge zero. Read its shaded top before looking for the copied mistake.',
    'The display needs your report now. Fill the empty bulletin from original evidence. Another pupil will check every row before anyone posts it. If a number does not match its paper source, repair it together.',
)

GUIDE_DATA = (
    ('Give Player page 4 only. Adult may cut five outer slips or leave the whole page intact.',
     'Point to the small seal on each slip. Pupils identify the circle plus TWO bars, set aside both one-bar slips, then arrange the retained 9:00, 10:00 and 11:00 slips. Ask a second pupil to check the seal again before the Recorder prepares page 3.',
     'Keep RECORD 4 / 9:00, RECORD 3 / 10:00 and RECORD 1 / 11:00. RECORDS 2 and 5 have one bar and belong to another station.',
     ('What are BOTH marks on our seal?', 'Does the 9:00 label alone prove it is our record?', 'Keep records 4, 3 and 1, in that time order.'),
     'Retain page 3 and the three correct slips. Release pages 5-6.'),
    ('Give Player pages 5-6. Adult cuts three square outer snapshot borders, not the dial or printed pointer.',
     'Model the alignment with a blank finger: N on each snapshot must reach the top of the big compass. Pupils rotate each whole square, then read the thick pointer tip against the base. Check that they do not call the small N mark the answer. Recorder writes each direction on page 3.',
     '9:00 = W, 10:00 = W, 11:00 = N. 9:00 has N at right and pointer up; 10:00 has N at bottom and pointer right; 11:00 has N at left and pointer left. After alignment the pointer tips read W, W and N.',
     ('Which mark do you line up first?', 'Turn the WHOLE square, then follow the thick line from centre to tip.', 'Aligned results are W, W, N by time.'),
     'Keep the three snapshots with page 3. Release pages 7-8.'),
    ('Give Player pages 7-8. Adult may cut the three sky rectangles; leaving page 8 whole works too.',
     'Pupils take one time-labelled sky card at a time, touch each of its four panes, count patterned panes and shade the same count in the matching row on page 7. Ask the Checker to count again before Recorder copies it to page 3.',
     '9:00 = 1/4, 10:00 = 2/4, 11:00 = 3/4. The page-8 cards appear in 10:00, 11:00, 9:00 order, so they cannot simply copy top to bottom.',
     ('How many panes does EACH card have?', 'Look for the hatch pattern, not just light blue colour.', 'At 9, 10 and 11 the counts are one, two and three of four.'),
     'Keep page 7 and the sky cards near page 3. Release pages 9-10.'),
    ('Give Player pages 9-10. Adult cuts the three level-strip rectangles; keep their equal outer sizes.',
     'Lay one strip in the page-9 placement zone with its BASELINE level with the gauge zero. Ask a second pupil to hold a finger across the scale at the top of the shaded bar. A blank bar is zero. Repeat by time, then compare all three results with the copied notice on page 10.',
     'Originals: 9:00 = 0 mm, 10:00 = 1 mm, 11:00 = 3 mm. The copied notice wrongly says 11:00 / 1 mm. Pupils circle that 1 and write 11:00 / 3 mm.',
     ('Which line must line up with zero?', 'Read the TOP of the shaded part, not the strip label.', 'The 11:00 strip reaches 3 mm; repair the copied 1 mm.'),
     'Keep the corrected notice and original strips. Release Player page 11.'),
    ('Give Player page 11 only after the three instrument readings are on page 3. Hold page 12 until the crew has written its first version.',
     'Pupils copy each time row from the observation board into the empty bulletin, using originals whenever a value is disputed. Ask for one sentence about the three printed observations, without claiming a future forecast. Give page 12 for an independent peer check; a different pupil points back to each paper source before the notice is accepted.',
     'All three bulletin rows must equal the answer table on guide page 9. The crew records the 11:00 rain correction as 1 mm to 3 mm and supports it with the original strip and gauge. Accept varied wording about the observed morning, but no unsupported future claim.',
     ('Which original page supports each entry?', 'Look back at the level strip, not the copied notice.', 'The final rain row is 3 mm; a future forecast is not established.'),
     'After page 12 is checked, read the closing on guide page 10.'),
)


def guide(c: Canvas, size):
    p=Page(c,size,'Teacher Guide',1,10)
    p.title('Teacher quick start','Run the paper observatory',
            'Five actions: sort times, calibrate wind, count clouds, read rain and publish a checked notice.')
    p.panel('One-minute view','Print the 12-page Player Pack once per crew of 2-6 pupils. Keep one 10-page Teacher Guide for yourself. For 35 pupils, make five crews of six and one of five. Give only the current mission pages.',104,12)
    p.heading('Before pupils arrive')
    for line in ('1. Print one paper size only per crew: A4 or US Letter, single-sided at Actual size.',
                 '2. Sort Player pages into START 1-3; M1 4; M2 5-6; M3 7-8; M4 9-10; M5 11-12.',
                 '3. Full-cut: prepare five time slips, three wind squares, three sky cards and three rain strips. Low-cut instructions are on page 2.',
                 '4. Place pages 1-3 and pencils on tables. Keep later mission piles and answer pages with you.'):
        p.text(line,11.8,16,after=8)
    p.panel('Supplies','Only ordinary paper, a printer, a pencil and eraser per crew, and adult-handled scissors for full-cut play. No glue, fastener, transparent sheet, real instrument, device, personal data or bought prize is required.',90,11.7)
    p.panel('Truthful weather language','This is an invented paper observation exercise. Students learn to align, read, record and correct. They must not treat three fictional readings as a real forecast or a safety instruction.',88,11.8)
    p.finish()

    p=Page(c,size,'Teacher Guide',2,10)
    p.title('Exact print and handout map','Print, cut and stage',
            'Every game prop is printed inside the Player Pack. Keep the Teacher Guide away from players.')
    for name,body in (
        ('START / PLAYER 1-3','Cover and quick start; six job descriptions; the whole-page morning observation board. Give before opening.'),
        ('PILE 1 / PLAYER 4','Mission 1 scene, task and five time slips. Full-cut: cut five OUTER rectangles.'),
        ('PILE 2 / PLAYER 5-6','Large compass base and three square wind snapshots. Full-cut: cut three OUTER squares; no inner cutting.'),
        ('PILE 3 / PLAYER 7-8','Cloud count board and three four-pane sky views. Cut three OUTER cards if desired.'),
        ('PILE 4 / PLAYER 9-10','Paper gauge, three equal outer rain-strip cards and the copied notice. Cut three OUTER cards if desired.'),
        ('PILE 5 / PLAYER 11-12','Empty bulletin; peer-check and ending page. Give page 12 only after the crew fills page 11.')):
        p.panel(name,body,64,11.2)
    p.text('Full-cut: 14 large pieces per crew (5 time, 3 wind, 3 sky, 3 rain). Low-cut: cut only the three wind squares and three rain strips; pupils point to time and sky cards on whole sheets. Six crews need 72 Player sheets; only one Teacher Guide is needed.',11.3,15.3,after=0)
    p.finish()

    p=Page(c,size,'Teacher Guide',3,10)
    p.title('Before the first handout','Roles, groups and opening',
            'One crew has all the tools; no crew waits for a clue held by another group.')
    p.panel('Jobs for 2-6 pupils',
            '2: A = Scene Reader + Recorder + Reporter; B = Tool Operator + Data Reader + Checker.<br/>'
            '3: A = Scene Reader + Reporter; B = Tool Operator + Checker; C = Data Reader + Recorder.<br/>'
            '4: A = Scene Reader + Reporter; B = Tool Operator + Data Reader; C = Recorder; D = Checker.<br/>'
            '5: one pupil combines Scene Reader + Reporter; four others take one job each.<br/>'
            '6: one job per pupil. After EACH mission, pass bundles clockwise. In the final mission the Checker and Recorder must be different pupils. A pupil may point or dictate while a partner writes.',
            164,11.9)
    p.panel('Whole class','For 35 pupils use five crews of six and one of five. Each crew gets all 12 Player pages and its own instruments. Read each scene to the room, then let crews work independently. Visit tables to check evidence and give one hint at a time. No group must finish at another group\'s speed.',107,11.6)
    p.heading('Read the opening aloud')
    p.panel('Opening scene','"The school display opens at noon. Our pretend paper observatory has three morning records, but another station\'s slips are mixed in. The wind, cloud and rain tools are ready. You will restore the records, check one copied mistake, then make a bulletin that shows where every number came from. We are checking paper evidence, not predicting real weather."',133,11.7)
    p.text('Give pages 1-3 first. Place page 3 in the table centre. Read the Mission 1 scene on guide page 4 before giving Player page 4. After each mission, keep the original props beside the board for the final check.',11.5,15.6,after=0)
    p.finish()

    titles=('Sort the morning records','Calibrate the wind dial','Count covered sky panes','Read and repair rain','Publish a checked bulletin')
    for i,(preparation,actions,answer,hints,handover) in enumerate(GUIDE_DATA,1):
        p=Page(c,size,'Teacher Guide',i+3,10)
        p.title(f'Mission {i} / adult only',titles[i-1],preparation)
        p.panel('Read this scene aloud',GUIDE_SCENES[i-1],94,11.8)
        p.heading('Lead the actions')
        p.text(actions,11.9,16,after=11)
        p.panel('Accept when the crew shows this',answer,106 if i in (2,4,5) else 96,11.6)
        p.heading('Hints / stop after each')
        for n,hint in enumerate(hints,1):p.text(f'<b>{n}.</b> {hint}',11.7,15.7,after=6)
        p.panel('If an answer nearly fits','Ask the pupil to point to the original mark or tool and repeat the action. Let a partner check. Read a step aloud if needed; do not silently change their written number or tell the whole solution first.',77,11.3)
        p.panel('Handover',handover,66,11.3)
        p.finish()

    p=Page(c,size,'Teacher Guide',9,10)
    p.title('Adult reference only','Answer atlas and evidence',
            'Use this table after pupils have operated the original paper tools.')
    p.panel('Mission 1 / slips','Our station has a circle above TWO bars. RECORD 4 is 9:00; RECORD 3 is 10:00; RECORD 1 is 11:00. Records 2 and 5 each have one bar.',87,11.6)
    p.panel('Mission 2 / wind','Turn each square until its small N is at the top of the base dial. Read the THICK pointer tip: 9:00 W; 10:00 W; 11:00 N. The N alignment mark is not itself an answer.',91,11.6)
    p.panel('Mission 3 / cloud','Count patterned panes out of four: 9:00 1/4; 10:00 2/4; 11:00 3/4. Page 8 deliberately shows 10, 11, 9 rather than chronological order.',87,11.6)
    p.panel('Mission 4 / rain','With strip BASELINE at gauge zero, the top readings are 9:00 0 mm, 10:00 1 mm, 11:00 3 mm. The copied notice has 11:00 1 mm; circle that 1 and write 3.',88,11.6)
    p.heading('Bulletin row-by-row answer')
    for line in ('9:00  /  W  /  1 of 4 cloud panes  /  0 mm',
                 '10:00 /  W  /  2 of 4 cloud panes  /  1 mm',
                 '11:00 /  N  /  3 of 4 cloud panes  /  3 mm'):
        p.text(line,12.2,17,after=5,bold=True)
    p.panel('What counts as a valid final statement','Accept pupils\' own words about the three paper OBSERVATIONS and the repaired 11:00 entry. Do not require a scripted sentence or artistic drawing. Reject a claim that these invented readings prove a real later forecast; invite the crew to describe what it actually recorded.',100,11.4)
    p.finish()

    p=Page(c,size,'Teacher Guide',10,10)
    p.title('Finish and continue','Help, closing and reset',
            'Do not invent missing tools or leave a group stuck at one station.')
    p.heading('Reading and tool support')
    p.text('Read one direction at a time for early readers. A pupil may point, rotate, shade or dictate while a partner writes. If a rotated wind square is hard to hold, rest a finger on its N and turn the sheet slowly. For rain, place both baselines level and have another pupil hold a straight finger across the top. Older pupils can explain why the copied line is wrong; everyone reaches the same recorded readings.',11.7,15.7)
    p.heading('If a crew is stuck or a piece is missing')
    p.text('Use that mission\'s three hints in order, allowing a retry after each. If needed, demonstrate the action with the current printed prop and let pupils repeat it. Reprint the labelled Player page if a piece is missing. Do not replace it with a new numerical clue. A crew may continue after the teacher supplies a reading; mark that assistance on its board without embarrassment.',11.7,15.7)
    p.heading('If the period ends')
    p.text('Store page 3 with only the mission pages already issued and their pieces. Mark the next unopened pile for that crew. Resume with its next scene and keep this answer guide with the adult.',11.7,15.7)
    p.panel('Read the closing after peer check','"The observatory display can open. You restored our three times, aligned a direction dial, counted cloud panes, read a paper gauge and repaired a copied number. Your morning bulletin is useful because another person can check it against the same original paper evidence. Thank you, observatory crew."',120,11.7)
    p.panel('Reset or display','Invite each pupil to show one action they performed. Display the checked bulletin or let the crew keep it. For another session, erase writing, gather the 14 cut pieces if full-cut, sort the five piles and exchange jobs. The printed readings do not change; do not promise a new mystery.',88,11.4)
    p.panel('Optional challenge for older pupils','Ask the crew to defend three claims with props: why a one-bar slip is not ours; why the wind N mark is not itself the answer; and how the original rain strip disproves the copied 11:00 entry. Everyone still completes the same five missions and bulletin.',86,11.3)
    p.finish()


def build_paper(paper, size):
    entries=[]; files=[]
    for role,make,expected in (('player',player,12),('guide',guide,10)):
        path=OUT/f'weather-classroom-{role}-1.0-{paper}.pdf'
        c=Canvas(str(path),pagesize=size,pageCompression=1,invariant=1)
        c.setTitle(f'{TITLE} / {role.title()} / {paper}')
        c.setAuthor('Paper Adventure Workshop')
        make(c,size);c.save()
        count=len(PdfReader(path).pages)
        assert count==expected,(path,count)
        sha=hashlib.sha256(path.read_bytes()).hexdigest()
        entries.append(dict(world='weather',setting='classroom',paper=paper,role=role,
                            path=path.relative_to(ROOT).as_posix(),pages=count,
                            bytes=path.stat().st_size,sha256=sha,
                            r2Key=f'retail/weather/classroom/1.0/{paper}/{role}-{sha[:16]}.pdf'))
        files.append(path)
    with zipfile.ZipFile(OUT/f'weather-classroom-{paper}-complete-1.0.zip','w',zipfile.ZIP_DEFLATED) as bundle:
        for path in files:bundle.write(path,path.name)
    return entries


def build():
    OUT.mkdir(parents=True,exist_ok=True)
    entries=[]
    for paper,size in (('A4',A4),('Letter',letter)):
        entries.extend(build_paper(paper,size))
    path=OUT/'retail-packs-1.0-manifest.json'
    data=json.loads(path.read_text(encoding='utf-8'))
    data['items']=[item for item in data['items']
                   if (item['world'],item['setting'])!=('weather','classroom')]+entries
    path.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
    print('Weather Classroom rebuilt:',[(e['paper'],e['role'],e['pages']) for e in entries])


if __name__=='__main__':build()

