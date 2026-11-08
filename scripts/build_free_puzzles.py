"""Build original free player/host PDFs from the shared web puzzle data.

Requires reportlab. First run scripts/prepare-free-puzzle-art.mjs.
The same content and diagrams are consumed by the website and this builder.
"""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'tmp/free-puzzles-build'
OUT = ROOT / 'public/assets/free-puzzles'
INK = HexColor('#153e54')
RED = HexColor('#ad3425')
PALE = HexColor('#edf5f7')
STYLE = ParagraphStyle('body', fontName='Helvetica', fontSize=11, leading=16, textColor=INK, spaceAfter=0)
PUZZLES = json.loads((DATA / 'puzzles.json').read_text(encoding='utf-8'))


def clean(value):
    return value.replace('\u2013', '-').replace('\u2014', '-').replace('\u2019', "'").replace('\u2192', ' > ').replace('\u201c', '"').replace('\u201d', '"')


def paragraph(pdf, text, y, width, bold=False, size=11):
    style = ParagraphStyle('line', parent=STYLE, fontSize=size, leading=size * 1.42)
    markup = escape(clean(text))
    if bold:
        markup = '<b>' + markup + '</b>'
    item = Paragraph(markup, style)
    _, height = item.wrap(width, 1000)
    if y - height < 50:
        raise ValueError('Content would overlap footer: ' + text[:50])
    item.drawOn(pdf, 43, y - height)
    return y - height - 11


def heading(pdf, text, y, size=22):
    pdf.setFillColor(INK)
    pdf.setFont('Helvetica-Bold', size)
    pdf.drawString(43, y - size, clean(text))
    return y - size - 16


def header(pdf, width, height, role, page, total, paper):
    pdf.setFillColor(INK)
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(43, height - 35, 'PAPER ADVENTURE / THE CLUE WORKSHOP')
    pdf.setFont('Helvetica', 9)
    pdf.drawRightString(width - 43, height - 35, paper + ' / ' + role)
    pdf.setStrokeColor(HexColor('#b5d5e0'))
    pdf.line(43, height - 47, width - 43, height - 47)
    pdf.setFont('Helvetica', 8)
    pdf.drawString(43, 29, 'paperadventure.app/en/escape-room-puzzles/')
    pdf.drawRightString(width - 43, 29, f'{role} {page}/{total} | (c) 2026 Paper Adventure Workshop')
    return height - 65


CELL = 23 * 72 / 25.4

def slide_arrow(pdf, x, y, horizontal, extent):
    pdf.setLineWidth(1.2)
    if horizontal:
        left, right = x - extent / 2, x + extent / 2
        pdf.line(left, y, right, y)
        for end, sign in [(left, 1), (right, -1)]:
            pdf.line(end, y, end + sign * 5, y + 4)
            pdf.line(end, y, end + sign * 5, y - 4)
    else:
        low, high = y - extent / 2, y + extent / 2
        pdf.line(x, low, x, high)
        for end, sign in [(low, 1), (high, -1)]:
            pdf.line(x, end, x + 4, end + sign * 5)
            pdf.line(x, end, x - 4, end + sign * 5)


def crate(pdf, piece, x, top, outline=False):
    horizontal = piece['axis'] == 'H'
    w, h = (piece['length'] * CELL, CELL) if horizontal else (CELL, piece['length'] * CELL)
    pdf.setStrokeColor(HexColor('#95a6aa') if outline else INK)
    pdf.setLineWidth(.8)
    pdf.setFillColor(HexColor('#f1d4c9') if piece['id'] == 'X' else PALE)
    pdf.setDash(3, 3) if outline else pdf.setDash()
    pdf.rect(x, top - h, w, h, fill=0 if outline else 1, stroke=1)
    pdf.setDash()
    pdf.setFillColor(HexColor('#819295') if outline else INK)
    pdf.setFont('Helvetica-Bold', 19)
    pdf.drawCentredString(x + w / 2, top - h / 2 + 4, piece['id'])
    pdf.setStrokeColor(HexColor('#819295') if outline else INK)
    slide_arrow(pdf, x + w / 2, top - h / 2 - 13, horizontal, 25 if horizontal else 16)


def bay_players(pdf, paper, width, height, puzzle):
    y = header(pdf, width, height, 'PLAYER', 4, 8, paper)
    y = heading(pdf, '03  The blocked loading bay', y)
    y = paragraph(pdf, 'Move the crates to send urgent parcel X out through the right-hand exit.', y, width - 86)
    y = paragraph(pdf, 'Horizontal crates slide left/right; vertical crates slide up/down. No turning, overlap or jumping. Only X leaves. Any number of moves is allowed.', y, width - 86, True, 10.5)
    y = paragraph(pdf, 'An adult cuts the eleven crates from player page 5. Place them over the matching starting outlines below. Slide the pieces on this board; do not lift them over other crates.', y, width - 86, size=10)
    left = (width - 6 * CELL) / 2
    top = y - 4
    pdf.setStrokeColor(HexColor('#bdc7ca'))
    pdf.setLineWidth(.5)
    for i in range(7):
        pdf.line(left + i * CELL, top, left + i * CELL, top - 6 * CELL)
        pdf.line(left, top - i * CELL, left + 6 * CELL, top - i * CELL)
    for piece, at in zip(puzzle['bay']['pieces'], puzzle['bay']['start']):
        col, row = (at, piece['fixed']) if piece['axis'] == 'H' else (piece['fixed'], at)
        crate(pdf, piece, left + col * CELL, top - row * CELL, True)
    pdf.setFillColor(INK)
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(left + 6 * CELL + 5, top - 2.5 * CELL, 'EXIT >')
    y = top - 6 * CELL - 15
    y = paragraph(pdf, 'The faint outlines are starting guides, not extra obstacles. X is delivered when it reaches the right edge of row 3.', y, width - 86, size=9)
    y = paragraph(pdf, 'Need a nudge? Ask for one hint. You can also play online without printing or cutting.', y, width - 86, size=9)
    pdf.showPage()
    y = header(pdf, width, height, 'PLAYER', 5, 8, paper)
    y = heading(pdf, '03 / cut-outs  Eleven sliding crates', y)
    y = paragraph(pdf, 'Adult preparation: print pages 4 and 5 at 100% on the same paper setting. Cut along the solid outside borders. Do not cut between the squares of a long crate.', y, width - 86, size=10.5)
    y = paragraph(pdf, 'Each grid square is 23 mm. Keep X and crates A through J; discard the surrounding paper.', y, width - 86, True, 10)
    pieces = {p['id']: p for p in puzzle['bay']['pieces']}
    top = y - 5
    for i, name in enumerate(['X', 'B', 'E', 'F', 'G', 'H']):
        col, row = i % 2, i // 2
        crate(pdf, pieces[name], 43 + col * (width - 86) / 2, top - row * (CELL + 19))
    top -= 3 * (CELL + 19) + 5
    for i, name in enumerate(['A', 'C', 'D', 'I', 'J']):
        crate(pdf, pieces[name], 43 + i * (CELL + 17), top)
    y = top - 3 * CELL - 16
    y = paragraph(pdf, 'Keep each letter and its arrows on the same piece. Colours are decorative; the letters and arrows are enough to play in black and white.', y, width - 86, size=9)
    assert y > 50, 'Bay cut-out page overlaps footer'
    pdf.showPage()


def parcel_players(pdf, paper, width, height, puzzle):
    y = header(pdf, width, height, 'PLAYER', 6, 8, paper)
    y = heading(pdf, '04  The miscopied parcel records', y, 20)
    y = paragraph(pdf, 'Find the parcel holding the COMPASS and the ONE false copied note.', y, width - 86, True, 11)
    y = paragraph(pdf, 'Recipients: Ava, Ben, Cleo, Drew. Contents: map, key, clock, compass. Each person receives one parcel; each parcel holds one item. Use each person and item exactly once.', y, width - 86, size=10.5)
    y = paragraph(pdf, 'VERIFIED RECORDS - ALL FOUR ARE TRUE', y, width - 86, True, 11)
    for i, clue in enumerate(puzzle['verified']):
        y = paragraph(pdf, f'V{i + 1}. {clue}', y + 2, width - 86, size=10.5)
    y = paragraph(pdf, 'Exactly one more means the stamp counts differ by 1.', y + 2, width - 86, size=9)
    y = paragraph(pdf, 'COPIED NOTES - EXACTLY TWO TRUE AND ONE FALSE', y, width - 86, True, 11)
    for label, clue in zip(['I', 'II', 'III'], puzzle['clues']):
        y = paragraph(pdf, f'{label}. {clue}', y + 2, width - 86, size=10.5)
    dw = width - 86
    dh = dw * 160 / 540
    pdf.drawImage(str(DATA / 'shared-parcel.png'), (width - dw) / 2, y - dh, width=dw, height=dh, mask='auto')
    y -= dh + 9
    pdf.setFillColor(PALE)
    pdf.roundRect(43, y - 43, width - 86, 43, 6, fill=1, stroke=0)
    pdf.setFillColor(INK)
    pdf.setFont('Helvetica-Bold', 10)
    pdf.drawString(55, y - 26, 'Compass in parcel: ______    False copied note (I, II or III): ______')
    y -= 56
    y = paragraph(pdf, 'Working notes / explain your thinking:', y, width - 86, size=9)
    pdf.setStrokeColor(HexColor('#c6d9e0'))
    if y > 65:
        pdf.line(43, y, width - 43, y)
    assert y > 50, 'Parcel answer page overlaps footer'
    pdf.showPage()


def parcel_reasoning(pdf, paper, width, height, puzzle):
    y = header(pdf, width, height, 'ADULT GUIDE', 7, 7, paper)
    y = heading(pdf, '04 / reasoning  The parcel ledger', y, 20)
    y = paragraph(pdf, 'Answer: ' + puzzle['answer'] + '. Follow each deduction below; the verified records are all true and only one copied note is false.', y, width - 86, True, 10.5)
    for i, step in enumerate(puzzle['steps']):
        y = paragraph(pdf, str(i + 1) + '. ' + step['title'] + ' ' + step['text'], y, width - 86, size=10.5)
    y = paragraph(pdf, 'THE RESTORED LEDGER', y, width - 86, True, 11)
    pdf.setFont('Helvetica', 10.5)
    for row in puzzle['ledger']:
        pdf.drawString(50, y - 12, row['id'] + ' / ' + row['recipient'] + ' / ' + row['content'])
        y -= 18
    assert y > 50, 'Parcel reasoning overlaps footer'
    pdf.showPage()


def players(paper, size):
    width, height = size
    pdf = canvas.Canvas(str(OUT / f'paper-adventure-puzzles-{paper}-players.pdf'), pagesize=size, invariant=1)
    pdf.setTitle('Six Free Escape Room Puzzles - Player Sheets - ' + paper)
    pdf.setAuthor('Paper Adventure Workshop')
    for index, puzzle in enumerate(PUZZLES):
        if index == 3:
            parcel_players(pdf, paper, width, height, puzzle)
            continue
        if index == 2:
            bay_players(pdf, paper, width, height, puzzle)
            continue
        y = header(pdf, width, height, 'PLAYER', index + 1 + (1 if index else 0) + (1 if index > 2 else 0), 8, paper)
        y = heading(pdf, puzzle['number'] + '  ' + puzzle['title'], y)
        y = paragraph(pdf, puzzle['story'], y, width - 86)
        diagram_width = width - 100
        diagram_height = min(diagram_width * 350 / 540, 245 if puzzle.get('clues') else 290)
        pdf.drawImage(str(DATA / (puzzle['id'] + '.png')), (width - diagram_width) / 2, y - diagram_height, width=diagram_width, height=diagram_height, preserveAspectRatio=True, anchor='c', mask='auto')
        y -= diagram_height + 17
        y = paragraph(pdf, 'Each row is one of the four labels in the same symbol code. Use each label once. Same shape, same letter; different shapes, different letters. Restore the key, then continue on player page 2.' if index == 0 else ('Find a method that explains all three records. Decode NFRG and write the four-letter rescue meeting point. This is the final answer.' if index == 1 else puzzle['task']), y, width - 86, bold=True)
        for i, clue in enumerate(puzzle.get('clues', [])):
            if puzzle['id'] == 'shared-parcel':
                pdf.setDash(3, 3)
                pdf.setStrokeColor(HexColor('#7997a2'))
                pdf.roundRect(43, y - 33, width - 86, 33, 3, fill=0, stroke=1)
                pdf.setDash()
                pdf.setFillColor(INK)
                pdf.setFont('Helvetica', 10.5)
                pdf.drawString(55, y - 21, clean(clue))
                y -= 42
            else:
                y = paragraph(pdf, f'{i + 1}. {clue}', y, width - 86, size=10.5)
        y -= 5
        if y < 115:
            raise ValueError('Answer panel does not fit: ' + puzzle['id'])
        pdf.setFillColor(PALE)
        pdf.roundRect(43, y - 56, width - 86, 56, 7, fill=1, stroke=0)
        pdf.setFillColor(INK)
        pdf.setFont('Helvetica-Bold', 10)
        pdf.drawString(55, y - 19, 'YOUR ANSWER')
        pdf.setFont('Helvetica', 9)
        pdf.drawString(55, y - 38, clean('Write the labels: A ___ B ___ C ___ D ___' if index == 0 else puzzle['format']))
        pdf.setStrokeColor(INK)
        pdf.line(width * .48, y - 39, width - 62, y - 39)
        y -= 72
        y = paragraph(pdf, 'Need a nudge? Ask the adult for one hint. Online hints and answer checking are available at the page address below.', y, width - 86, size=9)
        y = paragraph(pdf, 'Working notes / explain your thinking:', y - 5, width - 86, size=9)
        pdf.setStrokeColor(HexColor('#c6d9e0'))
        for line in range(2):
            if y - 23 * line > 65:
                pdf.line(43, y - 23 * line, width - 43, y - 23 * line)
        pdf.showPage()
        if index == 0:
            y = header(pdf, width, height, 'PLAYER', 2, 8, paper)
            y = heading(pdf, '01 / 2  The missing delivery route', y)
            y = paragraph(pdf, 'Start at the post office; it does not occupy a route slot. Visit all five stops once, using all five records. Translate the coded names with your key from player page 1. The final stop receives the letter.', y, width - 86, size=11)
            dw = width - 90
            dh = dw * 470 / 540
            pdf.drawImage(str(DATA / 'postal-route.png'), 45, y - dh, width=dw, height=dh, mask='auto')
            y -= dh + 12
            y = paragraph(pdf, 'POST OFFICE > 1 ____ > 2 ____ > 3 ____ > 4 ____ > 5 ____', y, width - 86, True, 11)
            y = paragraph(pdf, 'Final destination: __________', y, width - 86, True, 11)
            y = paragraph(pdf, 'Before may have stops between. Immediately after means next. Write notes or use five small paper cards to test orders; no cutting is required.', y, width - 86, size=9)
            pdf.showPage()
    pdf.save()


def guide(paper, size):
    width, height = size
    pdf = canvas.Canvas(str(OUT / f'paper-adventure-puzzles-{paper}-guide.pdf'), pagesize=size, invariant=1)
    pdf.setTitle('Six Free Escape Room Puzzles - Adult Guide and Answers - ' + paper)
    pdf.setAuthor('Paper Adventure Workshop')
    y = header(pdf, width, height, 'ADULT GUIDE', 1, 7, paper)
    y = heading(pdf, 'Your guide to the clue workshop', y)
    y = paragraph(pdf, 'ADULT ONLY - contains answers. Keep this guide separate from the eight player sheets.', y, width - 86, True)
    sections = [
        ('What this pack includes', 'Six independent puzzles: two codes, two logic tasks and two routes. They can be used separately or in any order. This is not a complete story-based escape room; there are no physical locks, timer or required room search.'),
        ('Print and prepare', 'Print the eight player pages single-sided at 100% on matching ' + ('US Letter' if paper == 'Letter' else 'A4') + ' paper. One complete player set per team is a starting point. Read this seven-page guide on screen, or print it once. Prepare pencils and scissors. For puzzle 3, cut the eleven crates from player page 5 and place them on player page 4. Print both at 100%; each square is 23 mm. No colour-dependent clue is used.'),
        ('Choose a starting point', 'The puzzles are designed for children aged 6-12 with adult help as needed. Reading and experience vary. Inspect the sheets first. Try the loading bay or forest trail first. Puzzle 1 now involves inferring a code from four old records before combining five records to reconstruct a five-stop delivery route. It uses two player pages.'),
        ('Share the information', 'For puzzle 4, distinguish the four verified records (all true) from the three copied notes (two true, one false). Recipients and contents each occur once. Choose the compass parcel AND the false note. Keep all evidence visible. No cutting is needed. Full reasoning is on guide page 7.'),
        ('Help without giving everything away', 'Ask players to explain their thinking before checking the answer. Give one hint at a time; allow another attempt before the next hint. The last hint can be very direct. If the group wants to stop, read the explained solution together.'),
        ('How you may use these files', 'Print for your own household or the classes you teach. Retain the Paper Adventure credit. Do not resell or republish these PDF files; share the public page link instead. These are original Paper Adventure puzzle materials.'),
    ]
    for title, body in sections:
        y = paragraph(pdf, title, y - 4, width - 86, True, 12)
        y = paragraph(pdf, body, y, width - 86, size=10.5)
    pdf.showPage()
    groups = [[PUZZLES[0]], [PUZZLES[1]], [PUZZLES[2]], PUZZLES[3:5], [PUZZLES[5]]]
    for page, group in enumerate(groups):
        y = header(pdf, width, height, 'ADULT GUIDE', page + 2, 7, paper)
        y = heading(pdf, ['The post office: two-stage solution', 'The moon-station message', 'The loading bay: explained moves', 'Evidence and trails', 'The harbour crossing'][page], y)
        for puzzle in group:
            y = paragraph(pdf, puzzle['number'] + ' - ' + puzzle['title'], y - 5, width - 86, True, 14)
            if puzzle['id'] == 'stamp-code':
                y = paragraph(pdf, 'Stage 1 - restore the key', y, width - 86, True, 11)
            for i, hint in enumerate(puzzle['hints']):
                y = paragraph(pdf, f'Hint {i + 1}: {hint}', y, width - 86, size=10.5)
            if puzzle['id'] == 'stamp-code':
                y = paragraph(pdf, 'Stage 2 - reconstruct the route', y - 4, width - 86, True, 11)
                for i, hint in enumerate(puzzle['routeHints']):
                    y = paragraph(pdf, f'Route hint {i + 1}: {hint}', y, width - 86, size=10.5)
            y = paragraph(pdf, 'Answer: ' + puzzle['answer'], y, width - 86, True)
            if puzzle['id'] == 'parcel-queue':
                y = paragraph(pdf, 'One solution from the printed starting layout follows. Each slide may cover several empty squares; the last slide delivers X automatically online. Other legal solutions are accepted.', y, width - 86, size=10.5)
                top = y - 8
                moves = puzzle['bay']['solution']
                rows = (len(moves) + 1) // 2
                for i, move in enumerate(moves):
                    delta = move['to'] - move['from']
                    piece = next(p for p in puzzle['bay']['pieces'] if p['id'] == move['piece'])
                    direction = ('left' if delta < 0 else 'right') if piece['axis'] == 'H' else ('up' if delta < 0 else 'down')
                    line = str(i + 1) + '. ' + move['piece'] + ' ' + direction + ' ' + str(abs(delta)) + (' square' if abs(delta) == 1 else ' squares')
                    pdf.setFillColor(INK)
                    pdf.setFont('Helvetica', 11)
                    pdf.drawString(43 + (i // rows) * (width - 86) / 2, top - (i % rows) * 24, line)
                y = top - rows * 24 - 10
                y = paragraph(pdf, 'Why it works: some crates must move away and later return. X first moves left so I can travel upward, then returns right. B and C later move back to open the exit. Online hints start from the current layout; these printed moves start from player page 4.', y, width - 86, size=10.5)
            else:
                y = paragraph(pdf, puzzle['solution'], y, width - 86, size=10.5)
                if puzzle['id'] == 'shared-parcel':
                    y = paragraph(pdf, 'Complete seven-step reasoning and restored ledger: guide page 7.', y, width - 86, True, 10)
            y -= 12
        pdf.showPage()
    parcel_reasoning(pdf, paper, width, height, PUZZLES[3])
    pdf.save()


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for paper, size in [('A4', A4), ('Letter', letter)]:
        players(paper, size)
        guide(paper, size)
    print('Built four PDFs: eight player pages and seven guide pages in each paper size.')
