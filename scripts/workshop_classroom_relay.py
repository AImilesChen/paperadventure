"""C11: a fold, slide, test and explain paper-invention game.

Rebuilds only workshop/classroom manifest slots after the common retail build.
"""
from __future__ import annotations

import hashlib
import json
import math
import zipfile
from pathlib import Path

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
ART = ROOT / "public" / "assets" / "workshop-classroom-v0.1.webp"
NAVY = colors.HexColor("#123451")
INK = colors.HexColor("#2B465B")
ORANGE = colors.HexColor("#B93D25")
PALE = colors.HexColor("#EEF7F9")
SKY = colors.HexColor("#DDF1F8")
LINE = colors.HexColor("#9DBFCB")
WHITE = colors.white
pdfmetrics.registerFont(TTFont("WorkshopArial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("WorkshopBold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("WorkshopGeorgia", r"C:\Windows\Fonts\georgia.ttf"))
pdfmetrics.registerFontFamily("WorkshopArial", normal="WorkshopArial", bold="WorkshopBold")

TITLE = "The Great Blueprint Relay"
SCENES = (
    "Mira's invention showcase opens soon, but the paper relay blueprint has fallen into three pieces. Join its matching seam marks. The finished plan must show where a message starts, where it arrives and how wide the path between the folds must be.",
    "Mira has a plan, but the display still has no path. Fold the two outer strips into guide rails. Move the plain calibration card from START to DISPLAY without bending it. If a rail leans, let one inventor hold it while another moves the card.",
    "The path works, but Mira's display message is blank. Three workshop notes describe separate marks for it. Each holder tells the crew one requirement. Combine all three on the same hand-made card; no single note tells the whole design.",
    "The showcase rehearsal begins. Three sample cards need a trial before the crew uses its own message. Predict, slide and inspect each one. Record which design fails, why it fails and what a working message needs.",
    "Visitors have arrived at Mira's display desk. Run the card your crew made through the paper relay. A different pupil checks the plan, the three notes and the trial record. Explain a fault you found before your message goes on display.",
)


class Page:
    def __init__(self, canvas: Canvas, size, role: str, number: int, total: int):
        self.c, self.w, self.h = canvas, *size
        self.left, self.right = 44, self.w - 44
        self.width = self.right - self.left
        self.y = self.h - 60
        self.number = number
        canvas.setFillColor(SKY)
        canvas.rect(0, self.h - 35, self.w, 35, fill=1, stroke=0)
        canvas.setFillColor(NAVY)
        canvas.setFont("WorkshopBold", 8.6)
        canvas.drawString(self.left, self.h - 22, "PAPER ADVENTURE  /  WORKSHOP  /  CLASSROOM")
        canvas.setStrokeColor(LINE)
        canvas.line(self.left, 38, self.right, 38)
        canvas.setFont("WorkshopArial", 8.5)
        canvas.drawString(self.left, 25, f"{role.upper()}  /  Edition 1.0  /  {'A4' if size == A4 else 'US Letter'}")
        canvas.drawRightString(self.right, 25, f"Page {number} of {total}")

    def text(self, value, size=12, leading=None, *, bold=False, after=8, color=INK, x=None, width=None):
        style = ParagraphStyle("body", fontName="WorkshopBold" if bold else "WorkshopArial",
                               fontSize=size, leading=leading or size * 1.34, textColor=color)
        para = Paragraph(value, style)
        _, height = para.wrap(width or self.width, 2000)
        self.y -= height
        if self.y < 49:
            raise ValueError(f"page {self.number} text overflow at {self.y:.1f}: {value[:65]}")
        para.drawOn(self.c, x if x is not None else self.left, self.y)
        self.y -= after

    def title(self, kicker, title, deck=""):
        self.text(kicker.upper(), 9.8, 13, bold=True, color=ORANGE, after=7)
        self.text(title, 23, 28.2, color=NAVY, after=8)
        if deck:
            self.text(deck, 12.4, 17.0, after=11)

    def heading(self, title):
        self.text(title, 14.5, 19.4, bold=True, color=NAVY, after=7)

    def panel(self, title, body, height=78, font=11.6):
        para = Paragraph(body, ParagraphStyle("panel", fontName="WorkshopArial",
                         fontSize=font, leading=font * 1.32, textColor=INK))
        _, ph = para.wrap(self.width - 24, 2000)
        height = max(height, ph + 42)
        bottom = self.y - height
        if bottom < 49:
            raise ValueError(f"page {self.number} panel overflow: {title}")
        self.c.setFillColor(PALE)
        self.c.setStrokeColor(LINE)
        self.c.roundRect(self.left, bottom, self.width, height, 7, fill=1, stroke=1)
        self.c.setFillColor(NAVY)
        self.c.setFont("WorkshopBold", 11.2)
        self.c.drawString(self.left + 12, self.y - 20, title)
        para.drawOn(self.c, self.left + 12, self.y - 29 - ph)
        self.y = bottom - 11

    def line(self, label, height=34):
        self.c.setFillColor(NAVY)
        self.c.setFont("WorkshopBold", 10.8)
        self.c.drawString(self.left, self.y - 1, label)
        self.c.setStrokeColor(LINE)
        self.c.line(self.left + 180, self.y - 4, self.right, self.y - 4)
        self.y -= height
        if self.y < 49:
            raise ValueError(f"page {self.number} rule overflow")

    def finish(self):
        self.c.showPage()


def paragraph_at(c, text, x, top, width, font=11.5, leading=None, color=INK):
    style = ParagraphStyle("placed", fontName="WorkshopArial", fontSize=font,
                           leading=leading or font * 1.3, textColor=color)
    para = Paragraph(text, style)
    _, h = para.wrap(width, 2000)
    para.drawOn(c, x, top - h)
    return h


def steps(p: Page, lines):
    p.heading("Do this together")
    for number, line in enumerate(lines, 1):
        p.text(f"<b>{number}.</b> {line}", 11.8, 15.8, after=6)


def outer_rect(c, x, y, w, h):
    c.setStrokeColor(ORANGE)
    c.setLineWidth(1.1)
    c.setDash(5, 3)
    c.roundRect(x, y, w, h, 6, fill=0, stroke=1)
    c.setDash()
    c.setLineWidth(1)


def arrow(c, x, y, up=True, scale=1):
    dy = 20 * scale * (1 if up else -1)
    c.setStrokeColor(NAVY)
    c.setFillColor(NAVY)
    c.setLineWidth(3)
    c.line(x, y, x, y + dy)
    tip = y + dy
    path = c.beginPath()
    path.moveTo(x - 7 * scale, tip - (8 if up else -8) * scale)
    path.lineTo(x, tip)
    path.lineTo(x + 7 * scale, tip - (8 if up else -8) * scale)
    c.drawPath(path, stroke=1)
    c.setLineWidth(1)


def star(c, x, y, radius=8):
    path = c.beginPath()
    for n in range(10):
        angle = math.pi / 2 + n * math.pi / 5
        r = radius if n % 2 == 0 else radius * .42
        point = (x + r * math.cos(angle), y + r * math.sin(angle))
        if n == 0:
            path.moveTo(*point)
        else:
            path.lineTo(*point)
    path.close()
    c.setStrokeColor(NAVY)
    c.drawPath(path, stroke=1, fill=0)


def message_card(c, x, y, width, height, label, *, symbol=None, stars=0, direction=None):
    outer_rect(c, x, y, width, height)
    c.setFillColor(NAVY)
    c.setFont("WorkshopBold", 10.5)
    c.drawCentredString(x + width / 2, y + height - 18, label)
    c.setFont("WorkshopBold", 8.3)
    c.drawCentredString(x + width / 2, y + height - 31, "DISPLAY EDGE")
    if symbol == "triangle":
        path = c.beginPath()
        path.moveTo(x + width / 2, y + height * .63 + 19)
        path.lineTo(x + width / 2 - 14, y + height * .63 - 7)
        path.lineTo(x + width / 2 + 14, y + height * .63 - 7)
        path.close()
        c.setStrokeColor(NAVY)
        c.drawPath(path, stroke=1, fill=0)
    for i in range(stars):
        star(c, x + width / 2 + (i - (stars - 1) / 2) * 27,
             y + height * .39)
    if direction:
        arrow(c, x + width / 2, y + 21 if direction == "up" else y + 43,
              direction == "up", .8)
    if label.startswith("SAMPLE"):
        c.setFont("WorkshopBold", 8.3)
        c.drawCentredString(x + width / 2, y + 8, "TEST ONLY")


def player(c: Canvas, size):
    p = Page(c, size, "Player Pack", 1, 12)
    p.title("Inventors' paper workshop / five missions", TITLE,
            "Ages 6-12. Make a foldable paper relay, test a message, diagnose a fault and explain a repair.")
    c.drawImage(str(ART), p.left + (p.width - 218) / 2, p.y - 229,
                width=218, height=218, preserveAspectRatio=True, anchor="c", mask="auto")
    p.y -= 239
    p.panel("Your showcase challenge", "Mira needs a paper message to travel from START to DISPLAY. "
            "Your crew will rebuild a plan, make a path, invent one message, learn from failed trials "
            "and show visitors how it works.", 86, 11.8)
    p.heading("Start in three steps")
    p.text("1. Take one job on page 2. Your teacher holds later pages and the answers.<br/>"
           "2. Put the design log on page 3 in the middle. Keep all original paper parts.<br/>"
           "3. Use only the current mission pile. Every pupil gets a turn to explain or move a piece.", 11.7, 16)
    p.panel("All you need / keep your evidence", "Use the printed Player Pack, pencils and adult-handled scissors. "
            "Nothing is powered or purchased. Keep your joined plan, folded track, original notes, own message and trial record; "
            "your teacher releases each new pile only when its mission begins.", 90, 11.5)
    p.finish()

    p = Page(c, size, "Player Pack", 2, 12)
    p.title("Keep this page", "Your invention crew", "Choose jobs now. Pass job bundles clockwise after EACH mission.")
    jobs = (
        ("SCENE READER", "After the teacher's scene, read the Player steps. Ask what everyone noticed."),
        ("BUILDER", "Join, fold and move the current paper parts. Let a partner try."),
        ("TESTER", "Predict what will happen, slide the cards and describe the result."),
        ("RECORDER", "Write or draw the group's evidence in the design log."),
        ("CHECKER", "Point to the original part or note. Ask another pupil to verify."),
        ("PRESENTER", "Explain the finished paper relay and one repair to visitors."),
    )
    top = p.y - 6
    gap = 12
    w = (p.width - gap) / 2
    for i, (name, body) in enumerate(jobs):
        x = p.left + (i % 2) * (w + gap)
        y = top - (i // 2 + 1) * 103
        c.setFillColor(PALE)
        c.setStrokeColor(LINE)
        c.roundRect(x, y, w, 92, 6, fill=1, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("WorkshopBold", 11.2)
        c.drawString(x + 10, y + 68, name)
        paragraph_at(c, body, x + 10, y + 60, w - 20, 11.4)
    p.y = top - 3 * 103 - 17
    p.panel("Give everyone a part",
            "<b>2:</b> A = Reader + Recorder + Presenter; B = Builder + Tester + Checker.<br/>"
            "<b>3:</b> A = Reader + Presenter; B = Builder + Recorder; C = Tester + Checker.<br/>"
            "<b>4:</b> A = Reader + Presenter; B = Builder; C = Tester + Checker; D = Recorder.<br/>"
            "<b>5:</b> combine Reader + Presenter; four others take one job each.<br/>"
            "<b>6:</b> one job each. At the final audit, Checker and Recorder must be different pupils.",
            139, 11.0)
    p.text("A pupil may point or dictate while a partner writes. Jobs rotate after each mission; the three design notes later are information, not new roles. Recorder and Checker stay with different pupils.", 11.2, 15)
    p.finish()

    p = Page(c, size, "Player Pack", 3, 12)
    p.title("Keep whole / keep in the centre", "Our design log",
            "Keep earlier evidence beside this page. Ask the Checker to point to the paper source.")
    labels = (
        "1 / BLUEPRINT: What do the joined pieces show?",
        "2 / BUILD: Did the plain calibration card travel?",
        "3 / MESSAGE: Which three marks did we make?",
        "4 / TRIAL: Which fault did we find and how?",
        "5 / DISPLAY: What did another pupil check?",
    )
    for label in labels:
        p.panel(label, "Result: ______________________________________________<br/>"
                "Paper evidence or action: _________________________________", 78, 11.2)
    p.text("Write only after you actually join, fold, draw, slide or check. Your teacher may record your spoken words.", 11.4)
    p.finish()

    p = Page(c, size, "Player Pack", 4, 12)
    p.title("Mission 1 / blueprint", "Put the drawing back together",
            "Your teacher gives page 5. Keep the three pieces face up.")
    p.panel("The scene", SCENES[0], 98, 11.7)
    steps(p, (
        "Find the START and DISPLAY pieces. Place START on the left of your table.",
        "Match the same seam mark on the touching edges. Do not use the printed X, Y, Z names as a number code.",
        "Trace the path with a finger from START to DISPLAY. Read the two rail widths and the clear lane width aloud.",
        "Copy the plan to page 3. Leave the joined pieces on the table for the next mission.",
    ))
    p.heading("No-cut option: write the piece order here")
    y = p.y - 153
    c.setFillColor(WHITE); c.setStrokeColor(LINE)
    c.roundRect(p.left, y, p.width, 138, 7, fill=1, stroke=1)
    for i in range(3):
        c.setStrokeColor(LINE)
        c.roundRect(p.left + 13 + i * ((p.width - 44) / 3 + 4), y + 25,
                    (p.width - 65) / 3, 82, 5, fill=0, stroke=1)
    p.y = y - 12
    p.panel("Show your evidence", "The Checker points to the two matching seams on page 5. "
            "Another pupil shows the START-to-DISPLAY direction and says what is folded, not cut.", 77, 11.4)
    p.finish()

    p = Page(c, size, "Player Pack", 5, 12)
    p.title("Mission 1 / three large cut pieces", "The torn blueprint",
            "Adult: cut only the three dashed OUTER rectangles. Hand them out shuffled.")
    specs = (
        ("PIECE Y", "CIRCLE", "TRIANGLE", "CLEAR LANE", "48 mm between the two fold lines"),
        ("PIECE Z", "TRIANGLE", "PLAIN", "DISPLAY", "Right guide rail: 15 mm"),
        ("PIECE X", "PLAIN", "CIRCLE", "START", "Left guide rail: 15 mm"),
    )
    top = p.y - 8
    gap = 10
    w = (p.width - 2 * gap) / 3
    h = 365
    y = top - h
    for i, (name, left_mark, right_mark, station, fact) in enumerate(specs):
        x = p.left + i * (w + gap)
        outer_rect(c, x, y, w, h)
        c.setFillColor(NAVY)
        c.setFont("WorkshopBold", 11.4)
        c.drawString(x + 10, y + h - 22, name)
        paragraph_at(c, f"LEFT SEAM<br/><b>{left_mark}</b>", x + 10, y + h - 48, w - 20, 11.4)
        paragraph_at(c, f"RIGHT SEAM<br/><b>{right_mark}</b>", x + 10, y + h - 119, w - 20, 11.4)
        c.setStrokeColor(LINE); c.setLineWidth(2)
        c.line(x + 9, y + 165, x + w - 9, y + 165)
        c.setLineWidth(1)
        c.setFont("WorkshopBold", 13)
        c.drawCentredString(x + w / 2, y + 126, station)
        paragraph_at(c, fact, x + 10, y + 106, w - 20, 11.4)
    p.y = y - 17
    p.panel("How to check the joins", "Begin at START and finish at DISPLAY. Match the seam words "
            "on every touching edge; an outside edge should not need a partner. "
            "Point to each printed width before you ask the teacher to check.", 100, 11.6)
    p.finish()

    p = Page(c, size, "Player Pack", 6, 12)
    p.title("Mission 2 / make", "Fold a paper relay",
            "Adult: give the one-piece track and plain calibration card from page 7.")
    p.panel("The scene", SCENES[1], 97, 11.7)
    steps(p, (
        "Check the three blueprint facts on page 5: 15 mm rail, 48 mm clear lane, 15 mm rail.",
        "Place the cut track with START nearest you and DISPLAY farther away. Fold both outer strips UP along the two long DOTTED inner lines; do not cut those lines.",
        "Tester slides the plain calibration card inside the rails from START, printed side up and DISPLAY EDGE first. Builder holds a leaning rail lightly if needed.",
        "If it catches, flatten and refold on the printed line. Record what you changed on page 3.",
    ))
    p.heading("Fold across the width, not along the path")
    y = p.y - 126
    c.setFillColor(PALE); c.setStrokeColor(LINE)
    c.roundRect(p.left, y, p.width, 111, 7, fill=1, stroke=1)
    segments = (15, 48, 15)
    scale = 4.5
    x = p.left + 67
    for i, (width, label) in enumerate(zip(segments, ("RAIL / UP", "CLEAR LANE", "RAIL / UP"))):
        ww = width * scale
        c.setFillColor(WHITE if i == 1 else SKY)
        c.rect(x, y + 43, ww, 42, fill=1, stroke=1)
        c.setFillColor(NAVY); c.setFont("WorkshopBold", 10)
        c.drawCentredString(x + ww / 2, y + 60, label)
        x += ww
    p.y = y - 12
    p.panel("Pass check", "The 40 mm calibration card goes from START to DISPLAY without being bent. "
            "A fold can be held with a fingertip. The paper relay does not need glue, tape, a slit or a powered part.", 82, 11.5)
    p.finish()

    p = Page(c, size, "Player Pack", 7, 12)
    p.title("Mission 2 / adult cuts outer outlines", "The track and calibration card",
            "Print at 100% / Actual size. Cut the dashed OUTER edge; fold on the two long DOTTED inner lines.")
    track_w, track_h = 78 * mm, 170 * mm
    x = p.left + 24
    y = p.y - 10 - track_h
    outer_rect(c, x, y, track_w, track_h)
    c.setStrokeColor(NAVY)
    c.setDash(1, 3)
    for xx in (x + 15 * mm, x + 63 * mm):
        c.line(xx, y + 4, xx, y + track_h - 4)
    c.setDash()
    c.setFillColor(NAVY)
    c.setFont("WorkshopBold", 12)
    c.drawCentredString(x + track_w / 2, y + track_h - 27, "DISPLAY")
    c.drawCentredString(x + track_w / 2, y + 24, "START")
    arrow(c, x + track_w / 2, y + track_h / 2 - 5, True, 1.4)
    c.setFont("WorkshopBold", 9.4)
    c.drawCentredString(x + 7.5 * mm, y + track_h / 2, "15")
    c.drawCentredString(x + 70.5 * mm, y + track_h / 2, "15")
    c.drawCentredString(x + track_w / 2, y + track_h / 2 - 38, "48 mm clear lane")
    sx = x + track_w + 28
    message_card(c, sx, y + track_h - 53 * mm, 40 * mm, 45 * mm, "PLAIN / CALIBRATE")
    paragraph_at(c, "Adult cuts this <b>40 mm</b> card. It is a plain fit tool, not the finished message.", sx,
                 y + track_h - 58 * mm, p.right - sx, 11.0)
    paragraph_at(c, "<b>1.</b> Cut around the dashed OUTER edge.<br/><b>2.</b> Fold side rails UP on the DOTTED inner lines.<br/>"
                 "<b>3.</b> Keep START and DISPLAY readable.<br/><b>4.</b> Slide the card, DISPLAY EDGE first.",
                 sx, y + track_h - 96 * mm, p.right - sx, 11.3)
    p.y = y - 10
    p.finish()

    p = Page(c, size, "Player Pack", 8, 12)
    p.title("Mission 3 / three separate notes", "Share the design requirements",
            "Adult: cut three dashed cards. Give each to a DIFFERENT pupil where possible. Do not display them together first.")
    p.panel("The scene", SCENES[2], 91, 11.7)
    notes = (
        ("NOTE 2 / SYMBOL", "Put one large <b>TRIANGLE</b> on the message card."),
        ("NOTE 3 / COUNT", "Draw exactly <b>TWO STARS</b> below the large symbol."),
        ("NOTE 1 / DIRECTION", "Add one solid arrow pointing <b>TOWARD DISPLAY</b> when the card travels."),
    )
    top = p.y - 3
    for i, (name, body) in enumerate(notes):
        y = top - (i + 1) * 116
        outer_rect(c, p.left, y, p.width, 103)
        c.setFillColor(NAVY); c.setFont("WorkshopBold", 11.5)
        c.drawString(p.left + 14, y + 77, name)
        paragraph_at(c, body, p.left + 14, y + 64, p.width - 28, 13.0)
    p.y = top - 3 * 116 - 12
    p.panel("Share before drawing", "Each holder reads or shows one note. Reader repeats all three requirements. "
            "Recorder points to the blank card on page 9; Builder draws. Checker returns to the original notes before approving. "
            "For two pupils, the teacher reads the third note after both pupils share theirs.", 105, 11.5)
    p.finish()

    p = Page(c, size, "Player Pack", 9, 12)
    p.title("Mission 3 / one blank cut piece", "Make your own message card",
            "Adult: cut the dashed outer edge only. Pupils add marks after all three notes are shared.")
    p.panel("The scene", "The three notes are now shared. Turn their separate requirements into one card your crew can send through Mira's paper relay. Keep the notes beside your drawing so another inventor can check it later.", 79, 11.5)
    card_w, card_h = 40 * mm, 56 * mm
    x, y = p.left + 36, p.y - card_h - 15
    message_card(c, x, y, card_w, card_h, "OUR MESSAGE")
    c.setFillColor(INK); c.setFont("WorkshopArial", 10.6)
    c.drawString(x + card_w + 26, y + card_h - 22, "Use the THREE notes on page 8:")
    for i, line in enumerate(("Large symbol", "How many small marks?", "Which way should its arrow point?")):
        c.setStrokeColor(LINE)
        c.line(x + card_w + 27, y + card_h - 50 - 43 * i,
               p.right - 8, y + card_h - 50 - 43 * i)
        c.drawString(x + card_w + 27, y + card_h - 41 - 43 * i, line)
    p.y = y - 15
    steps(p, (
        "Read all three notes aloud without swapping what each note says.",
        "Builder draws the marks on the blank card. Do not use a ready-made answer card.",
        "Hold OUR MESSAGE at START, printed side up, with DISPLAY EDGE leading. Draw its arrow toward that edge.",
        "Recorder copies the three requirements into the design log. Keep the notes to verify later.",
    ))
    p.panel("Keep the original notes", "The display reviewer needs to see the three paper requirements, "
            "not just remember what the crew said. Put them beside the design log.", 75, 11.4)
    p.finish()

    p = Page(c, size, "Player Pack", 10, 12)
    p.title("Mission 4 / three sample cut pieces", "Try, observe and diagnose",
            "Adult: cut the three dashed OUTER cards. Keep their printed widths; these are TEST ONLY.")
    p.panel("The scene", SCENES[3], 92, 11.6)
    widths = (56 * mm, 40 * mm, 40 * mm)
    gap = 10
    x = p.left + 16
    y = p.y - 173
    for label, width, direction in zip(("SAMPLE A", "SAMPLE B", "SAMPLE C"),
                                       widths, ("up", "down", "up")):
        message_card(c, x, y, width, 56 * mm, label,
                     symbol="triangle", stars=2, direction=direction)
        x += width + gap
    p.y = y - 17
    steps(p, (
        "Predict whether A, B and C can pass and face DISPLAY correctly. Record the prediction on page 11.",
        "Try each from START, printed side up, with DISPLAY EDGE leading. Do not rotate, flip or bend a sample to make it pass.",
        "For each trial, check BOTH fit and arrow direction. Write what you saw, not just PASS or FAIL.",
        "Try your own OUR MESSAGE card last. If a mark is wrong, repair that card and check it again. Samples never become the final message.",
    ))
    p.finish()

    p = Page(c, size, "Player Pack", 11, 12)
    p.title("Mission 4 / write on this page", "Trial and repair record",
            "Use the track, not memory. Keep the printed side up and DISPLAY EDGE leading.")
    p.panel("Circle and explain", "A card passes only when it fits the lane <b>AND</b> its arrow faces DISPLAY. "
            "Try each sample before circling an observed result. A short spoken answer can be written by a partner.", 73, 11.5)
    for label in ("A / first sample", "B / second sample", "C / third sample"):
        p.panel(label, "Prediction (circle): PASS / FAULT<br/>"
                "Observed fit (circle): YES / NO &nbsp;&nbsp; Arrow toward DISPLAY: YES / NO<br/>"
                "What happened and why: ___________________________________________", 111, 11.4)
    p.panel("Fault and repair plan", "Faulty sample (write a letter): ______ &nbsp;&nbsp; What failed: ______________________<br/>"
            "A newly made card could fix this by: __________________________________<br/>"
            "OUR MESSAGE travelled without bending (circle): YES / RETRY", 96, 11.4)
    p.text("Keep the track, three notes and your own card for the final peer check. The sample cards are TEST ONLY.", 11.2)
    p.finish()

    p = Page(c, size, "Player Pack", 12, 12)
    p.title("Mission 5 / peer check", "Show the paper relay",
            "Keep your paper evidence nearby. Only your own OUR MESSAGE card from page 9 may go on display.")
    p.panel("The scene", SCENES[4], 85, 11.5)
    checks = (
        "The joined plan shows the 15 / 48 / 15 mm widths.",
        "The folded track lets OUR MESSAGE reach DISPLAY.",
        "OUR MESSAGE matches all three original notes.",
        "Our trial record names a sample fault and a possible repair.",
        "The Presenter shows the relay and answers a question.",
    )
    for i, item in enumerate(checks, 1):
        height = 68
        bottom = p.y - height
        c.setFillColor(PALE); c.setStrokeColor(LINE)
        c.roundRect(p.left, bottom, p.width, height, 6, fill=1, stroke=1)
        c.setFillColor(NAVY); c.setFont("WorkshopBold", 11.2)
        c.drawString(p.left + 12, p.y - 17, f"CHECK {i}")
        c.rect(p.right - 27, p.y - 21, 12, 12, fill=0, stroke=1)
        paragraph_at(c, item, p.left + 12, p.y - 24, p.width - 48, 11.4, 14.4)
        c.setFont("WorkshopArial", 10.6)
        c.drawString(p.left + 12, bottom + 10, "Evidence page or paper part: __________________________")
        p.y = bottom - 8
    p.y -= 12
    p.line("Checker / initials", 28)
    p.line("Presenter / initials", 28)
    p.text("The Checker must be someone other than the Recorder. After signing, slide OUR MESSAGE once more. Presenter: name one sample fault and how a new card could fix it. Your teacher reads the ending.", 11.2, 14.4)
    p.finish()


GUIDE = (
    ("1 / rebuild the blueprint", 5,
     "Give Player pages 4-5 only. The adult may pre-cut the three large fragments. Put them down in printed sheet order Y, Z, X, then ask pupils to rebuild the START-to-DISPLAY path.",
     "The order is X, Y, Z. X has START and a 15 mm left rail; Y has a 48 mm clear lane; Z has DISPLAY and a 15 mm right rail. The CIRCLE seams touch; then TRIANGLE seams touch. PLAIN edges face out.",
     ("Which piece says START and which says DISPLAY?", "Which words should touch at the first seam?", "Join X-Y-Z; the widths are 15 / 48 / 15 mm."),
     "Keep the joined plan and page 3. Release Player pages 6-7."),
    ("2 / fold the relay", 7,
     "Give Player pages 6-7. The adult cuts the dashed track OUTER edge and ONE plain calibration card. Pupils place START nearest them, fold both 15 mm rails UP on the two dotted INNER lines and slide the 40 mm card through.",
     "The folded centre lane is 48 mm wide. The 40 mm plain card fits with 8 mm total clearance and travels without bending. Dotted lines are folds, not slits. Fingertips may steady a rail; no tape is needed.",
     ("Which two dotted inner lines are folds?", "Does START face you, and are both rails up?", "Refold on the two dotted lines; slide the plain 40 mm card."),
     "Park the track and calibration card beside page 3. Release Player pages 8-9."),
    ("3 / make the message", 9,
     "Give Player pages 8-9. Cut three design notes and the ONE blank 40 mm message card. Deal notes separately. For two pupils, hold and read the third note after both pupils share theirs.",
     "On one hand-made card: ONE large triangle, exactly TWO stars beneath it, and ONE solid arrow pointing toward DISPLAY when pushed from START. All three note holders or the teacher for a pair must be heard.",
     ("What does each different note add?", "Can you point to the three separate marks on one card?", "Draw one triangle, two stars and an arrow toward DISPLAY."),
     "Keep the three original notes and finished card. Release Player pages 10-11."),
    ("4 / test and diagnose", 11,
     "Give Player pages 10-11. The adult cuts three sample cards at their printed widths. Pupils predict, then slide each from START, printed side up and DISPLAY EDGE leading. Do not rotate, flip or bend them. Check fit and arrow direction separately; try OUR MESSAGE last.",
     "A is 56 mm wide and cannot pass the 48 mm lane. B is 40 mm and slides but its arrow points back toward START when the labelled edge leads. C is 40 mm and slides with its arrow toward DISPLAY. Samples are TEST ONLY. Ask pupils to name one faulty sample and how a newly made card could fix it; they may also repair their own card.",
     ("Which sample stops at the rails?", "Can a card fit but still face the wrong way?", "A is too wide; B faces back; C fits and faces DISPLAY."),
     "Keep page 11 and all original pieces visible. Release Player page 12."),
    ("5 / display and peer-check", 12,
     "Give Player page 12 only after a crew tests its own OUR MESSAGE card. Assign a Checker other than the Recorder. Sample C must stay in the trial pile. Ask the Presenter to demonstrate and name one fault; the Checker points to the original sources.",
     "Only the crew-made OUR MESSAGE card can be displayed. It travels START to DISPLAY without bending; it has a triangle, two stars and a forward arrow. All five checks have an evidence page or part; the trial record names a sample fault and a possible repair. Do not demand artistic perfection.",
     ("Where are the original three design notes?", "Which sample failed because of width, and which because of direction?", "Point to blueprint, notes, page 11 and working relay before signing."),
     "Read the closing on Guide page 10. Let the group display or keep its paper relay."),
)


JOB_ACTIONS = (
    "Reader reads Player steps; Builder joins the fragments; Tester traces a proposed path and spots a mismatched seam; Recorder notes the result; Checker matches both seams; Presenter traces START to DISPLAY.",
    "Reader reads fold steps; Builder creases both rails; Tester slides the plain card; Recorder notes any refold; Checker points to cut and fold lines; Presenter shows the working path.",
    "Reader asks each note holder to share; Builder draws OUR MESSAGE; Tester checks the blank card width against the plain fit card; Recorder notes the three requirements; Checker verifies each note; Presenter repeats the design.",
    "Reader states the trial rule; Builder steadies the rails; Tester slides A, B, C, then OUR MESSAGE; Recorder circles results and writes one proposed repair; Checker verifies fit and direction; Presenter reports a fault and repair.",
    "Reader reads the five checks; Builder sets the track; Tester slides OUR MESSAGE; Recorder brings the plan, notes and log; a different Checker ticks evidence; Presenter demonstrates and answers a question.",
)


def guide(c: Canvas, size):
    p = Page(c, size, "Teacher Guide", 1, 10)
    p.title("Teacher quick start", "Run the blueprint relay",
            "A physical paper-design game for ages 6-12 and one crew of 2-6 pupils. Use balanced crews for up to 35 pupils.")
    p.panel("One-minute view", "Print the 12-page Player Pack once per crew, A4 or US Letter, single-sided at <b>Actual size</b>. "
            "Keep this 10-page Teacher Guide on screen or print one adult copy. Release only the current mission pages. "
            "Pupils join, fold, draw, test, repair and explain a paper-only track.", 111, 11.7)
    p.heading("Before the pupils arrive")
    for line in (
        "Print one complete Player Pack per crew. Use plain paper and pencils; an adult handles all scissors.",
        "For a whole class, cut all 12 large pieces per crew before pupils arrive. With one crew, you may cut each pile just before its mission.",
        "Sort five mission piles. Keep later pages and this answer guide away from pupils.",
        "Check that the one-piece track, 40 mm calibration card and 40/56 mm sample cards are printed at 100%.",
    ):
        p.text("• " + line, 11.7, 15.7, after=6)
    p.panel("No extra equipment", "No glue, tape, craft knife, electronic device or purchased prize is needed. "
            "The rail is a foldable paper model. If a rail leans, a pupil may steady it while another slides the card.", 84, 11.5)
    p.panel("Safety and scope", "An adult cuts outer outlines. Pupils fold and use flat paper. "
            "This does not teach construction of a real powered machine.", 73, 11.5)
    p.panel("First-use planning window", "Allow roughly <b>50 minutes</b> for opening, five missions and closing "
            "(5 + 7 + 8 + 10 + 10 + 10 minutes). Cut the pieces before a full-class session. "
            "These are provisional planning windows, not a measured completion time; adjust after a real class run.", 93, 11.3)
    p.finish()

    p = Page(c, size, "Teacher Guide", 2, 10)
    p.title("Exact print and handout map", "Print, cut and stage",
            "Every crew has all the necessary paper parts. Keep the Guide and later piles with the adult.")
    piles = (
        ("START / PLAYER 1-3", "Cover, six job descriptions and the whole-page design log. Give before opening."),
        ("PILE 1 / PLAYER 4-5", "Mission 1 story and THREE blueprint fragments. Cut three dashed outer cards."),
        ("PILE 2 / PLAYER 6-7", "Mission 2 instructions, ONE track and ONE plain calibration card. Cut outer outlines; DO NOT cut fold lines."),
        ("PILE 3 / PLAYER 8-9", "Three separately dealt notes and ONE blank message card. Cut four dashed outer cards."),
        ("PILE 4 / PLAYER 10-11", "Three sample cards and a whole-page trial log. Cut three outer cards, preserving printed widths."),
        ("PILE 5 / PLAYER 12", "Whole-page peer check and display. Release only after the crew tests its own card."),
    )
    for name, body in piles:
        p.panel(name, body, 70, 11.2)
    p.text("Cut count: 3 blueprint + 1 track + 1 calibration + 3 notes + 1 blank final card + 3 samples = <b>12 large loose pieces per crew</b>. "
           "Six crews need 72 Player sheets; only one Teacher Guide is needed.", 11.3, 15.2, after=0)
    p.finish()

    p = Page(c, size, "Teacher Guide", 3, 10)
    p.title("Before the first handout", "Roles, groups and opening",
            "One crew holds every required clue and tool; crews do not depend on each other.")
    p.panel("Jobs for 2-6 pupils",
            "<b>2:</b> A Reader + Recorder + Presenter; B Builder + Tester + Checker.<br/>"
            "<b>3:</b> A Reader + Presenter; B Builder + Recorder; C Tester + Checker.<br/>"
            "<b>4:</b> A Reader + Presenter; B Builder; C Tester + Checker; D Recorder.<br/>"
            "<b>5:</b> Reader + Presenter together; four others take one job each.<br/>"
            "<b>6:</b> one job each. After EACH mission, pass job bundles clockwise. Final Checker and Recorder must be different pupils. A pupil may dictate or point while a partner writes.",
            172, 11.6)
    p.panel("Whole-class gate", "For 35 pupils, use five crews of six and one of five, each with its own Pack. "
            "Read one scene to the room, hand every crew the same pile and let them work within that mission. "
            "Early finishers point to evidence or coach; they do not open the next pile. "
            "Check every crew, help lagging crews with graded hints, then release the next pile to everyone together.", 112, 11.3)
    p.heading("Read this opening aloud")
    p.panel("Opening scene", '"The workshop showcase opens today. Our paper relay plan is torn, and the display desk has no message yet. '
            'First we will find the design, then fold its path, make a message, test faults and explain our evidence. '
            'We are building a safe paper model. Every person has a job, and we can change a mark when a test shows it is wrong."',
            128, 11.6)
    p.text("Give Player pages 1-3. Put page 3 in the middle. Read the Mission 1 scene on this guide's page 4 "
           "before giving Player pages 4-5. Keep the original parts through the final peer check.", 11.4)
    p.finish()

    mission_titles = (
        "Put the drawing back together",
        "Fold a paper relay",
        "Make a message card",
        "Test and diagnose",
        "Display and defend",
    )
    for i, (label, player_end, action, answer, hints, handover) in enumerate(GUIDE, 1):
        p = Page(c, size, "Teacher Guide", i + 3, 10)
        p.title(f"Mission {i} / adult only", mission_titles[i - 1],
                f"Read the scene before you give the new Player pages; this mission ends at Player page {player_end}.")
        p.panel("Read this scene aloud", SCENES[i - 1], 91, 11.7)
        p.heading("Lead the actions")
        p.text(action, 11.7, 15.8, after=12)
        p.text(f"<b>Jobs now:</b> {JOB_ACTIONS[i - 1]}", 11.1, 14.5, after=9)
        p.panel("Accept when the crew shows this", answer, 105 if i in (2, 4, 5) else 98, 11.4)
        p.heading("Hints / stop after each")
        for n, hint in enumerate(hints, 1):
            p.text(f"<b>{n}.</b> {hint}", 11.5, 15.2, after=5)
        p.panel("If the first try fails", "Ask the pupil to repeat the physical action and point to its original paper source. "
                "Let another pupil check. Offer one hint, then allow a retry; do not complete the model silently for the group.", 67, 11.1)
        p.panel("Handover", handover, 58, 11.2)
        p.finish()

    p = Page(c, size, "Teacher Guide", 9, 10)
    p.title("Adult reference only", "Answer and geometry atlas",
            "Use the paper evidence after children try; do not show this page with the Player Pack.")
    p.panel("Blueprint", "X-Y-Z from START to DISPLAY. The first CIRCLE seam and second TRIANGLE seam match. "
            "The two rails are each 15 mm wide; the clear middle lane is 48 mm. PLAIN edges remain outside.", 95, 11.5)
    p.panel("Fold and fit", "Cut the dashed outer edge. Fold both 15 mm strips UP on dotted inner lines. "
            "A 40 mm calibration card has 8 mm total clearance in the 48 mm lane. "
            "If normal paper leans, a child may steady a rail; no tape or inner slit is expected.", 108, 11.5)
    p.panel("The hand-made message", "One large triangle, exactly two stars below and one solid arrow toward DISPLAY. "
            "These conditions come from three separate notes. Reject a card that satisfies only two notes.", 91, 11.5)
    p.panel("Three physical trials", "A: 56 mm, too wide for the 48 mm lane. "
            "B: 40 mm, travels but its arrow faces START when the DISPLAY EDGE leads. "
            "C: 40 mm, travels and faces DISPLAY. "
            "Keep all cards print-side up; never rotate a sample to change its result. "
            "Samples are TEST ONLY; the crew's own 40 mm card must travel and face DISPLAY.", 110, 11.5)
    p.panel("Final evidence", "The peer check needs the joined plan, folded track, three original notes, "
            "completed trial record and the crew-made OUR MESSAGE card, never sample C. "
            "Each child may explain an action; the Presenter names one fault and repair.", 90, 11.4)
    p.finish()

    p = Page(c, size, "Teacher Guide", 10, 10)
    p.title("Finish and continue", "Help, closing and reset",
            "Keep the activity accessible without inventing missing tools or changing the fixed paper geometry.")
    p.heading("Reading, folding and fine-motor support")
    p.text("Read one instruction at a time. A pupil may point to seams, dictate a mark, hold a rail or move a card while a partner writes. "
           "If folding is hard, the adult creases once and the pupil completes the fold. For a card that catches, return it to START; "
           "do not force it or cut the rails wider. Reprint the labelled page if a piece is damaged.", 11.7, 15.7)
    p.heading("If the period ends")
    p.text("Store page 3 with only the mission pages and pieces already issued. Label the next unopened pile. "
           "Resume by rereading its scene. Keep this Guide and later pages with the adult.", 11.7, 15.7)
    p.panel("Read the closing after peer check", '"The paper relay is ready for our showcase. '
            'You found a plan, folded a path, shared three notes and made a message. '
            'You tested cards that did not work, explained why and checked your own design. '
            'Our display is useful because another inventor can follow the same evidence. Thank you, workshop crew."',
            123, 11.6)
    p.panel("Reset or display", "Let the crew show its folded track and completed message alongside the signed page 12. "
            "For another group, print a fresh Player Pack. Reusing the same puzzle gives the same answer; "
            "do not promise a different mystery or an endlessly variable invention.", 95, 11.4)
    p.panel("Optional deeper challenge", "Ask older pupils to propose a new 40 mm message design that still travels correctly, "
            "then write a new three-condition brief for a partner to verify. "
            "This is after the five required missions and does not change the fixed core answer.", 99, 11.4)
    p.finish()


def build_paper(paper, size):
    entries, files = [], []
    for role, make, expected in (("player", player, 12), ("guide", guide, 10)):
        path = OUT / f"workshop-classroom-{role}-1.0-{paper}.pdf"
        c = Canvas(str(path), pagesize=size, pageCompression=1, invariant=1)
        c.setTitle(f"{TITLE} / {role.title()} / {paper}")
        c.setAuthor("Paper Adventure Workshop")
        make(c, size)
        c.save()
        count = len(PdfReader(path).pages)
        assert count == expected, (path, count)
        sha = hashlib.sha256(path.read_bytes()).hexdigest()
        entries.append(dict(world="workshop", setting="classroom", paper=paper,
                            role=role, path=path.relative_to(ROOT).as_posix(),
                            pages=count, bytes=path.stat().st_size, sha256=sha,
                            r2Key=f"retail/workshop/classroom/1.0/{paper}/{role}-{sha[:16]}.pdf"))
        files.append(path)
    with zipfile.ZipFile(OUT / f"workshop-classroom-{paper}-complete-1.0.zip",
                         "w", zipfile.ZIP_DEFLATED) as bundle:
        for path in files:
            bundle.write(path, path.name)
    return entries


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    entries = []
    for paper, size in (("A4", A4), ("Letter", letter)):
        entries.extend(build_paper(paper, size))
    manifest_path = OUT / "retail-packs-1.0-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["items"] = [item for item in manifest["items"]
                         if (item["world"], item["setting"]) != ("workshop", "classroom")] + entries
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("Workshop Classroom rebuilt:", [(e["paper"], e["role"], e["pages"]) for e in entries])


if __name__ == "__main__":
    build()

