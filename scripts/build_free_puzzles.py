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


def players(paper, size):
    width, height = size
    pdf = canvas.Canvas(str(OUT / f'paper-adventure-puzzles-{paper}-players.pdf'), pagesize=size, invariant=1)
    pdf.setTitle('Six Free Escape Room Puzzles - Player Sheets - ' + paper)
    pdf.setAuthor('Paper Adventure Workshop')
    for index, puzzle in enumerate(PUZZLES):
        y = header(pdf, width, height, 'PLAYER', index + 1, 6, paper)
        y = heading(pdf, puzzle['number'] + '  ' + puzzle['title'], y)
        y = paragraph(pdf, puzzle['story'], y, width - 86)
        diagram_width = width - 100
        diagram_height = min(diagram_width * 350 / 540, 245 if puzzle.get('clues') else 290)
        pdf.drawImage(str(DATA / (puzzle['id'] + '.png')), (width - diagram_width) / 2, y - diagram_height, width=diagram_width, height=diagram_height, preserveAspectRatio=True, anchor='c', mask='auto')
        y -= diagram_height + 17
        y = paragraph(pdf, puzzle['task'], y, width - 86, bold=True)
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
        pdf.drawString(55, y - 38, clean(puzzle['format']))
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
    pdf.save()


def guide(paper, size):
    width, height = size
    pdf = canvas.Canvas(str(OUT / f'paper-adventure-puzzles-{paper}-guide.pdf'), pagesize=size, invariant=1)
    pdf.setTitle('Six Free Escape Room Puzzles - Adult Guide and Answers - ' + paper)
    pdf.setAuthor('Paper Adventure Workshop')
    y = header(pdf, width, height, 'ADULT GUIDE', 1, 4, paper)
    y = heading(pdf, 'Your guide to the clue workshop', y)
    y = paragraph(pdf, 'ADULT ONLY - contains answers. Keep this guide separate from the six player sheets.', y, width - 86, True)
    sections = [
        ('What this pack includes', 'Six independent puzzles: two codes, two logic tasks and two routes. They can be used separately or in any order. This is not a complete story-based escape room; there are no physical locks, timer or required room search.'),
        ('Print and prepare', 'Print the six player pages single-sided at 100% on matching ' + ('US Letter' if paper == 'Letter' else 'A4') + ' paper. One complete player set per team is a starting point. Read this four-page guide on screen, or print it once. Prepare pencils. No colour-dependent clue is used.'),
        ('Choose a starting point', 'The puzzles are designed for children aged 6-12 with adult help as needed. Reading and experience vary. Inspect the sheets first. Try the secret stamp, delivery queue or forest trail before the shifted message or harbour crossing.'),
        ('Share the information', 'For puzzle 4, an adult can cut the three helper clues from beneath the diagram and give one to each player. Leave the parcel picture and question intact. Players tell one another their clues and agree on the parcel. With fewer players, take turns or let the adult read a clue.'),
        ('Help without giving everything away', 'Ask players to explain their thinking before checking the answer. Give one hint at a time; allow another attempt before the next hint. The last hint can be very direct. If the group wants to stop, read the explained solution together.'),
        ('How you may use these files', 'Print for your own household or the classes you teach. Retain the Paper Adventure credit. Do not resell or republish these PDF files; share the public page link instead. These are original Paper Adventure puzzle materials.'),
    ]
    for title, body in sections:
        y = paragraph(pdf, title, y - 4, width - 86, True, 12)
        y = paragraph(pdf, body, y, width - 86, size=10.5)
    pdf.showPage()
    for page in range(3):
        y = header(pdf, width, height, 'ADULT GUIDE', page + 2, 4, paper)
        y = heading(pdf, ['Codes: hints and solutions', 'Logic: hints and solutions', 'Routes: hints and solutions'][page], y)
        for puzzle in PUZZLES[page * 2:page * 2 + 2]:
            y = paragraph(pdf, puzzle['number'] + ' - ' + puzzle['title'], y - 5, width - 86, True, 14)
            for i, hint in enumerate(puzzle['hints']):
                y = paragraph(pdf, f'Hint {i + 1}: {hint}', y, width - 86, size=10.5)
            y = paragraph(pdf, 'Answer: ' + puzzle['answer'], y, width - 86, True)
            y = paragraph(pdf, puzzle['solution'], y, width - 86, size=10.5)
            y -= 12
        pdf.showPage()
    pdf.save()


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for paper, size in [('A4', A4), ('Letter', letter)]:
        players(paper, size)
        guide(paper, size)
    print('Built four PDFs: six player pages and four guide pages in each paper size.')
