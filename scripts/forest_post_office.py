"""Forest Home: a complete, hands-on paper post office game.

Five stations reuse physical mail: intake, label repair, bag loading,
resident interview, and witnessed handover. Answers stay in the host guide.
"""
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Flowable, Image, Paragraph, Spacer, Table, TableStyle

import generate_celebration_samples as g


BODY = ParagraphStyle('forest-post-body', fontName='Arial', fontSize=13.6,
                      leading=19.2, textColor=g.INK, spaceAfter=8)
NOTE = ParagraphStyle('forest-post-note', parent=BODY, fontSize=11.5,
                      leading=15.8, spaceAfter=6)
HOST = ParagraphStyle('forest-post-host', parent=BODY, fontSize=12.1,
                      leading=16.7, spaceAfter=7)
CARD = ParagraphStyle('forest-post-card', parent=BODY, fontSize=11.9,
                      leading=16, spaceAfter=5)

MAIL = [
    ('A / LETTER', 'Blue Tree 3 | morning', 'Address readable | seal intact | ordinary'),
    ('B / P17 PARCEL', 'Rain-blurred address | morning', 'Picture seal intact | PRIORITY'),
    ('C / LETTER', 'Pond 6 | morning', 'Address readable | seal torn | ordinary'),
    ('D / LETTER', 'Pond 7 | afternoon', 'Address readable | seal intact | ordinary'),
    ('E / PARCEL', 'Moss Lane 3 | morning', 'Address blurred | seal torn | ordinary'),
    ('F / LETTER', 'Moss Lane ? | afternoon', 'Address blurred | seal intact | ordinary'),
]
SORT_ANSWER = {'READY': ['A', 'D'], 'REPAIR': ['B', 'F'], 'HOLD': ['C', 'E']}
FRAGMENTS = [
    ('P17 / DISTRICT CLUE', 'Same district as letter A.', 'Find A on the sorted desk; read its address.'),
    ('P17 / DOOR CLUE', 'One door after letter A.', 'Find the number on A, then add one.'),
    ('P17 / MARK CLUE', 'Copy the picture seal on B.', 'Name its shape; the printed words do not name it.'),
    ('P18 / DISTRICT CLUE', 'MOSS LANE', 'Different parcel ID. Park this piece.'),
]
RESIDENTS = [
    ('OWL HOUSE', 'Blue Tree courtyard / door 4', 'parcel', 'P17', 'acorn'),
    ('FOX DEN', 'Blue Tree courtyard / door 4', 'letter', 'L06', 'moon'),
    ('BEAVER HUT', 'Blue Tree courtyard / door 4', 'parcel', 'P18', 'pine'),
]
MISSIONS = [
    dict(title='The rain-soaked mail', story='Rain drums on the forest post office roof. Nori finds six mixed-up pieces of mail. Parcel P17 must leave this morning, but its address is blurred. "First we must make the desk safe," Nori says. "Which items are ready, which need repair, and which must wait?"',
         props='Work record (3), sorting desk (5), six mail pieces (6).',
         steps=['<b>Intake Clerk:</b> Place all six mail pieces face up and read the rules on page 5.',
                '<b>Checker:</b> Check the seal first. Put each torn-seal item in HOLD, even if its address is readable.',
                '<b>Intake Clerk:</b> For intact seals, put readable addresses in READY and blurred addresses in REPAIR.',
                '<b>Courier:</b> Count two pieces in each tray. Find the picture-sealed P17 parcel in REPAIR.',
                '<b>Label Repairer:</b> Write all six letters in record row 1 and P17 in the parcel box. Show the adult every placement.'],
         result='Six pieces sorted: READY A,D; REPAIR B,F; HOLD C,E. Parcel B is P17.'),
    dict(title='Make the address readable', story='Nori dries P17 carefully. A faint carbon copy and four clue pieces are tucked under the counter. One piece belongs to a different parcel. "The rain took the answer from the label," Nori says. "Look back at the mail we saved."',
         props='Work record (3), P17 parcel B (6), four pieces (8), carbon copy and new label (9).',
         steps=['<b>Courier:</b> Find parcel B and read its ID: P17. Keep all mail pieces available as evidence.',
                '<b>Label Repairer:</b> Keep the three P17 clues; park the P18 clue. Match each clue to DISTRICT, DOOR NUMBER or DELIVERY MARK on page 9.',
                '<b>Intake Clerk:</b> Find letter A. Read its district and door number; work out the next door. <b>Checker:</b> Study the picture on B\'s intact seal.',
                '<b>Checker:</b> Compare your proposed district and even door with the faint carbon copy. It cannot supply the whole answer.',
                '<b>Label Repairer:</b> Write the three results on the new label and in record row 2. Leave RECIPIENT blank.',
                '<b>Team:</b> Point to A, B and each P17 clue as evidence. Show the adult your new label; the adult cuts it after checking.'],
         result='P17 label: BLUE TREE / 4 / ACORN; recipient stays blank.'),
    dict(title='Load the morning mailbag', story='The morning courier bell rings. Several letters are ready, but the bag has only two slots. Nori checks the district and time printed on each piece. "P17 is urgent," Nori says. "Load this morning\'s Blue Tree mail in the right order; the other mail must stay at the desk."',
         props='Work record (3), mail pieces (6), repaired P17 label (9), mailbag and handover slip (11).',
         steps=['<b>Intake Clerk:</b> Take the pieces in READY. Add repaired P17; leave HOLD and still-unrepaired mail aside.',
                '<b>Checker:</b> Read the page 11 bag rule: BLUE TREE and MORNING only, two slots maximum.',
                '<b>Courier:</b> Put the eligible PRIORITY item in slot 1 and the eligible ordinary item in slot 2.',
                '<b>Label Repairer:</b> Leave mail with a different district or time outside. Copy the slot letters to the handover slip and record row 3.',
                '<b>Checker:</b> Show the adult the loaded pieces, parked mail and completed slip.'],
         result='Blue Tree morning bag: slot 1 B/P17, slot 2 A; D stays for afternoon.'),
    dict(title='Ask before handing over', story='At Blue Tree\'s shared door, rain has erased the household name on P17. Three neighbours are waiting. "Keep their answers away from the courier," Nori says. "Ask each one what they expect before delivery."',
         props='Label (9), interview notes (12), three folded resident cards (13), record (3). Adult holds the stamp.',
         steps=['<b>Adult:</b> Hand folded cards to actors, answers facing them. Keep the stamp for station 5.',
                '<b>Courier:</b> Ask all three questions on page 13. Do not look at card backs.',
                '<b>Residents:</b> Reply from your private card. <b>Checker:</b> Compare type, ID and seal with B/P17.',
                '<b>Label Repairer:</b> Write the confirmed household in record row 4 and on the label.',
                '<b>Intake Clerk:</b> Explain why the others cannot receive P17. Show the notes to the adult.'],
         result='OWL HOUSE confirms door 4, P17 and the acorn seal.'),
    dict(title='Deliver and sign', story='The correct door is open. Nori is ready to hand over the parcel, but the post office still needs a clear record. "Let us check what we repaired, what we carried and who answered," Nori says. "Then the neighbour may sign for the delivery."',
         props='P17 piece B (6), repaired label (9), handover slip (11), resident cards and stamp (13), delivery board (15). Adult keeps ending page 16.',
         steps=['<b>Courier:</b> Lay parcel B/P17 and its repaired label beside the delivery board, with both IDs visible.',
                '<b>Checker:</b> Read the handover slip: P17 must be first in the Blue Tree morning bag.',
                '<b>Courier:</b> Ask the confirmed resident to repeat P17 and ACORN. <b>Label Repairer:</b> Write the household on the board.',
                '<b>Resident:</b> Draw a fictional mark in the signature box. <b>Intake Clerk:</b> Put the paper DELIVERED stamp in its frame.',
                '<b>Team:</b> Show the adult parcel, label, slip, resident card and signed board. After acceptance, collect Nori\'s ending.'],
         result='P17 / BLUE TREE 4 / ACORN / OWL HOUSE; handover B then A; signed and stamped.'),
]


def p(value, kind='body'):
    style = {'body': BODY, 'note': NOTE, 'host': HOST, 'card': CARD}[kind]
    return Paragraph(value, style)


def head(title, eyebrow):
    return [g.p(eyebrow, 'eyebrow'), g.p(title, 'title'), Spacer(1, 5)]


def steps(lines, kind='body'):
    return [p(f'<b>{i}.</b> {line}', kind) for i, line in enumerate(lines, 1)]


def panel(title, lines, width, kind='note'):
    cell = [p(title, kind)] + [p(line, kind) for line in lines]
    t = Table([[cell]], colWidths=[width])
    t.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), .8, g.NAVY),
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t


def draw_acorn(c, cx, cy, scale=1):
    """A black-line picture seal that survives grayscale printing."""
    c.saveState()
    c.translate(cx, cy)
    c.scale(scale, scale)
    c.setLineWidth(1.5)
    c.ellipse(-10, -14, 10, 8, stroke=1, fill=0)
    c.roundRect(-12, 3, 24, 9, 3, stroke=1, fill=0)
    c.line(0, 12, 2, 17)
    c.restoreState()


class CutCards(Flowable):
    """Two large cards per row, with a clear outer cutting rectangle."""
    def __init__(self, width, cards, row_height=135, columns=2, variant='plain'):
        super().__init__()
        self.width = width
        self.cards = cards
        self.row_height = row_height
        self.columns = columns
        self.variant = variant
        self.height = row_height * ((len(cards) + columns - 1) // columns)

    def draw(self):
        c, w = self.canv, self.width
        gap = 18 if self.variant == 'mail' else 10
        cw = (w - gap * (self.columns - 1)) / self.columns
        for index, (title, primary, detail) in enumerate(self.cards):
            col, row = index % self.columns, index // self.columns
            x = col * (cw + gap)
            y = self.height - (row + 1) * self.row_height + 4
            h = self.row_height - 8
            c.setStrokeColor(g.NAVY)
            if title == 'DELIVERED STAMP':
                token_w, token_h = 132, 58
                token_x, token_y = x + (cw - token_w) / 2, y + (h - token_h) / 2
                c.setDash(5, 3)
                c.roundRect(token_x, token_y, token_w, token_h, 5, stroke=1, fill=0)
                c.setDash()
                c.setFont('ArialBold', 13)
                c.setFillColor(g.NAVY)
                c.drawCentredString(token_x + token_w / 2, token_y + 31, 'DELIVERED')
                c.setFont('Arial', 10)
                c.drawCentredString(token_x + token_w / 2, token_y + 14, 'paper stamp / cut one')
                continue
            c.setDash(5, 3)
            c.roundRect(x, y, cw, h, 5, stroke=1, fill=0)
            c.setDash()
            for value, size, yy in [(title, 12.5, h - 25), (primary, 12.1, h - 53),
                                    (detail, 10.9, h - 78)]:
                para = Paragraph(value, ParagraphStyle('cut', fontName='ArialBold' if yy == h-25 else 'Arial',
                                                       fontSize=size, leading=size+3, textColor=g.NAVY))
                _, ph = para.wrap(cw - 22, 100)
                para.drawOn(c, x + 11, y + yy - ph + size)
            if self.variant == 'mail':
                ix, iy = x + cw - 82, y + 18
                c.saveState()
                c.setLineWidth(1.25)
                if 'PARCEL' in title:
                    c.rect(ix, iy, 66, 44, stroke=1, fill=0)
                    c.line(ix, iy + 44, ix + 33, iy + 53)
                    c.line(ix + 66, iy + 44, ix + 33, iy + 53)
                else:
                    c.rect(ix, iy, 66, 42, stroke=1, fill=0)
                    c.line(ix, iy + 42, ix + 33, iy + 20)
                    c.line(ix + 66, iy + 42, ix + 33, iy + 20)
                if 'P17' in title:
                    draw_acorn(c, ix + 33, iy + 24, .85)
                elif 'seal torn' in detail:
                    c.setLineWidth(2.2)
                    path = c.beginPath()
                    path.moveTo(ix + 44, iy + 51)
                    for px, py in [(48, 42), (44, 35), (52, 29), (47, 20), (54, 13)]:
                        path.lineTo(ix + px, iy + py)
                    c.drawPath(path, stroke=1)
                else:
                    c.circle(ix + 33, iy + 23, 8, stroke=1, fill=0)
                # The address evidence is a second visual channel, not a colour code.
                ax = x + 16
                if 'blurred' in detail.lower() or 'blurred' in primary.lower():
                    for j, yy in enumerate((y + 28, y + 39, y + 50)):
                        c.line(ax, yy, ax + 34 - j * 5, yy)
                        c.line(ax + 8 + j * 7, yy - 3, ax + 12 + j * 7, yy + 3)
                    for dx in (7, 25, 44):
                        c.line(ax + dx, y + 61, ax + dx - 4, y + 55)
                else:
                    for j, yy in enumerate((y + 29, y + 41, y + 53)):
                        c.line(ax, yy, ax + 42 - j * 7, yy)
                c.restoreState()


class ResidentFoldCards(Flowable):
    """One cut-and-fold sheet: the courier sees the front, actors see the back."""
    def __init__(self, width, residents):
        super().__init__()
        self.width, self.height = width, 420
        self.residents = residents

    def draw(self):
        c, gap = self.canv, 12
        cw, rh = (self.width - gap) / 2, 205
        for index, (name, place, mail_type, mail_id, seal) in enumerate(self.residents):
            col, row = index % 2, index // 2
            x, y = col * (cw + gap), self.height - (row + 1) * rh + 5
            h = rh - 10
            c.saveState()
            c.setStrokeColor(g.NAVY)
            c.setFillColor(g.NAVY)
            c.setDash(5, 3)
            c.roundRect(x, y, cw, h, 5, stroke=1, fill=0)
            c.setDash(2, 2)
            c.line(x + 7, y + h / 2, x + cw - 7, y + h / 2)
            c.setDash()
            c.setFont('ArialBold', 12.4)
            c.drawString(x + 11, y + h - 22, name)
            c.setFont('Arial', 10.8)
            c.drawString(x + 11, y + h - 41, 'FRONT / show to courier')
            c.drawString(x + 11, y + h - 59, place)
            c.drawString(x + 11, y + h / 2 + 11, 'Fold lower half behind this front.')
            self._draw_house(c, x + cw - 52, y + h / 2 + 18, name)
            c.setFont('ArialBold', 10.8)
            c.drawString(x + 11, y + h / 2 - 19, 'PRIVATE / resident reads aloud')
            c.setFont('Arial', 10.8)
            c.drawString(x + 11, y + h / 2 - 39, f'Type: {mail_type}')
            c.drawString(x + 11, y + h / 2 - 58, f'ID: {mail_id}')
            c.drawString(x + 11, y + h / 2 - 77, f'Seal mark: {seal}')
            c.restoreState()
        x, y = cw + gap + (cw - 132) / 2, 34
        c.setStrokeColor(g.NAVY)
        c.setDash(5, 3)
        c.roundRect(x, y, 132, 58, 5, stroke=1, fill=0)
        c.setDash()
        c.setFont('ArialBold', 13)
        c.drawCentredString(x + 66, y + 31, 'DELIVERED')
        c.setFont('Arial', 10)
        c.drawCentredString(x + 66, y + 14, 'paper stamp / cut one')

    @staticmethod
    def _draw_house(c, x, y, name):
        c.setLineWidth(1.4)
        c.rect(x, y, 35, 25, stroke=1, fill=0)
        c.line(x - 4, y + 25, x + 17, y + 39)
        c.line(x + 17, y + 39, x + 39, y + 25)
        if name.startswith('OWL'):
            c.circle(x + 11, y + 13, 4, stroke=1, fill=0)
            c.circle(x + 24, y + 13, 4, stroke=1, fill=0)
        elif name.startswith('FOX'):
            c.line(x + 8, y + 12, x + 15, y + 19)
            c.line(x + 27, y + 12, x + 20, y + 19)
        else:
            c.rect(x + 12, y + 10, 11, 8, stroke=1, fill=0)


class LabelForm(Flowable):
    def __init__(self, width):
        super().__init__()
        self.width, self.height = width, 300

    def draw(self):
        c, w, h = self.canv, self.width, self.height
        c.setStrokeColor(g.NAVY)
        c.setLineWidth(1.2)
        c.setDash(5, 3)
        c.roundRect(0, 3, w, h - 6, 5, stroke=1, fill=0)
        c.setDash()
        c.setFillColor(g.NAVY)
        c.setFont('ArialBold', 14)
        c.drawString(17, h - 31, 'P17 / REPLACEMENT DELIVERY LABEL')
        fields = ['DISTRICT', 'DOOR NUMBER', 'DELIVERY MARK', 'RECIPIENT']
        for i, title in enumerate(fields):
            y = h - 78 - i * 54
            c.setFont('ArialBold', 11.5)
            c.drawString(18, y, title)
            c.line(174, y - 3, w - 20, y - 3)
        c.setFont('Arial', 10.5)
        c.drawString(18, 23, 'Adult cuts this outer border only after station 2 is checked.')


class MailbagBoard(Flowable):
    """Two real-size pockets: each cut mail card fits its own slot."""
    def __init__(self, width):
        super().__init__()
        self.width, self.height = width, 205

    def draw(self):
        c, w = self.canv, self.width
        c.setStrokeColor(g.NAVY)
        c.setFillColor(g.NAVY)
        slot_w = (w - 8) / 2
        for i, title in enumerate(('SLOT 1 / PRIORITY', 'SLOT 2 / ORDINARY')):
            x = i * (slot_w + 8)
            c.roundRect(x, 4, slot_w, 184, 5, stroke=1, fill=0)
            c.setFont('ArialBold', 11.8)
            c.drawString(x + 10, 166, title)
            c.setFont('Arial', 10.8)
            c.drawString(x + 10, 145, 'Place one cut mail piece here.')


def record(width):
    rows = [
        ['1 / INTAKE', 'READY: ______  REPAIR: ______  HOLD: ______  Parcel: ______'],
        ['2 / LABEL', 'Parcel: ______  District: __________  No: ___  Mark: ______'],
        ['3 / BAG', 'District/time: ______________  Slot 1: ___  Slot 2: ___'],
        ['4 / RESIDENT', 'Confirmed household: __________  Two rejected: __________'],
        ['5 / RECEIPT', 'Parcel: _____  Delivered to: __________  Signed: ___  Stamped: ___'],
    ]
    t = Table([[p(a, 'card'), p(b, 'card')] for a, b in rows],
              colWidths=[width * .26, width * .74], rowHeights=[94] * 5)
    t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), .8, g.NAVY),
                           ('INNERGRID', (0, 0), (-1, -1), .6, g.LINE),
                           ('BACKGROUND', (0, 0), (0, -1), g.PALE),
                           ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                           ('LEFTPADDING', (0, 0), (-1, -1), 10),
                           ('RIGHTPADDING', (0, 0), (-1, -1), 10)]))
    return t


def large_boxes(width, titles, height=112):
    t = Table([[p(t, 'card')] for t in titles], colWidths=[width], rowHeights=[height] * len(titles))
    t.setStyle(TableStyle([('BOX', (0, 0), (-1, -1), 1, g.NAVY),
                           ('INNERGRID', (0, 0), (-1, -1), .75, g.NAVY),
                           ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
                           ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                           ('LEFTPADDING', (0, 0), (-1, -1), 14),
                           ('TOPPADDING', (0, 0), (-1, -1), 12)]))
    return t


def mission_page(i, width):
    m = MISSIONS[i]
    flow = head(m['title'], f'CHECKPOINT {i + 1} / STORY AND ACTIONS / KEEP WHOLE')
    flow += [panel('NORI\'S STORY / READ ALOUD', [m['story']], width, 'body'),
             Spacer(1, 11), p('PUT ON THE TABLE', 'body'), p(m['props']),
             p('DO THIS TOGETHER', 'body')]
    flow += steps(m['steps'])
    if i == 3:
        flow += [Spacer(1, 8), panel('INTERVIEW NOTES / RECORD THE SPOKEN ANSWERS', [
            'Owl House: type ______  ID ______  seal ______',
            'Fox Den: type ______  ID ______  seal ______',
            'Beaver Hut: type ______  ID ______  seal ______'], width, 'note'), Spacer(1, 5),
                 p('STOP: Show the completed interview notes and folded cards to the adult before the next station.', 'note')]
    else:
        flow += [Spacer(1, 5), panel('STOP AND SHOW THE ADULT',
                                   ['Point to your finished work. The adult checks it, then releases the next numbered station.'], width)]
    return flow


def player(s, width):
    pages = []
    pages.append(head('The Forest Post Office Mystery', 'PLAYER / FOREST HOME / START HERE') + [
        p('A rainy morning has scrambled the post. Help Nori, the young deer, repair a parcel and complete a careful paper delivery.'),
        Image(str(g.ROOT / s['cover']), width=320, height=225, kind='proportional'),
        Spacer(1, 12), panel('FIVE POST OFFICE STATIONS',
            ['1 Sort six mail pieces. 2 Repair the parcel label. 3 Load the morning mailbag. 4 Interview neighbours. 5 Deliver and sign.',
             '2-6 children play as one team. For 7-12, print two full Player Packs and make two teams. An adult prepares the pieces and releases one station at a time.'], width, 'body'),
        Spacer(1, 12), p('You need pencils and an eraser. An adult may handle scissors. Use fictional names and addresses only.')])
    pages.append(head('Your post office team', 'PAGE 2 / CUT FOUR JOB CARDS') + [
        p('The adult assigns jobs and rotates them after every station. For 2-3, combine jobs; for 5-6, pair at one or two jobs. Every player moves a piece, asks a question or explains a check.'),
        CutCards(width, [
            ('INTAKE CLERK', 'Checks the rules', 'Sort mail and read the printed rule aloud.'),
            ('LABEL REPAIRER', 'Writes the results', 'Arrange label pieces and keep the work record.'),
            ('COURIER', 'Moves the mail', 'Load the bag, ask questions, carry the parcel.'),
            ('CHECKER', 'Shows the evidence', 'Check each result and ask the adult to accept it.'),
        ], row_height=174), p('Jobs guide participation; everyone may discuss. The adult is the host, not a player.')])
    pages.append(head('Our postal work record', 'PAGE 3 / KEEP WHOLE') + [
        p('Keep this page in the middle. Write only after the team agrees. Young players can point and speak; an adult may write their words.'),
        record(width), p('Team name (invented): ______________________    Ask for a hint, try again, then ask for another.')])
    pages.append(mission_page(0, width))
    pages.append(head('The intake sorting desk', 'CHECKPOINT 1 / PAGE 5 / KEEP WHOLE') + [
        panel('READ THE RULES IN THIS ORDER',
              ['1. A torn seal goes to HOLD, even when its address is readable.',
               '2. An intact seal with a blurred or missing address goes to REPAIR.',
               '3. An intact seal with a readable address goes to READY.'], width, 'body'),
        Spacer(1, 14), large_boxes(width, ['READY / intact seal and readable address',
                                         'REPAIR / intact seal but address blurred',
                                         'HOLD / seal torn; adult handles later'], 108),
        Spacer(1, 14), p('Place the cut mail pieces inside or beside the boxes. Do not glue them; they are used again later.')])
    pages.append(head('Six pieces of forest mail', 'CHECKPOINT 1 / PAGE 6 / CUT SIX') + [
        p('Cut each outer dashed rectangle. Address lines show clear or rain-blurred writing; a zigzag shows a torn seal. Words confirm the mail condition; P17\'s picture seal is a clue for later. Keep all six pieces.'),
        CutCards(width, MAIL, row_height=158, variant='mail')])
    pages.append(mission_page(1, width))
    pages.append(head('The wet label pieces', 'CHECKPOINT 2 / PAGE 8 / CUT FOUR') + [
        p('Cut four outer rectangles. Three clues belong to P17; one belongs to P18. Do not copy an answer from a clue: use the mail pieces as evidence.'),
        CutCards(width, FRAGMENTS, row_height=176),
        p('Match the parcel ID first, then use A and B to work out the three missing fields.')])
    pages.append(head('Carbon copy and new P17 label', 'CHECKPOINT 2 / PAGE 9 / CUT LABEL AFTER CHECK') + [
        panel('FAINT CARBON COPY / P17',
              ['District ends in TREE. Door number is even. Delivery mark is too faint to read.',
               'Use this to check your deductions, not to fill the label by copying. The household name is missing; leave RECIPIENT blank until the interview.'], width, 'body'),
        Spacer(1, 18), LabelForm(width),
        Spacer(1, 17), p('Write clearly. The adult cuts the label only after checking station 2. Keep it with P17 for the rest of the game.')])
    pages.append(mission_page(2, width))
    pages.append(head('The morning mailbag', 'CHECKPOINT 3 / PAGE 11 / KEEP WHOLE') + [
        panel('BAG RULES', ['This bag is BLUE TREE / MORNING. It has exactly two slots.',
                            'Load a PRIORITY item before an ordinary item. Keep other districts, afternoon items, HOLD items and unrepaired mail outside.'], width, 'body'),
        Spacer(1, 13), MailbagBoard(width),
        panel('PARKED AT THE DESK', ['Other district or time: ______  HOLD: ______  still in REPAIR: ______'], width, 'note'),
        Spacer(1, 14), panel('COURIER HANDOVER SLIP / WRITE BEFORE LEAVING',
              ['Bag: BLUE TREE / MORNING     Slot 1: ____     Slot 2: ____',
               'Courier initials (fictional): ________    Checker: ________'], width, 'body')])
    pages.append(mission_page(3, width))
    pages.append(head('Private neighbour interview cards', 'CHECKPOINT 4 / PAGE 13 / CUT FOUR') + [
        p('Adult cuts the three cards and folds each lower half behind its named front. Resident actors see the private back; the courier sees only the front. Adult keeps the stamp for station 5.'),
        ResidentFoldCards(width, RESIDENTS),
        p('Courier asks each resident: 1 Letter or parcel? 2 What is its ID? 3 What mark is on its seal? Record each spoken answer before choosing.')])
    pages.append(mission_page(4, width))
    pages.append(head('The delivery and signature board', 'CHECKPOINT 5 / PAGE 15 / KEEP WHOLE') + [
        panel('FINAL CHECK / POINT TO EACH SOURCE',
              ['Parcel number from piece B: ______  Repaired district/door/mark from page 9: __________________',
               'Bag order from page 11: slot 1 ____ / slot 2 ____',
               'Household confirmed in the interview: __________________'], width, 'body'),
        Spacer(1, 12), large_boxes(width, ['SHOW P17 PARCEL AND LABEL BESIDE THIS BOARD',
                                          'RECEIVED BY / fictional household: __________________',
                                          'RESIDENT SIGNATURE / draw a fictional mark: __________',
                                          'PLACE THE PAPER DELIVERED STAMP HERE'], 91),
        Spacer(1, 12), p('Show all four sources to the adult. A real name, address, letterbox or prize is never needed.')])
    pages.append(head('Nori delivers the parcel', 'PAGE 16 / ADULT HOLDS UNTIL DELIVERY ACCEPTED') + [
        panel('THE POST OFFICE REPLY',
              ['Nori reaches Owl House at Blue Tree courtyard, door 4. The neighbour recognises P17 and its acorn seal. The parcel is safely delivered.',
               '"You sorted the whole desk, repaired what the rain erased, loaded the right bag and asked before handing over," Nori says. "Every job mattered."'], width, 'body'),
        Spacer(1, 19), p('Our team delivered P17 to: __________________________'),
        p('One thing I helped with: ______________________________'),
        p('Adult acceptance mark: _______________________________'),
        p('The same story has one solution. On replay, swap jobs and try to complete the postal work with fewer hints.')])
    return pages


def guide(s, width, counts, base):
    pages = []
    pages.append(head('Run the forest post office', 'HOST / QUICK START') + [
        p('The children handle real paper mail pieces. Keep the guide and player page 16 away from them: both reveal the ending.', 'host'),
        panel('FIVE STATIONS / ONE CONTINUOUS PARCEL',
              ['1 Sort six items (player 4-6). 2 Repair P17 (7-9). 3 Load Blue Tree morning bag (10-11). 4 Interview residents (12-13). 5 Complete signed handover (14-15). Give ending page 16 only after acceptance.'], width, 'host'),
        Spacer(1, 12), p('Print player pages 1-16 once per team, single-sided, A4 OR US Letter, Actual size / 100%. Minimum: pages 2-16 if you read the cover on screen. One team: 2-6 children; 7-12 children: two complete sets and two balanced teams. Adult host is outside the player count.', 'host'),
        p('Required: printed player pack, pencils, eraser and a table. Adult-handled scissors make pieces movable. No real mail, envelopes, ink, glue, outdoor route, purchases or reward are required.', 'host'),
        p('Allow pointing and spoken answers; an adult can write dictated words. Release one station at a time, read its story, watch the action, check the actual props, then read the transition on the relevant host page.', 'host'),
        panel('FIRST-TIME HOST CHECK', [
            'Before children arrive: choose ONE paper size, print single-sided, cut 18 starting pieces, fold the three resident cards with answers on the back, and make five covered station piles.',
            'On the table: job cards, work record, pencil and only station 1. Keep all later pages, the private resident answers and this guide out of sight.',
            'After each station: compare the physical result with this guide, offer one hint if needed, read the transition, then release the next pile.'], width, 'host')])
    pages.append(head('Print, cut and stage', 'HOST / PAGE MAP AND INVENTORY') + [
        p('Print this guide or keep it on screen. Dashed outer borders mark pieces to cut. Keep solid sorting, bag and delivery boards whole.', 'host'),
        panel('PLAYER PAGE INVENTORY', [
            '1 cover; 2 four job cards; 3 work record; 4 mission 1; 5 sorting desk; 6 six mail pieces.',
            '7 mission 2; 8 four label pieces; 9 carbon copy plus one replacement label.',
            '10 mission 3; 11 morning bag/handover slip; 12 mission 4; 13 three resident cards and one stamp token.',
            '14 mission 5; 15 delivery/signature board; 16 ending (adult holds).'], width, 'host'),
        Spacer(1, 12), p('Cut count per team: 19 = 4 jobs + 6 mail + 4 label pieces + 1 replacement label + 3 residents + 1 stamp. Cut 18 before play; cut the replacement label after station 2 is checked. Keep pieces A-F through the whole game.', 'host'),
        p('Make five piles: 4-6, 7-9, 10-11, 12-13, 14-15. Cut and fold three private resident cards on page 13: lower answer half goes behind the named front. Put page 16 and the DELIVERED stamp with the guide. Start with jobs page 2 and record page 3.', 'host'),
        panel('TABLE LAYOUT / BEFORE EACH STATION', [
            'LEFT: the current station sheet and its board. CENTRE: movable mail or clues. RIGHT: whole work record and a pencil. HOST ONLY: future piles, answers and ending.',
            'Cut only dashed OUTER borders. Keep the sorting desk, bag, carbon copy, record and delivery board whole. Cut the replacement label after station 2 is accepted.'], width, 'host')])
    pages.append(head('Give every child a job', 'HOST / GROUP SETUP') + [
        panel('ROLE ASSIGNMENTS', [
            '2 players: child A Intake Clerk + Courier; child B Label Repairer + Checker. Exchange both bundles after each station.',
            '3 players: one Intake Clerk, one Courier, one Label Repairer + Checker. Rotate the combined bundles after each station.',
            '4 players: one card each; pass cards clockwise after stations 1-4.',
            '5 players: make five seats in this order: Intake, Label, Courier A, Courier B, Checker. Two Couriers share one card. Move every child one seat forward after each station.',
            '6 players: use six seats: Intake A, Intake B, Label, Courier A, Courier B, Checker. Paired children share one card. Move every child one seat forward after each station.',
            '7-12 players: two teams with one full pack per team. Divide as 3+4, 4+4, 4+5, 5+5, 5+6 or 6+6. Check each team separately.'], width, 'host'),
        Spacer(1, 12), p('At station 4, choose one child as Courier; three other actors each hold one folded card with private answers facing them. With 2 players, the adult acts for two residents; with 3, the adult acts for one. The remaining children check and record. Resume the seat rotation after this station.', 'host'),
        p('Opening to read: "A storm scattered the forest mail. Nori needs a team to sort the desk, repair one parcel and deliver it carefully. Work together and show me each finished station before the next one opens."', 'host')])
    titles = ['Accept the sorted desk', 'Check the repaired label', 'Release the morning bag',
              'Confirm the right neighbour', 'Witness the signed delivery']
    checks = [
        'READY A and D; REPAIR B and F; HOLD C and E. Torn seal takes priority over address condition. P17 is piece B with intact acorn seal. Require all six placements, not just B.',
        'Use only the three P17 clues; park P18/MOSS LANE. Letter A at BLUE TREE 3 gives district and next door 4. P17 piece B has the intact acorn picture seal. Carbon copy confirms TREE and an even door, but does not print the solution. The new label is BLUE TREE / 4 / ACORN; RECIPIENT stays blank.',
        'The bag is BLUE TREE / MORNING. Repaired priority B/P17 goes in slot 1; ordinary A in slot 2. D is POND/AFTERNOON and stays at the desk; C and E stay HOLD; F still needs repair.',
        'Accept only after the courier asks all three folded-card actors. All share Blue Tree courtyard 4. OWL HOUSE expects parcel P17/acorn; FOX DEN expects letter L06/moon; BEAVER HUT expects parcel P18/pine. Interview notes must record all three answers before choosing OWL HOUSE. Fill label recipient; do not show private card backs to the courier before questions.',
        'Require parcel B/P17, repaired label BLUE TREE / 4 / ACORN / OWL HOUSE, bag order B then A, and Owl House resident confirmation. Board has fictional household, drawn signature and paper DELIVERED stamp. Then release page 16.',
    ]
    transitions = [
        '"You cleared the desk. The P17 parcel has an intact seal, so we may repair its blurred label. Nori finds a carbon copy under the counter." Give player pages 7-9.',
        '"Blue Tree, door 4, acorn mark: the parcel can travel again. The morning courier bell is ringing. Which mail belongs in Nori\'s bag?" Give pages 10-11.',
        '"The bag is ready with priority P17 first. At the shared Blue Tree doorstep, three neighbours answer the door. We must ask before handing over." Give pages 12-13.',
        '"Owl House confirms the P17 acorn parcel. Nori still needs a signed handover, so the post office can prove the delivery." Give pages 14-15.',
        '"The parcel, label, bag slip and neighbour all agree. The fictional signature and stamp finish the delivery." Give player page 16 and invite each child to name one contribution.',
    ]
    hints = [
        ('Which condition should you check first?', 'A torn seal always goes to HOLD.', 'A,D ready; B,F repair; C,E hold.'),
        ('Park the clue for the wrong parcel ID.', 'Letter A supplies the district and a number to add one to; B supplies the picture mark.', 'BLUE TREE / 4 / ACORN; leave recipient blank.'),
        ('Read the district and time on the bag.', 'Only repaired/ready Blue Tree morning mail fits. Priority goes first.', 'B then A; park D,C,E,F.'),
        ('Keep the answers turned away; ask all three actors.', 'Compare item type, parcel ID and picture seal, not the shared doorstep.', 'OWL HOUSE confirms P17 and the acorn seal.'),
        ('Use one source for each final field.', 'Confirm bag order and resident answer before signature.', 'P17 to OWL HOUSE; sign and stamp.'),
    ]
    for i, m in enumerate(MISSIONS):
        pages.append(head(titles[i], f'HOST / CHECKPOINT {i + 1} / PLAYER {[(4,6),(7,9),(10,11),(12,13),(14,15)][i][0]}-{[(4,6),(7,9),(10,11),(12,13),(14,15)][i][1]}') + [
            p('Set out: ' + m['props'], 'host'),
            panel('READ THE PLAYER STORY', [f'Read the scene on player page {[4, 7, 10, 12, 14][i]} aloud. Keep the next station covered until this one is accepted.'], width, 'host'),
            Spacer(1, 10), p('Lead these exact actions', 'host'),
            *steps(m['steps'], 'host'),
            panel('ACCEPT ONLY AFTER CHECKING', [checks[i]], width, 'host'),
            Spacer(1, 9), p('If wrong: show the first failed rule or source, invite a correction, then ask to see the physical result again. Read the next scene only after acceptance.', 'host'),
            panel('READ ALOUD AFTER ACCEPTANCE', [transitions[i]], width, 'host'),
        ])
    hint_width = (width - 16) / 2
    def hint_panel(i):
        return panel(f'STATION {i + 1}', [f'1 / {hints[i][0]}', f'2 / {hints[i][1]}',
                                         f'3 / {hints[i][2]}'], hint_width, 'host')
    hint_columns = Table([[[hint_panel(i) for i in (0, 1, 2)], '',
                           [hint_panel(i) for i in (3, 4)]]],
                         colWidths=[hint_width, 16, hint_width])
    hint_columns.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                       ('LEFTPADDING', (0, 0), (-1, -1), 0),
                                       ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                                       ('TOPPADDING', (0, 0), (-1, -1), 0),
                                       ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    pages.append(head('Hints for all five stations', 'HOST / WHEN A TEAM IS STUCK') + [
        p('Offer one hint, let the team try, then offer the next. Hint 3 may state the result but never skips sorting, moving, interviewing or signing.', 'host'),
        hint_columns, Spacer(1, 12),
        p('Early readers may point to pictures and dictate; adults write their words. For P17\'s picture seal, describe its cap and stem without naming it until hint 3. Confident readers can explain every rejected piece or neighbour. For no-cut play, keep resident answers away from the courier and read each response privately from this guide.', 'host')])
    pages.append(head('Final check and reset', 'HOST / DELIVERY AND REPLAY') + [
        panel('BEFORE GIVING PLAYER PAGE 16', [checks[4]], width, 'host'),
        Spacer(1, 12), p('If a field is wrong, revisit only that source. Let the team repair it and resubmit the board; do not restart the whole game.', 'host'),
        p('Read the ending aloud, then invite each child to say, point to or show one contribution. No purchased prize is needed.', 'host'),
        p('For reuse, erase written answers and count all 19 pieces. Keep six mail pieces together, four label clues together, folded resident cards and stamp together. Reprint the blank replacement label on player page 9 if needed. The mystery has the same solution on replay.', 'host'),
        p('Black-and-white printing works: rules rely on printed words, parcel IDs and marks, never colour alone. If letters or cut borders are cropped, print at 100% on the matching A4 or Letter size. A no-cut version can point to pieces on whole pages and place them beside boards, while keeping the same sequence.', 'host')])
    return pages
