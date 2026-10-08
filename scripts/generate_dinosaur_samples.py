"""Render the H02/C02 Dinosaur paper-game drafts; never publishes them."""

from pathlib import Path
import hashlib
import json
import math

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.platypus import Flowable, Image, PageBreak, SimpleDocTemplate
from PIL import Image as PillowImage

from generate_celebration_samples import p, gap, box, grid, page_heading, role_cards, strip_cards, write_line


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
ART = ROOT / "public" / "assets" / "dinosaur.png"
ART_THUMB = ROOT / "tmp" / "pdfs" / "dinosaur-cover.jpg"
BLUE = colors.HexColor("#DDF1FA")
NAVY = colors.HexColor("#153B56")
INK = colors.HexColor("#36546A")
CORAL = colors.HexColor("#E94B35")
CREAM = colors.HexColor("#FFFDF9")
LINE = colors.HexColor("#8BAFC1")

HOME_FOOTPRINTS = [
    ("A", 3, "Round", 1, "SUN"), ("B", 3, "Pointed", 1, "MOON"),
    ("C", 2, "Round", 1, "STAR"), ("D", 3, "Round", 0, "RAIN"),
]
CLASS_FOOTPRINTS = [
    ("A", 3, "Pointed", 1, "LOWLAND"), ("B", 2, "Round", 1, "WOODS"),
    ("C", 3, "Round", 1, "RIDGE"), ("D", 3, "Round", 0, "MARSH"),
]
CLASS_BATCHES = [
    ("A", "LEAF", 1, "MILO", "R1"), ("B", "LEAF", 2, "MILO", "R2"),
    ("C", "STAR", 2, "MILO", "R3"), ("D", "LEAF", 2, "TARO", "R4"),
]
CLASS_BATCH_NOTES = [
    ("R1", "3", "POINTED", "ONE"), ("R2", "3", "ROUND", "ONE"),
    ("R3", "2", "ROUND", "ONE"), ("R4", "3", "ROUND", "NONE"),
]


class ObservationBatchCards(Flowable):
    """Classroom dossier cards: countable marks and labelled seals on each card."""

    def __init__(self, width, rows):
        super().__init__()
        self.width = width
        self.height = 194
        self.rows = rows

    def draw(self):
        c = self.canv
        c.saveState()
        gutter = 10
        card_width = (self.width - gutter) / 2
        card_height = 92
        for index, (label, seal, dots, heading, mark) in enumerate(self.rows):
            x = (index % 2) * (card_width + gutter)
            y = (1 - index // 2) * (card_height + gutter)
            c.setStrokeColor(LINE)
            c.setLineWidth(0.9)
            c.roundRect(x, y, card_width, card_height, 6, fill=0, stroke=1)
            c.setFillColor(NAVY)
            c.setFont("ArialBold", 8.8)
            c.drawString(x + 9, y + 76, f"BATCH {label}  /  STORY DOSSIER")
            cx, cy = x + 35, y + 49
            c.setLineWidth(1.25)
            if seal == "LEAF":
                path = c.beginPath()
                path.moveTo(cx - 13, cy - 10)
                path.curveTo(cx - 21, cy + 11, cx + 2, cy + 19, cx + 15, cy + 13)
                path.curveTo(cx + 17, cy - 4, cx + 1, cy - 17, cx - 13, cy - 10)
                c.drawPath(path, fill=0, stroke=1)
                c.line(cx - 11, cy - 10, cx + 10, cy + 10)
            else:
                points = []
                for point in range(10):
                    angle = math.pi / 2 + point * math.pi / 5
                    radius = 17 if point % 2 == 0 else 8
                    points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
                path = c.beginPath()
                path.moveTo(*points[0])
                for px, py in points[1:]:
                    path.lineTo(px, py)
                path.close()
                c.drawPath(path, fill=0, stroke=1)
            for dot in range(dots):
                c.circle(cx - 5 + dot * 10, y + 22, 2.7, fill=1, stroke=0)
            c.setFillColor(INK)
            c.setFont("ArialBold", 8.2)
            tx = x + 74
            c.drawString(tx, y + 57, f"SEAL  {seal}")
            c.drawString(tx, y + 43, f"DOTS  {dots}")
            c.drawString(tx, y + 29, f"HEADING  {heading}")
            c.drawString(tx, y + 15, f"MARK  {mark}")
        c.restoreState()


class BatchNoteTable(Flowable):
    """Compact dossier notes make the first result necessary without adding a page."""

    def __init__(self, width):
        super().__init__()
        self.width = width
        self.height = 124

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(NAVY)
        c.setFont("ArialBold", 9)
        c.drawString(0, 111, "STATION BATCH NOTES / USE ONLY YOUR MARK")
        c.setStrokeColor(LINE)
        c.setLineWidth(0.8)
        c.rect(0, 4, self.width, 98, fill=0, stroke=1)
        for y in (79, 61, 43, 25):
            c.line(0, y, self.width, y)
        columns = (9, self.width * .19, self.width * .38, self.width * .66)
        c.setFont("ArialBold", 8.1)
        for x, label in zip(columns, ("MARK", "TOES", "HEEL", "RIGHT NOTCH")):
            c.drawString(x, 87, label)
        c.setFont("Arial", 8.5)
        for row, y in zip(CLASS_BATCH_NOTES, (66, 48, 30, 12)):
            for x, value in zip(columns, row):
                c.drawString(x, y, value)
        c.restoreState()


class FootprintCards(Flowable):
    """Four outline clues, encoded again in print for greyscale accessibility."""

    def __init__(self, width, rows, field):
        super().__init__()
        self.width = width
        self.height = 222
        self.rows = rows
        self.field = field

    def draw(self):
        c = self.canv
        c.saveState()
        card_width = (self.width - 10) / 2
        for index, (label, toes, heel, notch, destination) in enumerate(self.rows):
            x = (index % 2) * (card_width + 10)
            y = 112 if index < 2 else 0
            c.setStrokeColor(LINE)
            c.setLineWidth(.9)
            c.rect(x, y, card_width, 104, fill=0, stroke=1)
            c.setFillColor(NAVY)
            c.setFont("ArialBold", 9)
            c.drawString(x + 10, y + 87, f"PRINT {label}")
            # The footprint is a story symbol, not a claim about real dinosaurs.
            px = x + 37
            for toe in range(toes):
                offset = (toe - (toes - 1) / 2) * 15
                c.circle(px + offset, y + 71, 5.2, fill=0, stroke=1)
            c.setLineWidth(1.1)
            if heel == "Round":
                c.ellipse(px - 23, y + 19, px + 23, y + 58, fill=0, stroke=1)
            else:
                path = c.beginPath()
                path.moveTo(px - 22, y + 54)
                path.lineTo(px + 22, y + 54)
                path.lineTo(px + 19, y + 34)
                path.lineTo(px, y + 17)
                path.lineTo(px - 19, y + 34)
                path.close()
                c.drawPath(path, fill=0, stroke=1)
            if notch:
                # Cut a visible V into the right outline, then redraw both edges.
                c.setFillColor(colors.white)
                c.rect(px + 16, y + 32, 10, 14, fill=1, stroke=0)
                c.setStrokeColor(NAVY)
                c.line(px + 22, y + 45, px + 16, y + 39)
                c.line(px + 16, y + 39, px + 22, y + 33)
            c.setFillColor(INK)
            c.setFont("Arial", 8.7)
            tx = x + 79
            c.drawString(tx, y + 69, f"Toes: {toes}")
            c.drawString(tx, y + 54, f"Heel: {heel.upper()}")
            c.drawString(tx, y + 39, f"Right notch: {'ONE' if notch else 'NONE'}")
            c.setFont("ArialBold", 8.7)
            c.drawString(tx, y + 23, f"{self.field}: {destination}")
        c.restoreState()


class DinosaurTrailBoard(Flowable):
    """Three-slot paper workspace that keeps the trail start and sign visible."""

    def __init__(self, width):
        super().__init__()
        self.width = width
        self.height = 91

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(NAVY)
        c.setFont("ArialBold", 8.8)
        c.drawString(0, 78, "MILO'S PAPER TRAIL / ARRANGE THREE USEFUL STRIPS")
        gap_width = 9
        card_width = (self.width - 2 * gap_width) / 3
        for index in range(3):
            x = index * (card_width + gap_width)
            c.setStrokeColor(LINE)
            c.rect(x, 14, card_width, 56, fill=0, stroke=1)
            c.setFillColor(NAVY)
            c.setFont("ArialBold", 8.8)
            c.drawString(x + 8, 53, f"STRIP {index + 1}")
            c.setFillColor(INK)
            c.setFont("Arial", 8.7)
            c.drawString(x + 8, 36, "FROM: ________________")
            c.drawString(x + 8, 21, "TO: __________________")
        c.setFont("ArialBold", 8.7)
        c.drawString(0, 1, "FINISH AT A SIGN: ____________________________")
        c.restoreState()


class DinosaurFinaleCard(Flowable):
    """Guide-only paper ending for the family camp or classroom research crew."""

    def __init__(self, width, classroom):
        super().__init__()
        self.width = width
        self.height = 113
        self.classroom = classroom

    def draw(self):
        c = self.canv
        c.saveState()
        c.setStrokeColor(LINE)
        c.setLineWidth(0.9)
        c.roundRect(0, 0, self.width, self.height, 6, fill=0, stroke=1)
        c.setFillColor(NAVY)
        c.setFont("ArialBold", 8.5)
        if self.classroom:
            title = "RESEARCH STATION NOTE  /  SHARE AFTER REPORT A"
            lines = [
                "To the station crew,",
                "Your R2, RIDGE, Zone C and 09:45 clues fit one report.",
                "You put the paper records back in order by sharing evidence.",
                "Milo's story route can now be followed on the map.",
                "Thank you from the station guide",
            ]
        else:
            title = "MILO'S PAPER WELCOME  /  GIVE AFTER CAMP A"
            lines = [
                "Dear explorers,",
                "Your SUN trail led through PINE SIGN to the round gate.",
                "You found my welcoming paper camp by sharing every clue.",
                "Thank you for helping me find my story way home!",
                "From Milo and the camp guide",
            ]
        c.drawString(12, 96, title)
        c.setFillColor(INK)
        c.setFont("Arial", 8.6)
        for index, line in enumerate(lines):
            c.drawString(14, 79 - index * 15, line)
        c.restoreState()


def footer(canvas, doc):
    width, height = doc.pagesize
    canvas.saveState()
    canvas.setFillColor(BLUE)
    canvas.rect(0, height - 37, width, 37, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.setFont("ArialBold", 8)
    canvas.drawString(44, height - 23, "PAPER ADVENTURE WORKSHOP  /  DINOSAUR ADVENTURE")
    canvas.setFillColor(CORAL)
    canvas.setFont("ArialBold", 7)
    canvas.drawRightString(width - 44, height - 23, "NOT PLAY-TESTED")
    canvas.setStrokeColor(colors.HexColor("#BCD8E3"))
    canvas.line(44, 42, width - 44, 42)
    canvas.setFillColor(INK)
    canvas.setFont("Arial", 7.8)
    canvas.drawString(44, 28, f"{doc.product_code}  |  content draft v0.1  |  {doc.paper_label}")
    canvas.drawRightString(width - 44, 28, f"Page {doc.page}")
    canvas.restoreState()


def make_doc(name, size, code, paper, flow):
    OUT.mkdir(parents=True, exist_ok=True)
    result = OUT / name
    doc = SimpleDocTemplate(str(result), pagesize=size, leftMargin=44, rightMargin=44,
                            topMargin=63, bottomMargin=57, title=f"{code} Dinosaur content draft",
                            author="Paper Adventure Workshop - draft")
    doc.product_code = code
    doc.paper_label = paper
    doc.build(flow, onFirstPage=footer, onLaterPages=footer)
    return result


def cover(code, role, title, intro, width, records):
    art = Image(str(ART_THUMB), width=132, height=99)
    art.hAlign = "CENTER"
    flow = [p(f"{code} / {role}", "eyebrow"), p(title, "title"),
            box(intro, width, CREAM), gap(15), art, gap(13),
            p("Your five discoveries", "h2"),
            grid(["Step", "Write or circle your result"],
                 [[str(i), record] for i, record in enumerate(records, 1)],
                 [width * .16, width * .84]), gap(11),
            p("Keep this record nearby. An adult or teacher gives your group the five checkpoint pages in order. Use a pencil and the printed clues. Ask for a hint when you need one.", "small"),
            PageBreak()]
    return flow


def checkpoint(number, title, story, headers, rows, proportions, width, questions, transition,
               strip_mode=False, footprint_mode=False, trail_board=False, batch_mode=False,
               batch_notes=False):
    flow = page_heading(number, title, story)
    if batch_notes:
        flow += [BatchNoteTable(width), gap(8)]
    if batch_mode:
        flow += [ObservationBatchCards(width, rows),
                 p("Each dossier card repeats its seal and dot count in words. A teacher may cut the cards, or the group can compare them on this page.", "small"), gap(7)]
    elif footprint_mode:
        flow += [FootprintCards(width, rows, headers[-1].upper()),
                 p("The outline and printed words show the same clues. Compare all three details; adult cutting is optional.", "small"), gap(7)]
    elif strip_mode or number == 5:
        flow += strip_cards(headers, rows, width)
        flow += [p("An adult or teacher may cut the bordered cards; you can also compare or number them on this page.", "small"), gap(8)]
    else:
        flow += [grid(headers, rows, [width * x for x in proportions]), gap(17)]
    if trail_board:
        flow += [DinosaurTrailBoard(width), gap(8)]
    for question in questions:
        flow += write_line(question)
    flow += [gap(10), box(f"<b>Next in the story:</b> {transition}", width), PageBreak() if number < 5 else gap(8)]
    return flow


def home_player(width):
    flow = cover("HOME / H02", "PLAYER PACK", "The Little Dinosaur's Way Home",
                 "<b>Dear explorers,</b><br/>Milo and the camp guide have lost their paper route. Nobody is in danger. Study the records, share your clues and help them find the welcoming camp. You can play the whole story at a table.",
                 width, ["Footprint and start: ______________________________",
                         "Route and sign: __________________________________",
                         "Paper pack and code: _____________________________",
                         "Turn and gate: ___________________________________",
                         "Camp and two reasons: ____________________________"])
    flow += checkpoint(1, "Find Milo's footprint",
                       "Milo's print has THREE toe marks, a ROUND heel and ONE small notch on its RIGHT edge. Which record matches all three details?",
                       ["Print", "Toes", "Heel", "Right notch", "Route start"],
                       HOME_FOOTPRINTS,
                       [.13, .14, .22, .25, .26], width,
                       ["Matching footprint", "Our route starts at"],
                       "Take the start word to the route strips.", footprint_mode=True)
    flow += checkpoint(2, "Repair the paper map",
                       "Begin at the route start from Checkpoint 1. Join strips where one place ends and the next begins. The real route ends at a SIGN.",
                       ["Strip", "From", "To"],
                       [["D", "SUN", "CAVE"], ["B", "FERN", "RIVER"], ["E", "CAVE", "ROCK"],
                        ["C", "RIVER", "PINE SIGN"], ["A", "SUN", "FERN"]],
                       [.18, .38, .44], width,
                       ["Our strip order", "The sign says"],
                       "The sign name is needed to choose a paper supply pack.", strip_mode=True, trail_board=True)
    flow += checkpoint(3, "Choose the paper supplies",
                       "Assign the Guide, Milo and Scout clue lines to different players when possible. Let each read a line aloud. These are story clues, not real supplies.",
                       ["Card", "Sign", "Straps", "Tag", "Code"],
                       [["A", "PINE", "1", "Triangle", "2"], ["B", "PINE", "2", "Triangle", "4"],
                        ["C", "PINE", "2", "Circle", "5"], ["D", "ROCK", "2", "Triangle", "3"]],
                       [.13, .20, .17, .30, .20], width,
                       ["Our chosen pack", "Its code"],
                       "Use both the sign and the code on the signpost table.")
    # Place distributable role cards before the candidate table, without the adult answer.
    third_heading = next(i for i, item in enumerate(flow) if getattr(item, 'text', '') == 'Choose the paper supplies')
    flow[third_heading + 3:third_heading + 3] = role_cards([
        ("Guide", "Use the sign name from your route."),
        ("Milo", "The paper pack has TWO straps."),
        ("Scout", "The paper pack has a TRIANGLE tag."),
    ], width)
    flow += checkpoint(4, "Read the signpost",
                       "Find the row matching your sign from Checkpoint 2 and code from Checkpoint 3. The directions are part of this paper map.",
                       ["Sign", "Code", "Turn", "Gate"],
                       [["PINE", "2", "NORTH", "SQUARE"], ["PINE", "4", "EAST", "ROUND"],
                        ["PINE", "5", "WEST", "ROUND"], ["ROCK", "4", "SOUTH", "TRIANGLE"]],
                       [.27, .16, .25, .32], width,
                       ["Turn", "Gate shape"],
                       "All four discoveries now point to one welcoming camp.")
    flow += checkpoint(5, "Find the welcoming camp",
                       "Compare your route start, sign, turn and gate with every camp card. Tell your grown-up at least TWO reasons for your choice.",
                       ["Camp", "Start", "Sign", "Turn", "Gate"],
                       [["A", "SUN", "PINE", "EAST", "ROUND"], ["B", "SUN", "PINE", "EAST", "SQUARE"],
                        ["C", "SUN", "ROCK", "EAST", "ROUND"], ["D", "MOON", "PINE", "EAST", "ROUND"],
                        ["E", "SUN", "PINE", "WEST", "ROUND"]],
                       [.15, .20, .21, .21, .23], width,
                       ["The matching camp", "Two clues that prove it"],
                       "Milo and the guide are welcomed home. Your team used every part of the paper trail.")
    return flow


def class_player(width):
    flow = cover("CLASSROOM / C02", "GROUP PLAYER PACK", "The Dinosaur Research Station Mix-up",
                 "<b>Research team,</b><br/>The story station has mixed up its observation sheets. Sort the clues and send one clear evidence record. The creature details come from these story cards; no outside dinosaur knowledge is needed.",
                 width, ["Observation batch: _______________________________",
                         "Footprint and region: _____________________________",
                         "Location zone: ___________________________________",
                         "Time-strip order and signal: ______________________",
                         "Conclusion and evidence: _________________________"])
    flow += checkpoint(1, "Choose the observation batch",
                       "Find the record with a LEAF seal, TWO dots and the heading MILO. Keep its batch mark.",
                       ["Batch", "Seal", "Dots", "Heading", "Mark"],
                       CLASS_BATCHES,
                       [.16, .22, .16, .23, .23], width,
                       ["Correct batch", "Batch mark"],
                       "The matching batch tells you which footprint description to use.", batch_mode=True)
    flow += checkpoint(2, "Match the footprint record",
                       "Use the batch mark you found at Checkpoint 1. Read only its note below, then match all three details to a footprint card.",
                       ["Print", "Toes", "Heel", "Right notch", "Region"],
                       CLASS_FOOTPRINTS,
                       [.14, .14, .22, .24, .26], width,
                       ["Matching print", "Region"],
                       "Different roles now hold the remaining location conditions.", footprint_mode=True,
                       batch_notes=True)
    flow += checkpoint(3, "Share the location clues",
                       "Assign Reader, Observer and Checker one clue line each. Read them aloud; the Recorder circles the only zone matching all three.",
                       ["Zone", "Region", "Marker", "Flags"],
                       [["A", "RIDGE", "CIRCLE", "1"], ["B", "RIDGE", "TRIANGLE", "2"],
                        ["C", "RIDGE", "CIRCLE", "2"], ["D", "WOODS", "CIRCLE", "2"]],
                       [.18, .31, .32, .19], width,
                       ["Our zone", "Which cards support it"],
                       "Use your zone to sort the station's time strips.")
    heading = next(i for i, item in enumerate(flow) if getattr(item, 'text', '') == 'Share the location clues')
    flow[heading + 3:heading + 3] = role_cards([
        ("Observer", "Use the region from your footprint."),
        ("Reader", "The station has a CIRCLE marker."),
        ("Checker", "The station has TWO flags."),
    ], width)
    flow += checkpoint(4, "Put the time strips in order",
                       "Keep only strips for your zone. Put them in time order from earliest to latest. X belongs to a different zone.",
                       ["Strip", "Zone", "Time", "Event"],
                       [["R", "C", "09:30", "Supplies logged"], ["P", "C", "09:00", "Gate opened"],
                        ["X", "B", "09:20", "Other-zone signal"], ["S", "C", "09:45", "Camp signal received"],
                        ["Q", "C", "09:15", "Print checked"]],
                       [.15, .16, .20, .49], width,
                       ["Zone C strip order", "Time of camp signal"],
                       "The sorted log is your final evidence record.", strip_mode=True)
    flow += checkpoint(5, "Submit the station conclusion",
                       "Use the four rows on your record sheet. Choose the one report that agrees with every result, then explain at least TWO reasons.",
                       ["Report", "Batch", "Region", "Zone", "Order", "Signal"],
                       [["A", "R2", "RIDGE", "C", "P-Q-R-S", "09:45"], ["B", "R2", "RIDGE", "B", "P-Q-R-S", "09:45"],
                        ["C", "R1", "RIDGE", "C", "P-Q-R-S", "09:45"], ["D", "R2", "RIDGE", "C", "P-R-Q-S", "09:45"],
                        ["E", "R2", "RIDGE", "C", "P-Q-R-S", "09:20"]],
                       [.13, .14, .20, .13, .22, .18], width,
                       ["Matching report", "Two pieces of evidence"],
                       "The station records are clear again. Your teacher can share the thank-you note.")
    return flow


def guide(code, title, width, classroom):
    if classroom:
        answers = ["1. Batch B/R2: LEAF, two dots, MILO.",
                   "2. Use the R2 note. Print C/RIDGE: three toes, round heel, one right notch.",
                   "3. Zone C: RIDGE, CIRCLE marker, two flags.",
                   "4. P-Q-R-S, 09:45: only Zone C strips, earliest to latest. X is Zone B.",
                   "5. Report A: R2/RIDGE/C/P-Q-R-S/09:45 all match."]
        prompts = [
            ("Look at all three card details.", "Compare seal, dots and heading together.", "Batch B; give R2."),
            ("Find the note with your batch mark.", "R2 says three toes, round heel, one right notch.", "Print C; give RIDGE."),
            ("Let every role read a condition.", "Intersect RIDGE, CIRCLE and two flags.", "Zone C."),
            ("First remove the wrong zone.", "Order Zone C times from 09:00 to 09:45.", "P-Q-R-S; signal 09:45."),
            ("Use the whole record sheet.", "Compare every report field, not just one.", "Report A; explain two facts."),
        ]
        prepare = "Print one Group Player Pack per group and one Teacher Guide for yourself, in the same paper size. At Checkpoint 1, compare the four pictured batch cards in place or cut them first. At Checkpoint 2, children must use their batch mark to choose one note before comparing the four illustrated footprints; a teacher may cut those cards too. At Checkpoint 3, distribute the three bordered role cards or cover and reveal each in turn. Combine roles for smaller groups or rotate them for larger groups. Every group has its own complete clues. Give one checkpoint at a time."
        ending = "Confirm Report A and ask each group which fact from someone else's card helped them decide. Close with: 'The records are clear again. Milo's paper route to camp can now be followed.' Do not rank groups or collect names."
        chain = [("1", "R2", "Footprint description"), ("2", "RIDGE", "Zone selection"),
                 ("3", "Zone C", "Time-strip filter"), ("4", "P-Q-R-S / 09:45", "Final report"),
                 ("5", "Report A", "Station conclusion")]
    else:
        answers = ["1. Print A/SUN: three toes, round heel, one right notch.",
                   "2. Strips A-B-C/PINE SIGN: SUN-FERN-RIVER-PINE SIGN; D-E has no sign.",
                   "3. Paper pack B/code 4: PINE, two straps, triangle tag.",
                   "4. EAST/ROUND GATE: PINE plus code 4 selects one table row.",
                   "5. Camp A: SUN/PINE/EAST/ROUND all match; every other camp fails one field."]
        prompts = [
            ("Count toes and inspect the heel.", "Check the right notch as well.", "Print A; give SUN."),
            ("Join ending and starting words.", "Which SUN path reaches a SIGN?", "A-B-C; give PINE SIGN."),
            ("Let three players read their cards.", "Find PINE, two straps and triangle together.", "Pack B; give code 4."),
            ("Find the PINE rows first.", "Which PINE row has code 4?", "EAST and ROUND GATE."),
            ("Use all four recorded results.", "Eliminate wrong starts, signs, turns and gates.", "Camp A; explain two clues."),
        ]
        prepare = "Print one Player Pack per cooperating group and one Host Guide for the adult, in the same paper size. Keep this guide private. Give the cover first, then one checkpoint page at a time. At Checkpoint 1, compare the four illustrated paper footprints in place or let an adult cut the cards. At Checkpoint 2, place the useful route strips on the trail board or write their order. At Checkpoint 3, an adult may distribute the three bordered role cards; without scissors, cover and reveal each in turn. Everything can happen at a table."
        ending = "Confirm Camp A only after players name at least two supporting clues. Then hand over a simple paper note: 'Milo and the guide arrive at the welcoming camp. You used the footprint, route, shared supplies and signpost together. Thank you!'"
        chain = [("1", "SUN", "Route start"), ("2", "PINE SIGN", "Supply clue"),
                 ("3", "Code 4", "Signpost table"), ("4", "EAST / ROUND", "Camp choice"),
                 ("5", "Camp A", "Welcome ending")]

    role = "TEACHER GUIDE" if classroom else "HOST GUIDE"
    flow = [p(f"{code} / {role}", "eyebrow"), p(title, "title"),
            box("<b>Internal content and layout draft.</b> It has not been play-tested, print-approved or published. Do not sell it or enable public downloads.", width, CREAM),
            gap(15), p("Prepare the activity", "h2"), p(prepare),
            p("Pencils are the only required extra material. Use read-aloud or larger print when needed. No real outdoor route, supplies, living animals or specialist equipment are part of the game."),
            p("How one clue leads to the next", "h2"),
            grid(["Step", "Required result", "Used next for"], chain,
                 [width * .15, width * .39, width * .46]), PageBreak(),
            p("ANSWER KEY", "eyebrow"), p("Five connected checkpoints", "h1")]
    for answer in answers:
        flow.append(p(answer))
    flow += [gap(13), p("Final story hand-off", "h2"), p(ending),
             p("The answer comes from the printed clues; never improvise a second solution or add an unprinted required condition."),
             gap(14), DinosaurFinaleCard(width, classroom),
             PageBreak(), p("HINTS AND SKIPS", "eyebrow"), p("Keep the story moving", "h1"),
             p("For each step, offer an observation hint, then a reasoning hint, then the full solution. If a group skips, hand them the standard result shown in the answer key so later checkpoints remain solvable."),
             grid(["Step", "Observation", "Reasoning", "Full solution / hand-off"],
                  [[str(i), *row] for i, row in enumerate(prompts, 1)],
                  [width * .10, width * .27, width * .30, width * .33]), gap(16),
             p("Safety, privacy and publication check", "h2"),
             p("The creatures and traits are fictional and are not a factual science lesson. Do not ask players to collect plants, taste anything, travel outdoors, submit names or use a device. Check A4 and US Letter printing in colour and grey, then try the full pack with representative players. Record confusing clues, hint use, role participation, timing and any page defects. Revise this source and every output if a result is ambiguous."),
             box("<b>Release gate:</b> These PDFs remain internal drafts until human play-tests, physical print checks, accessibility, image rights, copy and product/legal review are recorded. The website catalog stays unpublished.", width, CREAM)]
    return flow


def validate_logic():
    assert [row[0] for row in CLASS_BATCHES if row[1:4] == ("LEAF", 2, "MILO")] == ["B"]
    assert [row[4] for row in CLASS_BATCHES if row[0] == "B"] == ["R2"]
    assert [row[1:] for row in CLASS_BATCH_NOTES if row[0] == "R2"] == [("3", "ROUND", "ONE")]
    selected_note = next(row for row in CLASS_BATCH_NOTES if row[0] == "R2")
    assert [row[0] for row in CLASS_FOOTPRINTS
            if (str(row[1]), row[2].upper(), "ONE" if row[3] else "NONE") == selected_note[1:]] == ["C"]
    assert [row[0] for row in HOME_FOOTPRINTS if row[1:4] == (3, "Round", 1)] == ["A"]
    assert [row[0] for row in CLASS_FOOTPRINTS if row[1:4] == (3, "Round", 1)] == ["C"]
    packs = [("A", "PINE", 1, "Triangle"), ("B", "PINE", 2, "Triangle"),
             ("C", "PINE", 2, "Circle"), ("D", "ROCK", 2, "Triangle")]
    assert [x[0] for x in packs if x[1:] == ("PINE", 2, "Triangle")] == ["B"]
    zones = [("A", "RIDGE", "CIRCLE", 1), ("B", "RIDGE", "TRIANGLE", 2),
             ("C", "RIDGE", "CIRCLE", 2), ("D", "WOODS", "CIRCLE", 2)]
    assert [x[0] for x in zones if x[1:] == ("RIDGE", "CIRCLE", 2)] == ["C"]
    assert sorted([("P", "09:00"), ("Q", "09:15"), ("R", "09:30"), ("S", "09:45")], key=lambda x: x[1])[-1] == ("S", "09:45")


def main():
    validate_logic()
    ART_THUMB.parent.mkdir(parents=True, exist_ok=True)
    with PillowImage.open(ART) as source:
        art = source.convert("RGB")
        art.thumbnail((528, 396))
        art.save(ART_THUMB, format="JPEG", quality=88, optimize=True)
    files = []
    for paper, size in [("A4", A4), ("Letter", letter)]:
        width = size[0] - 88
        specs = [
            ("H02", "player", home_player(width)),
            ("H02", "host", guide("H02", "The Little Dinosaur's Way Home", width, False)),
            ("C02", "player", class_player(width)),
            ("C02", "teacher", guide("C02", "The Dinosaur Research Station Mix-up", width, True)),
        ]
        for code, role, flow in specs:
            name = f"dinosaur-{code}-{role}-v0.1-{paper}.pdf"
            result = make_doc(name, size, f"{code} {role.title()}", paper, flow)
            files.append({"file": str(result.relative_to(ROOT).as_posix()),
                          "setting": "home" if code == "H02" else "classroom",
                          "role": role, "paper": paper, "pages": 6 if role == "player" else 3,
                          "bytes": result.stat().st_size,
                          "sha256": hashlib.sha256(result.read_bytes()).hexdigest(),
                          "status": "draft", "public": False})
            print(result)
    manifest = ROOT / "content" / "dinosaur-pdf-manifest.v0.1.json"
    manifest.write_text(json.dumps({"version": "0.1", "themeWorldId": "dinosaur",
                                    "published": False, "items": files}, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
