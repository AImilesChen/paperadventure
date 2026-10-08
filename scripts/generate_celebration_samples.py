"""Build the Celebration H01/C01 printable content drafts in A4 and US Letter.

These files are content and layout drafts. They are deliberately not registered as
published products or downloads in the application catalog.
"""

from pathlib import Path
import hashlib
import json
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable, HRFlowable, Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
CELEBRATION_HOME_ART = ROOT / "public" / "assets" / "celebration-home-v0.1.jpg"
CELEBRATION_CLASSROOM_ART = ROOT / "public" / "assets" / "celebration-classroom-v0.1.jpg"
HOME_ROUTE_CARDS = [
    ["D", "SUN", "POND"], ["B", "TREE", "BRIDGE"], ["A", "SUN", "TREE"],
    ["E", "POND", "CLOUD"], ["C", "BRIDGE", "RED FLAG"],
]
CLASS_ROUTE_CARDS = [
    ["D", "GATE", "GARDEN"], ["B", "LIBRARY", "TABLE"], ["A", "GATE", "LIBRARY"],
    ["E", "GARDEN", "SHED"], ["C", "TABLE", "WORKSHOP"],
]

BLUE = colors.HexColor("#DDF1FA")
NAVY = colors.HexColor("#153B56")
CORAL = colors.HexColor("#E94B35")
INK = colors.HexColor("#36546A")
PALE = colors.HexColor("#F7FBFD")
CREAM = colors.HexColor("#FFFDF9")
LINE = colors.HexColor("#BCD8E3")

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("ArialBold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Georgia", r"C:\Windows\Fonts\georgia.ttf"))

STYLES = {
    "eyebrow": ParagraphStyle("eyebrow", fontName="ArialBold", fontSize=8.5, leading=11, textColor=CORAL, spaceAfter=12),
    "title": ParagraphStyle("title", fontName="Georgia", fontSize=30, leading=36, textColor=NAVY, spaceAfter=15),
    "h1": ParagraphStyle("h1", fontName="Georgia", fontSize=23, leading=28, textColor=NAVY, spaceAfter=12),
    "h2": ParagraphStyle("h2", fontName="Georgia", fontSize=15.5, leading=20, textColor=NAVY, spaceAfter=9),
    "body": ParagraphStyle("body", fontName="Arial", fontSize=11.2, leading=17, textColor=INK, spaceAfter=10),
    "small": ParagraphStyle("small", fontName="Arial", fontSize=9.3, leading=14, textColor=INK, spaceAfter=7),
    "bold": ParagraphStyle("bold", fontName="ArialBold", fontSize=11, leading=16, textColor=NAVY, spaceAfter=9),
    "table": ParagraphStyle("table", fontName="Arial", fontSize=10.1, leading=14.5, textColor=INK),
    "table_head": ParagraphStyle("table_head", fontName="ArialBold", fontSize=9.4, leading=13, textColor=NAVY),
    "center": ParagraphStyle("center", fontName="ArialBold", fontSize=11, leading=16, alignment=TA_CENTER, textColor=NAVY),
}


def p(text, style="body"):
    return Paragraph(text, STYLES[style])


def gap(height=9):
    return Spacer(1, height)


def box(text, width, bg=PALE):
    t = Table([[p(text, "body")]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.8, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def grid(headers, rows, widths):
    data = [[p(str(cell), "table_head") for cell in headers]]
    data += [[p(str(cell), "table") for cell in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [CREAM, PALE]),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def role_cards(rows, width):
    """Three standalone clue panels that an adult can distribute or reveal in turn."""
    cards = []
    for role, clue in rows:
        card = Table([[p(f"<b>{role} / ROLE CLUE</b><br/>{clue}", "table")]], colWidths=[width])
        card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), CREAM),
            ("BOX", (0, 0), (-1, -1), 0.8, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 11),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
        ]))
        cards.extend([card, gap(7)])
    return cards


def strip_cards(headers, rows, width):
    """Print each route or matching row as a self-contained optional cut-out."""
    cards = []
    for row in rows:
        title = f"<b>{headers[0]} {row[0]}</b>"
        facts = " &nbsp; / &nbsp; ".join(f"<b>{label}:</b> {value}" for label, value in zip(headers[1:], row[1:]))
        card = Table([[p(f"{title}<br/>{facts}", "table")]], colWidths=[width])
        card.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), PALE),
            ("BOX", (0, 0), (-1, -1), 0.8, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 7),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ]))
        cards.extend([card, gap(5)])
    return cards


def write_line(label):
    return [p(f"<b>{label}</b> ____________________________________________", "body"), gap(3)]


def page_heading(number, title, story):
    return [p(f"CHECKPOINT {number:02d} / 05", "eyebrow"), p(title, "h1"), p(story), gap(8)]


def cover_art(path):
    art = Image(str(path), width=125, height=94)
    art.hAlign = "CENTER"
    return [gap(10), art, gap(5), p("Story-world illustration - the puzzle answers are in the printed clue tables.", "small")]


class BadgeTemplate(Flowable):
    """A grayscale-safe, optional cut-out reward with space for four discovered symbols."""

    def __init__(self):
        super().__init__()
        self.width = 210
        self.height = 164

    def draw(self):
        c = self.canv
        c.saveState()
        c.setStrokeColor(LINE)
        c.setLineWidth(0.8)
        c.rect(0, 0, self.width, self.height, fill=0, stroke=1)
        c.setFont("ArialBold", 8)
        c.setFillColor(INK)
        c.drawCentredString(self.width / 2, self.height - 17, "OUR ADVENTURE CLUB BADGE")
        x, y, radius = self.width / 2, 72, 61
        c.setStrokeColor(NAVY)
        c.circle(x, y, radius, fill=0, stroke=1)
        diagonal = radius * 0.7071
        c.line(x - diagonal, y - diagonal, x + diagonal, y + diagonal)
        c.line(x - diagonal, y + diagonal, x + diagonal, y - diagonal)
        for label, lx, ly in (
            ("TOP", x, y + 31), ("RIGHT", x + 30, y),
            ("BOTTOM", x, y - 35), ("LEFT", x - 30, y),
        ):
            c.setFont("Arial", 8.5)
            c.drawCentredString(lx, ly, label)
        c.restoreState()


class RouteAssemblyBoard(Flowable):
    """Three blank slots for placing route strips or writing their endpoints in order."""

    def __init__(self, width):
        super().__init__()
        self.width = width
        self.height = 88

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(INK)
        c.setFont("ArialBold", 8.5)
        c.drawString(0, 75, "YOUR ROUTE / PLACE OR NUMBER THREE STRIPS")
        gap_width = 10
        card_width = (self.width - 2 * gap_width) / 3
        for number in range(3):
            left = number * (card_width + gap_width)
            c.setStrokeColor(LINE)
            c.setLineWidth(0.8)
            c.rect(left, 0, card_width, 61, fill=0, stroke=1)
            c.setFillColor(NAVY)
            c.setFont("ArialBold", 9)
            c.drawString(left + 10, 46, f"SLOT {number + 1}")
            c.setFillColor(INK)
            c.setFont("Arial", 9)
            c.drawString(left + 10, 29, "FROM: __________________")
            c.drawString(left + 10, 13, "TO: _____________________")
        c.restoreState()


def on_page(canvas, doc):
    w, h = doc.pagesize
    canvas.saveState()
    canvas.setFillColor(BLUE)
    canvas.rect(0, h - 37, w, 37, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.setFont("ArialBold", 8)
    canvas.drawString(44, h - 23, "PAPER ADVENTURE WORKSHOP  /  CELEBRATION QUEST")
    canvas.setStrokeColor(LINE)
    canvas.line(44, 42, w - 44, 42)
    canvas.setFillColor(INK)
    canvas.setFont("Arial", 7.8)
    canvas.drawString(44, 28, f"{doc.product_code}  |  content draft v0.1  |  {doc.paper_label}")
    canvas.drawRightString(w - 44, 28, f"Page {doc.page}")
    canvas.setFillColor(CORAL)
    canvas.setFont("ArialBold", 7)
    canvas.drawRightString(w - 44, h - 23, "NOT PLAY-TESTED")
    canvas.restoreState()


def make_doc(filename, pagesize, code, paper_label, flow):
    path = OUT / filename
    doc = SimpleDocTemplate(
        str(path), pagesize=pagesize, leftMargin=44, rightMargin=44,
        topMargin=63, bottomMargin=57, title=f"{code} Celebration content draft",
        author="Paper Adventure Workshop - draft",
    )
    doc.product_code = code
    doc.paper_label = paper_label
    doc.build(flow, onFirstPage=on_page, onLaterPages=on_page)
    return path


def home_player(width):
    flow = [p("HOME / H01 / PLAYER PACK", "eyebrow"), p("The Missing Birthday Chest", "title"),
            box("<b>Dear explorers,</b><br/>Fenn the fox has safely tucked away a celebration surprise. It is not lost or stolen. Follow the five paper clues, share what you notice, and tell your grown-up which parcel should be delivered at the end.", width, CREAM),
            *cover_art(CELEBRATION_HOME_ART), gap(14), p("Your team trail", "h2"),
            grid(["Checkpoint", "Record what you discovered"], [
                ["1. Letter", "Letter ID and route start: ____________________"],
                ["2. Route", "Flag colour: ________________________________"],
                ["3. Label", "Label number: ______________________________"],
                ["4. Message", "Place word: _________________________________"],
                ["5. Finale", "Parcel ID: __________________________________"],
            ], [width * .29, width * .71]), gap(17),
            p("How to play", "h2"),
            p("Work together. Your grown-up hands out the checkpoint pages one at a time. Keep this trail page nearby. You need only a pencil and these printed pages; the final surprise can be a simple note in an envelope."),
            p("If a clue feels tricky, ask for a hint. No one needs to run, enter a hidden place, or use a special lock.", "small")]
    flow += [PageBreak()]

    flow += page_heading(1, "Find Fenn's letter", "Fenn's real envelope has a fox seal with two pointed ears and exactly three dots. Which letter came from Fenn?")
    flow += [grid(["Letter", "Seal", "Ears", "Dots", "Route start"], [
        ["A", "Fox", "2", "3", "SUN"], ["B", "Fox", "2", "2", "POND"], ["C", "Owl", "0", "3", "MOON"],
    ], [width*.18, width*.24, width*.13, width*.13, width*.32]), gap(19)]
    flow += write_line("The correct letter is") + write_line("Our route starts at")
    flow += [box("<b>Story clue:</b> The letter says: 'Begin at my route start. Join the route strips until you reach a flag. The flag will tell you which delivery labels matter.'", width), PageBreak()]

    flow += page_heading(2, "Repair the route", "Begin with the route start from Checkpoint 1. Join strips when one place ends where the next begins. One path reaches a flag; another ends without one.")
    flow += strip_cards(["Strip", "From", "To"], HOME_ROUTE_CARDS, width) + [p("Your adult may cut out the bordered strips; you can also number them directly on this page.", "small"), gap(8), RouteAssemblyBoard(width), gap(8)]
    flow += write_line("Our strip order is") + write_line("We reached the")
    flow += [box("<b>Story clue:</b> The flag marks the delivery labels to check. Keep the flag colour for the final choice.", width), PageBreak()]

    flow += page_heading(3, "Choose the delivery label", "Ask your grown-up for one clue card per explorer. Read all three aloud before your team chooses a label.")
    flow += role_cards([
        ["Courier", "The correct label uses the flag colour from the route."],
        ["Maker", "The correct label has exactly TWO stars."],
        ["Keeper", "The correct label number is FOUR."],
    ], width) + [p("Cut along the three card borders only with adult help; or cover and reveal each card in turn.", "small"), gap(8), grid(["Label", "Flag", "Stars", "Number"], [
        ["A", "RED", "2", "4"], ["B", "RED", "1", "4"],
        ["C", "BLUE", "2", "4"], ["D", "RED", "2", "5"],
    ], [width*.19, width*.28, width*.25, width*.28]), gap(15)]
    flow += write_line("Our label is") + write_line("Its number is")
    flow += [box("<b>Story clue:</b> Inside the correct label is a small code key. Your grown-up will hand out that key on the next page.", width), PageBreak()]

    flow += page_heading(4, "Read the hidden message", "Use the key found in your chosen label. Replace each picture-word with its letter, then read the five letters in order.")
    flow += [grid(["Picture-word", "Letter"], [
        ["SUN", "T"], ["CLOUD", "A"], ["FLAG", "B"], ["MOON", "L"], ["PATH", "E"],
    ], [width*.6, width*.4]), gap(15), box("<b>Fenn's coded note:</b><br/><br/>SUN &nbsp;&nbsp; CLOUD &nbsp;&nbsp; FLAG &nbsp;&nbsp; MOON &nbsp;&nbsp; PATH", width, CREAM), gap(18)]
    flow += write_line("The place word is")
    flow += [p("This is a story clue, not an instruction to search without your grown-up. The adult will either use an approved table or hand you the finale envelope.", "small"), PageBreak()]

    flow += page_heading(5, "Deliver the right parcel", "Bring together your route flag, label number, and decoded place word. Exactly one parcel card matches all three clues.")
    flow += strip_cards(["Parcel", "Flag", "Label number", "Place"], [
        ["A", "RED", "4", "TABLE"], ["B", "RED", "4", "SHELF"],
        ["C", "BLUE", "4", "TABLE"], ["D", "RED", "5", "TABLE"],
    ], width) + [p("Your grown-up may cut out the bordered parcel cards; you can also compare them on this page.", "small"), gap(10)]
    flow += write_line("The matching parcel is")
    flow += [box("<b>Tell your grown-up your parcel ID and explain your three clues.</b><br/>When they confirm it, open the celebration envelope together. Fenn says: 'You found the path by sharing what each explorer knew. That is the real treasure!'", width, CREAM), gap(15),
             p("Optional team note: Our best teamwork moment was _______________________________", "small")]
    return flow


def home_guide(width):
    flow = [p("HOME / H01 / HOST GUIDE", "eyebrow"), p("The Missing Birthday Chest", "title"),
            box("<b>Content draft for adult review.</b> This is a complete paper puzzle sequence, but it has not been play-tested or approved for public download. The 'treasure' can be a simple note in an envelope; a purchased gift or locked box is never required.", width, CREAM),
            gap(17), p("Prepare the activity", "h2"),
            p("Print one Player Pack for the group and one Host Guide for yourself, in the same paper size. Keep this guide and the answer table away from players. Give the cover/trail first, then one checkpoint page at a time. Provide pencils. Write an optional warm celebration message on a separate sheet and seal it in an envelope."),
            p("For Checkpoint 4, you can say the code key came from the chosen label. For Checkpoint 5, either keep the finale envelope in your hand or place it on an accessible table that you have checked. Do not send children to a private room or unsafe hiding place."),
            p("Print count: Player Pack 1 per cooperating group; Host Guide 1 per adult. At Checkpoint 2, optional bordered route strips can be cut out or numbered on the page. At Checkpoint 3, an adult may cut out the three role cards and hand out one per explorer, or cover and reveal them in turn. No cutting is required to solve the puzzle. A4 and US Letter files are exported separately."),
            gap(10), p("Story state at a glance", "h2"),
            grid(["Checkpoint", "Required result", "Used next for"], [
                ["1", "Letter A; SUN", "Route start"], ["2", "A-B-C; RED FLAG", "Label colour"],
                ["3", "Label A; number 4", "Code key and finale"], ["4", "TABLE", "Final parcel place"],
                ["5", "Parcel A", "Deliver finale envelope"],
            ], [width*.19, width*.37, width*.44]), PageBreak()]

    flow += [p("Answer key and checks", "eyebrow"), p("Five connected checkpoints", "h1"),
             p("1. <b>Letter A.</b> It is the only fox seal with two ears and three dots. Its start word is SUN. B has two dots; C is an owl."),
             p("2. <b>A-B-C -> RED FLAG.</b> A ends at TREE, B begins there and ends at BRIDGE, C reaches RED FLAG. D-E reaches CLOUD but no flag. Record RED."),
             p("3. <b>Label A, number 4.</b> The route gives RED; the Maker requires 2 stars; the Keeper requires 4. Each other label fails exactly one condition."),
             p("4. <b>TABLE.</b> SUN=T, CLOUD=A, FLAG=B, MOON=L, PATH=E. The coded row uses that exact order."),
             p("5. <b>Parcel A.</b> It alone matches RED, 4, and TABLE. B fails the place; C fails the flag; D fails the number. Deliver the prepared envelope only after the group explains all three."),
             gap(9), p("Hint ladder", "h2"),
             grid(["Stage", "First hint", "Stronger hint"], [
                 ["1", "Count the dots and check the animal.", "Which fox has three dots?"],
                 ["2", "Start where your letter says. Match place names.", "One SUN route reaches RED FLAG; the other stops at CLOUD."],
                 ["3", "Listen to all three explorers.", "Compare RED, two stars, and number 4 together."],
                 ["4", "Trade each picture-word for one letter.", "The first two letters are T and A."],
                 ["5", "Read your trail page again.", "Find the one card with RED, 4, and TABLE."],
             ], [width*.13, width*.42, width*.45]), PageBreak()]

    flow += [p("Before you play", "eyebrow"), p("Adult safety and quality check", "h1"),
             p("<b>Adult supervision:</b> This is a paper-based story game. Confirm the group's reading needs and real space. Do not place materials where reaching, climbing, running, or touching private belongings is required. The story's TABLE word may remain fictional; you may hand over the envelope."),
             p("<b>Flexible occasion:</b> The source PRD uses a birthday chest, but this draft can be introduced as a general celebration. Do not assume a child's name, exact age, or personal occasion. Add such details only if the adult chooses them."),
             p("<b>When players struggle:</b> Offer the first hint, then the stronger hint. Keep the previous solved page visible. If a group guesses the final card, ask them to explain the flag, number, and place before the reveal."),
             p("<b>Draft QA:</b> Check that each page prints within margins, that the stage order is preserved, and that the adult guide stays separate from player copies. At Checkpoint 5, the adult may cut the parcel cards or leave them on the page. Record any ambiguous instruction or wrong answer during a representative play session before publishing."),
             box("<b>Publication status:</b> NOT PLAY-TESTED. Do not call this a finished free sample, sell it, or enable downloads from the site until content, printing, accessibility, and legal/product checks pass.", width, CREAM)]
    return flow


def class_player(width):
    flow = [p("CLASSROOM / C01 / PLAYER PACK", "eyebrow"), p("The Adventure Club's First Badge", "title"),
            box("<b>Welcome, explorer team!</b><br/>The Adventure Club has left five paper clues. Your group will find the right invitation, follow a route, compare everyone's information, decode a badge pattern, and make one shared team badge.", width, CREAM),
            gap(18), p("Your team record", "h2"),
            grid(["Checkpoint", "What our group found"], [
                ["1. Invitation", "Card ID and start: _________________________"],
                ["2. Route", "Destination: ______________________________"],
                ["3. Equipment", "Card ID and code: _________________________"],
                ["4. Pattern", "Four symbols: _____________________________"],
                ["5. Badge", "Badge plan ID: ___________________________"],
            ], [width*.31, width*.69]), gap(16),
            p("Work as one group", "h2"), p("Take turns as Reader, Spotter, Recorder and Checker. If your group has fewer than four people, combine roles. Every group has all the clues it needs; you do not need another group's answer."),
            p("Use a pencil. Your teacher gives one checkpoint page at a time. Ask for a hint when needed. A team name is optional; do not write private information on the badge.", "small")]
    flow += cover_art(CELEBRATION_CLASSROOM_ART) + [PageBreak()]

    flow += page_heading(1, "Find the club invitation", "The correct club invitation has a COMPASS seal and exactly TWO stars. Which card should your group open?")
    flow += [grid(["Card", "Seal", "Stars", "Route start"], [
        ["A", "COMPASS", "1", "GARDEN"], ["B", "COMPASS", "2", "GATE"],
        ["C", "STAR", "2", "LIBRARY"],
    ], [width*.18, width*.37, width*.17, width*.28]), gap(18)]
    flow += write_line("Our invitation is") + write_line("Our route starts at")
    flow += [box("<b>Club message:</b> 'Begin at the route start on your invitation. Keep joining strips until you reach the WORKSHOP. Your route will tell you where the club keeps its equipment clues.'", width), PageBreak()]

    flow += page_heading(2, "Follow the team route", "Start where your invitation says. A strip may join another when its ending place is the next strip's starting place. Find the chain that reaches the WORKSHOP.")
    flow += strip_cards(["Strip", "From", "To"], CLASS_ROUTE_CARDS, width) + [p("Your teacher may cut out the bordered strips; your group can also number them on this page.", "small"), gap(8), RouteAssemblyBoard(width), gap(8)]
    flow += write_line("Our strip order is") + write_line("Our destination is")
    flow += [box("<b>Club message:</b> 'At the WORKSHOP, compare all the role notes before choosing a piece of equipment. Everyone's clue matters.'", width), PageBreak()]

    flow += page_heading(3, "Compare the role clues", "Your teacher gives one clue card to each role, or reveals them in turn. Combine all three conditions to choose one equipment card.")
    flow += role_cards([
        ["Reader", "The card is BLUE."], ["Spotter", "The card has exactly TWO dots."],
        ["Checker", "The shape on the card is a TRIANGLE."],
    ], width) + [p("Only the teacher cuts cards. Groups can also take turns reading covered cards.", "small"), gap(8), grid(["Card", "Colour", "Dots", "Shape"], [
        ["A", "BLUE", "2", "TRIANGLE"], ["B", "BLUE", "1", "TRIANGLE"],
        ["C", "RED", "2", "TRIANGLE"], ["D", "BLUE", "2", "CIRCLE"],
    ], [width*.16, width*.25, width*.2, width*.39]), gap(15)]
    flow += write_line("Our equipment card is")
    flow += [box("<b>Club message:</b> 'The chosen card contains the badge code 2 - 4 - 1 - 3. Use it on the next page to arrange the four badge symbols.'", width), PageBreak()]

    flow += page_heading(4, "Build the badge pattern", "Each number names a symbol. Use the code from your equipment card to write the four symbols in order, starting at the TOP of the badge and going clockwise.")
    flow += [grid(["Tile number", "Symbol"], [
        ["1", "STAR"], ["2", "COMPASS"], ["3", "HANDS"], ["4", "BOOK"],
    ], [width*.4, width*.6]), gap(15), box("<b>Code on the chosen card:</b> 2 - 4 - 1 - 3", width, CREAM), gap(15)]
    flow += write_line("Top") + write_line("Right") + write_line("Bottom") + write_line("Left")
    flow += [p("Say the four symbols aloud. The team badge has one symbol in each position; colour alone is not needed to solve this clue.", "small"), PageBreak()]

    flow += page_heading(5, "Choose and make your badge", "A valid badge plan must match your route destination, equipment card, and four-symbol order. Which plan fits all three discoveries?")
    flow += [grid(["Plan", "Place", "Equipment", "Top / right / bottom / left"], [
        ["A", "WORKSHOP", "A", "COMPASS / BOOK / STAR / HANDS"],
        ["B", "WORKSHOP", "A", "COMPASS / STAR / BOOK / HANDS"],
        ["C", "GARDEN", "A", "COMPASS / BOOK / STAR / HANDS"],
        ["D", "WORKSHOP", "B", "COMPASS / BOOK / STAR / HANDS"],
    ], [width*.13, width*.24, width*.2, width*.43]), gap(14)]
    flow += write_line("Our badge plan is")
    flow += [p("Copy your four discovered symbols onto the paper badge. You may draw them or write their names; leave the team name blank if you prefer.", "small"),
             BadgeTemplate(), gap(8), p("Optional team name: ______________________________________________", "small"),
             p("You can use the badge on this page or ask your teacher to cut around its rectangular border. Show your plan and explain how each earlier clue helped. When every group is ready, celebrate the new Adventure Club together.", "small")]
    return flow


def class_guide(width):
    flow = [p("CLASSROOM / C01 / TEACHER GUIDE", "eyebrow"), p("The Adventure Club's First Badge", "title"),
            box("<b>Content draft for teacher review.</b> This is a complete independent-group paper sequence, not a tested classroom product. No student names, birthdays, login accounts or school records are needed.", width, CREAM),
            gap(16), p("Set up each group", "h2"),
            p("Print one full Player Pack for each group and one Teacher Guide for yourself. Each group gets the same five checkpoint pages and can solve without waiting for another group. Give the cover first, then release one checkpoint page at a time. Provide pencils. At Checkpoint 2, optional bordered route strips can be cut out or numbered in place. At Checkpoint 3, the teacher may cut the three role cards for each group, or cover and reveal them in turn. No special box, phone or online tool is required."),
            p("Roles: Reader reads directions; Spotter checks attributes; Recorder writes the group record; Checker asks whether every clue was used. Combine or rotate roles for different group sizes. If a group finishes early, ask where it used another person's clue rather than giving extra required work."),
            p("Use the invitation story as a cooperative club celebration, not an individual birthday. A student may leave the optional team name blank. Collect or recycle sheets according to your normal classroom practice."),
            gap(9), p("Story state at a glance", "h2"),
            grid(["Checkpoint", "Required result", "Used next for"], [
                ["1", "Invitation B; GATE", "Route start"], ["2", "A-B-C; WORKSHOP", "Equipment location"],
                ["3", "Equipment A; 2-4-1-3", "Badge pattern"],
                ["4", "COMPASS / BOOK / STAR / HANDS", "Final plan"],
                ["5", "Plan A", "Shared badge and debrief"],
            ], [width*.19, width*.45, width*.36]), PageBreak()]

    flow += [p("ANSWER KEY", "eyebrow"), p("Five independent group checkpoints", "h1"),
             p("1. <b>Invitation B.</b> It alone has the COMPASS seal and two stars; its route start is GATE."),
             p("2. <b>A-B-C -> WORKSHOP.</b> GATE to LIBRARY to TABLE to WORKSHOP. D-E stops at SHED."),
             p("3. <b>Equipment A.</b> BLUE, two dots, TRIANGLE. B fails dots, C fails colour, D fails shape. The code on A is 2-4-1-3."),
             p("4. <b>COMPASS / BOOK / STAR / HANDS.</b> Tile numbers 2, 4, 1, 3 map to those symbols. Positions are top, right, bottom, left."),
             p("5. <b>Plan A.</b> It is the only plan with WORKSHOP, equipment A and the exact four-symbol sequence. B changes order, C changes place, D changes equipment."),
             gap(9), p("Hint ladder", "h2"),
             grid(["Stage", "First hint", "Stronger hint"], [
                 ["1", "Look at the seal AND the star count.", "Which COMPASS card has two stars?"],
                 ["2", "Join matching end and start places.", "Begin at GATE; one path reaches WORKSHOP."],
                 ["3", "Ask each role to read one condition.", "Compare BLUE, two dots and TRIANGLE together."],
                 ["4", "Find each number in the tile legend.", "2 is COMPASS; 4 is BOOK."],
                 ["5", "Use all three lines on your group record.", "Find WORKSHOP, card A and the exact symbol order."],
             ], [width*.13, width*.42, width*.45]), PageBreak()]

    flow += [p("TEACHER CHECK", "eyebrow"), p("Run and review the activity", "h1"),
             p("<b>Starting demonstration:</b> Read the club introduction aloud and model one harmless attribute comparison without revealing the correct invitation. Explain that each group may ask for a hint and should keep its record sheet visible."),
             p("<b>Group independence:</b> Every required clue is in that group's own packet. Do not require a student to visit another group, use a phone, read a private class list, or wait for a unique shared prop. Give an oral read-aloud or larger print if needed."),
             p("<b>Ending:</b> Ask each group to explain one point where listening to another role changed its choice. Confirm Plan A, invite groups to fill the badge on the page, and close the story with a shared Adventure Club welcome. The teacher may cut around its outer border if a separate badge is wanted; children do not need scissors. No score or ranking is needed."),
             p("<b>Draft QA:</b> Try the full packet with representative learners and a teacher. Record time, ambiguous wording, accessibility barriers, group-size issues, and print defects. Recheck the answer key and all pages after edits. Do not describe this draft as curriculum-aligned or classroom-tested."),
             box("<b>Publication status:</b> NOT PLAY-TESTED. Do not call this a finished free sample, sell it, or enable site downloads until content, printing, accessibility, school/privacy and legal/product checks pass.", width, CREAM)]
    return flow


def routes_to(rows, start, destination):
    paths = []
    def walk(node, used):
        if node == destination:
            paths.append(used)
            return
        for card_id, source, target in rows:
            if source == node and card_id not in used:
                walk(target, used + [card_id])
    walk(start, [])
    return paths


def validate_logic():
    assert routes_to(HOME_ROUTE_CARDS, "SUN", "RED FLAG") == [["A", "B", "C"]]
    assert routes_to(CLASS_ROUTE_CARDS, "GATE", "WORKSHOP") == [["A", "B", "C"]]
    home_labels = [("A", "RED", 2, 4), ("B", "RED", 1, 4), ("C", "BLUE", 2, 4), ("D", "RED", 2, 5)]
    assert [x[0] for x in home_labels if x[1:] == ("RED", 2, 4)] == ["A"]
    assert "".join({"SUN":"T", "CLOUD":"A", "FLAG":"B", "MOON":"L", "PATH":"E"}[s] for s in ["SUN","CLOUD","FLAG","MOON","PATH"]) == "TABLE"
    class_equipment = [("A","BLUE",2,"TRIANGLE"),("B","BLUE",1,"TRIANGLE"),("C","RED",2,"TRIANGLE"),("D","BLUE",2,"CIRCLE")]
    assert [x[0] for x in class_equipment if x[1:] == ("BLUE", 2, "TRIANGLE")] == ["A"]
    assert [ {1:"STAR",2:"COMPASS",3:"HANDS",4:"BOOK"}[n] for n in [2,4,1,3] ] == ["COMPASS","BOOK","STAR","HANDS"]


def main():
    validate_logic()
    manifest_items = []
    for label, size in [("A4", A4), ("Letter", letter)]:
        width = size[0] - 88
        files = [
            (f"celebration-H01-player-v0.1-{label}.pdf", "H01 Player Pack", home_player(width)),
            (f"celebration-H01-host-v0.1-{label}.pdf", "H01 Host Guide", home_guide(width)),
            (f"celebration-C01-player-v0.1-{label}.pdf", "C01 Player Pack", class_player(width)),
            (f"celebration-C01-teacher-v0.1-{label}.pdf", "C01 Teacher Guide", class_guide(width)),
        ]
        for name, code, flow in files:
            result = make_doc(name, size, code, label, flow)
            manifest_items.append({
                "file": str(result.relative_to(ROOT).as_posix()),
                "setting": "home" if "H01" in name else "classroom",
                "role": "player" if "-player-" in name else ("host" if "-host-" in name else "teacher"),
                "paper": label,
                "pages": 6 if "-player-" in name else 3,
                "bytes": result.stat().st_size,
                "sha256": hashlib.sha256(result.read_bytes()).hexdigest(),
                "status": "draft",
                "public": False,
            })
            print(result)
    manifest_path = ROOT / "content" / "celebration-pdf-manifest.v0.1.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps({
        "version": "0.1", "themeWorldId": "celebration", "candidateFreeSample": True,
        "publishedFreeSample": False, "items": manifest_items,
    }, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
