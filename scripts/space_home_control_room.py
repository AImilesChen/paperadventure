"""Space Home: a five-mission, paper-only communications control room.

The fixed puzzle, prop inventory and host answer key are shared by A4 and Letter.
No stage asks the crew to select a final candidate card or travel a map route.
"""
from math import cos, pi, sin

from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Flowable, Image, Paragraph, Spacer, Table, TableStyle

import generate_celebration_samples as g


BODY = ParagraphStyle('space-control-body', fontName='Arial', fontSize=13.1,
                      leading=18.4, textColor=g.NAVY, spaceAfter=8)
NOTE = ParagraphStyle('space-control-note', parent=BODY, fontSize=11.5,
                      leading=15.7, spaceAfter=6)
HOST = ParagraphStyle('space-control-host', parent=BODY, fontSize=12.1,
                      leading=16.5, spaceAfter=7)
CARD = ParagraphStyle('space-control-card', parent=BODY, fontSize=11.8,
                      leading=16.2, spaceAfter=5)

# The received icon order is intentionally different from the fixed key order.
# Even the correct strip cannot be read straight across to see the answer.
KEY_SYMBOLS = ['SUN', 'MOON', 'STAR', 'PATH', 'RING']
MESSAGE_SYMBOLS = ['STAR', 'RING', 'SUN', 'PATH', 'MOON']
CODE_ROWS = [
    ('1', ['C', '1', 'A', 'L', 'M']),
    ('2', ['P', '2', 'R', 'O', 'B']),
    ('3', ['N', '3', 'S', 'D', 'E']),
]


def p(value, kind='body'):
    return Paragraph(value, {'body': BODY, 'note': NOTE, 'host': HOST,
                             'card': CARD}[kind])


def heading(title, tag):
    return [g.p(tag, 'eyebrow'), g.p(title, 'title'), Spacer(1, 5)]


def steps(lines, kind='body'):
    return [p(f'<b>{n}.</b> {line}', kind) for n, line in enumerate(lines, 1)]


def panel(text, width, kind='note'):
    table = Table([[p(text, kind)]], colWidths=[width])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('BOX', (0, 0), (-1, -1), .8, g.LINE),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    return table


def cut_cards(items, width, row_height=112):
    rows = []
    for index in range(0, len(items), 2):
        row = []
        for title, body in items[index:index + 2]:
            row.append([p(title, 'card'), Spacer(1, 5), p(body, 'card')])
        if len(row) == 1:
            row.append([p('UNCUT SPACE', 'card')])
        rows.append(row)
    table = Table(rows, colWidths=[width / 2] * 2,
                  rowHeights=[row_height] * len(rows))
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
    ]))
    for i in range(len(items)):
        table.setStyle(TableStyle([('BOX', (i % 2, i // 2), (i % 2, i // 2),
                                    1, g.NAVY)]))
    return table


def host_check(rows, width, row_height=52):
    """A large at-table checklist that a host can scan during play."""
    table = Table([[p(value, 'host')] for value in rows],
                  colWidths=[width], rowHeights=[row_height] * len(rows))
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('BOX', (0, 0), (-1, -1), .8, g.NAVY),
        ('INNERGRID', (0, 0), (-1, -1), .6, g.LINE),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 13),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    return table


class Board(Flowable):
    """Large, labelled paper equipment; all cut lines are outer rectangles."""
    def __init__(self, width, kind, height):
        super().__init__()
        self.width, self.height, self.kind = width, height, kind

    def draw(self):
        c, w, h = self.canv, self.width, self.height
        c.setStrokeColor(g.NAVY)
        c.setFillColor(g.NAVY)

        def label(x, y, value, size=11, bold=True):
            c.setFillColor(g.NAVY)
            c.setFont('ArialBold' if bold else 'Arial', size)
            c.drawString(x, y, value)

        def rect(x, y, rw, rh, title='', dashed=False):
            c.setDash(5, 3) if dashed else c.setDash()
            c.roundRect(x, y, rw, rh, 5, fill=0, stroke=1)
            c.setDash()
            if title:
                label(x + 9, y + rh - 19, title)

        if self.kind == 'record':
            rows = [
                ('1 / WAVE STRIPS', 'Order: ______  Band: ______  Wave count: ______'),
                ('2 / RECEIVE POWER', 'Device 1: ______  Device 2: ______  Device 3: ______  Total: ___ / 6'),
                ('3 / CALIBRATION', 'Band: ______  Phase: ______  Badge: __________'),
                ('4 / PIP MESSAGE', 'Decoded instruction: __________________________'),
                ('5 / SEND POWER', 'Device 1: ______  Device 2: ______  Device 3: ______  Pulses: ___'),
            ]
            rh = (h - 10) / 5
            for i, (title, detail) in enumerate(rows):
                y = h - (i + 1) * rh
                rect(0, y + 4, w, rh - 9, title)
                label(12, y + 24, detail, 10.5, False)
        elif self.kind.startswith('mission'):
            number = int(self.kind[-1])
            names = [
                ('SIGNAL WORKBENCH', ['1 / First IN: HIGH', '2 / Two matching joins', '3 / Final OUT: HIGH']),
                ('POWER CHECK BEFORE HANDOVER', ['Job 1 device: ______  cells: ___', 'Job 2 device: ______  cells: ___', 'Job 3 device: ______  cells: ___']),
                ('SHARE THE THREE PRIVATE FACTS', ['Commander / BAND: __________', 'Engineer / PHASE: __________', 'Verifier / BADGE: __________']),
                ('DECODE IN RECEIVED ICON ORDER', ['Icon 1 ____    Icon 2 ____    Icon 3 ____', 'Icon 4 ____    Icon 5 ____', 'Whole instruction: __________________']),
                ('PRE-FLIGHT SEND CHECK', ['RECEIVER and DECODER are empty:  YES / RECHECK',
                                           'All six cells power the three SEND jobs:  YES / RECHECK',
                                           'Pulse count matches Pip\'s instruction:  YES / RECHECK']),
            ]
            title, rows = names[number]
            label(0, h - 20, title, 12)
            row_h = (h - 41) / 3
            for i, row in enumerate(rows):
                y = h - 38 - (i + 1) * row_h
                rect(0, y, w, row_h - 5, row)
                if number in (0, 2):
                    c.line(w * .58, y + 13, w - 14, y + 13)
        elif self.kind == 'waves':
            label(0, h - 20, 'RECEIVER BOARD / KEEP WHOLE / START HIGH, END HIGH', 12)
            bw = (w - 32) / 3
            for i in range(3):
                rect(i * (bw + 16), h - 194, bw, 145, f'SLOT {i + 1}')
                if i < 2:
                    label((i + 1) * bw + i * 16 + 3, h - 125, '>', 16)
            label(7, h - 212, 'START: HIGH', 11)
            label(w - 100, h - 212, 'END: HIGH', 11)
            label(0, h - 251, 'CUT THREE OUTER RECTANGLES. LAY THEM LEFT TO RIGHT:', 11)
            data = [('K', 'MID', 'HIGH', 'D'), ('R', 'HIGH', 'LOW', 'M'),
                    ('T', 'LOW', 'MID', 'I')]
            for i, (name, left, right, letter) in enumerate(data):
                x = i * (bw + 16) + 6
                strip_w = bw - 12  # 12 pt total clearance inside its slot.
                rect(x, 39, strip_w, 135, f'WAVE {name} / CUT', True)
                label(x + 9, 139, 'IN: ' + left, 11)
                label(x + 9, 119, 'OUT: ' + right, 11)
                label(x + 9, 95, 'BAND LETTER: ' + letter, 10.5)
                mid = x + strip_w / 2
                for j in range(3):
                    yy = 59 + j * 12
                    path = c.beginPath()
                    path.moveTo(mid - 30, yy)
                    path.curveTo(mid - 15, yy + 9, mid - 6, yy - 9, mid + 4, yy)
                    path.curveTo(mid + 14, yy + 9, mid + 21, yy - 9, mid + 30, yy)
                    c.drawPath(path)
            label(0, 12, 'Join OUT to the next IN. Read band letters in final order.', 10, False)
        elif self.kind == 'power':
            label(0, h - 22, 'CONTROL CENTRE POWER / KEEP WHOLE', 12)
            label(0, h - 45, 'Six paper cells only. Receive and send cannot run together.', 11, False)
            fields = [('RECEIVER', 2), ('DECODER', 2), ('SHIELD', 2),
                      ('TRANSMITTER', 3), ('TIMER', 1)]
            for i, (name, cost) in enumerate(fields):
                y = h - 125 - i * 64
                rect(0, y, w, 64, name + f' / NEEDS {cost}')
                for j in range(cost):
                    rect(w - 90 - j * 87, y + 2, 82, 60)
            label(0, 140, 'CUT THE SIX LARGE CELLS BELOW; KEEP THIS BOARD WHOLE.', 11)
            cw, ch = 72, 56
            cell_left = (w - (3 * cw + 2 * 14)) / 2
            for i in range(6):
                x = cell_left + (i % 3) * (cw + 14)
                y = 74 if i < 3 else 8
                rect(x, y, cw, ch, f'CELL {i + 1}', True)
                label(x + 10, y + 11, '1 UNIT', 11)
        elif self.kind == 'calibration':
            label(0, h - 20, 'RECEIVE SIGNAL SETTINGS / KEEP WHOLE', 12)
            fields = [('<BAND>', ['LOW', 'MID', 'HIGH']),
                      ('<PHASE>', ['1', '2', '3']),
                      ('<BADGE>', ['CIRCLE', 'TRIANGLE', 'STAR'])]
            for col, (name, values) in enumerate(fields):
                x = col * (w / 3)
                label(x + 4, h - 53, name, 11)
                for i, value in enumerate(values):
                    rect(x + 3, h - 112 - i * 48, w / 3 - 11, 40, value)
            label(0, h - 287, 'Circle ONE setting per column after all three clues are read.', 11)
            label(0, h - 310, 'Read the code: BAND / PHASE / BADGE.', 11)
        elif self.kind == 'crew_clues':
            card_w = (w - 24) / 3
            titles = ['COMMANDER / BAND / CUT', 'ENGINEER / PHASE / CUT',
                      'VERIFIER / BADGE / CUT']
            lines = [
                ['Use band letters from', 'your wave-strip order.'],
                ['Count wave marks on', 'one completed strip.'],
                ['Match this three-sided', 'antenna badge below.'],
            ]
            for i, title in enumerate(titles):
                x = i * (card_w + 12)
                rect(x, 0, card_w, h - 6, title, True)
                for j, line in enumerate(lines[i]):
                    label(x + 9, h - 50 - j * 18, line, 11, False)
                if i == 2:
                    path = c.beginPath()
                    path.moveTo(x + card_w / 2, 20)
                    path.lineTo(x + card_w / 2 - 23, 61)
                    path.lineTo(x + card_w / 2 + 23, 61)
                    path.close()
                    c.setLineWidth(2.2)
                    c.drawPath(path)
        elif self.kind == 'decoder':
            def glyph(x, y, name):
                c.setLineWidth(2)
                if name == 'SUN':
                    c.circle(x, y, 10, fill=0, stroke=1)
                    for j in range(8):
                        a = j * pi / 4
                        c.line(x + 14*cos(a), y + 14*sin(a),
                               x + 21*cos(a), y + 21*sin(a))
                elif name == 'MOON':
                    c.arc(x-12, y-13, x+12, y+13, 65, 250)
                    c.arc(x-2, y-13, x+18, y+13, 95, 190)
                elif name == 'STAR':
                    points = []
                    for j in range(10):
                        a = pi/2 + j*pi/5
                        radius = 22 if j % 2 == 0 else 9
                        points.append((x + radius*cos(a), y + radius*sin(a)))
                    path = c.beginPath()
                    path.moveTo(*points[0])
                    for point in points[1:]:
                        path.lineTo(*point)
                    path.close()
                    c.drawPath(path)
                elif name == 'PATH':
                    path = c.beginPath()
                    path.moveTo(x-19, y-15)
                    path.curveTo(x+12, y-13, x-14, y+12, x+19, y+16)
                    c.drawPath(path)
                    c.circle(x-19, y-15, 2, fill=1, stroke=0)
                    c.circle(x+19, y+16, 2, fill=1, stroke=0)
                else:
                    c.ellipse(x-22, y-10, x+22, y+10, fill=0, stroke=1)
                    c.circle(x, y, 5, fill=0, stroke=1)

            cw = w / 5
            label(0, h - 18, 'PIP MESSAGE / KEEP WHOLE / READ IN THIS ORDER', 12)
            for i, name in enumerate(MESSAGE_SYMBOLS):
                x = i * cw + 3
                rect(x, h - 137, cw - 8, 95)
                glyph(x + (cw - 8)/2, h - 82, name)
                label(x + 9, h - 121, name, 11)
                label(x + 9, h - 153, 'Answer: ____', 11, False)
            label(0, h - 192, 'FIXED SYMBOL KEY / compare each message icon to this row', 11)
            for i, name in enumerate(KEY_SYMBOLS):
                x = i * cw + 3
                rect(x, h - 264, cw - 8, 63)
                glyph(x + (cw - 8)/2, h - 231, name)
                label(x + 8, h - 257, name, 11)
            label(0, h - 290, 'Cut only the strip matching your PHASE. Keep the icon key whole.', 11)
            for row, (code, values) in enumerate(CODE_ROWS):
                y = h - 376 - row * 76
                rect(0, y, w, 68, f'CODE {code} / CUT ENTIRE STRIP', True)
                for i, value in enumerate(values):
                    label(i * cw + cw / 2 - 7, y + 14, value, 16)
        elif self.kind == 'transmission':
            rect(0, 108, w, h - 111, 'OUTGOING PAPER TRANSMISSION / KEEP WHOLE')
            fields = ['TO: PIP', 'BAND / PHASE / BADGE:',
                      'DECODED INSTRUCTION:', 'SEND DEVICES / CELL COUNTS:']
            for i, value in enumerate(fields):
                y = h - 75 - i * 51
                label(14, y, value, 11)
                if i in (1, 2, 3):
                    c.line(14, y - 15, w - 16, y - 15)
            label(14, 195, 'PULSE SLOTS / use decoded count; fill from slot 1', 11)
            slot_w = (w - 70) / 5
            for i in range(5):
                x = 15 + i * (slot_w + 10)
                rect(x, 126, slot_w, 55, str(i + 1))
                rect(x + 5, 24, slot_w - 10, 50, f'PULSE {i + 1}', True)
                label(x + 16, 35, 'SEND', 11)
        elif self.kind == 'response':
            rect(0, 0, w, h, 'PIP RESPONSE / ADULT RELEASES AFTER CHECK')
            lines = [
                'To my control crew:',
                'Your three pulses reached me. I heard the MID band and',
                'your carefully checked message. My signal is clear again.',
                'Thank you for keeping the shield on while you sent it.',
                'Pip / Robot Probe',
            ]
            for i, line in enumerate(lines):
                label(18, h - 64 - i * 38, line, 12, i in (0, 4))
            rect(18, 22, w - 36, 220, 'DRAW YOUR CONTROL CENTRE / OPTIONAL')


JOBS = ['Commander', 'Engineer', 'Communicator', 'Verifier']
STORIES = [
    'A faint voice breaks through the static: "Can anyone hear me?" Solar noise has split Pip\'s wave into three paper strips. It starts HIGH and must return HIGH. Reconnect it to find the band that can carry a reply.',
    'The band is clear, but Pip\'s next message is still too faint. "The solar storm is draining my link!" Only six paper power cells remain. Catch the signal, read it and shield it from noise; sending must wait.',
    'Three lights on the listening console blink out. Pip\'s instruction is arriving, but the settings are split among the crew. Each specialist holds one fact. Tell one another what you know to tune the receive channel.',
    'The console prints five little icons instead of words. Pip\'s voice fades: "Use the phase you found." Select that phase\'s code strip, match each received icon to the fixed key and discover Pip\'s instruction.',
    'Pip is listening for your answer. The receiver can now rest, freeing its cells for an outgoing message. Find the sending devices, fill the paper transmission and choose only the number of pulses Pip requested.',
]
QUESTIONS = [
    'What must match at every join before you trust the band letters?',
    'Which three jobs must the console perform to hear Pip safely?',
    'How can three separate facts become one checked setting?',
    'Why can you not simply read the chosen code strip from left to right?',
    'Which devices can be switched off before your crew sends?',
]
ROLES = [
    'Commander reads the scene and points to HIGH at both ends; Engineer lays the strips; Communicator records order and band; Verifier checks every IN/OUT join and counts the three wave marks.',
    'Commander names the three receive jobs; Engineer moves six cells; Communicator records the powered devices; Verifier counts all cells and checks the transmitter is OFF.',
    'Commander holds the band clue; Engineer holds the phase clue; Verifier holds the badge clue; Communicator hears all three, circles the settings and reads back the code.',
    'Commander points to each received icon; Engineer places the correct code strip below the FIXED key; Communicator writes the five decoded characters; Verifier checks each icon-to-key match.',
    'Commander names the three sending jobs; Engineer moves the six cells; Communicator completes the transmission; Verifier checks the power total and the decoded pulse count before submission.',
]
ACTIONS = [
    [
        'Adult gives page 5. Cut its three outer strip rectangles, or point on the uncut page. Put START HIGH and END HIGH in view.',
        'Try a strip whose IN is HIGH. Join its OUT to the next strip\'s IN. Use all three; the last OUT must also be HIGH.',
        'Read the three BAND LETTERS in your laid order. Count the three waves on a strip. Record strip order, band and wave count on page 3.',
        'Show the adult each matching join, not just the word you wrote. Keep the wave strips beside your record.',
    ],
    [
        'Adult gives page 7. Keep its equipment board whole; cut six CELL rectangles. Put all six beside the board.',
        'To hear Pip, the console must catch a signal, read its code and block solar noise. Find the three matching device names on the board. Fill every cell slot on those devices.',
        'Leave all sending devices empty. Count six cells on the board and zero left beside it; receiving and sending cannot run together.',
        'Record the receive configuration on page 3. Keep the board and all six cells for mission 5.',
    ],
    [
        'Adult gives page 9 and hands its three clue cards to Commander, Engineer and Verifier. Each reads their clue aloud. With two players, split the cards between them.',
        'Communicator repeats all three facts. Circle one BAND, one PHASE and one BADGE on the whole calibration board.',
        'Read the settings in BAND / PHASE / BADGE order. Record the three settings on page 3.',
        'Each clue holder points to their source. Show the adult all three circled controls before asking for the decoder.',
    ],
    [
        'Adult gives page 11. Keep the upper symbol board whole. Cut the three long CODE strips along their outer rectangles.',
        'Use your PHASE from mission 3. Place only that numbered strip below the FIXED SYMBOL KEY. The received icons above are in a different order.',
        'For each received icon, find the same icon in the fixed key. Copy the letter from your strip under that key icon into the answer blank. Follow the received order.',
        'Verifier checks all five icon-to-key matches against the same strip. Record the complete instruction on page 3 and keep the selected strip visible.',
    ],
    [
        'Adult gives page 13. Cut its five PULSE markers; keep the transmission form whole. Read your decoded instruction before touching the power cells.',
        'Move the SAME six cells from RECEIVE to SEND. Broadcasting needs a transmitter, protection still needs a shield, and timing the pulses needs a timer. Fill those three devices; leave receiver and decoder empty.',
        'Write the three device names and cell counts, earlier settings and decoded instruction on the form. Place the requested number of pulse markers, starting at slot 1.',
        'Verifier checks all six cells, the written fields and the pulse count. Submit the whole form to the adult; after acceptance, hear Pip\'s response on page 14.',
    ],
]
ANSWERS = [
    'R-T-K is the only three-strip chain from HIGH back to HIGH: HIGH > LOW > MID > HIGH. Letters M-I-D spell MID; each strip shows three drawn waves.',
    'Receive state: RECEIVER 2 + DECODER 2 + SHIELD 2 = 6. TRANSMITTER and TIMER empty. Keep all six cells for the finale.',
    'BAND MID from the wave letters; PHASE 3 from the three waves; BADGE TRIANGLE from the three-sided badge drawing. Code is MID / 3 / TRIANGLE.',
    'Phase 3 selects Code 3. Its FIXED key is SUN=N, MOON=3, STAR=S, PATH=D, RING=E. Received order STAR-RING-SUN-PATH-MOON reads S-E-N-D-3, or SEND 3.',
    'Send state: TRANSMITTER 3 + SHIELD 2 + TIMER 1 = 6; RECEIVER and DECODER empty. Form shows MID / 3 / TRIANGLE and SEND 3, with three pulse markers in slots.',
]
HINTS = [
    ('Which piece can follow START HIGH?', 'Match OUT to the next IN; use all three.', 'R then T then K. Read M-I-D.'),
    ('Read the three required device names.', 'Fill every drawn cell slot on those devices.', 'Receiver 2, decoder 2 and shield 2; transmitter off.'),
    ('Let every clue holder show or describe their card.', 'Band comes from mission 1; phase from its wave count; inspect the badge drawing.', 'MID / 3 / TRIANGLE.'),
    ('Use only the strip matching your phase.', 'Match the first received icon to that icon in the fixed key.', 'Code 3: STAR-RING-SUN-PATH-MOON reads SEND 3.'),
    ('The receiver and decoder have finished receiving.', 'Move all six cells; the decoded instruction tells the pulse count.', 'Transmitter 3, shield 2, timer 1; place three of the five pulses.'),
]


def mission(index, width):
    titles = ['Tune the lost wave', 'Power the receiver', 'Tune the receive channel',
              'Decode Pip\'s instruction', 'Send the paper reply']
    props = ['page 5: three wave strips and receiver board',
             'page 7: power board and six cells',
             'page 9: three private clues and calibration board',
             'page 11: symbol board and three decoder strips',
             'page 13: transmission form and five pulse markers']
    ending = ([Spacer(1, 7), Board(width, f'mission{index}',
                                150 if width < 515 else 137)] if index < 4 else
              [Spacer(1, 7), panel('Before handing over: check the completed settings, the changed power board and a pulse count taken from the decoded instruction.', width, 'note')])
    return (heading(titles[index], f'CHECKPOINT {index + 1} / STORY, THEN ACTION') +
            [panel(STORIES[index], width, 'body'), Spacer(1, 7),
             p('<b>Before you move:</b> ' + QUESTIONS[index], 'note'),
             p('<b>Put on the table:</b> record page 3; ' + props[index] +
               (', plus the power board and six cells from page 7.' if index == 4 else '.'), 'note'),
             p('Do this together', 'body')] + steps(ACTIONS[index]) +
            [Spacer(1, 7), panel('<b>Everyone has a job:</b> ' + ROLES[index], width),
             Spacer(1, 8), p('<b>Ready for the adult:</b> show the physical setting and the matching record row. '
                              'The adult checks it before releasing the next mission.', 'note'),
             ] + ending)


def player(source, width):
    pages = [heading(source['title'], 'PLAYER PACK / SPACE HOME') +
             [p('Pip the robot probe has lost contact. Your crew will rebuild a signal, manage six power cells, set a transmitter, decode Pip\'s message and send a paper reply.'),
              Image(str(g.ROOT / source['cover']), width=380, height=285, kind='proportional'),
              Spacer(1, 14), p('FIVE CONNECTED CONTROL-ROOM MISSIONS'),
              p('Every board, clue, cell and pulse marker is printed here. An adult releases one mission at a time and keeps the final reply hidden. No phone or electrical equipment is needed.'),
              panel('Ages 6-12. One team of 2-6; for 7-12, print a complete second Player Pack. Adult reads or writes for early readers.', width)]]
    pages.append(heading('Your control crew', 'PLAYER PAGE 2 / CUT FOUR JOB CARDS') +
                 [p('Adult: cut only the four outer rectangles. These are jobs, not characters. Every person may suggest an answer; the job holder makes the final paper action.'),
                  cut_cards([
                      ('COMMANDER / CUT', 'Read the current story and step. Ask every crew member for their fact. Point to the required setting before submission.'),
                      ('ENGINEER / CUT', 'Move and align the printed wave strips, power cells and code strip. Explain where each piece belongs.'),
                      ('COMMUNICATOR / CUT', 'Keep page 3 in the centre. Write or dictate the agreed result. Fill the final paper transmission.'),
                      ('VERIFIER / CUT', 'Check each join, power total and code column. Show the adult the board plus record, and ask for a hint when needed.'),
                  ], width, 208), Spacer(1, 11),
                  p('2 players: each holds two jobs and swaps bundles each mission. 3: pair Commander + Communicator. 4: one job each. 5: put two children on Engineer. 6: put two each on Engineer and Communicator. Pairs alternate the lead action each mission; rotate jobs if the group wants. No one is eliminated.', 'note')])
    pages.append(heading('Our mission record', 'PLAYER PAGE 3 / KEEP WHOLE') +
                 [p('Keep this page beside every board. Write after each mission; a younger player may point while an adult writes. Use an invented team name if you want: ____________________'),
                  Board(width, 'record', 430), Spacer(1, 11),
                  panel('If a result changes, erase only that row. Keep the used pieces beside it; you will need the settings again when sending.', width)])
    pages.append(mission(0, width))
    pages.append(heading('Rebuild the wave', 'CHECKPOINT 1 / PLAYER PAGE 5 / CUT THREE STRIPS') +
                 [p('Adult: cut the THREE rectangles marked CUT. Keep the receiver board and START/END labels whole. The printed order is mixed. Follow IN and OUT levels, not strip letters.'),
                  Board(width, 'waves', 480),
                  p('No-cut option: look at the uncut strips, write the strip letters in the three empty slots and trace each matching IN/OUT level with a finger. Work out the order yourself.', 'note')])
    pages.append(mission(1, width))
    pages.append(heading('Six cells for the console', 'CHECKPOINT 2 / PLAYER PAGE 7 / CUT SIX CELLS') +
                 [p('Adult: cut six CELL rectangles only. Keep the large device board whole and flat. The empty outlined spaces show the exact cost of each device.'),
                  Board(width, 'power', 540)])
    pages.append(mission(2, width))
    pages.append(heading('Three facts, one setting', 'CHECKPOINT 3 / PLAYER PAGE 9 / CUT THREE CLUES') +
                 [p('Adult: cut these three clue cards. Give one each to Commander, Engineer and Verifier. The settings board below stays whole.'),
                  Board(width, 'crew_clues', 145), Spacer(1, 8), Board(width, 'calibration', 328),
                  p('Circle the settings on this page. Do not cut the board or invent a fourth setting.', 'note')])
    pages.append(mission(3, width))
    pages.append(heading('Slide the code into place', 'CHECKPOINT 4 / PLAYER PAGE 11 / CUT THREE CODE STRIPS') +
                 [p('Adult: cut THREE horizontal strips. Keep both icon rows whole. Select the strip matching the PHASE on record row 3; match each received icon to the fixed key.'),
                  Board(width, 'decoder', 550)])
    pages.append(mission(4, width))
    pages.append(heading('Build the outgoing message', 'CHECKPOINT 5 / PLAYER PAGE 13 / CUT FIVE PULSES') +
                 [p('Adult: cut five PULSE rectangles at the bottom. Keep the outgoing form whole. Use only the number Pip requested. The same six cells from page 7 now power SEND equipment.'),
                  Board(width, 'transmission', 456),
                  p('The Verifier submits this whole page. If one field is wrong, correct it and submit again. This is a pretend paper transmission; nothing is sent online.', 'note')])
    pages.append(heading('Contact restored', 'PLAYER PAGE 14 / ADULT HOLDS UNTIL ACCEPTANCE') +
                 [p('Only the adult gives or reads this page after the crew has shown a correct power board and complete outgoing transmission.'),
                  Board(width, 'response', 500),
                  p('Each crew member points to one action they helped with. To reset, collect the cut pieces, erase the record and hide this response again. Replay has the same puzzle solution but can use different jobs.', 'note')])
    return pages


def guide(source, width, counts, unused_base):
    pages = []
    pages.append(heading('Run Pip\'s control room', 'HOST GUIDE / SPACE HOME') +
                 [p('A complete paper-only game for one team of 2-6, ages 6-12, with an adult host. For 7-12 children use two complete Player Packs and two tables. Read this guide privately; never give it as a clue sheet.', 'host'),
                  panel('First: print Player Pack pages 1-14 at Actual size in ONE paper size. Cut only marked outer rectangles. Next: put pages 1-3 out, hold five numbered missions, and hide response page 14. Then: read each scene, watch the crew move its paper pieces, verify the result and release the next mission.', width, 'host'),
                  p('Supply checklist', 'host'),
                  p('Required per team: one printed Player Pack, a flat table, two pencils and an eraser. Adult scissors are helpful before play; no knife, brads, batteries, phone, real transmitter, special paper or purchased prize is needed.', 'host'),
                  p('The game has one fixed solution. Give one hint at a time and accept pointing or dictated answers. Never hand children this answer guide.', 'host'),
                  Spacer(1, 10), host_check([
                      '<b>OPEN:</b> four job cards, record page 3 and mission 1 only.',
                      '<b>BETWEEN MISSIONS:</b> check the paper arrangement and its record row; then give the next pair of pages.',
                      '<b>FINISH:</b> check the completed transmission before revealing Pip\'s page 14 reply.',
                  ], width, 58), Spacer(1, 11),
                  p('Five-mission handover map', 'host'),
                  panel('<b>1 / WAVE</b> Join strips and record the band. &nbsp; '
                        '<b>2 / RECEIVE</b> Place all six cells and keep the board. &nbsp; '
                        '<b>3 / CALIBRATE</b> Share three clues and record the settings. &nbsp; '
                        '<b>4 / DECODE</b> Match icons with the fixed key. &nbsp; '
                        '<b>5 / SEND</b> Move the same cells, check the form and reveal the reply.', width, 'host')])
    pages.append(heading('Print, cut and sort', 'HOST / EXACT INVENTORY') +
                 [p('Standard: 14 single-sided Player Pack sheets per team. Minimum: pages 2-13 (12 sheets); read cover page 1 and response page 14 from screen. For two teams, print 28 standard or 24 minimum sheets. The Host Guide can remain on screen.', 'host'),
                  host_check([
                      '<b>OPEN / pp. 1-3:</b> cut four jobs on page 2; keep record page 3 whole.',
                      '<b>1 / pp. 4-5:</b> cut three wave strips; keep receiver board whole.',
                      '<b>2 / pp. 6-7:</b> cut six cells; keep board and cells for mission 5.',
                      '<b>3 / pp. 8-9:</b> cut three private clues; keep settings board whole.',
                      '<b>4 / pp. 10-11:</b> cut three code strips; keep received icons and key whole.',
                      '<b>5 / pp. 12-13:</b> cut five pulse markers; keep the form whole.',
                      '<b>FINISH / p. 14:</b> keep Pip\'s response hidden until acceptance.',
                  ], width, 46),
                  p('Count exactly 24 cut pieces per team: 4 jobs + 3 wave strips + 6 power cells + 3 clue cards + 3 code strips + 5 pulse markers. Cut outer rectangles only. Keep labels with their pieces.', 'host'),
                  p('Sort pages 4-13 into five task-and-prop pairs. The page 7 board and six cells stay in the team centre after mission 2. Put page 14 face down in HOST ONLY.', 'host'),
                  p('No-cut option: point to wave strips and work out their order on page 5; draw six pencil circles in the device slots; read clue boxes aloud; point to the selected code row; draw the decoded number of pulses in the final slots. The same answers and roles apply.', 'host')])
    pages.append(heading('Set the table and jobs', 'HOST / BEFORE PLAY') +
                 [panel('HOST ONLY: five numbered piles + guide + page 14<br/>TEAM CENTRE: jobs, record page 3, two pencils, active mission; solved evidence stays beside the record.', width, 'host'),
                  p('For 2 players: A holds Commander + Communicator; B holds Engineer + Verifier; swap bundles each mission. For 3: combine Commander + Communicator. For 4: give one job each. For 5: pair two children on Engineer. For 6: pair two on Engineer and two on Communicator. Paired players alternate the lead action each mission. For 7-12: use two complete packs and check each team independently.', 'host'),
                  p('Read aloud', 'host'),
                  panel('"Pip has gone quiet. You are the control crew. We will repair its paper signal, power the console and send a reply. I will give one mission at a time. Tell me what you moved and how you checked it. Mistakes can be corrected."', width, 'host'),
                  p('Give page 4 with page 5. After every mission, ask the Communicator to fill one row on page 3 and the Verifier to show the actual arrangement. Do not reveal the next pile until you check both.', 'host'),
                  p('A younger child may point or move a piece while an adult writes. Do not ask for real names or photos.', 'host'),
                  Spacer(1, 10), host_check([
                      '<b>HOST SIDE:</b> five numbered piles, private answer guide and hidden page 14.',
                      '<b>TEAM SIDE:</b> four jobs, page 3 record, two pencils and only the current task pair.',
                      '<b>EVIDENCE SIDE:</b> solved strips, clues and code stay visible; page 7 power board stays until the end.',
                  ], width)])
    titles = ['Tune the lost wave', 'Power the receiver', 'Tune the receive channel',
              'Decode Pip\'s instruction', 'Send the paper reply']
    physical_checks = [
        ['<b>1 / Place:</b> R enters HIGH; T follows R\'s LOW; K follows T\'s MID.',
         '<b>2 / Count:</b> three wave marks on a cut strip; the loose pieces fit inside the board slots.',
         '<b>3 / Record:</b> R-T-K and MID on player page 3 before the power page is handed out.'],
        ['<b>1 / On:</b> RECEIVER, DECODER and SHIELD are the only occupied device rows.',
         '<b>2 / Count:</b> six cells in six outlined spaces; no cell left loose.',
         '<b>3 / Hold:</b> keep the board and all six cells on the team table for mission 5.'],
        ['<b>1 / Hear:</b> three different clue holders speak; do not let one card stand for the whole code.',
         '<b>2 / Circle:</b> MID, 3 and TRIANGLE, one entry in each board column.',
         '<b>3 / Record:</b> MID / 3 / TRIANGLE; phase 3 points to the decoder strip.'],
        ['<b>1 / Select and match:</b> CODE 3 sits under the fixed key; received STAR-RING-SUN-PATH-MOON yields S-E-N-D-3.',
         '<b>2 / Record:</b> SEND 3. Keep the strip visible so the pulse count has paper evidence.'],
        ['<b>1 / Move:</b> empty RECEIVER and DECODER; fill TRANSMITTER 3, SHIELD 2, TIMER 1.',
         '<b>2 / Submit:</b> form shows MID / 3 / TRIANGLE, SEND 3 and three of the five pulse markers. Accept before revealing page 14.'],
    ]
    recovery = [
        'Wrong wave? Point to the first OUT/IN mismatch; ask the crew to move one strip.',
        'Wrong power? Point to an empty required slot or a loose cell; recount all six.',
        'Wrong setting? Have that clue holder read their card again; check one column.',
        'Wrong code? Check the phase strip, then trace one received icon to the fixed key.',
        'Wrong send? Compare board and form; ask which earlier clue sets the pulse count.',
    ]
    for i, title in enumerate(titles):
        pages.append(heading(title, f'HOST / CHECKPOINT {i + 1} / PLAYER PAGES {4 + 2*i}-{5 + 2*i}') +
                     [p('<b>Give:</b> player pages ' + str(4 + 2*i) + '-' + str(5 + 2*i) +
                        ('. Keep page 7 and all six cells on the table from mission 2.' if i == 4 else '. Hold later pages.'), 'host'),
                      panel('<b>Read this scene:</b> ' + STORIES[i], width, 'host'),
                      p('<b>Ask before moving:</b> ' + QUESTIONS[i], 'host'),
                      p('<b>Watch the crew do these actions:</b>', 'host')] + steps(ACTIONS[i], 'host') +
                     [panel('<b>Accept only this visible result:</b> ' + ANSWERS[i], width, 'host'),
                      p(recovery[i] + ' Let players correct the paper; page 9 has further hints.', 'host'),
                      p('<b>Story handover:</b> ' + ([
                          '"MID is clear. Now keep the console alive long enough to hear Pip."',
                          '"The shield holds. Now tune the listening channel; leave the transmitter off."',
                          '"Settings locked. Pip has sent a coded instruction."',
                          '"You have an instruction. Receiving is over; prepare the outgoing power."',
                          '"Three pulses sent. I can release Pip\'s response."',
                      ][i]) + (' Give the next numbered task-and-prop pair.' if i < 4 else ' Check the final form, then give or read player page 14.'), 'host'),
                      Spacer(1, 8), host_check(physical_checks[i], width)])
    pages.append(heading('Hints and recovery', 'HOST / HELP WITHOUT TAKING OVER') +
                 [p('Give Hint 1, allow another try, then Hint 2. Hint 3 may state the answer but never skips moving the pieces or filling the record.', 'host'),
                  host_check([
                      f'<b>Mission {i+1}</b> / First: {h[0]}<br/>Next: {h[1]}<br/>Direct help: {h[2]}'
                      for i, h in enumerate(HINTS)
                  ], width, 77),
                  p('Lost or damaged strip: reprint only its prop page. If no scissors are available, use the no-cut actions on guide page 2. If a previous result is wrong, retrieve that mission\'s pieces and correct only its record row; do not restart the game.', 'host'),
                  p('Check legibility and scale before play: count six separated power-cell outlines; check the fixed icon key and all three code strips; see that every wave IN/OUT label survives cutting. Use one page per sheet at 100% / Actual size, in the selected A4 or Letter size.', 'host')])
    pages.append(heading('Restore contact and reset', 'HOST / ENDING CHECK') +
                 [p('Before you reveal player page 14, verify: R-T-K forms HIGH > LOW > MID > HIGH; row 1 says MID and 3 waves; receive state is 2+2+2; calibration is MID / 3 / TRIANGLE; selected code strip spells SEND 3; send state is 3+2+1 with receiver and decoder empty; and all three pulses sit in the outgoing slots.', 'host'),
                  panel('"Pip, we heard you. The crew moved the power, checked your code and sent three pulses. Your signal is coming back." Give or read page 14. Let each child point to one part they handled.', width, 'host'),
                  p('No extra toy, costume, electronic device or purchase is needed. Everything the children need to solve the five tasks is printed in the Player Pack.', 'host'),
                  p('Reset: gather 24 cut pieces, erase the record and circles, put the six cells beside the power board, restack missions 1-5 and hide response page 14. A replay has the same answer; rotate jobs or invite a child to explain a different check.', 'host'),
                  p('<b>After the story:</b> ask each child to show one action they performed. Ask what made the crew change from receiving to sending, and which earlier clue determined the pulse count. A spoken answer or pointing to the paper both count.', 'host'),
                  Spacer(1, 10), host_check([
                      '<b>Wave:</b> R-T-K; MID; three waves.',
                      '<b>Receive:</b> 2 + 2 + 2 cells; transmitter empty.',
                      '<b>Calibrate and decode:</b> MID / 3 / TRIANGLE; SEND 3.',
                      '<b>Send:</b> 3 + 2 + 1 cells; three pulses; response released last.',
                  ], width)])
    return pages
