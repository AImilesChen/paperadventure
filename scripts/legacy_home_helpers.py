"""Shared layout helpers for the existing Space and Forest Home editions.

These editions originally imported the helpers from Dinosaur Home. Keep their
rendering stable while Dinosaur Home uses its independent expedition layout.
"""
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle

import generate_celebration_samples as g


STYLE = ParagraphStyle('legacy-home-player', fontName='Arial', fontSize=13,
                       leading=18, textColor=g.INK, spaceAfter=7)
BOLD = ParagraphStyle('legacy-home-label', parent=STYLE, fontName='ArialBold',
                      textColor=g.NAVY)


def p(text, bold=False):
    return Paragraph(text, BOLD if bold else STYLE)


def head(title, tag):
    return [g.p(tag, 'eyebrow'), g.p(title, 'title')]


def steps(items):
    return [p(f'<b>{index + 1}.</b> {text}') for index, text in enumerate(items)]


def cardgrid(items, width, height=140):
    rows = []
    for index in range(0, len(items), 2):
        row = [[p(title, True), p(body)] for title, body in items[index:index + 2]]
        if len(row) < 2:
            row.append([p('NOT A CARD', True), p('Keep this area uncut.')])
        rows.append(row)
    table = Table(rows, colWidths=[width / 2] * 2, rowHeights=[height] * len(rows))
    table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, g.LINE),
        ('INNERGRID', (0, 0), (-1, -1), 1, g.LINE),
        ('BACKGROUND', (0, 0), (-1, -1), g.PALE),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 12),
    ]))
    return table

