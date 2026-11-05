"""Original seven-sheet printable game and four-page adult guide.

Run prepare-lighthouse-assets.mjs first. Requires reportlab.
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
TEMP = ROOT / 'tmp/lighthouse-build'
OUT = ROOT / 'public/assets/lighthouse'
DATA = json.loads((TEMP / 'game.json').read_text(encoding='utf-8'))
GAME, STAGES = DATA['lighthouse'], DATA['stages']
INK, PALE = HexColor('#153e54'), HexColor('#edf5f5')
RED = HexColor('#ad3425')


def clean(text):
    return str(text).replace('\u2019', "'").replace('\u2018', "'").replace('\u2013', '-').replace('\u2014', '-').replace('\u2192', ' > ').replace('\u201c', '"').replace('\u201d', '"').replace('\u00b7', ' / ')


def para(c, text, y, width, x=43, size=11, bold=False, gap=11):
    style = ParagraphStyle('p', fontName='Helvetica-Bold' if bold else 'Helvetica', fontSize=size, leading=size * 1.42, textColor=INK)
    p = Paragraph(escape(clean(text)), style)
    _, h = p.wrap(width, 1000)
    if y - h < 48:
        raise ValueError('Text crossed footer: ' + text[:60])
    p.drawOn(c, x, y - h)
    return y - h - gap


def title(c, text, y, width, size=23):
    return para(c, text, y, width - 86, size=size, bold=True)


def header(c, w, h, role, page, total, paper):
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 10)
    c.drawString(43, h - 31, 'PAPER ADVENTURE / THE SLEEPING LIGHTHOUSE')
    c.setFont('Helvetica', 9)
    c.drawRightString(w - 43, h - 31, paper + ' / ' + role)
    c.setStrokeColor(HexColor('#aecbd4'))
    c.line(43, h - 44, w - 43, h - 44)
    c.setFont('Helvetica', 7.2)
    c.drawString(43, 28, 'paperadventure.app/en/escape-room-games/the-sleeping-lighthouse/')
    c.drawRightString(w - 43, 16, f'{role} {page}/{total} | (c) 2026 Paper Adventure Workshop')
    return h - 65


def picture(c, name, x, y, w, h):
    c.drawImage(str(TEMP / name), x, y - h, width=w, height=h, mask='auto')
    return y - h - 15


def answer_line(c, label, y, w):
    y = para(c, label, y, w - 86, bold=True, size=10)
    c.setStrokeColor(HexColor('#8caeb8'))
    c.line(43, y - 12, w - 43, y - 12)
    return y - 36


def calibration(c):
    c.setStrokeColor(INK)
    length = 30 * 72 / 25.4
    c.line(43, 83, 43 + length, 83)
    c.line(43, 79, 43, 87)
    c.line(43 + length, 79, 43 + length, 87)
    c.setFillColor(INK)
    c.setFont('Helvetica', 9)
    c.drawString(43, 65, 'Check: this line must measure 30 mm. Print at 100%.')


def players(paper, size):
    w, h = size
    c = canvas.Canvas(str(OUT / f'sleeping-lighthouse-{paper}-players.pdf'), pagesize=size, invariant=1)
    c.setTitle('The Sleeping Lighthouse - Player Pack - ' + paper)
    c.setAuthor('Paper Adventure Workshop')
    y = header(c, w, h, 'PLAYER', 1, 7, paper)
    y = title(c, 'Your lighthouse mission', y, w)
    y = picture(c, 'coast.jpg', 43, y, w - 86, (w - 86) * .43)
    y = para(c, GAME['opening'], y, w - 86)
    y = para(c, 'Your team is the repair crew. Start with the journal on page 2. Save each finding below; the final console on page 7 needs them all.', y, w - 86, bold=True)
    for label in ['Journal: the three-symbol startup order', 'Power: the value of each powered module', 'Lens: the direction of its arrow']:
        y = answer_line(c, label, y, w)
    para(c, 'Ask the adult for one hint at a time, or use the optional web companion. You can complete the whole adventure on paper with the separate Adult Guide.', y, w - 86, size=9)
    c.showPage()

    y = header(c, w, h, 'PLAYER', 2, 7, paper)
    y = title(c, '01 / Mend the keeper\'s journal', y, w)
    y = para(c, STAGES[0]['intro'] + ' ' + STAGES[0]['task'], y, w - 86)
    y = para(c, 'An adult cuts the four strips on the dashed borders. Keep the letter with its text.', y, w - 86, size=9)
    for item in DATA['logs']:
        c.setFillColor(PALE)
        c.setStrokeColor(HexColor('#819fa5'))
        c.setDash(4, 3)
        c.roundRect(43, y - 79, w - 86, 79, 5, fill=1, stroke=1)
        c.setDash()
        c.setFillColor(INK)
        c.setFont('Helvetica-Bold', 24)
        c.drawString(57, y - 37, item['id'])
        para(c, item['text'], y - 17, w - 161, x=100, size=12)
        y -= 95
    y = answer_line(c, 'Strip letters, in event order:', y - 5, w)
    para(c, 'Record the symbol startup order on page 1, then take it to the power board.', y, w - 86, size=10)
    c.showPage()

    y = header(c, w, h, 'PLAYER', 3, 7, paper)
    y = title(c, '02 / Rebuild the power board', y, w)
    y = para(c, STAGES[1]['intro'], y, w - 86)
    y = picture(c, 'power-board.png', 43, y, w - 86, (w - 86) * 2 / 3)
    y = para(c, STAGES[1]['task'], y, w - 86, bold=True)
    y = para(c, 'Use the six loose module cards on page 4. Keep one of each symbol. Compare the energy bars as well as the values. Share the journal order and the two board rules with your teammates.', y, w - 86)
    y = answer_line(c, 'Our selected modules, in startup order:', y, w)
    para(c, 'When the adult or companion checks your selection, the lens cabinet opens. Keep your powered module values for the final startup.', y, w - 86, size=10)
    c.showPage()

    y = header(c, w, h, 'PLAYER', 4, 7, paper)
    y = title(c, 'The six loose power modules', y, w)
    y = para(c, 'An adult cuts each complete dashed rectangle. Do not cut the symbols or the energy bars apart. Choose three modules for the board on page 3.', y, w - 86, size=10)
    # Cards must physically fit the three slots on Player page 3, including
    # their complete dashed cut rectangles. Keep a small cutting tolerance.
    card_w, card_h = 106, 106 * 160 / 180
    left = (w - (3 * card_w + 2 * 35)) / 2
    for i, module in enumerate(DATA['modules']):
        x, top = left + (i % 3) * (card_w + 35), y - (i // 3) * (card_h + 35)
        picture(c, f"module-{module['symbol']}-{module['value']}.png", x, top, card_w, card_h)
        c.setStrokeColor(HexColor('#829da6'))
        c.setDash(3, 3)
        c.rect(x, top - card_h, card_w, card_h, fill=0, stroke=1)
        c.setDash()
    para(c, 'Keep all six cards together until you choose. Place your three selected cards inside the slots on page 3. The unused cards stay beside the board. Check both rules before recording your finding.', y - 2 * (card_h + 35) - 5, w - 86, size=11)
    c.showPage()

    y = header(c, w, h, 'PLAYER', 5, 7, paper)
    y = title(c, '03 / Align the paper lens', y, w)
    y = para(c, STAGES[2]['task'], y, w - 86)
    y = picture(c, 'lens-board.png', (w - 420) / 2, y, 420, 420)
    y = para(c, 'Put the cut lens from page 6 over this board. Keep the square edges aligned. Read by window numbers 1, 2, 3, even when the numbers are turned sideways. Do not flip the card over.', y, w - 86, size=10)
    answer_line(c, 'Where does the lens arrow point?', y, w)
    calibration(c)
    c.showPage()

    y = header(c, w, h, 'PLAYER', 6, 7, paper)
    y = title(c, 'The rotating paper lens', y, w)
    y = para(c, 'ADULT PREPARATION: Cut the outer dashed square, then the three CUT OUT windows. Keep the window numbers and the arrow inside the square. The arrow in the centre turns with the card.', y, w - 86, size=10)
    y = picture(c, 'lens-mask.png', (w - 420) / 2, y, 420, 420)
    para(c, 'No transparent sheet, pin or glue is needed. Lay the frame flat on page 5 and turn it by hand. Both sheets must be printed at 100% in the same paper size.', y, w - 86, size=10)
    calibration(c)
    c.showPage()

    y = header(c, w, h, 'PLAYER', 7, 7, paper)
    y = title(c, '04 / Wake the lighthouse', y, w)
    y = para(c, STAGES[3]['intro'], y, w - 86)
    y = picture(c, 'lens.jpg', 43, y, w - 86, (w - 86) * .52)
    y = para(c, 'Bring your findings from page 1. Set the lens arrow direction, then enter the module values in the journal\'s startup order.', y, w - 86, bold=True)
    y = answer_line(c, 'Lens direction: NORTH / EAST / SOUTH / WEST', y, w)
    y = answer_line(c, 'Three energy values, in journal order:', y, w)
    y = para(c, 'Tell the adult how each discovery helped. Ask the adult to check the final startup, or enter it in the companion. When it is right, open the ending on the Adult Guide\'s final page.', y, w - 86)
    para(c, 'Our repair crew\'s explanation:', y, w - 86, size=10)
    c.showPage()
    c.save()


def guide(paper, size):
    w, h = size
    c = canvas.Canvas(str(OUT / f'sleeping-lighthouse-{paper}-guide.pdf'), pagesize=size, invariant=1)
    c.setTitle('The Sleeping Lighthouse - Adult Guide and Ending - ' + paper)
    c.setAuthor('Paper Adventure Workshop')
    y = header(c, w, h, 'ADULT GUIDE', 1, 4, paper)
    y = title(c, 'Prepare the lighthouse adventure', y, w)
    y = para(c, 'ADULT ONLY / contains solutions. Keep this guide and its ending away from the player pile.', y, w - 86, bold=True)
    items = [
        ('The experience', 'A complete free paper adventure: three linked puzzles, followed by a final task using every discovery. Designed for ages 7-12 with adult help as needed; inspect the materials to judge the fit. A suggested team is 2-6 players. There is no required timer or real lock.'),
        ('You will need', 'Matching paper, a printer, a pencil, an eraser, scissors and a flat table. An adult handles the scissors, especially the three inner lens windows. No lock, envelope, glue or transparent sheet is required. Colour is optional: symbols, words and numbers carry every clue.'),
        ('Print', 'Print all seven player pages single-sided at 100% in matching ' + ('US Letter' if paper == 'Letter' else 'A4') + '. Print one complete set per team. Read this four-page guide on screen, or print it once. Page 4 is the ending and certificate; print that page if you want to hand it over at the finish.'),
        ('Cut and check', 'An adult cuts four journal strips on Player page 2, six full module cards on page 4, and the outer lens square plus its three windows on page 6. Retain the numbers and centre arrow. Check the 30 mm calibration lines on pages 5 and 6 and test that the square frame aligns with the grid. Do not flip the lens.'),
        ('Stage the handoffs', 'Start with Player pages 1-2. After the journal is checked, hand over pages 3-4. After power is checked, hand over pages 5-6. After the lens direction is checked, hand over page 7. Keep later piles covered. Accept a paper finding verbally using the answers on guide pages 2-3; do not require online entry. Read guide page 4 only after the correct final startup.'),
        ('Share the work', 'Let one player hold the journal order while another arranges modules. Swap readers and material handlers in the next room. Read aloud or write dictated findings when useful. Ask how a result follows from the clues before accepting a guess.'),
        ('Hints and stopping', 'Offer the first hint, let the players try, then offer the next. If they want the explanation, read it together. A viewed solution is help, not failure. Keep all repaired findings for the final task.'),
        ('Use of these materials', 'Print for your own household or the classes you teach; retain the Paper Adventure credit. Do not resell or republish these files. Share the public game page instead. The story and materials are original Paper Adventure content.'),
    ]
    for label, body in items:
        y = para(c, label, y - 2, w - 86, bold=True, size=11, gap=3)
        y = para(c, body, y, w - 86, size=10, gap=8)
    c.showPage()

    for page, stages in [(2, STAGES[:2]), (3, STAGES[2:])]:
        y = header(c, w, h, 'ADULT GUIDE', page, 4, paper)
        y = title(c, 'Hints, answers and discoveries', y, w)
        for stage in stages:
            y = para(c, stage['number'] + ' / ' + stage['title'], y - 4, w - 86, bold=True, size=13)
            for i, hint in enumerate(stage['hints']):
                y = para(c, f'Hint {i + 1}: {hint}', y, w - 86, size=10)
            y = para(c, 'Answer: ' + stage['answer'], y, w - 86, bold=True)
            y = para(c, stage['solution'], y, w - 86, size=10)
            if stage['id'] != 'finale':
                y = para(c, 'What changes: ' + stage['consequence'], y, w - 86, size=9.5)
            y -= 8
        c.showPage()

    y = header(c, w, h, 'ADULT GUIDE', 4, 4, paper)
    y = title(c, 'Read only after the final startup', y, w)
    y = para(c, GAME['ending'], y, w - 86, size=12)
    y -= 15
    c.setFillColor(PALE)
    c.setStrokeColor(HexColor('#73988a'))
    c.roundRect(43, y - 290, w - 86, 290, 12, fill=1, stroke=1)
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 12)
    c.drawCentredString(w / 2, y - 35, 'PAPER ADVENTURE WORKSHOP')
    c.setFont('Helvetica-Bold', 25)
    c.drawCentredString(w / 2, y - 80, 'BEACON KEEPERS')
    c.setFont('Helvetica', 12)
    c.drawCentredString(w / 2, y - 112, 'Our team woke The Sleeping Lighthouse.')
    c.setFont('Helvetica', 10)
    c.drawString(67, y - 160, 'Our team mark:')
    c.line(67, y - 210, w - 67, y - 210)
    c.drawCentredString(w / 2, y - 252, 'We compared clues, shared our thinking and restored the light.')
    para(c, 'Optional: invite players to describe their favourite discovery and draw a team mark on the certificate. No names or uploads are needed.', y - 310, w - 86, size=9)
    c.showPage()
    c.save()


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for paper, size in [('A4', A4), ('Letter', letter)]:
        players(paper, size)
        guide(paper, size)
    print('Built A4/Letter player packs (7 pages each) and adult guides (4 pages each).')
