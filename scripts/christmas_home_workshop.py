"""Christmas Home: a hands-on, five-scene paper gift workshop.

The three standing gifts, their drawing reference, quality frame and village
display are all printed here. This module is used only by the retail H06 build.
"""

from html import escape
import math

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Flowable, Image, Paragraph, Spacer, Table, TableStyle

import generate_celebration_samples as g


BODY = ParagraphStyle('xmas-player-body', fontName='Arial', fontSize=14,
                      leading=19.5, textColor=g.NAVY, spaceAfter=9)
HOST = ParagraphStyle('xmas-host-body', parent=BODY, fontSize=12.7,
                      leading=18, spaceAfter=8)
SMALL = ParagraphStyle('xmas-prop-body', parent=BODY, fontSize=11.5,
                       leading=15.5, spaceAfter=5)
LABEL = ParagraphStyle('xmas-label', parent=BODY, fontName='ArialBold',
                       fontSize=12, leading=16, spaceAfter=6)


def p(value, kind='player'):
    value = value.replace('<b>', '<font name="ArialBold">').replace('</b>', '</font>')
    return Paragraph(value, {'player': BODY, 'host': HOST,
                             'small': SMALL, 'label': LABEL}[kind])


def head(title, eyebrow):
    return [p(eyebrow, 'label'), Paragraph(title, g.STYLES['title']), Spacer(1, 6)]


def steps(items, kind='player'):
    return [p(f'<b>{n}.</b> {item}', kind) for n, item in enumerate(items, 1)]


def notice(text, width):
    t = Table([[p(text, 'small')]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('BOX', (0, 0), (-1, -1), .9, g.LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 13),
        ('RIGHTPADDING', (0, 0), (-1, -1), 13),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    return t


def cover_quick_start(width):
    """A first-use route on the cover, so the opening sheet earns its space."""
    rows = [
        ('1 / PREP', 'Read Host Guide page 1. Cut the four job cards on Player page 2; hold back later missions and the reply.'),
        ('2 / GATHER', 'Put this pack, a pencil, an eraser and adult-handled scissors on the table. Keep page 3 whole as the workbench list.'),
        ('3 / BEGIN', 'Choose your jobs, then read the first story on page 4. The adult gives page 5 when the crew is ready to fold.'),
    ]
    t = Table([[p(label, 'label'), p(detail, 'small')] for label, detail in rows],
              colWidths=[112, width - 112], rowHeights=[48] * 3)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('BOX', (0, 0), (-1, -1), .9, g.LINE),
        ('INNERGRID', (0, 0), (-1, -1), .5, g.LINE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    return t


def card_table(cards, width, height=125):
    rows = []
    for pos in range(0, len(cards), 2):
        row = []
        for title, body in cards[pos:pos + 2]:
            row.append([p(title, 'label'), p(body, 'small')])
        if len(row) == 1:
            row.append([p('SPACE - NOT A CARD', 'small')])
        rows.append(row)
    t = Table(rows, colWidths=[width / 2] * 2, rowHeights=[height] * len(rows))
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 11),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
    ]))
    for idx in range(len(cards)):
        t.setStyle(TableStyle([('BOX', (idx % 2, idx // 2),
                                (idx % 2, idx // 2), 1, g.NAVY, 1, (4, 3))]))
    return t


class PaperDrawing(Flowable):
    """Large, grayscale-safe, actual-size cut/fold diagrams."""

    def __init__(self, width, kind):
        super().__init__()
        self.width = width
        self.kind = kind
        self.height = {'press': 420, 'gifts': 505, 'decor': 245,
                       'quality': 420, 'village': 495, 'reply': 330}[kind]

    def txt(self, x, y, value, size=12, bold=False):
        c = self.canv
        c.setFillColor(g.NAVY)
        c.setFont('ArialBold' if bold else 'Arial', size)
        c.drawString(x, y, value)

    def dashed(self, x, y, w, h):
        c = self.canv
        c.saveState()
        c.setStrokeColor(g.NAVY)
        c.setLineWidth(1.2)
        c.setDash(5, 3)
        c.rect(x, y, w, h, fill=0, stroke=1)
        c.restoreState()

    def fold(self, x1, y1, x2, y2):
        c = self.canv
        c.saveState()
        c.setStrokeColor(g.CORAL)
        c.setLineWidth(2)
        c.line(x1, y1, x2, y2)
        c.restoreState()

    def panel(self, x, y, w, h, title, sub=''):
        c = self.canv
        c.setStrokeColor(g.LINE)
        c.setFillColor(g.PALE)
        c.roundRect(x, y, w, h, 8, fill=1, stroke=1)
        self.txt(x + 12, y + h - 23, title, 12, True)
        if sub:
            self.txt(x + 12, y + h - 43, sub, 10.5)

    def draw(self):
        self.canv.saveState()
        getattr(self, 'draw_' + self.kind)()
        self.canv.restoreState()

    def draw_press(self):
        c = self.canv
        w = self.width
        x = (w - 360) / 2
        self.dashed(x, 110, 360, 280)
        self.fold(x, 250, x + 360, 250)
        c.setStrokeColor(g.NAVY)
        c.setLineWidth(2)
        star = c.beginPath()
        for point in range(10):
            angle = math.pi / 2 + point * math.pi / 5
            radius = 48 if point % 2 == 0 else 22
            px = x + 180 + radius * math.cos(angle)
            py = 180 + radius * math.sin(angle)
            (star.moveTo if point == 0 else star.lineTo)(px, py)
        star.close()
        c.drawPath(star, fill=0, stroke=1)
        self.txt(x + 18, 355, 'BACK PANEL / fold behind the star', 12, True)
        self.txt(x + 18, 224, 'FRONT PANEL / STAR PRESS', 13, True)
        self.txt(x + 18, 129, 'Place this beside the gifts.', 11)
        self.txt(x + 7, 90, 'DASHED OUTER EDGE = ADULT CUT', 11, True)
        self.txt(x + 7, 70, 'CORAL SOLID LINE = CHILD FOLD', 11, True)
        self.txt(x + 7, 50, 'Stand as a tent. Keep the printed star facing the team.', 11)

    def draw_gifts(self):
        c = self.canv
        left = (self.width - 468) / 2
        for idx, (letter, shape) in enumerate([('A', 'ARCH'), ('B', 'LONG'), ('C', 'ROUND')]):
            x = left + idx * 158
            y = 181
            self.dashed(x, y, 146, 320)
            self.fold(x, y + 160, x + 146, y + 160)
            self.txt(x + 13, y + 294, 'BACK / fold behind', 10.5, True)
            self.txt(x + 13, y + 165 - 22, f'GIFT {letter} / FRONT', 11, True)
            c.setStrokeColor(g.NAVY)
            if shape == 'ARCH':
                c.arc(x + 17, y + 112, x + 46, y + 139, 0, 180)
            elif shape == 'LONG':
                c.roundRect(x + 22, y + 111, 17, 28, 4, fill=0, stroke=1)
            else:
                c.circle(x + 31, y + 125, 14, fill=0, stroke=1)
            self.txt(x + 54, y + 122, shape + ' SHAPE', 9.5)
            self.txt(x + 13, y + 24, 'Blank space: draw 3 marks', 9.5)
        self.panel(20, 25, self.width - 40, 140, 'FOLD ONE CARD AT A TIME',
                   '1. Adult cuts each dashed outside. 2. Child folds the coral line.')
        self.txt(33, 102, '3. FRONT is BELOW the fold. Open flat to draw on this face.', 11)
        self.txt(33, 78, '4. Ridge at top; the FRONT slopes towards the viewer.', 11)
        self.txt(33, 54, 'If thin paper slips, display the gift flat, front facing up.', 11)
        c.setStrokeColor(g.NAVY)
        c.line(self.width - 131, 58, self.width - 78, 113)
        c.line(self.width - 78, 113, self.width - 25, 58)
        self.txt(self.width - 135, 40, 'FRONT', 9.5, True)
        self.txt(self.width - 68, 40, 'BACK', 9.5, True)

    def draw_decor(self):
        c = self.canv
        w = self.width
        for i, icon in enumerate(('STAR LAMP', 'SCARF', 'BELL')):
            x = 11 + i * (w - 22) / 3
            cell = (w - 22) / 3 - 8
            self.panel(x, 151, cell, 85, icon)
            self.txt(x + 8, 172, 'copy near the fold', 9)
            c.setStrokeColor(g.NAVY)
            cx, cy = x + cell - 27, 174
            if i == 0:
                c.circle(cx, cy, 14, fill=0, stroke=1)
                c.line(cx - 11, cy, cx + 11, cy)
                c.line(cx, cy - 11, cx, cy + 11)
            elif i == 1:
                c.roundRect(cx - 12, cy - 17, 24, 34, 4, fill=0, stroke=1)
                c.line(cx - 12, cy - 8, cx + 12, cy - 8)
            else:
                c.arc(cx - 12, cy - 12, cx + 12, cy + 15, 0, 180)
                c.line(cx - 12, cy, cx - 12, cy - 10)
                c.line(cx + 12, cy, cx + 12, cy - 10)
                c.line(cx - 12, cy - 10, cx + 12, cy - 10)
        for i, text in enumerate(['VERTICAL', 'HORIZONTAL', 'DIAGONAL']):
            x = 11 + i * (w - 22) / 3
            cell = (w - 22) / 3 - 8
            self.panel(x, 76, cell, 65, text + ' RIBBON')
            c.setStrokeColor(g.NAVY)
            if i == 0:
                c.line(x + 75, 83, x + 75, 108)
            elif i == 1:
                c.line(x + 18, 91, x + cell - 15, 91)
            else:
                c.line(x + 28, 83, x + cell - 20, 108)
        self.panel(11, 6, w - 22, 57, 'EXAMPLE ONLY / NOT A GAME ANSWER')
        self.txt(23, 22, 'On a practice gift: icon high, ribbon through centre, small-circle seal in one corner.', 9.5)
        ex = w - 91
        c.setStrokeColor(g.NAVY)
        c.roundRect(ex, 14, 68, 35, 3, fill=0, stroke=1)
        sample_icon = c.beginPath()
        sample_icon.moveTo(ex + 13, 45)
        sample_icon.lineTo(ex + 7, 34)
        sample_icon.lineTo(ex + 19, 34)
        sample_icon.close()
        c.drawPath(sample_icon, fill=0, stroke=1)
        c.line(ex + 16, 19, ex + 57, 33)
        c.circle(ex + 57, 20, 3.5, fill=0, stroke=1)

    def draw_quality(self):
        c = self.canv
        x = (self.width - 320) / 2
        self.dashed(x, 155, 320, 245)
        self.dashed(x + 104, 229, 112, 84)
        self.txt(x + 47, 365, 'QUALITY FRAME / CUT ONE INNER WINDOW', 11, True)
        self.txt(x + 52, 336, 'Slide the window over ONE mark at a time.', 11)
        self.txt(x + 24, 190, 'ICON  >  RIBBON  >  SEAL', 11, True)
        self.txt(x + 23, 174, 'Adult cuts both DASHED rectangles.', 10.5)
        self.panel(22, 20, self.width - 44, 110, 'PASS / REPAIR / RECHECK',
                   'If something differs, erase and redraw just that mark.')
        self.txt(36, 63, 'A: star lamp / vertical / lower left', 10.5)
        self.txt(36, 43, 'B: scarf / horizontal / upper right', 10.5)
        self.txt(36, 23, 'C: bell / diagonal / lower centre', 10.5)

    def draw_village(self):
        c = self.canv
        w = self.width
        self.panel(6, 85, w - 12, 395, 'WINTER VILLAGE DISPLAY',
                   'Keep whole. Match the gift to the friend before placing it.')
        c.setStrokeColor(g.NAVY)
        c.setLineWidth(1.6)
        # Story-specific winter village line art, behind the finished-gift bays.
        for hx, roof in [(65, 367), (w / 2, 391), (w - 75, 367)]:
            house = c.beginPath()
            house.moveTo(hx - 43, roof - 36)
            house.lineTo(hx - 43, roof)
            house.lineTo(hx, roof + 29)
            house.lineTo(hx + 43, roof)
            house.lineTo(hx + 43, roof - 36)
            c.drawPath(house, fill=0, stroke=1)
            c.roundRect(hx - 9, roof - 34, 18, 27, 5, fill=0, stroke=1)
            c.line(hx - 44, roof + 3, hx, roof + 31)
            c.line(hx, roof + 31, hx + 44, roof + 3)
        for sx, sy in [(28, 408), (w - 33, 408), (w / 2 + 92, 404), (w / 2 - 90, 404)]:
            c.line(sx - 8, sy, sx + 8, sy)
            c.line(sx, sy - 8, sx, sy + 8)
        for idx, friend in enumerate(('OWL WINDOW', 'FOX DEN', 'RABBIT GATE')):
            x = 15 + idx * (w - 30) / 3
            ww = (w - 44) / 3
            c.roundRect(x, 150, ww, 165, 9, fill=0, stroke=1)
            self.txt(x + 10, 290, friend, 10.5, True)
            self.txt(x + 10, 166, 'STAND OR LAY GIFT HERE', 8.8)
        self.txt(27, 126, 'Set the star press beside the gifts; lay slippery paper flat.', 11)
        self.txt(27, 104, 'Ask the host for the friends\' reply after all checks pass.', 11)

    def draw_reply(self):
        self.panel(12, 18, self.width - 24, 294, 'A REPLY FROM THE WINTER VILLAGE',
                   'Host keeps this page until all three gifts stand in the display.')
        lines = [
            'Dear gift crew,',
            'The star press is working and our three paper gifts are ready.',
            'Owl spotted a shining lamp. Fox admired a warm scarf.',
            'Rabbit heard a tiny bell beside the snowy gate.',
            'You made, shared, checked and repaired together.',
            'Thank you for making our little village bright!',
            'From Owl, Fox and Rabbit',
        ]
        for i, line in enumerate(lines):
            self.txt(35, 258 - 28 * i, line, 11.8 if i else 13, i == 5)
        self.txt(35, 50, 'One thing I helped make: __________________________', 11)


class MissionDiagram(Flowable):
    """A different action diagram for each mission, never repeated cover art."""

    def __init__(self, width, mission_number):
        super().__init__()
        self.width = width
        self.height = 125
        self.mission_number = mission_number

    def draw(self):
        c = self.canv
        c.saveState()
        c.setStrokeColor(g.LINE)
        c.setFillColor(g.PALE)
        c.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=1)
        c.setFillColor(g.NAVY)
        c.setFont('ArialBold', 11)
        c.drawString(16, 104, 'WHAT YOU WILL SEE AND MAKE')
        labels = [
            [('CUT', 'one press'), ('FOLD', 'centre line'), ('STAND', 'paper star')],
            [('A', 'arch front'), ('B', 'long front'), ('C', 'round front')],
            [('WHO', 'gift + friend'), ('RIBBON', 'direction'), ('SEAL', 'corner')],
            [('SLIDE', 'one mark'), ('COMPARE', 'one clue'), ('REPAIR', 'then recheck')],
            [('READ', 'friend name'), ('MATCH', 'gift clue'), ('PLACE', 'and explain')],
        ][self.mission_number]
        step_w = (self.width - 44) / 3
        for i, (title, subtitle) in enumerate(labels):
            x = 15 + i * (step_w + 7)
            c.setStrokeColor(g.NAVY)
            c.setFillColor(colors.white)
            c.roundRect(x, 22, step_w, 70, 7, fill=1, stroke=1)
            c.setFillColor(g.CORAL)
            c.setFont('ArialBold', 13)
            c.drawCentredString(x + step_w / 2, 66, title)
            c.setFillColor(g.NAVY)
            c.setFont('Arial', 10.5)
            c.drawCentredString(x + step_w / 2, 40, subtitle)
            if i < 2:
                c.drawString(x + step_w + 2, 47, '>')
        c.setFont('Arial', 10.5)
        c.drawString(17, 6, 'If it differs, use the printed step above and try that action again.')
        c.restoreState()


class HostCheck(Flowable):
    """Page-bottom handover board so the host need not infer the next action."""

    def __init__(self, width, mission_number):
        super().__init__()
        self.width = width
        self.height = 116
        self.mission_number = mission_number

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(g.PALE)
        c.setStrokeColor(g.LINE)
        c.roundRect(0, 0, self.width, self.height, 8, fill=1, stroke=1)
        c.setFillColor(g.NAVY)
        c.setFont('ArialBold', 11)
        c.drawString(14, 96, 'HOST HANDOVER / CHECK IN THIS ORDER')
        rows = [
            ('1', 'Scene was read before the pieces were used.'),
            ('2', 'Every child had a hand action, clue, or spoken check.'),
            ('3', 'The named physical result passed the Accept when check.'),
            ('4', 'Keep that result; rotate jobs; release only the next pile.'),
        ]
        for i, (number, message) in enumerate(rows):
            y = 72 - i * 18
            c.setStrokeColor(g.NAVY)
            c.rect(15, y - 1, 12, 12, fill=0, stroke=1)
            c.setFillColor(g.NAVY)
            c.setFont('ArialBold', 10)
            c.drawString(37, y, number + '.')
            c.setFont('Arial', 10)
            c.drawString(59, y, message)
        c.restoreState()


STORIES = [
    ('The star press stops', 'A rush of winter wind has folded the delivery office star press flat. The messenger cannot ready the last three paper gifts until the press stands again.',
     '"Will you open our work station? Fold carefully; a team can try again if it falls."'),
    ('Three gifts on the workbench', 'The press is standing. Owl, Fox and Rabbit can now see three gift blanks marked A, B and C. They need a crew to make each one stand.',
     '"Make the paper gifts first. We can decide their decorations together next."'),
    ('Everyone holds part of the pattern', 'The winter messenger has three instruction cards. No one card tells the whole wrapping plan. The crew must share what they know.',
     '"Please let every clue-holder speak before placing the last seal."'),
    ('The wind tests the wrapping', 'A gust rattles the workbench. The messenger brings out a quality frame so no paper gift reaches the display unfinished.',
     '"Look at one gift at a time. If something moved, repair just that part."'),
    ('A village window lights up', 'The three paper gifts are ready. The winter village has one place for each friend. The messenger unfolds the final display.',
     '"Stand the gifts together, then let us read what our friends wrote back."'),
]

ACTIONS = [
    [
        'Adult gives page 5. Find the dashed outer cut edge and solid coral fold line; the adult cuts the outer edge.',
        'After the adult cuts the outer edge, fold the top half behind the lower half along the coral line.',
        'Raise the coral fold as the top ridge. Keep the printed star upright and facing the team. If thin paper slips, lay it face-up.',
        'Tell the host what you made. Keep the press beside the workbench for the final scene.',
    ],
    [
        'Adult cuts the three dashed outlines on page 7. Give gift A, B and C to the team.',
        'On each blank, find FRONT below the coral fold and BACK above it. The front must read upright when the fold becomes the top ridge.',
        'Fold the BACK behind the FRONT. Raise the ridge and look at the front, then open it flat for decorating.',
        'Count three different shape marks: ARCH A, LONG B and ROUND C. Keep all three for mission 3.',
    ],
    [
        'Adult gives the three clue cards to different children. Keep the picture drawing guide on page 9 whole.',
        'Each clue-holder reads their whole card aloud. Put the A, B and C blanks flat, FRONT facing up.',
        'For each flat FRONT, copy its icon near the fold, draw a ribbon through the blank middle in the clue\'s direction and draw a small seal circle in the clue\'s corner. The practice example on page 9 is not a game answer.',
        'Ask every clue-holder to check their part. The drawn marks stay on the gift when it stands.',
    ],
    [
        'Adult cuts both dashed edges of the quality frame on page 11: the outer border and its small inner window.',
        'Lay gift A flat. Slide the small window over its icon, then ribbon, then seal. Compare each mark with the clue cards and the answer list below the frame.',
        'Erase and redraw any wrong mark, then check again. Repeat with gifts B and C; the host checks every completed front.',
        'When all three pass, raise each fold as a top ridge so the decorated FRONT faces the team. Lay a slippery card flat if it will not stand.',
    ],
    [
        'Open the whole village display on page 13. Read the three friend names; the board does not name gift A, B or C.',
        'Use the WHO clue to decide which decorated gift belongs to Owl, Fox and Rabbit. Stand or lay each gift in that friend\'s space. Set the star press beside them.',
        'Have each player point to the clue or drawn icon that explains a placement. Check that all three gift fronts are visible.',
        'Invite the host to read the friends\' reply on page 14. Each player shares one thing they helped make.',
    ],
]

PROPS = [
    'Page 5: one adult-cut star press. The press stays with the team.',
    'Page 7: three adult-cut gift blanks, A, B and C. No glue or extra gift is needed.',
    'Page 9: three separate instruction cards and a whole-page drawing guide. Keep the cards visible during checks.',
    'Page 11: one adult-cut quality frame. Keep the instruction cards from mission 3.',
    'Page 13: one whole village board, all three checked gifts and the star press.',
]

JOB_ACTIONS = [
    'Storyteller reads the gust. Clue Keeper identifies cut versus fold. Maker folds. Checker tests the upright star.',
    'Storyteller reads the workbench scene. Clue Keeper names A, B and C. Maker creases and shares turns. Checker counts three upright fronts.',
    'Storyteller invites each clue voice. Clue Keeper reads the cards. Maker shares the drawing. Checker verifies icon, ribbon and seal.',
    'Storyteller reads the wind scene. Clue Keeper names the three checks. Maker moves the window or repairs. Checker asks the host to accept.',
    'Storyteller reads the village scene. Clue Keeper cites each friend clue. Maker places the gifts. Checker explains each match.',
]

GROUPS = [
    ('2', 'One child is Storyteller + Clue Keeper; the other is Maker + Checker. Exchange after each mission.'),
    ('3', 'Storyteller + Clue Keeper; Maker; Checker. Rotate these bundles after each mission.'),
    ('4', 'One job per child; rotate all four jobs after each mission.'),
    ('5-6', 'Give all four jobs; pair the Maker and Checker seats. Partners alternate hand actions and spoken checks; rotate after each mission.'),
    ('7-12', 'Make two groups of 3-6. Print a COMPLETE Player Pack for each. The adult checks group A then B before either starts the next mission.'),
]


def mission(index, width):
    title, story, messenger = STORIES[index]
    return head(title, f'MISSION {index + 1} / STORY AND ACTIONS') + [
        p(story), p('<b>Messenger:</b> ' + escape(messenger)),
        notice('<b>Put on the table:</b> ' + PROPS[index], width),
        Spacer(1, 12), p('Do this together', 'label'),
        *steps(ACTIONS[index]),
        Spacer(1, 9),
        notice('<b>Jobs this time:</b> ' + JOB_ACTIONS[index], width),
        Spacer(1, 9),
        notice('<b>Finished when:</b> ' + [
            'The star press has one correct ridge and shows an upright star, even if thin paper must lie flat.',
            'Three different gift cards have been folded, checked upright and opened flat.',
            'Each flat gift has one icon, one ribbon and one seal drawn from the shared clues.',
            'A, B and C have each passed the three-part quality check.',
            'Each friend has the matching visible gift; the press is beside the village.',
        ][index], width),
    ]


def player(source, width):
    pages = [head(source['title'], 'PLAYER PACK / CHRISTMAS HOME') + [
        p('Make three paper gifts together and light up the winter village.'),
        Image(str(g.ROOT / source['cover']), width=262, height=196, kind='proportional'),
        Spacer(1, 8),
        p('A gust has flattened the star press. Owl, Fox and Rabbit need three paper gifts for their winter village. Your crew will make, decorate and check them before building the final display.'),
        notice('Ages 6-12. One team for 2-6 children; two full sets for 7-12. An adult hosts outside that count. Everything to cut or fold is printed here; bring a pencil, eraser and adult-handled scissors. No real gift, tape or glue is needed.', width),
        Spacer(1, 10), p('Start your paper adventure', 'label'),
        cover_quick_start(width),
        Spacer(1, 8),
        p('<b>Our gift crew:</b> ___________________________________________', 'player'),
    ]]
    pages.append(head('Your gift crew', 'PAGE 2 / CUT FOUR JOB CARDS') + [
        p('Adult cuts the four dashed outer rectangles. Give each child a job or combined bundle using the Host Guide. Swap after missions 1-4.'),
        card_table([
            ('STORYTELLER', 'Read the new scene first, or ask the adult to read. Invite every player to say what the team should do next.'),
            ('MAKER', 'Fold or place one piece at a time. Pass the next hand action to another child. Ask before moving someone else\'s piece.'),
            ('CLUE KEEPER', 'Find the current prop or clue and tell the team what it says. In mission 3, hear all three cards; in mission 5, recall who gets each gift.'),
            ('CHECKER', 'At every mission, compare the result with its Finished when test. Name one part to repair and show the result to the host.'),
        ], width, 155),
        p('Story characters are not player roles. With two children, combine the jobs as the guide shows. Pointing and speaking count; an adult may read aloud.'),
    ])
    pages.append(head('Set up your workbench', 'PAGE 3 / KEEP WHOLE') + [
        p('Keep just the current mission in the middle. Place finished gifts on one side. The adult holds later pages and the reply until it is time.'),
        notice('<b>Printed directions:</b> DASHED LINE = adult cuts, including the quality-frame window. CORAL SOLID LINE = child folds. Do not cut the whole village board.', width),
        Spacer(1, 13),
        card_table([
            ('1 / OPEN', 'Fold the star press and let it stand.'),
            ('2 / MAKE', 'Cut, fold and open the three gift blanks.'),
            ('3 / SHARE', 'Hear three clues and draw three features on each gift.'),
            ('4 / CHECK', 'Use the quality frame, repair and fold the gifts to stand.'),
            ('5 / DISPLAY', 'Set the three gifts in the village and read the reply.'),
        ], width, 93),
    ])
    pages.append(mission(0, width))
    pages.append(head('The star press', 'PAGE 5 / MISSION 1 / ADULT CUTS ONE PIECE') + [
        p('Cut only the dashed outside. Fold on the coral line. This paper stand is part of the final display.'),
        PaperDrawing(width, 'press'),
    ])
    pages.append(mission(1, width))
    pages.append(head('Three paper gifts', 'PAGE 7 / MISSION 2 / ADULT CUTS THREE PIECES') + [
        p('Cut each dashed outside. The decorated FRONT is below the coral line; BACK is above it. Fold so the ridge is at the top and FRONT reads upright to the viewer.'),
        PaperDrawing(width, 'gifts'),
    ])
    pages.append(mission(2, width))
    pages.append(head('Share the wrapping instructions', 'PAGE 9 / MISSION 3 / CUT THREE CLUE CARDS') + [
        p('Adult cuts the three dashed clue cards. Keep the drawing guide below whole. Give the clues to different players where possible. Read every card aloud before drawing the final mark.'),
        card_table([
            ('CLUE 1 / WHO', 'Gift A is for OWL; gift C is for RABBIT. Each friend gets one gift, so who gets B? OWL wants a STAR LAMP, FOX a SCARF, RABBIT a BELL.'),
            ('CLUE 2 / RIBBON', 'FOX needs HORIZONTAL. OWL is NOT DIAGONAL. Use VERTICAL, HORIZONTAL and DIAGONAL once each.'),
            ('CLUE 3 / SEAL', 'Gift C has LOWER CENTRE. Gift B has UPPER RIGHT. Use LOWER LEFT, UPPER RIGHT and LOWER CENTRE once each.'),
        ], width, 112),
        Spacer(1, 8), PaperDrawing(width, 'decor'),
    ])
    pages.append(mission(3, width))
    pages.append(head('A frame for careful checking', 'PAGE 11 / MISSION 4 / CUT ONE FRAME AND INNER WINDOW') + [
        p('Adult cuts both dashed edges: outer frame and small inner window. Slide the window over one mark at a time - icon, ribbon, then seal. Compare each with the expected pattern below; repair only what differs.'),
        PaperDrawing(width, 'quality'),
    ])
    pages.append(mission(4, width))
    pages.append(head('The winter village display', 'PAGE 13 / MISSION 5 / KEEP WHOLE') + [
        p('Keep this scene whole. Use the WHO clue from mission 3 to match each decorated gift with Owl, Fox or Rabbit. Stand the gifts in their friends\' spaces; lay them flat if the paper slips.'),
        PaperDrawing(width, 'village'),
    ])
    pages.append(head('A reply from your friends', 'PAGE 14 / ADULT HOLDS UNTIL THE END') + [
        p('Adult: keep this page away until every gift has passed its check and is standing in the village.'),
        PaperDrawing(width, 'reply'),
        p('Keep the village scene and this reply as your paper keepsakes. A new play-through uses the same solution; exchange jobs to make it feel different.'),
    ])
    return pages


def guide(source, width, counts, base):
    hp = lambda text: p(text, 'host')
    pages = [head('Run the Christmas paper workshop', 'HOST GUIDE / CHRISTMAS HOME') + [
        hp('This is a five-mission table game for ages 6-12. An adult hosts outside the 2-12-player count. Keep this guide and Player page 14 away from children until the ending.'),
        notice('<b>Goal:</b> Children fold a star press, make three standing paper gifts, combine three separate wrapping clues, check each gift with a cut-out frame, and place the gifts in one winter village display.', width),
        hp('All story gifts are paper props. No real gift, purchase, delivery, glue or tape is required. Use ordinary paper, an eraser, adult-handled scissors and one pencil.'),
        hp('Release only the current mission and its prop page. Give the team a chance to repair an error before giving a hint. Pointing and spoken choices count.'),
    ]]
    pages.append(head('Print, cut and stage', 'HOST / PREPARATION') + [
        hp('Print Player pages 1-14 per team, single-sided at 100% / Actual size, with no Fit-to-page scaling. Keep page 14 behind the guide. You may read this guide on screen.'),
        hp('Before play, cut only the four page-2 job cards. At each mission the adult cuts its prop: page 5 press, page 7 gifts, page 9 clues (keep its drawing guide whole), and page 11 frame plus dashed inner window. Keep page 13 whole. For two teams, pre-cut each set into separate numbered piles; at the cutting step hand out the prepared piece.'),
        hp('Inventory per team: four jobs + one press + three gifts + three clue cards + one quality frame = 12 loose pieces. The drawing guide, village board and adult-held reply stay whole.'),
        hp('Make five piles: M1 pages 4-5; M2 pages 6-7; M3 pages 8-9; M4 pages 10-11; M5 pages 12-13. Keep M2-M5 hidden. Page 3 is the whole workbench list.'),
        hp('Try the folds once on a spare print before hosting. The three gifts are flat during tracing and checking, then folded as tents. Children draw the pattern on each front so it remains visible when the card stands. Use a pencil and eraser.'),
        hp('For 7-12 players print two entire Player Packs and prepare two independent sets. One guide serves both. Check group A then B after each mission; neither advances early. Do not split clue cards between teams.'),
    ])
    pages.append(head('Give everyone a real job', 'HOST / GROUPING AND READING SUPPORT') + [
        *[hp('<b>' + n + ' children:</b> ' + task) for n, task in GROUPS],
        hp('Before each mission, read its story paragraph and Messenger line. Then let the child with the current job perform the next numbered action. After missions 1-4 rotate jobs. With paired jobs, switch which child uses their hands.'),
        hp('For younger or emerging readers, read the clue card exactly and point to its icon. Children can show positions with a finger. Do not make reading speed or handwriting a condition for completing the story.'),
        hp('The three clue cards in mission 3 are information sources, not secret identities. Each holder says their whole clue aloud. With two children, give Clues 1-2 to different children and read Clue 3 together.'),
    ])
    pages.append(head('Start the story', 'HOST / OPENING') + [
        hp('<b>Put out:</b> Player page 3, four jobs and the Mission 1 pile only. Keep other pieces, this guide and the reply behind the adult.'),
        hp('<b>Read:</b> "The winter delivery office is closing. A gust has flattened its star press. Owl, Fox and Rabbit are waiting for three pretend paper gifts. We will make and check everything at this table."'),
        hp('<b>Say:</b> "Take turns with the paper. We can try a fold again, ask for a hint, or repair a piece. Nobody is eliminated. When a mission is done, I will read the next part."'),
        hp('Show page 5: point to its dashed cut edge and coral fold line. Explain that the adult cuts and children fold. Ask who holds each job before beginning.'),
        notice('Left side of table: current paper pieces. Middle: current mission and flat gifts. Adult side: later piles, this guide and held reply.', width),
    ])
    checks = [
        'The one-piece press has its coral centre ridge and an upright five-point star. If thin paper slips, accept the correctly folded piece lying face-up.',
        'Three gifts A/ARCH, B/LONG and C/ROUND are cut and creased. Their FRONT is below the flat-page fold and reads upright when the ridge is raised.',
        'Gift A / Owl: STAR LAMP, VERTICAL ribbon, seal LOWER LEFT. Gift B / Fox: SCARF, HORIZONTAL ribbon, seal UPPER RIGHT. Gift C / Rabbit: BELL, DIAGONAL ribbon, seal LOWER CENTRE. All three marks are drawn on each front.',
        'All three drawn fronts match the mission-3 cards. Slide the small frame window across icon, ribbon and seal, repairing only wrong marks. Raise the ridge or lay thin paper flat.',
        'A belongs at Owl Window, B at Fox Den, C at Rabbit Gate, with the star press beside them. Children name the clue behind each choice; flat placement is allowed if the paper slips.',
    ]
    hints = [
        ('Point to the coral middle line.', 'Bring the two outer edges down onto the table so the card stands.'),
        ('Find FRONT and BACK on gift A.', 'Fold only at the coral centre; make A, B and C the same way.'),
        ('Ask who has the WHO clue, then the RIBBON and SEAL clues.', 'Complete one gift at a time: A Owl first, then B Fox, then C Rabbit.'),
        ('Slide the window over one mark, not the whole card.', 'Read the printed A/B/C expected pattern below the cut frame.'),
        ('Ask who has the WHO clue from mission 3.', 'A-Owl, B-Fox, C-Rabbit. Put the press beside the three.'),
    ]
    handoffs = [
        '"The star press is open. Three plain paper gifts are waiting on the workbench." Give pages 6-7.',
        '"The gifts stand. The messenger has shared the wrapping plan across three cards." Give pages 8-9.',
        '"The paper decorations are on. A winter gust means each gift must be checked." Give pages 10-11.',
        '"All three gifts are ready. The village window is waiting for them." Give pages 12-13.',
        '"The village is bright. Here is the reply from Owl, Fox and Rabbit." Give page 14.',
    ]
    for idx, (title, _, _) in enumerate(STORIES):
        pages.append(head(title, f'HOST / MISSION {idx + 1} / READ, MAKE, CHECK') + [
            hp('<b>Give:</b> ' + PROPS[idx] + ' Keep all later mission piles behind you.'),
            hp('<b>Read the story:</b> Use Player page ' + str([4, 6, 8, 10, 12][idx]) + ' before touching its pieces.'),
            *[hp(f'<b>Action {n}:</b> ' + action) for n, action in enumerate(ACTIONS[idx], 1)],
            hp('<b>Accept when:</b> ' + checks[idx]),
            *([hp('<b>Why the pattern is unique:</b> Clue 1 fixes A-Owl and C-Rabbit, so B-Fox. Clue 2 makes Fox horizontal; Owl cannot be diagonal, so Owl is vertical and Rabbit diagonal. Clue 3 fixes C lower centre and B upper right, leaving A lower left. Then the character wishes fix star lamp, scarf and bell.')]
              if idx == 2 else []),
            hp('<b>If not yet:</b> Ask the child to point to the named fold, piece or position. Let them repair it; do not remake a completed gift.'),
            hp('<b>Hint 1:</b> ' + hints[idx][0]),
            hp('<b>Hint 2:</b> ' + hints[idx][1]),
            hp('<b>Then read:</b> ' + handoffs[idx]),
            *([] if idx == 2 else [Spacer(1, 15), HostCheck(width, idx)]),
        ])
    pages.append(head('Help, finish and reset', 'HOST / RECOVERY AND FINALE') + [
        hp('If a cut piece is lost, reprint only its named prop page. Do not invent a replacement clue. If a fold tears, use an uncut fresh print; it does not mean the child failed.'),
        hp('If the quality frame is hard to handle, hold it while the child points through the small window, moving from icon to ribbon to seal. If a paper tent slips, lay its decorated front face-up in the same village space; no extra material is required.'),
        hp('At the final scene, check three gifts and their drawn patterns. Read the reply on Player page 14 aloud, then invite each child to name or point to one contribution. The reply and village board are the complete ending; no external prize is needed.'),
        hp('To pause, put each group\'s gifts, clue cards, frame and current mission in one separate pile. To replay with fresh drawing, print page 7 again; collect all 12 loose pieces and return the reply to the host.'),
    ])
    # The short introduction and opening share paper with their operational
    # instructions, avoiding nearly empty Guide sheets.
    quick_start = pages[0] + [Spacer(1, 14), p('Print, cut and stage', 'label')] + pages[1][3:]
    team_start = pages[2] + [Spacer(1, 12), p('Start the story', 'label')] + pages[3][3:-2]
    return [quick_start, team_start] + pages[4:]

