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
         props='Work record (3), sorting desk (6), six mail pieces (7).',
         steps=['<b>Intake Clerk:</b> Place all six mail pieces face up and read the rules on page 6.',
                '<b>Checker:</b> Check the seal first. Put each torn-seal item in HOLD, even if its address is readable.',
                '<b>Intake Clerk:</b> For intact seals, put readable addresses in READY and blurred addresses in REPAIR.',
                '<b>Courier:</b> Count two pieces in each tray. Find the picture-sealed P17 parcel in REPAIR.',
                '<b>Label Repairer:</b> Write the six sorting letters in progress row 1 and the parcel ID in its box. Show the adult every placement.'],
         result='Six pieces sorted: READY A,D; REPAIR B,F; HOLD C,E. Parcel B is P17.'),
    dict(title='Make the address readable', story='Nori dries P17 carefully. A faint carbon copy and four clue pieces are tucked under the counter. One piece belongs to a different parcel. "The rain took the answer from the label," Nori says. "Look back at the mail we saved."',
         props='Work record (3), P17 parcel B (7), four pieces (9), carbon copy and new label (10).',
         steps=['<b>Courier:</b> Find parcel B and read its ID: P17. Keep all mail pieces available as evidence.',
                '<b>Label Repairer:</b> Keep the three P17 clues; park the P18 clue. Match each clue to DISTRICT, DOOR NUMBER or DELIVERY MARK on page 10.',
                '<b>Intake Clerk:</b> Find letter A. Read its district and door number; work out the next door. <b>Checker:</b> Study the picture on B\'s intact seal.',
                '<b>Checker:</b> Compare your proposed district and even door with the faint carbon copy. It cannot supply the whole answer.',
                '<b>Label Repairer:</b> Write the three results ONCE on the new label. Leave RECIPIENT blank. Adult marks progress row 2 after checking.',
                '<b>Team:</b> Point to A, B and each P17 clue as evidence. Show the adult your new label; the adult cuts it after checking.'],
         result='P17 label: BLUE TREE / 4 / ACORN; recipient stays blank.'),
    dict(title='Load the morning mailbag', story='The morning courier bell rings. Several letters are ready, but the bag has only two slots. Nori checks the district and time printed on each piece. "P17 is urgent," Nori says. "Load this morning\'s Blue Tree mail in the right order; the other mail must stay at the desk."',
         props='Work record (3), mail pieces (7), repaired P17 label (10), mailbag and handover slip (12).',
         steps=['<b>Intake Clerk:</b> Take the pieces in READY. Add repaired P17; leave HOLD and still-unrepaired mail aside.',
                '<b>Checker:</b> Read the page 12 bag rule: BLUE TREE and MORNING only, two slots maximum.',
                '<b>Courier:</b> Put the eligible PRIORITY item in slot 1 and the eligible ordinary item in slot 2.',
                '<b>Label Repairer:</b> Leave mail with a different district or time outside. Write the slot letters ONCE on the handover slip. Adult marks progress row 3 after checking.',
                '<b>Checker:</b> Show the adult the loaded pieces, parked mail and completed slip.'],
         result='Blue Tree morning bag: slot 1 B/P17, slot 2 A; D stays for afternoon.'),
    dict(title='Ask before handing over', story='At Blue Tree\'s shared courtyard, rain has erased the household name on P17. Three households share courtyard door 4; the door number alone cannot identify the recipient. Three neighbours are waiting. "Keep their answers away from the courier," Nori says. "Ask each one what they expect before delivery."',
         props='Label (10), interview notes (14), three folded resident cards (15), record (3). Adult holds the stamp. Use the small-team arrangement on page 14.',
         steps=['<b>Adult:</b> Hand folded cards to actors, answers facing them. Keep the stamp for station 5.',
                '<b>Courier:</b> Ask all three questions on page 15. Do not look at card backs.',
                '<b>Residents:</b> Reply from your private card. <b>Checker:</b> Compare type, ID and seal with B/P17.',
                '<b>Label Repairer:</b> Write the confirmed household ONCE on the label. Keep the spoken answers on interview notes page 14. Adult marks progress row 4.',
                '<b>Intake Clerk:</b> Explain why the others cannot receive P17. Show the notes to the adult.'],
         result='OWL HOUSE confirms door 4, P17 and the acorn seal.'),
    dict(title='Deliver and sign', story='The correct door is open. Nori is ready to hand over the parcel, but the post office still needs a clear record. "Let us check what we repaired, what we carried and who answered," Nori says. "Then the neighbour may sign for the delivery."',
         props='P17 piece B (7), repaired label (10), loaded bag and handover slip (12), resident cards and stamp (15), interview notes (14), delivery board (17). Adult keeps the complete reply on Host page 16.',
         steps=['<b>Courier:</b> Lay parcel B/P17 and its repaired label beside the delivery board, with both IDs visible.',
                '<b>Checker:</b> Read the handover slip: P17 must be first in the Blue Tree morning bag.',
                '<b>Courier:</b> Ask the confirmed resident to repeat the parcel ID and seal mark you established from the label and original mail. <b>Label Repairer:</b> Write the household on the board.',
                '<b>Resident:</b> Draw a fictional mark in the signature box. Adult checks the original sources, then gives the paper stamp to Intake Clerk to place in its frame.',
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
        ['2 / LABEL', 'Show the repaired label (10). Adult checked: ______'],
        ['3 / BAG', 'Show the handover slip (12). Adult checked: ______'],
        ['4 / RESIDENT', 'Show interview notes (14) and completed label. Checked: ______'],
        ['5 / RECEIPT', 'Show signed/stamped board (17). Adult checked: ______'],
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
    flow += [Spacer(1, 5), panel('STOP AND SHOW THE ADULT', ['Show your original evidence. Adult checks it, marks the progress record, and then releases the next station.'], width)]
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
        p('The adult assigns jobs and rotates them after stations 1-4. For 2-3, combine jobs; for 5-6, pair at one or two jobs. Every player moves a piece, asks a question or explains a check.'),
        CutCards(width, [
            ('INTAKE CLERK', 'Checks the rules', 'Sort mail and read the printed rule aloud.'),
            ('LABEL REPAIRER', 'Writes the results', 'Arrange label pieces and keep the work record.'),
            ('COURIER', 'Moves the mail', 'Load the bag, ask questions, carry the parcel.'),
            ('CHECKER', 'Shows the evidence', 'Check each result and ask the adult to accept it.'),
        ], row_height=174), p('Jobs guide participation; everyone may discuss. The adult is the host, not a player.')])
    pages.append(head('Our postal progress record', 'PAGE 3 / KEEP WHOLE') + [
        p('Keep this page in the middle. Write only after the team agrees. Young players can point and speak; an adult may write their words.'),
        record(width), p('Team name (invented): ______________________    Ask for a hint, try again, then ask for another.')])
    pages.append(method_page(width))
    pages.append(mission_page(0, width))
    pages.append(head('The intake sorting desk', 'CHECKPOINT 1 / PAGE 6 / KEEP WHOLE') + [
        panel('READ THE RULES IN THIS ORDER',
              ['1. A torn seal goes to HOLD, even when its address is readable.',
               '2. An intact seal with a blurred or missing address goes to REPAIR.',
               '3. An intact seal with a readable address goes to READY.'], width, 'body'),
        Spacer(1, 14), large_boxes(width, ['READY / intact seal and readable address',
                                         'REPAIR / intact seal but address blurred',
                                         'HOLD / seal torn; adult handles later'], 108),
        Spacer(1, 14), p('Place the cut mail pieces inside or beside the boxes. Do not glue them; they are used again later.')])
    pages.append(head('Six pieces of forest mail', 'CHECKPOINT 1 / PAGE 7 / CUT SIX') + [
        p('Cut each outer dashed rectangle. Address lines show clear or rain-blurred writing; a zigzag shows a torn seal. Words confirm the mail condition; P17\'s picture seal is a clue for later. Keep all six pieces.'),
        CutCards(width, MAIL, row_height=158, variant='mail')])
    pages.append(mission_page(1, width))
    pages.append(head('The wet label pieces', 'CHECKPOINT 2 / PAGE 9 / CUT FOUR') + [
        p('Cut four outer rectangles. Three clues belong to P17; one belongs to P18. Do not copy an answer from a clue: use the mail pieces as evidence.'),
        CutCards(width, FRAGMENTS, row_height=176),
        p('Match the parcel ID first, then use A and B to work out the three missing fields.')])
    pages.append(head('Carbon copy and new P17 label', 'CHECKPOINT 2 / PAGE 10 / CUT LABEL AFTER CHECK') + [
        panel('FAINT CARBON COPY / P17',
              ['District ends in TREE. Door number is even. Delivery mark is too faint to read.',
               'Use this to check your deductions, not to fill the label by copying. The household name is missing; leave RECIPIENT blank until the interview.'], width, 'body'),
        Spacer(1, 18), LabelForm(width),
        Spacer(1, 17), p('Write clearly. The adult cuts the label only after checking station 2. Keep it with P17 for the rest of the game.')])
    pages.append(mission_page(2, width))
    pages.append(head('The morning mailbag', 'CHECKPOINT 3 / PAGE 12 / KEEP WHOLE') + [
        panel('BAG RULES', ['This bag is BLUE TREE / MORNING. It has exactly two slots.',
                            'Load a PRIORITY item before an ordinary item. Keep other districts, afternoon items, HOLD items and unrepaired mail outside.'], width, 'body'),
        Spacer(1, 13), MailbagBoard(width),
        panel('PARKED AT THE DESK', ['Other district or time: ______  HOLD: ______  still in REPAIR: ______'], width, 'note'),
        Spacer(1, 14), panel('COURIER HANDOVER SLIP / WRITE BEFORE LEAVING',
              ['Bag: BLUE TREE / MORNING     Slot 1: ____     Slot 2: ____',
               'Courier initials (fictional): ________    Checker: ________'], width, 'body')])
    pages.append(mission_page(3, width))
    pages.append(interview_page(width))
    pages.append(head('Private neighbour interview cards', 'CHECKPOINT 4 / PAGE 15 / CUT FOUR') + [
        p('ADULT PREPARATION ONLY: cut the three cards and fold each lower half behind its named front. Do not give this unfolded sheet to the courier. Resident actors see the private back; the courier sees only the front. Adult keeps the stamp for station 5.'),
        ResidentFoldCards(width, RESIDENTS),
        p('Courier asks each resident: 1 Letter or parcel? 2 What is its ID? 3 What mark is on its seal? Record each spoken answer before choosing.')])
    pages.append(mission_page(4, width))
    pages.append(head('The delivery and signature board', 'CHECKPOINT 5 / PAGE 17 / KEEP WHOLE') + [
        panel('FINAL CHECK / SHOW ORIGINALS, DO NOT COPY AGAIN',
              ['Show the original parcel with its ID and picture seal; show the repaired label from page 10.',
               'Show the loaded mailbag and its original handover slip from page 12.',
               'Show all three spoken responses on interview notes page 14, then point to the matching resident card.',
               'Adult: check the originals before accepting the signature and stamp.'], width, 'body'),
        Spacer(1, 12), large_boxes(width, ['SHOW P17 PARCEL AND LABEL BESIDE THIS BOARD',
                                          'RECEIVED BY / fictional household: __________________',
                                          'RESIDENT SIGNATURE / draw a fictional mark: __________',
                                          'PLACE THE PAPER DELIVERED STAMP HERE'], 80),
        Spacer(1, 12), p('Show parcel, label, loaded bag/slip and interview evidence to the adult. A real name, address, letterbox or prize is never needed.')])
    pages.append(head('Our post office keepsake', 'PAGE 18 / AFTER THE ADULT READS THE ENDING') + [
        p('Your adult keeps the complete story reply in the Host Guide. Listen only after your delivery is checked.'),
        p('One thing I moved, asked or checked: __________________________'),
        p('A source that helped us: _____________________________________'),
        p('Draw your team post office below. Do not copy private answer cards.'),
        Spacer(1, 220), p('On replay, swap jobs. The mystery has the same solution; the adult resets all written forms.')])
    return pages


def method_page(w):
    return head('How to check a clue', 'PAGE 4 / METHOD EXAMPLES / NOT THE MYSTERY ANSWERS') + [
        panel('PRACTISE WITH A DIFFERENT PARCEL', [
            'Example parcel Q42: a note says the same district as a saved letter, and one door after it.',
            'The practice letter says SUNNY PARK / door 8. Read the district, then add one: door 9. Check each field against its own source.',
            'These practice names, numbers and ID are not answers to the forest mystery.'],w,'body'),
        Spacer(1,12),panel('KEEP EACH DISCOVERY ON ITS ORIGINAL FORM',[
            'Write the repaired address on the label; write loading order on the bag slip; record spoken answers on the interview sheet.',
            'The progress record only tracks acceptance. At the finish, point to the original forms instead of copying every answer again.'],w,'body'),
        Spacer(1,12),panel('POINTING AND SPOKEN ANSWERS COUNT',[
            'You may point to a matching picture or describe it instead of spelling its name. A partner or adult may write exactly what you say.',
            'Ask for one hint, try again, then ask for another. Your adult checks the actual pieces before giving the next station.'],w,'body')]


def interview_page(w):
    return head('Ask all three neighbours', 'PAGE 14 / QUESTIONS AND SPOKEN ANSWERS / KEEP WHOLE') + [
        panel('WHO PLAYS THE NEIGHBOURS?',[
            'Choose ONE child as Courier. With 2 children, the other child acts for one neighbour and the adult acts for two. With 3 children, two act for one neighbour each and the adult acts for the third.',
            'With 4-6 children, three children act for one neighbour each. Extra children check or record. A partner or adult records while the Courier asks.',
            'This temporarily replaces the four normal jobs. Actors keep answer halves facing themselves. Resume the usual job rotation after this station.'],w,'note'),
        panel('ASK EVERY NEIGHBOUR THESE THREE QUESTIONS',[
            '1. Are you expecting a letter or a parcel? 2. What is its ID? 3. What mark is on its seal?',
            'All three households share courtyard door 4. The address gets you to the courtyard; type, ID and seal identify the correct household. Do not choose by the door number alone.'],w,'note'),
        Spacer(1,10),large_boxes(w,[
            'OWL HOUSE: type ______  ID ______  seal ______',
            'FOX DEN: type ______  ID ______  seal ______',
            'BEAVER HUT: type ______  ID ______  seal ______'],80),
        p('Listen to all three, then compare each response with the actual parcel and repaired label. Fill RECIPIENT on the label only after checking. Pointing or dictated notes are welcome.','note')]


CHECKS=[
 'READY A,D; REPAIR B,F; HOLD C,E. The torn seal takes priority over the address. B is P17. Require all six placements.',
 'Only the three P17 clues apply. A supplies BLUE TREE and door 3; adding one gives 4. B supplies its acorn picture seal. The carbon confirms TREE and an even number. Label: BLUE TREE / 4 / ACORN, RECIPIENT blank. Accept pointing, a correct drawing or a correct description of the acorn; vocabulary and spelling are not extra puzzles.',
 'Ready/repaired BLUE TREE MORNING only: priority B/P17 in slot 1, ordinary A in slot 2. D is POND/AFTERNOON; C,E remain HOLD; F still needs repair. Inspect original pieces in the two slots and the one completed slip.',
 'After all three interviews: OWL HOUSE expects parcel / P17 / acorn; FOX DEN letter / L06 / moon; BEAVER HUT parcel / P18 / pine. All share Blue Tree courtyard door 4. Notes contain all three responses. Only then put OWL HOUSE on the original label.',
 'Require original B/P17, label BLUE TREE / 4 / ACORN / OWL HOUSE, bag and original slip B then A, and all three interview responses. A resident confirms the solved ID and mark. Board names the fictional receiving household and has a drawn signature. Supply the stamp only after these checks; inspect the stamped board, mark progress row 5, then read Host page 16.'
]


def guide(s,w,counts=None,base=None):
    pages=[]
    def sheet(title,lines):return head(title,'HOST / PRIVATE / KEEP SEPARATE')+[p(t,'host') for t in lines]
    pages.append(sheet('Run the forest post office',[
        '18 Player pages, 17 Host pages. Adult host is outside the 2-6 player count. For 7-12 players, prepare two complete independent Player sets and balance the teams.',
        'Read this guide first. Keep all later station piles covered. Keep the complete story ending on Host page 16 private. Player page 18 is a blank keepsake, not an answer page.',
        'Prepare paper, pencils, eraser and adult-handled scissors. No real addresses, mail, envelopes, ink, glue, outdoor trip or purchased prize are needed.',
        'Read the current scene, let players act, check the actual originals, offer one hint if needed, then mark progress and release the next pile.',
        'Players may point, describe or dictate. Accept sound reasoning and correct visual matching; spelling and handwriting are not extra pass conditions.']))
    pages.append(sheet('Print, cut and stage',[
        'Choose A4 OR US Letter. Print single-sided at Actual size / 100%; never mix paper sizes or separately scale cards and boards.',
        'Player map: 1 cover; 2 jobs; 3 progress; 4 neutral method examples; 5-7 station 1; 8-10 station 2; 11-12 station 3; 13-15 station 4; 16-17 station 5; 18 optional keepsake after the ending.',
        'One team: 18 Player sheets. Two teams: 36. If printing this Host Guide once, add 17: total 35 or 53 sheets. Host may read on screen. Printing without cover/keepsake uses Player pages 2-17: 16 sheets per team.',
        '19 cut pieces/team = 4 jobs + 6 mail + 4 clues + 1 replacement label + 3 folded resident cards + 1 stamp. Cut 18 before play; cut the label only after station 2 acceptance. Optional low-cut: leave the four jobs on their whole page, giving 15 cut pieces.',
        'Adult pre-cuts/folds Player page 15: answer halves fold behind the named fronts. Never hand its unfolded sheet to the Courier. Keep these three props until station 4, and keep the stamp until final checking.',
        'Start with Player pages 1-4 and only pile5-7. Keep boards, notes, bag/slip and carbon copy whole. Retain all six mail pieces. Release later piles8-10,11-12,13-15,16-17 only after acceptance.']))
    pages.append(sheet('Rotate the four postal jobs',[
        '2 players: Intake Clerk + Courier; Label Repairer + Checker. Swap both bundles after stations1-4.',
        '3 players: Intake Clerk; Courier; Label Repairer + Checker. Rotate the three bundles after stations1-4.',
        '4 players: one job each, pass clockwise after stations1-4.',
        '5 seats: Intake, Label, Courier A, Courier B, Checker. 6 seats: Intake A, Intake B, Label, Courier A, Courier B, Checker. Paired children share the card and swap the active and checking tasks within each station. Move every child one seat forward after stations1-4.',
        'For the interview, use the special arrangement on Host page 4 and Player page 14, then resume rotation. Children may discuss and help each other; no one is eliminated.']))
    pages.append(sheet('Cast the three private neighbour roles',[
        'Choose one child as Courier. 2 children: the other child plays one neighbour, the adult plays two. 3 children: two play one neighbour each, adult plays the third. 4-6 children: three act, any extras check/record. An adult may record for the Courier.',
        'Hand each actor only their folded card, front towards the Courier and private back towards the actor. An adult playing multiple neighbours uses one card at a time and identifies the household before answering.',
        'Courier asks every neighbour: letter or parcel? ID? Seal mark? Actor gives only the fact asked for. Record all three responses before choosing. The shared courtyard address is deliberate; it cannot identify a household.',
        'In no-cut mode, do not show Player page 15 to the Courier. The adult privately uses the three fact sets on Host page 12 and answers in turn, using named fronts or spoken names. Children ask, compare and explain; no hidden-card reading is required.',
        'At final handover, the confirmed actor may repeat their own ID and seal, then draw a fictional signature. The adult still independently checks the original evidence.']))
    starts=[5,8,11,13,16];ranges=['5-7','8-10','11-12','13-15','16-17']
    transitions=[
        'The desk is checked. Nori can now repair the parcel. Release Player pages 8-10.',
        'The label is readable; the household remains unknown. The morning courier bell rings. Release Player pages 11-12.',
        'The bag is ready. Three households share the courtyard. Ask before handing over. Release Player pages 13-15 using private prepared cards.',
        'The household is confirmed. Nori needs a witnessed handover. Release Player pages 16-17.',
        'The signed and stamped delivery agrees with the originals. Read the private ending on Host page 16, then give Player page 18 if wanted.'
    ]
    for i,m in enumerate(MISSIONS):
        pages.append(head('Station '+str(i+1)+' / Lead the actions','HOST / PLAYER '+ranges[i])+[
            p('Prepare: '+m['props'],'host'),panel('READ ALOUD',[m['story']],w,'host'),
            p('Read Player'+str(starts[i])+' with the team. Use these actions; do not read the private checking page aloud.','host'),*steps(m['steps'],'host')])
        pages.append(head('Station '+str(i+1)+' / Private acceptance','HOST / CHECK ORIGINAL EVIDENCE')+[
            panel('ACCEPT ONLY AFTER CHECKING',[CHECKS[i]],w,'host'),Spacer(1,12),
            p('If wrong, point to the first failed rule or source. Let the team correct and show it again; do not restart the game. Keep correct work.','host'),
            p('Mark the matching progress row only after acceptance. Each discovery remains on its original label, slip or notes.','host'),
            panel('READ AFTER ACCEPTANCE',[transitions[i]],w,'host')])
    pages.append(sheet('Graduated hints / one at a time',[
        '1: Which condition comes first? Then: torn seal means HOLD. Strong: A,D READY; B,F REPAIR; C,E HOLD.',
        '2: Match the parcel ID. Then: A gives district and a number to add one to, B gives the picture. Strong: BLUE TREE / 4 / ACORN; recipient stays blank.',
        '3: Check district AND time. Then: ready/repaired only, priority first. Strong: B then A; leave D,C,E,F.',
        '4: Ask all three actors. Then: compare type, ID AND seal; the doorstep is shared. Strong: OWL HOUSE expects P17 parcel with acorn.',
        '5: Show originals rather than copying. Then: match parcel, label, loading order and spoken resident evidence. Strong: use the private checklist on Host page 14.',
        'Allow a correction after every hint. The strongest hint may state a result, but does not skip sorting, moving, asking, or checking.']))
    pages.append(head('Nori delivers the parcel','HOST PAGE 16 / PRIVATE ENDING / READ ONLY AFTER ACCEPTANCE')+[
        panel('READ ALOUD AFTER THE SIGNED, STAMPED BOARD IS CHECKED',[
            'Nori reaches Owl House at Blue Tree courtyard, door 4. The neighbour recognises P17 and its acorn seal. The parcel is safely delivered.',
            '"You sorted the whole desk, repaired what the rain erased, loaded the right bag and asked before handing over," Nori says. "Every job mattered."'],w,'body'),
        p('Invite each child to say, point to or show one contribution. Give the blank Player page 18 keepsake if wanted; no reward purchase is required.','host')])
    pages.append(sheet('No-cut play, reset and pause',[
        'No-cut mode: keep mail and clue sheets whole. Point to an item, say its chosen tray or bag slot, and use an adult pencil note beside the item if helpful. Record only the two item letters on the original bag slip. Erase a changed placement before marking its replacement; never count an item in two places.',
        'Keep the label within its original page; show it beside the bag and delivery board. For resident privacy follow Host page 4, using Host page 12 privately. Draw or point to the stamp box if not cutting the stamp. These substitute actions keep the same reasoning and acceptance checks.',
        'Pause after any accepted station. Keep original pieces and forms together, with later piles and actor answers hidden. Resume at the next unreleased station.',
        'Reset: erase progress, label, slip, interview notes, signature and keepsake; count 19 pieces (15 in low-cut mode); fold three actor cards; return stamp to adult. Reprint blank forms if needed. Do not erase printed evidence on mail.',
        'Black-and-white works: words, IDs and line drawings carry the clues; colour is not a required rule. The mystery has one fixed solution. Replay by changing jobs and using fewer hints.']))
    assert len(pages)==17
    return pages
