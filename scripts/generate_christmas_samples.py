"""Build internal Christmas H06 and neutral winter C06 paper-game drafts."""

from pathlib import Path
from copy import deepcopy
from math import cos, pi, sin
from reportlab.lib import colors
from reportlab.platypus import Flowable
from generate_space_samples import render_drafts


ROOT = Path(__file__).resolve().parents[1]


def draw_paper_symbol(c, symbol, x, y):
    """Draw the same simple shape named by each Christmas/Winter clue card."""
    c.setStrokeColor(colors.HexColor("#153B56"))
    c.setLineWidth(1.2)
    if symbol == "Round":
        c.circle(x, y, 18, fill=0, stroke=1)
    elif symbol == "Square":
        c.rect(x - 17, y - 17, 34, 34, fill=0, stroke=1)
    elif symbol == "Triangle":
        path = c.beginPath()
        path.moveTo(x, y + 21)
        path.lineTo(x - 21, y - 17)
        path.lineTo(x + 21, y - 17)
        path.close()
        c.drawPath(path, fill=0, stroke=1)
    elif symbol == "BOOK":
        c.rect(x - 21, y - 15, 42, 29, fill=0, stroke=1)
        c.line(x, y - 15, x, y + 14)
        c.line(x - 16, y + 8, x - 5, y + 8)
        c.line(x + 5, y + 8, x + 16, y + 8)
    elif symbol == "STAR":
        path = c.beginPath()
        for point in range(10):
            angle = pi / 2 + point * pi / 5
            radius = 21 if point % 2 == 0 else 9
            px, py = x + radius * cos(angle), y + radius * sin(angle)
            (path.moveTo if point == 0 else path.lineTo)(px, py)
        path.close()
        c.drawPath(path, fill=0, stroke=1)
    elif symbol == "BELL":
        path = c.beginPath()
        path.moveTo(x - 18, y - 13)
        path.curveTo(x - 11, y - 6, x - 14, y + 13, x, y + 15)
        path.curveTo(x + 14, y + 13, x + 11, y - 6, x + 18, y - 13)
        path.close()
        c.drawPath(path, fill=0, stroke=1)
        c.line(x - 20, y - 13, x + 20, y - 13)
        c.circle(x, y - 18, 3, fill=0, stroke=1)


class BatchLabelCards(Flowable):
    """Four first-checkpoint labels with pictured frame/count/print clues."""

    def __init__(self, width, rows, setting):
        super().__init__()
        self.width = width
        self.height = 193
        self.rows = rows
        self.setting = setting

    @staticmethod
    def snowflake(c, x, y):
        for angle in (0, pi / 3, 2 * pi / 3):
            dx, dy = 17 * cos(angle), 17 * sin(angle)
            c.line(x - dx, y - dy, x + dx, y + dy)
            for sign in (-1, 1):
                ex, ey = x + sign * dx, y + sign * dy
                branch_angle = angle + (pi / 6 if sign > 0 else -pi / 6)
                c.line(ex - sign * 5 * cos(branch_angle), ey - sign * 5 * sin(branch_angle), ex, ey)

    @staticmethod
    def leaf(c, x, y):
        outline = c.beginPath()
        outline.moveTo(x - 17, y - 11)
        outline.curveTo(x - 13, y + 14, x + 10, y + 18, x + 17, y + 10)
        outline.curveTo(x + 10, y - 10, x - 7, y - 16, x - 17, y - 11)
        outline.close()
        c.drawPath(outline, fill=0, stroke=1)
        c.line(x - 15, y - 10, x + 12, y + 9)

    @staticmethod
    def moon(c, x, y):
        outline = c.beginPath()
        outline.moveTo(x + 7, y + 10)
        outline.curveTo(x - 10, y + 11, x - 10, y - 10, x + 7, y - 11)
        outline.curveTo(x - 2, y - 5, x - 2, y + 5, x + 7, y + 10)
        outline.close()
        c.drawPath(outline, fill=0, stroke=1)

    def draw(self):
        c = self.canv
        c.saveState()
        gutter = 10
        card_width = (self.width - gutter) / 2
        card_height = 91
        for index, row in enumerate(self.rows):
            x = (index % 2) * (card_width + gutter)
            y = (1 - index // 2) * (card_height + gutter)
            c.setStrokeColor(colors.HexColor("#8BAFC1"))
            c.setLineWidth(.9)
            c.roundRect(x, y, card_width, card_height, 6, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#153B56"))
            c.setFont("ArialBold", 8.8)
            c.drawString(x + 9, y + 75, f"LABEL {row[0]}")
            c.setStrokeColor(colors.HexColor("#153B56"))
            c.setLineWidth(1.2)
            cx, cy = x + 33, y + 42
            if self.setting == "home":
                _, frame, count, mark, batch = row
                (self.snowflake if frame == "Snowflake" else self.leaf)(c, cx, cy)
                for dot in range(int(count)):
                    c.circle(x + 58 + dot * 12, cy + 14, 2.7, fill=0, stroke=1)
                if mark == "Star":
                    draw_paper_symbol(c, "STAR", x + 66, cy - 14)
                else:
                    self.moon(c, x + 66, cy - 14)
                labels = (f"FRAME  {frame.upper()}", f"DOTS  {count}", f"PRINT  {mark.upper()}", f"BATCH  {batch}")
            else:
                _, frame, count, word, batch = row
                if frame == "Square":
                    c.rect(cx - 20, cy - 20, 40, 40, fill=0, stroke=1)
                else:
                    c.circle(cx, cy, 20, fill=0, stroke=1)
                for line in range(int(count)):
                    c.line(cx - 11, cy + 6 - line * 11, cx + 11, cy + 6 - line * 11)
                if word == "SNOW":
                    self.snowflake(c, x + 67, cy - 4)
                else:
                    self.leaf(c, x + 67, cy - 4)
                labels = (f"FRAME  {frame.upper()}", f"LINES  {count}", f"WORD  {word}", f"BATCH  {batch}")
            c.setFillColor(colors.HexColor("#36546A"))
            c.setFont("ArialBold", 8.2)
            for line, label in enumerate(labels):
                c.drawString(x + 88, y + 57 - line * 15, label)
        c.restoreState()


class PictureItemCards(Flowable):
    """Four independent story item cards with visual and printed clue labels."""

    def __init__(self, width, rows, kind):
        super().__init__()
        self.width = width
        self.height = 222
        self.rows = rows
        self.kind = kind

    def draw(self):
        c = self.canv
        c.saveState()
        card_width = (self.width - 10) / 2
        for index, (label, batch, symbol) in enumerate(self.rows):
            x = index % 2 * (card_width + 10)
            y = 112 if index < 2 else 0
            c.setStrokeColor(colors.HexColor("#8BAFC1"))
            c.rect(x, y, card_width, 104, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#153B56"))
            c.setFont("ArialBold", 9)
            c.drawString(x + 10, y + 87, f"{self.kind} {label}")
            draw_paper_symbol(c, symbol, x + 36, y + 46)
            c.setFillColor(colors.HexColor("#36546A"))
            c.setFont("Arial", 9)
            c.drawString(x + 73, y + 61, f"Batch: {batch}")
            c.drawString(x + 73, y + 39, f"{'Shape' if self.kind == 'GIFT' else 'Icon'}: {symbol.upper()}")
        c.restoreState()


class DestinationMatchCards(Flowable):
    """Three paper destination cards that can be paired with the item cards."""

    def __init__(self, width, destinations):
        super().__init__()
        self.width = width
        self.height = 112
        self.destinations = destinations

    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(colors.HexColor("#153B56"))
        c.setFont("ArialBold", 8.8)
        c.drawString(0, 100, "PAPER DESTINATIONS / MATCH ONE ITEM TO EACH PLACE")
        gutter = 9
        card_width = (self.width - 2 * gutter) / 3
        for index, (place, symbol) in enumerate(self.destinations):
            x = index * (card_width + gutter)
            c.setStrokeColor(colors.HexColor("#8BAFC1"))
            c.rect(x, 0, card_width, 88, fill=0, stroke=1)
            c.setFillColor(colors.HexColor("#153B56"))
            c.setFont("ArialBold", 8.3)
            c.drawCentredString(x + card_width / 2, 70, place)
            draw_paper_symbol(c, symbol, x + card_width / 2, 41)
            c.setFillColor(colors.HexColor("#36546A"))
            c.setFont("Arial", 8.3)
            c.drawCentredString(x + card_width / 2, 11, f"MATCH: {symbol.upper()}")
        c.restoreState()


class OrderChoiceCards(Flowable):
    """Four independent three-slot orders; the role-held rule stays off the cards."""

    def __init__(self, width, rows, setting):
        super().__init__()
        self.width = width
        self.height = 193
        self.rows = rows
        self.setting = setting

    def draw(self):
        c = self.canv
        c.saveState()
        gutter = 10
        card_width = (self.width - gutter) / 2
        card_height = 91
        navy = colors.HexColor("#153B56")
        ink = colors.HexColor("#36546A")
        for index, (label, first, second, third) in enumerate(self.rows):
            x = (index % 2) * (card_width + gutter)
            y = (1 - index // 2) * (card_height + gutter)
            c.setStrokeColor(colors.HexColor("#8BAFC1"))
            c.setLineWidth(.9)
            c.roundRect(x, y, card_width, card_height, 6, fill=0, stroke=1)
            c.setFillColor(navy)
            c.setFont("ArialBold", 8.8)
            c.drawString(x + 9, y + 75, f"{'ROUTE' if self.setting == 'home' else 'LOAD'} {label}  /  PAPER ORDER")
            sequence = (first, second, third)
            centers = (x + 43, x + card_width / 2, x + card_width - 43)
            for slot, (value, center) in enumerate(zip(sequence, centers)):
                if self.setting == "home":
                    c.setStrokeColor(navy)
                    c.setLineWidth(1.2)
                    c.roundRect(center - 18, y + 27, 36, 32, 4, fill=0, stroke=1)
                    c.setFont("ArialBold", 11)
                    c.drawCentredString(center, y + 37, value)
                    caption = f"GIFT {value}"
                else:
                    draw_paper_symbol(c, value, center, y + 44)
                    caption = value
                c.setFillColor(ink)
                c.setFont("ArialBold", 8.1)
                c.drawCentredString(center, y + 12, caption)
                if slot < 2:
                    arrow_x = (center + centers[slot + 1]) / 2
                    c.setStrokeColor(navy)
                    c.line(arrow_x - 5, y + 44, arrow_x + 5, y + 44)
                    c.line(arrow_x + 5, y + 44, arrow_x + 1, y + 48)
                    c.line(arrow_x + 5, y + 44, arrow_x + 1, y + 40)
        c.restoreState()


class DeliveryReplyCard(Flowable):
    """Adult-held story reply without a real gift or journey."""

    def __init__(self, width, classroom, variant_id=None):
        super().__init__()
        self.width = width
        self.height = 113
        self.classroom = classroom
        self.variant_id = variant_id

    def draw(self):
        c = self.canv
        c.saveState()
        c.setStrokeColor(colors.HexColor("#8BAFC1"))
        c.setLineWidth(0.9)
        c.roundRect(0, 0, self.width, self.height, 6, fill=0, stroke=1)
        c.setFillColor(colors.HexColor("#153B56"))
        c.setFont("ArialBold", 8.5)
        if self.classroom and self.variant_id == "christmas":
            title = "CHRISTMAS CREW REPLY  /  SHARE AFTER MANIFEST A"
            lines = [
                "To the paper sorting crew,",
                "T2 and STAR-BELL-BOOK made a careful loading order.",
                "Route R1 carries the READY mark for this Christmas paper story.",
                "Thank you for checking every picture and destination!",
                "From the Christmas paper station guide",
            ]
        elif self.classroom:
            title = "WINTER STATION REPLY  /  SHARE AFTER MANIFEST A"
            lines = [
                "To the paper sorting crew,",
                "T2 and STAR-BELL-BOOK made a careful loading order.",
                "Route R1 carries the READY mark on your paper manifest.",
                "Thank you for checking every picture and destination!",
                "From the winter station guide",
            ]
        else:
            title = "DELIVERY OFFICE REPLY  /  GIVE AFTER CARD A"
            lines = [
                "Dear paper explorers,",
                "Your FOX-OWL-RABBIT route ended at RABBIT GATE.",
                "Every story friend now has a matching picture card.",
                "Thank you for checking the paper list together!",
                "From the story delivery office",
            ]
        c.drawString(12, 96, title)
        c.setFillColor(colors.HexColor("#36546A"))
        c.setFont("Arial", 8.6)
        for index, line in enumerate(lines):
            c.drawString(14, 79 - index * 15, line)
        c.restoreState()


def step(title, story, heads, rows, answer, handoff, used, prompts, next_story, hints, extra=None):
    item = {"title": title, "story": story, "heads": heads, "rows": rows,
            "answer": answer, "handoff": handoff, "used": used,
            "prompts": prompts, "next": next_story, "hints": hints}
    if extra:
        item["extra"] = extra
    return item


HOME = {
    "code": "H06", "title": "The Christmas Delivery Office", "role": "HOST GUIDE",
    "intro": "The story delivery office has mixed up its last paper list. Match pretend gift cards with story destinations and find the final thank-you note. No one needs to buy, exchange or wrap a real gift.",
    "record": ["Label and batch", "Three gift-to-place pairs", "Three-stop paper route", "Last place and message", "Final delivery card and evidence"],
    "prepare": "Print one Player Pack per cooperating group and one private Host Guide in the same size. Give the cover first, then each checkpoint in order. At Checkpoint 2, an adult may cut out the four picture gift cards and three destination cards; players can also draw matches on the intact page. A pencil is the only required extra. All cards, places and gifts are fictional paper props, not invitations to travel or shop.",
    "ending": "After players select Delivery Card A and explain two clues, read: 'The messenger finished the paper route. Every story friend has a matching picture card. Thank you for checking the list together.' Any family reward is an adult's optional separate choice.",
    "steps": [
        step("Choose the right list", "The task label has a SNOWFLAKE frame, TWO round dots and a STAR print. Match every property.",
             ["Card", "Frame", "Dots", "Print", "Batch"],
             [["A", "Snowflake", "2", "Star", "B3"], ["B", "Snowflake", "1", "Star", "B2"], ["C", "Leaf", "2", "Star", "B4"], ["D", "Snowflake", "2", "Moon", "B5"]],
             "Card A; B3", "B3", "Gift-card batch filter", ["Matching label", "Batch mark"],
             "Use only gift cards from the chosen batch.",
             ["Check frame, dots and print.", "All three details must match together.", "Card A; give B3."]),
        step("Match the picture gifts", "Use only your batch. Owl wants the ROUND picture at OWL WINDOW; Fox wants the SQUARE picture at FOX DEN; Rabbit wants the TRIANGLE picture at RABBIT GATE. These are imaginary characters.",
             ["Gift", "Batch", "Picture shape"],
             [["A", "B3", "Round"], ["D", "B2", "Round"], ["C", "B3", "Triangle"], ["B", "B3", "Square"]],
             "A-Owl, B-Fox, C-Rabbit", "OWL / FOX / RABBIT places", "Three route stops", ["Gift-to-place pairs", "Three places"],
             "All three places must appear exactly once in the paper route.",
             ["First remove the wrong batch.", "Match each shape to the stated character and place.", "A-Owl, B-Fox, C-Rabbit; keep their places."],
             "Destination cards: OWL WINDOW / FOX DEN / RABBIT GATE"),
        step("Share the route conditions", "Use your gift-to-place pairs from Checkpoint 2. Guide: FOX DEN comes BEFORE OWL WINDOW. Clock: RABBIT GATE is LAST. Map: visit the three places once. Put the gift LETTERS in route order.",
             ["Route", "First gift", "Second gift", "Last gift"],
             [["A", "A", "B", "C"], ["B", "B", "A", "C"], ["C", "B", "C", "A"], ["D", "C", "B", "A"]],
             "Route B; FOX-OWL-RABBIT", "FOX-OWL-RABBIT / RABBIT GATE", "Last-stop paper envelope", ["Matching route", "Last story place"],
             "Only the last place has the coded paper thank-you note.",
             ["Use the three gift-to-place pairs first.", "Rabbit's gift is last and Fox's gift comes before Owl's.", "Route B: gifts B-A-C; give FOX-OWL-RABBIT."]),
        step("Read the final paper note", "Find the envelope for the LAST place on your route. Use the printed dictionary in order; the note is pretend and no one needs to go anywhere.",
             ["Envelope", "Paper code", "Note state"],
             [["FOX DEN", "--", "Blank"], ["RABBIT GATE", "TREE / STAR / MOON", "Coded"], ["OWL WINDOW", "--", "Blank"]],
             "RABBIT GATE; GO!", "RABBIT GATE / GO!", "Final delivery record", ["Last place", "Decoded note"],
             "Use both last place and note on the final delivery card.",
             ["Choose the route's final place.", "Replace TREE, STAR, MOON without sorting them.", "RABBIT GATE; give GO!."],
             "Dictionary: TREE = G / STAR = O / MOON = !"),
        step("Check the final delivery", "Compare batch, route order, last place and note. Circle the only card matching all four and tell your grown-up two reasons.",
             ["Card", "Batch", "Route", "Last", "Note"],
             [["A", "B3", "FOX-OWL-RABBIT", "RABBIT", "GO!"], ["B", "B3", "OWL-FOX-RABBIT", "RABBIT", "GO!"], ["C", "B2", "FOX-OWL-RABBIT", "RABBIT", "GO!"], ["D", "B3", "FOX-OWL-RABBIT", "FOX", "GO!"], ["E", "B3", "FOX-OWL-RABBIT", "RABBIT", "NO!"]],
             "Delivery Card A", "Host reads thank-you note", "Story conclusion", ["Matching card", "Two supporting facts"],
             "The grown-up can read the paper thank-you note.",
             ["Use the full record sheet.", "Each other card changes one field.", "Card A; read the thank-you note."]),
    ],
}

CLASSROOM = {
    "code": "C06", "title": "The Winter Gift Sorting Station", "role": "TEACHER GUIDE",
    "intro": "Your group is a paper sorting crew. Match pretend picture items with named shelves, use simple size grades and check a paper departure list. No real gifts, family traditions or shopping are part of this activity.",
    "record": ["Shift batch", "Item-to-place matches", "Paper loading order", "Paper route and READY mark", "Final manifest and evidence"],
    "prepare": "Print one Group Player Pack per group and one private Teacher Guide. Give each group a complete set of pages, one checkpoint at a time. At Checkpoint 2, the four picture-item cards and three destination cards may be paired loose or marked on the intact page. Size, Order, Destination and Recorder roles may be merged or rotated. This is the neutral Winter draft. A separate Christmas-worded classroom draft exists for an adult to choose, but neither wording has passed play-test or print review.",
    "ending": "Confirm Manifest A after the group cites two different facts. Read: 'The paper sorting station is ready. Your team checked every picture card and route.' Do not ask children to share holiday, religion, family purchasing or gift practices.",
    "steps": [
        step("Check the shift batch", "Today's mark has a SQUARE frame, TWO lines and the printed word SNOW. Compare all three features.",
             ["Card", "Frame", "Lines", "Word", "Batch"],
             [["A", "Square", "1", "SNOW", "T1"], ["B", "Square", "2", "SNOW", "T2"], ["C", "Circle", "2", "SNOW", "T3"], ["D", "Square", "2", "LEAF", "T4"]],
             "Card B; T2", "T2", "Order-sheet batch", ["Matching mark", "Shift batch"],
             "Use only order-sheet rows with your batch mark.",
             ["Check frame, line count and word.", "One card meets every feature.", "Card B; give T2."]),
        step("Match the picture items", "Keep only your batch. BOOK belongs at LIBRARY DESK, STAR at SKY SHELF and BELL at MUSIC NOOK. These are printed story labels, not real destinations.",
             ["Item", "Batch", "Icon"],
             [["A", "T2", "BOOK"], ["X", "T1", "BOOK"], ["C", "T2", "BELL"], ["B", "T2", "STAR"]],
             "BOOK-LIBRARY, STAR-SKY, BELL-MUSIC", "Three item-place matches", "Loading and route constraints", ["Three matches", "Named shelf for each icon"],
             "Keep each item attached to its place when sorting the paper load.",
             ["Remove the wrong batch first.", "Match each named icon with its stated place.", "Book-Library, Star-Sky, Bell-Music."],
             "Destination cards: LIBRARY DESK / SKY SHELF / MUSIC NOOK"),
        step("Share the loading rule", "Size role: BOOK grade 3, STAR grade 1, BELL grade 2. Order role: smallest grade first. Destination role: keep each item's place from Checkpoint 2. Choose one item order.",
             ["Load", "First", "Second", "Third"],
             [["A", "BOOK", "BELL", "STAR"], ["B", "STAR", "BELL", "BOOK"], ["C", "BELL", "STAR", "BOOK"], ["D", "STAR", "BOOK", "BELL"]],
             "Load B; STAR-BELL-BOOK", "STAR-BELL-BOOK", "Paper route lookup", ["Matching load", "Item order"],
             "Turn the item order into the matching destination order.",
             ["Each role reads a condition.", "Sort invented grades 1, 2, 3 from small to large.", "Load B; give STAR-BELL-BOOK."]),
        step("Choose the paper route", "Convert your load order to the places matched earlier. Choose the route with those destinations in exactly that order. No real travel is involved.",
             ["Route", "First place", "Second place", "Third place", "Mark"],
             [["R1", "SKY", "MUSIC", "LIBRARY", "READY"], ["R2", "LIBRARY", "MUSIC", "SKY", "WAIT"], ["R3", "SKY", "LIBRARY", "MUSIC", "WAIT"], ["R4", "MUSIC", "SKY", "LIBRARY", "WAIT"]],
             "R1; SKY-MUSIC-LIBRARY; READY", "R1 / READY", "Final manifest", ["Matching route", "Route mark"],
             "Use the route number and mark on the final paper manifest.",
             ["Replace item names with their places.", "STAR-SKY, BELL-MUSIC, BOOK-LIBRARY.", "R1; give READY."]),
        step("Finish the paper manifest", "Compare shift batch, item order, route and route mark. Circle the one manifest matching your record; name two clue sheets that prove it.",
             ["Manifest", "Batch", "Load", "Route", "Mark"],
             [["A", "T2", "STAR-BELL-BOOK", "R1", "READY"], ["B", "T1", "STAR-BELL-BOOK", "R1", "READY"], ["C", "T2", "BOOK-BELL-STAR", "R1", "READY"], ["D", "T2", "STAR-BELL-BOOK", "R3", "READY"], ["E", "T2", "STAR-BELL-BOOK", "R1", "WAIT"]],
             "Manifest A", "Teacher reads winter ending", "Group conclusion", ["Matching manifest", "Two sources of evidence"],
             "The teacher can read the paper station thank-you card.",
             ["Use each cover-sheet result.", "All other manifests change exactly one field.", "Manifest A; close the story."]),
    ],
}


HOME["steps"][0]["card_factory"] = lambda width: BatchLabelCards(width, HOME["steps"][0]["rows"], "home")
CLASSROOM["steps"][0]["card_factory"] = lambda width: BatchLabelCards(width, CLASSROOM["steps"][0]["rows"], "classroom")
HOME["steps"][0]["card_note"] = "Compare frame picture, dot count and print picture together. Every visual clue is repeated in the label; no colour is needed."
CLASSROOM["steps"][0]["card_note"] = "Compare frame, line count and printed word together. Every pictured clue has a text label; no colour is needed."
HOME["steps"][2]["role_cards"] = [
    ("Guide", "FOX DEN comes BEFORE OWL WINDOW."),
    ("Clock", "RABBIT GATE is LAST."),
    ("Map", "Visit all three paper places exactly once."),
]
CLASSROOM["steps"][2]["role_cards"] = [
    ("Size", "BOOK is grade 3, STAR is grade 1, BELL is grade 2."),
    ("Order", "Load the smallest grade first."),
    ("Destination", "Keep each item's matching place from Checkpoint 2."),
]
HOME["steps"][2]["card_factory"] = lambda width: OrderChoiceCards(width, HOME["steps"][2]["rows"], "home")
CLASSROOM["steps"][2]["card_factory"] = lambda width: OrderChoiceCards(width, CLASSROOM["steps"][2]["rows"], "classroom")
for story in (HOME, CLASSROOM):
    story["steps"][2]["card_note"] = "The picture and printed labels show the same order. An adult may cut the four cards, or players can compare them on this page; read all role clues before choosing."
HOME["steps"][1]["strip_cards"] = True
CLASSROOM["steps"][1]["strip_cards"] = True
HOME["steps"][1]["destinations"] = [
    ("OWL WINDOW", "Round"), ("FOX DEN", "Square"), ("RABBIT GATE", "Triangle")]
CLASSROOM["steps"][1]["destinations"] = [
    ("LIBRARY DESK", "BOOK"), ("SKY SHELF", "STAR"), ("MUSIC NOOK", "BELL")]
for story, kind in ((HOME, "GIFT"), (CLASSROOM, "ITEM")):
    second = story["steps"][1]
    second.pop("extra", None)
    second["card_factory"] = lambda width, step=second, label=kind: PictureItemCards(width, step["rows"], label)
    second["template_factory"] = lambda width, step=second: DestinationMatchCards(width, step["destinations"])
HOME["finale_factory"] = lambda width: DeliveryReplyCard(width, False)
CLASSROOM["finale_factory"] = lambda width: DeliveryReplyCard(width, True)

CHRISTMAS_CLASSROOM = deepcopy(CLASSROOM)
CHRISTMAS_CLASSROOM["title"] = "The Christmas Gift Sorting Station"
CHRISTMAS_CLASSROOM["intro"] = (
    "Your group is a Christmas paper sorting crew. Match pretend picture gifts with named shelves, "
    "use simple size grades and check a paper departure list. No real gifts, family traditions or shopping "
    "are part of this activity.")
CHRISTMAS_CLASSROOM["prepare"] = (
    "Print one Group Player Pack per group and one private Teacher Guide. Give each group a complete set of pages, "
    "one checkpoint at a time. At Checkpoint 2, the four picture-item cards and three destination cards may be "
    "paired loose or marked on the intact page. Size, Order, Destination and Recorder roles may be merged or "
    "rotated. The teacher chose this Christmas paper-story wording; a neutral Winter edition is also available "
    "as a separate file set.")
CHRISTMAS_CLASSROOM["ending"] = (
    "Confirm Manifest A after the group cites two different facts. Read: 'The Christmas paper sorting station "
    "is ready. Your team checked every picture card and route.' Do not ask children to share holiday, religion, "
    "family purchasing or gift practices.")
CHRISTMAS_CLASSROOM["steps"][4]["next"] = "The teacher can read the Christmas paper station thank-you card."
CHRISTMAS_CLASSROOM["finale_factory"] = lambda width: DeliveryReplyCard(width, True, "christmas")


def validate_logic():
    for story in (HOME, CLASSROOM):
        assert len(story["steps"]) == 5
        for item in story["steps"]:
            assert len(item["hints"]) == 3
            assert all(len(row) == len(item["heads"]) for row in item["rows"])
    assert [r[0] for r in HOME["steps"][0]["rows"] if r[1:4] == ["Snowflake", "2", "Star"]] == ["A"]
    assert {r[2] for r in HOME["steps"][1]["rows"] if r[1] == "B3"} == {
        symbol for _, symbol in HOME["steps"][1]["destinations"]}
    assert [r[0] for r in HOME["steps"][2]["rows"] if r[1:] == ["B", "A", "C"]] == ["B"]
    assert [r[0] for r in HOME["steps"][4]["rows"] if r[1:] == ["B3", "FOX-OWL-RABBIT", "RABBIT", "GO!"]] == ["A"]
    assert [r[0] for r in CLASSROOM["steps"][0]["rows"] if r[1:4] == ["Square", "2", "SNOW"]] == ["B"]
    assert {r[2] for r in CLASSROOM["steps"][1]["rows"] if r[1] == "T2"} == {
        symbol for _, symbol in CLASSROOM["steps"][1]["destinations"]}
    assert [r[0] for r in CLASSROOM["steps"][2]["rows"] if r[1:] == ["STAR", "BELL", "BOOK"]] == ["B"]
    assert [r[0] for r in CLASSROOM["steps"][4]["rows"] if r[1:] == ["T2", "STAR-BELL-BOOK", "R1", "READY"]] == ["A"]
    assert CHRISTMAS_CLASSROOM["code"] == CLASSROOM["code"]
    for original, alternate in zip(CLASSROOM["steps"], CHRISTMAS_CLASSROOM["steps"]):
        for field in ("rows", "answer", "handoff", "hints", "heads", "prompts", "used", "role_cards", "destinations"):
            assert original.get(field) == alternate.get(field), field


if __name__ == "__main__":
    validate_logic()
    render_drafts("christmas", HOME, CLASSROOM,
                  ROOT / "public" / "assets" / "christmas.png", "WINTER STORY ADVENTURE",
                  classroom_art_path=ROOT / "public" / "assets" / "winter-classroom-v0.1.jpg")
    from generate_space_samples import render_classroom_variant
    render_classroom_variant("christmas", "christmas", CHRISTMAS_CLASSROOM,
                             ROOT / "public" / "assets" / "christmas.png",
                             "CHRISTMAS PAPER ADVENTURE")
