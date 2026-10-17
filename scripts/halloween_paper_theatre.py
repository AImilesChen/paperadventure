"""The Missing Pumpkin Light: a printable, cooperative paper theatre.

The player pages are deliberately single-sided. The host cuts the four hinged
windows before play and keeps the final scene until the fifth mission.
"""

import math
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Flowable, Image, Paragraph, Spacer, Table, TableStyle

import generate_celebration_samples as g


NAVY = g.NAVY
INK = g.INK
LINE = g.LINE
CORAL = g.CORAL
PALE = g.PALE
BODY = ParagraphStyle('theatre-player', fontName='Arial', fontSize=13.5,
                      leading=19.5, textColor=INK, spaceAfter=9)
HOST = ParagraphStyle('theatre-host', parent=BODY, fontSize=12.8,
                      leading=18, spaceAfter=8)
LABEL = ParagraphStyle('theatre-label', parent=BODY, fontName='ArialBold',
                       fontSize=11, leading=15, textColor=CORAL, spaceAfter=8)
TITLE = ParagraphStyle('theatre-title', fontName='Georgia', fontSize=25,
                       leading=30, textColor=NAVY, spaceAfter=12)


def p(value, host=False):
    value = value.replace('<b>', '<font name="ArialBold">').replace('</b>', '</font>')
    return Paragraph(value, HOST if host else BODY)


def header(title, tag):
    return [Paragraph(tag, LABEL), Paragraph(title, TITLE), Spacer(1, 9)]


def steps(items, host=False):
    return [p(f'<b>{n}.</b> {item}', host) for n, item in enumerate(items, 1)]


def note(message, width, host=False):
    card = Table([[p(message, host)]], colWidths=[width])
    card.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PALE),
        ('BOX', (0, 0), (-1, -1), 0.8, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return card


def host_route(width):
    rows = [
        ('1 / SPOT', 'Player 4-5', 'Four actor posters'),
        ('2 / MAKE', 'Player 6-7', 'Four cut paper shadows'),
        ('3 / PLACE', 'Player 8-10', 'One checked stage order'),
        ('4 / REHEARSE', 'Player 11-13', 'Four working windows'),
        ('5 / PERFORM', 'Player 14-15', 'One complete lantern picture'),
    ]
    table = Table([[p('<b>' + name + '</b>', True), p(pages, True), p(result, True)]
                   for name, pages, result in rows],
                  colWidths=[width * .27, width * .25, width * .48],
                  rowHeights=[45] * len(rows))
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), PALE),
        ('GRID', (0, 0), (-1, -1), .6, LINE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 9),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    return table


def theatre_intro(message, width):
    """Keep the three stacked theatre sheets at identical print coordinates."""
    strip = Table([[p(message)]], colWidths=[width], rowHeights=[66])
    strip.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    return strip


def card_grid(items, width, height):
    rows = []
    for start in range(0, len(items), 2):
        cells = []
        for title, description in items[start:start + 2]:
            cells.append([p(f'<b>{title}</b>'), p(description)])
        if len(cells) == 1:
            cells.append('')
        rows.append(cells)
    grid = Table(rows, colWidths=[width / 2] * 2, rowHeights=[height] * len(rows))
    grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), PALE),
        ('BOX', (0, 0), (-1, -1), 0.9, NAVY),
        ('INNERGRID', (0, 0), (-1, -1), 0.8, LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 13),
        ('TOPPADDING', (0, 0), (-1, -1), 13),
    ]))
    return grid


def polygon(c, pts, fill=0):
    path = c.beginPath()
    for i, (x, y) in enumerate(pts):
        (path.moveTo if i == 0 else path.lineTo)(x, y)
    path.close()
    c.drawPath(path, fill=fill, stroke=1)


def icon(c, name, cx, cy, radius, filled=False):
    c.saveState()
    c.setStrokeColor(NAVY)
    c.setFillColor(NAVY if filled else colors.white)
    c.setLineWidth(2)
    if name == 'BAT':
        points = [(-1, .15), (-.84, .48), (-.62, .22), (-.44, .48),
                  (-.17, .15), (-.11, .62), (0, .47), (.11, .62),
                  (.17, .15), (.44, .48), (.62, .22), (.84, .48),
                  (1, .15), (.7, -.5), (.37, -.27), (0, -.66),
                  (-.37, -.27), (-.7, -.5)]
        polygon(c, [(cx + x * radius, cy + y * radius) for x, y in points], filled)
        if not filled:
            c.circle(cx - radius * .09, cy + radius * .26, radius * .035, fill=1)
            c.circle(cx + radius * .09, cy + radius * .26, radius * .035, fill=1)
    elif name == 'OWL':
        pts = [(-.66, -.65), (-.76, .45), (-.44, .86), (-.2, .6),
               (.2, .6), (.44, .86), (.76, .45), (.66, -.65), (0, -.85)]
        polygon(c, [(cx + x * radius, cy + y * radius) for x, y in pts], filled)
        if not filled:
            c.circle(cx - radius * .28, cy + radius * .15, radius * .13, fill=0)
            c.circle(cx + radius * .28, cy + radius * .15, radius * .13, fill=0)
            polygon(c, [(cx, cy - radius * .03),
                        (cx - radius * .12, cy - radius * .19),
                        (cx + radius * .12, cy - radius * .19)])
            for side in (-1, 1):
                c.arc(cx + side * radius * .25 - radius * .17,
                      cy - radius * .53,
                      cx + side * radius * .25 + radius * .17,
                      cy - radius * .2, 190 if side < 0 else 0, 155)
    elif name == 'PUMPKIN':
        c.ellipse(cx - radius * .84, cy - radius * .66,
                  cx + radius * .84, cy + radius * .62, fill=int(filled), stroke=1)
        c.rect(cx - radius * .11, cy + radius * .61,
               radius * .22, radius * .28, fill=int(filled), stroke=1)
        if not filled:
            c.arc(cx - radius * .48, cy - radius * .66,
                  cx + radius * .48, cy + radius * .62, 80, 200)
    elif name == 'STAR':
        pts = []
        for i in range(10):
            a = math.pi / 2 + i * math.pi / 5
            r = radius if i % 2 == 0 else radius * .44
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        polygon(c, pts, filled)
    c.restoreState()


class Sheet(Flowable):
    def __init__(self, width, kind):
        super().__init__()
        self.width = width
        self.kind = kind
        self.height = {'record': 425, 'search': 465, 'puppets': 468,
                       'clues': 455, 'stage': 465, 'facade': 465,
                       'cues': 390, 'finale': 465}[kind]

    def label(self, x, y, value, size=11, bold=False):
        c = self.canv
        c.setFillColor(NAVY)
        c.setFont('ArialBold' if bold else 'Arial', size)
        c.drawString(x, y, value)

    def draw(self):
        getattr(self, 'draw_' + self.kind)()

    def draw_record(self):
        c = self.canv
        rows = [
            ('1 / SPOT', 'Four actor posters: _______________________________'),
            ('2 / MAKE', 'Four paper silhouettes completed:  YES  /  RETRY'),
            ('3 / PLACE', 'Top left: __________  Top right: __________'),
            ('', 'Bottom left: _________  Bottom right: _________'),
            ('4 / REHEARSE', 'Four windows opened at their spoken cues:  YES  /  RETRY'),
            ('5 / PERFORM', 'Lantern revealed; every player helped:  YES  /  RETRY'),
        ]
        for i, (title, field) in enumerate(rows):
            y = 350 - i * 65
            c.setStrokeColor(LINE)
            c.roundRect(1, y, self.width - 2, 60, 6)
            if title:
                self.label(14, y + 37, title, 12, True)
            self.label(14, y + 15, field, 11)

    def draw_search(self):
        c = self.canv
        c.setStrokeColor(LINE)
        c.roundRect(1, 102, self.width - 2, 350, 9)
        positions = [(.18, .73, 'BAT', True), (.52, .79, 'CLOUD', False),
                     (.8, .7, 'OWL', True), (.26, .47, 'LEAF', False),
                     (.63, .48, 'PUMPKIN', True), (.86, .3, 'CAT', False),
                     (.2, .22, 'STAR', True), (.51, .2, 'HOUSE', False)]
        for fx, fy, name, damaged in positions:
            x = self.width * fx
            y = 102 + 350 * fy
            c.setStrokeColor(NAVY)
            if name in ('BAT', 'OWL', 'PUMPKIN', 'STAR'):
                icon(c, name, x, y, 34)
            elif name == 'CLOUD':
                for dx in (-15, 0, 16): c.circle(x + dx, y, 14)
            elif name == 'LEAF':
                c.ellipse(x - 25, y - 10, x + 25, y + 10)
                c.line(x - 25, y - 10, x + 25, y + 10)
            elif name == 'CAT':
                polygon(c, [(x - 20, y - 20), (x - 20, y + 15), (x - 10, y + 30),
                            (x, y + 17), (x + 10, y + 30), (x + 20, y + 15),
                            (x + 20, y - 20)])
                c.circle(x - 8, y + 3, 2, fill=1)
                c.circle(x + 8, y + 3, 2, fill=1)
                polygon(c, [(x - 3, y - 5), (x + 3, y - 5), (x, y - 9)], 1)
                for side in (-1, 1):
                    c.line(x + side * 4, y - 9, x + side * 22, y - 8)
                    c.line(x + side * 4, y - 12, x + side * 22, y - 15)
            else:
                polygon(c, [(x - 27, y - 5), (x, y + 22), (x + 27, y - 5),
                            (x + 20, y - 5), (x + 20, y - 27),
                            (x - 20, y - 27), (x - 20, y - 5)])
            c.setStrokeColor(LINE)
            c.roundRect(x - 41, y - 43, 82, 86, 7)
            if damaged:
                # Every poster has a border. The three matching tear marks,
                # rather than a special border, identify the four actors.
                c.setStrokeColor(CORAL)
                c.setLineWidth(1.5)
                for j in range(3):
                    dx = x + 12 + j * 10
                    c.line(dx, y + 42, dx + 4, y + 34)
                    c.line(dx + 4, y + 34, dx + 8, y + 42)
                c.setLineWidth(1)
        self.label(8, 75, 'CUT VIEWER (ADULT)', 11, True)
        c.setDash(5, 3)
        c.rect(8, 3, 190, 64)
        c.rect(65, 12, 76, 44)
        c.setDash()
        self.label(217, 75, 'THREE-TEAR EXAMPLE', 11, True)
        c.setStrokeColor(CORAL)
        c.setLineWidth(1.8)
        for j in range(3):
            dx = 225 + j * 15
            c.line(dx, 64, dx + 6, 53)
            c.line(dx + 6, 53, dx + 12, 64)
        c.setLineWidth(1)
        self.label(217, 38, 'Inspect each poster\'s top-right edge.', 11)
        self.label(217, 19, 'Four have THREE small zigzag tears.', 11)

    def draw_puppets(self):
        c = self.canv
        names = ['BAT', 'OWL', 'PUMPKIN', 'STAR']
        cell_w = self.width / 2
        cell_h = self.height / 2
        for i, name in enumerate(names):
            x = (i % 2) * cell_w
            y = (1 - i // 2) * cell_h
            c.setDash(5, 3)
            c.rect(x + 2, y + 3, cell_w - 5, cell_h - 6)
            c.setDash()
            self.label(x + 13, y + cell_h - 25, f'{i+1} / {name}', 12, True)
            icon(c, name, x + cell_w / 2, y + 102, 61, filled=True)
            c.setStrokeColor(CORAL)
            c.setDash(3, 3)
            c.line(x + cell_w / 2, y + 32, x + cell_w / 2, y + 184)
            c.setDash()
            self.label(x + cell_w / 2 - 19, y + 190, 'FOLD', 11, True)
            self.label(x + 13, y + 18, 'Fold; adult cuts the bold edge.', 11)

    def draw_clues(self):
        c = self.canv
        clues = [
            ('OWL KEEPER', 'The OWL stands directly above the PUMPKIN.'),
            ('BAT HELPER', 'The BAT stands directly right of the OWL.'),
            ('STAR MAKER', 'The STAR stands directly below the BAT.'),
            ('PIP / CHECK', 'The PUMPKIN stands directly left of the STAR.'),
        ]
        for i, (role, clue) in enumerate(clues):
            y = self.height - (i + 1) * 112 + 2
            c.setDash(5, 3)
            c.roundRect(3, y, self.width - 6, 102, 7)
            c.setDash()
            self.label(16, y + 70, role, 13, True)
            self.label(16, y + 37, clue, 12)
            self.label(16, y + 17, 'Read this aloud. Keep the card in your hand.', 10)

    def theatre_cells(self, mode):
        c = self.canv
        pad = 16
        board_y = 54
        board_h = 390
        gap = 11
        cell_w = (self.width - 2 * pad - gap) / 2
        cell_h = (board_h - gap) / 2
        cells = []
        for row in range(2):
            for col in range(2):
                x = pad + col * (cell_w + gap)
                y = board_y + (1 - row) * (cell_h + gap)
                cells.append((x, y, cell_w, cell_h))
        if mode == 'stage':
            for i, (x, y, cw, ch) in enumerate(cells):
                c.setFillColor(PALE)
                c.setStrokeColor(LINE)
                c.roundRect(x, y, cw, ch, 10, fill=1)
                self.label(x + 12, y + ch - 24,
                           ['TOP LEFT', 'TOP RIGHT', 'BOTTOM LEFT', 'BOTTOM RIGHT'][i], 11, True)
                c.setDash(4, 4)
                c.circle(x + cw / 2, y + ch / 2 - 9, 55)
                c.setDash()
        elif mode == 'facade':
            c.setStrokeColor(CORAL)
            c.setLineWidth(3)
            c.roundRect(3, 40, self.width - 6, 420, 25)
            c.setFillColor(NAVY)
            c.setFont('ArialBold', 11)
            c.drawCentredString(self.width / 2, 446, "PIP'S PUMPKIN THEATRE")
            c.setFont('Arial', 11)
            c.drawCentredString(self.width / 2, 48, 'FOUR PAPER WINDOWS / ONE SHARED SHOW')
            c.setStrokeColor(NAVY)
            c.setLineWidth(1.6)
            for i, (x, y, cw, ch) in enumerate(cells):
                inner_x, inner_y = x + 10, y + 15
                inner_w, inner_h = cw - 20, ch - 30
                c.setFillColor(colors.HexColor('#FFF6E7'))
                c.roundRect(inner_x, inner_y, inner_w, inner_h, 5, fill=1, stroke=0)
                # The door face is deliberately anonymous. Its actor is
                # discovered from the stage clues, not printed on the flap.
                c.setStrokeColor(LINE)
                for dot in range(3):
                    c.circle(inner_x + inner_w / 2 - 22 + dot * 22,
                             inner_y + inner_h / 2 + 8, 4, fill=0)
                c.setStrokeColor(NAVY)
                c.setDash(6, 3)
                c.line(inner_x, inner_y, inner_x + inner_w, inner_y)
                c.line(inner_x + inner_w, inner_y + inner_h, inner_x, inner_y + inner_h)
                cut_x = inner_x + inner_w if i % 2 == 0 else inner_x
                fold_x = inner_x if i % 2 == 0 else inner_x + inner_w
                c.line(cut_x, inner_y, cut_x, inner_y + inner_h)
                c.setDash()
                c.setStrokeColor(CORAL)
                c.setDash(2, 3)
                c.line(fold_x, inner_y, fold_x, inner_y + inner_h)
                c.setDash()
                c.setStrokeColor(NAVY)
                c.saveState()
                c.translate(fold_x + (-3 if i % 2 == 0 else 3), inner_y + 12)
                c.rotate(90)
                c.setFillColor(NAVY)
                c.setFont('ArialBold', 11)
                c.drawString(0, 0, 'FOLD - DO NOT CUT')
                c.restoreState()
                self.label(inner_x + 14, inner_y + 18,
                           ['WINDOW 1', 'WINDOW 2', 'WINDOW 3', 'WINDOW 4'][i], 11, True)
            self.label(17, 15, 'CUT THREE SIDES. KEEP EACH FOLD EDGE ATTACHED.', 11, True)
        else:
            # A single glowing pumpkin stretches across the four openings.
            # It remains recognisable when printed in greyscale.
            c.setFillColor(colors.HexColor('#FFF4DF'))
            c.setStrokeColor(NAVY)
            c.roundRect(16, 54, self.width - 32, 390, 12, fill=1)
            mid_x, mid_y = self.width / 2, 249
            c.setStrokeColor(CORAL)
            c.setLineWidth(2.3)
            for angle in range(0, 360, 30):
                radians = math.radians(angle)
                c.line(mid_x + 137 * math.cos(radians),
                       mid_y + 126 * math.sin(radians),
                       mid_x + 153 * math.cos(radians),
                       mid_y + 143 * math.sin(radians))
            c.setFillColor(colors.HexColor('#F8CE87'))
            c.setStrokeColor(NAVY)
            c.setLineWidth(2)
            c.ellipse(mid_x - 125, mid_y - 116, mid_x + 125, mid_y + 116,
                      fill=1, stroke=1)
            c.setFillColor(colors.HexColor('#7D865D'))
            c.roundRect(mid_x - 12, mid_y + 104, 24, 22, 3, fill=1, stroke=1)
            c.setStrokeColor(colors.HexColor('#BA6943'))
            for offset in (-66, -35, 35, 66):
                c.arc(mid_x + offset - 26, mid_y - 116,
                      mid_x + offset + 26, mid_y + 116, 85, 190)
            c.setStrokeColor(NAVY)
            c.setFillColor(NAVY)
            for eye_x in (-47, 47):
                polygon(c, [(mid_x + eye_x - 18, mid_y + 26),
                            (mid_x + eye_x + 18, mid_y + 26),
                            (mid_x + eye_x, mid_y + 64)], 1)
            c.arc(mid_x - 72, mid_y - 72, mid_x + 72, mid_y + 42, 195, 150)
            names = ['OWL WATCHES', 'BAT FLIES', 'PUMPKIN WELCOMES', 'STAR SHINES']
            for i, (x, y, cw, ch) in enumerate(cells):
                c.setStrokeColor(LINE)
                c.roundRect(x, y, cw, ch, 10, fill=0)
                self.label(x + 13, y + ch - 24, names[i], 11, True)
                c.setStrokeColor(colors.HexColor('#A77D65'))
                c.setLineWidth(.9)
                c.setDash(3, 5)
                c.circle(x + cw / 2, y + ch / 2 - 9, 55)
                c.setDash()
                c.setLineWidth(1)
            c.setFillColor(NAVY)
            c.setFont('ArialBold', 11)
            c.drawCentredString(mid_x, 60, 'PIP\'S PAPER LANTERN IS LIT')
        self.draw_registration()
        return cells

    def draw_registration(self):
        c = self.canv
        c.saveState()
        c.setStrokeColor(CORAL)
        c.setLineWidth(.8)
        for x in (8, self.width - 8):
            for y in (76, 430):
                c.line(x - 3, y, x + 3, y)
                c.line(x, y - 3, x, y + 3)
        c.restoreState()

    def draw_stage(self):
        self.theatre_cells('stage')
        self.label(16, 18, 'Place one cut silhouette on each circle. Keep the positions for rehearsal.', 11)

    def draw_facade(self):
        self.theatre_cells('facade')

    def draw_cues(self):
        c = self.canv
        cues = [('NIGHT SKY', 'I sleep upside down and fly after dusk.'),
                ('OLD TREE', 'I watch from a branch with a round face.'),
                ('WARM PORCH', 'I welcome neighbours with a carved smile.'),
                ('FINAL SPARK', 'I shine high above the festival.')]
        for i, (phrase, clue) in enumerate(cues):
            y = self.height - 88 * (i + 1)
            c.setDash(5, 3)
            c.roundRect(2, y, self.width - 4, 79, 7)
            c.setDash()
            self.label(15, y + 51, f'CUE CARD / {phrase}', 13, True)
            self.label(15, y + 23, clue, 12)

    def draw_finale(self):
        self.theatre_cells('finale')
        self.label(16, 18, 'THE LIGHT RETURNS / Open all four windows to reveal Pip\'s lantern.', 11, True)


class MissionWorksheet(Flowable):
    """Useful working space, rather than a large unused bottom half."""
    def __init__(self, width, mission):
        super().__init__()
        self.width = width
        self.height = 155
        self.mission = mission

    def draw(self):
        c = self.canv
        c.setStrokeColor(LINE)
        c.setFillColor(NAVY)
        c.roundRect(1, 1, self.width - 2, 153, 8)
        c.setFont('ArialBold', 12)
        titles = ['OUR OBSERVATION', 'OUR PAPER MAKING CHECK', 'OUR STAGE SKETCH',
                  'OUR REHEARSAL CHECK', 'OUR FESTIVAL MEMORY']
        c.drawString(14, 130, titles[self.mission])
        if self.mission == 0:
            for n in range(4):
                x = 14 + (n % 2) * (self.width / 2)
                y = 72 - (n // 2) * 52
                c.roundRect(x, y, self.width / 2 - 28, 43, 5)
                c.setFont('Arial', 11)
                c.drawString(x + 9, y + 16, f'{n+1}. Torn poster: __________________')
        elif self.mission == 1:
            for n, name in enumerate(['BAT', 'OWL', 'PUMPKIN', 'STAR']):
                y = 100 - n * 25
                c.rect(15, y, 12, 12)
                c.setFont('Arial', 11)
                c.drawString(35, y + 1, f'{name}: folded / adult cut / unfolded')
        elif self.mission == 2:
            for i, label in enumerate(['TOP LEFT', 'TOP RIGHT', 'BOTTOM LEFT', 'BOTTOM RIGHT']):
                x = 14 + (i % 2) * (self.width / 2)
                y = 75 - (i // 2) * 50
                c.roundRect(x, y, self.width / 2 - 28, 41, 5)
                c.setFont('Arial', 10)
                c.drawString(x + 8, y + 23, label)
                c.line(x + 8, y + 11, x + self.width / 2 - 38, y + 11)
        elif self.mission == 3:
            for n in range(4):
                x = 14 + (n % 2) * (self.width / 2)
                y = 72 - (n // 2) * 52
                c.roundRect(x, y, self.width / 2 - 28, 43, 5)
                c.setFont('Arial', 11)
                c.drawString(x + 9, y + 17, f'Cue {n+1}: heard / window opened')
        else:
            c.setFont('Arial', 11)
            c.drawString(15, 97, 'A paper action I did: ___________________________________________')
            c.drawString(15, 65, 'A scene our team repaired: _______________________________________')
            c.drawString(15, 33, 'Pip can say: "Thank you for ___________________________________."')


class CompactWorksheet(Flowable):
    def __init__(self, width, mission):
        super().__init__()
        self.width = width
        self.height = 88
        self.mission = mission

    def draw(self):
        c = self.canv
        c.setStrokeColor(LINE)
        c.setFillColor(NAVY)
        c.roundRect(1, 1, self.width - 2, 86, 7)
        c.setFont('ArialBold', 11)
        c.drawString(14, 61, 'OUR PAPER MAKING CHECK' if self.mission == 1 else
                     'OUR REHEARSAL CHECK' if self.mission == 3 else 'OUR FESTIVAL MEMORY')
        c.setFont('Arial', 11)
        if self.mission == 1:
            for n, name in enumerate(['BAT', 'OWL', 'PUMPKIN', 'STAR']):
                x = 15 + n * (self.width - 30) / 4
                c.rect(x, 23, 12, 12)
                c.drawString(x + 18, 24, name)
        elif self.mission == 3:
            for n, name in enumerate(['BAT', 'OWL', 'PUMPKIN', 'STAR']):
                x = 15 + n * (self.width - 30) / 4
                c.rect(x, 23, 12, 12)
                c.drawString(x + 18, 24, name)
        else:
            c.drawString(15, 33, 'I helped the show by: ____________________________________________')


MISSIONS = [
    ('The empty stage',
     'A gust has torn four actor posters in Pip\'s festival square. The other pictures are scenery. Pip asks the team to find which four performers should return to the paper stage.',
     ['Put scene page 5 and the already prepared viewer on the table.',
      'Slide the opening over the top-right corner of each of the eight posters. Compare it with the three-tear example beside the viewer.',
      'Name the four pictures whose top-right edge has THREE zigzag tears. The Stage Checker writes or dictates them in row 1 on page 3.',
      'Show the adult the four matching posters. When checked, ask for the paper-shadow workshop.'],
     'Four matching actor posters found; the other four are scenery.'),
    ('The paper-shadow workshop',
     'Pip finds the lost drawings folded in the workshop. "If we make the four shapes again, they can stand on our stage," says Pip. Everyone helps prepare an actor for the final show.',
     ['Name the four shapes from record row 1. The adult gives the four outer template cards from page 7, with silhouettes still uncut.',
      'Each child chooses a card and folds it on the centre FOLD line, with ink on the outside. Another child checks the fold.',
      'The adult cuts around the visible bold half-shape through both folded layers. Open the card to reveal one full silhouette. Repeat for all four.',
      'Check BAT, OWL, PUMPKIN and STAR are present. Do not throw away a shape; all four are needed next.'],
     'Four usable paper silhouettes, not four answer cards.'),
    ('Everyone remembers a piece',
     'The helpers remember where the figures stood, but no helper saw the whole stage. Pip asks them to describe what they know without showing their notes.',
     ['Place stage mat page 10 in the middle. Adult gives the four clue cards from page 9 to different players; with two players, each holds two.',
      'One holder reads a clue aloud without displaying the card. Put the paper silhouettes on the four stage circles.',
      'Read the remaining clues in turn. Move figures until every clue is true; each holder checks only their own clue.',
      'The Stage Checker writes or dictates the four positions in record row 3. Show the complete stage to the adult.'],
     'A unique 2 by 2 stage arrangement.'),
    ('Rehearse the four windows',
     'Pip hangs the repaired paper theatre over the stage. "The windows must open when the story calls for them," says Pip. The wind may have taken the light, but the team can still practise together.',
     ['Adult aligns the small corner crosses on window page 12 with the stage and holds two corners. Keep each silhouette beneath its window.',
      'Share the four cue cards from page 13: two players hold two each; three players share them 2/1/1; four or more give one each. Close all windows.',
      'Adult reads the four-line rehearsal script in the Host Guide. The matching card holder names the actor, finds its position from mission 3 and opens that window.',
      'Check each open window reveals the named actor. Close and retry any missed cue; then mark row 4.'],
     'The group can operate four hinged paper windows together.'),
    ('The festival performance',
     'Neighbours gather for Pip\'s real show. This time the actors appear in a new story order. Each opened paper window reveals more of the lantern until the whole pumpkin shines.',
     ['Players look away while the adult privately swaps the rehearsal mat for final page 15 and puts the four silhouettes on its matching circles.',
      'The adult covers the picture with the CLOSED window sheet, aligns the four crosses and holds two corners. Players return only after the art is hidden.',
      'Keep all four cue cards; the adult may reassign them for more turns. The host reads the NEW finale script; the correct holder names the actor and opens its window.',
      'When all four windows are open, say what your team repaired. Each child names or points to one action they took; mark row 5.'],
     'All four actors revealed and the full paper lantern visible.'),
]


def mission_page(i, width):
    title, story, actions, result = MISSIONS[i]
    props = [
        'Team record page 3 and scene/viewer page 5.',
        'Team record page 3 and four templates on page 7; adult-handled scissors.',
        'Four silhouettes, four private clues on page 9 and stage mat page 10.',
        'Arranged stage mat, hinged window page 12 and four cue cards page 13.',
        'Four silhouettes and hinged window page 12; adult privately prepares final scene page 15.',
    ]
    questions = [
        'Which marks helped us choose the four actors?',
        'What did folding reveal that the flat cards hid?',
        'Which spoken clue helped you place an actor?',
        'How did you know which window to open?',
        'Which part of our shared show did you help make?',
    ]
    return header(title, f'PLAYER / MISSION {i+1} / STORY AND ACTIONS') + [
        p(f'<b>Story to read:</b> {story}'),
        note('<b>Put on the table:</b> ' + props[i], width), Spacer(1, 11),
        p('<b>Now do these actions:</b>'), *steps(actions),
        Spacer(1, 10), note('<b>Finished when:</b> ' + result, width),
        Spacer(1, 13), p('<b>Talk together:</b> ' + questions[i]),
        *([MissionWorksheet(width, i)] if i in (0, 2) else [CompactWorksheet(width, i)]),
    ]


def player(source, width):
    pages = [
        header('The Missing Pumpkin Light', 'HALLOWEEN HOME / PAPER THEATRE') + [
            p('Help Pip repair a friendly pumpkin theatre, make four paper shadows and perform a festival ending.'),
            Image(str(g.ROOT / source['cover']), width=width * .63, height=205, kind='proportional'),
            Spacer(1, 12), note('<b>Start here:</b> The adult reads the Host Guide, prepares the cut pieces and holds later pages. Players begin with job cards (page 2), a team record (page 3) and mission 1 (page 4).', width),
            Spacer(1, 13), p('Five connected missions. Ages 6-12. One complete team set for 2-6 players; two sets for 7-12. No real flame, lamp or special toy is needed.'),
        ],
        header('Your theatre jobs', 'PLAYER / PAGE 2 / CUT FOUR CARDS') + [
            p('Adult cuts the outer borders before play. Give each player a job; combine jobs when fewer than four play. Rotate after each mission.'),
            card_grid([
                ('STORY READER', 'Read Pip\'s scene. Ask each player to say what they noticed. At the end, invite every teammate to speak.'),
                ('PAPER MAKER', 'Move the viewer, fold a template or place actors. The adult handles scissors; a partner checks the fold.'),
                ('CUE CALLER', 'Read a private memory in mission 3. In missions 4-5, listen for your character and help open its window.'),
                ('STAGE CHECKER', 'Check each Finished when box. Write or dictate the team record, ask for a hint and show the result to the adult.'),
            ], width, 158),
            Spacer(1, 12), note('Rotate the four jobs clockwise after every mission. With two players, each holds two jobs. With five or six, pair a Reader or Maker and take turns with the paper action.', width),
        ],
        header('Our theatre record', 'PLAYER / PAGE 3 / KEEP WHOLE') + [
            p('Keep this in the middle. Write or dictate a result after each mission. The adult may write what a child says. Do not use real children\'s names.'),
            Sheet(width, 'record'),
            p('If a result does not fit later, look again at the printed prop or clue. Everyone can retry; no one is eliminated.'),
        ],
        mission_page(0, width),
        header('Spot the torn posters', 'PLAYER / PAGE 5 / SCENE AND VIEWER') + [
            p('All eight pictures have a poster border. Four top-right corners have THREE zigzag tears. The adult prepares the viewer before play; use it to inspect one poster at a time.'),
            Sheet(width, 'search'),
        ],
        mission_page(1, width),
        header('Make four paper shadows', 'PLAYER / PAGE 7 / FOLD AND CUT') + [
            p('The adult pre-cuts only the FOUR OUTER CARD BORDERS. In this mission, a child folds each card on its red centre line, ink outside; the adult cuts the visible bold half-shape through both layers. Unfold and keep all four actors.'),
            Sheet(width, 'puppets'),
        ],
        mission_page(2, width),
        header('Four private memories', 'PLAYER / PAGE 9 / CUT AND SHARE') + [
            p('Adult cuts four outer borders and distributes cards face down. Read your clue aloud, but do not show it until the group has placed all four figures.'),
            Sheet(width, 'clues'),
        ],
        header('The rehearsal stage', 'PLAYER / PAGE 10 / KEEP WHOLE') + [
            theatre_intro('Put the four cut silhouettes on these circles using the helpers\' spoken clues. This mat holds them beneath the windows during rehearsal. Match its four small corner crosses to the window sheet.', width),
            Sheet(width, 'stage'),
        ],
        mission_page(3, width),
        header('The hinged pumpkin theatre', 'PLAYER / PAGE 12 / ADULT PREPARES') + [
            theatre_intro('Adult cuts the three LONG-dashed edges of each window before play. Keep each labelled FOLD edge attached. Match the four small corner crosses to the rehearsal mat or final picture; hold two opposite corners.', width),
            Sheet(width, 'facade'),
        ],
        header('Four spoken cues', 'PLAYER / PAGE 13 / CUT FOUR CARDS') + [
            p('Adult cuts four outer borders before play. Each card describes one actor but does not give away a window number. Listen to Pip, name your actor, recall its stage place and open that window.'),
            Sheet(width, 'cues'),
            Spacer(1, 8), note('If you are holding a cue, do not open early. When Pip describes your actor, say its name, point to its stage place, then lift that paper window.', width),
        ],
        mission_page(4, width),
        header('The light returns', 'PLAYER / PAGE 15 / ADULT HOLDS UNTIL MISSION 5') + [
            theatre_intro('Adult only: while players look away, move silhouettes here. Cover this page with the closed window sheet and align four crosses. Invite players back to open the windows.', width),
            Sheet(width, 'finale'),
        ],
    ]
    return pages


GROUPS = [
    '2 players: one holds Reader + Checker and the other Maker + Caller. Swap both jobs after each mission.',
    '3 players: combine Reader + Checker; give Maker and Caller separately. Move the combined jobs clockwise next mission.',
    '4 players: one job each. Pass cards clockwise after each mission.',
    '5-6 players: pair the Reader and/or Maker jobs. Partners alternate who actually points, folds or moves a prop in every mission.',
    '7-12 players: make two balanced teams of 3-6 and print a complete 15-page Player Pack for EACH team. Give each team its own record, pieces and stage.',
]


HOST_STEPS = [
    ('mission 1', 'Give player pages 4-5, record page 3 and the pre-cut viewer. Keep all later mission pages behind you.',
     'BAT, OWL, PUMPKIN and STAR have three small zigzag tears at the top-right edge of their poster. CLOUD, LEAF, CAT and HOUSE do not.',
     'First compare the tear example beside the viewer. Then slide the opening over the top-right of each poster. Finally count the three marks and name the four actors.',
     'Pip: "We found the four actors whose posters were torn. Let us make their paper shadows in the workshop."'),
    ('mission 2', 'Give pages 6-7 and four pre-cut OUTER template cards. The silhouette contours must still be intact. Children fold; the adult cuts one folded contour at a time.',
     'There must be one usable BAT, OWL, PUMPKIN and STAR. The fold line is a construction aid, not a code. Every shape is used in mission 3.',
     'First let a child identify a template. Then show the centre fold and fold with ink outside. Finally adult and child cut one folded half-shape together.',
     'Pip: "The four actors are ready, but where do they stand? Four helpers remember the stage."'),
    ('mission 3', 'Give pages 8-10 and the four silhouettes. Distribute four clue cards; one player may hold two.',
     'Only solution: OWL top left; BAT top right; PUMPKIN bottom left; STAR bottom right. Each of the four printed relations holds.',
     'First ask what ABOVE means on this 2 by 2 board. Then place OWL and PUMPKIN. Finally use BAT and STAR clues.',
     'Pip: "Every actor has a place. Now we can hang the four paper windows and practise opening them."'),
    ('mission 4', 'Give pages 11-13. Adult has already cut three sides of every window and creased its labelled outer hinge. Share cue cards by the group rule on Guide page 3; align page 12 over page 10.',
     'Use the exact rehearsal script on the NEXT Guide page. Each holder must say the actor, point to its place, then open: BAT/window 2; OWL/window 1; PUMPKIN/window 3; STAR/window 4.',
     'First ask which card matches the spoken description. Then ask where that actor stood in mission 3. Finally point to the correct window without opening it for them.',
     'Pip: "The windows work, and the actors are ready. I have one more picture for our real festival show."'),
    ('mission 5', 'Do not show page 15 yet. Ask players to look away. Transfer silhouettes to its identical marked circles, cover it with the CLOSED window sheet and align four crosses. Invite players back only after the picture is hidden.',
     'The finale uses a different order: OWL/window 1; PUMPKIN/window 3; BAT/window 2; STAR/window 4. All four windows reveal one shared glowing pumpkin picture.',
     'First ask who is described in the new sentence. Then ask that player to recall the stage place. Finally read only the previous sentence again.',
     'Read the complete closing passage on Guide page 10 after all four windows are open.'),
]


def guide(source, width, counts, base):
    pages = [
        header('Run the paper theatre', 'HOST GUIDE / HALLOWEEN HOME') + [
            p('Read this guide before giving children the Player Pack. The adult host is outside the 2-12 player count.', True),
            *steps([
                'Print all 15 Player pages for each team, single-sided, one size only: A4 or US Letter at 100% / Actual size. The Host Guide may stay on screen.',
                'Prepare one complete set for 2-6 players or two complete sets for 7-12. Provide ordinary paper, two pencils and an eraser per team, plus adult-handled scissors.',
                'Before play, cut the jobs, viewer, four private clues and four cue cards. On page 7 cut ONLY the four outer template borders; leave the silhouettes uncut for mission 2.',
                'On page 12 cut three long-dashed edges of each window but keep each FOLD hinge attached. Hold later mission pages and final page 15 until their turn.',
                'Give jobs, record and mission 1 first. Check every result before releasing the next story and its props.',
            ], True),
            note('No real candle, lamp, toy, glue, double-sided printing or device is needed. Adult holds two corners of the stacked stage sheets while children open the windows.', width, True),
            Spacer(1, 13), p('<b>Five handovers at a glance</b>', True), host_route(width),
        ],
        header('Print, cut and sort', 'HOST / PREPARATION') + [
            p('One team: 15 single-sided Player sheets. Two teams: 30. Keep the Guide private. Use one paper size per team, at 100% / Actual size.', True),
            *[p(line, True) for line in [
                '<b>PRE-CUT before children arrive:</b> page 2 four job cards; page 5 viewer outer border AND inner opening; page 9 four clue cards; page 13 four cue cards.',
                '<b>PREPARE but do not solve:</b> page 7 cut only four outer template cards; leave the black silhouette contours INTACT. Page 12 cut three dashed sides of each window; leave its labelled FOLD side ATTACHED and crease gently.',
                '<b>KEEP WHOLE:</b> page 3 team record; page 10 rehearsal mat; page 12 hinged theatre sheet; page 15 lantern scene. Do not cut out the printed stage circles.',
                '<b>HOLD BACK:</b> keep page 15 out of sight until the adult has placed it under the closed window sheet in mission 5. Keep later pages behind this Guide until the previous result is checked.',
                '<b>DURING mission 2:</b> children fold each template on its centre line, ink outside. The adult cuts around the bold visible HALF-shape through both folded layers. Open to reveal four full actors.',
            ]],
            note('Inventory per team: 4 job cards + 1 viewer + 4 silhouettes + 4 private clues + 4 cue cards = 17 loose pieces. Also keep record, rehearsal mat, hinged facade and final scene whole.', width, True),
            p('Check that left-column doors open left and right-column doors open right; every door stays attached. Align the four tiny + marks on page 12 with page 10 or 15. The adult holds two opposite corners; no double-side registration is needed.', True),
        ],
        header('Give everyone an action', 'HOST / GROUPING') + [
            *[p(line, True) for line in GROUPS],
            p('<b>Four cue cards in missions 4-5:</b> with two children, each takes two; with three, deal 2/1/1; with four, one each. For five or six, four are callers, a fifth points to the matching stage place and a sixth reads or marks the team record. Change holders for the finale so everyone gets a speaking or opening turn across the two performances.', True),
            note('Use spoken answers for children who are not ready to write. Let a child point or move before the adult records. Never give a single older player every clue or every action.', width, True),
            Spacer(1, 8),
            p('<b>Across the five missions:</b> Reader introduces the scene; Maker handles the viewer, folds cards or places figures; Caller voices a clue or cue; Checker reads the Finished when box and asks the adult to verify. Pass job cards after each result.', True),
            p('<b>Two teams:</b> start both with their own page 4. The host checks team A, then team B at each mission before either receives the next pages. During cutting, one team can name its posters while the host cuts for the other. Let each team perform its own four-window ending in turn.', True),
            p('Table: CURRENT mission and record in the centre; cut pieces to one side; later pages and this Guide behind the host. Keep page 15 unseen until it is covered by the closed theatre.', True),
            p('<b>Read:</b> "The wind has darkened Pip\'s paper festival. We will spot what is missing, make four paper shadows, place them on stage and perform together. We may try again whenever we need to."', True),
        ],
    ]
    for i, (name, handout, answer, hints, bridge) in enumerate(HOST_STEPS):
        title, story, actions, result = MISSIONS[i]
        pages.append(header(title, f'HOST / MISSION {i+1} / READ, PLAY, VERIFY') + [
            p('<b>Prepare and give:</b> ' + handout, True),
            p('<b>Read the player story aloud:</b> ' + story, True),
            p('<b>Guide the actions in order:</b>', True),
            *steps(actions, True),
            note('<b>Accept only:</b> ' + answer, width, True),
            Spacer(1, 8), p('<b>If the group needs help:</b> ' + hints, True),
            p('<b>If wrong:</b> ' + ('Close the mistaken window, reread the descriptive cue and let the child point to the stage place before trying again.' if i == 4 else 'Ask them to point to the printed clue or try the paper action again. Do not reveal a later page.'), True),
            p(('<b>After acceptance:</b> ' if i == 4 else '<b>After acceptance, read:</b> ') + bridge, True),
        ])
        if i == 3:
            pages.append(header('Read the rehearsal', 'HOST / MISSION 4 / EXACT SCRIPT') + [
                p('Put the arranged mat under the window sheet. Deal cue cards by the group rule on Guide page 3. Read ONE line, wait for its holder to name the actor, point to its mission-3 place, then open that window. Close any incorrect window before continuing.', True),
                note('<b>1 / SAY:</b> "Pip sees the NIGHT SKY. Who sleeps upside down and flies after dusk?"<br/><b>WAIT FOR:</b> BAT. Top right, window 2.', width, True),
                Spacer(1, 11),
                note('<b>2 / SAY:</b> "Pip looks toward the OLD TREE. Who watches from a branch with a round face?"<br/><b>WAIT FOR:</b> OWL. Top left, window 1.', width, True),
                Spacer(1, 11),
                note('<b>3 / SAY:</b> "A light appears on the WARM PORCH. Who welcomes our neighbours with a carved smile?"<br/><b>WAIT FOR:</b> PUMPKIN. Bottom left, window 3.', width, True),
                Spacer(1, 11),
                note('<b>4 / SAY:</b> "Pip looks up for the FINAL SPARK. Who shines high above the festival?"<br/><b>WAIT FOR:</b> STAR. Bottom right, window 4.', width, True),
                Spacer(1, 13),
                p('After all four: "Our actors know when to appear. Let us close the windows, save our places and get ready for the real show." Check record row 4, then give player page 14. Keep page 15 unseen until the adult hides it behind the closed theatre.', True),
                p('<b>If a player freezes:</b> Re-read only the describing phrase on their card. Ask where that actor stood on page 10. If needed, let a partner point; the cue holder still opens the window.', True),
            ])
    pages.append(header('Perform and keep the ending', 'HOST / FINALE AND RESET') + [
        p('After mission 4 is checked, ask children to turn away. Lift the CLOSED theatre; replace the rehearsal mat with final page 15, move all four silhouettes onto its matching circles, then lay the CLOSED theatre on top and align its corner crosses. Hold two corners. Only now invite children to look again.', True),
        p('<b>New finale order:</b> OWL/window 1, PUMPKIN/window 3, BAT/window 2, STAR/window 4. This differs from rehearsal. Read each sentence slowly; the correct card holder says the actor and opens its window.', True),
        p('<b>Say 1:</b> "From the old tree, who watched over Pip\'s festival?" Wait for OWL / window 1.', True),
        p('<b>Say 2:</b> "At the doorway, who welcomed every neighbour?" Wait for PUMPKIN / window 3.', True),
        p('<b>Say 3:</b> "As music began, who flew across the evening sky?" Wait for BAT / window 2.', True),
        p('<b>Say 4:</b> "Above the whole show, who shone as Pip\'s paper lantern returned?" Wait for STAR / window 4.', True),
        p('<b>Read the ending:</b> "Pip looks at every bright window. The owl watched, the bat flew, the pumpkin welcomed us, and the star shone above everyone. You brought the paper festival back together."', True),
        p('Keep all four windows open to see the complete glowing pumpkin picture. Invite each child to name or point to one action they did. The final scene may be kept as a display. No separate prize or real lamp is required.', True),
        p('To reset: close all hinged windows, count 17 loose pieces, flatten silhouettes, erase the record, and sort the five mission piles. The printed solution stays the same; change jobs for a replay.', True),
        note('Lost piece: reprint its labelled page. Torn window: reprint page 12 and cut three sides again. If alignment shifts, hold both corners rather than changing print scale.', width, True),
    ])
    return pages

